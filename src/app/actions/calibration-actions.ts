"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface SaveCalibrationParams {
  tagUid: string;
  deviceId: string;
  rawLat: number;
  rawLng: number;
  userHeading: number;
  accuracy: number;
  altitude?: number | null;
  centroidLat: number;
  centroidLng: number;
  offsetDistanceMeters: number;
}

export interface SpatialPointRecord {
  id: string;
  tagUid: string;
  rawLat: number;
  rawLng: number;
  userHeading: number;
  accuracy: number;
  centroidLat: number;
  centroidLng: number;
  offsetDistanceMeters: number;
  createdAt: string;
}

/**
 * Persists the vehicle spatial calibration permanently in Neon PostgreSQL cloud table VehicleSpatialPoint
 */
export async function saveVehicleSpatialCalibration(params: SaveCalibrationParams) {
  try {
    const {
      tagUid,
      deviceId,
      rawLat,
      rawLng,
      userHeading,
      accuracy,
      altitude,
      centroidLat,
      centroidLng,
      offsetDistanceMeters,
    } = params;

    const cleanTagUid = tagUid.trim().toUpperCase();
    const id = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Verify tag existence
    const tag = await db.tag.findUnique({
      where: { tagUid: cleanTagUid },
      include: { profile: true },
    });

    if (!tag) {
      return { success: false, error: "البطاقة غير مسجلة في المنظومة." };
    }

    // Insert into Neon Cloud Table VehicleSpatialPoint
    await db.$executeRawUnsafe(
      `
      INSERT INTO "VehicleSpatialPoint" (
        "id", "tagUid", "rawLat", "rawLng", "userHeading", "accuracy",
        "centroidLat", "centroidLng", "offsetDistanceMeters", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
      `,
      id,
      cleanTagUid,
      rawLat,
      rawLng,
      userHeading,
      accuracy,
      centroidLat,
      centroidLng,
      offsetDistanceMeters
    );

    // Asynchronously log audit trail without blocking response
    if (tag) {
      db.incidentLog
        .create({
          data: {
            tagId: tag.id,
            eventType: "SCAN",
            ipAddressHash: "neon_spatial_sync",
            status: "RESOLVED",
            resolutionNotes: "Zero-Hardware Spatial Stance Calibrated and Persisted in Neon",
            metadata: {
              type: "SPATIAL_CALIBRATION",
              pointId: id,
              rawLat,
              rawLng,
              userHeading,
              accuracy,
              altitude,
              centroidLat,
              centroidLng,
              offsetDistanceMeters,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .catch((err) => console.error("Audit log async error:", err));
    }

    return {
      success: true,
      message: "تم حفظ وتسجيل نقطة المعايرة سحابياً في Neon بنجاح.",
      pointId: id,
      centroidLat,
      centroidLng,
    };
  } catch (error) {
    console.error("saveVehicleSpatialCalibration error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء المزامنة السحابية مع Neon.",
    };
  }
}

/**
 * Fetch the single most recent calibration point for a tag from Neon PostgreSQL
 */
export async function getLatestVehicleSpatialPoint(tagUid: string): Promise<{
  success: boolean;
  point: SpatialPointRecord | null;
}> {
  try {
    const cleanTagUid = tagUid.trim().toUpperCase();
    const rows = (await db.$queryRawUnsafe(
      `
      SELECT 
        "id", "tagUid", "rawLat", "rawLng", "userHeading", "accuracy",
        "centroidLat", "centroidLng", "offsetDistanceMeters", "createdAt"
      FROM "VehicleSpatialPoint"
      WHERE "tagUid" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1;
      `,
      cleanTagUid
    )) as any[];

    if (!rows || rows.length === 0) {
      return { success: true, point: null };
    }

    const r = rows[0];
    const point: SpatialPointRecord = {
      id: r.id,
      tagUid: r.tagUid,
      rawLat: Number(r.rawLat),
      rawLng: Number(r.rawLng),
      userHeading: Number(r.userHeading),
      accuracy: Number(r.accuracy),
      centroidLat: Number(r.centroidLat),
      centroidLng: Number(r.centroidLng),
      offsetDistanceMeters: Number(r.offsetDistanceMeters),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };

    return { success: true, point };
  } catch (error) {
    console.error("getLatestVehicleSpatialPoint error:", error);
    return { success: false, point: null };
  }
}

/**
 * Fetch calibration points history for a tag from Neon PostgreSQL
 */
export async function getVehicleSpatialPointsHistory(tagUid: string): Promise<{
  success: boolean;
  points: SpatialPointRecord[];
}> {
  try {
    const cleanTagUid = tagUid.trim().toUpperCase();
    const rows = (await db.$queryRawUnsafe(
      `
      SELECT 
        "id", "tagUid", "rawLat", "rawLng", "userHeading", "accuracy",
        "centroidLat", "centroidLng", "offsetDistanceMeters", "createdAt"
      FROM "VehicleSpatialPoint"
      WHERE "tagUid" = $1
      ORDER BY "createdAt" DESC
      LIMIT 10;
      `,
      cleanTagUid
    )) as any[];

    const points: SpatialPointRecord[] = rows.map((r) => ({
      id: r.id,
      tagUid: r.tagUid,
      rawLat: Number(r.rawLat),
      rawLng: Number(r.rawLng),
      userHeading: Number(r.userHeading),
      accuracy: Number(r.accuracy),
      centroidLat: Number(r.centroidLat),
      centroidLng: Number(r.centroidLng),
      offsetDistanceMeters: Number(r.offsetDistanceMeters),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    return { success: true, points };
  } catch (error) {
    console.error("getVehicleSpatialPointsHistory error:", error);
    return { success: false, points: [] };
  }
}

/**
 * Purge calibration points when the user explicitly triggers Restart
 */
export async function deleteVehicleSpatialCalibration(tagUid: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const cleanTagUid = tagUid.trim().toUpperCase();
    await db.$executeRawUnsafe(
      `DELETE FROM "VehicleSpatialPoint" WHERE "tagUid" = $1;`,
      cleanTagUid
    );
    return { success: true, message: "تمت إعادة ضبط النقطة بنجاح." };
  } catch (error) {
    console.error("deleteVehicleSpatialCalibration error:", error);
    return { success: false };
  }
}

