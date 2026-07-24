"use client"
import { useEffect, useState } from "react"
import { TARGET_URL, TARGET_HOST } from "@/lib/target"
import styles from "./page.module.css"

// The host can be slow to answer, so never let detection block the redirect.
const DETECT_TIMEOUT_MS = 1500

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), DETECT_TIMEOUT_MS)),
  ])
}

export default function Home() {
  // Inside a Mini App the host opens the site in its own browser, so this page
  // stays visible and needs to offer a manual link instead of a progress bar.
  const [handedOff, setHandedOff] = useState(false)

  useEffect(() => {
    let cancelled = false

    const divert = async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk")
        const inMiniApp = await withTimeout(sdk.isInMiniApp(), false)

        if (cancelled) return

        if (inMiniApp) {
          // Dismiss the host splash screen before handing off, otherwise the
          // Mini App hangs on the loading state.
          await sdk.actions.ready()
          await sdk.actions.openUrl(TARGET_URL)
          if (!cancelled) setHandedOff(true)
          return
        }
      } catch {
        // Not a Mini App host, or the SDK failed to load. Fall through to a
        // plain browser redirect.
      }

      if (!cancelled) window.location.replace(TARGET_URL)
    }

    divert()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${TARGET_URL}`} />
      </noscript>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <img src="/Cybercentry_Logo_Blue.png" alt="Cybercentry" className={styles.logo} />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>{handedOff ? "Opened in your browser" : "Redirecting"}</span>

          <h1 className={styles.title}>Security &amp; Verification for Every EVM Chain and Solana</h1>

          <p className={styles.message}>
            {handedOff ? "Cybercentry has opened at " : "Taking you to "}
            <span className={styles.domain}>{TARGET_HOST}</span>
            {handedOff ? "." : ". If nothing happens, use the button below."}
          </p>

          <a className={styles.button} href={TARGET_URL} rel="noopener noreferrer">
            Continue to Cybercentry
            <span aria-hidden="true">&rarr;</span>
          </a>

          {!handedOff && (
            <div className={styles.progress} role="presentation">
              <div className={styles.progressBar} />
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>Verify wallets, agents, contracts and applications before execution.</footer>
    </div>
  )
}
