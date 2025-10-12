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
  const router = useRouter()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [setFrameReady, isFrameReady])

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
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Cybercentry One</h1>
        <p className={styles.heroSubtitle}>
          Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.
          Our platform connects you to a curated suite of AI-powered security services, structured around the core
          pillars of Compliance, Intelligence, and Protection.
        </p>
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
              Ensure regulatory adherence with IASME Cyber Baseline certification and comprehensive compliance
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
        <h2 className={styles.sectionTitle}>Comprehensive Security Services</h2>
        <p className={styles.sectionSubtitle}>
          Choose from our curated suite of AI-powered security services designed to protect your digital environment.
        </p>

        <h3 className={styles.serviceCategory}>Managed Detection & Response</h3>

        <div className={styles.pricingGrid}>
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

          <div className={`${styles.pricingCard} ${styles.popular}`}>
            <div className={styles.popularBadge}>POPULAR</div>
            <h4 className={styles.pricingTier}>Premium</h4>
            <div className={styles.price}>
              <span className={styles.priceAmount}>£16.99</span>
              <span className={styles.pricePeriod}>per user per month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed EDR with Identity and SOAR</li>
              <li>24/7 Monitoring</li>
              <li>Free Security Assessment</li>
              <li>External & Web App Vulnerability Scanner</li>
              <li>Internal Vulnerability Scanner</li>
            </ul>
          </div>

          <div className={styles.pricingCard}>
            <h4 className={styles.pricingTier}>Enterprise</h4>
            <div className={styles.price}>
              <span className={styles.priceAmount}>£24.99</span>
              <span className={styles.pricePeriod}>per user per month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed XDR with Identity and SOAR</li>
              <li>24/7 SOC Team Monitoring</li>
              <li>Free Security Assessment</li>
              <li>Complete Vulnerability Scanning</li>
              <li>Enhanced Dashboard & AI Risk Scoring</li>
            </ul>
          </div>
        </div>

        <div className={styles.additionalServices}>
          <div className={styles.serviceBlock}>
            <h4 className={styles.serviceTitle}>IASME Cyber Baseline Certification</h4>
            <p className={styles.serviceSubtitle}>
              IASME Cyber Baseline with Scan Guard - The first step in certification with vulnerability scanning
              included.
            </p>
            <ul className={styles.features}>
              <li>IASME Cyber Baseline Certification</li>
              <li>Cyber Essentials Certification</li>
              <li>External Vulnerability Scanning (12 months)</li>
              <li>Daily Threat Intelligence Reports</li>
            </ul>
          </div>

          <h4 className={styles.serviceCategory}>Penetration Testing</h4>

          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard}>
              <h5 className={styles.serviceCardTitle}>Internal Penetration Testing</h5>
              <p className={styles.servicePrice}>From £270/month</p>
              <p className={styles.serviceDescription}>Identify security risks within your internal network.</p>
              <ul className={styles.features}>
                <li>Internal Penetration Testing with Reporting</li>
                <li>Internal Vulnerability Scanning (12 months)</li>
                <li>Daily Threat Reports</li>
              </ul>
            </div>

            <div className={styles.serviceCard}>
              <h5 className={styles.serviceCardTitle}>External Penetration Testing</h5>
              <p className={styles.servicePrice}>From £270/month</p>
              <p className={styles.serviceDescription}>Identify vulnerabilities external attackers could exploit.</p>
              <ul className={styles.features}>
                <li>External Penetration Testing with Reporting</li>
                <li>External Vulnerability Scanning (12 months)</li>
                <li>Free Retesting & Threat Reports</li>
              </ul>
            </div>

            <div className={styles.serviceCard}>
              <h5 className={styles.serviceCardTitle}>Web Application Testing</h5>
              <p className={styles.servicePrice}>From £270/month</p>
              <p className={styles.serviceDescription}>Identify vulnerabilities within web applications.</p>
              <ul className={styles.features}>
                <li>Web App Penetration Testing with Reporting</li>
                <li>Web App Vulnerability Scanning (12 months)</li>
                <li>Free Retesting & Threat Reports</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.professionalServices}>
          <h4 className={styles.serviceCategory}>Professional Services</h4>
          <p className={styles.serviceDescription}>
            Our industry-leading experts provide comprehensive cyber security consulting services including Red Teaming,
            ISO 27001, Cloud Security Review, MSSP, Incident Response, and Gap Analysis.
          </p>
          <p className={styles.professionalPrice}>£899 per day</p>
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
