import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { extractClientIp, hashIpAddress } from "@/lib/rate-limit";

interface RouteProps {
  params: Promise<{
    tagId: string;
  }>;
}

/**
 * Smart Encrypted Redirect Route (/r/[tagId])
 * Evaluates the real-time operational state of the card:
 * 1. Unactivated (bought from shop) -> routes to Passwordless First-Claim Biometric Activation.
 * 2. Owner scanning -> routes directly to Owner Control Suite with biometric session.
 * 3. Stranger/Bystander scanning -> evaluates state (Active, Away, DND, Suspended), generates signed anti-spam token, and routes to Public Portal.
 */
export async function GET(request: NextRequest, { params }: RouteProps) {
  const { tagId } = await params;
  const cleanTagUid = tagId.trim().toUpperCase();

  // Find tag in Neon PostgreSQL
  const tag = await db.tag.findUnique({
    where: { tagUid: cleanTagUid },
    include: { profile: true },
  });

  const url = request.nextUrl.clone();

  // 1. If tag does not exist in Neon DB
  if (!tag) {
    url.pathname = `/t/${cleanTagUid}`;
    return NextResponse.redirect(url);
  }

  // 2. Unactivated Card (Sold in shops, ready for first-claim)
  if (!tag.isActivated) {
    url.pathname = "/dashboard/activate";
    url.searchParams.set("tag", tag.tagUid);
    return NextResponse.redirect(url);
  }

  // 3. Activated Card: Check device identity
  const cookieStore = await cookies();
  const ownerDeviceIdCookie = cookieStore.get("taptag_device_id")?.value;

  const isOwner = Boolean(
    ownerDeviceIdCookie &&
    tag.ownerDeviceId &&
    ownerDeviceIdCookie === tag.ownerDeviceId
  );

  const headerList = await headers();
  const clientIp = extractClientIp(headerList);
  const ipHash = hashIpAddress(clientIp);

  // Audit Scan Event in Neon DB
  try {
    await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "SCAN",
        ipAddressHash: ipHash,
        userAgent: headerList.get("user-agent") || null,
        status: "RECEIVED",
        metadata: {
          isOwnerScan: isOwner,
          scannedAt: new Date().toISOString(),
          operationalStatus: tag.status,
        },
      },
    });
  } catch (err) {
    console.error("Scan audit log error:", err);
  }

  // If Verified Owner -> Route to Owner Suite
  if (isOwner) {
    url.pathname = `/t/${tag.tagUid}`;
    url.searchParams.delete("tag");
    return NextResponse.redirect(url);
  }

  // If Stranger -> Generate secure Anti-Spam session token
  const timestamp = Date.now();
  const hmacSecret = process.env.SESSION_SECRET || "taptag_shield_secret_key_2026";
  const signature = crypto
    .createHmac("sha256", hmacSecret)
    .update(`${tag.tagUid}:${ipHash}:${timestamp}`)
    .digest("hex");
  const sessionToken = `${timestamp}.${signature.substring(0, 16)}`;

  url.pathname = `/t/${tag.tagUid}`;
  url.searchParams.set("session", sessionToken);

  const response = NextResponse.redirect(url);
  response.cookies.set("taptag_scan_session", sessionToken, {
    path: "/",
    maxAge: 300, // 5 minutes validity
    sameSite: "strict",
    httpOnly: true,
  });

  return response;
}
