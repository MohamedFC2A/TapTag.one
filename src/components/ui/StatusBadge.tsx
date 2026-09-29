import React from "react";
import { TagStatus } from "@/types";

interface StatusBadgeProps {
  status: TagStatus;
  lang?: "ar" | "en";
  className?: string;
}

export function StatusBadge({ status, lang = "ar", className = "" }: StatusBadgeProps) {
  const isAr = lang === "ar";

  switch (status) {
    case "ACTIVE":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-pill border border-emerald-500/20 text-white ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
          <span>{isAr ? "نشطة وجاهزة للتنبيه" : "Active & Ready"}</span>
        </span>
      );

    case "AWAY":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-pill border border-amber-500/20 text-amber-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>{isAr ? "المالك بالخارج مؤقتاً" : "Temporarily Away"}</span>
        </span>
      );

    case "DND":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-pill border border-white/[0.10] text-zinc-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <span>{isAr ? "عدم الإزعاج (طوارئ فقط)" : "Do Not Disturb (Emergency Only)"}</span>
        </span>
      );

    case "SUSPENDED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-pill border border-red-500/20 text-red-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span>{isAr ? "البطاقة معلقة" : "Suspended"}</span>
        </span>
      );
  }
}
