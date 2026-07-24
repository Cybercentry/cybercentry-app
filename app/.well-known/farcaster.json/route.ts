// app/.well-known/farcaster.json/route.ts
import { minikitConfig } from "../../../minikit.config"

// Manifest validators and the Farcaster developer tools fetch this from the
// browser, so it has to be readable cross-origin. Without these headers the
// request is blocked by CORS and surfaces as "error fetching manifest", even
// though curl and server-side fetches succeed.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
}

export async function GET() {
  const { accountAssociation, miniapp, baseBuilder } = minikitConfig

  // `frame` is the legacy key and `miniapp` the current one. The schema accepts
  // either, so both are emitted with identical content — the Base dashboard
  // reads `frame`, newer tooling reads `miniapp`.
  return Response.json({ accountAssociation, frame: miniapp, miniapp, baseBuilder }, { headers })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers })
}
