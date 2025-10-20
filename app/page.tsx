"use client"
import type React from "react"
import Link from "next/link"
import styles from "./page.module.css"

const Page: React.FC = () => {
  return (
    <div>
      {/* ... existing code ... */}

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
            <Link href="/compliance" className={styles.learnMoreButton}>
              Learn More
            </Link>
          </div>

          <div className={styles.pillar}>
            <h3 className={styles.pillarTitle}>Intelligence</h3>
            <p className={styles.pillarDescription}>
              Gain actionable insights through penetration testing, vulnerability scanning, and daily threat
              intelligence reports.
            </p>
            <Link href="/intelligence" className={styles.learnMoreButton}>
              Learn More
            </Link>
          </div>

          <div className={styles.pillar}>
            <h3 className={styles.pillarTitle}>Protection</h3>
            <p className={styles.pillarDescription}>
              Strengthen your defences with 24/7 managed detection and response, real-time monitoring, and automated
              threat prevention.
            </p>
            <Link href="/protection" className={styles.learnMoreButton}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ... existing code ... */}
    </div>
  )
}

export default Page
