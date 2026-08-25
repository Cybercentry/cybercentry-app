"use client"
// Wagmi config for Base wallet connection + payments.
//
// - `baseAccount` connects via the Base Account smart wallet (in-app + web popup);
//   `injected` picks up the wallet the Base App's in-app browser injects, plus
//   browser extensions. This is what makes a payment actually prompt — the old
//   "grab window.ethereum directly" path never connected, so nothing happened.
// - Builder Code attribution: inside the Base App, Base auto-appends the code.
//   For web, we pass the ERC-8021 suffix per-transaction (BUILDER_DATA_SUFFIX);
//   config-level dataSuffix is wagmi v3+ only.
import { http, createConfig } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { baseAccount, injected } from "wagmi/connectors"
import { Attribution } from "ox/erc8021"

const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE || "bc_f99p1h3s"

/** ERC-8021 attribution suffix for the Builder Code (0x62635f…). */
export const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] })

export const config = createConfig({
  chains: [base, baseSepolia],
  // preference: "smartWalletOnly" forces the keys.coinbase.com passkey Smart
  // Wallet and does NOT defer to the Coinbase Wallet browser extension — whose
  // popup hangs on an infinite spinner in a normal Chrome tab. The Smart Wallet
  // path is the one that already works (incl. incognito) and is paymaster-eligible.
  connectors: [injected(), baseAccount({ appName: "Cybercentry", preference: { options: "smartWalletOnly" } })],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}
