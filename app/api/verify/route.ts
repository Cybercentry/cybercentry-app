import { NextResponse } from "next/server"
// Browser payment entry: getPaymentStatus is just viem RPC calls (runtime-
// agnostic, works in Node) and avoids the node entry's @x402/evm/CDP subscription
// code we don't use.
import { getPaymentStatus } from "@base-org/account/payment/browser"
import { createPublicClient, http } from "viem"
import { base, baseSepolia } from "viem/chains"
import { parseSiweMessage } from "viem/siwe"
import {
  PAY_AMOUNT,
  TREASURY,
  PAY_TESTNET,
  FREE_SCAN_STATEMENT,
  LEGACY_FREE_SCAN_MESSAGE,
  FREE_SCAN_MAX_AGE_MS,
} from "@/lib/payments"
import { claimPayment, claimFreeScan, setPayer, takePayer } from "@/lib/replay-store"
import { reportRiskLevel } from "@/lib/cbtv"
import { notifyHighRisk } from "@/lib/notify"

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

// Full JSON-RPC endpoint for reading tx receipts (sendCalls path). A CDP Base
// RPC serves both eth_ and bundler methods, so PAY_BUNDLER_URL usually works;
// PAY_RPC_URL overrides if the bundler endpoint is bundler-only.
const RPC_URL = process.env.PAY_RPC_URL || process.env.PAY_BUNDLER_URL || undefined

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const TX_RE = /^0x[a-fA-F0-9]{64}$/
const CHAINS = new Set(["base", "base-sepolia"])

// USDC contracts + the ERC-20 Transfer topic, for verifying a sendCalls payment
// directly from its on-chain receipt.
const USDC: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
// $1.00 USDC = 1_000_000 (6 decimals). Matches PAY_AMOUNT.
const MIN_UNITS = BigInt(1_000_000)

