"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, X } from "lucide-react";
import { Language } from "@/types";
import { LanguageToggle } from "./LanguageToggle";
import { TapTagMataLockup } from "./TapTagLogo";
import { dispatchFocusSection } from "@/lib/mata-events";

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
      filter: "ALL" as const,
      label: isAr ? "الرئيسية" : "Home",
      active: pathname === "/",
    },
    {
      href: "/dashboard",
      label: isAr ? "الأكواد والفحص" : "Codes & Scan",
      active: pathname === "/dashboard" || pathname === "/scan",
    },
  ];

  return (
    <div className="hw-no-print w-full sticky top-0 z-50 bg-[#09090B]/95 backdrop-blur-sm border-b border-[#27272A] select-none">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Official Frameless Collaboration Lockup: taptag. | Mata AI */}
        <div className="flex items-center shrink-0">
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                dispatchFocusSection("ALL");
              }
            }}
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            <TapTagMataLockup size="md" />
          </Link>
        </div>

        {/* Minimal Essential Navigation */}
        <nav
          aria-label={isAr ? "التنقل الرئيسي" : "Primary navigation"}
          className="hidden md:flex items-center gap-1 bg-[#121215] p-1 rounded-xl border border-[#27272A]"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => {
                if (link.filter && pathname === "/") {
                  e.preventDefault();
                  dispatchFocusSection(link.filter);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 ease-out whitespace-nowrap ${
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
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (link.filter && pathname === "/") {
                  e.preventDefault();
                  dispatchFocusSection(link.filter);
                }
              }}
              className={`block px-3.5 py-2.5 rounded-lg text-xs font-medium border transition-colors duration-150 text-start ${
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
