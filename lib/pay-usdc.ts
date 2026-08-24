"use client"
// USDC payment for the verification fee.
//
// Primary path: the Base App's native wallet via EIP-5792 `wallet_sendCalls`,
// carrying the builder-code as the standard `dataSuffix` capability (ERC-8021).
// This avoids Coinbase's pay() sheet (the "something went wrong" flash) AND lands
// the attribution suffix on-chain — which pay() does NOT, because it sends the
// suffix under a non-standard `attribution` capability the wallet ignores.
//
// Fallback: if no injected provider supports sendCalls (e.g. a plain browser
// tab), fall back to the proven Base Pay pay() flow so payments never break.
import { sdk } from "@farcaster/miniapp-sdk"
import { pay } from "@base-org/account/payment/browser"
import { DATA_SUFFIX } from "./payments"
import type { Chain } from "./cbtv"

const CHAIN_ID: Record<Chain, number> = { base: 8453, "base-sepolia": 84532 }
const USDC: Record<Chain, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

export type PayResult =
  | { method: "sendcalls"; txHash: string }
  | { method: "pay"; paymentId: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pad32(hexNo0x: string): string {
  return hexNo0x.toLowerCase().replace(/^0x/, "").padStart(64, "0")
}

// ERC-20 transfer(address,uint256) calldata.
function erc20TransferData(to: string, amount: bigint): string {
  return "0x" + "a9059cbb" + pad32(to) + pad32(amount.toString(16))
}

// "1.00" USDC (6 decimals) → 1_000_000n. Kept exact (no float drift).
function toUnits(amount: string, decimals = 6): bigint {
  const [whole, frac = ""] = amount.split(".")
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals)
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(fracPadded || "0")
}

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

async function getInjectedProvider(): Promise<Eip1193Provider | null> {
  try {
    const p = (await sdk.wallet.getEthereumProvider()) as unknown as Eip1193Provider | null
    if (p) return p
  } catch {
    /* not in a mini-app host */
  }
  if (typeof window !== "undefined") {
    const w = window as unknown as { ethereum?: Eip1193Provider }
    if (w.ethereum) return w.ethereum
  }
  return null
}

// Poll wallet_getCallsStatus until the batch confirms, returning the tx hash.
// Handles both the EIP-5792 v2 numeric status (200) and the older string form.
async function waitForCalls(provider: Eip1193Provider, id: string): Promise<string> {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const st = (await provider.request({ method: "wallet_getCallsStatus", params: [id] })) as {
      status?: number | string
      receipts?: { transactionHash?: string; status?: string }[]
    }
    const s = st?.status
    const confirmed = s === 200 || s === "CONFIRMED" || (typeof s === "number" && s >= 200 && s < 300)
    const failed = s === 400 || s === 500 || s === "FAILED" || (typeof s === "number" && s >= 400)
    const receipt = st?.receipts?.[0]
    if (receipt?.transactionHash && (confirmed || !failed)) return receipt.transactionHash
    if (failed) throw new Error("Payment failed")
    await sleep(2500)
  }
  throw new Error("Payment confirmation timed out")
}

async function payViaSendCalls(provider: Eip1193Provider, to: string, chain: Chain, amount: string): Promise<PayResult> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[]
  const from = accounts?.[0]
  if (!from) throw new Error("No wallet account")

  const call = { to: USDC[chain], data: erc20TransferData(to, toUnits(amount)), value: "0x0" }
  const params = [
    {
      version: "2.0.0",
      from,
      chainId: "0x" + CHAIN_ID[chain].toString(16),
      atomicRequired: true,
      calls: [call],
      ...(DATA_SUFFIX ? { capabilities: { dataSuffix: { value: DATA_SUFFIX, optional: true } } } : {}),
    },
  ]
  const res = await provider.request({ method: "wallet_sendCalls", params })
  // v2 returns { id }; older returns the id string directly.
  const id = typeof res === "string" ? res : (res as { id?: string })?.id
  if (!id) throw new Error("Wallet did not return a batch id")

  const txHash = await waitForCalls(provider, id)
  return { method: "sendcalls", txHash }
}

/**
 * Pay the USDC fee. Prefers the native wallet (no flash, builder code lands),
 * falls back to Base Pay pay() if that path is unavailable.
 */
export async function payUsdc(opts: { amount: string; to: string; chain: Chain; testnet: boolean }): Promise<PayResult> {
  const provider = await getInjectedProvider()
  if (provider) {
    try {
      return await payViaSendCalls(provider, opts.to, opts.chain, opts.amount)
    } catch (err) {
      // User rejection should surface, not silently fall back to a second prompt.
      const msg = err instanceof Error ? err.message : String(err)
      if (/reject|denied|cancel/i.test(msg)) throw err
      // Otherwise: sendCalls unsupported / transient — fall through to pay().
      console.warn("[pay] sendCalls path failed, falling back to pay():", msg)
    }
  }
  const payment = await pay({
    amount: opts.amount,
    to: opts.to,
    testnet: opts.testnet,
    ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
  })
  if (!payment?.id) throw new Error("Payment did not complete.")
  return { method: "pay", paymentId: payment.id }
}
