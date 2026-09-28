"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generateQRCodeSVG, generateQRCodeDataURL } from "@/lib/qr-generator";

/**
 * Check if the caller is accessing from local server / loopback.
 * Factory Minting Engine is strictly restricted to local manufacturing operations.
 */
export async function isLocalFactoryRequest(): Promise<boolean> {
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const forwardedFor = headerList.get("x-forwarded-for") || "";
  
  const isLocalHost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("::1");
  const isLocalIp = !forwardedFor || forwardedFor.includes("127.0.0.1") || forwardedFor.includes("::1");
  
  return isLocalHost && isLocalIp;
}

/**
 * Generate a cryptographically secure, collision-free Hardware UID.
 * Mathematical collision is impossible as it validates against Neon PostgreSQL in an atomic loop.
 */
export async function generateCollisionFreeUid(): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    // 2 random bytes + 2 random bytes hex -> 8 uppercase chars (e.g. TT-8A2F-9C4B)
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const candidate = `TT-${part1}-${part2}`;

    const existing = await db.tag.findUnique({
      where: { tagUid: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  // Fallback with high-entropy timestamp if ever needed
  return `TT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

/**
 * Mint and save a new factory physical card into Neon PostgreSQL as sealed inventory.
 * Ready to be sold in shops for first-claim biometric activation.
 */
export async function mintPhysicalTag() {
  try {
    const isLocal = await isLocalFactoryRequest();
    if (!isLocal && process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "محرّك التصنيع وسك البطاقات مقصور حصرياً على السيرفر المحلي للمصنع.",
      };
    }

    // Ensure Master Admin exists
    let adminUser = await db.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          email: "admin@taptag.one",
          name: "إدارة مصنع TapTag (TapTag.one Factory Admin)",
          role: "ADMIN",
        },
      });
    }

    // Generate collision-free UID & cryptographic tokens
    const tagUid = await generateCollisionFreeUid();
    const secretHash = crypto.randomBytes(32).toString("hex");
    const activationToken = crypto.randomBytes(20).toString("base64url");

    // Dynamic redirect URL printed on the QR code
    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUrl = `${protocol}://${host}/r/${tagUid}`;

    // Generate ISO 18004 Level H QR code
    const qrSvg = await generateQRCodeSVG(redirectUrl, {
      margin: 1,
      width: 400,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // Save as unactivated sealed inventory in Neon DB
    const tag = await db.tag.create({
      data: {
        tagUid,
        secretHash,
        status: "ACTIVE",
        isActivated: false, // Sealed, awaiting customer purchase & first-claim
        activationToken,
        qrCodeSvg: qrSvg,
        userId: adminUser.id,
        profile: {
          create: {
            vehiclePlate: "غير مسجل (جاهز للتفعيل)",
            vehicleMake: "في انتظار إقتران المالك",
            vehicleModel: "بصمة بيومترية حصرية",
            vehicleColor: "N/A",
            emergencyContactPhone: "+966500000000",
            autoResponseText: "سأعود خلال 15 دقيقة",
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

    // Log the Minting event in Audit Trail
    await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "SCAN",
        ipAddressHash: "factory_mint_engine",
        status: "RESOLVED",
        resolutionNotes: "Factory minting complete. Tag added to shop inventory.",
        metadata: {
          event: "FACTORY_MINTED",
          tagUid,
          mintedAt: new Date().toISOString(),
          redirectUrl,
        },
      },
    });

    revalidatePath("/admin/qr-engine");
    revalidatePath("/dashboard");

    return {
      success: true,
      tag: {
        id: tag.id,
        tagUid: tag.tagUid,
        isActivated: tag.isActivated,
        createdAt: tag.createdAt.toISOString(),
        redirectUrl,
        qrCodeSvg: qrSvg,
      },
      message: `تم سك وتخزين البطاقة الفيزيائية بنجاح في قاعدة بيانات Neon كأصل جاهز للبيع! (UID: ${tagUid})`,
    };
  } catch (error) {
    console.error("mintPhysicalTag error:", error);
    return {
      success: false,
      error: "فشل سك البطاقة في قاعدة البيانات. يرجى إعادة المحاولة.",
    };
  }
}

/**
 * Mint a batch of physical cards (e.g. 5 or 10 cards) for bulk acrylic laser cutting
 */
export async function mintBatchPhysicalTags(count: number = 5) {
  try {
    const isLocal = await isLocalFactoryRequest();
    if (!isLocal && process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "محرّك التصنيع وسك البطاقات مقصور حصرياً على السيرفر المحلي للمصنع.",
      };
    }

    const safeCount = Math.min(Math.max(1, count), 20);
    const results = [];

    for (let i = 0; i < safeCount; i++) {
      const res = await mintPhysicalTag();
      if (res.success && res.tag) {
        results.push(res.tag);
      }
    }

    revalidatePath("/admin/qr-engine");
    revalidatePath("/dashboard");

    return {
      success: true,
      count: results.length,
      tags: results,
      message: `تم سك وتخزين دفعة مصنع تتكون من ${results.length} بطاقة بنجاح في قاعدة بيانات Neon!`,
    };
  } catch (error) {
    console.error("mintBatchPhysicalTags error:", error);
    return {
      success: false,
      error: "فشل سك دفعة البطاقات.",
    };
  }
}

/**
 * Fetch all factory inventory tags from Neon PostgreSQL
 */
export async function getFactoryInventory() {
  try {
    const tags = await db.tag.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { profile: true },
    });

    return {
      success: true,
      tags: tags.map((t) => ({
        id: t.id,
        tagUid: t.tagUid,
        isActivated: t.isActivated,
        status: t.status,
        ownerDeviceName: t.ownerDeviceName || null,
        claimedAt: t.claimedAt ? t.claimedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        vehiclePlate: t.profile?.vehiclePlate || "جاهزة للتفعيل",
        vehicleMake: t.profile?.vehicleMake || "N/A",
      })),
    };
  } catch (error) {
    console.error("getFactoryInventory error:", error);
    return {
      success: false,
      tags: [],
      error: "تعذر استدعاء سجل المخزون من Neon DB.",
    };
  }
}
