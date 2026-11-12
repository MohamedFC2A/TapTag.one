"use client";

import React from "react";
import { Languages } from "lucide-react";
import { Language } from "@/types";

interface LanguageToggleProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageToggle({ currentLang, onLanguageChange }: LanguageToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onLanguageChange(currentLang === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg border border-[#27272A] bg-[#121215] text-[#F4F4F5] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] transition-all duration-150 ease-out cursor-pointer"
      title={currentLang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="w-3.5 h-3.5 shrink-0" />
      <span>{currentLang === "ar" ? "EN" : "العربية"}</span>
    </button>
  );
}
