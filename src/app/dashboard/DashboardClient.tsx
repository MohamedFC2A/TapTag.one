"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Car,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  PlusCircle,
  Printer,
  Sliders,
  History,
  MessageSquare,
  AlertTriangle,
  Radio,
  Send,
  RefreshCw,
  Compass,
  Navigation,
} from "lucide-react";
import { Language, TagStatus } from "@/types";
import { translations } from "@/lib/translations";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  updateTagStatus,
  updateTagAutoResponse,
  updateDispatchChannels,
  resolveIncident,
} from "@/app/actions/dashboard-actions";

interface TagData {
  id: string;
  tagUid: string;
  status: TagStatus;
  createdAt: string;
  profile: {
    vehiclePlate: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    emergencyContactPhone: string;
    autoResponseText: string;
    autoResponseEnabled: boolean;
    notifyWhatsApp: boolean;
    notifyTelegram: boolean;
    notifyPush: boolean;
    notifySms: boolean;
  } | null;
  _count: {
    incidentLogs: number;
    alerts: number;
  };
}

interface IncidentData {
  id: string;
  eventType: string;
  status: string;
  createdAt: string;
  ipAddressHash: string;
  resolutionNotes?: string | null;
  tag: {
    tagUid: string;
    profile: {
      vehiclePlate: string;
    } | null;
  };
  metadata?: any;
}

interface DashboardClientProps {
  tags: TagData[];
  incidents: IncidentData[];
  stats: {
    totalTags: number;
    activeTags: number;
    totalScans: number;
    pendingAlerts: number;
    resolvedRate: number;
  };
}

