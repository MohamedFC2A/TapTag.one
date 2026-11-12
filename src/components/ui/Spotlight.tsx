import React from "react";

interface SpotlightProps {
  className?: string;
}

/**
 * Architectural Hairline Divider (Strictly Zero Blur, Zero Glow, Zero Radial Gradient)
 */
export function Spotlight({ className = "" }: SpotlightProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none w-full border-t border-[#27272A] ${className}`}
    />
  );
}
