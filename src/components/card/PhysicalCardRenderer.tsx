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
  CardQrStyle,
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

/**
 * Procedural Styled QR Code Generator for Custom Acrylic Hardware
 * Supports: CLASSIC_SQUARE, ROUNDED_DOTS, CHAMFER_OCTA, BRAND_CENTER
 */
async function generateStyledQrDataUrl(
  text: string,
  style: CardQrStyle = "ROUNDED_DOTS",
  isLight: boolean = false
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }

  // Fast-path classic square
  if (style === "CLASSIC_SQUARE") {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 360,
      color: {
        dark: isLight ? "#000000" : "#FFFFFF",
        light: isLight ? "#FFFFFF" : "#00000000",
      },
    });
  }

  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
    const size = qr.modules.size;
    const margin = 2;
    const totalModules = size + margin * 2;
    const canvasSize = 360;
    const cellSize = canvasSize / totalModules;

    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return QRCode.toDataURL(text, { errorCorrectionLevel: "H" });
    }

    // Clean canvas background
    if (isLight) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    } else {
      ctx.clearRect(0, 0, canvasSize, canvasSize);
    }

    const primaryColor = isLight ? "#000000" : "#FFFFFF";
    const secondaryColor = isLight ? "#FFFFFF" : "#0E0F12";

    // Helper: Is cell in any 7x7 corner finder pattern
    const isFinder = (r: number, c: number) => {
      if (r < 7 && c < 7) return true; // Top-Left
      if (r < 7 && c >= size - 7) return true; // Top-Right
      if (r >= size - 7 && c < 7) return true; // Bottom-Left
      return false;
    };

    // Center badge area for BRAND_CENTER (covers 7x7 modules at center, safe for Level H 30% error correction)
    const centerRadius = 3;
    const mid = Math.floor(size / 2);
    const isCenter = (r: number, c: number) => {
      return (
        style === "BRAND_CENTER" &&
        Math.abs(r - mid) <= centerRadius &&
        Math.abs(c - mid) <= centerRadius
      );
    };

    // Safe rounded rect helper
    const drawRoundedBox = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      const anyCtx = ctx as any;
      if (typeof anyCtx.roundRect === "function") {
        anyCtx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
    };

    // 1. Draw Corner Finder Eyes
    const drawFinderPattern = (startRow: number, startCol: number) => {
      const fx = (startCol + margin) * cellSize;
      const fy = (startRow + margin) * cellSize;
      const fw = 7 * cellSize;

      if (style === "ROUNDED_DOTS" || style === "BRAND_CENTER") {
        // Outer rounded frame
        ctx.fillStyle = primaryColor;
        drawRoundedBox(fx, fy, fw, fw, cellSize * 1.5);
        ctx.fill();

        // Inner cut
        ctx.fillStyle = secondaryColor;
        drawRoundedBox(
          fx + cellSize,
          fy + cellSize,
          fw - 2 * cellSize,
          fw - 2 * cellSize,
          cellSize
        );
        ctx.fill();

        // Inner solid core
        ctx.fillStyle = primaryColor;
        drawRoundedBox(
          fx + 2 * cellSize,
          fy + 2 * cellSize,
          fw - 4 * cellSize,
          fw - 4 * cellSize,
          cellSize * 0.75
        );
        ctx.fill();
      } else {
        // CHAMFER_OCTA or Geometric
        ctx.fillStyle = primaryColor;
        ctx.fillRect(fx, fy, fw, fw);

        ctx.fillStyle = secondaryColor;
        ctx.fillRect(
          fx + cellSize,
          fy + cellSize,
          fw - 2 * cellSize,
          fw - 2 * cellSize
        );

        ctx.fillStyle = primaryColor;
        ctx.fillRect(
          fx + 2 * cellSize,
          fy + 2 * cellSize,
          fw - 4 * cellSize,
          fw - 4 * cellSize
        );
      }
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(0, size - 7);
    drawFinderPattern(size - 7, 0);

    // 2. Draw Data Modules
    ctx.fillStyle = primaryColor;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isFinder(r, c) || isCenter(r, c)) continue;
        if (qr.modules.get(r, c)) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;

          if (style === "ROUNDED_DOTS" || style === "BRAND_CENTER") {
            ctx.beginPath();
            ctx.arc(
              x + cellSize / 2,
              y + cellSize / 2,
              cellSize * 0.44,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else if (style === "CHAMFER_OCTA") {
            const pad = cellSize * 0.08;
            const cut = cellSize * 0.28;
            ctx.beginPath();
            ctx.moveTo(x + cut, y + pad);
            ctx.lineTo(x + cellSize - cut, y + pad);
            ctx.lineTo(x + cellSize - pad, y + cut);
            ctx.lineTo(x + cellSize - pad, y + cellSize - cut);
            ctx.lineTo(x + cellSize - cut, y + cellSize - pad);
            ctx.lineTo(x + cut, y + cellSize - pad);
            ctx.lineTo(x + pad, y + cellSize - cut);
            ctx.lineTo(x + pad, y + cut);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // 3. Center Badge for BRAND_CENTER
    if (style === "BRAND_CENTER") {
      const badgeSpan = centerRadius * 2 + 1;
      const bw = badgeSpan * cellSize;
      const bx = (mid - centerRadius + margin) * cellSize;
      const by = (mid - centerRadius + margin) * cellSize;

      ctx.fillStyle = primaryColor;
      drawRoundedBox(bx, by, bw, bw, cellSize * 1.2);
      ctx.fill();

      ctx.fillStyle = secondaryColor;
      drawRoundedBox(bx + 2, by + 2, bw - 4, bw - 4, cellSize);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.font = `900 ${Math.floor(bw * 0.36)}px "Geist Mono", monospace, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TAP", bx + bw / 2, by + bw / 2 + 1);
    }

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Custom QR generation error, using fallback:", err);
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 360,
      color: {
        dark: isLight ? "#000000" : "#FFFFFF",
        light: isLight ? "#FFFFFF" : "#00000000",
      },
    });
  }
}

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

  // Generate QR Code data URL dynamically matched to card contrast and selected qrStyle
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    generateStyledQrDataUrl(targetUrl, config.qrStyle || "ROUNDED_DOTS", isLightColor)
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => console.error("QR Code Error:", err));
    return () => {
      active = false;
    };
  }, [targetUrl, config.qrStyle, isLightColor]);

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

  // Logo color styling (Zero drop-shadow, pure flat solid)
  const logoColorStyle = useMemo(() => {
    switch (config.logoColor) {
      case "GOLD":
        return "text-[#E5C158]";
      case "STEALTH":
        return isLightColor ? "text-zinc-500" : "text-zinc-500";
      case "SILVER":
        return isLightColor ? "text-zinc-700" : "text-zinc-300";
      case "WHITE":
      default:
        return isLightColor ? "text-black" : "text-white";
    }
  }, [config.logoColor, isLightColor]);

  // Dynamic Typography Font Family for Card Brand & Text
  const cardFontFamilyStyle = useMemo(() => {
    switch (config.fontFamily) {
      case "GEIST_MONO":
        return "font-mono tracking-tight";
      case "SERIF_LUXURY":
        return "font-serif tracking-normal italic";
      case "SPACE_GROTESK":
        return "font-sans uppercase tracking-widest font-black";
      case "ARABIC_KUFIC":
        return "font-sans tracking-wide";
      case "NEO_GROTESK":
      case "INTER":
      default:
        return "font-sans tracking-tight";
    }
  }, [config.fontFamily]);

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
      const showFrontQr =
        config.qrPlacement !== "BACK_ONLY" ||
        activeLayout === "ALL_IN_ONE" ||
        activeLayout === "QR_HERO";

      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-5 select-none">
          {/* Stand Top Header: Brand Logo & Chip Seal */}
          <div className="flex items-center justify-between border-b pb-3 border-current/10">
            <span className={`font-black tracking-tight text-xl ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono tabular-nums ${textColorSecondary}`}>
              <Shield className="w-3.5 h-3.5" />
              <span>{config.tagUid}</span>
            </div>
          </div>

          {/* Stand Centerpiece */}
          {showFrontQr ? (
            <div className="my-auto flex flex-col items-center justify-center text-center space-y-3">
              <div className={`p-2.5 rounded-2xl ${isLightColor ? "bg-white border border-black/10" : "bg-black/60 border border-white/20"} flex-shrink-0`}>
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
                  {config.showNfcIcon ? "TOUCH PHONE OR SCAN QR" : "SCAN QR CODE"}
                </span>
                <span className={`text-[9px] font-mono block ${textColorSecondary}`}>
                  {config.showNfcIcon
                    ? "امسح الكود أو قرّب هاتفك للتواصل المشفر"
                    : "امسح الكود بكاميرا الهاتف للتواصل المشفر"}
                </span>
              </div>
            </div>
          ) : (
            /* Stand Minimalist (Logo Hero when QR is on Back Only) */
            <div className="my-auto flex flex-col items-center justify-center text-center space-y-4">
              <span className={`font-black tracking-tight text-4xl sm:text-5xl ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
                {logoText}
              </span>
              {config.showNfcIcon && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${borderEdgeColor}`}>
                  <NfcWaveSymbol className={`w-4 h-4 ${isLightColor ? "text-black" : "text-white"}`} />
                  <span className={`text-[10px] font-mono tracking-widest font-bold ${textColorSecondary}`}>
                    NFC TOUCH ACTIVE
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stand Bottom: NFC Touch Point & Vehicle Details */}
          <div className="pt-3 border-t border-current/10 flex items-center justify-between">
            {config.showNfcIcon ? (
              <div className="flex items-center gap-2">
                <NfcWaveSymbol className={`w-5 h-5 ${isLightColor ? "text-black" : "text-white"}`} />
                <span className={`text-[9px] font-mono tracking-widest font-bold ${textColorSecondary}`}>
                  NFC ZONE
                </span>
              </div>
            ) : (
              <span className={`text-[9px] font-mono ${textColorSecondary}`}>ACRYLIC STAND</span>
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
      const showFrontQr =
        config.qrPlacement === "FRONT_CENTER" ||
        config.qrPlacement === "BOTH" ||
        activeLayout === "QR_HERO" ||
        activeLayout === "ALL_IN_ONE";

      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between items-center relative z-10 p-5 select-none text-center">
          {/* Top Brand Logo */}
          <div className="w-full flex items-center justify-between">
            <span className={`font-black tracking-tight text-lg ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <span className={`text-[9px] font-mono tabular-nums ${textColorSecondary}`}>{config.tagUid}</span>
          </div>

          {/* Center: either QR Code or Concentric NFC Radar */}
          {showFrontQr ? (
            <div className="my-auto flex flex-col items-center justify-center">
              <div className={`p-2 rounded-2xl ${isLightColor ? "bg-white border border-black/15" : "bg-black/60 border border-white/20"}`}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Security QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-zinc-800 rounded-xl" />
                )}
              </div>
              <span className={`mt-2 text-[9px] font-mono tracking-widest uppercase font-bold ${textColorSecondary}`}>
                {config.showNfcIcon ? "SCAN OR TOUCH PHONE" : "SCAN QR CODE"}
              </span>
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center relative">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-dashed ${isLightColor ? "border-black/30 bg-black/[0.03]" : "border-white/30 bg-white/[0.04]"} flex items-center justify-center`}>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border ${isLightColor ? "border-black/50" : "border-white/50"} flex items-center justify-center`}>
                  {config.showNfcIcon ? (
                    <NfcWaveSymbol className={`w-8 h-8 sm:w-10 sm:h-10 ${isLightColor ? "text-black" : "text-white"}`} />
                  ) : (
                    <Car className={`w-8 h-8 sm:w-10 sm:h-10 ${textColorSecondary}`} />
                  )}
                </div>
              </div>
              <span className={`mt-2 text-[9px] font-mono tracking-widest uppercase font-bold ${textColorSecondary}`}>
                {config.showNfcIcon ? "TAP PHONE HERE" : "SMART VEHICLE TAG"}
              </span>
            </div>
          )}

          {/* Bottom Details */}
          <div className="w-full flex items-center justify-between border-t border-current/10 pt-2">
            <span className={`text-[9px] font-mono ${textColorSecondary}`}>ACRYLIC COASTER</span>
            {config.plateNumber && (
              <span dir="rtl" className={`text-xs font-mono font-bold tabular-nums ${textColorPrimary}`}>
                {config.plateNumber}
              </span>
            )}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------
    // STANDARD CARD LAYOUT (5.5x8.5 cm) - Minimalist / All-in-One / QR Hero
    // -------------------------------------------------------------
    if (activeLayout === "QR_HERO" || config.qrPlacement === "FRONT_CENTER") {
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-4 sm:p-5 select-none">
          <div className="flex items-center justify-between">
            <span className={`font-black tracking-tight text-lg ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono tabular-nums ${textColorSecondary}`}>
              <Shield className="w-3 h-3" />
              <span>{config.tagUid}</span>
            </div>
          </div>

          <div className="my-auto flex flex-col items-center justify-center py-1">
            <div className={`p-2 rounded-xl ${isLightColor ? "bg-white border border-black/15" : "bg-black/60 border border-white/20"} flex-shrink-0`}>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Security QR Code"
                  className="w-18 h-18 sm:w-22 sm:h-22 object-contain block rounded-lg"
                />
              ) : (
                <div className="w-18 h-18 sm:w-22 sm:h-22 bg-zinc-800 animate-pulse rounded-lg" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[9px] font-mono">
            {config.showNfcIcon ? (
              <div className="flex items-center gap-1.5">
                <NfcWaveSymbol className={`w-4 h-4 ${isLightColor ? "text-black" : "text-white"}`} />
                <span className={`text-[9px] font-mono tracking-widest ${textColorSecondary}`}>
                  NFC
                </span>
              </div>
            ) : (
              <span className={`text-[8px] font-mono ${textColorSecondary}`}>ACRYLIC CARD</span>
            )}
            {config.plateNumber && (
              <span dir="rtl" className={`font-mono font-bold text-xs tabular-nums ${textColorPrimary}`}>
                {config.plateNumber}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (activeLayout === "ALL_IN_ONE") {
      return (
        <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-4 sm:p-5 select-none">
          <div className="flex items-center justify-between">
            <span className={`font-black tracking-tight text-xl ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono tabular-nums ${textColorSecondary}`}>
              <Shield className="w-3 h-3" />
              <span>{config.tagUid}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 my-auto py-1">
            <div className={`p-1.5 rounded-xl ${isLightColor ? "bg-white border border-black/15" : "bg-black/60 border border-white/15"} flex-shrink-0`}>
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
              <div className={`px-3 py-1 rounded-md ${isLightColor ? "bg-black/10 border border-black/20" : "bg-black/50 border border-white/20"} flex items-center gap-2`}>
                <Car className={`w-3.5 h-3.5 ${textColorSecondary}`} />
                <span dir="rtl" className={`font-mono font-black text-xs sm:text-sm tracking-wider tabular-nums ${textColorPrimary}`}>
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
              {config.showNfcIcon ? "TOUCH PHONE OR SCAN QR" : "SCAN QR CODE"}
            </span>
          </div>
        </div>
      );
    }

    // Default TAP_MINIMAL (Authentic Pure Minimalist Card)
    return (
      <div dir="ltr" className="w-full h-full flex flex-col justify-between relative z-10 p-5 sm:p-6 select-none">
        <div className="flex items-center justify-between w-full h-6">
          {config.logoPosition === "TOP_LEFT" && (
            <span className={`font-black tracking-tight text-xl ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ${logoColorStyle}`}>
              {logoText}
            </span>
          )}
          {config.logoPosition === "TOP_RIGHT" && (
            <span className={`font-black tracking-tight text-xl ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} ml-auto ${logoColorStyle}`}>
              {logoText}
            </span>
          )}
          {(config.qrPlacement === "FRONT_CORNER" || config.qrPlacement === "BOTH") && (
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
              className={`font-black tracking-tight text-3xl sm:text-4xl md:text-5xl ${cardFontFamilyStyle} ${isCustomBrand ? "tracking-normal" : "lowercase"} select-none ${logoColorStyle}`}
              style={{ letterSpacing: isCustomBrand ? "normal" : "-0.04em" }}
            >
              {logoText}
            </span>
          </div>
        )}

        {/* Bottom Row: Official NFC Wave Symbol at Bottom-LEFT & License Plate */}
        <div className="flex items-end justify-between w-full">
          {config.showNfcIcon ? (
            <div className="flex items-center gap-2">
              <NfcWaveSymbol
                className={`w-6 h-6 sm:w-7 sm:h-7 ${isLightColor ? "text-zinc-900" : "text-white"}`}
              />
            </div>
          ) : (
            <div className={`text-[9px] font-mono tracking-wider ${textColorSecondary}`}>
              TAPTAG
            </div>
          )}

          {config.plateNumber && (
            <div className="text-right">
              <span
                dir="rtl"
                className={`text-[11px] sm:text-xs font-mono font-bold tracking-wider tabular-nums ${textColorSecondary}`}
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
          <div className={`flex items-center gap-1.5 text-[10px] font-mono tracking-wider tabular-nums ${textColorPrimary}`}>
            {config.showNfcIcon ? (
              <NfcWaveSymbol className={`w-4 h-4 ${isLightColor ? "text-black" : "text-white"}`} />
            ) : (
              <Shield className={`w-4 h-4 ${isLightColor ? "text-black" : "text-white"}`} />
            )}
            <span className="uppercase font-semibold">TAPTAG SECURITY</span>
          </div>
          <div className={`flex items-center gap-1 text-[9px] font-mono tabular-nums ${textColorSecondary}`}>
            <span>{config.showNfcIcon ? "ACRYLIC NFC" : "ACRYLIC TAG"}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isLightColor ? "bg-black" : "bg-white"}`} />
          </div>
        </div>

        {/* Center: High-Res QR Code + Connection Direct Link */}
        <div className="my-auto flex items-center justify-between gap-4 py-2">
          <div className={`p-2 rounded-xl ${isLightColor ? "bg-white border border-black/15" : "bg-black/60 border border-white/20"} flex-shrink-0`}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-800 rounded-lg" />
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 text-right flex-1" dir="rtl">
            <span className={`text-xs font-bold font-sans ${textColorPrimary}`}>
              {config.showNfcIcon ? "مرّر هاتفك أو امسح الرمز" : "امسح الرمز بكاميرا الهاتف"}
            </span>
            <p className={`text-[10px] sm:text-[11px] leading-relaxed ${textColorSecondary}`}>
              للاتصال السريع بمالك المركبة في حالات الطوارئ أو الحاجة لتحريك السيارة.
            </p>
            <div className={`mt-1 px-2 py-0.5 rounded ${isLightColor ? "bg-black/10 border border-black/20 text-black" : "bg-black/50 border border-white/10 text-zinc-300"} text-[9px] font-mono tabular-nums flex items-center gap-1`}>
              <span className="tracking-wider" dir="ltr">taptag.one/r/{config.tagUid}</span>
            </div>
          </div>
        </div>

        {/* Bottom Back Details: Hardware Protocols & Compliance */}
        <div className={`flex items-center justify-between pt-2 border-t border-current/10 text-[8px] font-mono tabular-nums ${textColorSecondary}`}>
          <span>{config.showNfcIcon ? "NFC ISO/IEC 14443-A • NTAG216" : "SECURE QR PROTOCOL"}</span>
          <span className="uppercase tracking-widest">TAPTAG.ONE SMART PROTOCOL</span>
        </div>
      </div>
    );
  };

  /**
   * SINGLE 3D INTERACTIVE FLIPPABLE ACRYLIC CARD (Zero Shadow, Zero Glow)
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
          className="relative cursor-pointer w-full"
        >
          {/* FRONT FACE */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              backgroundColor: cardBgColor,
            }}
            className={`w-full h-full rounded-2xl overflow-hidden border ${borderEdgeColor} ${
              isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-300`}
          >
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
            className={`absolute inset-0 rounded-2xl overflow-hidden border ${borderEdgeColor} ${
              !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
            } transition-opacity duration-300 z-10`}
          >
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
          className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-colors py-1.5 px-4 rounded-full bg-zinc-900 border border-zinc-800 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isFlipped ? "مشاهدة وجه البطاقة" : "مشاهدة ظهر البطاقة"}</span>
        </button>
      )}
    </div>
  );
}
