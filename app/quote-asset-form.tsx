"use client"
import { useState } from "react"
import type { Component, CounterAsset, Finding } from "@/lib/cbtv"
import { toLevel, RISK_COLOR } from "@/lib/cbtv"
import { short, verdictColor, verdictLabel } from "@/lib/verdicts"
import styles from "./page.module.css"

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

interface QuoteAssetResult {
  address?: string
  asset?: CounterAsset & { name?: string | null; note?: string; isContract?: boolean }
  findings?: Finding[]
  disclaimer?: string
}

function Row({ c }: { c: Component }) {
  return (
    <li className={styles.finding}>
      <span className={styles.findingBar} style={{ background: verdictColor(c.verdict) }} aria-hidden="true" />
      <div className={styles.findingBody}>
        <span className={styles.findingImpact} style={{ color: verdictColor(c.verdict) }}>
          {verdictLabel(c.verdict)}
        </span>
        <span className={styles.findingTitle}> {c.symbol || short(c.address)}</span>
        <p className={styles.findingText}>
          {short(c.address)}
          {c.verdict === "impersonation" && c.official
            ? ` — presents “${c.matchedOn}”; the issued contract is ${short(c.official)}`
            : ""}
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
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/quote-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, chain: "base" }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error ?? "Could not read that contract")
      else setResult(json as QuoteAssetResult)
    } catch {
      setError("Network error — try again")
    } finally {
      setBusy(false)
    }
  }

  const asset = result?.asset
  const comp = asset?.composite
  const settled = comp?.settled ?? []
  const unsettled = settled.filter((s) => s.verdict !== "verified").length

  return (
    <div className={styles.card}>
      <span className={styles.eyebrow}>Quote asset &amp; basket check</span>
      <h2 className={styles.title}>What would a pool pay you in?</h2>
      <p className={styles.lede}>
        A pool pays out in whatever is on its other side. Paste that asset — a tokenized stock, a
        basket, an LP token, a wrapper — and every component is settled against the issuer&rsquo;s
        published list. A familiar ticker list is not a composition check. Free, no wallet needed.
      </p>

      <form onSubmit={check} className={styles.inputRow}>
        <input
          className={styles.input}
          value={address}
          onChange={(ev) => setAddress(ev.target.value)}
          placeholder="0x… quote asset, basket or wrapper"
          spellCheck={false}
          autoComplete="off"
          aria-label="Quote asset or basket contract address"
        />
        <button type="submit" className={styles.secondaryBtn} disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}

      {asset ? (
        <>
          <div className={styles.answer} style={{ borderColor: verdictColor(asset.verdict) }}>
            <span className={styles.answerQ}>{asset.symbol || short(asset.address)}</span>
            <span className={styles.answerA} style={{ color: verdictColor(asset.verdict) }}>
              {verdictLabel(asset.verdict)}
            </span>
            {asset.verdict === "impersonation" && asset.official ? (
              <p className={styles.answerWhy}>
                Presents &ldquo;{asset.matchedOn}&rdquo;, but the contract the issuer publishes for{" "}
                {asset.ticker} is {short(asset.official)}. This one is backed by no share. Anything
                priced against it is priced in nothing.
              </p>
            ) : null}
            {asset.note ? <p className={styles.answerWhy}>{asset.note}</p> : null}
          </div>

          {settled.length > 0 ? (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>What&rsquo;s inside it</h3>
              <p className={styles.reportNote}>
                A claim on {comp?.declared ?? settled.length} assets
                {comp?.interface ? `, read through ${comp.interface}()` : ""} —{" "}
                {settled.length - unsettled} of {settled.length} verified
                {unsettled ? `, ${unsettled} not settled` : ""}
                {comp?.truncated ? ", list truncated" : ""}.
              </p>
              <ul className={styles.findings}>
                {settled.map((s, i) => (
                  <Row key={s.address ?? i} c={s} />
                ))}
              </ul>
            </section>
          ) : null}

          {result?.findings?.length ? (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Findings</h3>
              <ul className={styles.findings}>
                {result.findings.map((f) => {
                  const level = toLevel(f.severity)
                  return (
                    <li key={f.id} className={styles.finding}>
                      <span
                        className={styles.findingBar}
                        style={{ background: RISK_COLOR[level] }}
                        aria-hidden="true"
                      />
                      <div className={styles.findingBody}>
                        <span className={styles.findingImpact} style={{ color: RISK_COLOR[level] }}>
                          {level}
                        </span>
                        <span className={styles.findingTitle}> {f.title}</span>
                        {f.why ? <p className={styles.findingText}>{f.why}</p> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {result?.disclaimer ? <p className={styles.reportNote}>{result.disclaimer}</p> : null}
        </>
      ) : null}
    </div>
  )
}
