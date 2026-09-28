"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  PlusCircle,
  Cpu,
  Car,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Radio,
  Fingerprint,
  Camera,
  Upload,
  Check,
  Zap,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { Language } from "@/types";
import { claimAndActivateTag } from "@/app/actions/activation-actions";
import {
  getOrCreateDeviceId,
  getClientDeviceName,
  performBiometricAuth,
} from "@/lib/device-auth";

export default function ActivateTagPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ar");
  const [isPending, startTransition] = useTransition();

  // Step state: 1 = Scan/Detect, 2 = Configure & Biometric Claim, 3 = Activated OK
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scanMode, setScanMode] = useState<"camera" | "nfc" | "manual">("nfc");
  const [scannedTagUid, setScannedTagUid] = useState<string>("TT-2026-SA");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState<boolean>(false);

  // Vehicle claim fields
  const [vehiclePlate, setVehiclePlate] = useState<string>("أ ب ج 5555");
  const [vehicleMake, setVehicleMake] = useState<string>("Toyota");
  const [vehicleModel, setVehicleModel] = useState<string>("Land Cruiser");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("+966555123456");
  const [autoResponse, setAutoResponse] = useState<string>("سأعود خلال 15 دقيقة، شكراً لصبركم.");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAr = lang === "ar";

  // Auto-detect tag from QR redirect URL (/dashboard/activate?tag=MW-XXXX-XXXX)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tagParam = params.get("tag");
      if (tagParam) {
        setScannedTagUid(tagParam.trim().toUpperCase());
        setStep(2);
      }
    }
  }, []);

  // Simulate NFC Touch Detection
  const handleNfcSimulate = () => {
    setIsScanning(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsScanning(false);
      setScannedTagUid("TT-" + Math.floor(10000 + Math.random() * 90000) + "-X");
      setStep(2);
    }, 1400);
  };

  // Simulate Camera QR Scan Detection
  const handleCameraScanSimulate = () => {
    setIsScanning(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsScanning(false);
      setScannedTagUid("TT-" + Math.floor(10000 + Math.random() * 90000) + "-K");
      setStep(2);
    }, 1800);
  };

  // Manual proceed
  const handleManualProceed = () => {
    if (!scannedTagUid.trim()) return;
    setStep(2);
  };

  // Biometric First-Claim Submit - MANDATORY REAL FINGERPRINT
  const handleBiometricClaimSubmit = async () => {
    setIsBiometricAuthenticating(true);
    setErrorMsg(null);

    try {
      // 1. Mandatory Native Fingerprint / WebAuthn Challenge
      const bioAuth = await performBiometricAuth(scannedTagUid);

      if (!bioAuth.success) {
        setIsBiometricAuthenticating(false);
        setErrorMsg(bioAuth.error || "تعذرت المصادقة بالبصمة. يلزم وضع البصمة لتأكيد ملكية البطاقة.");
        return;
      }

      const devName = getClientDeviceName();

      startTransition(async () => {
        const res = await claimAndActivateTag({
          tagUid: scannedTagUid,
          deviceId: bioAuth.deviceId,
          deviceName: devName,
          vehiclePlate,
          vehicleMake,
          vehicleModel,
          emergencyContactPhone: emergencyPhone,
          autoResponseText: autoResponse,
        });

        setIsBiometricAuthenticating(false);

        if (res.success) {
          setStep(3);
          setSuccessMsg(res.message || "تم التفعيل والاقتران بالبصمة بنجاح!");
        } else {
          setErrorMsg(res.error || "فشل التفعيل.");
        }
      });
    } catch (err: unknown) {
      setIsBiometricAuthenticating(false);
      const e = err as Error;
      setErrorMsg(e?.message || "حدث خطأ أثناء فحص البصمة. يرجى المحاولة ثانية.");
    }
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isAr ? "العودة للوحة التحكم" : "Back to Dashboard"}</span>
          </Link>
        </div>

        {/* Title */}
        <div className="border-b border-[#1F2228] pb-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-[#00C853]" />
            <h1 className="text-xl font-bold text-white tracking-wide">
              {isAr ? "تفعيل واقتران بطاقة ذكية بالبصمة (NFC / QR)" : "Zero-Password Smart Tag Activation"}
            </h1>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {isAr
              ? "تفعيل فوري عبر تقريب NFC أو مسح QR بدون كلمات مرور، مع قفل الملكية ببصمة جوالك الحصرية."
              : "Instant passwordless pairing via NFC tap or camera scan, cryptographically locked to your smartphone fingerprint."}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg border border-red-900/60 bg-red-950/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: SCAN QR OR TAP NFC                                    */}
        {/* ------------------------------------------------------------- */}
        {step === 1 && (
          <div className="border border-[#1F2228] rounded-xl bg-[#08080A] p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1F2228] pb-3">
              <span className="text-xs font-mono font-bold text-[#00C853] uppercase tracking-wider">
                {isAr ? "الخطوة 1: مسح رمز الـ QR أو تقريب الـ NFC" : "Step 1: Scan QR or Tap NFC"}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">NO PASSWORDS REQUIRED</span>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScanMode("nfc")}
                className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-colors ${
                  scanMode === "nfc"
                    ? "border-[#00C853] bg-[#00C853]/15 text-[#00C853] font-bold"
                    : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-white"
                }`}
              >
                <Radio className="w-5 h-5 text-[#00C853]" />
                <span>{isAr ? "تقريب NFC" : "Tap NFC"}</span>
              </button>

              <button
                type="button"
                onClick={() => setScanMode("camera")}
                className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-colors ${
                  scanMode === "camera"
                    ? "border-[#00C853] bg-[#00C853]/15 text-[#00C853] font-bold"
                    : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-white"
                }`}
              >
                <Camera className="w-5 h-5 text-[#00C853]" />
                <span>{isAr ? "كاميرا الـ QR" : "Scan QR"}</span>
              </button>

              <button
                type="button"
                onClick={() => setScanMode("manual")}
                className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-colors ${
                  scanMode === "manual"
                    ? "border-[#00C853] bg-[#00C853]/15 text-[#00C853] font-bold"
                    : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-white"
                }`}
              >
                <Cpu className="w-5 h-5 text-[#00C853]" />
                <span>{isAr ? "إدخال المعرّف" : "Enter UID"}</span>
              </button>
            </div>

            {/* Interactive Scanner / Reader Viewfinder */}
            {scanMode === "nfc" && (
              <div className="p-8 rounded-xl border border-dashed border-[#1F2228] bg-[#000000] flex flex-col items-center justify-center text-center space-y-4">
                <div className={`w-20 h-20 rounded-full border border-[#00C853]/60 bg-[#00C853]/15 flex items-center justify-center text-[#00C853] relative ${isScanning ? "animate-pulse" : ""}`}>
                  <Radio className="w-10 h-10 text-[#00C853]" />
                  {isScanning && (
                    <span className="absolute inset-0 rounded-full border-2 border-[#00C853] animate-ping opacity-60" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isScanning
                      ? (isAr ? "جارٍ قراءة شريحة الـ NFC والمصادقة..." : "Reading NFC IC Tag...")
                      : (isAr ? "قرّب بطاقة الأكريليك من ظهر جوالك" : "Hold Acrylic Tag Near Phone")}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">
                    {isAr
                      ? "يتم قراءة معرّف الشريحة المشفر آلياً دون الحاجة لأي تطبيق أو كلمة سر."
                      : "Direct hardware IC reading via standard NFC frequency (13.56 MHz)."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNfcSimulate}
                  disabled={isScanning}
                  className="px-6 py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isScanning ? (isAr ? "جارٍ الالتقاط..." : "Detecting...") : (isAr ? "بدء استشعار تقريب الـ NFC" : "Simulate NFC Tap")}
                </button>
              </div>
            )}

            {scanMode === "camera" && (
              <div className="p-6 rounded-xl border border-[#1F2228] bg-[#000000] flex flex-col items-center justify-center text-center space-y-4">
                {/* Simulated Live Viewfinder with scanning laser */}
                <div className="w-64 h-64 rounded-xl border-2 border-[#00C853]/60 relative overflow-hidden flex items-center justify-center bg-black">
                  <div className="absolute inset-x-0 h-0.5 bg-[#00C853] animate-bounce shadow-none" style={{ top: "45%" }} />
                  <ScanLine className="w-24 h-24 text-[#00C853]/40" />
                  <span className="absolute bottom-3 text-[10px] font-mono text-[#00C853] bg-black/90 px-2 py-0.5 rounded border border-[#00C853]/40 font-bold">
                    ALIGN QR IN FRAME
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "وجّه الكاميرا نحو كود الـ QR على البطاقة" : "Point Camera at Tag QR Code"}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    {isAr ? "التعرف التلقائي على معرّف البطاقة الفيزيائية" : "Auto-detects hardware serial UID from ISO 18004 code."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCameraScanSimulate}
                  disabled={isScanning}
                  className="px-6 py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isScanning ? (isAr ? "جارٍ قراءة الـ QR..." : "Scanning...") : (isAr ? "محاكاة تصوير كود الـ QR" : "Capture QR Code")}
                </button>
              </div>
            )}

            {scanMode === "manual" && (
              <div className="p-6 rounded-xl border border-[#1F2228] bg-[#000000] space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                    {isAr ? "أدخل الرقم التسلسلي للبطاقة (UID):" : "Serial Tag UID:"}
                  </label>
                  <input
                    type="text"
                    value={scannedTagUid}
                    onChange={(e) => setScannedTagUid(e.target.value.toUpperCase())}
                    placeholder="TT-88219-X"
                    className="w-full bg-[#08080A] border border-[#1F2228] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853] uppercase"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleManualProceed}
                  className="w-full py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors"
                >
                  {isAr ? "التحقق والمتابعة للربط بالبصمة" : "Verify & Proceed to Biometrics"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: CONFIGURE & ONE-TOUCH BIOMETRIC CLAIM                  */}
        {/* ------------------------------------------------------------- */}
        {step === 2 && (
          <div className="border border-[#1F2228] rounded-xl bg-[#08080A] p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1F2228] pb-3">
              <span className="text-xs font-mono font-bold text-[#00C853] uppercase tracking-wider">
                {isAr ? "الخطوة 2: ربط وقفل الملكية بالبصمة البيومترية" : "Step 2: Lock Ownership via Fingerprint"}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">HARDWARE VERIFIED</span>
            </div>

            {/* Hardware Verified Banner */}
            <div className="p-3.5 rounded-lg border border-[#00C853]/40 bg-[#00C853]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00C853]" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isAr ? "تم التحقق من معرّف البطاقة الفيزيائية بنجاح" : "Hardware UID Verified in System"}
                  </span>
                  <span className="text-[11px] text-[#A1A1AA] font-mono font-bold">
                    UID: {scannedTagUid}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded border border-[#00C853]/40 bg-black text-[#00C853] text-[10px] font-mono font-bold">
                READY
              </span>
            </div>

            {/* Vehicle Profile Input */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {isAr ? "بيانات المركبة المقترنة:" : "Vehicle Details:"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "رقم اللوحة الرسمي:" : "License Plate:"} *
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "الشركة المصنعة (Make):" : "Make:"} *
                  </label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "الموديل والفئة:" : "Model / Trim:"}
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    {isAr ? "رقم هاتفك لاستقبال التنبيهات (مشفر ومحجوب):" : "Emergency Contact (Private):"} *
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>
              </div>
            </div>

            {/* ONE-TOUCH BIOMETRIC CLAIM BUTTON */}
            <div className="p-4 rounded-xl border border-[#00C853]/40 bg-[#00C853]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-[#00C853] bg-black flex items-center justify-center text-[#00C853] shrink-0">
                  <Fingerprint className="w-7 h-7 text-[#00C853]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "المصادقة بالبصمة وقفل الملكية الحصرية" : "Biometric Passkey Claim"}
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    {isAr
                      ? "سيتم تسجيل معرّف جوالك الحالي بالبصمة ليرتبط هذا الـ QR بجوالك فقط."
                      : "Cryptographically pairs this QR code to this smartphone device ID."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBiometricClaimSubmit}
                disabled={isPending || isBiometricAuthenticating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0"
              >
                <Fingerprint className="w-4 h-4 text-black" />
                <span>
                  {isBiometricAuthenticating || isPending
                    ? (isAr ? "جارٍ التحقق بالبصمة..." : "Verifying...")
                    : (isAr ? "تسجيل بالبصمة وإتمام التفعيل" : "Authenticate & Pair Tag")}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: ACTIVATION COMPLETED OK                               */}
        {/* ------------------------------------------------------------- */}
        {step === 3 && (
          <div className="border border-[#00C853]/60 rounded-xl bg-[#08080A] p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full border-2 border-[#00C853] bg-[#00C853]/15 flex items-center justify-center text-[#00C853] mx-auto">
              <Check className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-[#00C853]/40 bg-black text-[#00C853] text-xs font-mono font-bold">
                <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                <span>FIRST-CLAIM OWNERSHIP LOCKED</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {isAr ? "تم التفعيل والاقتران بالبصمة بنجاح! (OK)" : "Tag Activated Successfully! (OK)"}
              </h2>

              <p className="text-xs text-[#A1A1AA] max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? `تحول رمز الـ QR (${scannedTagUid}) الآن إلى بوابتك المشفرة بالكامل. إذا قام أي شخص غريب بتصويره سيتوجه لبوابة الإجراءات الآمنة دون كشف أي معلومات عنك، وإذا صورته أنت من هذا الجوال سيفتح لك لوحة التحكم وتعديل الإعدادات فورياً بالبصمة.`
                  : `Tag ${scannedTagUid} is now cryptographically locked to this smartphone. External scans route to the privacy-masked portal, while your scans open the Owner Management suite.`}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/t/${scannedTagUid}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors"
              >
                <span>{isAr ? "فتح بوابة البطاقة الآن" : "Open Tag Portal"}</span>
                {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-xs text-zinc-300 hover:text-white hover:border-[#00C853] transition-colors"
              >
                {isAr ? "الانتقال للوحة التحكم" : "Go to Dashboard"}
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
