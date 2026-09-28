"use client";

import React from "react";

export function ContactlessWaves({ className = "w-5 h-5 text-white" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {/* Dot */}
      <circle cx="4.5" cy="12" r="1.75" fill="#00C853" stroke="none" />
      {/* Inner Wave */}
      <path d="M8.5 8.5a5 5 0 0 1 0 7" />
      {/* Middle Wave */}
      <path d="M12.5 5.5a9.5 9.5 0 0 1 0 13" />
      {/* Outer Wave */}
      <path d="M16.5 2.5a14.5 14.5 0 0 1 0 19" />
    </svg>
  );
}

interface TapTagLogoProps {
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  waveColor?: string;
}

export function TapTagLogo({
  className = "",
  showSubtitle = true,
  subtitle = "منظومة الهوية الذكية",
  size = "md",
  waveColor = "text-white",
}: TapTagLogoProps) {
  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const waveSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div dir="ltr" className="inline-flex items-center gap-2">
        <span className={`font-black tracking-tight text-white ${textSizes[size]} font-sans lowercase`}>
          taptag<span className="text-[#00C853]">.</span>one
        </span>
        <ContactlessWaves className={`${waveSizes[size]} ${waveColor} shrink-0`} />
      </div>
      {showSubtitle && (
        <span className="text-[10px] font-mono text-zinc-400 font-normal tracking-tight text-start">
          {subtitle}
        </span>
      )}
    </div>
  );
}
