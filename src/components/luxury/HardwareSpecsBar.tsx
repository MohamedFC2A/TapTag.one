"use client";

import React from "react";
import { Cpu, ShieldCheck, Thermometer, Layers, CheckCircle2 } from "lucide-react";
import { Language } from "@/types";

interface HardwareSpecsBarProps {
  lang: Language;
}

export function HardwareSpecsBar({ lang }: HardwareSpecsBarProps) {
  const isAr = lang === "ar";

  const specs = [
    {
      icon: Cpu,
      label: isAr ? "شريحة الـ RFID" : "RFID IC CHIP",
      value: "NXP NTAG216 (888 Bytes)",
    },
    {
      icon: Layers,
      label: isAr ? "الأبعاد والخامة" : "MATERIAL SPEC",
      value: "70×50×3mm Cast Acrylic",
    },
    {
      icon: ShieldCheck,
      label: isAr ? "عازل المعادن" : "METAL BARRIER",
      value: "0.2mm Sintered Ferrite",
    },
    {
      icon: Thermometer,
      label: isAr ? "تحمل الحرارة" : "OPERATING TEMP",
      value: "-40°C to +85°C",
    },
    {
      icon: CheckCircle2,
      label: isAr ? "المعايير المعتمدة" : "STANDARDS",
      value: "ISO 14443-A • IP68",
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="rounded-2xl glass-surface p-5 sm:p-6 border border-white/[0.08] shadow-glass">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {specs.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="space-y-1.5 text-start p-3 rounded-xl glass-card border border-white/[0.05] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Icon className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="text-[9px] font-mono tracking-wider uppercase text-zinc-400">
                    {item.label}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-white block">
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
