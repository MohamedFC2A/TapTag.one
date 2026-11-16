import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sanitizeCustomSlug } from "@/lib/smart-qr";
import {
  CustomerSmartLinkRecord,
  ensureCustomerLinkTables,
  generateCustomerLinkCode,
  getCustomerAnalyticsSummary,
  isValidPublicHttpUrl,
} from "@/lib/customer-links";

const CreateCustomerLinkSchema = z.object({
  title: z.string().trim().min(1).max(140),
  contentType: z.enum(["URL", "VIDEO", "IMAGE", "TEXT"]).default("URL"),
  destinationUrl: z.string().trim().max(2048).nullable().optional(),
  mediaUrl: z.string().trim().max(2048).nullable().optional(),
  contentBody: z.string().trim().max(10_000).nullable().optional(),
  redirectMode: z.enum(["PREVIEW", "DIRECT"]).default("PREVIEW"),
  customAlias: z.string().trim().max(32).nullable().optional(),
  utmSource: z.string().trim().max(64).nullable().optional(),
  utmMedium: z.string().trim().max(64).nullable().optional(),
  utmCampaign: z.string().trim().max(64).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code") || undefined;
    const data = await getCustomerAnalyticsSummary(code);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/links error:", error);
    return NextResponse.json(
      { error: "Failed to load customer link analytics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateCustomerLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid customer link payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    await ensureCustomerLinkTables();

    const safeDest = d.destinationUrl ? isValidPublicHttpUrl(d.destinationUrl) : null;
    const safeMedia = d.mediaUrl ? isValidPublicHttpUrl(d.mediaUrl) : null;

    if (d.contentType === "URL" && !safeDest) {
      return NextResponse.json(
        { error: "Please provide a valid HTTP/HTTPS destination URL." },
        { status: 400 }
      );
    }
    if ((d.contentType === "VIDEO" || d.contentType === "IMAGE") && !safeMedia && !safeDest) {
      return NextResponse.json(
        { error: "Please provide a valid HTTP/HTTPS media or destination URL." },
        { status: 400 }
      );
    }
    if (d.contentType === "TEXT" && (!d.contentBody || !d.contentBody.trim())) {
      return NextResponse.json(
        { error: "Please provide text content for your shared link." },
        { status: 400 }
      );
    }

    let code = sanitizeCustomSlug(d.customAlias) || generateCustomerLinkCode();
    const conflict = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "CustomerSmartLink" WHERE UPPER("code") = UPPER($1) LIMIT 1`,
      code
    );
    if (conflict.length > 0) {
      if (d.customAlias) {
        return NextResponse.json(
          { error: "This custom link code is already in use. Choose another code." },
          { status: 409 }
        );
      }
      code = generateCustomerLinkCode();
    }

    const id = `csl_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const inserted = await db.$queryRawUnsafe<CustomerSmartLinkRecord[]>(
      `INSERT INTO "CustomerSmartLink" (
        "id", "code", "title", "contentType", "destinationUrl",
        "contentBody", "mediaUrl", "redirectMode",
        "utmSource", "utmMedium", "utmCampaign"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      id,
      code,
      d.title,
      d.contentType,
      safeDest || safeMedia,
      d.contentBody || null,
      safeMedia || (d.contentType === "VIDEO" || d.contentType === "IMAGE" ? safeDest : null),
      d.redirectMode,
      d.utmSource || null,
      d.utmMedium || null,
      d.utmCampaign || null
    );

    return NextResponse.json({
      success: true,
      link: inserted[0],
    });
  } catch (error) {
    console.error("POST /api/links error:", error);
    return NextResponse.json(
      { error: "Failed to create smart customer link" },
      { status: 500 }
    );
  }
}
