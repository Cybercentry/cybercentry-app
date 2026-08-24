// Durable replay guard for Base Pay payment ids, backed by Postgres
// (DATABASE_URL). Stops one payment being re-used for many scans. Server-only —
// imported by app/api/verify/route.ts (Node runtime).
import postgres from "postgres"

// Fast in-instance cache; also the fallback if the DB is briefly unavailable.
const mem = new Set<string>()

let sql: ReturnType<typeof postgres> | null = null
let ready: Promise<void> | null = null

function client() {
  if (sql) return sql
  const url = process.env.DATABASE_URL
  if (!url) return null
  // Railway Postgres over its public host needs TLS; the internal host does not.
  const ssl = /railway\.internal/.test(url) ? undefined : ("require" as const)
  sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10, ssl })
  return sql
}

async function ensureTable() {
  const db = client()
  if (!db) return
  if (!ready) {
    ready = db`
      CREATE TABLE IF NOT EXISTS used_payments (
        id text PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `.then(() => undefined)
  }
  await ready
}

/**
 * Atomically claim a payment id. Returns true if this is the first use (proceed),
 * false if it has already been used (replay — reject).
 *
 * Durable via Postgres; on a DB error it falls back to the in-memory set so a
 * transient outage can't take down a paid scan (fail-open past the DB, but
 * still guarded within this instance).
 */
export async function claimPayment(id: string): Promise<boolean> {
  if (mem.has(id)) return false
  const db = client()
  if (!db) {
    // No DATABASE_URL configured — in-memory only (single instance).
    mem.add(id)
    return true
  }
  try {
    await ensureTable()
    const rows = await db`
      INSERT INTO used_payments (id) VALUES (${id})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `
    mem.add(id)
    return rows.length > 0
  } catch (err) {
    console.warn("[replay] DB unavailable, using in-memory guard:", err)
    mem.add(id)
    return true
  }
}
