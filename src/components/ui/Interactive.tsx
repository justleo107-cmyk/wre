'use client'

import React, { useRef, useState } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

// Magnetic Pull component for CTA buttons
export function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    
    // Magnetic pull scale factor
    setPosition({ x: middleX * 0.22, y: middleY * 0.22 })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 120, damping: 12, mass: 0.1 }}
      className="w-full sm:w-auto inline-block"
    >
      {children}
    </motion.div>
  )
}

// Spotlight Card component with optional 3D Tilt and Shimmer
interface SpotlightCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  children?: React.ReactNode
  glowColor?: string
  tilt?: boolean
  interactiveClass?: boolean
}

export function SpotlightCard({
  children,
  className = "",
  glowColor = "rgba(139, 92, 246, 0.08)",
  tilt = false,
  interactiveClass = true,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })

    if (tilt) {
      const width = rect.width
      const height = rect.height
      const mouseX = x - width / 2
      const mouseY = y - height / 2
      // Rotate values capped to max 5 degrees
      setRotateX(-(mouseY / (height / 2)) * 5)
      setRotateY((mouseX / (width / 2)) * 5)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={tilt ? { rotateX, rotateY, scale: isHovered ? 1.015 : 1 } : {}}
      style={tilt ? { transformStyle: "preserve-3d" } : {}}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className={`${interactiveClass ? 'glass-card-interactive' : ''} ${className} relative overflow-hidden`}
      {...props}
    >
      {/* Local Spotlight Glow Overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 80%)`
        }}
      />
      {/* CSS Shimmer overlay */}
      <div className="shimmer-overlay z-0" />
      <div className="relative z-10" style={tilt ? { transform: "translateZ(10px)" } : {}}>
        {children}
      </div>
    </motion.div>
  )
}

// Spring scale wrapper for badges, achievements, icons, and buttons
export function HoverScale({ 
  children, 
  className = "", 
  scale = 1.05 
}: { 
  children: React.ReactNode, 
  className?: string, 
  scale?: number 
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      transition={{ type: "spring", stiffness: 350, damping: 15 }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  )
}
