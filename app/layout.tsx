import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { minikitConfig } from "../minikit.config"
import "./globals.css"

/** Base app domain-ownership verification. Renders into <head> on every page. */
const BASE_APP_ID = "69f84bd5879b4ae3fa1c713f"

/** Full product name. The manifest `name` is capped at 32 chars, so it carries
 *  a shortened form; the untruncated name lives in the page title and heading. */
const FULL_NAME = "Cybercentry Base Token Verification"

export async function generateMetadata(): Promise<Metadata> {
  const { miniapp } = minikitConfig

  // Full launch action so the card is unambiguous to every Base/Farcaster
  // parser: explicit url, plus splash so the handoff matches the app.
  const embed = {
    version: miniapp.version,
    // Embed image must be 3:2 per the Farcaster spec; imageUrl (embed-1200x800)
    // is 3:2, whereas heroImageUrl is 1.91:1 for the manifest hero slot.
    imageUrl: miniapp.imageUrl,
    button: {
      title: miniapp.tagline,
      action: {
        type: "launch_frame",
        name: `Launch ${miniapp.name}`,
        url: miniapp.homeUrl,
        splashImageUrl: miniapp.splashImageUrl,
        splashBackgroundColor: miniapp.splashBackgroundColor,
      },
    },
  }
  const embedJson = JSON.stringify(embed)

  return {
    title: FULL_NAME,
    description: miniapp.description,
    // Declare icons explicitly. Chrome falls back to /favicon.ico on its own, but
    // iOS in-app browsers (the Base app) only show a site icon when there's an
    // apple-touch-icon link — without it they render a generic globe.
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        { url: "/icon-light-32x32.png", type: "image/png", sizes: "32x32" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    },
    other: {
      "base:app_id": BASE_APP_ID,
      // fc:miniapp is the current tag name; fc:frame is the backwards-compat
      // alias older clients still read. Emit both so every surface sees a card.
      "fc:miniapp": embedJson,
      "fc:frame": embedJson,
    },
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  )
}
