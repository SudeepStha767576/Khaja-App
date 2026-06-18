// Animated number ticker — counts up to value on mount (Aceternity UI pattern)
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface NumberTickerProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

export function NumberTicker({ value, prefix = '', suffix = '', duration = 1200, className = '' }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [isInView, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{displayed.toLocaleString()}{suffix}
    </span>
  )
}
