"use client";

import React from "react";
import Link from "next/link";
import { Shield, PhoneCall, QrCode, Sparkles, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { Language } from "@/types";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";

interface ProtocolGridProps {
  lang: Language;
}

export function ProtocolGrid({ lang }: ProtocolGridProps) {
  const isAr = lang === "ar";

  const modules = [
    {
      meter: 96,
      icon: Shield,
      href: "/#secure-share",
      title: isAr ? "01 مشاركة ملفات مشفرة" : "01 Secure File Share",
      desc: isAr
        ? "تشفير AES-256-GCM + رمز PIN + بصمة + حرق بعد التحميل."
        : "Browser AES-256-GCM E2EE, scrypt PIN, WebAuthn & 1x burn.",
    },
    {
      meter: 90,
      icon: PhoneCall,
      href: "/#link-extractor",
      title: isAr ? "02 استخراج الأرقام والبيانات" : "02 Link & Phone Extractor",
      desc: isAr
        ? "سحب الهواتف والبريد وواتساب من أي رابط أو صفحة مع تصدير VCF."
        : "Extract phone numbers, WhatsApp, emails, JSON-LD & export VCF/CSV.",
    },
    {
      meter: 92,
      icon: QrCode,
      href: "/#qr-workspace",
      title: isAr ? "03 استوديو QR الذكي" : "03 Dynamic Smart QR",
      desc: isAr
        ? "أكواد QR ديناميكية بشعار Mata AI أو taptag وتحديث فوري."
        : "Dynamic QR with Mata AI or custom logos, PIN locks & SVG/PNG.",
    },
    {
      meter: 94,
      icon: Sparkles,
      href: "/#ai-mata",
      title: isAr ? "04 محرك Mata AI الشامل" : "04 Unified Mata AI",
      desc: isAr
        ? "مساعد ذكي موحد عبر جميع الأقسام بخط سوبرا الرياضي."
        : "Cross-suite Mata AI copilot unifying security, extraction, QR & files.",
    },
    {
      meter: 98,
      icon: ArrowLeftRight,
      href: "/#file-converter",
      title: isAr ? "05 محول جميع الصيغ" : "05 All-Format Converter",
      desc: isAr
        ? "تحويل الصور والوثائق والجداول والصوت والضغط ZIP/PDF/DOCX."
        : "Convert Images, PDF, DOCX, XLSX, CSV, JSON, YAML, Audio & ZIP.",
    },
  ];

  return (
    <section id="pillars-section" className="w-full border-b border-[#27272A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
                className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden flex flex-col justify-between transition-colors duration-150 ease-out hover:border-[#FFFFFF] group"
              >
                <SegmentedLedBar level={mod.meter} cells={18} />

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-start">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] flex items-center justify-center text-[#FFFFFF] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="w-8 h-8 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] group-hover:bg-[#FFFFFF] group-hover:text-[#09090B] group-hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-display font-bold text-[#FFFFFF]">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans">
                      {mod.desc}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
