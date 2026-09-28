"use client";

import React from "react";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { Language } from "@/types";
import { translations } from "@/lib/translations";
import { LanguageToggle } from "./LanguageToggle";
import { TapTagLogo } from "./TapTagLogo";

interface HeaderProps {
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  tagUid?: string;
}

export function Header({ lang, onLanguageChange = () => {}, tagUid }: HeaderProps) {
  const t = translations[lang];

  return (
    <header className="w-full border-b border-white/10 bg-[#000000] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Seal */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <TapTagLogo
              subtitle={t.brandSub}
              showSubtitle={true}
              size="md"
            />
          </Link>
        </div>

        {/* Center / Tag UID Badge if on tag page */}
        {tagUid && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded border border-white/15 bg-[#08080A]">
            <Cpu className="w-3.5 h-3.5 text-[#00C853]" />
            <span className="text-xs text-white font-mono font-bold tracking-wider">
              {tagUid}
            </span>
          </div>
        )}

        {/* Navigation & Controls */}
        <div className="flex items-center gap-4">
          {/* Admin links visible ONLY locally during development */}
          {process.env.NODE_ENV !== "production" && (
            <nav className="hidden sm:flex items-center gap-4 text-xs font-mono text-zinc-400">
              <Link
                href="/dashboard"
                className="hover:text-white transition-colors"
              >
                {lang === "ar" ? "لوحة الأسطول" : "Dashboard"}
              </Link>
              <Link
                href="/admin/qr-engine"
                className="hover:text-white text-zinc-300 transition-colors flex items-center gap-1.5 text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                <span>{lang === "ar" ? "مصنع البطاقات" : "Factory Mint"}</span>
              </Link>
            </nav>
          )}

          <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />
        </div>
      </div>
    </header>
  );
}
