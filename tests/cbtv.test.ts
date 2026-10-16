import { describe, expect, it } from "vitest"
import {
  bucketDetectors,
  classifyDetector,
  isAdvisoryFinding,
  reportCannotSell,
  reportCounterfeitPair,
  reportRiskLevel,
  reportSellVerdict,
  type CbtvReport,
  type Detector,
  type Finding,
} from "@/lib/cbtv"

const d = (
  check: string,
  impact: Detector["impact"],
  description = "x",
  category?: Detector["category"],
): Detector => ({ check, impact, description, category })

// Shapes mirrored from the service's risk.py: _finding(), _undetermined(),
// check_tokenized_stock(), check_price_feed().
const CASES: [string, Detector, string][] = [
  // A High impersonation the service mis-categorises as "control" must still be
  // a threat here — this is the regression that filed a fake NVDAc under
  // "issuer controls" and then under "copycats made by others".
  ["stock impersonation, service says control", d("tokenized-stock-impersonation", "High", "IMPERSONATION OF A VERIFIED TOKENIZED STOCK…", "control"), "threat"],
  ["stock impersonation, service says threat", d("tokenized-stock-impersonation", "High", "IMPERSONATION…", "threat"), "threat"],
  ["verified stock", d("verified-tokenized-stock", "Informational", "Address matches the published list…", "info"), "verified"],
  ["sell caveat", d("operational-controls-above-token", "Informational", "Redemption restricted to KYC'd APs…", "control"), "caveat"],

  // Price feed, live since TOKEN_FEEDS was populated.
  ["price feed live", d("price-feed-live", "Informational", "Published price feed answered 217.77…", "control"), "note"],
  ["price feed unusable", d("price-feed-unusable", "Medium", "Answer should not be used…", "control"), "control"],
  ["price feed unreadable", d("price-feed", "Informational", "Could not determine (price-feed): feed unreadable.", "control"), "undetermined"],

  // "Couldn't tell" in both vocabularies: _undetermined() prose, and a
  // *-unknown / *-skipped check id.
  ["undetermined by prose", d("pause-state", "Informational", "Could not determine (pause-state): truncated.", "control"), "undetermined"],
  ["admin structure unknown", d("admin-structure-unknown", "Informational", "Admin structure is UNDETERMINED.", "control"), "undetermined"],
  ["offchain identifiers unknown", d("offchain-identifiers-unknown", "Informational", "…", "control"), "undetermined"],
  ["multiplier announcements unknown", d("multiplier-announcements-unknown", "Informational", "…", "control"), "undetermined"],
  ["ticker impersonation skipped", d("ticker-impersonation-skipped", "Informational", "…", "control"), "undetermined"],
  ["ticker uniqueness unknown", d("ticker-uniqueness-unknown", "Informational", "Index capped.", "info"), "undetermined"],

  // Genuine ecosystem advisory: somebody else's copycat, not this token's fault.
  ["ticker collision", d("ticker-collision", "Informational", "Others share the ticker; confirm the address.", "info"), "advisory"],

  ["honeypot", d("honeypot", "High", "Sells revert.", "threat"), "threat"],
  ["freeze armed", d("freeze-and-seize-armed", "High", "Seize is armed.", "threat"), "threat"],
  ["ordinary control", d("mint-open", "Medium", "MINT_ROLE uncapped.", "control"), "control"],

  // Routine informational facts reach the catch-all rather than vanishing.
  ["pause capability", d("pause-capability", "Informational", "Standard B20 pause capability.", "control"), "note"],
  ["capped supply", d("capped-supply", "Informational", "Supply is capped.", "info"), "note"],

  // Checks this app has never been taught about.
  ["unknown future check", d("some-future-check", "Informational", "Brand new.", "control"), "note"],
  ["unknown future High check", d("some-future-high", "High", "Brand new and severe.", "control"), "threat"],
]

describe("classifyDetector", () => {
  for (const [name, det, want] of CASES) {
    it(`${name} -> ${want}`, () => {
      expect(classifyDetector(det)).toBe(want)
    })
  }

  it("never lets an advisory outrank Informational", () => {
    // A Medium/High detector is a real risk whatever its prose says.
    expect(classifyDetector(d("ticker-collision", "High", "copycat", "info"))).toBe("threat")
  })
})

