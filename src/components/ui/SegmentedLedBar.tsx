"use client";

import React, { useEffect, useState } from "react";

export type LedBarStatus = "idle" | "active" | "working" | "success" | "error";

interface SegmentedLedBarProps {
  /** Real progress/readiness/strength percentage (0-100) */
  level?: number;
  /** Number of clean telemetry cells (default 16) */
  cells?: number;
  /** Surface adaptation */
  variant?: "dark" | "light";
  /** Concise status tag on left/right */
  label?: string;
  /** Real dynamic telemetry reading (e.g. "AES-256 · 90%" or "-38% · PNG") */
  metricText?: string;
  /** Genuine reactive state; only "working" animates a scan sweep */
  status?: LedBarStatus;
  /** Backwards-compatible flag mapped to "active" vs "idle" when status omitted */
  active?: boolean;
  className?: string;
}

/**
 * Smart Reactive Segmented Telemetry Meter
 * Stays calm and steady when idle; expands cell-by-cell in response to real input
 * strength, encryption posture, byte savings, or async execution progress.
 * Runs a directional sweep strictly while `status === "working"`.
 */
export function SegmentedLedBar({
  level = 0,
  cells = 16,
  variant = "dark",
  label,
  metricText,
  status,
  active,
  className = "",
}: SegmentedLedBarProps) {
  const effectiveStatus: LedBarStatus =
    status ?? (active === false ? "idle" : level >= 95 ? "success" : level > 0 ? "active" : "idle");

  const [scanCursor, setScanCursor] = useState(0);

  useEffect(() => {
    if (effectiveStatus !== "working") return;
    const timer = window.setInterval(() => {
      setScanCursor((prev) => (prev + 1) % cells);
    }, 90);
    return () => window.clearInterval(timer);
  }, [effectiveStatus, cells]);

  const clampedLevel = Math.max(0, Math.min(100, level));
  const litCount = Math.round((clampedLevel / 100) * cells);
  const unlitColor = variant === "light" ? "#E4E4E7" : "#27272A";
  const railBg =
    variant === "light"
      ? "bg-[#FAFAFA] border-b border-[#E4E4E7]"
      : "bg-[#09090B] border-b border-[#27272A]";

  const getCellColor = (idx: number) => {
    if (effectiveStatus === "working") {
      const dist = Math.min(
        Math.abs(idx - scanCursor),
        cells - Math.abs(idx - scanCursor)
      );
      if (dist === 0) return variant === "light" ? "#09090B" : "#FFFFFF";
      if (dist === 1) return variant === "light" ? "#52525B" : "#D4D4D8";
      if (dist === 2) return variant === "light" ? "#A1A1AA" : "#71717A";
      if (idx < litCount) return variant === "light" ? "#D4D4D8" : "#3F3F46";
      return unlitColor;
    }

    if (effectiveStatus === "error") {
      if (idx < Math.max(2, Math.min(4, litCount || 3))) return "#EF4444";
      return unlitColor;
    }

    if (idx >= litCount) return unlitColor;

    if (effectiveStatus === "success" && idx === litCount - 1) {
      return "#10B981";
    }

    if (variant === "light") {
      if (idx >= litCount - 2) return "#09090B";
      return "#52525B";
    }

    // Smooth brightness gradient leading up to current level head
    const posFromHead = litCount - 1 - idx;
    if (posFromHead === 0) return "#FFFFFF";
    if (posFromHead === 1) return "#E4E4E7";
    if (posFromHead <= 3) return "#A1A1AA";
    return "#52525B";
  };

  const dotColor =
    effectiveStatus === "error"
      ? "bg-[#EF4444]"
      : effectiveStatus === "success"
      ? "bg-[#10B981]"
      : effectiveStatus === "working"
      ? "bg-[#FFFFFF] hw-led-working"
      : effectiveStatus === "active" && litCount > 0
      ? "bg-[#D4D4D8]"
      : "bg-[#3F3F46]";

  return (
    <div
      dir="ltr"
      aria-hidden="true"
      className={`w-full px-3.5 py-2 flex items-center justify-between gap-3 ${railBg} ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-200 ${dotColor}`} />
        <div className="flex items-center gap-[3px] flex-1 max-w-[260px]">
          {Array.from({ length: cells }).map((_, idx) => (
            <span
              key={idx}
              className="block h-[4px] flex-1 rounded-[1.5px] transition-colors duration-150 ease-out"
              style={{ backgroundColor: getCellColor(idx) }}
            />
          ))}
        </div>
      </div>

      {(metricText || label) && (
        <div className="flex items-center gap-2 shrink-0">
          {label && (
            <span
              className={`text-[10px] font-mono font-semibold uppercase tracking-wider tabular-nums ${
                variant === "light" ? "text-[#52525B]" : "text-[#A1A1AA]"
              }`}
            >
              {label}
            </span>
          )}
          {metricText && (
            <span
              className={`text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded border ${
                variant === "light"
                  ? "bg-[#FFFFFF] border-[#E4E4E7] text-[#09090B]"
                  : "bg-[#121215] border-[#27272A] text-[#FFFFFF]"
              }`}
            >
              {metricText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
