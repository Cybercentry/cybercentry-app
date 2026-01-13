"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

export default function IntelligencePage() {
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
            <span className={styles.titleText}>Intelligence</span>
          </h1>

          <div className={styles.section}>
            <span className={styles.sectionTag}>OVERVIEW</span>
            <p className={styles.description}>
              Gain actionable insights through penetration testing, vulnerability scanning, and daily threat
              intelligence reports. Our intelligence pillar empowers you with the knowledge needed to stay ahead of
              emerging threats and make informed security decisions.
            </p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>INCLUDED</span>
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
            <span className={styles.sectionTag}>BENEFITS</span>
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
            <span className={styles.sectionTag}>IDEAL FOR</span>
            <p className={styles.description}>
              Security-conscious Web3 projects, DeFi protocols managing significant assets, NFT platforms with valuable
              collections, blockchain projects preparing for major launches, and any organisation that needs to
              understand and mitigate security risks proactively.
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
