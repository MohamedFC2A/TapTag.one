"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Link2,
  Phone,
  Mail,
  MessageCircle,
  Copy,
  Check,
  Download,
  QrCode,
  Shield,
  Globe,
  Loader2,
  FileText,
  ExternalLink,
  ShieldCheck,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Code2,
  RefreshCw,
} from "lucide-react";
import type { Language } from "@/types";
import type { ExtractedContactResult } from "@/lib/phone-parser";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { MataSectionHeader } from "@/components/ui/MataLogo";
import { CustomerLinksStudio } from "@/components/sections/CustomerLinksStudio";
import { copyTextReliable } from "@/lib/clipboard";
import { AUTH_PRODUCTION_SNIPPETS, CodeSnippetFile } from "@/lib/auth-code-snippets";
import {
  dispatchToQrStudio,
  dispatchToSecureShare,
  ExtractPrefillEventDetail,
} from "@/lib/mata-events";

interface LinkExtractorSectionProps {
  lang: Language;
}

interface AuthSimulationResponse {
  success: boolean;
  status: string;
  errorCode?: string;
  resolvedRedirect: string;
  safeNext: string;
  wasSanitized?: boolean;
  sig?: string | null;
  sessionContext?: {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    deviceType: string;
    osName: string;
    browserName: string;
  };
  rateLimit?: {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  };
  user?: {
    id: string;
    email: string;
    onboardingStep: number;
    onboardingCompleted: boolean;
    loginCount: number;
  };
}

interface AuthAnalyticsData {
  utmStats: { source: string; total: number }[];
  deviceStats: { device: string; total: number }[];
  summary: {
    totalUsers: number;
    completedUsers: number;
    incompleteUsers: number;
    totalEvents: number;
  };
}

