import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { minikitConfig } from "../minikit.config"
import "./globals.css"

/** Base app domain-ownership verification. Renders into <head> on every page. */
const BASE_APP_ID = "69f84bd5879b4ae3fa1c713f"

export async function generateMetadata(): Promise<Metadata> {
  const { miniapp } = minikitConfig

  // Full launch action so the card is unambiguous to every Base/Farcaster
  // parser: explicit url, plus splash so the handoff matches the app.
  const embed = {
    version: miniapp.version,
    imageUrl: miniapp.heroImageUrl,
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
    title: miniapp.name,
    description: miniapp.description,
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
