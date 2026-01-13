"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddToAppsButton } from "@/components/add-to-apps-button"
import styles from "./page.module.css"

export default function CorePage() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("Core")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [mouseVelocity, setMouseVelocity] = useState({ x: 0, y: 0 })
  const prevMousePos = useRef({ x: 0.5, y: 0.5 })
  const router = useRouter()
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight

      const velocityX = x - prevMousePos.current.x
      const velocityY = y - prevMousePos.current.y
      setMouseVelocity({ x: velocityX * 10, y: velocityY * 10 })
      prevMousePos.current.x = x
      prevMousePos.current.y = y

      setMousePos({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

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
      <svg className={styles.heroBackground} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
          </linearGradient>
          <linearGradient id="lineGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.2)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="particleGradient">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.8)" />
            <stop offset="100%" stopColor="rgba(13, 43, 107, 0)" />
          </radialGradient>
          <radialGradient id="cursorGlow">
            <stop offset="0%" stopColor="rgba(13, 43, 107, 0.4)" />
            <stop offset="70%" stopColor="rgba(13, 43, 107, 0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {[...Array(12)].map((_, i) => {
          const baseY = 50 + i * 70
          const offsetX = (mousePos.x - 0.5) * 250 * (i % 2 === 0 ? 1 : -1) + mouseVelocity.x * 20
          const offsetY = (mousePos.y - 0.5) * 120 + mouseVelocity.y * 15

          return (
            <path
              key={i}
              d={`M 0 ${baseY + offsetY} Q ${300 + offsetX} ${baseY - 80 + offsetY}, ${600 + offsetX * 0.5} ${baseY + offsetY} T 1200 ${baseY + offsetY}`}
              stroke={i % 3 === 0 ? "url(#lineGradient2)" : "url(#lineGradient)"}
              strokeWidth={i % 2 === 0 ? "2.5" : "1.5"}
              fill="none"
              opacity={0.4 - i * 0.025}
              filter="url(#glow)"
            />
          )
        })}

        {[...Array(50)].map((_, i) => {
          const baseX = (i * 137.5) % 1200
          const baseY = (i * 73) % 800
          const distX = Math.abs(mousePos.x * 1200 - baseX)
          const distY = Math.abs(mousePos.y * 800 - baseY)
          const dist = Math.sqrt(distX * distX + distY * distY)
          const scale = Math.max(0.3, Math.min(2, 1.5 - dist / 400))

          const angle = Math.atan2(baseY - mousePos.y * 800, baseX - mousePos.x * 1200)
          const repulsion = Math.max(0, 150 - dist) / 150
          const moveX = Math.cos(angle) * repulsion * 80
          const moveY = Math.sin(angle) * repulsion * 80

          return (
            <circle
              key={`particle-${i}`}
              cx={baseX + moveX + mouseVelocity.x * 5}
              cy={baseY + moveY + mouseVelocity.y * 5}
              r={2.5 * scale}
              fill="url(#particleGradient)"
              filter="url(#glow)"
              opacity={0.6 + scale * 0.4}
            />
          )
        })}

        {[...Array(50)].map((_, i) => {
          const x1 = (i * 137.5) % 1200
          const y1 = (i * 73) % 800
          const x2 = ((i + 7) * 137.5) % 1200
          const y2 = ((i + 7) * 73) % 800
          const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

          if (dist < 200) {
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const distToMouse = Math.sqrt((midX - mousePos.x * 1200) ** 2 + (midY - mousePos.y * 800) ** 2)
            const opacity = Math.max(0, 0.3 - distToMouse / 800)

            return (
              <line
                key={`connection-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(96, 165, 250, 0.3)"
                strokeWidth="1"
                opacity={opacity}
              />
            )
          }
          return null
        })}

        <circle
          cx={mousePos.x * 1200}
          cy={mousePos.y * 800}
          r="150"
          fill="url(#cursorGlow)"
          filter="url(#glow)"
          opacity="0.8"
        />
      </svg>

      <div className={styles.container}>
        <Link href="/" className={styles.backButton}>
          ← Back to Home
        </Link>

        <div className={styles.content}>
          <h1 className={styles.title}>Core</h1>
          <div className={styles.price}>
            <span className={styles.priceAmount}>$99.99 USDC</span>
            <span className={styles.pricePeriod}>per organisation per month</span>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <p className={styles.description}>
              The Core package provides essential managed detection and response capabilities for Web3 organisations
              looking to establish a solid security foundation. Designed for teams ready to take their first step into
              professional security monitoring.
            </p>
          </div>

          <div className={styles.accordionContainer}>
            {/* What's Included Accordion */}
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

            {/* Key Benefits Accordion */}
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

            {/* Ideal For Accordion */}
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
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.waitlistForm}>
              <h2 className={styles.title}>Get Started</h2>

              <p className={styles.subtitle}>Select your plan and sign up to secure your Web3 project.</p>

              <form onSubmit={handleSubmit} className={styles.form}>
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

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                  disabled={isSubmitting}
                />

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.joinButton} disabled={isSubmitting}>
                  {isSubmitting ? "SIGNING UP..." : "SIGN UP NOW"}
                </button>
              </form>

              <AddToAppsButton buttonClassName={styles.addButton} descriptionClassName={styles.addDescription} />
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2026 Cybercentry. All rights reserved.</p>
      </footer>
    </div>
  )
}