export function LinkExtractorSection({ lang }: LinkExtractorSectionProps) {
  const isAr = lang === "ar";
  const [mode, setMode] = useState<"CUSTOMER_LINKS" | "URL" | "TEXT" | "AUTH_ONBOARDING">(
    "CUSTOMER_LINKS"
  );
  const [urlInput, setUrlInput] = useState("https://wa.me/201012345678?text=Hello");
  const [rawTextInput, setRawTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedContactResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auth Redirect & Onboarding state
  const [authEmail, setAuthEmail] = useState("alex@matanygroup.com");
  const [authNextInput, setAuthNextInput] = useState("/dashboard");
  const [authPreset, setAuthPreset] = useState<
    "NEW_USER" | "INCOMPLETE_STEP_2" | "COMPLETED" | "EXPIRED" | "LIVE"
  >("NEW_USER");
  const [utmSource, setUtmSource] = useState("qr_campaign");
  const [utmMedium, setUtmMedium] = useState("nfc_tap");
  const [utmCampaign, setUtmCampaign] = useState("launch_2026");
  const [authLoading, setAuthLoading] = useState(false);
  const [authResult, setAuthResult] = useState<AuthSimulationResponse | null>(null);
  const [analytics, setAnalytics] = useState<AuthAnalyticsData | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<CodeSnippetFile["id"]>("middleware");

  const handleCopy = async (text: string, keyId = text) => {
    const ok = await copyTextReliable(text);
    if (ok) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 1600);
    }
  };

  const loadAuthAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/onboarding");
      if (res.ok) {
        const data = (await res.json()) as AuthAnalyticsData;
        setAnalytics(data);
      }
    } catch {
      // ignore background fetch errors
    }
  }, []);

  useEffect(() => {
    if (mode === "AUTH_ONBOARDING") {
      loadAuthAnalytics();
    }
  }, [mode, loadAuthAnalytics]);

  const runExtraction = async (
    overrideUrl?: string,
    overrideMode?: "URL" | "TEXT",
    overrideText?: string
  ) => {
    const activeMode = overrideMode || (mode === "TEXT" ? "TEXT" : "URL");
    const targetUrl = (overrideUrl ?? urlInput).trim();
    const targetText = (overrideText ?? rawTextInput).trim();

    setError(null);
    if (activeMode === "URL" && !targetUrl) {
      setError(isAr ? "أدخل رابط المشاركة أولاً." : "Enter a share link URL.");
      return;
    }
    if (activeMode === "TEXT" && !targetText) {
      setError(isAr ? "ألصق النص أو كود الصفحة." : "Paste text or HTML content.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: activeMode,
          url: activeMode === "URL" ? targetUrl : undefined,
          rawText: activeMode === "TEXT" ? targetText : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        setError(data.error || "Extraction failed");
        return;
      }
      setResult(data.result);
    } catch {
      setError(isAr ? "تعذر الاتصال بالخادم للاستخراج." : "Network error during extraction.");
    } finally {
      setLoading(false);
    }
  };

  const runAuthSimulation = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail.trim() || "user@matanygroup.com",
          redirect_to: authNextInput.trim() || "/dashboard",
          utm_source: utmSource.trim() || undefined,
          utm_medium: utmMedium.trim() || undefined,
          utm_campaign: utmCampaign.trim() || undefined,
          ...(authPreset === "EXPIRED"
            ? { simulateError: "token_expired" }
            : { presetState: authPreset }),
        }),
      });
      const data = (await res.json()) as AuthSimulationResponse;
      setAuthResult(data);
      loadAuthAnalytics();
    } catch {
      setError(isAr ? "تعذر اختبار التوجيه المصادقي." : "Failed to run auth routing check.");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<ExtractPrefillEventDetail>).detail;
      if (detail?.url) {
        setMode("URL");
        setUrlInput(detail.url);
        runExtraction(detail.url, "URL");
      } else if (detail?.text) {
        setMode("TEXT");
        setRawTextInput(detail.text);
        runExtraction(undefined, "TEXT", detail.text);
      }
    };
    window.addEventListener("mata:prefill-extract", onPrefill);
    return () => window.removeEventListener("mata:prefill-extract", onPrefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildAllExtractedText = (): string => {
    if (!result) return "";
    const parts: string[] = [];
    if (result.metadata.title) parts.push(`Title: ${result.metadata.title}`);
    if (result.sourceUrl) parts.push(`URL: ${result.sourceUrl}`);
    if (result.phones.length > 0) {
      parts.push("Phones:\n" + result.phones.map((p) => `${p.normalized} (${p.countryHint})`).join("\n"));
    }
    if (result.emails.length > 0) {
      parts.push("Emails:\n" + result.emails.join("\n"));
    }
    if (result.socialLinks.length > 0) {
      parts.push("Links:\n" + result.socialLinks.map((s) => `${s.platform}: ${s.url}`).join("\n"));
    }
    return parts.join("\n\n");
  };

  const handleDownloadVcf = () => {
    if (!result) return;
    const title = result.metadata.title || "AI mata Extracted Contact";
    const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${title}`];
    result.phones.forEach((p) => lines.push(`TEL;TYPE=CELL:${p.normalized}`));
    result.emails.forEach((em) => lines.push(`EMAIL:${em}`));
    if (result.sourceUrl) lines.push(`URL:${result.sourceUrl}`);
    lines.push("END:VCARD");

    const blob = new Blob([lines.join("\n")], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mata-extracted-contacts.vcf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!result) return;
    const header = "Type,Value,CountryOrPlatform,Source\n";
    const rows = [
      ...result.phones.map((p) => `PHONE,"${p.normalized}","${p.countryHint}","${p.source}"`),
      ...result.emails.map((e) => `EMAIL,"${e}","","page"`),
      ...result.socialLinks.map((s) => `SOCIAL,"${s.url}","${s.platform}","href"`),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mata-extracted-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReportToVault = () => {
    if (!result) return;
    const reportJson = JSON.stringify(result, null, 2);
    const file = new File([reportJson], "mata-extracted-report.json", {
      type: "application/json",
    });
    dispatchToSecureShare(file);
  };

  const currentSnippet =
    AUTH_PRODUCTION_SNIPPETS.find((s) => s.id === activeSnippet) || AUTH_PRODUCTION_SNIPPETS[0];

  const headerTabs = (
    <div className="grid grid-cols-3 gap-1.5">
      <button
        type="button"
        onClick={() => setMode("CUSTOMER_LINKS")}
        className={`h-9 px-2 rounded-lg border text-[11px] font-mono flex items-center justify-center gap-1 cursor-pointer ${
          mode === "CUSTOMER_LINKS"
            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
            : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
        }`}
      >
        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isAr ? "روابط العملاء" : "Customer Links"}</span>
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "TEXT" ? "TEXT" : "URL")}
        className={`h-9 px-2 rounded-lg border text-[11px] font-mono flex items-center justify-center gap-1 cursor-pointer ${
          mode === "URL" || mode === "TEXT"
            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
            : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
        }`}
      >
        <Phone className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isAr ? "استخراج أرقام" : "Extract Data"}</span>
      </button>
      <button
        type="button"
        onClick={() => setMode("AUTH_ONBOARDING")}
        className={`h-9 px-2 rounded-lg border text-[11px] font-mono flex items-center justify-center gap-1 cursor-pointer ${
          mode === "AUTH_ONBOARDING"
            ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
            : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
        }`}
      >
        <GitBranch className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isAr ? "Auth توجيه" : "Auth Flow"}</span>
      </button>
    </div>
  );

  return (
    <section id="link-extractor" className="hw-no-print w-full border-b border-[#27272A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <MataSectionHeader
          sectionNumber="02"
          titleAr="روابط العملاء الذكية واستخراج البيانات"
          titleEn="Customer Audience Links & Contact Extractor"
          subtitleAr=""
          subtitleEn=""
          badgeText=""
          isAr={isAr}
        />

        {mode === "CUSTOMER_LINKS" ? (
          <CustomerLinksStudio lang={lang} headerTabs={headerTabs} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Input Panel */}
          <div className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <div className="p-5 space-y-4 text-start">
              {headerTabs}

              {(mode === "URL" || mode === "TEXT") && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMode("URL")}
                    className={`h-8 rounded-lg border text-[11px] font-mono inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === "URL"
                        ? "bg-[#18181B] text-[#FFFFFF] border-[#FFFFFF] font-bold"
                        : "bg-[#09090B] text-[#A1A1AA] border-[#27272A]"
                    }`}
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{isAr ? "رابط مشاركة URL" : "Share Link URL"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("TEXT")}
                    className={`h-8 rounded-lg border text-[11px] font-mono inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === "TEXT"
                        ? "bg-[#18181B] text-[#FFFFFF] border-[#FFFFFF] font-bold"
                        : "bg-[#09090B] text-[#A1A1AA] border-[#27272A]"
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{isAr ? "نص / HTML مباشر" : "Raw Text / HTML"}</span>
                  </button>
                </div>
              )}

              {mode === "URL" && (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    dir="ltr"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/contact or https://wa.me/2010..."
                    className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const demo = "https://wa.me/201012345678?text=Sales";
                        setUrlInput(demo);
                        runExtraction(demo, "URL");
                      }}
                      className="px-2.5 py-1 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] cursor-pointer"
                    >
                      wa.me Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("TEXT");
                        setRawTextInput(
                          "تواصل معنا: +20 100 555 8899 أو واتساب ٠١١٢٢٣٣٤٤٥٥ | المبيعات السعودية: +966 50 123 4567 | البريد: contact@matanygroup.com | https://instagram.com/matanygroup"
                        );
                      }}
                      className="px-2.5 py-1 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] cursor-pointer"
                    >
                      {isAr ? "تجربة نص مختلط عربي/إنجليزي" : "Sample Arabic+Intl Text"}
                    </button>
                  </div>
                </div>
              )}

              {mode === "TEXT" && (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={rawTextInput}
                    onChange={(e) => setRawTextInput(e.target.value)}
                    placeholder={
                      isAr
                        ? "الصق رسالة واتساب، صفحة HTML، أرقام عربية أو إنجليزية، أو روابط مشاركة..."
                        : "Paste WhatsApp share message, HTML source, or contact block..."
                    }
                    className="w-full p-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-sans text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                  />
                  {rawTextInput.trim() && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(rawTextInput, "raw-input")}
                        className="h-7 px-2.5 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "raw-input" ? (
                          <Check className="w-3 h-3 text-[#10B981]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{isAr ? "نسخ النص المدخل" : "Copy Input Text"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === "AUTH_ONBOARDING" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#A1A1AA] block">
                      {isAr ? "البريد الإلكتروني للمستخدم" : "User Email"}
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#A1A1AA] block">
                      {isAr ? "مسار الوجهة (?next= / ?redirect_to=)" : "Target Redirect (?next=)"}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={authNextInput}
                      onChange={(e) => setAuthNextInput(e.target.value)}
                      placeholder="/dashboard"
                      className="w-full h-9 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5" dir="ltr">
                      {["/dashboard", "/scan", "https://evil.example/phish"].map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => setAuthNextInput(sample)}
                          className="px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[9px] font-mono text-[#A1A1AA] hover:text-[#FFFFFF] cursor-pointer"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#A1A1AA] block">
                      {isAr ? "حالة المستخدم الشرطية" : "Conditional Routing State"}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          ["NEW_USER", isAr ? "مستخدم جديد (Step 1)" : "New User (Step 1)"],
                          ["INCOMPLETE_STEP_2", isAr ? "بيانات ناقصة (Step 2)" : "Incomplete (Step 2)"],
                          ["COMPLETED", isAr ? "حساب مكتمل (Direct)" : "Completed (Direct)"],
                          ["EXPIRED", isAr ? "رابط منتهي (Recovery)" : "Expired (Recovery)"],
                        ] as const
                      ).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAuthPreset(val)}
                          className={`h-8 px-2 rounded-lg border text-[10px] font-mono transition-colors cursor-pointer ${
                            authPreset === val
                              ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                              : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5" dir="ltr">
                    <input
                      type="text"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      placeholder="utm_source"
                      className="h-8 px-2 rounded-md bg-[#09090B] border border-[#27272A] text-[10px] font-mono text-[#FFFFFF]"
                    />
                    <input
                      type="text"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      placeholder="utm_medium"
                      className="h-8 px-2 rounded-md bg-[#09090B] border border-[#27272A] text-[10px] font-mono text-[#FFFFFF]"
                    />
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      placeholder="utm_campaign"
                      className="h-8 px-2 rounded-md bg-[#09090B] border border-[#27272A] text-[10px] font-mono text-[#FFFFFF]"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  {error}
                </div>
              )}

              {mode === "AUTH_ONBOARDING" ? (
                <button
                  type="button"
                  onClick={runAuthSimulation}
                  disabled={authLoading}
                  className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>
                    {authLoading
                      ? isAr
                        ? "جارٍ فحص التوجيه..."
                        : "Evaluating Auth Route..."
                      : isAr
                      ? "تشغيل التوجيه الذكي وحفظ الجلسة"
                      : "Run Smart Auth Redirect"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runExtraction()}
                  disabled={loading}
                  className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                  <span>
                    {loading
                      ? isAr
                        ? "جارٍ الفحص والاستخراج..."
                        : "Extracting..."
                      : isAr
                      ? "استخراج الأرقام والبيانات الآن"
                      : "Extract Phone & Contact Data"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-7 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            {mode === "AUTH_ONBOARDING" ? (
              <>
                <SegmentedLedBar
                  level={authLoading ? 60 : authResult ? (authResult.success ? 100 : 40) : 20}
                  status={
                    authLoading
                      ? "working"
                      : authResult
                      ? authResult.success
                        ? "success"
                        : "error"
                      : "idle"
                  }
                  label={authResult ? authResult.status : "AUTH ROUTER READY"}
                  metricText={
                    authResult?.rateLimit
                      ? `RL ${authResult.rateLimit.remaining}/25`
                      : "EDGE + DB"
                  }
                />

                <div className="p-5 space-y-4 text-start">
                  {/* Live Routing Output */}
                  {authResult && (
                    <div className="p-4 rounded-xl border border-[#27272A] bg-[#09090B] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-[#FFFFFF] inline-flex items-center gap-1.5">
                          {authResult.success ? (
                            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                          )}
                          <span>{authResult.status}</span>
                        </span>
                        {authResult.wasSanitized && (
                          <span className="px-2 py-0.5 rounded bg-[#18181B] border border-[#FFFFFF] text-[10px] font-mono text-[#FFFFFF]">
                            UNSAFE URL BLOCKED → {authResult.safeNext}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex items-center justify-between gap-2" dir="ltr">
                        <code className="text-[11px] font-mono text-[#D4D4D8] truncate">
                          {authResult.resolvedRedirect}
                        </code>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(authResult.resolvedRedirect, "auth-redir")}
                            className="h-7 px-2 rounded border border-[#27272A] text-[10px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === "auth-redir" ? (
                              <Check className="w-3 h-3 text-[#10B981]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{isAr ? "نسخ" : "Copy"}</span>
                          </button>
                          <Link
                            href={authResult.resolvedRedirect}
                            className="h-7 px-2.5 rounded bg-[#FFFFFF] text-[#09090B] text-[10px] font-mono font-bold inline-flex items-center gap-1"
                          >
                            <span>{isAr ? "فتح المسار" : "Open"}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {authResult.sessionContext && (
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#A1A1AA]" dir="ltr">
                          <span>Device: {authResult.sessionContext.deviceType}</span>
                          <span>· OS: {authResult.sessionContext.osName}</span>
                          <span>· Browser: {authResult.sessionContext.browserName}</span>
                          {authResult.sessionContext.utmSource && (
                            <span>· UTM: {authResult.sessionContext.utmSource}/{authResult.sessionContext.utmCampaign || "-"}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Links & Live UTM/Device Analytics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA]">
                        <span className="inline-flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>{isAr ? "تحليلات UTM والأجهزة" : "UTM & Device Analytics"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={loadAuthAnalytics}
                          className="hover:text-[#FFFFFF] cursor-pointer"
                          title="Refresh"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 rounded bg-[#121215] border border-[#27272A]">
                          <span className="text-[10px] text-[#71717A] block">{isAr ? "المستخدمون" : "Users"}</span>
                          <span className="font-bold text-[#FFFFFF]">{analytics?.summary.totalUsers ?? 0}</span>
                        </div>
                        <div className="p-2 rounded bg-[#121215] border border-[#27272A]">
                          <span className="text-[10px] text-[#71717A] block">{isAr ? "الأحداث المسجلة" : "Events"}</span>
                          <span className="font-bold text-[#FFFFFF]">{analytics?.summary.totalEvents ?? 0}</span>
                        </div>
                      </div>
                      {analytics && analytics.utmStats.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1" dir="ltr">
                          {analytics.utmStats.slice(0, 4).map((u) => (
                            <span
                              key={u.source}
                              className="px-2 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[10px] font-mono text-[#D4D4D8]"
                            >
                              {u.source}: {u.total}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2">
                      <span className="text-[11px] font-mono text-[#A1A1AA] block">
                        {isAr ? "معاينة الصفحات المبنية بالمشروع" : "Live Project Routes"}
                      </span>
                      <div className="space-y-1.5">
                        <Link
                          href="/onboarding?step=1&next=%2Fdashboard"
                          className="h-8 px-3 rounded-lg border border-[#27272A] bg-[#121215] text-[11px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-between"
                        >
                          <span>/onboarding (Multi-Step Auto-Save)</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <Link
                          href="/auth/login?error=token_expired&next=%2Fdashboard"
                          className="h-8 px-3 rounded-lg border border-[#27272A] bg-[#121215] text-[11px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-between"
                        >
                          <span>/auth/login (Error Recovery)</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Production Code Viewer with Reliable Copy */}
                  <div className="rounded-xl border border-[#27272A] bg-[#09090B] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#27272A] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Code2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        {AUTH_PRODUCTION_SNIPPETS.map((sn) => (
                          <button
                            key={sn.id}
                            type="button"
                            onClick={() => setActiveSnippet(sn.id)}
                            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer ${
                              activeSnippet === sn.id
                                ? "bg-[#FFFFFF] text-[#09090B] font-bold"
                                : "text-[#A1A1AA] hover:text-[#FFFFFF]"
                            }`}
                          >
                            {sn.fileName}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentSnippet.code, `code-${currentSnippet.id}`)}
                        className="h-7 px-2.5 rounded border border-[#27272A] bg-[#121215] text-[10px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === `code-${currentSnippet.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-[#10B981]" />
                            <span>{isAr ? "تم النسخ" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isAr ? "نسخ الكود" : "Copy Code"}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre
                      dir="ltr"
                      className="p-3 text-[11px] font-mono text-[#D4D4D8] max-h-52 overflow-auto whitespace-pre select-all"
                    >
                      {currentSnippet.code}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <>
                <SegmentedLedBar
                  level={
                    loading
                      ? 55
                      : error
                      ? 20
                      : result
                      ? Math.min(
                          100,
                          Math.max(30, result.phones.length * 20 + result.emails.length * 15 + 25)
                        )
                      : mode === "URL"
                      ? urlInput.trim()
                        ? 30
                        : 0
                      : rawTextInput.trim()
                      ? 30
                      : 0
                  }
                  status={loading ? "working" : error ? "error" : result ? "success" : "idle"}
                  label={loading ? "SCANNING" : result ? "EXTRACTED" : "STANDBY"}
                  metricText={
                    result
                      ? `${result.phones.length} TEL · ${result.emails.length} MAIL`
                      : undefined
                  }
                />

                <div className="p-5 space-y-4 text-start">
                  {!result ? (
                    <div className="py-16 text-center space-y-2">
                      <Globe className="w-8 h-8 text-[#52525B] mx-auto" />
                      <p className="text-xs font-mono text-[#71717A]">
                        {isAr
                          ? "أدخل رابط المشاركة واضغط استخراج لعرض الأرقام والإيميلات وروابط واتساب."
                          : "Enter a shared URL or paste text to inspect extracted phone numbers and contact intelligence."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Metadata Header + Export Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono uppercase text-[#71717A] block">
                            {result.fetchStatus}
                            {result.fetchNote ? ` · ${result.fetchNote}` : ""}
                          </span>
                          <h3 className="text-sm font-bold text-[#FFFFFF] truncate">
                            {result.metadata.title ||
                              result.sourceUrl ||
                              (isAr ? "نتائج الاستخراج المباشر" : "Direct Extraction")}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
                          <button
                            type="button"
                            onClick={() => handleCopy(buildAllExtractedText(), "copy-all-extract")}
                            className="h-8 px-2.5 rounded-md border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === "copy-all-extract" ? (
                              <Check className="w-3 h-3 text-[#10B981]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedKey === "copy-all-extract" ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ الكل" : "Copy All"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadVcf}
                            className="h-8 px-2.5 rounded-md bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>VCF</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadCsv}
                            className="h-8 px-2.5 rounded-md border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleSendReportToVault}
                            className="h-8 px-2.5 rounded-md border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Shield className="w-3 h-3" />
                            <span>{isAr ? "مشاركة آمنة" : "Secure Share"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Extracted Phones List */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-[#A1A1AA] block">
                          {isAr
                            ? `أرقام الهواتف المستخرجة (${result.phones.length})`
                            : `Extracted Phone Numbers (${result.phones.length})`}
                        </span>

                        {result.phones.length === 0 ? (
                          <div className="p-4 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#71717A]">
                            {isAr
                              ? "لم يُعثر على أرقام هاتف في المصدر. إذا كان الموقع يحظر الجلب التلقائي، الصق نص الصفحة في وضع النص المباشر."
                              : "No phone numbers detected. If the target site blocks automated fetching, switch to Raw Text / HTML mode."}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {result.phones.map((p, idx) => (
                              <div
                                key={`${p.digitsOnly}-${idx}`}
                                className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] flex flex-wrap items-center justify-between gap-2"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2" dir="ltr">
                                    <span className="text-sm font-mono font-bold text-[#FFFFFF] select-all">
                                      {p.normalized}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded border border-[#27272A] bg-[#121215] text-[10px] font-mono text-[#A1A1AA]">
                                      {p.countryHint}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-[#121215] text-[10px] font-mono text-[#71717A] uppercase">
                                      {p.source}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5" dir="ltr">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(p.normalized, `tel-${idx}`)}
                                    title="Copy"
                                    className="w-8 h-8 rounded-md border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                                  >
                                    {copiedKey === `tel-${idx}` ? (
                                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={p.whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open WhatsApp"
                                    className="w-8 h-8 rounded-md border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={p.telUrl}
                                    title="Call"
                                    className="w-8 h-8 rounded-md border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dispatchToQrStudio({
                                        payloadType: "VCARD",
                                        title: result.metadata.title || p.normalized,
                                        fullName: result.metadata.title || "Extracted Contact",
                                        phone: p.normalized,
                                        email: result.emails[0] || "",
                                        logoPreset: "MATA",
                                      })
                                    }
                                    title="Create QR"
                                    className="h-8 px-2.5 rounded-md bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>QR</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Emails & Socials Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#27272A]">
                        <div className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] space-y-2">
                          <span className="text-[10px] font-mono text-[#71717A] flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            <span>
                              {isAr ? `البريد الإلكتروني (${result.emails.length})` : `Emails (${result.emails.length})`}
                            </span>
                          </span>
                          {result.emails.length === 0 ? (
                            <span className="text-[11px] font-mono text-[#52525B] block">—</span>
                          ) : (
                            <div className="space-y-1">
                              {result.emails.map((em) => (
                                <div
                                  key={em}
                                  dir="ltr"
                                  className="flex items-center justify-between gap-2 text-xs font-mono text-[#FFFFFF]"
                                >
                                  <span className="truncate select-all">{em}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(em, `mail-${em}`)}
                                    className="text-[#A1A1AA] hover:text-[#FFFFFF] cursor-pointer shrink-0"
                                  >
                                    {copiedKey === `mail-${em}` ? (
                                      <Check className="w-3 h-3 text-[#10B981]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] space-y-2">
                          <span className="text-[10px] font-mono text-[#71717A] flex items-center gap-1.5">
                            <ExternalLink className="w-3 h-3" />
                            <span>
                              {isAr ? `روابط التواصل (${result.socialLinks.length})` : `Social Links (${result.socialLinks.length})`}
                            </span>
                          </span>
                          {result.socialLinks.length === 0 ? (
                            <span className="text-[11px] font-mono text-[#52525B] block">—</span>
                          ) : (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {result.socialLinks.map((s) => (
                                <div
                                  key={s.url}
                                  dir="ltr"
                                  className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#FFFFFF]"
                                >
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 min-w-0 flex-1 hover:underline"
                                  >
                                    <span className="px-1.5 py-0.5 rounded bg-[#121215] border border-[#27272A] text-[9px] text-[#A1A1AA] shrink-0">
                                      {s.platform}
                                    </span>
                                    <span className="truncate">{s.url}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(s.url, `soc-${s.url}`)}
                                    className="text-[#A1A1AA] hover:text-[#FFFFFF] cursor-pointer shrink-0"
                                  >
                                    {copiedKey === `soc-${s.url}` ? (
                                      <Check className="w-3 h-3 text-[#10B981]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
