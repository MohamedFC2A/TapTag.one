"use client";

import React from "react";
import { Check } from "lucide-react";
import { ContactlessWaves } from "./TapTagLogo";
import { SegmentedLedBar } from "./SegmentedLedBar";

export function AcrylicCardHolo({
  tagUid = "TT-88219-X",
  className = "",
}: {
  tagUid?: string;
  className?: string;
}) {
  return (
    <div className={`relative select-none ${className}`}>
      <div className="relative aspect-[7/5] w-full max-w-[360px] sm:max-w-[420px] rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden flex flex-col justify-between">
        <SegmentedLedBar level={85} cells={24} label="NFC // ISO-14443A" />

        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="text-[10px] font-mono font-semibold tracking-wider text-[#A1A1AA] uppercase">
                ACTIVE PROTOCOL
              </span>
            </div>
            <div className="px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#F4F4F5] uppercase">
              13.56 MHz
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 my-2">
            <div className="flex flex-col space-y-1 text-start">
              <span className="text-[9px] font-mono text-[#71717A] uppercase tracking-widest">
                ASSET HARDWARE SPECIMEN
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-display font-bold tracking-wider text-[#FFFFFF] uppercase">
                  taptag.
                </span>
                <ContactlessWaves className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <span className="text-[10px] text-[#A1A1AA] font-mono uppercase">
                NTAG 216 · ISO 18004
              </span>
            </div>

            <div className="p-1.5 rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] shrink-0">
              <svg viewBox="0 0 33 33" className="w-16 h-16 sm:w-20 sm:h-20 text-[#09090B]" fill="currentColor">
                <rect x="0" y="0" width="7" height="7" />
                <rect x="1" y="1" width="5" height="5" fill="#FFFFFF" />
                <rect x="2" y="2" width="3" height="3" />
                <rect x="26" y="0" width="7" height="7" />
                <rect x="27" y="1" width="5" height="5" fill="#FFFFFF" />
                <rect x="28" y="2" width="3" height="3" />
                <rect x="0" y="26" width="7" height="7" />
                <rect x="1" y="27" width="5" height="5" fill="#FFFFFF" />
                <rect x="2" y="28" width="3" height="3" />
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

          <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-[#A1A1AA]">
              <span className="text-[10px] text-[#71717A] uppercase">UID</span>
              <span className="text-[#FFFFFF] font-bold tracking-wider">{tagUid}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[#FFFFFF] text-[10px] font-mono uppercase">
              <Check className="w-3 h-3" />
              <span>VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
