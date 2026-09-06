'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from "class-variance-authority"

const gsapButtonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full border text-base font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        outline: "border-foreground text-foreground glass",
      },
      size: {
        default: "h-15 px-6",
        sm: "h-8 px-4 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
)

type Props = React.ComponentProps<'button'> &
  VariantProps<typeof gsapButtonVariants>

export function GsapButton({
  className,
  variant,
  size,
  children,
  ...props
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const flairRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    const flair = flairRef.current
    if (!button || !flair) return

    const xSet = gsap.quickSetter(flair, 'xPercent')
    const ySet = gsap.quickSetter(flair, 'yPercent')

    const getXY = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect()

      const x = gsap.utils.clamp(
        0,
        100,
        gsap.utils.mapRange(0, rect.width, 0, 100, e.clientX - rect.left)
      )

      const y = gsap.utils.clamp(
        0,
        100,
        gsap.utils.mapRange(0, rect.height, 0, 100, e.clientY - rect.top)
      )

      return { x, y }
    }

    const onEnter = (e: MouseEvent) => {
      const { x, y } = getXY(e)
      xSet(x)
      ySet(y)

      gsap.to(flair, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    const onLeave = (e: MouseEvent) => {
      const { x, y } = getXY(e)

      gsap.killTweensOf(flair)

      gsap.to(flair, {
        xPercent: x > 90 ? x + 20 : x < 10 ? x - 20 : x,
        yPercent: y > 90 ? y + 20 : y < 10 ? y - 20 : y,
        scale: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const onMove = (e: MouseEvent) => {
      const { x, y } = getXY(e)

      gsap.to(flair, {
        xPercent: x,
        yPercent: y,
        duration: 0.4,
        ease: 'power2',
      })
    }

    button.addEventListener('mouseenter', onEnter)
    button.addEventListener('mouseleave', onLeave)
    button.addEventListener('mousemove', onMove)

    return () => {
      button.removeEventListener('mouseenter', onEnter)
      button.removeEventListener('mouseleave', onLeave)
      button.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      className={cn(gsapButtonVariants({ variant, size }), className)}
      {...props}
    >
      {}
      <span
        ref={flairRef}
        className="absolute inset-0 pointer-events-none scale-0"
      >
        <span className="absolute left-0 top-0 w-[170%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
      </span>

      {}
      <span className="relative z-10 mix-blend-difference">
  {children}
</span>
    </button>
  )
}