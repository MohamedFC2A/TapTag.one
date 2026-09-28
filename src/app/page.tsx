"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Cpu,
  Lock,
  PhoneCall,
  Printer,
  ChevronRight,
  PlusCircle,
  Sliders,
  Search,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  ArrowLeft,
  Radio,
  FileCheck,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { Language } from "@/types";
import { translations } from "@/lib/translations";

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ar");
  const [searchTag, setSearchTag] = useState("");
  const isAr = lang === "ar";
  const t = translations[lang];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim()) return;
    router.push(`/t/${searchTag.trim().toUpperCase()}`);
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 space-y-12">
        {/* Institutional Hero Banner */}
        <div className="border border-[#1F2228] rounded-xl bg-[#08080A] p-8 md:p-12 relative overflow-hidden">
          <div className="h-1.5 w-full bg-[#00C853] rounded-full mb-8" />

          <div className="max-w-2xl space-y-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              {isAr
                ? "منظومة TapTag.one لهوية وحماية المركبات (NFC / QR)"
                : "TapTag.one: Smart Identity & NFC/QR Asset System"}
            </h1>

            <p className="text-xs md:text-sm text-[#A1A1AA] leading-relaxed">
              {isAr
                ? "بروتوكول وطني ومؤسسي مشفر يربط بطاقات الأكريليك الذكية بأنظمة التنبيه الفوري للمركبات مع حجب تام لكافة بيانات المالك الشخصية (Zero-Knowledge Privacy Barrier)."
                : "A cryptographically secured protocol connecting physical acrylic tags with instant multi-channel dispatch, encrypted VoIP audio bridges, and zero-knowledge owner privacy."}
            </p>

            {/* Direct Tag Lookup */}
            <form onSubmit={handleSearchSubmit} className="pt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value.toUpperCase())}
                  placeholder={isAr ? "أدخل الرمز التسلسلي للبطاقة للتحقق (مثال: TT-88219-X)..." : "Enter Serial Tag UID to verify (e.g. TT-88219-X)..."}
                  className="w-full bg-[#000000] border border-[#1F2228] rounded-lg px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#00C853] uppercase"
                />
                <Search className="w-4 h-4 text-zinc-600 absolute top-3.5 end-3 pointer-events-none" />
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors shrink-0"
              >
                {isAr ? "التحقق والمسح" : "Verify & Inspect"}
              </button>
            </form>
          </div>
        </div>

        {/* Public Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/activate"
            className="p-5 rounded-xl border border-[#00C853]/40 bg-[#00C853]/5 hover:bg-[#00C853]/10 hover:border-[#00C853] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-lg border border-[#00C853]/60 bg-[#00C853]/20 flex items-center justify-center text-[#00C853] mb-3">
                <PlusCircle className="w-5 h-5 text-[#00C853]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "تفعيل واقتران بطاقة جديدة" : "Provision New Smart Tag"}
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {isAr
                  ? "سجّل بطاقتك الخاصة واربطها برقم اللوحة وبصمة جهازك المشفرة لتفعيل الحماية."
                  : "Pair your physical tag UID with your vehicle plate and encrypted biometric identity."}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-[#00C853]/20 flex items-center justify-between text-xs text-[#00C853] font-bold">
              <span>{isAr ? "بدء التفعيل بالبصمة" : "Start Activation"}</span>
              {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </div>
          </Link>

          <Link
            href="/t/TT-88219-X"
            className="p-5 rounded-xl border border-[#1F2228] bg-[#08080A] hover:border-zinc-600 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-zinc-300 mb-3">
                <CheckCircle2 className="w-5 h-5 text-[#00C853]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "بوابة تجربة المسح المباشر" : "Interactive Tag Portal Demo"}
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {isAr
                  ? "جرّب تجربة المار عند مسح بطاقة تجريبية (تنبيه بالتحريك، بلاغ عاجل، أو مكالمة مشفرة)."
                  : "Experience the real bystander portal flow (movement alert, incident dispatch, VoIP)."}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-[#1F2228] flex items-center justify-between text-xs text-zinc-300 font-semibold group-hover:text-white">
              <span>{isAr ? "معاينة البوابة التجريبية" : "Inspect Demo Tag"}</span>
              {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </div>
          </Link>

          <div
            className="p-5 rounded-xl border border-[#1F2228] bg-[#08080A] flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-zinc-300 mb-3">
                <Lock className="w-5 h-5 text-[#00C853]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "حاجز الخصوصية الصارم (Zero PII)" : "Strict Privacy Protection"}
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {isAr
                  ? "حظر شامل لكافة بيانات المالك. لا يتم كشف رقم الهاتف أو الهوية لأي طرف على الإطلاق."
                  : "Owner identity and phone numbers are completely masked and never disclosed."}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-[#1F2228] flex items-center justify-between text-xs text-[#00C853] font-semibold">
              <span>{isAr ? "بروتوكول مشفر ومعتمد" : "Encrypted Protocol"}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
            </div>
          </div>
        </div>

        {/* Local Dev / Admin Controls - Rendered ONLY on Local Server */}
        {process.env.NODE_ENV !== "production" && (
          <div className="border border-dashed border-[#27272A] rounded-xl p-5 bg-[#090A0D]/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00C853] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00C853]" />
              <span>{isAr ? "أدوات الإدارة والطباعة (محلياً فقط - مخفية كلياً في الموقع العام)" : "ADMIN & PRINT CONTROLS (LOCAL ONLY - HIDDEN IN PRODUCTION)"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard"
                className="p-4 rounded-lg border border-[#1F2228] bg-[#0D0D12] hover:border-zinc-500 transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{isAr ? "لوحة الأسطول ومراقبة البلاغات" : "Fleet Dashboard"}</h4>
                  <p className="text-[11px] text-[#A1A1AA]">{isAr ? "متابعة الحالات التشغيلية ومسار التدقيق" : "Monitor tags and incident audit logs"}</p>
                </div>
                {isAr ? <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white" /> : <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white" />}
              </Link>
              <Link
                href="/admin/qr-engine"
                className="p-4 rounded-lg border border-[#1F2228] bg-[#0D0D12] hover:border-[#00C853] transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{isAr ? "مصنع بطاقات الأكريليك (7×5 سم)" : "7x5 cm Print Studio"}</h4>
                  <p className="text-[11px] text-[#A1A1AA]">{isAr ? "تصدير أصول SVG و 300 DPI للطباعة والليزر" : "Export SVG and 300 DPI print assets"}</p>
                </div>
                {isAr ? <ArrowLeft className="w-4 h-4 text-[#00C853]" /> : <ArrowRight className="w-4 h-4 text-[#00C853]" />}
              </Link>
            </div>
          </div>
        )}

        {/* 3 Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-3">
            <div className="w-10 h-10 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-[#00C853]">
              <Lock className="w-5 h-5 text-[#00C853]" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? "حاجز الخصوصية الصارم (Zero PII)" : "Strict Privacy Barrier"}
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {isAr
                ? "حماية مطلقة لهوية المالك ورقم هاتفه. لا يتم إرسال أرقام الهواتف أو الأسماء لمتصفح الماسح نهائياً، مع تشفير كافة مسارات التحقق."
                : "Owner contact details and phone numbers are completely masked and never dispatched to the client browser."}
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-3">
            <div className="w-10 h-10 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-[#00C853]">
              <Radio className="w-5 h-5 text-[#00C853]" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? "بطاقات أكريليك ذكية (NFC / QR)" : "Smart Acrylic Tags (NFC/QR)"}
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {isAr
                ? "بطاقات فاخرة مقاومة لأشعة الشمس والخدوش والحرارة، تدعم التقريب الذكي NFC ومسح QR بدقة عالية ومستوى تصحيح خطأ 30% معتمد دولياً."
                : "Premium weather-resistant acrylic tags engineered with embedded NFC chips and high-res QR codes with 30% error correction."}
            </p>
          </div>

          <div className="p-6 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-3">
            <div className="w-10 h-10 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-[#00C853]">
              <PhoneCall className="w-5 h-5 text-[#00C853]" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? "مكالمات VoIP صوتية مشفرة" : "Masked VoIP Audio Bridge"}
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {isAr
                ? "اتصال صوتي مباشر عبر المتصفح بين المار والمالك دون كشف رقم هاتف أي طرف، مع بروتوكول مكافحة الإزعاج (3-minute cooldown)."
                : "Direct browser-to-browser encrypted voice session without number disclosure, backed by rate-limiting cooldown timers."}
            </p>
          </div>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
