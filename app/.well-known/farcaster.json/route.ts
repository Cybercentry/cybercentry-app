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
  return Response.json(minikitConfig, { headers })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers })
}
