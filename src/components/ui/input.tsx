import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FFFFFF] font-mono placeholder:text-[#71717A] transition-colors duration-150 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#FFFFFF] focus-visible:outline-none focus-visible:border-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
