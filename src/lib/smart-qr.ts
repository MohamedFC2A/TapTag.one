import crypto from "crypto";
import { db } from "@/lib/db";

const TOKEN_SECRET =
  process.env.SESSION_SECRET || "taptag_smart_qr_enterprise_secret_2026";

export const SMART_QR_COLUMNS = `
  "id", "shortCode", "title", "payloadType", "destinationUrl",
  "fileName", "fileMimeType", "fileSize", "fileDataBase64", "payloadData",
  "logoDataUrl", "logoPreset", "frameCaption", "qrStyle", "autoRedirect",
  "pinHash", "biometricEnabled", "biometricCredId",
  "maxScans", "scanCount", "expiresAt", "lastScannedAt",
  "isActive", "createdAt", "updatedAt"
`;

/** Lightweight column projection for list views: avoids streaming multi-MB file binaries on index loads. */
export const SMART_QR_LIST_COLUMNS = `
  "id", "shortCode", "title", "payloadType", "destinationUrl",
  "fileName", "fileMimeType", "fileSize",
  CASE WHEN "fileDataBase64" IS NOT NULL THEN '__HAS_FILE__' ELSE NULL END AS "fileDataBase64",
  "payloadData", "logoDataUrl", "logoPreset", "frameCaption", "qrStyle", "autoRedirect",
  "pinHash", "biometricEnabled", "biometricCredId",
  "maxScans", "scanCount", "expiresAt", "lastScannedAt",
  "isActive", "createdAt", "updatedAt"
`;

let tablesInitialized = false;

/**
 * Ensures SmartQr and SmartQrScan tables and upgraded schema columns exist
 * idempotently in Neon PostgreSQL without altering or dropping legacy tables.
 * Skips DDL completely when schema already matches to avoid PgBouncer cached plan errors.
 */
export async function ensureSmartQrTables(): Promise<void> {
  if (tablesInitialized) return;

  try {
    const colCheck = await db.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'SmartQr'
         AND column_name IN ('frameCaption', 'qrStyle', 'autoRedirect', 'lastScannedAt')`
    );
    const scanTableCheck = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'SmartQrScan'
       ) AS exists`
    );
    if (Number(colCheck[0]?.cnt || 0) === 4 && Boolean(scanTableCheck[0]?.exists)) {
      tablesInitialized = true;
      return;
    }
  } catch {
    // Proceed to idempotent DDL below if metadata query fails on cold bootstrap
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SmartQr" (
      "id" TEXT PRIMARY KEY,
      "shortCode" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "payloadType" TEXT NOT NULL DEFAULT 'URL',
      "destinationUrl" TEXT,
      "fileName" TEXT,
      "fileMimeType" TEXT,
      "fileSize" INTEGER,
      "fileDataBase64" TEXT,
      "payloadData" JSONB,
      "logoDataUrl" TEXT,
      "logoPreset" TEXT NOT NULL DEFAULT 'NONE',
      "frameCaption" TEXT,
      "qrStyle" JSONB,
      "autoRedirect" BOOLEAN NOT NULL DEFAULT false,
      "pinHash" TEXT,
      "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
      "biometricCredId" TEXT,
      "maxScans" INTEGER,
      "scanCount" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" TIMESTAMP(3),
      "lastScannedAt" TIMESTAMP(3),
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Idempotent column migrations for pre-existing tables
  await db.$executeRawUnsafe(
    `ALTER TABLE "SmartQr" ADD COLUMN IF NOT EXISTS "frameCaption" TEXT;`
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "SmartQr" ADD COLUMN IF NOT EXISTS "qrStyle" JSONB;`
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "SmartQr" ADD COLUMN IF NOT EXISTS "autoRedirect" BOOLEAN NOT NULL DEFAULT false;`
  );
  await db.$executeRawUnsafe(
    `ALTER TABLE "SmartQr" ADD COLUMN IF NOT EXISTS "lastScannedAt" TIMESTAMP(3);`
  );

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SmartQr_shortCode_idx" ON "SmartQr"("shortCode");`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SmartQr_payloadType_idx" ON "SmartQr"("payloadType");`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SmartQr_isActive_idx" ON "SmartQr"("isActive");`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SmartQr_lastScannedAt_idx" ON "SmartQr"("lastScannedAt");`
  );

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SmartQrScan" (
      "id" TEXT PRIMARY KEY,
      "qrId" TEXT NOT NULL REFERENCES "SmartQr"("id") ON DELETE CASCADE,
      "deviceOs" TEXT NOT NULL,
      "accessResult" TEXT NOT NULL DEFAULT 'ALLOWED',
      "ipHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SmartQrScan_qrId_idx" ON "SmartQrScan"("qrId");`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SmartQrScan_createdAt_idx" ON "SmartQrScan"("createdAt");`
  );

  tablesInitialized = true;
}

export function generateShortCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `TT-${code}`;
}

export function sanitizeCustomSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return cleaned.length >= 2 ? cleaned : null;
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(8).toString("hex");
  const digest = crypto.scryptSync(pin.trim(), salt, 32).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

