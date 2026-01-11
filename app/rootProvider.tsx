"use client"
import { type ReactNode, useEffect, useState } from "react"
import { base } from "wagmi/chains"
import { OnchainKitProvider } from "@coinbase/onchainkit"
import "@coinbase/onchainkit/styles.css"

export function RootProvider({ children }: { children: ReactNode }) {
  const [isMiniKitEnvironment, setIsMiniKitEnvironment] = useState(false)

  useEffect(() => {
    const checkMiniKit = async () => {
      if (typeof window !== "undefined") {
        // MiniKit is available when running inside Coinbase wallet
        const hasMiniKit = !!(window as any).MiniKit || !!(window as any).coinbaseWalletExtension
        setIsMiniKitEnvironment(hasMiniKit)

        if (hasMiniKit) {
          try {
            const { sdk } = await import("@farcaster/frame-sdk")
            await sdk.actions.ready()
          } catch (e) {
            // Fallback for older MiniKit versions
            console.log("[v0] MiniKit ready call failed, trying OnchainKit")
          }
        }
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
