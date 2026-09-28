"use client";

import React, { useState, useEffect, useTransition } from "react";
import type {
  CardDesignConfig,
  CardMaterial,
  CardDimension,
  CardCodeType,
  CardLogoPosition,
  CardLogoColor,
} from "@/types/card-design";
import { DEFAULT_CARD_DESIGN } from "@/types/card-design";
import { saveCardDesignAction } from "@/app/actions/card-customization-actions";
import { PhysicalCardRenderer } from "./PhysicalCardRenderer";
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
} from "lucide-react";
import Link from "next/link";

interface CardStudioProps {
  initialConfig?: CardDesignConfig;
  availableTags?: { tagUid: string; vehiclePlate?: string; vehicleMake?: string }[];
}

const LOCAL_STORAGE_KEY = "taptag_card_customization_v2";

export function CardStudio({ initialConfig, availableTags = [] }: CardStudioProps) {
  const [config, setConfig] = useState<CardDesignConfig>(() => {
    // 0-delay client hydration from localStorage
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          return { ...DEFAULT_CARD_DESIGN, ...parsed, ...(initialConfig || {}) };
        }
      } catch {
        // ignore
      }
    }
    return initialConfig || DEFAULT_CARD_DESIGN;
  });

  const [activeTab, setActiveTab] = useState<
    "dimensions" | "materials" | "code" | "styling" | "partition"
  >("materials");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  // Export 300 DPI High-Res Canvas/PNG
  const handleExportPNG = async () => {
    try {
      const canvas = document.createElement("canvas");
      // CR80 at 300 DPI: 1012 x 638 px (85.6 x 54 mm)
      canvas.width = 1012;
      canvas.height = 638;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Base background
      ctx.fillStyle = config.material === "PEARL_WHITE" ? "#F4F4F5" : "#09090B";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.strokeStyle = config.material === "PEARL_WHITE" ? "#D4D4D8" : "#27272A";
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      // Header logo
      ctx.fillStyle = config.material === "PEARL_WHITE" ? "#000000" : "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("TAPTAG PRO", 60, 80);

      // UID
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = "#A1A1AA";
      ctx.fillText(config.tagUid, 60, 580);

      // Plate
      ctx.font = "bold 36px sans-serif";
      ctx.fillStyle = config.material === "PEARL_WHITE" ? "#000000" : "#FFFFFF";
      ctx.fillText(config.plateNumber || "أ ب ج 1234", 650, 320);

      const link = document.createElement("a");
      link.download = `taptag-card-${config.tagUid}-300dpi.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export PNG error:", err);
    }
  };

  // Export Vector SVG for Laser Machines
  const handleExportSVG = () => {
    const widthMm = config.dimensionStandard === "CR80_STANDARD" ? 85.6 : 70.0;
    const heightMm = config.dimensionStandard === "CR80_STANDARD" ? 54.0 : 50.0;

    const svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm * 10} ${heightMm * 10}">
  <!-- CUT LINE (Red Hairline for Laser Cutter) -->
  <rect x="5" y="5" width="${widthMm * 10 - 10}" height="${heightMm * 10 - 10}" rx="30" ry="30" fill="none" stroke="#FF0000" stroke-width="1" />
  
  <!-- ENGRAVING LAYER (Black for High-Precision Fiber/CO2 Laser) -->
  <text x="50" y="80" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#000000">TAPTAG PRO</text>
  <text x="50" y="${heightMm * 10 - 50}" font-family="monospace" font-size="20" fill="#000000">${config.tagUid}</text>
  <text x="${widthMm * 10 - 250}" y="${heightMm * 10 / 2}" font-family="Arial, sans-serif" font-weight="bold" font-size="32" fill="#000000">${config.plateNumber}</text>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taptag-laser-vector-${config.tagUid}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
            <Link href="/" className="hover:text-white transition-colors">
              الرئيسية
            </Link>
            <span>/</span>
            <span className="text-zinc-200">استوديو تصميم البطاقات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>استوديو تخصيص البطاقة الذكية</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
              REAL-TIME STUDIO
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            تحكّم بشكل ومقاس وخامات بطاقتك مع معاينة فيزيائية واقعية ثلاثية الأبعاد وحفظ دائم.
          </p>
        </div>

        {/* Global Save & Print Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? "جارٍ الحفظ..." : "حفظ وتثبيت التصميم"}</span>
          </button>
        </div>
      </div>

      {/* Save Message Notification */}
      {saveMessage && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-white" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Desktop) / Top (Mobile): 3D Realistic Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Card Presentation Stage */}
          <div className="w-full relative rounded-2xl bg-gradient-to-b from-[#121214] to-[#09090B] border border-zinc-800/80 p-6 sm:p-10 flex flex-col items-center justify-center overflow-hidden studio-spotlight min-h-[380px] sm:min-h-[440px]">
            {/* Ambient Grid overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Tag UID Selector Selector Pill */}
            {availableTags.length > 0 && (
              <div className="absolute top-4 right-4 z-30">
                <select
                  value={config.tagUid}
                  onChange={(e) => updateField("tagUid", e.target.value)}
                  className="bg-black/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-white"
                >
                  {availableTags.map((t) => (
                    <option key={t.tagUid} value={t.tagUid}>
                      {t.tagUid} {t.vehiclePlate ? `(${t.vehiclePlate})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dimensional spec watermark */}
            <div className="absolute top-4 left-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Maximize2 className="w-3 h-3 text-zinc-400" />
              <span>
                {config.dimensionStandard === "CR80_STANDARD"
                  ? "85.6 × 54.0 mm"
                  : config.dimensionStandard === "MINI_KEY_54X28"
                  ? "54.0 × 28.0 mm"
                  : "70.0 × 50.0 mm"}
              </span>
            </div>

            {/* THE PHOTOREALISTIC CARD RENDERER */}
            <PhysicalCardRenderer
              config={config}
              interactive={true}
              allowFlip={true}
              flipped={isFlipped}
              onFlipChange={setIsFlipped}
              className="w-full max-w-[420px]"
            />

            {/* Bottom Spec Summary */}
            <div className="mt-4 flex items-center gap-3 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>
                  {config.material === "MATTE_OBSIDIAN"
                    ? "أسود مطفي ساتان"
                    : config.material === "SMOKED_ACRYLIC"
                    ? "أكريليك زجاجي مدخن"
                    : config.material === "CARBON_FIBER"
                    ? "ألياف كربون مجسمة"
                    : config.material === "BRUSHED_TITANIUM"
                    ? "تيتانيوم مصقول"
                    : "بلاتينيوم أبيض"}
                </span>
              </span>
              <span>•</span>
              <span>{config.codeType === "QR_CODE" ? "رمز QR" : config.codeType === "BARCODE" ? "باركود 128" : "مزدوج (QR + Barcode)"}</span>
            </div>
          </div>

          {/* Export Action Bar */}
          <div className="w-full mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-zinc-300" />
              <span>جاهز للطباعة والقص الحقيقي:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPNG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors border border-zinc-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>صورة 300 DPI</span>
              </button>
              <button
                type="button"
                onClick={handleExportSVG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors border border-zinc-700"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>فيكتور ليزر SVG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls & Tabs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tab Navigation */}
          <div className="grid grid-cols-5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("materials")}
              className={`py-2 px-1 text-center rounded-lg transition-all ${
                activeTab === "materials"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              الخامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dimensions")}
              className={`py-2 px-1 text-center rounded-lg transition-all ${
                activeTab === "dimensions"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              المقاس
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`py-2 px-1 text-center rounded-lg transition-all ${
                activeTab === "code"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              الكود
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("styling")}
              className={`py-2 px-1 text-center rounded-lg transition-all ${
                activeTab === "styling"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              اللوجو
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("partition")}
              className={`py-2 px-1 text-center rounded-lg transition-all ${
                activeTab === "partition"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              العناصر
            </button>
          </div>

          {/* TAB 1: MATERIALS */}
          {activeTab === "materials" && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                اختر نوع السطح والخامة الفيزيائية
              </h3>

              {[
                {
                  id: "MATTE_OBSIDIAN" as CardMaterial,
                  name: "أسود مطفي ساتان (Matte Obsidian)",
                  desc: "مظهر داكن فاخر ذو سطح ساتان فخم لا يترك بصمات",
                  badge: "الأكثر طلباً",
                },
                {
                  id: "SMOKED_ACRYLIC" as CardMaterial,
                  name: "أكريليك مدخن شفاف (Smoked Acrylic)",
                  desc: "لوح زجاجي شبه شفاف بلمعة حواف وانعكاس ضوئي",
                  badge: "زجاجي فاخر",
                },
                {
                  id: "CARBON_FIBER" as CardMaterial,
                  name: "ألياف كربون مجسمة (Carbon Fiber)",
                  desc: "نسيج كربوني رياضي عالي الصلابة بلمسة رياضية فائقة",
                  badge: "رياضي 3D",
                },
                {
                  id: "BRUSHED_TITANIUM" as CardMaterial,
                  name: "تيتانيوم مصقول (Brushed Titanium)",
                  desc: "سطح معدني بلمعة أفقية باردة مع حواف مشطوفة",
                  badge: "معدن فاخر",
                },
                {
                  id: "PEARL_WHITE" as CardMaterial,
                  name: "بلاتينيوم أبيض لؤلؤي (Pearl White)",
                  desc: "تباين ناصع فاخر مع كتابة ونقوش سوداء حادة",
                  badge: "أبيض فاخر",
                },
              ].map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => updateField("material", mat.id)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                    config.material === mat.id
                      ? "bg-zinc-800 border-white text-white shadow-md"
                      : "bg-black/30 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold">{mat.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">
                        {mat.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{mat.desc}</p>
                  </div>
                  {config.material === mat.id && (
                    <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* TAB 2: DIMENSIONS */}
          {activeTab === "dimensions" && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                اختر المقاس الحقيقي بالمليمتر
              </h3>

              {[
                {
                  id: "ACRYLIC_TAG_70X50" as CardDimension,
                  title: "70 × 50 مم (كارت الزجاج والسيارة)",
                  desc: "المقاس المثالي للتعليق على الزجاج الأمامي أو تابلوه المركبة",
                  ratio: "1.40 Aspect Ratio",
                },
                {
                  id: "CR80_STANDARD" as CardDimension,
                  title: "85.6 × 54 مم (بطاقة بنكية قياسية)",
                  desc: "مقاس بطاقات الائتمان القياسي لحفظها في المحفظة أو الجيب",
                  ratio: "CR80 ISO/IEC 7810",
                },
                {
                  id: "MINI_KEY_54X28" as CardDimension,
                  title: "54 × 28 مم (ميدالية مفاتيح مدمجة)",
                  desc: "مقاس مصغر مدمج لمفاتيح السيارة أو مرآة الرؤية الخلفية",
                  ratio: "Mini Tag Form",
                },
              ].map((dim) => (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => updateField("dimensionStandard", dim.id)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                    config.dimensionStandard === dim.id
                      ? "bg-zinc-800 border-white text-white shadow-md"
                      : "bg-black/30 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs sm:text-sm font-bold block">{dim.title}</span>
                    <p className="text-[11px] text-zinc-400">{dim.desc}</p>
                    <span className="text-[10px] font-mono text-zinc-500 block pt-1">
                      {dim.ratio}
                    </span>
                  </div>
                  {config.dimensionStandard === dim.id && (
                    <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* TAB 3: CODE (QR / BARCODE / DUAL) */}
          {activeTab === "code" && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                اختر نوع الرمز البرمجي المعروض
              </h3>

              {[
                {
                  id: "QR_CODE" as CardCodeType,
                  title: "رمز الاستجابة السريعة (QR Code)",
                  desc: "مسح سريع وموثوق من أي هاتف ذكي بدقة تصحيح أخطاء 30%",
                  icon: QrCode,
                },
                {
                  id: "BARCODE" as CardCodeType,
                  title: "الباركود الصناعي النقي (Code 128 Barcode)",
                  desc: "خطوط باركود متوازية أنيقة مخصصة مع رقم المسلسل بالأسفل",
                  icon: Barcode,
                },
                {
                  id: "DUAL" as CardCodeType,
                  title: "مزدوج (QR Code + Barcode)",
                  desc: "عرض رمز الـ QR والباركود معاً لتكامل شامل وسرعة قراءة",
                  icon: Layers,
                },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => updateField("codeType", c.id)}
                    className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                      config.codeType === c.id
                        ? "bg-zinc-800 border-white text-white shadow-md"
                        : "bg-black/30 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-white">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs sm:text-sm font-bold block">{c.title}</span>
                        <p className="text-[11px] text-zinc-400">{c.desc}</p>
                      </div>
                    </div>
                    {config.codeType === c.id && (
                      <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 4: LOGO & STYLING */}
          {activeTab === "styling" && (
            <div className="space-y-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              {/* Logo Position */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  مكان اللوجو
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "TOP_LEFT" as CardLogoPosition, label: "أعلى اليسار" },
                    { id: "CENTER" as CardLogoPosition, label: "في المنتصف" },
                    { id: "TOP_RIGHT" as CardLogoPosition, label: "أعلى اليمين" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateField("logoPosition", pos.id)}
                      className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                        config.logoPosition === pos.id
                          ? "bg-white text-black font-bold border-white"
                          : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Color */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  لون اللوجو والختم
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
                      className={`p-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center gap-1.5 ${
                        config.logoColor === col.id
                          ? "bg-zinc-800 border-white text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
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
                  نص لوحة السيارة المعروض
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={config.plateNumber}
                  onChange={(e) => updateField("plateNumber", e.target.value)}
                  placeholder="مثال: أ ب ج 1234"
                  className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Custom Text / Protocol Note */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  نص إضافي أسفل اللوحة
                </label>
                <input
                  type="text"
                  value={config.customText}
                  onChange={(e) => updateField("customText", e.target.value)}
                  placeholder="مثال: TAPTAG SMART ACCESS"
                  className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 5: PARTITIONING & BADGES */}
          {activeTab === "partition" && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                تفعيل وإلغاء شارات البطاقة الذكية
              </h3>

              {/* NFC Icon Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <Wifi className="w-4 h-4 text-zinc-300 rotate-90" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white block">
                      أيقونة NFC اللاتلامسية (13.56 MHz)
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      إظهار شارة تردد الشريحة اللاتلامسية بأعلى البطاقة
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateField("showNfcIcon", !config.showNfcIcon)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    config.showNfcIcon ? "bg-white" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                      config.showNfcIcon ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Emergency Call Badge Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-zinc-300" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white block">
                      شارة الطوارئ الذكية
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      إظهار زر طوارئ مخصص في أسفل البطاقة للتواصل الفوري
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateField("showEmergency", !config.showEmergency)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    config.showEmergency ? "bg-white" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                      config.showEmergency ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
