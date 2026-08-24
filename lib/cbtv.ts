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
