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
import { waitForCallsStatus } from "viem/actions"
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

// Time bounds so an unresponsive wallet can't hang the flow forever. A plain
// Chrome tab with an injected wallet whose confirmation UI never appears (e.g.
// some embedded/Privy providers) would otherwise spin on "Confirm in wallet…"
// with no error — the reason it works in incognito (no injected wallet → Base
// Pay) but not in normal Chrome.
const REACH_MS = 20_000 // connect / provider handshake
const PROBE_MS = 8_000 // passive liveness read (eth_chainId — no wallet UI)
const SIGN_MS = 120_000 // user has time to approve, but never spin forever

/** Reject if a wallet call doesn't settle in `ms`. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

function injectedProvider(): EIP1193Provider | undefined {
  if (typeof window === "undefined") return undefined
  const p = (window as unknown as { ethereum?: EIP1193Provider }).ethereum
  return p?.request ? p : undefined
}

type Connector = (typeof config.connectors)[number]

/** Connect via one connector and return a *live* provider + account, or null to
 *  try the next. Every step is time-bounded, and the provider is probed with a
 *  passive eth_chainId so a wallet that connects but is actually unresponsive is
 *  rejected here (→ fall through to Base Pay) instead of hanging a later
 *  signature/transaction forever. Rethrows a genuine user rejection. */
async function reachVia(connector: Connector): Promise<{ provider: EIP1193Provider; account: `0x${string}` } | null> {
  try {
    const cur = getConnections(config).find((c) => c.connector?.uid === connector.uid)
    if (!cur?.accounts?.[0]) await withTimeout(connect(config, { connector }), REACH_MS, "Wallet connect")
  } catch (e) {
    if (isRejection(e)) throw e
    return null
  }

  const conn = getConnections(config).find((c) => c.connector?.uid === connector.uid) ?? getConnections(config)[0]
  let account = conn?.accounts?.[0]
  let provider: EIP1193Provider | undefined
  try {
    if (typeof conn?.connector?.getProvider === "function") {
      provider = (await withTimeout(conn.connector.getProvider(), REACH_MS, "Wallet provider")) as EIP1193Provider
    }
  } catch {
    /* connector provider unavailable — fall back to injected window.ethereum */
  }
  if (!provider?.request) {
    provider = injectedProvider()
    if (provider) {
      // Authorize this provider and use ITS account — mixing a wagmi account with
      // the injected provider yields "account not authorized" on send.
      try {
        const accts = (await withTimeout(
          provider.request({ method: "eth_requestAccounts" }),
          REACH_MS,
          "Wallet accounts",
        )) as `0x${string}`[]
        account = accts?.[0]
      } catch (e) {
        if (isRejection(e)) throw e
        provider = undefined
      }
    }
  }
  if (!provider?.request || !account) return null

  // Liveness probe: a working provider answers eth_chainId instantly (no UI). A
  // provider that connected but never responds hangs here and is rejected, so we
  // move on to the next connector instead of spinning on a later sign/send.
  try {
    await withTimeout(provider.request({ method: "eth_chainId" }), PROBE_MS, "Wallet probe")
  } catch (e) {
    if (isRejection(e)) throw e
    return null
  }
  return { provider, account }
}

/** Connect a wallet and return its provider + account. Tries the injected wallet
 *  first (Base app in-app browser + browser extensions), then Base Account /
 *  Base Pay. Every step is time-bounded so a wallet that never responds falls
 *  through to the next instead of spinning forever — which is what made a plain
 *  Chrome tab with an unresponsive injected wallet hang, while incognito (no
 *  injected wallet → Base Pay) worked. */
async function connectWallet(): Promise<{ provider: EIP1193Provider; account: `0x${string}` }> {
  const injectedC = config.connectors.find((c) => c.type === "injected" || c.id === "injected")
  const baseC = config.connectors.find((c) => c.id === "baseAccount" || /base/i.test(c.name ?? ""))
  const order = [injectedC, baseC].filter((c): c is Connector => Boolean(c))

  let lastErr: unknown
  for (const connector of order) {
    try {
      const res = await reachVia(connector)
      if (res) return res
    } catch (e) {
      if (isRejection(e)) throw e
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not reach a wallet")
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
  const suffix = BUILDER_DATA_SUFFIX || undefined

  // ERC-8021 Builder Code attribution must land in the right place per wallet
  // type (see Base docs). Smart wallets (Base Pay / EIP-5792): the suffix rides
  // on the OUTER userOp.callData, which only the wallet can place — via
  // sendCalls capabilities.dataSuffix. Nesting it in the transfer data (the old
  // approach) attributes NOTHING — the suffix ends up in the inner call.
  // EOAs: viem appends dataSuffix to tx.data on sendTransaction.
  try {
    const res = await wallet.sendCalls({
      calls: [{ to: USDC[opts.chain], data: transfer }],
      capabilities: suffix ? { dataSuffix: { value: suffix, optional: true } } : undefined,
    })
    const id = typeof res === "string" ? res : res.id
    const status = await waitForCallsStatus(wallet, { id })
    const txHash = status.receipts?.[status.receipts.length - 1]?.transactionHash
    if (!txHash) throw new Error("Payment sent but no transaction hash was returned")
    return { txHash }
  } catch (err) {
    if (isRejection(err)) throw err
    // Only fall back when the wallet genuinely lacks EIP-5792 sendCalls — never
    // on a real failure (e.g. insufficient funds), so we can't double-charge.
    const msg = err instanceof Error ? err.message : String(err)
    if (!/unsupported|not support|wallet_sendCalls|method not found|-32601|4200|does not exist/i.test(msg)) throw err
    const txHash = await wallet.sendTransaction({
      to: USDC[opts.chain],
      data: transfer,
      ...(suffix ? { dataSuffix: suffix } : {}),
    })
    return { txHash }
  }
}

/**
 * Sign the free-scan message to claim this wallet's one free verification. Gasless
 * and fundless — just proves wallet ownership. The server verifies the signature
 * (EOA or smart-wallet) and grants the free scan once per wallet. Throws on
 * rejection or if no wallet can be reached.
 */
export async function signFreeScan(): Promise<{ wallet: `0x${string}`; message: string; signature: string }> {
  const { provider } = await connectWallet()
  // Re-fetch the authorized account from THIS provider so the account we sign
  // with always matches it — a stale wagmi account causes sporadic sign failures.
  const accts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[]
  const account = accts?.[0]
  if (!account) throw new Error("No wallet account")
  const wallet = createWalletClient({ account, transport: custom(provider) })
  // Retry once on a transient failure (never on a user rejection). Bounded so a
  // wallet whose signing UI never appears errors out instead of spinning forever.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const signature = await withTimeout(
        wallet.signMessage({ account, message: FREE_SCAN_MESSAGE }),
        SIGN_MS,
        "Wallet signature",
      )
      return { wallet: account, message: FREE_SCAN_MESSAGE, signature }
    } catch (err) {
      if (isRejection(err) || attempt === 1) throw err
      await new Promise((r) => setTimeout(r, 400))
    }
  }
  throw new Error("Could not sign the free-verification message")
}
