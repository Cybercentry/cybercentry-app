"use client"
import { useState, useEffect } from "react"

interface AddToAppsButtonProps {
  buttonClassName?: string
  descriptionClassName?: string
}

export function AddToAppsButton({ buttonClassName, descriptionClassName }: AddToAppsButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)

  useEffect(() => {
    // Check if we're in a MiniKit/Farcaster context by looking for sdk
    const checkMiniKit = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk")
        if (sdk && sdk.actions) {
          setIsAvailable(true)
        }
      } catch {
        setIsAvailable(false)
      }
    }
    checkMiniKit()
  }, [])

  if (!isAvailable) return null

  const handleAddToApps = async () => {
    try {
      const { sdk } = await import("@farcaster/frame-sdk")
      await sdk.actions.addFrame()
    } catch (error) {
      console.error("Error adding app:", error)
    }
  }

  return (
    <>
      <button onClick={handleAddToApps} className={buttonClassName}>
        ADD TO MY APPS
      </button>
      <p className={descriptionClassName}>Add to My Apps for updates!</p>
    </>
  )
}

interface ShareButtonProps {
  buttonClassName?: string
  text?: string
  embedUrl?: string
}

export function ShareButton({ buttonClassName, text, embedUrl }: ShareButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)

  useEffect(() => {
    const checkMiniKit = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk")
        if (sdk && sdk.actions) {
          setIsAvailable(true)
        }
      } catch {
        setIsAvailable(false)
      }
    }
    checkMiniKit()
  }, [])

  if (!isAvailable) return null

  const handleShare = async () => {
    try {
      const { sdk } = await import("@farcaster/frame-sdk")
      await sdk.actions.openUrl(
        `https://warpcast.com/~/compose?text=${encodeURIComponent(text || "Check this out!")}&embeds[]=${encodeURIComponent(embedUrl || "")}`,
      )
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  return (
    <button onClick={handleShare} className={buttonClassName}>
      SHARE
    </button>
  )
}
