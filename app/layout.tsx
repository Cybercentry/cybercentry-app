import type React from "react"
import type { Metadata } from "next"
import { Inter, Source_Code_Pro } from "next/font/google"
import { RootProvider } from "./rootProvider"
import { LiveChat } from "./livechat-widget"
import "./globals.css"

const ROOT_URL = "https://cybercentry-one-mini-app.up.railway.app"

export const metadata: Metadata = {
  title: "Cybercentry One",
  description:
    "Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.",
  openGraph: {
    title: "Cybercentry One",
    description: "Future of Web3 Security",
    images: [`${ROOT_URL}/blue-hero.png`],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": `${ROOT_URL}/blue-hero.png`,
    "fc:frame:button:1": "Future of Web3 Security",
    "fc:frame:button:1:action": "launch_frame",
    "fc:frame:button:1:target": ROOT_URL,
  },
    generator: 'v0.app'
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <RootProvider>{children}</RootProvider>
        <LiveChat />
      </body>
    </html>
  )
}
