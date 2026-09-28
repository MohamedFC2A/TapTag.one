"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Shield, Fingerprint, ArrowRight, ArrowLeft, Terminal } from "lucide-react";
import { Language } from "@/types";
import { PhysicalAcrylicArtifact } from "./PhysicalAcrylicArtifact";

interface ExecutiveHeroProps {
  lang: Language;
}

export function ExecutiveHero({ lang }: ExecutiveHeroProps) {
  const router = useRouter();
  const [searchTag, setSearchTag] = useState("");
  const isAr = lang === "ar";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim()) return;
    router.push(`/t/${searchTag.trim().toUpperCase()}`);
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 pt-16 pb-12 flex flex-col items-center text-center space-y-8">
      {/* Top Institutional Status Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-[#060608] text-zinc-300 text-[11px] font-mono select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
        <span className="tracking-widest font-semibold">
          {isAr ? "المنظومة الوطنية المعتمدة • NFC & QR PROTOCOL" : "SMART VEHICLE IDENTITY PROTOCOL"}
        </span>
      </div>

      {/* Main Title - Pure Authority & High Contrast */}
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

        <p className="text-xs sm:text-sm font-mono text-zinc-400 max-w-lg mx-auto leading-relaxed">
          {isAr
            ? "بروتوكول وطني مشفر لحماية المركبات • خصوصية مطلقة بدون تطبيقات"
            : "National Encrypted Protocol • Zero-Knowledge • Zero Friction"}
        </p>
      </div>

      {/* Direct UID Verification Console & Triggers */}
      <div className="w-full max-w-lg space-y-3">
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
              className="w-full bg-[#060608] border border-white/20 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C853] transition-colors uppercase tracking-wider"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute top-3.5 end-3.5 pointer-events-none" />
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-xl border border-white bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer active:scale-95"
          >
            {isAr ? "فحص البطاقة" : "Inspect Tag"}
          </button>
        </form>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/dashboard/activate"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 hover:border-white/40 bg-black text-white text-xs font-mono font-semibold transition-all active:scale-95"
          >
            <Fingerprint className="w-3.5 h-3.5 text-[#00C853]" />
            <span>{isAr ? "تفعيل بالبصمة" : "Biometric Claim"}</span>
          </Link>

          <Link
            href="/t/TT-88219-X"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00C853]/40 bg-[#00C853]/10 text-white hover:bg-[#00C853]/20 text-xs font-mono font-semibold transition-all active:scale-95"
          >
            <Shield className="w-3.5 h-3.5 text-[#00C853]" />
            <span>{isAr ? "البوابة الحية (تجربة حية)" : "Live Gateway Demo"}</span>
          </Link>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/50 bg-[#060608] hover:bg-zinc-900 text-white text-xs font-mono font-semibold transition-all active:scale-95"
          >
            <Terminal className="w-3.5 h-3.5 text-[#00C853]" />
            <span>{isAr ? "مركز القيادة (Admin)" : "Admin Hub"}</span>
          </Link>
        </div>
      </div>

      {/* The Physical Acrylic Card Artifact (Centerpiece) */}
      <div className="pt-4 w-full flex justify-center">
        <PhysicalAcrylicArtifact tagUid="TT-88219-X" />
      </div>
    </section>
  );
}
