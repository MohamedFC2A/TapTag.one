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
      href: "/dashboard",
      label: isAr ? "لوحة سياراتي" : "My Vehicles",
      active: pathname === "/dashboard",
    },
    {
      href: "/admin/qr-engine",
      label: isAr ? "استوديو تصميم البطاقات" : "Card Studio",
      active: pathname.startsWith("/admin/qr-engine"),
    },
    {
      href: "/dashboard/find",
      label: isAr ? "تحديد مكان السيارة" : "Find Vehicle",
      active: pathname.startsWith("/dashboard/find"),
    },
    {
      href: "/dashboard/calibrate",
      label: isAr ? "معايرة السيارة" : "Calibrate",
      active: pathname.startsWith("/dashboard/calibrate"),
    },
    {
      href: "/demo/activate",
      label: isAr ? "تفعيل كارت بالبصمة" : "Activate Card",
      active: pathname.startsWith("/demo/activate"),
    },
    {
      href: "/admin",
      label: isAr ? "مركز الإدارة" : "Admin Hub",
      active: pathname === "/admin",
    },
  ];

  return (
    <header className="w-full border-b border-zinc-800 bg-[#000000] sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
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

        {/* Center Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-[#09090B] px-2 py-1 rounded-xl border border-zinc-800">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                link.active
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Subtle Institutional Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[10px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="font-semibold">TAPTAG PROTOCOL</span>
          </div>

          {/* Center / Tag UID Badge if on tag page */}
          {tagUid && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-800 bg-[#0C0C0E]">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
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
