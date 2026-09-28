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
      onClick={() => onLanguageChange(currentLang === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
      title={currentLang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="w-3.5 h-3.5 text-zinc-400" />
      <span>{currentLang === "ar" ? "English" : "العربية"}</span>
    </button>
  );
}
