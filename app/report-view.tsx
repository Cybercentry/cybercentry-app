"use client"
import type { CbtvReport, Detector, Finding, RiskLevel } from "@/lib/cbtv"
import { RISK_COLOR, RISK_ORDER } from "@/lib/cbtv"
import styles from "./page.module.css"

function short(addr: string) {
  return addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

// CBTV grades / finding severities come as strings like "high_risk", "Critical",
// "Medium". Map them onto the four-level scale so one worst-case headline can be
// derived — a venue honeypot lives in the findings/grade, not in overall_risk,
// and must not be undersold.
function toLevel(v?: string | null): RiskLevel {
  const s = (v || "").toLowerCase()
  if (/terminal|escalate|critical|high/.test(s)) return "High"
  if (/medium/.test(s)) return "Medium"
  if (/\blow\b/.test(s)) return "Low"
  return "Informational"
}

function worst(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((a, b) => (RISK_ORDER[b] > RISK_ORDER[a] ? b : a), "Informational")
}

function DetectorRow({ d }: { d: Detector }) {
  const color = RISK_COLOR[d.impact] ?? "#6b7280"
  return (
    <li className={styles.finding}>
      <span className={styles.findingBar} style={{ background: color }} aria-hidden="true" />
      <div className={styles.findingBody}>
        <span className={styles.findingImpact} style={{ color }}>
          {d.impact}
        </span>
        <p className={styles.findingText}>{d.description}</p>
        {d.recommendation ? <p className={styles.findingRec}>{d.recommendation}</p> : null}
      </div>
    </li>
  )
}

function FindingRow({ f }: { f: Finding }) {
  const level = toLevel(f.severity)
  const color = RISK_COLOR[level]
  return (
    <li className={styles.finding}>
      <span className={styles.findingBar} style={{ background: color }} aria-hidden="true" />
      <div className={styles.findingBody}>
        <span className={styles.findingImpact} style={{ color }}>
          {level}
        </span>
        <span className={styles.findingTitle}> {f.title}</span>
        {f.why ? <p className={styles.findingText}>{f.why}</p> : null}
      </div>
    </li>
  )
}

export function ReportView({ report, onReset }: { report: CbtvReport; onReset: () => void }) {
  const ti = report.token_info ?? {}
  const detectors = report.detectors ?? []
  const notB20 = report.is_b20 === false || report.status === "not_b20"

  // Findings sorted worst-first.
  const findings = (report.findings ?? [])
    .filter((f) => f.title)
    .sort((a, b) => RISK_ORDER[toLevel(b.severity)] - RISK_ORDER[toLevel(a.severity)])

  const threats = detectors.filter((d) => d.category === "threat")
  const controls = detectors.filter((d) => d.category === "control" && d.impact !== "Informational")

  // Count the findings by severity for the summary — "threats" (detector-only)
  // reads as 0 on a venue honeypot, which is misleading.
  const findingLevels = findings.map((f) => toLevel(f.severity))
  const highCount = findingLevels.filter((l) => l === "High").length
  const medCount = findingLevels.filter((l) => l === "Medium").length
  const lowCount = findingLevels.filter((l) => l === "Low").length

  // The app's whole promise is "Can you sell it?" — answer it directly and first.
  // A sell-side result lives in the venue findings (cannot be sold / honeypot) or
  // a honeypot detector.
  const sellFinding = findings.find((f) => /cannot be sold|sold back|honeypot/i.test(f.title))
  const honeypotDetector = detectors.find(
    (d) => d.check === "honeypot" || d.check === "receive-restricted" || /honeypot/i.test(d.description),
  )
  const cannotSell = Boolean(sellFinding || honeypotDetector)
  const sellReason =
    sellFinding?.why ||
    honeypotDetector?.description ||
    (cannotSell
      ? "The pool won't let you sell this token back at value."
      : "No sell-side trap was found — this token looks sellable. Still weigh the risks below.")
  const sellColor = cannotSell ? "#dc2626" : "#16a34a"

  // The verdict is the WORST of overall_risk, the capped grade, and the findings —
  // never the mildest. Stops a Medium control surface hiding a High-risk honeypot.
  const displayLevel: RiskLevel = notB20
    ? "Informational"
    : worst([
        report.overall_risk ?? "Informational",
        toLevel(report.grade),
        ...findings.map((f) => toLevel(f.severity)),
      ])
  const vColor = RISK_COLOR[displayLevel]

  return (
    <div className={styles.report}>
      <div className={styles.reportHead}>
        <div>
          <h2 className={styles.reportTitle}>
            {ti.name || "Unnamed token"} {ti.symbol ? <span className={styles.reportSym}>({ti.symbol})</span> : null}
          </h2>
          <p className={styles.reportMeta}>
            <span className={styles.domain}>{short(report.address)}</span> · B20 · {report.chain}
          </p>
        </div>
        <span className={styles.verdict} style={{ background: vColor }}>
          {notB20 ? "NOT A B20" : `${displayLevel} risk`}
        </span>
      </div>

      {notB20 ? (
        <p className={styles.reportNote}>
          {detectors[0]?.description ?? "No initialised B20 token was found at this address on this chain."}
        </p>
      ) : (
        <>
          {/* The app's promise, answered first and unmissably. */}
          <div className={styles.answer} style={{ borderColor: sellColor }}>
            <span className={styles.answerQ}>Can you sell it?</span>
            <span className={styles.answerA} style={{ color: sellColor }}>
              {cannotSell ? "No" : "Yes"}
            </span>
            <p className={styles.answerWhy}>{sellReason}</p>
          </div>

          <div className={styles.summaryRow}>
            {highCount > 0 ? (
              <span>
                <b>{highCount}</b> high
              </span>
            ) : null}
            {medCount > 0 ? (
              <span>
                <b>{medCount}</b> medium
              </span>
            ) : null}
            {lowCount > 0 ? (
              <span>
                <b>{lowCount}</b> low
              </span>
            ) : null}
            {controls.length > 0 ? (
              <span>
                <b>{controls.length}</b> issuer control{controls.length > 1 ? "s" : ""}
              </span>
            ) : null}
            {report.grade ? (
              <span>
                grade <b>{String(report.grade)}</b>
                {report.provisional ? " (provisional)" : ""}
              </span>
            ) : null}
          </div>

          {threats.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Threats</h3>
              <ul className={styles.findings}>
                {threats.map((d, i) => (
                  <DetectorRow key={`t${i}`} d={d} />
                ))}
              </ul>
            </section>
          )}

          {findings.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Verification findings</h3>
              <ul className={styles.findings}>
                {findings.slice(0, 14).map((f) => (
                  <FindingRow key={f.id} f={f} />
                ))}
              </ul>
            </section>
          )}

          {controls.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Issuer controls</h3>
              <ul className={styles.findings}>
                {controls.map((d, i) => (
                  <DetectorRow key={`c${i}`} d={d} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <button type="button" className={styles.secondaryBtn} onClick={onReset}>
        Verify another token
      </button>
    </div>
  )
}
