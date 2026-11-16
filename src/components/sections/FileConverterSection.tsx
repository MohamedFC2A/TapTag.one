"use client";

import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import {
  FileCog,
  Upload,
  Download,
  ArrowRight,
  Shield,
  QrCode,
  Loader2,
  X,
  Archive,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import type { Language } from "@/types";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { MataSectionHeader } from "@/components/ui/MataLogo";
import { copyTextReliable } from "@/lib/clipboard";
import {
  ALL_TARGET_FORMATS,
  detectSourceCategory,
  getExtension,
  getSupportedTargetsForSource,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/conversion-helpers";
import { buildTarArchive, ConversionOutput, convertFileUniversal } from "@/lib/file-converter";
import {
  dispatchToQrStudio,
  dispatchToSecureShare,
  FileTransferEventDetail,
} from "@/lib/mata-events";

interface FileConverterSectionProps {
  lang: Language;
}

export function FileConverterSection({ lang }: FileConverterSectionProps) {
  const isAr = lang === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [targetExt, setTargetExt] = useState<string>("pdf");
  const [quality, setQuality] = useState<number>(0.92);
  const [maxWidth, setMaxWidth] = useState<string>("");

  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<ConversionOutput | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const primaryFile = files[0] || null;
  const srcExt = primaryFile ? getExtension(primaryFile.name) : "";
  const category = primaryFile ? detectSourceCategory(srcExt, primaryFile.type) : "ANY";
  const supportedTargets =
    files.length > 1
      ? ["zip", "tar"]
      : primaryFile
      ? getSupportedTargetsForSource(srcExt, primaryFile.type)
      : [];

  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<FileTransferEventDetail>).detail;
      if (detail?.file) {
        handleSelectFiles([detail.file]);
      }
    };
    window.addEventListener("mata:prefill-convert", onPrefill);
    return () => window.removeEventListener("mata:prefill-convert", onPrefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectFiles = (picked: File[]) => {
    setError(null);
    setOutput(null);
    if (picked.length === 0) return;

    const valid = picked.filter((f) => f.size > 0 && f.size <= MAX_FILE_SIZE_BYTES);
    if (valid.length === 0) {
      setError(
        isAr
          ? "الملف فارغ أو يتجاوز الحد الأقصى المسموح (1 جيجابايت)."
          : "File is empty or exceeds the 1 GB maximum limit."
      );
      return;
    }

    setFiles(valid);
    if (valid.length > 1) {
      setTargetExt("zip");
    } else {
      const ext = getExtension(valid[0].name);
      const targets = getSupportedTargetsForSource(ext, valid[0].type);
      if (targets.length > 0 && !targets.includes(targetExt)) {
        setTargetExt(targets[0]);
      }
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setConverting(true);
    try {
      // Batch multi-file ZIP or TAR packaging
      if (files.length > 1 && (targetExt === "zip" || targetExt === "tar")) {
        if (targetExt === "tar") {
          const entries = await Promise.all(
            files.map(async (f) => ({
              name: f.name,
              bytes: new Uint8Array(await f.arrayBuffer()),
            }))
          );
          const tarBytes = buildTarArchive(entries);
          const blob = new Blob([tarBytes.buffer as ArrayBuffer], { type: "application/x-tar" });
          setOutput({
            blob,
            fileName: `mata-bundle-${files.length}-files.tar`,
            mimeType: "application/x-tar",
            size: blob.size,
            zipEntries: files.map((f) => ({ name: f.name, size: f.size, dir: false })),
          });
          return;
        }
        const zip = new JSZip();
        for (const f of files) {
          zip.file(f.name, await f.arrayBuffer());
        }
        const blob = await zip.generateAsync({ type: "blob" });
        setOutput({
          blob,
          fileName: `mata-bundle-${files.length}-files.zip`,
          mimeType: "application/zip",
          size: blob.size,
          zipEntries: files.map((f) => ({ name: f.name, size: f.size, dir: false })),
        });
        return;
      }

      const res = await convertFileUniversal(files[0], targetExt, {
        quality,
        maxWidth: maxWidth.trim() ? Number(maxWidth) : undefined,
      });
      setOutput(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
          ? "تعذر تحويل هذه الصيغة."
          : "Conversion failed."
      );
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadOutput = () => {
    if (!output) return;
    const url = URL.createObjectURL(output.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = output.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToSecureVault = () => {
    if (!output) return;
    const file = new File([output.blob], output.fileName, { type: output.mimeType });
    dispatchToSecureShare(file);
  };

  const handleCopyOutputText = async () => {
    const textToCopy = output?.fullText || output?.previewText;
    if (!textToCopy) return;
    const ok = await copyTextReliable(textToCopy);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1800);
    }
  };

  const handleSendToQr = async () => {
    if (!output) return;
    const textPreview = output.fullText || output.previewText || `${output.fileName} (${output.size} bytes)`;
    dispatchToQrStudio({
      payloadType: "TEXT",
      title: output.fileName,
      text: textPreview.slice(0, 1200),
      logoPreset: "MATA",
    });
  };

  return (
    <section id="file-converter" className="hw-no-print w-full border-b border-[#27272A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <MataSectionHeader
          sectionNumber="05"
          titleAr="تحويل الملفات لجميع الصيغ"
          titleEn="Universal All-Format File Converter"
          subtitleAr="تحويل حقيقي وفوري بين الصور (PNG/JPG/WEBP/BMP/ICO/SVG/PDF)، المستندات (PDF/DOCX/TXT/MD/HTML/RTF)، البيانات (XLSX/CSV/JSON/YAML/XML/SQL)، الصوت (WAV)، وملفات ZIP."
          subtitleEn="Real lossless & binary conversion across Images, Documents (PDF/DOCX/MD/HTML/RTF), Data (XLSX/CSV/JSON/YAML/XML/SQL), Audio (WAV), and ZIP."
          badgeText="ALL FORMATS · ENGINE"
          isAr={isAr}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Source File + Target Format Selector */}
          <div className="lg:col-span-7 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            {(() => {
              const deltaPct =
                output && primaryFile && primaryFile.size > 0
                  ? Math.round(((output.size - primaryFile.size) / primaryFile.size) * 100)
                  : null;
              const metric = output
                ? `${Math.max(1, Math.ceil(output.size / 1024))} KB${
                    deltaPct !== null
                      ? ` (${deltaPct >= 0 ? `+${deltaPct}` : deltaPct}%)`
                      : ""
                  }`
                : primaryFile
                ? `${Math.max(1, Math.ceil(primaryFile.size / 1024))} KB`
                : undefined;
              return (
                <SegmentedLedBar
                  level={converting ? 60 : output ? 100 : primaryFile ? 55 : 0}
                  status={
                    converting
                      ? "working"
                      : error
                      ? "error"
                      : output
                      ? "success"
                      : primaryFile
                      ? "active"
                      : "idle"
                  }
                  label={
                    primaryFile
                      ? `${srcExt.toUpperCase()} -> ${targetExt.toUpperCase()}`
                      : "CONVERTER"
                  }
                  metricText={metric}
                />
              );
            })()}

            <div className="p-5 space-y-4 text-start">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = Array.from(e.dataTransfer.files || []);
                  handleSelectFiles(dropped);
                }}
                className={`p-5 rounded-xl border transition-colors duration-150 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  isDragging ? "border-[#FFFFFF] bg-[#18181B]" : "border-[#27272A] bg-[#09090B]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleSelectFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl border border-[#27272A] bg-[#121215] flex items-center justify-center shrink-0">
                    {files.length > 1 ? (
                      <Archive className="w-5 h-5 text-[#FFFFFF]" />
                    ) : (
                      <FileCog className="w-5 h-5 text-[#FFFFFF]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#FFFFFF] block truncate">
                      {files.length > 1
                        ? isAr
                          ? `${files.length} ملفات محددة (حزمة ZIP)`
                          : `${files.length} files selected (ZIP Bundle)`
                        : primaryFile
                        ? primaryFile.name
                        : isAr
                        ? "اسحب أي ملف أو عدة ملفات للتحويل"
                        : "Drop any file(s) to convert"}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717A] block">
                      {primaryFile
                        ? `${category} · ${srcExt.toUpperCase()} · ${Math.max(
                            1,
                            Math.ceil(primaryFile.size / 1024)
                          )} KB`
                        : "PNG · JPG · WEBP · SVG · BMP · ICO · PDF · DOCX · XLSX · CSV · JSON · YAML · XML · MD · HTML · RTF · MP3/WAV · ZIP"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-3.5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{primaryFile ? (isAr ? "تغيير" : "Swap") : isAr ? "اختيار ملف" : "Select File"}</span>
                  </button>
                  {files.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiles([]);
                        setOutput(null);
                      }}
                      aria-label="Clear files"
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Target Format Grid & Convert Action - Shown ONLY after placing/selecting a file */}
              {files.length > 0 && (
                <>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-[#A1A1AA]">
                        {files.length > 1
                          ? isAr
                            ? "صيغ ضغط الملفات المتعددة"
                            : "Multi-File Archive Formats"
                          : isAr
                          ? "الصيغ المتوافقة للتحويل"
                          : "Compatible Output Formats"}
                      </span>
                      {primaryFile && (
                        <span className="text-[10px] font-mono text-[#A1A1AA]">
                          {files.length > 1 ? `${files.length} FILES` : srcExt.toUpperCase()}{" "}
                          <ArrowRight className="w-3 h-3 inline" /> {targetExt.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5">
                      {supportedTargets.map((ext) => {
                        const fmt = ALL_TARGET_FORMATS.find((f) => f.ext === ext);
                        const active = targetExt === ext;
                        return (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => {
                              setTargetExt(ext);
                              setOutput(null);
                            }}
                            className={`h-9 px-2 rounded-lg border text-[11px] font-mono transition-all duration-150 cursor-pointer ${
                              active
                                ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                                : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF] hover:border-[#3F3F46]"
                            }`}
                          >
                            {fmt?.label || ext.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image Compression / Resize Controls when applicable */}
                  {category === "IMAGE" && ["jpg", "webp", "avif"].includes(targetExt) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-[#27272A] bg-[#09090B]">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[#A1A1AA] flex justify-between">
                          <span>{isAr ? "الجودة" : "Quality"}</span>
                          <span>{Math.round(quality * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0.2"
                          max="1"
                          step="0.05"
                          value={quality}
                          onChange={(e) => setQuality(Number(e.target.value))}
                          className="w-full accent-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[#A1A1AA] block">
                          {isAr ? "أقصى عرض px (اختياري)" : "Max Width px (optional)"}
                        </label>
                        <input
                          type="number"
                          dir="ltr"
                          min={32}
                          max={4096}
                          value={maxWidth}
                          onChange={(e) => setMaxWidth(e.target.value)}
                          placeholder="Original"
                          className="w-full h-8 px-2.5 rounded-md bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={converting || files.length === 0}
                    className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {converting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileCog className="w-4 h-4" />
                    )}
                    <span>
                      {converting
                        ? isAr
                          ? "جارٍ التحويل الفوري..."
                          : "Converting Instantly..."
                        : isAr
                        ? `تحويل الآن إلى ${targetExt.toUpperCase()}`
                        : `Convert to ${targetExt.toUpperCase()}`}
                    </span>
                  </button>
                </>
              )}

              {error && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Output Preview & Handoff */}
          <div className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <div className="p-5 space-y-4 text-start">
              {!output ? (
                <div className="py-14 text-center space-y-2">
                  <FileCog className="w-8 h-8 text-[#52525B] mx-auto" />
                  <p className="text-xs font-mono text-[#71717A]">
                    {isAr
                      ? "اختر ملفاً وصيغة التحويل لمعاينة الملف الناتج وتنزيله أو تشفيره."
                      : "Select a source file and target format to convert, preview, and download."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#27272A]">
                    <div className="inline-flex items-center gap-2 text-xs font-mono text-[#FFFFFF]">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span className="font-bold truncate max-w-[200px]">{output.fileName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#A1A1AA] tabular-nums">
                      {Math.max(1, Math.ceil(output.size / 1024))} KB
                    </span>
                  </div>

                  {output.previewDataUrl && (
                    <div className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={output.previewDataUrl}
                        alt={output.fileName}
                        className="max-h-52 w-auto object-contain rounded"
                      />
                    </div>
                  )}

                  {(output.fullText || output.previewText) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#71717A]">
                          {isAr ? "معاينة المحتوى النصي" : "Extracted / Converted Text"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyOutputText}
                          className="h-7 px-2.5 rounded-md border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedText ? (
                            <>
                              <Check className="w-3 h-3 text-[#10B981]" />
                              <span>{isAr ? "تم النسخ" : "Copied"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{isAr ? "نسخ النص" : "Copy Text"}</span>
                            </>
                          )}
                        </button>
                      </div>
                      {!output.previewDataUrl && (
                        <pre
                          dir="auto"
                          className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] text-[11px] font-mono text-[#D4D4D8] max-h-48 overflow-auto whitespace-pre-wrap break-all select-all"
                        >
                          {output.previewText || output.fullText?.slice(0, 500)}
                        </pre>
                      )}
                    </div>
                  )}

                  {output.zipEntries && (
                    <div className="p-3 rounded-xl border border-[#27272A] bg-[#09090B] space-y-1 max-h-40 overflow-y-auto text-[11px] font-mono">
                      {output.zipEntries.map((ent, idx) => (
                        <div key={idx} className="flex justify-between gap-2 text-[#D4D4D8]">
                          <span className="truncate">{ent.name}</span>
                          <span className="text-[#71717A] shrink-0">{ent.size} B</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadOutput}
                      className="w-full h-11 px-4 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isAr ? `تحميل ${output.fileName}` : `Download ${output.fileName}`}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSendToSecureVault}
                        className="h-9 px-3 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>{isAr ? "مشاركة آمنة (01)" : "Secure Share"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendToQr}
                        className="h-9 px-3 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-[11px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isAr ? "تحويل لـ QR (03)" : "Send to QR"}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
