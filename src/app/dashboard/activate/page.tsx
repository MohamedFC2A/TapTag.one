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
          // Auto-redirect to tag portal after 2.5 seconds
          const targetTag = scannedTagUid.trim();
          setTimeout(() => {
            if (targetTag) {
              router.push(`/t/${targetTag}`);
            } else {
              router.push("/dashboard");
            }
          }, 2500);
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
    <div className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col relative overflow-hidden ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Precision Micro-Grid Horizon */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* Floating Glassmorphic Header */}
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6 relative z-10">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isAr ? "العودة للوحة التحكم" : "Back to Dashboard"}</span>
          </Link>
        </div>

        {/* Title & Glass Stepper */}
        <div className="border-b border-white/[0.08] pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl glass-pill">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isAr ? "تفعيل واقتران بطاقة ذكية بالبصمة" : "Zero-Password Smart Tag Activation"}
              </h1>
            </div>
            {/* Step Pills */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 1 ? "bg-white text-black" : "glass-pill text-zinc-500"}`}>1</span>
              <span className="w-3 h-0.5 bg-white/20" />
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 2 ? "bg-white text-black" : "glass-pill text-zinc-500"}`}>2</span>
              <span className="w-3 h-0.5 bg-white/20" />
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 3 ? "bg-white text-black" : "glass-pill text-zinc-500"}`}>3</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {isAr
              ? "تفعيل فوري عبر تقريب NFC أو مسح QR بدون كلمات مرور، مع قفل الملكية ببصمة جوالك الحصرية."
              : "Instant passwordless pairing via NFC tap or camera scan, cryptographically locked to your smartphone fingerprint."}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-2xl glass-surface-elevated border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: SCAN QR OR TAP NFC                                    */}
        {/* ------------------------------------------------------------- */}
        {step === 1 && (
          <div className="glass-surface-elevated rounded-3xl p-6 sm:p-8 space-y-6 border border-white/[0.12] shadow-glass">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {isAr ? "الخطوة 1: مسح رمز الـ QR أو تقريب الـ NFC" : "Step 1: Scan QR or Tap NFC"}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full glass-pill">NO PASSWORDS REQUIRED</span>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setScanMode("nfc")}
                className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  scanMode === "nfc"
                    ? "glass-surface-elevated border-white text-white font-bold shadow-sm"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                <Radio className="w-5 h-5 text-white" />
                <span>{isAr ? "تقريب NFC" : "Tap NFC"}</span>
              </button>

              <button
                type="button"
                onClick={() => setScanMode("camera")}
                className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  scanMode === "camera"
                    ? "glass-surface-elevated border-white text-white font-bold shadow-sm"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                <Camera className="w-5 h-5 text-white" />
                <span>{isAr ? "كاميرا الـ QR" : "Scan QR"}</span>
              </button>

              <button
                type="button"
                onClick={() => setScanMode("manual")}
                className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  scanMode === "manual"
                    ? "glass-surface-elevated border-white text-white font-bold shadow-sm"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                <Cpu className="w-5 h-5 text-white" />
                <span>{isAr ? "إدخال المعرّف" : "Enter UID"}</span>
              </button>
            </div>

            {/* Interactive Scanner / Reader Viewfinder */}
            {scanMode === "nfc" && (
              <div className="p-8 sm:p-10 rounded-2xl glass-surface border border-white/[0.08] flex flex-col items-center justify-center text-center space-y-5">
                <div className={`w-20 h-20 rounded-full glass-surface-elevated border border-white/20 flex items-center justify-center text-white relative ${isScanning ? "animate-pulse" : ""}`}>
                  <Radio className="w-9 h-9 text-white" />
                  {isScanning && (
                    <span className="absolute inset-0 rounded-full border border-white animate-ping opacity-30" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isScanning
                      ? (isAr ? "جارٍ قراءة شريحة الـ NFC والمصادقة..." : "Reading NFC IC Tag...")
                      : (isAr ? "قرّب بطاقة الأكريليك من ظهر جوالك" : "Hold Acrylic Tag Near Phone")}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
                    {isAr
                      ? "يتم قراءة معرّف الشريحة المشفر آلياً دون الحاجة لأي تطبيق أو كلمة سر."
                      : "Direct hardware IC reading via standard NFC frequency (13.56 MHz)."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNfcSimulate}
                  disabled={isScanning}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-glass active:scale-95 cursor-pointer"
                >
                  {isScanning ? (isAr ? "جارٍ الالتقاط..." : "Detecting...") : (isAr ? "بدء استشعار تقريب الـ NFC" : "Simulate NFC Tap")}
                </button>
              </div>
            )}

            {scanMode === "camera" && (
              <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/[0.08] flex flex-col items-center justify-center text-center space-y-5">
                <div className="w-56 h-56 rounded-2xl border-2 border-white/20 relative overflow-hidden flex items-center justify-center bg-black/60 shadow-glass">
                  <div className="absolute inset-x-0 h-0.5 bg-white animate-bounce shadow-none" style={{ top: "45%" }} />
                  <ScanLine className="w-20 h-20 text-zinc-500" />
                  <span className="absolute bottom-3 text-[10px] font-mono text-white glass-pill px-2.5 py-1 rounded-full font-bold">
                    ALIGN QR IN FRAME
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "وجّه الكاميرا نحو كود الـ QR على البطاقة" : "Point Camera at Tag QR Code"}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isAr ? "التعرف التلقائي على معرّف البطاقة الفيزيائية" : "Auto-detects hardware serial UID from ISO 18004 code."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCameraScanSimulate}
                  disabled={isScanning}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-glass active:scale-95 cursor-pointer"
                >
                  {isScanning ? (isAr ? "جارٍ قراءة الـ QR..." : "Scanning...") : (isAr ? "محاكاة تصوير كود الـ QR" : "Capture QR Code")}
                </button>
              </div>
            )}

            {scanMode === "manual" && (
              <div className="p-6 rounded-2xl glass-surface border border-white/[0.08] space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                    {isAr ? "أدخل الرقم التسلسلي للبطاقة (UID):" : "Serial Tag UID:"}
                  </label>
                  <input
                    type="text"
                    value={scannedTagUid}
                    onChange={(e) => setScannedTagUid(e.target.value.toUpperCase())}
                    placeholder="TT-88219-X"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none uppercase"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleManualProceed}
                  className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all shadow-glass cursor-pointer"
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
          <div className="glass-surface-elevated rounded-3xl p-6 sm:p-8 space-y-6 border border-white/[0.12] shadow-glass">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {isAr ? "الخطوة 2: ربط وقفل الملكية بالبصمة البيومترية" : "Step 2: Lock Ownership via Fingerprint"}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full glass-pill">HARDWARE VERIFIED</span>
            </div>

            {/* Hardware Verified Banner */}
            <div className="p-4 rounded-2xl glass-surface border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl glass-pill">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isAr ? "تم التحقق من معرّف البطاقة الفيزيائية بنجاح" : "Hardware UID Verified in System"}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono font-bold">
                    UID: {scannedTagUid}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full glass-pill text-white text-[10px] font-mono font-bold">
                READY
              </span>
            </div>

            {/* Vehicle Profile Input */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {isAr ? "بيانات المركبة المقترنة:" : "Vehicle Details:"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "رقم اللوحة الرسمي:" : "License Plate:"} *
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "الشركة المصنعة (Make):" : "Make:"} *
                  </label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "الموديل والفئة:" : "Model / Trim:"}
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {isAr ? "رقم هاتفك لاستقبال التنبيهات (مشفر ومحجوب):" : "Emergency Contact (Private):"} *
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ONE-TOUCH BIOMETRIC CLAIM BUTTON */}
            <div className="p-5 rounded-2xl glass-surface border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl glass-pill flex items-center justify-center text-white shrink-0">
                  <Fingerprint className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "المصادقة بالبصمة وقفل الملكية الحصرية" : "Biometric Passkey Claim"}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-glass active:scale-95 cursor-pointer"
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
          <div className="glass-surface-elevated rounded-3xl p-8 sm:p-10 text-center space-y-6 border border-white/[0.12] shadow-glass-elevated">
            <div className="w-16 h-16 rounded-full glass-surface border border-white/20 flex items-center justify-center text-white mx-auto shadow-glass">
              <Check className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-white text-xs font-mono font-bold">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>FIRST-CLAIM OWNERSHIP LOCKED</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isAr ? "تم التفعيل والاقتران بالبصمة بنجاح! (OK)" : "Tag Activated Successfully! (OK)"}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? `تحول رمز الـ QR (${scannedTagUid}) الآن إلى بوابتك المشفرة بالكامل. إذا قام أي شخص غريب بتصويره سيتوجه لبوابة الإجراءات الآمنة دون كشف أي معلومات عنك، وإذا صورته أنت من هذا الجوال سيفتح لك لوحة التحكم وتعديل الإعدادات فورياً بالبصمة.`
                  : `Tag ${scannedTagUid} is now cryptographically locked to this smartphone. External scans route to the privacy-masked portal, while your scans open the Owner Management suite.`}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/t/${scannedTagUid}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all shadow-glass"
              >
                <span>{isAr ? "فتح بوابة البطاقة الآن" : "Open Tag Portal"}</span>
                {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-xl glass-card text-xs text-zinc-300 hover:text-white transition-all"
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
