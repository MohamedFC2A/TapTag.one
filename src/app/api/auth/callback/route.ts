import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  checkAuthRateLimit,
  ensureAuthOnboardingTables,
  logAuthSessionEvent,
  ONBOARDING_COOKIE_NAME,
  parseSessionContext,
  resolveSmartAuthRedirect,
  serializeOnboardingCookie,
  validateInternalRedirectUrl,
  verifyRedirectState,
} from "@/lib/auth-redirect";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function buildCookieValue(uid: string, email: string, step: number, completed: boolean, next: string) {
  return serializeOnboardingCookie({
    uid,
    email,
    step,
    completed,
    next,
    iat: Math.floor(Date.now() / 1000),
  });
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const sp = request.nextUrl.searchParams;
  const rawNext = sp.get("next") ?? sp.get("redirect_to");
  const safeNext = validateInternalRedirectUrl(rawNext, "/dashboard");

  // 1. Sliding-window callback abuse protection
  const rl = checkAuthRateLimit(ip, "auth-callback", 25, 60_000);
  if (!rl.allowed) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "rate_limited");
    loginUrl.searchParams.set("retry", String(rl.retryAfterSeconds));
    loginUrl.searchParams.set("next", safeNext);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("Retry-After", String(rl.retryAfterSeconds));
    return res;
  }

  // 2. Graceful error recovery for expired/invalid callback state
  const errParam = sp.get("error");
  const statusParam = sp.get("status");
  const email = sp.get("email")?.trim().toLowerCase() || "";
  const sig = sp.get("sig");

  if (sig && !verifyRedirectState(sig)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "invalid_signature");
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  if (errParam || statusParam === "expired" || !email || !email.includes("@")) {
    const code = statusParam === "expired" ? "token_expired" : errParam || "missing_session";
    const ctx = parseSessionContext(request.headers.get("user-agent"), sp);
    await logAuthSessionEvent({
      userId: "anonymous",
      email: email || "unknown",
      status: "ERROR_RECOVERY",
      targetPath: safeNext,
      resolvedRedirect: `/auth/login?error=${encodeURIComponent(code)}&next=${encodeURIComponent(safeNext)}`,
      sessionContext: ctx,
      ip,
    }).catch(() => {});

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", code);
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decision = await resolveSmartAuthRedirect({
      email,
      next: safeNext,
      userAgent: request.headers.get("user-agent"),
      utm: sp,
      ip,
    });

    const response = NextResponse.redirect(new URL(decision.resolvedRedirect, request.url));
    response.cookies.set(
      ONBOARDING_COOKIE_NAME,
      buildCookieValue(
        decision.user.id,
        decision.user.email,
        decision.user.onboardingStep,
        decision.user.onboardingCompleted,
        decision.safeNext
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );
    response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return response;
  } catch (error) {
    console.error("GET /api/auth/callback error:", error);
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "callback_failed");
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }
}

