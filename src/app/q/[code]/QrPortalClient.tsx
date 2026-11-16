"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Lock,
  Fingerprint,
  ExternalLink,
  Download,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  Wifi,
  Contact,
  Code2,
  ShieldAlert,
  Clock,
  ArrowRight,
  Unlock,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import type { SmartQrPublicDTO } from "@/lib/smart-qr";
import type { Language } from "@/types";

interface QrPortalClientProps {
  shortCode: string;
}

export function QrPortalClient({ shortCode }: QrPortalClientProps) {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<"NOT_FOUND" | "LOAD_FAILED" | "NETWORK" | null>(null);
  const [qr, setQr] = useState<SmartQrPublicDTO | null>(null);
  const [locked, setLocked] = useState(false);
  const [available, setAvailable] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [bioChallenge, setBioChallenge] = useState<string | null>(null);
  const [bioChallengeToken, setBioChallengeToken] = useState<string | null>(null);
  const [collectedBioProof, setCollectedBioProof] = useState<{
    challengeToken: string;
    clientDataJSON: string;
    attestationObject: string;
  } | null>(null);

  const [pinInput, setPinInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [copied, setCopied] = useState(false);

  const error =
    errorCode === "NOT_FOUND"
      ? isAr
        ? "رمز QR غير موجود."
        : "QR code not found."
      : errorCode === "LOAD_FAILED"
      ? isAr
        ? "تعذر تحميل بيانات الكود."
        : "Failed to resolve Smart QR."
      : errorCode === "NETWORK"
      ? isAr
        ? "خطأ في الاتصال بالخادم."
        : "Network error."
      : null;

  const resolveQr = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch(`/api/qr/${encodeURIComponent(shortCode)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setErrorCode(res.status === 404 ? "NOT_FOUND" : "LOAD_FAILED");
        return;
      }
      const data = await res.json();
      setQr(data.qr);
      setLocked(Boolean(data.locked));
      setAvailable(Boolean(data.available));
      setReason(data.reason || null);
      setUnlockToken(data.unlockToken || null);
      setBioChallenge(data.biometricChallenge || null);
      setBioChallengeToken(data.biometricChallengeToken || null);
      setCollectedBioProof(null);
    } catch {
      setErrorCode("NETWORK");
    } finally {
      setLoading(false);
    }
  }, [shortCode]);

  useEffect(() => {
    resolveQr();
  }, [resolveQr]);

  // Instant Auto-Redirect when unlocked open URL has autoRedirect enabled
  useEffect(() => {
    if (!loading && !locked && available && qr?.payloadType === "URL" && qr.autoRedirect && qr.destinationUrl) {
      const t = setTimeout(() => {
        window.location.href = qr.destinationUrl!;
      }, 900);
      return () => clearTimeout(t);
    }
  }, [loading, locked, available, qr]);

  const bytesToB64Url = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const b64UrlToBytes = (b64url: string): Uint8Array => {
    const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
    const bin = atob(b64url.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    if (qr?.biometricEnabled && !collectedBioProof) {
      setUnlockError(
        isAr
          ? "هذا الكود محمي بالبصمة مع رمز PIN — اضغط التحقق بالبصمة لإكمال فتح القفل."
          : "Biometric verification is also required — click Verify Biometric after entering PIN."
      );
      return;
    }
    setUnlockError(null);
    setUnlocking(true);
    try {
      const res = await fetch(`/api/qr/${encodeURIComponent(shortCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinInput.trim(),
          biometricProof: collectedBioProof || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(
          data.error || (isAr ? "رمز الدخول غير صحيح." : "Incorrect PIN.")
        );
        return;
      }
      setQr(data.qr);
      setUnlockToken(data.unlockToken);
      setLocked(false);
    } catch {
      setUnlockError(isAr ? "فشل التحقق." : "Verification failed.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setUnlockError(null);
    if (qr?.hasPin && !pinInput.trim()) {
      setUnlockError(
        isAr
          ? "أدخل رمز PIN أعلاه أولاً ثم اضغط التحقق بالبصمة."
          : "Enter PIN above first, then click Verify Biometric."
      );
      return;
    }
    if (!bioChallenge || !bioChallengeToken) {
      setUnlockError(
        isAr ? "تعذر إصدار تحدي البصمة من الخادم — أعد المحاولة." : "Missing server biometric challenge."
      );
      return;
    }
    setUnlocking(true);
    try {
      let proof: {
        challengeToken: string;
        clientDataJSON: string;
        attestationObject: string;
      } | null = null;

      if (typeof window !== "undefined" && window.PublicKeyCredential && navigator.credentials) {
        try {
          const challenge = b64UrlToBytes(bioChallenge);
          const rpId =
            window.location.hostname === "127.0.0.1" ? undefined : window.location.hostname;
          const userId = new TextEncoder().encode(`unlock_${shortCode}`.slice(0, 16));
          const cred = (await navigator.credentials.create({
            publicKey: {
              challenge: challenge.buffer.slice(
                challenge.byteOffset,
                challenge.byteOffset + challenge.byteLength
              ) as ArrayBuffer,
              rp: {
                name: "AI mata",
                ...(rpId ? { id: rpId } : {}),
              },
              user: {
                id: userId,
                name: `gate_${shortCode.toLowerCase()}`,
                displayName: `AI mata (${shortCode})`,
              },
              pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" },
              ],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
              },
              timeout: 45000,
            },
          })) as PublicKeyCredential | null;
          if (cred && cred.response) {
            const attResp = cred.response as AuthenticatorAttestationResponse;
            proof = {
              challengeToken: bioChallengeToken,
              clientDataJSON: bytesToB64Url(attResp.clientDataJSON),
              attestationObject: bytesToB64Url(attResp.attestationObject),
            };
          }
        } catch (err) {
          const name = err instanceof Error ? err.name : "";
          if (name === "NotAllowedError") {
            setUnlockError(
              isAr ? "تم إلغاء التحقق بالبصمة." : "Biometric prompt cancelled."
            );
            setUnlocking(false);
            return;
          }
          proof = null;
        }
      }

      if (!proof) {
        setUnlockError(
          isAr
            ? "حساس البصمة غير متاح على هذا المتصفح."
            : "Biometric authenticator unavailable on this browser."
        );
        setUnlocking(false);
        return;
      }

      setCollectedBioProof(proof);

      const res = await fetch(`/api/qr/${encodeURIComponent(shortCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(qr?.hasPin ? { pin: pinInput.trim() } : {}),
          biometricProof: proof,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || "Biometric check failed.");
        return;
      }
      setQr(data.qr);
      setUnlockToken(data.unlockToken);
      setLocked(false);
    } finally {
      setUnlocking(false);
    }
  };

  const handleCopyText = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadVcard = () => {
    if (!qr?.payloadData) return;
    const fn = String(qr.payloadData.fullName || qr.title);
    const phone = String(qr.payloadData.phone || "");
    const email = String(qr.payloadData.email || "");
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${fn}`,
      phone ? `TEL:${phone}` : "",
      email ? `EMAIL:${email}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${qr.shortCode}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileInlineUrl =
    qr && qr.hasFileData
      ? `/api/qr/${encodeURIComponent(qr.shortCode)}/file?token=${encodeURIComponent(
          unlockToken || ""
        )}`
      : null;
  const fileDownloadUrl = fileInlineUrl ? `${fileInlineUrl}&download=1` : null;

  const linksItems = Array.isArray(qr?.payloadData?.links)
    ? (qr!.payloadData!.links as { label: string; url: string }[])
    : [];

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

      <main className="flex-1 relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={45} status="working" label="RESOLVING" />
            <div className="p-10 text-center font-mono text-xs text-[#A1A1AA]">
              {isAr ? "جارٍ الفتح..." : "Loading..."}
            </div>
          </div>
        ) : error || !qr ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={20} status="error" label="UNAVAILABLE" />
            <div className="p-8 text-center space-y-5">
              <div className="w-12 h-12 rounded-xl border border-[#27272A] bg-[#09090B] flex items-center justify-center mx-auto">
                <ShieldAlert className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold text-[#FFFFFF] font-display">
                  {isAr ? "الرمز غير متاح" : "QR Unavailable"}
                </h1>
                <p className="text-xs font-mono text-[#A1A1AA]">{error}</p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase transition-all duration-150"
              >
                <span>{isAr ? "إنشاء كود جديد" : "Create QR"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : !available ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={15} status="error" label={reason || "BLOCKED"} />
            <div className="p-8 text-center space-y-5">
              <div className="w-12 h-12 rounded-xl border border-[#27272A] bg-[#09090B] flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-[#71717A] uppercase block">
                  {qr.shortCode} · {qr.payloadType}
                </span>
                <h1 className="text-xl font-bold text-[#FFFFFF] font-display">
                  {reason === "LIMIT_REACHED"
                    ? isAr
                      ? "انتهى الحد الأقصى للمسح"
                      : "Scan Limit Reached"
                    : reason === "EXPIRED"
                    ? isAr
                      ? "انتهت الصلاحية الزمنية"
                      : "QR Expired"
                    : isAr
                    ? "تم إيقاف هذا الكود"
                    : "QR Paused"}
                </h1>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase transition-all duration-150"
              >
                <span>{isAr ? "إدارة الأكواد" : "Dashboard"}</span>
              </Link>
            </div>
          </div>
        ) : locked ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar
              level={unlocking ? 65 : pinInput.trim() ? 80 : 40}
              status={unlocking ? "working" : unlockError ? "error" : "active"}
              label={qr.shortCode}
              metricText={qr.biometricEnabled && qr.hasPin ? "PIN + BIO" : qr.hasPin ? "PIN LOCK" : "BIO LOCK"}
            />
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#27272A]">
                <div className="space-y-1.5 text-start">
                  <span className="text-[11px] font-mono uppercase text-[#71717A] block">
                    {qr.shortCode} · {qr.payloadType}
                  </span>
                  <h1 className="text-xl font-display font-bold text-[#FFFFFF]">
                    {qr.title}
                  </h1>
                </div>
                <div className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#09090B] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-[#FFFFFF]" />
                </div>
              </div>

              {qr.hasPin && (
                <form onSubmit={handlePinUnlock} className="space-y-3">
                  <label className="text-[11px] font-mono text-[#A1A1AA] block text-start">
                    {isAr ? "رمز الدخول" : "Enter PIN"}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      dir="ltr"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="••••"
                      autoFocus
                      className="flex-1 h-11 px-3.5 rounded-lg bg-[#09090B] border border-[#27272A] text-sm font-mono text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <button
                      type="submit"
                      disabled={unlocking}
                      className="h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{isAr ? "فتح" : "Unlock"}</span>
                    </button>
                  </div>
                </form>
              )}

              {qr.biometricEnabled && (
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleBiometricUnlock}
                    disabled={unlocking}
                    className="w-full h-11 px-5 rounded-lg bg-[#09090B] text-[#FFFFFF] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{isAr ? "التحقق بالبصمة" : "Verify Biometric"}</span>
                  </button>
                </div>
              )}

              {unlockError && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF] text-start">
                  {unlockError}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={100} status="success" label={qr.shortCode} metricText="VERIFIED" />
            <div className="p-6 sm:p-8 space-y-6 text-start">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#27272A]">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#A1A1AA]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span>
                      {qr.shortCode} · {qr.payloadType}
                    </span>
                  </div>
                  <h1 className="text-2xl font-display font-bold text-[#FFFFFF]">
                    {qr.title}
                  </h1>
                </div>
                <span className="px-2.5 py-1 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#A1A1AA] tabular-nums">
                  {isAr ? `المسح: ${qr.scanCount}` : `Scans: ${qr.scanCount}`}
                  {qr.maxScans ? ` / ${qr.maxScans}` : ""}
                </span>
              </div>

              {qr.payloadType === "URL" && qr.destinationUrl && (
                <div className="space-y-4">
                  <div
                    dir="ltr"
                    className="p-3.5 rounded-lg bg-[#09090B] border border-[#27272A] font-mono text-xs text-[#FFFFFF] break-all"
                  >
                    {qr.destinationUrl}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={qr.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150"
                    >
                      <span>{isAr ? "فتح الرابط الآن" : "Open Link"}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyText(qr.destinationUrl || "")}
                      className="w-11 h-11 rounded-lg bg-[#09090B] text-[#FFFFFF] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] flex items-center justify-center cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {qr.payloadType === "LINKS" && (
                <div className="space-y-2.5">
                  {linksItems.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-12 px-4 rounded-xl bg-[#09090B] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-between gap-3 font-sans font-bold text-sm transition-all duration-150"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ))}
                </div>
              )}

              {(qr.payloadType === "PDF" || qr.payloadType === "DOCX") && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#09090B] border border-[#27272A] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#121215] flex items-center justify-center shrink-0">
                        {qr.payloadType === "PDF" ? (
                          <FileText className="w-4 h-4 text-[#FFFFFF]" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-[#FFFFFF]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-bold text-[#FFFFFF] block truncate">
                          {qr.fileName || qr.destinationUrl || "Document"}
                        </span>
                        <span className="text-[11px] font-mono text-[#71717A] block">
                          {qr.payloadType}
                          {qr.fileSize ? ` · ${Math.ceil(qr.fileSize / 1024)} KB` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {qr.payloadType === "PDF" && fileInlineUrl && (
                    <div className="rounded-lg border border-[#27272A] overflow-hidden bg-[#FFFFFF] h-[420px]">
                      <iframe
                        src={fileInlineUrl}
                        title={qr.fileName || "PDF"}
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {fileDownloadUrl && (
                      <a
                        href={fileDownloadUrl}
                        download={qr.fileName || `${qr.shortCode}.${qr.payloadType.toLowerCase()}`}
                        className="flex-1 h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {qr.payloadType === "PDF"
                            ? isAr
                              ? "تحميل PDF"
                              : "Download PDF"
                            : isAr
                            ? "تحميل Word"
                            : "Download Word"}
                        </span>
                      </a>
                    )}
                    {!fileDownloadUrl && qr.destinationUrl && (
                      <a
                        href={qr.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{isAr ? "فتح المستند" : "Open Document"}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {qr.payloadType === "VCARD" && qr.payloadData && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#09090B] border border-[#27272A] space-y-2 font-mono text-xs">
                    <div className="flex items-center gap-2 text-[#FFFFFF] font-bold text-sm">
                      <Contact className="w-4 h-4" />
                      <span>{String(qr.payloadData.fullName || qr.title)}</span>
                    </div>
                    {Boolean(qr.payloadData.phone) && (
                      <div dir="ltr" className="text-[#A1A1AA]">
                        TEL: {String(qr.payloadData.phone)}
                      </div>
                    )}
                    {Boolean(qr.payloadData.email) && (
                      <div dir="ltr" className="text-[#A1A1AA]">
                        EMAIL: {String(qr.payloadData.email)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadVcard}
                    className="w-full h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAr ? "حفظ جهة الاتصال (.vcf)" : "Save Contact (.vcf)"}</span>
                  </button>
                </div>
              )}

              {qr.payloadType === "WIFI" && qr.payloadData && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#09090B] border border-[#27272A] space-y-2.5 font-mono text-xs">
                    <div className="flex items-center gap-2 text-[#FFFFFF] font-bold">
                      <Wifi className="w-4 h-4" />
                      <span dir="ltr">SSID: {String(qr.payloadData.ssid || "")}</span>
                    </div>
                    <div className="text-[#A1A1AA]" dir="ltr">
                      PASSWORD: {String(qr.payloadData.password || "(None)")}
                    </div>
                    <div className="text-[#71717A]" dir="ltr">
                      SECURITY: {String(qr.payloadData.encryption || "WPA")}
                    </div>
                  </div>
                  {Boolean(qr.payloadData.password) && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(String(qr.payloadData?.password || ""))}
                      className="w-full h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>
                        {copied
                          ? isAr
                            ? "تم النسخ"
                            : "Copied"
                          : isAr
                          ? "نسخ كلمة المرور"
                          : "Copy Password"}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {qr.payloadType === "TEXT" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#09090B] border border-[#27272A] font-mono text-xs text-[#FFFFFF] whitespace-pre-wrap break-all" dir="ltr">
                    <div className="flex items-center gap-2 text-[#71717A] mb-2">
                      <Code2 className="w-3.5 h-3.5" />
                      <span>TEXT</span>
                    </div>
                    {String(qr.payloadData?.text || qr.destinationUrl || "")}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        String(qr.payloadData?.text || qr.destinationUrl || "")
                      )
                    }
                    className="w-full h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isAr ? "نسخ النص" : "Copy Text"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
