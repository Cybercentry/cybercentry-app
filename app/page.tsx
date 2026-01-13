"use client"
import { useState, useRef } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

function HomeStandalone() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
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

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logoContainer}>
            <img
              src="/white-icon.png"
              alt="Cybercentry One Logo"
              className={styles.heroIcon}
              style={{ imageRendering: "crisp-edges" }}
            />
            <div className={styles.logoGlow} />
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.titleText}>CYBERCENTRY ONE</span>
            <span className={styles.titleGhost}>CYBERCENTRY ONE</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.
            AI-powered security built on Compliance, Intelligence, and Protection.
          </p>

          <div className={styles.scrollIndicator}>
            <div className={styles.scrollMouse}>
              <div className={styles.scrollWheel} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.pillars}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>FOUNDATIONS</span>
          <h2 className={styles.sectionTitle}>Three Core Pillars</h2>
          <p className={styles.sectionSubtitle}>
            Centralised access to specialised solutions for actionable insights, stronger defences, and regulatory
            adherence.
          </p>
        </div>

        <div className={styles.pillarsGrid}>
          {[
            {
              title: "Compliance",
              desc: "Ensure regulatory adherence with Cyber Essentials certification and comprehensive compliance frameworks that keep you audit-ready.",
              link: "/compliance",
            },
            {
              title: "Intelligence",
              desc: "Gain actionable insights through penetration testing, vulnerability scanning, and daily threat intelligence reports.",
              link: "/intelligence",
            },
            {
              title: "Protection",
              desc: "Strengthen your defences with 24/7 managed detection and response, real-time monitoring, and automated threat prevention.",
              link: "/protection",
            },
          ].map((pillar, i) => (
            <div key={i} className={styles.pillar}>
              <h3 className={styles.pillarTitle}>{pillar.title}</h3>
              <p className={styles.pillarDescription}>{pillar.desc}</p>
              <Link href={pillar.link} className={styles.learnMoreButton}>
                <span>Learn More</span>
                <span className={styles.buttonArrow}>→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.services}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>PRICING</span>
          <h2 className={styles.sectionTitle}>Security Plans</h2>
          <p className={styles.sectionSubtitle}>Choose from our curated suite of AI-powered security services.</p>
        </div>

        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <h4 className={styles.pricingTier}>Core</h4>
            <div className={styles.price}>
              <span className={styles.priceCurrency}>$</span>
              <span className={styles.priceAmount}>69.99</span>
              <span className={styles.pricePeriod}>USDC / month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed EDR</li>
              <li>24/7 Monitoring</li>
              <li>Free Security Assessment</li>
              <li>External Vulnerability Scanner</li>
              <li>Immediate Actions</li>
            </ul>
            <Link href="/core" className={styles.learnMoreButton}>
              <span>Learn More</span>
              <span className={styles.buttonArrow}>→</span>
            </Link>
          </div>

          <div className={`${styles.pricingCard} ${styles.popular}`}>
            <div className={styles.popularBadge}>
              <span className={styles.badgeGlow} />
              MOST POPULAR
            </div>
            <h4 className={styles.pricingTier}>Edge</h4>
            <div className={styles.price}>
              <span className={styles.priceCurrency}>$</span>
              <span className={styles.priceAmount}>349.99</span>
              <span className={styles.pricePeriod}>USDC / month</span>
            </div>
            <ul className={styles.features}>
              <li>Managed EDR with Identity + SOAR</li>
              <li>24/7 Monitoring</li>
              <li>Free Security Assessment</li>
              <li>External Vulnerability Scanner</li>
              <li>Web App Vulnerability Scanner</li>
              <li>Internal Vulnerability Scanner</li>
              <li>Immediate Actions</li>
            </ul>
            <Link href="/edge" className={styles.learnMoreButton}>
              <span>Learn More</span>
              <span className={styles.buttonArrow}>→</span>
            </Link>
          </div>

          <div className={styles.pricingCard}>
            <h4 className={styles.pricingTier}>One</h4>
            <div className={styles.price}>
              <span className={styles.priceCurrency}>$</span>
              <span className={styles.priceAmount}>1,099.99</span>
              <span className={styles.pricePeriod}>USDC / month</span>
            </div>
            <ul className={styles.features}>
              <li>Dedicated Account Manager</li>
              <li>Managed XDR with Identity + SOAR</li>
              <li>24/7 Monitoring</li>
              <li>All Vulnerability Scanners</li>
              <li>Enhanced Dashboard View</li>
              <li>Immediate Actions</li>
            </ul>
            <Link href="/one" className={styles.learnMoreButton}>
              <span>Learn More</span>
              <span className={styles.buttonArrow}>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.waitlistSection}>
        <div className={styles.waitlistGlow} />
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.waitlistForm}>
              <span className={styles.sectionTag}>GET STARTED</span>
              <h2 className={styles.title}>Join the Future</h2>
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
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGlow} />
        <p>© 2026 Cybercentry. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default function Home() {
  return <HomeStandalone />
}
