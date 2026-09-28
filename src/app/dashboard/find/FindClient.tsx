"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Compass,
  AlertTriangle,
  ChevronDown,
  Navigation,
  Radio,
  CarFront,
  Check,
} from "lucide-react";
import {
  SpatialCalibration,
  NavigationVector,
  KalmanAngleFilter,
  ExponentialFilter,
  computeNavigationVector,
  computeTiltCompensatedHeading,
  loadCalibrationLocally,
  saveCalibrationLocally,
  restartSpatialCalibrationLocally,
  getNaturalDirectionText,
  calculateApplePrecisionArc,
  playNavigationSound,
  formatCalibrationDateTime,
  getRelativeTimeArabic,
} from "@/lib/spatial-navigation";
import {
  getLatestVehicleSpatialPoint,
  deleteVehicleSpatialCalibration,
} from "@/app/actions/calibration-actions";

interface TagItem {
  id: string;
  tagUid: string;
  profile: {
    vehiclePlate: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor?: string;
  } | null;
}

interface FindClientProps {
  activeTag: TagItem;
  allTags: TagItem[];
}

export function FindClient({ activeTag: initialTag, allTags }: FindClientProps) {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<TagItem>(initialTag);
  const [calibration, setCalibration] = useState<SpatialCalibration | null>(null);
  const [isLoadingPoint, setIsLoadingPoint] = useState(true);
  const [liveFindRelativeTime, setLiveFindRelativeTime] = useState<string>("");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Live vector
  const [navVector, setNavVector] = useState<NavigationVector | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Filter & Sensor refs (tuned for instantaneous responsiveness & zero lag)
  const kalmanHeadingRef = useRef<KalmanAngleFilter>(new KalmanAngleFilter(0.08, 0.6));
  const distanceFilterRef = useRef<ExponentialFilter>(new ExponentialFilter(0.5));
  const watchIdRef = useRef<number | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const lastArrivalTriggerRef = useRef<boolean>(false);
  const lastSonarPingTimeRef = useRef<number>(0);

  const vehiclePlate = selectedTag.profile?.vehiclePlate || selectedTag.tagUid;
  const vehicleMake = selectedTag.profile?.vehicleMake || "المركبة";
  const vehicleModel = selectedTag.profile?.vehicleModel || "";

  // 1. Instant Local-First Load + Cloud Dynamic Synchronization
  useEffect(() => {
    if (!isMounted) return;
    setIsLoadingPoint(true);
    const tagUid = selectedTag.tagUid;

    // A. Instant 0-delay load from localStorage
    const local = loadCalibrationLocally(tagUid);
    if (local) {
      setCalibration(local);
      setIsLoadingPoint(false);
    }

    // B. Check Cloud Database in parallel to sync any newer point
    getLatestVehicleSpatialPoint(tagUid)
      .then((res) => {
        if (res.success && res.point) {
          const restored: SpatialCalibration = {
            tagUid: res.point.tagUid,
            vehiclePlate,
            vehicleMake,
            vehicleModel,
            calibratedAt: res.point.createdAt,
            rawLat: res.point.rawLat,
            rawLng: res.point.rawLng,
            userHeading: res.point.userHeading,
            accuracy: res.point.accuracy,
            centroidLat: res.point.centroidLat,
            centroidLng: res.point.centroidLng,
            offsetDistanceMeters: res.point.offsetDistanceMeters,
          };
          if (!local || new Date(res.point.createdAt).getTime() > new Date(local.calibratedAt).getTime()) {
            saveCalibrationLocally(restored);
            setCalibration(restored);
          }
        } else if (!local) {
          setCalibration(null);
        }
      })
      .catch((err) => {
        console.warn("Cloud fallback note:", err);
      })
      .finally(() => {
        setIsLoadingPoint(false);
      });
  }, [isMounted, selectedTag.tagUid, vehiclePlate, vehicleMake, vehicleModel]);

  // Live dynamic relative time update for the calibrated vehicle stance
  useEffect(() => {
    if (!calibration?.calibratedAt) {
      setLiveFindRelativeTime("");
      return;
    }
    const update = () => {
      setLiveFindRelativeTime(getRelativeTimeArabic(calibration.calibratedAt));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [calibration?.calibratedAt]);

  // QA and Instant Preview Modes (?test=far or ?test=close)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const testMode = params.get("test");
    if (testMode === "close") {
      setNavVector({
        distanceMeters: 3.2,
        bearingToVehicle: 0,
        relativeBearing: 0,
        deviceHeading: 0,
        confidencePercent: 96,
        isDirectlyAligned: true,
        isWithinLockoutRange: true,
        isBeyondActiveRange: false,
        accuracyRadius: 1.5,
      });
      setCalibration((prev) => prev || {
        tagUid: selectedTag.tagUid,
        vehiclePlate,
        vehicleMake,
        vehicleModel,
        calibratedAt: new Date().toISOString(),
        rawLat: 24.7136,
        rawLng: 46.6753,
        userHeading: 0,
        accuracy: 2.0,
        centroidLat: 24.7136,
        centroidLng: 46.6753,
        offsetDistanceMeters: 1.2,
      });
    } else if (testMode === "far") {
      setNavVector({
        distanceMeters: 14.5,
        bearingToVehicle: 55,
        relativeBearing: 55,
        deviceHeading: 0,
        confidencePercent: 94,
        isDirectlyAligned: false,
        isWithinLockoutRange: false,
        isBeyondActiveRange: true,
        accuracyRadius: 2.5,
      });
      setCalibration((prev) => prev || {
        tagUid: selectedTag.tagUid,
        vehiclePlate,
        vehicleMake,
        vehicleModel,
        calibratedAt: new Date().toISOString(),
        rawLat: 24.7136,
        rawLng: 46.6753,
        userHeading: 0,
        accuracy: 2.0,
        centroidLat: 24.7136,
        centroidLng: 46.6753,
        offsetDistanceMeters: 1.2,
      });
    }
  }, [selectedTag.tagUid, vehiclePlate, vehicleMake, vehicleModel]);

  // Request compass permission (iOS 13+)
  const requestOrientationPermission = async () => {
    if (
      typeof window !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        return response === "granted";
      } catch {
        return false;
      }
    }
    return true;
  };

  // 2. High-Frequency Realtime 60fps Tracking Engine with 3D Tilt Compensation
  useEffect(() => {
    if (!calibration) return;

    requestOrientationPermission().catch(() => {});

    // A. Compass orientation listener with absolute priority & 3D Tilt Compensation
    let usingAbsolute = false;
    const handleOrientation = (e: DeviceOrientationEvent, isAbsoluteEvent: boolean) => {
      let rawHeading: number | null = null;
      const eCompass = e as unknown as { webkitCompassHeading?: number };

      if (typeof eCompass.webkitCompassHeading === "number" && !isNaN(eCompass.webkitCompassHeading)) {
        // iOS Safari hardware-calibrated heading
        rawHeading = eCompass.webkitCompassHeading;
      } else if (e.alpha !== null && !isNaN(e.alpha)) {
        // Android: prioritize deviceorientationabsolute
        if (isAbsoluteEvent || e.absolute) {
          usingAbsolute = true;
        } else if (usingAbsolute) {
          return; // Ignore relative orientation events if absolute is already streaming
        }
        const b = typeof e.beta === "number" ? e.beta : 0;
        const g = typeof e.gamma === "number" ? e.gamma : 0;
        rawHeading = computeTiltCompensatedHeading(e.alpha, b, g);
      }

      if (rawHeading === null) return;

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

    const onAbsolute = (e: DeviceOrientationEvent) => handleOrientation(e, true);
    const onStandard = (e: DeviceOrientationEvent) => handleOrientation(e, false);

    if (typeof window !== "undefined") {
      const win = window as any;
      if ("ondeviceorientationabsolute" in win) {
        win.addEventListener("deviceorientationabsolute", onAbsolute, true);
      }
      win.addEventListener("deviceorientation", onStandard, true);
    }

    // B. Live Geolocation with dual-feed: watchPosition + high-frequency active poll
    const handleGpsPosition = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      const rawVector = computeNavigationVector(
        lat,
        lng,
        currentHeadingRef.current,
        calibration,
        accuracy
      );

      const smoothedDistance = distanceFilterRef.current.update(rawVector.distanceMeters);
      const isWithinLockoutRange = smoothedDistance <= 5.0;

      // Proximity Sonar & Arrival Chime Engine
      const now = Date.now();
      if (isWithinLockoutRange) {
        // Arrival in Close-Range (<= 5.0m): Play Apple Pay arrival chime and vibrate
        if (!lastArrivalTriggerRef.current) {
          lastArrivalTriggerRef.current = true;
          if (soundEnabled) {
            playNavigationSound("apple_pay_arrival");
          }
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([100, 50, 100]);
            } catch {}
          }
        }
      } else {
        lastArrivalTriggerRef.current = false;

        // Proximity Sonar: Frequency escalates as user approaches
        if (soundEnabled && smoothedDistance <= 25.0) {
          let sonarInterval = 2500;
          let pitchMod = 0.9;

          if (smoothedDistance <= 10.0) {
            sonarInterval = 750; // High rate when 5-10m
            pitchMod = 1.6;
          } else if (smoothedDistance <= 18.0) {
            sonarInterval = 1400; // Medium rate when 10-18m
            pitchMod = 1.2;
          }

          if (now - lastSonarPingTimeRef.current >= sonarInterval) {
            lastSonarPingTimeRef.current = now;
            playNavigationSound("sonar_ping", pitchMod);
          }
        }
      }

      setNavVector({
        ...rawVector,
        distanceMeters: smoothedDistance,
        isWithinLockoutRange,
        isBeyondActiveRange: smoothedDistance > 5.0,
      });
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleGpsPosition,
        (err) => {
          console.warn("GPS watch position note:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
        }
      );
    }

    // Active continuous poll every 1200ms to eliminate Android background GPS stalls
    let gpsPollInterval: NodeJS.Timeout | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      gpsPollInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          handleGpsPosition,
          () => {},
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 2500,
          }
        );
      }, 1200);
    }

    return () => {
      if (typeof window !== "undefined") {
        const win = window as any;
        win.removeEventListener("deviceorientationabsolute", onAbsolute);
        win.removeEventListener("deviceorientation", onStandard);
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (gpsPollInterval) {
        clearInterval(gpsPollInterval);
      }
    };
  }, [calibration, soundEnabled]);

  // Handle Protected Restart
  const handleConfirmRestart = async () => {
    setShowRestartConfirm(false);
    restartSpatialCalibrationLocally(selectedTag.tagUid);
    setCalibration(null);
    setNavVector(null);

    // Delete in Cloud asynchronously
    deleteVehicleSpatialCalibration(selectedTag.tagUid).catch(() => {});

    // Redirect to calibrate page
    router.push(`/dashboard/calibrate?tag=${selectedTag.tagUid}`);
  };

  // Compute UI parameters
  const isCloseRange = navVector ? navVector.distanceMeters <= 5.0 : false;
  const relativeBearing = navVector ? navVector.relativeBearing : 0;
  const naturalDirection = navVector
    ? isCloseRange
      ? "أمامك مباشرة"
      : getNaturalDirectionText(relativeBearing, true)
    : "جاري الحساب...";

  // Dynamic circular arc geometry matching Apple Find My
  const arcGeometry = calculateApplePrecisionArc(relativeBearing, 130, 160, 160);

  return (
    <div
      dir="rtl"
      className="relative h-screen h-[100dvh] w-full overflow-hidden select-none flex flex-col justify-between font-sans bg-[#000000] text-white"
    >
      {/* 1. Header: FINDING + Vehicle identifier (Filtered for Real Vehicles) */}
      <header className="pt-8 px-6 z-20 flex items-start justify-between">
        <div>
          <div className="text-xs font-mono tracking-widest uppercase font-semibold text-[#8E8E93]">
            تحديد موقع
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {vehiclePlate}
          </h1>
          <div className="text-xs font-medium text-zinc-400">
            {vehicleMake} {vehicleModel}
          </div>
          {isMounted && calibration && (
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
              <span>موقف مثبت: {formatCalibrationDateTime(calibration.calibratedAt).fullFormatted}</span>
              {liveFindRelativeTime && (
                <span className="text-[#00C853] font-sans">({liveFindRelativeTime})</span>
              )}
            </div>
          )}
        </div>

        {/* Vehicle Switcher (Only Valid Registered Vehicles) */}
        {allTags.length > 1 && (
          <div className="relative">
            <select
              value={selectedTag.tagUid}
              onChange={(e) => {
                const found = allTags.find((t) => t.tagUid === e.target.value);
                if (found) {
                  setSelectedTag(found);
                  setNavVector(null);
                }
              }}
              className="text-xs rounded-full px-3 py-1.5 pr-7 appearance-none font-medium focus:outline-none border bg-[#1A1A1A] border-[#2A2A2A] text-zinc-300"
            >
              {allTags.map((t) => (
                <option key={t.id} value={t.tagUid} className="bg-black text-white">
                  {t.profile?.vehiclePlate || t.tagUid}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-300 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </header>

      {/* 2. Central Apple Precision Compass Graphic */}
      <div className="flex-1 flex items-center justify-center relative px-4">
        {isLoadingPoint ? (
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <div className="w-10 h-10 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            <span className="text-xs font-mono">جاري قراءة نقطة المعايرة...</span>
          </div>
        ) : !calibration ? (
          /* Not Calibrated State */
          <div className="text-center max-w-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#222222] mx-auto flex items-center justify-center text-zinc-400">
              <Compass className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">المركبة غير معايرة بعد</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                يرجى تثبيت موقف سيارتك عبر إجراء المعايرة الفضائية (7 ثوانٍ) للبدء في استخدام الملاحة بدقة فائقة.
              </p>
            </div>
            <Link
              href={`/dashboard/calibrate?tag=${selectedTag.tagUid}`}
              className="inline-flex items-center justify-center w-full py-3 rounded-full bg-white text-black font-black text-xs hover:bg-zinc-200 transition-colors shadow-lg"
            >
              بدء المعايرة الفضائية الآن
            </Link>
          </div>
        ) : isCloseRange ? (
          /* CLOSE RANGE (<= 5.0m) - Smart Precision Concentric Pulse Circle & Bullseye Target */
          <div className="flex flex-col items-center justify-center relative w-full select-none animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex items-center justify-center w-[280px] h-[280px]">
              {/* Layer 1: Expanding Ripple Waves (Radar Pulse) */}
              <div className="absolute inset-0 rounded-full border border-[#00C853]/35 animate-ping duration-1000 pointer-events-none" />
              <div
                className="absolute inset-6 rounded-full border border-white/20 animate-ping pointer-events-none"
                style={{ animationDuration: "2.2s", animationDelay: "0.6s" }}
              />

              {/* Layer 2: Concentric Radar Rings */}
              <div className="absolute w-[260px] h-[260px] rounded-full border border-zinc-800/80 bg-zinc-950/50 backdrop-blur-sm" />
              <div className="absolute w-[185px] h-[185px] rounded-full border border-zinc-700/60 border-dashed" />
              <div className="absolute w-[120px] h-[120px] rounded-full border border-[#00C853]/40 bg-[#00C853]/5" />

              {/* Layer 3: Dynamic Pulsing Core Target with Car Icon */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-white to-zinc-200 text-black flex flex-col items-center justify-center shadow-[0_0_35px_rgba(255,255,255,0.4)] animate-pulse">
                <CarFront className="w-9 h-9 text-black fill-black/10 stroke-[2.2]" />
              </div>

              {/* Layer 4: Orbital Precision Ticks */}
              <div className="absolute top-2.5 w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              <div className="absolute bottom-2.5 w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              <div className="absolute left-2.5 w-1.5 h-1.5 rounded-full bg-[#00C853]" />
              <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            </div>

            {/* Arrival Badge */}
            <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-[#00C853]/40 text-[#00C853] text-xs font-bold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[#00C853] animate-ping" />
              <span>أنت بجوار المركبة تماماً (هنا)</span>
            </div>
          </div>
        ) : (
          /* STANDARD RANGE (> 5.0m) - Dark Screen with White Arrow & Curved Arc Trajectory */
          <div className="relative flex items-center justify-center w-[320px] h-[320px]">
            {/* SVG Arc Trajectory Track */}
            <svg
              width="320"
              height="320"
              viewBox="0 0 320 320"
              className="absolute inset-0 pointer-events-none"
            >
              {arcGeometry.isVisible && (
                <>
                  {/* Outer Orbit Arc Path */}
                  <path
                    d={arcGeometry.pathD}
                    fill="none"
                    stroke="#505055"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-75 transition-all duration-200"
                  />
                  {/* Origin Dot */}
                  <circle
                    cx={arcGeometry.startDot.x}
                    cy={arcGeometry.startDot.y}
                    r="4"
                    fill="#6A6A70"
                  />
                  {/* Moving Target Dot */}
                  <circle
                    cx={arcGeometry.endDot.x}
                    cy={arcGeometry.endDot.y}
                    r="6.5"
                    fill="#FFFFFF"
                    className="drop-shadow-sm"
                  />
                </>
              )}
            </svg>

            {/* Precision Bold White Arrow */}
            <div
              className="transition-transform duration-200 ease-out will-change-transform flex items-center justify-center"
              style={{
                transform: `rotate(${relativeBearing}deg)`,
              }}
            >
              <svg
                width="160"
                height="160"
                viewBox="0 0 100 100"
                className="drop-shadow-lg"
              >
                <path
                  d="M 50 12 L 84 56 C 86 59 84 63 80 62 L 57 55 L 57 88 C 57 91 54 93 50 93 C 46 93 43 91 43 88 L 43 55 L 20 62 C 16 63 14 59 16 56 Z"
                  fill="#FFFFFF"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Metric Telemetry (Distance & Natural Language Direction) */}
      <div className="px-6 pb-2 z-20">
        {calibration && navVector ? (
          <div className="space-y-1">
            {/* Big Crisp Distance */}
            <div className="text-5xl font-black tracking-tight leading-none text-white flex items-baseline gap-2">
              {isCloseRange ? (
                <>
                  <span className="text-[#00C853]">هنا</span>
                  <span className="text-2xl font-mono text-zinc-400 font-normal">
                    (± {navVector.distanceMeters.toFixed(1)} م)
                  </span>
                </>
              ) : (
                <>
                  <span>{navVector.distanceMeters.toFixed(1)}</span>
                  <span className="text-3xl font-bold opacity-80">م</span>
                </>
              )}
            </div>

            {/* Natural Language Direction */}
            <div className="text-2xl font-bold leading-tight text-[#A1A1AA]">
              {isCloseRange ? (
                <span className="text-white font-extrabold flex items-center gap-2">
                  <span>وصلت لموقع سيارتك</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00C853]/20 text-[#00C853] font-mono font-bold">
                    نطاق مباشر
                  </span>
                </span>
              ) : (
                naturalDirection
              )}
              {isCloseRange && (
                <span className="block text-xs font-semibold text-zinc-400 mt-1">
                  السيارة في محيطك الفوري المباشر (أقل من 5 أمتار)
                </span>
              )}
            </div>
          </div>
        ) : calibration && !navVector ? (
          <div className="flex items-center gap-2.5 py-2 text-zinc-400 text-sm font-medium">
            <Radio className="w-4 h-4 text-amber-400 animate-spin" />
            <span>جاري الاتصال بالأقمار الصناعية وحساب المسافة...</span>
          </div>
        ) : null}
      </div>

      {/* 4. Bottom Controls Glass Bar */}
      <footer className="px-6 pb-8 pt-4 z-20 flex items-center justify-between">
        {/* Left: Sound / Proximity Sonar Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            if (next) playNavigationSound("tick");
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
            isCloseRange
              ? "bg-black/25 text-white backdrop-blur-md"
              : "bg-[#1C1C1E] text-white hover:bg-[#2C2C2E]"
          }`}
          title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت والسونار"}
        >
          {soundEnabled ? (
            <Volume2 className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <VolumeX className="w-6 h-6 stroke-[2.5] text-zinc-400" />
          )}
        </button>

        {/* Center: Protected Restart Button */}
        {calibration && (
          <button
            type="button"
            onClick={() => setShowRestartConfirm(true)}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              isCloseRange
                ? "bg-black/20 hover:bg-black/35 text-white backdrop-blur-md"
                : "bg-[#141416] hover:bg-[#222226] text-zinc-400 hover:text-white border border-[#26262B]"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط (Restart)</span>
          </button>
        )}

        {/* Right: Circle Exit Button */}
        <Link
          href="/dashboard"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
            isCloseRange
              ? "bg-black/25 text-white backdrop-blur-md"
              : "bg-[#1C1C1E] text-white hover:bg-[#2C2C2E]"
          }`}
          title="العودة للوحة التحكم"
        >
          <X className="w-6 h-6 stroke-[2.5]" />
        </Link>
      </footer>

      {/* Confirmation Dialog for Irreversible Restart */}
      {showRestartConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#2A2A2E] rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-900/60 mx-auto flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">إعادة ضبط نقطة المعايرة؟</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف نقطة المعايرة الحالية؟ لن يتم حذفها إلا بموافقتك، وسيتعين عليك إعادة الوقوف بجانب المركبة لمعايرتها مجدداً.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRestartConfirm(false)}
                className="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmRestart}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg transition-colors"
              >
                تأكيد إعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
