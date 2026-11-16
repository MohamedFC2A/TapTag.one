"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Language } from "@/types";

interface LiveOperationsConsoleProps {
  lang: Language;
}

interface ScanTelemetryRow {
  id: string;
  shortCode: string;
  title: string;
  payloadType: string;
  hasPin: boolean;
  biometricEnabled: boolean;
  isActive: boolean;
  accessResult: string;
  deviceOs: string;
  createdAt: string;
}

export function LiveOperationsConsole({ lang }: LiveOperationsConsoleProps) {
  const isAr = lang === "ar";
  const [scans, setScans] = useState<ScanTelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTelemetry = useCallback(async () => {
    try {
      const res = await fetch("/api/qr", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.scans)) {
        setScans(data.scans.slice(0, 8));
      }
    } catch {
      // silent telemetry fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTelemetry();
    const handler = () => loadTelemetry();
    window.addEventListener("taptag:qr-updated", handler);
    return () => window.removeEventListener("taptag:qr-updated", handler);
  }, [loadTelemetry]);

  const formatUtcTime = (iso: string) => {
    try {
      return new Date(iso).toISOString().substring(11, 19);
    } catch {
      return "—";
    }
  };

  return (
    <section id="simulator-section" className="w-full py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-display font-bold text-[#FFFFFF]">
              {isAr ? "سجل المسح الأخير" : "Recent Scans"}
            </h2>
          </div>

          <button
            type="button"
            onClick={loadTelemetry}
            aria-label={isAr ? "تحديث" : "Refresh"}
            className="w-9 h-9 rounded-lg border border-[#27272A] bg-[#121215] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#09090B] hover:border-[#FFFFFF] flex items-center justify-center transition-all duration-150 ease-out cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden flex flex-col">

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#09090B] text-[11px] font-mono text-[#71717A]">
                  <th className="py-3 px-4 font-medium text-start">
                    {isAr ? "الكود" : "Code"}
                  </th>
                  <th className="py-3 px-4 font-medium text-start">
                    {isAr ? "المحتوى" : "Payload"}
                  </th>
                  <th className="py-3 px-4 font-medium text-start">
                    {isAr ? "الحماية" : "Security"}
                  </th>
                  <th className="py-3 px-4 font-medium text-start">
                    {isAr ? "الجهاز" : "Device"}
                  </th>
                  <th className="py-3 px-4 font-medium text-start">
                    {isAr ? "الوقت" : "Time"}
                  </th>
                  <th className="py-3 px-4 font-medium text-end">
                    {isAr ? "الحالة" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-xs font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#71717A]">
                      {isAr ? "جارٍ التحميل..." : "Loading..."}
                    </td>
                  </tr>
                ) : scans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#71717A]">
                      {isAr ? "لا توجد عمليات مسح بعد." : "No scans yet."}
                    </td>
                  </tr>
                ) : (
                  scans.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-[#16161A] transition-colors duration-150"
                    >
                      <td className="py-3 px-4 font-bold text-[#FFFFFF] whitespace-nowrap" dir="ltr">
                        <Link
                          href={`/q/${row.shortCode}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <span>{row.shortCode}</span>
                          <ExternalLink className="w-3 h-3 text-[#71717A]" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[#FAFAFA] font-sans font-medium">
                        <span className="inline-block px-1.5 py-0.5 me-2 rounded border border-[#27272A] bg-[#09090B] text-[10px] font-mono text-[#A1A1AA]">
                          {row.payloadType}
                        </span>
                        <span className="truncate max-w-[180px] inline-block align-middle">
                          {row.title}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap">
                        {row.hasPin && row.biometricEnabled
                          ? "PIN + Bio"
                          : row.hasPin
                          ? "PIN"
                          : row.biometricEnabled
                          ? "Biometric"
                          : "Open"}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap" dir="ltr">
                        {row.deviceOs}
                      </td>
                      <td
                        className="py-3 px-4 text-[#71717A] whitespace-nowrap tabular-nums"
                        dir="ltr"
                      >
                        {formatUtcTime(row.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#27272A] bg-[#09090B] text-[10px] text-[#FFFFFF]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.isActive ? "bg-[#10B981]" : "bg-[#52525B]"
                            }`}
                          />
                          <span>
                            {row.isActive
                              ? isAr
                                ? "نشط"
                                : "Active"
                              : isAr
                              ? "موقوف"
                              : "Paused"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
