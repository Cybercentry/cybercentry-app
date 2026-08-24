"use client"
// USDC payment via the connected wallet (wagmi/viem — the Base-recommended path).
//
// Flow: connect a wallet (Base Account smart wallet or the Base App's injected
// wallet) → send the USDC transfer → return the on-chain tx hash. The wagmi
// config's dataSuffix appends the Builder Code automatically. The server then
// verifies the payment by reading the tx receipt (see app/api/verify/route.ts).
//
// Smart wallets get a batched call (EIP-5792 wallet_sendCalls); an EOA falls back
// to a plain transfer. No Base Pay pay() sheet — so no "something went wrong" flash.
import {
  connect,
  getConnections,
  getChainId,
  switchChain,
  sendCalls,
  waitForCallsStatus,
  sendTransaction,
  waitForTransactionReceipt,
} from "@wagmi/core"
import { encodeFunctionData, parseUnits, erc20Abi } from "viem"
import { config, BUILDER_DATA_SUFFIX } from "./wagmi"
import type { Chain } from "./cbtv"

const CHAIN_ID: Record<Chain, 8453 | 84532> = { base: 8453, "base-sepolia": 84532 }
const USDC: Record<Chain, `0x${string}`> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

const isRejection = (e: unknown) => /reject|denied|cancel/i.test(e instanceof Error ? e.message : String(e))

async function ensureAccount(): Promise<`0x${string}`> {
  const existing = getConnections(config)[0]?.accounts?.[0]
  if (existing) return existing
  let lastErr: unknown
  // Try each connector: injected first (in-app browser / extension), then the
  // Base Account popup. A user rejection stops here rather than trying the next.
  for (const connector of config.connectors) {
    try {
      const res = await connect(config, { connector })
      if (res.accounts[0]) return res.accounts[0]
    } catch (e) {
      lastErr = e
      if (isRejection(e)) throw e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not connect a wallet")
}

/**
 * Pay the USDC fee. Returns the on-chain tx hash (server verifies from the
 * receipt). Throws on user rejection or if no wallet can be reached.
 */
export async function payUsdc(opts: { amount: string; to: `0x${string}`; chain: Chain }): Promise<{ txHash: string }> {
  const chainId = CHAIN_ID[opts.chain]
  const account = await ensureAccount()
  // The connected wallet may be on another chain (e.g. Ethereum) — move it to the
  // target Base chain before sending, or the transaction reverts as a mismatch.
  if (getChainId(config) !== chainId) {
    await switchChain(config, { chainId })
  }
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [opts.to, parseUnits(opts.amount, 6)],
  })
  const to = USDC[opts.chain]
  // EOAs carry the Builder Code as a calldata suffix; smart wallets via the
  // ERC-5792 dataSuffix capability. (Inside the Base App attribution is automatic.)
  const dataWithSuffix = (BUILDER_DATA_SUFFIX ? data + BUILDER_DATA_SUFFIX.slice(2) : data) as `0x${string}`
  try {
    // Smart wallet: one batched call (EIP-5792).
    const { id } = await sendCalls(config, {
      account,
      chainId,
      calls: [{ to, data }],
      capabilities: { dataSuffix: { value: BUILDER_DATA_SUFFIX, optional: true } },
    })
    const status = await waitForCallsStatus(config, { id })
    const hash = status.receipts?.[0]?.transactionHash
    if (hash) return { txHash: hash }
    throw new Error("Payment did not confirm")
  } catch (err) {
    if (isRejection(err)) throw err
    // EOA / no batching support — plain transfer with the suffix appended.
    const hash = await sendTransaction(config, { account, chainId, to, data: dataWithSuffix })
    await waitForTransactionReceipt(config, { hash, chainId })
    return { txHash: hash }
  }
}
