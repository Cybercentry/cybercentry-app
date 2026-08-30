// Coinbase Tokenized Stocks on Base — the issuer's published list.
//
// Source: https://docs.base.org/base-chain/specs/reference/b20/tokenized-stocks-on-base
// Captured 2026-08-30. All thirteen verified as valid EIP-55 checksums carrying
// the 0xb2… B20 prefix; the four the proxy had already confirmed on-chain
// (NVDAc, METAc, AAPLc, GOOGLc) match this list byte for byte.
//
// Why the app carries its own copy at all:
//
// The proxy settles impersonation against the same list, and is authoritative
// because it also confirms on-chain. But its copy covers four of the thirteen,
// so a copycat presenting TSLAc's ticker currently falls through its check
// entirely. This list closes that window from the client side.
//
// It may only ESCALATE. Where the service has spoken, the service wins; this
// list can add a warning the service did not raise, and can never downgrade,
// suppress, or contradict one it did. A local "looks fine" is never rendered as
// reassurance — only a mismatch is worth saying on our own authority.
//
// Base's own guidance, and the reason a ticker alone is never enough:
// "Tokens should be identified by address rather than ticker or symbol."

/** Where the list comes from, shown to the user so the claim is checkable. */
export const TOKENIZED_STOCK_LIST_URL = "https://base.org/stocks"

/** Ticker (as published, e.g. "NVDAc") → the issued contract address. */
export const TOKENIZED_STOCKS: Readonly<Record<string, `0x${string}`>> = {
  AAPLc: "0xb200000000000000000000C2e324d24d7eEcd1fb",
  AMZNc: "0xb200000000000000000000d9192b6B456483C2E8",
  COINc: "0xb200000000000000000000c85a31389D71F3ecfb",
  CRCLc: "0xB20000000000000000000019f6E7C675b73C2e4D",
  GOOGLc: "0xb2000000000000000000002D0BA3164cc74f58B7",
  INTCc: "0xB2000000000000000000004AFF16039bA04bdFBc",
  METAc: "0xb2000000000000000000008bC8786B856E61707C",
  MSFTc: "0xB200000000000000000000Ab99cFa739E253872B",
  MSTRc: "0xb2000000000000000000004884b426556b92883d",
  NVDAc: "0xb20000000000000000000078ee7ce2fE4908108C",
  SNDKc: "0xb200000000000000000000397293Cb8cda9a10c5",
  SPCXc: "0xb2000000000000000000007b9fcbd005511aCBd5",
  TSLAc: "0xb2000000000000000000001e800a7f5189430cD0",
} as const

/** Case-insensitive comparison; these are addresses, not display strings. */
const eq = (a?: string, b?: string) => Boolean(a && b && a.toLowerCase() === b.toLowerCase())

export type StockIdentity =
  /** This address IS the published contract for that ticker. */
  | { verdict: "verified"; ticker: string; official: `0x${string}` }
  /** Presents a published ticker, but is not the address published for it. */
  | { verdict: "impersonation"; ticker: string; official: `0x${string}` }
  | null

/** The published tokenized stock at this address, if any. */
export function tokenizedStockFor(address?: string): { ticker: string; official: `0x${string}` } | null {
  if (!address) return null
  for (const [ticker, official] of Object.entries(TOKENIZED_STOCKS)) {
    if (eq(address, official)) return { ticker, official }
  }
  return null
}

/**
 * Settle a scanned token against the published list — by ADDRESS first, so a
 * genuine security is recognised even when its ticker cannot be read, and a
 * ticker match only ever accuses a contract the address check already cleared.
 *
 * `symbols` takes every name the token presents (symbol, name), because a
 * copycat need only wear the ticker somewhere to be mistaken for the real one.
 */
export function stockIdentity(address?: string, ...symbols: (string | undefined)[]): StockIdentity {
  const byAddress = tokenizedStockFor(address)
  if (byAddress) return { verdict: "verified", ...byAddress }

  for (const raw of symbols) {
    if (!raw) continue
    const key = raw.trim().toLowerCase()
    for (const [ticker, official] of Object.entries(TOKENIZED_STOCKS)) {
      // Match the published ticker with or without its trailing "c" — a fake
      // wearing "NVDA" is trading on the same recognition as one wearing "NVDAc".
      const bare = ticker.replace(/c$/i, "").toLowerCase()
      if (key === ticker.toLowerCase() || key === bare) {
        // The address was checked above and did not match, so a ticker hit here
        // is necessarily a different contract wearing the name.
        return { verdict: "impersonation", ticker, official }
      }
    }
  }
  return null
}
