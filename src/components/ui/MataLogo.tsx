"use client";

import React from "react";
import { MATA_WORDMARK_PATHS, MATA_WORDMARK_VIEWBOX } from "@/lib/mata-brand";

interface MataLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
  showTagline?: boolean;
  tagline?: string;
}

/**
 * Bespoke Supra-Inspired Aerodynamic Script Wordmark for "Mata AI"
 * Frameless calligraphic emblem with bold slanted 'M', connected 'a-t-a',
 * and 'AI' with a single tapered aerodynamic speed underline.
 */
export function MataScriptWordmark({
  className = "h-7 w-auto",
  color = "#FFFFFF",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox={MATA_WORDMARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Mata AI"
    >
      {MATA_WORDMARK_PATHS.map((d, idx) => (
        <path
          key={idx}
          d={d}
          fill={color}
          opacity={idx === MATA_WORDMARK_PATHS.length - 1 ? 0.88 : 1}
        />
      ))}
    </svg>
  );
}

export function MataLogo({
  className = "",
  size = "md",
  variant = "dark",
  showTagline = false,
  tagline = "",
}: MataLogoProps) {
  const heightMap = {
    xs: "h-4 w-auto",
    sm: "h-5 w-auto",
    md: "h-7 w-auto",
    lg: "h-10 w-auto",
    xl: "h-14 w-auto",
  };

  const isLight = variant === "light";
  const fg = isLight ? "#09090B" : "#FFFFFF";

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <div dir="ltr" className="inline-flex items-center">
        <MataScriptWordmark className={heightMap[size]} color={fg} />
      </div>
      {showTagline && tagline ? (
        <span
          className={`text-[10px] font-mono tracking-wider mt-1 text-start ${
            isLight ? "text-[#52525B]" : "text-[#A1A1AA]"
          }`}
        >
          {tagline}
        </span>
      ) : null}
    </div>
  );
}

interface MataSectionHeaderProps {
  sectionNumber?: string;
  titleAr: string;
  titleEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
  isAr: boolean;
  badgeText?: string;
}

/**
 * Ultra-clean workspace section header: displays ONLY the bold section title
 * and the frameless taptag. | Mata AI lockup (zero numbers, zero badges, zero subtitle clutter).
 */
export function MataSectionHeader({
  titleAr,
  titleEn,
  isAr,
}: MataSectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
      <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[#FFFFFF] text-start">
        {isAr ? titleAr : titleEn}
      </h2>

      {/* Frameless Algorithmic Engine Lockup: taptag. | Mata AI */}
      <div
        dir="ltr"
        className="inline-flex items-center gap-2.5 shrink-0 self-start sm:self-center select-none opacity-85"
      >
        <span className="font-taptag text-sm text-[#FFFFFF] leading-none">taptag.</span>
        <span className="h-3.5 w-px bg-[#3F3F46]" aria-hidden="true" />
        <MataScriptWordmark className="h-4 w-auto" color="#FFFFFF" />
      </div>
    </div>
  );
}
