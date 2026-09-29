"use client";

import React from "react";
import { ShieldCheck, Thermometer, Layers, Smartphone } from "lucide-react";
import { Language } from "@/types";

interface HardwareSpecsBarProps {
  lang: Language;
}

export function HardwareSpecsBar({ lang }: HardwareSpecsBarProps) {
  const isAr = lang === "ar";

  const specs = [
    {
      icon: Layers,
      title: isAr ? "أكريليك مصقول 3mm" : "3mm Pure Acrylic",
      subtitle: isAr ? "خامة متينة ومقاومة للخدش" : "Scratch-resistant",
    },
    {
      icon: Thermometer,
      title: isAr ? "مقاومة تامة لحرارة الصيف" : "Heat & UV Resistant",
      subtitle: isAr ? "تتحمل حرارة الشمس حتى 85°C" : "Tested up to +85°C",
    },
    {
      icon: ShieldCheck,
      title: isAr ? "بدون بطارية أو شحن" : "Battery-Free NFC",
      subtitle: isAr ? "تعمل بالحث الكهرومغناطيسي مدى الحياة" : "Lifetime passive chip",
    },
    {
      icon: Smartphone,
      title: isAr ? "توافق شامل مع كل الهواتف" : "Universal Support",
      subtitle: isAr ? "تدعم جميع أجهزة iPhone و Android" : "All iOS & Android devices",
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-4">
      <div className="rounded-2xl glass-surface p-4 sm:p-5 border border-white/[0.08]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {specs.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl glass-card border border-white/[0.05] hover:border-white/[0.12] transition-all flex items-start gap-3 text-start"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 block font-sans">
                    {item.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
