import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ensureSmartQrTables,
  generateShortCode,
  hashPin,
  sanitizeCustomSlug,
  SMART_QR_COLUMNS,
  SMART_QR_LIST_COLUMNS,
  toSmartQrPublicDTO,
  SmartQrRecordLike,
} from "@/lib/smart-qr";

const CreateQrSchema = z.object({
  title: z.string().trim().max(120).optional(),
  customAlias: z.string().trim().max(40).nullable().optional(),
  payloadType: z.enum(["URL", "PDF", "DOCX", "LINKS", "VCARD", "WIFI", "TEXT"]),
  destinationUrl: z.string().trim().max(4000).nullable().optional(),
  fileName: z.string().trim().max(260).nullable().optional(),
  fileMimeType: z.string().trim().max(180).nullable().optional(),
  fileSize: z.number().int().nonnegative().max(6_500_000).nullable().optional(),
  fileDataBase64: z.string().max(9_000_000).nullable().optional(),
  payloadData: z.record(z.any()).nullable().optional(),
  logoPreset: z.enum(["NONE", "TAPTAG", "CUSTOM"]).default("NONE"),
  logoDataUrl: z.string().max(1_500_000).nullable().optional(),
  frameCaption: z.string().trim().max(48).nullable().optional(),
  qrStyle: z
    .object({
      moduleShape: z.enum(["square", "dots"]).default("square"),
    })
    .nullable()
    .optional(),
  autoRedirect: z.boolean().default(false),
  pin: z.string().trim().max(32).nullable().optional(),
  biometricEnabled: z.boolean().default(false),
  biometricCredId: z.string().trim().max(256).nullable().optional(),
  maxScans: z.number().int().positive().max(1_000_000).nullable().optional(),
  ttlHours: z.number().positive().max(87600).nullable().optional(),
});