describe("bucketDetectors", () => {
  const all = CASES.map(([, det]) => det)

  it("loses nothing and duplicates nothing", () => {
    const b = bucketDetectors(all)
    const total = Object.values(b).reduce((n, xs) => n + xs.length, 0)
    expect(total).toBe(all.length)
  })

  it("puts every detector in the bucket classifyDetector chose", () => {
    const b = bucketDetectors(all)
    for (const det of all) expect(b[classifyDetector(det)]).toContain(det)
  })
})

describe("isAdvisoryFinding", () => {
  const f = (severity: string, title: string, why?: string): Finding => ({ id: "B20-X-1", severity, title, why })

  it("never swallows a High finding, whatever its wording", () => {
    expect(isAdvisoryFinding(f("High", "Copycat: this token impersonates NVDAc"))).toBe(false)
  })

  it("treats a low-severity ticker caution as advisory", () => {
    expect(isAdvisoryFinding(f("Informational", "Others share the ticker", "confirm the contract address"))).toBe(true)
  })
})

describe("reportRiskLevel", () => {
  const base = (over: Partial<CbtvReport> = {}): CbtvReport =>
    ({ job_id: "j", address: "0x1", chain: "base", overall_risk: "Informational", ...over }) as CbtvReport

  it("takes the worst of overall_risk, grade and findings", () => {
    expect(reportRiskLevel(base({ overall_risk: "Low", grade: "terminal" }))).toBe("High")
  })

  it("does not let a third-party copycat advisory inflate the verdict", () => {
    const r = base({
      overall_risk: "Informational",
      findings: [{ id: "a", severity: "Low", title: "Others share the ticker", why: "confirm the contract address" }],
    })
    expect(reportRiskLevel(r)).toBe("Informational")
  })

  it("is Informational when the address is not a B20", () => {
    expect(reportRiskLevel(base({ is_b20: false, overall_risk: "High" }))).toBe("Informational")
  })
})

describe("reportCannotSell", () => {
  it("detects a honeypot detector", () => {
    const r = { detectors: [d("honeypot", "High", "Sells revert.")] } as CbtvReport
    expect(reportCannotSell(r)).toBe(true)
  })

  it("detects an unsellable venue finding", () => {
    const r = { findings: [{ id: "v", severity: "High", title: "Token cannot be sold back" }] } as CbtvReport
    expect(reportCannotSell(r)).toBe(true)
  })

  it("is false on a clean token", () => {
    expect(reportCannotSell({ detectors: [d("pause-capability", "Informational")] } as CbtvReport)).toBe(false)
  })
})

