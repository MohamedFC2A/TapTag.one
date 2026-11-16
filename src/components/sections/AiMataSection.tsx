"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Loader2,
  Shield,
  FileCog,
  Paperclip,
  X,
  Download,
  QrCode,
  Phone,
  MessageCircle,
} from "lucide-react";
import type { Language } from "@/types";
import type { AiMataResponse } from "@/lib/ai-mata";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { MataLogo } from "@/components/ui/MataLogo";
import { QrRenderMatrix, buildExportQrPngDataUrl } from "@/components/qr/QrRenderMatrix";
import { getExtension } from "@/lib/conversion-helpers";
import {
  dispatchFocusSection,
  dispatchToConverter,
  dispatchToExtractor,
  dispatchToQrStudio,
  dispatchToSecureShare,
  QrPrefillEventDetail,
} from "@/lib/mata-events";

interface AiMataSectionProps {
  lang: Language;
}

function buildInlineQrValue(payload?: Record<string, unknown>): string | null {
  if (!payload) return null;
  const pt = String(payload.payloadType || "TEXT").toUpperCase();
  if (pt === "URL" && payload.destinationUrl) {
    return String(payload.destinationUrl);
  }
  if (pt === "WIFI" && payload.ssid) {
    const enc = String(payload.encryption || "WPA");
    const ssid = String(payload.ssid);
    const pass = String(payload.password || "");
    return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
  }
  if (pt === "VCARD" && (payload.fullName || payload.phone)) {
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${String(payload.fullName || "Contact")}`,
      payload.phone ? `TEL;TYPE=CELL:${String(payload.phone)}` : "",
      payload.email ? `EMAIL:${String(payload.email)}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (payload.text) return String(payload.text);
  return null;
}

export function AiMataSection({ lang }: AiMataSectionProps) {
  const isAr = lang === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AiMataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCommand = async (customPrompt?: string, overrideFile?: File | null) => {
    const fileToUse = overrideFile !== undefined ? overrideFile : attachedFile;
    const q = (customPrompt ?? prompt).trim();
    if (!q && !fileToUse) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-mata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "GLOBAL_COMMAND",
          lang,
          prompt: q || (fileToUse ? `Analyze file ${fileToUse.name}` : ""),
          context: fileToUse
            ? {
                fileName: fileToUse.name,
                fileSize: fileToUse.size,
                fileMimeType: fileToUse.type,
                sourceExt: getExtension(fileToUse.name),
              }
            : {},
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        setError(data.error || "Failed to execute Mata AI command");
        return;
      }
      setResponse(data.result);
    } catch {
      setError(isAr ? "تعذر الاتصال بمحرك Mata AI." : "Mata AI unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleAttachFile = (file: File) => {
    setAttachedFile(file);
    setError(null);
    runCommand(prompt, file);
  };

  const inlineQrValue = useMemo(() => {
    if (response?.suggestedAction?.targetSection !== "QR") return null;
    return buildInlineQrValue(response.suggestedAction.payload);
  }, [response]);

  const detectedPhones = useMemo(() => {
    const phones = response?.suggestedAction?.payload?.phones;
    return Array.isArray(phones) ? (phones as string[]) : [];
  }, [response]);

  const handleDownloadInlineQr = async () => {
    if (!inlineQrValue) return;
    const pngUrl = await buildExportQrPngDataUrl(inlineQrValue, "MATA", null, {
      moduleShape: "square",
      frameCaption: "Mata AI",
    });
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `mata-ai-qr.png`;
    a.click();
  };

  const applySuggestedAction = (res: AiMataResponse) => {
    const act = res.suggestedAction;
    if (!act) return;
    if (act.targetSection === "QR") {
      dispatchToQrStudio((act.payload || {}) as QrPrefillEventDetail);
    } else if (act.targetSection === "EXTRACT") {
      dispatchToExtractor({
        url: act.payload?.url ? String(act.payload.url) : undefined,
        text: act.payload?.text ? String(act.payload.text) : undefined,
      });
    } else if (act.targetSection === "SHARE") {
      if (attachedFile) {
        dispatchToSecureShare(attachedFile);
      } else {
        dispatchFocusSection("SHARE", "secure-share");
      }
    } else if (act.targetSection === "CONVERT") {
      if (attachedFile) {
        dispatchToConverter(attachedFile);
      } else {
        dispatchFocusSection("CONVERT", "file-converter");
      }
    }
  };

  const quickExamples = isAr
    ? [
        "أنشئ QR لشبكة واي فاي Studio5G الباسورد 2026",
        "استخرج الأرقام من https://wa.me/201012345678",
        "أرقام المبيعات: +20 100 555 8899 و +966 50 123 4567",
      ]
    : [
        "Create Wi-Fi QR SSID Studio5G password 2026",
        "Extract phone numbers from https://wa.me/201012345678",
        "Contacts: +20 100 555 8899 & +966 50 123 4567",
      ];

  const ledLevel = loading
    ? 55
    : error
    ? 25
    : response
    ? 100
    : attachedFile || prompt.trim()
    ? 48
    : 0;

  return (
    <section id="ai-mata" className="hw-no-print w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleAttachFile(f);
          }}
          className={`rounded-2xl border transition-colors bg-[#121215] overflow-hidden ${
            isDragging ? "border-[#FFFFFF]" : "border-[#27272A]"
          }`}
        >
          <SegmentedLedBar
            level={ledLevel}
            status={
              loading
                ? "working"
                : error
                ? "error"
                : response
                ? "success"
                : attachedFile || prompt.trim()
                ? "active"
                : "idle"
            }
            label="MATA AI"
            metricText={
              loading
                ? isAr
                  ? "جارٍ المعالجة"
                  : "RUNNING"
                : response
                ? response.engine === "LIVE_LLM"
                  ? "LIVE AI"
                  : "READY"
                : attachedFile
                ? `${Math.max(1, Math.ceil(attachedFile.size / 1024))} KB`
                : undefined
            }
          />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Pure Unified Supra Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#27272A]">
              <div className="space-y-2 text-start">
                <MataLogo size="lg" />
                <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl leading-relaxed">
                  {isAr
                    ? "اكتب طلبك أو اسحب ملفاً مباشرة — يُولّد رموز QR فوراً، يستخرج أرقام الهواتف، ويفحص الملفات للتشفير أو التحويل."
                    : "Type any intent or drop a file — generates branded QR codes inline, extracts contact phones, or inspects files for vault encryption and conversion."}
                </p>
              </div>
            </div>

            {/* Unified Command + Direct File Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCommand();
              }}
              className="space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAttachFile(f);
                }}
                className="hidden"
              />

              {attachedFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  <Paperclip className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  <span className="truncate max-w-[240px]">{attachedFile.name}</span>
                  <span className="text-[#71717A]">
                    {Math.max(1, Math.ceil(attachedFile.size / 1024))} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    aria-label="Remove file"
                    className="text-[#A1A1AA] hover:text-[#FFFFFF] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={isAr ? "إرفاق ملف للفحص أو التحويل" : "Attach file to inspect"}
                  className="h-12 px-4 rounded-xl border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] text-xs font-mono inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>{isAr ? "إرفاق ملف" : "Attach File"}</span>
                </button>

                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    isAr
                      ? "اطلب من Mata AI (مثال: أنشئ QR واي فاي، استخرج أرقام، فحص أمان أو تحويل ملف)..."
                      : "Ask Mata AI (e.g. Wi-Fi QR, extract phone numbers, audit or convert attached file)..."
                  }
                  className="flex-1 h-12 px-4 rounded-xl bg-[#09090B] border border-[#27272A] text-sm text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                />

                <button
                  type="submit"
                  disabled={loading || (!prompt.trim() && !attachedFile)}
                  className="h-12 px-6 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-45 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isAr ? "تنفيذ" : "Execute"}</span>
                </button>
              </div>
            </form>

            {/* Minimal Suggested Prompts */}
            <div className="flex flex-wrap gap-2">
              {quickExamples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setPrompt(ex);
                    runCommand(ex);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-[11px] font-sans text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-colors cursor-pointer text-start"
                >
                  {ex}
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl border border-[#EF4444]/60 bg-[#09090B] text-xs font-mono text-[#FFFFFF] text-start">
                {error}
              </div>
            )}

            {/* Rich Actionable Execution Result */}
            {response && (
              <div className="p-5 sm:p-6 rounded-xl border border-[#27272A] bg-[#09090B] grid grid-cols-1 md:grid-cols-12 gap-5 items-center text-start">
                <div className={`${inlineQrValue ? "md:col-span-8" : "md:col-span-12"} space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-bold text-[#FFFFFF]">{response.headline}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#27272A] bg-[#121215] text-[#A1A1AA]">
                      {response.engine === "LIVE_LLM" ? "LIVE LLM" : "MATA ENGINE"}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                    {response.summary}
                  </p>

                  {detectedPhones.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1" dir="ltr">
                      {detectedPhones.map((ph) => (
                        <div
                          key={ph}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#121215] text-xs font-mono text-[#FFFFFF]"
                        >
                          <Phone className="w-3 h-3 text-[#A1A1AA]" />
                          <span>{ph}</span>
                          <a
                            href={`https://wa.me/${ph.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#10B981] hover:underline inline-flex items-center"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {response.recommendations.length > 0 && (
                    <ul className="space-y-1 text-xs font-mono text-[#D4D4D8]">
                      {response.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#71717A]">—</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {response.suggestedAction && (
                      <button
                        type="button"
                        onClick={() => applySuggestedAction(response)}
                        className="h-9 px-4 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
                      >
                        <span>{response.suggestedAction.label}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {attachedFile && (
                      <>
                        <button
                          type="button"
                          onClick={() => dispatchToSecureShare(attachedFile)}
                          className="h-9 px-3.5 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{isAr ? "تشفير ومشاركة" : "Encrypt & Share"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatchToConverter(attachedFile)}
                          className="h-9 px-3.5 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileCog className="w-3.5 h-3.5" />
                          <span>{isAr ? "تحويل الصيغة" : "Convert Format"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {inlineQrValue && (
                  <div className="md:col-span-4 flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[#27272A] bg-[#FAFAFA]">
                    <QrRenderMatrix
                      value={inlineQrValue}
                      logoPreset="MATA"
                      moduleShape="square"
                      sizeClass="w-36 h-36"
                    />
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={handleDownloadInlineQr}
                        className="flex-1 h-8 px-3 rounded-md bg-[#09090B] text-[#FFFFFF] font-mono text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#27272A]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PNG</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applySuggestedAction(response)}
                        className="h-8 px-2.5 rounded-md border border-[#E4E4E7] bg-[#FFFFFF] text-[#09090B] font-mono text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer hover:border-[#09090B]"
                        title={isAr ? "تعديل في استوديو QR" : "Customize in QR Studio"}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
