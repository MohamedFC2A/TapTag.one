"use client";

import React, { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Shield, Radio } from "lucide-react";
import { Language } from "@/types";
import { translations } from "@/lib/translations";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagUid: string;
  lang: Language;
}

export function CallModal({ isOpen, onClose, tagUid, lang }: CallModalProps) {
  const [callState, setCallState] = useState<"connecting" | "active" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const t = translations[lang].actions.call;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setCallState("connecting");
      setDurationSeconds(0);
      setIsMuted(false);

      // Simulate instantaneous WebRTC handshake
      const connectTimeout = setTimeout(() => {
        setCallState("active");
      }, 2500);

      return () => {
        clearTimeout(connectTimeout);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "active") {
      interval = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallState("ended");
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-none flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 rounded p-6 shadow-none text-white relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
              {lang === "ar" ? "قناة صوتية مشفرة (VoIP)" : "Encrypted VoIP Tunnel"}
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">{tagUid}</span>
        </div>

        {/* Center Calling Area */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center">
              <Phone className={`w-8 h-8 ${callState === "active" ? "text-emerald-400 animate-pulse" : "text-zinc-400"}`} />
            </div>
            {callState === "active" && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className="text-center space-y-1 mb-6">
            <h3 className="text-base font-semibold text-white">
              {callState === "connecting" && t.connecting}
              {callState === "active" && t.connected}
              {callState === "ended" && t.ended}
            </h3>

            {callState === "active" ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-sm">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{formatDuration(durationSeconds)}</span>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                {lang === "ar" ? "جلسة مباشرة بدون وسيط مع حجب كامل للأرقام" : "Direct masked audio session without number disclosure"}
              </p>
            )}
          </div>

          {/* Audio Wave Simulation (Flat bar design) */}
          {callState === "active" && (
            <div className="flex items-center justify-center gap-1.5 h-6 mb-8 w-32">
              {[40, 75, 50, 90, 60, 85, 45, 70].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-500 rounded-sm transition-all duration-300"
                  style={{
                    height: `${isMuted ? 4 : h}%`,
                    opacity: isMuted ? 0.3 : 0.8,
                  }}
                />
              ))}
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center gap-4">
            {callState === "active" && (
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded border transition-colors ${
                  isMuted
                    ? "border-amber-600 bg-amber-950/60 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                }`}
                title={isMuted ? t.unmute : t.mute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="inline-flex items-center gap-2 px-6 py-3 rounded border border-red-800 bg-red-950 text-red-300 hover:bg-red-900 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider"
            >
              <PhoneOff className="w-4 h-4" />
              <span>{t.endCall}</span>
            </button>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="border-t border-zinc-800 pt-4 mt-2">
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            {t.permissionNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
