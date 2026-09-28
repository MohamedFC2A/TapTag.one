"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DoubleChevronProps {
  index: number;
  dotColor?: string;
}

const DoubleChevron: React.FC<DoubleChevronProps> = ({ index, dotColor = "#000000" }) => {
  const base = index * 0.12;
  const dots = [
    { cx: 2, cy: 2, d: 0 },
    { cx: 5, cy: 5, d: 0.05 },
    { cx: 8, cy: 8, d: 0.1 },
    { cx: 5, cy: 11, d: 0.15 },
    { cx: 2, cy: 14, d: 0.2 },
    { cx: 6, cy: 2, d: 0.05 },
    { cx: 9, cy: 5, d: 0.1 },
    { cx: 12, cy: 8, d: 0.15 },
    { cx: 9, cy: 11, d: 0.2 },
    { cx: 6, cy: 14, d: 0.25 },
  ];

  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 overflow-visible"
    >
      <g fill={dotColor}>
        {dots.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="1"
            className="bd-dot"
            style={{ animationDelay: `${base + p.d}s` }}
          />
        ))}
      </g>
    </svg>
  );
};

export interface AntiMetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  accentFrom?: string;
  accentTo?: string;
  dotColor?: string;
}

export const AntiMetalButton = React.forwardRef<
  HTMLButtonElement,
  AntiMetalButtonProps
>(
  (
    {
      className,
      children,
      label,
      accentFrom = "#FFFFFF",
      accentTo = "#D4D4D8",
      dotColor = "#000000",
      ...props
    },
    ref
  ) => {
    const content = label ?? children ?? "Book a demo";

    return (
      <button
        ref={ref}
        className={cn(
          "group/btn relative inline-flex h-11 min-w-[150px] items-center justify-center overflow-hidden rounded-xl px-4 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer",
          "bg-[linear-gradient(180deg,#1c1c1f_0%,#09090b_100%)] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.5)]",
          "hover:border-white/25 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_20px_rgba(0,0,0,0.7)]",
          className
        )}
        {...props}
      >
        <style>{`
          @keyframes bd-dot-wave {
            0%, 70%, 100% { opacity: 0.25; transform: scale(0.85); }
            35% { opacity: 1; transform: scale(1); }
          }
          .bd-dot {
            transform-box: fill-box;
            transform-origin: center;
            animation: bd-dot-wave 1.4s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .bd-dot { animation: none; opacity: 1; }
          }
        `}</style>

        {/* Button Label text */}
        <span className="relative z-0 pl-7 text-[13px] font-semibold tracking-wide text-zinc-100 transition-colors group-hover/btn:text-white">
          {content}
        </span>

        {/* Sliding Accent Wave Container */}
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 z-10 flex w-9 items-center justify-start gap-2 overflow-hidden rounded-lg pl-2.5 pr-2 transition-[width,gap] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/btn:w-[calc(100%-0.5rem)]"
          style={{
            background: `linear-gradient(180deg, ${accentFrom} 0%, ${accentTo} 100%)`,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          <DoubleChevron index={0} dotColor={dotColor} />
          <DoubleChevron index={1} dotColor={dotColor} />
          <DoubleChevron index={2} dotColor={dotColor} />
          <DoubleChevron index={3} dotColor={dotColor} />
          <DoubleChevron index={4} dotColor={dotColor} />
        </span>
      </button>
    );
  }
);

AntiMetalButton.displayName = "AntiMetalButton";

export default AntiMetalButton;
