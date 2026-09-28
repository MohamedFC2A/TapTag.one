"use client";

import React, { useState } from "react";
import {
  Car,
  AlertTriangle,
  PhoneCall,
  Terminal,
  Check,
  Lock,
  Radio,
  Send,
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
    "[04:40:01.012] GATEWAY: Dual-Engine Contactless Core listening",
    "[04:40:01.018] CIPHER: AES-256-GCM HSM KeyRing active",
    "[04:40:01.025] STATUS: Zero-PII Shield active (0 identity leakage)",
  ]);

  const runSimulation = (scenario: "movement" | "emergency" | "call") => {
    setSelectedScenario(scenario);
    setIsSimulating(true);
    setCurrentStep("tokenizing");

    const time = new Date().toISOString().substring(11, 23);
    const targetTag = "TT-88219-X";

    setLogFeed([
      `[${time}] INGEST: Contactless scan detected for UID [${targetTag}]`,
      `[${time}] CIPHER: HMAC-SHA256 signature generated. Owner phone sealed.`,
    ]);

    setTimeout(() => {
      const dispatchTime = new Date().toISOString().substring(11, 23);
      setCurrentStep("dispatched");
      setLogFeed((prev) => [
        ...prev,
        `[${dispatchTime}] DISPATCH: Webhook relayed via encrypted tunnel (latency: 210ms)`,
        `[${dispatchTime}] DELIVERED: Owner device notified. HTTP 200 OK`,
      ]);

      setTimeout(() => {
        setIsSimulating(false);
      }, 3500);
    }, 900);
  };

  return (
    <section id="live-simulator" className="w-full py-12 max-w-5xl mx-auto px-4 space-y-4">
      {/* Console Section Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C853]" />
          <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide">
            {isAr ? "غرفة العمليات والبث الحي" : "OPERATIONS & TELEMETRY CONSOLE"}
          </h2>
        </div>

        <span className="text-[10px] font-mono text-[#00C853]">
          ACTIVE • &lt; 250ms
        </span>
      </div>

      {/* Main Command Console Card */}
      <div className="rounded-xl border border-white/15 bg-[#060608] overflow-hidden">
        {/* Top Control Bar with Tabs */}
        <div className="p-3 border-b border-white/10 bg-black flex flex-wrap items-center justify-between gap-3">
          {/* Scenario Tabs */}
          <div className="flex items-center gap-1 bg-[#0A0A0E] p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => runSimulation("movement")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                selectedScenario === "movement"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "تحريك مركبة" : "Move Car"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("emergency")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                selectedScenario === "emergency"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "طوارئ" : "Emergency"}</span>
            </button>

            <button
              type="button"
              onClick={() => runSimulation("call")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                selectedScenario === "call"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#00C853]" />
              <span>{isAr ? "مكالمة مشفرة" : "VoIP Tunnel"}</span>
            </button>
          </div>

          {/* Direct Simulation Action Button */}
          <button
            type="button"
            onClick={() => runSimulation(selectedScenario)}
            disabled={isSimulating}
            className="px-4 py-1.5 rounded-lg border border-white bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? (isAr ? "جارٍ الإرسال..." : "Dispatching...") : (isAr ? "محاكاة الإرسال" : "Simulate Dispatch")}
          </button>
        </div>

        {/* Split View Console Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-white/10 rtl:lg:divide-x-reverse">
          {/* Left Column: Visual Pipeline Status (6 cols) */}
          <div className="lg:col-span-6 p-5 space-y-4 text-start flex flex-col justify-between">
            {/* Status Pipeline Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`p-2.5 rounded border space-y-1 transition-colors ${
                  currentStep !== "idle"
                    ? "border-[#00C853]/60 bg-[#00C853]/10"
                    : "border-white/10 bg-black"
                }`}
              >
                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
                  <Radio className="w-3 h-3 text-[#00C853]" />
                  <span>01 TAP</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-white block">
                  {isAr ? "مسح البطاقة" : "Card Scanned"}
                </span>
              </div>

              <div
                className={`p-2.5 rounded border space-y-1 transition-colors ${
                  currentStep === "tokenizing" || currentStep === "dispatched"
                    ? "border-[#00C853]/60 bg-[#00C853]/10"
                    : "border-white/10 bg-black"
                }`}
              >
                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
                  <Lock className="w-3 h-3 text-[#00C853]" />
                  <span>02 CIPHER</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-white block">
                  {isAr ? "حجب الرقم" : "Zero-PII"}
                </span>
              </div>

              <div
                className={`p-2.5 rounded border space-y-1 transition-colors ${
                  currentStep === "dispatched"
                    ? "border-[#00C853]/60 bg-[#00C853]/10"
                    : "border-white/10 bg-black"
                }`}
              >
                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
                  <Check className="w-3 h-3 text-[#00C853]" />
                  <span>03 DELIVER</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-white block">
                  {isAr ? "تم التسليم" : "Delivered"}
                </span>
              </div>
            </div>

            {/* VoIP Audio Stream Visualizer (when Call selected) */}
            {selectedScenario === "call" && (
              <div className="p-3 rounded border border-[#00C853]/30 bg-[#00C853]/5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white">
                      WebRTC Audio Bridge Active
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    SRTP E2EE • Zero Phone Disclosure
                  </span>
                </div>

                {/* Oscillating Audio Frequency Bars */}
                <div className="flex items-center gap-1 h-5">
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-1" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-2" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-3" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-4" />
                  <div className="w-1 bg-[#00C853] rounded-full animate-audio-5" />
                </div>
              </div>
            )}

            {/* Bottom Status Line */}
            <div className="pt-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>TARGET: TT-88219-X</span>
              <span className="text-[#00C853]">LATENCY: 210ms</span>
            </div>
          </div>

          {/* Right Column: Live Terminal Telemetry Feed with LTR Direction (6 cols) */}
          <div
            dir="ltr"
            className="lg:col-span-6 p-4 bg-[#030304] font-mono text-[10px] space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Terminal className="w-3 h-3 text-[#00C853]" />
                  <span className="font-bold tracking-wider">CRYPTOGRAPHIC AUDIT STREAM</span>
                </div>
                <span className="text-[9px] text-[#00C853] bg-[#00C853]/10 px-1 py-0.5 rounded border border-[#00C853]/30">
                  LIVE
                </span>
              </div>

              {/* Feed Lines */}
              <div className="space-y-1 text-left">
                {logFeed.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed break-all ${
                      line.includes("DELIVERED")
                        ? "text-[#00C853] font-bold"
                        : line.includes("INGEST")
                        ? "text-white font-semibold"
                        : "text-zinc-400"
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[9px] text-zinc-500">
              <span>HSM ENCRYPTED</span>
              <span>ZERO PII</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
