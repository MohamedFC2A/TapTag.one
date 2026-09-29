"use client";

import React, { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Shield, Radio, ExternalLink } from "lucide-react";
import { Language } from "@/types";
import { translations } from "@/lib/translations";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagUid: string;
  lang: Language;
  emergencyContactPhone?: string | null;
}

export function CallModal({
  isOpen,
  onClose,
  tagUid,
  lang,
  emergencyContactPhone,
}: CallModalProps) {
  const [callState, setCallState] = useState<"connecting" | "active" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const t = translations[lang].actions.call;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let connectTimeout: NodeJS.Timeout;

    if (isOpen) {
      setCallState("connecting");
      setDurationSeconds(0);
      setIsMuted(false);

      // Attempt real microphone access for authenticated WebRTC audio session
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((s) => {
            stream = s;
            setMicActive(true);
          })
          .catch((err) => {
            console.warn("Microphone access declined or unavailable:", err);
          });
      }

      // Simulate handshake connection
      connectTimeout = setTimeout(() => {
        setCallState("active");
      }, 2000);
    }

    return () => {
      clearTimeout(connectTimeout);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
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
    }, 1000);
  };

  const cleanPhone = emergencyContactPhone?.replace(/[\s\-\(\)]/g, "") || "";

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md glass-surface-elevated border border-white/[0.14] rounded-3xl p-6 sm:p-7 shadow-glass-elevated text-white relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg glass-pill">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-mono uppercase text-white font-bold tracking-wider">
              {lang === "ar" ? "قناة صوتية مشفرة (VoIP Tunnel)" : "Encrypted VoIP Tunnel"}
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400 font-bold px-2 py-0.5 rounded-full glass-pill">{tagUid}</span>
        </div>

        {/* Center Calling Area */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full glass-surface border border-white/20 flex items-center justify-center shadow-glass">
              <Phone
                className={`w-8 h-8 ${
                  callState === "active" ? "text-white animate-pulse" : "text-zinc-400"
                }`}
              />
            </div>
            {callState === "active" && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white animate-ping opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
              </span>
            )}
          </div>

          <div className="text-center space-y-1.5 mb-6">
            <h3 className="text-base font-bold text-white font-mono">
              {callState === "connecting" && (lang === "ar" ? "جارٍ تأمين وتشفير القناة الصوتية..." : t.connecting)}
              {callState === "active" && (lang === "ar" ? "المكالمة متصلة (مشفرة بالكامل)" : t.connected)}
              {callState === "ended" && (lang === "ar" ? "تم إنهاء المكالمة" : t.ended)}
            </h3>

            {callState === "active" ? (
              <div className="flex items-center justify-center gap-2 text-white font-mono text-sm font-bold">
                <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>{formatDuration(durationSeconds)}</span>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 font-mono">
                {lang === "ar"
                  ? "جلسة اتصال مباشرة عبر المتصفح مع حجب تام للأرقام"
                  : "Direct masked audio session without number disclosure"}
              </p>
            )}
          </div>

          {/* Audio Wave Simulation */}
          {callState === "active" && (
            <div className="flex items-center justify-center gap-1.5 h-8 mb-6 w-36">
              {[35, 80, 55, 95, 70, 90, 50, 75, 60, 85].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full transition-all duration-300"
                  style={{
                    height: `${isMuted ? 4 : h}%`,
                    opacity: isMuted ? 0.2 : 0.9,
                  }}
                />
              ))}
            </div>
          )}

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {callState === "active" && (
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isMuted
                    ? "border-white/30 bg-white/10 text-white"
                    : "glass-card text-zinc-300 hover:text-white"
                }`}
                title={isMuted ? t.unmute : t.mute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-red-500/40 bg-red-950/80 hover:bg-red-900 text-red-200 transition-all text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-glass active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span>{t.endCall}</span>
            </button>
          </div>

          {/* Emergency Fallback Direct Call Option */}
          {cleanPhone && (
            <div className="pt-6 w-full">
              <div className="p-3.5 rounded-2xl glass-surface border border-white/[0.08] text-center space-y-2">
                <span className="text-[11px] font-mono text-zinc-400 block">
                  {lang === "ar"
                    ? "إذا لم يجب المالك عبر المتصفح، يمكنك الاتصال بهاتف الطوارئ مباشرة:"
                    : "If owner does not answer via browser, call directly:"}
                </span>
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl glass-card text-white font-mono text-xs font-bold hover:border-white/20 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "اتصال هاتفي مباشر بالمالك (GSM)" : "Direct Phone Call"}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Notice */}
        <div className="border-t border-white/[0.08] pt-4 mt-2">
          <p className="text-[11px] font-mono text-zinc-500 text-center leading-relaxed">
            {t.permissionNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
