"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Radio,
  Lock,
  PhoneCall,
  Fingerprint,
  Layers,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Language } from "@/types";

interface BentoGridShowcaseProps {
  lang: Language;
}

export function BentoGridShowcase({ lang }: BentoGridShowcaseProps) {
  const isAr = lang === "ar";
  const [activeSimulation, setActiveSimulation] = useState<number | null>(null);

  return (
    <section className="w-full py-16 space-y-8">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 text-xs font-mono font-medium backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>{isAr ? "معمارية البروتوكول الذكي" : "SMART PROTOCOL ARCHITECTURE"}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
          {isAr ? "منظومة واحدة. خصوصية مطلقة. أمان تام." : "One System. Absolute Privacy. Zero Friction."}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          {isAr
            ? "تمت هندسة TapTag.one لتوفير أعلى معايير الحماية للمركبات بدون تطبيقات، بدون كلمات مرور، وبحجب كامل لكافة أرقام الهواتف."
            : "Engineered to deliver enterprise-grade vehicle protection without apps, without passwords, and with zero personal data leakage."}
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto px-4">
        {/* BENTO 1: NFC & Dynamic QR (Span 2 cols on desktop) */}
        <div className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0B0E] to-[#040406] p-7 sm:p-9 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.05] flex items-center justify-center text-white">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border border-white/10 bg-black text-zinc-300">
                DUAL-ENGINE NFC / QR
              </span>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {isAr ? "تقريب NFC ومسح QR فوري بدون تطبيقات" : "Instant Tap & Dynamic Scan (Zero Apps)"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isAr
                  ? "مجرد تقريب الهاتف من بطاقة الأكريليك أو تصوير رمز الـ QR يفتح بوابة المار فورياً عبر المتصفح الافتراضي خلال أقل من ثانية واحدة."
                  : "A single touch with any modern smartphone opens the secured action portal directly in the native browser in under 800ms."}
              </p>
            </div>
          </div>

          {/* Interactive Simulation Graphic */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white animate-ping absolute opacity-40" />
                <div className="w-2.5 h-2.5 rounded-full bg-white relative z-10" />
              </div>
              <span className="text-xs font-mono text-zinc-300">
                {isAr ? "مستوى تصحيح الخطأ ISO 18004 بنسبة 30%" : "ISO 18004 Level H (30% ECC)"}
              </span>
            </div>

            <span className="text-[11px] text-zinc-500 font-mono">
              LATENCY &lt; 250ms
            </span>
          </div>
        </div>

        {/* BENTO 2: Zero-Knowledge Privacy Barrier */}
        <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0B0E] to-[#040406] p-7 sm:p-9 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.05] flex items-center justify-center text-white">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border border-white/10 bg-black text-zinc-300">
                ZERO PII SHIELD
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isAr ? "حاجز الخصوصية الصارم" : "Zero-Knowledge Barrier"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isAr
                  ? "رقم هاتفك واسمك مشفرين في السيرفر ولا يخرجان لأي متصفح خارجي على الإطلاق. لا إزعاج ولا كشف لهويتك."
                  : "Owner contact details and identity never leave the encrypted backend. Complete anonymity for both parties."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-white">SHA-256 HMAC</span>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* BENTO 3: Masked VoIP Bridge */}
        <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0B0E] to-[#040406] p-7 sm:p-9 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.05] flex items-center justify-center text-white">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border border-white/10 bg-black text-zinc-300">
                MASKED VOIP
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isAr ? "مكالمات صوتية مشفرة" : "Encrypted VoIP Calls"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isAr
                  ? "اتصال صوتي مباشر مشفر بين المار والمالك دون كشف رقم الهاتف لأي طرف، مع مؤقت مضاد للإزعاج (3 دقائق)."
                  : "Real-time browser-to-browser audio channel with zero number disclosure and anti-spam cooldown."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-zinc-300">WebRTC Encrypted</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white">3 MIN COOLDOWN</span>
          </div>
        </div>

        {/* BENTO 4: First-Claim Biometric Ownership */}
        <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0B0E] to-[#040406] p-7 sm:p-9 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.05] flex items-center justify-center text-white">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border border-white/10 bg-black text-zinc-300">
                FIRST-CLAIM
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isAr ? "ربط فوري بالبصمة" : "Biometric Passkey Claim"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isAr
                  ? "البطاقة ترتبط تلقائياً بجوال المالك الأول عبر بصمة الإصبع أو الوجه بدون أي كلمات مرور قابلة للاختراق."
                  : "Zero passwords. The tag binds permanently to the first claimant device via WebAuthn biometric sensors."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-white">FIDO2 / WebAuthn</span>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* BENTO 5: High-Durability Acrylic Card Hardware */}
        <div className="relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0B0E] to-[#040406] p-7 sm:p-9 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,255,255,0.05)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.05] flex items-center justify-center text-white">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md border border-white/10 bg-black text-zinc-300">
                70 × 50 MM ACRYLIC
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isAr ? "أكريليك زجاجي عالي الصلابة" : "Laser UV Acrylic Glass"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isAr
                  ? "خامة أكريليك فاخرة مقاومة لأشعة الشمس المباشرة، درجات الحرارة العالية في السيارات، والخدوش اليومية."
                  : "Premium acrylic glass engineered for high automotive temperatures, direct sunlight, and physical durability."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-zinc-300">UV Print & Laser Cut</span>
            <span className="text-[11px] text-white font-mono">100% WATERPROOF</span>
          </div>
        </div>
      </div>
    </section>
  );
}
