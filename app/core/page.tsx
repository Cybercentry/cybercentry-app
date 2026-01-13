"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

export default function CorePage() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("Core")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

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
          <h1 className={styles.title}>
            <span className={styles.titleText}>Core</span>
          </h1>
          <div className={styles.price}>
            <span className={styles.priceCurrency}>$</span>
            <span className={styles.priceAmount}>99.99</span>
            <span className={styles.pricePeriod}>USDC / month</span>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTag}>OVERVIEW</span>
            <p className={styles.description}>
              The Core package provides essential managed detection and response capabilities for Web3 organisations
              looking to establish a solid security foundation. Designed for teams ready to take their first step into
              professional security monitoring.
            </p>
          </div>

          <div className={styles.accordionContainer}>
            <div className={styles.accordionItem}>
              <button
                className={`${styles.accordionHeader} ${openSections.includes("included") ? styles.accordionHeaderOpen : ""}`}
                onClick={() => toggleSection("included")}
                aria-expanded={openSections.includes("included")}
              >
                <h2 className={styles.accordionTitle}>What&apos;s Included</h2>
                <span className={styles.accordionIcon}>{openSections.includes("included") ? "−" : "+"}</span>
              </button>
              <div
                className={`${styles.accordionContent} ${openSections.includes("included") ? styles.accordionContentOpen : ""}`}
              >
                <ul className={styles.featuresList}>
                  <li>
                    <strong>Managed EDR:</strong> 24/7 endpoint detection and response monitoring by security experts
                  </li>
                  <li>
                    <strong>Continuous Monitoring:</strong> Round-the-clock surveillance of your infrastructure
                  </li>
                  <li>
                    <strong>Threat Intelligence:</strong> Access to curated Web3-specific threat feeds
                  </li>
                  <li>
                    <strong>Incident Response:</strong> Expert-led response to security incidents
                  </li>
                  <li>
                    <strong>Monthly Reports:</strong> Detailed security posture assessments
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.accordionItem}>
              <button
                className={`${styles.accordionHeader} ${openSections.includes("benefits") ? styles.accordionHeaderOpen : ""}`}
                onClick={() => toggleSection("benefits")}
                aria-expanded={openSections.includes("benefits")}
              >
                <h2 className={styles.accordionTitle}>Key Benefits</h2>
                <span className={styles.accordionIcon}>{openSections.includes("benefits") ? "−" : "+"}</span>
              </button>
              <div
                className={`${styles.accordionContent} ${openSections.includes("benefits") ? styles.accordionContentOpen : ""}`}
              >
                <ul className={styles.benefitsList}>
                  <li>Foundational security coverage for emerging Web3 projects</li>
                  <li>Expert security monitoring without building an in-house team</li>
                  <li>Quick deployment with minimal configuration required</li>
                  <li>Cost-effective entry point for professional security</li>
                  <li>Scalable foundation that grows with your project</li>
                </ul>
              </div>
            </div>

            <div className={styles.accordionItem}>
              <button
                className={`${styles.accordionHeader} ${openSections.includes("ideal") ? styles.accordionHeaderOpen : ""}`}
                onClick={() => toggleSection("ideal")}
                aria-expanded={openSections.includes("ideal")}
              >
                <h2 className={styles.accordionTitle}>Ideal For</h2>
                <span className={styles.accordionIcon}>{openSections.includes("ideal") ? "−" : "+"}</span>
              </button>
              <div
                className={`${styles.accordionContent} ${openSections.includes("ideal") ? styles.accordionContentOpen : ""}`}
              >
                <p className={styles.description}>
                  Early-stage Decentralised Finance (DeFi) protocols, emerging Decentralised Autonomous Organisations
                  (DAOs), Non-Fungible Token (NFT) projects launching their first collections, and Web3 startups looking
                  to establish security fundamentals without overwhelming complexity.
                </p>
              </div>
            </div>
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
