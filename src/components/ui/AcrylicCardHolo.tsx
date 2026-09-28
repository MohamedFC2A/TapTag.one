"use client";

import React from "react";
import { Radio } from "lucide-react";
import { ContactlessWaves } from "./TapTagLogo";

export function AcrylicCardHolo({
  tagUid = "TT-88219-X",
  className = "",
}: {
  tagUid?: string;
  className?: string;
}) {
  return (
    <div className={`relative group select-none ${className}`}>
      {/* Ambient Backlight Glow */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-white/20 via-white/5 to-white/20 blur-xl opacity-30 group-hover:opacity-60 transition duration-700 pointer-events-none" />

      {/* The 7x5 Acrylic Card Body */}
      <div className="relative aspect-[7/5] w-full max-w-[340px] sm:max-w-[400px] rounded-2xl border border-white/25 bg-[#000000] p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl">
        {/* Subtle Specular Sheen Diagonal */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

        {/* Top Solar Bar */}
        <div className="w-full h-2 rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-900 border border-white/10" />

        {/* Middle Core Area */}
        <div className="flex items-center justify-between gap-4 my-2">
          {/* Left: NFC / Brand Mark */}
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              SMART VEHICLE TAG
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white lowercase">
                taptag<span className="text-zinc-500">.</span>one
              </span>
              <ContactlessWaves className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              NFC CONTACTLESS • LEVEL H QR
            </span>
          </div>

          {/* Right: Crisp Vector QR Representation */}
          <div className="relative p-2 rounded-xl border border-white/20 bg-white/[0.03] backdrop-blur-md shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-lg flex items-center justify-center">
              {/* QR Pattern SVG */}
              <svg viewBox="0 0 33 33" className="w-full h-full text-black" fill="currentColor">
                {/* Top-Left Corner Box */}
                <rect x="0" y="0" width="7" height="7" />
                <rect x="1" y="1" width="5" height="5" fill="white" />
                <rect x="2" y="2" width="3" height="3" />
                {/* Top-Right Corner Box */}
                <rect x="26" y="0" width="7" height="7" />
                <rect x="27" y="1" width="5" height="5" fill="white" />
                <rect x="28" y="2" width="3" height="3" />
                {/* Bottom-Left Corner Box */}
                <rect x="0" y="26" width="7" height="7" />
                <rect x="1" y="27" width="5" height="5" fill="white" />
                <rect x="2" y="28" width="3" height="3" />
                {/* Data Grid Pixels */}
                <rect x="10" y="2" width="2" height="2" />
                <rect x="14" y="2" width="3" height="2" />
                <rect x="19" y="2" width="2" height="3" />
                <rect x="10" y="6" width="3" height="2" />
                <rect x="15" y="6" width="2" height="2" />
                <rect x="10" y="10" width="4" height="4" />
                <rect x="16" y="10" width="3" height="2" />
                <rect x="21" y="10" width="2" height="4" />
                <rect x="2" y="10" width="2" height="4" />
                <rect x="6" y="11" width="2" height="2" />
                <rect x="12" y="16" width="4" height="2" />
                <rect x="18" y="16" width="2" height="4" />
                <rect x="23" y="16" width="3" height="2" />
                <rect x="28" y="16" width="3" height="2" />
                <rect x="10" y="22" width="3" height="3" />
                <rect x="15" y="20" width="2" height="4" />
                <rect x="19" y="22" width="4" height="2" />
                <rect x="25" y="22" width="2" height="3" />
                <rect x="10" y="28" width="4" height="3" />
                <rect x="16" y="27" width="3" height="2" />
                <rect x="21" y="26" width="2" height="4" />
                <rect x="25" y="28" width="4" height="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Hardware Strip */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>AUTHENTIC HARDWARE</span>
          </div>
          <span className="text-white font-bold tracking-wider">{tagUid}</span>
        </div>
      </div>
    </div>
  );
}
