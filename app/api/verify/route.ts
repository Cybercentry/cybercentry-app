import { NextResponse } from "next/server"
// Browser payment entry: getPaymentStatus is just viem RPC calls (runtime-
// agnostic, works in Node) and avoids the node entry's @x402/evm/CDP subscription
// code we don't use.
import { getPaymentStatus } from "@base-org/account/payment/browser"
import { PAY_AMOUNT, TREASURY, PAY_TESTNET } from "@/lib/payments"
import { claimPayment } from "@/lib/replay-store"
import { reportRiskLevel } from "@/lib/cbtv"
import { notifyHighRisk } from "@/lib/notify"

// jobId → payer wallet, so a High-risk result can notify the person who paid.
// In-memory + short-lived (one scan); fine on a single instance.
const payerByJob = new Map<string, string>()

// Node runtime: getPaymentStatus makes RPC calls, and the CBTV key must never
// reach the edge/client.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// SERVER-ONLY secrets — no NEXT_PUBLIC_ prefix, so Next never ships them to the
// browser. The whole point of this route is to hold the CBTV key server-side.
// Strip any trailing slash so `${CBTV_API_URL}/verify-b20` never doubles up.
const CBTV_API_URL = (process.env.CBTV_API_URL ?? "").replace(/\/+$/, "")
const CBTV_API_KEY = process.env.CBTV_API_KEY ?? ""

// The SDK's default public bundler is unreliable on Base mainnet (rate limits →
// "Invalid response" / "not_found"). Point payment verification at a dedicated
// bundler (e.g. a CDP Base RPC) when provided.
const BUNDLER_URL = process.env.PAY_BUNDLER_URL || undefined

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const CHAINS = new Set(["base", "base-sepolia"])

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Verify the Base Pay payment against the on-chain USDC transfer. expectedPayment
// makes getPaymentStatus assert amount + recipient (and throw on mismatch), so a
// spoofed id / wrong amount / wrong recipient never passes. Retries for ~24s
// because the receipt can lag pay() resolving; logs the real error to the server
// (Railway logs) and returns it so the UI shows why.
async function verifyPayment(
  paymentId: string,
): Promise<{ ok: true; sender?: string } | { ok: false; msg: string }> {
  // Up to ~45s: mainnet userOp indexing can lag several seconds behind pay().
  const deadline = Date.now() + 45_000
  let last = "Payment could not be verified"
  let attempt = 0
  while (Date.now() < deadline) {
    attempt++
    try {
      const status = await getPaymentStatus({
        id: paymentId,
        expectedPayment: { amount: PAY_AMOUNT, recipient: TREASURY },
        testnet: PAY_TESTNET,
        ...(BUNDLER_URL ? { bundlerUrl: BUNDLER_URL } : {}),
      })
      if (status.status === "completed") return { ok: true, sender: status.sender }
      if (status.status === "failed") {
        const reason = status.reason ? `: ${status.reason}` : ""
        return { ok: false, msg: `Payment failed${reason}` }
      }
      // pending / not_found — the receipt isn't indexed yet; wait and retry.
      last = `Payment ${status.status}`
      console.warn(`[verify] payment ${paymentId} ${status.status} (attempt ${attempt})`)
    } catch (err) {
      last = err instanceof Error ? err.message : String(err)
      console.error(`[verify] getPaymentStatus threw (attempt ${attempt}, testnet=${PAY_TESTNET}):`, last)
    }
    await sleep(3000)
  }
  return { ok: false, msg: last }
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

  // Verify the payment against the on-chain USDC transfer. Retries because the
  // receipt can lag a few seconds behind pay() resolving, and surfaces + logs the
  // real reason instead of a blanket "could not be verified".
  const verified = await verifyPayment(paymentId)
  if (!verified.ok) return bad(402, verified.msg)

  // Atomically claim the payment id (Postgres, durable). First use → proceed;
  // already used → replay, reject. This also consumes it before the CBTV kickoff,
  // so a failed kickoff can't leave the id re-usable.
  if (!(await claimPayment(paymentId))) return bad(409, "This payment has already been used")

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
  // Remember who paid, so a High-risk result can notify them.
  if (verified.sender) payerByJob.set(jobId, verified.sender)
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
  // Notify the payer once if the result is High risk.
  const wallet = payerByJob.get(jobId)
  if (wallet) {
    payerByJob.delete(jobId)
    if (reportRiskLevel(report) === "High") void notifyHighRisk(wallet, report)
  }
  return NextResponse.json({ status: "done", report })
}
