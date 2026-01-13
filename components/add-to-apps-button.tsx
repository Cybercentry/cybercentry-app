"use client"
import { useState, useEffect } from "react"

interface AddToAppsButtonProps {
  buttonClassName?: string
  descriptionClassName?: string
}

export function AddToAppsButton({ buttonClassName, descriptionClassName }: AddToAppsButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

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

  const handleAddToApps = async () => {
    setStatus("loading")
    setErrorMessage("")
    try {
      const { sdk } = await import("@farcaster/frame-sdk")
      await sdk.actions.addFrame()
      setStatus("success")
    } catch (error) {
      console.error("Error adding app:", error)
      setStatus("error")
      setErrorMessage("This feature is coming soon for Base app. Try in Warpcast!")
    }
  }

  return (
    <>
      <button
        onClick={handleAddToApps}
        className={buttonClassName}
        disabled={status === "loading" || status === "success"}
      >
        {status === "loading" ? "ADDING..." : status === "success" ? "ADDED!" : "ADD TO MY APPS"}
      </button>
      <p className={descriptionClassName}>
        {status === "error"
          ? errorMessage
          : status === "success"
            ? "You'll receive updates!"
            : "Add to My Apps for updates!"}
      </p>
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
