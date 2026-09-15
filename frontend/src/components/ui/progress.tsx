"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { SPRING } from "@/shared/motion/springs"

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** Colour of the fill. `success` marks a finished transfer. */
  tone?: "default" | "success"
}

function Progress({ className, value, tone = "default", ...props }: ProgressProps) {
  // Radix treats a null/undefined value as indeterminate: show a travelling
  // band rather than a bar stuck at zero.
  const isIndeterminate = value === null || value === undefined

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-muted relative h-1.5 w-full overflow-hidden rounded-full",
        className
      )}
      value={value}
      {...props}
    >
      {isIndeterminate ? (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "h-full w-1/3 animate-pulse rounded-full",
            tone === "success" ? "bg-success" : "bg-primary"
          )}
        />
      ) : (
        <ProgressPrimitive.Indicator asChild data-slot="progress-indicator">
          {/*
            scaleX rather than width: transform is compositor-friendly, and a
            spring keeps a value that updates several times a second reading as
            continuous motion instead of stepping. The track owns the radius.
          */}
          <motion.div
            className={cn(
              "h-full w-full origin-left",
              tone === "success" ? "bg-success" : "bg-primary"
            )}
            initial={false}
            animate={{ scaleX: value / 100 }}
            transition={SPRING.default}
          />
        </ProgressPrimitive.Indicator>
      )}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
