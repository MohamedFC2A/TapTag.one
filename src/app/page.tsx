"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  PhoneCall,
  QrCode,
  ArrowLeftRight,
  ScanLine,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TapTagMataLockup } from "@/components/ui/TapTagLogo";
import { SecureShareSection } from "@/components/sections/SecureShareSection";
import { LinkExtractorSection } from "@/components/sections/LinkExtractorSection";
import { ExecutiveHero } from "@/components/luxury/ExecutiveHero";
import { FileConverterSection } from "@/components/sections/FileConverterSection";
import type { ActiveSectionFilter } from "@/lib/mata-events";
import { Language } from "@/types";

const TOOL_QUERY_MAP: Record<string, ActiveSectionFilter> = {
  share: "SHARE",
  extract: "EXTRACT",
  qr: "QR",
  convert: "CONVERT",
};

const HASH_MAP: Record<string, ActiveSectionFilter> = {
  "#secure-share": "SHARE",
  "#link-extractor": "EXTRACT",
  "#qr-workspace": "QR",
  "#file-converter": "CONVERT",
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>("ar");
  const [activeSection, setActiveSection] = useState<ActiveSectionFilter>("ALL");
  const isAr = lang === "ar";

  useEffect(() => {
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const toolParam = params.get("tool")?.toLowerCase() || "";
      const hashParam = window.location.hash.toLowerCase();
      if (TOOL_QUERY_MAP[toolParam]) {
        setActiveSection(TOOL_QUERY_MAP[toolParam]);
      } else if (HASH_MAP[hashParam]) {
        setActiveSection(HASH_MAP[hashParam]);
      }
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ section?: ActiveSectionFilter }>;
      if (custom.detail?.section && custom.detail.section !== "AI") {
        setActiveSection(custom.detail.section);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("mata:focus-section", handler);
    return () => window.removeEventListener("mata:focus-section", handler);
  }, []);

  const openTool = (section: ActiveSectionFilter) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const serviceCards: {
    id: Exclude<ActiveSectionFilter, "ALL" | "AI">;
    icon: React.ComponentType<{ className?: string }>;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
  }[] = [
    {
      id: "SHARE",
      icon: Shield,
      titleAr: "مشاركة الملفات المشفرة",
      titleEn: "Secure File Share",
      descAr: "تشفير AES-256 من جهازك مع قفل PIN وحرق تلقائي بعد التحميل.",
      descEn: "Zero-knowledge AES-256 vault with PIN lock and 1x burn-after-read.",
    },
    {
      id: "EXTRACT",
      icon: PhoneCall,
      titleAr: "استخراج الهاتف والروابط",
      titleEn: "Extract Phone & Links",
      descAr: "استخرج أرقام الهواتف، روابط واتساب، والإيميلات من أي رابط أو نص.",
      descEn: "Extract normalized phone numbers, WhatsApp links, and emails instantly.",
    },
    {
      id: "QR",
      icon: QrCode,
      titleAr: "استوديو رموز QR الذكي",
      titleEn: "Smart QR Studio",
      descAr: "أنشئ QR ديناميكي للروابط والملفات والواي فاي مع حماية وتعديل فوري.",
      descEn: "Dynamic QR codes for links, PDF, Word, Wi-Fi & vCard with PIN protection.",
    },
    {
      id: "CONVERT",
      icon: ArrowLeftRight,
      titleAr: "محول جميع الصيغ",
      titleEn: "All-Format Converter",
      descAr: "تحويل فوري بين الصور، PDF، Word، Excel، JSON، الصوت، والـ ZIP.",
      descEn: "Convert images, PDF, Word, Excel, JSON, audio & ZIP without uploads.",
    },
  ];

  const workspaceTools: {
    id: Exclude<ActiveSectionFilter, "ALL" | "AI">;
    labelAr: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "SHARE", labelAr: "مشاركة مشفرة", labelEn: "Share", icon: Shield },
    { id: "EXTRACT", labelAr: "استخراج الأرقام", labelEn: "Extract", icon: PhoneCall },
    { id: "QR", labelAr: "استوديو QR", labelEn: "QR Studio", icon: QrCode },
    { id: "CONVERT", labelAr: "تحويل الصيغ", labelEn: "Convert", icon: ArrowLeftRight },
  ];

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const ForwardIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div
      className={`min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col relative overflow-x-clip ${
        isAr ? "rtl" : "ltr"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="fixed inset-0 hw-pixel-grid pointer-events-none" aria-hidden="true" />

      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 relative z-10 w-full flex flex-col">
        {/* HOME VIEW: Clean Spacious Big Service Cards with Clear Large Icons */}
        {activeSection === "ALL" && (
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-start space-y-2.5 max-w-2xl">
                <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-[#FFFFFF]">
                  {isAr
                    ? "أدوات الملفات، الروابط، والـ QR في مكان واحد"
                    : "Encrypted Share, Contacts, Dynamic QR & File Tools"}
                </h1>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  {isAr
                    ? "اختر الخدمة للبدء فوراً — مدعومة بخوارزميات سريعة، دقيقة، ومحمية."
                    : "Pick any service below — powered by fast, deterministic security and processing algorithms."}
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                  {isAr ? "تعاون الخوارزميات" : "Algorithmic Partnership"}
                </span>
                <TapTagMataLockup size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {serviceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => openTool(card.id)}
                    className="group min-h-[220px] p-7 rounded-2xl border border-[#27272A] bg-[#121215] hover:border-[#FFFFFF] hover:bg-[#16161A] transition-all duration-150 text-start flex flex-col justify-between gap-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-16 h-16 rounded-2xl border border-[#27272A] bg-[#09090B] group-hover:border-[#FFFFFF] group-hover:bg-[#FFFFFF] group-hover:text-[#09090B] text-[#FFFFFF] flex items-center justify-center transition-colors duration-150 shrink-0">
                        <Icon className="w-9 h-9 stroke-[1.75]" />
                      </div>
                      <ForwardIcon className="w-5 h-5 text-[#52525B] group-hover:text-[#FFFFFF] transition-colors mt-1 shrink-0" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-lg sm:text-xl font-display font-bold text-[#FFFFFF]">
                        {isAr ? card.titleAr : card.titleEn}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                        {isAr ? card.descAr : card.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* 5th Large Card: Unified Codes, Scanner & Shares Hub */}
              <Link
                href="/dashboard"
                className="group sm:col-span-2 lg:col-span-2 min-h-[220px] p-7 rounded-2xl border border-[#27272A] bg-[#121215] hover:border-[#FFFFFF] hover:bg-[#16161A] transition-all duration-150 text-start flex flex-col justify-between gap-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-16 h-16 rounded-2xl border border-[#27272A] bg-[#09090B] group-hover:border-[#FFFFFF] group-hover:bg-[#FFFFFF] group-hover:text-[#09090B] text-[#FFFFFF] flex items-center justify-center transition-colors duration-150 shrink-0">
                    <ScanLine className="w-9 h-9 stroke-[1.75]" />
                  </div>
                  <ForwardIcon className="w-5 h-5 text-[#52525B] group-hover:text-[#FFFFFF] transition-colors mt-1 shrink-0" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-[#FFFFFF]">
                    {isAr ? "الأكواد والماسح الضوئي" : "Codes & QR Scanner"}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                    {isAr
                      ? "إدارة أكواد QR الديناميكية، فحص الكاميرا والصور، ومتابعة الملفات المشفرة في مكان واحد."
                      : "Manage Dynamic QRs, scan codes with camera or image, and control encrypted shares in one place."}
                  </p>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* FOCUSED WORKSPACE BAR: Shown cleanly ONLY when inside a tool */}
        {activeSection !== "ALL" && (
          <div className="hw-no-print w-full border-b border-[#27272A] bg-[#09090B]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openTool("ALL")}
                className="h-9 px-3.5 rounded-lg border border-[#27272A] bg-[#121215] hover:border-[#FFFFFF] text-xs font-medium text-[#FFFFFF] inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <BackIcon className="w-3.5 h-3.5" />
                <span>{isAr ? "كل الخدمات" : "All Services"}</span>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                {workspaceTools.map((tool) => {
                  const Icon = tool.icon;
                  const active = activeSection === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => openTool(tool.id)}
                      className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        active
                          ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                          : "bg-[#121215] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{isAr ? tool.labelAr : tool.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Mounted Workspaces (kept in DOM so cross-tool handoff events ALWAYS connect) */}
        <div className={activeSection === "SHARE" ? "block" : "hidden"}>
          <SecureShareSection lang={lang} />
        </div>

        <div className={activeSection === "EXTRACT" ? "block" : "hidden"}>
          <LinkExtractorSection lang={lang} />
        </div>

        <div className={activeSection === "QR" ? "block" : "hidden"}>
          <ExecutiveHero lang={lang} />
        </div>

        <div className={activeSection === "CONVERT" ? "block" : "hidden"}>
          <FileConverterSection lang={lang} />
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
