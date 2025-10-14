// app/.well-known/farcaster.json/route.ts
import { minikitConfig } from "../../../minikit.config";

// Remove withValidManifest import completely
export async function GET() {
  return Response.json(minikitConfig);
}
