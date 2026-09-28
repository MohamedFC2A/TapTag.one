"use client";

import React, { useState } from "react";
import {
  Car,
  AlertTriangle,
  PhoneCall,
  Terminal,
  CheckCircle2,
  Lock,
  Radio,
  Zap,
} from "lucide-react";
import { Language } from "@/types";

interface LiveOperationsConsoleProps {
  lang: Language;
}

export function LiveOperationsConsole({ lang }: LiveOperationsConsoleProps) {
  const isAr = lang === "ar";
  const [selectedScenario, setSelectedScenario] = useState<"movement" | "emergency" | "call">("movement");
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "tokenizing" | "dispatched">("idle");
  const [logFeed, setLogFeed] = useState<string[]>([
    "[04:28:10.102] READY: Dual-Engine Contactless Gateway listening",
    "[04:28:10.105] CIPHER: AES-256-GCM HSM KeyRing initialized",
  ]);

  const runSimulation = (scenario: "movement" | "emergency" | "call") => {
    setSelectedScenario(scenario);
    setIsSimulating(true);
    setCurrentStep("tokenizing");

    const time = new Date().toISOString().substring(11, 23);
    const targetTag = "TT-88219-X";

    setLogFeed([
      `[${time}] INGEST: Contactless scan detected for UID [${targetTag}]`,
      `[${time}] TOKENIZE: Generating HMAC-SHA256 signature (Zero-PII active)`,
    ]);

    setTimeout(() => {
      const dispatchTime = new Date().toISOString().substring(11, 23);
      setCurrentStep("dispatched");
      setLogFeed((prev) => [
        ...prev,
        `[${dispatchTime}] DISPATCH: Webhook routed via encrypted tunnel (latency 240ms)`,
        `[${dispatchTime}] DELIVERED: Owner device alerted successfully. Status 200 OK`,
      ]);

      setTimeout(() => {
        setIsSimulating(false);
      }, 4000);
    }, 1100);
  };

  return (
    <section id="live-simulator" className="w-full py-16 max-w-5xl mx-auto px-4 space-y-6">
      {/* Console Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1.5 text-start">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            <span className="text-[11px] font-mono text-[#00C853] uppercase font-bold tracking-widest">
              OPERATIONS CONSOLE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isAr ? "محاكي غرف العمليات والتنبيه المشفر" : "Cryptographic Telemetry & Dispatch Console"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
          <span className="text-[11px] font-mono text-zinc-400">GATEWAY ONLINE • LATENCY &lt; 250ms</span>
        </div>
      </div>

      {/* Main Command Console Card */}
      <div className="rounded-xl border border-white/15 bg-[#060608] overflow-hidden">
        {/* Top Control Bar with Tabs */}
        <div className="p-4 border-b border-white/10 bg-black/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-start">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">
              TRIGGER EVENT SELECTOR
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {isAr ? "اختر نوع البلاغ لتتبع مسار التشفير الفوري:" : "Select incident type to inspect telemetry flow:"}
            </span>
          </div>

          {/* Precision Scenario Tabs */}
          <div className="flex items-center gap-1.5 bg-black p-1 rounded-lg border border-white/15 shrink-0">
            <button
              type="button"
              onClick={() => runSimulation("movement")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedScenario === "movement"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "تحريك مركبة" : "Move Vehicle"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("emergency")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedScenario === "emergency"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "طوارئ واقتحام" : "Emergency"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("call")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedScenario === "call"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "مكالمة VoIP" : "VoIP Voice Bridge"}</span>
            </button>
          </div>
        </div>

        {/* Split View Console Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-white/10 rtl:lg:divide-x-reverse">
          {/* Left Column: Flow & Action Button (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6 flex flex-col justify-between">
            {/* 3-Stage Telemetry Pipeline */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider text-start">
                EXECUTION PIPELINE
              </span>

              <div className="grid grid-cols-3 gap-2">
                {/* Step 1 */}
                <div
                  className={`p-3 rounded-lg border text-start space-y-1 transition-colors ${
                    currentStep !== "idle"
                      ? "border-[#00C853]/50 bg-[#00C853]/5"
                      : "border-white/10 bg-black"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                    <Radio className="w-3 h-3 text-[#00C853]" />
                    <span>01 INGEST</span>
                  </div>
                  <span className="text-xs font-bold text-white block">
                    {isAr ? "مسح NFC / QR" : "Contactless Tap"}
                  </span>
                </div>

                {/* Step 2 */}
                <div
                  className={`p-3 rounded-lg border text-start space-y-1 transition-colors ${
                    currentStep === "tokenizing" || currentStep === "dispatched"
                      ? "border-[#00C853]/50 bg-[#00C853]/5"
                      : "border-white/10 bg-black"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                    <Lock className="w-3 h-3 text-[#00C853]" />
                    <span>02 CIPHER</span>
                  </div>
                  <span className="text-xs font-bold text-white block">
                    {isAr ? "حجب الهوية" : "Zero-PII Seal"}
                  </span>
                </div>

                {/* Step 3 */}
                <div
                  className={`p-3 rounded-lg border text-start space-y-1 transition-colors ${
                    currentStep === "dispatched"
                      ? "border-[#00C853]/50 bg-[#00C853]/5"
                      : "border-white/10 bg-black"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                    <CheckCircle2 className="w-3 h-3 text-[#00C853]" />
                    <span>03 DELIVER</span>
                  </div>
                  <span className="text-xs font-bold text-white block">
                    {isAr ? "تنبيه المالك" : "Dispatched"}
                  </span>
                </div>
              </div>
            </div>

            {/* VoIP Audio Stream Visualizer (when Call selected) */}
            {selectedScenario === "call" && (
              <div className="p-3.5 rounded-lg border border-[#00C853]/30 bg-[#00C853]/5 flex items-center justify-between">
                <div className="text-start space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white">
                      WebRTC Secure Audio Stream Active
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    SRTP AES-128 Encryption • Peer-to-Peer
                  </span>
                </div>

                {/* Oscillating Audio Waveform Bars */}
                <div className="flex items-center gap-1 h-6">
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-1" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-2" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-3" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-4" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-5" />
                </div>
              </div>
            )}

            {/* Trigger Button & Status Feedback */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-start">
                <span className="text-xs font-mono text-white font-bold block">
                  {currentStep === "tokenizing"
                    ? (isAr ? "جارٍ تشفير الحزمة وبث الإشعار..." : "Generating cryptographic token...")
                    : currentStep === "dispatched"
                    ? (isAr ? "تم تسليم الإشعار للمالك بنجاح (زمن الاستجابة: 240ms)" : "Alert successfully routed (<240ms)")
                    : (isAr ? "جاهز لإطلاق المحاكاة المباشرة" : "Ready for live simulation trigger")}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  TOKEN: HMAC-SHA256 • PROTOCOL: ZERO-KNOWLEDGE
                </span>
              </div>

              <button
                type="button"
                onClick={() => runSimulation(selectedScenario)}
                disabled={isSimulating}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-white bg-white text-black hover:bg-zinc-200 transition-all font-mono font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSimulating ? (isAr ? "جارٍ البث..." : "Routing...") : (isAr ? "تنفيذ المحاكاة" : "Simulate Dispatch")}
              </button>
            </div>
          </div>

          {/* Right Column: Live Telemetry Terminal Feed (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-[#030304] flex flex-col justify-between font-mono text-[11px] space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Terminal className="w-3.5 h-3.5 text-[#00C853]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">AUDIT LOG FEED</span>
                </div>
                <span className="text-[9px] text-[#00C853] bg-[#00C853]/10 px-1.5 py-0.5 rounded border border-[#00C853]/30">
                  LIVE
                </span>
              </div>

              {/* Feed Lines */}
              <div className="space-y-1.5 text-start font-mono text-[10px] text-zinc-400">
                {logFeed.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed break-all ${
                      line.includes("DELIVERED")
                        ? "text-[#00C853] font-bold"
                        : line.includes("INGEST")
                        ? "text-white"
                        : "text-zinc-400"
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[9px] text-zinc-500">
              <span>HSM CLUSTER: ACTIVE</span>
              <span>BUFFER: 0 DROPPED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
