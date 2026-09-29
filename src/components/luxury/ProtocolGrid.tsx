"use client";

import React from "react";
import { Radio, Lock, PhoneCall, Layers, ShieldCheck } from "lucide-react";
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
        ? "تقريب الهاتف أو مسح الكود يفتح صفحة السيارة مباشرة في المتصفح خلال ثوانٍ دون الحاجة لتثبيت أي تطبيق."
        : "NFC tap or QR scan opens the vehicle gateway directly in any mobile browser with zero app installation.",
    },
    {
      num: "02",
      icon: Lock,
      title: isAr ? "خصوصية مطلقة لرقمك وهويتك" : "Absolute Identity & Phone Privacy",
      desc: isAr
        ? "رقم هاتفك الحقيقي وبياناتك الشخصية محجوبة ومشفرة 100%؛ لن يظهر رقمك لأي شخص بجانب سيارتك."
        : "Your actual phone number and identity remain completely encrypted and hidden from bystanders.",
    },
    {
      num: "03",
      icon: PhoneCall,
      title: isAr ? "مكالمات صوتية مشفرة ومجانية" : "Encrypted Direct Voice Calls",
      desc: isAr
        ? "قناة اتصال صوتية ذكية ومجانية عبر المتصفح تمكّن المتصل من التحدث معك مباشرة دون معرفة رقمك."
        : "Direct browser-to-browser voice calling enables immediate verbal contact with zero number disclosure.",
    },
    {
      num: "04",
      icon: Layers,
      title: isAr ? "أكريليك عالي التحمل ومقاوم للشمس" : "Automotive Heat-Resistant Acrylic",
      desc: isAr
        ? "ألواح أكريليك مقسى مصممة خصيصاً للزجاج الأمامي مع طبقة عازلة للمعادن وتتحمل حرارة الشمس حتى 85° مئوية."
        : "Engineered from cast acrylic with anti-metal ferrite shielding, rigorously tested from -40°C to +85°C.",
    },
  ];

  return (
    <section id="pillars-section" className="w-full py-10 max-w-5xl mx-auto px-4 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="space-y-1 text-start">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <span className="text-[11px] font-mono text-zinc-300 uppercase font-bold tracking-widest">
              {isAr ? "مميزات المنظومة" : "CORE ADVANTAGES"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? "حماية سيارتك وخصوصيتك بأعلى معايير الأمان" : "Automotive Privacy & Protection Built-In"}
          </h2>
        </div>
      </div>

      {/* 4-Quadrant Glassmorphic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.num}
              className="p-6 sm:p-7 rounded-3xl glass-card border border-white/[0.08] flex flex-col justify-between space-y-4 shadow-glass hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 font-bold px-2.5 py-1 rounded-lg glass-pill">
                  {p.num}
                </span>
                <div className="w-9 h-9 rounded-xl border border-white/[0.10] bg-white/[0.04] flex items-center justify-center text-white">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="space-y-1.5 text-start">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
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
