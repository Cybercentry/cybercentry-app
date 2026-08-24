"use client"
import type { CbtvReport, Detector, RiskLevel } from "@/lib/cbtv"
import { RISK_COLOR } from "@/lib/cbtv"
import styles from "./page.module.css"

const LEVELS: RiskLevel[] = ["High", "Medium", "Low", "Informational"]

function short(addr: string) {
  return addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
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

export function ReportView({ report, onReset }: { report: CbtvReport; onReset: () => void }) {
  const ti = report.token_info ?? {}
  const overall = report.overall_risk ?? "Informational"
  const oColor = RISK_COLOR[overall] ?? "#6b7280"
  const sev = report.severity_breakdown ?? { High: 0, Medium: 0, Low: 0, Informational: 0 }
  const detectors = report.detectors ?? []

  const threats = detectors.filter((d) => d.category === "threat")
  const controls = detectors.filter((d) => d.category === "control" && d.impact !== "Informational")
  const findings = (report.findings ?? []).filter((f) => f.title)

  const notB20 = report.is_b20 === false || report.status === "not_b20"

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
        <span className={styles.verdict} style={{ background: oColor }}>
          {notB20 ? "NOT A B20" : `${overall} risk`}
        </span>
      </div>

      {notB20 ? (
        <p className={styles.reportNote}>
          {detectors[0]?.description ?? "No initialised B20 token was found at this address on this chain."}
        </p>
      ) : (
        <>
          <div className={styles.chips}>
            {LEVELS.map((k) => (
              <span key={k} className={styles.chip} style={{ borderColor: RISK_COLOR[k], color: RISK_COLOR[k] }}>
                <b>{sev[k] ?? 0}</b> {k}
              </span>
            ))}
          </div>

          <div className={styles.summaryRow}>
            <span>
              <b>{report.threats_count ?? threats.length}</b> threats
            </span>
            <span>
              <b>{report.control_flags ?? controls.length}</b> issuer controls
            </span>
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

          {findings.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Verification findings</h3>
              <ul className={styles.findings}>
                {findings.slice(0, 12).map((f) => (
                  <li key={f.id} className={styles.finding}>
                    <span className={styles.findingBar} style={{ background: "#0d2b6b" }} aria-hidden="true" />
                    <div className={styles.findingBody}>
                      <span className={styles.findingTitle}>{f.title}</span>
                      {f.why ? <p className={styles.findingText}>{f.why}</p> : null}
                    </div>
                  </li>
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
