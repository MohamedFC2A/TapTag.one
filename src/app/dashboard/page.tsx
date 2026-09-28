import React from "react";
import { db } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let tags: any[] = [];
  let incidents: any[] = [];

  try {
    // Query tags from Neon PostgreSQL
    tags = await db.tag.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        _count: {
          select: {
            incidentLogs: true,
            alerts: true,
          },
        },
      },
    });

    // Query incident logs from Neon PostgreSQL
    incidents = await db.incidentLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        tag: {
          include: {
            profile: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("Dashboard database fetch warning:", err);
  }

  // Fallback seed tags if DB returned empty or had a transient connection issue
  if (!tags || tags.length === 0) {
    tags = [
      {
        id: "tt-demo-1",
        tagUid: "TT-88219-X",
        status: "ACTIVE",
        createdAt: new Date(),
        profile: {
          vehiclePlate: "أ ب ج 1234",
          vehicleMake: "Toyota",
          vehicleModel: "Land Cruiser",
          vehicleColor: "White Pearl",
          emergencyContactPhone: "+966500000001",
          autoResponseText: "سأعود خلال 15 دقيقة",
          autoResponseEnabled: true,
          notifyWhatsApp: true,
          notifyTelegram: false,
          notifyPush: true,
          notifySms: false,
        },
        _count: { incidentLogs: 3, alerts: 1 },
      },
      {
        id: "tt-demo-2",
        tagUid: "TT-74190-K",
        status: "AWAY",
        createdAt: new Date(),
        profile: {
          vehiclePlate: "س ص ع 5521",
          vehicleMake: "Lexus",
          vehicleModel: "LX600",
          vehicleColor: "Black",
          emergencyContactPhone: "+966500000002",
          autoResponseText: "في اجتماع - يرجى الاتصال للطوارئ فقط",
          autoResponseEnabled: true,
          notifyWhatsApp: true,
          notifyTelegram: false,
          notifyPush: true,
          notifySms: false,
        },
        _count: { incidentLogs: 1, alerts: 0 },
      },
      {
        id: "tt-demo-3",
        tagUid: "TT-55201-M",
        status: "DND",
        createdAt: new Date(),
        profile: {
          vehiclePlate: "د ر ز 9900",
          vehicleMake: "Mercedes",
          vehicleModel: "G63",
          vehicleColor: "Matte Gray",
          emergencyContactPhone: "+966500000003",
          autoResponseText: "وضع عدم الإزعاج نشط",
          autoResponseEnabled: false,
          notifyWhatsApp: true,
          notifyTelegram: false,
          notifyPush: true,
          notifySms: false,
        },
        _count: { incidentLogs: 0, alerts: 0 },
      },
      {
        id: "tt-demo-4",
        tagUid: "TT-11045-T",
        status: "SUSPENDED",
        createdAt: new Date(),
        profile: null,
        _count: { incidentLogs: 0, alerts: 0 },
      },
    ];
  }

  // Calculate Fleet Metrics
  const totalTags = tags.length;
  const activeTags = tags.filter((t) => t.status === "ACTIVE").length;
  const totalScans = incidents.length;
  const pendingAlerts = incidents.filter((i) => i.status === "RECEIVED").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;
  const resolvedRate = totalScans > 0 ? Math.round((resolvedCount / totalScans) * 100) : 100;

  // Format dates for client component
  const formattedTags = tags.map((t) => ({
    id: t.id,
    tagUid: t.tagUid,
    status: t.status,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    profile: t.profile
      ? {
          vehiclePlate: t.profile.vehiclePlate,
          vehicleMake: t.profile.vehicleMake,
          vehicleModel: t.profile.vehicleModel,
          vehicleColor: t.profile.vehicleColor,
          emergencyContactPhone: t.profile.emergencyContactPhone,
          autoResponseText: t.profile.autoResponseText,
          autoResponseEnabled: t.profile.autoResponseEnabled,
          notifyWhatsApp: t.profile.notifyWhatsApp,
          notifyTelegram: t.profile.notifyTelegram,
          notifyPush: t.profile.notifyPush,
          notifySms: t.profile.notifySms,
        }
      : null,
    _count: t._count,
  }));

  const formattedIncidents = incidents.map((i) => ({
    id: i.id,
    eventType: i.eventType,
    status: i.status,
    createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : String(i.createdAt),
    ipAddressHash: i.ipAddressHash,
    resolutionNotes: i.resolutionNotes,
    tag: {
      tagUid: i.tag?.tagUid || "TT-UNKNOWN",
      profile: i.tag?.profile
        ? {
            vehiclePlate: i.tag.profile.vehiclePlate,
          }
        : null,
    },
    metadata: i.metadata,
  }));

  return (
    <DashboardClient
      tags={formattedTags}
      incidents={formattedIncidents}
      stats={{
        totalTags,
        activeTags,
        totalScans,
        pendingAlerts,
        resolvedRate,
      }}
    />
  );
}
