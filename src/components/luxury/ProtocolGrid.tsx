"use client";

import React from "react";
import Link from "next/link";
import { RefreshCw, Clock, Fingerprint, Printer, ArrowUpRight } from "lucide-react";
import { Language } from "@/types";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";

interface ProtocolGridProps {
  lang: Language;
}

export function ProtocolGrid({ lang }: ProtocolGridProps) {
  const isAr = lang === "ar";

  const modules = [
    {
      meter: 92,
      icon: RefreshCw,
      href: "/#qr-workspace",
      title: isAr ? "محتوى ديناميكي" : "Dynamic Payload",
      desc: isAr
        ? "رابط أو PDF أو Word مع تحديث الوجهة في أي وقت."
        : "URL, PDF, Word, vCard, or Wi-Fi updated live anytime.",
    },
    {
      meter: 78,
      icon: Clock,
      href: "/dashboard",
      title: isAr ? "قواعد الانتهاء" : "Smart Expiration",
      desc: isAr
        ? "تحديد عدد المسحات أو الإيقاف التلقائي بالزمن."
        : "Max scan limits and scheduled time expiration.",
    },
    {
      meter: 88,
      icon: Fingerprint,
      href: "/dashboard",
      title: isAr ? "قفل البصمة وكلمة السر" : "PIN & Biometric Lock",
      desc: isAr
        ? "حماية الوصول برمز سري أو بصمة الجهاز."
        : "Protect links and files with PIN or device biometrics.",
    },
    {
      meter: 84,
      icon: Printer,
      href: "/#qr-workspace",
      title: isAr ? "شعار وتصدير فوري" : "Logo & Instant Export",
      desc: isAr
        ? "إضافة شعارك وتصدير SVG وPNG أو طباعة مباشرة."
        : "Custom logo overlay with SVG, PNG, and print output.",
    },
  ];

  return (
    <section id="pillars-section" className="w-full border-b border-[#27272A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
