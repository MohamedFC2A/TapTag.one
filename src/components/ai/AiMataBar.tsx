"use client";

import React, { useState } from "react";
import { Sparkles, ArrowUpRight, Loader2 } from "lucide-react";
import type { Language } from "@/types";
import type { AiMataMode, AiMataResponse } from "@/lib/ai-mata";
import { MataLogo } from "@/components/ui/MataLogo";

interface AiMataBarProps {
  lang: Language;
  mode: AiMataMode;
  context?: Record<string, unknown>;
  defaultPromptPlaceholderAr?: string;
  defaultPromptPlaceholderEn?: string;
  actionButtonLabelAr?: string;
  actionButtonLabelEn?: string;
  onApplySuggestion?: (res: AiMataResponse) => void;
  showPromptInput?: boolean;
}

export function AiMataBar({
  lang,
  mode,
  context,
  defaultPromptPlaceholderAr = "اكتب سؤالك أو أمرك لـ Mata AI...",
  defaultPromptPlaceholderEn = "Enter a prompt for Mata AI...",
  actionButtonLabelAr = "تحليل بـ Mata AI",
  actionButtonLabelEn = "Ask Mata AI",
  onApplySuggestion,
  showPromptInput = true,
}: AiMataBarProps) {
  const isAr = lang === "ar";
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiMataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-mata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          lang,
          prompt: prompt.trim() || undefined,
          context: context || {},
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        setError(data.error || "Mata AI error");
        return;
      }
      setResult(data.result);
    } catch {
      setError(isAr ? "تعذر الاتصال بمحرك Mata AI." : "Mata AI unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#09090B] p-3.5 space-y-3 text-start">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MataLogo size="xs" />
          <span className="text-[11px] font-mono text-[#A1A1AA]">
            {isAr ? "مساعد الذكاء الاصطناعي في هذا القسم" : "Section Copilot"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleRun()}
          disabled={loading}
          className="h-8 px-3 rounded-lg bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-[11px] inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{isAr ? actionButtonLabelAr : actionButtonLabelEn}</span>
        </button>
      </div>

      {showPromptInput && (
        <form onSubmit={handleRun} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isAr ? defaultPromptPlaceholderAr : defaultPromptPlaceholderEn}
            className="flex-1 h-9 px-3 rounded-lg bg-[#121215] border border-[#27272A] text-xs font-sans text-[#FFFFFF] placeholder:text-[#52525B] focus:outline-none focus:border-[#FFFFFF]"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-9 px-3.5 rounded-lg border border-[#27272A] bg-[#121215] text-xs font-mono text-[#FFFFFF] hover:border-[#FFFFFF] cursor-pointer disabled:opacity-50"
          >
            {isAr ? "تنفيذ" : "Run"}
          </button>
        </form>
      )}

      {error && (
        <div className="text-[11px] font-mono text-[#A1A1AA] border border-[#27272A] rounded-lg px-3 py-2 bg-[#121215]">
          {error}
        </div>
      )}

      {result && (
        <div className="p-3 rounded-lg border border-[#27272A] bg-[#121215] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#FFFFFF]">{result.headline}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[#A1A1AA]">
              {result.engine === "LIVE_LLM" ? "LIVE AI" : "MATA CORE"}
            </span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{result.summary}</p>
          {result.recommendations.length > 0 && (
            <ul className="space-y-1 text-[11px] font-mono text-[#F4F4F5]">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[#71717A]">—</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
          {result.suggestedAction && onApplySuggestion && (
            <button
              type="button"
              onClick={() => onApplySuggestion(result)}
              className="mt-1 h-8 px-3 rounded-md bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-[11px] inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
            >
              <span>{result.suggestedAction.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
