import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { appConfig } from "../app.config"
import "./globals.css"

/** Base app domain-ownership verification — links this domain to the base.dev
 *  project. This is what proves ownership now (the Farcaster accountAssociation
 *  manifest is retired). Renders into <head> on every page. */
const BASE_APP_ID = "69f84bd5879b4ae3fa1c713f"

// viewport-fit=cover lets content use the full screen and enables the
// env(safe-area-inset-*) values the layout relies on for the iOS notch / home
// indicator (the Base app renders inside an iOS WKWebView).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fcfcfc",
}

/** Full product name — used for the page title. The short brand name
 *  ("Cybercentry") lives in app.config.ts and the base.dev listing. */
const FULL_NAME = "Cybercentry Base Token Verification"

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(appConfig.url),
    // One canonical host. The apex redirects to the marketing site, so without
    // this a crawler reaching the app by any other route could split ranking
    // signals across near-duplicate URLs.
    alternates: { canonical: appConfig.url },
    // Explicit rather than implied: this page is meant to be indexed, and the
    // richer directives tell crawlers they may show a full snippet and preview.
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
    },
    title: FULL_NAME,
    description: appConfig.description,
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
    // Open Graph / Twitter cards give the app a rich preview when its URL is
    // shared (in the Base app feed, on X, in chats) — the Base-App equivalent of
    // the old Farcaster embed card.
    openGraph: {
      type: "website",
      url: appConfig.url,
      title: appConfig.ogTitle,
      description: appConfig.ogDescription,
      images: [{ url: appConfig.ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: appConfig.ogTitle,
      description: appConfig.ogDescription,
      images: [appConfig.ogImageUrl],
    },
    other: {
      "base:app_id": BASE_APP_ID,
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
