import type React from "react"
import type { Metadata } from "next"
import { Karla } from "next/font/google"
// import { Navigation } from "../components/navigation"
import "./globals.css"

const karla = Karla({ subsets: ["latin"], variable: "--font-karla" })

export const metadata: Metadata = {
  title: "Cybercentry One",
  description: "Smarter, simpler, and more accessible cyber security awaits.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${karla.variable} font-sans antialiased`}>
        {/* <Navigation /> */}
        {/* <div style={{ paddingTop: "80px" }}>{children}</div> */}
        {children}
      </body>
    </html>
  )
}

