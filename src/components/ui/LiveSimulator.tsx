"use client";

import React, { useState } from "react";
import {
  Car,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  Lock,
  Radio,
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
      }, 3500);
    }, 1100);
  };

  return (
    <section id="live-simulator" className="w-full py-12 max-w-5xl mx-auto px-4 space-y-4">
      <div className="border border-white/10 rounded-xl bg-[#08080A] p-6 sm:p-8 relative overflow-hidden">
        
        {/* Top Header & Scenario Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1.5 max-w-xl text-start">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-white/10 bg-black text-[11px] font-mono text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              <span>{isAr ? "محاكي البث الحي المشفر" : "LIVE TELEMETRY SIMULATOR"}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {isAr ? "اختبار التنبيه الفوري وعزل البيانات" : "Simulate Instant Alert & PII Shielding"}
            </h3>
            <p className="text-xs text-zinc-400">
              {isAr
                ? "اختر أي إجراء لاختبار معالجة البلاغ وتشفيره خلال أقل من 350 مللي ثانية."
                : "Select any bystander incident to test sub-350ms cryptographic dispatch."}
            </p>
          </div>

          {/* Scenario Tabs (Flat, Crisp 1px Border, Zero Shadow) */}
          <div className="flex items-center gap-1.5 bg-black p-1 rounded-lg border border-white/15 shrink-0">
            <button
              type="button"
              onClick={() => runSimulation("movement")}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                selectedScenario === "movement"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "تحريك مركبة" : "Move Car"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("emergency")}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                selectedScenario === "emergency"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "طوارئ" : "Emergency"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("call")}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                selectedScenario === "call"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "اتصال VoIP" : "VoIP Call"}</span>
            </button>
          </div>
        </div>

        {/* Live Audio Wave Visualizer (Active only when Call is selected or simulated) */}
        {selectedScenario === "call" && (
          <div className="py-3 px-4 my-4 rounded-lg border border-[#00C853]/30 bg-[#00C853]/5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
              <span>{isAr ? "قناة WebRTC الصوتية المشفرة متصلة" : "WebRTC Secure Audio Stream Active"}</span>
            </div>

            {/* Smart Oscillating Audio Frequency Bars */}
            <div className="flex items-center gap-1 h-6">
              <div className="w-1 bg-[#00C853] rounded-full animate-audio-1" />
              <div className="w-1 bg-[#00C853] rounded-full animate-audio-2" />
              <div className="w-1 bg-[#00C853] rounded-full animate-audio-3" />
              <div className="w-1 bg-[#00C853] rounded-full animate-audio-4" />
              <div className="w-1 bg-[#00C853] rounded-full animate-audio-5" />
            </div>
          </div>
        )}

        {/* 3 Step Protocol Status Pipeline */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 */}
          <div className="p-3.5 rounded-lg border border-white/10 bg-black space-y-1.5 text-start">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">STEP 01 • INGEST</span>
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Radio className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "استشعار مسح البطاقة" : "Contactless Tap Trigger"}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isAr ? "متصفح المار يفتح رابط الأمان فورياً بدون تسجيل." : "Native browser executes verified payload token."}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-lg border border-white/10 bg-black space-y-1.5 text-start">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">STEP 02 • CIPHER</span>
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Lock className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "حجب الهوية (Zero-PII)" : "Zero-PII Shield"}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isAr ? "تشفير HMAC وحماية رقم المالك مع مانع إزعاج 3 دقائق." : "HMAC authenticated with 3-minute spam cooldown."}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-lg border border-white/10 bg-black space-y-1.5 text-start">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">STEP 03 • DISPATCH</span>
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "تسليم التنبيه للمالك" : "Instant Owner Dispatch"}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isAr ? "إشعار Telegram أو WhatsApp في زمن قياسي < 350ms." : "Instant encrypted push delivery to owner device."}
            </p>
          </div>
        </div>

        {/* Live Simulation Banner Trigger */}
        <div className="mt-5 p-3.5 rounded-lg border border-white/10 bg-black flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md border border-white/15 bg-[#08080A] flex items-center justify-center text-white shrink-0">
              {simulationStep === "dispatching" ? (
                <div className="w-3.5 h-3.5 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
              ) : simulationStep === "delivered" ? (
                <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <div className="text-start">
              <span className="text-xs font-bold text-white block">
                {simulationStep === "dispatching"
                  ? (isAr ? "جارٍ تشفير وإرسال البلاغ المشفر..." : "Encrypting & Routing Dispatch...")
                  : simulationStep === "delivered"
                  ? (isAr ? "تم تسليم الإشعار للمالك بنجاح (خلال 280ms)" : "Alert Delivered to Owner (<280ms)")
                  : (isAr ? "جاهز للمحاكاة الفورية" : "System Ready for Simulation")}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                SCENARIO: {selectedScenario.toUpperCase()} • LATENCY: 280ms • PROTOCOL: E2EE
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => runSimulation(selectedScenario)}
            disabled={isSimulating}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-white bg-white text-black hover:bg-zinc-200 transition-all font-mono font-bold text-xs uppercase tracking-wider shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isAr ? "بدء المحاكاة" : "Run Test"}
          </button>
        </div>
      </div>
    </section>
  );
}
