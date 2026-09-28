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
} from "lucide-react";
import { SafePublicTag, Language, TagStatus } from "@/types";
import { translations } from "@/lib/translations";
import { Header } from "@/components/ui/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CallModal } from "@/components/ui/CallModal";
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
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const t = translations[lang];
  const isAr = lang === "ar";

  // Initialize and check Device ID
  useEffect(() => {
    const devId = getOrCreateDeviceId();
    setClientDeviceId(devId);

    // If tag is activated and has an ownerDeviceId, check if this browser is the owner
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
      // 1. Mandatory Biometric / Device Authentication
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
            message: res.error || "فشل التفعيل.",
          });
        }
      });
    } catch (err: unknown) {
      setIsBiometricAuthenticating(false);
      const e = err as Error;
      setFeedback({ type: "error", message: e?.message || "تعذرت المصادقة بالبصمة." });
    }
  };

  // Owner Biometric Login (when scanning QR as owner to unlock live management suite)
  const handleOwnerBiometricLogin = async () => {
    setIsBiometricAuthenticating(true);
    setFeedback(null);

    try {
      // 1. Mandatory Biometric / Passkey challenge
      const bioAuth = await performBiometricAuth(tag.tagUid);
      if (!bioAuth.success) {
        setIsBiometricAuthenticating(false);
        setFeedback({
          type: "error",
          message: bioAuth.error || "تعذرت المصادقة بالبصمة. يلزم وضع البصمة لتأكيد ملكية البطاقة.",
        });
        return;
      }

      // 2. Cryptographic ownership verification against registered device
      const res = await verifyOwnerDevice(tag.tagUid, bioAuth.deviceId);
      setIsBiometricAuthenticating(false);

      if (res.isOwner) {
        setIsOwnerDevice(true);
        setViewAsBystander(false);
        setClientDeviceId(bioAuth.deviceId);
        if (res.tagProfile) {
          setTag((prev) => ({
            ...prev,
            vehiclePlate: res.tagProfile?.vehiclePlate || prev.vehiclePlate,
            vehicleMake: res.tagProfile?.vehicleMake || prev.vehicleMake,
            vehicleModel: res.tagProfile?.vehicleModel || prev.vehicleModel,
            vehicleColor: res.tagProfile?.vehicleColor || prev.vehicleColor,
            emergencyContactPhone: res.tagProfile?.emergencyContactPhone || prev.emergencyContactPhone,
            autoResponseText: res.tagProfile?.autoResponseText || prev.autoResponseText,
            autoResponseEnabled: res.tagProfile?.autoResponseEnabled ?? prev.autoResponseEnabled,
          }));
        }
        setFeedback({
          type: "success",
          message: "تم التحقق من بصمة المالك بنجاح! تم فتح لوحة تحكم وإدارة البطاقة.",
        });
      } else {
        setFeedback({
          type: "error",
          message: "بصمة هذا الجهاز لا تتطابق مع بصمة مالك البطاقة المسجل (First-Claim Locked). لا يمكن الوصول لإعدادات البطاقة إلا من جوال المالك الأصلي.",
        });
      }
    } catch (err: unknown) {
      setIsBiometricAuthenticating(false);
      const e = err as Error;
      setFeedback({ type: "error", message: e?.message || "فشلت المصادقة بالبصمة." });
    }
  };

  // Owner saves updated settings
  const handleSaveOwnerSettings = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateOwnerSettings({
        tagUid: tag.tagUid,
        deviceId: clientDeviceId,
        status: ownerStatus,
        autoResponseEnabled: ownerAutoReplyEnabled,
        autoResponseText: ownerAutoReplyText,
        vehiclePlate: claimPlate,
        vehicleMake: claimMake,
        vehicleModel: claimModel,
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
          autoResponseEnabled: ownerAutoReplyEnabled,
          autoResponseText: ownerAutoReplyText,
          vehiclePlate: claimPlate,
          vehicleMake: claimMake,
          vehicleModel: claimModel,
        }));
        setFeedback({ type: "success", message: res.message || "تم حفظ الإعدادات وتحديث حالة البطاقة بنجاح!" });
      } else {
        setFeedback({ type: "error", message: res.error || "فشل حفظ التغييرات." });
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
        setCooldownRemaining(res.cooldownSeconds || 180);
        setActiveTab(null);
        setCustomMovementNote("");
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
        setCooldownRemaining(res.cooldownSeconds || 180);
        setActiveTab(null);
        setEmergencyDetails("");
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
        setCooldownRemaining(res.cooldownSeconds || 180);
        setActiveTab(null);
        setDirectNoteText("");
      } else {
        setFeedback({ type: "error", message: res.message });
        if (res.cooldownSeconds) setCooldownRemaining(res.cooldownSeconds);
      }
    });
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Official Institutional Header */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        tagUid={tag.tagUid}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
              feedback.type === "success"
                ? "border-[#00C853]/50 bg-[#00C853]/10 text-[#00C853] font-bold"
                : feedback.type === "error"
                ? "border-red-900/80 bg-red-950/40 text-red-200"
                : "border-[#1F2228] bg-[#0A0A0E] text-zinc-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#00C853] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CASE 1: UNCLAIMED FACTORY TAG -> FIRST-CLAIM ACTIVATION VIEW  */}
        {/* ------------------------------------------------------------- */}
        {!tag.isActivated && (
          <div className="border border-[#1F2228] rounded-xl bg-[#08080A] p-6 sm:p-8 space-y-6">
            <div className="h-1.5 w-full bg-[#00C853] rounded-full" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2228] pb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] text-xs font-mono font-bold mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                  <span>AUTHENTIC HARDWARE VERIFIED • READY FOR FIRST-CLAIM</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {isAr ? "تفعيل واقتران بطاقة جديدة (NFC / QR)" : "First-Claim Hardware Pairing"}
                </h1>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  {isAr
                    ? "تم التحقق من وجود المعرّف في المنظومة. لا حاجة لكلمات مرور، اضغط على زر البصمة لربط البطاقة بجوالك كمالك حصري."
                    : "Hardware UID authenticated in database. Touch fingerprint button below to lock ownership to this device."}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-[#1F2228] bg-[#000000] font-mono text-center shrink-0">
                <span className="text-[10px] text-[#00C853] block uppercase font-bold">HARDWARE UID</span>
                <span className="text-base font-bold text-white">{tag.tagUid}</span>
              </div>
            </div>

            {/* Initial Vehicle Metadata Input for First-Claim */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {isAr ? "بيانات المركبة للتسجيل:" : "Vehicle Metadata:"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "رقم اللوحة:" : "License Plate:"} *
                  </label>
                  <input
                    type="text"
                    value={claimPlate}
                    onChange={(e) => setClaimPlate(e.target.value)}
                    placeholder="أ ب ج 1234"
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "الشركة المصنعة (Make):" : "Make:"} *
                  </label>
                  <input
                    type="text"
                    value={claimMake}
                    onChange={(e) => setClaimMake(e.target.value)}
                    placeholder="Toyota, Lexus, Porsche..."
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "الموديل والفئة:" : "Model / Trim:"}
                  </label>
                  <input
                    type="text"
                    value={claimModel}
                    onChange={(e) => setClaimModel(e.target.value)}
                    placeholder="Land Cruiser, Panamera..."
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "رقم جوال المالك لاستقبال التنبيهات (سري ومحجوب):" : "Emergency Contact (WhatsApp/SMS):"} *
                  </label>
                  <input
                    type="tel"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    placeholder="+9665xxxxxxxx"
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>
              </div>
            </div>

            {/* ONE-TOUCH BIOMETRIC / FIRST-CLAIM BUTTON */}
            <div className="p-4 rounded-xl border border-[#00C853]/40 bg-[#00C853]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-[#00C853] bg-black flex items-center justify-center text-[#00C853] shrink-0">
                  <Fingerprint className="w-7 h-7 text-[#00C853]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "التفعيل الفوري بالبصمة البيومترية" : "Instant Biometric Claim"}
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0"
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
          <div className="border border-[#1F2228] rounded-xl bg-[#08080A] p-6 space-y-6">
            {/* Owner Recognition Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-[#00C853]/50 bg-[#00C853]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black border border-[#00C853] flex items-center justify-center text-[#00C853] shrink-0">
                  <Fingerprint className="w-4 h-4 text-[#00C853]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {isAr ? "مرحباً بك: تم التعرف على جهازك كمالك موثق" : "Verified Owner Device Recognized"}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#00C853]/40 bg-black text-[#00C853] font-bold">
                      FIRST-CLAIM LOCKED
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A1A1AA] font-mono">
                    {tag.ownerDeviceName || "Smartphone"} • UID: {tag.tagUid}
                  </span>
                </div>
              </div>

              {/* Toggle to Preview Bystander View */}
              <button
                type="button"
                onClick={() => setViewAsBystander(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-xs font-medium text-zinc-300 hover:text-white hover:border-[#00C853] transition-colors shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isAr ? "معاينة كزائر (بوابة الغرباء)" : "Preview as Bystander"}</span>
              </button>
            </div>

            {/* Owner Control Dashboard */}
            <div className="space-y-6">
              <div className="border-b border-[#1F2228] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#00C853]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {isAr ? "إدارة وتعديل إعدادات المركبة فورياً" : "Owner Live Controls"}
                  </h2>
                </div>
                <span className="text-xs font-mono text-zinc-500 font-bold">{tag.tagUid}</span>
              </div>

              {/* Status Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  {isAr ? "الحالة التشغيلية للمركبة حالياً:" : "Vehicle Operational Status:"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["ACTIVE", "AWAY", "DND", "SUSPENDED"] as TagStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOwnerStatus(st)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        ownerStatus === st
                          ? "border-[#00C853] bg-[#00C853]/15 text-[#00C853] font-bold"
                          : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <StatusBadge status={st} lang={lang} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Response Text */}
              <div className="space-y-2 pt-2 border-t border-[#1F2228]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    {isAr ? "تنويه الرد التلقائي (يظهر للماسح عند وضع 'الخارج مؤقتاً'):" : "Auto-Reply Message (When Away):"}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={ownerAutoReplyEnabled}
                      onChange={(e) => setOwnerAutoReplyEnabled(e.target.checked)}
                      className="rounded bg-black border-[#1F2228] text-[#00C853] focus:ring-0"
                    />
                    <span>{isAr ? "تفعيل التنويه" : "Enable"}</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={ownerAutoReplyText}
                  onChange={(e) => setOwnerAutoReplyText(e.target.value)}
                  placeholder="سأعود للمركبة خلال 15 دقيقة..."
                  className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>

              {/* Notification Channel Toggles */}
              <div className="space-y-2 pt-2 border-t border-[#1F2228]">
                <label className="block text-xs font-semibold text-zinc-300">
                  {isAr ? "قنوات الإشعار الفوري عند إرسال طلب:" : "Alert Dispatch Channels:"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setOwnerNotifyWhatsApp(!ownerNotifyWhatsApp)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      ownerNotifyWhatsApp
                        ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                        : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                    }`}
                  >
                    <span>WhatsApp</span>
                    <span>{ownerNotifyWhatsApp ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOwnerNotifyPush(!ownerNotifyPush)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      ownerNotifyPush
                        ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                        : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                    }`}
                  >
                    <span>Web Push</span>
                    <span>{ownerNotifyPush ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOwnerNotifyTelegram(!ownerNotifyTelegram)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      ownerNotifyTelegram
                        ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                        : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                    }`}
                  >
                    <span>Telegram</span>
                    <span>{ownerNotifyTelegram ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOwnerNotifySms(!ownerNotifySms)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      ownerNotifySms
                        ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                        : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                    }`}
                  >
                    <span>SMS</span>
                    <span>{ownerNotifySms ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F2228]">
                <button
                  type="button"
                  onClick={handleSaveOwnerSettings}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
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
              <div className="p-3 rounded-lg border border-amber-900/60 bg-amber-950/30 flex items-center justify-between text-xs text-amber-200">
                <span>{isAr ? "أنت تشاهد الصفحة الآن كما يراها أي شخص مار يمسح الـ QR." : "You are currently viewing the page as an external bystander."}</span>
                <button
                  onClick={() => setViewAsBystander(false)}
                  className="px-2.5 py-1 rounded-md border border-amber-700 bg-amber-900/80 text-white font-medium"
                >
                  {isAr ? "العودة لوضع المالك" : "Return to Owner Mode"}
                </button>
              </div>
            )}

            {/* Verification & Privacy Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#1F2228] bg-[#08080A]">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-[#00C853] shrink-0" />
                <span className="font-semibold text-white">{t.officialSeal}</span>
                <span className="text-zinc-600">|</span>
                <span className="font-mono text-zinc-400 font-bold">{tag.tagUid}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <StatusBadge status={tag.status} lang={lang} />

                {!isOwnerDevice && (
                  <button
                    type="button"
                    onClick={handleOwnerBiometricLogin}
                    disabled={isBiometricAuthenticating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00C853]/50 bg-[#00C853]/10 hover:bg-[#00C853]/20 text-[#00C853] text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>
                      {isBiometricAuthenticating
                        ? (isAr ? "جارٍ التحقق بالبصمة..." : "Verifying Passkey...")
                        : (isAr ? "أنت المالك؟ دخول بالبصمة" : "Owner? Biometric Login")}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Vehicle Identity Card (Zero PII Exposed) */}
            <div className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#1F2228] pb-6">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-[#00C853] tracking-wider font-bold">
                    {t.vehicleInfo.plate}
                  </span>
                  <div className="text-3xl font-bold tracking-tight text-white font-mono">
                    {tag.vehiclePlate}
                  </div>
                  <div className="text-sm text-[#A1A1AA]">
                    {tag.vehicleMake} {tag.vehicleModel} • {tag.vehicleColor}
                  </div>
                </div>

                {/* Privacy Shield Pill */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-xs text-zinc-400 max-w-xs">
                  <Lock className="w-4 h-4 text-[#00C853] shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    {t.privacyNotice}
                  </span>
                </div>
              </div>

              {/* Owner Auto-Response Protocol (Visible if Away or enabled) */}
              {(tag.status === "AWAY" || tag.autoResponseEnabled) && tag.autoResponseText && (
                <div className="mt-4 p-3.5 rounded-lg border border-amber-900/40 bg-amber-950/20 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-amber-300 block mb-0.5">
                      {isAr ? "تنويه المالك التلقائي:" : "Owner Auto-Response:"}
                    </span>
                    <p className="text-xs text-zinc-300">
                      {tag.autoResponseText}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cooldown Timer Alert */}
            {cooldownRemaining > 0 && (
              <div className="p-3 rounded-lg border border-[#1F2228] bg-[#0A0A0E] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    {isAr ? "فترة التهدئة النشطة ضد التكرار:" : "Anti-Spam Cooldown Active:"}
                  </span>
                </div>
                <span className="text-amber-400 font-bold">
                  {Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}

            {/* Operational State Handling (SUSPENDED / DND / ACTIVE) */}
            {tag.status === "SUSPENDED" ? (
              <div className="p-8 rounded-xl border border-red-900/60 bg-red-950/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full border border-red-800 bg-red-900/40 flex items-center justify-center text-red-400 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {isAr ? "البطاقة معلّقة وموقوفة مؤقتاً" : "Tag Currently Suspended"}
                </h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? "تم تعليق استقبال التنبيهات والبلاغات لهذه المركبة مؤقتاً من قِبل المالك. لا يمكن إرسال أي طلبات في الوقت الحالي."
                    : "Alert reception for this vehicle has been paused by the owner. No requests can be submitted at this time."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* DND Notice */}
                {tag.status === "DND" && (
                  <div className="p-3.5 rounded-lg border border-amber-900/60 bg-amber-950/30 flex items-center gap-2.5 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isAr
                        ? "المركبة في وضع 'عدم الإزعاج' (DND) — تم حجب طلبات التحريك والملاحظات، ويُسمح فقط ببلاغات الطوارئ الحرجة."
                        : "Vehicle is in 'Do Not Disturb' mode. Casual movement requests are disabled; only emergency alerts are allowed."}
                    </span>
                  </div>
                )}

                <div className="border-b border-[#1F2228] pb-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {t.actions.title}
                  </h2>
                  <p className="text-xs text-[#A1A1AA]">
                    {t.actions.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Request Movement */}
                  <div
                    onClick={() => {
                      if (tag.status !== "DND") {
                        setActiveTab(activeTab === "movement" ? null : "movement");
                      }
                    }}
                    className={`p-5 rounded-xl border transition-all ${
                      tag.status === "DND"
                        ? "border-[#1F2228]/40 bg-[#08080A]/40 opacity-40 cursor-not-allowed"
                        : activeTab === "movement"
                        ? "border-[#00C853] bg-[#00C853]/10 cursor-pointer"
                        : "border-[#1F2228] bg-[#08080A] hover:border-zinc-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0A0A0E] flex items-center justify-center text-[#00C853]">
                        <Car className="w-5 h-5 text-[#00C853]" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#1F2228] bg-black text-zinc-400">
                        {tag.status === "DND" ? (isAr ? "مغلق (DND)" : "MUTED") : "PRIORITY 1"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {t.actions.movement.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                      {t.actions.movement.desc}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#00C853]">
                      <span>{tag.status === "DND" ? (isAr ? "غير متاح حالياً" : "Unavailable") : (isAr ? "فتح نموذج التحريك" : "Open Movement Form")}</span>
                      {tag.status !== "DND" && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === "movement" ? "rotate-90" : ""}`} />
                      )}
                    </div>
                  </div>

                  {/* 2. Emergency Report (Always enabled) */}
                  <div
                    onClick={() => setActiveTab(activeTab === "emergency" ? null : "emergency")}
                    className={`p-5 rounded-xl border cursor-pointer transition-all ${
                      activeTab === "emergency"
                        ? "border-amber-600 bg-amber-950/20"
                        : "border-[#1F2228] bg-[#08080A] hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0A0A0E] flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-amber-900/60 bg-black text-amber-400 font-bold">
                        URGENT
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {t.actions.emergency.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                      {t.actions.emergency.desc}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-400">
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
                    className={`p-5 rounded-xl border transition-all ${
                      tag.status === "DND"
                        ? "border-[#1F2228]/40 bg-[#08080A]/40 opacity-40 cursor-not-allowed"
                        : "border-[#1F2228] bg-[#08080A] hover:border-[#00C853]/60 cursor-pointer group"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0A0A0E] flex items-center justify-center text-[#00C853] group-hover:bg-[#00C853]/15">
                        <PhoneCall className="w-5 h-5 text-[#00C853]" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#00C853]/40 bg-black text-[#00C853] font-bold">
                        {tag.status === "DND" ? (isAr ? "مغلق (DND)" : "MUTED") : "VOIP TUNNEL"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {t.actions.call.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                      {t.actions.call.desc}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#00C853]">
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
                    className={`p-5 rounded-xl border transition-all ${
                      tag.status === "DND"
                        ? "border-[#1F2228]/40 bg-[#08080A]/40 opacity-40 cursor-not-allowed"
                        : activeTab === "note"
                        ? "border-[#00C853] bg-[#00C853]/10 cursor-pointer"
                        : "border-[#1F2228] bg-[#08080A] hover:border-zinc-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0A0A0E] flex items-center justify-center text-zinc-300">
                        <MessageSquare className="w-5 h-5 text-zinc-400" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#1F2228] bg-black text-zinc-400">
                        {tag.status === "DND" ? (isAr ? "مغلق (DND)" : "MUTED") : "CONTROLLED"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {t.actions.note.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                      {t.actions.note.desc}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-zinc-300">
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
                className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#1F2228] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#00C853]" />
                    <span>{t.actions.movement.title}</span>
                  </h4>
                  <span className="text-[11px] text-[#00C853] font-mono font-bold">PRIORITY</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">
                    {isAr ? "اختر سبب طلب التحريك:" : "Select Reason for Movement:"}
                  </label>
                  <div className="space-y-2">
                    {t.actions.movement.reasons.map((reason, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selectedReason === reason
                            ? "border-[#00C853] bg-[#00C853]/15 text-white font-bold"
                            : "border-[#1F2228] bg-[#000000] text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={() => setSelectedReason(reason)}
                          className="text-[#00C853] focus:ring-0 bg-transparent border-zinc-700"
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
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="px-4 py-2 rounded-lg border border-[#1F2228] text-xs text-zinc-400 hover:text-white"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || cooldownRemaining > 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
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
                className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#1F2228] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>{t.actions.emergency.title}</span>
                  </h4>
                  <span className="text-[11px] text-amber-500 font-mono font-bold">PRIORITY HIGH</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">
                    {isAr ? "نوع حالة الطوارئ:" : "Incident Classification:"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(t.actions.emergency.categories).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selectedEmergencyCategory === key
                            ? "border-amber-600 bg-amber-950/20 text-white font-bold"
                            : "border-[#1F2228] bg-[#000000] text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={key}
                          checked={selectedEmergencyCategory === key}
                          onChange={() => setSelectedEmergencyCategory(key)}
                          className="text-amber-600 focus:ring-0 mt-0.5 bg-transparent border-zinc-700"
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
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="px-4 py-2 rounded-lg border border-[#1F2228] text-xs text-zinc-400 hover:text-white"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || cooldownRemaining > 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-amber-600 bg-amber-600 hover:bg-amber-700 text-black text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
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
                className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#1F2228] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <span>{t.actions.note.title}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-500 font-bold">
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
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00C853] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="px-4 py-2 rounded-lg border border-[#1F2228] text-xs text-zinc-400 hover:text-white"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || cooldownRemaining > 0 || !directNoteText.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
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
      />

      {/* Official Footer */}
      <footer className="w-full border-t border-[#1F2228] py-6 text-center text-xs text-zinc-500 space-y-1">
        <p>منظومة TapTag.one • بروتوكول حماية هوية المركبات والأصول المشفرة</p>
        <p className="text-[11px] text-zinc-600 font-mono">
          FIRST-CLAIM BIOMETRIC OWNERSHIP • ZERO-KNOWLEDGE SHIELD
        </p>
      </footer>
    </div>
  );
}
