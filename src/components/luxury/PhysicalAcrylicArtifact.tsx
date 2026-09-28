"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Check,
  Shield,
  Cpu,
  RotateCw,
  QrCode,
  ExternalLink,
  Copy,
  Layers,
  Sparkles,
} from "lucide-react";
import { ContactlessWaves } from "@/components/ui/TapTagLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhysicalAcrylicArtifactProps {
  tagUid?: string;
  className?: string;
}

export function PhysicalAcrylicArtifact({
  tagUid = "TT-88219-X",
  className = "",
}: PhysicalAcrylicArtifactProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const targetUrl = `https://taptag.one/r/${tagUid}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 400,
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then(setQrDataUrl);
  }, [targetUrl]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Gentle subtle tilt (max 5 degrees)
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center gap-3 select-none ${className}`}>
      {/* 3D Perspective Card Container */}
      <div
        className="relative perspective-[1200px] cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsFlipped(!isFlipped)}
        title="انقر لقلب البطاقة ومعاينة العتاد الداخلي"
      >
        <div
          className="relative w-full max-w-[390px] sm:max-w-[440px] aspect-[7/5] rounded-xl border border-white/20 bg-[#060608] p-4 sm:p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 ease-out"
          style={{
            transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y + (isFlipped ? 180 : 0)}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Subtle Chamfered Edge Line */}
          <div className="absolute inset-[3px] rounded-lg border border-white/[0.07] pointer-events-none" />

          {/* Diagonal Optical Sheen (Zero Blur) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

          {/* 1.5px Laser Scanline Beam (Pure Emerald Precision) */}
          <div className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00C853] to-transparent pointer-events-none animate-laser-sweep z-20" />

          {/* ================= FRONT SIDE ================= */}
          {!isFlipped ? (
            <>
              {/* Top Architectural Circuit Header */}
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00C853] shrink-0" />
                  <span className="text-[10px] font-mono tracking-widest text-zinc-300 font-semibold uppercase">
                    TAPTAG SECURE IC • NTAG216
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-black text-[9px] font-mono text-zinc-400">
                  <Cpu className="w-3 h-3 text-[#00C853]" />
                  <span>13.56 MHz</span>
                </div>
              </div>

              {/* Core Layout: Left Specs & Right Micro-QR */}
              <div className="flex items-center justify-between gap-4 my-auto relative z-10">
                {/* Left Brand Identity */}
                <div className="flex flex-col space-y-1 text-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-white lowercase">
                      taptag<span className="text-[#00C853]">.</span>one
                    </span>
                    <ContactlessWaves className="w-5 h-5 text-white" />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-zinc-400 block tracking-wider uppercase">
                      ZERO-KNOWLEDGE VEHICLE PROTOCOL
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 block">
                      ECC LEVEL H (30%) • ANTI-METAL FERRITE
                    </span>
                  </div>
                </div>

                {/* Right Vector QR Matrix (Clickable to open dialog) */}
                <div
                  className="relative p-1 rounded-lg border border-white/20 bg-black shrink-0 hover:border-[#00C853] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrModalOpen(true);
                  }}
                  title="انقر لتكبير واختبار الـ QR"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded flex items-center justify-center">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="TapTag QR" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-black/10 flex items-center justify-center text-black font-mono text-[9px]">
                        QR
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Hardware Strip */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono relative z-10">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="text-zinc-500">TAG ID</span>
                  <span className="text-white font-bold tracking-wider">{tagUid}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] text-[9px] font-bold">
                  <Check className="w-3 h-3" />
                  <span>AUTHENTICATED</span>
                </div>
              </div>
            </>
          ) : (
            /* ================= REAR SIDE (HARDWARE ARCHITECTURE) ================= */
            <div className="flex flex-col justify-between h-full relative z-10 [transform:rotateY(180deg)] text-start space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#00C853]" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                    INTERNAL HARDWARE SHIELD
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400">FERRITE 0.2mm</span>
              </div>

              {/* Helical RFID Antenna Simulation Graphic */}
              <div className="my-auto p-2.5 rounded-lg border border-white/10 bg-black flex flex-col items-center justify-center space-y-1.5">
                <div className="w-full h-12 rounded border border-[#00C853]/30 bg-[#00C853]/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-x-2 inset-y-1 rounded border border-[#00C853]/20" />
                  <div className="absolute inset-x-4 inset-y-2 rounded border border-[#00C853]/40" />
                  <span className="text-[9px] font-mono text-[#00C853] font-bold relative z-10">
                    COPPER HELICAL COIL ANTENNA • 13.56 MHz
                  </span>
                </div>
                <div className="w-full flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-1">
                  <span>SINTERED FERRITE BARRIER</span>
                  <span>AES-256 SECURE ELEMENT</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span>BATCH: M-2026-X1</span>
                <span className="text-[#00C853]">ISO 14443-A • IP68 RATED</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Micro Actions Bar Below Card */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/40 bg-[#060608] hover:bg-black text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-[#00C853]" />
          <span>{isFlipped ? "الوجه الخارجي (Front)" : "العتاد الداخلي (Flip)"}</span>
        </button>

        <button
          type="button"
          onClick={() => setQrModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/40 bg-[#060608] hover:bg-black text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5 text-[#00C853]" />
          <span>معاينة الـ QR</span>
        </button>

        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00C853]/40 bg-[#00C853]/10 hover:bg-[#00C853]/20 text-[#00C853] transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>اختبار الرابط الحي</span>
        </a>
      </div>

      {/* High-Resolution QR Dialog */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="bg-[#060608] border-white/20 text-white max-w-sm text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-mono font-bold text-white flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00C853]" />
              <span>كود الاستجابة المعتمد (ISO 18004 Level H)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 flex flex-col items-center space-y-4">
            <div className="p-3 rounded-xl border border-white/20 bg-white">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="High-Res QR Code" className="w-48 h-48 object-contain" />
              )}
            </div>

            <div className="w-full space-y-1.5 text-xs font-mono">
              <div className="text-zinc-400">الرابط المرمّز المشفر:</div>
              <div className="p-2 rounded border border-white/10 bg-black text-[#00C853] break-all select-all font-mono text-[11px]" dir="ltr">
                {targetUrl}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full pt-1">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex-1 border-white/20 hover:bg-zinc-800 text-white font-mono text-xs cursor-pointer gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
              </Button>

              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full bg-[#00C853] hover:bg-[#00B045] text-black font-mono font-bold text-xs cursor-pointer gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح البوابة</span>
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
