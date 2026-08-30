import type { MetadataRoute } from "next"
import { appConfig } from "../app.config"

/**
 * Web app manifest: the installed name and icon when someone adds the verifier
 * to a home screen. Base App takes its own listing from base.dev, so this is for
 * ordinary browsers.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cybercentry Base Token Verification",
    short_name: "Cybercentry",
    description: appConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fcfcfc",
    theme_color: "#fcfcfc",
    icons: [
      { src: "/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/icon-1024-maskable.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
