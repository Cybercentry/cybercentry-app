import { appConfig } from "../../../app.config"

/**
 * uOS App Store manifest — https://docs.uos.agency/developers/publish
 *
 * The Dev Portal fetches this from the app's own domain (the trust boundary),
 * validates it, and lists the app. Republishing updates the catalogue entry
 * without changing the app id, so the domain below is effectively permanent.
 *
 * Their fetcher gives up after 5 seconds and caps the body at 512 KB, and the
 * URL must answer directly with no redirects — hence a route handler rather
 * than anything that could 30x.
 */

/**
 * MUST match the wallet used to sign in the uOS Dev Portal, or publishing is
 * rejected. This is the deployer — the same wallet the Base App listing and the
 * notification tests use. Change it here if you sign with a different one.
 */
const AUTHOR_WALLET = "0xcBF336181e219E7900C1dE539f85dECC1509e3a0"

/**
 * Only what the app genuinely uses, from the seven uOS defines. Users are shown
 * this list before installing, so an unnecessary entry is a real cost.
 *
 *   wallet:request — connect a wallet, and send the USDC payment for a scan.
 *   wallet:sign    — the free first scan signs a SIWE message (no transaction).
 *
 * Deliberately absent: filesystem:read / filesystem:write (touches no files),
 * agents:call, storage:ipfs, and network:fetch — the app only calls its own
 * origin, which is ordinary same-origin behaviour rather than a uOS capability.
 */
const PERMISSIONS = ["wallet:request", "wallet:sign"]

const manifest = {
  name: "Cybercentry Base Token Verification",
  slug: "cybercentry-base-token-verification",
  description: appConfig.description,
  icon: `${appConfig.url}/icon-1024.png`,
  category: "Apps",
  tags: ["security", "base", "b20", "honeypot", "tokenized-stocks", "defi"],
  screenshots: [
    `${appConfig.url}/basedev-screenshot-1-1284x2778.png`,
    `${appConfig.url}/basedev-screenshot-2-1284x2778.png`,
    `${appConfig.url}/basedev-screenshot-3-1284x2778.png`,
  ],
  entry: {
    type: "iframe",
    // Must be the same host as this manifest.
    url: `${appConfig.url}/`,
  },
  permissions: PERMISSIONS,
  author: { wallet: AUTHOR_WALLET },
  // No `price`: installing is free. A scan costs 1 USDC, taken in-app.
  // No `version`: package.json still reads 0.1.0, and a store listing showing
  // that would misrepresent a deployed app. Add one when it means something.
}

// Readable cross-origin so a validator or the Dev Portal can fetch it from the
// browser, and cached briefly so a republish is not served a stale manifest.
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
}

export async function GET() {
  return new Response(JSON.stringify(manifest), { headers })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers })
}
