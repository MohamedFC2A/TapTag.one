"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ExecutiveHero } from "@/components/luxury/ExecutiveHero";
import { HardwareSpecsBar } from "@/components/luxury/HardwareSpecsBar";
import { ProtocolGrid } from "@/components/luxury/ProtocolGrid";
import { LiveOperationsConsole } from "@/components/luxury/LiveOperationsConsole";
import { MenuBar, MenuBarItem } from "@/components/ui/animated-menu-bar";
import { Language } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ar");
  const [activeMenuItem, setActiveMenuItem] = useState<MenuBarItem>("dashboard");
  const isAr = lang === "ar";

  const handleMenuSelect = (item: MenuBarItem) => {
    setActiveMenuItem(item);
    if (item === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (item === "notifications") {
      document.getElementById("live-simulator")?.scrollIntoView({ behavior: "smooth" });
    } else if (item === "settings") {
      router.push("/admin/qr-engine");
    } else if (item === "help") {
      document.getElementById("pillars-section")?.scrollIntoView({ behavior: "smooth" });
    } else if (item === "security") {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col relative overflow-hidden selection:bg-[#00C853] selection:text-black ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Precision Micro-Grid Horizon (Flat, Zero-Glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* Header */}
      <Header lang={lang} onLanguageChange={setLang} />

      {/* Main Content Sections */}
      <main className="flex-1 relative z-10 w-full flex flex-col items-center">
        {/* 1. Executive Hero with Physical Acrylic Tag */}
        <ExecutiveHero lang={lang} />

        {/* 2. Automotive & Defense Hardware Specs Ribbon */}
        <HardwareSpecsBar lang={lang} />

        {/* 3. 4-Quadrant Institutional Security Architecture */}
        <ProtocolGrid lang={lang} />

        {/* 4. Live Operations & Telemetry Dispatch Console */}
        <LiveOperationsConsole lang={lang} />

        {/* 5. Minimalist Command Dock */}
        <div className="sticky bottom-6 z-40 flex justify-center w-full px-4 pointer-events-auto py-2">
          <MenuBar
            active={activeMenuItem}
            onSelect={handleMenuSelect}
            lang={lang}
          />
        </div>
      </main>

      {/* Official Footer with Matany Group Signature */}
      <Footer lang={lang} />
    </div>
  );
}
