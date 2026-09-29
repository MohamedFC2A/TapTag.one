"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Car,
  AlertTriangle,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Fingerprint,
  Smartphone,
  Sliders,
  Eye,
  RefreshCw,
  Cpu,
  KeyRound,
  Zap,
  ExternalLink,
  Compass,
  Navigation,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { SafePublicTag, Language, TagStatus } from "@/types";
import { translations } from "@/lib/translations";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CallModal } from "@/components/ui/CallModal";
import { VehicleSpatialFinder } from "@/components/navigation/VehicleSpatialFinder";
import { SpatialCalibrationModal } from "@/components/navigation/SpatialCalibrationModal";
import {
  sendMovementAlert,
  sendEmergencyReport,
  sendDirectNote,
} from "@/app/actions/alert-actions";
import {
  claimAndActivateTag,
  updateOwnerSettings,
  verifyOwnerDevice,
} from "@/app/actions/activation-actions";
import {
  getOrCreateDeviceId,
  getClientDeviceName,
  performBiometricAuth,
} from "@/lib/device-auth";

interface TagActionClientProps {
  initialTag: SafePublicTag;
  isFactoryUnclaimed?: boolean;
}

export function TagActionClient({ initialTag, isFactoryUnclaimed }: TagActionClientProps) {
  const [lang, setLang] = useState<Language>("ar");
  const [tag, setTag] = useState<SafePublicTag>(initialTag);
  const [activeTab, setActiveTab] = useState<"movement" | "emergency" | "note" | null>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Device & Ownership state
  const [clientDeviceId, setClientDeviceId] = useState<string>("");
  const [isOwnerDevice, setIsOwnerDevice] = useState<boolean>(false);
  const [viewAsBystander, setViewAsBystander] = useState<boolean>(false);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);

  // Zero-Hardware Spatial Navigation State
  const [isSpatialFinderOpen, setIsSpatialFinderOpen] = useState<boolean>(false);
  const [isSpatialCalibrationOpen, setIsSpatialCalibrationOpen] = useState<boolean>(false);

  // First-Claim Form states
  const [claimPlate, setClaimPlate] = useState(tag.vehiclePlate || "أ ب ج 1234");
  const [claimMake, setClaimMake] = useState(tag.vehicleMake || "Toyota");
  const [claimModel, setClaimModel] = useState(tag.vehicleModel || "Land Cruiser");
  const [claimColor, setClaimColor] = useState(tag.vehicleColor || "White Pearl");
  const [claimPhone, setClaimPhone] = useState(tag.emergencyContactPhone || "+966555123456");
  const [claimAutoReply, setClaimAutoReply] = useState(tag.autoResponseText || "سأعود خلال 15 دقيقة");

  // Owner Management Form states
  const [ownerStatus, setOwnerStatus] = useState<TagStatus>(tag.status);
  const [ownerAutoReplyText, setOwnerAutoReplyText] = useState(tag.autoResponseText || "");
  const [ownerAutoReplyEnabled, setOwnerAutoReplyEnabled] = useState(tag.autoResponseEnabled);
  const [ownerNotifyWhatsApp, setOwnerNotifyWhatsApp] = useState(tag.notifyWhatsApp ?? true);
  const [ownerNotifyPush, setOwnerNotifyPush] = useState(tag.notifyPush ?? true);
  const [ownerNotifyTelegram, setOwnerNotifyTelegram] = useState(tag.notifyTelegram ?? false);
  const [ownerNotifySms, setOwnerNotifySms] = useState(tag.notifySms ?? false);

  // Bystander Form states
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customMovementNote, setCustomMovementNote] = useState<string>("");
  const [selectedEmergencyCategory, setSelectedEmergencyCategory] = useState<string>("BUMP");
  const [emergencyDetails, setEmergencyDetails] = useState<string>("");
  const [directNoteText, setDirectNoteText] = useState<string>("");

  // Feedback & Cooldown state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [lastDispatchResult, setLastDispatchResult] = useState<{
    whatsappUrl?: string;
    smsUrl?: string;
    telUrl?: string;
    recipientPhoneMasked?: string;
    message?: string;
  } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const t = translations[lang];
  const isAr = lang === "ar";

  // Initialize and check Device ID
  useEffect(() => {
    const devId = getOrCreateDeviceId();
    setClientDeviceId(devId);

    if (tag.isActivated && tag.ownerDeviceId) {
      if (tag.ownerDeviceId === devId) {
        setIsOwnerDevice(true);
      }
    }
  }, [tag.isActivated, tag.ownerDeviceId]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Set default reason when language changes
  useEffect(() => {
    if (t.actions.movement.reasons.length > 0 && !selectedReason) {
      setSelectedReason(t.actions.movement.reasons[0]);
    }
  }, [lang, t.actions.movement.reasons, selectedReason]);

  // First-Claim Ownership: Claim tag via Biometric / Device Key
  const handleFirstClaim = async () => {
    setIsBiometricAuthenticating(true);
    setFeedback(null);

    try {
      const bioAuth = await performBiometricAuth(tag.tagUid);
      if (!bioAuth.success) {
        setIsBiometricAuthenticating(false);
        setFeedback({
          type: "error",
          message: bioAuth.error || "تعذرت المصادقة بالبصمة. يلزم وضع البصمة لتأكيد ملكية البطاقة.",
        });
        return;
      }
      const devName = getClientDeviceName();

      startTransition(async () => {
        const res = await claimAndActivateTag({
          tagUid: tag.tagUid,
          deviceId: bioAuth.deviceId,
          deviceName: devName,
          vehiclePlate: claimPlate,
          vehicleMake: claimMake,
          vehicleModel: claimModel,
          vehicleColor: claimColor,
          emergencyContactPhone: claimPhone,
          autoResponseText: claimAutoReply,
        });

        setIsBiometricAuthenticating(false);

        if (res.success) {
          setTag((prev) => ({
            ...prev,
            isActivated: true,
            ownerDeviceId: bioAuth.deviceId,
            ownerDeviceName: devName,
            vehiclePlate: claimPlate,
            vehicleMake: claimMake,
            vehicleModel: claimModel,
            vehicleColor: claimColor,
            emergencyContactPhone: claimPhone,
            autoResponseText: claimAutoReply,
          }));
          setIsOwnerDevice(true);
          setFeedback({
            type: "success",
            message: "تم تفعيل البطاقة بنجاح وربطها ببصمة جهازك وقفل الملكية الحصرية!",
          });
        } else {
          setFeedback({
            type: "error",
            message: res.message || "حدث خطأ أثناء تفعيل البطاقة.",
          });
        }
      });
    } catch {
      setIsBiometricAuthenticating(false);
      setFeedback({
        type: "error",
        message: "حدث خطأ غير متوقع أثناء الاتصال بخدمة المصادقة.",
      });
    }
  };

  // Owner Biometric Login
  const handleOwnerBiometricLogin = async () => {
    setIsBiometricAuthenticating(true);
    setFeedback(null);

    try {
      const bioAuth = await performBiometricAuth(tag.tagUid);
      if (!bioAuth.success) {
        setIsBiometricAuthenticating(false);
        setFeedback({
          type: "error",
          message: bioAuth.error || "فشل التحقق من البصمة.",
        });
        return;
      }

      startTransition(async () => {
        const res = await verifyOwnerDevice(tag.tagUid, bioAuth.deviceId);
        setIsBiometricAuthenticating(false);

        if (res.isOwner) {
          setIsOwnerDevice(true);
          setViewAsBystander(false);
          setFeedback({
            type: "success",
            message: "تم التحقق من بصمة المالك بنجاح! تم فتح لوحة التحكم بالمركبة.",
          });
        } else {
          setFeedback({
            type: "error",
            message: "جهازك أو بصمتك لا تطابق المالك المسجل لهذه المركبة.",
          });
        }
      });
    } catch {
      setIsBiometricAuthenticating(false);
      setFeedback({
        type: "error",
        message: "حدث خطأ أثناء التحقق البيومتري.",
      });
    }
  };

  // Save Owner Settings
  const handleSaveOwnerSettings = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateOwnerSettings({
        tagUid: tag.tagUid,
        deviceId: clientDeviceId,
        status: ownerStatus,
        autoResponseText: ownerAutoReplyText,
        autoResponseEnabled: ownerAutoReplyEnabled,
        vehiclePlate: tag.vehiclePlate,
        vehicleMake: tag.vehicleMake,
        vehicleModel: tag.vehicleModel,
        channels: {
          whatsapp: ownerNotifyWhatsApp,
          push: ownerNotifyPush,
          telegram: ownerNotifyTelegram,
          sms: ownerNotifySms,
        },
      });

      if (res.success) {
        setTag((prev) => ({
          ...prev,
          status: ownerStatus,
          autoResponseText: ownerAutoReplyText,
          autoResponseEnabled: ownerAutoReplyEnabled,
          notifyWhatsApp: ownerNotifyWhatsApp,
          notifyPush: ownerNotifyPush,
          notifyTelegram: ownerNotifyTelegram,
          notifySms: ownerNotifySms,
        }));
        setFeedback({
          type: "success",
          message: isAr ? "تم حفظ إعدادات المركبة بنجاح." : "Vehicle settings saved successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || (isAr ? "فشل حفظ الإعدادات." : "Failed to save settings."),
        });
      }
    });
  };

  // Bystander Action 1: Send Movement Alert
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) return;

    setFeedback(null);
    const formData = new FormData();
    formData.append("tagUid", tag.tagUid);
    formData.append("reason", selectedReason || t.actions.movement.reasons[0]);
    if (customMovementNote) formData.append("customNote", customMovementNote);

    startTransition(async () => {
      const res = await sendMovementAlert(null, formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setLastDispatchResult({
          whatsappUrl: res.whatsappUrl,
          smsUrl: res.smsUrl,
          telUrl: res.telUrl,
          recipientPhoneMasked: res.recipientPhoneMasked,
          message: res.message,
        });
        setCooldownRemaining(res.cooldownSeconds || 180);
        setActiveTab(null);
        setCustomMovementNote("");
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([150, 50, 150]);
        }
      } else {
        setFeedback({ type: "error", message: res.message });
        if (res.cooldownSeconds) setCooldownRemaining(res.cooldownSeconds);
      }
    });
  };

  // Bystander Action 2: Send Emergency Report
  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) return;

    setFeedback(null);
    const formData = new FormData();
    formData.append("tagUid", tag.tagUid);
    formData.append("category", selectedEmergencyCategory);
    formData.append("urgency", "HIGH");
    if (emergencyDetails) formData.append("details", emergencyDetails);

    startTransition(async () => {
      const res = await sendEmergencyReport(null, formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setLastDispatchResult({
          whatsappUrl: res.whatsappUrl,
          smsUrl: res.smsUrl,
          telUrl: res.telUrl,
          recipientPhoneMasked: res.recipientPhoneMasked,
          message: res.message,
        });
        setCooldownRemaining(res.cooldownSeconds || 180);
        setActiveTab(null);
        setEmergencyDetails("");
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      } else {
        setFeedback({ type: "error", message: res.message });
        if (res.cooldownSeconds) setCooldownRemaining(res.cooldownSeconds);
      }
    });
  };

  // Bystander Action 4: Send Anonymous Note
  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0 || !directNoteText.trim()) return;

    setFeedback(null);
    const formData = new FormData();
    formData.append("tagUid", tag.tagUid);
    formData.append("note", directNoteText.trim());

    startTransition(async () => {
      const res = await sendDirectNote(null, formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setLastDispatchResult({
          whatsappUrl: res.whatsappUrl,
          smsUrl: res.smsUrl,
          telUrl: res.telUrl,
          recipientPhoneMasked: res.recipientPhoneMasked,
          message: res.message,
        });
        setCooldownRemaining(res.cooldownSeconds || 180);
        setActiveTab(null);
        setDirectNoteText("");
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } else {
        setFeedback({ type: "error", message: res.message });
        if (res.cooldownSeconds) setCooldownRemaining(res.cooldownSeconds);
      }
    });
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col relative overflow-hidden ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Precision Micro-Grid Horizon */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* Floating Glassmorphic Header */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        tagUid={tag.tagUid}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6 relative z-10">
        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl glass-surface-elevated text-xs flex items-center gap-3 transition-all animate-in fade-in duration-200 ${
              feedback.type === "success"
                ? "border-emerald-500/30 text-white font-bold"
                : feedback.type === "error"
                ? "border-red-500/30 text-red-200"
                : "border-white/[0.08] text-zinc-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div className="flex-1 font-medium leading-relaxed">{feedback.message}</div>
          </div>
        )}

        {/* Immediate Direct Dispatch Action Banner (WhatsApp & SMS) */}
        {lastDispatchResult && (
          <div className="p-5 sm:p-6 rounded-3xl glass-surface-elevated border border-white/[0.12] space-y-4 shadow-glass animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.10]">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                </div>
                <span className="text-sm font-bold text-white font-mono">
                  {isAr ? "تم تسجيل البلاغ في المنظومة وإرساله لمالك المركبة" : "Alert Dispatched to Owner"}
                </span>
              </div>
              {lastDispatchResult.recipientPhoneMasked && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full glass-pill text-zinc-300">
                  {lastDispatchResult.recipientPhoneMasked}
                </span>
              )}
            </div>

            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              {isAr
                ? "لضمان إيصال الإشعار فورياً حتى لو كان جوال المالك صامتاً، يمكنك الضغط للمتابعة الفورية عبر واتساب أو رسالة نصية:"
                : "To guarantee instant delivery even if owner's phone is silenced, tap below to relay directly via WhatsApp or SMS:"}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {lastDispatchResult.whatsappUrl && (
                <a
                  href={lastDispatchResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs cursor-pointer shadow-glass active:scale-95 transition-all"
                >
                  <span>📱 إرسال فوري عبر WhatsApp للمالك</span>
                  <ExternalLink className="w-3.5 h-3.5 text-black" />
                </a>
              )}

              {lastDispatchResult.smsUrl && (
                <a
                  href={lastDispatchResult.smsUrl}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-white font-mono text-xs cursor-pointer hover:border-white/20 active:scale-95 transition-all"
                >
                  <span>💬 إرسال رسالة نصية SMS</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              )}

              {lastDispatchResult.telUrl && (
                <a
                  href={lastDispatchResult.telUrl}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-zinc-300 font-mono text-xs cursor-pointer hover:border-white/20 transition-all"
                >
                  <span>📞 اتصال هاتفي مباشر</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CASE 1: UNCLAIMED FACTORY TAG -> FIRST-CLAIM ACTIVATION VIEW  */}
        {/* ------------------------------------------------------------- */}
        {!tag.isActivated && (
          <div className="glass-surface-elevated rounded-3xl p-6 sm:p-8 space-y-6 border border-white/[0.12] shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-white text-xs font-mono font-bold mb-2.5">
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>AUTHENTIC HARDWARE VERIFIED • READY FOR FIRST-CLAIM</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isAr ? "تفعيل واقتران بطاقة جديدة (NFC / QR)" : "First-Claim Hardware Pairing"}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                  {isAr
                    ? "تم التحقق من وجود المعرّف في المنظومة. لا حاجة لكلمات مرور؛ اضغط على زر البصمة لربط البطاقة بجوالك كمالك حصري."
                    : "Hardware UID authenticated in database. Touch biometric passkey button below to lock ownership to this device."}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl glass-surface font-mono text-center shrink-0 border border-white/[0.08]">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">HARDWARE UID</span>
                <span className="text-base font-bold text-white">{tag.tagUid}</span>
              </div>
            </div>

            {/* Vehicle Metadata Input for First-Claim */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {isAr ? "بيانات المركبة للتسجيل:" : "Vehicle Metadata:"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "رقم اللوحة:" : "License Plate:"} *
                  </label>
                  <input
                    type="text"
                    value={claimPlate}
                    onChange={(e) => setClaimPlate(e.target.value)}
                    placeholder="أ ب ج 1234"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "الشركة المصنعة (Make):" : "Make:"} *
                  </label>
                  <input
                    type="text"
                    value={claimMake}
                    onChange={(e) => setClaimMake(e.target.value)}
                    placeholder="Toyota, Lexus, Porsche..."
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "الموديل والفئة:" : "Model / Trim:"}
                  </label>
                  <input
                    type="text"
                    value={claimModel}
                    onChange={(e) => setClaimModel(e.target.value)}
                    placeholder="Land Cruiser, Panamera..."
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "رقم جوال المالك لاستقبال التنبيهات (سري ومحجوب):" : "Emergency Contact (WhatsApp/SMS):"} *
                  </label>
                  <input
                    type="tel"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    placeholder="+9665xxxxxxxx"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ONE-TOUCH BIOMETRIC / FIRST-CLAIM BUTTON */}
            <div className="p-5 rounded-2xl glass-surface flex flex-col sm:flex-row items-center justify-between gap-5 border border-white/[0.08]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl glass-pill flex items-center justify-center text-white shrink-0 border border-white/[0.12]">
                  <Fingerprint className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "التفعيل الفوري بالبصمة البيومترية" : "Instant Biometric Claim"}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                    {isAr
                      ? "سيتم تسجيل بصمة جوالك الحالي كمعرّف مالك حصري لهذه البطاقة لمنع أي شخص آخر من المطالبة بها."
                      : "Locks ownership cryptographically to this smartphone so only you can manage this card."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFirstClaim}
                disabled={isPending || isBiometricAuthenticating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-glass active:scale-95 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 text-black" />
                <span>
                  {isBiometricAuthenticating || isPending
                    ? (isAr ? "جارٍ التحقق والاقتران..." : "Verifying Passkey...")
                    : (isAr ? "المصادقة بالبصمة وتفعيل البطاقة" : "Authenticate & Claim Tag")}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CASE 2: ACTIVATED TAG + SCANNED BY THE VERIFIED OWNER         */}
        {/* ------------------------------------------------------------- */}
        {tag.isActivated && isOwnerDevice && !viewAsBystander && (
          <div className="glass-surface-elevated rounded-3xl p-6 sm:p-7 space-y-6 border border-white/[0.12] shadow-glass">
            {/* Owner Recognition Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl glass-surface border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl glass-pill flex items-center justify-center text-white shrink-0 border border-white/[0.10]">
                  <Fingerprint className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {isAr ? "مرحباً بك: تم التعرف على جهازك كمالك موثق" : "Verified Owner Device Recognized"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full glass-pill text-zinc-300 font-bold">
                      OWNER LOCKED
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {tag.ownerDeviceName || "Smartphone"} • UID: {tag.tagUid}
                  </span>
                </div>
              </div>

              {/* Toggle to Preview Bystander View */}
              <button
                type="button"
                onClick={() => setViewAsBystander(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-xs font-medium text-zinc-300 hover:text-white transition-all shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isAr ? "معاينة كزائر (بوابة الغرباء)" : "Preview as Bystander"}</span>
              </button>
            </div>

            {/* ZERO-HARDWARE AUTONOMOUS VEHICLE FINDER (OWNER EXCLUSIVE) */}
            <div className="p-5 sm:p-6 rounded-3xl glass-surface border border-white/[0.08] space-y-4 shadow-glass">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-black shrink-0 shadow-sm">
                    <Compass className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white">
                        {t.spatialFinder.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full glass-pill text-zinc-300 font-bold">
                        ZERO-HARDWARE
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 font-mono">
                      {t.spatialFinder.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSpatialCalibrationOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-card text-xs font-mono font-medium text-zinc-200 hover:text-white transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t.spatialFinder.calibrateButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSpatialFinderOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-all shadow-glass active:scale-95 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-black" />
                    <span>{t.spatialFinder.findCarButton}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Owner Control Dashboard */}
            <div className="space-y-6">
              <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {isAr ? "إدارة وتعديل إعدادات المركبة فورياً" : "Owner Live Controls"}
                  </h2>
                </div>
                <span className="text-xs font-mono text-zinc-400 font-bold">{tag.tagUid}</span>
              </div>

              {/* Status Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  {isAr ? "الحالة التشغيلية للمركبة حالياً:" : "Vehicle Operational Status:"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["ACTIVE", "AWAY", "DND", "SUSPENDED"] as TagStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOwnerStatus(st)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        ownerStatus === st
                          ? "bg-white/[0.12] border-white text-white font-bold shadow-sm"
                          : "glass-card text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <StatusBadge status={st} lang={lang} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Response Text */}
              <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    {isAr ? "تنويه الرد التلقائي (يظهر للماسح عند وضع 'الخارج مؤقتاً'):" : "Auto-Reply Message (When Away):"}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={ownerAutoReplyEnabled}
                      onChange={(e) => setOwnerAutoReplyEnabled(e.target.checked)}
                      className="rounded bg-black border-white/20 text-white focus:ring-0"
                    />
                    <span>{isAr ? "تفعيل التنويه" : "Enable"}</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={ownerAutoReplyText}
                  onChange={(e) => setOwnerAutoReplyText(e.target.value)}
                  placeholder="سأعود للمركبة خلال 15 دقيقة..."
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Notification Channel Toggles */}
              <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                <label className="block text-xs font-semibold text-zinc-300">
                  {isAr ? "قنوات الإشعار الفوري عند إرسال طلب:" : "Alert Dispatch Channels:"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOwnerNotifyWhatsApp(!ownerNotifyWhatsApp)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      ownerNotifyWhatsApp
                        ? "glass-surface-elevated border-white/30 text-white font-bold"
                        : "glass-card text-zinc-400"
                    }`}
                  >
                    <span>WhatsApp</span>
                    <span className="font-mono text-[10px]">{ownerNotifyWhatsApp ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOwnerNotifyPush(!ownerNotifyPush)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      ownerNotifyPush
                        ? "glass-surface-elevated border-white/30 text-white font-bold"
                        : "glass-card text-zinc-400"
                    }`}
                  >
                    <span>Web Push</span>
                    <span className="font-mono text-[10px]">{ownerNotifyPush ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOwnerNotifyTelegram(!ownerNotifyTelegram)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      ownerNotifyTelegram
                        ? "glass-surface-elevated border-white/30 text-white font-bold"
                        : "glass-card text-zinc-400"
                    }`}
                  >
                    <span>Telegram</span>
                    <span className="font-mono text-[10px]">{ownerNotifyTelegram ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOwnerNotifySms(!ownerNotifySms)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      ownerNotifySms
                        ? "glass-surface-elevated border-white/30 text-white font-bold"
                        : "glass-card text-zinc-400"
                    }`}
                  >
                    <span>SMS</span>
                    <span className="font-mono text-[10px]">{ownerNotifySms ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleSaveOwnerSettings}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-glass cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>{isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CASE 3: PUBLIC ACTION PORTAL (SCANNED BY STRANGER / BYSTANDER) */}
        {/* ------------------------------------------------------------- */}
        {tag.isActivated && (!isOwnerDevice || viewAsBystander) && (
          <div className="space-y-6">
            {/* If Owner is previewing bystander view */}
            {isOwnerDevice && viewAsBystander && (
              <div className="p-3.5 rounded-2xl glass-surface border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                <span>{isAr ? "أنت تشاهد الصفحة الآن كما يراها أي شخص مار يمسح الـ QR." : "You are currently viewing the page as an external bystander."}</span>
                <button
                  onClick={() => setViewAsBystander(false)}
                  className="px-3 py-1.5 rounded-xl glass-card border border-amber-500/40 text-white font-medium cursor-pointer"
                >
                  {isAr ? "العودة لوضع المالك" : "Return to Owner Mode"}
                </button>
              </div>
            )}

            {/* Verification & Privacy Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-surface border border-white/[0.08]">
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                <span className="font-semibold text-white">{t.officialSeal}</span>
                <span className="text-zinc-600">|</span>
                <span className="font-mono text-zinc-400 font-bold">{tag.tagUid}</span>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={tag.status} lang={lang} />

                {!isOwnerDevice && (
                  <button
                    type="button"
                    onClick={handleOwnerBiometricLogin}
                    disabled={isBiometricAuthenticating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-white" />
                    <span>
                      {isBiometricAuthenticating
                        ? (isAr ? "جارٍ التحقق..." : "Verifying...")
                        : (isAr ? "أنت المالك؟ دخول بالبصمة" : "Owner? Biometric Login")}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Vehicle Identity Card (Zero PII Exposed) */}
            <div className="p-6 sm:p-7 rounded-3xl glass-surface-elevated border border-white/[0.12] shadow-glass">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider font-bold">
                    {t.vehicleInfo.plate}
                  </span>
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                    {tag.vehiclePlate}
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-400">
                    {tag.vehicleMake} {tag.vehicleModel} • {tag.vehicleColor}
                  </div>
                </div>

                {/* Privacy Shield Pill */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-card text-xs text-zinc-300 max-w-xs border border-white/[0.08]">
                  <Lock className="w-4 h-4 text-white shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    {t.privacyNotice}
                  </span>
                </div>
              </div>

              {/* Owner Auto-Response Protocol (Visible if Away or enabled) */}
              {(tag.status === "AWAY" || tag.autoResponseEnabled) && tag.autoResponseText && (
                <div className="mt-4 p-4 rounded-2xl glass-surface border border-amber-500/30 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-amber-300 block mb-0.5">
                      {isAr ? "تنويه المالك التلقائي:" : "Owner Auto-Response:"}
                    </span>
                    <p className="text-xs text-zinc-200">
                      {tag.autoResponseText}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cooldown Timer Alert */}
            {cooldownRemaining > 0 && (
              <div className="p-3.5 rounded-2xl glass-surface border border-white/[0.08] flex items-center justify-between text-xs text-zinc-300 font-mono">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    {isAr ? "فترة التهدئة النشطة لمنع التكرار:" : "Anti-Spam Cooldown Active:"}
                  </span>
                </div>
                <span className="text-amber-400 font-bold">
                  {Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}

            {/* Operational State Handling (SUSPENDED / DND / ACTIVE) */}
            {tag.status === "SUSPENDED" ? (
              <div className="p-8 rounded-3xl glass-surface-elevated border border-red-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full glass-pill border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {isAr ? "البطاقة معلّقة وموقوفة مؤقتاً" : "Tag Currently Suspended"}
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? "تم تعليق استقبال التنبيهات والبلاغات لهذه المركبة مؤقتاً من قِبل المالك. لا يمكن إرسال أي طلبات في الوقت الحالي."
                    : "Alert reception for this vehicle has been paused by the owner. No requests can be submitted at this time."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* DND Notice */}
                {tag.status === "DND" && (
                  <div className="p-4 rounded-2xl glass-surface border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isAr
                        ? "المركبة في وضع 'عدم الإزعاج' (DND) — تم حجب طلبات التحريك والملاحظات، ويُسمح فقط ببلاغات الطوارئ الحرجة."
                        : "Vehicle is in 'Do Not Disturb' mode. Casual movement requests are disabled; only emergency alerts are allowed."}
                    </span>
                  </div>
                )}

                <div className="border-b border-white/[0.08] pb-3">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {t.actions.title}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {t.actions.subtitle}
                  </p>
                </div>

                {/* 4 Direct Glassmorphic Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Request Movement */}
                  <div
                    onClick={() => {
                      if (tag.status !== "DND") {
                        setActiveTab(activeTab === "movement" ? null : "movement");
                      }
                    }}
                    className={`p-6 rounded-3xl border transition-all ${
                      tag.status === "DND"
                        ? "glass-surface opacity-40 cursor-not-allowed border-white/[0.04]"
                        : activeTab === "movement"
                        ? "glass-surface-elevated border-white text-white shadow-glass cursor-pointer scale-[1.01]"
                        : "glass-card hover:border-white/20 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-white border border-white/[0.10]">
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full glass-pill text-zinc-400">
                        {tag.status === "DND" ? (isAr ? "مغلق (DND)" : "MUTED") : "PRIORITY 1"}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">
                      {t.actions.movement.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      {t.actions.movement.desc}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <span>{tag.status === "DND" ? (isAr ? "غير متاح حالياً" : "Unavailable") : (isAr ? "فتح نموذج التحريك" : "Open Movement Form")}</span>
                      {tag.status !== "DND" && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "movement" ? "rotate-90" : ""}`} />
                      )}
                    </div>
                  </div>

                  {/* 2. Emergency Report (Always enabled) */}
                  <div
                    onClick={() => setActiveTab(activeTab === "emergency" ? null : "emergency")}
                    className={`p-6 rounded-3xl border cursor-pointer transition-all ${
                      activeTab === "emergency"
                        ? "glass-surface-elevated border-amber-500 text-white shadow-glass scale-[1.01]"
                        : "glass-card hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full glass-pill text-amber-400 font-bold border border-amber-500/20">
                        URGENT
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">
                      {t.actions.emergency.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      {t.actions.emergency.desc}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <span>{isAr ? "إبلاغ عن طوارئ" : "Report Emergency"}</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "emergency" ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {/* 3. Encrypted VoIP Call */}
                  <div
                    onClick={() => {
                      if (tag.status !== "DND") {
                        setIsCallOpen(true);
                      }
                    }}
                    className={`p-6 rounded-3xl border transition-all ${
                      tag.status === "DND"
                        ? "glass-surface opacity-40 cursor-not-allowed border-white/[0.04]"
                        : "glass-card hover:border-white/20 cursor-pointer group"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-white border border-white/[0.10] group-hover:bg-white/[0.08]">
                        <PhoneCall className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full glass-pill text-zinc-300 font-bold">
                        {tag.status === "DND" ? (isAr ? "مغلق (DND)" : "MUTED") : "VOIP TUNNEL"}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">
                      {t.actions.call.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      {t.actions.call.desc}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <span>{tag.status === "DND" ? (isAr ? "الاتصال مغلق" : "Calls Muted") : t.actions.call.button}</span>
                      {tag.status !== "DND" && <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* 4. Direct Anonymous Note */}
                  <div
                    onClick={() => {
                      if (tag.status !== "DND") {
                        setActiveTab(activeTab === "note" ? null : "note");
                      }
                    }}
                    className={`p-6 rounded-3xl border transition-all ${
                      tag.status === "DND"
                        ? "glass-surface opacity-40 cursor-not-allowed border-white/[0.04]"
                        : activeTab === "note"
                        ? "glass-surface-elevated border-white text-white shadow-glass cursor-pointer scale-[1.01]"
                        : "glass-card hover:border-white/20 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-zinc-300 border border-white/[0.10]">
                        <MessageSquare className="w-5 h-5 text-zinc-300" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full glass-pill text-zinc-400">
                        {tag.status === "DND" ? (isAr ? "مغلق (DND)" : "MUTED") : "CONTROLLED"}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">
                      {t.actions.note.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      {t.actions.note.desc}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                      <span>{tag.status === "DND" ? (isAr ? "الملاحظات مغلقة" : "Notes Muted") : (isAr ? "كتابة ملاحظة" : "Write Note")}</span>
                      {tag.status !== "DND" && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "note" ? "rotate-90" : ""}`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Action Forms */}
            {activeTab === "movement" && (
              <form
                onSubmit={handleMovementSubmit}
                className="p-6 sm:p-7 rounded-3xl glass-surface-elevated border border-white/[0.12] space-y-5 shadow-glass animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-white" />
                    <span>{t.actions.movement.title}</span>
                  </h4>
                  <span className="text-[11px] text-white font-mono font-bold">PRIORITY</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2.5">
                    {isAr ? "اختر سبب طلب التحريك:" : "Select Reason for Movement:"}
                  </label>
                  <div className="space-y-2">
                    {t.actions.movement.reasons.map((reason, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedReason === reason
                            ? "glass-surface-elevated border-white text-white font-bold shadow-sm"
                            : "glass-card text-zinc-300 hover:border-white/15"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={() => setSelectedReason(reason)}
                          className="text-white focus:ring-0 bg-transparent border-white/20"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "ملاحظة إضافية للمالك (اختياري):" : "Additional Note (Optional):"}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={customMovementNote}
                    onChange={(e) => setCustomMovementNote(e.target.value)}
                    placeholder={isAr ? "مثال: أنا بجانب السيارة في الموقف رقم 4" : "e.g. Standing next to your car"}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="px-4 py-2.5 rounded-xl glass-card text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || cooldownRemaining > 0}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-glass"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                    <span>{isPending ? (isAr ? "جارٍ الإرسال..." : "Sending...") : t.actions.movement.button}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === "emergency" && (
              <form
                onSubmit={handleEmergencySubmit}
                className="p-6 sm:p-7 rounded-3xl glass-surface-elevated border border-amber-500/40 space-y-5 shadow-glass animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>{t.actions.emergency.title}</span>
                  </h4>
                  <span className="text-[11px] text-amber-400 font-mono font-bold">PRIORITY HIGH</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2.5">
                    {isAr ? "نوع حالة الطوارئ:" : "Incident Classification:"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(t.actions.emergency.categories).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedEmergencyCategory === key
                            ? "glass-surface-elevated border-amber-500 text-white font-bold shadow-sm"
                            : "glass-card text-zinc-300 hover:border-white/15"
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={key}
                          checked={selectedEmergencyCategory === key}
                          onChange={() => setSelectedEmergencyCategory(key)}
                          className="text-amber-500 focus:ring-0 mt-0.5 bg-transparent border-white/20"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "تفاصيل إضافية:" : "Incident Details:"}
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={emergencyDetails}
                    onChange={(e) => setEmergencyDetails(e.target.value)}
                    placeholder={isAr ? "اكتب تفاصيل مختصرة لمساعدة المالك..." : "Brief details to assist the owner..."}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="px-4 py-2.5 rounded-xl glass-card text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || cooldownRemaining > 0}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-glass"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-black" />
                    <span>{isPending ? (isAr ? "جارٍ الإرسال..." : "Sending...") : t.actions.emergency.button}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === "note" && (
              <form
                onSubmit={handleNoteSubmit}
                className="p-6 sm:p-7 rounded-3xl glass-surface-elevated border border-white/[0.12] space-y-5 shadow-glass animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-300" />
                    <span>{t.actions.note.title}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-400 font-bold">
                    {directNoteText.length}/160
                  </span>
                </div>

                <div>
                  <textarea
                    rows={3}
                    maxLength={160}
                    value={directNoteText}
                    onChange={(e) => setDirectNoteText(e.target.value)}
                    placeholder={t.actions.note.placeholder}
                    className="w-full glass-input rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="px-4 py-2.5 rounded-xl glass-card text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || cooldownRemaining > 0 || !directNoteText.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-glass"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                    <span>{isPending ? (isAr ? "جارٍ الإرسال..." : "Sending...") : t.actions.note.button}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Encrypted VoIP Call Modal */}
      <CallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        tagUid={tag.tagUid}
        lang={lang}
        emergencyContactPhone={tag.emergencyContactPhone}
      />

      {/* Autonomous Zero-Hardware Vehicle Spatial Precision Finder */}
      <VehicleSpatialFinder
        isOpen={isSpatialFinderOpen}
        onClose={() => setIsSpatialFinderOpen(false)}
        tagUid={tag.tagUid}
        vehiclePlate={tag.vehiclePlate}
        vehicleMake={tag.vehicleMake}
        vehicleModel={tag.vehicleModel}
        vehicleColor={tag.vehicleColor}
        lang={lang}
      />

      {/* Autonomous Spatial Stance Calibration Modal */}
      <SpatialCalibrationModal
        isOpen={isSpatialCalibrationOpen}
        onClose={() => setIsSpatialCalibrationOpen(false)}
        tagUid={tag.tagUid}
        vehiclePlate={tag.vehiclePlate}
        vehicleMake={tag.vehicleMake}
        vehicleModel={tag.vehicleModel}
        vehicleColor={tag.vehicleColor}
        onCalibrationSaved={() => {
          setIsSpatialCalibrationOpen(false);
          setIsSpatialFinderOpen(true);
        }}
        lang={lang}
      />

      {/* Official Footer with Matany Group Signature */}
      <Footer lang={lang} />
    </div>
  );
}
