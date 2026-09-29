"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import {
  QrCode,
  Wifi,
  Camera,
  Flashlight,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Sparkles,
  Search,
} from "lucide-react";
import { TapTagLogo } from "@/components/ui/TapTagLogo";

export function ScanClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"camera" | "nfc">("camera");

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [detectedTag, setDetectedTag] = useState<string | null>(null);

  // NFC state
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);

  // Manual fallback input
  const [manualTag, setManualTag] = useState("");

  // Start Camera
  const startCamera = async (facing: "environment" | "user") => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check flashlight support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setHasCameraPermission(false);
      setCameraError(
        err.name === "NotAllowedError"
          ? "تم رفض إذن الكاميرا. يرجى تفعيل الكاميرا من إعدادات المتصفح لمسح الكود."
          : "تعذر فتح الكاميرا على هذا الجهاز. يرجى المحاولة ثانية أو استخدام قارئ NFC."
      );
    }
  };

  // Switch Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch error:", e);
    }
  };

  // Flip Camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Parse extracted text into Tag UID and navigate
  const handleTagResolved = (rawText: string) => {
    if (detectedTag) return; // Prevent multiple triggers

    const trimmed = rawText.trim();
    let tagUid = "";

    // If it's a full URL like https://tagtap.one/r/MW-88219-X or https://taptag.one/r/...
    if (trimmed.includes("/r/")) {
      const parts = trimmed.split("/r/");
      tagUid = parts[parts.length - 1].split(/[?#]/)[0].toUpperCase();
    } else if (trimmed.includes("/t/")) {
      const parts = trimmed.split("/t/");
      tagUid = parts[parts.length - 1].split(/[?#]/)[0].toUpperCase();
    } else {
      // Plain tag UID or custom code
      tagUid = trimmed.toUpperCase();
    }

    if (!tagUid) return;

    setDetectedTag(tagUid);

    // Audio chime & Haptic vibration
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // ignore audio limits
    }

    setTimeout(() => {
      router.push(`/t/${tagUid}`);
    }, 800);
  };

  // Live Frame Scanning Loop
  useEffect(() => {
    if (mode !== "camera" || !hasCameraPermission) return;

    let isScanning = true;

    const scanFrame = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 1. Try Native BarcodeDetector if available (Ultra-fast hardware accelerated)
          if (typeof window !== "undefined" && "BarcodeDetector" in window) {
            try {
              const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
              const barcodes = await detector.detect(canvas);
              if (barcodes && barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code) {
                  handleTagResolved(code);
                  return;
                }
              }
            } catch (err) {
              // fallback to jsQR below
            }
          }

          // 2. jsQR Pure JS Fallback
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (qrCode && qrCode.data) {
            handleTagResolved(qrCode.data);
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, hasCameraPermission, detectedTag]);

  // Manage Camera on Mode Change
  useEffect(() => {
    if (mode === "camera") {
      startCamera(facingMode);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [mode]);

  // Web NFC Reader setup (Chrome / Android)
  useEffect(() => {
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setNfcSupported(true);
    }
  }, []);

  const handleStartNfcScan = async () => {
    setNfcError(null);
    if (!("NDEFReader" in window)) {
      setNfcError("ميزة Web NFC غير مدعومة مباشرة في متصفحك. على أجهزة الآيفون، يكفي تقريب الهاتف من البطاقة وسيفتح الرابط تلقائياً.");
      return;
    }

    try {
      setNfcScanning(true);
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreading = (event: any) => {
        const records = event.message?.records || [];
        for (const record of records) {
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            handleTagResolved(url);
            return;
          } else if (record.recordType === "text") {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            handleTagResolved(text);
            return;
          }
        }
        if (event.serialNumber) {
          handleTagResolved(event.serialNumber);
        }
      };

      ndef.onreadingerror = () => {
        setNfcError("تعذرت قراءة الشريحة. يرجى تثبيت الهاتف بجوار بطاقة الأكريليك والمحاولة ثانية.");
      };
    } catch (err: any) {
      setNfcScanning(false);
      setNfcError("تعذر تفعيل قارئ NFC. تأكد من تفعيل ميزة NFC في إعدادات جوالك.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTag.trim()) return;
    router.push(`/t/${manualTag.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col items-center justify-between p-4 relative overflow-hidden select-none" dir="rtl">
      {/* Background Micro Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between pt-2 pb-4 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>الرئيسية</span>
        </Link>

        <Link href="/" className="flex items-center gap-2">
          <TapTagLogo showSubtitle={false} size="sm" />
        </Link>
      </div>

      {/* Main Viewport Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center items-center relative z-10 py-2">
        {/* Mode Switcher Tabs */}
        <div className="w-full grid grid-cols-2 p-1 rounded-2xl glass-surface-elevated border border-white/[0.10] shadow-glass mb-4">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === "camera"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>كاميرا QR</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("nfc")}
            className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === "nfc"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>لمس NFC</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* MODE 1: LIVE CAMERA QR SCANNER                                  */}
        {/* ============================================================== */}
        {mode === "camera" && (
          <div className="w-full relative flex flex-col items-center">
            {/* Viewfinder Frame */}
            <div className="w-full aspect-square max-w-[360px] rounded-3xl overflow-hidden glass-surface border border-white/20 shadow-2xl relative flex items-center justify-center bg-black">
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning HUD Reticle with Corner Brackets */}
              <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                  <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                </div>

                {/* Laser Scanning Line Animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />

                <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                  <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                </div>
              </div>

              {/* Success Detected Overlay */}
              {detectedTag && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400">تم رصد بطاقة الأكريليك بنجاح</span>
                  <strong className="text-lg font-mono font-black text-white mt-1">{detectedTag}</strong>
                  <span className="text-xs text-emerald-300 mt-2 font-mono animate-pulse">
                    جارٍ فتح البوابة الآمنة...
                  </span>
                </div>
              )}

              {/* Camera Error / Permission Notice */}
              {cameraError && (
                <div className="absolute inset-0 bg-[#0A0A0E]/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-xs">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs cursor-pointer shadow-md"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </div>

            {/* Camera Floating Controls (Flashlight & Flip) */}
            <div className="flex items-center gap-3 mt-4">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-3 rounded-2xl glass-card transition-all cursor-pointer ${
                    torchOn ? "bg-yellow-400 text-black shadow-lg" : "text-zinc-300 hover:text-white"
                  }`}
                  title="تشغيل إضاءة الفلاش"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 rounded-2xl glass-card text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="تبديل الكاميرا (أمامية / خلفية)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] font-mono text-zinc-400 text-center mt-3 max-w-xs">
              وجّه الكاميرا نحو كود الـ QR المطبوع على بطاقة السيارة، وسيتم التوجيه فورياً وبأمان.
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: SMART NFC TAP READER                                   */}
        {/* ============================================================== */}
        {mode === "nfc" && (
          <div className="w-full flex flex-col items-center text-center space-y-6 max-w-sm">
            {/* Visual NFC Concentric Radar Circle */}
            <div className="relative w-44 h-44 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center p-6 bg-emerald-500/[0.02]">
              <div className="w-32 h-32 rounded-full border border-emerald-500/50 flex items-center justify-center animate-pulse bg-emerald-500/[0.05]">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                  <Wifi className="w-10 h-10 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">قرّب بطاقتك من ظهر الجوال</h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                شريحة الـ NFC اللاتلامسية (NTAG216) تفتح بوابة التواصل فورياً عند ملامستها للجوال.
              </p>
            </div>

            {/* Web NFC Trigger Button for Android Chrome */}
            {nfcSupported && (
              <button
                type="button"
                onClick={handleStartNfcScan}
                disabled={nfcScanning}
                className="w-full py-3.5 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all shadow-glass cursor-pointer disabled:opacity-50"
              >
                {nfcScanning ? "مستشعر NFC نشط ومستعد..." : "بدء فحص NFC بالمتصفح"}
              </button>
            )}

            {/* Apple iPhone Guidance */}
            <div className="p-3.5 rounded-2xl glass-card text-right space-y-1.5 w-full">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-bold">مستخدمو آيفون (iOS):</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                لا تحتاج لأي تطبيق أو زر: فقط قرّب أعلى ظهر الآيفون من رمز NFC على بطاقة الأكريليك وستظهر لك شارة الإشعار فوراً.
              </p>
            </div>

            {nfcError && (
              <p className="text-xs text-amber-300 font-mono leading-relaxed">{nfcError}</p>
            )}
          </div>
        )}

        {/* Minimalist Manual Input Drawer Fallback */}
        <div className="w-full max-w-xs mt-6 pt-4 border-t border-white/[0.08]">
          <form onSubmit={handleManualSubmit} className="relative flex items-center gap-2">
            <input
              type="text"
              value={manualTag}
              onChange={(e) => setManualTag(e.target.value.toUpperCase())}
              placeholder="أو اكتب المعرّف (مثال: MW-88219-X)..."
              className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors uppercase tracking-wider text-start"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold shrink-0 cursor-pointer shadow-sm hover:bg-zinc-200 transition-all"
            >
              فتح
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-lg mx-auto pt-3 text-center text-[10px] font-mono text-zinc-500">
        <span>taptag.one • بوابة التشفير الآمن للمركبات</span>
      </div>
    </div>
  );
}
