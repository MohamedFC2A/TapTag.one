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
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-emerald-800/60 bg-emerald-950/40 text-emerald-400 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {isAr ? "نشطة وجاهزة للتنبيه" : "Active & Ready"}
        </span>
      );

    case "AWAY":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-amber-800/60 bg-amber-950/30 text-amber-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {isAr ? "المالك بالخارج مؤقتاً" : "Temporarily Away"}
        </span>
      );

    case "DND":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-700 bg-zinc-800/60 text-zinc-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          {isAr ? "عدم الإزعاج (طوارئ فقط)" : "Do Not Disturb (Emergency Only)"}
        </span>
      );

    case "SUSPENDED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-red-900/60 bg-red-950/40 text-red-400 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {isAr ? "البطاقة معلقة" : "Suspended"}
        </span>
      );
  }
}
