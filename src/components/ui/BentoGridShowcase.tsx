"use client";

import React from "react";
import {
  Radio,
  Lock,
  PhoneCall,
  Fingerprint,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { Language } from "@/types";

interface BentoGridShowcaseProps {
  lang: Language;
}

export function BentoGridShowcase({ lang }: BentoGridShowcaseProps) {
  const isAr = lang === "ar";

  return (
    <section id="pillars-section" className="w-full py-14 space-y-8 max-w-5xl mx-auto px-4">
      {/* Section Header - Concise & Institutional */}
      <div className="text-center max-w-xl mx-auto space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-[#08080A] text-zinc-300 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
          <span>{isAr ? "معمارية المنظومة المعتمدة" : "OFFICIAL ARCHITECTURE SPEC"}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {isAr ? "ركائز الأمان والهوية الذكية" : "Core Security & Hardware Pillars"}
        </h2>
        <p className="text-xs text-zinc-400 font-mono">
          {isAr ? "تشفير ثنائي الأطراف • حجب الهوية • اتصال مباشر دون تطبيقات" : "Zero-PII • End-to-End Encrypted • Appless Architecture"}
        </p>
      </div>

      {/* Bento Grid (Zero Shadows / Zero Glowing / 1px Precision Borders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* BENTO 1: NFC & Dynamic QR (Span 2 cols) */}
        <div className="md:col-span-2 relative group rounded-xl border border-white/10 hover:border-emerald-500/40 bg-[#08080A] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg border border-white/15 bg-black flex items-center justify-center text-white">
                <Radio className="w-4 h-4 text-[#00C853]" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border border-white/10 bg-black text-zinc-300">
                NTAG 216 & QR LEVEL H
              </span>
            </div>

            <div className="space-y-1 max-w-md text-start">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isAr ? "استجابة فورية بدون تطبيقات (< 250ms)" : "Direct Native Browser Routing (< 250ms)"}
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                {isAr
                  ? "تقريب الهاتف أو مسح الكود يفتح البوابة فورياً عبر المتصفح الافتراضي خلال أجزاء من الثانية."
                  : "A single touch or optical scan opens the verified action portal directly in the native browser."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              <span className="text-zinc-300">{isAr ? "معيار ISO-18004" : "ISO-18004 Compliant"}</span>
            </div>
            <span className="text-zinc-500">LATENCY &lt; 250ms</span>
          </div>
        </div>

        {/* BENTO 2: Zero-Knowledge Privacy Barrier */}
        <div className="relative group rounded-xl border border-white/10 hover:border-emerald-500/40 bg-[#08080A] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg border border-white/15 bg-black flex items-center justify-center text-white">
                <Lock className="w-4 h-4 text-[#00C853]" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border border-white/10 bg-black text-zinc-300">
                ZERO-PII
              </span>
            </div>

            <div className="space-y-1 text-start">
              <h3 className="text-base font-bold text-white tracking-tight">
                {isAr ? "حجب كامل لبيانات المالك" : "Zero PII Exposure"}
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                {isAr
                  ? "أرقام الهواتف مشفرة ومحجوبة تماماً عن المتصفح الخارجي لمنع التطفل."
                  : "Phone numbers and identities remain cryptographically sealed inside the backend."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-300">AES-256 GCM</span>
            <ShieldCheck className="w-4 h-4 text-[#00C853]" />
          </div>
        </div>

        {/* BENTO 3: Masked VoIP Audio Bridge */}
        <div className="relative group rounded-xl border border-white/10 hover:border-emerald-500/40 bg-[#08080A] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg border border-white/15 bg-black flex items-center justify-center text-white">
                <PhoneCall className="w-4 h-4 text-[#00C853]" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border border-white/10 bg-black text-zinc-300">
                WebRTC E2EE
              </span>
            </div>

            <div className="space-y-1 text-start">
              <h3 className="text-base font-bold text-white tracking-tight">
                {isAr ? "اتصال صوتي مشفر بضغطة زر" : "Masked VoIP Voice Bridge"}
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                {isAr
                  ? "مكالمة صوتية سحابية مباشرة عبر المتصفح مع حماية الرقم ومهلة تلقائية."
                  : "Encrypted browser-to-browser voice link with zero number exchange."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">{isAr ? "مؤقت مضاد للإزعاج" : "3-Min Cooldown"}</span>
            <span className="text-[#00C853] text-[10px]">ACTIVE</span>
          </div>
        </div>

        {/* BENTO 4: First-Claim Biometric Passkey */}
        <div className="relative group rounded-xl border border-white/10 hover:border-emerald-500/40 bg-[#08080A] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg border border-white/15 bg-black flex items-center justify-center text-white">
                <Fingerprint className="w-4 h-4 text-[#00C853]" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border border-white/10 bg-black text-zinc-300">
                FIDO2 / PASSKEY
              </span>
            </div>

            <div className="space-y-1 text-start">
              <h3 className="text-base font-bold text-white tracking-tight">
                {isAr ? "ربط فوري بالبصمة" : "Biometric Passkey Claim"}
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                {isAr
                  ? "تفعيل البطاقة بلمسة واحدة عبر بصمة الوجه أو الإصبع بدون كلمات مرور."
                  : "Cryptographic device binding via native biometrics. Zero passwords."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-300">WebAuthn</span>
            <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
          </div>
        </div>

        {/* BENTO 5: High-Durability Acrylic Card Hardware */}
        <div className="relative group rounded-xl border border-white/10 hover:border-emerald-500/40 bg-[#08080A] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg border border-white/15 bg-black flex items-center justify-center text-white">
                <Layers className="w-4 h-4 text-[#00C853]" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border border-white/10 bg-black text-zinc-300">
                70 × 50 MM ACRYLIC
              </span>
            </div>

            <div className="space-y-1 text-start">
              <h3 className="text-base font-bold text-white tracking-tight">
                {isAr ? "أكريليك زجاجي مقاوم للحرارة" : "Automotive UV Acrylic Glass"}
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                {isAr
                  ? "معالجة حرارية مقاومة لحرارة مقصورة السيارات وأشعة الشمس والخدوش."
                  : "Engineered to withstand direct vehicle cabin temperatures and UV radiation."}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-300">UV Curable Ink</span>
            <span className="text-[10px] font-mono text-[#00C853]">ANTI-HEAT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
