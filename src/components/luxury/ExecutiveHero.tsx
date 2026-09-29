"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Car,
  QrCode,
} from "lucide-react";
import { Language } from "@/types";
import { PhysicalCardRenderer } from "@/components/card/PhysicalCardRenderer";
import type { CardDesignConfig } from "@/types/card-design";
import { DEFAULT_CARD_DESIGN } from "@/types/card-design";

interface ExecutiveHeroProps {
  lang: Language;
}

const LOCAL_STORAGE_KEY = "taptag_card_customization_v2";

export function ExecutiveHero({ lang }: ExecutiveHeroProps) {
  const isAr = lang === "ar";

  // Hydrate user's custom card design if saved in studio
  const [userCardDesign, setUserCardDesign] = useState<CardDesignConfig>(DEFAULT_CARD_DESIGN);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.logoText === "taptag." || parsed.logoText === "tagtap.one" || !parsed.logoText) {
            parsed.logoText = "taptag.one";
          }
          setUserCardDesign((prev) => ({ ...prev, ...parsed }));
        } else {
          setUserCardDesign((prev) => ({ ...prev, logoText: "taptag.one" }));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <section className="w-full max-w-5xl mx-auto px-4 pt-14 pb-12 flex flex-col items-center text-center space-y-10">
      {/* Main Title - Pure Authority, High Contrast & Smart Concept */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.14]">
          {isAr ? (
            <>
              تواصل مشفر لسيارتك.
              <br />
              <span className="text-zinc-400 font-bold">
                بلمسة ذكية واحدة وبدون تطبيقات.
              </span>
            </>
          ) : (
            <>
              Encrypted Vehicle Contact.
              <br />
              <span className="text-zinc-400 font-bold">
                In a single tap. Zero apps.
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base font-sans text-zinc-400 max-w-xl mx-auto leading-relaxed">
          {isAr
            ? "بطاقة أكريليك ذكية لزجاج سيارتك — تنبيهات مواقف وطوارئ فورية بدون كشف رقمك وبدون تطبيقات."
            : "A sleek smart card for your windshield. Instant encrypted parking alerts — zero apps, zero phone number disclosure."}
        </p>

        {/* Smart Concept 3-Step Flow: Tap -> Tag -> One */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <strong className="text-white">Tap</strong>
            <span className="text-zinc-400">{isAr ? "لمس أو مسح" : "Touch / Scan"}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <strong className="text-white">Tag</strong>
            <span className="text-zinc-400">{isAr ? "بطاقة أكريليك" : "Acrylic Tag"}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
            <strong className="text-white">One</strong>
            <span className="text-zinc-400">{isAr ? "تواصل محمي" : "Masked Alert"}</span>
          </div>
        </div>
      </div>

      {/* Centerpiece: Photorealistic Card Renderer Inside a Glass Showcase Pedestal */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-lg glass-surface p-6 sm:p-8 rounded-3xl border border-white/[0.08] relative flex flex-col items-center">
          {/* Subtle top indicator */}
          <div className="flex items-center justify-between w-full mb-3 px-2 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              {isAr ? "معاينة البطاقة التفاعلية" : "Interactive Specimen"}
            </span>
            <span className="text-zinc-500 font-mono tracking-wider">ACRYLIC • ISO 14443-A</span>
          </div>

          <PhysicalCardRenderer
            config={userCardDesign}
            interactive={true}
            allowFlip={true}
            showFlipButton={false}
            className="w-full max-w-[420px]"
          />
        </div>
      </div>

      {/* Primary Conversion CTAs (Clean, High Contrast, Two Actions Only) */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/dashboard/activate"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
        >
          <Shield className="w-4 h-4 text-black" />
          <span>{isAr ? "تفعيل بطاقة جديدة" : "Activate Tag"}</span>
        </Link>

        <Link
          href="/scan"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/30 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
        >
          <QrCode className="w-4 h-4 text-white" />
          <span>{isAr ? "مسح البطاقة (QR / NFC)" : "Scan Tag (QR / NFC)"}</span>
        </Link>
      </div>
    </section>
  );
}
