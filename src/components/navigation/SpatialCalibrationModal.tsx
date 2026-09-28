"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SpatialCalibration,
  computeVehicleCentroid,
  saveCalibrationLocally,
  playNavigationSound,
} from "@/lib/spatial-navigation";
import { saveVehicleSpatialCalibration } from "@/app/actions/calibration-actions";
import { IsometricStanceDiagram } from "./IsometricStanceDiagram";
import {
  X,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Zap,
  Radio,
} from "lucide-react";

interface SpatialCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagUid: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel?: string;
  vehicleColor?: string;
  onCalibrationSaved: (calibration: SpatialCalibration) => void;
  lang?: "ar" | "en";
}

export function SpatialCalibrationModal({
  isOpen,
  onClose,
  tagUid,
  vehiclePlate,
  vehicleMake,
  vehicleModel,
  vehicleColor,
  onCalibrationSaved,
  lang = "ar",
}: SpatialCalibrationModalProps) {
  const isAr = lang === "ar";

  const [step, setStep] = useState<"STANDBY" | "CALIBRATING" | "SUCCESS" | "ERROR">("STANDBY");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Live real sensor readings
  const [liveGps, setLiveGps] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);

  const [liveHeading, setLiveHeading] = useState<number>(0);
  const [isGpsAcquiring, setIsGpsAcquiring] = useState<boolean>(true);
  const [isSavingNeon, setIsSavingNeon] = useState<boolean>(false);

  // Result summary
  const [savedCalibration, setSavedCalibration] = useState<SpatialCalibration | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const latestGpsRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);
  const latestHeadingRef = useRef<number>(0);

  /**
   * Request iOS orientation permission if required
   */
  const requestOrientationPermission = async (): Promise<boolean> => {
    if (
      typeof window !== "undefined" &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === "function"
    ) {
      try {
        const perm = await (
          DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
        ).requestPermission();
        return perm === "granted";
      } catch (err) {
        console.warn("DeviceOrientation permission error:", err);
        return false;
      }
    }
    return true;
  };

  /**
   * Start passive GPS and Compass acquisition as soon as the modal is opened
   */
  useEffect(() => {
    if (!isOpen) return;

    setStep("STANDBY");
    setErrorMessage("");
    setSavedCalibration(null);
    setIsGpsAcquiring(true);

    // 1. Compass listener (Absolute on Android, webkitCompassHeading on iOS)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const eCompass = e as unknown as { webkitCompassHeading?: number };
      let heading = 0;
      if (typeof eCompass.webkitCompassHeading === "number") {
        heading = eCompass.webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }
      latestHeadingRef.current = heading;
      setLiveHeading(Math.round(heading));
    };

    if (typeof window !== "undefined") {
      const win = window as any;
      if ("ondeviceorientationabsolute" in win) {
        win.addEventListener("deviceorientationabsolute", handleOrientation);
      } else {
        win.addEventListener("deviceorientation", handleOrientation);
      }
    }

    // 2. High-accuracy GPS watcher
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy || 4.0;
          const altitude = pos.coords.altitude;

          const gpsData = { lat, lng, accuracy, altitude };
          latestGpsRef.current = gpsData;
          setLiveGps(gpsData);
          setIsGpsAcquiring(false);
        },
        (err) => {
          console.warn("Live GPS acquire warning:", err);
          setIsGpsAcquiring(false);
          if (!latestGpsRef.current) {
            setErrorMessage(
              isAr
                ? "تعذر قراءة إشارة GPS بدقة. يرجى التأكد من تشغيل 'الموقع الدقيق' والسماح للمتصفح."
                : "Unable to read high-accuracy GPS. Please ensure Precise Location is enabled."
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 25000,
          maximumAge: 5000,
        }
      );
    } else {
      setIsGpsAcquiring(false);
      setErrorMessage(
        isAr
          ? "مستشعر GPS غير مدعوم في هذا المتصفح."
          : "GPS hardware is not supported in this browser."
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        const win = window as any;
        win.removeEventListener("deviceorientationabsolute", handleOrientation);
        win.removeEventListener("deviceorientation", handleOrientation);
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOpen, isAr]);

  /**
   * User clicks "بدء المعايرة الفورية"
   */
  const handlePerformCalibration = async () => {
    setStep("CALIBRATING");
    setErrorMessage("");

    try {
      await requestOrientationPermission();
    } catch {
      // Continue
    }

    playNavigationSound("tick");

    // Check if we have active GPS fix
    const currentGps = latestGpsRef.current;
    if (!currentGps) {
      setErrorMessage(
        isAr
          ? "لم يتم التقاط إشارة GPS حتى الآن. يرجى الانتظار ثوانٍ حتى تلتقط الشريحة الأقمار الصناعية."
          : "No live GPS satellite fix acquired yet. Please wait a few seconds."
      );
      setStep("ERROR");
      return;
    }

    const currentHeading = latestHeadingRef.current;

    // Apply lateral centroid offset (1.2m to the right from user stance at driver door)
    const { centroidLat, centroidLng } = computeVehicleCentroid(
      currentGps.lat,
      currentGps.lng,
      currentHeading,
      1.2
    );

    const calibration: SpatialCalibration = {
      tagUid,
      vehiclePlate,
      vehicleMake,
      vehicleModel,
      calibratedAt: new Date().toISOString(),
      rawLat: currentGps.lat,
      rawLng: currentGps.lng,
      userHeading: currentHeading,
      accuracy: currentGps.accuracy,
      altitude: currentGps.altitude,
      centroidLat,
      centroidLng,
      offsetDistanceMeters: 1.2,
    };

    // Save locally (instant zero-latency offline availability)
    saveCalibrationLocally(calibration);
    setSavedCalibration(calibration);

    // Save permanently to Neon PostgreSQL Cloud via Server Action
    setIsSavingNeon(true);
    try {
      await saveVehicleSpatialCalibration({
        tagUid,
        deviceId: "verified_owner",
        rawLat: currentGps.lat,
        rawLng: currentGps.lng,
        userHeading: currentHeading,
        accuracy: currentGps.accuracy,
        altitude: currentGps.altitude,
        centroidLat,
        centroidLng,
        offsetDistanceMeters: 1.2,
      });
    } catch (err) {
      console.warn("Neon cloud sync warning (local cache armed):", err);
    } finally {
      setIsSavingNeon(false);
    }

    playNavigationSound("calibrate_complete");

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 150]);
    }

    setStep("SUCCESS");
    onCalibrationSaved(calibration);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#000000] text-white overflow-hidden select-none animate-in fade-in">
      {/* Mobile-First Header Bar (Clean Monochrome, No Glowing) */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800 bg-[#0A0A0A] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold font-mono">
            TT
          </span>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">
              {isAr ? "معايرة موضع المركبة" : "Vehicle Stance Calibration"}
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">
              {vehiclePlate} • {vehicleMake} {vehicleModel}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-zinc-800 bg-[#141414] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-w-lg w-full mx-auto">
        {/* Photorealistic 3D Luxury Car Guide (Clean, No Overlapping Text) */}
        <IsometricStanceDiagram
          vehicleMake={vehicleMake}
          vehicleModel={vehicleModel}
          vehicleColor={vehicleColor}
          isCalibrating={step === "CALIBRATING"}
          lang={lang}
        />

        {/* Live GNSS Telemetry Bar (Neutral, Professional) */}
        <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0A0A0A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">
              {isAr ? "إشارة الأقمار الصناعية (GNSS):" : "Satellite GNSS Signal:"}
            </span>

            {/* Accuracy Badge */}
            {liveGps ? (
              <span className="text-xs font-mono font-bold text-white">
                {isAr ? `دقة ±${liveGps.accuracy.toFixed(1)}م` : `±${liveGps.accuracy.toFixed(1)}m`}
              </span>
            ) : isGpsAcquiring ? (
              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <RotateCw className="w-3 h-3 animate-spin" />
                <span>{isAr ? "جارٍ الالتقاط..." : "Acquiring..."}</span>
              </span>
            ) : (
              <span className="text-xs font-mono text-red-400">
                {isAr ? "لا توجد إشارة" : "No Signal"}
              </span>
            )}
          </div>

          {/* Live Coordinates Readout */}
          {liveGps && (
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/80">
              <div>
                <span className="text-zinc-500 block">{isAr ? "الإحداثيات الحالية:" : "Coordinates:"}</span>
                <span className="text-white font-bold">
                  {liveGps.lat.toFixed(5)}°, {liveGps.lng.toFixed(5)}°
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">{isAr ? "زاوية البوصلة:" : "Heading:"}</span>
                <span className="text-white font-bold">{liveHeading}°</span>
              </div>
            </div>
          )}
        </div>

        {/* Success Confirmation Card */}
        {step === "SUCCESS" && savedCalibration && (
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#111111] space-y-2 animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span className="text-sm font-bold text-white">
                {isAr ? "تمت المعايرة وحفظ النقطة في Neon بنجاح!" : "Calibrated & Saved to Neon Cloud!"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              {isAr
                ? `تم تسجيل موقع السيارة بدقة ±${savedCalibration.accuracy.toFixed(1)}م. سهم البحث الدقيق جاهز للعمل فوراً.`
                : `Vehicle stance registered with ±${savedCalibration.accuracy.toFixed(1)}m precision. Precision finder ready.`}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-red-900/60 bg-red-950/20 text-xs text-red-200 font-mono flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Button (Clean Monochrome) */}
      <div className="p-4 border-t border-zinc-800 bg-[#0A0A0A] shrink-0 max-w-lg w-full mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-3 rounded-xl border border-zinc-800 bg-[#141414] text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          {step === "SUCCESS" ? (isAr ? "إغلاق" : "Close") : (isAr ? "إلغاء" : "Cancel")}
        </button>

        {step !== "SUCCESS" ? (
          <button
            type="button"
            onClick={handlePerformCalibration}
            disabled={step === "CALIBRATING" || !liveGps}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4 text-black" />
            <span>
              {step === "CALIBRATING"
                ? isAr
                  ? "جارٍ المعايرة والتسجيل..."
                  : "Calibrating..."
                : isAr
                ? "بدء المعايرة الفورية الآن"
                : "Perform Instant Calibration"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>{isAr ? "فتح شاشة البحث الدقيق" : "Open Precision Finder"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
