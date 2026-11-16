"use client";

import React, { useId } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Language } from "@/types";
import { TapTagMataLockup } from "./TapTagLogo";

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
        {/* Minimal Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#27272A] text-xs">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors duration-150">
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <Link href="/dashboard" className="text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors duration-150">
              {isAr ? "الأكواد والفحص" : "Codes & Scan"}
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
          <TapTagMataLockup size="sm" />

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
            <div dir="ltr" className="inline-flex items-center gap-2 text-[11px] font-mono text-[#71717A]">
              <span>Dev:</span>
              <a
                href="mailto:mo@matany.one"
                className="text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors"
                title="Mohamed Matany — محمد مطعني"
              >
                Mohamed Matany
              </a>
              <span aria-hidden="true">·</span>
              <a href="https://upstore.one" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFFFFF] transition-colors">
                upstore.one
              </a>
              <a href="https://matany.one" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFFFFF] transition-colors">
                matany.one
              </a>
              <a href="https://e7dar.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFFFFF] transition-colors">
                e7dar.com
              </a>
            </div>

            <div dir="ltr" className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] font-mono select-none">
              <span>Built By</span>
              <a
                href="https://matanygroup.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-sans font-semibold text-[#FFFFFF] hover:opacity-80 transition-opacity duration-150 ease-out"
                title="Matany Group — المطعني جروب"
              >
                <LogoSvgM className="h-3.5 w-auto shrink-0" />
                <span className="tracking-wide">Matany Group</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
