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

// ── Per-wallet burst cap ─────────────────────────────────────────────────────
// A short fixed window, not a spend cap. Payment already limits how much a
// caller can do in total, so a daily ceiling would mostly inconvenience paying
// customers; what the upstream service actually needs protecting from is a
// fast burst. CBTV bounds its own concurrency (2 sync / 4 background / 4
// quote-asset) and refuses beyond it with 503, so without a cap here a single
// script can fill those pools and every other caller collects 503s.
//
// Deliberately set BELOW the upstream capacity, so this is the binding
// constraint. Otherwise callers hit CBTV's 503 before this 429 and the error
// stops being attributable — a partner cannot tell "I went too fast" from "the
// service is busy", and neither can we from the logs.
const BURST_LIMIT = Number(process.env.VERIFY_BURST_LIMIT ?? 10)
const BURST_WINDOW_S = Number(process.env.VERIFY_BURST_WINDOW_S ?? 60)

let burstTableReady = false
// walletWindowKey → count. In-instance fast path and DB-outage fallback.
const burstMem = new Map<string, number>()

export type BurstVerdict = {
  allowed: boolean
  limit: number
  remaining: number
  /** Seconds until the current window rolls over. */
  resetIn: number
}

/**
 * Count one request against a wallet's burst allowance.
 *
 * Call this BEFORE consuming a payment or a free scan: a refused request must
 * not burn an entitlement the caller then cannot use. On 429 the caller can
 * retry the same paymentId once the window rolls over.
 *
 * Fails OPEN. A rate limiter is a protection mechanism, not a security
 * boundary, and refusing paid traffic because Postgres hiccuped would be worse
 * than briefly allowing a burst — so a DB error trips the shared breaker and
 * falls back to per-instance counting, matching how the rest of this file
 * degrades. Never throws.
 */
export async function countRequest(wallet: string): Promise<BurstVerdict> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - (now % BURST_WINDOW_S)
  const resetIn = windowStart + BURST_WINDOW_S - now
  const key = `${wallet.toLowerCase()}:${windowStart}`

  const verdict = (count: number): BurstVerdict => ({
    allowed: count <= BURST_LIMIT,
    limit: BURST_LIMIT,
    remaining: Math.max(0, BURST_LIMIT - count),
    resetIn,
  })

  const bumpMem = () => {
    const next = (burstMem.get(key) ?? 0) + 1
    burstMem.set(key, next)
    // The key embeds the window, so old entries are dead weight rather than
    // wrong answers. Clear them out whenever the map gets untidy.
    if (burstMem.size > 10_000) {
      for (const k of burstMem.keys()) {
        if (!k.endsWith(`:${windowStart}`)) burstMem.delete(k)
      }
    }
    return next
  }

  const db = getSql()
  if (!db) return verdict(bumpMem())

  try {
    if (!burstTableReady) {
      await db`
        CREATE TABLE IF NOT EXISTS verify_burst (
          wallet text NOT NULL,
          window_start bigint NOT NULL,
          count integer NOT NULL DEFAULT 0,
          PRIMARY KEY (wallet, window_start)
        )
      `
      burstTableReady = true
    }
    // One atomic statement, so concurrent replicas cannot read-then-write past
    // the limit. RETURNING gives the post-increment count.
    const rows = await db`
      INSERT INTO verify_burst (wallet, window_start, count)
      VALUES (${wallet.toLowerCase()}, ${windowStart}, 1)
      ON CONFLICT (wallet, window_start)
      DO UPDATE SET count = verify_burst.count + 1
      RETURNING count
    `
    // Opportunistic cleanup: two windows back is already unreachable.
    if (Math.random() < 0.01) {
      void db`DELETE FROM verify_burst WHERE window_start < ${windowStart - BURST_WINDOW_S * 2}`
        .catch(() => {})
    }
    return verdict(Number(rows[0]?.count ?? 1))
  } catch (err) {
    tripBreaker(err)
    return verdict(bumpMem())
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
