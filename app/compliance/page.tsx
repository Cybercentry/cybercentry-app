"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

export default function CompliancePage() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("")
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

    if (!plan) {
      setError("Please select a plan")
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

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          plan,
          fid: null,
          display_name: null,
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
          <div className={styles.pillarBadge}>◈ PILLAR</div>
          <h1 className={styles.title}>
            <span className={styles.titleText}>Compliance</span>
          </h1>

          <div className={styles.section}>
            <span className={styles.sectionTag}>OVERVIEW</span>
            <p className={styles.description}>
              Ensure regulatory adherence with Cyber Essentials certification and comprehensive compliance frameworks
              that keep you audit-ready. Our compliance pillar provides the foundation for meeting industry standards
              and regulatory requirements in the Web3 space.
            </p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>INCLUDED</span>
            <ul className={styles.featuresList}>
              <li>
                <strong>Cyber Essentials Certification:</strong> Achieve and maintain Cyber Essentials certification to
                demonstrate your commitment to security
              </li>
              <li>
                <strong>Compliance Framework Assessment:</strong> Comprehensive evaluation against industry standards
                and regulatory requirements
              </li>
              <li>
                <strong>Audit Preparation:</strong> Documentation and evidence collection to ensure audit readiness
              </li>
              <li>
                <strong>Policy Development:</strong> Creation and maintenance of security policies aligned with
                compliance requirements
              </li>
              <li>
                <strong>Continuous Monitoring:</strong> Ongoing compliance monitoring and reporting to maintain
                certification status
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>BENEFITS</span>
            <ul className={styles.benefitsList}>
              <li>Meet regulatory requirements for Web3 and traditional finance</li>
              <li>Build trust with users and partners through certified security practices</li>
              <li>Reduce risk of non-compliance penalties and legal issues</li>
              <li>Streamline audit processes with organised documentation</li>
              <li>Stay current with evolving compliance standards</li>
              <li>Demonstrate security maturity to investors and stakeholders</li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>IDEAL FOR</span>
            <p className={styles.description}>
              Web3 projects seeking to establish credibility, organisations handling sensitive user data, DeFi protocols
              requiring regulatory compliance, and any blockchain project looking to demonstrate security maturity to
              investors, partners, and users.
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
                  className={styles.planSelect}
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
