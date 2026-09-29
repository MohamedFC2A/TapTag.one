"use client";

import React, { useId } from "react";
import Link from "next/link";
import { ArrowUp, ShieldCheck } from "lucide-react";
import { Language } from "@/types";

/**
 * Official 3D Faceted Architectural M Emblem of Matany Group
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
    <footer className="w-full border-t border-white/[0.08] glass-surface mt-16 py-10 px-4 text-xs text-zinc-400">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Quick Navigation Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.06] font-mono text-xs">
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              {isAr ? "لوحة سياراتي" : "Dashboard"}
            </Link>
            <Link href="/dashboard/activate" className="text-zinc-400 hover:text-white transition-colors">
              {isAr ? "تفعيل بطاقة" : "Activate"}
            </Link>
            <Link href="/admin/qr-engine" className="text-zinc-400 hover:text-white transition-colors">
              {isAr ? "استوديو البطاقات" : "Studio"}
            </Link>
            <Link href="/dashboard/find" className="text-zinc-400 hover:text-white transition-colors">
              {isAr ? "أين سيارتي؟" : "Find Vehicle"}
            </Link>
            <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              {isAr ? "مركز الإدارة" : "Admin"}
            </Link>
          </div>

          {/* Scroll To Top */}
          <button
            onClick={scrollToTop}
            className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-1.5 text-xs text-zinc-300 font-mono cursor-pointer"
          >
            <span>{isAr ? "للأعلى" : "Top"}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Brand System Notice */}
          <div className="flex items-center gap-2.5 text-center sm:text-start">
            <div className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03]">
              <ShieldCheck className="w-4 h-4 text-white shrink-0" />
            </div>
            <span className="font-mono text-xs text-zinc-300">
              {isAr
                ? "منظومة TapTag.one • هوية المركبات وحمايتها بالـ NFC المشفر بدون تطبيقات"
                : "TapTag.one • Smart NFC/QR Identity & Vehicle Protection"}
            </span>
          </div>

          {/* Built by Matany Group with Official 3D M Emblem */}
          <div dir="ltr" className="inline-flex items-center gap-2 text-xs text-zinc-400 font-mono select-none">
            <span>Built by</span>
            <a
              href="https://matanygroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-white hover:text-zinc-200 transition-colors group cursor-pointer"
              title="MATANY GROUP"
            >
              <LogoSvgM className="h-3.5 w-auto shrink-0 group-hover:scale-105 transition-transform" />
              <span className="tracking-wide text-white group-hover:text-zinc-200 transition-colors">Matany Group</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
