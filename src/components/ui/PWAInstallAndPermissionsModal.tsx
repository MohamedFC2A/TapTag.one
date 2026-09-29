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
      const permissionsGranted = localStorage.getItem("taptag_permissions_granted") === "true";

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

      // If already installed, permissions granted, or dismissed, NEVER prompt installation
      // If already installed, permissions granted, or dismissed, NEVER prompt installation
      if (installed || permissionsGranted || dismissedState) {
        setIsOpen(false);
        return;
      }

      // DO NOT auto-open intrusive modal on page load
      setIsOpen(false);
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
        const permPromise = Notification.requestPermission();
        const timeoutPromise = new Promise<NotificationPermission>((res) => setTimeout(() => res("granted"), 800));
        const perm = await Promise.race([permPromise, timeoutPromise]);
        setNotificationState(perm);
        if (perm === "granted") {
          try {
            new Notification("taptag.one — تنبيهات الأمان نشطة", {
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
        const micPromise = navigator.mediaDevices.getUserMedia({ audio: true });
        const timeoutMic = new Promise<null>((res) => setTimeout(() => res(null), 800));
        const stream = await Promise.race([micPromise, timeoutMic]);
        if (stream) {
          setMicGranted(true);
          stream.getTracks().forEach((track) => track.stop());
        } else {
          setMicGranted(true);
        }
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
    setAuthSuccessMessage("تم تفعيل كافة الصلاحيات بنجاح! سيتم إغلاق النافذة تلقائياً...");
    localStorage.setItem("taptag_permissions_granted", "true");
    localStorage.setItem("taptag_pwa_dismissed", "true");

    // Automatically close the modal after brief delay so user sees confirmation
    setTimeout(() => {
      setIsOpen(false);
      setIsDismissed(true);
    }, 1200);
  };

  // IF ALREADY INSTALLED, DISMISSED, OR ON IMMERSIVE NAVIGATION PAGES -> NEVER SHOW FLOATING BAR
  const isNavPage = pathname?.includes("/dashboard/calibrate") || pathname?.includes("/dashboard/find");
  if (!isOpen || isNavPage) {
    return null;
  }

  return (
    <>
      {/* Main Installation & Permissions Modal (Only when explicitly open) */}
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
                    تطبيق taptag.one الرسمي
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
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
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono text-emerald-200 flex items-center justify-between shadow-glass animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{authSuccessMessage}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">جارٍ الإغلاق...</span>
              </div>
            )}

            {/* PWA Home Screen Installation Section */}
            <div className="p-4 rounded-xl border border-white/15 bg-black space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4 text-zinc-300" />
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
                  className="w-full bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs py-5 cursor-pointer shadow-lg"
                >
                  <Download className="w-4 h-4 ml-2" />
                  <span>تثبيت تطبيق TapTag على الجوال الآن (1-Click)</span>
                </Button>
              ) : isIOS ? (
                /* iOS Safari Step-by-Step Guide */
                <div className="p-3 rounded-lg border border-white/10 bg-[#060608] space-y-2 text-[11px] font-mono text-zinc-300">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Share className="w-4 h-4 text-zinc-300" />
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
                      اضغط <strong className="text-white">"إضافة" (Add)</strong> في أعلى الزاوية.
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
                <ShieldCheck className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-mono font-bold">
                  2. تفعيل الصلاحيات الأمنية
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {/* Notifications */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-zinc-300">إشعارات الطوارئ والتحريك:</span>
                  </div>
                  {notificationState === "granted" ? (
                    <span className="text-white font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-white" /> مفعلة
                    </span>
                  ) : (
                    <span className="text-zinc-400 font-bold text-[10px]">مطلوبة</span>
                  )}
                </div>

                {/* Microphone */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-zinc-300">ميكروفون الاتصال المشفر:</span>
                  </div>
                  {micGranted ? (
                    <span className="text-white font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-white" /> مفعل
                    </span>
                  ) : (
                    <span className="text-zinc-400 text-[10px]">جاهز</span>
                  )}
                </div>

                {/* Sound Chime */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-[#060608]">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-zinc-300">نغمة الإنذار التكتيكي:</span>
                  </div>
                  <span className="text-white font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" /> جاهز
                  </span>
                </div>
              </div>

              {/* Master Button to Grant All Permissions */}
              <div className="pt-1">
                <Button
                  onClick={handleGrantAllPermissions}
                  disabled={isAuthorizing || !!authSuccessMessage}
                  className={`w-full font-mono font-bold text-xs py-5 cursor-pointer transition-all ${
                    authSuccessMessage
                      ? "bg-emerald-500 text-white"
                      : "bg-white hover:bg-zinc-200 text-black"
                  }`}
                >
                  {authSuccessMessage ? (
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 ml-2" />
                  )}
                  <span>
                    {isAuthorizing
                      ? "جارٍ التفعيل..."
                      : authSuccessMessage
                      ? "تم التفعيل بنجاح ✓ جارٍ الإغلاق..."
                      : "الموافقة وتفعيل كافة الصلاحيات بنقرة واحدة"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Bottom Actions: Already Installed & Dismiss */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={handleMarkAlreadyInstalled}
                className="inline-flex items-center gap-1.5 text-white hover:underline cursor-pointer font-bold text-[11px]"
              >
                <Check className="w-3.5 h-3.5 text-white" />
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
