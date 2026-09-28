"use client";

import React, { useState } from "react";
import {
  Car,
  AlertTriangle,
  PhoneCall,
  Check,
  Send,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  BellRing,
} from "lucide-react";
import { Language } from "@/types";

interface LiveOperationsConsoleProps {
  lang: Language;
}

export function LiveOperationsConsole({ lang }: LiveOperationsConsoleProps) {
  const isAr = lang === "ar";
  const [selectedScenario, setSelectedScenario] = useState<"movement" | "emergency" | "call">("movement");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);

  const scenarios = {
    movement: {
      title: isAr ? "طلب تحريك السيارة" : "Vehicle Movement Request",
      desc: isAr
        ? "إذا كانت سيارتك تقف أمام مدخل أو سيارة أخرى، يرسل السائق طلباً مهذباً دون أي إحراج."
        : "Polite one-touch notification to move vehicle if blocking access.",
      phoneTitle: isAr ? "تنبيه تحريك المركبة" : "Vehicle Movement Notice",
      phoneBody: isAr
        ? "تنبيه من TapTag: سيارتك تقف أمام سيارة أخرى، يرجى تحريكها إذا أمكن."
        : "TapTag Alert: Someone needs access. Please adjust your parking if possible.",
      phoneAction: isAr ? "سأحضر خلال 3 دقائق" : "On my way in 3 mins",
    },
    emergency: {
      title: isAr ? "تنبيه طوارئ عاجل" : "Urgent Emergency Alert",
      desc: isAr
        ? "في حال وجود نافذة مفتوحة، تسريب، أو خطر داهم حول السيارة يصلك إنذار أحمر فوري."
        : "Immediate high-priority alert for open windows, fluid leaks, or hazard.",
      phoneTitle: isAr ? "تنبيه طوارئ عاجل!" : "Urgent Vehicle Alert!",
      phoneBody: isAr
        ? "تنبيه فوري: تم رصد مشكلة تستدعي انتباهك بجوار سيارتك (مثل نافذة مفتوحة أو اقتراب خطر)."
        : "Immediate alert: Urgent attention required near your vehicle.",
      phoneAction: isAr ? "تأكيد واستجابة فورية" : "Acknowledge & Inspect",
    },
    call: {
      title: isAr ? "مكالمة صوتية مشفرة" : "Masked Encrypted Call",
      desc: isAr
        ? "اتصال صوتي مجاني ومباشر عبر الإنترنت بينك وبين المتصل دون معرفة رقمك إطلاقاً."
        : "Direct secure web-based audio call without revealing personal phone numbers.",
      phoneTitle: isAr ? "مكالمة واردة من زائر بجوار السيارة" : "Incoming Masked Voice Call",
      phoneBody: isAr
        ? "مكالمة صوتية مشفرة من خلال بطاقة سيارتك الذكية (رقمك محجوب بالكامل)."
        : "Encrypted call initiated via your vehicle smart tag. Identity protected.",
      phoneAction: isAr ? "الرد على المكالمة" : "Accept Masked Call",
    },
  };

  const handleTrigger = (scenario: "movement" | "emergency" | "call") => {
    setSelectedScenario(scenario);
    setIsSimulating(true);
    setIsDelivered(false);

    setTimeout(() => {
      setIsDelivered(true);
      setTimeout(() => {
        setIsSimulating(false);
      }, 4000);
    }, 600);
  };

  const active = scenarios[selectedScenario];

  return (
    <section id="live-simulator" className="w-full py-12 max-w-5xl mx-auto px-4 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="space-y-1.5 text-start">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[11px] font-mono text-zinc-300 uppercase font-bold tracking-widest">
              {isAr ? "تجربة تفاعلية حية" : "INTERACTIVE SIMULATION"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? "شاهد كيف تصلك التنبيهات على هاتفك في ثوانٍ" : "See How You Receive Vehicle Alerts"}
          </h2>
        </div>

        <span className="text-[11px] font-mono text-zinc-500">
          REAL-TIME TELEMETRY
        </span>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Side: Select Scenario Controls */}
        <div className="md:col-span-6 space-y-3">
          <p className="text-xs sm:text-sm text-zinc-400 mb-2">
            {isAr
              ? "اختر نوع الحالة لتجربة كيفية تفاعل أي شخص يقف بجانب سيارتك وكيف يصلك التنبيه:"
              : "Select a scenario to test what happens when someone interacts with your vehicle tag:"}
          </p>

          <div className="space-y-2.5">
            {[
              { id: "movement" as const, title: scenarios.movement.title, desc: scenarios.movement.desc, icon: Car },
              { id: "emergency" as const, title: scenarios.emergency.title, desc: scenarios.emergency.desc, icon: AlertTriangle },
              { id: "call" as const, title: scenarios.call.title, desc: scenarios.call.desc, icon: PhoneCall },
            ].map((sc) => {
              const Icon = sc.icon;
              const isSelected = selectedScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleTrigger(sc.id)}
                  className={`w-full text-right p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-zinc-900 border-white text-white shadow-lg"
                      : "bg-[#09090B] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-white text-black" : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-xs sm:text-sm font-bold block">{sc.title}</span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{sc.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Virtual Phone Simulation Notification Display */}
        <div className="md:col-span-6 flex justify-center">
          <div className="w-full max-w-[340px] rounded-3xl bg-[#0C0C0E] border border-zinc-800 p-4 shadow-2xl relative overflow-hidden studio-card-shadow">
            {/* Phone Notch & Status bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-[10px] font-mono text-zinc-500">
              <span>09:41</span>
              <div className="w-14 h-3.5 bg-black rounded-full border border-zinc-800" />
              <span>5G 100%</span>
            </div>

            {/* Simulated Live Notification Card */}
            <div className="py-6 space-y-3">
              <div
                className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  isDelivered
                    ? "bg-zinc-900 border-zinc-600 text-white translate-y-0 opacity-100 shadow-xl"
                    : "bg-zinc-950 border-zinc-850 text-zinc-400 translate-y-1 opacity-90"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <BellRing className="w-3.5 h-3.5 text-zinc-300" />
                    <span>تطبيق المنظومة</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">الآن</span>
                </div>

                <div className="space-y-1.5 pt-2 text-right">
                  <h4 className="text-xs font-bold text-white">{active.phoneTitle}</h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    {active.phoneBody}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">لوحة: أ ب ج 1234</span>
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-white text-black font-bold">
                    {active.phoneAction}
                  </span>
                </div>
              </div>

              {/* Status pill under phone */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>تشفير كامل بدون أي وسيط أو تطبيقات خارجية</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
