"use client"
import { useEffect, useRef, useState } from "react"
// Browser payment entry: pay() without the node/CDP subscription code, which
// pulls the optional @x402/evm dep we don't use.
import { pay } from "@base-org/account/payment/browser"
import type { CbtvReport, Chain, VerifyStatus } from "@/lib/cbtv"
import { PAY_AMOUNT, TREASURY, PAY_TESTNET, DATA_SUFFIX } from "@/lib/payments"
import { ReportView } from "./report-view"
import styles from "./page.module.css"

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const POLL_INTERVAL_MS = 3000
// Busy tokens (many pools / high transfer counts) can take a few minutes.
const POLL_TIMEOUT_MS = 300_000

const CHECKS = [
  "Sell-side honeypots",
  "Whitelisted exits",
  "Armed freeze-and-seize",
  "A live pause",
  "Fake B20s & copycats",
]

type Phase = "idle" | "paying" | "scanning" | "done" | "error" | "timeout"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function VerifyForm() {
  const [address, setAddress] = useState("")
  const [chain, setChain] = useState<Chain>("base")
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState("")
  const [report, setReport] = useState<CbtvReport | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const busy = phase === "paying" || phase === "scanning"
  const cancelled = useRef(false)
  // Held so a scan that outran the client poll can be recovered without paying
  // again — the job keeps running on the backend.
  const jobRef = useRef<string | null>(null)

  // Tick a seconds counter while a scan runs so ~30s of waiting has live feedback.
  useEffect(() => {
    if (phase !== "scanning") {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [phase])

  const reset = () => {
    cancelled.current = true
    setReport(null)
    setError("")
    setPhase("idle")
  }

  async function poll(jobId: string): Promise<CbtvReport> {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (cancelled.current) throw new Error("Cancelled")
      const res = await fetch(`/api/verify?jobId=${encodeURIComponent(jobId)}`)
      const data = (await res.json()) as VerifyStatus | { error: string }
      if ("status" in data) {
        if (data.status === "done") return data.report
        if (data.status === "error") throw new Error(data.error || "The scan failed")
      } else if (!res.ok) {
        throw new Error(data.error || "The scan failed")
      }
      await sleep(POLL_INTERVAL_MS)
    }
    throw new Error("The scan timed out. Please try again.")
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError("")

    const addr = address.trim()
    if (!ADDRESS_RE.test(addr)) {
      setError("Enter a valid 0x… token address (40 hex characters).")
      return
    }
    if (!TREASURY) {
      setError("Payments are not configured yet.")
      return
    }

    cancelled.current = false
    try {
      // 1) Base Pay — one-tap USDC. Throws if the user cancels or it fails.
      setPhase("paying")
      const payment = await pay({
        amount: PAY_AMOUNT,
        to: TREASURY,
        testnet: PAY_TESTNET,
        ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
      })
      if (!payment?.id) throw new Error("Payment did not complete.")

      // 2) Kick off the scan (server verifies the payment, holds the API key).
      setPhase("scanning")
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, chain, paymentId: payment.id }),
      })
      const kick = await res.json()
      if (!res.ok) throw new Error(kick.error || "Could not start the scan.")
      jobRef.current = kick.jobId

      // 3) Poll to completion, then render.
      const result = await poll(kick.jobId)
      if (cancelled.current) return
      setReport(result)
      setPhase("done")
    } catch (err) {
      if (cancelled.current) return
      const msg = err instanceof Error ? err.message : "Something went wrong."
      // Scan outran the poll but the paid job is still running — offer recovery.
      if (/timed out/i.test(msg) && jobRef.current) {
        setPhase("timeout")
        return
      }
      setError(/cancel|reject|denied/i.test(msg) ? "Payment cancelled." : msg)
      setPhase("error")
    }
  }

  // Re-poll the already-paid job (no new payment).
  async function recheck() {
    if (!jobRef.current) return
    cancelled.current = false
    setError("")
    setPhase("scanning")
    try {
      const result = await poll(jobRef.current)
      if (cancelled.current) return
      setReport(result)
      setPhase("done")
    } catch (err) {
      if (cancelled.current) return
      const msg = err instanceof Error ? err.message : "Something went wrong."
      if (/timed out/i.test(msg)) {
        setPhase("timeout")
        return
      }
      setError(msg)
      setPhase("error")
    }
  }

  if (phase === "done" && report) {
    return <ReportView report={report} onReset={reset} />
  }

  if (phase === "timeout") {
    return (
      <div className={styles.verify}>
        <p className={styles.hint}>
          The scan is taking longer than usual — it&rsquo;s still running on our side and{" "}
          <strong>your payment isn&rsquo;t lost</strong>. Give it a moment, then check again.
        </p>
        <button type="button" className={styles.cta} onClick={recheck}>
          Check result
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={reset}>
          Start over
        </button>
      </div>
    )
  }

  let ctaLabel = "Verify"
  if (phase === "paying") ctaLabel = "Confirm payment…"
  else if (phase === "scanning") ctaLabel = `Scanning… ${elapsed}s`

  return (
    <form className={styles.verify} onSubmit={onSubmit}>
      <label className={styles.label} htmlFor="token">
        B20 token contract address
      </label>
      <div className={styles.inputRow}>
        <input
          id="token"
          className={styles.input}
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          inputMode="text"
          disabled={busy}
        />
        <select
          className={styles.chain}
          value={chain}
          onChange={(e) => setChain(e.target.value as Chain)}
          disabled={busy}
          aria-label="Network"
        >
          <option value="base">Base</option>
          <option value="base-sepolia">Base Sepolia</option>
        </select>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.cta} disabled={busy}>
        {ctaLabel}
      </button>

      {!busy ? <p className={styles.priceNote}>$1 in USDC per verification · paid with Base Pay</p> : null}

      {busy ? (
        <div className={styles.progress} aria-hidden="true">
          <div className={styles.progressBar} />
        </div>
      ) : null}

      {phase === "scanning" ? (
        <p className={styles.hint}>
          {elapsed < 60
            ? "Running a real on-chain buy-and-sell round trip and reading the contract — usually under a minute."
            : "Still going — this is a busy token (many pools / lots of history). Keep the app open, it can take a few minutes."}
        </p>
      ) : (
        <ul className={styles.miniChecks}>
          {CHECKS.map((c) => (
            <li key={c} className={styles.miniCheck}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2.5 3 5.5v4c0 3.6 2.7 6.6 7 8 4.3-1.4 7-4.4 7-8v-4L10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="m7.3 9.8 1.9 1.9 3.5-3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {c}
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
