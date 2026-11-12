import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors duration-150 ease-out focus:outline-none focus:ring-1 focus:ring-[#FFFFFF]",
  {
    variants: {
      variant: {
        default:
          "border-[#FFFFFF] bg-[#FFFFFF] text-[#09090B]",
        secondary:
          "border-[#27272A] bg-[#121215] text-[#F4F4F5]",
        destructive:
          "border-[#FFFFFF] bg-[#09090B] text-[#FFFFFF]",
        outline:
          "border-[#27272A] bg-transparent text-[#A1A1AA]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
