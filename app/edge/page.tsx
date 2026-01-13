"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

export default function EdgePage() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("Edge")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isSubmitting) return

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    if (!plan) {
      setError("Please select a subscription plan")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fid: null,
          display_name: null,
          plan,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Couldn't get you in. Please try again.")
        setIsSubmitting(false)
        return
      }

      router.push("/success")
    } catch (err) {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <ParticleBackground />

      <div className={styles.container}>
        <Link href="/" className={styles.backButton}>
          ← Back to Home
        </Link>

        <div className={styles.content}>
          <div className={styles.popularBadge}>
            <span className={styles.badgeGlow} />
            MOST POPULAR
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleText}>Edge</span>
          </h1>
          <div className={styles.price}>
            <span className={styles.priceCurrency}>$</span>
            <span className={styles.priceAmount}>349.99</span>
            <span className={styles.pricePeriod}>USDC / month</span>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>OVERVIEW</span>
            <p className={styles.description}>
              The Edge package delivers advanced managed detection and response with enhanced capabilities, including
              identity protection and security orchestration. Our most popular choice for growing businesses that need
              comprehensive security coverage.
            </p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>INCLUDED</span>
            <ul className={styles.featuresList}>
              <li>
                <strong>Managed EDR with Identity and SOAR:</strong> Advanced endpoint protection with identity security
                and automated response orchestration
              </li>
              <li>
                <strong>24/7 Monitoring:</strong> Continuous surveillance with enhanced threat intelligence
              </li>
              <li>
                <strong>Free Security Assessment:</strong> In-depth evaluation of your security infrastructure
              </li>
              <li>
                <strong>External Vulnerability Scanner:</strong> Comprehensive scanning of all external-facing assets
              </li>
              <li>
                <strong>Web Application Vulnerability Scanner:</strong> Specialized scanning for web application
                security
              </li>
              <li>
                <strong>Internal Vulnerability Scanner:</strong> Internal network and system vulnerability assessment
              </li>
              <li>
                <strong>Immediate Actions:</strong> Automated and manual response to security incidents
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>BENEFITS</span>
            <ul className={styles.benefitsList}>
              <li>Comprehensive protection across endpoints, identities, and applications</li>
              <li>Automated threat response reduces incident response time</li>
              <li>Enhanced visibility into internal and external security posture</li>
              <li>Proactive vulnerability management</li>
              <li>Compliance support for advanced regulatory requirements</li>
              <li>Scalable solution that grows with your business</li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>IDEAL FOR</span>
            <p className={styles.description}>
              Growing Decentralised Finance (DeFi) protocols, established Decentralised Autonomous Organisations (DAO)
              with significant treasury holdings, Non-Fungible Token (NFT) platforms with complex smart contract
              systems, and Web3 projects with active communities that need advanced security capabilities with automated
              response and comprehensive coverage.
            </p>
          </div>
        </div>
      </div>

      <section className={styles.waitlistSection}>
        <div className={styles.waitlistGlow} />
        <div className={styles.formContainer}>
          <div className={styles.waitlistForm}>
            <span className={styles.sectionTag}>GET STARTED</span>
            <h2 className={styles.formTitle}>Join the Future</h2>
            <p className={styles.subtitle}>Select your plan and sign up to secure your Web3 project.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputWrapper}>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className={styles.tierSelect}
                  disabled={isSubmitting}
                >
                  <option value="">Select a plan...</option>
                  <option value="Core">Core</option>
                  <option value="Edge">Edge</option>
                  <option value="One">One</option>
                </select>
              </div>

              <div className={styles.inputWrapper}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                  disabled={isSubmitting}
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.joinButton} disabled={isSubmitting}>
                <span className={styles.buttonShimmer} />
                <span className={styles.buttonText}>{isSubmitting ? "Signing up..." : "Sign Up Now"}</span>
              </button>
            </form>

            <AddToAppsButton buttonClassName={styles.addButton} descriptionClassName={styles.addDescription} />
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGlow} />
        <p>© 2026 Cybercentry. All rights reserved.</p>
      </footer>
    </div>
  )
}
