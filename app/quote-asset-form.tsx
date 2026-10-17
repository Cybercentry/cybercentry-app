"use client"
import { useState } from "react"
import type { Component, CounterAsset, Finding } from "@/lib/cbtv"
import { toLevel, RISK_COLOR } from "@/lib/cbtv"
import { short, verdictColor, verdictLabel } from "@/lib/verdicts"
import { payUsdc, signFreeScan, isUserRejection } from "@/lib/pay-usdc"
import { PAY_AMOUNT, TREASURY, PAY_TESTNET } from "@/lib/payments"
import styles from "./page.module.css"

const CHAIN = PAY_TESTNET ? "base-sepolia" : "base"
// Same key the scan form uses: one free use per browser, then pay. Shared on
// purpose - the free allowance belongs to the wallet, not to the feature.
const FREE_KEY = "cc_free_used"

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

interface QuoteAssetResult {
  address?: string
  asset?: CounterAsset & { name?: string | null; note?: string; isContract?: boolean }
  findings?: Finding[]
  disclaimer?: string
}

/** One component of a basket: a row in a list, not a headline. */
function ComponentRow({ c }: { c: Component }) {
  const colour = verdictColor(c.verdict)
  return (
    <li className={styles.qaRow}>
      <span className={styles.qaRowBar} style={{ background: colour }} aria-hidden="true" />
      <div className={styles.qaRowBody}>
        <span className={styles.qaRowHead}>
          <span className={styles.qaRowSym}>{c.symbol || short(c.address)}</span>
          <span className={styles.qaRowVerdict} style={{ color: colour }}>
            {verdictLabel(c.verdict)}
          </span>
        </span>
        <p className={styles.qaRowAddr}>
          {c.address}
          {c.verdict === "impersonation" && c.official ? (
            <>
              {" — presents “"}
              {c.matchedOn}
              {"”; the issued contract is "}
              {short(c.official)}
            </>
          ) : null}
        </p>
      </div>
    </li>
  )
}

/**
 * Check one address — a quote asset, a basket, a wrapper — without scanning a
 * token first.
 *
 * The composition check used to be reachable only inwards: a pool's quote asset
 * is settled while scanning the B20 token priced against it, and the main scan
 * rejects anything that is not a B20 token, which a basket never is. Someone
 * looking at a "meme / AAPL+TSLA+NVDA" pair had no way to ask what was actually
 * in the basket. This is that way.
 */
