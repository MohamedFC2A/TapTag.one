"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import type {
  CardDesignConfig,
  CardMaterial,
  CardDimension,
  CardCodeType,
  CardLogoPosition,
  CardLogoColor,
} from "@/types/card-design";
import { DEFAULT_CARD_DESIGN } from "@/types/card-design";
import { renderCode128Svg } from "@/lib/barcode-generator";
import {
  Wifi,
  Car,
  Shield,
  RotateCw,
  QrCode as QrIcon,
  Barcode as BarcodeIcon,
  PhoneCall,
  Sparkles,
  Info,
} from "lucide-react";

interface PhysicalCardRendererProps {
  config?: Partial<CardDesignConfig>;
  interactive?: boolean; // Enable 3D tilt sheen on mouse/touch
  allowFlip?: boolean;
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  scale?: number; // scale multiplier for previews
  className?: string;
}

export function PhysicalCardRenderer({
  config: incomingConfig,
  interactive = true,
  allowFlip = true,
  flipped: controlledFlipped,
  onFlipChange,
  scale = 1,
  className = "",
}: PhysicalCardRendererProps) {
  const config: CardDesignConfig = useMemo(
    () => ({ ...DEFAULT_CARD_DESIGN, ...(incomingConfig || {}) }),
    [incomingConfig]
  );

  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleToggleFlip = () => {
    if (!allowFlip) return;
    const next = !isFlipped;
    setInternalFlipped(next);
    onFlipChange?.(next);
  };

  // 3D tilt & sheen angle state
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [sheenX, setSheenX] = useState(50);
  const [sheenY, setSheenY] = useState(50);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -10;
    const rY = ((x - centerX) / centerX) * 10;
    setRotateX(rX);
    setRotateY(rY);
    setSheenX((x / rect.width) * 100);
    setSheenY((y / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setRotateX(0);
    setRotateY(0);
    setSheenX(50);
    setSheenY(50);
  };

  // Generate QR Code data URL
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const targetUrl = `https://taptag.one/r/${config.tagUid}`;

  useEffect(() => {
    const isPearl = config.material === "PEARL_WHITE";
    QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 320,
      color: {
        dark: isPearl ? "#000000" : "#FFFFFF",
        light: isPearl ? "#FFFFFF" : "#00000000",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code Error:", err));
  }, [targetUrl, config.material]);

  // Dimension aspect ratios & standard sizes
  const dimensionStyles = useMemo(() => {
    switch (config.dimensionStandard) {
      case "CR80_STANDARD":
        // 85.60 mm x 53.98 mm = ratio 1.585
        return {
          aspectRatio: "85.6 / 54",
          maxWidth: "428px",
          width: "100%",
          label: "85.6 × 54.0 مم (CR80 القياسي)",
        };
      case "MINI_KEY_54X28":
        // 54.0 mm x 28.0 mm = ratio 1.928
        return {
          aspectRatio: "54 / 28",
          maxWidth: "380px",
          width: "100%",
          label: "54.0 × 28.0 مم (تاج المفاتيح والمرايا)",
        };
      case "ACRYLIC_TAG_70X50":
      default:
        // 70.0 mm x 50.0 mm = ratio 1.40
        return {
          aspectRatio: "70 / 50",
          maxWidth: "400px",
          width: "100%",
          label: "70.0 × 50.0 مم (أكريليك الزجاج والسيارة)",
        };
    }
  }, [config.dimensionStandard]);

  // Material background and text color tokens
  const materialStyles = useMemo(() => {
    switch (config.material) {
      case "SMOKED_ACRYLIC":
        return {
          bgClass: "bg-[#09090B]/90 backdrop-blur-xl border border-zinc-700/60 shadow-2xl",
          textPrimary: "text-zinc-100",
          textSecondary: "text-zinc-400",
          cardEdge: "border-zinc-500/40",
          sheenOpacity: 0.35,
          barcodeColor: "#FFFFFF",
          badgeBg: "bg-zinc-800/80 border-zinc-600/50 text-zinc-200",
        };
      case "CARBON_FIBER":
        return {
          bgClass: "carbon-fiber border border-zinc-700 shadow-2xl",
          textPrimary: "text-white",
          textSecondary: "text-zinc-400",
          cardEdge: "border-zinc-600/70",
          sheenOpacity: 0.22,
          barcodeColor: "#FFFFFF",
          badgeBg: "bg-zinc-900/90 border-zinc-700 text-zinc-100",
        };
      case "BRUSHED_TITANIUM":
        return {
          bgClass: "brushed-metal border border-zinc-600/80 shadow-2xl",
          textPrimary: "text-white",
          textSecondary: "text-zinc-300",
          cardEdge: "border-zinc-400/50",
          sheenOpacity: 0.28,
          barcodeColor: "#FFFFFF",
          badgeBg: "bg-zinc-800/90 border-zinc-500/50 text-zinc-100",
        };
      case "PEARL_WHITE":
        return {
          bgClass: "bg-gradient-to-br from-white via-zinc-100 to-zinc-200 border border-zinc-300 text-zinc-900 shadow-2xl",
          textPrimary: "text-black",
          textSecondary: "text-zinc-600",
          cardEdge: "border-zinc-400/60",
          sheenOpacity: 0.18,
          barcodeColor: "#000000",
          badgeBg: "bg-zinc-200/90 border-zinc-400 text-zinc-900",
        };
      case "MATTE_OBSIDIAN":
      default:
        return {
          bgClass: "bg-[#0C0C0E] border border-zinc-800 shadow-2xl",
          textPrimary: "text-white",
          textSecondary: "text-zinc-400",
          cardEdge: "border-zinc-700/80",
          sheenOpacity: 0.15,
          barcodeColor: "#FFFFFF",
          badgeBg: "bg-zinc-900 border-zinc-800 text-zinc-300",
        };
    }
  }, [config.material]);

  // Logo styling
  const logoColorStyle = useMemo(() => {
    switch (config.logoColor) {
      case "GOLD":
        return "text-[#E5C158] drop-shadow-[0_1px_2px_rgba(229,193,88,0.4)]";
      case "STEALTH":
        return "text-zinc-600";
      case "SILVER":
        return "text-zinc-300 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]";
      case "WHITE":
      default:
        return "text-white";
    }
  }, [config.logoColor]);

  // Barcode SVG element
  const barcodeSvgHtml = useMemo(() => {
    return renderCode128Svg(config.tagUid, 40, materialStyles.barcodeColor);
  }, [config.tagUid, materialStyles.barcodeColor]);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Perspective Container */}
      <div
        style={{ perspective: "1200px" }}
        className="w-full flex justify-center items-center py-4"
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleToggleFlip}
          style={{
            aspectRatio: dimensionStyles.aspectRatio,
            maxWidth: dimensionStyles.maxWidth,
            transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${
              isFlipped ? rotateY + 180 : rotateY
            }deg)`,
            transformStyle: "preserve-3d",
            transition: interactive && rotateX !== 0 ? "none" : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden studio-card-shadow chamfer-bevel ${materialStyles.bgClass} ${materialStyles.cardEdge}`}
        >
          {/* Specular Ambient Studio Sheen (Calculated with mouse cursor / angle) */}
          <div
            style={{
              background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,${materialStyles.sheenOpacity}) 0%, transparent 60%)`,
            }}
            className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay transition-opacity duration-300"
          />

          {/* Precision Beveled Hairline Edge */}
          <div className="absolute inset-[1px] rounded-[15px] border border-white/10 pointer-events-none z-10" />

          {/* FRONT FACE */}
          <div
            style={{ backfaceVisibility: "hidden" }}
            className={`w-full h-full flex flex-col justify-between relative z-10 ${
              isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            {/* Header Row: Logo & NFC Frequency Icon */}
            <div className="flex items-center justify-between gap-2">
              {/* Logo / Badge */}
              <div
                className={`flex items-center gap-2 font-black tracking-wider text-sm sm:text-base ${logoColorStyle} ${
                  config.logoPosition === "TOP_RIGHT"
                    ? "order-last"
                    : config.logoPosition === "CENTER"
                    ? "mx-auto"
                    : ""
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center p-0.5">
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
                <span className="font-mono tracking-tight font-extrabold uppercase">
                  TAPTAG
                </span>
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/10 border border-white/10 opacity-80 font-sans">
                  PRO
                </span>
              </div>

              {/* NFC Contactless Wave Indicator */}
              {config.showNfcIcon && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono tracking-wider">
                  <Wifi className="w-3.5 h-3.5 rotate-90 text-current" />
                  <span className="hidden sm:inline">13.56 MHz</span>
                </div>
              )}
            </div>

            {/* Middle Section: QR Code, Barcode, or Dual + Vehicle Plate */}
            <div className="flex items-center justify-between gap-3 my-auto py-1">
              {/* Code Renderer (QR / Barcode / Dual) */}
              <div className="flex items-center gap-3">
                {/* QR Code Option */}
                {(config.codeType === "QR_CODE" || config.codeType === "DUAL") && (
                  <div className="relative p-1.5 rounded-lg bg-black/40 border border-white/10 flex-shrink-0">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Security QR Code"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain block rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800/50 animate-pulse rounded" />
                    )}
                  </div>
                )}

                {/* Industrial Barcode Option (Code 128) */}
                {(config.codeType === "BARCODE" || config.codeType === "DUAL") && (
                  <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                    <div
                      className="h-9 sm:h-11 w-full overflow-hidden opacity-90"
                      dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
                    />
                    <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-zinc-400 text-center font-bold">
                      {config.tagUid}
                    </span>
                  </div>
                )}
              </div>

              {/* Vehicle Plate Stamped Section */}
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[9px] font-mono tracking-wider uppercase text-zinc-500 font-semibold">
                  لوحة المركبة المسجلة
                </span>
                <div className="px-2.5 py-1 rounded-md bg-black/50 border border-white/20 shadow-inner flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-zinc-400" />
                  <span
                    dir="rtl"
                    className="font-mono font-black text-xs sm:text-sm tracking-wider text-white"
                  >
                    {config.plateNumber || "أ ب ج 1234"}
                  </span>
                </div>
                {config.customText && (
                  <span className="text-[8px] font-mono text-zinc-400 tracking-wider uppercase mt-0.5">
                    {config.customText}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row: Official UID & Security Protocol Indicator */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] sm:text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Shield className="w-3 h-3 text-current" />
                <span className="tracking-wider uppercase font-semibold">
                  {config.tagUid}
                </span>
              </div>

              {config.showEmergency && (
                <div className="flex items-center gap-1 text-zinc-300 bg-white/10 px-2 py-0.5 rounded font-sans text-[9px]">
                  <PhoneCall className="w-2.5 h-2.5" />
                  <span>طوارئ ذكية</span>
                </div>
              )}

              <span className="text-zinc-500 tracking-widest text-[8px] uppercase">
                TOUCH OR SCAN
              </span>
            </div>
          </div>

          {/* BACK FACE (Rotated 180deg) */}
          <div
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            className={`absolute inset-0 p-4 sm:p-5 flex flex-col justify-between text-right z-10 ${
              !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            {/* Top Back Details */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                TAPTAG SECURITY ARCHITECTURE
              </span>
              <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                <span>VERIFIED</span>
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Instructions & Official Notice */}
            <div className="my-auto space-y-2 text-right">
              <p className="text-[11px] sm:text-xs leading-relaxed text-zinc-300">
                بطاقة الاتصال الذكية المباشرة لحماية المركبة. في حال الطوارئ أو الحاجة لنقل
                السيارة، مرّر هاتفك أو امسح الرمز للتواصل المباشر والآمن مع المالك.
              </p>
              <div className="p-2 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-zinc-400 flex items-center justify-between">
                <span className="tracking-wider">{targetUrl}</span>
                <span className="text-zinc-500 font-sans">الرابط الرسمي المباشر</span>
              </div>
            </div>

            {/* Bottom Back Details */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[8px] font-mono text-zinc-500">
              <span>DESIGNED & LASER CRAFTED</span>
              <span>NFC ISO 14443-A • CE • FCC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flip Prompt Helper */}
      {allowFlip && (
        <button
          type="button"
          onClick={handleToggleFlip}
          className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1 px-3 rounded-full bg-zinc-900/60 border border-zinc-800"
        >
          <RotateCw className="w-3 h-3" />
          <span>{isFlipped ? "مشاهدة وجه البطاقة (Front)" : "مشاهدة ظهر البطاقة (Back)"}</span>
        </button>
      )}
    </div>
  );
}