export function DashboardClient({ tags: initialTags, incidents: initialIncidents, stats }: DashboardClientProps) {
  const [lang, setLang] = useState<Language>("ar");
  const [tags, setTags] = useState<TagData[]>(initialTags);
  const [incidents, setIncidents] = useState<IncidentData[]>(initialIncidents);
  const [selectedTagForConfig, setSelectedTagForConfig] = useState<TagData | null>(null);
  const [autoResponseText, setAutoResponseText] = useState("");
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAr = lang === "ar";
  const t = translations[lang];

  // Quick Status Switcher
  const handleStatusChange = (tagId: string, newStatus: TagStatus) => {
    startTransition(async () => {
      const res = await updateTagStatus(tagId, newStatus);
      if (res.success) {
        setTags((prev) =>
          prev.map((t) => (t.id === tagId ? { ...t, status: newStatus } : t))
        );
      }
    });
  };

  // Open config drawer/modal
  const handleOpenConfig = (tag: TagData) => {
    setSelectedTagForConfig(tag);
    setAutoResponseText(tag.profile?.autoResponseText || "سأعود خلال 15 دقيقة");
    setAutoResponseEnabled(tag.profile?.autoResponseEnabled || false);
  };

  // Save Auto-Response
  const handleSaveAutoResponse = () => {
    if (!selectedTagForConfig) return;
    startTransition(async () => {
      const res = await updateTagAutoResponse(
        selectedTagForConfig.id,
        autoResponseEnabled,
        autoResponseText
      );
      if (res.success) {
        setTags((prev) =>
          prev.map((t) =>
            t.id === selectedTagForConfig.id && t.profile
              ? {
                  ...t,
                  profile: {
                    ...t.profile,
                    autoResponseEnabled,
                    autoResponseText,
                  },
                }
              : t
          )
        );
        setSelectedTagForConfig(null);
      }
    });
  };

  // Toggle Channels
  const handleToggleChannel = (channel: "whatsapp" | "telegram" | "push" | "sms") => {
    if (!selectedTagForConfig || !selectedTagForConfig.profile) return;
    const current = selectedTagForConfig.profile;
    const updated = {
      whatsapp: channel === "whatsapp" ? !current.notifyWhatsApp : current.notifyWhatsApp,
      telegram: channel === "telegram" ? !current.notifyTelegram : current.notifyTelegram,
      push: channel === "push" ? !current.notifyPush : current.notifyPush,
      sms: channel === "sms" ? !current.notifySms : current.notifySms,
    };

    startTransition(async () => {
      const res = await updateDispatchChannels(selectedTagForConfig.id, updated);
      if (res.success) {
        setTags((prev) =>
          prev.map((t) =>
            t.id === selectedTagForConfig.id && t.profile
              ? {
                  ...t,
                  profile: {
                    ...t.profile,
                    notifyWhatsApp: updated.whatsapp,
                    notifyTelegram: updated.telegram,
                    notifyPush: updated.push,
                    notifySms: updated.sms,
                  },
                }
              : t
          )
        );
        setSelectedTagForConfig((prev) =>
          prev && prev.profile
            ? {
                ...prev,
                profile: {
                  ...prev.profile,
                  notifyWhatsApp: updated.whatsapp,
                  notifyTelegram: updated.telegram,
                  notifyPush: updated.push,
                  notifySms: updated.sms,
                },
              }
            : prev
        );
      }
    });
  };

  // Resolve incident
  const handleResolveIncident = (incidentId: string) => {
    startTransition(async () => {
      const res = await resolveIncident(incidentId);
      if (res.success) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === incidentId ? { ...inc, status: "RESOLVED" } : inc
          )
        );
      }
    });
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-white flex flex-col ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1F] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00C853]" />
              <h1 className="text-xl font-black text-white tracking-wide">
                {t.dashboard.title}
              </h1>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1 font-medium">
              {isAr
                ? "مراقبة وإدارة أسطول المركبات والتحكم الفوري في حالات البطاقات الذكية عبر المنظومة السحابية المعتمدة"
                : "Real-time fleet monitoring and operational controls backed by secure cloud infrastructure."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tags.length > 0 && (
              <Link
                href={`/dashboard/find?tag=${tags[0].tagUid}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#00C853] bg-[#00C853]/15 text-[#00C853] hover:bg-[#00C853] hover:text-black transition-all cursor-pointer shadow-md"
              >
                <Compass className="w-4 h-4" />
                <span>{t.spatialFinder.findCarButton}</span>
              </Link>
            )}

            {tags.length > 0 && (
              <Link
                href={`/dashboard/calibrate?tag=${tags[0].tagUid}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-zinc-300 hover:text-white hover:border-[#00C853] transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-[#00C853]" />
                <span>{isAr ? "معايرة السيارة" : "Calibrate Stance"}</span>
              </Link>
            )}

            <Link
              href="/dashboard/activate"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>{t.dashboard.activateTag}</span>
            </Link>

            <Link
              href="/admin/qr-engine"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-zinc-200 hover:text-white hover:border-[#00C853] transition-colors"
            >
              <Printer className="w-4 h-4 text-[#00C853]" />
              <span>{isAr ? "مصنع البطاقات (محلي)" : "Factory Mint (Local)"}</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards (Flat Matte, Pure Black, 1px Hairline Borders) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[#1F2228] bg-[#08080A]">
            <span className="text-[11px] font-mono uppercase text-[#A1A1AA] block mb-1 font-semibold">
              {t.dashboard.activeTags}
            </span>
            <div className="text-2xl font-black font-mono text-white flex items-baseline gap-2">
              <span>{stats.activeTags}</span>
              <span className="text-xs text-[#71717A] font-normal">/ {stats.totalTags}</span>
            </div>
            <div className="mt-2 text-[10px] text-[#00C853] flex items-center gap-1 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              <span>{Math.round((stats.activeTags / Math.max(1, stats.totalTags)) * 100)}% OPERATIONAL</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1F2228] bg-[#08080A]">
            <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
              {t.dashboard.totalScans}
            </span>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.totalScans}
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
              <span>ALL TIME VERIFIED SCANS</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1F2228] bg-[#08080A]">
            <span className="text-[11px] font-mono uppercase text-[#A1A1AA] block mb-1 font-semibold">
              {t.dashboard.pendingAlerts}
            </span>
            <div className="text-2xl font-black font-mono text-amber-400">
              {stats.pendingAlerts}
            </div>
            <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1 font-mono font-bold">
              <Clock className="w-3 h-3" />
              <span>AWAITING RESOLUTION</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1F2228] bg-[#08080A]">
            <span className="text-[11px] font-mono uppercase text-[#A1A1AA] block mb-1 font-semibold">
              {t.dashboard.resolvedRate}
            </span>
            <div className="text-2xl font-black font-mono text-[#00C853]">
              {stats.resolvedRate}%
            </div>
            <div className="mt-2 text-[10px] text-[#00C853] flex items-center gap-1 font-mono font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>SLA COMPLIANCE</span>
            </div>
          </div>
        </div>

        {/* Registered Fleet & Tags Table */}
        <div className="border border-[#1F2228] rounded-lg bg-[#08080A] overflow-hidden">
          <div className="p-4 border-b border-[#1F2228] flex items-center justify-between bg-[#040406]">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[#00C853]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? "أسطول المركبات والبطاقات الذكية المسجلة" : "Registered Fleet & Smart Tags"}
              </h2>
            </div>
            <span className="text-xs font-mono text-[#00C853] font-bold">{tags.length} TAGS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-[#000000] text-[#A1A1AA] border-b border-[#1F2228] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-3.5 text-start">{isAr ? "رمز البطاقة" : "Tag UID"}</th>
                  <th className="p-3.5 text-start">{isAr ? "لوحة المركبة" : "Plate"}</th>
                  <th className="p-3.5 text-start">{isAr ? "طراز المركبة" : "Vehicle"}</th>
                  <th className="p-3.5 text-start">{isAr ? "الحالة التشغيلية" : "Operational Status"}</th>
                  <th className="p-3.5 text-start">{isAr ? "الرد التلقائي" : "Auto-Reply"}</th>
                  <th className="p-3.5 text-end">{isAr ? "الإجراءات" : "Controls"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2228] text-zinc-300">
                {tags.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Cpu className="w-8 h-8 text-zinc-600" />
                        <div className="text-xs font-medium text-zinc-400">
                          {isAr
                            ? "لا توجد بطاقات ذكية مسجلة حالياً في الأسطول."
                            : "No smart tags registered in the fleet yet."}
                        </div>
                        <Link
                          href="/dashboard/activate"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-700 bg-emerald-950/60 text-emerald-300 text-xs font-semibold hover:bg-emerald-900 transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>{isAr ? "تفعيل أول بطاقة الآن" : "Provision First Tag Now"}</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2 font-mono font-medium text-white">
                        <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{tag.tagUid}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      {tag.profile?.vehiclePlate || "—"}
                    </td>
                    <td className="p-3.5 text-zinc-400">
                      <div>{tag.profile?.vehicleMake} {tag.profile?.vehicleModel}</div>
                      <div className="text-[10px] text-zinc-500">{tag.profile?.vehicleColor}</div>
                    </td>
                    <td className="p-3.5">
                      {/* Operational Status Switcher Dropdown */}
                      <select
                        value={tag.status}
                        onChange={(e) => handleStatusChange(tag.id, e.target.value as TagStatus)}
                        disabled={isPending}
                        className="bg-[#000000] border border-[#1F2228] text-xs rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-[#00C853]"
                      >
                        <option value="ACTIVE">{isAr ? "نشطة (Active)" : "ACTIVE"}</option>
                        <option value="AWAY">{isAr ? "بالخارج (Away)" : "AWAY"}</option>
                        <option value="DND">{isAr ? "عدم الإزعاج (DND)" : "DND"}</option>
                        <option value="SUSPENDED">{isAr ? "معلقة (Suspended)" : "SUSPENDED"}</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      {tag.profile?.autoResponseEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-amber-400" />
                          <span>{isAr ? "مفعّل" : "Active"}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">
                          {isAr ? "معطل" : "Off"}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-end">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/dashboard/find?tag=${tag.tagUid}`}
                          className="p-1.5 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] hover:bg-[#00C853] hover:text-black transition-colors"
                          title={isAr ? "أين سيارتي؟ (الملاحة الفضائية)" : "Find Car (Precision Finding)"}
                        >
                          <Compass className="w-3.5 h-3.5" />
                        </Link>

                        <Link
                          href={`/dashboard/calibrate?tag=${tag.tagUid}`}
                          className="p-1.5 rounded border border-[#1F2228] bg-[#0A0A0E] text-zinc-300 hover:text-white hover:border-[#00C853] transition-colors"
                          title={isAr ? "معايرة موقف السيارة" : "Calibrate Stance"}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleOpenConfig(tag)}
                          className="p-1.5 rounded border border-[#1F2228] bg-[#0A0A0E] text-zinc-300 hover:text-white hover:border-[#00C853] transition-colors"
                          title={isAr ? "إعدادات القنوات والرد التلقائي" : "Settings"}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          href={`/r/${tag.tagUid}`}
                          target="_blank"
                          className="p-1.5 rounded border border-[#1F2228] bg-[#0A0A0E] text-zinc-300 hover:text-white hover:border-[#00C853] transition-colors"
                          title={isAr ? "تجربة التوجيه الذكي للـ QR" : "Test Smart Redirect"}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incident Audit Trail Log */}
        <div className="border border-[#1F2228] rounded bg-[#08080A] overflow-hidden">
          <div className="p-4 border-b border-[#1F2228] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#00C853]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.dashboard.auditTrail}
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">AUDIT LOGS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-[#000000] text-zinc-400 border-b border-[#1F2228] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-3.5 text-start">{isAr ? "نوع الحدث" : "Event"}</th>
                  <th className="p-3.5 text-start">{isAr ? "البطاقة واللوحة" : "Tag & Plate"}</th>
                  <th className="p-3.5 text-start">{isAr ? "التوقيت" : "Timestamp"}</th>
                  <th className="p-3.5 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5 text-end">{isAr ? "الإجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2228] text-zinc-300">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-zinc-500">
                      <div className="text-xs">
                        {isAr
                          ? "سجل العمليات نظيف. لا توجد بلاغات أو عمليات مسح حالياً."
                          : "Audit trail is clean. No incidents or scan events recorded yet."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#0D0D12] transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {inc.eventType === "MOVEMENT_REQUEST" && (
                          <span className="px-2 py-0.5 rounded border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] text-[10px] font-mono font-bold">
                            MOVEMENT
                          </span>
                        )}
                        {inc.eventType === "EMERGENCY_REPORT" && (
                          <span className="px-2 py-0.5 rounded border border-amber-800/60 bg-amber-950/40 text-amber-400 text-[10px] font-mono">
                            EMERGENCY
                          </span>
                        )}
                        {inc.eventType === "SCAN" && (
                          <span className="px-2 py-0.5 rounded border border-[#1F2228] bg-[#0A0A0E] text-zinc-400 text-[10px] font-mono">
                            SCAN
                          </span>
                        )}
                        {inc.eventType === "DIRECT_NOTE" && (
                          <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                            NOTE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono text-white font-bold">{inc.tag.tagUid}</div>
                      <div className="text-[10px] text-zinc-400">
                        {inc.tag.profile?.vehiclePlate || "—"}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-zinc-400">
                      {new Date(inc.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                    </td>
                    <td className="p-3.5">
                      {inc.status === "RESOLVED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#00C853] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#00C853]" />
                          <span>{isAr ? "تمت المعالجة" : "Resolved"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{isAr ? "قيد المتابعة" : "Pending"}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-end">
                      {inc.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleResolveIncident(inc.id)}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded border border-[#1F2228] bg-[#0A0A0E] hover:border-[#00C853] text-[11px] text-zinc-200 transition-colors"
                        >
                          {isAr ? "إغلاق البلاغ" : "Resolve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Settings Modal (Auto-Reply & Dispatch Channels) */}
      {selectedTagForConfig && selectedTagForConfig.profile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#08080A] border border-[#1F2228] rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1F2228] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? "إعدادات تشغيل البطاقة:" : "Tag Configuration:"} {selectedTagForConfig.tagUid}
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedTagForConfig.profile.vehiclePlate} ({selectedTagForConfig.profile.vehicleMake})
                </p>
              </div>
              <button
                onClick={() => setSelectedTagForConfig(null)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Auto-Response Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  {t.dashboard.autoReply}
                </label>
                <input
                  type="checkbox"
                  checked={autoResponseEnabled}
                  onChange={(e) => setAutoResponseEnabled(e.target.checked)}
                  className="rounded bg-black border-[#1F2228] text-[#00C853] focus:ring-0"
                />
              </div>
              <textarea
                rows={2}
                value={autoResponseText}
                onChange={(e) => setAutoResponseText(e.target.value)}
                placeholder="سأعود للمركبة خلال 15 دقيقة..."
                className="w-full bg-[#000000] border border-[#1F2228] rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00C853]"
              />
              <p className="text-[11px] text-zinc-500">
                {isAr
                  ? "يظهر هذا التنويه مباشرة للشخص الذي يمسح البطاقة عندما تكون في وضع 'الخارج مؤقتاً'."
                  : "Displayed on the public scan portal when tag status is set to Away."}
              </p>
            </div>

            {/* Dispatch Channels */}
            <div className="space-y-3 border-t border-[#1F2228] pt-4">
              <label className="text-xs font-semibold text-white block">
                {t.dashboard.dispatchChannels}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleChannel("whatsapp")}
                  className={`p-2.5 rounded border text-xs flex items-center justify-between transition-colors ${
                    selectedTagForConfig.profile.notifyWhatsApp
                      ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                      : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                  }`}
                >
                  <span>WhatsApp API</span>
                  <span>{selectedTagForConfig.profile.notifyWhatsApp ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel("push")}
                  className={`p-2.5 rounded border text-xs flex items-center justify-between transition-colors ${
                    selectedTagForConfig.profile.notifyPush
                      ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                      : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                  }`}
                >
                  <span>Web Push</span>
                  <span>{selectedTagForConfig.profile.notifyPush ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel("telegram")}
                  className={`p-2.5 rounded border text-xs flex items-center justify-between transition-colors ${
                    selectedTagForConfig.profile.notifyTelegram
                      ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                      : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                  }`}
                >
                  <span>Telegram Bot</span>
                  <span>{selectedTagForConfig.profile.notifyTelegram ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel("sms")}
                  className={`p-2.5 rounded border text-xs flex items-center justify-between transition-colors ${
                    selectedTagForConfig.profile.notifySms
                      ? "border-[#00C853]/60 bg-[#00C853]/10 text-[#00C853] font-bold"
                      : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400"
                  }`}
                >
                  <span>SMS Fallback</span>
                  <span>{selectedTagForConfig.profile.notifySms ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#1F2228] pt-4">
              <button
                type="button"
                onClick={() => setSelectedTagForConfig(null)}
                className="px-4 py-2 rounded border border-[#1F2228] text-xs text-zinc-400 hover:text-white"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
              <button
                type="button"
                onClick={handleSaveAutoResponse}
                disabled={isPending}
                className="px-5 py-2 rounded border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-black uppercase tracking-wider transition-colors"
              >
                {isAr ? "حفظ التغييرات" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer lang={lang} />
    </div>
  );
}
