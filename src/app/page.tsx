"use client";

import React, { useState } from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ExecutiveHero } from "@/components/luxury/ExecutiveHero";
import { HardwareSpecsBar } from "@/components/luxury/HardwareSpecsBar";
import { ProtocolGrid } from "@/components/luxury/ProtocolGrid";
import { LiveOperationsConsole } from "@/components/luxury/LiveOperationsConsole";
import { Language } from "@/types";

export default function HomePage() {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  return (
    <div
      className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col relative overflow-hidden selection:bg-[#00C853] selection:text-black ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Precision Micro-Grid Horizon (Flat, Zero-Glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* Official Executive Header with Top Navigation */}
      <Header lang={lang} onLanguageChange={setLang} />

      {/* Main Content Sections (Clean Flow, Zero Overlap) */}
      <main className="flex-1 relative z-10 w-full flex flex-col items-center">
        {/* 1. Executive Hero with Physical Acrylic Tag */}
        <ExecutiveHero lang={lang} />

        {/* 2. Automotive & Defense Hardware Specs Ribbon */}
        <HardwareSpecsBar lang={lang} />

        {/* 3. 4-Quadrant Institutional Security Architecture */}
        <ProtocolGrid lang={lang} />

        {/* 4. Live Operations & Telemetry Dispatch Console */}
        <LiveOperationsConsole lang={lang} />
      </main>

      {/* Official Footer with Matany Group Signature */}
      <Footer lang={lang} />
    </div>
  );
}
