import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { QuoteAssetResultView } from "@/app/quote-asset-result"

// Presentational only. The form owns the input, the mode and the payment, so
// this is reachable from the one flow a user already knows rather than from a
// second form competing with it on the same page.

const NVDAC = "0xb20000000000000000000078ee7ce2fE4908108C"
const FAKE = "0xFEAeD1129be9f90AEcD1BF2c0d7ef5ec0d819bA3"
const PAIR = "0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C"
const noop = () => {}

describe("QuoteAssetResultView", () => {
  it("names a counterfeit and the address it should have been", () => {
    render(
      <QuoteAssetResultView
        onReset={noop}
        result={{
          asset: {
            address: FAKE, symbol: "NVDA", verdict: "impersonation",
            ticker: "NVDAC", matchedOn: "NVDA", official: NVDAC,
          },
          findings: [{ id: "VENUE-H-004", severity: "high", title: "This asset impersonates a verified tokenized stock" }],
        }}
      />,
    )
    expect(screen.getByText(/Counterfeit/)).toBeTruthy()
    expect(screen.getByText(/backed by no share/)).toBeTruthy()
    expect(screen.getByText(/impersonates a verified tokenized stock/)).toBeTruthy()
  })

  it("shows what is inside a basket, component by component", () => {
    // Shape taken from the live Uniswap v2 pair this was proven against.
    render(
      <QuoteAssetResultView
        onReset={noop}
        result={{
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
          findings: [],
        }}
      />,
    )
    expect(screen.getByText(/What.{0,3}s inside it/)).toBeTruthy()
    expect(screen.getByText(/A claim on 2 assets, read through token0\/token1\(\)/)).toBeTruthy()
    expect(screen.getByText(/1 of 2 verified, 1 not settled/)).toBeTruthy()
    expect(screen.getByText("Verified tokenized stock")).toBeTruthy()
  })

  it("does not call an unlisted asset sound", () => {
    render(
      <QuoteAssetResultView
        onReset={noop}
        result={{
          asset: {
            address: NVDAC, symbol: "USDC", verdict: "unlisted",
            note: "That is the ordinary case for a quote asset; it is not a statement that the asset is sound.",
          },
          findings: [],
        }}
      />,
    )
    expect(screen.getByText("Not a published tokenized stock")).toBeTruthy()
    expect(screen.getByText(/not a statement that the asset is sound/)).toBeTruthy()
  })

  it("offers a way back without reloading", () => {
    render(<QuoteAssetResultView onReset={noop} result={{ asset: { symbol: "USDC", verdict: "unlisted" } }} />)
    expect(screen.getByRole("button", { name: /check another/i })).toBeTruthy()
  })
})
