/**
 * x402 payment support for the MCP server.
 *
 * Why this exists: every existing way of paying for a scan needs a browser
 * first. Base Pay needs a wallet popup, the free scan needs a SIWE signature
 * from a connected wallet, and both produce the `paymentId` / `txHash` the
 * verify gate wants. An autonomous agent that discovers this server through
 * the MCP registry has none of that and cannot obtain it — which left the paid
 * tools reachable but unusable to exactly the callers MCP exists to serve.
 *
 * x402 closes that: the agent pays per call from its own wallet. The payment
 * does not travel in HTTP headers as it does for plain x402 over HTTP — it
 * rides inside JSON-RPC in `params._meta`, and the settlement receipt comes
 * back in the result's `_meta`. @x402/mcp owns that encoding; this module only
 * supplies configuration and pricing.
 *
 * Disabled unless X402_PAY_TO is set. With it unset every export here is inert
 * and the server behaves exactly as it did before, so shipping this cannot
 * change live behaviour on its own.
 */
import { facilitator as cdpFacilitator } from "@coinbase/x402"
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server"
import type { PaymentRequirements } from "@x402/core/types"
import { registerExactEvmScheme } from "@x402/evm/exact/server"

/** CAIP-2 chain id, e.g. eip155:8453. The x402 types require this shape. */
type Caip2 = `${string}:${string}`

const DEFAULT_NETWORK: Caip2 = "eip155:8453"

/** USDC on Base mainnet / Base Sepolia — the same addresses the app pays in. */
const USDC: Record<string, string> = {
  "eip155:8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "eip155:84532": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

/**
 * Per-call price in USDC base units (6 decimals). A scan costs the same $1 the
 * web app charges — an agent should not get a different price from a human for
 * identical work. Reading a finished report stays free, so a tool absent from
 * this map is free and needs no payment.
 */
export const TOOL_PRICES: Record<string, string> = {
  verify_b20_token: "1000000",
  verify_quote_asset: "1000000",
}

/**
 * Validate X402_NETWORK at the env boundary. A malformed value would otherwise
 * reach the facilitator as a live payment request, so an unparseable override
 * falls back to Base mainnet loudly rather than being passed through.
 */
function readNetwork(): Caip2 {
  const raw = process.env.X402_NETWORK
  if (!raw) return DEFAULT_NETWORK
  if (/^[^:]+:[^:]+$/.test(raw)) return raw as Caip2
  console.error(`[x402] X402_NETWORK is not CAIP-2 ("${raw}"); using ${DEFAULT_NETWORK}`)
  return DEFAULT_NETWORK
}

export function x402Config() {
  // Treat a missing payTo as "off" rather than defaulting to some address: a
  // wrong recipient silently routes real money elsewhere.
  const payTo = process.env.X402_PAY_TO ?? ""
  return { enabled: payTo !== "", payTo, network: readNetwork() }
}

export function isPaidTool(name: string) {
  return x402Config().enabled && name in TOOL_PRICES
}

/**
 * What the caller must pay to run this tool. `maxTimeoutSeconds` is generous
 * because a scan is asynchronous: the agent pays, gets a jobId, then polls.
 */
export function buildAcceptsFor(toolName: string): PaymentRequirements[] {
  const { payTo, network } = x402Config()
  const amount = TOOL_PRICES[toolName]
  const asset = USDC[network]
  if (!amount || !asset) return []
  return [
    {
      scheme: "exact",
      network,
      amount,
      asset,
      payTo,
      maxTimeoutSeconds: 300,
      description: `Cybercentry ${toolName.replace(/_/g, " ")}`,
      extra: {},
    } as PaymentRequirements,
  ]
}

let resourceServerPromise: Promise<x402ResourceServer> | null = null

/**
 * Lazily build the resource server, once per process. initialize() does network
 * I/O against the facilitator, so it must not run at module load in a Next
 * route — that would make every cold start wait on the facilitator, including
 * requests that never touch a paid tool.
 *
 * The CDP facilitator is the default, matching the other Cybercentry x402
 * sellers. It signs each verify/settle call with CDP_API_KEY_ID /
 * CDP_API_KEY_SECRET from the environment, so no facilitator URL is configured
 * here.
 */
export function getResourceServer(): Promise<x402ResourceServer> {
  if (!resourceServerPromise) {
    resourceServerPromise = (async () => {
      const server = new x402ResourceServer(new HTTPFacilitatorClient(cdpFacilitator))
      registerExactEvmScheme(server, {})
      return server
    })()
  }
  return resourceServerPromise
}
