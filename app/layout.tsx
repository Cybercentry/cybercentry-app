import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { minikitConfig } from "../minikit.config"
import "./globals.css"

/** Base app domain-ownership verification. Renders into <head> on every page. */
const BASE_APP_ID = "69f84bd5879b4ae3fa1c713f"

export async function generateMetadata(): Promise<Metadata> {
  const { miniapp } = minikitConfig

  return {
    title: miniapp.name,
    description: miniapp.description,
    other: {
      "base:app_id": BASE_APP_ID,
      "fc:frame": JSON.stringify({
        version: miniapp.version,
        imageUrl: miniapp.heroImageUrl,
        button: {
          title: miniapp.tagline,
          action: {
            name: `Launch ${miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
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
