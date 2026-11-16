"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Fingerprint,
  Flame,
  Upload,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Power,
  KeyRound,
  FileCheck2,
  X,
  QrCode,
  RefreshCw,
} from "lucide-react";
import type { Language } from "@/types";
import type { SecureSharePublicDTO } from "@/lib/secure-share";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { MataSectionHeader } from "@/components/ui/MataLogo";
import { QrRenderMatrix } from "@/components/qr/QrRenderMatrix";
import {
  arrayBufferToBase64,
  computeSha256Hex,
  encryptFileAesGcm,
} from "@/lib/e2ee-crypto";
import { dispatchToQrStudio, FileTransferEventDetail } from "@/lib/mata-events";

interface SecureShareSectionProps {
  lang: Language;
}

export function SecureShareSection({ lang }: SecureShareSectionProps) {
  const isAr = lang === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [e2eeEnabled, setE2eeEnabled] = useState(true);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [bioEnabled, setBioEnabled] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState("UNLIMITED");
  const [ttlHours, setTtlHours] = useState("24");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<SecureSharePublicDTO | null>(null);
  const [copied, setCopied] = useState(false);

  const [shares, setShares] = useState<SecureSharePublicDTO[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [cachedKeyFragments, setCachedKeyFragments] = useState<Record<string, string>>({});

  const loadShares = useCallback(async () => {
    try {
      const res = await fetch("/api/share", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.shares)) {
        setShares(data.shares);
        if (typeof window !== "undefined") {
          const map: Record<string, string> = {};
          for (const item of data.shares as SecureSharePublicDTO[]) {
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
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // Listen for cross-section file handoffs (e.g. from File Converter or Extractor)
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<FileTransferEventDetail>).detail;
      if (detail?.file) {
        handlePickFile(detail.file);
      }
    };
    window.addEventListener("mata:prefill-share", onPrefill);
    return () => window.removeEventListener("mata:prefill-share", onPrefill);
  }, []);

  const handlePickFile = (file: File) => {
    setError(null);
    setCreatedShare(null);
    setCreatedShareUrl(null);
    if (file.size === 0) {
      setError(isAr ? "الملف فارغ." : "File is empty.");
      return;
    }
    if (file.size > 1_073_741_824) {
      setError(
        isAr
          ? "الحد الأقصى لحجم الملف هو 1 جيجابايت."
          : "Maximum file size is 1 GB."
      );
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleCreateShare = async () => {
    setError(null);
    if (!selectedFile) {
      setError(isAr ? "اختر ملفاً أولاً لرفعه وتشفيره." : "Select a file first.");
      return;
    }
    if (pinEnabled && pinCode.trim().length < 3) {
      setError(
        isAr
          ? "أدخل رمز PIN من 3 خانات على الأقل."
          : "PIN must be at least 3 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const buf = await selectedFile.arrayBuffer();
      let payloadBase64 = "";
      let sha256Plain = "";
      let keyFrag = "";
      let encryptionMeta: Record<string, unknown> | null = null;

      if (e2eeEnabled) {
        const enc = await encryptFileAesGcm(buf);
        payloadBase64 = enc.encryptedBase64;
        sha256Plain = enc.sha256Plain;
        keyFrag = `#k=${enc.keyBase64Url}.${enc.ivBase64Url}`;
        encryptionMeta = {
          alg: "AES-256-GCM",
          iv: enc.ivBase64Url,
          origName: selectedFile.name,
          origMime: selectedFile.type || "application/octet-stream",
          origSize: selectedFile.size,
        };
      } else {
        payloadBase64 = arrayBufferToBase64(buf);
        sha256Plain = await computeSha256Hex(buf);
      }

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || selectedFile.name,
          customAlias: customAlias.trim() || null,
          fileName: selectedFile.name,
          fileMimeType: selectedFile.type || "application/octet-stream",
          fileSize: selectedFile.size,
          fileSha256: sha256Plain,
          fileDataBase64: payloadBase64,
          isEncrypted: e2eeEnabled,
          encryptionMeta,
          pin: pinEnabled ? pinCode.trim() : null,
          biometricEnabled: bioEnabled,
          burnAfterRead,
          maxDownloads: burnAfterRead
            ? 1
            : maxDownloads === "UNLIMITED"
            ? null
            : Number(maxDownloads),
          ttlHours: ttlHours === "PERMANENT" ? null : Number(ttlHours),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.share) {
        setError(data.error || "Failed to create secure share");
        return;
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "https://taptag.one";
      const shareUrl = `${origin}/s/${data.share.shareCode}${keyFrag}`;
      if (keyFrag && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`mata_share_key_${data.share.shareCode}`, keyFrag);
          setCachedKeyFragments((prev) => ({
            ...prev,
            [data.share.shareCode]: keyFrag,
          }));
        } catch {
          // ignore storage quota errors
        }
      }
      setCreatedShare(data.share);
      setCreatedShareUrl(shareUrl);
      await loadShares();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isAr ? "فشل تشفير أو رفع الملف." : "Upload failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: SecureSharePublicDTO) => {
    await fetch(`/api/share/${encodeURIComponent(item.shareCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await loadShares();
  };

  const handleDelete = async (item: SecureSharePublicDTO) => {
    await fetch(`/api/share/${encodeURIComponent(item.shareCode)}`, {
      method: "DELETE",
    });
    if (createdShare?.shareCode === item.shareCode) {
      setCreatedShare(null);
      setCreatedShareUrl(null);
    }
    await loadShares();
  };

  const handleCopyLink = async () => {
    if (!createdShareUrl) return;
    try {
      await navigator.clipboard.writeText(createdShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <section id="secure-share" className="hw-no-print w-full border-b border-[#27272A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <MataSectionHeader
          sectionNumber="01"
          titleAr="مشاركة الملفات المشفرة الآمنة"
          titleEn="Secure Encrypted File Share"
          subtitleAr="ارفع أي ملف مع تشفير AES-256-GCM صفري المعرفة من جهازك، رمز PIN، بصمة، صلاحية زمنية، وحرق تلقائي بعد التحميل."
          subtitleEn="Share any file with zero-knowledge browser AES-256-GCM encryption, PIN/Biometric lock, download quota, and burn-after-read."
          badgeText="AES-256-GCM · ZERO-KNOWLEDGE"
          isAr={isAr}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Upload & Security Vault Config */}
          <div className="lg:col-span-7 rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            {(() => {
              const securityScore =
                (selectedFile ? 20 : 0) +
                (e2eeEnabled ? 35 : 0) +
                (pinEnabled ? (pinCode.trim().length >= 3 ? 25 : 10) : 0) +
                (bioEnabled ? 10 : 0) +
                (burnAfterRead || maxDownloads !== "UNLIMITED" ? 10 : 0);
              return (
                <SegmentedLedBar
                  level={isSubmitting ? 65 : createdShare ? 100 : securityScore}
                  status={
                    isSubmitting
                      ? "working"
                      : error
                      ? "error"
                      : createdShare
                      ? "success"
                      : securityScore > 0
                      ? "active"
                      : "idle"
                  }
                  label={createdShare?.shareCode || (e2eeEnabled ? "AES-256" : "VAULT")}
                  metricText={
                    createdShare
                      ? "READY"
                      : `${securityScore}%`
                  }
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
                  const f = e.dataTransfer.files?.[0];
                  if (f) handlePickFile(f);
                }}
                className={`p-5 rounded-xl border transition-colors duration-150 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  isDragging
                    ? "border-[#FFFFFF] bg-[#18181B]"
                    : "border-[#27272A] bg-[#09090B]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePickFile(f);
                  }}
                  className="hidden"
                />

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl border border-[#27272A] bg-[#121215] flex items-center justify-center shrink-0">
                    {selectedFile ? (
                      <FileCheck2 className="w-5 h-5 text-[#FFFFFF]" />
                    ) : (
                      <Shield className="w-5 h-5 text-[#FFFFFF]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#FFFFFF] block truncate">
                      {selectedFile
                        ? selectedFile.name
                        : isAr
                        ? "اسحب أي ملف هنا أو اختر من جهازك"
                        : "Drop any file here or browse"}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717A] block">
                      {selectedFile
                        ? `${Math.max(1, Math.ceil(selectedFile.size / 1024))} KB · ${
                            selectedFile.type || "binary"
                          }`
                        : isAr
                        ? "جميع الصيغ مدعومة (PDF, DOCX, ZIP, صور, فيديو, بيانات... حتى 3.2MB)"
                        : "All formats supported (up to 3.2 MB)"}
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
                    <span>{selectedFile ? (isAr ? "تغيير" : "Swap") : isAr ? "اختيار ملف" : "Select File"}</span>
                  </button>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setCreatedShare(null);
                        setCreatedShareUrl(null);
                      }}
                      aria-label="Clear selected file"
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Alias */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAr ? "وصف الملف (اختياري)" : "Title (optional)"}
                  className="sm:col-span-2 h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder={isAr ? "كود مخصص (doc-01)" : "Alias (optional)"}
                  className="sm:col-span-1 h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                />
              </div>

              {/* Protection Switches */}
              <div className="p-3.5 rounded-xl border border-[#27272A] bg-[#09090B] space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setE2eeEnabled((v) => !v)}
                    className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer ${
                      e2eeEnabled
                        ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                        : "bg-[#121215] text-[#A1A1AA] border-[#27272A]"
                    }`}
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{isAr ? "تشفير AES-256 صفري" : "AES-256 E2EE"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPinEnabled((v) => !v)}
                    className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer ${
                      pinEnabled
                        ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                        : "bg-[#121215] text-[#A1A1AA] border-[#27272A]"
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{isAr ? "رمز سري PIN" : "PIN Lock"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBioEnabled((v) => !v)}
                    className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer ${
                      bioEnabled
                        ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                        : "bg-[#121215] text-[#A1A1AA] border-[#27272A]"
                    }`}
                  >
                    <Fingerprint className="w-3 h-3" />
                    <span>{isAr ? "بصمة" : "Biometric"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBurnAfterRead((v) => !v)}
                    className={`h-8 px-2.5 rounded-md border text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer ${
                      burnAfterRead
                        ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                        : "bg-[#121215] text-[#A1A1AA] border-[#27272A]"
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>{isAr ? "حرق بعد تحميل 1x" : "Burn After 1x"}</span>
                  </button>
                </div>

                {pinEnabled && (
                  <input
                    type="password"
                    dir="ltr"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder={isAr ? "أدخل رمز PIN للحماية..." : "Enter PIN..."}
                    className="w-full h-9 px-3 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                  />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label={isAr ? "حد التحميل" : "Max Downloads"}
                    disabled={burnAfterRead}
                    value={burnAfterRead ? "1" : maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF] disabled:opacity-50"
                  >
                    <option value="UNLIMITED">{isAr ? "التحميلات: ∞" : "Downloads: ∞"}</option>
                    <option value="1">{isAr ? "تحميل واحد (1x)" : "1 Download"}</option>
                    <option value="5">{isAr ? "5 تحميلات" : "5 Downloads"}</option>
                    <option value="25">{isAr ? "25 تحميلاً" : "25 Downloads"}</option>
                  </select>

                  <select
                    aria-label={isAr ? "الصلاحية" : "Expiry"}
                    value={ttlHours}
                    onChange={(e) => setTtlHours(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                  >
                    <option value="1">{isAr ? "ينتهي خلال: 1 ساعة" : "Expires: 1 Hour"}</option>
                    <option value="24">{isAr ? "ينتهي خلال: 24 ساعة" : "Expires: 24 Hours"}</option>
                    <option value="168">{isAr ? "ينتهي خلال: 7 أيام" : "Expires: 7 Days"}</option>
                    <option value="PERMANENT">{isAr ? "بدون انتهاء" : "No Expiry"}</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateShare}
                disabled={isSubmitting || !selectedFile}
                className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? isAr
                      ? "جارٍ التشفير والرفع..."
                      : "Encrypting & Uploading..."
                    : isAr
                    ? "تشفير وإنشاء رابط مشاركة آمن"
                    : "Encrypt & Generate Secure Link"}
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT: Generated Encrypted Link + QR + Vault Registry */}
          <div className="lg:col-span-5 space-y-5">
            {createdShare && createdShareUrl ? (
              <div className="rounded-xl border border-[#FFFFFF] bg-[#121215] overflow-hidden">
                <div className="p-5 space-y-4 text-start">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 text-xs font-mono text-[#FFFFFF]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span>{isAr ? "رابط مشفر جاهز" : "Encrypted Vault Ready"}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[#A1A1AA]">
                      {createdShare.isEncrypted ? "AES-256-GCM" : "PROTECTED"}
                    </span>
                  </div>

                  <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-4 flex flex-col items-center gap-2">
                    <QrRenderMatrix
                      value={createdShareUrl}
                      logoPreset="MATA"
                      moduleShape="square"
                      sizeClass="w-36 h-36"
                    />
                    <span dir="ltr" className="text-[10px] font-mono text-[#09090B] break-all text-center">
                      /s/{createdShare.shareCode}
                    </span>
                  </div>

                  <div
                    dir="ltr"
                    className="p-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-[11px] font-mono text-[#FFFFFF] break-all"
                  >
                    {createdShareUrl}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 h-9 px-3 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ الرابط" : "Copy Link"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        dispatchToQrStudio({
                          payloadType: "URL",
                          title: createdShare.title,
                          destinationUrl: createdShareUrl,
                          logoPreset: "MATA",
                          frameCaption: `SECURE // ${createdShare.shareCode}`,
                        })
                      }
                      className="h-9 px-3 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{isAr ? "تخصيص QR" : "QR Studio"}</span>
                    </button>

                    <Link
                      href={`/s/${createdShare.shareCode}${
                        createdShareUrl.includes("#")
                          ? `#${createdShareUrl.split("#")[1]}`
                          : ""
                      }`}
                      target="_blank"
                      className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Active Secure Vault List */}
            <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FFFFFF]">
                    {isAr ? "الملفات المشفرة الأخيرة" : "Recent Secure Shares"}
                  </span>
                  <button
                    type="button"
                    onClick={loadShares}
                    aria-label="Refresh shares"
                    className="w-8 h-8 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingList ? (
                  <div className="py-6 text-center text-xs font-mono text-[#71717A]">
                    {isAr ? "جارٍ التحميل..." : "Loading..."}
                  </div>
                ) : shares.length === 0 ? (
                  <div className="py-6 text-center text-xs font-mono text-[#71717A]">
                    {isAr ? "لا توجد مشاركات مشفرة بعد." : "No encrypted shares yet."}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto">
                    {shares.slice(0, 8).map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] flex items-center justify-between gap-2 text-start"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                s.isUsable ? "bg-[#10B981]" : "bg-[#52525B]"
                              }`}
                            />
                            <span className="text-xs font-bold text-[#FFFFFF] truncate">
                              {s.title}
                            </span>
                          </div>
                          <div dir="ltr" className="text-[10px] font-mono text-[#71717A] mt-0.5 flex flex-wrap gap-1.5">
                            <span>{s.shareCode}</span>
                            <span>·</span>
                            <span>{Math.max(1, Math.ceil(s.fileSize / 1024))} KB</span>
                            {s.isEncrypted && <span>· E2EE</span>}
                            {s.burnAfterRead && <span>· 1x BURN</span>}
                            <span>· DL {s.downloadCount}{s.maxDownloads ? `/${s.maxDownloads}` : ""}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" dir="ltr">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(s)}
                            title={s.isActive ? "Pause" : "Resume"}
                            className="w-8 h-8 rounded-md border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/s/${s.shareCode}${cachedKeyFragments[s.shareCode] || ""}`}
                            target="_blank"
                            className="w-8 h-8 rounded-md border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            title="Delete"
                            className="w-8 h-8 rounded-md border border-[#27272A] bg-[#121215] text-[#A1A1AA] hover:text-[#FFFFFF] hover:border-[#FFFFFF] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
