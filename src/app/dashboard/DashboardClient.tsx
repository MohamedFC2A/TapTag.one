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

  // Filter for real registered vehicles so buttons never target blank unactivated tags
  const registeredTags = tags.filter((t) => {
    const plate = t.profile?.vehiclePlate || "";
    return plate.trim() !== "" && !plate.includes("غير مسجل") && !plate.includes("جاهز للتفعيل");
  });
  const primaryTagUid = (registeredTags.length > 0 ? registeredTags[0] : tags[0])?.tagUid;

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
    <div className={`min-h-screen bg-[#000000] text-white flex flex-col relative overflow-hidden ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Precision Micro-Grid Horizon */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* Floating Glassmorphic Header */}
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl glass-pill">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isAr ? "لوحة إدارة سياراتي" : t.dashboard.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium leading-relaxed">
              {isAr
                ? "إدارة سياراتك وبطاقاتك الذكية والتحكم الفوري في حالات التواصل وبلاغات الأمان."
                : "Manage your vehicles, smart cards, and instant emergency communications."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {primaryTagUid && (
              <Link
                href={`/dashboard/find?tag=${primaryTagUid}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-glass active:scale-95"
              >
                <Compass className="w-3.5 h-3.5 text-black" />
                <span>{isAr ? "أين سيارتي؟" : "Find Vehicle"}</span>
              </Link>
            )}

            {primaryTagUid && (
              <Link
                href={`/dashboard/calibrate?tag=${primaryTagUid}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl glass-card text-zinc-200 hover:text-white transition-all cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-zinc-300" />
                <span>{isAr ? "معايرة" : "Calibrate"}</span>
              </Link>
            )}

            <Link
              href="/dashboard/activate"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl glass-card text-white hover:border-white/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-zinc-300" />
              <span>{isAr ? "تفعيل كارت جديد" : "Activate Card"}</span>
            </Link>

            <Link
              href="/admin/qr-engine"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl glass-card text-zinc-300 hover:text-white transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-300" />
              <span>{isAr ? "استوديو البطاقات" : "Studio"}</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards (Frosted Glassmorphism, Zero Glowing) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl glass-surface-elevated border border-white/[0.08] shadow-glass">
            <span className="text-[11px] font-mono uppercase text-zinc-400 block mb-1.5 font-semibold">
              {t.dashboard.activeTags}
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white flex items-baseline gap-2">
              <span>{stats.activeTags}</span>
              <span className="text-xs text-zinc-500 font-normal">/ {stats.totalTags}</span>
            </div>
            <div className="mt-2.5 text-[10px] text-zinc-300 flex items-center gap-1.5 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{Math.round((stats.activeTags / Math.max(1, stats.totalTags)) * 100)}% OPERATIONAL</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-surface-elevated border border-white/[0.08] shadow-glass">
            <span className="text-[11px] font-mono uppercase text-zinc-400 block mb-1.5 font-semibold">
              {t.dashboard.totalScans}
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {stats.totalScans}
            </div>
            <div className="mt-2.5 text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
              <span>ALL TIME VERIFIED SCANS</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-surface-elevated border border-white/[0.08] shadow-glass">
            <span className="text-[11px] font-mono uppercase text-zinc-400 block mb-1.5 font-semibold">
              {t.dashboard.pendingAlerts}
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {stats.pendingAlerts}
            </div>
            <div className="mt-2.5 text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>AWAITING RESOLUTION</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-surface-elevated border border-white/[0.08] shadow-glass">
            <span className="text-[11px] font-mono uppercase text-zinc-400 block mb-1.5 font-semibold">
              {t.dashboard.resolvedRate}
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {stats.resolvedRate}%
            </div>
            <div className="mt-2.5 text-[10px] text-zinc-300 flex items-center gap-1.5 font-mono font-bold">
              <CheckCircle2 className="w-3 h-3 text-white" />
              <span>SLA COMPLIANCE</span>
            </div>
          </div>
        </div>

        {/* Registered Fleet & Tags Table Chassis */}
        <div className="rounded-3xl glass-surface-elevated border border-white/[0.10] overflow-hidden shadow-glass">
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-white" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAr ? "سياراتك المسجلة والبطاقات الذكية" : "Registered Fleet & Smart Tags"}
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400 font-bold px-2.5 py-1 rounded-full glass-pill border border-white/[0.08]">
              {tags.length} TAGS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-black/40 text-zinc-400 border-b border-white/[0.06] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-4 text-start">{isAr ? "رمز البطاقة" : "Tag UID"}</th>
                  <th className="p-4 text-start">{isAr ? "لوحة المركبة" : "Plate"}</th>
                  <th className="p-4 text-start">{isAr ? "طراز المركبة" : "Vehicle"}</th>
                  <th className="p-4 text-start">{isAr ? "الحالة التشغيلية" : "Operational Status"}</th>
                  <th className="p-4 text-start">{isAr ? "الرد التلقائي" : "Auto-Reply"}</th>
                  <th className="p-4 text-end">{isAr ? "الإجراءات" : "Controls"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                {tags.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Cpu className="w-8 h-8 text-zinc-600" />
                        <div className="text-xs font-medium text-zinc-400">
                          {isAr
                            ? "لا توجد بطاقات ذكية مسجلة حالياً في الأسطول."
                            : "No smart tags registered in the fleet yet."}
                        </div>
                        <Link
                          href="/dashboard/activate"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>{isAr ? "تفعيل أول بطاقة الآن" : "Provision First Tag Now"}</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-mono font-medium text-white">
                        <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{tag.tagUid}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-white font-mono">
                      {tag.profile?.vehiclePlate || "—"}
                    </td>
                    <td className="p-4 text-zinc-300">
                      <div className="font-semibold">{tag.profile?.vehicleMake} {tag.profile?.vehicleModel}</div>
                      <div className="text-[10px] text-zinc-400">{tag.profile?.vehicleColor}</div>
                    </td>
                    <td className="p-4">
                      {/* Operational Status Switcher Dropdown */}
                      <select
                        value={tag.status}
                        onChange={(e) => handleStatusChange(tag.id, e.target.value as TagStatus)}
                        disabled={isPending}
                        className="glass-input text-xs rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none cursor-pointer"
                      >
                        <option value="ACTIVE" className="bg-zinc-950 text-white">{isAr ? "نشطة (Active)" : "ACTIVE"}</option>
                        <option value="AWAY" className="bg-zinc-950 text-white">{isAr ? "بالخارج (Away)" : "AWAY"}</option>
                        <option value="DND" className="bg-zinc-950 text-white">{isAr ? "عدم الإزعاج (DND)" : "DND"}</option>
                        <option value="SUSPENDED" className="bg-zinc-950 text-white">{isAr ? "معلقة (Suspended)" : "SUSPENDED"}</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {tag.profile?.autoResponseEnabled ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 font-medium px-2.5 py-1 rounded-full glass-pill border border-white/15">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          <span>{isAr ? "مفعّل" : "Active"}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {isAr ? "معطل" : "Off"}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-end">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/dashboard/find?tag=${tag.tagUid}`}
                          className="p-2 rounded-xl glass-card text-white hover:border-white/20 transition-all"
                          title={isAr ? "أين سيارتي؟ (الملاحة الفضائية)" : "Find Car (Precision Finding)"}
                        >
                          <Compass className="w-4 h-4" />
                        </Link>

                        <Link
                          href={`/dashboard/calibrate?tag=${tag.tagUid}`}
                          className="p-2 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/20 transition-all"
                          title={isAr ? "معايرة موقف السيارة" : "Calibrate Stance"}
                        >
                          <Navigation className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleOpenConfig(tag)}
                          className="p-2 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                          title={isAr ? "إعدادات القنوات والرد التلقائي" : "Settings"}
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/r/${tag.tagUid}`}
                          target="_blank"
                          className="p-2 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/20 transition-all"
                          title={isAr ? "تجربة التوجيه الذكي للـ QR" : "Test Smart Redirect"}
                        >
                          <ExternalLink className="w-4 h-4" />
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
        <div className="rounded-3xl glass-surface-elevated border border-white/[0.10] overflow-hidden shadow-glass">
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-white" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.dashboard.auditTrail}
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400 font-bold px-2.5 py-1 rounded-full glass-pill border border-white/[0.08]">
              AUDIT LOGS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-black/40 text-zinc-400 border-b border-white/[0.06] font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-4 text-start">{isAr ? "نوع الحدث" : "Event"}</th>
                  <th className="p-4 text-start">{isAr ? "البطاقة واللوحة" : "Tag & Plate"}</th>
                  <th className="p-4 text-start">{isAr ? "التوقيت" : "Timestamp"}</th>
                  <th className="p-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-4 text-end">{isAr ? "الإجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      <div className="text-xs">
                        {isAr
                          ? "سجل العمليات نظيف. لا توجد بلاغات أو عمليات مسح حالياً."
                          : "Audit trail is clean. No incidents or scan events recorded yet."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {inc.eventType === "MOVEMENT_REQUEST" && (
                          <span className="px-2.5 py-1 rounded-full glass-pill text-zinc-200 text-[10px] font-mono font-bold border border-white/[0.10]">
                            MOVEMENT
                          </span>
                        )}
                        {inc.eventType === "EMERGENCY_REPORT" && (
                          <span className="px-2.5 py-1 rounded-full glass-pill text-white text-[10px] font-mono font-bold border border-white/20 bg-white/5">
                            EMERGENCY
                          </span>
                        )}
                        {inc.eventType === "SCAN" && (
                          <span className="px-2.5 py-1 rounded-full glass-pill text-zinc-400 text-[10px] font-mono border border-white/[0.08]">
                            SCAN
                          </span>
                        )}
                        {inc.eventType === "DIRECT_NOTE" && (
                          <span className="px-2.5 py-1 rounded-full glass-pill text-zinc-300 text-[10px] font-mono border border-white/[0.10]">
                            NOTE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-white font-bold">{inc.tag.tagUid}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {inc.tag.profile?.vehiclePlate || "—"}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-zinc-400">
                      {new Date(inc.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                    </td>
                    <td className="p-4">
                      {inc.status === "RESOLVED" ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 font-bold px-2.5 py-1 rounded-full glass-pill border border-white/20">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          <span>{isAr ? "تمت المعالجة" : "Resolved"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 px-2.5 py-1 rounded-full glass-pill border border-white/10">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{isAr ? "قيد المتابعة" : "Pending"}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-end">
                      {inc.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleResolveIncident(inc.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-xl glass-card text-[11px] text-zinc-200 hover:text-white hover:border-white/20 transition-all cursor-pointer"
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

      {/* Settings Frosted Glass Modal (Auto-Reply & Dispatch Channels) */}
      {selectedTagForConfig && selectedTagForConfig.profile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-surface-elevated rounded-3xl p-6 sm:p-7 space-y-6 border border-white/[0.14] shadow-glass-elevated">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? "إعدادات تشغيل البطاقة:" : "Tag Configuration:"} {selectedTagForConfig.tagUid}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedTagForConfig.profile.vehiclePlate} ({selectedTagForConfig.profile.vehicleMake})
                </p>
              </div>
              <button
                onClick={() => setSelectedTagForConfig(null)}
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-zinc-400 hover:text-white text-xs cursor-pointer"
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
                  className="rounded bg-black border-white/20 text-white focus:ring-0"
                />
              </div>
              <textarea
                rows={2}
                value={autoResponseText}
                onChange={(e) => setAutoResponseText(e.target.value)}
                placeholder="سأعود للمركبة خلال 15 دقيقة..."
                className="w-full glass-input rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
              />
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {isAr
                  ? "يظهر هذا التنويه مباشرة للشخص الذي يمسح البطاقة عندما تكون في وضع 'الخارج مؤقتاً'."
                  : "Displayed on the public scan portal when tag status is set to Away."}
              </p>
            </div>

            {/* Dispatch Channels */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <label className="text-xs font-semibold text-white block">
                {t.dashboard.dispatchChannels}
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleToggleChannel("whatsapp")}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    selectedTagForConfig.profile.notifyWhatsApp
                      ? "glass-surface-elevated border-white text-white font-bold"
                      : "glass-card text-zinc-400"
                  }`}
                >
                  <span>WhatsApp API</span>
                  <span className="font-mono text-[10px]">{selectedTagForConfig.profile.notifyWhatsApp ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel("push")}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    selectedTagForConfig.profile.notifyPush
                      ? "glass-surface-elevated border-white text-white font-bold"
                      : "glass-card text-zinc-400"
                  }`}
                >
                  <span>Web Push</span>
                  <span className="font-mono text-[10px]">{selectedTagForConfig.profile.notifyPush ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel("telegram")}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    selectedTagForConfig.profile.notifyTelegram
                      ? "glass-surface-elevated border-white text-white font-bold"
                      : "glass-card text-zinc-400"
                  }`}
                >
                  <span>Telegram Bot</span>
                  <span className="font-mono text-[10px]">{selectedTagForConfig.profile.notifyTelegram ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel("sms")}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    selectedTagForConfig.profile.notifySms
                      ? "glass-surface-elevated border-white text-white font-bold"
                      : "glass-card text-zinc-400"
                  }`}
                >
                  <span>SMS Fallback</span>
                  <span className="font-mono text-[10px]">{selectedTagForConfig.profile.notifySms ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => setSelectedTagForConfig(null)}
                className="px-4 py-2.5 rounded-xl glass-card text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
              <button
                type="button"
                onClick={handleSaveAutoResponse}
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition-all shadow-glass cursor-pointer"
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
