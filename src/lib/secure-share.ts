import crypto from "crypto";
import { db } from "@/lib/db";

const SHARE_SECRET =
  process.env.SESSION_SECRET || "mata_secure_share_enterprise_secret_2026";

export const SECURE_SHARE_LIST_COLUMNS = `
  "id", "shareCode", "title", "fileName", "fileMimeType", "fileSize",
  "fileSha256", "isEncrypted", "encryptionMeta",
  "pinHash", "biometricEnabled", "maxDownloads", "downloadCount",
  "burnAfterRead", "expiresAt", "isActive", "aiSummary",
  "lastAccessedAt", "createdAt", "updatedAt"
`;

export const SECURE_SHARE_FULL_COLUMNS = `
  ${SECURE_SHARE_LIST_COLUMNS}, "fileDataBase64"
`;

let shareTablesInitialized = false;

export async function ensureSecureShareTables(): Promise<void> {
  if (shareTablesInitialized) return;

  try {
    const check = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'SecureShare'
       ) AS exists`
    );
    const logCheck = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'SecureShareLog'
       ) AS exists`
    );
    if (Boolean(check[0]?.exists) && Boolean(logCheck[0]?.exists)) {
      shareTablesInitialized = true;
      return;
    }
  } catch {
    // Proceed to idempotent DDL
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SecureShare" (
      "id" TEXT PRIMARY KEY,
      "shareCode" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileMimeType" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "fileSha256" TEXT NOT NULL,
      "fileDataBase64" TEXT NOT NULL,
      "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
      "encryptionMeta" JSONB,
      "pinHash" TEXT,
      "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
      "maxDownloads" INTEGER,
      "downloadCount" INTEGER NOT NULL DEFAULT 0,
      "burnAfterRead" BOOLEAN NOT NULL DEFAULT false,
      "expiresAt" TIMESTAMP(3),
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "aiSummary" TEXT,
      "lastAccessedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SecureShare_shareCode_idx" ON "SecureShare"("shareCode");`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SecureShare_isActive_idx" ON "SecureShare"("isActive");`
  );

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SecureShareLog" (
      "id" TEXT PRIMARY KEY,
      "shareId" TEXT NOT NULL REFERENCES "SecureShare"("id") ON DELETE CASCADE,
      "deviceOs" TEXT NOT NULL,
      "action" TEXT NOT NULL DEFAULT 'VIEW',
      "ipHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SecureShareLog_shareId_idx" ON "SecureShareLog"("shareId");`
  );

  shareTablesInitialized = true;
}

export function generateShareCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `MS-${code}`;
}

export function signShareToken(shareCode: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 30;
  const payload = `SHARE:${shareCode.toUpperCase()}:${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", SHARE_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 28);
  return `${expiresAt}.${sig}`;
}

export function verifyShareToken(
  shareCode: string,
  token: string | null | undefined
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto
    .createHmac("sha256", SHARE_SECRET)
    .update(`SHARE:${shareCode.toUpperCase()}:${expStr}`)
    .digest("hex")
    .slice(0, 28);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface SecureShareRecordLike {
  id: string;
  shareCode: string;
  title: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  fileSha256: string;
  fileDataBase64?: string;
  isEncrypted: boolean;
  encryptionMeta: unknown;
  pinHash: string | null;
  biometricEnabled: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  burnAfterRead: boolean;
  expiresAt: Date | null;
  isActive: boolean;
  aiSummary: string | null;
  lastAccessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecureSharePublicDTO {
  id: string;
  shareCode: string;
  title: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  fileSha256: string;
  isEncrypted: boolean;
  encryptionMeta: Record<string, unknown> | null;
  hasPin: boolean;
  biometricEnabled: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  burnAfterRead: boolean;
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  isLimitReached: boolean;
  isUsable: boolean;
  aiSummary: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
}

export function evaluateShareAvailability(share: SecureShareRecordLike) {
  const now = Date.now();
  const isExpired = Boolean(
    share.expiresAt && new Date(share.expiresAt).getTime() <= now
  );
  const effectiveMax = share.burnAfterRead
    ? Math.min(share.maxDownloads ?? 1, 1)
    : share.maxDownloads;
  const isLimitReached = Boolean(
    typeof effectiveMax === "number" &&
      effectiveMax > 0 &&
      share.downloadCount >= effectiveMax
  );
  return {
    isExpired,
    isLimitReached,
    isUsable: share.isActive && !isExpired && !isLimitReached,
  };
}

export function toSecureSharePublicDTO(
  share: SecureShareRecordLike,
  maskProtected = false
): SecureSharePublicDTO {
  const { isExpired, isLimitReached, isUsable } = evaluateShareAvailability(share);
  const isProtected = Boolean(share.pinHash || share.biometricEnabled);
  const hideSensitive = maskProtected && isProtected;

  return {
    id: share.id,
    shareCode: share.shareCode,
    title: share.title,
    fileName: hideSensitive ? "Protected Encrypted Asset" : share.fileName,
    fileMimeType: share.fileMimeType,
    fileSize: share.fileSize,
    fileSha256: share.fileSha256,
    isEncrypted: Boolean(share.isEncrypted),
    encryptionMeta: hideSensitive
      ? null
      : (share.encryptionMeta as Record<string, unknown> | null),
    hasPin: Boolean(share.pinHash),
    biometricEnabled: Boolean(share.biometricEnabled),
    maxDownloads: share.maxDownloads,
    downloadCount: share.downloadCount,
    burnAfterRead: Boolean(share.burnAfterRead),
    expiresAt: share.expiresAt ? new Date(share.expiresAt).toISOString() : null,
    isActive: Boolean(share.isActive),
    isExpired,
    isLimitReached,
    isUsable,
    aiSummary: hideSensitive ? null : share.aiSummary,
    lastAccessedAt: share.lastAccessedAt
      ? new Date(share.lastAccessedAt).toISOString()
      : null,
    createdAt: new Date(share.createdAt).toISOString(),
  };
}
