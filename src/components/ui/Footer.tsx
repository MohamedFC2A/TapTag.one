"use client";

import React, { useId } from "react";
import { ArrowUp, ShieldCheck } from "lucide-react";
import { Language } from "@/types";

/**
 * Official 3D Faceted Architectural M Emblem of Matany Group
 * Directly aligned with C:\Best Projects\matanygroup
 */
export function LogoSvgM({ className = "h-3.5 w-auto shrink-0 inline-block" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `m-mask-${uid}`;
  const gradId = `m-grad-${uid}`;

  return (
    <svg
      viewBox="16 16 68 64"
      className={`${className} overflow-visible`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <polygon points="16,80 16,26 34,16 34,70" fill="#FFFFFF" />
          <polygon points="34,16 50,50 50,74 34,70" fill="#FFFFFF" />
          <polygon points="66,16 50,50 50,74 66,70" fill="#FFFFFF" />
          <polygon points="84,80 84,26 66,16 66,70" fill="#FFFFFF" />
        </mask>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="75%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 3D Facets matching Matany Group standard */}
      <polygon points="16,80 16,26 34,16 34,70" fill="#FFFFFF" />
      <polygon points="34,16 50,50 50,74 34,70" fill="#8E8E93" />
      <polygon points="66,16 50,50 50,74 66,70" fill="#D1D1D6" />
      <polygon points="84,80 84,26 66,16 66,70" fill="#FFFFFF" />
    </svg>
  );
}

interface FooterProps {
  lang?: Language;
}

export function Footer({ lang = "ar" }: FooterProps) {
  const isAr = lang === "ar";

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full border-t border-[#1C1C20] bg-[#000000] py-8 px-4 text-xs text-[#A1A1AA]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand System Notice */}
        <div className="flex items-center gap-2 text-center sm:text-start">
          <ShieldCheck className="w-4 h-4 text-[#00C853] shrink-0" />
          <span className="font-mono text-[11px]">
            {isAr
              ? "منظومة TapTag.one • الهوية الذكية وحماية الأصول عبر تقنيات NFC و QR المشفرة"
              : "TapTag.one • Smart NFC/QR Identity & Privacy Asset System"}
          </span>
        </div>

        {/* Built by Matany Group with Official 3D M Emblem */}
        <div dir="ltr" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono select-none">
          <span>Built by</span>
          <a
            href="https://matanygroup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-white hover:text-[#00C853] transition-colors group cursor-pointer"
            title="MATANY GROUP"
          >
            <LogoSvgM className="h-3.5 w-auto shrink-0 group-hover:scale-105 transition-transform" />
            <span className="tracking-wide text-white group-hover:text-[#00C853] transition-colors">Matany Group</span>
          </a>
        </div>

        {/* Scroll To Top */}
        <button
          onClick={scrollToTop}
          className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#08080A] hover:border-white/30 hover:text-white transition-all flex items-center gap-1.5 text-[11px] text-zinc-300 font-mono cursor-pointer"
        >
          <span>{isAr ? "للأعلى" : "Top"}</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
