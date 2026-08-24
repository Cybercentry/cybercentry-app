"use client"
import { useEffect } from "react"
import { VerifyForm } from "./verify-form"
import styles from "./page.module.css"

export default function Home() {
  // Dismiss the host splash screen as soon as we mount — required by the Mini App
  // spec, harmless outside a host. Fire-and-forget, never gated on detection.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk")
        if (!cancelled) void sdk.actions.ready().catch(() => {})
      } catch {
        /* not a Mini App host */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* next/image is pointless here: next.config sets images.unoptimized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Cybercentry_Logo_Blue.png" alt="Cybercentry" className={styles.logo} />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>Cybercentry · Base Token Verification</span>
          <h1 className={styles.title}>You can buy it. Can you sell it?</h1>
          <p className={styles.lede}>
            A B20 (a Base token) can pass every contract check and still be a honeypot — the trap lives in the{" "}
            <strong>pool</strong>, not the token. Paste an address and Cybercentry runs a real buy-and-sell round trip.
          </p>

          <VerifyForm />
        </div>
      </main>

      <footer className={styles.footer}>Cybercentry — verify before you transact.</footer>
    </div>
  )
}
