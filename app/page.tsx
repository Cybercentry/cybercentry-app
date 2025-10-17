"use client"
import { useState, useEffect, useRef } from "react"
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
  const heroRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [globalMousePos, setGlobalMousePos] = useState({ x: 0.5, y: 0.5 })
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number }>>([])
  const router = useRouter()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [setFrameReady, isFrameReady])

  useEffect(() => {
    const initialParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
    }))
    setParticles(initialParticles)
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setGlobalMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }

    window.addEventListener("mousemove", handleGlobalMouseMove)
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => {
          const dx = globalMousePos.x * 100 - p.x
          const dy = globalMousePos.y * 100 - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Particles are attracted to cursor but maintain some independence
          const force = Math.min(dist / 50, 1)
          const attractionX = (dx / dist) * force * 0.05
          const attractionY = (dy / dist) * force * 0.05

          let newX = p.x + p.vx + attractionX
          let newY = p.y + p.vy + attractionY
          let newVx = p.vx + attractionX
          let newVy = p.vy + attractionY

          // Bounce off edges
          if (newX < 0 || newX > 100) {
            newVx = -newVx
            newX = Math.max(0, Math.min(100, newX))
          }
          if (newY < 0 || newY > 100) {
            newVy = -newVy
            newY = Math.max(0, Math.min(100, newY))
          }

          // Damping
          newVx *= 0.98
          newVy *= 0.98

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy }
        }),
      )
    }, 50)

    return () => clearInterval(interval)
  }, [globalMousePos])

  useEffect(() => {
    const handleCardMouseMove = (index: number) => (e: MouseEvent) => {
      const card = cardRefs.current[index]
      if (card) {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        card.style.setProperty("--card-mouse-x", `${x}px`)
        card.style.setProperty("--card-mouse-y", `${y}px`)
      }
    }

    const listeners: Array<{ element: HTMLDivElement; handler: (e: MouseEvent) => void }> = []

    cardRefs.current.forEach((card, index) => {
      if (card) {
        const handler = handleCardMouseMove(index)
        card.addEventListener("mousemove", handler)
        listeners.push({ element: card, handler })
      }
    })

    return () => {
      listeners.forEach(({ element, handler }) => {
        element.removeEventListener("mousemove", handler)
      })
    }
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
      <svg className={styles.cyberBackground} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" />
            <stop offset="100%" stopColor="rgba(147, 51, 234, 0.4)" />
          </linearGradient>
          <filter id="cyberGlow">
            <feGaussianBlur stdDeviation="0.3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="cursorGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Scanning grid lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 5}
            x2="100"
            y2={i * 5}
            stroke="rgba(59, 130, 246, 0.1)"
            strokeWidth="0.05"
          />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 5}
            y1="0"
            x2={i * 5}
            y2="100"
            stroke="rgba(59, 130, 246, 0.1)"
            strokeWidth="0.05"
          />
        ))}

        {/* Particle network connections */}
        {particles.map((p1, i) =>
          particles.slice(i + 1).map((p2, j) => {
            const dx = p2.x - p1.x
            const dy = p2.y - p1.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < 15) {
              const opacity = (1 - dist / 15) * 0.4
              return (
                <line
                  key={`line-${i}-${j}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="url(#lineGrad)"
                  strokeWidth="0.1"
                  opacity={opacity}
                  filter="url(#cyberGlow)"
                />
              )
            }
            return null
          }),
        )}

        {/* Animated particles */}
        {particles.map((p) => {
          const dx = globalMousePos.x * 100 - p.x
          const dy = globalMousePos.y * 100 - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const scale = dist < 20 ? 1 + (1 - dist / 20) : 1

          return (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={0.3 * scale}
              fill="rgba(59, 130, 246, 0.8)"
              filter="url(#cyberGlow)"
            />
          )
        })}

        {/* Cursor glow effect */}
        <circle cx={globalMousePos.x * 100} cy={globalMousePos.y * 100} r="15" fill="url(#cursorGlow)" opacity="0.6" />

        {/* Scanning radar sweep */}
        <circle
          cx={globalMousePos.x * 100}
          cy={globalMousePos.y * 100}
          r="20"
          fill="none"
          stroke="rgba(59, 130, 246, 0.4)"
          strokeWidth="0.2"
          opacity="0.6"
        >
          <animate attributeName="r" from="5" to="30" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>

      <section ref={heroRef} className={styles.hero}>
        <div className={styles.heroContent}>
          <img src="/white-icon.png" alt="Cybercentry One Logo" className={styles.heroIcon} />
          <h1 className={styles.heroTitle}>Cybercentry One</h1>
          <p className={styles.heroSubtitle}>
            Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.
            Our platform connects you to a curated suite of AI-powered security services, structured around the core
            pillars of Compliance, Intelligence, and Protection.
          </p>
        </div>
      </section>

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
              Ensure regulatory adherence with Cyber Essentials certification and comprehensive compliance frameworks
              that keep you audit-ready.
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
        <h2 className={styles.sectionTitle}>Comprehensive Security Services</h2>
        <p className={styles.sectionSubtitle}>
          Choose from our curated suite of AI-powered security services designed to protect your digital environment.
        </p>

        <h3 className={styles.serviceCategory}>Managed Detection & Response</h3>

        <div className={styles.pricingGrid}>
          <div
            ref={(el) => {
              cardRefs.current[0] = el
            }}
            className={styles.pricingCard}
          >
            <h4 className={styles.pricingTier}>Core</h4>
            <div className={styles.price}>
              <span className={styles.priceAmount}>£60.00</span>
              <span className={styles.pricePeriod}>per organisation per month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed EDR</li>
              <li>24/7 Monitoring</li>
              <li>Free Security Assessment</li>
              <li>External Vulnerability Scanner</li>
              <li>Immediate Actions</li>
            </ul>
          </div>

          <div
            ref={(el) => {
              cardRefs.current[1] = el
            }}
            className={`${styles.pricingCard} ${styles.popular}`}
          >
            <div className={styles.popularBadge}>POPULAR</div>
            <h4 className={styles.pricingTier}>Edge</h4>
            <div className={styles.price}>
              <span className={styles.priceAmount}>£240.00</span>
              <span className={styles.pricePeriod}>per organisation per month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed EDR with Identity and SOAR</li>
              <li>24/7 Monitoring</li>
              <li>Free Security Assessment</li>
              <li>External Vulnerability Scanner</li>
              <li>Web Application Vulnerability Scanner</li>
              <li>Internal Vulnerability Scanner</li>
              <li>Immediate Actions</li>
            </ul>
          </div>

          <div
            ref={(el) => {
              cardRefs.current[2] = el
            }}
            className={styles.pricingCard}
          >
            <h4 className={styles.pricingTier}>One</h4>
            <div className={styles.price}>
              <span className={styles.priceAmount}>£960.00</span>
              <span className={styles.pricePeriod}>per organisation per month</span>
            </div>
            <ul className={styles.features}>
              <li>Allocated Account Manager</li>
              <li>Managed XDR with Identity and SOAR</li>
              <li>Free Security Assessment</li>
              <li>24/7 Monitoring</li>
              <li>External Vulnerability Scanner</li>
              <li>Web Application Vulnerability Scanner</li>
              <li>Internal Vulnerability Scanner</li>
              <li>Enhanced main dashboard view</li>
              <li>Immediate Actions</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.waitlistSection}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.waitlistForm}>
              <h2 className={styles.title}>Join the Waitlist</h2>

              <p className={styles.subtitle}>
                Hey {context?.user?.displayName || "there"}, Get early access and be the first to experience the future
                of cyber security.
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
        <p>© 2025 Cybercentry One. All rights reserved.</p>
      </footer>
    </div>
  )
}
