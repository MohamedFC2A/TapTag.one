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
      title: isAr ? "طلب تحريك السيارة" : "Move Vehicle Request",
      desc: isAr
        ? "تنبيه فوري مهذب عند الوقوف المزدوج أو إغلاق مدخل أو موقف."
        : "Polite instant notification to adjust parking if blocking access.",
      phoneTitle: isAr ? "طلب تحريك المركبة" : "Vehicle Movement Notice",
      phoneBody: isAr
        ? "تنبيه: سيارتك تقف أمام سيارة أخرى، يرجى تحريكها إذا أمكن."
        : "Alert: Someone needs access. Please adjust your parking if possible.",
      phoneAction: isAr ? "سأحضر خلال دقائق" : "On my way",
    },
    emergency: {
      title: isAr ? "إنذار طوارئ فوري" : "Emergency Alert",
      desc: isAr
        ? "تنبيه عاجل في حال وجود نافذة مفتوحة، تسريب، أو خطر داهم."
        : "High-priority alert for open windows, fluid leaks, or hazard.",
      phoneTitle: isAr ? "إنذار طوارئ عاجل!" : "Urgent Vehicle Alert!",
      phoneBody: isAr
        ? "تنبيه طوارئ: تم رصد مشكلة تستدعي انتباهك العاجل بجوار سيارتك."
        : "Immediate alert: Urgent attention required near your vehicle.",
      phoneAction: isAr ? "تأكيد واستجابة" : "Acknowledge",
    },
    call: {
      title: isAr ? "اتصال صوتي مشفر" : "Masked Voice Call",
      desc: isAr
        ? "مكالمة صوتية مجانية عبر المتصفح دون كشف رقمك الحقيقي إطلاقاً."
        : "Direct secure web audio call with zero personal number disclosure.",
      phoneTitle: isAr ? "مكالمة واردة من زائر" : "Incoming Masked Voice Call",
      phoneBody: isAr
        ? "مكالمة صوتية مشفرة عبر بطاقة سيارتك الذكية (هويتك ورقمك محجوبان)."
        : "Encrypted call initiated via your vehicle smart tag.",
      phoneAction: isAr ? "رد على المكالمة" : "Accept Call",
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
    <section id="live-simulator" className="w-full py-10 max-w-5xl mx-auto px-4 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="space-y-1 text-start">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <span className="text-[11px] font-mono text-zinc-300 uppercase font-bold tracking-widest">
              {isAr ? "تجربة حية" : "LIVE DEMO"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? "كيف تصلك التنبيهات على هاتفك فورياً" : "Instant Lockscreen Notifications"}
          </h2>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Side: Select Scenario Controls */}
        <div className="md:col-span-6 space-y-2.5">
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
                  className={`w-full text-start p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer ${
                    isSelected
                      ? "glass-surface-elevated border-white text-white shadow-glass scale-[1.01]"
                      : "glass-card border-white/[0.06] text-zinc-300 hover:border-white/15"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? "bg-white text-black font-bold" : "bg-white/[0.05] text-zinc-300 border border-white/[0.08]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <span className="text-sm font-bold block text-white">{sc.title}</span>
                    <p className="text-xs text-zinc-400 font-sans">{sc.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Virtual Phone Simulation Notification Display */}
        <div className="md:col-span-6 flex justify-center">
          <div className="w-full max-w-[340px] rounded-[36px] glass-surface-elevated border border-white/[0.12] p-5 shadow-glass-elevated relative overflow-hidden">
            {/* Phone Notch & Dynamic Island */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] text-[10px] font-mono text-zinc-400">
              <span>09:41</span>
              <div className="w-20 h-4 bg-black rounded-full border border-white/10 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
              </div>
              <span>5G 100%</span>
            </div>

            {/* Simulated Live Notification Card */}
            <div className="py-6 space-y-4">
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isDelivered
                    ? "glass-card border-white/20 text-white translate-y-0 opacity-100 shadow-glass"
                    : "glass-surface border-white/[0.06] text-zinc-400 translate-y-1 opacity-90"
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <BellRing className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>TapTag Protocol</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">{isAr ? "الآن" : "Now"}</span>
                </div>

                <div className="space-y-1.5 pt-2.5 text-start">
                  <h4 className="text-xs font-bold text-white">{active.phoneTitle}</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {active.phoneBody}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">{isAr ? "لوحة: أ ب ج 1234" : "Plate: ABC 1234"}</span>
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white text-black font-bold">
                    {active.phoneAction}
                  </span>
                </div>
              </div>

              {/* Status pill under phone */}
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-400 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
                <span>{isAr ? "تشفير فوري بدون وسيط أو تطبيقات خارجية" : "End-to-End Encrypted Without Apps"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
