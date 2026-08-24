import { NextResponse } from "next/server"
// Browser payment entry: getPaymentStatus is just viem RPC calls (runtime-
// agnostic, works in Node) and avoids the node entry's @x402/evm/CDP subscription
// code we don't use.
import { getPaymentStatus } from "@base-org/account/payment/browser"
import { PAY_AMOUNT, TREASURY, PAY_TESTNET } from "@/lib/payments"

// Node runtime: getPaymentStatus makes RPC calls, and the CBTV key must never
// reach the edge/client.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// SERVER-ONLY secrets — no NEXT_PUBLIC_ prefix, so Next never ships them to the
// browser. The whole point of this route is to hold the CBTV key server-side.
const CBTV_API_URL = process.env.CBTV_API_URL ?? ""
const CBTV_API_KEY = process.env.CBTV_API_KEY ?? ""

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const CHAINS = new Set(["base", "base-sepolia"])

// In-memory replay guard. One payment id → one scan. Fine on a single Railway
// instance; a multi-instance deploy would need a shared store (see plan).
const usedPayments = new Set<string>()

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// POST — verify the Base Pay payment, then kick off an async CBTV scan.
export async function POST(request: Request) {
  if (!CBTV_API_URL || !CBTV_API_KEY) return bad(500, "Service not configured")

  let body: { address?: string; chain?: string; paymentId?: string }
  try {
    body = await request.json()
  } catch {
    return bad(400, "Invalid JSON")
  }

  const address = (body.address ?? "").trim()
  const chain = (body.chain ?? "base").trim()
  const paymentId = (body.paymentId ?? "").trim()

  if (!ADDRESS_RE.test(address)) return bad(400, "Enter a valid 0x… token address")
  if (!CHAINS.has(chain)) return bad(400, "Unsupported chain")
  if (!paymentId) return bad(402, "Payment required")

  // Replay guard first — reject a re-used payment before doing any work.
  if (usedPayments.has(paymentId)) return bad(409, "This payment has already been used")

  // Verify the payment against the on-chain USDC transfer. expectedPayment makes
  // getPaymentStatus assert the amount and recipient match, and throw otherwise —
  // so a spoofed id, wrong amount, or wrong recipient never passes.
  let status
  try {
    status = await getPaymentStatus({
      id: paymentId,
      expectedPayment: { amount: PAY_AMOUNT, recipient: TREASURY },
      testnet: PAY_TESTNET,
    })
  } catch {
    return bad(402, "Payment could not be verified")
  }
  if (status.status !== "completed") return bad(402, `Payment ${status.status}`)

  // Consume the payment now so it can't be replayed even if CBTV kickoff fails.
  usedPayments.add(paymentId)

  // Kick off the async scan — no client waits on the connection, so it runs to
  // completion instead of shedding sections under the sync 60s limit.
  let job
  try {
    const res = await fetch(`${CBTV_API_URL}/verify-b20/async`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": CBTV_API_KEY },
      body: JSON.stringify({ address, chain }),
    })
    if (!res.ok) return bad(502, "Verification service is unavailable")
    job = await res.json()
  } catch {
    return bad(502, "Verification service is unreachable")
  }

  const jobId = job.job_id ?? job.jobId
  if (!jobId) return bad(502, "Verification service returned no job")
  return NextResponse.json({ jobId })
}

// GET ?jobId=… — poll the CBTV report for that job. Proxies /report/{jobId} with
// the server-held key; the browser never sees it.
export async function GET(request: Request) {
  if (!CBTV_API_URL || !CBTV_API_KEY) return bad(500, "Service not configured")

  const jobId = new URL(request.url).searchParams.get("jobId")?.trim()
  if (!jobId || !/^[A-Za-z0-9._-]{1,128}$/.test(jobId)) return bad(400, "Invalid job id")

  let res: Response
  try {
    res = await fetch(`${CBTV_API_URL}/report/${encodeURIComponent(jobId)}`, {
      headers: { "x-api-key": CBTV_API_KEY },
    })
  } catch {
    return bad(502, "Verification service is unreachable")
  }

  if (res.status === 202) return NextResponse.json({ status: "running" })
  if (res.status === 404) return bad(404, "No such job")
  if (res.status === 502) return NextResponse.json({ status: "error", error: "The scan failed" })
  if (!res.ok) return bad(502, "Verification service error")

  const report = await res.json()
  return NextResponse.json({ status: "done", report })
}
