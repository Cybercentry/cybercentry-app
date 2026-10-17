import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QuoteAssetForm } from "@/app/quote-asset-form"

// The lookup the basket threat actually needs: the composition check used to be
// reachable only inwards, while scanning a B20 token that happened to be priced
// against a basket. The main scan rejects anything that is not a B20 token, and
// a basket never is one — so someone looking at a "meme / AAPL+TSLA+NVDA" pair
// had no way to ask what was in the basket.

const NVDAC = "0xb20000000000000000000078ee7ce2fE4908108C"
const FAKE = "0xFEAeD1129be9f90AEcD1BF2c0d7ef5ec0d819bA3"
const PAIR = "0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C"

function mockOnce(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch
}

function lookup(addr: string) {
  render(<QuoteAssetForm />)
  fireEvent.change(screen.getByLabelText(/contract address/i), { target: { value: addr } })
  fireEvent.click(screen.getByRole("button", { name: /check/i }))
}

describe("QuoteAssetForm", () => {
  beforeEach(() => vi.restoreAllMocks())

  it("names a counterfeit and the address it should have been", async () => {
    mockOnce({
      address: FAKE,
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
      address: PAIR,
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
    expect(screen.getByText(/Counterfeit/)).toBeTruthy()
  })

  it("does not call an unlisted asset sound", async () => {
    mockOnce({
      address: NVDAC,
      asset: {
        address: NVDAC, symbol: "USDC", verdict: "unlisted",
        note: "Not a ticker the issuer publishes, and it declares no composition this check can read. That is the ordinary case for a quote asset; it is not a statement that the asset is sound.",
      },
      findings: [],
    })
    lookup(NVDAC)
    await waitFor(() => expect(screen.getByText("Not a published tokenized stock")).toBeTruthy())
    expect(screen.getByText(/not a statement that the asset is sound/)).toBeTruthy()
  })

  it("rejects a malformed address without calling the service", async () => {
    const spy = vi.fn()
    global.fetch = spy as unknown as typeof fetch
    lookup("not-an-address")
    expect(screen.getByText(/Enter a contract address/)).toBeTruthy()
    expect(spy).not.toHaveBeenCalled()
  })

  it("surfaces a service error rather than rendering nothing", async () => {
    mockOnce({ error: "Too many lookups — try again in a minute" }, false, 429)
    lookup(NVDAC)
    await waitFor(() => expect(screen.getByText(/Too many lookups/)).toBeTruthy())
  })
})
