// MCP endpoint — exposes the B20 verification as tools any MCP client (Claude,
// ChatGPT, Cursor) can call over the internet.
//
// Every paid tool here routes through the EXISTING /api/verify handlers rather
// than reimplementing the payment gate. That is deliberate: the gate verifies a
// Base Pay id or a transfer receipt, consumes the single-use replay claim, and
// records the payer for notifications. Duplicating ~150 lines of money-handling
// code for a second caller is exactly the mistake the verify route warns about,
// so this module calls those handlers directly with a synthetic Request.
import { NextResponse } from "next/server"
import { GET as verifyGET, POST as verifyPOST } from "../verify/route"
import {
  MAX_BATCH,
  PROTOCOL_VERSION,
  RPC,
  SERVER_INFO,
  TOOLS,
  isKnownTool,
  rpcError,
  rpcResult,
  toolError,
  toolOk,
  toolUntrusted,
  type JsonRpcId,
  type JsonRpcRequest,
} from "@/lib/mcp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Base URL for the synthetic Requests handed to the verify handlers. */
const ORIGIN = (process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk").replace(/\/+$/, "")

type Args = Record<string, unknown>

const str = (args: Args, key: string) => (typeof args[key] === "string" ? (args[key] as string).trim() : "")

/** Read a handler's JSON body, tolerating an upstream that returned no JSON. */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Call POST /api/verify in-process. Returns the parsed body plus the status, so
 * the caller can turn a 402 into a readable "payment required" rather than
 * leaking an HTTP code into the model's context.
 */
async function callVerify(body: Record<string, unknown>) {
  const res = await verifyPOST(
    new Request(`${ORIGIN}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )
  return { status: res.status, body: await readJson(res) }
}

function paymentFrom(args: Args) {
  const txHash = str(args, "txHash")
  const paymentId = str(args, "paymentId")
  return txHash ? { txHash } : paymentId ? { paymentId } : {}
}

async function runTool(name: string, args: Args) {
  const address = str(args, "address")
  const chain = str(args, "chain") || "base"

  if (name === "get_verification_report") {
    const jobId = str(args, "jobId")
    if (!jobId) return toolError("jobId is required.")
    const res = await verifyGET(
      new Request(`${ORIGIN}/api/verify?jobId=${encodeURIComponent(jobId)}`),
    )
    const body = await readJson(res)
    if (!res.ok) return toolError(String(body.error ?? "Could not fetch that report."))
    // The report describes a contract someone else deployed — fence it.
    return toolUntrusted(body)
  }

  // Both remaining tools are paid, and share one gate.
  const payment = paymentFrom(args)
  if (!("txHash" in payment) && !("paymentId" in payment)) {
    return toolError(
      "Payment required. A verification costs $1 USDC. Supply either `txHash` (a Base " +
        "transaction hash for a USDC transfer to the treasury) or `paymentId` (a Base Pay " +
        "payment id). Each reference can only be used once.",
    )
  }

  const mode = name === "verify_quote_asset" ? "quote-asset" : "scan"
  const { status, body } = await callVerify({ address, chain, mode, ...payment })

  if (status !== 200) {
    // 402 and 409 are the ones a model should be able to explain to a user:
    // unpaid, or a payment reference that has already been spent.
    return toolError(String(body.error ?? "The verification could not be started."))
  }
  if (mode === "scan") {
    // Our own jobId, not upstream content — safe to return plainly.
    return toolOk({
      jobId: body.jobId,
      next: "Call get_verification_report with this jobId. Scans typically take under a minute.",
    })
  }
  // A quote-asset result echoes the contract's own symbol and composition.
  return toolUntrusted(body)
}

async function dispatch(method: string, params: Args, id: JsonRpcId) {
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      })

    case "ping":
      return rpcResult(id, {})

    case "tools/list":
      return rpcResult(id, { tools: TOOLS })

    case "tools/call": {
      const name = params.name
      if (!isKnownTool(name)) return rpcError(id, RPC.INVALID_PARAMS, `Unknown tool: ${String(name)}`)
      const args = (params.arguments ?? {}) as Args
      try {
        return rpcResult(id, await runTool(name, args))
      } catch {
        // An exception here is our fault, not the caller's — report it as a tool
        // result so the model sees it, not as a transport error it cannot read.
        return rpcResult(id, toolError("The verification service is unreachable. Try again shortly."))
      }
    }

    default:
      return rpcError(id, RPC.METHOD_NOT_FOUND, `Unknown method: ${method}`)
  }
}

export async function POST(request: Request) {
  let payload: JsonRpcRequest | JsonRpcRequest[]
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(rpcError(null, RPC.PARSE_ERROR, "Invalid JSON"), { status: 400 })
  }

  // A batch is an array. Notifications (no `id`) get no reply at all, so a batch
  // of only notifications produces an empty body with 202, per the spec.
  const batch = Array.isArray(payload)
  const messages: JsonRpcRequest[] = Array.isArray(payload) ? payload : [payload]

  // One request must not fan out into unbounded paid work. Refused as a whole
  // rather than truncated, so a caller is never left guessing which of its
  // messages ran — ambiguity about that is worse when calls cost money.
  if (messages.length > MAX_BATCH) {
    return NextResponse.json(
      rpcError(null, RPC.INVALID_REQUEST, `Batch too large: at most ${MAX_BATCH} messages per request.`),
      { status: 400 },
    )
  }

  const replies: unknown[] = []

  for (const msg of messages) {
    const method = typeof msg?.method === "string" ? msg.method : ""
    const id = msg?.id ?? null
    const isNotification = msg?.id === undefined
    if (!method) {
      if (!isNotification) replies.push(rpcError(id, RPC.INVALID_REQUEST, "Missing method"))
      continue
    }
    // notifications/* are one-way: acknowledge by saying nothing.
    if (isNotification) continue
    // Serial on purpose: these calls are paid, so ordering is observable.
    replies.push(await dispatch(method, (msg.params ?? {}) as Args, id))
  }

  if (replies.length === 0) return new Response(null, { status: 202 })
  return NextResponse.json(batch ? replies : replies[0])
}

// Streamable HTTP allows a GET that opens an SSE stream for server-initiated
// messages. This server never initiates any, so it declines rather than holding
// a connection open that would only ever be idle.
export function GET() {
  return NextResponse.json(
    rpcError(null, RPC.METHOD_NOT_FOUND, "This server does not offer an SSE stream; POST JSON-RPC instead."),
    { status: 405, headers: { Allow: "POST" } },
  )
}
