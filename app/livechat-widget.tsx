"use client"

import { LiveChatWidget, useWidgetState } from "@livechat/widget-react"
import { useState, useCallback } from "react"

function CustomChatButton() {
  const widgetState = useWidgetState()
  const [isHovered, setIsHovered] = useState(false)

  const openChat = () => {
    // @ts-ignore - LiveChat global API
    if (window.LiveChatWidget) {
      // @ts-ignore
      window.LiveChatWidget.call("maximize")
    }
  }

  if (widgetState?.visibility === "maximized") {
    return null
  }

  return (
    <button
      onClick={openChat}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "transparent",
        border: isHovered ? "2px solid rgba(0, 212, 255, 0.6)" : "2px solid rgba(0, 212, 255, 0.3)",
        boxShadow: isHovered ? "0 0 30px rgba(0, 212, 255, 0.4)" : "0 0 20px rgba(0, 212, 255, 0.2)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
        zIndex: 9999,
      }}
      aria-label="Open live chat"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? "#00d4ff" : "rgba(0, 212, 255, 0.7)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "stroke 0.3s ease" }}
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}

export function LiveChat() {
  const handleVisibilityChanged = useCallback((data: { visibility: "maximized" | "minimized" | "hidden" }) => {
    if (data.visibility === "minimized") {
      // When user closes the chat, it goes to "minimized" state which shows default button
      // Force it back to "hidden" so only our custom button shows
      // @ts-ignore
      if (window.LiveChatWidget) {
        // @ts-ignore
        window.LiveChatWidget.call("hide")
      }
    }
  }, [])

  return (
    <>
      <LiveChatWidget license="17134260" visibility="hidden" onVisibilityChanged={handleVisibilityChanged} />
      <CustomChatButton />
    </>
  )
}
