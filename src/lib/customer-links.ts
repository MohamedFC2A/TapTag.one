import crypto from "crypto";
import { db } from "@/lib/db";
import { parseSessionContext } from "@/lib/auth-redirect";

const PRIVACY_SALT =
  process.env.SESSION_SECRET || "taptag_customer_analytics_privacy_salt_2026";

export type CustomerContentType = "URL" | "VIDEO" | "IMAGE" | "TEXT";
export type CustomerRedirectMode = "PREVIEW" | "DIRECT";

export interface CustomerSmartLinkRecord {
  id: string;
  code: string;
  title: string;
  contentType: CustomerContentType;
  destinationUrl: string | null;
  contentBody: string | null;
  mediaUrl: string | null;
  redirectMode: CustomerRedirectMode;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  totalVisits: number;
  uniqueVisitors: number;
  ctaClicks: number;
  isActive: boolean;
  lastVisitedAt: Date | null;
  createdAt: Date;
}

export interface CustomerLinkVisitRecord {
  id: string;
  linkId: string;
  code: string;
  visitorHash: string;
  isUnique: boolean;
  deviceType: string;
  osFamily: string;
  browserFamily: string;
  language: string | null;
  timezoneRegion: string | null;
  viewportClass: string | null;
  colorScheme: string | null;
  referrerChannel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  engagedCta: boolean;
  createdAt: Date;
}

export interface BreakdownBucket {
  label: string;
  count: number;
}

let customerLinkTablesInitialized = false;

export async function ensureCustomerLinkTables(): Promise<void> {
  if (customerLinkTablesInitialized) return;

  try {
    const linkCheck = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'CustomerSmartLink'
       ) AS exists`
    );
    const visitCheck = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'CustomerLinkVisit'
       ) AS exists`
    );
    if (Boolean(linkCheck[0]?.exists) && Boolean(visitCheck[0]?.exists)) {
      customerLinkTablesInitialized = true;
      return;
    }
  } catch {
    // Proceed with idempotent table creation
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerSmartLink" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "contentType" TEXT NOT NULL DEFAULT 'URL',
      "destinationUrl" TEXT,
      "contentBody" TEXT,
      "mediaUrl" TEXT,
      "redirectMode" TEXT NOT NULL DEFAULT 'PREVIEW',
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "totalVisits" INTEGER NOT NULL DEFAULT 0,
      "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
      "ctaClicks" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastVisitedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerLinkVisit" (
      "id" TEXT PRIMARY KEY,
      "linkId" TEXT NOT NULL REFERENCES "CustomerSmartLink"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL,
      "visitorHash" TEXT NOT NULL,
      "isUnique" BOOLEAN NOT NULL DEFAULT true,
      "deviceType" TEXT NOT NULL,
      "osFamily" TEXT NOT NULL,
      "browserFamily" TEXT NOT NULL,
      "language" TEXT,
      "timezoneRegion" TEXT,
      "viewportClass" TEXT,
      "colorScheme" TEXT,
      "referrerChannel" TEXT,
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "engagedCta" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CustomerSmartLink_code_idx" ON "CustomerSmartLink"("code")`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CustomerLinkVisit_linkId_idx" ON "CustomerLinkVisit"("linkId", "createdAt" DESC)`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CustomerLinkVisit_code_hash_idx" ON "CustomerLinkVisit"("code", "visitorHash")`
  );

  customerLinkTablesInitialized = true;
}

export function generateCustomerLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(5);
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `ML-${code}`;
}

export function isValidPublicHttpUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname || parsed.hostname.length < 2) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Computes an irreversible 12-hex visitor token for unique vs. repeat session counting.
 * Raw IP addresses are never persisted or returned.
 */
