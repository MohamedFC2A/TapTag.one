"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashIpAddress, extractClientIp, COOLDOWN_SECONDS } from "@/lib/rate-limit";
import { dispatchMultiChannelAlert } from "@/lib/alerts";
import { ActionResponse } from "@/types";

// Validation Schemas
const MovementSchema = z.object({
  tagUid: z.string().min(3).max(30),
  reason: z.string().min(2).max(100),
  customNote: z.string().max(200).optional(),
});

const EmergencySchema = z.object({
  tagUid: z.string().min(3).max(30),
  category: z.enum(["BUMP", "TOW", "WINDOW_OPEN", "ALARM", "OTHER"]),
  urgency: z.enum(["HIGH", "CRITICAL"]),
  details: z.string().max(250).optional(),
});

const NoteSchema = z.object({
  tagUid: z.string().min(3).max(30),
  note: z.string().min(2).max(160),
});

/**
 * Format and sanitize phone numbers for direct international WhatsApp and SMS routing
 */
function formatCleanPhoneNumber(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)]/g, "");
  if (clean.startsWith("05")) {
    clean = "966" + clean.substring(1);
  }
  clean = clean.replace(/^\+/, "");
  return clean || "966500000000";
}

function maskPhoneNumber(phone: string): string {
  if (!phone) return "محجوب";
  return phone.replace(/(\+?\d{2,4})\d{4,}(\d{3})/, "$1****$2");
}

/**
 * 1. Dispatch Vehicle Movement Request Alert
 */
