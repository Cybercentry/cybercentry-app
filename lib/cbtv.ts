// Shared types for the CBTV report — mirrored from the proxy's _build_response
// (Cybercentry/cybercentry-base-token-verification, app.py). Types only, no
// secrets or fetch logic, so this is safe to import from client components.

export type RiskLevel = "High" | "Medium" | "Low" | "Informational"

export interface SeverityBreakdown {
  High: number
  Medium: number
  Low: number
  Informational: number
}

export interface Detector {
  check: string
  impact: RiskLevel
  confidence?: string
  description: string
  recommendation?: string
  // threat = holder-harm risk; control = issuer-control disclosure; info = neutral.
  category?: "threat" | "control" | "info"
}

export interface TokenInfo {
  name?: string
  symbol?: string
  decimals?: number
  total_supply?: string | number
  supply_cap?: string | number
  currency?: string
  /** contractURI, added by the service alongside the tokenized-stock work. */
  contract_uri?: string
}

export interface Finding {
  id: string
  severity: string
  title: string
  why?: string
  remediation?: string
}

export interface CbtvReport {
  job_id: string
  address: string
  chain: string
  is_b20?: boolean
  token_type?: string
  overall_risk: RiskLevel
  status?: string
  threats_count?: number
  control_flags?: number
  severity_breakdown?: SeverityBreakdown
  token_info?: TokenInfo
  detectors?: Detector[]
  grade?: string | null
  provisional?: boolean
  capability_summary?: Record<string, unknown> | null
  findings?: Finding[]
  full_report?: unknown
}

// Same risk palette the service's HTML report uses (report_html.py _IMPACT_COLOR).
export const RISK_COLOR: Record<RiskLevel, string> = {
  High: "#dc2626",
  Medium: "#ea580c",
  Low: "#ca8a04",
  Informational: "#3b82f6",
}

export const RISK_ORDER: Record<RiskLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
  Informational: 0,
}

/** The two Base networks the service supports. */
export type Chain = "base" | "base-sepolia"

/** Poll response shape from GET /api/verify. */
export type VerifyStatus =
  | { status: "running" }
  | { status: "done"; report: CbtvReport }
  | { status: "error"; error: string }

// ── Risk derivation, shared by the report view (client) and the notification
// trigger (server) so both agree on what "High risk" means. ──────────────────

/** Map a grade / finding-severity string onto the four-level scale. */
export function toLevel(v?: string | null): RiskLevel {
  const s = (v || "").toLowerCase()
  if (/terminal|escalate|critical|high/.test(s)) return "High"
  if (/medium/.test(s)) return "Medium"
  if (/\blow\b/.test(s)) return "Low"
  return "Informational"
}

export function worst(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((a, b) => (RISK_ORDER[b] > RISK_ORDER[a] ? b : a), "Informational")
}

// Ecosystem cautions describe the world *around* the token (other people minting
// same-ticker copycats), not a defect in the scanned contract. They're a genuine
// buyer caution ("check you have the right address") but NOT the scanned
// project's fault — shown separately, never inflating its verdict, never counted
// as an issuer control.
//
// Matched by CHECK ID, not prose. The prose regex used to match the word
// "impersonation" anywhere, which swallowed `tokenized-stock-impersonation` —
// a High detector meaning THIS token is the fake — and filed it under "not this
// project's fault". The two genuinely-ecosystem checks are named here; anything
// else with a check id is not an advisory.
const ADVISORY_CHECKS = new Set(["ticker-collision", "ticker-uniqueness-unknown"])

// Fallback for a detector that arrives with no check id (older cached reports).
const ADVISORY_RE =
  /shares? the ticker|same ticker|copycat|multiple tokens .*(share|ticker)|verify the official|confirm the (contract )?address/i

export function isAdvisoryFinding(f: Finding): boolean {
  // An advisory is by definition not a defect of this token, so the service
  // never rates one High. Anything High stays a real finding whatever it says.
  if (toLevel(f.severity) === "High") return false
  return ADVISORY_RE.test(`${f.title} ${f.why ?? ""}`)
}

/** Detector form of the same ecosystem caution (the proxy emits it as a control). */
export function isAdvisoryDetector(d: Detector): boolean {
  if (d.impact === "High" || d.impact === "Medium") return false
  if (d.check) return ADVISORY_CHECKS.has(d.check)
  return ADVISORY_RE.test(`${d.description} ${d.recommendation ?? ""}`)
}