export function computePrivacyVisitorHash(ip: string, userAgent: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}:${PRIVACY_SALT}`)
    .digest("hex");
  return `v_${digest.slice(0, 12)}`;
}

export function classifyReferrerChannel(
  referrer: string | null | undefined,
  utmSource: string | null | undefined
): string {
  const src = (utmSource || "").toLowerCase();
  const ref = (referrer || "").toLowerCase();
  const combined = `${src} ${ref}`;

  if (combined.includes("whatsapp") || combined.includes("wa.me")) return "WhatsApp";
  if (combined.includes("instagram") || combined.includes("ig.me")) return "Instagram";
  if (combined.includes("telegram") || combined.includes("t.me")) return "Telegram";
  if (combined.includes("twitter") || combined.includes("x.com") || combined.includes("t.co")) {
    return "X / Twitter";
  }
  if (combined.includes("facebook") || combined.includes("fb.com")) return "Facebook";
  if (combined.includes("linkedin") || combined.includes("lnkd.in")) return "LinkedIn";
  if (combined.includes("tiktok")) return "TikTok";
  if (combined.includes("youtube") || combined.includes("youtu.be")) return "YouTube";
  if (combined.includes("google")) return "Google";

  if (!ref.trim()) {
    return src ? src.slice(0, 24) : "Direct";
  }
  try {
    const u = new URL(referrer!.trim());
    return u.hostname.replace(/^www\./, "").slice(0, 32) || "Web";
  } catch {
    return "Web";
  }
}

function cleanAcceptLanguage(headerVal: string | null | undefined, clientLang?: string | null): string {
  const candidate = (clientLang || headerVal || "").trim();
  if (!candidate) return "Unknown";
  const primary = candidate.split(",")[0]?.split(";")[0]?.trim() || "";
  return primary.slice(0, 16) || "Unknown";
}

export async function recordCustomerLinkVisit(input: {
  code: string;
  action?: "VISIT" | "CTA_CLICK";
  ip: string;
  userAgent: string;
  acceptLanguage?: string | null;
  clientLanguage?: string | null;
  timezoneRegion?: string | null;
  viewportClass?: string | null;
  colorScheme?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): Promise<{
  link: CustomerSmartLinkRecord | null;
  visit: CustomerLinkVisitRecord | null;
}> {
  await ensureCustomerLinkTables();

  const normalizedCode = input.code.trim().toUpperCase();
  const linkRows = await db.$queryRawUnsafe<CustomerSmartLinkRecord[]>(
    `SELECT * FROM "CustomerSmartLink" WHERE UPPER("code") = $1 LIMIT 1`,
    normalizedCode
  );
  if (linkRows.length === 0) {
    return { link: null, visit: null };
  }

  const link = linkRows[0];
  if (!link.isActive) {
    return { link, visit: null };
  }

  const visitorHash = computePrivacyVisitorHash(input.ip, input.userAgent);

  if (input.action === "CTA_CLICK") {
    const updated = await db.$queryRawUnsafe<CustomerSmartLinkRecord[]>(
      `UPDATE "CustomerSmartLink"
       SET "ctaClicks" = "ctaClicks" + 1,
           "lastVisitedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING *`,
      link.id
    );
    await db.$executeRawUnsafe(
      `UPDATE "CustomerLinkVisit"
       SET "engagedCta" = true
       WHERE "id" = (
         SELECT "id" FROM "CustomerLinkVisit"
         WHERE "linkId" = $1 AND "visitorHash" = $2
         ORDER BY "createdAt" DESC
         LIMIT 1
       )`,
      link.id,
      visitorHash
    );
    return { link: updated[0] || link, visit: null };
  }

  const priorRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "CustomerLinkVisit"
     WHERE "linkId" = $1 AND "visitorHash" = $2
     LIMIT 1`,
    link.id,
    visitorHash
  );
  const isUnique = priorRows.length === 0;

  const sessionCtx = parseSessionContext(input.userAgent, {
    utm_source: input.utmSource || link.utmSource,
    utm_medium: input.utmMedium || link.utmMedium,
    utm_campaign: input.utmCampaign || link.utmCampaign,
  });

  const language = cleanAcceptLanguage(input.acceptLanguage, input.clientLanguage);
  const timezoneRegion = (input.timezoneRegion || "").trim().slice(0, 64) || "Unknown";
  const viewportClass = (input.viewportClass || "").trim().slice(0, 32) || "Unknown";
  const colorScheme = input.colorScheme === "light" ? "light" : "dark";
  const referrerChannel = classifyReferrerChannel(input.referrer, sessionCtx.utmSource);

  const visitId = `clv_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const insertedVisits = await db.$queryRawUnsafe<CustomerLinkVisitRecord[]>(
    `INSERT INTO "CustomerLinkVisit" (
      "id", "linkId", "code", "visitorHash", "isUnique",
      "deviceType", "osFamily", "browserFamily",
      "language", "timezoneRegion", "viewportClass", "colorScheme",
      "referrerChannel", "utmSource", "utmMedium", "utmCampaign"
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16
    )
    RETURNING *`,
    visitId,
    link.id,
    link.code,
    visitorHash,
    isUnique,
    sessionCtx.deviceType,
    sessionCtx.osName,
    sessionCtx.browserName,
    language,
    timezoneRegion,
    viewportClass,
    colorScheme,
    referrerChannel,
    sessionCtx.utmSource,
    sessionCtx.utmMedium,
    sessionCtx.utmCampaign
  );

  const updatedLinks = await db.$queryRawUnsafe<CustomerSmartLinkRecord[]>(
    `UPDATE "CustomerSmartLink"
     SET "totalVisits" = "totalVisits" + 1,
         "uniqueVisitors" = "uniqueVisitors" + $2,
         "lastVisitedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1
     RETURNING *`,
    link.id,
    isUnique ? 1 : 0
  );

  return {
    link: updatedLinks[0] || link,
    visit: insertedVisits[0] || null,
  };
}

