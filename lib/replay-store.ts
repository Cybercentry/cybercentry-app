// Durable replay guard for Base Pay payment ids, backed by Postgres
// (DATABASE_URL). Stops one payment being re-used for many scans. Server-only —
// imported by app/api/verify/route.ts (Node runtime).
import postgres from "postgres"

// Fast in-instance cache; also the fallback whenever the DB is unavailable.
const mem = new Set<string>()

let sql: ReturnType<typeof postgres> | null = null
let tableReady = false
// Circuit breaker: once the DB errors, skip it for this long so we don't pay the
// connect timeout on every request while it's down. It reads ECONNREFUSED-fast.
let dbDownUntil = 0
const BREAKER_MS = 60_000

function getSql() {
  if (Date.now() < dbDownUntil) return null
  const url = process.env.DATABASE_URL
  if (!url) return null
  if (!sql) {
    // Railway's internal host needs no TLS; the public proxy host does.
    const ssl = /railway\.internal/.test(url) ? undefined : ("require" as const)
    sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 5, ssl })
  }
  return sql
}

function tripBreaker(err: unknown) {
  console.warn("[replay] DB unavailable, using in-memory guard:", err instanceof Error ? err.message : err)
  dbDownUntil = Date.now() + BREAKER_MS
  tableReady = false
  const old = sql
  sql = null
  old?.end({ timeout: 1 }).catch(() => {})
}

/**
 * Atomically claim a payment id. Returns true on first use (proceed), false if it
 * has already been used (replay — reject).
 *
 * Durable via Postgres; on any DB error it trips a 60s circuit breaker and falls
 * back to the in-memory set, so a DB outage neither blocks a paid scan nor adds
 * connect-timeout latency to every request.
 */
export async function claimPayment(id: string): Promise<boolean> {
  if (mem.has(id)) return false
  const db = getSql()
  if (!db) {
    mem.add(id)
    return true
  }
  try {
    if (!tableReady) {
      await db`
        CREATE TABLE IF NOT EXISTS used_payments (
          id text PRIMARY KEY,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `
      tableReady = true
    }
    const rows = await db`
      INSERT INTO used_payments (id) VALUES (${id})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `
    mem.add(id)
    return rows.length > 0
  } catch (err) {
    tripBreaker(err)
    mem.add(id)
    return true
  }
}
