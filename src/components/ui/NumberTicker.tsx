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
  const ref    = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const prevValue = useRef<number>(-1)
  const isInView  = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (!isInView) return
    // Short-circuit if value hasn't changed
    if (prevValue.current === value) return
    prevValue.current = value

    cancelAnimationFrame(rafRef.current)

    const start = Date.now()
    const from  = displayed

    const frame = () => {
      const elapsed  = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + eased * (value - from)))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame)
      }
    }
    rafRef.current = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(rafRef.current)
  }, [isInView, value, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={ref} className={className}>
      {prefix}{displayed.toLocaleString()}{suffix}
    </span>
  )
}
