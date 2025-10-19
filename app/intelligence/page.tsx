"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import Link from "next/link"
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

export default function IntelligencePage() {
  const { isFrameReady, setFrameReady, context } = useMiniKit()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [mouseVelocity, setMouseVelocity] = useState({ x: 0, y: 0 })
  const prevMousePos = useRef({ x: 0.5, y: 0.5 })
  const router = useRouter()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [setFrameReady, isFrameReady])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight

      const velocityX = x - prevMousePos.current.x
      const velocityY = y - prevMousePos.current.y
      setMouseVelocity({ x: velocityX * 10, y: velocityY * 10 })
      prevMousePos.current.x = x
      prevMousePos.current.y = y

      setMousePos({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const {
    data: authData,
    isLoading: isAuthLoading,
    error: authError,
  } = useQuickAuth<AuthResponse>("/api/auth", { method: "GET" })

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isAuthLoading) {
      setError("Please wait while we verify your identity...")
      return
    }

    if (authError || !authData?.success) {
      setError("Please authenticate to join the waitlist")
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

    console.log("Valid email submitted:", email)
    console.log("User authenticated:", authData.user)

    router.push("/success")
  }

  return (
    <div className={styles.page}>
      <svg className={styles.heroBackground} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
          </linearGradient>
          <linearGradient id="lineGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.2)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="particleGradient">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.8)" />
            <stop offset="100%" stopColor="rgba(13, 43, 107, 0)" />
          </radialGradient>
          <radialGradient id="cursorGlow">
            <stop offset="0%" stopColor="rgba(13, 43, 107, 0.4)" />
            <stop offset="70%" stopColor="rgba(13, 43, 107, 0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {[...Array(12)].map((_, i) => {
          const baseY = 50 + i * 70
          const offsetX = (mousePos.x - 0.5) * 250 * (i % 2 === 0 ? 1 : -1) + mouseVelocity.x * 20
          const offsetY = (mousePos.y - 0.5) * 120 + mouseVelocity.y * 15

          return (
            <path
              key={i}
              d={`M 0 ${baseY + offsetY} Q ${300 + offsetX} ${baseY - 80 + offsetY}, ${600 + offsetX * 0.5} ${baseY + offsetY} T 1200 ${baseY + offsetY}`}
              stroke={i % 3 === 0 ? "url(#lineGradient2)" : "url(#lineGradient)"}
              strokeWidth={i % 2 === 0 ? "2.5" : "1.5"}
              fill="none"
              opacity={0.4 - i * 0.025}
              filter="url(#glow)"
            />
          )
        })}

        {[...Array(50)].map((_, i) => {
          const baseX = (i * 137.5) % 1200
          const baseY = (i * 73) % 800
          const distX = Math.abs(mousePos.x * 1200 - baseX)
          const distY = Math.abs(mousePos.y * 800 - baseY)
          const dist = Math.sqrt(distX * distX + distY * distY)
          const scale = Math.max(0.3, Math.min(2, 1.5 - dist / 400))

          const angle = Math.atan2(baseY - mousePos.y * 800, baseX - mousePos.x * 1200)
          const repulsion = Math.max(0, 150 - dist) / 150
          const moveX = Math.cos(angle) * repulsion * 80
          const moveY = Math.sin(angle) * repulsion * 80

          return (
            <circle
              key={`particle-${i}`}
              cx={baseX + moveX + mouseVelocity.x * 5}
              cy={baseY + moveY + mouseVelocity.y * 5}
              r={2.5 * scale}
              fill="url(#particleGradient)"
              filter="url(#glow)"
              opacity={0.6 + scale * 0.4}
            />
          )
        })}

        {[...Array(50)].map((_, i) => {
          const x1 = (i * 137.5) % 1200
          const y1 = (i * 73) % 800
          const x2 = ((i + 7) * 137.5) % 1200
          const y2 = ((i + 7) * 73) % 800
          const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

          if (dist < 200) {
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const distToMouse = Math.sqrt((midX - mousePos.x * 1200) ** 2 + (midY - mousePos.y * 800) ** 2)
            const opacity = Math.max(0, 0.3 - distToMouse / 800)

            return (
              <line
                key={`connection-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(96, 165, 250, 0.3)"
                strokeWidth="1"
                opacity={opacity}
              />
            )
          }
          return null
        })}

        <circle
          cx={mousePos.x * 1200}
          cy={mousePos.y * 800}
          r="150"
          fill="url(#cursorGlow)"
          filter="url(#glow)"
          opacity="0.8"
        />
      </svg>

      <div className={styles.container}>
        <Link href="/" className={styles.backButton}>
          ← Back to Home
        </Link>

        <div className={styles.content}>
          <h1 className={styles.title}>Intelligence</h1>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <p className={styles.description}>
              Gain actionable insights through penetration testing, vulnerability scanning, and daily threat
              intelligence reports. Our intelligence pillar empowers you with the knowledge needed to stay ahead of
              emerging threats and make informed security decisions.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>What&apos;s Included</h2>
            <ul className={styles.featuresList}>
              <li>
                <strong>Penetration Testing:</strong> Comprehensive security testing by certified ethical hackers to
                identify vulnerabilities before attackers do
              </li>
              <li>
                <strong>Vulnerability Scanning:</strong> Automated and manual scanning of your infrastructure, web
                applications, and smart contracts
              </li>
              <li>
                <strong>Daily Threat Intelligence Reports:</strong> Curated intelligence on emerging threats, attack
                patterns, and vulnerabilities relevant to Web3
              </li>
              <li>
                <strong>Security Posture Assessment:</strong> Regular evaluation of your overall security stance with
                actionable recommendations
              </li>
              <li>
                <strong>Threat Actor Profiling:</strong> Intelligence on threat actors targeting the Web3 ecosystem
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Key Benefits</h2>
            <ul className={styles.benefitsList}>
              <li>Proactive identification of security weaknesses before exploitation</li>
              <li>Stay informed about the latest threats targeting Web3 projects</li>
              <li>Make data-driven security decisions based on real intelligence</li>
              <li>Reduce attack surface through continuous vulnerability management</li>
              <li>Demonstrate security due diligence to stakeholders and auditors</li>
              <li>Prioritise security investments based on actual risk</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Ideal For</h2>
            <p className={styles.description}>
              Security-conscious Web3 projects, DeFi protocols managing significant assets, NFT platforms with valuable
              collections, blockchain projects preparing for major launches, and any organisation that needs to
              understand and mitigate security risks proactively.
            </p>
          </div>
        </div>
      </div>

      <section className={styles.waitlistSection}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.waitlistForm}>
              <h2 className={styles.title}>Join the Waitlist</h2>

              <p className={styles.subtitle}>
                Hey {context?.user?.displayName || "there"}, Get early access and be the first to experience the future
                of Web3 security.
              </p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                />

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.joinButton}>
                  JOIN WAITLIST
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 Cybercentry. All rights reserved.</p>
      </footer>
    </div>
  )
}

