"use client";

import React, { useState } from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ExecutiveHero } from "@/components/luxury/ExecutiveHero";
import { ProtocolGrid } from "@/components/luxury/ProtocolGrid";
import { LiveOperationsConsole } from "@/components/luxury/LiveOperationsConsole";
import { Language } from "@/types";

export default function HomePage() {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  return (
    <div
      className={`min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col relative overflow-x-clip ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="fixed inset-0 hw-pixel-grid pointer-events-none" aria-hidden="true" />

      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 w-full flex flex-col">
        <ExecutiveHero lang={lang} />
        <ProtocolGrid lang={lang} />
        <LiveOperationsConsole lang={lang} />
      </main>

      <Footer lang={lang} />
    </div>
  );
}
