"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Sliders,
  Navigation,
  Crosshair,
  Shield,
  Layers,
  ArrowRight,
  Car,
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
  const router = useRouter();
  const [searchTag, setSearchTag] = useState("");
  const isAr = lang === "ar";

  // Hydrate user's custom card design if they saved one in the studio
  const [userCardDesign, setUserCardDesign] = useState<CardDesignConfig>(DEFAULT_CARD_DESIGN);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUserCardDesign((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim()) return;
    router.push(`/t/${searchTag.trim().toUpperCase()}`);
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 pt-12 pb-8 flex flex-col items-center text-center space-y-8">
      {/* Top Institutional Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-[11px] font-mono select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        <span className="tracking-widest font-semibold">
          {isAr ? "منظومة الهوية الذكية وحماية السيارات" : "SMART VEHICLE IDENTITY PROTOCOL"}
        </span>
      </div>

      {/* Main Title - Pure Authority & High Contrast */}
      <div className="space-y-3 max-w-3xl">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.12]">
          {isAr ? (
            <>
              حماية سيارتك بلمسة ذكية واحدة.
              <br />
              <span className="text-zinc-400 font-bold">
                خصوصية مطلقة بدون أي تطبيقات.
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

        <p className="text-xs sm:text-sm font-sans text-zinc-400 max-w-xl mx-auto leading-relaxed">
          {isAr
            ? "بطاقة ذكية أنيقة على زجاج سيارتك. إذا احتاج أحد تحريكها أو في الطوارئ، يلمس البطاقة بهاتفه أو يمسح الكود للتواصل الفوري معك بدون كشف رقمك الشخصي."
            : "Sleek smart card on your windshield. Anyone needing car movement or assistance simply taps to connect instantly without seeing your phone number."}
        </p>
      </div>

      {/* Centerpiece: Photorealistic Card Renderer */}
      <div className="w-full flex flex-col items-center py-2">
        <PhysicalCardRenderer
          config={userCardDesign}
          interactive={true}
          allowFlip={true}
          className="w-full max-w-[420px]"
        />

        {/* Quick Customization Button underneath card */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all shadow-md"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isAr ? "استوديو تخصيص وتصميم البطاقة" : "Card Studio & Customizer"}</span>
          </Link>
          <Link
            href="/dashboard/find"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold hover:bg-zinc-800 transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-zinc-300" />
            <span>{isAr ? "تحديد مكان السيارة" : "Find Vehicle"}</span>
          </Link>
        </div>
      </div>

      {/* Direct Tag Search Form */}
      <div className="w-full max-w-lg space-y-3 pt-2">
        <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value.toUpperCase())}
              placeholder={
                isAr
                  ? "أدخل معرّف البطاقة أو رقم اللوحة (مثال: MW-88219-X)..."
                  : "Enter Tag Serial UID (e.g. MW-88219-X)..."
              }
              className="w-full bg-[#0C0C0E] border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors uppercase tracking-wider text-right"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute top-3.5 start-3.5 pointer-events-none" />
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-xl border border-white bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer active:scale-95"
          >
            {isAr ? "فحص البطاقة" : "Inspect Tag"}
          </button>
        </form>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          <Link
            href="/demo/activate"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60 text-zinc-200 text-xs font-mono transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isAr ? "تفعيل كارت جديد بالبصمة" : "Activate Card"}</span>
          </Link>

          <Link
            href="/dashboard/calibrate"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60 text-zinc-200 text-xs font-mono transition-all"
          >
            <Crosshair className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isAr ? "معايرة موقع السيارة" : "Calibrate Stance"}</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60 text-zinc-200 text-xs font-mono transition-all"
          >
            <Car className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isAr ? "لوحة سياراتي" : "My Vehicles"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
