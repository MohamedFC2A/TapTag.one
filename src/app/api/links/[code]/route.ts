import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  CustomerSmartLinkRecord,
  ensureCustomerLinkTables,
  recordCustomerLinkVisit,
} from "@/lib/customer-links";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    await ensureCustomerLinkTables();

    const rows = await db.$queryRawUnsafe<CustomerSmartLinkRecord[]>(
      `SELECT * FROM "CustomerSmartLink" WHERE UPPER("code") = UPPER($1) LIMIT 1`,
      code
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Smart link not found" }, { status: 404 });
    }

    return NextResponse.json({ link: rows[0] });
  } catch (error) {
    console.error("GET /api/links/[code] error:", error);
    return NextResponse.json({ error: "Failed to load smart link" }, { status: 500 });
  }
}

const VisitPayloadSchema = z.object({
  action: z.enum(["VISIT", "CTA_CLICK"]).default("VISIT"),
  clientLanguage: z.string().trim().max(24).optional(),
  timezoneRegion: z.string().trim().max(64).optional(),
  viewportClass: z.string().trim().max(32).optional(),
  colorScheme: z.enum(["dark", "light"]).optional(),
  referrer: z.string().trim().max(512).optional(),
  utmSource: z.string().trim().max(64).optional(),
  utmMedium: z.string().trim().max(64).optional(),
  utmCampaign: z.string().trim().max(64).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = VisitPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid visit telemetry payload" }, { status: 400 });
    }

    const d = parsed.data;
    const result = await recordCustomerLinkVisit({
      code,
      action: d.action,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || "Unknown",
      acceptLanguage: request.headers.get("accept-language"),
      clientLanguage: d.clientLanguage,
      timezoneRegion: d.timezoneRegion,
      viewportClass: d.viewportClass,
      colorScheme: d.colorScheme,
      referrer: d.referrer || request.headers.get("referer"),
      utmSource: d.utmSource,
      utmMedium: d.utmMedium,
      utmCampaign: d.utmCampaign,
    });

    if (!result.link) {
      return NextResponse.json({ error: "Smart link not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      link: result.link,
      visit: result.visit,
    });
  } catch (error) {
    console.error("POST /api/links/[code] error:", error);
    return NextResponse.json({ error: "Failed to record link visit" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    await ensureCustomerLinkTables();
    const deleted = await db.$queryRawUnsafe<{ id: string }[]>(
      `DELETE FROM "CustomerSmartLink" WHERE UPPER("code") = UPPER($1) RETURNING "id"`,
      code
    );
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Smart link not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/links/[code] error:", error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
