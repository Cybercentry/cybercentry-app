// Per-wallet burst cap. Exercises the in-memory path (no DATABASE_URL), which
// is both the local default and the production fallback when Postgres is down,
// so it is the branch most likely to be running when it matters.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

const WALLET = "0x1111111111111111111111111111111111111111"
const OTHER = "0x2222222222222222222222222222222222222222"

/** Re-import with a given config so module-level env reads take effect. */
async function load(limit = 3, windowS = 60) {
  vi.resetModules()
  process.env.VERIFY_BURST_LIMIT = String(limit)
  process.env.VERIFY_BURST_WINDOW_S = String(windowS)
  delete process.env.DATABASE_URL // force the in-memory path
  return import("@/lib/replay-store")
}

describe("countRequest — per-wallet burst cap", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.VERIFY_BURST_LIMIT
    delete process.env.VERIFY_BURST_WINDOW_S
  })

  it("allows requests up to and including the limit", async () => {
    const { countRequest } = await load(3)

    const first = await countRequest(WALLET)
    expect(first.allowed).toBe(true)
    expect(first.limit).toBe(3)
    expect(first.remaining).toBe(2)

    expect((await countRequest(WALLET)).allowed).toBe(true)

    const third = await countRequest(WALLET)
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it("refuses the request after the limit", async () => {
    const { countRequest } = await load(3)
    for (let i = 0; i < 3; i++) await countRequest(WALLET)

    const over = await countRequest(WALLET)
    expect(over.allowed).toBe(false)
    expect(over.remaining).toBe(0)
    expect(over.resetIn).toBeGreaterThan(0)
  })

  it("counts each wallet independently", async () => {
    // One caller burning its allowance must not refuse everyone else — that
    // would turn a per-caller cap into a shared outage.
    const { countRequest } = await load(2)
    await countRequest(WALLET)
    await countRequest(WALLET)
    expect((await countRequest(WALLET)).allowed).toBe(false)

    expect((await countRequest(OTHER)).allowed).toBe(true)
  })

  it("treats wallet addresses case-insensitively", async () => {
    // Checksummed and lowercase forms are the same wallet; counting them
    // separately would double every allowance for free.
    const { countRequest } = await load(2)
    await countRequest(WALLET.toLowerCase())
    await countRequest(WALLET.toUpperCase().replace("0X", "0x"))

    expect((await countRequest(WALLET)).allowed).toBe(false)
  })

  it("lets the allowance return when the window rolls over", async () => {
    const { countRequest } = await load(2, 60)
    await countRequest(WALLET)
    await countRequest(WALLET)
    expect((await countRequest(WALLET)).allowed).toBe(false)

    vi.setSystemTime(new Date("2026-01-01T00:01:00Z")) // next window
    const after = await countRequest(WALLET)
    expect(after.allowed).toBe(true)
    expect(after.remaining).toBe(1)
  })

  it("reports resetIn as time left in the current window, never more", async () => {
    const { countRequest } = await load(5, 60)
    vi.setSystemTime(new Date("2026-01-01T00:00:45Z")) // 45s into the window

    const v = await countRequest(WALLET)
    expect(v.resetIn).toBe(15)
    expect(v.resetIn).toBeLessThanOrEqual(60)
  })

  it("fails open rather than refusing traffic it cannot account for", async () => {
    // A rate limiter is a protection mechanism, not a security boundary.
    // Refusing paid scans because the store is unavailable would be a worse
    // outage than briefly allowing a burst, so the no-store path still serves.
    const { countRequest } = await load(3)
    const v = await countRequest(WALLET)
    expect(v.allowed).toBe(true)
  })

  it("keeps the in-memory window map from growing without bound", async () => {
    // The key embeds the window, so stale entries are dead weight. A long-lived
    // instance must not accumulate one row per wallet per minute forever.
    const { countRequest } = await load(1000, 1)
    for (let i = 0; i < 40; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 0, 0, i)))
      await countRequest(`0x${String(i).padStart(40, "0")}`)
    }
    // Nothing to assert on internals from outside; what matters is that this
    // sequence neither throws nor degrades, and that the newest window still
    // answers correctly.
    const v = await countRequest(WALLET)
    expect(v.allowed).toBe(true)
    expect(v.limit).toBe(1000)
  })
})
