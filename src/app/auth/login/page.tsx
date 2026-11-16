"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck, Loader2, LogIn } from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { validateInternalRedirectUrl } from "@/lib/auth-redirect-edge";
import { Language } from "@/types";

const ERROR_MESSAGES: Record<string, { ar: string; en: string }> = {
  token_expired: {
    ar: "انتهت صلاحية رابط الدخول المؤقت. سجل الدخول أدناه وسيتم توجيهك تلقائياً لوجهتك الأصلية.",
    en: "Your sign-in link has expired. Re-authenticate below and you will return directly to your destination.",
  },
  rate_limited: {
    ar: "تم تجاوز الحد المسموح للطلبات المتكررة مؤقتاً لحماية الحساب. انتظر ثوانٍ ثم أعد المحاولة.",
    en: "Too many authentication requests detected. Please wait briefly and try again.",
  },
  invalid_signature: {
    ar: "تعذر التحقق من توقيع الجلسة الأمني. أعد المصادقة لمتابعة الجلسة بأمان.",
    en: "Security signature validation failed. Please sign in again to continue safely.",
  },
  missing_session: {
    ar: "يرجى تسجيل الدخول للمتابعة إلى الصفحة المطلوبة.",
    en: "Please sign in to access your requested destination.",
  },
  callback_failed: {
    ar: "حدث خطأ مؤقت أثناء معالجة الجلسة. تم حفظ وجهتك ويمكنك المحاولة مجدداً.",
    en: "Temporary error while verifying your session. Your destination path has been preserved.",
  },
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") || "";
  const retrySec = searchParams.get("retry") || "";
  const safeNext = validateInternalRedirectUrl(
    searchParams.get("next") ?? searchParams.get("redirect_to"),
    "/dashboard"
  );

  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";
  const [email, setEmail] = useState("operator@matanygroup.com");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const recoveryBanner = errorCode
    ? ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.missing_session
    : null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !email.includes("@")) {
      setLocalError(isAr ? "أدخل بريداً إلكترونياً صحيحاً." : "Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          next: safeNext,
          utm_source: searchParams.get("utm_source") || "auth_recovery",
          utm_medium: searchParams.get("utm_medium") || "login_page",
          utm_campaign: searchParams.get("utm_campaign") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || "Sign-in failed");
        setSubmitting(false);
        return;
      }
      router.push(data.resolvedRedirect || safeNext);
    } catch {
      setLocalError(isAr ? "تعذر الاتصال بالخادم." : "Network error during sign-in.");
      setSubmitting(false);
    }
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#09090B] text-[#FFFFFF] flex flex-col">
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-md w-full mx-auto px-4 sm:px-6 py-12 space-y-6">
        {recoveryBanner && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-[#FFFFFF] bg-[#121215] flex items-start gap-3 text-start"
          >
            <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-[#FFFFFF]">
                {isAr ? "استعادة الجلسة بأمان" : "Graceful Session Recovery"}
              </p>
              <p className="text-[#D4D4D8] leading-relaxed">
                {isAr ? recoveryBanner.ar : recoveryBanner.en}
              </p>
              {retrySec && (
                <p className="font-mono text-[#A1A1AA]">Retry-After: {retrySec}s</p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#27272A] bg-[#121215] p-6 space-y-5 text-start">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>{isAr ? "تسجيل الدخول والتوجيه الذكي" : "Smart Auth Sign-In"}</span>
            </h1>
            <p className="text-xs font-mono text-[#71717A]" dir="ltr">
              Preserved Target → <span className="text-[#FFFFFF]">{safeNext}</span>
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A1A1AA] block">
                {isAr ? "البريد الإلكتروني" : "Work Email"}
              </label>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-11 px-3.5 rounded-lg bg-[#09090B] border border-[#27272A] text-sm font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>

            {localError && (
              <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                {localError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 px-5 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? isAr
                    ? "جارٍ التوجيه الذكي..."
                    : "Routing..."
                  : isAr
                  ? "متابعة إلى الوجهه المحفوظة"
                  : "Sign In & Continue"}
              </span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-xs font-mono">
            <Link href="/" className="text-[#A1A1AA] hover:text-[#FFFFFF] inline-flex items-center gap-1">
              <span>{isAr ? "العودة للرئيسية" : "Home"}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-[#71717A]">EDGE PROTECTED</span>
          </div>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B]" />}>
      <LoginContent />
    </Suspense>
  );
}
