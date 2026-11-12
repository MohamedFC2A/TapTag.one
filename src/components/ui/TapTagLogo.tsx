"use client";

import React from "react";

export function ContactlessWaves({ className = "w-4 h-4 text-white" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="10.5" width="3" height="3" fill="currentColor" stroke="none" />
      <path d="M9 8.5a5 5 0 0 1 0 7" />
      <path d="M13 5.5a9.5 9.5 0 0 1 0 13" />
      <path d="M17 2.5a14.5 14.5 0 0 1 0 19" />
    </svg>
  );
}

/**
 * Compact Typographic Wordmark Badge (pure text mark, zero image)
 */
export function TapTagMonogram({ className = "" }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center justify-center px-2 py-1 rounded-lg border border-[#27272A] bg-[#09090B] font-taptag text-xs text-[#FFFFFF] leading-none shrink-0 ${className}`}
    >
      taptag.
    </span>
  );
}

interface TapTagLogoProps {
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Official taptag. Pure Typographic Wordmark Logo
 */
export function TapTagLogo({
  className = "",
  showSubtitle = false,
  subtitle = "",
  size = "md",
}: TapTagLogoProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div
        dir="ltr"
        className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#121215] border border-[#27272A] transition-colors duration-150 ease-out hover:border-[#FFFFFF]"
      >
        <span className={`font-taptag text-[#FFFFFF] ${textSizes[size]} leading-none`}>
          taptag.
        </span>
      </div>
      {showSubtitle && subtitle ? (
        <span className="text-[10px] font-mono text-[#A1A1AA] font-normal tracking-wider mt-1 text-start">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}
