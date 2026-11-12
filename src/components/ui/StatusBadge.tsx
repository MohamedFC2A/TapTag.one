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
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#121215] border border-[#27272A] text-[#FFFFFF] ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
          <span>{isAr ? "نشط" : "Active"}</span>
        </span>
      );

    case "AWAY":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider bg-[#121215] border border-[#27272A] text-[#D4D4D8] ${className}`}
        >
          <span className="w-1.5 h-1.5 bg-[#A1A1AA] shrink-0" />
          <span>{isAr ? "بالخارج مؤقتاً" : "Away"}</span>
        </span>
      );

    case "DND":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider bg-[#121215] border border-[#27272A] text-[#A1A1AA] ${className}`}
        >
          <span className="w-1.5 h-1.5 bg-[#71717A] shrink-0" />
          <span>{isAr ? "عدم الإزعاج" : "DND"}</span>
        </span>
      );

    case "SUSPENDED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#FFFFFF] border border-[#FFFFFF] text-[#09090B] ${className}`}
        >
          <span className="w-1.5 h-1.5 bg-[#09090B] shrink-0" />
          <span>{isAr ? "معلّق" : "Suspended"}</span>
        </span>
      );
  }
}
