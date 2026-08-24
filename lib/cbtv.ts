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

/** Findings that describe the *ecosystem around* the token (e.g. other people
 * minting same-ticker copycats), not a defect in the scanned contract. They're a
 * genuine buyer caution ("check you have the right address") but NOT the scanned
 * project's fault — so they're shown separately and never inflate its verdict.
 * Note: this is distinct from a finding that the scanned token *is itself* a
 * malicious fake, which stays a real risk. */
export function isAdvisoryFinding(f: Finding): boolean {
  const t = `${f.title} ${f.why ?? ""}`.toLowerCase()
  return /shares? the ticker|same ticker|impersonation risk|multiple tokens .*(share|ticker)|verify the official|confirm the (contract )?address/.test(t)
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
