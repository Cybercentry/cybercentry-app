import type React from "react"
import type { Metadata } from "next"
import { Inter, Source_Code_Pro } from "next/font/google"
import { RootProvider } from "./rootProvider"
import { LiveChat } from "./livechat-widget"
import "./globals.css"

const minikitConfig = {
  miniapp: {
    version: "1",
    name: "Cybercentry One",
    description:
      "Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.",
    heroImageUrl: "https://cybercentry-one-mini-app.vercel.app/blue-hero.png",
  },
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `Join the ${minikitConfig.miniapp.name} Waitlist`,
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  }
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
    <RootProvider>
      <html lang="en">
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          {children}
          <LiveChat />
        </body>
      </html>
    </RootProvider>
  )
}
