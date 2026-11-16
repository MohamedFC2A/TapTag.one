"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Link2,
  Film,
  Image as ImageIcon,
  FileText,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Loader2,
  RefreshCw,
  Trash2,
  Download,
  Users,
  MousePointerClick,
  Eye,
  Smartphone,
  Globe,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { Language } from "@/types";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { copyTextReliable } from "@/lib/clipboard";
import { dispatchToQrStudio } from "@/lib/mata-events";
import type {
  BreakdownBucket,
  CustomerContentType,
  CustomerLinkVisitRecord,
  CustomerRedirectMode,
  CustomerSmartLinkRecord,
} from "@/lib/customer-links";

interface CustomerAnalyticsPayload {
  links: CustomerSmartLinkRecord[];
  recentVisits: CustomerLinkVisitRecord[];
  breakdown: {
    osFamily: BreakdownBucket[];
    deviceType: BreakdownBucket[];
    browserFamily: BreakdownBucket[];
    referrerChannel: BreakdownBucket[];
    timezoneRegion: BreakdownBucket[];
    language: BreakdownBucket[];
  };
  summary: {
    totalLinks: number;
    activeLinks: number;
    totalVisits: number;
    uniqueVisitors: number;
    ctaClicks: number;
  };
}

interface CustomerLinksStudioProps {
  lang: Language;
  headerTabs?: React.ReactNode;
}

