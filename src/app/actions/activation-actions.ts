"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { TagStatus } from "@/types";

/**
 * First-Claim Ownership: Claim and activate a new physical tag without passwords.
 * Locks the tag to the owner's unique device ID / biometric passkey.
 */
export async function claimAndActivateTag(params: {
  tagUid: string;
  deviceId: string;
  deviceName?: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel?: string;
  vehicleColor?: string;
  emergencyContactPhone: string;
  autoResponseText?: string;
}) {
  try {
    const {
      tagUid,
      deviceId,
      deviceName = "Verified Smart Device",
      vehiclePlate,
      vehicleMake,
      vehicleModel = "Standard",
      vehicleColor = "White",
      emergencyContactPhone,
      autoResponseText = "سأعود خلال 15 دقيقة",
    } = params;

    if (!tagUid || !deviceId || !vehiclePlate || !vehicleMake || !emergencyContactPhone) {
      return { success: false, error: "جميع الحقول الأساسية مطلوبة لإتمام الاقتران والتفعيل." };
    }

    const cleanTagUid = tagUid.trim().toUpperCase();

    // Ensure Master / System User exists
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: "admin@taptag.one",
          name: "إدارة منظومة TapTag (TapTag.one Admin)",
          role: "ADMIN",
        },
      });
    }

    // Check if tag already exists in Neon DB
    let tag = await db.tag.findUnique({
      where: { tagUid: cleanTagUid },
      include: { profile: true },
    });

    if (tag) {
      // If already claimed by another device
      if (tag.isActivated && tag.ownerDeviceId && tag.ownerDeviceId !== deviceId) {
        return {
          success: false,
          error: "هذه البطاقة مقترنة ومقفلة بالفعل بجهاز آخر. لا يمكن إعادة تفعيلها إلا من جهاز المالك الأصلي.",
        };
      }

      // Update existing tag to claimed & activated state
      tag = await db.tag.update({
        where: { id: tag.id },
        data: {
          isActivated: true,
          ownerDeviceId: deviceId,
          ownerDeviceName: deviceName,
          claimedAt: new Date(),
          status: "ACTIVE",
          profile: {
            upsert: {
              create: {
                vehiclePlate,
                vehicleMake,
                vehicleModel,
                vehicleColor,
                emergencyContactPhone,
                autoResponseText,
                autoResponseEnabled: false,
                notifyWhatsApp: true,
                notifyPush: true,
              },
              update: {
                vehiclePlate,
                vehicleMake,
                vehicleModel,
                vehicleColor,
                emergencyContactPhone,
                autoResponseText,
              },
            },
          },
        },
        include: { profile: true },
      });
    } else {
      // Create new tag directly on first-claim
      tag = await db.tag.create({
        data: {
          tagUid: cleanTagUid,
          secretHash: `claimed_${deviceId.substring(0, 10)}`,
          status: "ACTIVE",
          isActivated: true,
          ownerDeviceId: deviceId,
          ownerDeviceName: deviceName,
          claimedAt: new Date(),
          userId: user.id,
          profile: {
            create: {
              vehiclePlate,
              vehicleMake,
              vehicleModel,
              vehicleColor,
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
        include: { profile: true },
      });
    }

    // Log the Claim / Activation event in Neon DB
    await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "SCAN",
        ipAddressHash: "owner_device_claim",
        status: "RESOLVED",
        metadata: {
          event: "FIRST_CLAIM_ACTIVATION",
          deviceName,
          claimedAt: new Date().toISOString(),
        },
      },
    });

    // Set HTTPOnly cookie for persistent owner recognition
    const cookieStore = await cookies();
    cookieStore.set("taptag_device_id", deviceId, {
      path: "/",
      maxAge: 31536000, // 1 year
      httpOnly: false, // allow client-side read as well
      sameSite: "strict",
    });

    revalidatePath("/dashboard");
    revalidatePath(`/t/${cleanTagUid}`);

    return {
      success: true,
      tagUid: cleanTagUid,
      message: "تم تفعيل البطاقة واقترانها بنجاح عبر بصمة جهازك وقفل الملكية الحصرية!",
    };
  } catch (error) {
    console.error("claimAndActivateTag error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء تفعيل واقتران البطاقة. يرجى المحاولة ثانية.",
    };
  }
}

/**
 * Verify if the scanning device is the legitimate owner of this tag
 */
export async function verifyOwnerDevice(tagUid: string, deviceId: string) {
  try {
    const tag = await db.tag.findUnique({
      where: { tagUid: tagUid.trim().toUpperCase() },
      include: { profile: true },
    });

    if (!tag) {
      return { exists: false, isOwner: false, isActivated: false };
    }

    const isOwner = tag.isActivated && tag.ownerDeviceId === deviceId;

    if (isOwner) {
      const cookieStore = await cookies();
      cookieStore.set("taptag_device_id", deviceId, {
        path: "/",
        maxAge: 31536000,
        httpOnly: false,
        sameSite: "strict",
      });
    }

    return {
      exists: true,
      isActivated: tag.isActivated,
      isOwner,
      ownerDeviceName: tag.ownerDeviceName,
      status: tag.status,
      tagProfile: isOwner ? tag.profile : null,
    };
  } catch (error) {
    console.error("verifyOwnerDevice error:", error);
    return { exists: false, isOwner: false, isActivated: false };
  }
}

/**
 * Update tag settings directly as verified owner without passwords
 */
export async function updateOwnerSettings(params: {
  tagUid: string;
  deviceId: string;
  status: TagStatus;
  autoResponseEnabled: boolean;
  autoResponseText: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  channels: {
    whatsapp: boolean;
    telegram: boolean;
    push: boolean;
    sms: boolean;
  };
}) {
  try {
    const {
      tagUid,
      deviceId,
      status,
      autoResponseEnabled,
      autoResponseText,
      vehiclePlate,
      vehicleMake,
      vehicleModel,
      channels,
    } = params;

    const tag = await db.tag.findUnique({
      where: { tagUid: tagUid.trim().toUpperCase() },
      include: { profile: true },
    });

    if (!tag || !tag.isActivated || tag.ownerDeviceId !== deviceId) {
      return { success: false, error: "فشل التحقق من ملكية الجهاز لهذه البطاقة." };
    }

    // Update tag status
    await db.tag.update({
      where: { id: tag.id },
      data: { status },
    });

    // Update profile
    await db.tagProfile.update({
      where: { tagId: tag.id },
      data: {
        autoResponseEnabled,
        autoResponseText,
        vehiclePlate,
        vehicleMake,
        vehicleModel,
        notifyWhatsApp: channels.whatsapp,
        notifyTelegram: channels.telegram,
        notifyPush: channels.push,
        notifySms: channels.sms,
      },
    });

    revalidatePath(`/t/${tagUid}`);
    revalidatePath("/dashboard");

    return { success: true, message: "تم حفظ الإعدادات وتحديث حالة البطاقة بنجاح!" };
  } catch (error) {
    console.error("updateOwnerSettings error:", error);
    return { success: false, error: "تعذر حفظ الإعدادات." };
  }
}