export function verifyPin(pin: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !pin) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, originalHex] = parts;
  const derived = crypto.scryptSync(pin.trim(), salt, 32);
  const original = Buffer.from(originalHex, "hex");
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function signUnlockToken(shortCode: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 30;
  const payload = `${shortCode.toUpperCase()}:${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  return `${expiresAt}.${sig}`;
}

export function verifyUnlockToken(shortCode: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${shortCode.toUpperCase()}:${expStr}`)
    .digest("hex")
    .slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function detectDeviceOs(userAgent: string | null): string {
  if (!userAgent) return "Unknown · Client";
  if (/iPhone|iPad|iOS/i.test(userAgent)) {
    return /Safari/i.test(userAgent) && !/CriOS/i.test(userAgent)
      ? "iOS · Safari"
      : "iOS · Browser";
  }
  if (/Android/i.test(userAgent)) {
    return /Chrome/i.test(userAgent) ? "Android · Chrome" : "Android · Mobile";
  }
  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return /Chrome/i.test(userAgent) ? "macOS · Chrome" : "macOS · Safari";
  }
  if (/Windows/i.test(userAgent)) {
    return /Edg/i.test(userAgent) ? "Windows · Edge" : "Windows · Chrome";
  }
  if (/Linux/i.test(userAgent)) return "Linux · Desktop";
  return "Web · Client";
}

export interface QrStyleConfig {
  moduleShape?: "square" | "dots";
}

export type SmartQrPayloadType =
  | "URL"
  | "PDF"
  | "DOCX"
  | "LINKS"
  | "VCARD"
  | "WIFI"
  | "TEXT";

export interface SmartQrPublicDTO {
  id: string;
  shortCode: string;
  title: string;
  payloadType: SmartQrPayloadType;
  destinationUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  hasFileData: boolean;
  payloadData: Record<string, unknown> | null;
  logoDataUrl: string | null;
  logoPreset: "NONE" | "TAPTAG" | "CUSTOM";
  frameCaption: string | null;
  qrStyle: QrStyleConfig | null;
  autoRedirect: boolean;
  hasPin: boolean;
  biometricEnabled: boolean;
  biometricCredId: string | null;
  maxScans: number | null;
  scanCount: number;
  expiresAt: string | null;
  lastScannedAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  isLimitReached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartQrRecordLike {
  id: string;
  shortCode: string;
  title: string;
  payloadType: string;
  destinationUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  fileDataBase64: string | null;
  payloadData: unknown;
  logoDataUrl: string | null;
  logoPreset: string;
  frameCaption: string | null;
  qrStyle: unknown;
  autoRedirect: boolean;
  pinHash: string | null;
  biometricEnabled: boolean;
  biometricCredId: string | null;
  maxScans: number | null;
  scanCount: number;
  expiresAt: Date | null;
  lastScannedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function evaluateQrAvailability(qr: SmartQrRecordLike) {
  const now = Date.now();
  const isExpired = Boolean(qr.expiresAt && new Date(qr.expiresAt).getTime() <= now);
  const isLimitReached = Boolean(
    typeof qr.maxScans === "number" && qr.maxScans > 0 && qr.scanCount >= qr.maxScans
  );
  return {
    isExpired,
    isLimitReached,
    isUsable: qr.isActive && !isExpired && !isLimitReached,
  };
}

export function toSmartQrPublicDTO(
  qr: SmartQrRecordLike,
  maskProtectedContent = false
): SmartQrPublicDTO {
  const { isExpired, isLimitReached } = evaluateQrAvailability(qr);
  const isProtected = Boolean(qr.pinHash || qr.biometricEnabled);
  const shouldHide = maskProtectedContent && isProtected;

  return {
    id: qr.id,
    shortCode: qr.shortCode,
    title: qr.title,
    payloadType: (qr.payloadType as SmartQrPayloadType) || "URL",
    destinationUrl: shouldHide ? null : qr.destinationUrl,
    fileName: qr.fileName,
    fileMimeType: qr.fileMimeType,
    fileSize: qr.fileSize,
    hasFileData: Boolean(qr.fileDataBase64),
    payloadData: shouldHide
      ? null
      : (qr.payloadData as Record<string, unknown> | null),
    logoDataUrl: qr.logoDataUrl,
    logoPreset: (qr.logoPreset as SmartQrPublicDTO["logoPreset"]) || "NONE",
    frameCaption: qr.frameCaption || null,
    qrStyle: (qr.qrStyle as QrStyleConfig | null) || { moduleShape: "square" },
    autoRedirect: Boolean(qr.autoRedirect),
    hasPin: Boolean(qr.pinHash),
    biometricEnabled: qr.biometricEnabled,
    biometricCredId: qr.biometricCredId,
    maxScans: qr.maxScans,
    scanCount: qr.scanCount,
    expiresAt: qr.expiresAt ? new Date(qr.expiresAt).toISOString() : null,
    lastScannedAt: qr.lastScannedAt
      ? new Date(qr.lastScannedAt).toISOString()
      : null,
    isActive: qr.isActive,
    isExpired,
    isLimitReached,
    createdAt: new Date(qr.createdAt).toISOString(),
    updatedAt: new Date(qr.updatedAt).toISOString(),
  };
}
