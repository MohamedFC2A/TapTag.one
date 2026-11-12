"use client";

import React from "react";

interface SegmentedLedBarProps {
  /** Percentage of cells lit from crisp white (#FFFFFF) transitioning to muted slate (#3F3F46), 0-100 */
  level?: number;
  /** Number of discrete pixel cells (4px x 8px separated by 2px gaps) */
  cells?: number;
  /** Light surface adaptation (#FAFAFA / #FFFFFF with #E4E4E7 frame) */
  variant?: "dark" | "light";
  /** Optional header label inside the inner LED rail */
  label?: string;
  /** Live active pulse indicator */
  active?: boolean;
  className?: string;
}

const DARK_METER_STOPS = ["#FFFFFF", "#E4E4E7", "#D4D4D8", "#A1A1AA", "#71717A", "#52525B"];
const LIGHT_METER_STOPS = ["#09090B", "#27272A", "#3F3F46", "#52525B", "#71717A", "#A1A1AA"];

/**
 * Hardware-Grade Segmented Top LED Meter
 * Renders rectangular 4px x 8px pixel cells separated by 2px gaps along the
 * top inner edge of major cards, preview generators, and dashboard panels.
 * Strictly zero glow, zero blur, zero box-shadow.
 */
export function SegmentedLedBar({
  level = 78,
  cells = 28,
  variant = "dark",
  label,
  active = true,
  className = "",
}: SegmentedLedBarProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const litCount = Math.round((clampedLevel / 100) * cells);
  const stops = variant === "light" ? LIGHT_METER_STOPS : DARK_METER_STOPS;
  const unlitColor = variant === "light" ? "#E4E4E7" : "#3F3F46";
  const railBg =
    variant === "light"
      ? "bg-[#FAFAFA] border-b border-[#E4E4E7]"
      : "bg-[#09090B] border-b border-[#27272A]";

  const getCellColor = (idx: number) => {
    if (idx >= litCount) return unlitColor;
    if (litCount <= 1) return stops[0];
    const ratio = idx / (litCount - 1);
    const stopIdx = Math.min(stops.length - 1, Math.floor(ratio * (stops.length - 1)));
    return stops[stopIdx];
  };

  return (
    <div
      dir="ltr"
      aria-hidden="true"
      className={`w-full px-3 py-2 flex items-center justify-between gap-3 ${railBg} ${className}`}
    >
      <div className="flex items-center gap-[2px] overflow-hidden flex-1">
        {Array.from({ length: cells }).map((_, idx) => {
          const isHead = active && idx === litCount - 1 && litCount > 0;
          return (
            <span
              key={idx}
              className={`block w-[8px] h-[4px] shrink-0 transition-colors duration-150 ease-out ${
                isHead ? "hw-led-head" : ""
              }`}
              style={{ backgroundColor: getCellColor(idx) }}
            />
          );
        })}
      </div>

      {label && (
        <span
          className={`text-[9px] font-mono font-semibold uppercase tracking-wider shrink-0 tabular-nums ${
            variant === "light" ? "text-[#52525B]" : "text-[#A1A1AA]"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
