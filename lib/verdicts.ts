import type { StockVerdict } from "@/lib/cbtv"

/**
 * How one settled address is shown. Shared by the report's "What you'd be paid
 * in" panel and the standalone basket lookup, so the two cannot drift into
 * describing the same verdict differently.
 */
export const VERDICT_COLOR: Record<string, string> = {
  verified: "#16a34a",
  impersonation: "#dc2626",
  unknown: "#ca8a04",
  // Grey, NOT green, and deliberately. `unlisted` is the ordinary case for a
  // quote asset — it means "not a ticker the issuer publishes", not "checked
  // and sound". Colouring it green would turn the commonest result into a
  // reassurance the check never gave.
  unlisted: "#6b7280",
  native: "#6b7280",
}

export const VERDICT_LABEL: Record<string, string> = {
  verified: "Verified tokenized stock",
  impersonation: "Counterfeit — wears a published ticker at another address",
  unknown: "Could not be identified",
  unlisted: "Not a published tokenized stock",
  native: "Native ETH",
}

export function verdictColor(v?: StockVerdict | string): string {
  return VERDICT_COLOR[v ?? "unknown"] ?? "#6b7280"
}

export function verdictLabel(v?: StockVerdict | string): string {
  return VERDICT_LABEL[v ?? "unknown"] ?? String(v ?? "unknown")
}

/** 0x1234…cdef, for an address that has to fit on a phone. */
export function short(addr?: string): string {
  return addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr ?? ""
}
