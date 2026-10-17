import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

// The basket lookup goes through /api/verify with mode "quote-asset", so it
// passes the SAME payment gate as a full scan - one free use per wallet, then
// 1 USDC. Nothing about money was duplicated to add the feature, which is why
// these mock the shared payment lib rather than a second route.
vi.mock("@/lib/pay-usdc", () => ({
  signFreeScan: vi.fn(async () => ({ wallet: "0x" + "11".repeat(20), message: "m", signature: "0xsig" })),
  payUsdc: vi.fn(async () => ({ txHash: "0x" + "ab".repeat(32) })),
  isUserRejection: (e: unknown) => e instanceof Error && /cancel/i.test(e.message),
}))

import { QuoteAssetForm } from "@/app/quote-asset-form"

const NVDAC = "0xb20000000000000000000078ee7ce2fE4908108C"
const FAKE = "0xFEAeD1129be9f90AEcD1BF2c0d7ef5ec0d819bA3"
const PAIR = "0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C"

function mockOnce(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({ ok, status, json: async () => body }) as unknown as typeof fetch
}

function lookup(addr: string) {
  render(<QuoteAssetForm />)
  fireEvent.change(screen.getByLabelText(/contract address/i), { target: { value: addr } })
  fireEvent.click(screen.getByRole("button", { name: /check/i }))
}

describe("QuoteAssetForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try {
      localStorage.clear()
    } catch {}
  })

  it("names a counterfeit and the address it should have been", async () => {
    mockOnce({
      asset: {
        address: FAKE, symbol: "NVDA", verdict: "impersonation",
        ticker: "NVDAC", matchedOn: "NVDA", official: NVDAC,
      },
      findings: [{ id: "VENUE-H-004", severity: "high", title: "This asset impersonates a verified tokenized stock" }],
    })
    lookup(FAKE)
    await waitFor(() => expect(screen.getByText(/Counterfeit/)).toBeTruthy())
    expect(screen.getByText(/backed by no share/)).toBeTruthy()
    expect(screen.getByText(/impersonates a verified tokenized stock/)).toBeTruthy()
  })

  it("shows what is inside a basket, component by component", async () => {
    // Shape taken from the live Uniswap v2 pair this was proven against.
    mockOnce({
      asset: {
        address: PAIR, symbol: "UNI-V2", verdict: "unlisted",
        composite: {
          interface: "token0/token1", declared: 2, truncated: false,
          settled: [
            { address: NVDAC, symbol: "NVDAC", verdict: "verified" },
            { address: FAKE, symbol: "TSLA", verdict: "impersonation", matchedOn: "TSLA", official: NVDAC },
          ],
        },
      },
      findings: [{ id: "VENUE-H-006", severity: "high", title: "Quote asset is a basket containing a counterfeit tokenized stock" }],
    })
    lookup(PAIR)
    await waitFor(() => expect(screen.getByText(/What.{0,3}s inside it/)).toBeTruthy())
    expect(screen.getByText(/A claim on 2 assets, read through token0\/token1\(\)/)).toBeTruthy()
    expect(screen.getByText(/1 of 2 verified, 1 not settled/)).toBeTruthy()
    expect(screen.getByText("Verified tokenized stock")).toBeTruthy()
  })

  it("does not call an unlisted asset sound", async () => {
    mockOnce({
      asset: {
        address: NVDAC, symbol: "USDC", verdict: "unlisted",
        note: "That is the ordinary case for a quote asset; it is not a statement that the asset is sound.",
      },
      findings: [],
    })
    lookup(NVDAC)
    await waitFor(() => expect(screen.getByText("Not a published tokenized stock")).toBeTruthy())
    expect(screen.getByText(/not a statement that the asset is sound/)).toBeTruthy()
  })

  it("rejects a malformed address without paying for anything", async () => {
    const spy = vi.fn()
    global.fetch = spy as unknown as typeof fetch
    lookup("not-an-address")
    expect(screen.getByText(/Enter a contract address/)).toBeTruthy()
    expect(spy).not.toHaveBeenCalled()
  })

  it("falls back to paying when the free check is already used", async () => {
    const { payUsdc } = await import("@/lib/pay-usdc")
    // 402 on the free attempt, then the paid attempt succeeds.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 402, json: async () => ({ error: "Free verification already used" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ asset: { symbol: "USDC", verdict: "unlisted" }, findings: [] }) })
    global.fetch = fetchMock as unknown as typeof fetch
    lookup(NVDAC)
    await waitFor(() => expect(screen.getByText("Not a published tokenized stock")).toBeTruthy())
    expect(payUsdc).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("surfaces a service error rather than rendering nothing", async () => {
    mockOnce({ error: "Could not read that contract" }, false, 502)
    lookup(NVDAC)
    await waitFor(() => expect(screen.getByText(/Could not read that contract/)).toBeTruthy())
  })
})
