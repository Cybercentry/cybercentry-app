"use client"
import { useEffect, useRef, useState } from "react"
import type React from "react"
import { TARGET_URL, TARGET_HOST } from "@/lib/target"
import styles from "./page.module.css"

// Host detection can be slow; never let it block. On plain web the page
// auto-forwards after this delay so the landing is seen but the divert is still
// direct. Inside a Mini App there is no auto-forward — hosts require a user
// gesture to open an external URL — so the visitor taps the CTA.
const DETECT_TIMEOUT_MS = 1500
const WEB_REDIRECT_MS = 2600

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
  // "detecting" until we know the context. Web never dwells here — the redirect
  // fires. Mini App switches to a tap-to-open landing.
  const [mode, setMode] = useState<"detecting" | "miniapp" | "web">("detecting")
  const sdkRef = useRef<MiniAppSdk | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      let inMiniApp = false
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk")
        inMiniApp = await withTimeout(sdk.isInMiniApp(), false)
        if (inMiniApp) {
          sdkRef.current = sdk
          // Harmless in Base (no longer required there); still dismisses the
          // splash in Farcaster hosts. Best-effort.
          try {
            await sdk.actions.ready()
          } catch {
            /* ignore */
          }
        }
      } catch {
        // SDK unavailable — treat as plain web.
      }

      if (cancelled) return

      if (inMiniApp) {
        setMode("miniapp")
        return
      }

      // Plain web: show the landing briefly, then forward. location.replace adds
      // no history entry.
      setMode("web")
      const t = setTimeout(() => {
        if (!cancelled) window.location.replace(TARGET_URL)
      }, WEB_REDIRECT_MS)
      cleanup.push(() => clearTimeout(t))
    }

    const cleanup: (() => void)[] = []
    run()

    return () => {
      cancelled = true
      cleanup.forEach((fn) => fn())
    }
  }, [])

  const handleOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const sdk = sdkRef.current
    if (!sdk) return // plain web: let the <a href> navigate natively

    // Inside a Mini App, hand off through the SDK. openUrl is being superseded by
    // window.open in Base's newer model, so fall back to that, then to the
    // anchor's own navigation.
    event.preventDefault()
    Promise.resolve()
      .then(() => sdk.actions.openUrl(TARGET_URL))
      .catch(() => {
        if (typeof window !== "undefined" && window.open) window.open(TARGET_URL, "_blank", "noopener")
        else window.location.href = TARGET_URL
      })
  }

  const isMiniApp = mode === "miniapp"
  const isWeb = mode === "web"

  return (
    <div className={styles.page}>
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${TARGET_URL}`} />
      </noscript>

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
              <span className={styles.metaDot} />results in Seconds
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaDot} />Base mainnet
            </span>
          </div>

          <a className={styles.cta} href={TARGET_URL} onClick={handleOpen} rel="noopener noreferrer">
            {isMiniApp ? "Verify a B20 token" : "Open the verifier now"}
            <span aria-hidden="true">&rarr;</span>
          </a>

          {isWeb && (
            <>
              <div className={styles.progress} aria-hidden="true">
                <div className={styles.progressBar} style={{ ["--redirect-ms" as string]: `${WEB_REDIRECT_MS}ms` }} />
              </div>
              <p className={styles.redirectNote}>
                Taking you to <span className={styles.domain}>{TARGET_HOST}</span>…
              </p>
            </>
          )}
        </div>
      </main>

      <footer className={styles.footer}>Cybercentry — verify before you transact.</footer>
    </div>
  )
}
