"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { useQuickAuth, useMiniKit } from "@coinbase/onchainkit/minikit"
import { useRouter } from "next/navigation"
import { Twitter, Linkedin, Facebook, Github } from "lucide-react"
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [setFrameReady, isFrameReady])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }

    const heroElement = heroRef.current
    if (heroElement) {
      heroElement.addEventListener("mousemove", handleMouseMove)
      return () => heroElement.removeEventListener("mousemove", handleMouseMove)
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
      <section
        ref={heroRef}
        className={styles.hero}
        style={
          {
            "--mouse-x": `${mousePosition.x}px`,
            "--mouse-y": `${mousePosition.y}px`,
          } as React.CSSProperties
        }
      >
        <div className={styles.spotlight} />
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
          <div className={styles.pricingCard}>
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

          <div className={`${styles.pricingCard} ${styles.popular}`}>
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

          <div className={styles.pricingCard}>
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
        <div className={styles.socialLinks}>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <Twitter className={styles.socialIcon} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <Linkedin className={styles.socialIcon} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <Facebook className={styles.socialIcon} />
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <Github className={styles.socialIcon} />
          </a>
        </div>
      </footer>
    </div>
  )
}
