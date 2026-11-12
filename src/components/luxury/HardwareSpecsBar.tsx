"use client";

import React from "react";
import { RefreshCw, Fingerprint, QrCode, Clock } from "lucide-react";
import { Language } from "@/types";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";

interface HardwareSpecsBarProps {
  lang: Language;
}

export function HardwareSpecsBar({ lang }: HardwareSpecsBarProps) {
  const isAr = lang === "ar";

  const specs = [
    {
      icon: RefreshCw,
      code: "DYN-01",
      title: isAr ? "تبديل الوجهة فوراً" : "Zero-Reprint Routing",
      subtitle: isAr
        ? "غيّر الرابط أو ملف PDF أو Word دون إعادة طباعة"
        : "Swap URL, PDF, or Word payloads anytime live",
    },
    {
      icon: Fingerprint,
      code: "SEC-02",
      title: isAr ? "قفل بالبصمة وكلمة السر" : "PIN & Biometric Gate",
      subtitle: isAr
        ? "توثيق WebAuthn FaceID/TouchID ورمز سري مشفر"
        : "Scrypt PIN & WebAuthn hardware verification",
    },
    {
      icon: QrCode,
      code: "ECC-03",
      title: isAr ? "دمج شعار بمعيار Level H" : "30% ECC Logo Matrix",
      subtitle: isAr
        ? "رفع لوجو الشركة بالمنتصف مع قراءة مضمونة"
        : "Custom brand center overlay with ISO recovery",
    },
    {
      icon: Clock,
      code: "EXP-04",
      title: isAr ? "صلاحية ومحدد مسح ذكي" : "TTL & Scan Quota Rules",
      subtitle: isAr
        ? "إيقاف تلقائي بالوقت أو بعد عدد مسحات محدد"
        : "Single-use 1x burn or scheduled auto-kill",
    },
  ];

  return (
    <section className="w-full border-b border-[#27272A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
          <SegmentedLedBar level={82} cells={30} label="SYSTEM CAPABILITIES // SPEC" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-[#27272A]">
            {specs.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.code}
                  className="p-5 flex items-start gap-3.5 text-start transition-colors duration-150 hover:bg-[#16161A]"
                >
                  <div className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#FFFFFF]" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#71717A] block">
                      {item.code}
                    </span>
                    <span className="text-xs font-bold text-[#FFFFFF] block">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-[#A1A1AA] block leading-snug">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