export async function getCustomerAnalyticsSummary(filterCode?: string) {
  await ensureCustomerLinkTables();

  const normalizedFilter = filterCode?.trim().toUpperCase() || null;

  const links = await db.$queryRawUnsafe<CustomerSmartLinkRecord[]>(
    `SELECT * FROM "CustomerSmartLink" ORDER BY "createdAt" DESC LIMIT 40`
  );

  const recentVisits = normalizedFilter
    ? await db.$queryRawUnsafe<CustomerLinkVisitRecord[]>(
        `SELECT * FROM "CustomerLinkVisit"
         WHERE UPPER("code") = $1
         ORDER BY "createdAt" DESC
         LIMIT 50`,
        normalizedFilter
      )
    : await db.$queryRawUnsafe<CustomerLinkVisitRecord[]>(
        `SELECT * FROM "CustomerLinkVisit"
         ORDER BY "createdAt" DESC
         LIMIT 50`
      );

  const queryGroup = async (column: string): Promise<BreakdownBucket[]> => {
    if (normalizedFilter) {
      return db.$queryRawUnsafe<BreakdownBucket[]>(
        `SELECT COALESCE(${column}, 'Unknown') AS label, COUNT(*)::int AS count
         FROM "CustomerLinkVisit"
         WHERE UPPER("code") = $1
         GROUP BY COALESCE(${column}, 'Unknown')
         ORDER BY count DESC
         LIMIT 8`,
        normalizedFilter
      );
    }
    return db.$queryRawUnsafe<BreakdownBucket[]>(
      `SELECT COALESCE(${column}, 'Unknown') AS label, COUNT(*)::int AS count
       FROM "CustomerLinkVisit"
       GROUP BY COALESCE(${column}, 'Unknown')
       ORDER BY count DESC
       LIMIT 8`
    );
  };

  const [osFamily, deviceType, browserFamily, referrerChannel, timezoneRegion, language] =
    await Promise.all([
      queryGroup(`"osFamily"`),
      queryGroup(`"deviceType"`),
      queryGroup(`"browserFamily"`),
      queryGroup(`"referrerChannel"`),
      queryGroup(`"timezoneRegion"`),
      queryGroup(`"language"`),
    ]);

  const scopedLinks = normalizedFilter
    ? links.filter((l) => l.code.toUpperCase() === normalizedFilter)
    : links;

  return {
    links,
    recentVisits,
    breakdown: {
      osFamily,
      deviceType,
      browserFamily,
      referrerChannel,
      timezoneRegion,
      language,
    },
    summary: {
      totalLinks: links.length,
      activeLinks: links.filter((l) => l.isActive).length,
      totalVisits: scopedLinks.reduce((acc, l) => acc + l.totalVisits, 0),
      uniqueVisitors: scopedLinks.reduce((acc, l) => acc + l.uniqueVisitors, 0),
      ctaClicks: scopedLinks.reduce((acc, l) => acc + l.ctaClicks, 0),
    },
  };
}
