// Base App notifications via the Base Dashboard REST API. Server-only.
// Auth is the x-api-key (APP_API_KEY); Base only delivers to wallets that have
// pinned the app AND opted in, so an un-opted-in payer is simply a no-op.
//
// Delivery is Base-App-only: users who hit the app in a normal browser will
// never receive these, which is why every path here is best-effort and silent.
import type { CbtvReport } from "./cbtv"
import { reportCannotSell } from "./cbtv"

const API = "https://dashboard.base.org/api/v1/notifications"
const KEY = process.env.APP_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk"

/** Max wallet addresses accepted by /send in one request. */
const MAX_PER_SEND = 1000
/** Max users per page on /app/users. */
const MAX_PAGE = 500
/** Safety stop when paginating — the endpoints share a 20 req/min IP budget. */
const MAX_PAGES = 40

export type NotifyResult = { walletAddress: string; sent: boolean; failureReason?: string }
export type AppUser = { address: string; notificationsEnabled: boolean }
export type UserStatus = { appPinned: boolean; notificationsEnabled: boolean }

function clip(s: string, max: number) {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

/** Human-readable cause for the documented error codes, so logs say what to fix. */
function explain(status: number): string {
  if (status === 401) return "missing/invalid APP_API_KEY"
  if (status === 403) return "app_url not owned by this project, or project not whitelisted for notifications"
  if (status === 404) return "no project for this API key"
  if (status === 429) return "rate limited (20 req/min per IP, shared across notification endpoints)"
  if (status === 503) return "notification service unavailable — retryable"
  return `HTTP ${status}`
}

/** Shared fetch. Returns parsed JSON, or null on any failure (never throws). */
async function call<T>(path: string, init: RequestInit): Promise<T | null> {
  if (!KEY) return null
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-api-key": KEY, ...(init.headers ?? {}) },
    })
    if (!res.ok) {
      console.warn(`[notify] ${path} failed: ${explain(res.status)}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.warn(`[notify] ${path} error:`, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Send one notification to up to 1,000 wallets. Splits larger audiences across
 * requests. Reads the response body — a 200 can still carry per-address
 * failures ("user has not saved this app"), which the old code counted as sent.
 *
 * Identical (app_url, wallet, title, message, target_path) tuples are deduped
 * by Base for 24h and come back successful without a second push.
 */
export async function sendNotification(
  wallets: string[],
  title: string,
  message: string,
  targetPath = "/",
): Promise<NotifyResult[]> {
  const addresses = [...new Set(wallets.filter(Boolean))]
  if (!KEY || addresses.length === 0) return []
  if (targetPath && !targetPath.startsWith("/")) {
    console.warn(`[notify] target_path must start with "/" — got ${targetPath}; sending without it`)
    targetPath = "/"
  }

  const out: NotifyResult[] = []
  for (let i = 0; i < addresses.length; i += MAX_PER_SEND) {
    const batch = addresses.slice(i, i + MAX_PER_SEND)
    const body = await call<{ results?: NotifyResult[]; sentCount?: number; failedCount?: number }>("/send", {
      method: "POST",
      body: JSON.stringify({
        app_url: APP_URL,
        wallet_addresses: batch,
        title: clip(title, 30),
        message: clip(message, 200),
        target_path: clip(targetPath, 500),
      }),
    })
    if (!body) {
      out.push(...batch.map((w) => ({ walletAddress: w, sent: false, failureReason: "request failed" })))
      continue
    }
    if (body.failedCount) {
      const why = body.results?.find((r) => !r.sent)?.failureReason ?? "unknown"
      console.warn(`[notify] ${body.failedCount}/${batch.length} undelivered (first reason: ${why})`)
    }
    out.push(...(body.results ?? []))
  }
  return out
}

/**
 * Every wallet that has pinned the app, optionally filtered to those with
 * notifications on. Walks the cursor to the end. Returns null if the API is
 * unreachable — distinct from [], which means "nobody yet".
 */
export async function getOptedInUsers(notificationEnabled = true): Promise<AppUser[] | null> {
  if (!KEY) return null
  const users: AppUser[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ app_url: APP_URL, limit: String(MAX_PAGE) })
    if (notificationEnabled) qs.set("notification_enabled", "true")
    if (cursor) qs.set("cursor", cursor)
    const body = await call<{ users?: AppUser[]; nextCursor?: string }>(`/app/users?${qs}`, { method: "GET" })
    if (!body) return users.length ? users : null
    users.push(...(body.users ?? []))
    cursor = body.nextCursor
    if (!cursor) return users
  }
  console.warn(`[notify] stopped paginating at ${MAX_PAGES} pages (${users.length} users)`)
  return users
}

/**
 * Whether one wallet has pinned the app and enabled notifications — cheaper than
 * paginating /app/users when all you need is a "pin this app" CTA. Null when the
 * lookup itself failed, which is not the same as a plain false.
 */
export async function getUserStatus(wallet: string): Promise<UserStatus | null> {
  if (!KEY || !wallet) return null
  return call<UserStatus>("/app/user/status", {
    method: "POST",
    body: JSON.stringify({ app_url: APP_URL, wallet_address: wallet }),
  })
}

/** Notify the payer that their scan came back high risk. Best-effort; never throws. */
export async function notifyHighRisk(wallet: string, report: CbtvReport): Promise<void> {
  if (!KEY || !wallet) return
  const ti = report.token_info ?? {}
  const label = ti.symbol || ti.name || "this token"
  const message = reportCannotSell(report)
    ? `${label}: you can buy but you can't sell it — sell-side honeypot. Cybercentry rated it high risk.`
    : `${label} scanned high risk by Cybercentry. Open the report before you buy.`
  await sendNotification([wallet], "High risk — do not buy", message, "/")
}
