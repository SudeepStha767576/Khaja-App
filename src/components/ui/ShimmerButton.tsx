// White shimmer button — clean monochrome
import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
}

export function ShimmerButton({ children, className = '', disabled, ...props }: ShimmerButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`relative overflow-hidden rounded-xl font-semibold text-black transition-all duration-150 ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 active:scale-[0.98]'
      } ${className}`}
      style={{ background: '#FFFFFF' }}
    >
      {!disabled && (
        <motion.div
          className="absolute inset-0 -skew-x-12"
          animate={{ x: ['-200%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)' }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}
