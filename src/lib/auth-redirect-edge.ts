/**
 * Edge-safe utilities for strict internal redirect validation and lightweight
 * onboarding session state cookie serialization/parsing.
 * Imported directly by Next.js Edge Middleware (zero Node.js dependencies).
 */

export const ONBOARDING_COOKIE_NAME = "mata_onboarding_state";

export const ALLOWED_INTERNAL_PREFIXES = [
  "/",
  "/dashboard",
  "/onboarding",
  "/auth",
  "/scan",
  "/s/",
  "/q/",
  "/l/",
] as const;

export interface OnboardingCookieState {
  uid: string;
  email?: string;
  step: number;
  completed: boolean;
  next: string;
  iat: number;
}

function isPathAllowedByWhitelist(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const prefix of ALLOWED_INTERNAL_PREFIXES) {
    if (prefix === "/") continue;
    if (prefix.endsWith("/")) {
      if (pathname.startsWith(prefix)) return true;
    } else if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * Strictly validates that a redirect target is an internal path on the allowed
 * route whitelist, blocking open redirects, protocol-relative URLs, encoded
 * traversal tricks, and non-HTTP schemes.
 */
export function validateInternalRedirectUrl(
  rawUrl: string | null | undefined,
  fallback = "/dashboard"
): string {
  const safeFallback = fallback.startsWith("/") ? fallback : "/dashboard";
  if (!rawUrl || typeof rawUrl !== "string") return safeFallback;

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 1024) return safeFallback;

  // Reject ASCII control characters immediately
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return safeFallback;

  // Decode one layer cautiously to catch %2f%2f or %5c obfuscation
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return safeFallback;
  }

  for (const candidate of [trimmed, decoded]) {
    if (!candidate.startsWith("/")) return safeFallback;
    if (candidate.startsWith("//") || candidate.startsWith("/\\") || candidate.includes("\\")) {
      return safeFallback;
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(candidate)) {
      return safeFallback;
    }
  }

  try {
    const parsed = new URL(trimmed, "https://internal.taptag.local");
    if (parsed.origin !== "https://internal.taptag.local") return safeFallback;
    if (!isPathAllowedByWhitelist(parsed.pathname)) return safeFallback;

    // Prevent recursive redirect loops on auth/callback itself
    if (parsed.pathname.startsWith("/api/auth/callback")) {
      return safeFallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return safeFallback;
  }
}

export function serializeOnboardingCookie(state: OnboardingCookieState): string {
  const safeNext = validateInternalRedirectUrl(state.next, "/dashboard");
  const json = JSON.stringify({
    uid: state.uid,
    email: state.email || "",
    step: Math.min(3, Math.max(1, Number(state.step) || 1)),
    completed: Boolean(state.completed),
    next: safeNext,
    iat: Number(state.iat) || Math.floor(Date.now() / 1000),
  });
  return encodeURIComponent(json);
}

export function parseOnboardingCookie(rawValue: string | undefined): OnboardingCookieState | null {
  if (!rawValue || rawValue.length > 2048) return null;
  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded) as Partial<OnboardingCookieState>;
    if (!parsed || typeof parsed.uid !== "string" || !parsed.uid) return null;
    return {
      uid: parsed.uid,
      email: typeof parsed.email === "string" ? parsed.email : "",
      step: Math.min(3, Math.max(1, Number(parsed.step) || 1)),
      completed: Boolean(parsed.completed),
      next: validateInternalRedirectUrl(parsed.next, "/dashboard"),
      iat: typeof parsed.iat === "number" ? parsed.iat : 0,
    };
  } catch {
    return null;
  }
}
