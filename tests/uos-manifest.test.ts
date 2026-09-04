import { describe, expect, it } from "vitest"
import { GET } from "@/app/.well-known/uos-app.json/route"

// Limits taken from https://docs.uos.agency/developers/manifest
const VALID_PERMISSIONS = new Set([
  "wallet:request",
  "wallet:sign",
  "filesystem:read",
  "filesystem:write",
  "network:fetch",
  "agents:call",
  "storage:ipfs",
])

async function manifest() {
  const res = await GET()
  return { res, body: (await res.json()) as Record<string, any> }
}

describe("uOS manifest", () => {
  it("is served as JSON, directly", async () => {
    const { res } = await manifest()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/json")
  })

  it("stays far inside the 512 KB fetch cap", async () => {
    const { body } = await manifest()
    expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThan(512 * 1024)
  })

  it("carries every required field", async () => {
    const { body } = await manifest()
    expect(typeof body.name).toBe("string")
    expect(body.entry.type).toBe("iframe")
    expect(typeof body.entry.url).toBe("string")
    expect(body.author.wallet).toMatch(/^0x[a-fA-F0-9]{40}$/)
  })

  // "Public http: or https: URL on the same host as the manifest."
  it("points entry.url at the same host as the manifest", async () => {
    const { body } = await manifest()
    const entry = new URL(body.entry.url)
    expect(entry.protocol).toMatch(/^https?:$/)
    expect(entry.host).toBe(new URL("https://app.cybercentry.co.uk").host)
  })

  it("requests only permissions uOS defines", async () => {
    const { body } = await manifest()
    for (const p of body.permissions) expect(VALID_PERMISSIONS.has(p)).toBe(true)
  })

  // Users see this list before installing; asking for more than we use is a cost.
  it("asks for nothing beyond wallet access", async () => {
    const { body } = await manifest()
    expect([...body.permissions].sort()).toEqual(["wallet:request", "wallet:sign"])
  })

  it("respects the documented field limits", async () => {
    const { body } = await manifest()
    expect(body.name.length).toBeLessThanOrEqual(255)
    expect(body.slug.length).toBeLessThanOrEqual(64)
    expect(body.description.length).toBeLessThanOrEqual(4000)
    expect(body.icon.length).toBeLessThanOrEqual(2048)
    expect(body.category.length).toBeLessThanOrEqual(64)
    expect(body.tags.length).toBeLessThanOrEqual(16)
    for (const t of body.tags) expect(t.length).toBeLessThanOrEqual(32)
    expect(body.screenshots.length).toBeLessThanOrEqual(12)
    for (const s of body.screenshots) expect(s.length).toBeLessThanOrEqual(2048)
  })

  it("serves every image over https", async () => {
    const { body } = await manifest()
    for (const u of [body.icon, ...body.screenshots]) expect(u.startsWith("https://")).toBe(true)
  })
})
