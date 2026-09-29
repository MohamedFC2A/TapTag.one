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

// Official Printzone 2026 Production Dimensions
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
    desc: "المقاس القياسي العالمي لزجاج السيارة الأمامي والمحفظة الشخصية.",
    ratio: "85 / 55",
    basePriceEgp: 50,
  },
  {
    id: "COASTER_90X90",
    title: "كوستر مربع صغير",
    sizeCm: "9.0 × 9.0 cm",
    category: "COASTER",
    desc: "أكريليك مربع للمكاتب وطاولات العمل واستقبال العملاء.",
    ratio: "1:1",
    basePriceEgp: 100,
  },
  {
    id: "COASTER_120X120",
    title: "كوستر مربع كبير",
    sizeCm: "12.0 × 12.0 cm",
    category: "COASTER",
    desc: "أكريليك عريض وفاخر للشركات والمنشآت وقاعات الانتظار.",
    ratio: "1:1",
    basePriceEgp: 120,
  },
  {
    id: "STAND_100X150",
    title: "ستاند مكتبي عمودي",
    sizeCm: "10.0 × 15.0 cm",
    category: "STAND",
    desc: "ستاند أكريليك عمودي أنيق مع كود QR كبير وواضح من مسافة.",
    ratio: "2:3",
    basePriceEgp: 250,
  },
  {
    id: "STAND_150X200",
    title: "ستاند مكتبي كبير",
    sizeCm: "15.0 × 20.0 cm",
    category: "STAND",
    desc: "ستاند العرض الفاخر للمعارض ونقاط الدفع ومداخل المنشآت.",
    ratio: "3:4",
    basePriceEgp: 300,
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
            customBrandFee: (parsed.brandType || initialConfig?.brandType) === "CUSTOM_BRAND" ? 50 : 0,
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
      customBrandFee: initialConfig?.brandType === "CUSTOM_BRAND" ? 50 : 0,
    };
  });

  const [activeTab, setActiveTab] = useState<"dimensions" | "colors" | "branding" | "connectivity">("dimensions");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Dynamic Live Pricing Calculation
  const selectedDimension =
    PRINTZONE_DIMENSIONS.find((d) => d.id === config.dimensionStandard) ||
    PRINTZONE_DIMENSIONS.find((d) => d.id === "CARD_55X85") ||
    PRINTZONE_DIMENSIONS[0];
  const basePriceEgp = selectedDimension.basePriceEgp;
  const brandCustomizationFee = config.brandType === "CUSTOM_BRAND" ? 50 : 0;
  const totalPriceEgp = basePriceEgp + brandCustomizationFee;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10] shadow-glass">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
              TAPTAG ACRYLIC STUDIO
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            استوديو تخصيص وتصنيع الأكريليك الذكي
          </h1>
          <p className="text-xs text-zinc-400">
            أكريليك نقي معتمد • مواصفات إنتاج ومطابع Printzone 2026 • كود QR مشفر ونبض NFC لاتلامسي
          </p>
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all shadow-glass cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-black" />
            <span>{isSaving ? "جارٍ الحفظ..." : "حفظ التصميم سحابياً"}</span>
          </button>
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveMessage && (
        <div className="p-3.5 rounded-xl border border-white/20 bg-white/10 text-xs font-mono text-white flex items-center justify-between shadow-glass animate-in fade-in">
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
          <div className="w-full glass-surface-elevated rounded-3xl p-6 sm:p-8 border border-white/[0.10] shadow-glass relative flex flex-col items-center">
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
                  className="px-3 py-1.5 rounded-xl glass-card text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
                <span className="text-zinc-500">
                  {selectedDimension.sizeCm}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-white text-black font-mono font-bold">
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
                  ? "bg-white text-black font-bold shadow-sm"
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
                  ? "bg-white text-black font-bold shadow-sm"
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
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              الهوية واللوجو
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("connectivity")}
              className={`py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "connectivity"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              QR & NFC
            </button>
          </div>

          {/* TAB 1: OFFICIAL 2026 DIMENSIONS & FORM FACTORS */}
          {activeTab === "dimensions" && (
            <div className="space-y-3 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10] shadow-glass">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                  مقاسات وأشكال الأكريليك الرسمية
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
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
                          ? "bg-white text-black border-white shadow-md font-bold"
                          : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{dim.title}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              isSelected ? "bg-black text-white" : "bg-white/10 text-zinc-300"
                            }`}
                          >
                            {dim.sizeCm}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isSelected ? "text-zinc-800" : "text-zinc-400"}`}>
                          {dim.desc}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UNIFIED ACRYLIC MATERIAL & COLOR PICKER */}
          {activeTab === "colors" && (
            <div className="space-y-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10] shadow-glass">
              {/* Material Confirmation */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">خامة الأكريليك الموحدة</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Pure Cast Acrylic 3mm Laser Cut</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  موحدة رسمياً ✓
                </span>
              </div>

              {/* Custom Color Selector (Color Wheel + Hex Input) */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                  اختر أي لون تريده (Color Picker)
                </label>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/[0.10]">
                  {/* Live Color Input Preview */}
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner flex-shrink-0 cursor-pointer">
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
                <span className="text-xs font-mono text-zinc-400 block">أو اختر من الباليت الفاخرة السريعة:</span>
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
                            ? "bg-zinc-800 border-white text-white shadow-sm"
                            : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border ${col.border} flex-shrink-0 shadow-sm`}
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
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  تشطيب ملمس سطح الأكريليك
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "GLOSSY_CRYSTAL" as AcrylicFinish, title: "كريستالي لامع", desc: "شفافية فائقة ولمعان زجاجي" },
                    { id: "SATIN_MATTE" as AcrylicFinish, title: "أملس مطفي", desc: "مانع للبصمات والانعكاس" },
                    { id: "SMOKED_FROST" as AcrylicFinish, title: "مثلج سموك", desc: "مظهر داكن فاخر شبه شفاف" },
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
                      <span className="text-xs block font-bold">{fin.title}</span>
                      <span className="text-[9px] block text-current/70 mt-0.5">{fin.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BRANDING & TYPOGRAPHY */}
          {activeTab === "branding" && (
            <div className="space-y-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10] shadow-glass">
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
                        ? "bg-white text-black border-white shadow-md font-bold"
                        : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold font-sans">شعار taptag.one الرسمي</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          config.brandType !== "CUSTOM_BRAND" ? "bg-black text-white" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}>
                          مشمول مجاناً (0 ج.م)
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${config.brandType !== "CUSTOM_BRAND" ? "text-zinc-700" : "text-zinc-400"}`}>
                        اللوجو الرسمي المعتمد لمنظومة taptag.one المطبوع بدقة عالية.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-80">
                      <Check className="w-3.5 h-3.5" />
                      <span>taptag.one الرسمية</span>
                    </div>
                  </button>

                  {/* Option 2: Custom Brand */}
                  <button
                    type="button"
                    onClick={() => {
                      updateField("brandType", "CUSTOM_BRAND");
                      updateField("customBrandFee", 50);
                      if (!config.logoText || config.logoText === "taptag.one" || config.logoText === "tagtap.one") {
                        updateField("logoText", "");
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      config.brandType === "CUSTOM_BRAND"
                        ? "bg-white text-black border-white shadow-md font-bold"
                        : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold font-sans">براند واسم مخصص</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          config.brandType === "CUSTOM_BRAND" ? "bg-black text-white" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          + 50 ج.م إضافية
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${config.brandType === "CUSTOM_BRAND" ? "text-zinc-700" : "text-zinc-400"}`}>
                        حفر وتخصيص بالليزر باسم علامتك، شركتك، معرضك، أو اسمك الشخصي.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>حفر ليزر شخصي</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Logo / Brand Text Input */}
              {config.brandType === "CUSTOM_BRAND" ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-amber-300 block font-bold">
                      اكتب نص البراند المخصص (+50 ج.م)
                    </label>
                    <span className="text-[10px] font-mono text-amber-400">تحديث مباشر على البطاقة</span>
                  </div>
                  <input
                    type="text"
                    value={config.logoText || ""}
                    onChange={(e) => updateField("logoText", e.target.value)}
                    placeholder="مثال: Al-Safwa Motors أو اسم معرضك أو شركتك"
                    className="w-full bg-black/80 border border-amber-500/30 rounded-xl px-3 py-2 text-white font-sans text-sm font-bold focus:outline-none focus:border-amber-400 transition-colors"
                    dir="auto"
                  />
                  <p className="text-[10px] text-zinc-400">
                    سيظهر هذا الاسم أو الشعار محفوراً بدقة على واجهة القطعة الأكريليك بدلاً من شعار taptag.one.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block mb-1 font-bold">
                    نص الشعار الرسمي
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value="taptag.one"
                      disabled
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-zinc-400 font-sans text-sm font-bold lowercase opacity-75 cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    هذا هو الشعار الرسمي المعتمد لمنظومة taptag.one. لتغييره إلى براند خاص اختر (براند واسم مخصص + 50 ج).
                  </span>
                </div>
              )}

              {/* Logo Color */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  لون حفر وطباعة الشعار
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "WHITE" as CardLogoColor, label: "أبيض ناصع", colorBg: "bg-white text-black" },
                    { id: "SILVER" as CardLogoColor, label: "فضي كروم", colorBg: "bg-zinc-300 text-black" },
                    { id: "GOLD" as CardLogoColor, label: "ذهبي فاخر", colorBg: "bg-[#E5C158] text-black" },
                    { id: "STEALTH" as CardLogoColor, label: "داكن خفي", colorBg: "bg-zinc-700 text-white" },
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => updateField("logoColor", col.id)}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        (config.logoColor || "WHITE") === col.id
                          ? "bg-zinc-800 border-white text-white"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border border-black/20 ${col.colorBg}`} />
                      <span className="text-[10px]">{col.label}</span>
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

          {/* TAB 4: CONNECTIVITY (QR PLACEMENT & NFC) */}
          {activeTab === "connectivity" && (
            <div className="space-y-4 p-5 rounded-3xl glass-surface-elevated border border-white/[0.10] shadow-glass">
              {/* Layout Presets */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 block mb-2 font-bold">
                  نمط توزيع العناصر (Layout Presets)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "TAP_MINIMAL" as CardLayoutPreset, title: "النمط البسيط", desc: "الشعار في الأمام والـ QR بالخلف" },
                    { id: "ALL_IN_ONE" as CardLayoutPreset, title: "الكل في واحد", desc: "الشعار والـ QR واللوحة معاً" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateField("layoutPreset", preset.id)}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        (config.layoutPreset || "TAP_MINIMAL") === preset.id
                          ? "bg-white text-black font-bold border-white"
                          : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xs block font-bold">{preset.title}</span>
                      <span className="text-[10px] block text-current/70 mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Placement */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  مكان طباعة رمز الـ QR
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "BACK_ONLY" as CardQrPlacement, label: "في الخلف فقط" },
                    { id: "FRONT_CORNER" as CardQrPlacement, label: "زاوية أمامية" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("qrPlacement", item.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        (config.qrPlacement || "BACK_ONLY") === item.id
                          ? "bg-zinc-800 border-white text-white font-bold"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* NFC Toggle */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <NfcWaveSymbol className="w-5 h-5 text-white" />
                  <div>
                    <span className="text-xs font-bold text-white block">رمز NFC اللاتلامسي</span>
                    <span className="text-[10px] text-zinc-400 font-mono">NTAG216 Chip Active</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showNfcIcon}
                  onChange={(e) => updateField("showNfcIcon", e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* LIVE PRICE BREAKDOWN SUMMARY CARD */}
          <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.12] shadow-glass space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#00C853]" />
                <span>حساب التكلفة والإنتاج الفوري</span>
              </span>
              <span className="text-emerald-400 font-bold">Printzone 2026</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-zinc-300">
                <span>سعر المقاس الأساسي ({selectedDimension.title} - {selectedDimension.sizeCm}):</span>
                <span className="font-mono font-bold text-white">{basePriceEgp} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>تخصيص الشعار ({config.brandType === "CUSTOM_BRAND" ? "براند واسم مخصص" : "شعار taptag.one الرسمي"}):</span>
                <span className={`font-mono font-bold ${brandCustomizationFee > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {brandCustomizationFee > 0 ? `+${brandCustomizationFee} ج.م` : "مشمول مجاناً"}
                </span>
              </div>
              <div className="pt-2 border-t border-white/[0.10] flex items-center justify-between text-sm font-bold text-white">
                <span className="font-sans">الإجمالي النهائي للقطعة:</span>
                <span className="text-base font-black font-mono text-[#00C853]">{totalPriceEgp} ج.م</span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 font-mono text-center pt-1 border-t border-white/[0.05]">
              خامة أكريليك 3mm نقية • حفر ليزر دقيق • كود QR دائم • شريحة NFC ذكية
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
