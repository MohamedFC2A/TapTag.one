import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { extractClientIp, hashIpAddress } from "@/lib/rate-limit";
import { detectDeviceOs } from "@/lib/smart-qr";
import {
  ensureSecureShareTables,
  SECURE_SHARE_FULL_COLUMNS,
  SecureShareRecordLike,
  verifyShareToken,
} from "@/lib/secure-share";
import { formatContentDisposition } from "@/lib/webauthn-gate";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureSecureShareTables();
    const { code } = await context.params;
    const shareCode = code.trim().toUpperCase();
    const token = request.nextUrl.searchParams.get("token");

    const preCheck = await db.$queryRawUnsafe<
      {
        id: string;
        pinHash: string | null;
        biometricEnabled: boolean;
      }[]
    >(
      `SELECT "id", "pinHash", "biometricEnabled" FROM "SecureShare" WHERE "shareCode" = $1 LIMIT 1`,
      shareCode
    );

    if (preCheck.length === 0) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    const guard = preCheck[0];
    const isProtected = Boolean(guard.pinHash || guard.biometricEnabled);
    if (isProtected && !verifyShareToken(shareCode, token)) {
      return NextResponse.json(
        { error: "Authorization required to download file" },
        { status: 401 }
      );
    }

    // Atomic quota-enforced increment (prevents race conditions on burn-after-read / maxDownloads)
    const claimed = await db.$queryRawUnsafe<SecureShareRecordLike[]>(
      `UPDATE "SecureShare"
       SET "downloadCount" = "downloadCount" + 1,
           "lastAccessedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "shareCode" = $1
         AND "isActive" = true
         AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
         AND (
           CASE
             WHEN "burnAfterRead" = true THEN "downloadCount" < 1
             WHEN "maxDownloads" IS NOT NULL THEN "downloadCount" < "maxDownloads"
             ELSE true
           END
         )
       RETURNING ${SECURE_SHARE_FULL_COLUMNS}`,
      shareCode
    );

    if (claimed.length === 0) {
      return NextResponse.json(
        { error: "Download limit reached, burned, or share expired" },
        { status: 403 }
      );
    }

    const record = claimed[0];
    const headerList = await headers();
    const ipHash = hashIpAddress(extractClientIp(headerList));
    const deviceOs = detectDeviceOs(headerList.get("user-agent"));

    await db.$executeRawUnsafe(
      `INSERT INTO "SecureShareLog" ("id", "shareId", "deviceOs", "action", "ipHash")
       VALUES ($1, $2, $3, $4, $5)`,
      `slg_${crypto.randomBytes(6).toString("hex")}`,
      record.id,
      deviceOs,
      record.burnAfterRead ? "BURNED" : "DOWNLOAD",
      ipHash
    );

    const rawB64 = (record.fileDataBase64 || "").includes(",")
      ? (record.fileDataBase64 || "").split(",")[1]
      : record.fileDataBase64 || "";
    const buffer = Buffer.from(rawB64, "base64");

    // If E2EE client-encrypted, serve raw encrypted bytes as octet-stream for browser decryption
    const contentType = record.isEncrypted
      ? "application/octet-stream"
      : record.fileMimeType || "application/octet-stream";

    const rawFileName = record.isEncrypted
      ? `${record.shareCode}.mataenc`
      : record.fileName;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": formatContentDisposition("attachment", rawFileName),
        "X-Content-Type-Options": "nosniff",
        "X-Mata-Sha256": record.fileSha256,
        "X-Mata-Encrypted": record.isEncrypted ? "1" : "0",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/share/[code]/download error:", error);
    return NextResponse.json(
      { error: "Failed to stream secure download" },
      { status: 500 }
    );
  }
}
