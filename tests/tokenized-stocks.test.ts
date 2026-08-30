import { describe, expect, it } from "vitest"
import { TOKENIZED_STOCKS, stockIdentity, tokenizedStockFor } from "@/lib/tokenized-stocks"

const NVDAC = "0xb20000000000000000000078ee7ce2fE4908108C"
const TSLAC = "0xb2000000000000000000001e800a7f5189430cD0"
const FAKE = "0x1111111111111111111111111111111111111111"

describe("TOKENIZED_STOCKS", () => {
  it("carries all thirteen published stocks", () => {
    expect(Object.keys(TOKENIZED_STOCKS)).toHaveLength(13)
  })

  it("is every address a distinct B20-prefixed 20-byte address", () => {
    const addrs = Object.values(TOKENIZED_STOCKS)
    for (const a of addrs) expect(a).toMatch(/^0x[bB]2[0-9a-fA-F]{38}$/)
    expect(new Set(addrs.map((a) => a.toLowerCase())).size).toBe(13)
  })
})

describe("tokenizedStockFor", () => {
  it("recognises a published address", () => {
    expect(tokenizedStockFor(NVDAC)?.ticker).toBe("NVDAc")
  })

  it("is case-insensitive — these are addresses, not display strings", () => {
    expect(tokenizedStockFor(NVDAC.toLowerCase())?.ticker).toBe("NVDAc")
  })

  it("returns null for an unlisted address", () => {
    expect(tokenizedStockFor(FAKE)).toBeNull()
    expect(tokenizedStockFor(undefined)).toBeNull()
  })
})

describe("stockIdentity", () => {
  it("verifies by address even when the ticker cannot be read", () => {
    expect(stockIdentity(NVDAC, undefined, undefined)).toEqual({
      verdict: "verified",
      ticker: "NVDAc",
      official: NVDAC,
    })
  })

  // Address wins over ticker: a listed contract is genuine whatever it is called.
  it("does not accuse a listed address that presents a different ticker", () => {
    expect(stockIdentity(NVDAC, "TSLAc")?.verdict).toBe("verified")
  })

  // The gap this list closes: TSLAc was absent from the proxy's own list.
  it("catches a copycat wearing a published ticker", () => {
    const r = stockIdentity(FAKE, "TSLAc")
    expect(r).toEqual({ verdict: "impersonation", ticker: "TSLAc", official: TSLAC })
  })

  it("catches the bare ticker too, without the trailing c", () => {
    expect(stockIdentity(FAKE, "TSLA")?.verdict).toBe("impersonation")
  })

  it("checks the name as well as the symbol", () => {
    expect(stockIdentity(FAKE, undefined, "NVDA")?.verdict).toBe("impersonation")
  })

  it("ignores surrounding whitespace and case", () => {
    expect(stockIdentity(FAKE, "  tslac  ")?.verdict).toBe("impersonation")
  })

  it("says nothing about a token unrelated to any published stock", () => {
    expect(stockIdentity(FAKE, "WETH", "Wrapped Ether")).toBeNull()
  })

  it("says nothing when there is no address and no symbol", () => {
    expect(stockIdentity(undefined)).toBeNull()
  })
})
