"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { TagStatus } from "@/types";

export async function updateTagStatus(tagId: string, status: TagStatus) {
  try {
    await db.tag.update({
      where: { id: tagId },
      data: { status },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/t/[tagId]`, "page");

    return { success: true };
  } catch (error) {
    console.error("updateTagStatus error:", error);
    return { success: false, error: "Failed to update tag status" };
  }
}

export async function updateTagAutoResponse(
  tagId: string,
  autoResponseEnabled: boolean,
  autoResponseText: string
) {
  try {
    await db.tagProfile.update({
      where: { tagId },
      data: {
        autoResponseEnabled,
        autoResponseText,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/t/[tagId]`, "page");

    return { success: true };
  } catch (error) {
    console.error("updateTagAutoResponse error:", error);
    return { success: false, error: "Failed to update auto response" };
  }
}

export async function updateDispatchChannels(
  tagId: string,
  channels: {
    whatsapp: boolean;
    telegram: boolean;
    push: boolean;
    sms: boolean;
  }
) {
  try {
    await db.tagProfile.update({
      where: { tagId },
      data: {
        notifyWhatsApp: channels.whatsapp,
        notifyTelegram: channels.telegram,
        notifyPush: channels.push,
        notifySms: channels.sms,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("updateDispatchChannels error:", error);
    return { success: false, error: "Failed to update dispatch channels" };
  }
}

export async function resolveIncident(incidentId: string, resolutionNotes: string = "Resolved by fleet manager") {
  try {
    await db.incidentLog.update({
      where: { id: incidentId },
      data: {
        status: "RESOLVED",
        resolutionNotes,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/incidents");
    return { success: true };
  } catch (error) {
    console.error("resolveIncident error:", error);
    return { success: false, error: "Failed to resolve incident" };
  }
}

export async function provisionTag(formData: FormData) {
  try {
    const tagUid = formData.get("tagUid")?.toString().trim().toUpperCase();
    const secretHash = formData.get("secretHash")?.toString().trim();
    const vehiclePlate = formData.get("vehiclePlate")?.toString().trim();
    const vehicleMake = formData.get("vehicleMake")?.toString().trim();
    const vehicleModel = formData.get("vehicleModel")?.toString().trim();
    const vehicleColor = formData.get("vehicleColor")?.toString().trim();
    const emergencyContactPhone = formData.get("emergencyContactPhone")?.toString().trim();
    const autoResponseText = formData.get("autoResponseText")?.toString().trim() || "سأعود خلال 15 دقيقة";

    if (!tagUid || !secretHash || !vehiclePlate || !vehicleMake || !emergencyContactPhone) {
      return { success: false, error: "جميع الحقول الإلزامية مطلوبة." };
    }

    // Check if tagUid exists
    const existing = await db.tag.findUnique({ where: { tagUid } });
    if (existing) {
      return { success: false, error: "هذا الرقم التسلسلي للبطاقة مسجل مسبقاً." };
    }

    // Find default admin user
    const user = await db.user.findFirst();
    if (!user) {
      return { success: false, error: "تعذر العثور على حساب المالك أو المسؤول." };
    }

    await db.tag.create({
      data: {
        tagUid,
        secretHash,
        status: "ACTIVE",
        userId: user.id,
        profile: {
          create: {
            vehiclePlate,
            vehicleMake,
            vehicleModel: vehicleModel || "Standard",
            vehicleColor: vehicleColor || "White",
            emergencyContactPhone,
            autoResponseText,
            autoResponseEnabled: false,
            notifyWhatsApp: true,
            notifyPush: true,
            notifyTelegram: false,
            notifySms: false,
          },
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, tagUid };
  } catch (error) {
    console.error("provisionTag error:", error);
    return { success: false, error: "فشل تفعيل البطاقة. تحقق من الاتصال." };
  }
}
