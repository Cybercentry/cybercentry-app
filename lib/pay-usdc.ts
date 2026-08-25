"use client"
// USDC payment via the connected wallet.
//
// wagmi is used ONLY to connect a wallet (its connectors handle the in-app +
// web + extension cases). The actual chain-switch and send go through viem's
// walletClient talking straight to the wallet's provider — this sidesteps
// wagmi's connector abstraction, which some wallets (e.g. Privy) don't fully
// implement (connector.getChainId is undefined, breaking switchChain/sendTx).
//
// No Base Pay pay() sheet — so no "something went wrong" flash. The Builder Code
// (ERC-8021) rides on the calldata; inside the Base App, Base auto-appends it.
import { connect, getConnections } from "@wagmi/core"
import { createWalletClient, custom, encodeFunctionData, parseUnits, erc20Abi, type EIP1193Provider } from "viem"
import { base, baseSepolia } from "viem/chains"
import { config, BUILDER_DATA_SUFFIX } from "./wagmi"
import { FREE_SCAN_MESSAGE } from "./payments"
import type { Chain } from "./cbtv"

const CHAIN_ID: Record<Chain, number> = { base: 8453, "base-sepolia": 84532 }
const VIEM_CHAIN = { base, "base-sepolia": baseSepolia } as const
const USDC: Record<Chain, `0x${string}`> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

const isRejection = (e: unknown) => /reject|denied|cancel/i.test(e instanceof Error ? e.message : String(e))

function injectedProvider(): EIP1193Provider | undefined {
  if (typeof window === "undefined") return undefined
  const p = (window as unknown as { ethereum?: EIP1193Provider }).ethereum
  return p?.request ? p : undefined
}

/** Connect a wallet and return its provider + account. Connector shapes vary by
 *  environment (Privy lacks getChainId, the Base App connector lacks
 *  getProvider), so resolve the provider defensively and fall back to the
 *  injected window.ethereum that in-app browsers / extensions expose. */
async function connectWallet(): Promise<{ provider: EIP1193Provider; account: `0x${string}` }> {
  let conn = getConnections(config)[0]
  if (!conn?.accounts?.[0]) {
    let lastErr: unknown
    for (const connector of config.connectors) {
      try {
        await connect(config, { connector })
        conn = getConnections(config)[0]
        if (conn?.accounts?.[0]) break
      } catch (e) {
        lastErr = e
        if (isRejection(e)) throw e
      }
    }
    if (!conn?.accounts?.[0] && !injectedProvider()) {
      throw lastErr instanceof Error ? lastErr : new Error("Could not connect a wallet")
    }
  }

  // Prefer the connector's provider + account; fall back to injected.
  let provider: EIP1193Provider | undefined
  let account = conn?.accounts?.[0]
  try {
    if (typeof conn?.connector?.getProvider === "function") {
      provider = (await conn.connector.getProvider()) as EIP1193Provider
    }
  } catch {
    /* connector provider unavailable — fall back below */
  }
  if (!provider?.request) {
    provider = injectedProvider()
    if (provider) {
      // Authorize this provider and use ITS account — mixing a wagmi account with
      // the injected provider yields "account not authorized" on send.
      const accts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[]
      account = accts?.[0]
    }
  }
  if (!provider?.request || !account) throw new Error("Could not reach the wallet provider")
  return { provider, account }
}

/** Ensure the wallet is on the target chain, via the raw provider (universal). */
async function ensureChain(provider: EIP1193Provider, chainId: number): Promise<void> {
  const current = Number.parseInt(String(await provider.request({ method: "eth_chainId" })), 16)
  if (current === chainId) return
  const hexId = `0x${chainId.toString(16)}` as `0x${string}`
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] })
  } catch (err) {
    // 4902 = chain not added; add Base (which also selects it).
    if ((err as { code?: number })?.code === 4902 && chainId === 8453) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: "Base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          },
        ],
      })
    } else {
      throw err
    }
  }
}

/**
 * Pay the USDC fee. Returns the on-chain tx hash (the server verifies it from the
 * receipt). Throws on user rejection or if no wallet can be reached.
 */
export async function payUsdc(opts: { amount: string; to: `0x${string}`; chain: Chain }): Promise<{ txHash: string }> {
  const chainId = CHAIN_ID[opts.chain]
  const { provider, account } = await connectWallet()
  await ensureChain(provider, chainId)

  const wallet = createWalletClient({ account, chain: VIEM_CHAIN[opts.chain], transport: custom(provider) })
  const transfer = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [opts.to, parseUnits(opts.amount, 6)],
  })
  // Append the ERC-8021 Builder Code suffix to the calldata (EOAs support this
  // directly; harmless on smart wallets, and Base auto-appends in-app anyway).
  const data = (BUILDER_DATA_SUFFIX ? transfer + BUILDER_DATA_SUFFIX.slice(2) : transfer) as `0x${string}`

  const txHash = await wallet.sendTransaction({ to: USDC[opts.chain], data })
  return { txHash }
}

/**
 * Sign the free-scan message to claim this wallet's one free verification. Gasless
 * and fundless — just proves wallet ownership. The server verifies the signature
 * (EOA or smart-wallet) and grants the free scan once per wallet. Throws on
 * rejection or if no wallet can be reached.
 */
export async function signFreeScan(): Promise<{ wallet: `0x${string}`; message: string; signature: string }> {
  const { provider, account } = await connectWallet()
  const wallet = createWalletClient({ account, transport: custom(provider) })
  const signature = await wallet.signMessage({ account, message: FREE_SCAN_MESSAGE })
  return { wallet: account, message: FREE_SCAN_MESSAGE, signature }
}
