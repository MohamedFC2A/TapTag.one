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
import { getVehicleSpatialPointsHistory, SpatialPointRecord } from "@/app/actions/calibration-actions";
import { PrecisionAirTagArrow } from "./PrecisionAirTagArrow";
import { SpatialCalibrationModal } from "./SpatialCalibrationModal";
import {
  Compass,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Car,
  CheckCircle2,
  X,
  Play,
  Pause,
  MapPin,
  Clock,
  Sliders,
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
  const [pointsHistory, setPointsHistory] = useState<SpatialPointRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Simulation mode for testing
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simDistance, setSimDistance] = useState(18.5);
  const [simHeading, setSimHeading] = useState(0);
  const [isAutoWalking, setIsAutoWalking] = useState(false);

  // Smooth filters
  const kalmanHeadingRef = useRef<KalmanAngleFilter>(new KalmanAngleFilter(0.08, 1.8));
  const distanceFilterRef = useRef<ExponentialFilter>(new ExponentialFilter(0.25));
  const watchIdRef = useRef<number | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const lastArrivalTriggerRef = useRef<boolean>(false);

  // Load calibration instantly from localStorage (0ms latency, zero internet requirement)
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
        setIsCalibrationModalOpen(true);
        return;
      }
      setCalibration(existing);
    } else {
      // Prompt calibration if never calibrated
      setIsCalibrationModalOpen(true);
    }

    // Background fetch calibration points from Neon (fails gracefully if offline)
    getVehicleSpatialPointsHistory(tagUid)
      .then((res) => {
        if (res.success && res.points.length > 0) {
          setPointsHistory(res.points);
        }
      })
      .catch(() => {
        // Offline friendly: ignore network error
      });
  }, [tagUid, isOpen]);

  /**
   * Real-time GPS & True North orientation tracker
   */
  const startRealtimeTracking = useCallback(() => {
    if (!calibration) return;

    // 1. Compass listener
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

    // 2. High-accuracy GPS watcher
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

          // Threshold: <= 5.0 meters stops the arrow and triggers arrival feedback
          if (finalVector.isWithinLockoutRange) {
            if (!lastArrivalTriggerRef.current) {
              lastArrivalTriggerRef.current = true;
              playNavigationSound("lockout");
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate([100, 80, 100, 80, 200]);
              }
            }
          } else {
            lastArrivalTriggerRef.current = false;
          }
        },
        (err) => {
          console.warn("GPS watch warning:", err);
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
  }, [calibration]);

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
      const targetBearing = 42;
      const relativeBearing = ((targetBearing - simHeading + 540) % 360) - 180;
      const isDirectlyAligned = Math.abs(relativeBearing) <= 12;
      const isWithinLockoutRange = simDistance <= 5.0; // Cutoff at exactly 5 meters!
      const isBeyondActiveRange = simDistance > 5.0;

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

      if (isWithinLockoutRange) {
        if (!lastArrivalTriggerRef.current) {
          lastArrivalTriggerRef.current = true;
          playNavigationSound("lockout");
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([100, 80, 100, 80, 200]);
          }
        }
      } else {
        lastArrivalTriggerRef.current = false;
      }
    }
  }, [isOpen, isSimulationMode, simDistance, simHeading]);

  // Auto-walk step timer in simulation
  useEffect(() => {
    if (!isAutoWalking || !isSimulationMode) return;

    const interval = setInterval(() => {
      setSimDistance((prev) => {
        if (prev <= 3.5) {
          setIsAutoWalking(false);
          return 3.5;
        }
        playNavigationSound("tick");
        return Math.max(3.5, prev - 1.2);
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isAutoWalking, isSimulationMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#000000] text-white overflow-hidden select-none animate-in fade-in">
      {/* Mobile-First Header Bar (Neutral Monochrome) */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800 bg-[#0A0A0A] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold font-mono">
            TT
          </span>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">
              {isAr ? "تحديد موضع السيارة" : "Precision Vehicle Finder"}
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">
              {vehiclePlate} • {vehicleMake} {vehicleModel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Recalibrate Button */}
          <button
            onClick={() => setIsCalibrationModalOpen(true)}
            className="w-8 h-8 rounded-lg border border-zinc-800 bg-[#141414] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            title={isAr ? "إعادة المعايرة" : "Recalibrate"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-zinc-800 bg-[#141414] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-between max-w-lg w-full mx-auto space-y-4">
        {/* CASE 1: UNCALIBRATED STATE */}
        {!calibration && (
          <div className="w-full text-center space-y-4 py-8">
            <div className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center mx-auto text-zinc-300">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? "يلزم معايرة موضع السيارة أولاً" : "Vehicle Stance Calibration Required"}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                {isAr
                  ? "قف بجوار باب السائق (يسار السيارة) واضغط زر المعايرة لالتقاط إحداثيات GPS الحقيقية وحفظها سحابياً."
                  : "Stand beside driver door and tap Calibrate to lock genuine coordinates."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCalibrationModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>{isAr ? "معايرة موضع السيارة الآن" : "Calibrate Stance Now"}</span>
            </button>
          </div>
        )}

        {/* EXTREME DISTANCE WARNING (> 1500m) */}
        {calibration && navVector && navVector.distanceMeters > 1500 && (
          <div className="w-full p-3.5 rounded-xl border border-zinc-800 bg-[#121212] text-xs text-zinc-200 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  {isAr ? "المسافة بعيدة جداً عن موقع المعايرة!" : "Distance is very far from calibration point"}
                </span>
                <span className="text-[11px] text-zinc-400 leading-tight block mt-0.5">
                  {isAr
                    ? `المسافة الحالية ${(navVector.distanceMeters / 1000).toFixed(1)} كم. يرجى إعادة المعايرة بجوار السيارة لتحديث الموقع.`
                    : `Current distance is ${(navVector.distanceMeters / 1000).toFixed(1)} km. Recalibrate beside car to update.`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCalibrationModalOpen(true)}
              className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
            >
              {isAr ? "إعادة المعايرة في موقعي الآن" : "Recalibrate At My Location"}
            </button>
          </div>
        )}

        {/* ACTIVE PRECISION AIRTAG ARROW OR 5M TARGET DOT */}
        {calibration && navVector && (
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            <PrecisionAirTagArrow
              navVector={navVector}
              vehiclePlate={vehiclePlate}
              vehicleMake={vehicleMake}
              vehicleModel={vehicleModel}
              lang={lang}
            />
          </div>
        )}

        {/* Calibration Points History Accordion / Toggle */}
        {calibration && (
          <div className="w-full border-t border-zinc-900 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {isAr ? "نقاط المعايرة المسجلة سحابياً" : "Saved Calibration Points"}
                </span>
              </button>

              <span className="text-[11px] font-mono text-zinc-500">
                {calibration.calibratedAt
                  ? new Date(calibration.calibratedAt).toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </span>
            </div>

            {/* Expanded Points List */}
            {showHistory && (
              <div className="p-3 rounded-xl border border-zinc-800 bg-[#0A0A0A] space-y-2 text-xs font-mono animate-in fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">{isAr ? "الموضع النشط:" : "Active Point:"}</span>
                  <span className="font-bold text-white">
                    {calibration.centroidLat.toFixed(5)}°, {calibration.centroidLng.toFixed(5)}°
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                  <span>{isAr ? "دقة المستشعر:" : "Accuracy:"}</span>
                  <span>±{calibration.accuracy.toFixed(1)}m</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                  <span>{isAr ? "إزاحة المركز:" : "Centroid Offset:"}</span>
                  <span>1.2m Lateral Centroid</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discrete Simulation / Test Walk Option */}
        <div className="w-full border-t border-zinc-900 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsSimulationMode(!isSimulationMode)}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Sliders className="w-3 h-3" />
              <span>{isAr ? "محاكي المسافة للاختبار" : "Distance Simulator"}</span>
            </button>

            {isSimulationMode && (
              <button
                type="button"
                onClick={() => setIsAutoWalking(!isAutoWalking)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 text-white text-[11px] font-mono transition-colors"
              >
                {isAutoWalking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isAutoWalking ? (isAr ? "إيقاف" : "Pause") : (isAr ? "محاكاة الاقتراب" : "Walk")}</span>
              </button>
            )}
          </div>

          {/* Simulation Controls */}
          {isSimulationMode && (
            <div className="p-2.5 rounded-lg border border-zinc-800 bg-[#0A0A0A] space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>{isAr ? "المسافة:" : "Distance:"}</span>
                <span className="text-white font-bold">{simDistance.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="35"
                step="0.5"
                value={simDistance}
                onChange={(e) => setSimDistance(parseFloat(e.target.value))}
                className="w-full accent-white h-1 bg-zinc-800 rounded cursor-pointer"
              />
            </div>
          )}
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
        }}
        lang={lang}
      />
    </div>
  );
}
