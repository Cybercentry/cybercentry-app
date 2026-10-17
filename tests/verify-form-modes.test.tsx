import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

// The form owns one field and two questions. This was two separate forms on the
// page — two input boxes competing for the same paste, and the page's narrative
// cut in half.
vi.mock("@/lib/pay-usdc", () => ({
  signFreeScan: vi.fn(),
  payUsdc: vi.fn(),
  isUserRejection: () => false,
}))

import { VerifyForm } from "@/app/verify-form"

describe("VerifyForm modes", () => {
  it("offers one field for both questions", () => {
    render(<VerifyForm />)
    expect(screen.getAllByRole("textbox").length).toBe(1)
    expect(screen.getByRole("button", { name: "Token" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Quote asset or basket/ })).toBeTruthy()
  })

  it("starts on the token scan", () => {
    render(<VerifyForm />)
    expect(screen.getByRole("button", { name: "Token" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByText(/B20 token contract address/)).toBeTruthy()
  })

  it("relabels the field and the checks when the mode changes", () => {
    render(<VerifyForm />)
    fireEvent.click(screen.getByRole("button", { name: /Quote asset or basket/ }))
    expect(screen.getByText(/Quote asset, basket or wrapper address/)).toBeTruthy()
    // The reassurance list has to follow the mode, or it promises the wrong thing.
    expect(screen.getByText(/What a basket actually holds/)).toBeTruthy()
    expect(screen.queryByText("Sell-side honeypots")).toBeNull()
  })

  it("rejects a malformed address in either mode", () => {
    render(<VerifyForm />)
    fireEvent.click(screen.getByRole("button", { name: /Quote asset or basket/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nope" } })
    fireEvent.submit(screen.getByRole("textbox").closest("form")!)
    expect(screen.getByText(/Enter a valid 0x/)).toBeTruthy()
  })
})
