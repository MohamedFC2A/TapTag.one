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
      tag: "DUAL-ENGINE NFC & QR",
      icon: Radio,
      title: isAr ? "استجابة فورية دون تطبيقات (< 250ms)" : "Zero-App Direct Execution (< 250ms)",
      desc: isAr
        ? "تقريب NFC أو مسح كود QR يفتح البوابة فورياً عبر المتصفح في أقل من 250 مللي ثانية."
        : "NTAG216 contactless IC and Level H QR launch verified portal natively in under 250ms.",
      metaLeft: isAr ? "معيار ISO-18004" : "ISO-18004 Level H",
      metaRight: "NTAG 216",
    },
    {
      num: "02",
      tag: "ZERO-KNOWLEDGE PRIVACY",
      icon: Lock,
      title: isAr ? "عزل وحجب كامل لبيانات المالك" : "Zero-PII Cryptographic Shield",
      desc: isAr
        ? "حجب كامل لأرقام الهواتف وهويات الملاك وتشفير سحابي دائم عبر خوارزميات AES-256-GCM."
        : "Zero-knowledge phone & identity shielding sealed with AES-256-GCM and HMAC tokens.",
      metaLeft: "AES-256-GCM",
      metaRight: isAr ? "خصوصية مطلقة" : "100% PII SHIELD",
    },
    {
      num: "03",
      tag: "MASKED WEBRTC VOIP",
      icon: PhoneCall,
      title: isAr ? "مكالمات صوتية مشفرة بضغطة زر" : "Masked Browser-to-Browser VoIP",
      desc: isAr
        ? "قناة صوتية مشفرة مباشرة عبر المتصفح بدون أرقام هواتف، مع مؤقت تلقائي لمنع الإزعاج."
        : "Direct encrypted peer-to-peer audio tunnel through WebRTC with anti-spam cooldown.",
      metaLeft: "WebRTC E2EE",
      metaRight: isAr ? "مؤقت 3 دقائق" : "3-MIN COOLDOWN",
    },
    {
      num: "04",
      tag: "AUTOMOTIVE HARDWARE",
      icon: Layers,
      title: isAr ? "أكريليك عالي الصلابة وعازل للمعادن" : "Anti-Metal Shielded Automotive Acrylic",
      desc: isAr
        ? "أكريليك 3 مم مزود بطبقة فيريت عازلة لتردد المعادن، ومقاومة لحرارة الشمس حتى 85°C."
        : "3mm optical acrylic with 0.2mm anti-metal ferrite barrier rated to -40°C ~ +85°C.",
      metaLeft: "-40°C ~ +85°C",
      metaRight: isAr ? "عازل للمعادن" : "FERRITE BARRIER",
    },
  ];

  return (
    <section id="pillars-section" className="w-full py-16 max-w-5xl mx-auto px-4 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1.5 text-start">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <span className="text-[11px] font-mono text-[#00C853] uppercase font-bold tracking-widest">
              SYSTEM ARCHITECTURE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? "معمارية المنظومة المعتمدة لحماية الأصول" : "Institutional Security Architecture"}
          </h2>
        </div>

        <span className="text-[11px] font-mono text-zinc-500">
          SPECIFICATION V2.4 • DEFENSE GRADE
        </span>
      </div>

      {/* 4-Quadrant Precision Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.num}
              className="group p-6 rounded-xl border border-white/10 hover:border-[#00C853]/40 bg-[#060608] flex flex-col justify-between space-y-4 transition-colors duration-200"
            >
              <div className="space-y-3">
                {/* Header with Number and Icon */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#00C853] font-bold">
                    [ {p.num} ]
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 bg-black">
                      {p.tag}
                    </span>
                    <div className="w-7 h-7 rounded border border-white/10 bg-black flex items-center justify-center text-white">
                      <Icon className="w-3.5 h-3.5 text-[#00C853]" />
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
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="text-zinc-400">{p.metaLeft}</span>
                <span className="text-[#00C853] font-semibold">{p.metaRight}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
