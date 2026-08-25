// Durable replay guard for Base Pay payment ids, backed by Postgres
// (DATABASE_URL). Stops one payment being re-used for many scans. Server-only —
// imported by app/api/verify/route.ts (Node runtime).
import postgres from "postgres"

// Fast in-instance cache; also the fallback whenever the DB is unavailable.
const mem = new Set<string>()
// jobId → payer wallet. In-instance fast path + fallback; the DB copy is what
// makes it work when POST and the GET poll land on different replicas.
const memPayer = new Map<string, string>()
// Wallets that have already spent their one free verification.
const freeMem = new Set<string>()

let sql: ReturnType<typeof postgres> | null = null
let tableReady = false
let payerTableReady = false
let freeTableReady = false
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
  payerTableReady = false
  freeTableReady = false
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

/**
 * Record who paid for a job so a High-risk result can notify them — even when the
 * POST and the GET poll are served by different replicas. Best-effort: always
 * kept in-memory, mirrored to Postgres when available; never throws.
 */
export async function setPayer(jobId: string, wallet: string): Promise<void> {
  memPayer.set(jobId, wallet)
  const db = getSql()
  if (!db) return
  try {
    if (!payerTableReady) {
      await db`
        CREATE TABLE IF NOT EXISTS payer_by_job (
          job_id text PRIMARY KEY,
          wallet text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `
      payerTableReady = true
    }
    await db`
      INSERT INTO payer_by_job (job_id, wallet) VALUES (${jobId}, ${wallet})
      ON CONFLICT (job_id) DO UPDATE SET wallet = ${wallet}
    `
  } catch (err) {
    tripBreaker(err)
  }
}

/**
 * Atomically claim a wallet's one free verification. Returns true the first time
 * (grant it), false if the wallet has already used its free scan (→ require
 * payment). Durable via Postgres; falls back to the in-instance set on DB error.
 */
export async function claimFreeScan(wallet: string): Promise<boolean> {
  const key = wallet.toLowerCase()
  if (freeMem.has(key)) return false
  const db = getSql()
  if (!db) {
    freeMem.add(key)
    return true
  }
  try {
    if (!freeTableReady) {
      await db`
        CREATE TABLE IF NOT EXISTS free_scans (
          wallet text PRIMARY KEY,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `
      freeTableReady = true
    }
    const rows = await db`
      INSERT INTO free_scans (wallet) VALUES (${key})
      ON CONFLICT (wallet) DO NOTHING
      RETURNING wallet
    `
    freeMem.add(key)
    return rows.length > 0
  } catch (err) {
    tripBreaker(err)
    freeMem.add(key)
    return true
  }
}

/**
 * Consume the payer for a job (returns the wallet once, then forgets it — so a
 * repeated poll can't fire a duplicate notification). Reads the durable row when
 * available, falls back to the in-instance map. Never throws.
 */
export async function takePayer(jobId: string): Promise<string | null> {
  const local = memPayer.get(jobId) ?? null
  if (local) memPayer.delete(jobId)
  const db = getSql()
  if (!db) return local
  try {
    const rows = await db`DELETE FROM payer_by_job WHERE job_id = ${jobId} RETURNING wallet`
    return (rows[0]?.wallet as string | undefined) ?? local
  } catch (err) {
    tripBreaker(err)
    return local
  }
}
