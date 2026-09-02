"use client"
import type { CbtvReport, Detector, Finding, RiskLevel } from "@/lib/cbtv"
import {
  RISK_COLOR,
  RISK_ORDER,
  bucketDetectors,
  reportSellVerdict,
  isAdvisoryFinding,
  toLevel,
  worst,
} from "@/lib/cbtv"
import { stockIdentity, TOKENIZED_STOCK_LIST_URL } from "@/lib/tokenized-stocks"
import styles from "./page.module.css"

// Venue findings carry stable VENUE- ids; fall back to prose for an unknown one.
const VENUE_REASON_RE = /VENUE-C-001|VENUE-C-002|VENUE-H-003|cannot be sold|sold back|honeypot|sells do not execute/i

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

  // One pass, one bucket each — see classifyDetector. The `note` bucket is the
  // catch-all that stops an unfamiliar check rendering nowhere.
  const bucket = bucketDetectors(detectors)
  const threats = bucket.threat
  const controls = bucket.control
  const undetermined = bucket.undetermined
  const notes = bucket.note
  const verifiedStock = bucket.verified[0]
  const sellCaveat = bucket.caveat[0]

  // Ecosystem cautions (same-ticker copycats made by OTHERS) are separated out:
  // a "check the address" caution for the buyer, not a fault of the scanned
  // contract, so they never count toward its verdict, findings, or its issuer
  // controls. They arrive as either a finding or a detector; both land here.
  const allFindings = (report.findings ?? []).filter((f) => f.title)

  // The token's OWN findings, sorted worst-first.
  const findings = allFindings
    .filter((f) => !isAdvisoryFinding(f))
    .sort((a, b) => RISK_ORDER[toLevel(b.severity)] - RISK_ORDER[toLevel(a.severity)])

  const advisories: { key: string; title: string; text?: string }[] = [
    ...allFindings.filter(isAdvisoryFinding).map((f) => ({ key: f.id, title: f.title, text: f.why })),
    ...bucket.advisory.map((d, i) => ({ key: `ad${i}`, title: d.description, text: d.recommendation })),
  ]
  // The "genuine token / copycats exist" reassurance only fits when same-ticker
  // copycats were actually found. The uniqueness-unknown caveat ("no same-ticker
  // token was found, but the index is capped") must NOT claim copycats exist.
  const hasCopycats = advisories.some((a) =>
    /share|copycat|impersonation|dominance/i.test(`${a.title} ${a.text ?? ""}`),
  )

  // Settle the token against the issuer's published list ourselves, as a floor
  // under the service's own check. The proxy is authoritative — it confirms
  // on-chain — but its copy of the list covers four of the thirteen, so a
  // copycat wearing one of the other nine tickers currently passes its check
  // untouched. This can only ESCALATE: it is suppressed the moment the service
  // has spoken on identity, and a match that agrees is never shown twice.
  const serviceSettledIdentity = Boolean(bucket.verified[0] || bucket.caveat[0]) ||
    detectors.some((x) => x.check === "tokenized-stock-impersonation")
  const localIdentity = serviceSettledIdentity ? null : stockIdentity(report.address, ti.symbol, ti.name)
  const localImpersonation = localIdentity?.verdict === "impersonation" ? localIdentity : null
  const localVerified = localIdentity?.verdict === "verified" ? localIdentity : null

  // Count the findings by severity for the summary — "threats" (detector-only)
  // reads as 0 on a venue honeypot, which is misleading.
  const findingLevels = findings.map((f) => toLevel(f.severity))
  const highCount = findingLevels.filter((l) => l === "High").length
  const medCount = findingLevels.filter((l) => l === "Medium").length
  const lowCount = findingLevels.filter((l) => l === "Low").length

  // The app's whole promise is "Can you sell it?" — answered directly and first,
  // in the three states the venue check can actually return. "Unknown" is not a
  // hedge: when no pool could quote a round trip the service says so explicitly,
  // and rendering that as "Yes" would invent a result it refused to give.
  const sellVerdict = reportSellVerdict(report)
  const cannotSell = sellVerdict === "no"
  const sellFinding = findings.find((f) => VENUE_REASON_RE.test(`${f.id} ${f.title}`))
  const honeypotDetector = detectors.find(
    (d) => d.check === "honeypot" || d.check === "receive-restricted" || /honeypot/i.test(d.description),
  )
  // A verified tokenized stock with no quotable pool is not the same situation as
  // an unknown token with no quotable pool. Base states secondary trading of
  // these is permissionless and that KYC applies only to AP mint/redeem — so the
  // absence of an AMM pool is expected, not a warning. What actually governs
  // whether THIS holder can sell is the compliance policy on transfers, which
  // the sweep reads directly. Answer from that rather than shrugging.
  const isVerifiedStock = Boolean(verifiedStock || localVerified)
  const transfersRestricted = detectors.some((x) => x.check === "transfer-restrictions-active")
  const transfersOpen = detectors.some((x) => x.check === "open-transfers")
  const stockNoPool = sellVerdict === "unknown" && isVerifiedStock

  const sellAnswer =
    sellVerdict === "no"
      ? "No"
      : stockNoPool && transfersRestricted
        ? "Depends"
        : stockNoPool && transfersOpen
          ? "Yes"
          : sellVerdict === "unknown"
            ? "Unknown"
            : "Yes"
  const sellReason =
    stockNoPool && transfersRestricted
      ? "This is the issuer's own contract, and secondary trading of it is permissionless by design — but transfers here are governed by a compliance policy, so whether YOU can sell depends on your address being authorised. No AMM pool quoted a round trip, which is normal for a tokenized stock. See the issuer controls below."
      : stockNoPool && transfersOpen
        ? "This is the issuer's own contract and transfers are not policy-restricted. No AMM pool quoted a round trip, which is normal for a tokenized stock — these trade on secondary markets rather than a token pool, and redemption runs through KYC-onboarded Authorized Participants."
        : stockNoPool
          ? "This is the issuer's own contract, so identity is settled. Whether you can sell it is not: no AMM pool quoted a round trip, and the transfer policy could not be read either way, so nothing here establishes your exit."
        : sellVerdict === "unknown"
          ? "No pool could quote a buy-and-sell round trip, so exit liquidity could not be measured. That is not a finding that the token is unsellable — it means this check has no answer for you."
          : sellFinding?.why ||
        honeypotDetector?.description ||
        (cannotSell
          ? "The pool won't let you sell this token back at value."
          : "No sell-side trap was found — this token looks sellable. Still weigh the risks below.")
  // Amber for a conditional answer, green when nothing stands in the way.
  const sellColor = cannotSell ? "#dc2626" : sellAnswer === "Yes" ? "#16a34a" : "#ca8a04"

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
          {/* Positive identity signal: the address matches the issuer's published
              tokenized-stock list. Informational, so every severity filter drops
              it, but "this IS the official one" is exactly what a buyer needs. */}
          {/* Escalation only. The service settles identity on-chain and wins whenever
              it has spoken; this fires solely when it stayed silent — which is what
              happened while its published list covered four of the thirteen stocks. */}
          {localImpersonation && (
            <p className={styles.reportNote} style={{ color: "#dc2626", fontWeight: 600 }}>
              This token presents the ticker {localImpersonation.ticker}, but the contract issued
              under that ticker is {localImpersonation.official}. This is not that address.
              Check the published list at {TOKENIZED_STOCK_LIST_URL} before buying.
            </p>
          )}

          {localVerified && (
            <p className={styles.reportNote} style={{ color: "#16a34a" }}>
              Address matches {localVerified.ticker} on the issuer&rsquo;s published list.
            </p>
          )}

          {verifiedStock && (
            <p className={styles.reportNote} style={{ color: "#16a34a" }}>
              Verified tokenized stock — this address matches the issuer&rsquo;s published list.
            </p>
          )}

          {/* The app's promise, answered first and unmissably. */}
          <div className={styles.answer} style={{ borderColor: sellColor }}>
            <span className={styles.answerQ}>Can you sell it?</span>
            <span className={styles.answerA} style={{ color: sellColor }}>
              {sellAnswer}
            </span>
            <p className={styles.answerWhy}>{sellReason}</p>
            {/* What this scan cannot see must qualify the answer, not sit in a
                list under it — a tokenized stock can be perfectly clean on-chain
                and still be unredeemable outside market hours. */}
            {sellCaveat ? <p className={styles.answerWhy}>{sellCaveat.description}</p> : null}
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

          {undetermined.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Could not be checked</h3>
              <p className={styles.reportNote}>
                These checks did not complete, so they are neither a pass nor a fail. Treat them as unknown rather
                than clean — a short log history can hide a control that is really there.
              </p>
              <ul className={styles.findings}>
                {undetermined.map((d, i) => (
                  <DetectorRow key={`u${i}`} d={d} />
                ))}
              </ul>
            </section>
          )}

          {/* Catch-all. Anything the service emitted that no bucket above
              claimed still renders here, so a check this app has not been
              taught about can never be silently dropped. */}
          {notes.length > 0 && (
            <section className={styles.reportSection}>
              <h3 className={styles.reportH3}>Also worth knowing</h3>
              <ul className={styles.findings}>
                {notes.map((d, i) => (
                  <DetectorRow key={`n${i}`} d={d} />
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
