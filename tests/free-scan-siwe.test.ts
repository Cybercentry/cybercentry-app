import { describe, expect, it } from "vitest"
import { createSiweMessage, generateSiweNonce } from "viem/siwe"
import { siweFieldsOk, APP_HOST, APP_ORIGIN } from "@/lib/free-scan-siwe"
import { FREE_SCAN_STATEMENT, FREE_SCAN_MAX_AGE_MS } from "@/lib/payments"

const WALLET = "0xcBF336181e219E7900C1dE539f85dECC1509e3a0"
const OTHER = "0xDBB90B3b3Ada7F69F63caddaCfc0EfBBC0FC9FDe"

// Built with viem's own encoder, so the tests exercise the real wire format
// rather than a hand-rolled approximation of it.
const msg = (over: Parameters<typeof createSiweMessage>[0] extends infer T ? Partial<T> : never = {}) =>
  createSiweMessage({
    address: WALLET,
    chainId: 8453,
    domain: APP_HOST,
    issuedAt: new Date(),
    nonce: generateSiweNonce(),
    statement: FREE_SCAN_STATEMENT,
    uri: APP_ORIGIN,
    version: "1",
    ...over,
  } as Parameters<typeof createSiweMessage>[0])

describe("siweFieldsOk", () => {
  it("accepts a freshly issued message on base", () => {
    expect(siweFieldsOk(msg(), WALLET, "base")).toBe(true)
  })

  it("accepts base-sepolia when the chain id matches", () => {
    expect(siweFieldsOk(msg({ chainId: 84532 }), WALLET, "base-sepolia")).toBe(true)
  })

  it("is case-insensitive about the wallet address", () => {
    expect(siweFieldsOk(msg(), WALLET.toLowerCase(), "base")).toBe(true)
  })

  // The whole point of the change: a signature harvested by another site.
  it("rejects a message issued for a different domain", () => {
    expect(siweFieldsOk(msg({ domain: "evil.example" }), WALLET, "base")).toBe(false)
  })

  it("rejects a message whose uri is not this app", () => {
    expect(siweFieldsOk(msg({ uri: "https://evil.example" }), WALLET, "base")).toBe(false)
  })

  it("rejects a signature bound to a different wallet", () => {
    expect(siweFieldsOk(msg({ address: OTHER }), WALLET, "base")).toBe(false)
  })

  it("rejects a chain the caller did not request", () => {
    expect(siweFieldsOk(msg(), WALLET, "base-sepolia")).toBe(false)
  })

  it("rejects an unknown chain name", () => {
    expect(siweFieldsOk(msg(), WALLET, "ethereum")).toBe(false)
  })

  it("rejects a different statement", () => {
    expect(siweFieldsOk(msg({ statement: "Sign in to Evil" }), WALLET, "base")).toBe(false)
  })

  // Expiry: a harvested signature must go stale.
  it("rejects a message older than the max age", () => {
    const old = new Date(Date.now() - FREE_SCAN_MAX_AGE_MS - 10_000)
    expect(siweFieldsOk(msg({ issuedAt: old }), WALLET, "base")).toBe(false)
  })

  it("accepts a message just inside the max age", () => {
    const recent = new Date(Date.now() - FREE_SCAN_MAX_AGE_MS + 30_000)
    expect(siweFieldsOk(msg({ issuedAt: recent }), WALLET, "base")).toBe(true)
  })

  it("tolerates a signer clock slightly ahead of the server", () => {
    expect(siweFieldsOk(msg({ issuedAt: new Date(Date.now() + 30_000) }), WALLET, "base")).toBe(true)
  })

  it("rejects a signer clock implausibly far ahead", () => {
    expect(siweFieldsOk(msg({ issuedAt: new Date(Date.now() + 600_000) }), WALLET, "base")).toBe(false)
  })

  it("honours an expirationTime the signer set", () => {
    expect(siweFieldsOk(msg({ expirationTime: new Date(Date.now() - 1000) }), WALLET, "base")).toBe(false)
  })

  it("honours a notBefore the signer set", () => {
    expect(siweFieldsOk(msg({ notBefore: new Date(Date.now() + 600_000) }), WALLET, "base")).toBe(false)
  })

  // The pre-SIWE constant, which used to be accepted outright.
  it("rejects the bare legacy message", () => {
    expect(siweFieldsOk(FREE_SCAN_STATEMENT, WALLET, "base")).toBe(false)
  })

  it("rejects junk that is not a SIWE message at all", () => {
    expect(siweFieldsOk("not a siwe message", WALLET, "base")).toBe(false)
    expect(siweFieldsOk("", WALLET, "base")).toBe(false)
  })
})
