"use client";

import React, { useState } from "react";
import { Check, Shield, Cpu } from "lucide-react";
import { ContactlessWaves } from "@/components/ui/TapTagLogo";

interface PhysicalAcrylicArtifactProps {
  tagUid?: string;
  className?: string;
}

export function PhysicalAcrylicArtifact({
  tagUid = "TT-88219-X",
  className = "",
}: PhysicalAcrylicArtifactProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Gentle subtle tilt (max 6 degrees)
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      className={`relative select-none perspective-[1000px] ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Precision 70x50 mm Acrylic Form Factor Container */}
      <div
        className="relative w-full max-w-[390px] sm:max-w-[440px] aspect-[7/5] rounded-xl border border-white/20 bg-[#060608] p-4 sm:p-5 flex flex-col justify-between overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        }}
      >
        {/* Subtle Chamfered Edge Line */}
        <div className="absolute inset-[3px] rounded-lg border border-white/[0.07] pointer-events-none" />

        {/* Diagonal Optical Sheen (Zero Blur) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

        {/* 1.5px Laser Scanline Beam (Pure Emerald Precision) */}
        <div className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00C853] to-transparent pointer-events-none animate-laser-sweep z-20" />

        {/* Top Architectural Circuit Header */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00C853] shrink-0" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-300 font-semibold uppercase">
              TAPTAG SECURE IC • NTAG216
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-black text-[9px] font-mono text-zinc-400">
            <Cpu className="w-3 h-3 text-[#00C853]" />
            <span>13.56 MHz</span>
          </div>
        </div>

        {/* Core Layout: Left Specs & Right Micro-QR */}
        <div className="flex items-center justify-between gap-4 my-auto relative z-10">
          {/* Left Brand Identity */}
          <div className="flex flex-col space-y-1 text-start">
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white lowercase">
                taptag<span className="text-[#00C853]">.</span>one
              </span>
              <ContactlessWaves className="w-5 h-5 text-white" />
            </div>

            <div className="space-y-0.5">
              <span className="text-[9px] font-mono text-zinc-400 block tracking-wider uppercase">
                ZERO-KNOWLEDGE VEHICLE PROTOCOL
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block">
                ECC LEVEL H (30%) • ANTI-METAL FERRITE
              </span>
            </div>
          </div>

          {/* Right Vector QR Matrix */}
          <div className="relative p-1.5 rounded-lg border border-white/20 bg-black shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded flex items-center justify-center">
              <svg viewBox="0 0 33 33" className="w-full h-full text-black" fill="currentColor">
                <rect x="0" y="0" width="7" height="7" />
                <rect x="1" y="1" width="5" height="5" fill="white" />
                <rect x="2" y="2" width="3" height="3" />
                <rect x="26" y="0" width="7" height="7" />
                <rect x="27" y="1" width="5" height="5" fill="white" />
                <rect x="28" y="2" width="3" height="3" />
                <rect x="0" y="26" width="7" height="7" />
                <rect x="1" y="27" width="5" height="5" fill="white" />
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
        </div>

        {/* Bottom Hardware Strip */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono relative z-10">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="text-zinc-500">TAG ID</span>
            <span className="text-white font-bold tracking-wider">{tagUid}</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] text-[9px] font-bold">
            <Check className="w-3 h-3" />
            <span>AUTHENTICATED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
