"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, X, Shield, Terminal, Layers, LayoutDashboard, Printer } from "lucide-react";
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
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAr = lang === "ar";
  const t = translations[lang];

  const navLinks = [
    {
      href: "/",
      label: isAr ? "الرئيسية" : "Home",
      active: pathname === "/",
    },
    {
      href: "/#pillars-section",
      label: isAr ? "المعمارية الأمنية" : "Architecture",
      active: false,
    },
    {
      href: "/#live-simulator",
      label: isAr ? "غرفة العمليات" : "Operations",
      active: false,
    },
    {
      href: "/dashboard",
      label: isAr ? "لوحة الأسطول" : "Fleet Dashboard",
      active: pathname.startsWith("/dashboard"),
    },
    {
      href: "/admin",
      label: isAr ? "مركز الإدارة (Admin)" : "Admin Hub",
      active: pathname === "/admin",
    },
    {
      href: "/admin/qr-engine",
      label: isAr ? "استوديو الطباعة والسك" : "Print Studio",
      active: pathname.startsWith("/admin/qr-engine"),
    },
  ];

  return (
    <header className="w-full border-b border-white/10 bg-[#000000] sticky top-0 z-50 select-none">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <TapTagLogo
              subtitle={t.brandSub}
              showSubtitle={true}
              size="md"
            />
          </Link>
        </div>

        {/* Center Desktop Navigation Bar (Positioned Top as Requested) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#060608] px-2 py-1 rounded-lg border border-white/10">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                link.active
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Active Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#00C853]/30 bg-[#00C853]/10 text-[10px] font-mono text-[#00C853]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
            <span className="font-bold">SYSTEM ONLINE</span>
          </div>

          {/* Center / Tag UID Badge if on tag page */}
          {tagUid && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded border border-white/15 bg-[#08080A]">
              <Cpu className="w-3.5 h-3.5 text-[#00C853]" />
              <span className="text-xs text-white font-mono font-bold tracking-wider">
                {tagUid}
              </span>
            </div>
          )}

          {/* Language Switcher */}
          <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Only on small screens, never overlaps footer on desktop) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#060608] px-4 py-4 space-y-2">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded text-xs font-mono transition-colors text-start ${
                link.active
                  ? "bg-white text-black font-bold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
