// Minimal MCP (Model Context Protocol) server plumbing — JSON-RPC 2.0 over a
// single HTTP POST, which is the "Streamable HTTP" transport with SSE left out.
//
// Hand-rolled rather than pulling in @modelcontextprotocol/sdk: a stateless
// server is this much code, and the SDK would add a dependency tree to a
// project that pins its deps deliberately. There is no session state here — the
// paid work is authorised per call by the same payment gate the web app uses —
// so none of the SDK's session, resumption or notification machinery applies.
//
// Protocol: https://modelcontextprotocol.io/specification/2025-06-18

/** The spec revision this server implements. */
export const PROTOCOL_VERSION = "2025-06-18"

export const SERVER_INFO = { name: "cybercentry-b20-verification", version: "0.1.0" } as const

export type JsonRpcId = string | number | null

export type JsonRpcRequest = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: Record<string, unknown>
}

/** JSON-RPC 2.0 reserved codes. Tool failures are NOT these — see `toolError`. */
export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

export function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result }
}

export function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

/**
 * A failed tool call is a RESULT with `isError`, not a JSON-RPC error. The
 * distinction matters: a protocol error is invisible to the model, while this
 * comes back as content the model can read and act on ("payment required" is
 * something it should be able to explain, not a transport fault).
 */
export function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true }
}

export function toolOk(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  return { content: [{ type: "text", text }], isError: false }
}

const ADDRESS_DESC =
  "The token contract address to verify, as 0x followed by 40 hex characters."
const CHAIN_DESC = "'base' (mainnet, default) or 'base-sepolia' (testnet)."
const PAYMENT_DESC =
  "Proof the scan was paid for. Supply ONE of `txHash` (a Base transaction hash " +
  "for a $1 USDC transfer to the treasury) or `paymentId` (a Base Pay payment " +
  "id). Each is single-use. Without one the call returns 'Payment required'."

/** Tool definitions, exactly as `tools/list` returns them. */
export const TOOLS = [
  {
    name: "verify_b20_token",
    description:
      "Start a Cybercentry B20 token verification: can this token actually be sold? " +
      "Checks pool-hook honeypots, whitelisted exits, freeze-and-seize, live pauses, " +
      "fakes and issuer controls. Returns a jobId — poll it with get_verification_report. " +
      "Costs $1 USDC, so a payment reference is required.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: ADDRESS_DESC },
        chain: { type: "string", enum: ["base", "base-sepolia"], description: CHAIN_DESC },
        txHash: { type: "string", description: PAYMENT_DESC },
        paymentId: { type: "string", description: PAYMENT_DESC },
      },
      required: ["address"],
    },
  },
  {
    name: "get_verification_report",
    description:
      "Fetch the report for a jobId returned by verify_b20_token. Free to call. " +
      "While the scan is still running this returns status 'running' with a " +
      "retryAfter in seconds — wait that long before calling again.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "The jobId returned by verify_b20_token." },
      },
      required: ["jobId"],
    },
  },
  {
    name: "verify_quote_asset",
    description:
      "Settle any token address against the issuer's published tokenized-stock list " +
      "and read what it is a claim on — a quote asset, a basket, an ERC-4626 wrapper. " +
      "Synchronous, no polling. Costs $1 USDC, so a payment reference is required.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: ADDRESS_DESC },
        chain: { type: "string", enum: ["base", "base-sepolia"], description: CHAIN_DESC },
        txHash: { type: "string", description: PAYMENT_DESC },
        paymentId: { type: "string", description: PAYMENT_DESC },
      },
      required: ["address"],
    },
  },
] as const

export type ToolName = (typeof TOOLS)[number]["name"]

export function isKnownTool(name: unknown): name is ToolName {
  return typeof name === "string" && TOOLS.some((t) => t.name === name)
}
