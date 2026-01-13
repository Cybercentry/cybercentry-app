"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

export default function OnePage() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("One")
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
          <div className={styles.premiumBadge}>
            <span className={styles.badgeGlow} />
            PREMIUM
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleText}>One</span>
          </h1>
          <div className={styles.price}>
            <span className={styles.priceCurrency}>$</span>
            <span className={styles.priceAmount}>1,099.99</span>
            <span className={styles.pricePeriod}>USDC / month</span>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>OVERVIEW</span>
            <p className={styles.description}>
              The Cybercentry One package represents our premium tier of managed detection and response, featuring
              Extended Detection and Response (XDR) capabilities, dedicated account management, and enhanced dashboard
              views. Perfect for organisations requiring the highest level of security and personalised support.
            </p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>INCLUDED</span>
            <ul className={styles.featuresList}>
              <li>
                <strong>Allocated Account Manager:</strong> Dedicated security expert for personalised support and
                strategic guidance
              </li>
              <li>
                <strong>Managed XDR with Identity and SOAR:</strong> Extended detection and response across all security
                layers with advanced automation
              </li>
              <li>
                <strong>Free Security Assessment:</strong> Comprehensive enterprise-level security evaluation
              </li>
              <li>
                <strong>24/7 Monitoring:</strong> Premium monitoring with priority response and escalation
              </li>
              <li>
                <strong>External Vulnerability Scanner:</strong> Advanced scanning with detailed reporting
              </li>
              <li>
                <strong>Web Application Vulnerability Scanner:</strong> In-depth web application security testing
              </li>
              <li>
                <strong>Internal Vulnerability Scanner:</strong> Comprehensive internal security assessment
              </li>
              <li>
                <strong>Enhanced Main Dashboard View:</strong> Advanced analytics and customizable security insights
              </li>
              <li>
                <strong>Immediate Actions:</strong> Priority automated and manual response with dedicated support
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>BENEFITS</span>
            <ul className={styles.benefitsList}>
              <li>Complete visibility across your entire security infrastructure</li>
              <li>Dedicated account manager for strategic security planning</li>
              <li>Advanced XDR capabilities for comprehensive threat detection</li>
              <li>Priority support and incident response</li>
              <li>Customisable dashboards for executive-level reporting</li>
              <li>Proactive security posture management</li>
              <li>Compliance support for the most stringent regulatory requirements</li>
              <li>Strategic security roadmap development</li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>IDEAL FOR</span>
            <p className={styles.description}>
              Major Decentralised Finance (Defi) protocols with significant Total Value Locked (TVL), Layer 1, Layer 2
              and Layer 3 blockchain projects, large Decentralised Autonomous Organisations (DAO) with complex
              governance structures, cross-chain bridge operators, and Web3 organisations with substantial treasury
              holdings that require dedicated security expertise and the most comprehensive protection available.
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
