import React from "react";
import { headers, cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashIpAddress, extractClientIp } from "@/lib/rate-limit";
import { SafePublicTag } from "@/types";
import { TagActionClient } from "./TagActionClient";

interface TagPageProps {
  params: Promise<{
    tagId: string;
  }>;
}

export default async function TagPage({ params }: TagPageProps) {
  const { tagId } = await params;
  const cleanTagUid = tagId.trim().toUpperCase();

  // 1. Fetch tag from Neon PostgreSQL
  let tagRecord = await db.tag.findUnique({
    where: { tagUid: cleanTagUid },
    include: {
      profile: true,
    },
  });

  // If tag doesn't exist yet, check if it's a valid new hardware UID format (e.g. MW-...)
  // and prepare it for factory first-claim
  const isFactoryUnclaimed = !tagRecord;

  // 2. Audit Scan Event in Neon DB if tag exists
  if (tagRecord) {
    try {
      const headerList = await headers();
      const clientIp = extractClientIp(headerList);
      const ipHash = hashIpAddress(clientIp);

      await db.incidentLog.create({
        data: {
          tagId: tagRecord.id,
          eventType: "SCAN",
          ipAddressHash: ipHash,
          userAgent: headerList.get("user-agent") || null,
          status: "RECEIVED",
          metadata: {
            scannedAt: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      console.error("Failed to log scan audit:", err);
    }
  }

  // 3. Prepare Safe Data Object
  const safeTag: SafePublicTag = {
    tagUid: cleanTagUid,
    status: tagRecord?.status || "ACTIVE",
    isActivated: tagRecord?.isActivated ?? false,
    ownerDeviceId: tagRecord?.ownerDeviceId || null,
    ownerDeviceName: tagRecord?.ownerDeviceName || null,
    vehiclePlate: tagRecord?.profile?.vehiclePlate || "أ ب ج 1234",
    vehicleMake: tagRecord?.profile?.vehicleMake || "Toyota",
    vehicleModel: tagRecord?.profile?.vehicleModel || "Land Cruiser",
    vehicleColor: tagRecord?.profile?.vehicleColor || "White Pearl",
    autoResponseText: tagRecord?.profile?.autoResponseText || "سأعود خلال 15 دقيقة",
    autoResponseEnabled: tagRecord?.profile?.autoResponseEnabled ?? false,
    emergencyContactPhone: tagRecord?.profile?.emergencyContactPhone || null,
    notifyWhatsApp: tagRecord?.profile?.notifyWhatsApp ?? true,
    notifyTelegram: tagRecord?.profile?.notifyTelegram ?? false,
    notifyPush: tagRecord?.profile?.notifyPush ?? true,
    notifySms: tagRecord?.profile?.notifySms ?? false,
  };

  return <TagActionClient initialTag={safeTag} isFactoryUnclaimed={isFactoryUnclaimed} />;
}