export function CustomerLinksStudio({ lang, headerTabs }: CustomerLinksStudioProps) {
  const isAr = lang === "ar";
  const [contentType, setContentType] = useState<CustomerContentType>("URL");
  const [redirectMode, setRedirectMode] = useState<CustomerRedirectMode>("PREVIEW");
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [customAlias, setCustomAlias] = useState("");

  const [creating, setCreating] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CustomerAnalyticsPayload | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchAnalytics = useCallback(async (filterCode?: string) => {
    setLoadingStats(true);
    try {
      const url = filterCode
        ? `/api/links?code=${encodeURIComponent(filterCode)}`
        : "/api/links";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as CustomerAnalyticsPayload;
        setAnalytics(data);
      }
    } catch {
      // keep existing UI state on transient error
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(selectedCode || undefined);
  }, [fetchAnalytics, selectedCode]);

  const handleCopy = async (text: string, keyId = text) => {
    const ok = await copyTextReliable(text);
    if (ok) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 1700);
    }
  };

  const buildPublicUrl = (code: string) => `${origin}/l/${code}`;

  const handleCreateLink = async () => {
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(isAr ? "أدخل عنواناً للرابط." : "Please enter a title.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          contentType,
          redirectMode,
          destinationUrl: destinationUrl.trim() || null,
          mediaUrl: mediaUrl.trim() || null,
          contentBody: contentBody.trim() || null,
          customAlias: customAlias.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.link) {
        setError(data.error || "Failed to create link");
        return;
      }

      const newCode = data.link.code as string;
      setCreatedCode(newCode);
      setSelectedCode(newCode);
      setTitle("");
      setDestinationUrl("");
      setMediaUrl("");
      setContentBody("");
      setCustomAlias("");
      await fetchAnalytics(newCode);
    } catch {
      setError(isAr ? "تعذر إنشاء الرابط الذكي." : "Network error while creating link.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLink = async (code: string) => {
    try {
      const res = await fetch(`/api/links/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedCode === code) setSelectedCode("");
        if (createdCode === code) setCreatedCode(null);
        fetchAnalytics(selectedCode === code ? undefined : selectedCode || undefined);
      }
    } catch {
      // ignore
    }
  };

  const buildAnalyticsReportText = () => {
    if (!analytics) return "";
    const { summary, breakdown, recentVisits } = analytics;
    return [
      `taptag. | Mata AI — Customer Audience Analytics${selectedCode ? ` (${selectedCode})` : ""}`,
      `Total Visits: ${summary.totalVisits} | Unique Visitors: ${summary.uniqueVisitors} | CTA Clicks: ${summary.ctaClicks} | Active Links: ${summary.activeLinks}`,
      `OS: ${breakdown.osFamily.map((b) => `${b.label}(${b.count})`).join(", ") || "N/A"}`,
      `Devices: ${breakdown.deviceType.map((b) => `${b.label}(${b.count})`).join(", ") || "N/A"}`,
      `Browsers: ${breakdown.browserFamily.map((b) => `${b.label}(${b.count})`).join(", ") || "N/A"}`,
      `Channels: ${breakdown.referrerChannel.map((b) => `${b.label}(${b.count})`).join(", ") || "N/A"}`,
      `Timezones: ${breakdown.timezoneRegion.map((b) => `${b.label}(${b.count})`).join(", ") || "N/A"}`,
      "",
      ...recentVisits
        .slice(0, 15)
        .map(
          (v) =>
            `[${v.code}] ${v.visitorHash} | ${v.deviceType}/${v.osFamily}/${v.browserFamily} | ${
              v.language || "-"
            } | ${v.timezoneRegion || "-"} | ${v.referrerChannel || "Direct"} | ${v.viewportClass || "-"}`
        ),
    ].join("\n");
  };

  const handleExportCsv = () => {
    if (!analytics) return;
    const header =
      "Code,VisitorHash,Unique,DeviceType,OS,Browser,Language,Timezone,Viewport,ColorScheme,Referrer,EngagedCTA,Timestamp\n";
    const rows = analytics.recentVisits
      .map(
        (v) =>
          `"${v.code}","${v.visitorHash}",${v.isUnique},"${v.deviceType}","${v.osFamily}","${v.browserFamily}","${
            v.language || ""
          }","${v.timezoneRegion || ""}","${v.viewportClass || ""}","${v.colorScheme || ""}","${
            v.referrerChannel || ""
          }",${v.engagedCta},"${v.createdAt}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mata-customer-analytics${selectedCode ? `-${selectedCode}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeShowcaseCode = createdCode || selectedCode || analytics?.links[0]?.code || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Smart Customer Link Builder */}
      <div className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
        <div className="p-5 space-y-4 text-start">
          {headerTabs}

          {/* Content Type Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-[#A1A1AA] block">
              {isAr ? "نوع المحتوى داخل الرابط" : "Link Content Type"}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ["URL", Link2, isAr ? "رابط" : "URL"],
                  ["VIDEO", Film, isAr ? "فيديو" : "Video"],
                  ["IMAGE", ImageIcon, isAr ? "صورة" : "Image"],
                  ["TEXT", FileText, isAr ? "نص" : "Text"],
                ] as const
              ).map(([type, Icon, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContentType(type)}
                  className={`h-9 px-2 rounded-lg border text-[11px] font-mono inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    contentType === type
                      ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                      : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#A1A1AA] block">
              {isAr ? "عنوان العرض / الحملة" : "Link Title / Campaign"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isAr ? "مثال: عرض إطلاق المنتج الجديد" : "e.g. Product Launch Video"}
              className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
            />
          </div>

          {(contentType === "VIDEO" || contentType === "IMAGE") && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#A1A1AA] block">
                {contentType === "VIDEO"
                  ? isAr
                    ? "رابط الفيديو (YouTube أو MP4 مباشر)"
                    : "Video URL (YouTube or MP4)"
                  : isAr
                  ? "رابط الصورة المباشر (HTTPS)"
                  : "Image URL (HTTPS)"}
              </label>
              <input
                type="url"
                dir="ltr"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={
                  contentType === "VIDEO"
                    ? "https://youtu.be/... or https://.../video.mp4"
                    : "https://.../image.jpg"
                }
                className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
          )}

          {contentType !== "TEXT" && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#A1A1AA] block">
                {contentType === "URL"
                  ? isAr
                    ? "رابط الوجهة النهائي (موقع / متجر / فيديو)"
                    : "Target Destination URL"
                  : isAr
                  ? "رابط إضافي عند الضغط (اختياري)"
                  : "Optional Destination Link"}
              </label>
              <input
                type="url"
                dir="ltr"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://example.com/offer"
                className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
          )}

          {(contentType === "TEXT" || contentType === "VIDEO" || contentType === "IMAGE") && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#A1A1AA] block">
                {contentType === "TEXT"
                  ? isAr
                    ? "النص أو الإعلان المراد مشاركته"
                    : "Text Content / Announcement"
                  : isAr
                  ? "وصف نصي مرافق (اختياري)"
                  : "Caption / Description (optional)"}
              </label>
              <textarea
                rows={3}
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                placeholder={
                  isAr
                    ? "اكتب رسالتك أو تفاصيل العرض للعملاء..."
                    : "Enter announcement text or offer caption..."
                }
                className="w-full p-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#71717A] block">
                {isAr ? "وضع الفتح" : "Open Mode"}
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setRedirectMode("PREVIEW")}
                  className={`h-8 rounded border text-[10px] font-mono cursor-pointer ${
                    redirectMode === "PREVIEW"
                      ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                      : "bg-[#09090B] text-[#A1A1AA] border-[#27272A]"
                  }`}
                >
                  {isAr ? "معاينة" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => setRedirectMode("DIRECT")}
                  className={`h-8 rounded border text-[10px] font-mono cursor-pointer ${
                    redirectMode === "DIRECT"
                      ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                      : "bg-[#09090B] text-[#A1A1AA] border-[#27272A]"
                  }`}
                >
                  {isAr ? "تحويل فوري" : "Direct"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#71717A] block">
                {isAr ? "كود مخصص (اختياري)" : "Custom Code (opt.)"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder="PROMO-26"
                className="w-full h-8 px-2.5 rounded bg-[#09090B] border border-[#27272A] text-[11px] font-mono text-[#FFFFFF]"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateLink}
            disabled={creating}
            className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            <span>
              {creating
                ? isAr
                  ? "جارٍ توليد الرابط..."
                  : "Generating Link..."
                : isAr
                ? "إنشاء رابط الموقع الذكي"
                : "Create Smart Customer Link"}
            </span>
          </button>

          {/* Active Link Bar */}
          {activeShowcaseCode && (
            <div className="p-3.5 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#A1A1AA]">
                <span>{isAr ? "الرابط التابع للموقع جاهز:" : "Branded Site Link:"}</span>
                <span className="text-[#10B981] font-bold">{activeShowcaseCode}</span>
              </div>
              <div
                dir="ltr"
                className="p-2 rounded bg-[#121215] border border-[#27272A] text-[11px] font-mono text-[#FFFFFF] truncate select-all"
              >
                {buildPublicUrl(activeShowcaseCode)}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(buildPublicUrl(activeShowcaseCode), "brand-url")}
                  className="h-8 px-2 rounded-md border border-[#27272A] bg-[#121215] text-[10px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copiedKey === "brand-url" ? (
                    <Check className="w-3 h-3 text-[#10B981]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{isAr ? "نسخ" : "Copy"}</span>
                </button>
                <Link
                  href={`/l/${activeShowcaseCode}`}
                  target="_blank"
                  className="h-8 px-2 rounded-md border border-[#27272A] bg-[#121215] text-[10px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{isAr ? "فتح" : "Open"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    dispatchToQrStudio({
                      payloadType: "URL",
                      title: `Link ${activeShowcaseCode}`,
                      destinationUrl: buildPublicUrl(activeShowcaseCode),
                      logoPreset: "MATA",
                    })
                  }
                  className="h-8 px-2 rounded-md bg-[#FFFFFF] text-[#09090B] text-[10px] font-mono font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3 h-3" />
                  <span>QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Privacy-Safe Customer Audience Analytics Dashboard */}
      <div className="lg:col-span-7 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
        <SegmentedLedBar
          level={loadingStats ? 55 : analytics && analytics.summary.totalVisits > 0 ? 100 : 25}
          status={loadingStats ? "working" : analytics && analytics.summary.totalVisits > 0 ? "success" : "idle"}
          label={selectedCode ? `AUDIENCE · ${selectedCode}` : "AUDIENCE INSIGHTS"}
          metricText={
            analytics
              ? `${analytics.summary.totalVisits} VISITS · ${analytics.summary.uniqueVisitors} UNIQUE`
              : undefined
          }
        />

        <div className="p-5 space-y-4 text-start">
          {/* Controls & KPI Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#27272A]">
            <div className="flex items-center gap-2">
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#FFFFFF]"
              >
                <option value="">{isAr ? "كل الروابط (إجمالي الجمهور)" : "All Customer Links"}</option>
                {analytics?.links.map((l) => (
                  <option key={l.id} value={l.code}>
                    {l.code} — {l.title} ({l.totalVisits})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchAnalytics(selectedCode || undefined)}
                title="Refresh analytics"
                className="w-8 h-8 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
              </button>
              {selectedCode && (
                <button
                  type="button"
                  onClick={() => handleDeleteLink(selectedCode)}
                  title="Delete selected link"
                  className="w-8 h-8 rounded-lg border border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5" dir="ltr">
              <button
                type="button"
                onClick={() => handleCopy(buildAnalyticsReportText(), "copy-analytics-report")}
                className="h-8 px-2.5 rounded-md border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "copy-analytics-report" ? (
                  <Check className="w-3 h-3 text-[#10B981]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === "copy-analytics-report" ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ التقرير" : "Copy Report"}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-8 px-2.5 rounded-md bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: Eye, labelAr: "إجمالي الزيارات", labelEn: "Total Visits", val: analytics?.summary.totalVisits ?? 0 },
              { icon: Users, labelAr: "عملاء فريدون", labelEn: "Unique Visitors", val: analytics?.summary.uniqueVisitors ?? 0 },
              { icon: MousePointerClick, labelAr: "نقرات الوجهة", labelEn: "CTA Clicks", val: analytics?.summary.ctaClicks ?? 0 },
              { icon: Link2, labelAr: "روابط نشطة", labelEn: "Active Links", val: analytics?.summary.activeLinks ?? 0 },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.labelEn} className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                    <span>{isAr ? kpi.labelAr : kpi.labelEn}</span>
                    <Icon className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  </div>
                  <span className="text-lg font-bold font-mono text-[#FFFFFF] tabular-nums block">
                    {kpi.val}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Breakdown Grid (OS, Devices, Browsers, Languages, Timezones, Channels) */}
          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2">
                <span className="text-[10px] font-mono text-[#A1A1AA] flex items-center gap-1.5">
                  <Smartphone className="w-3 h-3" />
                  <span>{isAr ? "أنظمة التشغيل والأجهزة" : "OS & Devices"}</span>
                </span>
                <div className="flex flex-wrap gap-1" dir="ltr">
                  {[...analytics.breakdown.osFamily, ...analytics.breakdown.deviceType]
                    .slice(0, 6)
                    .map((b, i) => (
                      <span
                        key={`${b.label}-${i}`}
                        className="px-2 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[10px] font-mono text-[#D4D4D8]"
                      >
                        {b.label}: {b.count}
                      </span>
                    ))}
                  {analytics.breakdown.osFamily.length === 0 && (
                    <span className="text-[10px] font-mono text-[#52525B]">—</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2">
                <span className="text-[10px] font-mono text-[#A1A1AA] flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  <span>{isAr ? "المتصفحات واللغات" : "Browsers & Languages"}</span>
                </span>
                <div className="flex flex-wrap gap-1" dir="ltr">
                  {[...analytics.breakdown.browserFamily, ...analytics.breakdown.language]
                    .slice(0, 6)
                    .map((b, i) => (
                      <span
                        key={`${b.label}-${i}`}
                        className="px-2 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[10px] font-mono text-[#D4D4D8]"
                      >
                        {b.label}: {b.count}
                      </span>
                    ))}
                  {analytics.breakdown.browserFamily.length === 0 && (
                    <span className="text-[10px] font-mono text-[#52525B]">—</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2">
                <span className="text-[10px] font-mono text-[#A1A1AA] flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{isAr ? "المناطق الزمنية والقنوات" : "Timezones & Channels"}</span>
                </span>
                <div className="flex flex-wrap gap-1" dir="ltr">
                  {[...analytics.breakdown.referrerChannel, ...analytics.breakdown.timezoneRegion]
                    .slice(0, 6)
                    .map((b, i) => (
                      <span
                        key={`${b.label}-${i}`}
                        className="px-2 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[10px] font-mono text-[#D4D4D8]"
                      >
                        {b.label}: {b.count}
                      </span>
                    ))}
                  {analytics.breakdown.referrerChannel.length === 0 && (
                    <span className="text-[10px] font-mono text-[#52525B]">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Customer Visits Feed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA]">
              <span>
                {isAr
                  ? `سجل زيارات العملاء المجهولة الهوية (${analytics?.recentVisits.length ?? 0})`
                  : `Privacy-Safe Audience Visits (${analytics?.recentVisits.length ?? 0})`}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#71717A]">
                <ShieldCheck className="w-3 h-3" />
                <span>SHA-256 Anonymized</span>
              </span>
            </div>

            {!analytics || analytics.recentVisits.length === 0 ? (
              <div className="p-6 rounded-xl border border-[#27272A] bg-[#09090B] text-center text-xs font-mono text-[#71717A]">
                {isAr
                  ? "أنشئ رابطاً وشاركه أو افتحه لتظهر تحليلات الجمهور لحظياً هنا."
                  : "Create and open a smart link to see aggregated audience insights appear live."}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto" dir="ltr">
                {analytics.recentVisits.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-lg border border-[#27272A] bg-[#09090B] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[#FFFFFF] font-bold">
                        {v.code}
                      </span>
                      <span className="text-[#A1A1AA]">{v.visitorHash}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] ${
                          v.isUnique
                            ? "bg-[#10B981]/15 text-[#10B981]"
                            : "bg-[#27272A] text-[#A1A1AA]"
                        }`}
                      >
                        {v.isUnique ? "UNIQUE" : "REPEAT"}
                      </span>
                      <span className="text-[#FFFFFF]">
                        {v.deviceType} · {v.osFamily} · {v.browserFamily}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#A1A1AA] flex-wrap">
                      <span>{v.language || "—"}</span>
                      <span>· {v.timezoneRegion || "—"}</span>
                      <span>· {v.viewportClass || "—"}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[#D4D4D8]">
                        {v.referrerChannel || "Direct"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
