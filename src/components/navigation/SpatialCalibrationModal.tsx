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
  Navigation,
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

  // Live sensor readings
  const [liveGps, setLiveGps] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);

  const [liveHeading, setLiveHeading] = useState<number>(0);
  const [isGpsAcquiring, setIsGpsAcquiring] = useState<boolean>(true);

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
          const accuracy = pos.coords.accuracy || 5.0;
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
                ? "تعذر قراءة إشارة GPS بدقة. يرجى التأكد من تفعيل 'خدمات الموقع الدقيق' (Precise Location) والسماح للمتصفح بالوصول."
                : "Unable to read high-accuracy GPS. Please ensure Precise Location is enabled in browser permissions."
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
          ? "لم يتم التقاط إشارة GPS حتى الآن. يرجى الانتظار ثوانٍ حتى تلتقط الشريحة الأقمار الصناعية أو التأكد من إتاحة الصلاحية."
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

    // Save locally
    saveCalibrationLocally(calibration);
    setSavedCalibration(calibration);

    // Sync to server database in background
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
      console.warn("Server calibration sync warning (local save succeeded):", err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-[#1F2228] bg-[#000000] text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1F2228] bg-[#050608]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853]">
              <Compass className="w-5 h-5 text-[#00C853]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {isAr ? "معايرة المحاذاة الفضائية للمركبة" : "Vehicle Spatial Stance Calibration"}
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {vehiclePlate} • {vehicleMake} {vehicleModel}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-white hover:border-[#00C853] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Photorealistic 3D Luxury Car Guide */}
          <IsometricStanceDiagram
            vehicleMake={vehicleMake}
            vehicleModel={vehicleModel}
            vehicleColor={vehicleColor}
            isCalibrating={step === "CALIBRATING"}
            lang={lang}
          />

          {/* Real-Time Live GPS Telemetry Dashboard */}
          <div className="p-3.5 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00C853] animate-pulse" />
                <span className="text-xs font-mono font-bold text-white">
                  {isAr ? "حالة إشارة الأقمار الصناعية الحية (Live GNSS):" : "Live Satellite GNSS Status:"}
                </span>
              </div>

              {/* Accuracy Badge */}
              {liveGps ? (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-[#00C853]/50 bg-[#00C853]/10 text-[#00C853] font-bold">
                  {isAr ? `دقة فائقة ±${liveGps.accuracy.toFixed(1)}م` : `Accuracy ±${liveGps.accuracy.toFixed(1)}m`}
                </span>
              ) : isGpsAcquiring ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold flex items-center gap-1.5">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  <span>{isAr ? "جارٍ التقاط الإشارة..." : "Acquiring Fix..."}</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-400">
                  {isAr ? "الإشارة غير متاحة" : "No GPS Fix"}
                </span>
              )}
            </div>

            {/* Live Telemetry Coordinates */}
            {liveGps ? (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 pt-1">
                <div>
                  <span className="text-zinc-500 block">{isAr ? "الإحداثيات الحقيقية:" : "Live Coordinates:"}</span>
                  <span className="text-zinc-200 font-bold">
                    {liveGps.lat.toFixed(5)}°, {liveGps.lng.toFixed(5)}°
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{isAr ? "زاوية البوصلة اللحظية:" : "Compass Heading:"}</span>
                  <span className="text-[#00C853] font-bold">
                    {liveHeading}° ({liveHeading >= 315 || liveHeading < 45 ? "N" : liveHeading < 135 ? "E" : liveHeading < 225 ? "S" : "W"})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 font-mono">
                {isAr
                  ? "يرجى الوقوف في مكان مكشوف والتأكد من تفعيل الـ GPS في هاتفك."
                  : "Please stand with clear sky view and ensure phone GPS is on."}
              </p>
            )}
          </div>

          {/* Success Summary View */}
          {step === "SUCCESS" && savedCalibration && (
            <div className="p-4 rounded-xl border border-[#00C853]/60 bg-[#00C853]/10 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00C853] shrink-0" />
                <span className="text-sm font-bold text-white">
                  {isAr ? "اكتملت المعايرة الفضائية بنجاح تام!" : "Calibration Completed Successfully!"}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                {isAr
                  ? `تمت المعايرة بالإحداثيات الحقيقية الفعلية (${savedCalibration.centroidLat.toFixed(5)}°, ${savedCalibration.centroidLng.toFixed(5)}°) بدقة ±${savedCalibration.accuracy.toFixed(1)} متر. تم تسليح سهم البحث الدقيق الآن.`
                  : `Calibrated with real live coordinates (${savedCalibration.centroidLat.toFixed(5)}°, ${savedCalibration.centroidLng.toFixed(5)}°) at ±${savedCalibration.accuracy.toFixed(1)}m. Precision arrow is armed.`}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-red-900/60 bg-red-950/30 flex items-start gap-3 text-xs text-red-200 font-mono">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-[#1F2228] bg-[#050608] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-[#1F2228] bg-[#0A0A0E] text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            {step === "SUCCESS" ? (isAr ? "إغلاق والبدء" : "Done") : (isAr ? "إلغاء" : "Cancel")}
          </button>

          {step !== "SUCCESS" ? (
            <button
              type="button"
              onClick={handlePerformCalibration}
              disabled={step === "CALIBRATING" || !liveGps}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-95"
            >
              <Zap className="w-4 h-4 text-black" />
              <span>
                {step === "CALIBRATING"
                  ? isAr
                    ? "جارٍ المعايرة..."
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{isAr ? "فتح شاشة البحث الدقيق (أين سيارتي؟)" : "Open Precision Finder"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
