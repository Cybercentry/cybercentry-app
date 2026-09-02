import { describe, expect, it } from "vitest"
import { isUserRejection } from "@/lib/pay-usdc"

describe("isUserRejection", () => {
  it("accepts the EIP-1193 rejection code", () => {
    expect(isUserRejection({ code: 4001, message: "User rejected the request." })).toBe(true)
  })

  it("accepts the code nested in a cause, as viem wraps it", () => {
    expect(isUserRejection({ message: "RPC error", cause: { code: 4001 } })).toBe(true)
  })

  it("accepts viem's named error", () => {
    expect(isUserRejection({ name: "UserRejectedRequestError", message: "…" })).toBe(true)
  })

  it("accepts the plain wording wallets use", () => {
    expect(isUserRejection(new Error("User rejected the request"))).toBe(true)
    expect(isUserRejection(new Error("Request was denied by the user"))).toBe(true)
  })

  // The bug: these were all reported to the user as "Payment cancelled", and
  // their real cause was discarded.
  it("does not treat a timeout abort as a rejection", () => {
    expect(isUserRejection(new Error("AbortError: The operation was canceled"))).toBe(false)
  })

  it("does not treat a cancelled bundle as a rejection", () => {
    expect(isUserRejection(new Error("Call bundle was cancelled by the wallet"))).toBe(false)
  })

  it("does not treat an rpc rejection of a malformed request as a rejection", () => {
    expect(isUserRejection(new Error("Request rejected: invalid params"))).toBe(false)
  })

  it("does not treat insufficient funds as a rejection", () => {
    expect(isUserRejection(new Error("insufficient funds for transfer"))).toBe(false)
  })

  it("is safe on non-errors", () => {
    expect(isUserRejection(null)).toBe(false)
    expect(isUserRejection("user rejected")).toBe(false)
    expect(isUserRejection(undefined)).toBe(false)
  })
})
