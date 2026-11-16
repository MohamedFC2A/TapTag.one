"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Link2,
  FileText,
  FileSpreadsheet,
  Contact,
  Wifi,
  Code2,
  ListChecks,
  Lock,
  Fingerprint,
  Image as ImageIcon,
  Upload,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  CheckCircle2,
  X,
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Language } from "@/types";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { MataLogo, MataSectionHeader } from "@/components/ui/MataLogo";
import type { QrPrefillEventDetail } from "@/lib/mata-events";
import {
  QrRenderMatrix,
  buildExportQrSvg,
  buildExportQrPngDataUrl,
} from "@/components/qr/QrRenderMatrix";
import type { SmartQrPayloadType } from "@/lib/smart-qr";

interface ExecutiveHeroProps {
  lang: Language;
}

type LogoPreset = "NONE" | "MATA" | "TAPTAG" | "CUSTOM";
type ModuleShape = "square" | "dots";

interface MultiLinkItem {
  label: string;
  url: string;
}

export function ExecutiveHero({ lang }: ExecutiveHeroProps) {
  const isAr = lang === "ar";
  const docInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Payload Configuration
  const [payloadType, setPayloadType] = useState<SmartQrPayloadType>("URL");
  const [title, setTitle] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("https://taptag.one");
  const [autoRedirect, setAutoRedirect] = useState(false);

  // File Upload State (PDF / Word)
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileDataBase64, setFileDataBase64] = useState<string | null>(null);

  // Multi-Link Hub State
  const [linksList, setLinksList] = useState<MultiLinkItem[]>([
    { label: isAr ? "الموقع الرسمي" : "Official Website", url: "https://taptag.one" },
    { label: isAr ? "الملف التعريفي" : "Portfolio", url: "https://matanygroup.com" },
  ]);

  // Structured Fields (vCard / WiFi / Text)
  const [vcardName, setVcardName] = useState("Mohamed Matany");
  const [vcardPhone, setVcardPhone] = useState("+201000000000");
  const [vcardEmail, setVcardEmail] = useState("hello@taptag.one");

  const [wifiSsid, setWifiSsid] = useState("taptag_studio");
  const [wifiPass, setWifiPass] = useState("taptag2026");
  const [wifiEnc, setWifiEnc] = useState<"WPA" | "WEP" | "nopass">("WPA");

  const [textContent, setTextContent] = useState('{"status":"active"}');

  // Security & Lifecycle Controls
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [maxScansOption, setMaxScansOption] = useState<string>("UNLIMITED");
  const [ttlOption, setTtlOption] = useState<string>("PERMANENT");

  // Brand Center Logo & Visual Styling
  const [logoPreset, setLogoPreset] = useState<LogoPreset>("NONE");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [moduleShape, setModuleShape] = useState<ModuleShape>("square");
  const [frameCaption, setFrameCaption] = useState("");

  // Saved Dynamic QR State
  const [isSaving, setIsSaving] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://taptag.one";

  const dynamicResolveUrl = savedCode ? `${origin}/q/${savedCode}` : null;

  const applyQrPrefill = (detail: QrPrefillEventDetail) => {
    if (detail.payloadType) setPayloadType(detail.payloadType);
    if (detail.title !== undefined) setTitle(detail.title);
    if (detail.destinationUrl !== undefined) setDestinationUrl(detail.destinationUrl);
    if (detail.fullName !== undefined) setVcardName(detail.fullName);
    if (detail.phone !== undefined) setVcardPhone(detail.phone);
    if (detail.email !== undefined) setVcardEmail(detail.email);
    if (detail.ssid !== undefined) setWifiSsid(detail.ssid);
    if (detail.password !== undefined) setWifiPass(detail.password);
    if (detail.encryption !== undefined) setWifiEnc(detail.encryption);
    if (detail.text !== undefined) setTextContent(detail.text);
    if (detail.logoPreset) setLogoPreset(detail.logoPreset);
    if (detail.frameCaption !== undefined) setFrameCaption(detail.frameCaption);
    if (detail.pin && detail.pin.trim().length >= 3) {
      setPinEnabled(true);
      setPinCode(detail.pin.trim());
    }
    setSavedCode(null);
    setStatusError(null);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<QrPrefillEventDetail>;
      if (custom.detail) {
        applyQrPrefill(custom.detail);
      }
    };
    window.addEventListener("mata:prefill-qr", handler);
    return () => window.removeEventListener("mata:prefill-qr", handler);
  }, []);

  const qrEncodedValue = useMemo(() => {
    if (dynamicResolveUrl) return dynamicResolveUrl;

    switch (payloadType) {
      case "URL": {
        const clean = destinationUrl.trim();
        if (!clean) return "https://taptag.one";
        return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
      }
      case "PDF":
      case "DOCX": {
        const clean = destinationUrl.trim();
        if (clean) return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
        return `${origin}/q/${customAlias.trim().toUpperCase() || `NEW-${payloadType}`}`;
      }
      case "LINKS":
        return `${origin}/q/${customAlias.trim().toUpperCase() || "LINKS"}`;
      case "VCARD":
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
      case "WIFI":
        return `WIFI:T:${wifiEnc};S:${wifiSsid};P:${wifiPass};;`;
      case "TEXT":
      default:
        return textContent.trim() || "taptag.";
    }
  }, [
    dynamicResolveUrl,
    payloadType,
    destinationUrl,
    origin,
    customAlias,
    vcardName,
    vcardPhone,
    vcardEmail,
    wifiEnc,
    wifiSsid,
    wifiPass,
    textContent,
  ]);

  const processDocumentFile = (file: File) => {
    setStatusError(null);
    if (file.size > 3_200_000) {
      setStatusError(
        isAr
          ? "حجم الملف يتجاوز 3.2 ميجابايت — استخدم رابطاً مباشراً أو ملفاً أصغر."
          : "File exceeds 3.2 MB limit — choose a smaller document or paste URL."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      setFileMimeType(
        file.type ||
          (payloadType === "PDF"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      );
      setFileSize(file.size);
      setFileDataBase64(String(reader.result || ""));
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      setSavedCode(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processDocumentFile(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusError(null);
    if (file.size > 1_200_000) {
      setStatusError(
        isAr ? "حجم الشعار يجب ألا يتخطى 1.2 ميجابايت." : "Logo must be under 1.2 MB."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""));
      setLogoPreset("CUSTOM");
    };
    reader.readAsDataURL(file);
  };

  const handleResetBuilder = () => {
    setTitle("");
    setCustomAlias("");
    setDestinationUrl("https://taptag.one");
    setFileName(null);
    setFileMimeType(null);
    setFileSize(null);
    setFileDataBase64(null);
    setPinEnabled(false);
    setPinCode("");
    setBioEnabled(false);
    setMaxScansOption("UNLIMITED");
    setTtlOption("PERMANENT");
    setFrameCaption("");
    setSavedCode(null);
    setStatusError(null);
  };

  const handleCreateDynamicQr = async () => {
    setStatusError(null);

    if (pinEnabled && pinCode.trim().length < 3) {
      setStatusError(
        isAr
          ? "أدخل رمز PIN من 3 خانات على الأقل أو ألغِ القفل."
          : "Enter at least 3 characters for PIN or disable PIN lock."
      );
      return;
    }

    if ((payloadType === "PDF" || payloadType === "DOCX") && !fileDataBase64 && !destinationUrl.trim()) {
      setStatusError(
        isAr
          ? `ارفع ملف ${payloadType === "PDF" ? "PDF" : "Word"} أو أضف رابطه المباشر.`
          : `Upload a ${payloadType} file or enter its URL.`
      );
      return;
    }

    const validLinks = linksList.filter((l) => l.label.trim() && l.url.trim());
    if (payloadType === "LINKS" && validLinks.length === 0) {
      setStatusError(isAr ? "أضف رابطاً واحداً على الأقل." : "Add at least one link.");
      return;
    }

    setIsSaving(true);
    try {
      const payloadData =
        payloadType === "LINKS"
          ? {
              links: validLinks.map((l) => ({
                label: l.label.trim(),
                url: /^https?:\/\//i.test(l.url.trim())
                  ? l.url.trim()
                  : `https://${l.url.trim()}`,
              })),
            }
          : payloadType === "VCARD"
          ? { fullName: vcardName, phone: vcardPhone, email: vcardEmail }
          : payloadType === "WIFI"
          ? { ssid: wifiSsid, password: wifiPass, encryption: wifiEnc }
          : payloadType === "TEXT"
          ? { text: textContent }
          : null;

      const maxScans = maxScansOption === "UNLIMITED" ? null : Number(maxScansOption);
      const ttlHours = ttlOption === "PERMANENT" ? null : Number(ttlOption);

      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          customAlias: customAlias.trim() || null,
          payloadType,
          destinationUrl:
            payloadType === "URL" || payloadType === "PDF" || payloadType === "DOCX"
              ? destinationUrl.trim() || null
              : null,
          fileName: payloadType === "PDF" || payloadType === "DOCX" ? fileName : null,
          fileMimeType:
            payloadType === "PDF" || payloadType === "DOCX" ? fileMimeType : null,
          fileSize: payloadType === "PDF" || payloadType === "DOCX" ? fileSize : null,
          fileDataBase64:
            payloadType === "PDF" || payloadType === "DOCX" ? fileDataBase64 : null,
          payloadData,
          logoPreset,
          logoDataUrl: logoPreset === "CUSTOM" ? logoDataUrl : null,
          frameCaption: frameCaption.trim() || null,
          qrStyle: { moduleShape },
          autoRedirect: payloadType === "URL" ? autoRedirect : false,
          pin: pinEnabled ? pinCode.trim() : null,
          biometricEnabled: bioEnabled,
          maxScans,
          ttlHours,
        }),
      });

      const rawText = await res.text();
      let data: { qr?: { shortCode?: string }; error?: string } | null = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.qr?.shortCode) {
        setStatusError(
          data?.error ||
            (res.status === 413
              ? isAr
                ? "حجم الملف المرفوع كبير جداً للخادم."
                : "Uploaded payload is too large."
              : isAr
              ? `تعذر حفظ الكود (${res.status}).`
              : `Failed to save dynamic QR (${res.status}).`)
        );
        return;
      }

      setSavedCode(data.qr.shortCode);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("taptag:qr-updated"));
      }
    } catch {
      setStatusError(isAr ? "تعذر الاتصال بالخادم — تأكد من الاتصال وأعد المحاولة." : "Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrEncodedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadSvg = async () => {
    try {
      const svgString = await buildExportQrSvg(qrEncodedValue, logoPreset, logoDataUrl, {
        moduleShape,
        frameCaption,
      });
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taptag-${savedCode || payloadType.toLowerCase()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleDownloadPng = async () => {
    try {
      const dataUrl = await buildExportQrPngDataUrl(
        qrEncodedValue,
        logoPreset,
        logoDataUrl,
        { moduleShape, frameCaption }
      );
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `taptag-${savedCode || payloadType.toLowerCase()}.png`;
      a.click();
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const typeTabs: {
    id: SmartQrPayloadType;
    ar: string;
    en: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "URL", ar: "رابط", en: "URL", icon: Link2 },
    { id: "PDF", ar: "PDF", en: "PDF", icon: FileText },
    { id: "DOCX", ar: "Word", en: "Word", icon: FileSpreadsheet },
    { id: "LINKS", ar: "روابط", en: "Links", icon: ListChecks },
    { id: "VCARD", ar: "جهة اتصال", en: "vCard", icon: Contact },
    { id: "WIFI", ar: "Wi-Fi", en: "Wi-Fi", icon: Wifi },
    { id: "TEXT", ar: "نص", en: "Text", icon: Code2 },
  ];

  return (
    <>
      <section id="qr-workspace" className="hw-no-print w-full border-b border-[#27272A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1">
              <MataSectionHeader
                sectionNumber="03"
                titleAr="استوديو QR الذكي الديناميكي"
                titleEn="Dynamic Smart QR Studio"
                subtitleAr="أنشئ رمز QR ديناميكياً للروابط أو الملفات أو جهات الاتصال أو Wi-Fi مع شعار Mata AI وقفل PIN وبصمة."
                subtitleEn="Create dynamic QR codes for URLs, documents, vCards, or Wi-Fi with Mata AI branding, PIN/biometrics, and SVG/PNG exports."
                isAr={isAr}
                badgeText="DYNAMIC QR // LEVEL H"
              />
            </div>
            {savedCode && (
              <button
                type="button"
                onClick={handleResetBuilder}
                className="h-9 px-3 rounded-lg border border-[#27272A] bg-[#121215] text-xs font-mono text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0 self-start sm:self-end"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? "جديد" : "New"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Effortless Dynamic QR Workspace */}
            <div className="lg:col-span-7 space-y-4 text-start">
              <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
              {(() => {
                const readinessScore =
                  (qrEncodedValue.trim() ? 45 : 0) +
                  (pinEnabled ? (pinCode.trim().length >= 3 ? 25 : 10) : 0) +
                  (bioEnabled ? 15 : 0) +
                  (logoPreset !== "NONE" ? 15 : 0);
                return (
                  <SegmentedLedBar
                    level={isSaving ? 60 : savedCode ? 100 : readinessScore}
                    status={
                      isSaving
                        ? "working"
                        : statusError
                        ? "error"
                        : savedCode
                        ? "success"
                        : readinessScore > 0
                        ? "active"
                        : "idle"
                    }
                    label={savedCode || payloadType}
                    metricText={
                      savedCode
                        ? "SAVED"
                        : pinEnabled && bioEnabled
                        ? "PIN + BIO"
                        : pinEnabled
                        ? "PIN"
                        : bioEnabled
                        ? "BIO"
                        : "LEVEL H"
                    }
                  />
                );
              })()}

              <div className="p-4 sm:p-5 space-y-4">
                {/* 1. Content Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#71717A] block">
                    {isAr ? "نوع المحتوى" : "Payload Type"}
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {typeTabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = payloadType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setPayloadType(tab.id);
                            setSavedCode(null);
                            setStatusError(null);
                            if (tab.id !== "PDF" && tab.id !== "DOCX") {
                              setFileName(null);
                              setFileDataBase64(null);
                            }
                          }}
                          className={`h-10 px-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-center gap-1 transition-all duration-150 ease-out cursor-pointer ${
                            active
                              ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                              : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF] hover:border-[#3F3F46]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{isAr ? tab.ar : tab.en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Title + Custom Alias */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setSavedCode(null);
                    }}
                    placeholder={isAr ? "عنوان الكود (اختياري)" : "Title (optional)"}
                    className="sm:col-span-2 h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-sans text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={customAlias}
                    onChange={(e) => {
                      setCustomAlias(e.target.value);
                      setSavedCode(null);
                    }}
                    placeholder={isAr ? "رابط مخصص (my-cv)" : "Alias (optional)"}
                    className="sm:col-span-1 h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>

                {/* 3. Dynamic Payload Input */}
                {payloadType === "URL" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={destinationUrl}
                      onChange={(e) => {
                        setDestinationUrl(e.target.value);
                        setSavedCode(null);
                      }}
                      placeholder="https://example.com"
                      className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <label className="inline-flex items-center gap-2 text-[11px] font-mono text-[#A1A1AA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRedirect}
                        onChange={(e) => {
                          setAutoRedirect(e.target.checked);
                          setSavedCode(null);
                        }}
                        className="accent-white"
                      />
                      <span>
                        {isAr
                          ? "تحويل تلقائي فوري عند فتح الرابط (بدون قفل)"
                          : "Instant auto-redirect when unlocked"}
                      </span>
                    </label>
                  </div>
                )}

                {(payloadType === "PDF" || payloadType === "DOCX") && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) processDocumentFile(f);
                    }}
                    className={`p-3.5 rounded-lg border transition-colors duration-150 space-y-2.5 ${
                      isDraggingFile
                        ? "border-[#FFFFFF] bg-[#16161A]"
                        : "border-[#27272A] bg-[#09090B]"
                    }`}
                  >
                    <input
                      ref={docInputRef}
                      type="file"
                      accept={
                        payloadType === "PDF"
                          ? ".pdf,application/pdf"
                          : ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      }
                      onChange={handleDocumentPick}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="h-9 px-3.5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center gap-2 transition-all duration-150 cursor-pointer shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {fileName
                            ? isAr
                              ? "تغيير الملف"
                              : "Swap File"
                            : payloadType === "PDF"
                            ? isAr
                              ? "اختر أو اسحب ملف PDF"
                              : "Upload or Drop PDF"
                            : isAr
                            ? "اختر أو اسحب ملف Word"
                            : "Upload or Drop Word"}
                        </span>
                      </button>

                      <input
                        type="text"
                        dir="ltr"
                        value={
                          fileName
                            ? `${fileName} (${Math.ceil((fileSize || 0) / 1024)} KB)`
                            : destinationUrl
                        }
                        readOnly={Boolean(fileName)}
                        onChange={(e) => {
                          setDestinationUrl(e.target.value);
                          setSavedCode(null);
                        }}
                        placeholder={
                          isAr
                            ? `أو الصق رابط ${payloadType} مباشر...`
                            : `Or paste direct ${payloadType} URL...`
                        }
                        className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                      />

                      {fileName && (
                        <button
                          type="button"
                          onClick={() => {
                            setFileName(null);
                            setFileDataBase64(null);
                            setFileSize(null);
                            setSavedCode(null);
                          }}
                          aria-label="Clear file"
                          className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {payloadType === "LINKS" && (
                  <div className="space-y-2 p-3 rounded-lg bg-[#09090B] border border-[#27272A]">
                    {linksList.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const next = [...linksList];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setLinksList(next);
                            setSavedCode(null);
                          }}
                          placeholder={isAr ? "اسم الزر" : "Button Label"}
                          className="sm:col-span-5 h-9 px-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs text-[#FFFFFF]"
                        />
                        <input
                          type="text"
                          dir="ltr"
                          value={item.url}
                          onChange={(e) => {
                            const next = [...linksList];
                            next[idx] = { ...next[idx], url: e.target.value };
                            setLinksList(next);
                            setSavedCode(null);
                          }}
                          placeholder="https://..."
                          className="sm:col-span-6 h-9 px-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (linksList.length <= 1) return;
                            setLinksList(linksList.filter((_, i) => i !== idx));
                            setSavedCode(null);
                          }}
                          className="sm:col-span-1 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#A1A1AA] hover:text-[#FFFFFF] flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setLinksList([...linksList, { label: "", url: "" }])
                      }
                      className="h-8 px-3 rounded-md border border-[#27272A] bg-[#121215] text-[11px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAr ? "إضافة رابط آخر" : "Add Link"}</span>
                    </button>
                  </div>
                )}

                {payloadType === "VCARD" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={vcardName}
                      onChange={(e) => {
                        setVcardName(e.target.value);
                        setSavedCode(null);
                      }}
                      placeholder={isAr ? "الاسم الكامل" : "Full Name"}
                      className="h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={vcardPhone}
                      onChange={(e) => {
                        setVcardPhone(e.target.value);
                        setSavedCode(null);
                      }}
                      placeholder="+201..."
                      className="h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <input
                      type="email"
                      dir="ltr"
                      value={vcardEmail}
                      onChange={(e) => {
                        setVcardEmail(e.target.value);
                        setSavedCode(null);
                      }}
                      placeholder="email@domain.com"
                      className="h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                )}

                {payloadType === "WIFI" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={wifiSsid}
                      onChange={(e) => {
                        setWifiSsid(e.target.value);
                        setSavedCode(null);
                      }}
                      placeholder="SSID"
                      className="h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={wifiPass}
                      onChange={(e) => {
                        setWifiPass(e.target.value);
                        setSavedCode(null);
                      }}
                      placeholder="Password"
                      className="h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <select
                      value={wifiEnc}
                      onChange={(e) => {
                        setWifiEnc(e.target.value as "WPA" | "WEP" | "nopass");
                        setSavedCode(null);
                      }}
                      className="h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                    >
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Open</option>
                    </select>
                  </div>
                )}

                {payloadType === "TEXT" && (
                  <textarea
                    dir="ltr"
                    rows={2}
                    value={textContent}
                    onChange={(e) => {
                      setTextContent(e.target.value);
                      setSavedCode(null);
                    }}
                    placeholder='{"key":"value"}'
                    className="w-full p-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                  />
                )}

                {/* 4. Access Locks & Appearance */}
                <div className="pt-3 border-t border-[#27272A] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Security Gate Controls */}
                  <div className="p-3 rounded-lg bg-[#09090B] border border-[#27272A] space-y-2.5">
                    <span className="text-[11px] font-mono text-[#71717A] block">
                      {isAr ? "الحماية والقفل" : "Security"}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPinEnabled((v) => !v);
                          setSavedCode(null);
                        }}
                        className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                          pinEnabled
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? "كلمة سر PIN" : "PIN Lock"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBioEnabled((v) => !v);
                          setSavedCode(null);
                        }}
                        className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                          bioEnabled
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                        }`}
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>{isAr ? "بصمة" : "Biometric"}</span>
                      </button>
                    </div>

                    {pinEnabled && (
                      <div className="relative">
                        <input
                          type={showPin ? "text" : "password"}
                          dir="ltr"
                          value={pinCode}
                          onChange={(e) => {
                            setPinCode(e.target.value);
                            setSavedCode(null);
                          }}
                          placeholder={isAr ? "رمز الدخول..." : "Enter PIN..."}
                          className="w-full h-8 ps-2.5 pe-8 rounded-md bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin((s) => !s)}
                          className="absolute top-1/2 -translate-y-1/2 end-2 text-[#71717A] hover:text-[#FFFFFF] cursor-pointer"
                          aria-label="Toggle PIN visibility"
                        >
                          {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        aria-label={isAr ? "حد المسح" : "Max Scans"}
                        value={maxScansOption}
                        onChange={(e) => {
                          setMaxScansOption(e.target.value);
                          setSavedCode(null);
                        }}
                        className="h-8 px-2 rounded-md bg-[#121215] border border-[#27272A] text-[11px] font-mono text-[#FFFFFF]"
                      >
                        <option value="UNLIMITED">{isAr ? "مسح: ∞" : "Scans: ∞"}</option>
                        <option value="1">{isAr ? "مسحة واحدة (1x)" : "1-Time Scan"}</option>
                        <option value="10">{isAr ? "10 مسحات" : "10 Scans"}</option>
                        <option value="50">{isAr ? "50 مسحة" : "50 Scans"}</option>
                      </select>

                      <select
                        aria-label={isAr ? "الصلاحية" : "Expiry"}
                        value={ttlOption}
                        onChange={(e) => {
                          setTtlOption(e.target.value);
                          setSavedCode(null);
                        }}
                        className="h-8 px-2 rounded-md bg-[#121215] border border-[#27272A] text-[11px] font-mono text-[#FFFFFF]"
                      >
                        <option value="PERMANENT">{isAr ? "الصلاحية: دائمة" : "Permanent"}</option>
                        <option value="1">{isAr ? "1 ساعة" : "1 Hour"}</option>
                        <option value="24">{isAr ? "24 ساعة" : "24 Hours"}</option>
                        <option value="168">{isAr ? "7 أيام" : "7 Days"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Logo, Shape & Frame Caption */}
                  <div className="p-3 rounded-lg bg-[#09090B] border border-[#27272A] space-y-2.5">
                    <span className="text-[11px] font-mono text-[#71717A] block">
                      {isAr ? "الشعار والشكل" : "Logo & Style"}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoPreset("NONE")}
                        className={`h-8 px-2.5 rounded-md border text-[11px] font-mono cursor-pointer ${
                          logoPreset === "NONE"
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                        }`}
                      >
                        {isAr ? "بدون" : "None"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoPreset("MATA")}
                        className={`h-8 px-2.5 rounded-md border inline-flex items-center justify-center cursor-pointer ${
                          logoPreset === "MATA"
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF]"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                        }`}
                      >
                        <MataLogo
                          size="xs"
                          variant={logoPreset === "MATA" ? "light" : "dark"}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoPreset("TAPTAG")}
                        className={`h-8 px-2.5 rounded-md border cursor-pointer ${
                          logoPreset === "TAPTAG"
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF]"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                        }`}
                      >
                        <span className="font-taptag text-xs">taptag.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer ${
                          logoPreset === "CUSTOM"
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>{isAr ? "رفع شعار" : "Upload"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModuleShape("square")}
                        className={`h-8 rounded-md border text-[11px] font-mono cursor-pointer ${
                          moduleShape === "square"
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A]"
                        }`}
                      >
                        {isAr ? "نمط: مربعات" : "Style: Square"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModuleShape("dots")}
                        className={`h-8 rounded-md border text-[11px] font-mono cursor-pointer ${
                          moduleShape === "dots"
                            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                            : "bg-[#121215] text-[#A1A1AA] border-[#27272A]"
                        }`}
                      >
                        {isAr ? "نمط: نقاط" : "Style: Dots"}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={frameCaption}
                      onChange={(e) => setFrameCaption(e.target.value)}
                      placeholder={isAr ? "نص أسفل الكود (اختياري)" : "Caption under QR (optional)"}
                      className="w-full h-8 px-2.5 rounded-md bg-[#121215] border border-[#27272A] text-xs text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                </div>

                {statusError && (
                  <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                    {statusError}
                  </div>
                )}

                {/* 5. Primary CTA */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateDynamicQr}
                    disabled={isSaving}
                    className="flex-1 h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 ease-out cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSaving
                        ? isAr
                          ? "جارٍ الحفظ..."
                          : "Saving..."
                        : isAr
                        ? "إنشاء وحفظ QR ديناميكي"
                        : "Save Dynamic QR"}
                    </span>
                  </button>

                  <Link
                    href="/dashboard"
                    className="h-11 px-4 rounded-xl bg-[#09090B] text-[#FFFFFF] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-1.5 transition-all duration-150 ease-out"
                  >
                    <span>{isAr ? "إدارة الأكواد" : "Manage"}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {savedCode && (
                  <div className="p-3.5 rounded-xl border border-[#27272A] bg-[#09090B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#FFFFFF]">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                      <span>
                        {isAr ? `جاهز (${savedCode})` : `Ready (${savedCode})`}
                      </span>
                    </div>
                    <Link
                      href={`/q/${savedCode}`}
                      target="_blank"
                      className="px-3.5 py-1.5 rounded-md bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-[11px] inline-flex items-center gap-1.5 transition-all duration-150 self-start sm:self-auto"
                    >
                      <span>{isAr ? "فتح ومعاينة" : "Open Live"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Hardware-Style QR Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#27272A]">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#27272A] bg-[#09090B] text-[11px] font-mono font-semibold text-[#FFFFFF]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span>{isAr ? "نشط" : "Active"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#09090B] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA]">
                      {payloadType}
                    </span>
                    {pinEnabled && (
                      <span className="px-2 py-0.5 rounded bg-[#FFFFFF] text-[#09090B] text-[10px] font-mono font-bold">
                        PIN
                      </span>
                    )}
                    {bioEnabled && (
                      <span className="px-2 py-0.5 rounded bg-[#FFFFFF] text-[#09090B] text-[10px] font-mono font-bold">
                        BIO
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-5 flex flex-col items-center justify-center gap-3">
                  <div className="bg-[#FFFFFF] border border-[#E4E4E7] p-3 rounded-lg flex flex-col items-center gap-2">
                    <QrRenderMatrix
                      value={qrEncodedValue}
                      logoPreset={logoPreset}
                      logoDataUrl={logoDataUrl}
                      moduleShape={moduleShape}
                      sizeClass="w-48 h-48 sm:w-52 sm:h-52"
                    />
                    {frameCaption.trim() && (
                      <div className="w-full py-1 px-2 rounded bg-[#09090B] text-[#FFFFFF] text-[11px] font-bold text-center">
                        {frameCaption}
                      </div>
                    )}
                  </div>

                  <div
                    dir="ltr"
                    className="w-full px-3 py-1.5 rounded-md bg-[#FFFFFF] border border-[#E4E4E7] text-[11px] font-mono text-[#09090B] truncate text-center"
                  >
                    {qrEncodedValue}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-mono text-[#71717A]">
                    {isAr ? "تصدير" : "Export"}
                  </span>

                  <div className="flex items-center gap-2" dir="ltr">
                    <button
                      type="button"
                      onClick={handleCopy}
                      title={isAr ? "نسخ" : "Copy"}
                      aria-label={isAr ? "نسخ" : "Copy"}
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      title="SVG"
                      aria-label="Download SVG"
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPng}
                      title="PNG"
                      aria-label="Download PNG"
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center font-mono text-[10px] font-bold transition-all duration-150 cursor-pointer"
                    >
                      PNG
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      title={isAr ? "طباعة" : "Print"}
                      aria-label={isAr ? "طباعة" : "Print"}
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {savedCode ? (
                      <Link
                        href={`/q/${savedCode}`}
                        target="_blank"
                        title={isAr ? "فتح" : "Open"}
                        aria-label="Open"
                        className="w-9 h-9 rounded-lg border border-[#FFFFFF] bg-[#FFFFFF] text-[#09090B] hover:bg-[#09090B] hover:text-[#FFFFFF] flex items-center justify-center transition-all duration-150"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        href="/scan"
                        title={isAr ? "فحص" : "Scan"}
                        aria-label="Scan"
                        className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Clean Dedicated Print Label Sheet (Hidden on screen, visible ONLY during window.print()) */}
      <div className="hidden hw-print-sheet" aria-hidden="true">
        <div className="border-2 border-[#09090B] rounded-xl p-8 flex flex-col items-center gap-4 bg-[#FFFFFF] text-[#09090B]">
          {logoPreset === "MATA" ? (
            <MataLogo size="md" variant="light" />
          ) : (
            <span className="font-taptag text-2xl text-[#09090B]">
              taptag.
            </span>
          )}
          <QrRenderMatrix
            value={qrEncodedValue}
            logoPreset={logoPreset}
            logoDataUrl={logoDataUrl}
            moduleShape={moduleShape}
            sizeClass="w-64 h-64"
          />
          {frameCaption.trim() && (
            <div className="px-4 py-1.5 rounded bg-[#09090B] text-[#FFFFFF] font-bold text-sm">
              {frameCaption}
            </div>
          )}
          <div dir="ltr" className="font-mono text-xs text-[#52525B]">
            {savedCode || qrEncodedValue}
          </div>
        </div>
      </div>
    </>
  );
}
