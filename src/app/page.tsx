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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] text-xs font-mono font-bold">
              <ShieldCheck className="w-4 h-4 text-[#00C853]" />
              <span>OFFICIAL ENTERPRISE ASSET PROTOCOL</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              {isAr
                ? "منظومة TapTag.one المؤسسية لهوية وحماية المركبات (NFC / QR)"
                : "TapTag.one: Enterprise Smart Identity & NFC/QR Asset System"}
            </h1>

            <p className="text-xs md:text-sm text-[#A1A1AA] leading-relaxed">
              {isAr
                ? "بروتوكول وطني ومؤسسي مشفر يربط بطاقات الأكريليك المطبوعة بأنظمة التنبيه الفوري للمركبات مع حجب تام لكافة بيانات المالك الشخصية (Zero-Knowledge Privacy Barrier)."
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

        {/* Quick Action Navigation Buttons */}
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
                  ? "سجّل بطاقتك الخاصة واربطها برقم اللوحة ورقم هاتفك المشفر لبدء الاختبار."
                  : "Pair your physical tag UID with your vehicle plate and encrypted contact."}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-[#00C853]/20 flex items-center justify-between text-xs text-[#00C853] font-bold">
              <span>{isAr ? "بدء التفعيل بالبصمة" : "Start Activation"}</span>
              {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="p-5 rounded-xl border border-[#1F2228] bg-[#08080A] hover:border-zinc-600 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-zinc-300 mb-3">
                <Sliders className="w-5 h-5 text-[#00C853]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "مركز قيادة الأسطول (Dashboard)" : "Fleet Command Center"}
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {isAr
                  ? "متابعة الحالات التشغيلية، بروتوكول الرد التلقائي، ومسار تدقيق البلاغات الفوري."
                  : "Monitor real-time tag states, auto-reply protocols, and incident audit logs."}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-[#1F2228] flex items-center justify-between text-xs text-zinc-300 font-semibold group-hover:text-white">
              <span>{isAr ? "دخول لوحة التحكم" : "Open Dashboard"}</span>
              {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </div>
          </Link>

          <Link
            href="/admin/qr-engine"
            className="p-5 rounded-xl border border-[#1F2228] bg-[#08080A] hover:border-[#00C853]/60 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-lg border border-[#1F2228] bg-[#0D0D12] flex items-center justify-center text-zinc-300 mb-3">
                <Printer className="w-5 h-5 text-[#00C853]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "مصنع بطاقات الأكريليك (7×5 سم)" : "7x5 cm Precision Print Studio"}
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {isAr
                  ? "تصدير أصول فيكتور SVG و 300 DPI PNG مجهزة لماكينات الليزر وطابعات UV."
                  : "Export print-ready SVG vector and 300 DPI PNG assets for UV flatbed printing."}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-[#1F2228] flex items-center justify-between text-xs text-zinc-300 font-semibold group-hover:text-white">
              <span>{isAr ? "فتح مصنع البطاقات" : "Open Studio"}</span>
              {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </div>
          </Link>
        </div>

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
              <Printer className="w-5 h-5 text-[#00C853]" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? "محرك طباعة 7×5 سم (ISO 18004)" : "Vector UV Print Studio"}
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {isAr
                ? "تصدير أصول بطاقات الأكريليك المادية بصيغتي SVG فيكتور و 300 DPI PNG مع مستوى تصحيح الخطأ Level H (30%) المقاوم لأشعة الشمس والخدوش."
                : "Generates high-precision 70mm x 50mm vector SVG and 300 DPI PNG assets with Level H error correction for laser cutting and UV printing."}
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

      <footer className="w-full border-t border-[#1F2228] py-8 text-center text-xs text-zinc-500 space-y-1">
        <p>منظومة TapTag.one • Enterprise Smart Identity &amp; NFC/QR Vehicle System</p>
        <p className="text-[11px] text-zinc-600 font-mono">
          POWERED BY NEON.TECH POSTGRESQL &amp; PRISMA ORM
        </p>
      </footer>
    </div>
  );
}
