"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SpatialCalibration,
  NavigationVector,
  computeNavigationVector,
  loadCalibrationLocally,
  clearCalibrationLocally,
  KalmanAngleFilter,
  ExponentialFilter,
  playNavigationSound,
} from "@/lib/spatial-navigation";
import { PrecisionAirTagArrow } from "./PrecisionAirTagArrow";
import { SpatialCalibrationModal } from "./SpatialCalibrationModal";
import {
  Compass,
  Navigation,
  Sliders,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Footprints,
  Car,
  CheckCircle2,
  X,
  Play,
  Pause,
  Radio,
} from "lucide-react";

interface VehicleSpatialFinderProps {
  tagUid: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel?: string;
  vehicleColor?: string;
  isOpen: boolean;
  onClose: () => void;
  lang?: "ar" | "en";
}

export function VehicleSpatialFinder({
  tagUid,
  vehiclePlate,
  vehicleMake,
  vehicleModel = "Land Cruiser",
  vehicleColor = "White Pearl",
  isOpen,
  onClose,
  lang = "ar",
}: VehicleSpatialFinderProps) {
  const isAr = lang === "ar";

  const [calibration, setCalibration] = useState<SpatialCalibration | null>(null);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const [navVector, setNavVector] = useState<NavigationVector | null>(null);
  const [hasArrivedLockout, setHasArrivedLockout] = useState(false);
  const [isSensorActive, setIsSensorActive] = useState(false);
  const [sensorError, setSensorError] = useState<string>("");

  // Interactive Simulation / Testing mode
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simDistance, setSimDistance] = useState(18.5);
  const [simHeading, setSimHeading] = useState(0);
  const [isAutoWalking, setIsAutoWalking] = useState(false);

  // Filters for smooth motion
  const kalmanHeadingRef = useRef<KalmanAngleFilter>(new KalmanAngleFilter(0.08, 1.8));
  const distanceFilterRef = useRef<ExponentialFilter>(new ExponentialFilter(0.25));
  const watchIdRef = useRef<number | null>(null);
  const lastArrivalTriggerRef = useRef<boolean>(false);
  const currentHeadingRef = useRef<number>(0);

  // Check and load calibration from localStorage when mounted
  useEffect(() => {
    if (!tagUid || !isOpen) return;

    const existing = loadCalibrationLocally(tagUid);
    if (existing) {
      // Purge any corrupted Riyadh fallback coordinates (~24.7136, 46.6753)
      if (
        Math.abs(existing.rawLat - 24.7136) < 0.05 &&
        Math.abs(existing.rawLng - 46.6753) < 0.05
      ) {
        clearCalibrationLocally(tagUid);
        setCalibration(null);
        setIsCalibrationModalOpen(true); // Automatically open modal to get REAL coordinates
        return;
      }
      setCalibration(existing);
    } else {
      // If never calibrated, automatically open the calibration modal!
      setIsCalibrationModalOpen(true);
    }
  }, [tagUid, isOpen]);

  /**
   * Handle real-time device orientation & GPS tracking
   */
  const startRealtimeTracking = useCallback(() => {
    if (!calibration) return;

    setIsSensorActive(true);
    setSensorError("");

    // 1. Device Orientation Listener (Absolute on Android, webkitCompassHeading on iOS)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const eCompass = e as unknown as { webkitCompassHeading?: number };
      let rawHeading = 0;
      if (typeof eCompass.webkitCompassHeading === "number") {
        rawHeading = eCompass.webkitCompassHeading;
      } else if (e.alpha !== null) {
        rawHeading = (360 - e.alpha) % 360;
      }

      const smoothedHeading = kalmanHeadingRef.current.update(rawHeading);
      currentHeadingRef.current = smoothedHeading;

      setNavVector((prev) => {
        if (!prev) return null;
        const relativeBearing = ((prev.bearingToVehicle - smoothedHeading + 540) % 360) - 180;
        const isDirectlyAligned = Math.abs(relativeBearing) <= 12;

        if (isDirectlyAligned && !prev.isDirectlyAligned) {
          playNavigationSound("align");
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(30);
          }
        }

        return {
          ...prev,
          deviceHeading: smoothedHeading,
          relativeBearing,
          isDirectlyAligned,
        };
      });
    };

    if (typeof window !== "undefined") {
      const win = window as any;
      if ("ondeviceorientationabsolute" in win) {
        win.addEventListener("deviceorientationabsolute", handleOrientation);
      } else {
        win.addEventListener("deviceorientation", handleOrientation);
      }
    }

    // 2. Geolocation Watch Position
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy || 4.0;

          const rawVector = computeNavigationVector(
            lat,
            lng,
            currentHeadingRef.current,
            calibration,
            accuracy
          );

          const smoothedDistance = distanceFilterRef.current.update(rawVector.distanceMeters);

          const finalVector: NavigationVector = {
            ...rawVector,
            distanceMeters: smoothedDistance,
          };

          setNavVector(finalVector);

          // Check Anti-Disorientation Lockout threshold (<= 2.5 meters)
          if (finalVector.isWithinLockoutRange) {
            if (!lastArrivalTriggerRef.current) {
              lastArrivalTriggerRef.current = true;
              setHasArrivedLockout(true);
              playNavigationSound("lockout");
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate([100, 80, 100, 80, 200]);
              }
            }
          } else {
            lastArrivalTriggerRef.current = false;
            setHasArrivedLockout(false);
          }
        },
        (err) => {
          console.warn("Geolocation watch error:", err);
          setSensorError(
            isAr
              ? "تعذر الاتصال بالأقمار الصناعية بدقة عالية في المكان الحالي. يمكنك تفعيل وضع المحاكاة للاختبار."
              : "GPS signal obstructed indoors. You may enable simulation mode to test."
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 20000,
        }
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
  }, [calibration, isAr]);

  // Trigger tracking when dialog opens and calibration is present
  useEffect(() => {
    if (isOpen && calibration && !isSimulationMode) {
      const cleanup = startRealtimeTracking();
      return cleanup;
    }
  }, [isOpen, calibration, isSimulationMode, startRealtimeTracking]);

  /**
   * Simulation loop for desktop & testing
   */
  useEffect(() => {
    if (!isOpen) return;

    if (isSimulationMode) {
      const targetBearing = 42; // arbitrary vehicle direction
      const relativeBearing = ((targetBearing - simHeading + 540) % 360) - 180;
      const isDirectlyAligned = Math.abs(relativeBearing) <= 12;
      const isWithinLockoutRange = simDistance <= 2.5;
      const isBeyondActiveRange = simDistance >= 5.0;

      const vector: NavigationVector = {
        distanceMeters: simDistance,
        bearingToVehicle: targetBearing,
        relativeBearing,
        deviceHeading: simHeading,
        confidencePercent: 96,
        isDirectlyAligned,
        isWithinLockoutRange,
        isBeyondActiveRange,
        accuracyRadius: 1.2,
      };

      setNavVector(vector);

      // Lockout trigger when reaching vehicle
      if (isWithinLockoutRange) {
        if (!lastArrivalTriggerRef.current) {
          lastArrivalTriggerRef.current = true;
          setHasArrivedLockout(true);
          playNavigationSound("lockout");
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([100, 80, 100, 80, 200]);
          }
        }
      } else {
        lastArrivalTriggerRef.current = false;
        setHasArrivedLockout(false);
      }
    }
  }, [isOpen, isSimulationMode, simDistance, simHeading]);

  // Auto-walk step simulation timer
  useEffect(() => {
    if (!isAutoWalking || !isSimulationMode) return;

    const interval = setInterval(() => {
      setSimDistance((prev) => {
        if (prev <= 2.0) {
          setIsAutoWalking(false);
          return 2.0;
        }
        playNavigationSound("tick");
        return Math.max(2.0, prev - 1.2);
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isAutoWalking, isSimulationMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg animate-in fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#1F2228] bg-[#000000] text-white shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
        {/* Navigation Modal Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1F2228] bg-[#060709]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853]">
              <Compass className="w-5 h-5 text-[#00C853]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
                  {isAr ? "نظام التوجيه الملاحي الفضائي" : "Spatial Precision Finder"}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#00C853]/40 bg-[#00C853]/10 text-[#00C853] font-bold">
                  ZERO-HARDWARE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                {isAr ? "محدد مكان السيارة فائق الدقة (Apple AirTag UI)" : "Zero-Hardware High-Precision Finder"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCalibrationModalOpen(true)}
              className="p-2 rounded-xl border border-[#1F2228] bg-[#0A0A0E] text-zinc-300 hover:text-white hover:border-[#00C853] transition-colors"
              title={isAr ? "إعادة المعايرة" : "Recalibrate"}
            >
              <RotateCcw className="w-4 h-4 text-[#00C853]" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-white hover:border-[#00C853] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-between space-y-5">
          {/* CASE 1: UNCALIBRATED STATE -> PROMPT TO CALIBRATE */}
          {!calibration && (
            <div className="w-full text-center space-y-5 py-6">
              <div className="w-16 h-16 rounded-full border border-[#00C853] bg-[#00C853]/10 flex items-center justify-center mx-auto text-[#00C853]">
                <Compass className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAr ? "يلزم معايرة موضع السيارة أولاً" : "Vehicle Calibration Required"}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  {isAr
                    ? "للبدء في تحديد مكان سيارتك بدقة، قف بجوار باب السائق (يسار السيارة) واضغط زر المعايرة لالتقاط إحداثيات GPS الحقيقية."
                    : "Stand beside driver door and tap Calibrate to capture genuine satellite coordinates."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCalibrationModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>{isAr ? "بدء المعايرة الفضائية للمركبة الآن" : "Calibrate Vehicle Stance Now"}</span>
              </button>
            </div>
          )}

          {/* EXTREME DISTANCE WARNING (> 1.5 km) */}
          {calibration && navVector && navVector.distanceMeters > 1500 && (
            <div className="w-full p-4 rounded-2xl border border-amber-900/80 bg-amber-950/40 text-xs text-amber-200 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">
                    {isAr ? "المسافة المقروءة بعيدة جداً عن موقع السيارة!" : "Extreme Distance Detected!"}
                  </h4>
                  <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                    {isAr
                      ? `المسافة الحالية (${(navVector.distanceMeters / 1000).toFixed(1)} كم). يبدو أن المعايرة تمت سابقاً بإحداثيات قديمة أو من مدينة أخرى. يرجى الضغط بالأسفل لإعادة المعايرة بإحداثيات مكانك الحالي فوراً.`
                      : `Distance is ${(navVector.distanceMeters / 1000).toFixed(1)} km. Please recalibrate with live coordinates beside car.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsCalibrationModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-400 bg-amber-400 text-black font-bold text-xs shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-black" />
                  <span>{isAr ? "إعادة المعايرة في مكاني الآن" : "Recalibrate At My Location"}</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: USER IS TOO CLOSE FOR 3D ARROW (> 2.5m and < 5m) */}
          {calibration && navVector && !navVector.isBeyondActiveRange && !hasArrivedLockout && (
            <div className="w-full text-center p-3.5 rounded-2xl border border-amber-900/60 bg-amber-950/20 text-xs text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center justify-center gap-1.5">
                <Footprints className="w-4 h-4 text-amber-400" />
                <span>
                  {isAr
                    ? `المسافة الحالية (${navVector.distanceMeters.toFixed(1)}م) — ابتعد 5 أمتار على الأقل لتفعيل السهم 3D`
                    : `Current distance (${navVector.distanceMeters.toFixed(1)}m) — Step at least 5m away for 3D arrow`}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 font-mono">
                {isAr
                  ? "يعمل السهم التوجيهي الذكي عندما تكون على بُعد 5 أمتار فأكثر من السيارة لتوجيهك بدقة متناهية."
                  : "Precision 3D arrow activates beyond 5 meters to guide you toward the vehicle."}
              </p>
            </div>
          )}

          {/* CASE 3: ANTI-DISORIENTATION LOCKOUT (User reached <= 2.5 meters) */}
          {hasArrivedLockout ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center text-center p-6 rounded-3xl border border-[#00C853]/60 bg-gradient-to-b from-[#00C853]/15 via-[#00C853]/5 to-black space-y-5 animate-in zoom-in-95">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-[#00C853] bg-black flex items-center justify-center text-[#00C853] shadow-2xl">
                  <CheckCircle2 className="w-12 h-12 text-[#00C853]" />
                </div>
                {/* Sonar Arrival Pulse */}
                <div className="absolute inset-0 rounded-full border border-[#00C853] animate-ping opacity-30" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#00C853] bg-[#00C853]/20 text-[#00C853] text-xs font-mono font-bold">
                  <span>{isAr ? "نطاق ملاصق (أقل من مترين)" : "Immediate Proximity (< 2m)"}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {isAr ? "وصلت للمركبة! انظر لمحيطك الآن بحثاً عنها" : "You have arrived! Look around your surroundings"}
                </h3>

                <p className="text-xs text-zinc-300 font-mono leading-relaxed max-w-sm mx-auto">
                  {isAr
                    ? "تم إغلاق السهم التوجيهي تلقائياً لمنع التشتت والاهتزاز. أنت الآن بجوار سيارتك مباشرة."
                    : "Guidance arrow locked out automatically to prevent disorientation. The vehicle is right beside you."}
                </p>
              </div>

              {/* Vehicle Identity Card */}
              <div className="w-full max-w-xs p-3.5 rounded-2xl border border-[#1F2228] bg-[#0A0A0E] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <Car className="w-4 h-4 text-[#00C853]" />
                  <div className="text-start">
                    <span className="text-white font-bold block">{vehiclePlate}</span>
                    <span className="text-[10px] text-zinc-400">{vehicleMake} {vehicleModel}</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded border border-[#00C853]/40 bg-black text-[#00C853] font-bold">
                  FOUND
                </span>
              </div>
            </div>
          ) : (
            /* CASE 4: ACTIVE 3D PRECISION ARROW VIEW (AirTag Style) */
            calibration &&
            navVector && (
              <PrecisionAirTagArrow
                navVector={navVector}
                vehiclePlate={vehiclePlate}
                vehicleMake={vehicleMake}
                vehicleModel={vehicleModel}
                lang={lang}
              />
            )
          )}

          {/* Interactive Simulation & Test Walk Bar */}
          <div className="w-full pt-4 border-t border-[#1F2228] space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsSimulationMode(!isSimulationMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  isSimulationMode
                    ? "border-[#00C853] bg-[#00C853]/15 text-[#00C853] font-bold"
                    : "border-[#1F2228] bg-[#0A0A0E] text-zinc-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isAr ? "وضع الاختبار والمحاكاة التجريبي" : "Simulation / Test Mode"}</span>
              </button>

              {isSimulationMode && (
                <button
                  type="button"
                  onClick={() => setIsAutoWalking(!isAutoWalking)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00C853] bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-mono font-bold transition-all shadow-md"
                >
                  {isAutoWalking ? <Pause className="w-3 h-3 text-black" /> : <Play className="w-3 h-3 text-black" />}
                  <span>{isAutoWalking ? (isAr ? "إيقاف السير" : "Pause") : (isAr ? "محاكاة المشي للسيارة" : "Simulate Walk")}</span>
                </button>
              )}
            </div>

            {/* Simulation Sliders (Only visible in Simulation mode) */}
            {isSimulationMode && (
              <div className="p-3 rounded-xl border border-[#1F2228] bg-[#08080A] space-y-2.5 animate-in fade-in text-xs font-mono">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-300 text-[11px]">
                    <span>{isAr ? "محاكاة المسافة:" : "Simulate Distance:"}</span>
                    <span className="text-[#00C853] font-bold">{simDistance.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="60"
                    step="0.5"
                    value={simDistance}
                    onChange={(e) => setSimDistance(parseFloat(e.target.value))}
                    className="w-full accent-[#00C853] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-300 text-[11px]">
                    <span>{isAr ? "تدوير زاوية الجوال:" : "Simulate Phone Rotation:"}</span>
                    <span className="text-[#00C853] font-bold">{simHeading}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={simHeading}
                    onChange={(e) => setSimHeading(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00C853] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spatial Calibration Modal */}
      <SpatialCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        tagUid={tagUid}
        vehiclePlate={vehiclePlate}
        vehicleMake={vehicleMake}
        vehicleModel={vehicleModel}
        vehicleColor={vehicleColor}
        onCalibrationSaved={(cal) => {
          setCalibration(cal);
          setIsCalibrationModalOpen(false);
          setHasArrivedLockout(false);
        }}
        lang={lang}
      />
    </div>
  );
}
