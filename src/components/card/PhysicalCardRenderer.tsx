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
  CheckCircle,
} from "lucide-react";

interface PhysicalCardRendererProps {
  config?: Partial<CardDesignConfig>;
  interactive?: boolean; // Enable 3D tilt sheen on mouse/touch
  allowFlip?: boolean;
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  scale?: number; // scale multiplier for previews
  className?: string;
  showFlipButton?: boolean;
}

export function PhysicalCardRenderer({
  config: incomingConfig,
  interactive = true,
  allowFlip = true,
  flipped: controlledFlipped,
  onFlipChange,
  scale = 1,
  className = "",
  showFlipButton = false,
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

  // Target URL for QR Code
  const targetUrl = `https://taptag.one/r/${config.tagUid}`;

  // Unified Acrylic Custom Color & Luminance Check
  const cardBgColor = config.cardColor || "#0E0F12";

  const isLightColor = useMemo(() => {
    const raw = cardBgColor.replace("#", "").trim();
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 >= 155;
    }
    if (raw.length === 6) {
      const r = parseInt(raw.substring(0, 2), 16);
      const g = parseInt(raw.substring(2, 4), 16);
      const b = parseInt(raw.substring(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 >= 155;
    }
    return config.material === "PEARL_WHITE";
  }, [cardBgColor, config.material]);

  // Generate QR Code data URL dynamically matched to card contrast
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 360,
      color: {
        dark: isLightColor ? "#000000" : "#FFFFFF",
        light: isLightColor ? "#FFFFFF" : "#00000000",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code Error:", err));
  }, [targetUrl, isLightColor]);

  // Official Printzone 2026 Production Dimensions
  const dimensionStyles = useMemo(() => {
    switch (config.dimensionStandard) {
      case "STAND_150X200":
        return {
          aspectRatio: "15 / 20",
          maxWidth: "340px",
          width: "100%",
          label: "15 × 20 سم (ستاند مكتبي كبير - Stand Large)",
          isStand: true,
          isCoaster: false,
        };
      case "STAND_100X150":
        return {
          aspectRatio: "10 / 15",
          maxWidth: "310px",
          width: "100%",
          label: "10 × 15 سم (ستاند مكتبي/طاولة - Stand)",
          isStand: true,
          isCoaster: false,
        };
      case "COASTER_120X120":
        return {
          aspectRatio: "1 / 1",
          maxWidth: "360px",
          width: "100%",
          label: "12 × 12 سم (كوستر مربع كبير - Coaster 12cm)",
          isStand: false,
          isCoaster: true,
        };
      case "COASTER_90X90":
        return {
          aspectRatio: "1 / 1",
          maxWidth: "340px",
          width: "100%",
          label: "9 × 9 سم (كوستر مربع صغير - Coaster 9cm)",
          isStand: false,
          isCoaster: true,
        };
      case "MINI_KEY_54X28":
        return {
          aspectRatio: "54 / 28",
          maxWidth: "380px",
          width: "100%",
          label: "5.4 × 2.8 سم (تاج المفاتيح والمرايا)",
          isStand: false,
          isCoaster: false,
        };
      case "CARD_55X85":
      case "CR80_STANDARD":
      case "ACRYLIC_TAG_70X50":
      default:
        return {
          aspectRatio: "85 / 55",
          maxWidth: "420px",
          width: "100%",
          label: "5.5 × 8.5 سم (بطاقة سيارة - Acrylic Card)",
          isStand: false,
          isCoaster: false,
        };
    }
  }, [config.dimensionStandard]);

  // Dynamic Typography & Contrast styling
  const textColorPrimary = isLightColor ? "text-black" : "text-white";
  const textColorSecondary = isLightColor ? "text-zinc-600" : "text-zinc-400";
  const borderEdgeColor = isLightColor ? "border-black/25" : "border-white/15";
  const innerCardOutline = isLightColor ? "border-black/10" : "border-white/10";

  // Logo color styling
  const logoColorStyle = useMemo(() => {
    switch (config.logoColor) {
      case "GOLD":
        return "text-[#E5C158] drop-shadow-[0_1px_3px_rgba(229,193,88,0.4)]";
      case "STEALTH":
        return isLightColor ? "text-zinc-400" : "text-zinc-600";
      case "SILVER":
        return isLightColor ? "text-zinc-700" : "text-zinc-300";
      case "WHITE":
      default:
        return isLightColor ? "text-black" : "text-white";
    }
  }, [config.logoColor, isLightColor]);

  const activeLayout: CardLayoutPreset = config.layoutPreset || "TAP_MINIMAL";
  const isCustomBrand = config.brandType === "CUSTOM_BRAND";
  const logoText = config.logoText || (isCustomBrand ? "YOUR BRAND" : "taptag.one");

  /**
   * 1. FRONT FACE CONTENT BUILDER (Adapts cleanly to Stand, Coaster, or Card)
   */
  const renderFrontFace = () => {
    // -------------------------------------------------------------
    // VERTICAL STAND LAYOUT (10x15 cm or 15x20 cm)
    // -------------------------------------------------------------
    if (dimensionStyles.isStand) {
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-5 select-none">
          {/* Stand Top Header: Brand Logo & Chip Seal */}
          <div className="flex items-center justify-between border-b pb-3 border-current/10">
            <span className={`font-black tracking-tight text-xl font-sans ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${textColorSecondary}`}>
              <Shield className="w-3.5 h-3.5" />
              <span>{config.tagUid}</span>
            </div>
          </div>

          {/* Stand Centerpiece: High-Density Scannable QR Code */}
          <div className="my-auto flex flex-col items-center justify-center text-center space-y-3">
            <div className={`p-2.5 rounded-2xl ${isLightColor ? "bg-white shadow-md border border-black/10" : "bg-black/60 shadow-2xl border border-white/20"} flex-shrink-0`}>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Security QR Code"
                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain block rounded-xl"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 bg-zinc-800 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="space-y-1">
              <span className={`text-[11px] font-mono font-bold tracking-wider uppercase block ${textColorPrimary}`}>
                TOUCH PHONE OR SCAN QR
              </span>
              <span className={`text-[9px] font-mono block ${textColorSecondary}`}>
                امسح الكود أو قرّب هاتفك للتواصل المشفر
              </span>
            </div>
          </div>

          {/* Stand Bottom: NFC Touch Point & Vehicle Details */}
          <div className="pt-3 border-t border-current/10 flex items-center justify-between">
            {config.showNfcIcon && (
              <div className="flex items-center gap-2">
                <NfcWaveSymbol className={`w-5 h-5 ${isLightColor ? "text-black" : "text-white"}`} />
                <span className={`text-[9px] font-mono tracking-widest font-bold ${textColorSecondary}`}>
                  NFC ZONE
                </span>
              </div>
            )}

            {config.plateNumber && (
              <div className="text-right" dir="rtl">
                <span className={`text-xs font-mono font-black tracking-wider ${textColorPrimary}`}>
                  {config.plateNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // SQUARE COASTER LAYOUT (9x9 cm or 12x12 cm)
    // -------------------------------------------------------------
    if (dimensionStyles.isCoaster) {
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between items-center relative z-10 p-5 select-none text-center">
          {/* Top Brand Logo */}
          <div className="w-full flex items-center justify-between">
            <span className={`font-black tracking-tight text-lg font-sans ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <span className={`text-[9px] font-mono ${textColorSecondary}`}>{config.tagUid}</span>
          </div>

          {/* Concentric NFC Radar Target in Center */}
          <div className="my-auto flex flex-col items-center justify-center relative">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-dashed ${isLightColor ? "border-black/30 bg-black/[0.03]" : "border-white/30 bg-white/[0.04]"} flex items-center justify-center animate-pulse`}>
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border ${isLightColor ? "border-black/50" : "border-white/50"} flex items-center justify-center`}>
                <NfcWaveSymbol className={`w-8 h-8 sm:w-10 sm:h-10 ${isLightColor ? "text-black" : "text-white"}`} />
              </div>
            </div>
            <span className={`mt-2 text-[9px] font-mono tracking-widest uppercase font-bold ${textColorSecondary}`}>
              TAP PHONE HERE
            </span>
          </div>

          {/* Bottom Details */}
          <div className="w-full flex items-center justify-between border-t border-current/10 pt-2">
            <span className={`text-[9px] font-mono ${textColorSecondary}`}>ACRYLIC COASTER</span>
            {config.plateNumber && (
              <span dir="rtl" className={`text-xs font-mono font-bold ${textColorPrimary}`}>
                {config.plateNumber}
              </span>
            )}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // STANDARD CARD LAYOUT (5.5x8.5 cm) - Minimalist / All-in-One
    // -------------------------------------------------------------
    if (activeLayout === "ALL_IN_ONE") {
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-4 sm:p-5 select-none">
          <div className="flex items-center justify-between">
            <span className={`font-black tracking-tight text-xl font-sans ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${textColorSecondary}`}>
              <Shield className="w-3 h-3" />
              <span>{config.tagUid}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 my-auto py-1">
            <div className={`p-1.5 rounded-xl ${isLightColor ? "bg-white border border-black/15 shadow-sm" : "bg-black/60 border border-white/15 shadow-inner"} flex-shrink-0`}>
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

            <div className="flex flex-col items-end gap-1 text-right flex-1" dir="rtl">
              <span className={`text-[9px] font-mono tracking-wider uppercase font-semibold ${textColorSecondary}`}>
                لوحة المركبة المسجلة
              </span>
              <div className={`px-3 py-1 rounded-md ${isLightColor ? "bg-black/10 border border-black/20" : "bg-black/50 border border-white/20"} shadow-inner flex items-center gap-2`}>
                <Car className={`w-3.5 h-3.5 ${textColorSecondary}`} />
                <span dir="rtl" className={`font-mono font-black text-xs sm:text-sm tracking-wider ${textColorPrimary}`}>
                  {config.plateNumber || "أ ب ج 1234"}
                </span>
              </div>
              {config.customText && (
                <span className={`text-[8px] font-mono tracking-wider uppercase mt-0.5 ${textColorSecondary}`}>
                  {config.customText}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[9px] font-mono">
            {config.showNfcIcon ? (
              <div className="flex items-center gap-1.5">
                <NfcWaveSymbol className={`w-5 h-5 ${isLightColor ? "text-black" : "text-white"}`} />
                <span className={`text-[9px] font-mono tracking-widest hidden sm:inline ${textColorSecondary}`}>
                  NFC TOUCH
                </span>
              </div>
            ) : (
              <span />
            )}
            <span className={`tracking-widest text-[8px] uppercase ${textColorSecondary}`}>
              TOUCH PHONE OR SCAN QR
            </span>
          </div>
        </div>
      );
    }

    // Default TAP_MINIMAL (Authentic Amazon Tap Minimalist Card)
    return (
      <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-5 sm:p-6 select-none">
        <div className="flex items-center justify-between w-full h-6">
          {config.logoPosition === "TOP_LEFT" && (
            <span className={`font-black tracking-tight text-xl font-sans ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
          )}
          {config.logoPosition === "TOP_RIGHT" && (
            <span className={`font-black tracking-tight text-xl font-sans ${isCustomBrand ? "tracking-normal" : "lowercase"} ml-auto ${logoColorStyle}`}>
              {logoText}
            </span>
          )}
          {config.qrPlacement === "FRONT_CORNER" && (
            <div className={`ml-auto w-12 h-12 p-1 rounded-lg ${isLightColor ? "bg-white border border-black/15" : "bg-black/50 border border-white/10"} flex items-center justify-center`}>
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />}
            </div>
          )}
        </div>

        {/* DEAD CENTER: The Bold Minimalist Logo */}
        {(config.logoPosition === "CENTER" || !config.logoPosition) && (
          <div className="my-auto flex flex-col items-center justify-center text-center">
            <span
              dir={isCustomBrand ? "auto" : "ltr"}
              className={`font-black tracking-tight text-3xl sm:text-4xl md:text-5xl font-sans ${isCustomBrand ? "tracking-normal" : "lowercase"} select-none ${logoColorStyle}`}
              style={{ letterSpacing: isCustomBrand ? "normal" : "-0.04em" }}
            >
              {logoText}
            </span>
          </div>
        )}

        {/* Bottom Row: Official NFC Wave Symbol at Bottom-LEFT & License Plate */}
        <div className="flex items-end justify-between w-full">
          {config.showNfcIcon && (
            <div className="flex items-center gap-2">
              <NfcWaveSymbol
                className={`w-6 h-6 sm:w-7 sm:h-7 ${isLightColor ? "text-zinc-900" : "text-white"} transition-transform hover:scale-110`}
              />
            </div>
          )}

          {config.plateNumber && (
            <div className="text-right">
              <span
                dir="rtl"
                className={`text-[10px] sm:text-xs font-mono font-bold tracking-wider ${textColorSecondary}`}
              >
                {config.plateNumber}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * 2. BACK FACE CONTENT BUILDER
   */
  const renderBackFace = () => {
    return (
      <div className="w-full h-full p-5 sm:p-6 flex flex-col justify-between text-right z-10 select-none">
        {/* Top Back Details: Security Architecture Badge */}
        <div className="flex items-center justify-between border-b border-current/10 pb-2">
          <div className={`flex items-center gap-1.5 text-[10px] font-mono tracking-wider ${textColorPrimary}`}>
            <NfcWaveSymbol className={`w-4 h-4 ${isLightColor ? "text-black" : "text-white"}`} />
            <span className="uppercase font-semibold">TAPTAG SECURITY</span>
          </div>
          <div className={`flex items-center gap-1 text-[9px] font-mono ${textColorSecondary}`}>
            <span>ACRYLIC NFC</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isLightColor ? "bg-black" : "bg-white"}`} />
          </div>
        </div>

        {/* Center: High-Res QR Code + Connection Direct Link */}
        <div className="my-auto flex items-center justify-between gap-4 py-2">
          <div className={`p-2 rounded-xl ${isLightColor ? "bg-white border border-black/15 shadow-md" : "bg-black/60 border border-white/20 shadow-2xl"} flex-shrink-0`}>
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

          <div className="flex flex-col items-end gap-1.5 text-right flex-1" dir="rtl">
            <span className={`text-xs font-bold font-sans ${textColorPrimary}`}>
              مرّر هاتفك أو امسح الرمز
            </span>
            <p className={`text-[10px] sm:text-[11px] leading-relaxed ${textColorSecondary}`}>
              للاتصال السريع والمباشر بمالك المركبة في حالات الطوارئ أو الحاجة لتحريك السيارة.
            </p>
            <div className={`mt-1 px-2 py-0.5 rounded ${isLightColor ? "bg-black/10 border border-black/20 text-black" : "bg-black/50 border border-white/10 text-zinc-300"} text-[9px] font-mono flex items-center gap-1`}>
              <span className="tracking-wider" dir="ltr">taptag.one/r/{config.tagUid}</span>
            </div>
          </div>
        </div>

        {/* Bottom Back Details: Hardware Protocols & Compliance */}
        <div className={`flex items-center justify-between pt-2 border-t border-current/10 text-[8px] font-mono ${textColorSecondary}`}>
          <span>NFC ISO/IEC 14443-A • NTAG216</span>
          <span className="uppercase tracking-widest">TAPTAG.ONE SMART PROTOCOL</span>
        </div>
      </div>
    );
  };

  /**
   * SINGLE 3D INTERACTIVE FLIPPABLE ACRYLIC CARD
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
              backgroundColor: cardBgColor,
            }}
            className={`w-full h-full rounded-2xl overflow-hidden chamfer-bevel border ${borderEdgeColor} ${
              isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-300 shadow-2xl`}
          >
            {/* Specular Ambient Acrylic Sheen */}
            <div
              style={{
                background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,${
                  isLightColor ? 0.35 : 0.18
                }) 0%, transparent 60%)`,
              }}
              className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay transition-opacity duration-300"
            />
            <div className={`absolute inset-[1px] rounded-[15px] border ${innerCardOutline} pointer-events-none z-10`} />
            {renderFrontFace()}
          </div>

          {/* BACK FACE (Rotated 180deg) */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              backgroundColor: cardBgColor,
            }}
            className={`absolute inset-0 rounded-2xl overflow-hidden chamfer-bevel border ${borderEdgeColor} ${
              !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-300 z-10 shadow-2xl`}
          >
            {/* Specular Ambient Acrylic Sheen */}
            <div
              style={{
                background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,${
                  isLightColor ? 0.35 : 0.18
                }) 0%, transparent 60%)`,
              }}
              className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay transition-opacity duration-300"
            />
            <div className={`absolute inset-[1px] rounded-[15px] border ${innerCardOutline} pointer-events-none z-10`} />
            {renderBackFace()}
          </div>
        </div>
      </div>

      {/* Optional Flip Button (Only rendered if explicitly enabled) */}
      {allowFlip && showFlipButton && (
        <button
          type="button"
          onClick={handleToggleFlip}
          className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1.5 px-4 rounded-full bg-zinc-900/80 border border-zinc-800 shadow-sm cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isFlipped ? "مشاهدة وجه البطاقة (Front Face)" : "مشاهدة ظهر البطاقة (Back Face مع الـ QR)"}</span>
        </button>
      )}
    </div>
  );
}
