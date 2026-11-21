import { afterEach, beforeEach, describe, expect, it } from "vitest"

// Config is read per call rather than at module load, so each test can set its
// own environment. That is also the property that makes the feature safe to
// ship dark: nothing is captured at import time.
const { TOOL_PRICES, buildAcceptsFor, isPaidTool, x402Config } = await import("../app/api/mcp/x402")

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
const USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
const PAY_TO = "0xfEE13309251B632317ea2d475d6ABa7E7E0219e6"

const env = { ...process.env }
beforeEach(() => {
  delete process.env.X402_PAY_TO
  delete process.env.X402_NETWORK
})
afterEach(() => {
  process.env = { ...env }
})

describe("disabled by default", () => {
  // The whole point: merging this cannot change live behaviour on its own.
  it("is off when X402_PAY_TO is unset", () => {
    expect(x402Config().enabled).toBe(false)
    expect(isPaidTool("verify_b20_token")).toBe(false)
  })

  it("treats an empty payTo as off rather than paying nobody", () => {
    process.env.X402_PAY_TO = ""
    expect(x402Config().enabled).toBe(false)
  })
})

describe("enabled", () => {
  beforeEach(() => {
    process.env.X402_PAY_TO = PAY_TO
  })

  it("prices only the paid tools", () => {
    expect(isPaidTool("verify_b20_token")).toBe(true)
    expect(isPaidTool("verify_quote_asset")).toBe(true)
    // Reading a finished report stays free.
    expect(isPaidTool("get_verification_report")).toBe(false)
  })

  it("charges the same $1 the web app charges", () => {
    // 1 USDC, 6 decimals. An agent should not get a different price from a
    // human for identical work.
    expect(TOOL_PRICES.verify_b20_token).toBe("1000000")
    expect(TOOL_PRICES.verify_quote_asset).toBe("1000000")
  })

  it("builds requirements payable in USDC on Base to the treasury", () => {
    const [req] = buildAcceptsFor("verify_b20_token")
    expect(req.scheme).toBe("exact")
    expect(req.network).toBe("eip155:8453")
    expect(req.asset).toBe(USDC_BASE)
    expect(req.payTo).toBe(PAY_TO)
    expect(req.amount).toBe("1000000")
  })

  it("uses Sepolia USDC when pointed at Sepolia", () => {
    process.env.X402_NETWORK = "eip155:84532"
    expect(buildAcceptsFor("verify_b20_token")[0].asset).toBe(USDC_SEPOLIA)
  })

  it("offers nothing for an unpriced tool", () => {
    expect(buildAcceptsFor("get_verification_report")).toEqual([])
  })

  // A malformed network would otherwise reach the facilitator as a live
  // payment request against a chain that does not exist.
  it("falls back to Base mainnet on a non-CAIP-2 network", () => {
    process.env.X402_NETWORK = "base"
    expect(x402Config().network).toBe("eip155:8453")
    expect(buildAcceptsFor("verify_b20_token")[0].asset).toBe(USDC_BASE)
  })

  // An unknown-but-well-formed chain has no USDC address we know, so offering
  // a payment option for it would advertise a price nobody can pay.
  it("offers nothing on a chain with no known USDC", () => {
    process.env.X402_NETWORK = "eip155:1"
    expect(buildAcceptsFor("verify_b20_token")).toEqual([])
  })
})
