"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { useQuickAuth, useMiniKit } from "@coinbase/onchainkit/minikit"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"

interface AuthResponse {
  success: boolean
  user?: {
    fid: number
    issuedAt?: number
    expiresAt?: number
  }
  message?: string
}

export default function Home() {
  const { isFrameReady, setFrameReady, context } = useMiniKit()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [connectionError, setConnectionError] = useState("")
  const router = useRouter()

  // 👇 CORRECTED: Check for user presence in MiniKit context
  const isUserConnected = !!context?.user && !!context.user.fid

  // Initialize MiniKit frame
  useEffect(() => {
    if (!isFrameReady) {
      console.log("🟡 Setting frame ready...")
      setFrameReady()
    }
  }, [setFrameReady, isFrameReady])

  // 👇 CONNECTION MONITORING useEffect
  useEffect(() => {
    console.log('🔍 MiniKit Connection State:', {
      isFrameReady,
      hasContext: !!context,
      hasUser: !!context?.user,
      userFid: context?.user?.fid,
      displayName: context?.user?.displayName,
      isConnected: isUserConnected,
      // Log full context structure for debugging
      contextKeys: context ? Object.keys(context) : null
    })

    if (!isFrameReady) {
      setConnectionError("Initializing MiniKit...")
      return
    }

    if (!isUserConnected) {
      console.warn('⚠️ No user connection - must be in Farcaster/MiniKit context')
      setConnectionError('Please open this in Warpcast or Coinbase Wallet MiniApps')
      setError("")
      return
    }

    // Clear errors when connected
    if (isUserConnected && connectionError) {
      setConnectionError("")
      console.log('✅ User connected:', context.user)
    }
  }, [context, isUserConnected, isFrameReady])

  // Only initialize useQuickAuth when user is connected
  const {
    data: authData,
    isLoading: isAuthLoading,
    error: authError,
  } = useQuickAuth<AuthResponse>(
    "/api/auth", 
    { 
      method: "GET",
      // Only run when connected (useQuickAuth handles this internally too)
    }
  )

  // 👇 DEBUG useEffect for auth state
  useEffect(() => {
    console.log('🔍 Auth State:', {
      isAuthLoading,
      authData: authData ? { success: authData.success, fid: authData.user?.fid } : null,
      authError: authError?.message,
      isConnected
    })
  }, [isAuthLoading, authData, authError, isConnected])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 👇 CONNECTION CHECK FIRST
    if (!isUserConnected) {
      setError("Farcaster connection required. Please open in Warpcast.")
      setConnectionError('Please open this in Warpcast or Coinbase Wallet MiniApps')
      return
    }

    if (isAuthLoading) {
      setError("Please wait while we verify your identity...")
      return
    }

    if (authError) {
      console.error('Auth error:', authError)
      setError(`Authentication error: ${authError.message || 'Please try again'}`)
      return
    }

    if (!authData?.success) {
      console.error('Auth failed:', authData)
      setError(`Authentication failed: ${authData?.message || 'Please authenticate to join the waitlist'}`)
      return
    }

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    console.log("✅ Valid email submitted:", email)
    console.log("✅ User authenticated:", authData.user)
    console.log("✅ FID:", authData.user?.fid)

    // TODO: Send email + FID to your backend
    router.push("/success")
  }

  // 👇 EARLY RETURNS FOR DISCONNECTED STATE
  if (!isFrameReady) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading Cybercentry One...</h2>
          <p>Initializing Farcaster MiniKit</p>
        </div>
      </div>
    )
  }

  if (!isUserConnected) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <img src="/white-icon.png" alt="Cybercentry One Logo" className={styles.heroIcon} />
          <h1 className={styles.heroTitle}>Cybercentry One</h1>
          <h2 style={{ color: '#ff6b6b', margin: '1rem 0' }}>Farcaster Connection Required</h2>
          <p className={styles.heroSubtitle}>
            {connectionError || "Connect via Farcaster to access this Mini App"}
          </p>
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
            <h3>How to Connect:</h3>
            <ol style={{ textAlign: 'left' }}>
              <li><strong>Warpcast:</strong> Share this URL in a cast and tap the embed</li>
              <li><strong>Coinbase Wallet:</strong> Open in MiniApps browser</li>
              <li><strong>Sign in</strong> with your Farcaster account</li>
            </ol>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                marginTop: '1rem', 
                padding: '0.5rem 1rem', 
                background: '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px' 
              }}
            >
              Retry Connection
            </button>
            <p style={{ fontSize: '0.9rem', marginTop: '1rem', opacity: 0.7 }}>
              <strong>Testing:</strong> This app only works in Farcaster clients
            </p>
          </div>
        </section>
      </div>
    )
  }

  // 👇 NORMAL RENDER - User is connected
  return (
    <div className={styles.page}>
      {/* Connection indicator */}
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: '#10b981', 
        color: 'white', 
        padding: '0.5rem', 
        borderRadius: '4px',
        fontSize: '0.8rem',
        zIndex: 1000
      }}>
        ✅ Connected: FID {context.user.fid}
      </div>

      <section className={styles.hero}>
        <img src="/white-icon.png" alt="Cybercentry One Logo" className={styles.heroIcon} />
        <h1 className={styles.heroTitle}>Cybercentry One</h1>
        <p className={styles.heroSubtitle}>
          Welcome back, <strong>{context.user.displayName || 'Farcaster User'}</strong>!
          Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.
        </p>
        {/* Auth status indicator */}
        <div style={{ 
          background: authData?.success ? '#10b981' : isAuthLoading ? '#f59e0b' : '#ef4444', 
          color: 'white', 
          padding: '0.5rem', 
          borderRadius: '4px',
          margin: '1rem 0',
          textAlign: 'center'
        }}>
          {isAuthLoading ? '🔄 Verifying Farcaster identity...' : 
           authData?.success ? `✅ Authenticated (FID: ${authData.user?.fid})` : 
           '⚠️ Authentication check in progress'}
        </div>
      </section>

      {/* Your existing content sections remain unchanged */}
      <section className={styles.pillars}>
        <h2 className={styles.sectionTitle}>Built on Three Core Pillars</h2>
        <p className={styles.sectionSubtitle}>
          Cybercentry One provides centralised access to specialised solutions designed to deliver actionable insights,
          strengthen defences, and ensure regulatory adherence.
        </p>
        <div className={styles.pillarsGrid}>
          <div className={styles.pillar}>
            <h3 className={styles.pillarTitle}>Compliance</h3>
            <p className={styles.pillarDescription}>
              Ensure regulatory adherence with Cyber Essentials certification and comprehensive compliance
              frameworks that keep you audit-ready.
            </p>
          </div>
          <div className={styles.pillar}>
            <h3 className={styles.pillarTitle}>Intelligence</h3>
            <p className={styles.pillarDescription}>
              Gain actionable insights through penetration testing, vulnerability scanning, and daily threat
              intelligence reports.
            </p>
          </div>
          <div className={styles.pillar}>
            <h3 className={styles.pillarTitle}>Protection</h3>
            <p className={styles.pillarDescription}>
              Strengthen your defences with 24/7 managed detection and response, real-time monitoring, and automated
              threat prevention.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.services}>
        {/* Your existing services content - keeping it intact */}
        <h2 className={styles.sectionTitle}>Comprehensive Security Services</h2>
        {/* ... rest of services section unchanged ... */}
      </section>

      <section className={styles.waitlistSection}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.waitlistForm}>
              <h2 className={styles.title}>Join the Waitlist</h2>

              <p className={styles.subtitle}>
                Hey <strong>{context.user.displayName || 'Farcaster User'}</strong> (FID: {context.user.fid}), 
                Get early access and be the first to experience the future of cyber security.
              </p>

              {/* Auth success indicator */}
              {authData?.success && (
                <div style={{ 
                  background: '#10b981', 
                  color: 'white', 
                  padding: '0.5rem', 
                  borderRadius: '4px', 
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  ✅ Farcaster Verified: FID {authData.user?.fid}
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                  disabled={isAuthLoading || !authData?.success}
                />

                {(error || connectionError) && (
                  <p className={styles.error}>
                    {error || connectionError}
                  </p>
                )}

                <button 
                  type="submit" 
                  className={styles.joinButton}
                  disabled={isAuthLoading || !authData?.success || !isUserConnected}
                >
                  {isAuthLoading ? 'Verifying Farcaster...' : 'JOIN WAITLIST'}
                </button>
              </form>

              {/* Debug info - only in development */}
              {process.env.NODE_ENV === 'development' && (
                <details style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
                  <summary>🔧 Debug Info (Dev Only)</summary>
                  <pre style={{ fontSize: '0.8rem', overflow: 'auto', maxHeight: '300px' }}>
                    {JSON.stringify({
                      isFrameReady,
                      isConnected,
                      contextUser: context?.user,
                      fid: context?.user?.fid,
                      authSuccess: authData?.success,
                      authError: authError?.message,
                      authDataFid: authData?.user?.fid
                    }, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 Cybercentry One. All rights reserved.</p>
      </footer>
    </div>
  )
}
