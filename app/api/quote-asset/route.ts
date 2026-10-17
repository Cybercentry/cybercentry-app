import { NextResponse } from "next/server"

// Node runtime: the CBTV key must never reach the edge or the client. The whole
// point of this route, like app/api/verify, is to hold that key server-side.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CBTV_API_URL = (process.env.CBTV_API_URL ?? "").replace(/\/+$/, "")
const CBTV_API_KEY = process.env.CBTV_API_KEY ?? ""

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const CHAINS = new Set(["base", "base-sepolia"])

// NOT PAYWALLED, unlike /api/verify, and that is a deliberate choice worth
// stating: settling one address costs the service a handful of eth_calls and no
// paid log queries, where a full scan costs pool discovery and hundreds of
// quotes. Gating a five-second composition lookup behind a payment would mean
// nobody checks a basket before trading against it, which is the entire point.
//
// Free does not mean unprotected: this route proxies a server-side API key, so
// it is rate limited per IP. Move it behind the same payment path as /api/verify
// if that trade looks wrong.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k)
    }
  }
  return recent.length > MAX_PER_WINDOW
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") ?? ""
  return fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown"
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

/**
 * Settle one address: is it a published tokenized stock, something wearing a
 * stock's ticker, or a claim on other assets — and if so, what is inside it.
 *
 * Exists because the composition check was only reachable inwards. /verify-b20
 * is B20-only by design, and a basket, an LP token or an ERC-4626 wrapper never
 * is one, so a holder looking at a basket had no way to ask what it held.
 */
export async function POST(request: Request) {
  if (!CBTV_API_URL || !CBTV_API_KEY) return bad(500, "Service not configured")

  const ip = clientIp(request)
  if (rateLimited(ip)) return bad(429, "Too many lookups — try again in a minute")

  let body: { address?: string; chain?: string }
  try {
    body = await request.json()
  } catch {
    return bad(400, "Invalid request")
  }

  const address = (body.address ?? "").trim()
  const chain = body.chain ?? "base"
  if (!ADDRESS_RE.test(address)) return bad(400, "Enter a contract address (0x…)")
  if (!CHAINS.has(chain)) return bad(400, "Unsupported chain")

  try {
    const res = await fetch(`${CBTV_API_URL}/verify-quote-asset`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": CBTV_API_KEY },
      body: JSON.stringify({ address, chain }),
      // Well inside the service's own 25s ceiling for this endpoint.
      signal: AbortSignal.timeout(30_000),
    })
    const text = await res.text()
    if (!res.ok) {
      // Surface the service's own message where it gave one; never its headers.
      let detail = "Could not read that contract"
      try {
        const j = JSON.parse(text) as { detail?: string; error?: string }
        detail = j.detail ?? j.error ?? detail
      } catch {
        /* non-JSON upstream error; keep the generic message */
      }
      return bad(res.status === 429 ? 429 : 502, detail)
    }
    return NextResponse.json(JSON.parse(text))
  } catch (err) {
    console.error("[quote-asset] upstream failed:", err instanceof Error ? err.message : err)
    return bad(504, "The verification service did not respond")
  }
}
