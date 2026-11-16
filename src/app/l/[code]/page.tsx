"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  FileText,
  Link2,
} from "lucide-react";
import { TapTagMataLockup } from "@/components/ui/TapTagLogo";
import { copyTextReliable } from "@/lib/clipboard";

interface PublicLinkData {
  code: string;
  title: string;
  contentType: "URL" | "VIDEO" | "IMAGE" | "TEXT";
  destinationUrl: string | null;
  contentBody: string | null;
  mediaUrl: string | null;
  redirectMode: "PREVIEW" | "DIRECT";
  isActive: boolean;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return url;
    }
  } catch {
    return null;
  }
  return null;
}

function detectViewportClass(): string {
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  if (w < 640) return "Mobile (<640px)";
  if (w <= 1024) return "Tablet (640-1024px)";
  return "Desktop (>1024px)";
}

export default function CustomerSmartLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [linkData, setLinkData] = useState<PublicLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const visitLoggedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadAndTrack() {
      try {
        const res = await fetch(`/api/links/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok || !data.link) {
          if (active) {
            setError("الرابط غير موجود أو تم إيقافه.");
            setLoading(false);
          }
          return;
        }

        const loaded = data.link as PublicLinkData;
        if (!loaded.isActive) {
          if (active) {
            setError("تم تعطيل هذا الرابط من قِبل صاحبه.");
            setLoading(false);
          }
          return;
        }

        if (active) setLinkData(loaded);

        if (!visitLoggedRef.current) {
          visitLoggedRef.current = true;
          const sp = new URLSearchParams(window.location.search);
          const colorScheme = window.matchMedia?.("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark";

          const trackPromise = fetch(`/api/links/${encodeURIComponent(code)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              action: "VISIT",
              clientLanguage: navigator.language || "",
              timezoneRegion: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
              viewportClass: detectViewportClass(),
              colorScheme,
              referrer: document.referrer || "",
              utmSource: sp.get("utm_source") || undefined,
              utmMedium: sp.get("utm_medium") || undefined,
              utmCampaign: sp.get("utm_campaign") || undefined,
            }),
          }).catch(() => {});

          if (loaded.redirectMode === "DIRECT" && loaded.destinationUrl) {
            await Promise.race([
              trackPromise,
              new Promise((resolve) => setTimeout(resolve, 420)),
            ]);
            window.location.replace(loaded.destinationUrl);
            return;
          }
        }

        if (active) setLoading(false);
      } catch {
        if (active) {
          setError("تعذر تحميل محتوى الرابط.");
          setLoading(false);
        }
      }
    }

    loadAndTrack();
    return () => {
      active = false;
    };
  }, [code]);

  const handleCtaOpen = async () => {
    if (!linkData?.destinationUrl) return;
    fetch(`/api/links/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ action: "CTA_CLICK" }),
    }).catch(() => {});
    window.location.href = linkData.destinationUrl;
  };

  const handleCopyBody = async () => {
    const txt = linkData?.contentBody || linkData?.destinationUrl || "";
    if (!txt) return;
    const ok = await copyTextReliable(txt);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1800);
    }
  };

  const ytEmbed =
    linkData?.contentType === "VIDEO" && (linkData.mediaUrl || linkData.destinationUrl)
      ? getYouTubeEmbedUrl(linkData.mediaUrl || linkData.destinationUrl || "")
      : null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#09090B] text-[#FFFFFF] flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between py-2">
        <Link href="/">
          <TapTagMataLockup size="sm" />
        </Link>
        <span className="text-[11px] font-mono text-[#71717A]" dir="ltr">
          {code.toUpperCase()}
        </span>
      </header>

      <main className="max-w-2xl w-full mx-auto my-auto py-8">
        {loading ? (
          <div className="rounded-2xl border border-[#27272A] bg-[#121215] p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#FFFFFF]" />
            <p className="text-xs font-mono text-[#A1A1AA]">
              جاري تجهيز المحتوى والتحقق من الرابط...
            </p>
          </div>
        ) : error || !linkData ? (
          <div className="rounded-2xl border border-[#27272A] bg-[#121215] p-10 text-center space-y-4">
            <p className="text-sm font-bold text-[#FFFFFF]">{error || "الرابط غير متاح"}</p>
            <Link
              href="/"
              className="inline-flex h-10 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] font-mono font-bold text-xs items-center"
            >
              العودة إلى taptag.
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#27272A] bg-[#121215] overflow-hidden">
            <div className="p-6 space-y-5 text-start">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#27272A]">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#A1A1AA]">
                    {linkData.contentType === "VIDEO" && <Film className="w-3.5 h-3.5" />}
                    {linkData.contentType === "IMAGE" && <ImageIcon className="w-3.5 h-3.5" />}
                    {linkData.contentType === "TEXT" && <FileText className="w-3.5 h-3.5" />}
                    {linkData.contentType === "URL" && <Link2 className="w-3.5 h-3.5" />}
                    <span>{linkData.contentType}</span>
                  </div>
                  <h1 className="text-xl font-bold text-[#FFFFFF] break-words">{linkData.title}</h1>
                </div>
              </div>

              {/* VIDEO PLAYER */}
              {linkData.contentType === "VIDEO" && (linkData.mediaUrl || linkData.destinationUrl) && (
                <div className="rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B]">
                  {ytEmbed ? (
                    <iframe
                      src={ytEmbed}
                      title={linkData.title}
                      className="w-full aspect-video"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={linkData.mediaUrl || linkData.destinationUrl || ""}
                      controls
                      className="w-full max-h-[420px] bg-black"
                    />
                  )}
                </div>
              )}

              {/* IMAGE VIEWER */}
              {linkData.contentType === "IMAGE" && (linkData.mediaUrl || linkData.destinationUrl) && (
                <div className="rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B] flex justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={linkData.mediaUrl || linkData.destinationUrl || ""}
                    alt={linkData.title}
                    className="max-h-[460px] w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {/* TEXT / CAPTION */}
              {linkData.contentBody && (
                <div className="p-4 rounded-xl border border-[#27272A] bg-[#09090B] space-y-3">
                  <p className="text-sm text-[#E4E4E7] whitespace-pre-wrap leading-relaxed select-all">
                    {linkData.contentBody}
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCopyBody}
                      className="h-8 px-3 rounded-lg border border-[#27272A] bg-[#121215] text-[11px] font-mono text-[#FFFFFF] hover:border-[#FFFFFF] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ النص</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* DESTINATION CTA */}
              {linkData.destinationUrl && (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCtaOpen}
                    className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>فتح الرابط المستهدف</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] font-mono text-[#71717A] text-center truncate" dir="ltr">
                    {linkData.destinationUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-3xl w-full mx-auto py-4 text-center space-y-1">
        <p className="text-[11px] font-mono text-[#71717A] inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>تحليلات جمهور مجمّعة ومحترِمة للخصوصية عبر taptag. | Mata AI</span>
        </p>
      </footer>
    </div>
  );
}
