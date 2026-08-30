import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReportView } from "@/app/report-view"
import type { CbtvReport, Detector } from "@/lib/cbtv"

const d = (
  check: string,
  impact: Detector["impact"],
  description: string,
  category?: Detector["category"],
): Detector => ({ check, impact, description, category })

const report = (over: Partial<CbtvReport> = {}): CbtvReport =>
  ({
    job_id: "j1",
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: "base",
    overall_risk: "Informational",
    token_info: { name: "Test", symbol: "TST" },
    ...over,
  }) as CbtvReport

const noop = () => {}

describe("ReportView", () => {
  it("answers the sell question", () => {
    render(<ReportView report={report()} onReset={noop} />)
    expect(screen.getByText("Can you sell it?")).toBeTruthy()
    expect(screen.getByText("Yes")).toBeTruthy()
  })

  it("says No when a honeypot detector is present", () => {
    const r = report({ detectors: [d("honeypot", "High", "Sells revert at the pool.", "threat")] })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("No")).toBeTruthy()
  })

  // The regression that motivated the caveat: clean on-chain, still unredeemable.
  it("qualifies the sell answer with what the scan cannot see", () => {
    const r = report({
      detectors: [
        d("operational-controls-above-token", "Informational", "Redemption is restricted to KYC-onboarded APs.", "control"),
      ],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("Yes")).toBeTruthy()
    expect(screen.getByText(/Redemption is restricted to KYC-onboarded APs/)).toBeTruthy()
  })

  it("shows an incomplete check as neither pass nor fail", () => {
    const r = report({
      detectors: [d("pause-state", "Informational", "Could not determine (pause-state): log window truncated.", "control")],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("Could not be checked")).toBeTruthy()
    expect(screen.getByText(/Could not determine \(pause-state\)/)).toBeTruthy()
  })

  // A High impersonation the service labelled "control" must appear as a threat,
  // not buried among issuer controls or ecosystem cautions.
  it("shows a mis-categorised stock impersonation as a threat", () => {
    const r = report({
      overall_risk: "High",
      detectors: [
        d("tokenized-stock-impersonation", "High", "IMPERSONATION OF A VERIFIED TOKENIZED STOCK: presents ticker NVDAc.", "control"),
      ],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText(/IMPERSONATION OF A VERIFIED TOKENIZED STOCK/)).toBeTruthy()
    expect(screen.queryByText("Before you buy")).toBeNull()
  })

  it("shows the verified tokenized stock line", () => {
    const r = report({
      detectors: [d("verified-tokenized-stock", "Informational", "Address matches the published list.", "info")],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText(/Verified tokenized stock/)).toBeTruthy()
  })

  // The catch-all: a check the app has never been taught about still renders.
  it("renders an unfamiliar check rather than dropping it", () => {
    const r = report({
      detectors: [d("some-future-check", "Informational", "A brand new observation.", "control")],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("Also worth knowing")).toBeTruthy()
    expect(screen.getByText("A brand new observation.")).toBeTruthy()
  })

  it("keeps a third-party copycat caution out of the token's own findings", () => {
    const r = report({
      detectors: [d("ticker-collision", "Informational", "Other tokens share this ticker; confirm the address.", "info")],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("Before you buy")).toBeTruthy()
  })

  it("renders the not-a-B20 case without the risk sections", () => {
    const r = report({ is_b20: false, status: "not_b20", detectors: [d("b20-identity", "Informational", "Not an initialised B20.", "info")] })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("NOT A B20")).toBeTruthy()
    expect(screen.queryByText("Can you sell it?")).toBeNull()
  })

  // The local list may only escalate. It exists because the proxy covered four
  // of the thirteen stocks; it must never argue with the proxy once it speaks.
  it("flags a copycat the service stayed silent about", () => {
    const r = report({ address: "0x1111111111111111111111111111111111111111", token_info: { symbol: "TSLAc" } })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText(/presents the ticker TSLAc/)).toBeTruthy()
  })

  it("stays silent when the service already settled identity", () => {
    const r = report({
      address: "0x1111111111111111111111111111111111111111",
      token_info: { symbol: "TSLAc" },
      detectors: [d("tokenized-stock-impersonation", "High", "IMPERSONATION OF A VERIFIED TOKENIZED STOCK.", "control")],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText(/IMPERSONATION OF A VERIFIED TOKENIZED STOCK/)).toBeTruthy()
    expect(screen.queryByText(/presents the ticker TSLAc/)).toBeNull()
  })

  it("recognises a published address on its own", () => {
    const r = report({ address: "0xb20000000000000000000078ee7ce2fE4908108C" })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText(/matches NVDAc on the issuer/)).toBeTruthy()
  })

  it("says nothing about an ordinary token", () => {
    render(<ReportView report={report({ token_info: { symbol: "WETH" } })} onReset={noop} />)
    expect(screen.queryByText(/published list/)).toBeNull()
  })

  // NVDAc in production: no pool could quote a round trip, and the app said "Yes".
  it("says Unknown when no venue could be measured, not Yes", () => {
    const r = report({
      findings: [{ id: "VENUE-M-002", severity: "medium", title: "No usable venue found", why: "Exit liquidity is UNKNOWN." }],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("Unknown")).toBeTruthy()
    expect(screen.queryByText("Yes")).toBeNull()
    expect(screen.getByText(/could not be measured/)).toBeTruthy()
  })

  it("says No when the pool exempts addresses from its sell penalty", () => {
    const r = report({
      findings: [{ id: "VENUE-C-002", severity: "critical", title: "Pool exempts specific addresses from its sell penalty" }],
    })
    render(<ReportView report={r} onReset={noop} />)
    expect(screen.getByText("No")).toBeTruthy()
  })
})
