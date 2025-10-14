import { withValidManifest } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../../../minikit.config";

// Serve raw config to preserve custom properties like baseBuilder
export async function GET() {
  // For Farcaster discovery, serve the raw config to include baseBuilder
  return Response.json(minikitConfig);
}