// Expected SIWE domain/origin for the free-scan message, from NEXT_PUBLIC_URL.
const APP_ORIGIN = (process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk").replace(/\/+$/, "")
const APP_HOST = APP_ORIGIN.replace(/^https?:\/\//, "")
const CHAIN_IDS: Record<string, number> = { base: 8453, "base-sepolia": 84532 }

/**
 * Check the free-scan message is a SIWE message issued by THIS app, for THIS
 * wallet and chain, recently. Returns false for anything else.
 *
 * Without these bindings the message is a fixed string that reads the same on
 * every site and never expires, so another page could harvest a signature over
 * it and spend the visitor's free scan here.
 */
function siweFieldsOk(message: string, wallet: string, chain: string): boolean {
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
  // issuedAt must exist and be recent. A small negative allowance absorbs clock
  // skew between the signer's device and this server.
  if (!f.issuedAt) return false
  const age = Date.now() - new Date(f.issuedAt).getTime()
  if (!Number.isFinite(age) || age > FREE_SCAN_MAX_AGE_MS || age < -60_000) return false
  // Honour the optional SIWE validity window if the signer set one.
  if (f.expirationTime && Date.now() > new Date(f.expirationTime).getTime()) return false
  if (f.notBefore && Date.now() < new Date(f.notBefore).getTime()) return false
  return true
}

// Verify a wallet signature over the free-scan message. Uses a public client so
// it validates BOTH EOAs (ECDSA) and smart wallets (EIP-1271 / ERC-6492) — the
// Base App wallet is a smart wallet, so plain recovery isn't enough. Never throws.
async function verifyFreeSignature(
  wallet: `0x${string}`,
  signature: `0x${string}`,
  chain: string,
  message: string,
): Promise<boolean> {
  const rpc = chain === "base-sepolia" ? "https://sepolia.base.org" : RPC_URL || "https://mainnet.base.org"
  const client = createPublicClient({ chain: chain === "base-sepolia" ? baseSepolia : base, transport: http(rpc) })
  try {
    return await client.verifyMessage({ address: wallet, message, signature })
  } catch (err) {
    console.error("[verify] free-scan signature check threw:", err instanceof Error ? err.message : err)
    return false
  }
}

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

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  const j = (await res.json()) as { result?: unknown; error?: { message?: string } }
  if (j.error) throw new Error(j.error.message || "RPC error")
  return j.result
}

// Verify a sendCalls payment straight from its on-chain receipt: the tx must
// have succeeded and contain a USDC Transfer of >= $1 to the treasury. Trust is
// on-chain, not on the client — a spoofed / wrong-amount / wrong-recipient hash
// fails. Retries ~45s because the receipt can lag the wallet resolving.
async function verifyByTxHash(
  txHash: string,
  chain: string,
): Promise<{ ok: true; sender?: string } | { ok: false; msg: string }> {
  if (!RPC_URL) return { ok: false, msg: "Payment verification is not configured" }
  const usdc = USDC[chain]?.toLowerCase()
  if (!usdc || !TREASURY) return { ok: false, msg: "Payment verification is not configured" }
  const treasuryTopic = "0x" + TREASURY.toLowerCase().replace(/^0x/, "").padStart(64, "0")
  const deadline = Date.now() + 45_000
  let attempt = 0
  while (Date.now() < deadline) {
    attempt++
    try {
      const r = (await rpc("eth_getTransactionReceipt", [txHash])) as {
        status?: string
        logs?: { address: string; topics: string[]; data: string }[]
      } | null
      if (r) {
        if (r.status !== "0x1") return { ok: false, msg: "Payment transaction failed" }
        for (const log of r.logs ?? []) {
          if (
            log.address.toLowerCase() === usdc &&
            log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
            log.topics[2]?.toLowerCase() === treasuryTopic &&
            BigInt(log.data) >= MIN_UNITS
          ) {
            return { ok: true, sender: "0x" + log.topics[1].slice(-40) }
          }
        }
        return { ok: false, msg: "No matching USDC payment in this transaction" }
      }
      // Not mined yet — wait and retry.
    } catch (err) {
      console.error(`[verify] eth_getTransactionReceipt threw (attempt ${attempt}):`, err instanceof Error ? err.message : err)
    }
    await sleep(3000)
  }
  return { ok: false, msg: "Payment not yet confirmed" }
}

// POST — verify the payment (pay() id or sendCalls tx hash), then kick off a scan.
export async function POST(request: Request) {
  if (!CBTV_API_URL || !CBTV_API_KEY) return bad(500, "Service not configured")

  let body: {
    address?: string
    chain?: string
    paymentId?: string
    txHash?: string
    freeSig?: { wallet?: string; message?: string; signature?: string }
  }
  try {
    body = await request.json()
  } catch {
    return bad(400, "Invalid JSON")
  }

  const address = (body.address ?? "").trim()
  const chain = (body.chain ?? "base").trim()
  const paymentId = (body.paymentId ?? "").trim()
  const txHash = (body.txHash ?? "").trim()
  const freeSig = body.freeSig

  if (!ADDRESS_RE.test(address)) return bad(400, "Enter a valid 0x… token address")
  if (!CHAINS.has(chain)) return bad(400, "Unsupported chain")

  // Authorize the scan one of three ways: a free-scan signature (once per wallet),
  // a sendCalls tx hash (receipt parse), or a pay() id (getPaymentStatus). claimId
  // is the single-use payment id to replay-guard; null for the free path, which is
  // already guarded per-wallet by claimFreeScan.
  let verified: { ok: true; sender?: string } | { ok: false; msg: string }
  let claimId: string | null = null
  if (freeSig?.wallet && freeSig?.signature) {
    const message = freeSig.message ?? ""
    if (!ADDRESS_RE.test(freeSig.wallet) || !message) return bad(400, "Invalid free-scan request")
    // Accept the pre-SIWE bare message for one release, so a tab loaded before
    // this deploy can still finish its free scan. Remove the legacy arm after.
    const isLegacy = message === LEGACY_FREE_SCAN_MESSAGE
    if (!isLegacy && !siweFieldsOk(message, freeSig.wallet, chain)) {
      return bad(400, "Free-scan request expired or not issued by this app")
    }
    const wallet = freeSig.wallet as `0x${string}`
    const sig = freeSig.signature as `0x${string}`
    if (!/^0x[0-9a-fA-F]+$/.test(sig)) return bad(400, "Invalid signature")
    if (!(await verifyFreeSignature(wallet, sig, chain, message))) {
      return bad(400, "Signature could not be verified")
    }
    // One free scan per wallet. Already used → 402 so the client falls back to paying.
    if (!(await claimFreeScan(wallet))) return bad(402, "Free verification already used")
    verified = { ok: true, sender: wallet }
  } else if (txHash) {
    if (!TX_RE.test(txHash)) return bad(400, "Invalid payment reference")
    verified = await verifyByTxHash(txHash, chain)
    claimId = txHash
  } else if (paymentId) {
    verified = await verifyPayment(paymentId)
    claimId = paymentId
  } else {
    return bad(402, "Payment required")
  }
  if (!verified.ok) return bad(402, verified.msg)

  // Replay-guard paid scans (Postgres, durable): first use → proceed; already used
  // → reject. Consumed before the CBTV kickoff so a failed kickoff can't re-use it.
  // Free scans skip this — they're already guarded per-wallet above.
  if (claimId && !(await claimPayment(claimId))) return bad(409, "This payment has already been used")

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
  // Remember who paid (durable, cross-replica), so a High-risk result can notify them.
  if (verified.sender) await setPayer(jobId, verified.sender)
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
  // Notify the payer once if the result is High risk. takePayer consumes the
  // record (durable), so a repeated poll can't fire a duplicate notification.
  const wallet = await takePayer(jobId)
  if (wallet && reportRiskLevel(report) === "High") void notifyHighRisk(wallet, report)
  return NextResponse.json({ status: "done", report })
}
