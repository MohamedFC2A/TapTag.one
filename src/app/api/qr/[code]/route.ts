import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { extractClientIp, hashIpAddress } from "@/lib/rate-limit";
import {
  detectDeviceOs,
  ensureSmartQrTables,
  evaluateQrAvailability,
  hashPin,
  signUnlockToken,
  SMART_QR_COLUMNS,
  SmartQrRecordLike,
  toSmartQrPublicDTO,
  verifyPin,
} from "@/lib/smart-qr";
import { issueBiometricChallenge, verifyBiometricGateProof } from "@/lib/webauthn-gate";

interface RouteContext {
  params: Promise<{ code: string }>;
}

const UnlockSchema = z.object({
  pin: z.string().optional(),
  biometricProof: z
    .object({
      challengeToken: z.string().min(10).max(500),
      clientDataJSON: z.string().min(10).max(4000),
      attestationObject: z.string().min(20).max(16000),
    })
    .optional(),
});

const PatchQrSchema = z.object({
  title: z.string().trim().max(120).optional(),
  payloadType: z.enum(["URL", "PDF", "DOCX", "LINKS", "VCARD", "WIFI", "TEXT"]).optional(),
  destinationUrl: z.string().trim().max(4000).nullable().optional(),
  fileName: z.string().trim().max(260).nullable().optional(),
  fileMimeType: z.string().trim().max(180).nullable().optional(),
  fileSize: z.number().int().nonnegative().max(6_500_000).nullable().optional(),
  fileDataBase64: z.string().max(9_000_000).nullable().optional(),
  payloadData: z.record(z.any()).nullable().optional(),
  logoPreset: z.enum(["NONE", "MATA", "TAPTAG", "CUSTOM"]).optional(),
  logoDataUrl: z.string().max(1_500_000).nullable().optional(),
  frameCaption: z.string().trim().max(48).nullable().optional(),
  qrStyle: z
    .object({
      moduleShape: z.enum(["square", "dots"]).default("square"),
    })
    .nullable()
    .optional(),
  autoRedirect: z.boolean().optional(),
  pinAction: z.enum(["keep", "set", "clear"]).optional(),
  pin: z.string().trim().max(32).nullable().optional(),
  biometricEnabled: z.boolean().optional(),
  maxScans: z.number().int().positive().max(1_000_000).nullable().optional(),
  ttlHours: z.number().positive().max(87600).nullable().optional(),
  clearExpiry: z.boolean().optional(),
  resetScans: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureSmartQrTables();
    const { code } = await context.params;
    const shortCode = code.trim().toUpperCase();
    const inspectOnly = request.nextUrl.searchParams.get("inspect") === "1";

    const rows = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `SELECT ${SMART_QR_COLUMNS} FROM "SmartQr" WHERE "shortCode" = $1 LIMIT 1`,
      shortCode
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "QR not found" }, { status: 404 });
    }

    const record = rows[0];

    // Dashboard detail inspector mode (does not record a scan event)
    if (inspectOnly) {
      const scanHistory = await db.$queryRawUnsafe<
        { id: string; deviceOs: string; accessResult: string; createdAt: Date }[]
      >(
        `SELECT "id", "deviceOs", "accessResult", "createdAt"
         FROM "SmartQrScan"
         WHERE "qrId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 25`,
        record.id
      );
      return NextResponse.json({
        qr: toSmartQrPublicDTO(record, false),
        scans: scanHistory.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt).toISOString(),
        })),
      });
    }

    const availability = evaluateQrAvailability(record);
    const headerList = await headers();
    const ipHash = hashIpAddress(extractClientIp(headerList));
    const deviceOs = detectDeviceOs(headerList.get("user-agent"));
    const isLocked = Boolean(record.pinHash || record.biometricEnabled);

    if (!availability.isUsable) {
      const reason = !record.isActive
        ? "DISABLED"
        : availability.isExpired
        ? "EXPIRED"
        : "LIMIT_REACHED";

      await db.$executeRawUnsafe(
        `INSERT INTO "SmartQrScan" ("id", "qrId", "deviceOs", "accessResult", "ipHash")
         VALUES ($1, $2, $3, $4, $5)`,
        `scn_${crypto.randomBytes(6).toString("hex")}`,
        record.id,
        deviceOs,
        reason,
        ipHash
      );

      return NextResponse.json({
        qr: toSmartQrPublicDTO(record, true),
        locked: isLocked,
        available: false,
        reason,
      });
    }

    if (isLocked) {
      const challengePayload = record.biometricEnabled
        ? issueBiometricChallenge("QR", shortCode)
        : null;
      return NextResponse.json({
        qr: toSmartQrPublicDTO(record, true),
        locked: true,
        available: true,
        biometricChallenge: challengePayload?.challenge || null,
        biometricChallengeToken: challengePayload?.challengeToken || null,
      });
    }

    const updated = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `UPDATE "SmartQr"
       SET "scanCount" = "scanCount" + 1,
           "lastScannedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING ${SMART_QR_COLUMNS}`,
      record.id
    );

    await db.$executeRawUnsafe(
      `INSERT INTO "SmartQrScan" ("id", "qrId", "deviceOs", "accessResult", "ipHash")
       VALUES ($1, $2, $3, 'ALLOWED', $4)`,
      `scn_${crypto.randomBytes(6).toString("hex")}`,
      record.id,
      deviceOs,
      ipHash
    );

    const unlockToken = signUnlockToken(shortCode);

    return NextResponse.json({
      qr: toSmartQrPublicDTO(updated[0] || record, false),
      locked: false,
      available: true,
      unlockToken,
    });
  } catch (error) {
    console.error("GET /api/qr/[code] error:", error);
    return NextResponse.json(
      { error: "Failed to resolve Smart QR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await ensureSmartQrTables();
    const { code } = await context.params;
    const shortCode = code.trim().toUpperCase();
    const body = await request.json();
    const parsed = UnlockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const rows = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `SELECT ${SMART_QR_COLUMNS} FROM "SmartQr" WHERE "shortCode" = $1 LIMIT 1`,
      shortCode
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "QR not found" }, { status: 404 });
    }

    const record = rows[0];
    const availability = evaluateQrAvailability(record);
    if (!availability.isUsable) {
      return NextResponse.json(
        { error: "QR is expired, paused, or reached max scans" },
        { status: 403 }
      );
    }

    const headerList = await headers();
    const ipHash = hashIpAddress(extractClientIp(headerList));
    const deviceOs = detectDeviceOs(headerList.get("user-agent"));

    const pinValid = record.pinHash
      ? Boolean(parsed.data.pin && verifyPin(parsed.data.pin, record.pinHash))
      : true;
    const bioValid = record.biometricEnabled
      ? verifyBiometricGateProof({
          scope: "QR",
          code: shortCode,
          proof: parsed.data.biometricProof,
          requestHost: headerList.get("x-forwarded-host") || headerList.get("host"),
          requestOrigin: headerList.get("origin"),
        })
      : true;

    const unlocked = pinValid && bioValid;

    if (!unlocked) {
      await db.$executeRawUnsafe(
        `INSERT INTO "SmartQrScan" ("id", "qrId", "deviceOs", "accessResult", "ipHash")
         VALUES ($1, $2, $3, 'DENIED', $4)`,
        `scn_${crypto.randomBytes(6).toString("hex")}`,
        record.id,
        deviceOs,
        ipHash
      );
      return NextResponse.json(
        { error: "رمز الدخول غير صحيح" },
        { status: 401 }
      );
    }

    const updated = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `UPDATE "SmartQr"
       SET "scanCount" = "scanCount" + 1,
           "lastScannedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING ${SMART_QR_COLUMNS}`,
      record.id
    );

    const accessAction =
      record.biometricEnabled && parsed.data.biometricProof
        ? record.pinHash
          ? "PIN_BIO_UNLOCKED"
          : "BIO_UNLOCKED"
        : "PIN_UNLOCKED";

    await db.$executeRawUnsafe(
      `INSERT INTO "SmartQrScan" ("id", "qrId", "deviceOs", "accessResult", "ipHash")
       VALUES ($1, $2, $3, $4, $5)`,
      `scn_${crypto.randomBytes(6).toString("hex")}`,
      record.id,
      deviceOs,
      accessAction,
      ipHash
    );

    const unlockToken = signUnlockToken(shortCode);

    return NextResponse.json({
      success: true,
      unlockToken,
      qr: toSmartQrPublicDTO(updated[0] || record, false),
    });
  } catch (error) {
    console.error("POST /api/qr/[code] unlock error:", error);
    return NextResponse.json(
      { error: "Unlock failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureSmartQrTables();
    const { code } = await context.params;
    const shortCode = code.trim().toUpperCase();
    const rawBody = await request.json();
    const parsed = PatchQrSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const existingRows = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `SELECT * FROM "SmartQr" WHERE "shortCode" = $1 LIMIT 1`,
      shortCode
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "QR not found" }, { status: 404 });
    }

    const cur = existingRows[0];
    const data = parsed.data;

    let nextPinHash = cur.pinHash;
    if (data.pinAction === "clear") {
      nextPinHash = null;
    } else if (data.pinAction === "set" && data.pin && data.pin.length > 0) {
      nextPinHash = hashPin(data.pin);
    }

    const nextPayloadType = data.payloadType ?? cur.payloadType;
    let nextDestUrl =
      data.destinationUrl !== undefined ? data.destinationUrl : cur.destinationUrl;
    if (nextDestUrl && nextPayloadType === "URL" && !/^https?:\/\//i.test(nextDestUrl)) {
      nextDestUrl = `https://${nextDestUrl}`;
    }

    let nextExpiresAt = cur.expiresAt;
    if (data.clearExpiry) {
      nextExpiresAt = null;
    } else if (typeof data.ttlHours === "number" && data.ttlHours > 0) {
      nextExpiresAt = new Date(Date.now() + data.ttlHours * 3600 * 1000);
    }

    const nextPayloadData =
      data.payloadData !== undefined ? data.payloadData : cur.payloadData;
    const nextQrStyle =
      data.qrStyle !== undefined ? data.qrStyle : cur.qrStyle;
    const nextScanCount = data.resetScans ? 0 : cur.scanCount;

    const updated = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `UPDATE "SmartQr" SET
        "title" = $1,
        "payloadType" = $2,
        "destinationUrl" = $3,
        "fileName" = $4,
        "fileMimeType" = $5,
        "fileSize" = $6,
        "fileDataBase64" = $7,
        "payloadData" = $8::jsonb,
        "logoPreset" = $9,
        "logoDataUrl" = $10,
        "frameCaption" = $11,
        "qrStyle" = $12::jsonb,
        "autoRedirect" = $13,
        "pinHash" = $14,
        "biometricEnabled" = $15,
        "maxScans" = $16,
        "expiresAt" = $17,
        "scanCount" = $18,
        "isActive" = $19,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "shortCode" = $20
      RETURNING ${SMART_QR_COLUMNS}`,
      data.title ?? cur.title,
      nextPayloadType,
      nextDestUrl,
      data.fileName !== undefined ? data.fileName : cur.fileName,
      data.fileMimeType !== undefined ? data.fileMimeType : cur.fileMimeType,
      data.fileSize !== undefined ? data.fileSize : cur.fileSize,
      data.fileDataBase64 !== undefined ? data.fileDataBase64 : cur.fileDataBase64,
      nextPayloadData ? JSON.stringify(nextPayloadData) : null,
      data.logoPreset ?? cur.logoPreset,
      data.logoDataUrl !== undefined ? data.logoDataUrl : cur.logoDataUrl,
      data.frameCaption !== undefined ? data.frameCaption : cur.frameCaption,
      nextQrStyle ? JSON.stringify(nextQrStyle) : null,
      data.autoRedirect ?? cur.autoRedirect,
      nextPinHash,
      data.biometricEnabled ?? cur.biometricEnabled,
      data.maxScans !== undefined ? data.maxScans : cur.maxScans,
      nextExpiresAt,
      nextScanCount,
      data.isActive ?? cur.isActive,
      shortCode
    );

    return NextResponse.json({
      success: true,
      qr: toSmartQrPublicDTO(updated[0], false),
    });
  } catch (error) {
    console.error("PATCH /api/qr/[code] error:", error);
    return NextResponse.json(
      { error: "Failed to update Smart QR" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await ensureSmartQrTables();
    const { code } = await context.params;
    const shortCode = code.trim().toUpperCase();

    await db.$executeRawUnsafe(
      `DELETE FROM "SmartQr" WHERE "shortCode" = $1`,
      shortCode
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/qr/[code] error:", error);
    return NextResponse.json(
      { error: "Failed to delete Smart QR" },
      { status: 500 }
    );
  }
}
