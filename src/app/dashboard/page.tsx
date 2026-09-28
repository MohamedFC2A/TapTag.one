import React from "react";
import { db } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Query tags from Neon PostgreSQL
  const tags = await db.tag.findMany({
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
  const incidents = await db.incidentLog.findMany({
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
    createdAt: t.createdAt.toISOString(),
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
    createdAt: i.createdAt.toISOString(),
    ipAddressHash: i.ipAddressHash,
    resolutionNotes: i.resolutionNotes,
    tag: {
      tagUid: i.tag.tagUid,
      profile: i.tag.profile
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
