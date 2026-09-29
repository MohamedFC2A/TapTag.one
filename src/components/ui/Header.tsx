"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, X, Shield, ShieldCheck } from "lucide-react";
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
      label: isAr ? "استوديو البطاقة" : "Card Studio",
      active: pathname.startsWith("/admin/qr-engine") || pathname.startsWith("/studio"),
    },
    {
      href: "/scan",
      label: isAr ? "مسح البطاقة" : "Scan Tag",
      active: pathname === "/scan",
    },
  ];

  const secondaryLinks = [
    {
      href: "/dashboard/find",
      label: isAr ? "تحديد مكان السيارة" : "Find Vehicle",
      active: pathname.startsWith("/dashboard/find"),
    },
    {
      href: "/admin",
      label: isAr ? "مركز الإدارة" : "Admin Hub",
      active: pathname === "/admin",
    },
  ];

  return (
    <div className="w-full sticky top-3 z-50 px-3 sm:px-6 select-none">
      <header className="max-w-6xl mx-auto glass-surface-elevated rounded-2xl border border-white/[0.10] px-4 sm:px-5 h-16 flex items-center justify-between transition-all">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <TapTagLogo
              showSubtitle={false}
              size="md"
            />
          </Link>
        </div>

        {/* Center Desktop Navigation Bar (Clean & Focused) */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] px-1.5 py-1 rounded-xl border border-white/[0.06]">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
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
        <div className="flex items-center gap-2.5">
          {/* Tag UID Badge if on tag page */}
          {tagUid && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.10] bg-black/50">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs text-white font-mono font-bold tracking-wider tabular-nums">
                {tagUid}
              </span>
            </div>
          )}

          {/* Primary Action Button */}
          <Link
            href="/dashboard/activate"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            <span>{isAr ? "تفعيل بطاقة" : "Activate Tag"}</span>
          </Link>

          {/* Language Switcher */}
          <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-white/[0.10] bg-white/[0.03] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-zinc-300" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-6xl mx-auto glass-surface-elevated rounded-2xl border border-white/[0.10] p-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/dashboard/activate"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white text-black font-bold text-xs mb-2"
          >
            <span>{isAr ? "تفعيل بطاقة جديدة" : "Activate New Card"}</span>
            <ShieldCheck className="w-4 h-4 text-black" />
          </Link>
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-xl text-xs font-mono transition-colors text-start ${
                link.active
                  ? "bg-white/[0.1] text-white font-bold"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/[0.06] space-y-1">
            {secondaryLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition-colors text-start"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
