"use client";

import React, { useId } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Language } from "@/types";
import { TapTagMonogram } from "./TapTagLogo";

/**
 * Official 3D Faceted Architectural M Emblem of Matany Group
 */
export function LogoSvgM({ className = "h-3.5 w-auto shrink-0 inline-block" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `m-mask-${uid}`;

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
      </defs>

      <polygon points="16,80 16,26 34,16 34,70" fill="#FFFFFF" />
      <polygon points="34,16 50,50 50,74 34,70" fill="#71717A" />
      <polygon points="66,16 50,50 50,74 66,70" fill="#D4D4D8" />
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
    <footer className="hw-no-print w-full border-t border-[#27272A] bg-[#09090B] mt-12 py-10 px-4 sm:px-6 text-xs text-[#A1A1AA]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hardware Navigation Rail */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#27272A] font-mono text-xs uppercase tracking-wider">
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            <Link href="/" className="text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors duration-150">
              {isAr ? "إنشاء QR" : "QR Studio"}
            </Link>
            <Link href="/dashboard" className="text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors duration-150">
              {isAr ? "إدارة الأكواد" : "Dashboard"}
            </Link>
            <Link href="/scan" className="text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors duration-150">
              {isAr ? "فحص ومَسح" : "Scanner"}
            </Link>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            aria-label={isAr ? "للأعلى" : "Back to top"}
            className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] transition-all duration-150 ease-out flex items-center justify-center cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center text-center sm:text-start" dir="ltr">
            <span className="font-taptag text-xl text-[#FFFFFF] leading-none">
              taptag.
            </span>
          </div>

          <div dir="ltr" className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] font-mono select-none">
            <span>Built By</span>
            <a
              href="https://matanygroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#121215] font-sans font-semibold text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] transition-all duration-150 ease-out"
              title="Matany Group"
            >
              <LogoSvgM className="h-3.5 w-auto shrink-0" />
              <span className="tracking-wide">Matany Group</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
