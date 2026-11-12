import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ensureSmartQrTables,
  evaluateQrAvailability,
  SMART_QR_COLUMNS,
  SmartQrRecordLike,
  verifyUnlockToken,
} from "@/lib/smart-qr";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureSmartQrTables();
    const { code } = await context.params;
    const shortCode = code.trim().toUpperCase();
    const token = request.nextUrl.searchParams.get("token");
    const forceDownload = request.nextUrl.searchParams.get("download") === "1";

    const rows = await db.$queryRawUnsafe<SmartQrRecordLike[]>(
      `SELECT ${SMART_QR_COLUMNS} FROM "SmartQr" WHERE "shortCode" = $1 LIMIT 1`,
      shortCode
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const record = rows[0];
    const availability = evaluateQrAvailability(record);
    if (!availability.isUsable && !verifyUnlockToken(shortCode, token)) {
      return NextResponse.json({ error: "QR unavailable" }, { status: 403 });
    }

    const isProtected = Boolean(record.pinHash || record.biometricEnabled);
    if (isProtected && !verifyUnlockToken(shortCode, token)) {
      return NextResponse.json(
        { error: "Authorization required to download document" },
        { status: 401 }
      );
    }

    if (!record.fileDataBase64) {
      return NextResponse.json(
        { error: "No stored document binary for this QR" },
        { status: 404 }
      );
    }

    // Strip potential data URL prefix (`data:...;base64,`) cleanly
    const rawBase64 = record.fileDataBase64.includes(",")
      ? record.fileDataBase64.split(",")[1]
      : record.fileDataBase64;
    const buffer = Buffer.from(rawBase64, "base64");
    const mimeType =
      record.fileMimeType ||
      (record.payloadType === "PDF"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    const safeName = (record.fileName || `${shortCode}.bin`).replace(/[^\w.\-\u0600-\u06FF ]+/g, "_");
    const disposition =
      !forceDownload && mimeType === "application/pdf" ? "inline" : "attachment";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(safeName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/qr/[code]/file error:", error);
    return NextResponse.json(
      { error: "Failed to serve document" },
      { status: 500 }
    );
  }
}
