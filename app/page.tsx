"use client"
import { useEffect, useRef, useState } from "react"
import type React from "react"
import { TARGET_URL, TARGET_HOST } from "@/lib/target"
import styles from "./page.module.css"

// The host can be slow to answer, so never let detection block the redirect.
const DETECT_TIMEOUT_MS = 1500

type MiniAppSdk = typeof import("@farcaster/miniapp-sdk")["sdk"]

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), DETECT_TIMEOUT_MS)),
  ])
}

export default function Home() {
  // "detecting" covers the brief moment before we know where we are. On plain
  // web we never leave it, because the redirect fires first.
  const [mode, setMode] = useState<"detecting" | "miniapp">("detecting")
  const sdkRef = useRef<MiniAppSdk | null>(null)

  useEffect(() => {
    let cancelled = false

    const detect = async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk")
        const inMiniApp = await withTimeout(sdk.isInMiniApp(), false)

        if (cancelled) return

        if (inMiniApp) {
          sdkRef.current = sdk
          // Dismiss the host splash screen, otherwise the Mini App hangs on
          // the loading state.
          await sdk.actions.ready()
          if (!cancelled) setMode("miniapp")
          // Deliberately no auto-open: hosts block openUrl() that isn't tied to
          // a user gesture, so we wait for the tap.
          return
        }
      } catch {
        // Not a Mini App host, or the SDK failed to load. Fall through to a
        // plain browser redirect.
      }

      if (!cancelled) window.location.replace(TARGET_URL)
    }

    detect()

    return () => {
      cancelled = true
    }
  }, [])

  const handleOpen = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    const sdk = sdkRef.current
    // Outside a Mini App the plain href does the right thing already.
    if (!sdk) return

    event.preventDefault()
    try {
      await sdk.actions.openUrl(TARGET_URL)
    } catch {
      window.location.href = TARGET_URL
    }
  }

  const isMiniApp = mode === "miniapp"

  return (
    <div className={styles.page}>
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${TARGET_URL}`} />
      </noscript>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* next/image is pointless here: next.config sets images.unoptimized,
              and this is a single static logo on a page that redirects away. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Cybercentry_Logo_Blue.png" alt="Cybercentry" className={styles.logo} />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>{isMiniApp ? "Cybercentry" : "Redirecting"}</span>

          <h1 className={styles.title}>Security Verification for EVM and Solana</h1>

          <p className={styles.message}>
            {isMiniApp ? "Continue to the full site at " : "Taking you to "}
            <span className={styles.domain}>{TARGET_HOST}</span>.
          </p>

          <a className={styles.button} href={TARGET_URL} onClick={handleOpen} rel="noopener noreferrer">
            {isMiniApp ? "Open Cybercentry" : "Continue to Cybercentry"}
            <span aria-hidden="true">&rarr;</span>
          </a>

          {!isMiniApp && (
            <div className={styles.progress} aria-hidden="true">
              <div className={styles.progressBar} />
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>Verify wallets, agents, contracts and applications before execution.</footer>
    </div>
  )
}
