"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  PlusCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Zap,
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
      className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col relative overflow-hidden selection:bg-white selection:text-black ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* 21st.dev Aceternity Spotlight Lighting */}
      <Spotlight
        className="-top-40 start-1/2 -translate-x-1/2 md:-top-20"
        fill="white"
      />

      {/* Atmospheric Micro-Dot Matrix Background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* Header */}
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 w-full flex flex-col items-center">
        {/* ========================================================================= */}
        {/* HERO SECTION: MONOCHROME LUXURY ATMOSPHERE                                */}
        {/* ========================================================================= */}
        <section className="w-full max-w-5xl mx-auto px-4 pt-16 pb-12 flex flex-col items-center text-center space-y-8">
          {/* Top Floating Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 text-xs font-mono backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,0.04)]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="tracking-wide">
              {isAr ? "المنظومة الوطنية المعتمدة • NFC & QR PROTOCOL" : "SMART VEHICLE IDENTITY PROTOCOL"}
            </span>
          </div>

          {/* Main Title */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.15]">
              {isAr ? (
                <>
                  حماية المركبات بلمسة ذكية واحدة.
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                    خصوصية مطلقة بدون تطبيقات.
                  </span>
                </>
              ) : (
                <>
                  Vehicle Protection at a Single Touch.
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                    Zero-Knowledge. Zero Friction.
                  </span>
                </>
              )}
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {isAr
                ? "بروتوكول وطني مشفر يربط بطاقات الأكريليك المادية بأنظمة التنبيه الفوري للمركبات ومكالمات VoIP الصوتية مع حجب تام لكافة بيانات وأرقام هواتف الملاك."
                : "A cryptographically secured protocol connecting physical acrylic tags with instant multi-channel dispatch, encrypted VoIP audio bridges, and zero-knowledge owner privacy."}
            </p>
          </div>

          {/* Direct Tag Lookup & Action Buttons */}
          <div className="w-full max-w-xl space-y-4 pt-2">
            <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value.toUpperCase())}
                  placeholder={
                    isAr
                      ? "أدخل معرّف البطاقة للتحقق الفوري (مثال: TT-88219-X)..."
                      : "Enter Tag Serial UID (e.g. TT-88219-X)..."
                  }
                  className="w-full bg-[#08080A]/80 border border-white/15 rounded-xl px-4 py-3.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all uppercase backdrop-blur-xl"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute top-4 end-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                className="px-6 py-3.5 rounded-xl border border-white bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
              >
                {isAr ? "التحقق والمسح" : "Inspect Tag"}
              </button>
            </form>

            {/* Quick Action Navigation Buttons with 21st.dev AntiMetalButton */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
              <Link href="/dashboard/activate" className="transition-transform active:scale-95">
                <AntiMetalButton
                  label={isAr ? "تفعيل بالبصمة" : "Activate Tag"}
                  accentFrom="#FFFFFF"
                  accentTo="#D4D4D8"
                  dotColor="#000000"
                  className="w-44 h-11"
                />
              </Link>

              <Link href="/t/TT-88219-X" className="transition-transform active:scale-95">
                <AntiMetalButton
                  label={isAr ? "البوابة الحية" : "Live Demo"}
                  accentFrom="#71717A"
                  accentTo="#27272A"
                  dotColor="#FFFFFF"
                  className="w-40 h-11"
                />
              </Link>

              <Link href="/demo" className="transition-transform active:scale-95">
                <AntiMetalButton
                  label={isAr ? "مختبر التصميم" : "Component Lab"}
                  accentFrom="#E4E4E7"
                  accentTo="#A1A1AA"
                  dotColor="#09090B"
                  className="w-44 h-11"
                />
              </Link>
            </div>
          </div>

          {/* Floating 3D Acrylic Card Hologram Presentation */}
          <div className="pt-6 w-full flex justify-center">
            <AcrylicCardHolo tagUid="TT-88219-X" />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 21st.dev BENTO GRID: THE 5 STRATEGIC PILLARS                             */}
        {/* ========================================================================= */}
        <BentoGridShowcase lang={lang} />

        {/* ========================================================================= */}
        {/* INTERACTIVE LIVE DISPATCH SIMULATOR                                      */}
        {/* ========================================================================= */}
        <LiveSimulator lang={lang} />

        {/* ========================================================================= */}
        {/* LOCAL DEV / ADMIN CONTROLS (RENDERED ONLY ON LOCAL MACHINE)             */}
        {/* ========================================================================= */}
        {process.env.NODE_ENV !== "production" && (
          <section className="w-full max-w-5xl mx-auto px-4 py-8">
            <div className="border border-dashed border-zinc-700 rounded-2xl p-6 bg-[#08080A]/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>
                  {isAr
                    ? "أدوات الإدارة والطباعة (محلي فقط - مخفية كلياً في الموقع العام)"
                    : "LOCAL ADMIN TOOLS (HIDDEN IN PRODUCTION)"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/dashboard"
                  className="p-4 rounded-xl border border-white/10 bg-[#0E0E12] hover:border-white/30 transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">
                      {isAr ? "لوحة الأسطول ومراقبة البلاغات" : "Fleet Dashboard"}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {isAr ? "متابعة الحالات التشغيلية ومسار التدقيق" : "Monitor tags and incident audit logs"}
                    </p>
                  </div>
                  {isAr ? (
                    <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  )}
                </Link>
                <Link
                  href="/admin/qr-engine"
                  className="p-4 rounded-xl border border-white/10 bg-[#0E0E12] hover:border-white/30 transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">
                      {isAr ? "مصنع بطاقات الأكريليك (7×5 سم)" : "7x5 cm Print Studio"}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {isAr ? "تصدير أصول SVG و 300 DPI للطباعة والليزر" : "Export SVG and 300 DPI print assets"}
                    </p>
                  </div>
                  {isAr ? (
                    <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  )}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Floating Animated Navigation Dock (21st.dev Dynamic Menu Bar) */}
        <div className="sticky bottom-6 z-40 flex justify-center w-full px-4 pointer-events-auto py-2">
          <div className="shadow-[0_10px_35px_rgba(0,0,0,0.8)] rounded-2xl bg-black/80 backdrop-blur-2xl p-1.5 border border-white/15">
            <MenuBar
              active={activeMenuItem}
              onSelect={handleMenuSelect}
              lang={lang}
            />
          </div>
        </div>
      </main>

      {/* Official Footer with Matany Group Signature */}
      <Footer lang={lang} />
    </div>
  );
}
