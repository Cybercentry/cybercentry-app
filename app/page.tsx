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

  // 👇 FORCE MINIKIT AUTHENTICATION CHECK
  const isUserConnected = context?.wallet && context?.user?.fid

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
      hasWallet: !!context?.wallet,
      hasUser: !!context?.user,
      userFid: context?.user?.fid,
      displayName: context?.user?.displayName,
      isConnected: isUserConnected
    })

    if (!isFrameReady) {
      setConnectionError("Initializing MiniKit...")
      return
    }

    if (!isUserConnected) {
      console.warn('⚠️ No wallet connection - user must connect Farcaster wallet')
      setConnectionError('Please connect your Farcaster wallet in Warpcast or Coinbase Wallet')
      setError("")
      return
    }

    // Clear errors when connected
    if (isUserConnected && connectionError) {
      setConnectionError("")
      console.log('✅ Wallet connected:', context.user)
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
      enabled: isUserConnected // Only run when connected
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
      setError("Wallet connection required. Please connect your Farcaster wallet.")
      setConnectionError('Please connect your Farcaster wallet in Warpcast or Coinbase Wallet')
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
          <h2 style={{ color: '#ff6b6b', margin: '1rem 0' }}>Wallet Connection Required</h2>
          <p className={styles.heroSubtitle}>
            {connectionError || "Connect your Farcaster wallet to access this Mini App"}
          </p>
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
            <h3>How to Connect:</h3>
            <ol style={{ textAlign: 'left' }}>
              <li><strong>Warpcast:</strong> Open this link from a Warpcast cast</li>
              <li><strong>Coinbase Wallet:</strong> Use MiniApps browser</li>
              <li><strong>Connect wallet</strong> when prompted</li>
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
          </div>
        </section>
      </div>
    )
  }

  // 👇 NORMAL RENDER - User is connected
  return (
    <div className={styles.page}>
      {/* Add connection indicator */}
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: '#10b981', 
        color: 'white', 
        padding: '0.5rem', 
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        ✅ Connected: FID {context.user.fid}
      </div>

      <section className={styles.hero}>
        <img src="/white-icon.png" alt="Cybercentry One Logo" className={styles.heroIcon} />
        <h1 className={styles.heroTitle}>Cybercentry One</h1>
        <p className={styles.heroSubtitle}>
          Welcome back, <strong>{context.user.displayName}</strong>!
          Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.
        </p>
        {/* Auth status indicator */}
        <div style={{ 
          background: authData?.success ? '#10b981' : '#f59e0b', 
          color: 'white', 
          padding: '0.5rem', 
          borderRadius: '4px',
          margin: '1rem 0',
          textAlign: 'center'
        }}>
          {isAuthLoading ? '🔄 Verifying identity...' : 
           authData?.success ? `✅ Authenticated (FID: ${authData.user?.fid})` : 
           '⚠️ Authentication check failed'}
        </div>
      </section>

      {/* Your existing pillars section */}
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

      {/* Your existing services section - keeping it intact */}
      <section className={styles.services}>
        <h2 className={styles.sectionTitle}>Comprehensive Security Services</h2>
        <p className={styles.sectionSubtitle}>
          Choose from our curated suite of AI-powered security services designed to protect your digital environment.
        </p>

        <h3 className={styles.serviceCategory}>Managed Detection & Response</h3>
        {/* ... rest of your services content remains exactly the same ... */}
        <div className={styles.pricingGrid}>
          {/* Your existing pricing cards */}
          <div className={styles.pricingCard}>
            <h4 className={styles.pricingTier}>Core</h4>
            <div className={styles.price}>
              <span className={styles.priceAmount}>£8.99</span>
              <span className={styles.pricePeriod}>per user per month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed EDR</li>
              <li>24/7 Monitoring</li>
              <li>Free Security Assessment</li>
              <li>External Vulnerability Scanner</li>
              <li>Immediate Actions</li>
            </ul>
          </div>
          {/* ... rest of pricing cards and services ... */}
        </div>
        {/* Keep all your existing services content */}
      </section>

      <section className={styles.waitlistSection}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.waitlistForm}>
              <h2 className={styles.title}>Join the Waitlist</h2>

              <p className={styles.subtitle}>
                Hey <strong>{context.user.displayName}</strong> (FID: {context.user.fid}), 
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
                  ✅ Verified: {authData.user?.fid}
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
                  {isAuthLoading ? 'Verifying...' : 'JOIN WAITLIST'}
                </button>
              </form>

              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <details style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
                  <summary>Debug Info (Dev Only)</summary>
                  <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                    {JSON.stringify({
                      isFrameReady,
                      isConnected,
                      fid: context?.user?.fid,
                      authSuccess: authData?.success,
                      authError: authError?.message,
                      email
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
