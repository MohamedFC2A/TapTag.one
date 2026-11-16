"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Fingerprint,
  Download,
  FileCheck2,
  ShieldAlert,
  Clock,
  KeyRound,
  Unlock,
  Flame,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import type { SecureSharePublicDTO } from "@/lib/secure-share";
import type { Language } from "@/types";
import { computeSha256Hex, decryptFileAesGcm } from "@/lib/e2ee-crypto";

interface SecureSharePortalClientProps {
  shareCode: string;
}

export function SecureSharePortalClient({ shareCode }: SecureSharePortalClientProps) {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<"NOT_FOUND" | "LOAD_FAILED" | "NETWORK" | null>(null);
  const [share, setShare] = useState<SecureSharePublicDTO | null>(null);
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
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [manualKeyHash, setManualKeyHash] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.startsWith("#k=")) {
      setManualKeyHash(window.location.hash.slice(3));
      return;
    }
    try {
      const cached = sessionStorage.getItem(`mata_share_key_${shareCode.toUpperCase()}`);
      if (cached) {
        setManualKeyHash(cached.startsWith("#k=") ? cached.slice(3) : cached);
      }
    } catch {
      // ignore storage errors
    }
  }, [shareCode]);

  const error =
    errorCode === "NOT_FOUND"
      ? isAr
        ? "رابط المشاركة غير موجود."
        : "Secure share not found."
      : errorCode === "LOAD_FAILED"
      ? isAr
        ? "تعذر تحميل بيانات الملف."
        : "Failed to load secure share."
      : errorCode === "NETWORK"
      ? isAr
        ? "خطأ في الاتصال بالخادم."
        : "Network error."
      : null;

  const resolveShare = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(shareCode)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setErrorCode(res.status === 404 ? "NOT_FOUND" : "LOAD_FAILED");
        return;
      }
      const data = await res.json();
      setShare(data.share);
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
  }, [shareCode]);

  useEffect(() => {
    resolveShare();
  }, [resolveShare]);

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
    if (share?.biometricEnabled && !collectedBioProof) {
      setUnlockError(
        isAr
          ? "هذا الملف محمي بالبصمة مع رمز PIN — اضغط التحقق بالبصمة لإكمال فتح القفل."
          : "Biometric verification is also required — click Verify Biometric after entering PIN."
      );
      return;
    }
    setUnlockError(null);
    setUnlocking(true);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(shareCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinInput.trim(),
          biometricProof: collectedBioProof || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || (isAr ? "رمز الدخول غير صحيح." : "Invalid PIN."));
        return;
      }
      setShare(data.share);
      setUnlockToken(data.unlockToken);
      setLocked(false);
    } finally {
      setUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setUnlockError(null);
    if (share?.hasPin && !pinInput.trim()) {
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
                id: new TextEncoder().encode(`share_${shareCode}`.slice(0, 16)),
                name: `vault_${shareCode.toLowerCase()}`,
                displayName: `AI mata (${shareCode})`,
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
        } catch {
          proof = null;
        }
      }
      if (!proof) {
        setUnlockError(
          isAr ? "فشل التحقق البيومتري على هذا الجهاز." : "Biometric verification unavailable."
        );
        return;
      }

      setCollectedBioProof(proof);

      const res = await fetch(`/api/share/${encodeURIComponent(shareCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(share?.hasPin ? { pin: pinInput.trim() } : {}),
          biometricProof: proof,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || "Biometric check failed.");
        return;
      }
      setShare(data.share);
      setUnlockToken(data.unlockToken);
      setLocked(false);
    } finally {
      setUnlocking(false);
    }
  };

  const handleSecureDownload = async () => {
    if (!share) return;
    setDownloading(true);
    setDownloadStatus(null);
    setUnlockError(null);

    try {
      if (share.isEncrypted) {
        let keySource = manualKeyHash.trim();
        const kMarker = keySource.indexOf("#k=");
        if (kMarker !== -1) {
          keySource = keySource.slice(kMarker + 3);
        } else if (keySource.startsWith("k=")) {
          keySource = keySource.slice(2);
        }
        const parts = keySource.split(".");
        const ivMeta =
          typeof share.encryptionMeta?.iv === "string" ? share.encryptionMeta.iv : parts[1];
        const keyB64 = parts[0];
        if (!keyB64 || !ivMeta) {
          setUnlockError(
            isAr
              ? "مفتاح فك التشفير (#k=...) غير موجود في الرابط — ألصق المفتاح أدناه."
              : "Missing decryption key (#k=...) — paste the key fragment below."
          );
          setDownloading(false);
          return;
        }

        const res = await fetch(
          `/api/share/${encodeURIComponent(share.shareCode)}/download?token=${encodeURIComponent(
            unlockToken || ""
          )}`
        );
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          setUnlockError(errJson.error || "Download blocked.");
          setDownloading(false);
          return;
        }
        const cipherBuf = await res.arrayBuffer();
        const plainBuf = await decryptFileAesGcm(cipherBuf, keyB64, ivMeta);
        const actualSha = await computeSha256Hex(plainBuf);

        const origMime =
          typeof share.encryptionMeta?.origMime === "string"
            ? share.encryptionMeta.origMime
            : share.fileMimeType;
        const origName =
          typeof share.encryptionMeta?.origName === "string"
            ? share.encryptionMeta.origName
            : share.fileName;

        const blob = new Blob([plainBuf], { type: origMime || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = origName;
        a.click();
        URL.revokeObjectURL(url);

        setDownloadStatus(
          actualSha === share.fileSha256
            ? isAr
              ? `تم فك التشفير والتحقق من سلامة SHA-256 بنجاح`
              : `Decrypted & SHA-256 verified (${actualSha.slice(0, 12)}...)`
            : isAr
            ? "تم فك التشفير وتحميل الملف."
            : "Decrypted and downloaded."
        );
      } else {
        const url = `/api/share/${encodeURIComponent(
          share.shareCode
        )}/download?token=${encodeURIComponent(unlockToken || "")}`;
        const res = await fetch(url);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          setUnlockError(errJson.error || "Download unavailable.");
          setDownloading(false);
          return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = share.fileName;
        a.click();
        URL.revokeObjectURL(blobUrl);
        setDownloadStatus(isAr ? "تم تنزيل الملف بنجاح." : "File downloaded securely.");
      }

      await resolveShare();
    } catch {
      setUnlockError(
        isAr
          ? "تعذر فك تشفير الملف — تأكد من اكتمال مفتاح فك التشفير في الرابط."
          : "Decryption failed — verify the full share link including #k=..."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col relative ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="fixed inset-0 hw-pixel-grid pointer-events-none" aria-hidden="true" />
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={50} status="working" label="INSPECTING" />
            <div className="p-10 text-center font-mono text-xs text-[#A1A1AA]">
              {isAr ? "جارٍ فحص الخزنة المشفرة..." : "Inspecting vault..."}
            </div>
          </div>
        ) : error || !share ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={15} status="error" label="UNAVAILABLE" />
            <div className="p-8 text-center space-y-5">
              <ShieldAlert className="w-10 h-10 text-[#FFFFFF] mx-auto" />
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold text-[#FFFFFF] font-display">
                  {isAr ? "الملف غير متاح" : "Vault Unavailable"}
                </h1>
                <p className="text-xs font-mono text-[#A1A1AA]">{error}</p>
              </div>
              <Link
                href="/#secure-share"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs uppercase"
              >
                <span>{isAr ? "إنشاء مشاركة آمنة" : "Create Secure Share"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : !available ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar level={15} status="error" label={share.shareCode} metricText={reason || "CLOSED"} />
            <div className="p-8 text-center space-y-5">
              {reason === "BURNED" ? (
                <Flame className="w-10 h-10 text-[#FFFFFF] mx-auto" />
              ) : (
                <Clock className="w-10 h-10 text-[#FFFFFF] mx-auto" />
              )}
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold text-[#FFFFFF] font-display">
                  {reason === "BURNED"
                    ? isAr
                      ? "تم حرق الملف تلقائياً بعد التحميل"
                      : "File Burned After Download"
                    : reason === "EXPIRED"
                    ? isAr
                      ? "انتهت صلاحية الرابط الزمنية"
                      : "Share Link Expired"
                    : reason === "LIMIT_REACHED"
                    ? isAr
                      ? "اكتمل الحد الأقصى للتحميل"
                      : "Download Quota Reached"
                    : isAr
                    ? "تم إيقاف الرابط من المرسل"
                    : "Share Revoked"}
                </h1>
              </div>
              <Link
                href="/#secure-share"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs uppercase"
              >
                <span>{isAr ? "العودة للرئيسية" : "Back Home"}</span>
              </Link>
            </div>
          </div>
        ) : locked ? (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar
              level={unlocking ? 70 : pinInput.trim() ? 80 : 40}
              status={unlocking ? "working" : unlockError ? "error" : "active"}
              label={share.shareCode}
              metricText={share.isEncrypted ? "AES-256-GCM" : "PIN LOCK"}
            />
            <div className="p-6 sm:p-8 space-y-5 text-start">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#27272A]">
                <div className="space-y-1.5">
                  <h1 className="text-xl font-display font-bold text-[#FFFFFF]">
                    {share.title}
                  </h1>
                  <span className="text-[11px] font-mono text-[#71717A] block">
                    {share.shareCode} · {Math.max(1, Math.ceil(share.fileSize / 1024))} KB
                  </span>
                </div>
                <div className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#09090B] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-[#FFFFFF]" />
                </div>
              </div>

              {share.hasPin && (
                <form onSubmit={handlePinUnlock} className="space-y-2.5">
                  <label className="text-xs font-mono text-[#A1A1AA] block">
                    {isAr ? "أدخل رمز PIN لفك القفل" : "Enter PIN to unlock"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      dir="ltr"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="••••"
                      autoFocus
                      className="flex-1 h-11 px-3.5 rounded-lg bg-[#09090B] border border-[#27272A] text-sm font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                    <button
                      type="submit"
                      disabled={unlocking}
                      className="h-11 px-5 rounded-lg bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs uppercase inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{isAr ? "فتح" : "Unlock"}</span>
                    </button>
                  </div>
                </form>
              )}

              {share.biometricEnabled && (
                <button
                  type="button"
                  onClick={handleBiometricUnlock}
                  disabled={unlocking}
                  className="w-full h-11 px-5 rounded-lg bg-[#09090B] text-[#FFFFFF] border border-[#27272A] hover:bg-[#FFFFFF] hover:text-[#09090B] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{isAr ? "التحقق بالبصمة" : "Verify Biometric"}</span>
                </button>
              )}

              {unlockError && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  {unlockError}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <SegmentedLedBar
              level={100}
              status="success"
              label={share.shareCode}
              metricText={share.isEncrypted ? "AES-256 E2EE" : "READY"}
            />
            <div className="p-6 sm:p-8 space-y-5 text-start">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#27272A]">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#A1A1AA]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span>{share.isEncrypted ? "AES-256-GCM E2EE" : "SECURE VAULT"}</span>
                    </span>
                  </div>
                  <h1 className="text-2xl font-display font-bold text-[#FFFFFF]">
                    {share.title}
                  </h1>
                </div>

                <span className="px-2.5 py-1 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#A1A1AA] tabular-nums">
                  {share.downloadCount}
                  {share.maxDownloads ? ` / ${share.maxDownloads}` : " / ∞"}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2">
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="w-5 h-5 text-[#FFFFFF] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-mono font-bold text-[#FFFFFF] block truncate">
                      {share.fileName}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717A] block">
                      {Math.max(1, Math.ceil(share.fileSize / 1024))} KB · {share.fileMimeType}
                    </span>
                  </div>
                </div>
                <div dir="ltr" className="text-[10px] font-mono text-[#71717A] break-all pt-1 border-t border-[#27272A]">
                  SHA-256: {share.fileSha256}
                </div>
              </div>

              {share.isEncrypted && !manualKeyHash && (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#A1A1AA] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {isAr
                        ? "مفتاح فك التشفير (عادةً مرفق تلقائياً بعد #k= في الرابط):"
                        : "Decryption Key (auto-loaded from #k= URL hash):"}
                    </span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={manualKeyHash}
                    onChange={(e) => setManualKeyHash(e.target.value)}
                    placeholder="key.iv"
                    className="w-full h-10 px-3 rounded-lg bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FFFFFF]"
                  />
                </div>
              )}

              {share.burnAfterRead && (
                <div className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] text-[11px] font-mono text-[#A1A1AA] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FFFFFF] shrink-0" />
                  <span>
                    {isAr
                      ? "تحذير: هذا الملف مضبوط على الحرق التلقائي — سينتهي الرابط فور تنزيله مرة واحدة."
                      : "Warning: Burn-After-Read enabled — link self-destructs after this download."}
                  </span>
                </div>
              )}

              {unlockError && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  {unlockError}
                </div>
              )}

              {downloadStatus && (
                <div className="p-3 rounded-lg border border-[#27272A] bg-[#09090B] text-xs font-mono text-[#FFFFFF] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#10B981]" />
                  <span>{downloadStatus}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSecureDownload}
                disabled={downloading}
                className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs uppercase inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloading
                    ? isAr
                      ? "جارٍ التنزيل وفك التشفير..."
                      : "Downloading & Decrypting..."
                    : share.isEncrypted
                    ? isAr
                      ? "فك التشفير وتحميل الملف الآمن"
                      : "Decrypt & Download File"
                    : isAr
                    ? "تحميل الملف الآمن"
                    : "Download Secure File"}
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
