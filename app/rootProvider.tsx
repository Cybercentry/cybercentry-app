"use client"
import { type ReactNode, useEffect, useState } from "react"
import { base } from "wagmi/chains"
import { OnchainKitProvider } from "@coinbase/onchainkit"
import "@coinbase/onchainkit/styles.css"

export function RootProvider({ children }: { children: ReactNode }) {
  const [isMiniKitEnvironment, setIsMiniKitEnvironment] = useState(false)

  useEffect(() => {
    const checkMiniKit = () => {
      if (typeof window !== "undefined") {
        // MiniKit is available when running inside Coinbase wallet
        const hasMiniKit = !!(window as any).MiniKit || !!(window as any).coinbaseWalletExtension
        setIsMiniKitEnvironment(hasMiniKit)
      }
    }
    checkMiniKit()
  }, [])

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: isMiniKitEnvironment,
        autoConnect: isMiniKitEnvironment,
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  )
}
