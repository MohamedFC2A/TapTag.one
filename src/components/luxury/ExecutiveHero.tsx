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
            ? "بطاقة أكريليك ذكية على زجاج سيارتك تتيح لأي شخص تنبيهك أو الاتصال بك عند الحاجة — دون كشف رقم هاتفك نهائياً، وبدون أي تطبيقات."
            : "A sleek smart card for your windshield. Instant encrypted contact for parking alerts and emergencies — without exposing your phone number, and zero apps required."}
        </p>

        {/* Smart Concept 3-Step Flow: Tap -> Tag -> One */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <strong className="text-white">1. Tap</strong>
            <span className="text-zinc-400">{isAr ? "لمس بالهاتف أو مسح QR" : "Phone Tap or QR"}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <strong className="text-white">2. Tag</strong>
            <span className="text-zinc-400">{isAr ? "بطاقة أكريليك على الزجاج" : "Acrylic Tag on Glass"}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <strong className="text-white">3. One</strong>
            <span className="text-zinc-400">{isAr ? "تواصل مشفر بدون كشف رقمك" : "Masked Direct Alert"}</span>
          </div>
        </div>
      </div>

      {/* Centerpiece: Photorealistic Card Renderer Inside a Glass Showcase Pedestal */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-lg glass-surface p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-glass relative flex flex-col items-center">
          {/* Subtle top indicator */}
          <div className="flex items-center justify-between w-full mb-3 px-2 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
              {isAr ? "معاينة البطاقة التفاعلية 3D" : "3D Interactive Specimen"}
            </span>
            <span className="text-zinc-500">70×50mm ACRYLIC</span>
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

      {/* Primary Conversion CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/dashboard/activate"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all shadow-glass active:scale-95 cursor-pointer"
        >
          <Shield className="w-4 h-4 text-black" />
          <span>{isAr ? "تفعيل واقتران بطاقة جديدة" : "Activate Your Card"}</span>
        </Link>

        <Link
          href="/scan"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass-card text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 font-bold text-xs transition-all shadow-glass cursor-pointer active:scale-95"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>{isAr ? "مسح البطاقة (كاميرا QR أو NFC)" : "Scan Tag (Camera QR / NFC)"}</span>
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass-card text-white font-bold text-xs hover:border-white/20 transition-all cursor-pointer"
        >
          <Car className="w-4 h-4 text-zinc-300" />
          <span>{isAr ? "لوحة إدارة سياراتي" : "My Vehicles Dashboard"}</span>
        </Link>
      </div>
    </section>
  );
}
