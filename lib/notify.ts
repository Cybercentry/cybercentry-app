// Base App notifications via the Base Dashboard REST API. Server-only.
// Auth is the x-api-key (MINI_APP_API_KEY); Base only delivers to wallets that
// opted in, so an un-opted-in payer is simply a no-op.
import type { CbtvReport } from "./cbtv"
import { reportCannotSell } from "./cbtv"

const SEND_URL = "https://dashboard.base.org/api/v1/notifications/send"
const KEY = process.env.MINI_APP_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk"

function clip(s: string, max: number) {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

/** Notify the payer that their scan came back high risk. Best-effort; never throws. */
export async function notifyHighRisk(wallet: string, report: CbtvReport): Promise<void> {
  if (!KEY || !wallet) return
  const ti = report.token_info ?? {}
  const label = ti.symbol || ti.name || "this token"
  const title = "High risk — do not buy"
  const message = reportCannotSell(report)
    ? `${label}: you can buy but you can't sell it — sell-side honeypot. Cybercentry rated it high risk.`
    : `${label} scanned high risk by Cybercentry. Open the report before you buy.`
  try {
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY },
      body: JSON.stringify({
        app_url: APP_URL,
        wallet_addresses: [wallet],
        title: clip(title, 30),
        message: clip(message, 200),
        target_path: "/",
      }),
    })
    if (!res.ok) console.warn(`[notify] send failed: HTTP ${res.status}`)
  } catch (err) {
    console.warn("[notify] send error:", err instanceof Error ? err.message : err)
  }
}