/**
 * A check the service could not complete — e.g. a truncated log window, an
 * unreadable role. The service deliberately stopped reporting these as clean
 * (an absent role on a short history is not "immutable"), so the app must not
 * silently drop them: they arrive as Informational, which every severity filter
 * discards, and a check that never renders reads exactly like a check that
 * passed.
 */
export function isUndetermined(d: Detector): boolean {
  // The service says "couldn't tell" two ways: _undetermined()'s prose, and a
  // check named *-unknown / *-skipped (admin-structure-unknown,
  // offchain-identifiers-unknown, ticker-impersonation-skipped, …). Both are an
  // absent answer, not a passed check, and both are Informational — so every
  // severity filter drops them unless they are caught here.
  return /^could not determine\b/i.test(d.description) || /-(unknown|skipped)$/.test(d.check ?? "")
}

/**
 * A caveat about what the scan itself cannot see, which must qualify the
 * headline answer rather than sit in a list below it. `operational-controls-
 * above-token` says redemption is gated by KYC'd Authorized Participants and
 * price-feed behaviour outside market hours — neither enforced by B20, neither
 * visible to this scan. Answering "Can you sell it? Yes" without it is exactly
 * the false confidence the service added the check to prevent.
 */
export function isSellCaveat(d: Detector): boolean {
  return d.check === "operational-controls-above-token"
}

/** The token's address matches the issuer's published tokenized-stock list. */
export function isVerifiedTokenizedStock(d: Detector): boolean {
  return d.check === "verified-tokenized-stock"
}

/** The scanned token is impersonating a verified tokenized stock. */
export function isTokenizedStockImpersonation(d: Detector): boolean {
  return d.check === "tokenized-stock-impersonation"
}

/**
 * Detectors that describe a holder-harm risk. Takes the service's `category`
 * when it says "threat", but ALSO any High-impact detector: the service
 * categorises by a check-name allowlist, and a new High check that hasn't been
 * added to it defaults to "control" — which is how tokenized-stock
 * impersonation first surfaced in the wrong section. Impact is the safer signal.
 */
export function isThreatDetector(d: Detector): boolean {
  return (d.category === "threat" || d.impact === "High") && !isAdvisoryDetector(d)
}

/** The headline verdict: the worst of overall_risk, the capped grade, and the
 * token's OWN findings — advisory/ecosystem findings are excluded so a legit
 * project isn't marked risky for third-party copycats. */
export function reportRiskLevel(report: CbtvReport): RiskLevel {
  if (report.is_b20 === false || report.status === "not_b20") return "Informational"
  const findings = (report.findings ?? []).filter((f) => !isAdvisoryFinding(f))
  return worst([report.overall_risk ?? "Informational", toLevel(report.grade), ...findings.map((f) => toLevel(f.severity))])
}

/** Whether the venue check found the token unsellable (honeypot). */
export function reportCannotSell(report: CbtvReport): boolean {
  const findings = report.findings ?? []
  const detectors = report.detectors ?? []
  return (
    findings.some((f) => /cannot be sold|sold back|honeypot/i.test(f.title)) ||
    detectors.some((d) => d.check === "honeypot" || d.check === "receive-restricted" || /honeypot/i.test(d.description))
  )
}

/** Where a detector belongs in the report. Exhaustive by construction. */
export type DetectorBucket = "threat" | "control" | "advisory" | "undetermined" | "verified" | "caveat" | "note"

/**
 * Sort one detector into exactly one bucket.
 *
 * Every detector lands somewhere — the `note` fallback exists so that a check
 * this app has never seen still renders. Twice now a new Informational check
 * (verified-tokenized-stock, operational-controls-above-token) was silently
 * dropped because every filter happened to exclude it; a catch-all makes that
 * failure mode impossible rather than merely fixed.
 *
 * Order matters: "couldn't tell" is decided before severity, and the two
 * special-cased identity/caveat checks before the generic buckets.
 */
export function classifyDetector(d: Detector): DetectorBucket {
  if (isUndetermined(d)) return "undetermined"
  if (isVerifiedTokenizedStock(d)) return "verified"
  if (isSellCaveat(d)) return "caveat"
  if (isAdvisoryDetector(d)) return "advisory"
  if (isThreatDetector(d)) return "threat"
  if (d.category === "control" && d.impact !== "Informational") return "control"
  return "note"
}

/** Group a report's detectors by bucket, in one pass. */
export function bucketDetectors(detectors: Detector[]): Record<DetectorBucket, Detector[]> {
  const out: Record<DetectorBucket, Detector[]> = {
    threat: [], control: [], advisory: [], undetermined: [], verified: [], caveat: [], note: [],
  }
  for (const d of detectors) out[classifyDetector(d)].push(d)
  return out
}
