"use client";

import React, { useState, useEffect, useTransition } from "react";
import QRCode from "qrcode";
import {
  Download,
  Printer,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Radio,
  FileCode,
  Image as ImageIcon,
  Zap,
  Sparkles,
  Lock,
  Layers,
  Cpu,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Language } from "@/types";
import { mintPhysicalTag, mintBatchPhysicalTags } from "@/app/actions/factory-actions";

export interface InventoryTag {
  id: string;
  tagUid: string;
  isActivated: boolean;
  status: string;
  ownerDeviceName: string | null;
  claimedAt: string | null;
  createdAt: string;
  vehiclePlate: string;
  vehicleMake: string;
}

interface QRStudioProps {
  lang?: Language;
  initialInventory?: InventoryTag[];
  isLocal?: boolean;
}

export function QRStudio({ lang = "ar", initialInventory = [], isLocal = true }: QRStudioProps) {
  const isAr = lang === "ar";
  const [isPending, startTransition] = useTransition();

  // Selected or active card for rendering and printing
  const [activeUid, setActiveUid] = useState<string>(
    initialInventory[0]?.tagUid || "MW-8821-49XA"
  );
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [showCutMarks, setShowCutMarks] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Live Inventory List from Neon DB
  const [inventory, setInventory] = useState<InventoryTag[]>(initialInventory);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dynamic redirect destination for this card
  const targetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/r/${activeUid}`
    : `https://taptag.one/r/${activeUid}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: "H", // ISO 18004 30% error correction (crucial for outdoor / acrylic durability)
      margin: 1,
      width: 450,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }).then(setQrDataUrl);
  }, [targetUrl, activeUid]);

  // Mint 1 new physical card directly into Neon PostgreSQL
  const handleMintSingle = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await mintPhysicalTag();
      if (res.success && res.tag) {
        setActiveUid(res.tag.tagUid);
        setInventory((prev) => [
          {
            id: res.tag!.id,
            tagUid: res.tag!.tagUid,
            isActivated: false,
            status: "ACTIVE",
            ownerDeviceName: null,
            claimedAt: null,
            createdAt: res.tag!.createdAt,
            vehiclePlate: "جاهزة للتفعيل بالبصمة",
            vehicleMake: "في انتظار الشراء",
          },
          ...prev,
        ]);
        setFeedback({
          type: "success",
          message: res.message || "تم سك البطاقة بنجاح وحفظها في قاعدة بيانات Neon!",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل سك البطاقة في قاعدة البيانات.",
        });
      }
    });
  };

  // Mint a batch of 5 factory cards directly into Neon PostgreSQL
  const handleMintBatch = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await mintBatchPhysicalTags(5);
      if (res.success && res.tags) {
        if (res.tags[0]) {
          setActiveUid(res.tags[0].tagUid);
        }
        const newItems: InventoryTag[] = res.tags.map((t) => ({
          id: t.id,
          tagUid: t.tagUid,
          isActivated: false,
          status: "ACTIVE",
          ownerDeviceName: null,
          claimedAt: null,
          createdAt: t.createdAt,
          vehiclePlate: "جاهزة للتفعيل بالبصمة",
          vehicleMake: "في انتظار الشراء",
        }));
        setInventory((prev) => [...newItems, ...prev]);
        setFeedback({
          type: "success",
          message: res.message || `تم سك دفعة تتكون من ${res.count} بطاقات وحفظها في قاعدة البيانات!`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل سك دفعة البطاقات.",
        });
      }
    });
  };

  // Export 300 DPI PNG (70mm x 50mm @ 300 DPI = 827 x 591 pixels)
  const export300DpiPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 827;
    canvas.height = 591;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Acrylic Base Foundation (Pure Pitch Black)
    ctx.fillStyle = themeMode === "dark" ? "#000000" : "#F4F4F5";
    ctx.fillRect(0, 0, 827, 591);

    // Beveled Acrylic Polished Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = themeMode === "dark" ? "#1F2228" : "#D4D4D8";
    ctx.strokeRect(10, 10, 807, 571);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(14, 14, 799, 563);

    // 2. Top Solar Panel Bar (Authentic Photovoltaic Wafers)
    const solarY = 22;
    const solarH = 60;
    ctx.fillStyle = "#03060B";
    ctx.fillRect(22, solarY, 783, solarH);
    ctx.strokeStyle = "#161B24";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(22, solarY, 783, solarH);

    // Solar PV micro-cells (12 segmented vertical wafers)
    const cellW = 783 / 12;
    for (let i = 1; i < 12; i++) {
      ctx.strokeStyle = "#1E2433";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22 + i * cellW, solarY);
      ctx.lineTo(22 + i * cellW, solarY + solarH);
      ctx.stroke();
    }
    // Solar horizontal busbar wire
    ctx.strokeStyle = "#38435C";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(22, solarY + solarH / 2);
    ctx.lineTo(805, solarY + solarH / 2);
    ctx.stroke();

    ctx.font = "9px monospace";
    ctx.fillStyle = "#717684";
    ctx.fillText("HIGH-EFFICIENCY PHOTOVOLTAIC HARVESTING • 0.5V DC", 32, solarY + 16);

    // 3. Right Vertical Green Bar (TAPTAG.ONE reading from top to bottom)
    const rightBarW = 54;
    const rightBarX = 805 - rightBarW;
    const contentY = solarY + solarH + 16;
    const contentH = 571 - contentY + 2;

    const barGrad = ctx.createLinearGradient(rightBarX, contentY, rightBarX + rightBarW, contentY + contentH);
    barGrad.addColorStop(0, "#00C853");
    barGrad.addColorStop(1, "#059669");
    ctx.fillStyle = barGrad;
    ctx.fillRect(rightBarX, contentY, rightBarW, contentH);

    ctx.save();
    ctx.translate(rightBarX + rightBarW / 2 + 6, contentY + 36);
    ctx.rotate(Math.PI / 2);
    ctx.font = "bold 22px 'IBM Plex Sans Arabic', sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("TAPTAG.ONE", 0, 0);
    ctx.restore();

    // 4. Left QR Code Section
    const qrSectionW = 260;
    const qrSectionX = 26;
    const qrContainerY = contentY + 6;
    const qrContainerSize = 250;

    // Green framed background for QR
    ctx.fillStyle = "#00C853";
    ctx.fillRect(qrSectionX, qrContainerY, qrContainerSize, qrContainerSize);

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    qrImg.onload = () => {
      // White QR matrix container
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(qrSectionX + 6, qrContainerY + 6, qrContainerSize - 12, qrContainerSize - 12);
      ctx.drawImage(qrImg, qrSectionX + 12, qrContainerY + 12, qrContainerSize - 24, qrContainerSize - 24);

      // Serial Tag UID printed directly under QR code (unified gap)
      const uidBoxY = qrContainerY + qrContainerSize + 14;
      ctx.fillStyle = "#090A0D";
      ctx.fillRect(qrSectionX, uidBoxY, qrContainerSize, 64);
      ctx.strokeStyle = "#1F2228";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(qrSectionX, uidBoxY, qrContainerSize, 64);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#00C853";
      ctx.fillText("SERIAL TAG UID", qrSectionX + 16, uidBoxY + 22);

      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(activeUid, qrSectionX + 16, uidBoxY + 48);

      // 5. Center Section: NFC & Factory Sealed Product Identification
      const centerX = qrSectionX + qrContainerSize + 28;
      const centerW = rightBarX - centerX - 24;

      // Prominent "NFC" Emblem (Scale 65)
      ctx.font = "900 64px 'IBM Plex Sans Arabic', sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("NFC", centerX, contentY + 64);

      // Contactless wave indicator
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#00C853";
      ctx.fillText("TOUCH SENSOR  (((•)))  13.56 MHz", centerX + 155, contentY + 40);

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#9CA3AF";
      ctx.fillText("SMART IDENTITY SHIELD • NO APP REQUIRED", centerX + 155, contentY + 64);

      // Sealed Factory Asset Box
      const assetBoxY = contentY + 98;
      ctx.fillStyle = "#090A0D";
      ctx.fillRect(centerX, assetBoxY, centerW, 140);
      ctx.strokeStyle = "#1F2228";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(centerX, assetBoxY, centerW, 140);

      // Label
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#00C853";
      ctx.fillText("READY-FOR-SALE • جاهزة للتفعيل الفوري", centerX + 20, assetBoxY + 30);

      // Title
      ctx.font = "bold 24px 'IBM Plex Sans Arabic', sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("هوية ذكية مشفرة للمركبة والأصول", centerX + 20, assetBoxY + 70);

      // Subtitle (pure Arabic, no broken English line breaks!)
      ctx.font = "14px 'IBM Plex Sans Arabic', sans-serif";
      ctx.fillStyle = "#D4D4D8";
      ctx.fillText("ربط فوري لبيانات المركبة وقفل الملكية بالبصمة البيومترية", centerX + 20, assetBoxY + 100);

      // Protocol detail
      ctx.font = "12px 'IBM Plex Sans Arabic', sans-serif";
      ctx.fillStyle = "#71717A";
      ctx.fillText("تشفير كامل لحجب رقم الهاتف والبيانات الشخصية عن المارة", centerX + 20, assetBoxY + 124);

      // Bottom Security Microtext
      ctx.font = "11px monospace";
      ctx.fillStyle = "#52525B";
      ctx.fillText("ISO 18004 LEVEL H • SMART REDIRECT GATEWAY • ZERO PII HARDWARE", centerX, contentY + 285);

      // Laser Cut Registration Marks if active
      if (showCutMarks) {
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(4, 4, 819, 583);
      }

      const link = document.createElement("a");
      link.download = `TapTag-Factory-Acrylic-Tag-${activeUid}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  // Export Vector SVG
  const exportVectorSVG = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="70mm" height="50mm" viewBox="0 0 700 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .solar-bg { fill: #03060B; stroke: #161B24; stroke-width: 1.5; }
      .solar-cell { stroke: #1E2433; stroke-width: 1; }
      .solar-wire { stroke: #38435C; stroke-width: 1.5; }
      .nfc-title { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; font-size: 64px; font-weight: 900; fill: #FFFFFF; }
      .nfc-sub { font-family: monospace; font-size: 12px; fill: #00C853; font-weight: bold; }
      .card-title { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; font-size: 20px; font-weight: bold; fill: #FFFFFF; }
      .card-sub { font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 13px; fill: #D4D4D8; }
      .card-desc { font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 11px; fill: #71717A; }
      .uid-val { font-family: monospace; font-size: 18px; font-weight: bold; fill: #FFFFFF; }
      .uid-lbl { font-family: monospace; font-size: 10px; fill: #00C853; font-weight: bold; }
      .vertical-bar-txt { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #FFFFFF; letter-spacing: 2px; }
      .glass-bevel { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 1; }
    </style>
  </defs>

  <!-- Acrylic Tag Background (70mm x 50mm, 3mm corner radius) -->
  <rect x="5" y="5" width="690" height="490" rx="20" ry="20" fill="#000000" stroke="#1F2228" stroke-width="3"/>
  <rect x="9" y="9" width="682" height="482" rx="16" ry="16" class="glass-bevel"/>

  <!-- Top Solar Panel Bar -->
  <rect x="18" y="16" width="664" height="46" rx="4" ry="4" class="solar-bg"/>
  <line x1="18" y1="39" x2="682" y2="39" class="solar-wire"/>
  <line x1="73" y1="16" x2="73" y2="62" class="solar-cell"/>
  <line x1="128" y1="16" x2="128" y2="62" class="solar-cell"/>
  <line x1="183" y1="16" x2="183" y2="62" class="solar-cell"/>
  <line x1="238" y1="16" x2="238" y2="62" class="solar-cell"/>
  <line x1="293" y1="16" x2="293" y2="62" class="solar-cell"/>
  <line x1="348" y1="16" x2="348" y2="62" class="solar-cell"/>
  <line x1="403" y1="16" x2="403" y2="62" class="solar-cell"/>
  <line x1="458" y1="16" x2="458" y2="62" class="solar-cell"/>
  <line x1="513" y1="16" x2="513" y2="62" class="solar-cell"/>
  <line x1="568" y1="16" x2="568" y2="62" class="solar-cell"/>
  <line x1="623" y1="16" x2="623" y2="62" class="solar-cell"/>

  <!-- Right Vertical Green Bar -->
  <rect x="636" y="72" width="46" height="414" rx="4" ry="4" fill="#00C853"/>
  <g transform="translate(664, 98) rotate(90)">
    <text x="0" y="0" class="vertical-bar-txt">TAPTAG.ONE</text>
  </g>

  <!-- Left QR Code Section -->
  <rect x="20" y="72" width="216" height="216" rx="6" ry="6" fill="#00C853"/>
  <rect x="26" y="78" width="204" height="204" rx="4" ry="4" fill="#FFFFFF"/>
  <image href="${qrDataUrl}" x="32" y="84" width="192" height="192" />

  <!-- UID Box Directly Below QR -->
  <rect x="20" y="300" width="216" height="56" rx="4" ry="4" fill="#090A0D" stroke="#1F2228" stroke-width="1.5"/>
  <text x="32" y="320" class="uid-lbl">SERIAL TAG UID</text>
  <text x="32" y="344" class="uid-val">${activeUid}</text>

  <!-- Center Section: NFC & Factory Sealed Identification -->
  <text x="260" y="135" class="nfc-title">NFC</text>
  <text x="390" y="112" class="nfc-sub">TOUCH SENSOR  (((•)))  13.56 MHz</text>
  <text x="390" y="132" font-family="sans-serif" font-size="11px" fill="#9CA3AF">SMART IDENTITY SHIELD • NO APP REQUIRED</text>

  <rect x="260" y="155" width="355" height="120" rx="6" ry="6" fill="#090A0D" stroke="#1F2228" stroke-width="1.5"/>
  <text x="276" y="180" font-family="monospace" font-size="11px" fill="#00C853" font-weight="bold">READY-FOR-SALE • جاهزة للتفعيل الفوري</text>
  <text x="276" y="210" class="card-title">هوية ذكية مشفرة للمركبة والأصول</text>
  <text x="276" y="236" class="card-sub">ربط فوري لبيانات المركبة وقفل الملكية بالبصمة البيومترية</text>
  <text x="276" y="258" class="card-desc">تشفير كامل لحجب رقم الهاتف والبيانات الشخصية عن المارة</text>

  <text x="260" y="300" font-family="monospace" font-size="10px" fill="#52525B">ISO 18004 LEVEL H • SMART REDIRECT GATEWAY • ZERO PII</text>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `TapTag-Factory-Acrylic-Tag-${activeUid}.svg`;
    link.click();
  };

  return (
    <div className="space-y-8 bg-[#000000] text-white" dir={isAr ? "rtl" : "ltr"}>
      {/* Factory Engine Header Banner (Pure Deep Black + High Contrast Green & White) */}
      <div className="border border-[#1F2228] bg-[#08080A] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00C853]" />
            <h1 className="text-base font-bold text-white tracking-wide">
              {isAr ? "مصنع بطاقات الأكريليك الذكية (Factory Card Minting Engine)" : "Factory Smart Acrylic Minting Studio"}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] font-bold">
              LOCAL FACTORY ONLY
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            {isAr
              ? "سك وتصنيع البطاقات الفيزيائية الجاهزة للبيع في المحلات وتخزينها في Neon PostgreSQL كأصول أصلية جاهزة للتفعيل."
              : "Mint and store factory-ready acrylic cards into Neon PostgreSQL as genuine sealed inventory ready for sale."}
          </p>
        </div>

        {/* Minting Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleMintSingle}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>{isPending ? "جارٍ السك في Neon..." : "سك بطاقة جديدة وحفظها"}</span>
          </button>

          <button
            type="button"
            onClick={handleMintBatch}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-[#27272A] bg-[#121216] hover:bg-[#1C1C22] text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Layers className="w-4 h-4 text-[#00C853]" />
            <span>سك دفعة مصنع (5 بطاقات)</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-lg border text-xs flex items-center justify-between font-medium ${
            feedback.type === "success"
              ? "border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853]"
              : "border-red-800/40 bg-red-950/40 text-red-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Card Preview & Physical Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Card Render Preview (70mm x 50mm Proportions) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1C1C1F] pb-2">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#00C853]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? "معاينة البطاقة الأكريليك الجاهزة للبيع (70mm × 50mm)" : "Factory Acrylic Card Preview (70mm × 50mm)"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#00C853] font-bold">UID: {activeUid}</span>
            </div>
          </div>

          {/* PHYSICAL ACRYLIC CARD CONTAINER */}
          <div className="p-8 rounded-xl border border-[#1C1C1F] bg-[#050505] flex items-center justify-center overflow-x-auto">
            {/* The Physical Card Canvas (70mm x 50mm fixed ratio) */}
            <div
              dir="ltr"
              className="w-[640px] h-[457px] rounded-[18px] border-2 border-[#1F2228] bg-[#000000] text-white p-4 relative flex flex-col justify-between select-none"
              style={{
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.9)",
              }}
            >
              {/* TOP: Black Solar Panel Bar */}
              <div className="w-full h-11 bg-[#03060B] border border-[#161B24] rounded-md flex items-center justify-between px-1 relative overflow-hidden shrink-0">
                {/* Solar micro wafers */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex-1 h-full border-r border-[#1E2433] relative flex items-center justify-center">
                    <div className="w-full h-[1.5px] bg-[#38435C] absolute top-1/2 -translate-y-1/2 opacity-80" />
                  </div>
                ))}
                <span className="absolute left-3 top-1 text-[8px] font-mono text-[#717684] tracking-wider uppercase font-semibold">
                  HIGH-EFFICIENCY PHOTOVOLTAIC HARVESTING • 0.5V DC
                </span>
              </div>

              {/* MIDDLE & BOTTOM BODY: Left QR (35%), Center NFC (65%), Right Green Vertical Bar */}
              <div className="flex-1 flex gap-3 pt-3 pb-1 min-h-0">
                {/* 1. LEFT: 35% QR Code & Serial Tag UID (Unified Column, NO awkward gap!) */}
                <div className="w-[195px] flex flex-col gap-2 shrink-0">
                  {/* QR Container in Crisp Emerald Frame */}
                  <div className="w-[195px] h-[195px] rounded-lg bg-[#00C853] p-2 flex items-center justify-center">
                    <div className="w-full h-full bg-white rounded-md flex items-center justify-center p-1.5">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="TapTag.one ISO 18004 Smart QR"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 font-mono text-xs">
                          Generating QR...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Serial Hardware Tag UID directly beneath QR */}
                  <div className="w-[195px] py-2 px-3 rounded-lg border border-[#1F2228] bg-[#090A0D] flex flex-col justify-center">
                    <span className="text-[9px] font-mono uppercase text-[#00C853] font-bold tracking-wider">
                      SERIAL TAG UID
                    </span>
                    <span className="text-sm font-mono font-black text-white tracking-widest truncate">
                      {activeUid}
                    </span>
                  </div>
                </div>

                {/* 2. CENTER: 65% NFC Touch Emblem & Factory Identity */}
                <div className="flex-1 flex flex-col justify-between px-2">
                  {/* Top NFC Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-black tracking-tight text-white leading-none font-mono">
                        NFC
                      </div>
                      <div className="text-[10px] font-mono text-[#00C853] tracking-wider mt-1 flex items-center gap-1 font-bold">
                        <Radio className="w-3 h-3 text-[#00C853]" />
                        <span>TOUCH SENSOR 13.56 MHz</span>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-zinc-300 border border-[#27272A] bg-[#0D0D12] px-2 py-1 rounded font-bold">
                      SEALED ASSET
                    </div>
                  </div>

                  {/* Factory Sealed Box (Pure Arabic, No awkward broken English hyphens!) */}
                  <div className="p-3.5 rounded-lg border border-[#1F2228] bg-[#090A0D] space-y-1.5" dir="rtl">
                    <div className="text-[10px] font-mono text-[#00C853] font-bold tracking-wider">
                      READY-FOR-SALE • جاهزة للتفعيل الفوري
                    </div>
                    <div className="text-base font-bold text-white tracking-wide leading-snug">
                      هوية ذكية مشفرة للمركبة والأصول
                    </div>
                    <div className="text-xs text-[#D4D4D8] leading-relaxed">
                      ربط فوري لبيانات المركبة وقفل الملكية بالبصمة البيومترية.
                    </div>
                    <div className="text-[10px] text-[#71717A] leading-tight">
                      تشفير كامل لحجب رقم الهاتف والبيانات الشخصية عن المارة.
                    </div>
                  </div>

                  {/* Footer Security Microtext */}
                  <div className="text-[9px] font-mono text-[#52525B] tracking-tight">
                    ISO 18004 LEVEL H • SMART REDIRECT GATEWAY • ZERO PII
                  </div>
                </div>

                {/* 3. RIGHT: Vertical Green Bar (TAPTAG.ONE) */}
                <div className="w-11 bg-gradient-to-b from-[#00C853] to-[#059669] rounded-md flex items-center justify-center shrink-0 relative overflow-hidden">
                  <span
                    className="font-bold text-sm tracking-widest text-white whitespace-nowrap select-none font-mono"
                    style={{
                      writingMode: "vertical-rl",
                    }}
                  >
                    TAPTAG.ONE
                  </span>
                </div>
              </div>

              {/* Laser Cutting Guide (Red Hairline Overlay) */}
              {showCutMarks && (
                <div className="absolute inset-1 rounded-[16px] border border-red-500/30 pointer-events-none flex items-center justify-between p-1">
                  <span className="text-[8px] font-mono text-red-400">2mm Laser Bleed</span>
                  <span className="text-[8px] font-mono text-red-400">70x50mm</span>
                </div>
              )}
            </div>
          </div>

          {/* Export & Print Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportVectorSVG}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-white text-xs font-bold hover:border-[#00C853] transition-colors"
              >
                <FileCode className="w-4 h-4 text-[#00C853]" />
                <span>تصدير فيكتور لقص الليزر (SVG)</span>
              </button>

              <button
                type="button"
                onClick={export300DpiPNG}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-white text-xs font-bold hover:border-[#00C853] transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-[#00C853]" />
                <span>تصدير طباعة دقيقة (300 DPI PNG)</span>
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
              <input
                type="checkbox"
                checked={showCutMarks}
                onChange={(e) => setShowCutMarks(e.target.checked)}
                className="rounded border-[#27272A] text-[#00C853] focus:ring-0 bg-[#0A0A0E]"
              />
              <span>إظهار إرشادات القص بالليزر (Laser Cut Guides)</span>
            </label>
          </div>
        </div>

        {/* Right: Technical Specifications & Security Parameters */}
        <div className="lg:col-span-4 space-y-5">
          <div className="border border-[#1F2228] rounded-lg bg-[#08080A] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1C1C1F] pb-3">
              <ShieldCheck className="w-4 h-4 text-[#00C853]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                المعايير الهندسية لبطاقة المتجر
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#1C1C1F]/60 pb-2">
                <span className="text-[#A1A1AA]">حجم البطاقة الفيزيائية:</span>
                <span className="font-mono text-white font-bold">70mm × 50mm (3mm Cast)</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1C1C1F]/60 pb-2">
                <span className="text-[#A1A1AA]">مستوى تصحيح خطأ الـ QR:</span>
                <span className="font-mono text-[#00C853] font-bold">Level H (30% Resilience)</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1C1C1F]/60 pb-2">
                <span className="text-[#A1A1AA]">منع التصادم (Collision-Free):</span>
                <span className="font-mono text-[#00C853] font-bold">Atomic Neon DB Check</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1C1C1F]/60 pb-2">
                <span className="text-[#A1A1AA]">بوابة التوجيه الديناميكي:</span>
                <span className="font-mono text-white">/r/[UID] Smart Gateway</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1C1C1F]/60 pb-2">
                <span className="text-[#A1A1AA]">بروتوكول شريحة الـ RFID:</span>
                <span className="font-mono text-white font-bold">NFC Type 2 / 13.56 MHz</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1A1AA]">حماية الخصوصية بالبطاقة:</span>
                <span className="font-mono text-[#00C853] font-bold">Zero PII Printed</span>
              </div>
            </div>
          </div>

          {/* Quick How It Works in Shops */}
          <div className="border border-[#1F2228] rounded-lg bg-[#08080A] p-5 space-y-3 text-xs">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#00C853]" />
              <span>دورة حياة البطاقة في المتاجر:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-[#D4D4D8] leading-relaxed">
              <li>يتم سك البطاقة وحفظ معرّفها في Neon DB كأصل غير مفعّل.</li>
              <li>تُطبع البطاقة وتُباع في المحلات جاهزة ومغلفة بدون بيانات شخصية.</li>
              <li>يقوم المشتري بتقريب NFC أو مسح الـ QR بجواله.</li>
              <li>يطلب النظام إجبارياً تسجيل البصمة وقفل الملكية الحصرية للجوال.</li>
              <li>تتحول البطاقة تلقائياً إلى هوية مؤمنة ومقترنة بجواله فقط.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* FACTORY INVENTORY TABLE (NEON DB LIVE SYNC) */}
      <div className="border border-[#1F2228] rounded-lg bg-[#08080A] overflow-hidden">
        <div className="p-4 border-b border-[#1F2228] flex items-center justify-between bg-[#040406]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#00C853]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              سجل بطاقات المصنع والمخزون في قاعدة بيانات Neon ({inventory.length} أصل)
            </h2>
          </div>
          <span className="text-xs font-mono text-[#00C853] font-bold">LIVE POSTGRESQL SYNC</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#000000] text-[#A1A1AA] border-b border-[#1F2228] font-mono text-[11px] uppercase">
              <tr>
                <th className="p-3 text-start">الرقم التسلسلي (UID)</th>
                <th className="p-3 text-start">حالة الأصل في السوق</th>
                <th className="p-3 text-start">البيانات المقترنة</th>
                <th className="p-3 text-start">تاريخ السك</th>
                <th className="p-3 text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2228] text-zinc-300">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    لا توجد بطاقات مسكوكة في المخزون حالياً. اضغط على &quot;سك بطاقة جديدة وحفظها&quot; للبدء.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#0D0D12] transition-colors ${
                      item.tagUid === activeUid ? "bg-[#00C853]/5" : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-mono font-bold text-white">
                        <span className="w-2 h-2 rounded-full bg-[#00C853]" />
                        <span>{item.tagUid}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {item.isActivated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] font-mono text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>مباعة ومقترنة بالبصمة (ACTIVE)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold">
                          <span>جاهزة للبيع في المتجر (SEALED)</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-300">
                      <div className="font-semibold text-white">{item.vehiclePlate}</div>
                      {item.ownerDeviceName && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {item.ownerDeviceName}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono text-zinc-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                    </td>
                    <td className="p-3 text-end">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveUid(item.tagUid)}
                          className="px-3 py-1 rounded border border-[#1F2228] bg-[#0A0A0E] hover:border-[#00C853] text-white text-xs font-medium transition-colors"
                        >
                          معاينة البطاقة
                        </button>
                        <a
                          href={`/r/${item.tagUid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded border border-[#1F2228] bg-[#0A0A0E] hover:border-[#00C853] text-[#00C853] hover:text-white transition-colors"
                          title="تجربة التوجيه الذكي للـ QR"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
