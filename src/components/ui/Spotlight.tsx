import React from "react";

interface SpotlightProps {
  className?: string;
  fill?: string;
}

/**
 * Optical Architectural Sheen (Zero-Blur / Zero-Glowing)
 * Produces crisp, luxury architectural light lines with zero diffuse fog or neon bloom.
 */
export function Spotlight({ className = "", fill = "white" }: SpotlightProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-[1] overflow-hidden select-none ${className}`}
    >
      {/* Top subtle linear horizon beam */}
      <div className="w-[1000px] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
      
      {/* Ultra-subtle linear architectural cone (no blur, crisp directional gradient) */}
      <div
        className="w-[720px] h-[220px] mx-auto opacity-70"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, rgba(0, 200, 83, 0.02) 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
