import crypto from "crypto";

export function hashIpAddress(ip: string): string {
  const salt = process.env.TAPTAG_SECRET_SALT || "taptag_salt_2026";
  return crypto.createHmac("sha256", salt).update(ip).digest("hex");
}

export function extractClientIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export const COOLDOWN_SECONDS = 180; // 3-minute cooldown
