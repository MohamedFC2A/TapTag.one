"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, X, ShieldCheck } from "lucide-react";
import { Language } from "@/types";
import { LanguageToggle } from "./LanguageToggle";
import { TapTagLogo } from "./TapTagLogo";

interface HeaderProps {
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  tagUid?: string;
}

export function Header({ lang, onLanguageChange = () => {}, tagUid }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAr = lang === "ar";

  const navLinks = [
    {
      href: "/",
      label: isAr ? "إنشاء QR" : "QR Studio",
      active: pathname === "/",
    },
    {
      href: "/dashboard",
      label: isAr ? "إدارة الأكواد" : "My QRs",
      active: pathname === "/dashboard",
    },
    {
      href: "/scan",
      label: isAr ? "فحص ومَسح" : "Scanner",
      active: pathname === "/scan",
    },
  ];

  return (
    <div className="hw-no-print w-full sticky top-0 z-50 bg-[#09090B] border-b border-[#27272A] select-none">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Monogram & Wordmark */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <TapTagLogo showSubtitle={false} size="md" />
          </Link>
        </div>

        {/* Center Hardware Nav Rail */}
        <nav
          aria-label={isAr ? "التنقل الرئيسي" : "Primary navigation"}
          className="hidden md:flex items-center gap-1 bg-[#121215] p-1 rounded-xl border border-[#27272A]"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-150 ease-out ${
                link.active
                  ? "bg-[#FFFFFF] text-[#09090B] font-bold"
                  : "text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1F1F23]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {tagUid && (
            <div className="hidden sm:flex items-center gap-2 h-9 px-2.5 rounded-lg border border-[#27272A] bg-[#121215]">
              <Cpu className="w-3.5 h-3.5 text-[#A1A1AA]" />
              <span className="text-xs text-[#FFFFFF] font-mono font-bold tracking-wider tabular-nums">
                {tagUid}
              </span>
            </div>
          )}

          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#09090B] hover:text-[#FFFFFF] transition-all duration-150 ease-out cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? "الأكواد النشطة" : "Dashboard"}</span>
          </Link>

          <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FAFAFA] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 ease-out cursor-pointer"
            aria-label="Toggle Navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#27272A] bg-[#09090B] px-4 py-3 space-y-1.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider border transition-colors duration-150 text-start ${
                link.active
                  ? "bg-[#121215] border-[#FFFFFF] text-[#FFFFFF] font-bold"
                  : "border-transparent text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#121215]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
