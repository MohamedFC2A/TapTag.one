"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Cpu } from "lucide-react";
import { Language } from "@/types";
import { translations } from "@/lib/translations";
import { LanguageToggle } from "./LanguageToggle";

interface HeaderProps {
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  tagUid?: string;
}

export function Header({ lang, onLanguageChange = () => {}, tagUid }: HeaderProps) {
  const t = translations[lang];

  return (
    <header className="w-full border-b border-[#1C1C1F] bg-[#000000] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Seal */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg border border-[#00C853]/40 bg-[#00C853]/10 flex items-center justify-center text-[#00C853] font-bold">
              <ShieldCheck className="w-5 h-5 text-[#00C853]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white tracking-wide">
                  {t.brand}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#27272A] bg-[#0E0E12] text-zinc-300 font-semibold">
                  ENTERPRISE
                </span>
              </div>
              <span className="text-[11px] text-[#A1A1AA] hidden sm:block">
                {t.brandSub}
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Tag UID Badge if on tag page */}
        {tagUid && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md border border-[#1F2228] bg-[#090A0D]">
            <Cpu className="w-3.5 h-3.5 text-[#00C853]" />
            <span className="text-xs text-white font-mono font-bold tracking-wider">
              {tagUid}
            </span>
          </div>
        )}

        {/* Navigation & Controls */}
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-5 text-xs font-semibold text-[#A1A1AA]">
            <Link
              href="/dashboard"
              className="hover:text-white transition-colors"
            >
              {lang === "ar" ? "لوحة الأسطول" : "Dashboard"}
            </Link>
            <Link
              href="/admin/qr-engine"
              className="hover:text-white text-[#D4D4D8] transition-colors flex items-center gap-1.5 font-mono text-[11px]"
            >
              <span className="w-2 h-2 rounded-full bg-[#00C853]" />
              <span>{lang === "ar" ? "مصنع البطاقات (محلي)" : "Factory Mint (Local)"}</span>
            </Link>
          </nav>

          <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />
        </div>
      </div>
    </header>
  );
}
