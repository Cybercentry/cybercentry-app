// Base Pay configuration, read from NEXT_PUBLIC_ env so both the client (pay())
// and the server route (getPaymentStatus()) agree on amount / recipient / network.
// These are public by nature (a receiving address and a price), never secrets.

/** Price per verification, in USDC. */
export const PAY_AMOUNT = "1.00"

/**
 * Statement line inside the SIWE message a wallet signs to claim its one free
 * verification. Signing is free (no gas, no funds) and proves the wallet owns
 * the address, so the free scan can't be farmed by claiming arbitrary addresses.
 *
 * This is wrapped in a full SIWE message (domain, uri, chainId, issuedAt) rather
 * than signed bare: a bare constant is identical on every site and never expires,
 * so any other page could ask a visitor to sign it and spend their free scan here.
 */
export const FREE_SCAN_STATEMENT = "Cybercentry: unlock my one free B20 verification."

/** How long a signed free-scan message stays valid, from its issuedAt. */
export const FREE_SCAN_MAX_AGE_MS = 5 * 60_000

/** Treasury that receives the USDC (Base / EVM). */
export const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "") as `0x${string}`

/**
 * Testnet (Base Sepolia) unless explicitly "false". Fail-safe: an unset/typo'd
 * value stays on testnet rather than charging real USDC. Production sets "false".
 */
export const PAY_TESTNET = process.env.NEXT_PUBLIC_PAY_TESTNET !== "false"
