"use client"
import { useEffect, useState } from "react"
import type { CbtvReport, Detector, Finding, RiskLevel } from "@/lib/cbtv"
import { RISK_COLOR, RISK_ORDER, isAdvisoryFinding, isAdvisoryDetector, toLevel, worst } from "@/lib/cbtv"
import styles from "./page.module.css"

// A tap-to-add button — shown only inside a Mini App host and only until added.
// "Adds to collection" is one of the signals Base/Farcaster discovery ranks on,
// and a user gesture is far more reliable than an auto-fired prompt.
function AddApp() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (localStorage.getItem("cc_added") === "1") return
        const { sdk } = await import("@farcaster/miniapp-sdk")
        // isInMiniApp() can read false / lag in the in-app browser, so fall back
        // to the context Promise (resolves with a client only inside a host).
        let inApp = false
        try {
          inApp = await sdk.isInMiniApp()
        } catch {
          /* try the context fallback */
        }
        if (!inApp) {
          try {
            const ctx = (await Promise.race([
              sdk.context,
              new Promise((r) => setTimeout(() => r(null), 1200)),
            ])) as { client?: unknown } | null
            inApp = !!ctx?.client
          } catch {
            /* not a host */
          }
        }
        // Last resort: the Base / Coinbase app webview by user-agent. addMiniApp
        // is a no-op if the bridge isn't actually there, so this only ever adds a
        // harmless button inside their app — never in a plain desktop browser.
        if (!inApp && typeof navigator !== "undefined" && /coinbase|base\s?app|baseapp/i.test(navigator.userAgent)) {
          inApp = true
        }
        if (!cancelled && inApp) setShow(true)
      } catch {
        /* SDK unavailable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  if (!show) return null
  async function add() {
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk")
      const act = sdk.actions as { addMiniApp?: () => Promise<unknown>; addFrame?: () => Promise<unknown> }
      if (typeof act.addMiniApp === "function") await act.addMiniApp()
      else if (typeof act.addFrame === "function") await act.addFrame()
      localStorage.setItem("cc_added", "1")
      setShow(false)
    } catch {
      /* dismissed or unsupported — leave the button so they can retry */
    }
  }
  return (
    <button type="button" className={styles.addBtn} onClick={add}>
      + Add Cybercentry to your apps
    </button>
  )
}

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

  // Ecosystem/impersonation cautions (e.g. same-ticker copycats made by OTHERS)
  // are separated out: they're a "check the address" caution for the buyer, not a
  // fault of the scanned contract, so they never count toward its verdict, its
  // findings, or its issuer controls. They arrive as either a finding or a
  // control detector, so both are captured here into one "Before you buy" list.
  const allFindings = (report.findings ?? []).filter((f) => f.title)

  // The token's OWN findings, sorted worst-first.
  const findings = allFindings
    .filter((f) => !isAdvisoryFinding(f))
    .sort((a, b) => RISK_ORDER[toLevel(b.severity)] - RISK_ORDER[toLevel(a.severity)])

  const advisories: { key: string; title: string; text?: string }[] = [
    ...allFindings.filter(isAdvisoryFinding).map((f) => ({ key: f.id, title: f.title, text: f.why })),
    ...(report.detectors ?? [])
      .filter(isAdvisoryDetector)
      .map((d, i) => ({ key: `ad${i}`, title: d.description, text: d.recommendation })),
  ]
  // The "genuine token / copycats exist" reassurance only fits when same-ticker
  // copycats were actually found. The uniqueness-unknown caveat ("no same-ticker
  // token was found, but the index is capped") must NOT claim copycats exist.
  const hasCopycats = advisories.some((a) =>
    /share|copycat|impersonation|dominance/i.test(`${a.title} ${a.text ?? ""}`),
  )

  const threats = detectors.filter((d) => d.category === "threat" && !isAdvisoryDetector(d))
  const controls = detectors.filter(
    (d) => d.category === "control" && d.impact !== "Informational" && !isAdvisoryDetector(d),
  )

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

          {advisories.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Before you buy</h3>
              {hasCopycats ? (
                <p className={styles.reportNote}>
                  This may well be the genuine token. Others have minted copycats with the same ticker, so confirm the
                  contract address before buying.
                </p>
              ) : null}
              <ul className={styles.findings}>
                {advisories.map((a) => (
                  <li key={a.key} className={styles.finding}>
                    <span className={styles.findingBar} style={{ background: "#6b7280" }} aria-hidden="true" />
                    <div className={styles.findingBody}>
                      <span className={styles.findingTitle}>{a.title}</span>
                      {a.text ? <p className={styles.findingText}>{a.text}</p> : null}
                    </div>
                  </li>
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

      <AddApp />

      <button type="button" className={styles.secondaryBtn} onClick={onReset}>
        Verify another token
      </button>
    </div>
  )
}
