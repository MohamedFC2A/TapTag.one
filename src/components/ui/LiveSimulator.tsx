"use client";

import React, { useState } from "react";
import {
  Car,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Send,
  Zap,
} from "lucide-react";
import { Language } from "@/types";

interface LiveSimulatorProps {
  lang: Language;
}

export function LiveSimulator({ lang }: LiveSimulatorProps) {
  const isAr = lang === "ar";
  const [selectedScenario, setSelectedScenario] = useState<"movement" | "emergency" | "call">("movement");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<"idle" | "dispatching" | "delivered">("idle");

  const runSimulation = (scenario: "movement" | "emergency" | "call") => {
    setSelectedScenario(scenario);
    setIsSimulating(true);
    setSimulationStep("dispatching");

    setTimeout(() => {
      setSimulationStep("delivered");
      setTimeout(() => {
        setIsSimulating(false);
      }, 4000);
    }, 1200);
  };

  return (
    <section id="live-simulator" className="w-full py-12 max-w-5xl mx-auto px-4 space-y-6">
      <div className="border border-white/10 rounded-2xl bg-gradient-to-b from-[#0B0B0E] to-[#040406] p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-0 end-0 w-72 h-72 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs font-mono text-zinc-300">
              <Zap className="w-3.5 h-3.5 text-white" />
              <span>{isAr ? "محاكي البوابة التفاعلية المباشرة" : "INTERACTIVE PORTAL SIMULATOR"}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {isAr ? "جرّب سيناريو مسح البطاقة والتنبيه الفوري" : "Test the Live Scan & Instant Alert Flow"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isAr
                ? "اختر أي إجراء لتشهد مسار التشفير الفوري: كيف يتم إرسال التنبيه لهاتف المالك خلال أجزاء من الثانية مع حظر تام لرقم هاتفه."
                : "Select any bystander action below to witness the zero-knowledge dispatch process in real time."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black p-1.5 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => runSimulation("movement")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedScenario === "movement"
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{isAr ? "تحريك سيارة" : "Move Car"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("emergency")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedScenario === "emergency"
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isAr ? "طوارئ" : "Emergency"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("call")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedScenario === "call"
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isAr ? "اتصال VoIP" : "VoIP Call"}</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Monitor Card */}
        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-black/60 space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">STEP 01 • INITIATION</span>
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>{isAr ? "مسح البطاقة (NFC / QR)" : "Card Tap Detected"}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isAr ? "متصفح المار يطلب التنبيه بدون تسجيل دخول أو تطبيقات." : "Native browser triggers event with 0 client apps."}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-black/60 space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">STEP 02 • CRYPTO SHIELD</span>
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Lock className="w-3.5 h-3.5 text-zinc-300" />
              <span>{isAr ? "عزل بيانات المالك (Zero-PII)" : "PII Obfuscation"}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isAr ? "تشفير البلاغ برمز HMAC وتثبيت مؤقت منع الإزعاج (3 دقائق)." : "Payload HMAC sealed & 3-minute cooldown enforced."}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-black/60 space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">STEP 03 • INSTANT DISPATCH</span>
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{isAr ? "وصول الإشعار لهاتف المالك" : "Owner Dispatched"}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isAr ? "إشعار فوري عبر WhatsApp أو بوت Telegram المشفر." : "Push alert delivered to owner within <400ms."}
            </p>
          </div>
        </div>

        {/* Live Simulation Banner Trigger */}
        <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-white/20 bg-black flex items-center justify-center text-white">
              {simulationStep === "dispatching" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="text-start">
              <span className="text-xs font-bold text-white block">
                {simulationStep === "dispatching"
                  ? (isAr ? "جارٍ تشفير وإرسال البلاغ..." : "Encrypting & Dispatching Alert...")
                  : simulationStep === "delivered"
                  ? (isAr ? "تم تسليم الإشعار الفوري للمالك بنجاح (خلال 320ms)" : "Alert Delivered to Owner (<320ms)")
                  : (isAr ? "جاهز للاختبار التفاعلي الفوري" : "Ready for Live Simulation")}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                SCENARIO: {selectedScenario.toUpperCase()} • STATUS: {simulationStep.toUpperCase()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => runSimulation(selectedScenario)}
            disabled={isSimulating}
            className="w-full sm:w-auto px-5 py-2 rounded-lg border border-white bg-white text-black hover:bg-zinc-200 transition-all font-bold text-xs shrink-0 disabled:opacity-50"
          >
            {isAr ? "محاكاة الإرسال الآن" : "Trigger Simulation"}
          </button>
        </div>
      </div>
    </section>
  );
}
