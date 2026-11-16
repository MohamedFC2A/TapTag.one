import { NextRequest, NextResponse } from "next/server";
import {
  ONBOARDING_COOKIE_NAME,
  parseOnboardingCookie,
  validateInternalRedirectUrl,
} from "@/lib/auth-redirect-edge";

/**
 * Edge Runtime Middleware for instant Zero-Layout-Shift conditional routing,
 * strict redirect parameter sanitization, and defensive HTTP security headers.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Strict open-redirect sanitization on any ?next= or ?redirect_to= query param
  const rawNext = searchParams.get("next") ?? searchParams.get("redirect_to");
  if (rawNext !== null) {
    const safeNext = validateInternalRedirectUrl(rawNext, "/dashboard");
    if (safeNext !== rawNext.trim()) {
      const cleanedUrl = request.nextUrl.clone();
      if (searchParams.has("redirect_to")) {
        cleanedUrl.searchParams.delete("redirect_to");
      }
      cleanedUrl.searchParams.set("next", safeNext);
      return applySecurityHeaders(NextResponse.redirect(cleanedUrl));
    }
  }

  const sessionState = parseOnboardingCookie(request.cookies.get(ONBOARDING_COOKIE_NAME)?.value);

  // 2. Fast Edge redirect if an already-completed user hits /auth/login cleanly without an error
  if (pathname === "/auth/login" && sessionState?.completed && !searchParams.get("error")) {
    const dest = validateInternalRedirectUrl(rawNext || sessionState.next, "/dashboard");
    return applySecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
  }

  // 3. Edge enforcement for incomplete onboarding users when arriving at /onboarding or gated paths
  if (pathname === "/onboarding" && sessionState) {
    if (sessionState.completed && !searchParams.get("uid")) {
      const dest = validateInternalRedirectUrl(rawNext || sessionState.next, "/dashboard");
      return applySecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
    }

    const urlStep = Number(searchParams.get("step") || "0");
    if (!urlStep && !sessionState.completed && !searchParams.get("uid")) {
      const stepUrl = request.nextUrl.clone();
      stepUrl.searchParams.set("uid", sessionState.uid);
      stepUrl.searchParams.set("step", String(sessionState.step));
      stepUrl.searchParams.set("next", validateInternalRedirectUrl(rawNext || sessionState.next, "/dashboard"));
      return applySecurityHeaders(NextResponse.redirect(stepUrl));
    }
  }

  if (
    pathname.startsWith("/dashboard") &&
    searchParams.get("enforce_onboarding") === "1" &&
    sessionState &&
    !sessionState.completed
  ) {
    const onboardingUrl = new URL("/onboarding", request.url);
    onboardingUrl.searchParams.set("uid", sessionState.uid);
    onboardingUrl.searchParams.set("step", String(sessionState.step));
    onboardingUrl.searchParams.set("next", validateInternalRedirectUrl(pathname, "/dashboard"));
    return applySecurityHeaders(NextResponse.redirect(onboardingUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/auth/:path*", "/onboarding/:path*", "/dashboard/:path*"],
};
