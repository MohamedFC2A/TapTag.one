import crypto from "crypto";
import { db } from "@/lib/db";
import {
  ALLOWED_INTERNAL_PREFIXES,
  ONBOARDING_COOKIE_NAME,
  OnboardingCookieState,
  parseOnboardingCookie,
  serializeOnboardingCookie,
  validateInternalRedirectUrl,
} from "@/lib/auth-redirect-edge";

export {
  ALLOWED_INTERNAL_PREFIXES,
  ONBOARDING_COOKIE_NAME,
  parseOnboardingCookie,
  serializeOnboardingCookie,
  validateInternalRedirectUrl,
};
export type { OnboardingCookieState };

const AUTH_REDIRECT_SECRET =
  process.env.SESSION_SECRET || "mata_auth_redirect_enterprise_secret_2026";

export interface RedirectStatePayload {
  next: string;
  uid: string;
  step: number;
  exp: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

export interface SessionContextInfo {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  deviceType: "Mobile" | "Tablet" | "Desktop" | "Bot";
  osName: string;
  browserName: string;
  rawUserAgent: string;
}

export interface AuthOnboardingUserRecord {
  id: string;
  email: string;
  fullName: string | null;
  workspaceName: string | null;
  role: string | null;
  useCase: string | null;
  onboardingStep: number;
  onboardingCompleted: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: string | null;
  browserName: string | null;
  osName: string | null;
  loginCount: number;
  lastLoginAt: Date;
  createdAt: Date;
}

export interface AuthSessionLogRecord {
  id: string;
  userId: string;
  email: string;
  status: string;
  targetPath: string;
  resolvedRedirect: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: string | null;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: Date;
}

export type AuthRoutingStatus =
  | "NEW_USER_ONBOARDING"
  | "INCOMPLETE_STEP_REDIRECT"
  | "COMPLETED_DIRECT_REDIRECT"
  | "ERROR_RECOVERY";

// ---------------------------------------------------------------------------
// 1. Cryptographic State Signing & Verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

export function signRedirectState(
  payload: Omit<RedirectStatePayload, "exp">,
  ttlSeconds = 900
): string {
  const safeNext = validateInternalRedirectUrl(payload.next, "/dashboard");
  const fullPayload: RedirectStatePayload = {
    next: safeNext,
    uid: String(payload.uid),
    step: Math.min(3, Math.max(1, Number(payload.step) || 1)),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", AUTH_REDIRECT_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${sig}`;
}

export function verifyRedirectState(token: string | null | undefined): RedirectStatePayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", AUTH_REDIRECT_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as RedirectStatePayload;
    if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      next: validateInternalRedirectUrl(parsed.next, "/dashboard"),
      uid: String(parsed.uid || ""),
      step: Math.min(3, Math.max(1, Number(parsed.step) || 1)),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Sliding-Window Rate Limiter (Anti-Bot / Callback Abuse Protection)
// ---------------------------------------------------------------------------

const rateLimitStore = new Map<string, number[]>();

export function checkAuthRateLimit(
  ip: string,
  bucket = "auth-callback",
  maxRequests = 15,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const key = `${bucket}:${ip || "anonymous"}`;

  // Bound in-memory store size on long-running workers
  if (rateLimitStore.size > 4000) {
    for (const [k, stamps] of rateLimitStore.entries()) {
      if (stamps.length === 0 || stamps[stamps.length - 1] <= now - windowMs) {
        rateLimitStore.delete(k);
      }
    }
  }

  const existing = rateLimitStore.get(key) || [];
  const activeWindow = existing.filter((ts) => ts > now - windowMs);

  if (activeWindow.length >= maxRequests) {
    const oldest = activeWindow[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitStore.set(key, activeWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetAt: oldest + windowMs,
    };
  }

  activeWindow.push(now);
  rateLimitStore.set(key, activeWindow);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - activeWindow.length),
    retryAfterSeconds: 0,
    resetAt: now + windowMs,
  };
}

// ---------------------------------------------------------------------------
// 3. Session Context Parser (UTM Parameters + User-Agent Classification)
// ---------------------------------------------------------------------------

function cleanUtm(val: string | null | undefined): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim().slice(0, 64);
  return trimmed ? trimmed.replace(/[^\w.\-:+]/g, "_") : null;
}

