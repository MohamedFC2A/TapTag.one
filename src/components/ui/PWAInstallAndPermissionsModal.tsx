"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Bell,
  Mic,
  MapPin,
  CheckCircle2,
  X,
  Share,
  Download,
  ShieldCheck,
  AlertTriangle,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallAndPermissionsModal() {
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasPromptedAuto, setHasPromptedAuto] = useState(false);

  // Permissions state
  const [notificationState, setNotificationState] = useState<string>("default");
  const [micGranted, setMicGranted] = useState(false);
  const [geoGranted, setGeoGranted] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("TapTag SW registered:", reg.scope))
        .catch((err) => console.error("TapTag SW registration failed:", err));
    }

    // 2. Check if already standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Check current Notification permission
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationState(Notification.permission);
      }

      // Check iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isApple);

      // Auto-open modal on mobile if not installed or notification not granted
      if (!isStandaloneMode && !hasPromptedAuto) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          setHasPromptedAuto(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    };

    checkStandalone();

    // 3. Listen for Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsStandalone(false);
      setIsOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [hasPromptedAuto]);

  // Install PWA (Android / Chrome)
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsStandalone(true);
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    }
  };

  // Master Permission Grant (One-Touch)
  const handleGrantAllPermissions = async () => {
    setIsAuthorizing(true);
    setAuthSuccessMessage(null);

    let notifResult = notificationState;

    // 1. Notification Permission
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const perm = await Notification.requestPermission();
        notifResult = perm;
        setNotificationState(perm);
        if (perm === "granted") {
          try {
            new Notification("TapTag.one — تنبيهات الأمان نشطة", {
              body: "تم تفعيل استقبال إشعارات المركبة والطوارئ بنجاح على هذا الجوال.",
              icon: "/icon-192.png",
            });
          } catch (e) {
            console.log("Local notification triggered:", e);
          }
        }
      }
    } catch (e) {
      console.warn("Notification permission error:", e);
    }

    // 2. Microphone Permission (for VoIP Encrypted Calling)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicGranted(true);
        // Release tracks after successful permission check
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn("Microphone permission error:", e);
    }

    // 3. Geolocation Permission
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setGeoGranted(true),
          (err) => console.warn("Geo warning:", err.message),
          { timeout: 5000 }
        );
      }
    } catch (e) {
      console.warn("Geo error:", e);
    }

    // 4. Play audio activation tone
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio autoplay restrictions
    }

    // 5. Vibration
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([150, 50, 150]);
    }

    setIsAuthorizing(false);
    setAuthSuccessMessage("تم منح وتفعيل كافة الصلاحيات بنجاح! المنظومة جاهزة لاستقبال التنبيهات.");
  };

  // If already standalone and all permissions granted, hide floating trigger
  const allGranted = notificationState === "granted" && isStandalone;

  return (
    <>
      {/* Floating Mobile Sticky Header Bar if not installed or notification pending */}
      {!allGranted && (
        <div className="fixed bottom-3 inset-x-3 z-40 max-w-lg mx-auto p-2.5 rounded-xl border border-[#00C853]/50 bg-[#060608]/95 backdrop-blur-md text-white flex items-center justify-between gap-3 shadow-2xl" dir="rtl">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse shrink-0" />
            <span className="font-bold text-[11px] sm:text-xs">
              {!isStandalone ? "تثبيت تطبيق TapTag على الجوال إلزامي" : "تفعيل استقبال إشعارات المركبة"}
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            className="bg-[#00C853] hover:bg-[#00B045] text-black font-mono font-bold text-[11px] h-8 px-3 cursor-pointer shrink-0"
          >
            <Download className="w-3 h-3 ml-1" />
            <span>تثبيت وصلاحيات</span>
          </Button>
        </div>
      )}

      {/* Main Mandatory PWA & Permissions Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4" dir="rtl">
          <div className="w-full max-w-md bg-[#0A0A0E] border border-white/20 rounded-2xl p-5 text-white space-y-4 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00C853]" />
                <h3 className="text-sm font-mono font-bold text-white">
                  إعدادات الجوال الإلزامية والصلاحيات
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success message */}
            {authSuccessMessage && (
              <div className="p-3 rounded-lg border border-[#00C853]/40 bg-[#00C853]/10 text-xs font-mono text-[#00C853] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{authSuccessMessage}</span>
              </div>
            )}

            {/* Section 1: PWA Home Screen Installation */}
            {!isStandalone && (
              <div className="p-4 rounded-xl border border-white/15 bg-black space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Smartphone className="w-4 h-4 text-[#00C853]" />
                  <span className="text-xs font-mono font-bold">
                    1. تثبيت التطبيق على سطح الجوال (PWA)
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                  تثبيت المنظومة كأيقونة على شاشة جوالك الرئيسية إلزامي لضمان استقبال إشعارات الطوارئ
                  والتحريك الفورية لمركبتك حتى أثناء قفل الشاشة بدون الحاجة لفتح المتصفح.
                </p>

                {/* Android 1-Click Install */}
                {deferredPrompt ? (
                  <Button
                    onClick={handleInstallClick}
                    className="w-full bg-[#00C853] hover:bg-[#00B045] text-black font-mono font-bold text-xs py-5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    <span>تثبيت تطبيق TapTag على الجوال الآن (1-Click)</span>
                  </Button>
                ) : isIOS ? (
                  /* iOS Safari Step-by-Step Instructions */
                  <div className="p-3 rounded-lg border border-white/10 bg-[#060608] space-y-2 text-[11px] font-mono text-zinc-300">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Share className="w-4 h-4 text-[#00C853]" />
                      <span>طريقة التثبيت على أجهزة iPhone / iPad:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                      <li>
                        اضغط على أيقونة <strong className="text-white">المشاركة (Share 📤)</strong> في شريط Safari بالأسفل.
                      </li>
                      <li>
                        مرر للأسفل واختر <strong className="text-white">"إضافة إلى الصفحة الرئيسية" (Add to Home Screen ➕)</strong>.
                      </li>
                      <li>
                        اضغط <strong className="text-[#00C853]">"إضافة" (Add)</strong> في أعلى الزاوية.
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-zinc-400 bg-[#060608] p-2.5 rounded border border-white/10">
                    من قائمة المتصفح (⋮)، اختر <strong>"تثبيت التطبيق" (Install App)</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Permissions Status Checklist */}
            <div className="p-4 rounded-xl border border-white/15 bg-black space-y-3">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                <span className="text-xs font-mono font-bold">
                  2. صلاحيات الأمان والتنبيهات المعتمدة
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {/* Notification Permission Item */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[#00C853]" />
                    <span className="text-zinc-300">إشعارات الطوارئ والتحريك:</span>
                  </div>
                  {notificationState === "granted" ? (
                    <span className="text-[#00C853] font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> مفعلة
                    </span>
                  ) : (
                    <span className="text-yellow-400 font-bold text-[10px]">مطلوبة</span>
                  )}
                </div>

                {/* Microphone Permission Item */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-[#00C853]" />
                    <span className="text-zinc-300">ميكروفون المكالمة المشفرة (VoIP):</span>
                  </div>
                  {micGranted ? (
                    <span className="text-[#00C853] font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> مفعل
                    </span>
                  ) : (
                    <span className="text-zinc-400 text-[10px]">جاهز للتفعيل</span>
                  )}
                </div>

                {/* Audio Output */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[#00C853]" />
                    <span className="text-zinc-300">نغمة الإنذار والتنبيه الصوتي:</span>
                  </div>
                  <span className="text-[#00C853] font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> جاهز
                  </span>
                </div>
              </div>

              {/* Master Button to Grant All Permissions */}
              <div className="pt-2">
                <Button
                  onClick={handleGrantAllPermissions}
                  disabled={isAuthorizing}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs py-5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 ml-2" />
                  <span>
                    {isAuthorizing ? "جارٍ طلب الصلاحيات..." : "الموافقة وتفعيل كافة الصلاحيات بنقرة واحدة"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer underline"
              >
                متابعة الاستخدام الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
