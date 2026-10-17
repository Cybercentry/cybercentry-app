"use client"
import type { Component, CounterAsset, Finding } from "@/lib/cbtv"
import { toLevel, RISK_COLOR } from "@/lib/cbtv"
import { short, verdictColor, verdictLabel } from "@/lib/verdicts"
import styles from "./page.module.css"

export interface QuoteAssetResult {
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
          {c.verdict === "impersonation" && c.official
            ? ` — presents “${c.matchedOn}”; the issued contract is ${short(c.official)}`
            : ""}
        </p>
      </div>
    </li>
  )
}

/**
 * The settled asset. Presentational only — the form owns the input, the mode
 * and the payment, so this is reachable from the one flow a user already knows
 * rather than from a second form competing with it on the same page.
 */
export function QuoteAssetResultView({
  result,
  onReset,
}: {
  result: QuoteAssetResult
  onReset: () => void
}) {
  const asset = result.asset ?? {}
  const comp = asset.composite
  const settled = comp?.settled ?? []
  const unsettled = settled.filter((s) => s.verdict !== "verified").length
  const colour = verdictColor(asset.verdict)

  return (
    <div className={styles.verify}>
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

      {result.findings?.length ? (
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

      {result.disclaimer ? <p className={styles.qaNote}>{result.disclaimer}</p> : null}

      <button type="button" className={styles.secondaryBtn} onClick={onReset}>
        Check another
      </button>
    </div>
  )
}
