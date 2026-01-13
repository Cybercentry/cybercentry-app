"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./particle-background.module.css"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  color: string
  pulse: number
  pulseSpeed: number
  layer: number
}

interface Connection {
  from: number
  to: number
  opacity: number
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize particles with multiple layers
    const colors = [
      "rgba(0, 212, 255, 1)", // Cyan
      "rgba(13, 43, 107, 1)", // Brand blue
      "rgba(74, 144, 226, 1)", // Light blue
      "rgba(124, 58, 237, 0.8)", // Purple accent
      "rgba(255, 255, 255, 0.8)", // White
    ]

    particlesRef.current = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      size: Math.random() * 3 + 0.5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5 - 0.2, // Slight upward bias
      opacity: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      layer: Math.floor(Math.random() * 3), // 0 = back, 1 = mid, 2 = front
    }))

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)

      // Sort by layer for depth effect
      const sortedParticles = [...particlesRef.current].sort((a, b) => a.layer - b.layer)

      // Draw connections between nearby particles
      const connections: Connection[] = []
      for (let i = 0; i < sortedParticles.length; i++) {
        for (let j = i + 1; j < sortedParticles.length; j++) {
          const dx = sortedParticles[i].x - sortedParticles[j].x
          const dy = sortedParticles[i].y - sortedParticles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150 && sortedParticles[i].layer === sortedParticles[j].layer) {
            connections.push({
              from: i,
              to: j,
              opacity: (1 - dist / 150) * 0.15,
            })
          }
        }
      }

      // Draw connections
      connections.forEach((conn) => {
        const p1 = sortedParticles[conn.from]
        const p2 = sortedParticles[conn.to]

        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
        gradient.addColorStop(0, `rgba(0, 212, 255, ${conn.opacity})`)
        gradient.addColorStop(1, `rgba(13, 43, 107, ${conn.opacity})`)

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Update and draw particles
      sortedParticles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX * (particle.layer + 1) * 0.5
        particle.y += particle.speedY * (particle.layer + 1) * 0.5

        // Wrap around edges
        if (particle.x < -20) particle.x = dimensions.width + 20
        if (particle.x > dimensions.width + 20) particle.x = -20
        if (particle.y < -20) particle.y = dimensions.height + 20
        if (particle.y > dimensions.height + 20) particle.y = -20

        // Update pulse
        particle.pulse += particle.pulseSpeed
        const pulseScale = 1 + Math.sin(particle.pulse) * 0.3
        const currentSize = particle.size * pulseScale * (1 + particle.layer * 0.3)
        const currentOpacity = particle.opacity * (0.7 + Math.sin(particle.pulse) * 0.3)

        // Draw glow
        const glowGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          currentSize * 4,
        )
        glowGradient.addColorStop(0, particle.color.replace("1)", `${currentOpacity})`))
        glowGradient.addColorStop(1, "transparent")

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, currentSize * 4, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Draw particle core
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2)
        ctx.fillStyle = particle.color.replace("1)", `${currentOpacity})`).replace("0.8)", `${currentOpacity * 0.8})`)
        ctx.fill()
      })

      // Draw flowing energy streams
      const time = Date.now() * 0.001
      ctx.beginPath()
      ctx.moveTo(0, dimensions.height * 0.3 + Math.sin(time) * 50)
      for (let x = 0; x < dimensions.width; x += 10) {
        const y = dimensions.height * 0.3 + Math.sin(time + x * 0.005) * 50 + Math.sin(time * 1.5 + x * 0.008) * 30
        ctx.lineTo(x, y)
      }
      const streamGradient = ctx.createLinearGradient(0, 0, dimensions.width, 0)
      streamGradient.addColorStop(0, "rgba(0, 212, 255, 0)")
      streamGradient.addColorStop(0.3, "rgba(0, 212, 255, 0.1)")
      streamGradient.addColorStop(0.7, "rgba(13, 43, 107, 0.1)")
      streamGradient.addColorStop(1, "rgba(0, 212, 255, 0)")
      ctx.strokeStyle = streamGradient
      ctx.lineWidth = 2
      ctx.stroke()

      // Second stream
      ctx.beginPath()
      ctx.moveTo(0, dimensions.height * 0.7 + Math.sin(time * 0.8) * 40)
      for (let x = 0; x < dimensions.width; x += 10) {
        const y =
          dimensions.height * 0.7 + Math.sin(time * 0.8 + x * 0.003) * 40 + Math.sin(time * 1.2 + x * 0.006) * 25
        ctx.lineTo(x, y)
      }
      ctx.strokeStyle = streamGradient
      ctx.lineWidth = 1.5
      ctx.stroke()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions])

  return (
    <div className={styles.particleContainer}>
      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className={styles.canvas} />
      <div className={styles.gradientOverlay} />
    </div>
  )
}
