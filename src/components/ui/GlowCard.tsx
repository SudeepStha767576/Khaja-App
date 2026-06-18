// Animated gradient border glow card — Magic UI pattern
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlowCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
  delay?: number
}

export function GlowCard({ children, className = '', glowColor = 'rgba(124,58,237,0.5)', delay = 0 }: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative group ${className}`}
    >
      {/* Animated glow border */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${glowColor}, transparent, ${glowColor})`,
          filter: 'blur(1px)',
        }}
      />
      {/* Inner card */}
      <div className="relative rounded-2xl overflow-hidden h-full"
        style={{ background: '#120D24', border: '1px solid #2A1F4A' }}>
        {children}
      </div>
    </motion.div>
  )
}
