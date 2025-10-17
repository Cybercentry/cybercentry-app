import type React from "react"
import type { Metadata } from "next"
import { Karla, Source_Code_Pro } from "next/font/google"
import "./globals.css"

export const metadata: Metadata = {
  title: "Cybercentry One",
  description: "Smarter, simpler, and more accessible cyber security awaits.",
}

const karla = Karla({
  variable: "--font-karla",
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
      <body className={`${karla.variable} ${sourceCodePro.variable}`}>{children}</body>
    </html>
  )
}