const CallbackPostSchema = z.object({
  email: z.string().trim().email().max(180).optional(),
  next: z.string().trim().max(1024).optional(),
  redirect_to: z.string().trim().max(1024).optional(),
  simulateError: z.enum(["token_expired", "invalid_signature", "rate_limited"]).optional(),
  utm_source: z.string().trim().max(64).optional(),
  utm_medium: z.string().trim().max(64).optional(),
  utm_campaign: z.string().trim().max(64).optional(),
  presetState: z.enum(["NEW_USER", "INCOMPLETE_STEP_2", "COMPLETED", "LIVE"]).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = CallbackPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid callback payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const rawTarget = (data.redirect_to || data.next || "/dashboard").trim();
    const safeNext = validateInternalRedirectUrl(rawTarget, "/dashboard");
    const wasSanitized = rawTarget !== safeNext;

    const rl = checkAuthRateLimit(ip, "auth-callback", 25, 60_000);
    if (!rl.allowed || data.simulateError === "rate_limited") {
      const retryAfter = rl.allowed ? 60 : rl.retryAfterSeconds;
      const recoveryRedirect = `/auth/login?error=rate_limited&retry=${retryAfter}&next=${encodeURIComponent(
        safeNext
      )}`;
      const res = NextResponse.json(
        {
          success: false,
          status: "ERROR_RECOVERY",
          errorCode: "rate_limited",
          safeNext,
          wasSanitized,
          resolvedRedirect: recoveryRedirect,
          rateLimit: {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: retryAfter,
          },
        },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    const utmParams: Record<string, string | undefined> = {
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
    };

    if (
      data.simulateError === "token_expired" ||
      data.simulateError === "invalid_signature" ||
      !data.email
    ) {
      const code = data.simulateError || "token_expired";
      const ctx = parseSessionContext(request.headers.get("user-agent"), utmParams);
      const recoveryRedirect = `/auth/login?error=${encodeURIComponent(
        code
      )}&next=${encodeURIComponent(safeNext)}`;

      await logAuthSessionEvent({
        userId: "anonymous",
        email: data.email || "guest@session",
        status: "ERROR_RECOVERY",
        targetPath: safeNext,
        resolvedRedirect: recoveryRedirect,
        sessionContext: ctx,
        ip,
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          status: "ERROR_RECOVERY",
          errorCode: code,
          safeNext,
          wasSanitized,
          resolvedRedirect: recoveryRedirect,
          sessionContext: ctx,
          rateLimit: rl,
        },
        { status: 401 }
      );
    }

    await ensureAuthOnboardingTables();
    const normalizedEmail = data.email.trim().toLowerCase();

    // Optional deterministic state setup for testing conditional branches in Section 02
    if (data.presetState === "NEW_USER") {
      await db.$executeRawUnsafe(
        `DELETE FROM "AuthOnboardingUser" WHERE "email" = $1`,
        normalizedEmail
      );
    } else if (data.presetState === "INCOMPLETE_STEP_2") {
      const uid = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO "AuthOnboardingUser" (
           "id", "email", "fullName", "role", "onboardingStep", "onboardingCompleted"
         ) VALUES ($1, $2, $3, $4, 2, false)
         ON CONFLICT ("email") DO UPDATE
         SET "onboardingStep" = 2,
             "onboardingCompleted" = false,
             "fullName" = COALESCE("AuthOnboardingUser"."fullName", EXCLUDED."fullName"),
             "role" = COALESCE("AuthOnboardingUser"."role", EXCLUDED."role")`,
        uid,
        normalizedEmail,
        "Mata Operator",
        "Architect"
      );
    } else if (data.presetState === "COMPLETED") {
      const uid = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO "AuthOnboardingUser" (
           "id", "email", "fullName", "role", "workspaceName", "useCase",
           "onboardingStep", "onboardingCompleted"
         ) VALUES ($1, $2, $3, $4, $5, $6, 3, true)
         ON CONFLICT ("email") DO UPDATE
         SET "onboardingStep" = 3,
             "onboardingCompleted" = true,
             "fullName" = COALESCE("AuthOnboardingUser"."fullName", EXCLUDED."fullName"),
             "workspaceName" = COALESCE("AuthOnboardingUser"."workspaceName", EXCLUDED."workspaceName")`,
        uid,
        normalizedEmail,
        "Mata Executive",
        "Engineering Lead",
        "taptag Workspace",
        "Smart QR & Vault"
      );
    }

    const decision = await resolveSmartAuthRedirect({
      email: normalizedEmail,
      next: safeNext,
      userAgent: request.headers.get("user-agent"),
      utm: utmParams,
      ip,
    });

    const response = NextResponse.json({
      success: true,
      status: decision.status,
      resolvedRedirect: decision.resolvedRedirect,
      safeNext: decision.safeNext,
      wasSanitized,
      sig: decision.sig,
      user: decision.user,
      sessionContext: decision.sessionContext,
      rateLimit: rl,
    });

    response.cookies.set(
      ONBOARDING_COOKIE_NAME,
      buildCookieValue(
        decision.user.id,
        decision.user.email,
        decision.user.onboardingStep,
        decision.user.onboardingCompleted,
        decision.safeNext
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );
    response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return response;
  } catch (error) {
    console.error("POST /api/auth/callback error:", error);
    return NextResponse.json(
      { error: "Failed to process auth callback" },
      { status: 500 }
    );
  }
}
