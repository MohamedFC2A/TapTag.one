export interface CodeSnippetFile {
  id: "middleware" | "callback" | "utils";
  fileName: string;
  label: string;
  code: string;
}

export const AUTH_PRODUCTION_SNIPPETS: CodeSnippetFile[] = [
  {
    id: "middleware",
    fileName: "src/middleware.ts",
    label: "Edge Middleware",
    code: `import { NextRequest, NextResponse } from "next/server";
import {
  ONBOARDING_COOKIE_NAME,
  parseOnboardingCookie,
  validateInternalRedirectUrl,
} from "@/lib/auth-redirect-edge";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Strict internal redirect sanitization (blocks open redirects & // tricks)
  const rawNext = searchParams.get("next") ?? searchParams.get("redirect_to");
  if (rawNext !== null) {
    const safeNext = validateInternalRedirectUrl(rawNext, "/dashboard");
    if (safeNext !== rawNext.trim()) {
      const cleaned = request.nextUrl.clone();
      cleaned.searchParams.delete("redirect_to");
      cleaned.searchParams.set("next", safeNext);
      return applySecurityHeaders(NextResponse.redirect(cleaned));
    }
  }

  // 2. Zero-layout-shift Edge session & onboarding gating
  const session = parseOnboardingCookie(request.cookies.get(ONBOARDING_COOKIE_NAME)?.value);
  if (pathname === "/auth/login" && session?.completed && !searchParams.get("error")) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(validateInternalRedirectUrl(rawNext || session.next), request.url))
    );
  }

  if (pathname === "/onboarding" && session?.completed && !searchParams.get("uid")) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(validateInternalRedirectUrl(rawNext || session.next), request.url))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/auth/:path*", "/onboarding/:path*", "/dashboard/:path*"],
};`,
  },
  {
    id: "callback",
    fileName: "src/app/api/auth/callback/route.ts",
    label: "Auth Callback API",
    code: `import { NextRequest, NextResponse } from "next/server";
import {
  checkAuthRateLimit,
  ONBOARDING_COOKIE_NAME,
  resolveSmartAuthRedirect,
  serializeOnboardingCookie,
  validateInternalRedirectUrl,
  verifyRedirectState,
} from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const sp = request.nextUrl.searchParams;
  const safeNext = validateInternalRedirectUrl(sp.get("next") ?? sp.get("redirect_to"), "/dashboard");

  // 1. Sliding-window rate limit against automated bot abuse
  const rl = checkAuthRateLimit(ip, "auth-callback", 25, 60_000);
  if (!rl.allowed) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("error", "rate_limited");
    login.searchParams.set("next", safeNext);
    return NextResponse.redirect(login, { headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  // 2. Graceful error recovery preserving intended destination (?next=)
  const email = sp.get("email")?.trim().toLowerCase() || "";
  const sig = sp.get("sig");
  if ((sig && !verifyRedirectState(sig)) || sp.get("status") === "expired" || !email) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("error", sp.get("status") === "expired" ? "token_expired" : "missing_session");
    login.searchParams.set("next", safeNext);
    return NextResponse.redirect(login);
  }

  // 3. Smart Conditional Routing + UTM & Device Telemetry capture
  const decision = await resolveSmartAuthRedirect({
    email,
    next: safeNext,
    userAgent: request.headers.get("user-agent"),
    utm: sp,
    ip,
  });

  const res = NextResponse.redirect(new URL(decision.resolvedRedirect, request.url));
  res.cookies.set(
    ONBOARDING_COOKIE_NAME,
    serializeOnboardingCookie({
      uid: decision.user.id,
      email: decision.user.email,
      step: decision.user.onboardingStep,
      completed: decision.user.onboardingCompleted,
      next: decision.safeNext,
      iat: Math.floor(Date.now() / 1000),
    }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 }
  );
  return res;
}`,
  },
  {
    id: "utils",
    fileName: "src/lib/auth-redirect.ts",
    label: "Security & Routing Utils",
    code: `// Strict internal URL validator (whitelist + open-redirect protection)
export function validateInternalRedirectUrl(rawUrl: string | null | undefined, fallback = "/dashboard"): string {
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\\\")) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)) return fallback;
  const parsed = new URL(trimmed, "https://internal.taptag.local");
  if (parsed.origin !== "https://internal.taptag.local") return fallback;
  return \`\${parsed.pathname}\${parsed.search}\${parsed.hash}\`;
}

// Smart Conditional Routing:
// - First-time user -> /onboarding?step=1&next=...&sig=...
// - Incomplete user -> /onboarding?step=<missingStep>&next=...&sig=...
// - Completed user  -> direct redirect to validated safeNext`,
  },
];