// The headline claim. The service namespaces venue findings VENUE-* precisely so
// a consumer never has to read prose; matching titles missed three of them.
describe("reportSellVerdict", () => {
  const f = (id: string, severity: string, title: string, why?: string): Finding => ({ id, severity, title, why })
  const r = (findings: Finding[], detectors: Detector[] = []): CbtvReport =>
    ({ job_id: "j", address: "0x1", chain: "base", overall_risk: "Informational", findings, detectors }) as CbtvReport

  it("says no when the token cannot be sold back at value", () => {
    expect(reportSellVerdict(r([f("VENUE-C-001", "critical", "Token cannot be sold back at value")]))).toBe("no")
  })

  it("says no when sells do not execute", () => {
    expect(reportSellVerdict(r([f("VENUE-H-003", "high", "Sells do not execute on this token's pools")]))).toBe("no")
  })

  it("says no when the pool exempts specific addresses from its sell penalty", () => {
    expect(reportSellVerdict(r([f("VENUE-C-002", "critical", "Pool exempts specific addresses from its sell penalty")]))).toBe("no")
  })

  it("says unknown when no venue could be measured", () => {
    const finding = f("VENUE-M-002", "medium", "No usable venue found", "Exit liquidity is UNKNOWN.")
    expect(reportSellVerdict(r([finding]))).toBe("unknown")
  })

  it("does not turn an unmeasured round trip into a yes", () => {
    expect(reportSellVerdict(r([f("VENUE-M-002", "medium", "No usable venue found")]))).not.toBe("yes")
  })

  it("says yes on a token with no venue finding at all", () => {
    expect(reportSellVerdict(r([]))).toBe("yes")
  })

  it("still says yes when the round trip merely costs more than the stated fee", () => {
    expect(reportSellVerdict(r([f("VENUE-M-001", "medium", "Round-trip cost above stated fee")]))).toBe("yes")
  })

  it("catches a honeypot detector even with no findings", () => {
    expect(reportSellVerdict(r([], [d("honeypot", "High", "Sells revert at the pool.", "threat")]))).toBe("no")
  })

  it("falls back to prose for a venue finding whose id it has not been taught", () => {
    expect(reportSellVerdict(r([f("VENUE-X-999", "high", "Sells do not execute here")]))).toBe("no")
  })

  it("prefers no over unknown when both are present", () => {
    const both = [f("VENUE-M-002", "medium", "No usable venue found"), f("VENUE-C-001", "critical", "Token cannot be sold back at value")]
    expect(reportSellVerdict(r(both))).toBe("no")
  })

  // VENUE-H-005 (VENUE-C-003 before the service capped attribution-based
  // severity) means "the token's own deployer pooled it against a counterfeit".
  // Reported on any pool, and able to fire while a genuine venue still offers a
  // real exit — so it must NOT answer the liquidity question: doing so would
  // say No for a token that is in fact sellable.
  const C003 = f(
    "VENUE-H-005",
    "high",
    "The token's own deployer pooled it against a counterfeit tokenized stock",
  )

  it("does not answer the sell question from an attributed counterfeit alone", () => {
    expect(reportSellVerdict(r([C003]))).toBe("yes")
  })

  it("says no sellable exit when the service also says no venue priced it", () => {
    // The service emits the liquidity finding alongside, so nothing is lost by
    // C-003 staying out of the cannot-sell set.
    const m4 = f("VENUE-M-004", "medium", "No venue prices this token against a real asset")
    expect(reportSellVerdict(r([C003, m4]))).toBe("unknown")
  })

  it("still carries an attributed counterfeit at High risk and flags the pair", () => {
    expect(reportRiskLevel(r([C003]))).toBe("High")
    expect(reportCounterfeitPair(r([C003]))).toBe(true)
  })

  it("still says yes when a counterfeit pair sits beside a genuine venue", () => {
    // VENUE-H-004 is not charged to the token: anyone can open a v4 pool
    // against any token. A real exit exists, so the answer stays yes — the
    // warning rides alongside it rather than overriding it.
    const finding = f("VENUE-H-004", "high", "A pool prices this token against a counterfeit tokenized stock")
    expect(reportSellVerdict(r([finding]))).toBe("yes")
    expect(reportCounterfeitPair(r([finding]))).toBe(true)
  })

  // Both new mediums mean the same thing to a holder: we could not establish
  // what a sell would pay you. Rendering either as "Yes" is the false clean.
  it("says unknown when every measurable venue pays in a counterfeit", () => {
    const finding = f("VENUE-M-004", "medium", "No venue prices this token against a real asset")
    expect(reportSellVerdict(r([finding]))).toBe("unknown")
  })

  it("says unknown when the measured pool's counter asset could not be read", () => {
    // The cheapest evasion: a counterfeit whose symbol() reverts. The round
    // trip still reads ~100%, so only this id stands between the holder and
    // a confident "Yes".
    const finding = f("VENUE-M-003", "medium", "Counter asset of the measured venue could not be identified")
    expect(reportSellVerdict(r([finding]))).toBe("unknown")
  })

  // The production false-clean. The service could not query its log source, so
  // pool discovery found nothing and the venue check emitted no finding at all
  // — and this app answered "Yes, no sell-side trap was found" on a check that
  // had never run. Silence must never reach the headline as reassurance.
  it("says unknown when the venue check could not run at all", () => {
    const finding = f("VENUE-M-005", "medium", "Exit liquidity could not be assessed")
    expect(reportSellVerdict(r([finding]))).toBe("unknown")
    expect(reportCannotSell(r([finding]))).toBe(false)
  })

  it("does not claim a counterfeit pair on a token that has none", () => {
    expect(reportCounterfeitPair(r([f("VENUE-M-001", "medium", "Round-trip cost above stated fee")]))).toBe(false)
    expect(reportCounterfeitPair(r([]))).toBe(false)
  })

  it("rates a counterfeit pair High even though it is not the token's fault", () => {
    // It must not be swept into the ecosystem-advisory bucket the way
    // same-ticker collisions are: a holder routed to that pool is harmed.
    const finding = f("VENUE-H-004", "high", "A pool prices this token against a counterfeit tokenized stock")
    expect(isAdvisoryFinding(finding)).toBe(false)
    expect(reportRiskLevel(r([finding]))).toBe("High")
  })
})
