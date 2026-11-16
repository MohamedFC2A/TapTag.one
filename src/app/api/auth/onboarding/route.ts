import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  AuthOnboardingUserRecord,
  AuthSessionLogRecord,
  ensureAuthOnboardingTables,
  ONBOARDING_COOKIE_NAME,
  parseOnboardingCookie,
  serializeOnboardingCookie,
  validateInternalRedirectUrl,
  verifyRedirectState,
} from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  try {
    await ensureAuthOnboardingTables();
    const uid = request.nextUrl.searchParams.get("uid")?.trim();
    const sig = request.nextUrl.searchParams.get("sig");

    if (uid) {
      const rows = await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
        `SELECT * FROM "AuthOnboardingUser" WHERE "id" = $1 LIMIT 1`,
        uid
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: "User onboarding profile not found" }, { status: 404 });
      }
      const sigPayload = sig ? verifyRedirectState(sig) : null;
      return NextResponse.json({
        user: rows[0],
        signatureValid: sig ? Boolean(sigPayload && sigPayload.uid === uid) : null,
      });
    }

    // Analytics & audit overview
    const users = await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
      `SELECT * FROM "AuthOnboardingUser" ORDER BY "lastLoginAt" DESC LIMIT 20`
    );
    const logs = await db.$queryRawUnsafe<AuthSessionLogRecord[]>(
      `SELECT * FROM "AuthSessionLog" ORDER BY "createdAt" DESC LIMIT 30`
    );
    const utmStats = await db.$queryRawUnsafe<{ source: string; total: number }[]>(
      `SELECT COALESCE("utmSource", 'direct') AS source, COUNT(*)::int AS total
       FROM "AuthOnboardingUser"
       GROUP BY COALESCE("utmSource", 'direct')
       ORDER BY total DESC
       LIMIT 8`
    );
    const deviceStats = await db.$queryRawUnsafe<{ device: string; total: number }[]>(
      `SELECT COALESCE("deviceType", 'Desktop') AS device, COUNT(*)::int AS total
       FROM "AuthSessionLog"
       GROUP BY COALESCE("deviceType", 'Desktop')
       ORDER BY total DESC`
    );

    return NextResponse.json({
      users,
      logs,
      utmStats,
      deviceStats,
      summary: {
        totalUsers: users.length,
        completedUsers: users.filter((u) => u.onboardingCompleted).length,
        incompleteUsers: users.filter((u) => !u.onboardingCompleted).length,
        totalEvents: logs.length,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/onboarding error:", error);
    return NextResponse.json({ error: "Failed to load onboarding state" }, { status: 500 });
  }
}

const OnboardingUpdateSchema = z.object({
  uid: z.string().trim().min(3).max(80).optional(),
  email: z.string().trim().email().max(180).optional(),
  step: z.number().int().min(1).max(3).optional(),
  fullName: z.string().trim().max(120).nullable().optional(),
  role: z.string().trim().max(100).nullable().optional(),
  workspaceName: z.string().trim().max(120).nullable().optional(),
  useCase: z.string().trim().max(120).nullable().optional(),
  complete: z.boolean().optional(),
  next: z.string().trim().max(1024).optional(),
});

async function handleSaveProgress(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    await ensureAuthOnboardingTables();
    const parsed = OnboardingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid onboarding payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const cookieState = parseOnboardingCookie(request.cookies.get(ONBOARDING_COOKIE_NAME)?.value);
    const targetUid = d.uid || cookieState?.uid;
    const safeNext = validateInternalRedirectUrl(d.next || cookieState?.next, "/dashboard");

    if (!targetUid && !d.email) {
      return NextResponse.json({ error: "User identifier (uid or email) is required" }, { status: 400 });
    }

    const lookupRows = targetUid
      ? await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
          `SELECT * FROM "AuthOnboardingUser" WHERE "id" = $1 LIMIT 1`,
          targetUid
        )
      : await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
          `SELECT * FROM "AuthOnboardingUser" WHERE "email" = $1 LIMIT 1`,
          d.email!.toLowerCase()
        );

    if (lookupRows.length === 0) {
      return NextResponse.json({ error: "Onboarding user not found" }, { status: 404 });
    }

    const existing = lookupRows[0];
    const nextStep = d.complete
      ? 3
      : Math.min(3, Math.max(1, d.step ?? existing.onboardingStep));
    const isCompleted = d.complete ? true : existing.onboardingCompleted;

    const updated = await db.$queryRawUnsafe<AuthOnboardingUserRecord[]>(
      `UPDATE "AuthOnboardingUser"
       SET "fullName" = COALESCE($2, "fullName"),
           "role" = COALESCE($3, "role"),
           "workspaceName" = COALESCE($4, "workspaceName"),
           "useCase" = COALESCE($5, "useCase"),
           "onboardingStep" = $6,
           "onboardingCompleted" = $7
       WHERE "id" = $1
       RETURNING *`,
      existing.id,
      d.fullName ?? null,
      d.role ?? null,
      d.workspaceName ?? null,
      d.useCase ?? null,
      nextStep,
      isCompleted
    );

    const user = updated[0];
    const response = NextResponse.json({
      success: true,
      user,
      next: safeNext,
    });

    response.cookies.set(
      ONBOARDING_COOKIE_NAME,
      serializeOnboardingCookie({
        uid: user.id,
        email: user.email,
        step: user.onboardingStep,
        completed: user.onboardingCompleted,
        next: safeNext,
        iat: Math.floor(Date.now() / 1000),
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    return response;
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json({ error: "Failed to save onboarding progress" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleSaveProgress(request);
}

export async function PATCH(request: NextRequest) {
  return handleSaveProgress(request);
}
