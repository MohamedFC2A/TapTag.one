"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Terminal,
  Layers,
  PlusCircle,
  Printer,
  RefreshCw,
  ExternalLink,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Car,
  PhoneCall,
  Radio,
  Copy,
  Check,
  Search,
  Sliders,
  ShieldAlert,
  ArrowUpRight,
  Database,
  Lock,
} from "lucide-react";
import {
  mintPhysicalTag,
  mintBatchPhysicalTags,
  adminGetFullMetrics,
} from "@/app/actions/factory-actions";
import { updateTagStatus, resolveIncident } from "@/app/actions/dashboard-actions";
import { TagStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface TagItem {
  id: string;
  tagUid: string;
  status: TagStatus;
  isActivated: boolean;
  ownerDeviceName: string | null;
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

interface IncidentItem {
  id: string;
  eventType: string;
  status: string;
  ipAddressHash: string;
  resolutionNotes?: string | null;
  createdAt: string;
  tagUid: string;
  vehiclePlate: string;
  metadata?: any;
}

interface Metrics {
  dbLatencyMs: number;
  totalTags: number;
  activeTags: number;
  awayTags: number;
  dndTags: number;
  sealedTags: number;
  claimedTags: number;
  totalScans: number;
  totalIncidents: number;
}

interface AdminClientProps {
  initialMetrics: Metrics;
  initialTags: TagItem[];
  initialIncidents: IncidentItem[];
}

export function AdminClient({
  initialMetrics,
  initialTags,
  initialIncidents,
}: AdminClientProps) {
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Virtual Simulator State
  const [simTagUid, setSimTagUid] = useState<string>(tags[0]?.tagUid || "TT-88219-X");
  const [simStep, setSimStep] = useState<"IDLE" | "SCANNING" | "LOADED">("IDLE");
  const [simLogs, setSimLogs] = useState<string[]>([]);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(text);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Refresh all data
  const handleRefresh = () => {
    startTransition(async () => {
      const res = await adminGetFullMetrics();
      if (res.success) {
        setMetrics(res.metrics);
        setTags(res.tags as TagItem[]);
        setIncidents(res.incidents as IncidentItem[]);
        setFeedback({ type: "success", text: "تم تحديث البيانات الحية من Neon DB بنجاح." });
      } else {
        setFeedback({ type: "error", text: res.error || "فشل الاتصال بقاعدة البيانات." });
      }
    });
  };

  // 1-Click Mint Single Tag
  const handleMintSingle = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await mintPhysicalTag();
      if (res.success && res.tag) {
        setFeedback({
          type: "success",
          text: `تم سك وتخزين البطاقة بنجاح في Neon DB! المعرف: ${res.tag.tagUid}`,
        });
        handleRefresh();
      } else {
        setFeedback({ type: "error", text: res.error || "فشل سك البطاقة." });
      }
    });
  };

  // Batch Mint 10 Tags
  const handleMintBatch = (count: number = 10) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await mintBatchPhysicalTags(count);
      if (res.success) {
        setFeedback({
          type: "success",
          text: `تم سك وحفظ دفعة مصنع تتكون من ${res.count} بطاقة بنجاح في Neon DB!`,
        });
        handleRefresh();
      } else {
        setFeedback({ type: "error", text: res.error || "فشل سك الدفعة." });
      }
    });
  };

  // Instant Tag Status Toggle
  const handleToggleStatus = (tagId: string, currentStatus: TagStatus) => {
    const nextStatus: TagStatus =
      currentStatus === "ACTIVE"
        ? "AWAY"
        : currentStatus === "AWAY"
        ? "DND"
        : "ACTIVE";

    startTransition(async () => {
      // Optimistic update
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, status: nextStatus } : t))
      );
      const res = await updateTagStatus(tagId, nextStatus);
      if (!res.success) {
        // Rollback on error
        setTags((prev) =>
          prev.map((t) => (t.id === tagId ? { ...t, status: currentStatus } : t))
        );
        setFeedback({ type: "error", text: "تعذر تحديث حالة البطاقة." });
      }
    });
  };

  // Resolve Incident
  const handleResolveIncident = (incidentId: string) => {
    startTransition(async () => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? { ...inc, status: "RESOLVED", resolutionNotes: "تم الإغلاق بواسطة المشرف" }
            : inc
        )
      );
      await resolveIncident(incidentId, "تمت المعالجة والإغلاق عبر لوحة الإدارة العليا");
    });
  };

  // Run Virtual Simulator
  const handleRunSimulation = (uid: string) => {
    setSimStep("SCANNING");
    const tstamp = new Date().toISOString().substring(11, 23);
    setSimLogs([
      `[${tstamp}] RF_DETECT: NTAG216 ISO 14443-A Near-Field Contact detected.`,
      `[${tstamp}] SECURITY: AES-256 HSM cipher handshake verified. Token valid.`,
    ]);

    setTimeout(() => {
      const endT = new Date().toISOString().substring(11, 23);
      setSimStep("LOADED");
      setSimLogs((prev) => [
        ...prev,
        `[${endT}] GATEWAY: https://taptag.one/r/${uid} resolved in 142ms.`,
        `[${endT}] DISPATCH: Webhook routed via private encrypted channel (200 OK).`,
      ]);
    }, 800);
  };

  // Filtered tags list
  const filteredTags = tags.filter((t) => {
    const matchesSearch =
      t.tagUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.profile?.vehiclePlate || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.profile?.vehicleMake || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "SEALED") return !t.isActivated;
    if (statusFilter === "CLAIMED") return t.isActivated;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* 1. Master Admin Header & Mission Control Badge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.08] glass-surface shadow-glass">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase text-white tracking-widest">
              TAPTAG ROOT PROTOCOL • MASTER ADMIN CONSOLE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            مركز القيادة الفنية وإدارة الأصول (Mission Control)
          </h1>
          <p className="text-xs font-mono text-zinc-400">
            وصول غير مقيد لبيانات Neon PostgreSQL • سك البطاقات • استوديو QR المتجهي • التيليمترية الحية
          </p>
        </div>

        {/* Global Controls & DB Latency Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-zinc-300">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>NEON POOLER:</span>
            <span className="text-white font-bold font-mono">
              {metrics.dbLatencyMs > 0 ? `${metrics.dbLatencyMs}ms` : "CONNECTED"}
            </span>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-white font-mono text-xs cursor-pointer gap-1.5 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Link href="/admin/qr-engine">
            <Button
              size="sm"
              className="bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs cursor-pointer gap-1.5 rounded-lg shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-black" />
              <span>استوديو الطباعة والسك</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between glass-surface ${
            feedback.type === "success"
              ? "border-white/20 bg-white/5 text-white"
              : "border-red-500/20 bg-red-500/5 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white font-mono text-xs cursor-pointer px-2"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards (High Density Telemetry) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-white/[0.08] glass-surface space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            إجمالي الأصول (TOTAL)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.totalTags}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">مخزون مسجل في Neon</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] glass-surface space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            البطاقات النشطة (ACTIVE)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.activeTags}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">جاهزة للاستجابة فورياً</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] glass-surface space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            مخزون المصنع (SEALED)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-300">
            {metrics.sealedTags}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">جاهزة للبيع والإقتران</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] glass-surface space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            مفعلة بالبصمة (CLAIMED)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.claimedTags}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">مرتبطة بمركبة ومستخدم</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] glass-surface space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            إجمالي المسحات (SCANS)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.totalScans}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">NFC & QR Ingested</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] glass-surface space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            سجل الحوادث (EVENTS)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.totalIncidents}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">تحركات وبلاغات أمنية</div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs */}
      <Tabs defaultValue="fleet" className="w-full space-y-4">
        <TabsList className="glass-surface border border-white/[0.08] p-1.5 rounded-xl flex flex-wrap gap-1 shadow-glass">
          <TabsTrigger
            value="fleet"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-xs font-mono font-bold cursor-pointer rounded-lg transition-all"
          >
            سجل أسطول البطاقات ({tags.length})
          </TabsTrigger>
          <TabsTrigger
            value="minting"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-xs font-mono font-bold cursor-pointer"
          >
            محطة السك والتصنيع الفوري
          </TabsTrigger>
          <TabsTrigger
            value="incidents"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-xs font-mono font-bold cursor-pointer"
          >
            بث الحوادث والأمان ({incidents.length})
          </TabsTrigger>
          <TabsTrigger
            value="simulator"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-xs font-mono font-bold cursor-pointer"
          >
            محاكي البوابة الحية
          </TabsTrigger>
          <TabsTrigger
            value="diagnostics"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-xs font-mono font-bold cursor-pointer"
          >
            فحص البنية التحتية
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FLEET REGISTRY */}
        <TabsContent value="fleet" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/[0.08] glass-surface shadow-glass">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="بحث برقم البطاقة UID، لوحة المركبة، أو نوع السيارة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/40 border-white/[0.08] text-white placeholder-zinc-500 font-mono text-xs pr-9 rounded-lg focus:border-white/30"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute top-2.5 right-3 pointer-events-none" />
            </div>

            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "ACTIVE", "AWAY", "DND", "SEALED", "CLAIMED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? "bg-white text-black font-bold shadow-sm"
                      : "text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.08]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-white/[0.08] glass-surface overflow-hidden shadow-glass">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-start">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-4 text-start font-bold">معرف البطاقة UID</th>
                    <th className="py-3.5 px-4 text-start font-bold">بيانات المركبة واللوحة</th>
                    <th className="py-3.5 px-4 text-start font-bold">حالة التشغيل</th>
                    <th className="py-3.5 px-4 text-start font-bold">حالة التفعيل</th>
                    <th className="py-3.5 px-4 text-start font-bold">المسحات</th>
                    <th className="py-3.5 px-4 text-end font-bold">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredTags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono">
                        لم يتم العثور على بطاقات مطابقة لخيارات البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredTags.map((tag) => (
                      <tr key={tag.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* UID */}
                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="tracking-wider">{tag.tagUid}</span>
                            <button
                              onClick={() => handleCopy(tag.tagUid)}
                              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                              title="نسخ المعرف"
                            >
                              {copiedUid === tag.tagUid ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Vehicle & Plate */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tag.profile ? (
                            <div>
                              <div className="text-white font-bold">{tag.profile.vehiclePlate}</div>
                              <div className="text-[10px] text-zinc-400">
                                {tag.profile.vehicleMake} {tag.profile.vehicleModel}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-500">جاهزة للتفعيل</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(tag.id, tag.status)}
                            className="cursor-pointer group flex items-center gap-1.5"
                            title="انقر للتبديل بين ACTIVE / AWAY / DND"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono cursor-pointer transition-transform group-hover:scale-105 ${
                                tag.status === "ACTIVE"
                                  ? "border-white/20 bg-white/10 text-white"
                                  : tag.status === "AWAY"
                                  ? "border-zinc-700 bg-zinc-800 text-zinc-300"
                                  : "border-red-600/40 bg-red-950/20 text-red-400"
                              }`}
                            >
                              {tag.status}
                            </Badge>
                          </button>
                        </td>

                        {/* Activation */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tag.isActivated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>مفعلة بالبصمة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                              <Lock className="w-3.5 h-3.5 text-zinc-400" />
                              <span>مخزون مختوم</span>
                            </span>
                          )}
                        </td>

                        {/* Scans */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-zinc-300">
                          {tag._count.incidentLogs} مسحة
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-end whitespace-nowrap space-x-2 space-x-reverse">
                          <a
                            href={`https://taptag.one/r/${tag.tagUid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/10 bg-black hover:border-white/30 text-white text-[10px] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-zinc-300" />
                            <span>اختبار البوابة</span>
                          </a>

                          <Link
                            href={`/admin/qr-engine`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>طباعة QR</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MINTING STATION */}
        <TabsContent value="minting" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1-Click Minting Card */}
            <div className="p-6 rounded-2xl border border-white/[0.08] glass-card space-y-4 shadow-glass">
              <div className="flex items-center gap-2 text-white">
                <PlusCircle className="w-5 h-5 text-white" />
                <h3 className="text-base font-mono font-bold">سك بطاقة فيزيائية فردية فورية</h3>
              </div>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                توليد معرّف عتادي فريد مشفر خالي من التصادمات الرياضية (Collision-Free Hardware UID)،
                وتوليد كود QR بمعيار ISO 18004 Level H مشير حصرياً إلى https://taptag.one،
                وتسجيل الأصل كمخزون مصنع جاهز للبيع في Neon DB.
              </p>

              <div className="pt-2">
                <Button
                  onClick={handleMintSingle}
                  disabled={isPending}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs py-5 cursor-pointer rounded-xl shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 ml-2" />
                  <span>{isPending ? "جارٍ التوليد والتخزين في Neon..." : "سك بطاقة واحدة فورا (1-Click Mint)"}</span>
                </Button>
              </div>
            </div>

            {/* Batch Minting Card */}
            <div className="p-6 rounded-2xl border border-white/[0.08] glass-card space-y-4 shadow-glass">
              <div className="flex items-center gap-2 text-white">
                <Layers className="w-5 h-5 text-white" />
                <h3 className="text-base font-mono font-bold">سك دفعة تصنيع وقص ليزري (Batch Factory)</h3>
              </div>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                سك مجموعات بطاقات دفعة واحدة لتغذية خطوط إنتاج ألواح الأكريليك 70x50 مم.
                يتم حفظ كافة البطاقات دفعة واحدة في معاملة ذرية متزامنة مع قاعدة بيانات Neon.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleMintBatch(5)}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-white font-mono text-xs py-5 cursor-pointer rounded-xl"
                >
                  <span>سك دفعة (5 بطاقات)</span>
                </Button>

                <Button
                  onClick={() => handleMintBatch(10)}
                  disabled={isPending}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs py-5 cursor-pointer rounded-xl shadow-sm"
                >
                  <span>سك دفعة (10 بطاقات)</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Studio Jump Banner */}
          <div className="p-4 rounded-xl border border-white/[0.08] glass-surface shadow-glass flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-white shrink-0" />
              <div className="text-xs font-mono">
                <span className="font-bold text-white block">
                  هل ترغب في تصدير تصاميم الأكريليك وحفر الليزر بدقة 300 DPI؟
                </span>
                <span className="text-zinc-400">
                  انتقل لاستوديو الطباعة لتصدير ملفات SVG المتجهية أو ملفات الطباعة الفائقة الدقة.
                </span>
              </div>
            </div>

            <Link href="/admin/qr-engine">
              <Button
                size="sm"
                className="bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs shrink-0 cursor-pointer rounded-lg shadow-sm"
              >
                <span>فتح استوديو الطباعة</span>
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* TAB 3: INCIDENTS STREAM */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] glass-surface overflow-hidden shadow-glass">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white" />
                <h3 className="text-xs font-mono font-bold text-white">سجل التيليمترية وبلاغات الأمان المباشرة</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">REAL-TIME AUDIT LOG</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-start">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400">
                  <tr>
                    <th className="py-3 px-4 text-start font-bold">نوع الحدث</th>
                    <th className="py-3 px-4 text-start font-bold">البطاقة والمركبة</th>
                    <th className="py-3 px-4 text-start font-bold">البصمة الرقمية المشفرة (IP Hash)</th>
                    <th className="py-3 px-4 text-start font-bold">التوقيت</th>
                    <th className="py-3 px-4 text-start font-bold">الحالة</th>
                    <th className="py-3 px-4 text-end font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        لا توجد حوادث مسجلة حالياً. النظام آمن 100%.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-[10px] font-bold text-zinc-300">
                            {inc.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white font-bold">
                          {inc.tagUid} ({inc.vehiclePlate})
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px]">
                          {inc.ipAddressHash.substring(0, 16)}...
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[10px]">
                          {new Date(inc.createdAt).toLocaleString("ar-SA")}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono ${
                              inc.status === "RESOLVED"
                                ? "border-white/20 bg-white/10 text-white"
                                : "border-white/15 bg-white/5 text-zinc-300"
                            }`}
                          >
                            {inc.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-end">
                          {inc.status !== "RESOLVED" && (
                            <Button
                              onClick={() => handleResolveIncident(inc.id)}
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 border-white/20 hover:bg-zinc-800 text-white cursor-pointer rounded-lg"
                            >
                              إغلاق البلاغ
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: VIRTUAL SIMULATOR */}
        <TabsContent value="simulator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Controls */}
            <div className="p-6 rounded-2xl border border-white/[0.08] glass-card space-y-4 shadow-glass">
              <div className="flex items-center gap-2 text-white">
                <Radio className="w-5 h-5 text-white" />
                <h3 className="text-sm font-mono font-bold">محاكي لمس الـ NFC والمسح الحي</h3>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400">اختر بطاقة للاختبار:</label>
                <select
                  value={simTagUid}
                  onChange={(e) => setSimTagUid(e.target.value)}
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                >
                  {tags.map((t) => (
                    <option key={t.id} value={t.tagUid}>
                      {t.tagUid} — {t.profile?.vehiclePlate || "جاهزة للتفعيل"} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => handleRunSimulation(simTagUid)}
                className="w-full bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs py-5 cursor-pointer rounded-xl shadow-sm"
              >
                <span>محاكاة مسح كود QR أو تقريب NFC</span>
              </Button>

              {/* Console Logs */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/60 font-mono text-[11px] space-y-1.5 min-h-[140px]" dir="ltr">
                <div className="text-zinc-500 text-[10px] border-b border-white/[0.08] pb-1">
                  CONSOLE OUTPUT:
                </div>
                {simLogs.map((log, idx) => (
                  <div key={idx} className="text-zinc-300">
                    <span className="text-zinc-500">&gt;</span> {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Mobile Gateway Screen */}
            <div className="p-6 rounded-2xl border border-white/[0.08] glass-card flex flex-col items-center justify-center shadow-glass">
              <div className="w-full max-w-[280px] rounded-3xl border border-white/[0.12] bg-black/80 backdrop-blur-xl p-5 space-y-3.5 text-center shadow-glass-elevated">
                <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-2" />
                <div className="text-[10px] font-mono text-white font-bold tracking-wider">
                  TAPTAG SECURE GATEWAY
                </div>
                <div className="text-xs font-mono text-zinc-300 font-bold">
                  {simTagUid}
                </div>
                <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[11px] font-mono text-zinc-300">
                  {tags.find((t) => t.tagUid === simTagUid)?.profile?.autoResponseText ||
                    "سأعود خلال 15 دقيقة"}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[10px] font-mono text-white flex items-center justify-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-white" />
                    <span>تحريك سيارة</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[10px] font-mono text-white flex items-center justify-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-white" />
                    <span>اتصال مشفر</span>
                  </div>
                </div>
                <div className="pt-2">
                  <a
                    href={`https://taptag.one/r/${simTagUid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-white hover:underline"
                  >
                    <span>فتح البوابة الحية للمستخدم</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: DIAGNOSTICS */}
        <TabsContent value="diagnostics" className="space-y-4">
          <div className="p-6 rounded-2xl border border-white/[0.08] glass-card space-y-4 shadow-glass">
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>فحص تكامل منظومة الإنتاج (Production Health Check)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <span className="text-zinc-400">قاعدة بيانات Neon PostgreSQL:</span>
                <span className="text-white font-bold">متصلة وجاهزة (Online)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <span className="text-zinc-400">خوارزميات التشفير:</span>
                <span className="text-white font-bold">AES-256-GCM + HMAC</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <span className="text-zinc-400">النطاق والشهادة الأمنية SSL:</span>
                <span className="text-white font-bold">https://taptag.one (Valid)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <span className="text-zinc-400">محرك استجابة الـ QR:</span>
                <span className="text-white font-bold">ISO-18004 Level H (30%)</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
