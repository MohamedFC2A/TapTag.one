"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Smartphone,
  Bell,
  Mic,
  CheckCircle2,
  X,
  Share,
  Download,
  ShieldCheck,
  Volume2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallAndPermissionsModal() {
  const pathname = usePathname();
  // Default to true during SSR to prevent layout flicker
  const [isInstalled, setIsInstalled] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Permissions state
  const [notificationState, setNotificationState] = useState<string>("default");
  const [micGranted, setMicGranted] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("TapTag SW registered:", reg.scope))
        .catch((err) => console.error("TapTag SW registration failed:", err));
    }

    // 2. Accurate Installation Verification
    const verifyInstallation = () => {
      // Check display-mode standalone
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      // Check persistent installation state
      const previouslyInstalled = localStorage.getItem("taptag_pwa_installed") === "true";
      const dismissedState = localStorage.getItem("taptag_pwa_dismissed") === "true";

      const installed = isStandaloneMode || previouslyInstalled;
      setIsInstalled(installed);

      // Check Notification status
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationState(Notification.permission);
      }

      // Check iOS platform
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isApple);

      // If already installed, NEVER prompt installation
      if (installed) {
        setIsOpen(false);
        return;
      }

      // If not installed and not dismissed, show prompt after brief natural delay
      if (!dismissedState) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    verifyInstallation();

    // 3. Listen for Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not marked installed in localStorage
      if (localStorage.getItem("taptag_pwa_installed") !== "true") {
        setIsInstalled(false);
      }
    };

    // 4. Listen for successful PWA installation
    const handleAppInstalled = () => {
      localStorage.setItem("taptag_pwa_installed", "true");
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Handle native install click (Android / Chrome)
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("taptag_pwa_installed", "true");
        setIsInstalled(true);
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    }
  };

  // Mark already installed manually
  const handleMarkAlreadyInstalled = () => {
    localStorage.setItem("taptag_pwa_installed", "true");
    setIsInstalled(true);
    setIsOpen(false);
  };

  // Dismiss for session
  const handleDismiss = () => {
    localStorage.setItem("taptag_pwa_dismissed", "true");
    setIsOpen(false);
  };

  // Master Permissions Grant (One-Touch)
  const handleGrantAllPermissions = async () => {
    setIsAuthorizing(true);
    setAuthSuccessMessage(null);

    // 1. Notification Permission
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const perm = await Notification.requestPermission();
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

    // 2. Microphone Permission
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicGranted(true);
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn("Microphone permission error:", e);
    }

    // 3. Audio Chime
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Autoplay limitations
    }

    // 4. Haptic Vibration
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([150, 50, 150]);
    }

    setIsAuthorizing(false);
    setAuthSuccessMessage("تم تفعيل كافة الصلاحيات بنجاح! المنظومة جاهزة لإرسال واستقبال التنبيهات.");
  };

  // IF ALREADY INSTALLED, DISMISSED, OR ON IMMERSIVE NAVIGATION PAGES -> NEVER SHOW FLOATING BAR
  const isNavPage = pathname?.includes("/dashboard/calibrate") || pathname?.includes("/dashboard/find");
  if (isInstalled || isDismissed || isNavPage) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Bar (Only shown if NOT installed and NOT on navigation pages) */}
      <div
        className="fixed bottom-3 inset-x-3 z-40 max-w-lg mx-auto p-2.5 rounded-xl border border-[#00C853]/50 bg-[#060608]/95 backdrop-blur-md text-white flex items-center justify-between gap-3 shadow-2xl"
        dir="rtl"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <img
            src="/icon-192.png"
            alt="TapTag Icon"
            className="w-7 h-7 rounded-lg border border-white/20 shrink-0 object-cover"
          />
          <div className="flex flex-col text-start">
            <span className="font-bold text-white text-[11px] sm:text-xs">
              تثبيت تطبيق TapTag على الجوال
            </span>
            <span className="text-[10px] text-zinc-400">
              مطلوب لاستقبال إشعارات الطوارئ الفورية
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            className="bg-[#00C853] hover:bg-[#00B045] text-black font-mono font-bold text-[11px] h-8 px-3 cursor-pointer shrink-0"
          >
            <Download className="w-3 h-3 ml-1" />
            <span>تثبيت</span>
          </Button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            title="إخفاء شريط التثبيت"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Installation & Permissions Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
          dir="rtl"
        >
          <div className="w-full max-w-md bg-[#0A0A0E] border border-white/20 rounded-2xl p-5 text-white space-y-4 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
            {/* Modal Header with High-Resolution App Icon */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src="/icon-192.png"
                  alt="TapTag Official Icon"
                  className="w-12 h-12 rounded-xl border border-white/20 shadow-lg shrink-0 object-cover"
                />
                <div>
                  <h3 className="text-sm font-mono font-bold text-white">
                    تطبيق TapTag.one الرسمي
                  </h3>
                  <span className="text-[10px] font-mono text-[#00C853]">
                    AUTHENTIC PWA & PROTOCOL
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
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

            {/* PWA Home Screen Installation Section */}
            <div className="p-4 rounded-xl border border-white/15 bg-black space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4 text-[#00C853]" />
                <span className="text-xs font-mono font-bold">
                  1. تثبيت التطبيق على الشاشة الرئيسية للجوال
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                تثبيت المنظومة كأيقونة على شاشة جوالك إلزامي لضمان استقبال تنبيهات تحريك السيارة وبلاغات
                الطوارئ فورياً حتى أثناء قفل الشاشة بدون الحاجة لإبقاء المتصفح مفتوحاً.
              </p>

              {/* Android Native Install Button */}
              {deferredPrompt ? (
                <Button
                  onClick={handleInstallClick}
                  className="w-full bg-[#00C853] hover:bg-[#00B045] text-black font-mono font-bold text-xs py-5 cursor-pointer shadow-lg"
                >
                  <Download className="w-4 h-4 ml-2" />
                  <span>تثبيت تطبيق TapTag على الجوال الآن (1-Click)</span>
                </Button>
              ) : isIOS ? (
                /* iOS Safari Step-by-Step Guide */
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
                  من قائمة المتصفح (⋮)، اضغط على <strong>"تثبيت التطبيق" (Install App)</strong> أو <strong>"إضافة للشاشة الرئيسية"</strong>.
                </div>
              )}
            </div>

            {/* Permissions Status Checklist */}
            <div className="p-4 rounded-xl border border-white/15 bg-black space-y-3">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                <span className="text-xs font-mono font-bold">
                  2. تفعيل الصلاحيات الأمنية
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {/* Notifications */}
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

                {/* Microphone */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-[#00C853]" />
                    <span className="text-zinc-300">ميكروفون الاتصال المشفر:</span>
                  </div>
                  {micGranted ? (
                    <span className="text-[#00C853] font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> مفعل
                    </span>
                  ) : (
                    <span className="text-zinc-400 text-[10px]">جاهز</span>
                  )}
                </div>

                {/* Sound Chime */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[#00C853]" />
                    <span className="text-zinc-300">نغمة الإنذار التكتيكي:</span>
                  </div>
                  <span className="text-[#00C853] font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> جاهز
                  </span>
                </div>
              </div>

              {/* Master Button to Grant All Permissions */}
              <div className="pt-1">
                <Button
                  onClick={handleGrantAllPermissions}
                  disabled={isAuthorizing}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs py-5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 ml-2" />
                  <span>
                    {isAuthorizing ? "جارٍ التفعيل..." : "الموافقة وتفعيل كافة الصلاحيات بنقرة واحدة"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Bottom Actions: Already Installed & Dismiss */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={handleMarkAlreadyInstalled}
                className="inline-flex items-center gap-1.5 text-[#00C853] hover:underline cursor-pointer font-bold text-[11px]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>التطبيق مثبت لدي بالفعل</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="text-zinc-400 hover:text-white cursor-pointer text-[11px]"
              >
                متابعة بدون تثبيت
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