async function seedInitialExamplesIfEmpty() {
  const existing = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "SmartQr"`
  );
  if (Number(existing[0]?.count || 0) > 0) return;

  const samples = [
    {
      id: `sqr_${crypto.randomBytes(6).toString("hex")}`,
      shortCode: "TT-DOCS1",
      title: "Architecture Spec Brief",
      payloadType: "PDF",
      destinationUrl: "https://taptag.one",
      fileName: "taptag-architecture-2026.pdf",
      fileMimeType: "application/pdf",
      payloadData: JSON.stringify({ note: "Enterprise QR Document" }),
      logoPreset: "TAPTAG",
      pinHash: null,
      biometricEnabled: false,
      maxScans: null,
      scanCount: 14,
      deviceOs: "iOS 18.3 · Safari",
      accessResult: "ALLOWED",
    },
    {
      id: `sqr_${crypto.randomBytes(6).toString("hex")}`,
      shortCode: "TT-SEC02",
      title: "Protected Vault Link",
      payloadType: "URL",
      destinationUrl: "https://taptag.one/dashboard",
      fileName: null,
      fileMimeType: null,
      payloadData: JSON.stringify({ scope: "PIN + Biometric" }),
      logoPreset: "NONE",
      pinHash: hashPin("2026"),
      biometricEnabled: true,
      maxScans: 25,
      scanCount: 4,
      deviceOs: "Android 15 · Chrome",
      accessResult: "PIN_UNLOCKED",
    },
    {
      id: `sqr_${crypto.randomBytes(6).toString("hex")}`,
      shortCode: "TT-WIFI3",
      title: "Studio Guest Network",
      payloadType: "WIFI",
      destinationUrl: null,
      fileName: null,
      fileMimeType: null,
      payloadData: JSON.stringify({
        ssid: "taptag_studio_5g",
        password: "hw-zero-2026",
        encryption: "WPA",
      }),
      logoPreset: "TAPTAG",
      pinHash: null,
      biometricEnabled: false,
      maxScans: null,
      scanCount: 9,
      deviceOs: "macOS 15 · Safari",
      accessResult: "ALLOWED",
    },
  ];

  for (const s of samples) {
    await db.$executeRawUnsafe(
      `INSERT INTO "SmartQr" (
        "id", "shortCode", "title", "payloadType", "destinationUrl",
        "fileName", "fileMimeType", "payloadData", "logoPreset",
        "pinHash", "biometricEnabled", "maxScans", "scanCount", "lastScannedAt", "isActive"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, true)
      ON CONFLICT ("shortCode") DO NOTHING`,
      s.id,
      s.shortCode,
      s.title,
      s.payloadType,
      s.destinationUrl,
      s.fileName,
      s.fileMimeType,
      s.payloadData,
      s.logoPreset,
      s.pinHash,
      s.biometricEnabled,
      s.maxScans,
      s.scanCount
    );

    await db.$executeRawUnsafe(
      `INSERT INTO "SmartQrScan" ("id", "qrId", "deviceOs", "accessResult", "ipHash")
       VALUES ($1, $2, $3, $4, $5)`,
      `scn_${crypto.randomBytes(6).toString("hex")}`,
      s.id,
      s.deviceOs,
      s.accessResult,
      crypto.createHash("sha256").update(s.shortCode).digest("hex").slice(0, 16)
    );
  }
}

export async function GET() {
  try {
    await ensureSmartQrTables();
    await seedInitialExamplesIfEmpty();

    const rows = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `SELECT ${SMART_QR_LIST_COLUMNS} FROM "SmartQr" ORDER BY "createdAt" DESC LIMIT 100`
    );

    const scanRows = await db.$queryRawUnsafe<
      {
        id: string;
        qrId: string;
        deviceOs: string;
        accessResult: string;
        createdAt: Date;
        shortCode: string;
        title: string;
        payloadType: string;
        hasPin: boolean;
        biometricEnabled: boolean;
        isActive: boolean;
      }[]
    >(
      `SELECT s."id", s."qrId", s."deviceOs", s."accessResult", s."createdAt",
              q."shortCode", q."title", q."payloadType",
              (q."pinHash" IS NOT NULL) AS "hasPin",
              q."biometricEnabled", q."isActive"
       FROM "SmartQrScan" s
       JOIN "SmartQr" q ON q."id" = s."qrId"
       ORDER BY s."createdAt" DESC
       LIMIT 24`
    );

    const qrs = rows.map((r) => toSmartQrPublicDTO(r, false));
    const totalScans = qrs.reduce((acc, q) => acc + q.scanCount, 0);
    const activeCount = qrs.filter((q) => q.isActive && !q.isExpired && !q.isLimitReached).length;
    const protectedCount = qrs.filter((q) => q.hasPin || q.biometricEnabled).length;

    return NextResponse.json({
      qrs,
      scans: scanRows.map((s) => ({
        ...s,
        createdAt: new Date(s.createdAt).toISOString(),
      })),
      stats: {
        total: qrs.length,
        active: activeCount,
        protected: protectedCount,
        totalScans,
      },
    });
  } catch (error) {
    console.error("GET /api/qr error:", error);
    return NextResponse.json(
      { error: "Failed to load QR records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSmartQrTables();
    const rawBody = await request.json();
    const parsed = CreateQrSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid QR configuration", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const id = `sqr_${crypto.randomBytes(8).toString("hex")}`;

    let shortCode = sanitizeCustomSlug(data.customAlias) || generateShortCode();

    if (data.customAlias) {
      const conflict = await db.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "SmartQr" WHERE "shortCode" = $1 LIMIT 1`,
        shortCode
      );
      if (conflict.length > 0) {
        return NextResponse.json(
          { error: `الاسم المختصر "${shortCode}" مستخدم بالفعل — اختر اسماً آخر.` },
          { status: 409 }
        );
      }
    } else {
      for (let attempt = 0; attempt < 5; attempt++) {
        const check = await db.$queryRawUnsafe<{ id: string }[]>(
          `SELECT "id" FROM "SmartQr" WHERE "shortCode" = $1 LIMIT 1`,
          shortCode
        );
        if (check.length === 0) break;
        shortCode = generateShortCode();
      }
    }

    const normalizedUrl =
      data.destinationUrl && data.payloadType === "URL"
        ? /^https?:\/\//i.test(data.destinationUrl)
          ? data.destinationUrl
          : `https://${data.destinationUrl}`
        : data.destinationUrl || null;

    const pinHash =
      data.pin && data.pin.length > 0 ? hashPin(data.pin) : null;

    const expiresAt =
      typeof data.ttlHours === "number" && data.ttlHours > 0
        ? new Date(Date.now() + data.ttlHours * 3600 * 1000)
        : null;

    const defaultTitle =
      data.title && data.title.length > 0
        ? data.title
        : data.fileName ||
          (typeof data.payloadData?.ssid === "string" ? data.payloadData.ssid : null) ||
          (typeof data.payloadData?.fullName === "string" ? data.payloadData.fullName : null) ||
          normalizedUrl ||
          `QR ${shortCode}`;

    const inserted = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `INSERT INTO "SmartQr" (
        "id", "shortCode", "title", "payloadType", "destinationUrl",
        "fileName", "fileMimeType", "fileSize", "fileDataBase64", "payloadData",
        "logoDataUrl", "logoPreset", "frameCaption", "qrStyle", "autoRedirect",
        "pinHash", "biometricEnabled", "biometricCredId",
        "maxScans", "expiresAt", "isActive"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10::jsonb,
        $11, $12, $13, $14::jsonb, $15,
        $16, $17, $18,
        $19, $20, true
      )
      RETURNING ${SMART_QR_COLUMNS}`,
      id,
      shortCode,
      defaultTitle,
      data.payloadType,
      normalizedUrl,
      data.fileName || null,
      data.fileMimeType || null,
      data.fileSize ?? null,
      data.fileDataBase64 || null,
      data.payloadData ? JSON.stringify(data.payloadData) : null,
      data.logoDataUrl || null,
      data.logoPreset,
      data.frameCaption || null,
      data.qrStyle ? JSON.stringify(data.qrStyle) : JSON.stringify({ moduleShape: "square" }),
      Boolean(data.autoRedirect),
      pinHash,
      data.biometricEnabled,
      data.biometricCredId || null,
      data.maxScans ?? null,
      expiresAt
    );

    const qr = toSmartQrPublicDTO(inserted[0], false);
    return NextResponse.json({ success: true, qr }, { status: 201 });
  } catch (error) {
    console.error("POST /api/qr error:", error);
    return NextResponse.json(
      { error: "Failed to save dynamic QR" },
      { status: 500 }
    );
  }
}
