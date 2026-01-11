"use client"

import { useState, useEffect } from "react"
import { useComposeCast } from "@coinbase/onchainkit/minikit"
import styles from "./page.module.css"

const minikitConfig = {
  miniapp: {
    name: "Cybercentry One",
  },
}

export default function Success() {
  const { composeCastAsync } = useComposeCast()
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [mouseVelocity, setMouseVelocity] = useState({ x: 0, y: 0 })
  const prevMousePos = { x: 0.5, y: 0.5 }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight

      const velocityX = x - prevMousePos.x
      const velocityY = y - prevMousePos.y
      setMouseVelocity({ x: velocityX * 10, y: velocityY * 10 })
      prevMousePos.x = x
      prevMousePos.y = y

      setMousePos({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const handleShare = async () => {
    try {
      const text = `Yay! I just signed up for ${minikitConfig.miniapp.name.toUpperCase()}! `

      const result = await composeCastAsync({
        text: text,
        embeds: [process.env.NEXT_PUBLIC_URL || ""],
      })

      if (result?.cast) {
        console.log("Cast created successfully:", result.cast.hash)
      } else {
        console.log("User cancelled the cast")
      }
    } catch (error) {
      console.error("Error sharing cast:", error)
    }
  }

  return (
    <div className={styles.container}>
      <svg className={styles.heroBackground} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
          </linearGradient>
          <linearGradient id="lineGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="50%" stopColor="rgba(96, 165, 250, 0.2)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="particleGradient">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.8)" />
            <stop offset="100%" stopColor="rgba(13, 43, 107, 0)" />
          </radialGradient>
          <radialGradient id="cursorGlow">
            <stop offset="0%" stopColor="rgba(13, 43, 107, 0.4)" />
            <stop offset="70%" stopColor="rgba(13, 43, 107, 0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {[...Array(12)].map((_, i) => {
          const baseY = 50 + i * 70
          const offsetX = (mousePos.x - 0.5) * 250 * (i % 2 === 0 ? 1 : -1) + mouseVelocity.x * 20
          const offsetY = (mousePos.y - 0.5) * 120 + mouseVelocity.y * 15

          return (
            <path
              key={i}
              d={`M 0 ${baseY + offsetY} Q ${300 + offsetX} ${baseY - 80 + offsetY}, ${600 + offsetX * 0.5} ${baseY + offsetY} T 1200 ${baseY + offsetY}`}
              stroke={i % 3 === 0 ? "url(#lineGradient2)" : "url(#lineGradient)"}
              strokeWidth={i % 2 === 0 ? "2.5" : "1.5"}
              fill="none"
              opacity={0.4 - i * 0.025}
              filter="url(#glow)"
            />
          )
        })}

        {[...Array(50)].map((_, i) => {
          const baseX = (i * 137.5) % 1200
          const baseY = (i * 73) % 800
          const distX = Math.abs(mousePos.x * 1200 - baseX)
          const distY = Math.abs(mousePos.y * 800 - baseY)
          const dist = Math.sqrt(distX * distX + distY * distY)
          const scale = Math.max(0.3, Math.min(2, 1.5 - dist / 400))

          const angle = Math.atan2(baseY - mousePos.y * 800, baseX - mousePos.x * 1200)
          const repulsion = Math.max(0, 150 - dist) / 150
          const moveX = Math.cos(angle) * repulsion * 80
          const moveY = Math.sin(angle) * repulsion * 80

          return (
            <circle
              key={`particle-${i}`}
              cx={baseX + moveX + mouseVelocity.x * 5}
              cy={baseY + moveY + mouseVelocity.y * 5}
              r={2.5 * scale}
              fill="url(#particleGradient)"
              filter="url(#glow)"
              opacity={0.6 + scale * 0.4}
            />
          )
        })}

        {[...Array(50)].map((_, i) => {
          const x1 = (i * 137.5) % 1200
          const y1 = (i * 73) % 800
          const x2 = ((i + 7) * 137.5) % 1200
          const y2 = ((i + 7) * 73) % 800
          const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

          if (dist < 200) {
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const distToMouse = Math.sqrt((midX - mousePos.x * 1200) ** 2 + (midY - mousePos.y * 800) ** 2)
            const opacity = Math.max(0, 0.3 - distToMouse / 800)

            return (
              <line
                key={`connection-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(96, 165, 250, 0.3)"
                strokeWidth="1"
                opacity={opacity}
              />
            )
          }
          return null
        })}

        <circle
          cx={mousePos.x * 1200}
          cy={mousePos.y * 800}
          r="150"
          fill="url(#cursorGlow)"
          filter="url(#glow)"
          opacity="0.8"
        />
      </svg>

      <button className={styles.closeButton} type="button">
        ✕
      </button>

      <div className={styles.content}>
        <div className={styles.successMessage}>
          <div className={styles.checkmark}>
            <svg className={styles.checkmarkSvg} viewBox="0 0 52 52">
              <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none" />
              <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>

          <h1 className={styles.title}>Welcome to the {minikitConfig.miniapp.name.toUpperCase()}!</h1>

          <p className={styles.subtitle}>
            We'll be in touch.
            <br />
            Get ready to experience the future of Web3 security.
          </p>

          <button onClick={handleShare} className={styles.shareButton}>
            SHARE
          </button>
        </div>
      </div>
    </div>
  )
}
