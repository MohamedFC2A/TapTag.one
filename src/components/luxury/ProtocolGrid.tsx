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
      tag: "استجابة فورية",
      icon: Radio,
      title: isAr ? "استجابة فورية بدون أي تطبيقات" : "Zero-App Instant Interaction",
      desc: isAr
        ? "بمجرد تقريب هاتف ذكي يدعم NFC أو مسح الرمز، تفتح صفحة السيارة مباشرة دون الحاجة لتحميل أي تطبيق."
        : "NFC tap or code scan opens the vehicle gateway directly in the mobile browser without installing apps.",
      metaLeft: isAr ? "خلال لحظات" : "Instant Launch",
      metaRight: isAr ? "NFC + كود ذكي" : "NFC & QR",
    },
    {
      num: "02",
      tag: "خصوصية كاملة",
      icon: Lock,
      title: isAr ? "حجب كامل لرقم هاتفك وهويتك" : "100% Identity & Phone Privacy",
      desc: isAr
        ? "رقم هاتفك الحقيقي وبياناتك الشخصية محمية ومحجوبة كلياً؛ لا يستطيع أي شخص الاطلاع عليها أو استغلالها."
        : "Your personal phone number and identity remain completely hidden and encrypted at all times.",
      metaLeft: isAr ? "تشفير سحابي" : "Encrypted",
      metaRight: isAr ? "أمان تام" : "Zero-Leak",
    },
    {
      num: "03",
      tag: "مكالمات مشفرة",
      icon: PhoneCall,
      title: isAr ? "مكالمات صوتية مباشرة ومجانية" : "Encrypted Direct Audio Calls",
      desc: isAr
        ? "قناة اتصال صوتية ذكية عبر المتصفح تمكّن من يحتاج تحريك السيارة من التحدث معك مباشرة بضغطة زر."
        : "Direct browser-to-browser voice calling enables immediate contact without revealing personal phone numbers.",
      metaLeft: isAr ? "عبر المتصفح" : "Browser-Based",
      metaRight: isAr ? "بدون إزعاج" : "Anti-Spam",
    },
    {
      num: "04",
      tag: "خامات فيزيائية",
      icon: Layers,
      title: isAr ? "خامات متينة ومقاومة لحرارة الشمس" : "Automotive-Grade Materials",
      desc: isAr
        ? "بطاقات وميداليات مصممة من الأكريليك المقسى وألياف الكربون مع طبقة عازلة للمعادن ومقاومة لأشعة الشمس."
        : "Engineered from hardened acrylic and carbon fiber with anti-metal ferrite shielding resistant to high sun heat.",
      metaLeft: isAr ? "مقاومة للشمس" : "Heat Resistant",
      metaRight: isAr ? "عزل للمعادن" : "Shielded",
    },
  ];

  return (
    <section id="pillars-section" className="w-full py-16 max-w-5xl mx-auto px-4 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="space-y-1.5 text-start">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[11px] font-mono text-zinc-300 uppercase font-bold tracking-widest">
              {isAr ? "مزايا منظومة تابتج" : "SYSTEM ADVANTAGES"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? "كيف تحمي منظومة تابتج سيارتك الذكية؟" : "How TapTag Protects Your Vehicle"}
          </h2>
        </div>

        <span className="text-[11px] font-mono text-zinc-500">
          TAPTAG AUTOMOTIVE STANDARDS
        </span>
      </div>

      {/* 4-Quadrant Precision Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.num}
              className="group p-6 rounded-2xl border border-zinc-800 hover:border-zinc-600 bg-[#09090B] flex flex-col justify-between space-y-4 transition-colors duration-200 studio-card-shadow"
            >
              <div className="space-y-3">
                {/* Header with Number and Icon */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 font-bold px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700">
                    {p.num}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded border border-zinc-800 bg-black">
                      {p.tag}
                    </span>
                    <div className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center text-white">
                      <Icon className="w-3.5 h-3.5 text-zinc-200" />
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5 text-start">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {p.desc}
                  </p>
                </div>
              </div>

              {/* Bottom Technical Status Bar */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="text-zinc-400">{p.metaLeft}</span>
                <span className="text-zinc-200 font-semibold">{p.metaRight}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