export function parseSessionContext(
  userAgent: string | null | undefined,
  params?: URLSearchParams | Record<string, string | null | undefined>
): SessionContextInfo {
  const ua = (userAgent || "").slice(0, 512);
  const getParam = (k: string): string | null => {
    if (!params) return null;
    if (params instanceof URLSearchParams) return params.get(k);
    return params[k] ?? null;
  };

  let deviceType: SessionContextInfo["deviceType"] = "Desktop";
  if (/bot|crawler|spider|curl|wget|headless|slurp/i.test(ua)) {
    deviceType = "Bot";
  } else if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "Tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    deviceType = "Mobile";
  }

  let osName = "Unknown";
  if (/iphone|ipad|ipod|cpu os|ios/i.test(ua)) osName = "iOS";
  else if (/android/i.test(ua)) osName = "Android";
  else if (/windows/i.test(ua)) osName = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) osName = "macOS";
  else if (/linux|x11/i.test(ua)) osName = "Linux";

  let browserName = "Other";
  if (/edg\//i.test(ua)) browserName = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browserName = "Opera";
  else if (/chrome|crios/i.test(ua)) browserName = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browserName = "Firefox";
  else if (/safari/i.test(ua)) browserName = "Safari";

  return {
    utmSource: cleanUtm(getParam("utm_source")),
    utmMedium: cleanUtm(getParam("utm_medium")),
    utmCampaign: cleanUtm(getParam("utm_campaign")),
    utmTerm: cleanUtm(getParam("utm_term")),
    utmContent: cleanUtm(getParam("utm_content")),
    deviceType,
    osName,
    browserName,
    rawUserAgent: ua || "Unknown",
  };
}

// ---------------------------------------------------------------------------
// 4. PostgreSQL Persistence (Idempotent DDL + Smart Conditional Routing)
// ---------------------------------------------------------------------------

let authTablesInitialized = false;

export async function ensureAuthOnboardingTables(): Promise<void> {
  if (authTablesInitialized) return;

  try {
    const userTableCheck = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'AuthOnboardingUser'
       ) AS exists`
    );
    const logTableCheck = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'AuthSessionLog'
       ) AS exists`
    );
    if (Boolean(userTableCheck[0]?.exists) && Boolean(logTableCheck[0]?.exists)) {
      authTablesInitialized = true;
      return;
    }
  } catch {
    // Proceed with idempotent table creation
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthOnboardingUser" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "fullName" TEXT,
      "workspaceName" TEXT,
      "role" TEXT,
      "useCase" TEXT,
      "onboardingStep" INTEGER NOT NULL DEFAULT 1,
      "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "deviceType" TEXT,
      "browserName" TEXT,
      "osName" TEXT,
      "loginCount" INTEGER NOT NULL DEFAULT 1,
      "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthSessionLog" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "targetPath" TEXT NOT NULL,
      "resolvedRedirect" TEXT NOT NULL,
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "deviceType" TEXT,
      "userAgent" TEXT,
      "ipHash" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AuthSessionLog_createdAt_idx" ON "AuthSessionLog" ("createdAt" DESC)`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AuthOnboardingUser_lastLoginAt_idx" ON "AuthOnboardingUser" ("lastLoginAt" DESC)`
  );

  authTablesInitialized = true;
}

export function hashClientIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${AUTH_REDIRECT_SECRET}`)
    .digest("hex")
    .slice(0, 24);
}

export async function logAuthSessionEvent(params: {
  userId: string;
  email: string;
  status: AuthRoutingStatus;
  targetPath: string;
  resolvedRedirect: string;
  sessionContext: SessionContextInfo;
  ip: string;
}): Promise<void> {
  await ensureAuthOnboardingTables();
  const logId = `alog_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  await db.$executeRawUnsafe(
    `INSERT INTO "AuthSessionLog" (
      "id", "userId", "email", "status", "targetPath", "resolvedRedirect",
      "utmSource", "utmMedium", "utmCampaign", "deviceType", "userAgent", "ipHash"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    logId,
    params.userId,
    params.email,
    params.status,
    params.targetPath,
    params.resolvedRedirect,
    params.sessionContext.utmSource,
    params.sessionContext.utmMedium,
    params.sessionContext.utmCampaign,
    params.sessionContext.deviceType,
    params.sessionContext.rawUserAgent,
    hashClientIp(params.ip)
  );
}

