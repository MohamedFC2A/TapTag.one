"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { Spotlight } from "@/components/ui/Spotlight";
import { AcrylicCardHolo } from "@/components/ui/AcrylicCardHolo";
import { BentoGridShowcase } from "@/components/ui/BentoGridShowcase";
import { LiveSimulator } from "@/components/ui/LiveSimulator";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
import { MenuBar, MenuBarItem } from "@/components/ui/animated-menu-bar";
import { Language } from "@/types";
import { translations } from "@/lib/translations";

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ar");
  const [searchTag, setSearchTag] = useState("");
  const [activeMenuItem, setActiveMenuItem] = useState<MenuBarItem>("dashboard");
  const isAr = lang === "ar";
  const t = translations[lang];

  const handleMenuSelect = (item: MenuBarItem) => {
    setActiveMenuItem(item);
    if (item === "dashboard") {
      router.push("/dashboard");
    } else if (item === "notifications") {
      document.getElementById("live-simulator")?.scrollIntoView({ behavior: "smooth" });
    } else if (item === "settings") {
      router.push("/admin/qr-engine");
    } else if (item === "help") {
      document.getElementById("pillars-section")?.scrollIntoView({ behavior: "smooth" });
    } else if (item === "security") {
      router.push("/demo");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim()) return;
    router.push(`/t/${searchTag.trim().toUpperCase()}`);
  };

  return (
    <div
      className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col relative overflow-hidden selection:bg-[#00C853] selection:text-black ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Precision Optical Architectural Sheen (Zero-Blur / Zero-Glowing) */}
      <Spotlight
        className="top-0 start-1/2 -translate-x-1/2"
        fill="white"
      />

      {/* Atmospheric Micro-Dot Matrix Background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* Header */}
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 w-full flex flex-col items-center">
        {/* ========================================================================= */}
        {/* HERO SECTION: EXECUTIVE LUXURY (BLACK, WHITE & EMERALD)                  */}
        {/* ========================================================================= */}
        <section className="w-full max-w-5xl mx-auto px-4 pt-14 pb-10 flex flex-col items-center text-center space-y-7">
          {/* Top Institutional Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-[#08080A] text-zinc-300 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <span className="tracking-wider">
              {isAr ? "المنظومة الوطنية المعتمدة • NFC & QR PROTOCOL" : "SMART VEHICLE IDENTITY PROTOCOL"}
            </span>
          </div>

          {/* Main Title - Concise & Powerful */}
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.12]">
              {isAr ? (
                <>
                  حماية المركبات بلمسة ذكية واحدة.
                  <br />
                  <span className="text-zinc-400 font-bold">
                    خصوصية مشفرة بدون تطبيقات.
                  </span>
                </>
              ) : (
                <>
                  Vehicle Protection at a Single Touch.
                  <br />
                  <span className="text-zinc-400 font-bold">
                    Zero-Knowledge. Zero Friction.
                  </span>
                </>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              {isAr
                ? "بروتوكول مشفر يربط بطاقات الأكريليك بأنظمة التنبيه الفوري ومكالمات VoIP الصوتية مع حظر تام لكافة أرقام الهواتف."
                : "A cryptographically secured protocol connecting physical acrylic tags with instant multi-channel alerts and masked VoIP."}
            </p>
          </div>

          {/* Direct Tag Lookup & Action Triggers */}
          <div className="w-full max-w-lg space-y-3 pt-1">
            <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value.toUpperCase())}
                  placeholder={
                    isAr
                      ? "أدخل معرّف البطاقة (مثال: TT-88219-X)..."
                      : "Enter Tag Serial UID (e.g. TT-88219-X)..."
                  }
                  className="w-full bg-[#08080A] border border-white/15 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C853] transition-all uppercase"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute top-3.5 end-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                className="px-5 py-3 rounded-xl border border-white bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer active:scale-95"
              >
                {isAr ? "تحقق ومسح" : "Inspect Tag"}
              </button>
            </form>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/dashboard/activate" className="transition-transform active:scale-95">
                <AntiMetalButton
                  label={isAr ? "تفعيل بالبصمة" : "Activate Tag"}
                  accentFrom="#FFFFFF"
                  accentTo="#D4D4D8"
                  dotColor="#000000"
                  className="w-40 h-10"
                />
              </Link>

              <Link href="/t/TT-88219-X" className="transition-transform active:scale-95">
                <AntiMetalButton
                  label={isAr ? "البوابة الحية" : "Live Demo"}
                  accentFrom="#00C853"
                  accentTo="#059669"
                  dotColor="#FFFFFF"
                  className="w-36 h-10"
                />
              </Link>

              <Link href="/demo" className="transition-transform active:scale-95">
                <AntiMetalButton
                  label={isAr ? "مختبر التصميم" : "Component Lab"}
                  accentFrom="#A1A1AA"
                  accentTo="#71717A"
                  dotColor="#000000"
                  className="w-40 h-10"
                />
              </Link>
            </div>
          </div>

          {/* Precision 3D Acrylic Card Presentation with Laser Sweep */}
          <div className="pt-4 w-full flex justify-center">
            <AcrylicCardHolo tagUid="TT-88219-X" />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5 STRATEGIC ARCHITECTURE PILLARS (ZERO SHADOWS / ZERO GLOW)             */}
        {/* ========================================================================= */}
        <BentoGridShowcase lang={lang} />

        {/* ========================================================================= */}
        {/* INTERACTIVE TELEMETRY & LIVE DISPATCH SIMULATOR                          */}
        {/* ========================================================================= */}
        <LiveSimulator lang={lang} />

        {/* ========================================================================= */}
        {/* LOCAL DEV CONTROLS (COMPACT & CLEAN)                                      */}
        {/* ========================================================================= */}
        {process.env.NODE_ENV !== "production" && (
          <section className="w-full max-w-5xl mx-auto px-4 py-6">
            <div className="border border-white/10 rounded-xl p-4 bg-[#08080A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                <span>
                  {isAr
                    ? "أدوات الإدارة والطباعة المحلية (بيئة التطوير فقط)"
                    : "LOCAL ADMIN INSTRUMENTS (DEVELOPMENT ONLY)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-lg border border-white/15 bg-black hover:border-white/30 text-white font-mono text-[11px] transition-all"
                >
                  {isAr ? "لوحة الأسطول" : "Fleet Dashboard"}
                </Link>
                <Link
                  href="/admin/qr-engine"
                  className="px-3 py-1.5 rounded-lg border border-white/15 bg-black hover:border-white/30 text-white font-mono text-[11px] transition-all"
                >
                  {isAr ? "مصنع البطاقات (7×5)" : "7x5 Print Studio"}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Floating Navigation Dock (Zero Shadows / 1px Hairline Border) */}
        <div className="sticky bottom-6 z-40 flex justify-center w-full px-4 pointer-events-auto py-2">
          <MenuBar
            active={activeMenuItem}
            onSelect={handleMenuSelect}
            lang={lang}
          />
        </div>
      </main>

      {/* Official Footer with Matany Group Architectural M Emblem */}
      <Footer lang={lang} />
    </div>
  );
}
