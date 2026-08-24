"use client"
import { useEffect, useRef } from "react"
import type React from "react"
import { TARGET_URL } from "@/lib/target"
import styles from "./page.module.css"

const DETECT_TIMEOUT_MS = 1500

type MiniAppSdk = typeof import("@farcaster/miniapp-sdk")["sdk"]

// What the Base Token Verification service checks — sellability first, because
// it's the trap a clean contract hides.
const CHECKS: { title: string; desc: string }[] = [
  { title: "Sell-side honeypots", desc: "you can buy, but the pool won't let you sell" },
  { title: "Whitelisted exits", desc: "a hook that quotes the deployer far better than a stranger" },
  { title: "Armed freeze-and-seize", desc: "issuer can freeze or take your balance" },
  { title: "A live pause", desc: "transfers already halted" },
  { title: "Fake B20s & copycats", desc: "counterfeits and ticker impersonators" },
]

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), DETECT_TIMEOUT_MS)),
  ])
}

export default function Home() {
  // The page shows the same landing everywhere — no auto-redirect. We only
  // detect the Mini App host so the CTA can hand off through the SDK (which a
  // plain <a> can't do inside a webview); on the web the anchor navigates.
  const sdkRef = useRef<MiniAppSdk | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk")
        // Call ready() on mount, unconditionally, so the host dismisses its
        // splash screen — required by the Mini App spec. NOT gated on
        // isInMiniApp: a slow host handshake must never leave the splash hung.
        // Fire-and-forget; harmless outside a host.
        void sdk.actions.ready().catch(() => {})
        const inMiniApp = await withTimeout(sdk.isInMiniApp(), false)
        if (!cancelled && inMiniApp) sdkRef.current = sdk
      } catch {
        /* not a Mini App host */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const sdk = sdkRef.current
    if (!sdk) return // web: let the <a href> navigate
    event.preventDefault()
    Promise.resolve()
      .then(() => sdk.actions.openUrl(TARGET_URL))
      .catch(() => {
        if (typeof window !== "undefined" && window.open) window.open(TARGET_URL, "_blank", "noopener")
        else window.location.href = TARGET_URL
      })
  }

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
            <strong>pool</strong>, not the token. Cybercentry runs a real buy-and-sell round trip and names what stops
            you getting out.
          </p>

          <ul className={styles.checks}>
            {CHECKS.map((c) => (
              <li key={c.title} className={styles.check}>
                <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 2.5 3 5.5v4c0 3.6 2.7 6.6 7 8 4.3-1.4 7-4.4 7-8v-4L10 2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="m7.3 9.8 1.9 1.9 3.5-3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>
                  <span className={styles.checkTitle}>{c.title}</span>
                  <span className={styles.checkDesc}> — {c.desc}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className={styles.lede}>
            It also discloses issuer controls — admin centralisation, supply cap, transfer policy, rebase — so a
            legitimate token isn&rsquo;t mistaken for a scam.
          </p>

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <span className={styles.metaDot} />$1 per check
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaDot} />Results in seconds
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaDot} />Base mainnet
            </span>
          </div>

          <a className={styles.cta} href={TARGET_URL} onClick={handleOpen} rel="noopener noreferrer">
            Verify a B20 token
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>Cybercentry — verify before you transact.</footer>
    </div>
  )
}
