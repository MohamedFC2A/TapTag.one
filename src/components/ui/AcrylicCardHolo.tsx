"use client";

import React, { useState } from "react";
import { Radio, ShieldCheck, Check } from "lucide-react";
import { ContactlessWaves } from "./TapTagLogo";

export function AcrylicCardHolo({
  tagUid = "TT-88219-X",
  className = "",
}: {
  tagUid?: string;
  className?: string;
}) {
  const [isScanning, setIsScanning] = useState(true);

  return (
    <div className={`relative group select-none ${className}`}>
      {/* 1px Precision Outer Hairline Border */}
      <div className="relative aspect-[7/5] w-full max-w-[340px] sm:max-w-[420px] rounded-2xl border border-white/15 group-hover:border-white/30 bg-[#08080A] p-4 sm:p-5 flex flex-col justify-between overflow-hidden transition-colors duration-500">
        
        {/* Subtle Diagonal Specular Sheen (Zero Blur) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />

        {/* Smart Emerald Laser Scanner Line (1.5px Hairline Beam - Zero Blur) */}
        {isScanning && (
          <div
            className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFFFFF] to-transparent pointer-events-none animate-laser-sweep z-20"
          />
        )}

        {/* Top Architectural Sensor Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
            <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
              ACTIVE HARDWARE PROTOCOL
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-black/60 text-[10px] font-mono text-zinc-300">
            <span>NFC 13.56 MHz</span>
          </div>
        </div>

        {/* Middle Core Area: Typography & Crisp QR Matrix */}
        <div className="flex items-center justify-between gap-4 my-2 relative z-10">
          {/* Left: Brand Identity & Specifications */}
          <div className="flex flex-col space-y-1.5 text-start">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              OFFICIAL VEHICLE TAG
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white lowercase">
                taptag<span className="text-[#FFFFFF]">.</span>one
              </span>
              <ContactlessWaves className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] text-zinc-400 font-mono">
                NTAG 216 • ISO 18004 LEVEL H
              </span>
            </div>
          </div>

          {/* Right: Crisp Vector QR Code Matrix (Flat, High Contrast) */}
          <div className="relative p-2 rounded-xl border border-white/15 bg-black shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-lg flex items-center justify-center">
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
            <span className="text-[10px] text-zinc-500 uppercase">UID</span>
            <span className="text-white font-bold tracking-wider">{tagUid}</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#FFFFFF]/30 bg-[#FFFFFF]/10 text-[#FFFFFF] text-[10px] font-mono">
            <Check className="w-3 h-3" />
            <span>VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
