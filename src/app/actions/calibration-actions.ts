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

/**
 * Persists the vehicle spatial calibration to the server audit & metadata store
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

    // Verify tag existence
    const tag = await db.tag.findUnique({
      where: { tagUid: cleanTagUid },
      include: { profile: true },
    });

    if (!tag) {
      return { success: false, error: "البطاقة غير موجودة في المنظومة." };
    }

    // Verify ownership
    if (tag.isActivated && tag.ownerDeviceId && tag.ownerDeviceId !== deviceId) {
      return { success: false, error: "غير مصرح: هذا الإجراء مخصص لمالك المركبة المسجل فقط." };
    }

    // Record Calibration Incident Log in Neon DB
    await db.incidentLog.create({
      data: {
        tagId: tag.id,
        eventType: "SCAN",
        ipAddressHash: "spatial_calibration",
        status: "RESOLVED",
        resolutionNotes: "Zero-Hardware Spatial Stance Calibrated",
        metadata: {
          type: "SPATIAL_CALIBRATION",
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
    });

    revalidatePath(`/t/${cleanTagUid}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "تم حفظ المعايرة الفضائية للمركبة بنجاح في السحابة المشفرة.",
      centroidLat,
      centroidLng,
    };
  } catch (error) {
    console.error("saveVehicleSpatialCalibration error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حفظ المعايرة الفضائية.",
    };
  }
}

/**
 * Fetch the latest spatial calibration for a tag
 */
export async function getLatestVehicleSpatialCalibration(tagUid: string) {
  try {
    const cleanTagUid = tagUid.trim().toUpperCase();
    const tag = await db.tag.findUnique({
      where: { tagUid: cleanTagUid },
    });

    if (!tag) return { success: false, calibration: null };

    const log = await db.incidentLog.findFirst({
      where: {
        tagId: tag.id,
        resolutionNotes: "Zero-Hardware Spatial Stance Calibrated",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!log || !log.metadata) {
      return { success: false, calibration: null };
    }

    return {
      success: true,
      calibration: log.metadata,
    };
  } catch (error) {
    console.error("getLatestVehicleSpatialCalibration error:", error);
    return { success: false, calibration: null };
  }
}
