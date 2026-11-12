"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { QrRenderMatrix, buildExportQrPngDataUrl, buildExportQrSvg } from "@/components/qr/QrRenderMatrix";
import type { SmartQrPublicDTO } from "@/lib/smart-qr";
import type { Language } from "@/types";

interface ScanLogRow {
  id: string;
  deviceOs: string;
  accessResult: string;
  createdAt: string;
}

export function DashboardClient() {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  const [qrs, setQrs] = useState<SmartQrPublicDTO[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    protected: 0,
    totalScans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "scans">("newest");
  const [searchQuery, setSearchQuery] = useState("");

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
      const res = await fetch("/api/qr", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setQrs(data.qrs || []);
      if (data.stats) setStats(data.stats);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#27272A]">
          <div className="text-start">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#FFFFFF]">
              {isAr ? "إدارة الأكواد" : "QR Codes"}
            </h1>
          </div>

          <Link
            href="/#qr-workspace"
            className="h-10 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إنشاء QR جديد" : "New QR"}</span>
          </Link>
        </div>

        {/* 4 Monochrome KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: "total", label: isAr ? "إجمالي الأكواد" : "Total", val: stats.total, level: 80 },
            { key: "active", label: isAr ? "النشطة" : "Active", val: stats.active, level: 95, dot: true },
            { key: "protected", label: isAr ? "المحمية" : "Protected", val: stats.protected, level: 70 },
            { key: "scans", label: isAr ? "إجمالي المسح" : "Scans", val: stats.totalScans, level: 88 },
          ].map((kpi) => (
            <div
              key={kpi.key}
              className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden"
            >
              <SegmentedLedBar level={kpi.level} cells={16} />
              <div className="p-4 text-start space-y-1">
                <span className="text-[11px] font-mono text-[#A1A1AA] flex items-center gap-1.5">
                  {kpi.dot && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                  <span>{kpi.label}</span>
                </span>
                <span className="text-2xl font-mono font-bold text-[#FFFFFF] tabular-nums block">
                  {kpi.val}
                </span>
              </div>
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

        {/* Registry Table */}
        <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
          <SegmentedLedBar level={visibleQrs.length > 0 ? 90 : 30} cells={30} />
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
      </main>

      {/* INSPECT QR & ANALYTICS MODAL */}
      {inspectingQr && (
        <div className="fixed inset-0 z-50 bg-[#09090B]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden text-start">
            <SegmentedLedBar level={95} cells={24} label={inspectingQr.shortCode} active />
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
            <SegmentedLedBar level={90} cells={24} label={editingQr.shortCode} active />
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
