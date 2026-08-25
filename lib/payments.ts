// Base Pay configuration, read from NEXT_PUBLIC_ env so both the client (pay())
// and the server route (getPaymentStatus()) agree on amount / recipient / network.
// These are public by nature (a receiving address and a price), never secrets.
import type { Hex } from "viem"

/** Price per verification, in USDC. */
export const PAY_AMOUNT = "1.00"

/**
 * Message a wallet signs to claim its one free verification. Signing is free
 * (no gas, no funds) and proves the wallet owns the address, so the free scan
 * can't be farmed by claiming arbitrary addresses. Shared by the client (signs
 * it) and the server route (verifies it), so it must match exactly.
 */
export const FREE_SCAN_MESSAGE = "Cybercentry: unlock my one free B20 verification."

/** Treasury that receives the USDC (Base / EVM). */
export const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "") as `0x${string}`

/**
 * Testnet (Base Sepolia) unless explicitly "false". Fail-safe: an unset/typo'd
 * value stays on testnet rather than charging real USDC. Production sets "false".
 */
export const PAY_TESTNET = process.env.NEXT_PUBLIC_PAY_TESTNET !== "false"

/**
 * Optional ERC-8021 builder-code attribution suffix appended to the payment tx.
 * Blank = omit. (e.g. 0x62635f… from builder code bc_f99p1h3s.)
 */
export const DATA_SUFFIX = (process.env.NEXT_PUBLIC_BUILDER_DATA_SUFFIX || undefined) as Hex | undefined
