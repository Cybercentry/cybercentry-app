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
  const [isBaseApp, setIsBaseApp] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    const checkMiniKit = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk")
        if (sdk && sdk.actions) {
          setIsAvailable(true)
          // Check if we're in Base App by looking at the context
          const context = await sdk.context
          // Base App typically doesn't have fid (Farcaster ID)
          if (context && !context.user?.fid) {
            setIsBaseApp(true)
          }
        }
      } catch {
        setIsAvailable(false)
      }
    }
    checkMiniKit()
  }, [])

  if (!isAvailable) return null

  const handleAddToApps = async () => {
    if (isBaseApp) {
      setShowInstructions(true)
      return
    }

    setStatus("loading")
    setErrorMessage("")
    try {
      const { sdk } = await import("@farcaster/frame-sdk")
      const result = await sdk.actions.addFrame()

      if (result && (result.added === true || result.success === true || result === true)) {
        setStatus("success")
      } else if (result && (result.added === false || result.success === false)) {
        setStatus("error")
        setErrorMessage("Could not add app. Try adding to home screen instead!")
        setShowInstructions(true)
      } else {
        setStatus("success")
      }
    } catch (error) {
      console.error("Error adding app:", error)
      setStatus("error")
      setErrorMessage("Add to home screen for quick access!")
      setShowInstructions(true)
    }
  }

  const buttonText = () => {
    if (isBaseApp && !showInstructions) {
      return "GET QUICK ACCESS"
    }
    switch (status) {
      case "loading":
        return "ADDING..."
      case "success":
        return "ADDED!"
      case "error":
        return "SEE INSTRUCTIONS"
      default:
        return "ADD TO MY APPS"
    }
  }

  if (showInstructions) {
    return (
      <div style={{ textAlign: "center" }}>
        <p className={descriptionClassName} style={{ marginBottom: "12px", fontWeight: "bold" }}>
          Add to Home Screen:
        </p>
        <p className={descriptionClassName} style={{ fontSize: "14px", lineHeight: "1.6" }}>
          1. Tap the share icon (↑) in your browser
          <br />
          2. Scroll down and tap "Add to Home Screen"
          <br />
          3. Tap "Add" to confirm
        </p>
        <button
          onClick={() => setShowInstructions(false)}
          className={buttonClassName}
          style={{ marginTop: "12px", opacity: 0.8 }}
        >
          GOT IT
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleAddToApps}
        className={buttonClassName}
        disabled={status === "loading" || status === "success"}
      >
        {buttonText()}
      </button>
      <p className={descriptionClassName}>
        {status === "error"
          ? errorMessage
          : status === "success"
            ? "You'll receive updates!"
            : isBaseApp
              ? "Add to home screen for quick access!"
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
