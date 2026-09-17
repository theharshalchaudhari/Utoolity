import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

/**
 * A determinate progress bar.
 *
 * Kept dependency-free rather than pulling in @radix-ui/react-progress: the
 * only behaviour needed is the ARIA wiring, which is a few attributes.
 */
function Progress({
  className,
  value = 0,
  max = 100,
  label,
  ...props
}: React.ComponentProps<"div"> & {
  value?: number
  max?: number
  label?: string
}) {
  const safeMax = max > 0 ? max : 100
  const clamped = Math.min(safeMax, Math.max(0, value))
  const pct = (clamped / safeMax) * 100

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full rounded-full transition-[width] duration-200 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { Progress }
