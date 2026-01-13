"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

export default function ProtectionPage() {
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
          <div className={styles.pillarBadge}>PILLAR</div>
          <h1 className={styles.title}>
            <span className={styles.titleText}>Protection</span>
          </h1>

          <div className={styles.section}>
            <span className={styles.sectionTag}>OVERVIEW</span>
            <p className={styles.description}>
              Strengthen your defences with 24/7 managed detection and response, real-time monitoring, and automated
              threat prevention. Our protection pillar provides the active defence mechanisms needed to detect, respond
              to, and neutralise threats in real-time.
            </p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>INCLUDED</span>
            <ul className={styles.featuresList}>
              <li>
                <strong>24/7 Managed Detection and Response:</strong> Round-the-clock monitoring and response by our
                expert security operations team
              </li>
              <li>
                <strong>Real-Time Monitoring:</strong> Continuous surveillance of your infrastructure, applications, and
                blockchain transactions
              </li>
              <li>
                <strong>Automated Threat Prevention:</strong> AI-powered systems that automatically block and mitigate
                threats
              </li>
              <li>
                <strong>Incident Response:</strong> Rapid response to security incidents with detailed forensics and
                remediation
              </li>
              <li>
                <strong>Security Orchestration:</strong> Automated workflows that coordinate security tools and response
                actions
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>BENEFITS</span>
            <ul className={styles.benefitsList}>
              <li>Immediate detection and response to security threats</li>
              <li>Reduce dwell time of attackers in your environment</li>
              <li>Minimise impact of security incidents through rapid response</li>
              <li>24/7 coverage without the cost of an in-house SOC team</li>
              <li>Automated threat prevention reduces manual intervention</li>
              <li>Peace of mind knowing experts are watching your systems</li>
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>IDEAL FOR</span>
            <p className={styles.description}>
              High-value DeFi protocols, NFT marketplaces with active trading, blockchain projects with critical
              infrastructure, Web3 organisations handling user funds, and any project that requires continuous security
              monitoring and rapid incident response capabilities.
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
