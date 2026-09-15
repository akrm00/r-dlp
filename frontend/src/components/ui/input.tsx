import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // A sunken well: the field reads as carved into the surface rather than
        // floating on it, which is what separates input from output.
        "bg-surface-sunken border-input text-body h-11 w-full min-w-0 rounded-xl border px-4 py-1",
        "placeholder:text-muted-foreground file:text-foreground selection:bg-primary selection:text-primary-foreground",
        "outline-none transition-[color,box-shadow,border-color] duration-150 ease-out",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