export async function resolveSmartAuthRedirect(input: {
  email: string;
  next?: string | null;
  userAgent?: string | null;
  utm?: URLSearchParams | Record<string, string | null | undefined>;
  ip?: string;
}): Promise<{
  status: AuthRoutingStatus;
  resolvedRedirect: string;
  safeNext: string;
  sig: string | null;
  user: AuthOnboardingUserRecord;
  sessionContext: SessionContextInfo;
}> {
  await ensureAuthOnboardingTables();

  const normalizedEmail = input.email.trim().toLowerCase();
  const safeNext = validateInternalRedirectUrl(input.next, "/dashboard");
  const sessionContext = parseSessionContext(input.userAgent, input.utm);
  const ip = input.ip || "0.0.0.0";

  const existingRows = await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
    `SELECT * FROM "AuthOnboardingUser" WHERE "email" = $1 LIMIT 1`,
    normalizedEmail
  );

  let user: AuthOnboardingUserRecord;
  let status: AuthRoutingStatus;
  let resolvedRedirect: string;
  let sig: string | null = null;

  if (existingRows.length === 0) {
    // 1. First-time user -> create record with first-touch attribution and route to Step 1
    const uid = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const inserted = await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
      `INSERT INTO "AuthOnboardingUser" (
        "id", "email", "onboardingStep", "onboardingCompleted",
        "utmSource", "utmMedium", "utmCampaign",
        "deviceType", "browserName", "osName", "loginCount", "lastLoginAt"
      ) VALUES ($1, $2, 1, false, $3, $4, $5, $6, $7, $8, 1, CURRENT_TIMESTAMP)
      RETURNING *`,
      uid,
      normalizedEmail,
      sessionContext.utmSource,
      sessionContext.utmMedium,
      sessionContext.utmCampaign,
      sessionContext.deviceType,
      sessionContext.browserName,
      sessionContext.osName
    );
    user = inserted[0];
    status = "NEW_USER_ONBOARDING";
    sig = signRedirectState({ next: safeNext, uid: user.id, step: 1 });
    resolvedRedirect = `/onboarding?uid=${encodeURIComponent(user.id)}&step=1&next=${encodeURIComponent(
      safeNext
    )}&sig=${encodeURIComponent(sig)}`;
  } else {
    const current = existingRows[0];
    const updated = await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
      `UPDATE "AuthOnboardingUser"
       SET "loginCount" = "loginCount" + 1,
           "lastLoginAt" = CURRENT_TIMESTAMP,
           "deviceType" = $2,
           "browserName" = $3,
           "osName" = $4,
           "utmSource" = COALESCE("utmSource", $5),
           "utmMedium" = COALESCE("utmMedium", $6),
           "utmCampaign" = COALESCE("utmCampaign", $7)
       WHERE "id" = $1
       RETURNING *`,
      current.id,
      sessionContext.deviceType,
      sessionContext.browserName,
      sessionContext.osName,
      sessionContext.utmSource,
      sessionContext.utmMedium,
      sessionContext.utmCampaign
    );
    user = updated[0];

    if (!user.onboardingCompleted) {
      // 2. Existing user with incomplete profile -> jump directly to the missing step
      const missingStep = Math.min(3, Math.max(1, Number(user.onboardingStep) || 1));
      status = "INCOMPLETE_STEP_REDIRECT";
      sig = signRedirectState({ next: safeNext, uid: user.id, step: missingStep });
      resolvedRedirect = `/onboarding?uid=${encodeURIComponent(
        user.id
      )}&step=${missingStep}&next=${encodeURIComponent(safeNext)}&sig=${encodeURIComponent(sig)}`;
    } else {
      // 3. Completed user -> direct access to validated intended destination
      status = "COMPLETED_DIRECT_REDIRECT";
      resolvedRedirect = safeNext;
    }
  }

  await logAuthSessionEvent({
    userId: user.id,
    email: user.email,
    status,
    targetPath: safeNext,
    resolvedRedirect,
    sessionContext,
    ip,
  });

  return {
    status,
    resolvedRedirect,
    safeNext,
    sig,
    user,
    sessionContext,
  };
}
