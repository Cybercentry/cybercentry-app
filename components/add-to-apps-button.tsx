"use client"
import { useState, useEffect } from "react"

interface AddToAppsButtonProps {
  buttonClassName?: string
  descriptionClassName?: string
}

export function AddToAppsButton({ buttonClassName, descriptionClassName }: AddToAppsButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "instructions">("idle")

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
    try {
      const { sdk } = await import("@farcaster/frame-sdk")
      const result = await sdk.actions.addFrame()

      // Check all possible success indicators
      if (result === true || result?.added === true || result?.success === true) {
        setStatus("success")
      } else {
        // Any non-success result shows instructions
        setStatus("instructions")
      }
    } catch {
      // Any error shows instructions
      setStatus("instructions")
    }
  }

  if (status === "instructions") {
    return (
      <div style={{ textAlign: "center" }}>
        <p className={descriptionClassName} style={{ marginBottom: "12px", fontWeight: "bold" }}>
          Add to Home Screen for Quick Access:
        </p>
        <p className={descriptionClassName} style={{ fontSize: "14px", lineHeight: "1.6" }}>
          1. Tap the menu (•••) or share icon
          <br />
          2. Select "Add to Home Screen"
          <br />
          3. Tap "Add" to confirm
        </p>
        <button
          onClick={() => setStatus("idle")}
          className={buttonClassName}
          style={{ marginTop: "12px", opacity: 0.8 }}
        >
          GOT IT
        </button>
      </div>
    )
  }

  if (status === "success") {
    return (
      <>
        <button className={buttonClassName} disabled style={{ opacity: 0.7 }}>
          ADDED!
        </button>
        <p className={descriptionClassName}>You&apos;ll receive updates!</p>
      </>
    )
  }

  return (
    <>
      <button onClick={handleAddToApps} className={buttonClassName} disabled={status === "loading"}>
        {status === "loading" ? "ADDING..." : "ADD TO MY APPS"}
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
