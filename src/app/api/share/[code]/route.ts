import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { extractClientIp, hashIpAddress } from "@/lib/rate-limit";
import { detectDeviceOs, verifyPin } from "@/lib/smart-qr";
import {
  ensureSecureShareTables,
  evaluateShareAvailability,
  SECURE_SHARE_LIST_COLUMNS,
  SecureShareRecordLike,
  signShareToken,
  toSecureSharePublicDTO,
} from "@/lib/secure-share";
import { issueBiometricChallenge, verifyBiometricGateProof } from "@/lib/webauthn-gate";

interface RouteContext {
  params: Promise<{ code: string }>;
}

const UnlockShareSchema = z.object({
  pin: z.string().optional(),
  biometricProof: z
    .object({
      challengeToken: z.string().min(10).max(500),
      clientDataJSON: z.string().min(10).max(4000),
      attestationObject: z.string().min(20).max(16000),
    })
    .optional(),
});

const PatchShareSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().trim().max(140).optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureSecureShareTables();
    const { code } = await context.params;
    const shareCode = code.trim().toUpperCase();
    const inspect = request.nextUrl.searchParams.get("inspect") === "1";

    const rows = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `SELECT ${SECURE_SHARE_LIST_COLUMNS} FROM "SecureShare" WHERE "shareCode" = $1 LIMIT 1`,
      shareCode
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Secure share not found" }, { status: 404 });
    }

    const record = rows[0];
    if (inspect) {
      const logs = await db.$queryRawUnsafe<
        { id: string; deviceOs: string; action: string; createdAt: Date }[]
      >(
        `SELECT "id", "deviceOs", "action", "createdAt"
         FROM "SecureShareLog"
         WHERE "shareId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 20`,
        record.id
      );
      return NextResponse.json({
        share: toSecureSharePublicDTO(record, false),
        logs: logs.map((l) => ({
          ...l,
          createdAt: new Date(l.createdAt).toISOString(),
        })),
      });
    }

    const availability = evaluateShareAvailability(record);
    const isLocked = Boolean(record.pinHash || record.biometricEnabled);
    const headerList = await headers();
    const ipHash = hashIpAddress(extractClientIp(headerList));
    const deviceOs = detectDeviceOs(headerList.get("user-agent"));

    if (!availability.isUsable) {
      const reason = !record.isActive
        ? "DISABLED"
        : availability.isExpired
        ? "EXPIRED"
        : record.burnAfterRead
        ? "BURNED"
        : "LIMIT_REACHED";

      return NextResponse.json({
        share: toSecureSharePublicDTO(record, true),
        locked: isLocked,
        available: false,
        reason,
      });
    }

    await db.$executeRawUnsafe(
      `INSERT INTO "SecureShareLog" ("id", "shareId", "deviceOs", "action", "ipHash")
       VALUES ($1, $2, $3, 'VIEW', $4)`,
      `slg_${crypto.randomBytes(6).toString("hex")}`,
      record.id,
      deviceOs,
      ipHash
    );

    if (isLocked) {
      const challengePayload = record.biometricEnabled
        ? issueBiometricChallenge("SHARE", shareCode)
        : null;
      return NextResponse.json({
        share: toSecureSharePublicDTO(record, true),
        locked: true,
        available: true,
        biometricChallenge: challengePayload?.challenge || null,
        biometricChallengeToken: challengePayload?.challengeToken || null,
      });
    }

    const unlockToken = signShareToken(shareCode);
    return NextResponse.json({
      share: toSecureSharePublicDTO(record, false),
      locked: false,
      available: true,
      unlockToken,
    });
  } catch (error) {
    console.error("GET /api/share/[code] error:", error);
    return NextResponse.json(
      { error: "Failed to load secure share" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await ensureSecureShareTables();
    const { code } = await context.params;
    const shareCode = code.trim().toUpperCase();
    const body = await request.json();
    const parsed = UnlockShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const rows = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `SELECT ${SECURE_SHARE_LIST_COLUMNS} FROM "SecureShare" WHERE "shareCode" = $1 LIMIT 1`,
      shareCode
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Secure share not found" }, { status: 404 });
    }

    const record = rows[0];
    const availability = evaluateShareAvailability(record);
    if (!availability.isUsable) {
      return NextResponse.json(
        { error: "Share has expired, been burned, or reached download limit" },
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
          scope: "SHARE",
          code: shareCode,
          proof: parsed.data.biometricProof,
          requestHost: headerList.get("x-forwarded-host") || headerList.get("host"),
          requestOrigin: headerList.get("origin"),
        })
      : true;

    const unlocked = pinValid && bioValid;

    if (!unlocked) {
      await db.$executeRawUnsafe(
        `INSERT INTO "SecureShareLog" ("id", "shareId", "deviceOs", "action", "ipHash")
         VALUES ($1, $2, $3, 'DENIED', $4)`,
        `slg_${crypto.randomBytes(6).toString("hex")}`,
        record.id,
        deviceOs,
        ipHash
      );
      return NextResponse.json(
        { error: "رمز فك الحماية غير صحيح" },
        { status: 401 }
      );
    }

    await db.$executeRawUnsafe(
      `INSERT INTO "SecureShareLog" ("id", "shareId", "deviceOs", "action", "ipHash")
       VALUES ($1, $2, $3, 'UNLOCK', $4)`,
      `slg_${crypto.randomBytes(6).toString("hex")}`,
      record.id,
      deviceOs,
      ipHash
    );

    const unlockToken = signShareToken(shareCode);
    return NextResponse.json({
      success: true,
      unlockToken,
      share: toSecureSharePublicDTO(record, false),
    });
  } catch (error) {
    console.error("POST /api/share/[code] error:", error);
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureSecureShareTables();
    const { code } = await context.params;
    const shareCode = code.trim().toUpperCase();
    const body = await request.json();
    const parsed = PatchShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const existing = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `SELECT ${SECURE_SHARE_LIST_COLUMNS} FROM "SecureShare" WHERE "shareCode" = $1 LIMIT 1`,
      shareCode
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cur = existing[0];
    const updated = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `UPDATE "SecureShare"
       SET "isActive" = $1,
           "title" = $2,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "shareCode" = $3
       RETURNING ${SECURE_SHARE_LIST_COLUMNS}`,
      parsed.data.isActive ?? cur.isActive,
      parsed.data.title ?? cur.title,
      shareCode
    );

    return NextResponse.json({
      success: true,
      share: toSecureSharePublicDTO(updated[0], false),
    });
  } catch (error) {
    console.error("PATCH /api/share/[code] error:", error);
    return NextResponse.json({ error: "Failed to update share" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await ensureSecureShareTables();
    const { code } = await context.params;
    const shareCode = code.trim().toUpperCase();
    await db.$executeRawUnsafe(
      `DELETE FROM "SecureShare" WHERE "shareCode" = $1`,
      shareCode
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/share/[code] error:", error);
    return NextResponse.json({ error: "Failed to delete share" }, { status: 500 });
  }
}
