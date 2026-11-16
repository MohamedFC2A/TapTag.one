"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  Plus,
  Edit3,
  Trash2,
  Power,
  ExternalLink,
  Download,
  Lock,
  Fingerprint,
  X,
  Upload,
  Search,
  Eye,
  RotateCcw,
  Camera,
  QrCode,
  Shield,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { QrRenderMatrix, buildExportQrPngDataUrl, buildExportQrSvg } from "@/components/qr/QrRenderMatrix";
import type { SmartQrPublicDTO } from "@/lib/smart-qr";
import type { SecureSharePublicDTO } from "@/lib/secure-share";
import type { Language } from "@/types";

export type HubTab = "CODES" | "SCAN" | "SHARES";

interface ScanLogRow {
  id: string;
  deviceOs: string;
  accessResult: string;
  createdAt: string;
}

interface DashboardClientProps {
  initialTab?: HubTab;
}

export function DashboardClient({ initialTab = "CODES" }: DashboardClientProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);

  const [qrs, setQrs] = useState<SmartQrPublicDTO[]>([]);
  const [shares, setShares] = useState<SecureSharePublicDTO[]>([]);
  const [cachedKeyFragments, setCachedKeyFragments] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    protected: 0,
    totalScans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingShares, setLoadingShares] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "scans">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Scanner Tab State (merged from /scan)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualInput, setManualInput] = useState("");
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const [copiedScan, setCopiedScan] = useState(false);

  // Inspect Modal (live QR preview + per-QR scan telemetry)
  const [inspectingQr, setInspectingQr] = useState<SmartQrPublicDTO | null>(null);
  const [inspectScans, setInspectScans] = useState<ScanLogRow[]>([]);

  // Dynamic Edit Modal State
  const [editingQr, setEditingQr] = useState<SmartQrPublicDTO | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPinAction, setEditPinAction] = useState<"keep" | "set" | "clear">("keep");
  const [editNewPin, setEditNewPin] = useState("");
  const [editBio, setEditBio] = useState(false);
  const [editMaxScans, setEditMaxScans] = useState("");
  const [editFrameCaption, setEditFrameCaption] = useState("");
  const [editModuleShape, setEditModuleShape] = useState<"square" | "dots">("square");
  const [editFileName, setEditFileName] = useState<string | null>(null);
  const [editFileMime, setEditFileMime] = useState<string | null>(null);
  const [editFileSize, setEditFileSize] = useState<number | null>(null);
  const [editFileBase64, setEditFileBase64] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [qrRes, shareRes] = await Promise.all([
        fetch("/api/qr", { cache: "no-store" }),
        fetch("/api/share", { cache: "no-store" }),
      ]);
      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrs(data.qrs || []);
        if (data.stats) setStats(data.stats);
      }
      if (shareRes.ok) {
        const shareData = await shareRes.json();
        if (Array.isArray(shareData.shares)) {
          setShares(shareData.shares);
          if (typeof window !== "undefined") {
            const map: Record<string, string> = {};
            for (const item of shareData.shares as SecureSharePublicDTO[]) {
              try {
                const cached = sessionStorage.getItem(`mata_share_key_${item.shareCode}`);
                if (cached) map[item.shareCode] = cached;
              } catch {
                // ignore storage errors
              }
            }
            setCachedKeyFragments(map);
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingShares(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleDecoded = useCallback(
    (rawText: string) => {
      const clean = rawText.trim();
      if (!clean) return;
      setDecodedResult(clean);
      stopCamera();
      if (clean.includes("/q/")) {
        const code = clean.split("/q/").pop()?.split(/[?#]/)[0]?.toUpperCase();
        if (code) {
          router.push(`/q/${code}`);
        }
      }
    },
    [router, stopCamera]
  );

  const startCamera = async (facing: "environment" | "user") => {
    setCameraError(null);
    setDecodedResult(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraActive(false);
      setCameraError(
        isAr
          ? "تعذر فتح الكاميرا — يمكنك رفع صورة رمز QR أو إدخال الكود يدوياً أدناه."
          : "Camera unavailable — upload a QR image or enter the code below."
      );
    }
  };

  useEffect(() => {
    if (!cameraActive) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            handleDecoded(code.data);
            return;
          }
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [cameraActive, handleDecoded]);

  useEffect(() => {
    if (activeTab !== "SCAN") stopCamera();
  }, [activeTab, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 512;
      canvas.height = img.height || 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          handleDecoded(code.data);
        } else {
          setCameraError(
            isAr ? "لم يتم العثور على رمز QR واضح داخل الصورة." : "No readable QR code found in image."
          );
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setCameraError(isAr ? "تعذر قراءة ملف الصورة." : "Could not load image file.");
    };
    img.src = url;
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualInput.trim().toUpperCase();
    if (!val) return;
    if (val.includes("/Q/")) {
      const code = val.split("/Q/").pop()?.split(/[?#]/)[0];
      if (code) router.push(`/q/${code}`);
      return;
    }
    router.push(`/q/${val}`);
  };

  const handleCopyScan = async () => {
    if (!decodedResult) return;
    try {
      await navigator.clipboard.writeText(decodedResult);
      setCopiedScan(true);
      setTimeout(() => setCopiedScan(false), 1600);
    } catch {
      // ignore
    }
  };

  const handleToggleShare = async (item: SecureSharePublicDTO) => {
    await fetch(`/api/share/${encodeURIComponent(item.shareCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await loadData();
  };

  const handleDeleteShare = async (item: SecureSharePublicDTO) => {
    await fetch(`/api/share/${encodeURIComponent(item.shareCode)}`, {
      method: "DELETE",
    });
    await loadData();
  };

  const openInspectModal = async (item: SmartQrPublicDTO) => {
    setInspectingQr(item);
    setInspectScans([]);
    try {
      const res = await fetch(`/api/qr/${encodeURIComponent(item.shortCode)}?inspect=1`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setInspectScans(data.scans || []);
      }
    } catch {
      // ignore
    }
  };

  const openEditModal = (item: SmartQrPublicDTO) => {
    setEditingQr(item);
    setEditTitle(item.title);
    setEditUrl(item.destinationUrl || "");
    setEditPinAction("keep");
    setEditNewPin("");
    setEditBio(item.biometricEnabled);
    setEditMaxScans(item.maxScans ? String(item.maxScans) : "");
    setEditFrameCaption(item.frameCaption || "");
    setEditModuleShape(item.qrStyle?.moduleShape || "square");
    setEditFileName(item.fileName);
    setEditFileMime(item.fileMimeType);
    setEditFileSize(item.fileSize);
    setEditFileBase64(null);
  };

  const handleEditFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 4_800_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditFileName(file.name);
      setEditFileMime(file.type || "application/octet-stream");
      setEditFileSize(file.size);
      setEditFileBase64(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQr) return;
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        title: editTitle.trim() || editingQr.title,
        destinationUrl: editUrl.trim() || null,
        biometricEnabled: editBio,
        maxScans: editMaxScans.trim() ? Number(editMaxScans) : null,
        frameCaption: editFrameCaption.trim() || null,
        qrStyle: { moduleShape: editModuleShape },
        pinAction: editPinAction,
        pin: editPinAction === "set" ? editNewPin.trim() : null,
      };
      if (editFileBase64) {
        body.fileName = editFileName;
        body.fileMimeType = editFileMime;
        body.fileSize = editFileSize;
        body.fileDataBase64 = editFileBase64;
      }

      const res = await fetch(`/api/qr/${encodeURIComponent(editingQr.shortCode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingQr(null);
        await loadData();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (item: SmartQrPublicDTO) => {
    await fetch(`/api/qr/${encodeURIComponent(item.shortCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await loadData();
  };

  const handleResetScans = async (item: SmartQrPublicDTO) => {
    await fetch(`/api/qr/${encodeURIComponent(item.shortCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetScans: true }),
    });
    await loadData();
    if (inspectingQr?.shortCode === item.shortCode) {
      setInspectingQr({ ...item, scanCount: 0, isLimitReached: false });
    }
  };

  const handleDelete = async (item: SmartQrPublicDTO) => {
    await fetch(`/api/qr/${encodeURIComponent(item.shortCode)}`, {
      method: "DELETE",
    });
    await loadData();
  };

  const handleDownloadPng = async (item: SmartQrPublicDTO) => {
    const origin = window.location.origin;
    const png = await buildExportQrPngDataUrl(
      `${origin}/q/${item.shortCode}`,
      item.logoPreset,
      item.logoDataUrl,
      {
        moduleShape: item.qrStyle?.moduleShape || "square",
        frameCaption: item.frameCaption,
      }
    );
    const a = document.createElement("a");
    a.href = png;
    a.download = `taptag-${item.shortCode}.png`;
    a.click();
  };

  const handleDownloadSvg = async (item: SmartQrPublicDTO) => {
    const origin = window.location.origin;
    const svg = await buildExportQrSvg(
      `${origin}/q/${item.shortCode}`,
      item.logoPreset,
      item.logoDataUrl,
      {
        moduleShape: item.qrStyle?.moduleShape || "square",
        frameCaption: item.frameCaption,
      }
    );
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taptag-${item.shortCode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleQrs = qrs
    .filter((item) => {
      if (filterType !== "ALL" && item.payloadType !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.shortCode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.fileName || "").toLowerCase().includes(q) ||
        (item.destinationUrl || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "scans") return b.scanCount - a.scanCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div
      className={`min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col relative ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="fixed inset-0 hw-pixel-grid pointer-events-none"
        aria-hidden="true"
      />
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Unified Hub Top Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#27272A]">
          <div className="text-start space-y-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#FFFFFF]">
              {activeTab === "SCAN"
                ? isAr
                  ? "فاحص وقارئ رموز QR"
                  : "QR Scanner"
                : activeTab === "SHARES"
                ? isAr
                  ? "الملفات المشفرة"
                  : "Encrypted Shares"
                : isAr
                ? "إدارة الأكواد والفحص"
                : "Codes & Scanner"}
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              {isAr
                ? "لوحة موحّدة لإدارة أكواد QR، فحص الكاميرا والصور، وإدارة الملفات المشفرة."
                : "Unified workspace for Dynamic QRs, live camera/image scanner, and encrypted shares."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-[#27272A] bg-[#121215]">
              {(
                [
                  { id: "CODES" as const, icon: QrCode, label: isAr ? "الأكواد" : "Codes" },
                  { id: "SCAN" as const, icon: Camera, label: isAr ? "المسح والفتح" : "Scanner" },
                  { id: "SHARES" as const, icon: Shield, label: isAr ? "المشفرة" : "Shares" },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                      active
                        ? "bg-[#FFFFFF] text-[#09090B] font-bold"
                        : "text-[#A1A1AA] hover:text-[#FFFFFF]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <Link
              href={activeTab === "SHARES" ? "/?tool=share" : "/?tool=qr"}
              className="h-10 px-4 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === "SHARES" ? (isAr ? "مشاركة جديدة" : "New Share") : isAr ? "إنشاء QR" : "New QR"}</span>
            </Link>
          </div>
        </div>

        {activeTab === "CODES" && (
          <>
            {/* Clean Summary Metrics (No decorative LED clutter) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: "total", label: isAr ? "إجمالي الأكواد" : "Total QRs", val: stats.total },
                { key: "active", label: isAr ? "النشطة" : "Active", val: stats.active, dot: true },
                { key: "protected", label: isAr ? "المحمية" : "Protected", val: stats.protected },
                { key: "scans", label: isAr ? "إجمالي المسح" : "Total Scans", val: stats.totalScans },
              ].map((kpi) => (
                <div
                  key={kpi.key}
                  className="rounded-xl border border-[#27272A] bg-[#121215] p-4 text-start space-y-1"
                >
                  <span className="text-[11px] font-mono text-[#A1A1AA] flex items-center gap-1.5">
                    {kpi.dot && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                    <span>{kpi.label}</span>
                  </span>
                  <span className="text-2xl font-mono font-bold text-[#FFFFFF] tabular-nums block">
                    {kpi.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter & Sort Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {["ALL", "URL", "PDF", "DOCX", "LINKS", "VCARD", "WIFI", "TEXT"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`h-8 px-2.5 rounded-md border text-[11px] font-mono transition-all duration-150 cursor-pointer ${
                      filterType === t
                        ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                        : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label={isAr ? "ترتيب" : "Sort"}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "scans")}
                  className="h-9 px-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                >
                  <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
                  <option value="scans">{isAr ? "الأكثر مسحاً" : "Most Scanned"}</option>
                </select>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-[#71717A] absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? "بحث..." : "Search..."}
                    className="w-full h-9 ps-9 pe-3 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>
              </div>
            </div>

            {/* Clean Registry Table */}
            <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#09090B] text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                  <th className="py-3 px-4 text-start">{isAr ? "الكود" : "Code"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "العنوان والوجهة" : "Title"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "النوع" : "Type"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "الحماية" : "Security"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المسحات" : "Scans"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="py-3 px-4 text-end">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-xs font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#71717A]">
                      {isAr ? "جارٍ التحميل..." : "Loading..."}
                    </td>
                  </tr>
                ) : visibleQrs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#71717A]">
                      {isAr ? "لا توجد نتائج." : "No matching codes."}
                    </td>
                  </tr>
                ) : (
                  visibleQrs.map((item) => {
                    const active = item.isActive && !item.isExpired && !item.isLimitReached;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#16161A] transition-colors duration-150"
                      >
                        <td className="py-3 px-4 font-bold text-[#FFFFFF] whitespace-nowrap" dir="ltr">
                          {item.shortCode}
                        </td>
                        <td className="py-3 px-4 font-sans text-start max-w-[240px]">
                          <div className="font-bold text-[#FFFFFF] truncate">
                            {item.title}
                          </div>
                          <div dir="ltr" className="text-[11px] font-mono text-[#71717A] truncate">
                            {item.fileName || item.destinationUrl || `/q/${item.shortCode}`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[10px] text-[#FFFFFF]">
                            {item.payloadType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {item.hasPin && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#09090B] text-[10px] font-bold">
                                <Lock className="w-2.5 h-2.5" />
                                PIN
                              </span>
                            )}
                            {item.biometricEnabled && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#09090B] text-[10px] font-bold">
                                <Fingerprint className="w-2.5 h-2.5" />
                                BIO
                              </span>
                            )}
                            {!item.hasPin && !item.biometricEnabled && (
                              <span className="text-[#71717A] text-[10px]">OPEN</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-[#FAFAFA]">
                          {item.scanCount}
                          {item.maxScans ? ` / ${item.maxScans}` : " / ∞"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[10px]">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                active ? "bg-[#10B981]" : "bg-[#52525B]"
                              }`}
                            />
                            <span>
                              {active
                                ? isAr
                                  ? "نشط"
                                  : "Active"
                                : item.isExpired
                                ? isAr
                                  ? "منتهي"
                                  : "Expired"
                                : item.isLimitReached
                                ? isAr
                                  ? "مكتمل"
                                  : "Limit"
                                : isAr
                                ? "موقوف"
                                : "Paused"}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5" dir="ltr">
                            <button
                              type="button"
                              onClick={() => openInspectModal(item)}
                              title={isAr ? "معاينة وسجل المسح" : "Inspect QR & Scans"}
                              className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title={isAr ? "تعديل" : "Edit"}
                              className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPng(item)}
                              title="PNG"
                              className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              title={item.isActive ? "Pause" : "Activate"}
                              className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/q/${item.shortCode}`}
                              target="_blank"
                              title={isAr ? "فتح" : "Open"}
                              className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title={isAr ? "حذف" : "Delete"}
                              className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {activeTab === "SCAN" && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
              <SegmentedLedBar
                level={cameraActive ? 65 : cameraError ? 25 : decodedResult ? 100 : 15}
                status={cameraActive ? "working" : cameraError ? "error" : decodedResult ? "success" : "idle"}
                label={cameraActive ? "LIVE SCAN" : decodedResult ? "DECODED" : "SCANNER"}
                metricText={cameraActive ? facingMode.toUpperCase() : undefined}
              />
              <div className="p-5 sm:p-6 space-y-4">
                <div className="aspect-video w-full rounded-xl border border-[#27272A] bg-[#09090B] relative overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {!cameraActive && (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-14 h-14 rounded-2xl border border-[#27272A] bg-[#121215] flex items-center justify-center mx-auto">
                        <QrCode className="w-7 h-7 text-[#FFFFFF]" />
                      </div>
                      <p className="text-xs font-mono text-[#A1A1AA]">
                        {isAr
                          ? "شغّل الكاميرا لمسح أي QR أو ارفع صورة كود QR مباشرة"
                          : "Start camera feed or upload a QR image to decode"}
                      </p>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-[#FFFFFF] rounded-xl" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="flex-1 h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isAr ? "تشغيل الكاميرا" : "Start Camera"}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="flex-1 h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase cursor-pointer"
                      >
                        {isAr ? "إيقاف الكاميرا" : "Stop Camera"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = facingMode === "environment" ? "user" : "environment";
                          setFacingMode(next);
                          startCamera(next);
                        }}
                        className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                        title="Flip Camera"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="h-10 px-4 rounded-lg bg-[#09090B] text-[#FFFFFF] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center gap-2 transition-all duration-150 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isAr ? "فحص صورة QR" : "Upload QR Image"}</span>
                  </button>
                </div>

                {cameraError && (
                  <div className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#A1A1AA] flex items-center gap-2 text-start">
                    <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {decodedResult && (
                  <div className="p-4 rounded-lg border border-[#FFFFFF] bg-[#09090B] space-y-3 text-start">
                    <span className="text-[10px] font-mono uppercase text-[#71717A] block">
                      {isAr ? "النتيجة المقروءة" : "DECODED PAYLOAD"}
                    </span>
                    <div dir="ltr" className="text-xs font-mono text-[#FFFFFF] break-all">
                      {decodedResult}
                    </div>
                    <div className="flex items-center gap-2">
                      {/^https?:\/\//i.test(decodedResult) && (
                        <a
                          href={decodedResult}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3.5 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs inline-flex items-center gap-1.5"
                        >
                          <span>{isAr ? "فتح الوجهة" : "Open URL"}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyScan}
                        className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                      >
                        {copiedScan ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleManualLookup}
              className="rounded-xl border border-[#27272A] bg-[#121215] p-5 space-y-3 text-start"
            >
              <label className="text-xs font-mono text-[#A1A1AA] block">
                {isAr
                  ? "أو أدخل كود taptag. مباشرة (مثال: TT-DOCS1)"
                  : "Or enter a taptag. code directly (e.g. TT-DOCS1)"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="TT-DOCS1"
                  className="flex-1 h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isAr ? "فتح" : "Open"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "SHARES" && (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#FFFFFF]">
                {isAr ? "الملفات المشفرة النشطة" : "Encrypted File Vaults"}
              </span>
              <button
                type="button"
                onClick={loadData}
                aria-label="Refresh shares"
                className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingShares ? (
              <div className="py-10 text-center text-xs font-mono text-[#71717A]">
                {isAr ? "جارٍ التحميل..." : "Loading..."}
              </div>
            ) : shares.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs font-mono text-[#71717A]">
                  {isAr ? "لا توجد مشاركات مشفرة بعد." : "No encrypted shares yet."}
                </p>
                <Link
                  href="/?tool=share"
                  className="inline-flex h-9 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? "إنشاء مشاركة مشفرة" : "Create Secure Share"}</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shares.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-[#27272A] bg-[#09090B] flex items-center justify-between gap-3 text-start"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            s.isUsable ? "bg-[#10B981]" : "bg-[#52525B]"
                          }`}
                        />
                        <span className="text-sm font-bold text-[#FFFFFF] truncate">{s.title}</span>
                      </div>
                      <div dir="ltr" className="text-[11px] font-mono text-[#71717A] mt-1 flex flex-wrap gap-2">
                        <span>{s.shareCode}</span>
                        <span>· {Math.max(1, Math.ceil(s.fileSize / 1024))} KB</span>
                        {s.isEncrypted && <span>· E2EE</span>}
                        {s.burnAfterRead && <span>· 1x BURN</span>}
                        <span>· DL {s.downloadCount}{s.maxDownloads ? `/${s.maxDownloads}` : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
                      <button
                        type="button"
                        onClick={() => handleToggleShare(s)}
                        title={s.isActive ? "Pause" : "Resume"}
                        className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/s/${s.shareCode}${cachedKeyFragments[s.shareCode] || ""}`}
                        target="_blank"
                        className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteShare(s)}
                        title="Delete"
                        className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* INSPECT QR & ANALYTICS MODAL */}
      {inspectingQr && (
        <div className="fixed inset-0 z-50 bg-[#09090B]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden text-start">
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                <div>
                  <h2 className="text-lg font-display font-bold text-[#FFFFFF]">
                    {inspectingQr.title}
                  </h2>
                  <span className="text-xs font-mono text-[#71717A]" dir="ltr">
                    /q/{inspectingQr.shortCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingQr(null)}
                  className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-4 flex flex-col items-center gap-2">
                <QrRenderMatrix
                  value={`${typeof window !== "undefined" ? window.location.origin : "https://taptag.one"}/q/${inspectingQr.shortCode}`}
                  logoPreset={inspectingQr.logoPreset}
                  logoDataUrl={inspectingQr.logoDataUrl}
                  moduleShape={inspectingQr.qrStyle?.moduleShape || "square"}
                  sizeClass="w-44 h-44"
                />
                {inspectingQr.frameCaption && (
                  <div className="px-3 py-1 rounded bg-[#09090B] text-[#FFFFFF] text-xs font-bold">
                    {inspectingQr.frameCaption}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2" dir="ltr">
                  <button
                    type="button"
                    onClick={() => handleDownloadPng(inspectingQr)}
                    className="h-9 px-3 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs cursor-pointer"
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSvg(inspectingQr)}
                    className="h-9 px-3 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono font-bold text-xs cursor-pointer"
                  >
                    SVG
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleResetScans(inspectingQr)}
                  className="h-9 px-3 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isAr ? "تصفير العداد" : "Reset Scans"}</span>
                </button>
              </div>

              <div className="border-t border-[#27272A] pt-3 space-y-2">
                <span className="text-[11px] font-mono text-[#71717A] block">
                  {isAr ? "أحدث عمليات المسح لهذا الكود" : "Recent Scans"}
                </span>
                {inspectScans.length === 0 ? (
                  <div className="text-xs font-mono text-[#52525B]">
                    {isAr ? "لا توجد قراءات مسجلة." : "No recorded scans yet."}
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto divide-y divide-[#27272A] border border-[#27272A] rounded-lg bg-[#09090B] text-[11px] font-mono">
                    {inspectScans.map((s) => (
                      <div key={s.id} className="px-3 py-2 flex items-center justify-between gap-2">
                        <span className="text-[#FFFFFF]">{s.deviceOs}</span>
                        <span className="text-[#A1A1AA]">{s.accessResult}</span>
                        <span className="text-[#71717A] tabular-nums" dir="ltr">
                          {new Date(s.createdAt).toISOString().substring(11, 19)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC EDIT MODAL */}
      {editingQr && (
        <div className="fixed inset-0 z-50 bg-[#09090B]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden text-start">
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                <div>
                  <h2 className="text-lg font-display font-bold text-[#FFFFFF]">
                    {isAr ? "تحديث الوجهة بدون إعادة طباعة" : "Update Dynamic Target"}
                  </h2>
                  <span className="text-[11px] font-mono text-[#71717A]">
                    {editingQr.shortCode} · {editingQr.payloadType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingQr(null)}
                  className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#71717A] block mb-1">
                    {isAr ? "العنوان" : "Title"}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-sans text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>

                {(editingQr.payloadType === "URL" ||
                  editingQr.payloadType === "PDF" ||
                  editingQr.payloadType === "DOCX") && (
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#71717A] block mb-1">
                      {isAr ? "الرابط المباشر" : "Destination URL"}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                )}

                {(editingQr.payloadType === "PDF" || editingQr.payloadType === "DOCX") && (
                  <div>
                    <input
                      ref={editFileRef}
                      type="file"
                      accept={editingQr.payloadType === "PDF" ? ".pdf" : ".doc,.docx"}
                      onChange={handleEditFilePick}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileRef.current?.click()}
                      className="h-9 px-3 rounded-lg bg-[#09090B] border border-[#27272A] hover:border-[#FFFFFF] text-xs font-mono text-[#FFFFFF] inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {editFileName
                          ? `${isAr ? "استبدال:" : "Replace:"} ${editFileName}`
                          : isAr
                          ? "رفع ملف بديل"
                          : "Upload Replacement File"}
                      </span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#71717A] block mb-1">
                      {isAr ? "نص أسفل الكود" : "Frame Caption"}
                    </label>
                    <input
                      type="text"
                      value={editFrameCaption}
                      onChange={(e) => setEditFrameCaption(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-[#FFFFFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#71717A] block mb-1">
                      {isAr ? "نمط النقاط" : "Module Shape"}
                    </label>
                    <select
                      value={editModuleShape}
                      onChange={(e) => setEditModuleShape(e.target.value as "square" | "dots")}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                    >
                      <option value="square">{isAr ? "مربعات" : "Square"}</option>
                      <option value="dots">{isAr ? "نقاط" : "Dots"}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#71717A] block mb-1">
                      {isAr ? "تحديث قفل PIN" : "PIN Policy"}
                    </label>
                    <select
                      value={editPinAction}
                      onChange={(e) =>
                        setEditPinAction(e.target.value as "keep" | "set" | "clear")
                      }
                      className="w-full h-9 px-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                    >
                      <option value="keep">
                        {editingQr.hasPin
                          ? isAr
                            ? "الإبقاء على PIN"
                            : "Keep PIN"
                          : isAr
                          ? "بدون PIN"
                          : "No PIN"}
                      </option>
                      <option value="set">{isAr ? "تعيين PIN" : "Set PIN"}</option>
                      <option value="clear">{isAr ? "إلغاء PIN" : "Remove PIN"}</option>
                    </select>
                    {editPinAction === "set" && (
                      <input
                        type="password"
                        dir="ltr"
                        value={editNewPin}
                        onChange={(e) => setEditNewPin(e.target.value)}
                        placeholder="PIN..."
                        className="mt-2 w-full h-9 px-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#71717A] block mb-1">
                      {isAr ? "حد المسح" : "Max Scans"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      dir="ltr"
                      value={editMaxScans}
                      onChange={(e) => setEditMaxScans(e.target.value)}
                      placeholder="∞"
                      className="w-full h-9 px-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                    />
                    <label className="mt-2.5 inline-flex items-center gap-2 text-xs font-mono text-[#FFFFFF] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editBio}
                        onChange={(e) => setEditBio(e.target.checked)}
                        className="accent-white"
                      />
                      <span>{isAr ? "قفل البصمة" : "Biometric"}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingQr(null)}
                  className="h-10 px-4 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#A1A1AA] hover:text-[#FFFFFF] cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="h-10 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit
                    ? isAr
                      ? "جارٍ الحفظ..."
                      : "Saving..."
                    : isAr
                    ? "حفظ التعديلات"
                    : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer lang={lang} />
    </div>
  );
}
