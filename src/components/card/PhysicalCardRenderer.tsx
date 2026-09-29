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
  CardLayoutPreset,
  CardQrPlacement,
} from "@/types/card-design";
import { DEFAULT_CARD_DESIGN } from "@/types/card-design";
import { renderCode128Svg } from "@/lib/barcode-generator";
import { NfcWaveSymbol } from "./NfcWaveSymbol";
import {
  Car,
  Shield,
  RotateCw,
  QrCode as QrIcon,
  PhoneCall,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";

interface PhysicalCardRendererProps {
  config?: Partial<CardDesignConfig>;
  interactive?: boolean; // Enable 3D tilt sheen on mouse/touch
  allowFlip?: boolean;
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  scale?: number; // scale multiplier for previews
  className?: string;
  showDualView?: boolean; // Show Front & Back side-by-side (Amazon style)
}

export function PhysicalCardRenderer({
  config: incomingConfig,
  interactive = true,
  allowFlip = true,
  flipped: controlledFlipped,
  onFlipChange,
  scale = 1,
  className = "",
  showDualView = false,
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

  // 3D tilt & sheen angle state for primary card
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
        // 85.60 mm x 53.98 mm = ratio 1.5857 (Official ISO/IEC 7810 ID-1)
        return {
          aspectRatio: "85.6 / 54",
          maxWidth: "428px",
          width: "100%",
          label: "85.6 × 54.0 مم (CR80 القياسي - بطاقة ذكية)",
        };
      case "MINI_KEY_54X28":
        return {
          aspectRatio: "54 / 28",
          maxWidth: "380px",
          width: "100%",
          label: "54.0 × 28.0 مم (تاج المفاتيح والمرايا)",
        };
      case "ACRYLIC_TAG_70X50":
      default:
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
          cardHex: "#0D0D11",
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
          cardHex: "#111216",
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
          cardHex: "#1C1D21",
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
          cardHex: "#F4F4F6",
        };
      case "MATTE_OBSIDIAN":
      default:
        // Authentic Amazon Tap matte obsidian satin black
        return {
          bgClass: "bg-[#0E0F12] border border-zinc-800/80 shadow-2xl",
          textPrimary: "text-white",
          textSecondary: "text-zinc-400",
          cardEdge: "border-zinc-700/60",
          sheenOpacity: 0.14,
          barcodeColor: "#FFFFFF",
          badgeBg: "bg-zinc-900 border-zinc-800 text-zinc-300",
          cardHex: "#0E0F12",
        };
    }
  }, [config.material]);

  // Logo color styling
  const logoColorStyle = useMemo(() => {
    switch (config.logoColor) {
      case "GOLD":
        return "text-[#E5C158] drop-shadow-[0_1px_3px_rgba(229,193,88,0.4)]";
      case "STEALTH":
        return "text-zinc-600";
      case "SILVER":
        return "text-zinc-300 drop-shadow-[0_1px_2px_rgba(255,255,255,0.25)]";
      case "WHITE":
      default:
        return "text-white";
    }
  }, [config.logoColor]);

  const activeLayout: CardLayoutPreset = config.layoutPreset || "TAP_MINIMAL";
  const logoText = config.logoText || "taptag.";

  /**
   * FRONT FACE CONTENT BUILDER (Dir LTR for perfect logo & bottom-left NFC position)
   */
  const renderFrontFace = () => {
    if (activeLayout === "TAP_MINIMAL") {
      // Authentic Amazon Tap Card front: Center Logo + Bottom-left NFC Wave Symbol
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-5 sm:p-6 select-none">
          {/* Top minimal row or corner logo if selected */}
          <div className="flex items-center justify-between w-full h-6">
            {config.logoPosition === "TOP_LEFT" && (
              <span className={`font-black tracking-tight text-xl font-sans lowercase ${logoColorStyle}`}>
                {logoText}
              </span>
            )}
            {config.logoPosition === "TOP_RIGHT" && (
              <span className={`font-black tracking-tight text-xl font-sans lowercase ml-auto ${logoColorStyle}`}>
                {logoText}
              </span>
            )}
            {/* Optional Corner QR Code on front face if enabled */}
            {config.qrPlacement === "FRONT_CORNER" && (
              <div className="ml-auto w-12 h-12 p-1 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 animate-pulse rounded" />
                )}
              </div>
            )}
          </div>

          {/* DEAD CENTER: The Bold Minimalist Logo (Exact Amazon Tap Card style) */}
          {(config.logoPosition === "CENTER" || !config.logoPosition) && (
            <div className="my-auto flex flex-col items-center justify-center text-center">
              <span
                dir="ltr"
                className={`font-black tracking-tight text-3xl sm:text-4xl md:text-5xl font-sans lowercase select-none ${logoColorStyle}`}
                style={{ letterSpacing: "-0.04em" }}
              >
                {logoText}
              </span>
            </div>
          )}

          {/* Bottom Row: Official NFC Contactless Wave Symbol (N)) at Bottom-LEFT */}
          <div className="flex items-end justify-between w-full">
            {config.showNfcIcon && (
              <div className="flex items-center gap-2">
                <NfcWaveSymbol
                  className={`w-6 h-6 sm:w-7 sm:h-7 ${
                    config.material === "PEARL_WHITE" ? "text-zinc-900" : "text-white"
                  } transition-transform hover:scale-110`}
                />
              </div>
            )}

            {/* Subtle registered plate or minimal tag text in bottom right */}
            {config.plateNumber && (
              <div className="text-right">
                <span
                  dir="rtl"
                  className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-zinc-400/80"
                >
                  {config.plateNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeLayout === "ALL_IN_ONE") {
      // Front All-in-One: Logo + QR Code + NFC in a harmonious balanced executive composition
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-4 sm:p-5 select-none">
          {/* Header Row: Logo & Tag UID */}
          <div className="flex items-center justify-between">
            <span
              dir="ltr"
              className={`font-black tracking-tight text-xl sm:text-2xl font-sans lowercase ${logoColorStyle}`}
              style={{ letterSpacing: "-0.03em" }}
            >
              {logoText}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
              <Shield className="w-3 h-3 text-zinc-400" />
              <span>{config.tagUid}</span>
            </div>
          </div>

          {/* Middle Body: High Resolution QR Code & Details */}
          <div className="flex items-center justify-between gap-4 my-auto py-1">
            {/* High-res Vector QR Code in Obsidian Chamfer Frame */}
            <div className="p-1.5 rounded-xl bg-black/60 border border-white/15 shadow-inner flex-shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Security QR Code"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain block rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800 animate-pulse rounded-lg" />
              )}
            </div>

            {/* Vehicle Plate Stamped Section */}
            <div className="flex flex-col items-end gap-1 text-right flex-1" dir="rtl">
              <span className="text-[9px] font-mono tracking-wider uppercase text-zinc-500 font-semibold">
                لوحة المركبة المسجلة
              </span>
              <div className="px-3 py-1 rounded-md bg-black/50 border border-white/20 shadow-inner flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-zinc-400" />
                <span dir="rtl" className="font-mono font-black text-xs sm:text-sm tracking-wider text-white">
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

          {/* Bottom Row: NFC Wave Icon and Touch/Scan Notice */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-mono">
            {config.showNfcIcon ? (
              <div className="flex items-center gap-1.5 text-white/90">
                <NfcWaveSymbol className="w-5 h-5 text-current" />
                <span className="text-[9px] text-zinc-400 font-mono tracking-widest hidden sm:inline">
                  NFC TOUCH
                </span>
              </div>
            ) : (
              <span />
            )}
            <span className="text-zinc-500 tracking-widest text-[8px] uppercase">
              TOUCH PHONE OR SCAN QR
            </span>
          </div>
        </div>
      );
    }

    // Default Classic Executive
    return (
      <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-4 sm:p-5 select-none">
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-2 font-black tracking-wider text-sm sm:text-base ${logoColorStyle}`}>
            <span className="font-mono tracking-tight font-extrabold uppercase">
              {logoText.replace(".", "")}
            </span>
          </div>
          {config.showNfcIcon && <NfcWaveSymbol className="w-5 h-5 text-zinc-400" />}
        </div>
        <div className="flex items-center justify-between gap-3 my-auto py-1">
          <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 flex-shrink-0">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 object-contain rounded" />}
          </div>
          <div className="flex flex-col items-end gap-1 text-right" dir="rtl">
            <div className="px-2.5 py-1 rounded bg-black/50 border border-white/20">
              <span dir="rtl" className="font-mono font-black text-xs text-white">
                {config.plateNumber}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-mono text-zinc-400">
          <span>{config.tagUid}</span>
          <span className="text-zinc-500 uppercase">TOUCH OR SCAN</span>
        </div>
      </div>
    );
  };

  /**
   * BACK FACE CONTENT BUILDER (Authentic Smart Card Back)
   */
  const renderBackFace = () => {
    return (
      <div className="w-full h-full p-5 sm:p-6 flex flex-col justify-between text-right z-10 select-none">
        {/* Top Back Details: Security Architecture Badge */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 font-mono tracking-wider">
            <NfcWaveSymbol className="w-4 h-4 text-white" />
            <span className="uppercase font-semibold">TAPTAG SECURITY</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
            <span>VERIFIED CHIP</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>

        {/* Center: High-Res QR Code + Connection Direct Link */}
        <div className="my-auto flex items-center justify-between gap-4 py-2">
          {/* Centered High-Resolution QR Code */}
          <div className="p-2 rounded-xl bg-black/60 border border-white/20 shadow-2xl flex-shrink-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-800 animate-pulse rounded-lg" />
            )}
          </div>

          {/* Quick instructions and URL */}
          <div className="flex flex-col items-end gap-1.5 text-right flex-1" dir="rtl">
            <span className="text-xs font-bold text-white font-sans">
              مرّر هاتفك أو امسح الرمز
            </span>
            <p className="text-[10px] sm:text-[11px] leading-relaxed text-zinc-400">
              للاتصال السريع والمباشر بمالك المركبة في حالات الطوارئ أو الحاجة لتحريك السيارة.
            </p>
            <div className="mt-1 px-2 py-0.5 rounded bg-black/50 border border-white/10 text-[9px] font-mono text-zinc-300 flex items-center gap-1">
              <span className="tracking-wider" dir="ltr">taptag.one/r/{config.tagUid}</span>
            </div>
          </div>
        </div>

        {/* Bottom Back Details: Hardware Protocols & Compliance */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[8px] font-mono text-zinc-500">
          <span>NFC ISO/IEC 14443-A • NTAG216</span>
          <span className="uppercase tracking-widest">TAPTAG.ONE SMART PROTOCOL</span>
        </div>
      </div>
    );
  };

  /**
   * DUAL VIEW (SHOW BOTH FRONT & BACK SIDE-BY-SIDE AS ON AMAZON PRODUCT PAGES)
   */
  if (showDualView) {
    return (
      <div className={`w-full flex flex-col sm:flex-row items-center justify-center gap-6 py-4 select-none ${className}`}>
        {/* Front Face Card */}
        <div className="w-full sm:w-1/2 max-w-[340px] flex flex-col items-center gap-2">
          <div
            style={{
              aspectRatio: dimensionStyles.aspectRatio,
              width: "100%",
            }}
            className={`relative rounded-2xl overflow-hidden studio-card-shadow chamfer-bevel w-full ${materialStyles.bgClass} ${materialStyles.cardEdge}`}
          >
            <div className="absolute inset-[1px] rounded-[15px] border border-white/10 pointer-events-none z-10" />
            {renderFrontFace()}
          </div>
          <span className="text-[11px] font-mono text-zinc-400 tracking-wider">
            الوجه الأمامي (الشعار ورمز NFC اللاتلامسي)
          </span>
        </div>

        {/* Back Face Card */}
        <div className="w-full sm:w-1/2 max-w-[340px] flex flex-col items-center gap-2">
          <div
            style={{
              aspectRatio: dimensionStyles.aspectRatio,
              width: "100%",
            }}
            className={`relative rounded-2xl overflow-hidden studio-card-shadow chamfer-bevel w-full ${materialStyles.bgClass} ${materialStyles.cardEdge}`}
          >
            <div className="absolute inset-[1px] rounded-[15px] border border-white/10 pointer-events-none z-10" />
            {renderBackFace()}
          </div>
          <span className="text-[11px] font-mono text-zinc-400 tracking-wider">
            الوجه الخلفي (رمز QR Code وبيانات الاتصال)
          </span>
        </div>
      </div>
    );
  }

  /**
   * SINGLE 3D INTERACTIVE FLIPPABLE CARD
   */
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
          className="relative cursor-pointer w-full studio-card-shadow"
        >
          {/* FRONT FACE */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            className={`w-full h-full rounded-2xl overflow-hidden chamfer-bevel ${materialStyles.bgClass} ${materialStyles.cardEdge} ${
              isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-300`}
          >
            {/* Specular Ambient Studio Sheen */}
            <div
              style={{
                background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,${materialStyles.sheenOpacity}) 0%, transparent 60%)`,
              }}
              className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay transition-opacity duration-300"
            />
            <div className="absolute inset-[1px] rounded-[15px] border border-white/10 pointer-events-none z-10" />
            {renderFrontFace()}
          </div>

          {/* BACK FACE (Rotated 180deg) */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            className={`absolute inset-0 rounded-2xl overflow-hidden chamfer-bevel ${materialStyles.bgClass} ${materialStyles.cardEdge} ${
              !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-300 z-10`}
          >
            {/* Specular Ambient Studio Sheen */}
            <div
              style={{
                background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,${materialStyles.sheenOpacity}) 0%, transparent 60%)`,
              }}
              className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay transition-opacity duration-300"
            />
            <div className="absolute inset-[1px] rounded-[15px] border border-white/10 pointer-events-none z-10" />
            {renderBackFace()}
          </div>
        </div>
      </div>

      {/* Flip Prompt Helper */}
      {allowFlip && (
        <button
          type="button"
          onClick={handleToggleFlip}
          className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1.5 px-4 rounded-full bg-zinc-900/80 border border-zinc-800 shadow-sm"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isFlipped ? "مشاهدة وجه البطاقة (Front Face)" : "مشاهدة ظهر البطاقة (Back Face مع الـ QR)"}</span>
        </button>
      )}
    </div>
  );
}
