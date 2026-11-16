"use client";

import React from "react";
import { MataScriptWordmark } from "./MataLogo";

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
 * Compact Typographic Wordmark (pure frameless mark, zero border box)
 */
export function TapTagMonogram({ className = "" }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center font-taptag text-xs text-[#FFFFFF] leading-none shrink-0 ${className}`}
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
 * Official taptag. Frameless Brand Wordmark (no outer box or border frame).
 */
export function TapTagLogo({
  className = "",
  showSubtitle = false,
  subtitle = "",
  size = "md",
}: TapTagLogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-[22px]",
    lg: "text-3xl",
  };

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <span
        dir="ltr"
        className={`font-taptag text-[#FFFFFF] ${sizes[size]} leading-none tracking-[-0.04em]`}
      >
        taptag.
      </span>
      {showSubtitle && subtitle ? (
        <span className="text-[10px] font-mono text-[#A1A1AA] font-normal tracking-wider mt-1 text-start">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

interface TapTagMataLockupProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Official frameless collaboration lockup: taptag. | Mata AI
 */
export function TapTagMataLockup({ size = "md", className = "" }: TapTagMataLockupProps) {
  const dividerHeight = {
    sm: "h-3.5",
    md: "h-5",
    lg: "h-7",
  };
  const mataHeight = {
    sm: "h-4 w-auto",
    md: "h-[22px] w-auto",
    lg: "h-8 w-auto",
  };

  return (
    <div dir="ltr" className={`inline-flex items-center gap-3 select-none ${className}`}>
      <TapTagLogo size={size} />
      <span className={`w-px ${dividerHeight[size]} bg-[#3F3F46] shrink-0`} aria-hidden="true" />
      <MataScriptWordmark className={mataHeight[size]} color="#FFFFFF" />
    </div>
  );
}
