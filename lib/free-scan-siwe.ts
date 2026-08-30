// Field-level validation of the free-scan SIWE message. Server-only in practice,
// but kept out of the route file so it can be imported by tests — a route module
// may only export its HTTP handlers.
import { parseSiweMessage } from "viem/siwe"
import { FREE_SCAN_STATEMENT, FREE_SCAN_MAX_AGE_MS } from "./payments"

/** Expected SIWE domain/origin for the free-scan message, from NEXT_PUBLIC_URL. */
export const APP_ORIGIN = (process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk").replace(/\/+$/, "")
export const APP_HOST = APP_ORIGIN.replace(/^https?:\/\//, "")
export const CHAIN_IDS: Record<string, number> = { base: 8453, "base-sepolia": 84532 }

/** Clock-skew allowance for a signer whose device runs slightly ahead of us. */
const SKEW_MS = 60_000

/**
 * Check the free-scan message is a SIWE message issued by THIS app, for THIS
 * wallet and chain, recently. Returns false for anything else.
 *
 * Without these bindings the message is a fixed string that reads the same on
 * every site and never expires, so another page could harvest a signature over
 * it and spend the visitor's free scan here.
 */
export function siweFieldsOk(message: string, wallet: string, chain: string): boolean {
  let f: ReturnType<typeof parseSiweMessage>
  try {
    f = parseSiweMessage(message)
  } catch {
    return false
  }
  if (!f.address || f.address.toLowerCase() !== wallet.toLowerCase()) return false
  if (f.domain !== APP_HOST) return false
  if (!f.uri || f.uri.replace(/\/+$/, "") !== APP_ORIGIN) return false
  if (f.chainId !== CHAIN_IDS[chain]) return false
  if (f.statement !== FREE_SCAN_STATEMENT) return false
  if (!f.issuedAt) return false
  const age = Date.now() - new Date(f.issuedAt).getTime()
  if (!Number.isFinite(age) || age > FREE_SCAN_MAX_AGE_MS || age < -SKEW_MS) return false
  // Honour the optional SIWE validity window if the signer set one.
  if (f.expirationTime && Date.now() > new Date(f.expirationTime).getTime()) return false
  if (f.notBefore && Date.now() < new Date(f.notBefore).getTime()) return false
  return true
}
