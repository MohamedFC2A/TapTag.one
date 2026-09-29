"use client";

import React from "react";
import { Radio, Lock, PhoneCall, Layers } from "lucide-react";
import { Language } from "@/types";

interface ProtocolGridProps {
  lang: Language;
}

export function ProtocolGrid({ lang }: ProtocolGridProps) {
  const isAr = lang === "ar";

  const pillars = [
    {
      num: "01",
      icon: Radio,
      title: isAr ? "استجابة فورية بدون تطبيقات" : "Instant App-Free Contact",
      desc: isAr
        ? "لمس الهاتف أو مسح الكود يفتح صفحة السيارة مباشرة في المتصفح خلال ثانية واحدة."
        : "NFC tap or QR scan opens the vehicle gateway directly in any mobile browser in one second.",
    },
    {
      num: "02",
      icon: Lock,
      title: isAr ? "خصوصية مطلقة لرقمك" : "Absolute Identity Privacy",
      desc: isAr
        ? "رقم هاتفك الحقيقي وبياناتك الشخصية محجوبة ومشفرة 100% ولا تظهر لأحد."
        : "Your actual phone number and personal identity remain completely encrypted and hidden.",
    },
    {
      num: "03",
      icon: PhoneCall,
      title: isAr ? "مكالمات صوتية مشفرة" : "Encrypted Voice Calls",
      desc: isAr
        ? "اتصال صوتي فوري ومجاني عبر المتصفح بين المارّة والمالك دون كشف الأرقام."
        : "Direct browser-to-browser audio call enables instant verbal contact with zero number disclosure.",
    },
    {
      num: "04",
      icon: Layers,
      title: isAr ? "أكريليك عالي التحمل" : "Automotive Acrylic",
      desc: isAr
        ? "مصممة خصيصاً للزجاج الأمامي بمقاومة تامة لحرارة الصيف والشمس حتى 85°C."
        : "Engineered from premium cast acrylic, rigorously tested against extreme solar heat up to +85°C.",
    },
  ];

  return (
    <section id="pillars-section" className="w-full py-8 max-w-5xl mx-auto px-4 space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-widest">
              {isAr ? "مزايا المنظومة" : "CORE ADVANTAGES"}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {isAr ? "حماية وخصوصية بأعلى المعايير" : "Automotive Privacy & Protection"}
          </h2>
        </div>
      </div>

      {/* 4-Quadrant Glassmorphic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.num}
              className="p-5 sm:p-6 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between space-y-3 shadow-glass hover:border-white/20 transition-all text-start"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 font-bold px-2 py-0.5 rounded-md glass-pill">
                  {p.num}
                </span>
                <div className="w-8 h-8 rounded-lg border border-white/[0.10] bg-white/[0.04] flex items-center justify-center text-white">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {p.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {p.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