export function QuoteAssetForm() {
  const [address, setAddress] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuoteAssetResult | null>(null)

  async function check(e: React.FormEvent) {
    e.preventDefault()
    const addr = address.trim()
    if (!ADDRESS_RE.test(addr)) {
      setError("Enter a contract address (0x…)")
      setResult(null)
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await lookupPaid(addr))
    } catch (e) {
      if (isUserRejection(e)) setError("Cancelled")
      else setError(e instanceof Error ? e.message : "Could not read that contract")
    } finally {
      setBusy(false)
    }
  }

  /**
   * Same gate as a full scan: one free use per wallet, then 1 USDC. It goes
   * through /api/verify with mode "quote-asset" rather than a route of its own,
   * so the payment verification is the identical code path and nothing about
   * money was duplicated to add a second feature.
   */
  async function lookupPaid(addr: string): Promise<QuoteAssetResult> {
    const post = (extra: Record<string, unknown>) =>
      fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, chain: CHAIN, mode: "quote-asset", ...extra }),
      })

    let freeUsedHere = false
    try {
      freeUsedHere = localStorage.getItem(FREE_KEY) === "1"
    } catch {
      /* storage blocked — just try the free path */
    }

    if (!freeUsedHere) {
      let freeSig: Awaited<ReturnType<typeof signFreeScan>> | null = null
      try {
        freeSig = await signFreeScan(CHAIN)
      } catch (e) {
        // A cancelled signature is a real cancel; any other sign failure falls
        // back to paying.
        if (isUserRejection(e)) throw e
      }
      if (freeSig) {
        const res = await post({ freeSig })
        // 402 = this wallet already used its free check → fall through to paying.
        if (res.status !== 402) {
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || "Could not read that contract")
          try {
            localStorage.setItem(FREE_KEY, "1")
          } catch {}
          return json as QuoteAssetResult
        }
        try {
          localStorage.setItem(FREE_KEY, "1")
        } catch {}
      }
    }

    const { txHash } = await payUsdc({
      amount: PAY_AMOUNT,
      to: TREASURY as `0x${string}`,
      chain: CHAIN,
    })
    const res = await post({ txHash })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Could not read that contract")
    return json as QuoteAssetResult
  }

  const asset = result?.asset
  const comp = asset?.composite
  const settled = comp?.settled ?? []
  const unsettled = settled.filter((s) => s.verdict !== "verified").length
  const colour = verdictColor(asset?.verdict)

  return (
    <div className={styles.card}>
      <span className={styles.eyebrow}>Quote asset &amp; basket check</span>
      <h2 className={styles.qaTitle}>What would a pool pay you in?</h2>
      <p className={styles.qaLede}>
        A pool pays out in whatever sits on its other side. Paste that asset — a tokenized stock, a
        basket, an LP token, a wrapper — and every component is settled against the issuer&rsquo;s
        published list. A familiar ticker list is not a composition check.
      </p>

      <form onSubmit={check} className={styles.qaForm}>
        <input
          className={styles.input}
          value={address}
          onChange={(ev) => setAddress(ev.target.value)}
          placeholder="0x… quote asset or basket"
          spellCheck={false}
          autoComplete="off"
          aria-label="Quote asset or basket contract address"
        />
        <button type="submit" className={styles.qaBtn} disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}

      {asset ? (
        <>
          <div className={styles.qaResult} style={{ borderLeftColor: colour }}>
            <span className={styles.qaHead}>
              <span className={styles.qaSym}>{asset.symbol || short(asset.address)}</span>
              <span className={styles.qaPill} style={{ color: colour, borderColor: colour }}>
                {verdictLabel(asset.verdict)}
              </span>
            </span>
            <span className={styles.qaAddr}>
              {asset.address}
              {asset.name ? ` · ${asset.name}` : ""}
            </span>

            {asset.verdict === "impersonation" && asset.official ? (
              <p className={styles.qaNote}>
                Presents &ldquo;{asset.matchedOn}&rdquo;, but the contract the issuer publishes for{" "}
                {asset.ticker} is {asset.official}. This one is backed by no share — anything priced
                against it is priced in nothing.
              </p>
            ) : null}
            {asset.note ? <p className={styles.qaNote}>{asset.note}</p> : null}
          </div>

          {settled.length > 0 ? (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>What&rsquo;s inside it</h3>
              <p className={styles.qaLede}>
                A claim on {comp?.declared ?? settled.length} assets
                {comp?.interface ? `, read through ${comp.interface}()` : ""} —{" "}
                {settled.length - unsettled} of {settled.length} verified
                {unsettled ? `, ${unsettled} not settled` : ""}
                {comp?.truncated ? ", list truncated" : ""}.
              </p>
              <ul className={styles.qaList}>
                {settled.map((s, i) => (
                  <ComponentRow key={s.address ?? i} c={s} />
                ))}
              </ul>
            </section>
          ) : null}

          {result?.findings?.length ? (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Findings</h3>
              <ul className={styles.qaList}>
                {result.findings.map((f) => {
                  const level = toLevel(f.severity)
                  return (
                    <li key={f.id} className={styles.qaRow}>
                      <span
                        className={styles.qaRowBar}
                        style={{ background: RISK_COLOR[level] }}
                        aria-hidden="true"
                      />
                      <div className={styles.qaRowBody}>
                        <span className={styles.qaRowHead}>
                          <span className={styles.qaRowSym}>{f.title}</span>
                          <span className={styles.qaRowVerdict} style={{ color: RISK_COLOR[level] }}>
                            {level}
                          </span>
                        </span>
                        {f.why ? <p className={styles.qaNote}>{f.why}</p> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {result?.disclaimer ? <p className={styles.qaNote}>{result.disclaimer}</p> : null}
        </>
      ) : null}
    </div>
  )
}
