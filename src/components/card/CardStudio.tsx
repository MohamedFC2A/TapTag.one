"use client";

import React, { useState, useEffect, useTransition } from "react";
import type {
  CardDesignConfig,
  CardMaterial,
  CardDimension,
  CardCodeType,
  CardLogoPosition,
  CardLogoColor,
  CardLayoutPreset,
  CardQrPlacement,
  AcrylicFinish,
  CardFontFamily,
  CardQrStyle,
} from "@/types/card-design";
import { DEFAULT_CARD_DESIGN } from "@/types/card-design";
import { saveCardDesignAction } from "@/app/actions/card-customization-actions";
import { PhysicalCardRenderer } from "./PhysicalCardRenderer";
import { NfcWaveSymbol } from "./NfcWaveSymbol";
import {
  Layers,
  Sparkles,
  Maximize2,
  QrCode,
  Barcode,
  Palette,
  Check,
  Download,
  Save,
  Printer,
  ShieldCheck,
  RefreshCw,
  Car,
  Wifi,
  PhoneCall,
  Sliders,
  Type,
  FileCode,
  ArrowRight,
  Eye,
  Columns,
  Square,
  Pipette,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface CardStudioProps {
  initialConfig?: CardDesignConfig;
  availableTags?: { tagUid: string; vehiclePlate?: string; vehicleMake?: string }[];
}

const LOCAL_STORAGE_KEY = "taptag_card_customization_v2";

// Official Printzone 2026 Production Dimensions (Doubled base prices)
const PRINTZONE_DIMENSIONS: {
  id: CardDimension;
  title: string;
  sizeCm: string;
  category: "CARD" | "COASTER" | "STAND";
  desc: string;
  ratio: string;
  basePriceEgp: number;
}[] = [
  {
    id: "CARD_55X85",
    title: "بطاقة سيارة قياسية",
    sizeCm: "5.5 × 8.5 cm",
    category: "CARD",
    desc: "للزجاج والمحفظة",
    ratio: "85 / 55",
    basePriceEgp: 100,
  },
  {
    id: "COASTER_90X90",
    title: "كوستر مربع صغير",
    sizeCm: "9.0 × 9.0 cm",
    category: "COASTER",
    desc: "للمكاتب والطاولات",
    ratio: "1:1",
    basePriceEgp: 200,
  },
  {
    id: "COASTER_120X120",
    title: "كوستر مربع كبير",
    sizeCm: "12.0 × 12.0 cm",
    category: "COASTER",
    desc: "صالات واستقبال",
    ratio: "1:1",
    basePriceEgp: 240,
  },
  {
    id: "STAND_100X150",
    title: "ستاند مكتبي عمودي",
    sizeCm: "10.0 × 15.0 cm",
    category: "STAND",
    desc: "كاونتر ونقاط دفع",
    ratio: "2:3",
    basePriceEgp: 500,
  },
  {
    id: "STAND_150X200",
    title: "ستاند مكتبي كبير",
    sizeCm: "15.0 × 20.0 cm",
    category: "STAND",
    desc: "معارض ومداخل رئيسية",
    ratio: "3:4",
    basePriceEgp: 600,
  },
];

// Curated Luxury Acrylic Palettes
const LUXURY_COLORS = [
  { id: "#0A0B0E", label: "أسود أوبسيديان", border: "border-zinc-800" },
  { id: "#F8FAFC", label: "أبيض ناصع", border: "border-zinc-300" },
  { id: "#0F172A", label: "كحلي ملكي", border: "border-blue-900" },
  { id: "#064E3B", label: "أخضر سباقات", border: "border-emerald-900" },
  { id: "#450A0A", label: "عودي فاخر", border: "border-red-950" },
  { id: "#1E293B", label: "رمادي سلايت", border: "border-slate-700" },
  { id: "#EAB308", label: "أصفر سايبر", border: "border-yellow-600" },
];

// Curated Luxury Font Choices
const LUXURY_FONTS: {
  id: CardFontFamily;
  label: string;
  sub: string;
  fee: number;
}[] = [
  { id: "INTER", label: "إنتر الحديث", sub: "Inter Modern", fee: 0 },
  { id: "NEO_GROTESK", label: "نيو جروتسك", sub: "Swiss Minimal", fee: 0 },
  { id: "GEIST_MONO", label: "مونو تقني", sub: "Geist Monospace", fee: 50 },
  { id: "SPACE_GROTESK", label: "سبيس كابيتال", sub: "Space Grotesk", fee: 50 },
  { id: "SERIF_LUXURY", label: "سيريف إيطالي", sub: "Luxury Editorial", fee: 50 },
  { id: "ARABIC_KUFIC", label: "كوفي هندسي", sub: "Modern Kufic", fee: 50 },
];

export function CardStudio({ initialConfig, availableTags = [] }: CardStudioProps) {
  const [config, setConfig] = useState<CardDesignConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          return {
            ...DEFAULT_CARD_DESIGN,
            ...parsed,
            ...(initialConfig || {}),
            material: "ACRYLIC",
            cardColor: parsed.cardColor || initialConfig?.cardColor || "#0E0F12",
            logoText: parsed.logoText || initialConfig?.logoText || "taptag.one",
            brandType: parsed.brandType || initialConfig?.brandType || "OFFICIAL_TAPTAG",
            customBrandFee: (parsed.brandType || initialConfig?.brandType) === "CUSTOM_BRAND" ? 100 : 0,
          };
        }
      } catch {
        // ignore
      }
    }
    return {
      ...DEFAULT_CARD_DESIGN,
      ...(initialConfig || {}),
      material: "ACRYLIC",
      cardColor: initialConfig?.cardColor || "#0E0F12",
      logoText: initialConfig?.logoText || "taptag.one",
      brandType: initialConfig?.brandType || "OFFICIAL_TAPTAG",
      customBrandFee: initialConfig?.brandType === "CUSTOM_BRAND" ? 100 : 0,
    };
  });

  const [activeTab, setActiveTab] = useState<"dimensions" | "colors" | "branding" | "connectivity">("dimensions");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Dynamic Live Pricing Calculation - All base prices doubled, every customization adds a fee
  const selectedDimension =
    PRINTZONE_DIMENSIONS.find((d) => d.id === config.dimensionStandard) ||
    PRINTZONE_DIMENSIONS.find((d) => d.id === "CARD_55X85") ||
    PRINTZONE_DIMENSIONS[0];
  const basePriceEgp = selectedDimension.basePriceEgp;

  // Customization Fees
  const nfcFee = config.showNfcIcon ? 80 : 0;
  const brandCustomizationFee = config.brandType === "CUSTOM_BRAND" ? 100 : 0;
  const isCustomColor =
    (config.cardColor || "#0E0F12").toUpperCase() !== "#0E0F12" &&
    (config.cardColor || "#0E0F12").toUpperCase() !== "#0A0B0E";
  const colorFee = isCustomColor ? 60 : 0;
  const isCustomFont =
    config.fontFamily &&
    config.fontFamily !== "INTER" &&
    config.fontFamily !== "NEO_GROTESK";
  const fontFee = isCustomFont ? 50 : 0;
  const isCustomFinish =
    config.acrylicFinish && config.acrylicFinish !== "GLOSSY_CRYSTAL";
  const finishFee = isCustomFinish ? 50 : 0;
  const qrStyleFee =
    config.qrStyle === "BRAND_CENTER"
      ? 40
      : config.qrStyle === "CHAMFER_OCTA"
      ? 30
      : 0;
  const qrFee =
    config.qrPlacement === "BOTH"
      ? 60
      : config.qrPlacement === "FRONT_CORNER" || config.qrPlacement === "FRONT_CENTER"
      ? 40
      : 0;
  const metallicFee =
    config.logoColor === "GOLD" || config.logoColor === "SILVER" ? 40 : 0;

  const totalPriceEgp =
    basePriceEgp +
    nfcFee +
    brandCustomizationFee +
    colorFee +
    fontFee +
    finishFee +
    qrStyleFee +
    qrFee +
    metallicFee;

  // Sync to localStorage immediately on any change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
      } catch {
        // ignore
      }
    }
  }, [config]);

  // Update a field in config
  const updateField = <K extends keyof CardDesignConfig>(key: K, value: CardDesignConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
  };

  // Cloud Save Action via Neon PostgreSQL
  const handleSaveToCloud = () => {
    setSaveMessage(null);
    startSaving(async () => {
      const res = await saveCardDesignAction(config);
      if (res.success) {
        setSaveMessage("تم حفظ وتثبيت التصميم في قاعدة بيانات Neon سحابياً بنجاح!");
      } else {
        setSaveMessage(res.error || "حدث خطأ أثناء الحفظ السحابي");
      }
      setTimeout(() => setSaveMessage(null), 4500);
    });
  };

  // Export 300 DPI High-Res Canvas/PNG adapted to current dimensions
  const handleExportPNG = async () => {
    try {
      const canvas = document.createElement("canvas");
      let widthPx = 1012;
      let heightPx = 638;

      if (config.dimensionStandard === "COASTER_90X90" || config.dimensionStandard === "COASTER_120X120") {
        widthPx = 900;
        heightPx = 900;
      } else if (config.dimensionStandard === "STAND_100X150") {
        widthPx = 800;
        heightPx = 1200;
      } else if (config.dimensionStandard === "STAND_150X200") {
        widthPx = 900;
        heightPx = 1200;
      }

      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Base background color
      const bg = config.cardColor || "#0E0F12";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Contrast calculation
      const hex = bg.replace("#", "");
      let isLight = false;
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        isLight = (r * 299 + g * 587 + b * 114) / 1000 >= 155;
      }

      // Acrylic border
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

      // Center Logo
      ctx.fillStyle = isLight ? "#000000" : "#FFFFFF";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(config.logoText || "taptag.one", canvas.width / 2, canvas.height / 2);

      // NFC Tag text
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = isLight ? "#4B5563" : "#9CA3AF";
      ctx.textAlign = "left";
      ctx.fillText("NFC )))", 50, canvas.height - 50);

      // Plate / UID
      ctx.textAlign = "right";
      ctx.fillText(config.plateNumber || config.tagUid, canvas.width - 50, canvas.height - 50);

      const link = document.createElement("a");
      link.download = `taptag-acrylic-${config.tagUid}-${config.dimensionStandard}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export PNG error:", err);
    }
  };

  // Export Vector SVG for Laser Cutting & Engraving
  const handleExportSVG = () => {
    let widthMm = 85.0;
    let heightMm = 55.0;

    if (config.dimensionStandard === "COASTER_90X90") {
      widthMm = 90.0;
      heightMm = 90.0;
    } else if (config.dimensionStandard === "COASTER_120X120") {
      widthMm = 120.0;
      heightMm = 120.0;
    } else if (config.dimensionStandard === "STAND_100X150") {
      widthMm = 100.0;
      heightMm = 150.0;
    } else if (config.dimensionStandard === "STAND_150X200") {
      widthMm = 150.0;
      heightMm = 200.0;
    }

    const svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm * 10} ${heightMm * 10}">
  <!-- ACRYLIC LASER CUT LINE (Red Hairline 0.1mm) -->
  <rect x="5" y="5" width="${widthMm * 10 - 10}" height="${heightMm * 10 - 10}" rx="30" ry="30" fill="none" stroke="#FF0000" stroke-width="1" />
  
  <!-- ENGRAVING LAYER (Logo) -->
  <text x="${(widthMm * 10) / 2}" y="${(heightMm * 10) / 2}" font-family="Arial, sans-serif" font-weight="bold" font-size="52" text-anchor="middle" dominant-baseline="middle" fill="#000000">${config.logoText || "taptag.one"}</text>
  
  <!-- NFC / Tag ID Layer -->
  <text x="50" y="${heightMm * 10 - 40}" font-family="monospace" font-size="18" fill="#000000">NFC TOUCH • ISO 14443-A</text>
  <text x="${widthMm * 10 - 50}" y="${heightMm * 10 - 40}" font-family="monospace" font-size="18" text-anchor="end" fill="#000000">${config.tagUid}</text>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taptag-laser-${config.tagUid}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col space-y-6 select-none" dir="rtl">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl glass-surface-elevated border border-white/[0.10]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            استوديو الأكريليك
          </h1>
        </div>

        {/* Global Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportPNG}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="تحميل بجودة عالية للطباعة (300 DPI)"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>تصدير PNG</span>
          </button>

          <button
            type="button"
            onClick={handleExportSVG}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="تصدير فيكتور لآلات قص الليزر (SVG)"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>ليزر SVG</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-black" />
            <span>{isSaving ? "جارٍ الحفظ..." : "حفظ التصميم سحابياً"}</span>
          </button>
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveMessage && (
        <div className="p-3.5 rounded-xl border border-white/20 bg-white/10 text-xs font-mono text-white flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{saveMessage}</span>
          </div>
          <button onClick={() => setSaveMessage(null)} className="text-zinc-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Studio Grid: Left 3D Interactive Stage, Right Customization Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: 3D PHOTOREALISTIC ACRYLIC STAGE                   */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-4">
          <div className="w-full glass-surface-elevated rounded-3xl p-6 sm:p-8 border border-white/[0.10] relative flex flex-col items-center">
            {/* Top Showcase Toolbar */}
            <div className="w-full flex items-center justify-between mb-4 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>معاينة حية ثلاثية الأبعاد (3D Stage)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl glass-card text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isFlipped ? "عرض الوجه الأمامي" : "عرض الوجه الخلفي"}</span>
                </button>
              </div>
            </div>

            {/* 3D Physical Acrylic Card / Coaster / Stand */}
            <PhysicalCardRenderer
              config={config}
              interactive={true}
              allowFlip={true}
              flipped={isFlipped}
              onFlipChange={setIsFlipped}
              showFlipButton={false}
              className="w-full max-w-[460px]"
            />

            {/* Stage Footer Spec Banner */}
            <div className="mt-6 w-full pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>الخامة: أكريليك نقي 3mm معتمد</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">
                  {selectedDimension.sizeCm}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-white text-black font-mono font-bold tabular-nums">
                  {totalPriceEgp} ج.م
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: HIGH-PRECISION CUSTOMIZATION CONSOLE             */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tab Navigation Ribbon */}
          <div className="grid grid-cols-4 p-1 rounded-2xl glass-surface border border-white/[0.08] text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("dimensions")}
              className={`py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "dimensions"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              المقاسات
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("colors")}
              className={`py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "colors"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              اللون والخامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "branding"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              الهوية والخط
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("connectivity")}
              className={`py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "connectivity"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              QR & NFC
            </button>
          </div>

          {/* TAB 1: OFFICIAL 2026 DIMENSIONS & FORM FACTORS */}
          {activeTab === "dimensions" && (
            <div className="space-y-3 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                  المقاس والشكل
                </h3>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                  Printzone 2026
                </span>
              </div>

              <div className="space-y-2">
                {PRINTZONE_DIMENSIONS.map((dim) => {
                  const isSelected =
                    config.dimensionStandard === dim.id ||
                    (dim.id === "CARD_55X85" && config.dimensionStandard === "CR80_STANDARD");

                  return (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => updateField("dimensionStandard", dim.id)}
                      className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-white text-black border-white font-bold"
                          : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{dim.title}</span>
                          <span
                            className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                              isSelected ? "bg-black text-white" : "bg-white/10 text-zinc-300"
                            }`}
                          >
                            {dim.sizeCm}
                          </span>
                        </div>
                        <p className={`text-[11px] ${isSelected ? "text-zinc-800" : "text-zinc-400"}`}>
                          {dim.desc}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-bold tabular-nums ${isSelected ? "text-black" : "text-zinc-400"}`}>
                          {dim.basePriceEgp} ج.م
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UNIFIED ACRYLIC MATERIAL & COLOR PICKER */}
          {activeTab === "colors" && (
            <div className="space-y-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10]">
              {/* Custom Color Selector (Color Wheel + Hex Input) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                    اختر أي لون تريده (Color Picker)
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {colorFee > 0 ? "+60 ج.م لون مخصص" : "الأسود الأساسي (0 ج.م)"}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.10]">
                  {/* Live Color Input Preview */}
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={config.cardColor || "#0E0F12"}
                      onChange={(e) => updateField("cardColor", e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div
                      className="w-full h-full rounded-xl"
                      style={{ backgroundColor: config.cardColor || "#0E0F12" }}
                    />
                  </div>

                  {/* Hex Text Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={config.cardColor || "#0E0F12"}
                      onChange={(e) => updateField("cardColor", e.target.value)}
                      placeholder="#0E0F12"
                      className="w-full bg-transparent border-0 text-white font-mono text-sm uppercase tracking-wider focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono block">انقر على المربع لاختيار أي لون</span>
                  </div>

                  <Pipette className="w-4 h-4 text-zinc-400" />
                </div>
              </div>

              {/* Preset Luxury Palette */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-zinc-400 block">أو اختر من الباليت السريعة:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LUXURY_COLORS.map((col) => {
                    const isColSelected = (config.cardColor || "#0E0F12").toLowerCase() === col.id.toLowerCase();
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => updateField("cardColor", col.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                          isColSelected
                            ? "bg-zinc-800 border-white text-white"
                            : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border ${col.border} flex-shrink-0`}
                          style={{ backgroundColor: col.id }}
                        />
                        <span className="text-[11px] truncate">{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acrylic Finish Options */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                    تشطيب السطح
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {finishFee > 0 ? "+50 ج.م تشطيب مخصص" : "لامع (0 ج.م)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "GLOSSY_CRYSTAL" as AcrylicFinish, title: "لامع", fee: 0 },
                    { id: "SATIN_MATTE" as AcrylicFinish, title: "مطفي", fee: 50 },
                    { id: "SMOKED_FROST" as AcrylicFinish, title: "سموك", fee: 50 },
                  ].map((fin) => (
                    <button
                      key={fin.id}
                      type="button"
                      onClick={() => updateField("acrylicFinish", fin.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        (config.acrylicFinish || "GLOSSY_CRYSTAL") === fin.id
                          ? "bg-white text-black font-bold border-white"
                          : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-bold block">{fin.title}</span>
                      <span className="text-[9px] font-mono tabular-nums opacity-75 block mt-0.5">
                        {fin.fee > 0 ? `+${fin.fee} ج.م` : "مشمول"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BRANDING & TYPOGRAPHY */}
          {activeTab === "branding" && (
            <div className="space-y-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10]">
              {/* Brand Architecture Selection */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block mb-2 font-bold">
                  نوع الشعار والعلامة التجارية
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {/* Option 1: Official Logo */}
                  <button
                    type="button"
                    onClick={() => {
                      updateField("brandType", "OFFICIAL_TAPTAG");
                      updateField("logoText", "taptag.one");
                      updateField("customBrandFee", 0);
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      config.brandType !== "CUSTOM_BRAND"
                        ? "bg-white text-black border-white font-bold"
                        : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">شعار taptag.one الرسمي</span>
                        <span className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                          config.brandType !== "CUSTOM_BRAND" ? "bg-black text-white" : "bg-white/10 text-white border border-white/20"
                        }`}>
                          0 ج.م
                        </span>
                      </div>
                      <p className={`text-[11px] ${config.brandType !== "CUSTOM_BRAND" ? "text-zinc-700" : "text-zinc-400"}`}>
                        اللوجو الرسمي المعتمد بدقة ليزر عالية
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-80">
                      <Check className="w-3.5 h-3.5" />
                      <span>taptag.one الرسمي</span>
                    </div>
                  </button>

                  {/* Option 2: Custom Brand */}
                  <button
                    type="button"
                    onClick={() => {
                      updateField("brandType", "CUSTOM_BRAND");
                      updateField("customBrandFee", 100);
                      if (!config.logoText || config.logoText === "taptag.one" || config.logoText === "tagtap.one") {
                        updateField("logoText", "");
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      config.brandType === "CUSTOM_BRAND"
                        ? "bg-white text-black border-white font-bold"
                        : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">براند واسم مخصص</span>
                        <span className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                          config.brandType === "CUSTOM_BRAND" ? "bg-black text-white" : "bg-white/10 text-white border border-white/20"
                        }`}>
                          + 100 ج.م
                        </span>
                      </div>
                      <p className={`text-[11px] ${config.brandType === "CUSTOM_BRAND" ? "text-zinc-700" : "text-zinc-400"}`}>
                        حفر ليزر باسم علامتك أو معرضك أو اسمك
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>حفر ليزر شخصي</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Logo / Brand Text Input */}
              {config.brandType === "CUSTOM_BRAND" ? (
                <div className="p-3.5 rounded-2xl glass-surface-elevated border border-white/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-white block font-bold">
                      نص البراند المخصص (+100 ج.م)
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">تحديث مباشر على البطاقة</span>
                  </div>
                  <input
                    type="text"
                    value={config.logoText || ""}
                    onChange={(e) => updateField("logoText", e.target.value)}
                    placeholder="مثال: Al-Safwa Motors أو اسم معرضك"
                    className="w-full glass-input rounded-xl px-3 py-2 text-white font-sans text-sm font-bold focus:outline-none focus:border-white transition-colors"
                    dir="auto"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block mb-1 font-bold">
                    نص الشعار الرسمي
                  </label>
                  <input
                    type="text"
                    value="taptag.one"
                    disabled
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-zinc-400 font-sans text-sm font-bold lowercase opacity-75 cursor-not-allowed"
                  />
                </div>
              )}

              {/* FONT SELECTOR UI */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                    نمط الخط والتيبوغرافي
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {fontFee > 0 ? "+50 ج.م خط خاص" : "خط قياسي (0 ج.م)"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LUXURY_FONTS.map((f) => {
                    const isSelected = (config.fontFamily || "INTER") === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateField("fontFamily", f.id)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "bg-white text-black font-bold border-white"
                            : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">{f.label}</span>
                          <span
                            className={`text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                              isSelected ? "bg-black text-white" : "bg-white/10 text-zinc-400"
                            }`}
                          >
                            {f.fee > 0 ? `+${f.fee}` : "0"}
                          </span>
                        </div>
                        <span className="text-[10px] text-current/70 font-mono mt-1">{f.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logo Color */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
                    لون حفر وطباعة الشعار
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {metallicFee > 0 ? "+40 ج.م حفر معدني" : "أبيض/داكن (0 ج.م)"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "WHITE" as CardLogoColor, label: "أبيض", fee: 0, colorBg: "bg-white text-black" },
                    { id: "SILVER" as CardLogoColor, label: "كروم", fee: 40, colorBg: "bg-zinc-300 text-black" },
                    { id: "GOLD" as CardLogoColor, label: "ذهبي", fee: 40, colorBg: "bg-[#E5C158] text-black" },
                    { id: "STEALTH" as CardLogoColor, label: "خفي", fee: 0, colorBg: "bg-zinc-700 text-white" },
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => updateField("logoColor", col.id)}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        (config.logoColor || "WHITE") === col.id
                          ? "bg-zinc-800 border-white text-white font-bold"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border border-black/20 ${col.colorBg}`} />
                      <span className="text-[10px]">{col.label}</span>
                      <span className="text-[8px] font-mono tabular-nums opacity-75">{col.fee > 0 ? `+${col.fee}` : "0"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plate Text Input */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  نص لوحة المركبة أو التسمية التعريفية
                </label>
                <input
                  type="text"
                  value={config.plateNumber}
                  onChange={(e) => updateField("plateNumber", e.target.value)}
                  placeholder="مثال: أ ب ج 1234"
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white transition-colors"
                  dir="rtl"
                />
              </div>

              {/* Tag UID Target Selector */}
              {availableTags.length > 0 && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                    ربط التصميم ببطاقة من أسطولك
                  </label>
                  <select
                    value={config.tagUid}
                    onChange={(e) => {
                      const selected = availableTags.find((t) => t.tagUid === e.target.value);
                      if (selected) {
                        updateField("tagUid", selected.tagUid);
                        if (selected.vehiclePlate) {
                          updateField("plateNumber", selected.vehiclePlate);
                        }
                      }
                    }}
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none cursor-pointer"
                  >
                    {availableTags.map((t) => (
                      <option key={t.tagUid} value={t.tagUid} className="bg-zinc-900 text-white">
                        {t.tagUid} {t.vehiclePlate ? `(${t.vehiclePlate})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONNECTIVITY (QR STYLES, PLACEMENT & NFC) */}
          {activeTab === "connectivity" && (
            <div className="space-y-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10]">
              {/* QR Code Style Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                    نمط وشكل كود الـ QR
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {qrStyleFee > 0 ? `+${qrStyleFee} ج.م نمط مخصص` : "مشمول (0 ج.م)"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ROUNDED_DOTS" as CardQrStyle, label: "نقاط ناعمة", fee: 0 },
                    { id: "CLASSIC_SQUARE" as CardQrStyle, label: "مربعات كلاسيكية", fee: 0 },
                    { id: "CHAMFER_OCTA" as CardQrStyle, label: "هندسي تقني", fee: 30 },
                    { id: "BRAND_CENTER" as CardQrStyle, label: "شعار بالمنتصف", fee: 40 },
                  ].map((styleItem) => {
                    const isSelected = (config.qrStyle || "ROUNDED_DOTS") === styleItem.id;
                    return (
                      <button
                        key={styleItem.id}
                        type="button"
                        onClick={() => updateField("qrStyle", styleItem.id)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-white text-black font-bold border-white"
                            : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="text-xs">{styleItem.label}</span>
                        <span className="text-[9px] font-mono tabular-nums opacity-75">
                          {styleItem.fee > 0 ? `+${styleItem.fee} ج.م` : "مشمول"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layout Presets */}
              <div className="pt-2 border-t border-white/[0.08]">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block mb-2 font-bold">
                  نمط توزيع العناصر (Layout Presets)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "TAP_MINIMAL" as CardLayoutPreset, title: "النمط البسيط", desc: "الشعار بالأمام" },
                    { id: "ALL_IN_ONE" as CardLayoutPreset, title: "الكل في واحد", desc: "شعار + لوحة + QR" },
                    { id: "QR_HERO" as CardLayoutPreset, title: "تركيز الـ QR", desc: "QR رئيسي كبير" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateField("layoutPreset", preset.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        (config.layoutPreset || "TAP_MINIMAL") === preset.id
                          ? "bg-white text-black font-bold border-white"
                          : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xs block font-bold">{preset.title}</span>
                      <span className="text-[9px] block text-current/70 mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Placement */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                    مكان طباعة رمز الـ QR
                  </label>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {qrFee > 0 ? `+${qrFee} ج.م` : "مشمول"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "BACK_ONLY" as CardQrPlacement, label: "في الخلف فقط", fee: 0 },
                    { id: "FRONT_CORNER" as CardQrPlacement, label: "زاوية أمامية", fee: 40 },
                    { id: "FRONT_CENTER" as CardQrPlacement, label: "في المنتصف", fee: 40 },
                    { id: "BOTH" as CardQrPlacement, label: "الوجهين معاً", fee: 60 },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("qrPlacement", item.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        (config.qrPlacement || "BACK_ONLY") === item.id
                          ? "bg-zinc-800 border-white text-white font-bold"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xs block">{item.label}</span>
                      <span className="text-[8px] font-mono tabular-nums opacity-75 block mt-0.5">
                        {item.fee > 0 ? `+${item.fee} ج.م` : "مشمول"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* NFC Toggle */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <NfcWaveSymbol className="w-5 h-5 text-white" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white block">شريحة NFC اللاتلامسية</span>
                      <span className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                        config.showNfcIcon ? "bg-white text-black font-bold" : "bg-white/10 text-zinc-400"
                      }`}>
                        {config.showNfcIcon ? "+80 ج.م" : "معطلة (0 ج.م)"}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {config.showNfcIcon ? "NTAG216 Chip Active" : "بدون شريحة"}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showNfcIcon}
                  onChange={(e) => updateField("showNfcIcon", e.target.checked)}
                  className="w-5 h-5 accent-white rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* LIVE PRICE BREAKDOWN SUMMARY CARD (Minimalist, High Contrast) */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-white/[0.12] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-white" />
                <span>حساب التكلفة والإنتاج</span>
              </span>
              <span className="text-zinc-400 font-bold tabular-nums">Printzone 2026</span>
            </div>

            <div className="space-y-1.5 text-xs font-medium">
              <div className="flex items-center justify-between text-zinc-300">
                <span>المقاس ({selectedDimension.title}):</span>
                <span className="font-mono font-bold text-white tabular-nums">{basePriceEgp} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>شريحة NFC:</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {nfcFee > 0 ? `+${nfcFee} ج.م` : "0 ج.م"}
                </span>
              </div>
              {brandCustomizationFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>حفر براند شخصي:</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{brandCustomizationFee} ج.م</span>
                </div>
              )}
              {colorFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>لون مخصص:</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{colorFee} ج.م</span>
                </div>
              )}
              {fontFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>خط مخصص:</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{fontFee} ج.م</span>
                </div>
              )}
              {finishFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>تشطيب السطح ({config.acrylicFinish === "SMOKED_FROST" ? "سموك" : "مطفي"}):</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{finishFee} ج.م</span>
                </div>
              )}
              {qrStyleFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>نمط QR ({config.qrStyle === "BRAND_CENTER" ? "شعار بالمنتصف" : "هندسي تقني"}):</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{qrStyleFee} ج.م</span>
                </div>
              )}
              {qrFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>طباعة QR إضافية ({config.qrPlacement === "BOTH" ? "الوجهين" : "أمامية"}):</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{qrFee} ج.م</span>
                </div>
              )}
              {metallicFee > 0 && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span>حفر معدني:</span>
                  <span className="font-mono font-bold text-white tabular-nums">+{metallicFee} ج.م</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/[0.10] flex items-center justify-between text-sm font-bold text-white">
                <span>الإجمالي النهائي:</span>
                <span className="text-base font-black font-mono text-white tabular-nums">{totalPriceEgp} ج.م</span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 font-mono text-center pt-1 border-t border-white/[0.05]">
              أكريليك 3mm • ليزر دقيق • كود QR دائم • شريحة NFC
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
