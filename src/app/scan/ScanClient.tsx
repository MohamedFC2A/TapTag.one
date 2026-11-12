"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  QrCode,
  Camera,
  Upload,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Search,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import type { Language } from "@/types";

export function ScanClient() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualInput, setManualInput] = useState("");
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleDecoded = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    setDecodedResult(clean);
    stopCamera();

    // Auto-route if it's a TapTag Smart QR code / short URL
    if (clean.includes("/q/")) {
      const code = clean.split("/q/").pop()?.split(/[?#]/)[0]?.toUpperCase();
      if (code) {
        router.push(`/q/${code}`);
      }
    }
  };

  const startCamera = async (facing: "environment" | "user") => {
    setCameraError(null);
    setDecodedResult(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraActive(false);
      setCameraError(
        isAr
          ? "تعذر فتح الكاميرا — يمكنك رفع صورة رمز QR أو إدخال الكود يدوياً أدناه."
          : "Camera unavailable — upload a QR image or enter the Smart QR code below."
      );
    }
  };

  useEffect(() => {
    if (!cameraActive) return;
    let active = true;

    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            handleDecoded(code.data);
            return;
          }
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 512;
      canvas.height = img.height || 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          handleDecoded(code.data);
        } else {
          setCameraError(
            isAr ? "لم يتم العثور على رمز QR واضح داخل الصورة." : "No readable QR code found in image."
          );
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setCameraError(isAr ? "تعذر قراءة ملف الصورة." : "Could not load image file.");
    };
    img.src = url;
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualInput.trim().toUpperCase();
    if (!val) return;
    if (val.includes("/Q/")) {
      const code = val.split("/Q/").pop()?.split(/[?#]/)[0];
      if (code) router.push(`/q/${code}`);
      return;
    }
    router.push(`/q/${val}`);
  };

  const handleCopy = async () => {
    if (!decodedResult) return;
    try {
      await navigator.clipboard.writeText(decodedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col relative ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="fixed inset-0 hw-pixel-grid pointer-events-none" aria-hidden="true" />
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="text-start pb-4 border-b border-[#27272A]">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#FFFFFF]">
            {isAr ? "فاحص وقارئ QR" : "QR Scanner"}
          </h1>
        </div>

        {/* Camera + Image Upload Panel */}
        <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
          <SegmentedLedBar
            level={cameraActive ? 92 : 50}
            cells={24}
            active={cameraActive}
          />
          <div className="p-5 sm:p-6 space-y-4">
            <div className="aspect-video w-full rounded-xl border border-[#27272A] bg-[#09090B] relative overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl border border-[#27272A] bg-[#121215] flex items-center justify-center mx-auto">
                    <QrCode className="w-5 h-5 text-[#FFFFFF]" />
                  </div>
                  <p className="text-xs font-mono text-[#A1A1AA]">
                    {isAr
                      ? "شغّل الكاميرا لمسح أي QR أو ارفع صورة كود QR مباشرة"
                      : "Start camera feed or upload a QR image to decode"}
                  </p>
                </div>
              )}

              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-[#FFFFFF] rounded-xl" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="flex-1 h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isAr ? "تشغيل الكاميرا" : "Start Camera"}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase cursor-pointer"
                  >
                    {isAr ? "إيقاف الكاميرا" : "Stop Camera"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = facingMode === "environment" ? "user" : "environment";
                      setFacingMode(next);
                      startCamera(next);
                    }}
                    className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                    title="Flip Camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="h-10 px-4 rounded-lg bg-[#09090B] text-[#FFFFFF] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center gap-2 transition-all duration-150 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isAr ? "فحص صورة QR" : "Upload QR Image"}</span>
              </button>
            </div>

            {cameraError && (
              <div className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#A1A1AA] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {decodedResult && (
              <div className="p-4 rounded-lg border border-[#FFFFFF] bg-[#09090B] space-y-3 text-start">
                <span className="text-[10px] font-mono uppercase text-[#71717A] block">
                  {isAr ? "النتيجة المقروءة" : "DECODED PAYLOAD"}
                </span>
                <div dir="ltr" className="text-xs font-mono text-[#FFFFFF] break-all">
                  {decodedResult}
                </div>
                <div className="flex items-center gap-2">
                  {/^https?:\/\//i.test(decodedResult) && (
                    <a
                      href={decodedResult}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-3.5 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <span>{isAr ? "فتح الوجهة" : "Open URL"}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Code Lookup */}
        <form
          onSubmit={handleManualLookup}
          className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden"
        >
          <SegmentedLedBar level={60} cells={24} />
          <div className="p-5 space-y-3 text-start">
            <label className="text-xs font-mono text-[#A1A1AA] block">
              {isAr
                ? "أدخل كود taptag. مباشرة (مثال: TT-DOCS1 أو TT-SEC02)"
                : "Enter a taptag. code directly (e.g. TT-DOCS1)"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="TT-DOCS1"
                className="flex-1 h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center gap-1.5 cursor-pointer transition-all duration-150"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isAr ? "فتح" : "Open"}</span>
              </button>
            </div>
          </div>
        </form>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
