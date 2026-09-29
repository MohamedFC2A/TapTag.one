"use client";

import React from "react";

interface NfcSymbolProps {
  className?: string;
  variant?: "amazon-tap" | "contactless-waves";
}

/**
 * High-precision vector representation of the NFC contactless symbol
 * matching the authentic physical NFC card (Tap / N-Mark style) from Amazon.
 */
export function NfcWaveSymbol({
  className = "w-6 h-6 text-white",
  variant = "amazon-tap",
}: NfcSymbolProps) {
  if (variant === "contactless-waves") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Contactless Symbol"
      >
        <path d="M7 12a5 5 0 0 1 0-7" />
        <path d="M11 15a9 9 0 0 1 0-13" />
        <path d="M15 18a13 13 0 0 1 0-19" />
        <path d="M19 21a17 17 0 0 1 0-25" />
      </svg>
    );
  }

  // Authentic Amazon Tap NFC Symbol: Stylized "N" with contactless waves "N))"
  return (
    <svg
      viewBox="0 0 34 30"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="NFC Contactless"
    >
      {/* Stylized N-mark stroke */}
      <path d="M5 23V8l9.5 15V8" />
      {/* Contactless waves on the right */}
      <path d="M19.5 11.5a6.5 6.5 0 0 1 0 9" />
      <path d="M24.5 8a11.5 11.5 0 0 1 0 16" />
    </svg>
  );
}
