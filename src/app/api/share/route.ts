import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPin, sanitizeCustomSlug } from "@/lib/smart-qr";
import {
  ensureSecureShareTables,
  generateShareCode,
  SECURE_SHARE_LIST_COLUMNS,
  SecureShareRecordLike,
  toSecureSharePublicDTO,
} from "@/lib/secure-share";

const CreateShareSchema = z.object({
  title: z.string().trim().max(140).optional(),
  customAlias: z.string().trim().max(40).nullable().optional(),
  fileName: z.string().trim().min(1).max(260),
  fileMimeType: z.string().trim().min(1).max(180),
  fileSize: z.number().int().positive().max(1_073_741_824),
  fileSha256: z.string().trim().min(16).max(128).optional(),
  fileDataBase64: z.string().min(4),
  isEncrypted: z.boolean().default(false),
  encryptionMeta: z.record(z.any()).nullable().optional(),
  pin: z.string().trim().max(32).nullable().optional(),
  biometricEnabled: z.boolean().default(false),
  maxDownloads: z.number().int().positive().max(10_000).nullable().optional(),
  burnAfterRead: z.boolean().default(false),
  ttlHours: z.number().positive().max(8760).nullable().optional(),
  aiSummary: z.string().trim().max(600).nullable().optional(),
});

export async function GET() {
  try {
    await ensureSecureShareTables();

    const rows = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `SELECT ${SECURE_SHARE_LIST_COLUMNS}
       FROM "SecureShare"
       ORDER BY "createdAt" DESC
       LIMIT 60`
    );

    const shares = rows.map((r) => toSecureSharePublicDTO(r, false));
    const activeCount = shares.filter((s) => s.isUsable).length;
    const encryptedCount = shares.filter((s) => s.isEncrypted || s.hasPin || s.biometricEnabled).length;
    const totalDownloads = shares.reduce((acc, s) => acc + s.downloadCount, 0);

    return NextResponse.json({
      shares,
      stats: {
        total: shares.length,
        active: activeCount,
        encrypted: encryptedCount,
        totalDownloads,
      },
    });
  } catch (error) {
    console.error("GET /api/share error:", error);
    return NextResponse.json(
      { error: "Failed to load secure shares" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSecureShareTables();
    const rawBody = await request.json();
    const parsed = CreateShareSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid file share payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const id = `shr_${crypto.randomBytes(8).toString("hex")}`;

    let shareCode = sanitizeCustomSlug(data.customAlias) || generateShareCode();

    if (data.customAlias) {
      const conflict = await db.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "SecureShare" WHERE "shareCode" = $1 LIMIT 1`,
        shareCode
      );
      if (conflict.length > 0) {
        return NextResponse.json(
          { error: `الاسم المختصر "${shareCode}" مستخدم بالفعل.` },
          { status: 409 }
        );
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const exists = await db.$queryRawUnsafe<{ id: string }[]>(
          `SELECT "id" FROM "SecureShare" WHERE "shareCode" = $1 LIMIT 1`,
          shareCode
        );
        if (exists.length === 0) break;
        shareCode = generateShareCode();
      }
    }

    const rawB64 = data.fileDataBase64.includes(",")
      ? data.fileDataBase64.split(",")[1]
      : data.fileDataBase64;
    const binaryBuf = Buffer.from(rawB64, "base64");
    if (binaryBuf.length === 0) {
      return NextResponse.json(
        { error: "Empty or malformed file payload" },
        { status: 400 }
      );
    }

    const computedSha256 =
      data.fileSha256 ||
      crypto.createHash("sha256").update(binaryBuf).digest("hex");

    const pinHash =
      data.pin && data.pin.length > 0 ? hashPin(data.pin) : null;

    const effectiveMaxDownloads = data.burnAfterRead
      ? 1
      : data.maxDownloads ?? null;

    const expiresAt =
      typeof data.ttlHours === "number" && data.ttlHours > 0
        ? new Date(Date.now() + data.ttlHours * 3600 * 1000)
        : null;

    const title =
      data.title && data.title.length > 0
        ? data.title
        : data.fileName;

    const inserted = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `INSERT INTO "SecureShare" (
        "id", "shareCode", "title", "fileName", "fileMimeType", "fileSize",
        "fileSha256", "fileDataBase64", "isEncrypted", "encryptionMeta",
        "pinHash", "biometricEnabled", "maxDownloads", "burnAfterRead",
        "expiresAt", "isActive", "aiSummary"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10::jsonb,
        $11, $12, $13, $14,
        $15, true, $16
      )
      RETURNING ${SECURE_SHARE_LIST_COLUMNS}`,
      id,
      shareCode,
      title,
      data.fileName,
      data.fileMimeType,
      data.fileSize,
      computedSha256,
      rawB64,
      Boolean(data.isEncrypted),
      data.encryptionMeta ? JSON.stringify(data.encryptionMeta) : null,
      pinHash,
      Boolean(data.biometricEnabled),
      effectiveMaxDownloads,
      Boolean(data.burnAfterRead),
      expiresAt,
      data.aiSummary || null
    );

    return NextResponse.json(
      {
        success: true,
        share: toSecureSharePublicDTO(inserted[0], false),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/share error:", error);
    return NextResponse.json(
      { error: "Failed to save secure share" },
      { status: 500 }
    );
  }
}