export async function sendMovementAlert(
  prevState: unknown,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const rawData = {
      tagUid: formData.get("tagUid")?.toString() || "",
      reason: formData.get("reason")?.toString() || "",
      customNote: formData.get("customNote")?.toString() || undefined,
    };

    const parsed = MovementSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: "بيانات الطلب غير صالحة. يرجى التحقق من المدخلات.",
        error: parsed.error.issues[0]?.message,
      };
    }

    const { tagUid, reason, customNote } = parsed.data;

    // Verify tag existence in Neon DB
    const tag = await db.tag.findUnique({
      where: { tagUid },
      include: { profile: true },
    });

    if (!tag || !tag.isActivated || tag.status === "SUSPENDED") {
      return {
        success: false,
        message: "هذه البطاقة غير مفعلة أو معلّقة حالياً من قِبل المالك ولا تقبل التنبيهات.",
      };
    }

    if (tag.status === "DND") {
      return {
        success: false,
        message: "المالك في وضع عدم الإزعاج (طوارئ فقط). لا يمكن إرسال طلب تحريك حالياً.",
      };
    }

    // Rate Limiting Check using hashed IP (cross-incident protection)
    const headerList = await headers();
    const clientIp = extractClientIp(headerList);
    const ipHash = hashIpAddress(clientIp);

    const cooldownThreshold = new Date(Date.now() - COOLDOWN_SECONDS * 1000);
    const recentIncident = await db.incidentLog.findFirst({
      where: {
        tagId: tag.id,
        ipAddressHash: ipHash,
        eventType: { in: ["MOVEMENT_REQUEST", "DIRECT_NOTE", "CALL_ATTEMPT"] },
        createdAt: { gte: cooldownThreshold },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentIncident) {
      const elapsedSeconds = Math.floor(
        (Date.now() - recentIncident.createdAt.getTime()) / 1000
      );
      const remainingSeconds = Math.max(1, COOLDOWN_SECONDS - elapsedSeconds);
      return {
        success: false,
        message: `تم إرسال طلب مسبقاً. يرجى الانتظار ${remainingSeconds} ثانية لحماية خصوصية المالك من الإزعاج والتكرار.`,
        cooldownSeconds: remainingSeconds,
      };
    }

    // Create Incident Log in Neon DB
    const incident = await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "MOVEMENT_REQUEST",
        ipAddressHash: ipHash,
        userAgent: headerList.get("user-agent") || null,
        status: "DELIVERED",
        metadata: {
          reason,
          customNote,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Multi-channel alert dispatch
    const channels = {
      whatsapp: tag.profile?.notifyWhatsApp ?? true,
      telegram: tag.profile?.notifyTelegram ?? false,
      push: tag.profile?.notifyPush ?? true,
      sms: tag.profile?.notifySms ?? false,
    };

    const dispatchResults = await dispatchMultiChannelAlert({
      tagUid,
      eventType: "MOVEMENT_REQUEST",
      recipientPhone: tag.profile?.emergencyContactPhone || "+966500000000",
      payload: {
        plate: tag.profile?.vehiclePlate,
        reason,
        customNote,
      },
      channels,
    });

    // Record dispatched alerts
    for (const res of dispatchResults) {
      await db.alert.create({
        data: {
          tagId: tag.id,
          channel: res.channel,
          recipient: "MASKED_RECIPIENT",
          payload: { reason, customNote },
          deliveryStatus: res.status,
          providerResponse: res.response,
        },
      });
    }

    const rawPhone = tag.profile?.emergencyContactPhone || "+966500000000";
    const cleanPhone = formatCleanPhoneNumber(rawPhone);
    const maskedPhone = maskPhoneNumber(rawPhone);

    const plateText = tag.profile?.vehiclePlate || "المركبة";
    const vehicleName = `${tag.profile?.vehicleMake || ""} ${tag.profile?.vehicleModel || ""}`.trim();
    const timeString = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    const whatsappMessage = `⚠️ *تنبيه عاجل من منظومة TapTag.one*\n\nيرجى تحريك مركبتك [${plateText} - ${vehicleName}].\n\n📌 *سبب الطلب:* ${reason}\n${customNote ? `📝 *ملاحظة:* ${customNote}\n` : ""}⏰ *التوقيت:* ${timeString}\n\n🔒 تم الإرسال عبر البوابة المشفرة: https://taptag.one/r/${tagUid}`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`;
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(whatsappMessage)}`;
    const telUrl = `tel:${cleanPhone}`;

    return {
      success: true,
      message: `تم تسجيل التنبيه بنجاح في المنظومة وإرساله إلى هاتف المالك (${maskedPhone}).`,
      cooldownSeconds: COOLDOWN_SECONDS,
      incidentId: incident.id,
      whatsappUrl,
      smsUrl,
      telUrl,
      recipientPhoneMasked: maskedPhone,
    };
  } catch (error) {
    console.error("sendMovementAlert error:", error);
    return {
      success: false,
      message: "تعذر إرسال التنبيه حالياً. يرجى المحاولة بعد قليل.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 2. Dispatch Emergency / Collision Incident Report
 */
export async function sendEmergencyReport(
  prevState: unknown,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const rawData = {
      tagUid: formData.get("tagUid")?.toString() || "",
      category: formData.get("category")?.toString() as "BUMP" | "TOW" | "WINDOW_OPEN" | "ALARM" | "OTHER",
      urgency: (formData.get("urgency")?.toString() || "HIGH") as "HIGH" | "CRITICAL",
      details: formData.get("details")?.toString() || undefined,
    };

    const parsed = EmergencySchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: "بيانات البلاغ غير صالحة.",
      };
    }

    const { tagUid, category, urgency, details } = parsed.data;

    const tag = await db.tag.findUnique({
      where: { tagUid },
      include: { profile: true },
    });

    if (!tag) {
      return { success: false, message: "البطاقة غير موجودة." };
    }

    const headerList = await headers();
    const clientIp = extractClientIp(headerList);
    const ipHash = hashIpAddress(clientIp);

    // Incident logging in Neon DB
    const incident = await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "EMERGENCY_REPORT",
        ipAddressHash: ipHash,
        userAgent: headerList.get("user-agent") || null,
        status: "DELIVERED",
        metadata: {
          category,
          urgency,
          details,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Alert dispatching
    await dispatchMultiChannelAlert({
      tagUid,
      eventType: "EMERGENCY_REPORT",
      recipientPhone: tag.profile?.emergencyContactPhone || "+966500000000",
      payload: { category, urgency, details },
      channels: {
        whatsapp: true,
        push: true,
        telegram: tag.profile?.notifyTelegram ?? false,
        sms: true, // Emergency always attempts SMS fallback
      },
    });

    const rawPhone = tag.profile?.emergencyContactPhone || "+966500000000";
    const cleanPhone = formatCleanPhoneNumber(rawPhone);
    const maskedPhone = maskPhoneNumber(rawPhone);

    const plateText = tag.profile?.vehiclePlate || "المركبة";
    const vehicleName = `${tag.profile?.vehicleMake || ""} ${tag.profile?.vehicleModel || ""}`.trim();
    const timeString = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    const emergencyTitles: Record<string, string> = {
      BUMP: "اصطدام أو صدم بالمركبة",
      TOW: "ونش / سحب للمركبة",
      WINDOW_OPEN: "نافذة السيارة مفتوحة",
      ALARM: "إنذار السيارة يعمل",
      OTHER: "طوارئ أمنية عامة",
    };
    const categoryTitle = emergencyTitles[category] || category;

    const whatsappMessage = `🚨 *بلاغ طوارئ عاجل من منظومة TapTag.one*\n\nتم رصد حالة طوارئ لمركبتك [${plateText} - ${vehicleName}]!\n\n⚠️ *نوع البلاغ:* ${categoryTitle}\n${details ? `📝 *التفاصيل:* ${details}\n` : ""}⏰ *التوقيت:* ${timeString}\n\n🔒 يرجى تفقد المركبة فوراً: https://taptag.one/r/${tagUid}`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`;
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(whatsappMessage)}`;
    const telUrl = `tel:${cleanPhone}`;

    return {
      success: true,
      message: `تم تسجيل بلاغ الطوارئ وإرساله فورياً إلى هاتف المالك (${maskedPhone}).`,
      cooldownSeconds: COOLDOWN_SECONDS,
      incidentId: incident.id,
      whatsappUrl,
      smsUrl,
      telUrl,
      recipientPhoneMasked: maskedPhone,
    };
  } catch (error) {
    console.error("sendEmergencyReport error:", error);
    return {
      success: false,
      message: "فشل إرسال بلاغ الطوارئ.",
    };
  }
}

/**
 * 3. Send Anonymous Controlled Note to Owner
 */
export async function sendDirectNote(
  prevState: unknown,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const rawData = {
      tagUid: formData.get("tagUid")?.toString() || "",
      note: formData.get("note")?.toString() || "",
    };

    const parsed = NoteSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: "الملاحظة يجب ألا تتجاوز 160 حرفاً ولا تقل عن حرفين.",
      };
    }

    const { tagUid, note } = parsed.data;

    const tag = await db.tag.findUnique({
      where: { tagUid },
      include: { profile: true },
    });

    if (!tag || !tag.isActivated || tag.status === "SUSPENDED") {
      return {
        success: false,
        message: "هذه البطاقة معلّقة حالياً من قِبل المالك ولا تقبل الملاحظات.",
      };
    }

    if (tag.status === "DND") {
      return {
        success: false,
        message: "المالك في وضع عدم الإزعاج حالياً، ولا يقبل سوى بلاغات الطوارئ الحرجة فقط.",
      };
    }

    const headerList = await headers();
    const clientIp = extractClientIp(headerList);
    const ipHash = hashIpAddress(clientIp);

    // Cross-incident cooldown check (3 minutes)
    const cooldownThreshold = new Date(Date.now() - COOLDOWN_SECONDS * 1000);
    const recentNote = await db.incidentLog.findFirst({
      where: {
        tagId: tag.id,
        ipAddressHash: ipHash,
        eventType: { in: ["MOVEMENT_REQUEST", "DIRECT_NOTE", "CALL_ATTEMPT"] },
        createdAt: { gte: cooldownThreshold },
      },
    });

    if (recentNote) {
      return {
        success: false,
        message: "لقد أرسلت طلباً مسبقاً. يرجى الانتظار 3 دقائق لحماية راحة المالك من الإزعاج.",
        cooldownSeconds: COOLDOWN_SECONDS,
      };
    }

    await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "DIRECT_NOTE",
        ipAddressHash: ipHash,
        userAgent: headerList.get("user-agent") || null,
        status: "DELIVERED",
        metadata: {
          note,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await dispatchMultiChannelAlert({
      tagUid,
      eventType: "DIRECT_NOTE",
      recipientPhone: tag.profile?.emergencyContactPhone || "+966500000000",
      payload: { note },
      channels: {
        whatsapp: tag.profile?.notifyWhatsApp ?? true,
        push: tag.profile?.notifyPush ?? true,
        telegram: false,
        sms: false,
      },
    });

    const rawPhone = tag.profile?.emergencyContactPhone || "+966500000000";
    const cleanPhone = formatCleanPhoneNumber(rawPhone);
    const maskedPhone = maskPhoneNumber(rawPhone);

    const plateText = tag.profile?.vehiclePlate || "المركبة";
    const timeString = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    const whatsappMessage = `📩 *رسالة مباشرة لمالك المركبة [${plateText}] عبر TapTag.one*\n\n"${note}"\n\n⏰ *التوقيت:* ${timeString}\n🔒 البوابة المشفرة: https://taptag.one/r/${tagUid}`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`;
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(whatsappMessage)}`;
    const telUrl = `tel:${cleanPhone}`;

    return {
      success: true,
      message: `تم تسجيل الملاحظة وإرسالها فورياً إلى هاتف المالك (${maskedPhone}).`,
      cooldownSeconds: COOLDOWN_SECONDS,
      whatsappUrl,
      smsUrl,
      telUrl,
      recipientPhoneMasked: maskedPhone,
    };
  } catch (error) {
    console.error("sendDirectNote error:", error);
    return {
      success: false,
      message: "تعذر إرسال الملاحظة.",
    };
  }
}
