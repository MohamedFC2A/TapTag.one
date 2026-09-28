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
} from "lucide-react";
import {
  SpatialCalibration,
  NavigationVector,
  KalmanAngleFilter,
  ExponentialFilter,
  computeNavigationVector,
  loadCalibrationLocally,
  saveCalibrationLocally,
  restartSpatialCalibrationLocally,
  getNaturalDirectionText,
  calculateApplePrecisionArc,
  playNavigationSound,
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

  // Live vector
  const [navVector, setNavVector] = useState<NavigationVector | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Filter refs
  const kalmanHeadingRef = useRef<KalmanAngleFilter>(new KalmanAngleFilter(0.08, 1.8));
  const distanceFilterRef = useRef<ExponentialFilter>(new ExponentialFilter(0.25));
  const watchIdRef = useRef<number | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const lastArrivalTriggerRef = useRef<boolean>(false);

  const vehiclePlate = selectedTag.profile?.vehiclePlate || selectedTag.tagUid;
  const vehicleMake = selectedTag.profile?.vehicleMake || "المركبة";
  const vehicleModel = selectedTag.profile?.vehicleModel || "";

  // 1. Indestructible Local-First Load + Cloud Fallback
  useEffect(() => {
    setIsLoadingPoint(true);
    const tagUid = selectedTag.tagUid;

    // A. Instant 0-delay load from localStorage
    const local = loadCalibrationLocally(tagUid);
    if (local) {
      setCalibration(local);
      setIsLoadingPoint(false);
      return;
    }

    // B. Fallback to Neon PostgreSQL if new device or empty storage
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
          saveCalibrationLocally(restored);
          setCalibration(restored);
        } else {
          setCalibration(null);
        }
      })
      .catch((err) => {
        console.warn("Neon fallback note:", err);
      })
      .finally(() => {
        setIsLoadingPoint(false);
      });
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

  // 2. High-Frequency Realtime 60fps Tracking Engine
  useEffect(() => {
    if (!calibration) return;

    requestOrientationPermission().catch(() => {});

    // A. Compass orientation listener (Android absolute + iOS webkit)
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
      win.addEventListener("deviceorientationabsolute", handleOrientation, true);
      win.addEventListener("deviceorientation", handleOrientation, true);
    }

    // B. Live Geolocation watchPosition
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
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

          // Arrival chime trigger once when entering <= 5.0m
          if (isWithinLockoutRange && !lastArrivalTriggerRef.current) {
            lastArrivalTriggerRef.current = true;
            if (soundEnabled) {
              playNavigationSound("lockout");
            }
          } else if (!isWithinLockoutRange) {
            lastArrivalTriggerRef.current = false;
          }

          setNavVector({
            ...rawVector,
            distanceMeters: smoothedDistance,
            isWithinLockoutRange,
            isBeyondActiveRange: smoothedDistance > 5.0,
          });
        },
        (err) => {
          console.warn("GPS watch position error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
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
  }, [calibration, soundEnabled]);

  // Handle Protected Restart
  const handleConfirmRestart = async () => {
    setShowRestartConfirm(false);
    restartSpatialCalibrationLocally(selectedTag.tagUid);
    setCalibration(null);
    setNavVector(null);

    // Delete in Neon cloud asynchronously
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
      className={`relative h-screen h-[100dvh] w-full overflow-hidden select-none flex flex-col justify-between transition-colors duration-500 font-sans ${
        isCloseRange ? "bg-[#19C354] text-white" : "bg-[#000000] text-white"
      }`}
    >
      {/* 1. Header: FINDING + Vehicle identifier */}
      <header className="pt-8 px-6 z-20 flex items-start justify-between">
        <div>
          <div
            className={`text-xs font-mono tracking-widest uppercase font-semibold ${
              isCloseRange ? "text-white/80" : "text-[#8E8E93]"
            }`}
          >
            تحديد موقع
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {vehiclePlate}
          </h1>
          <div
            className={`text-xs font-medium ${
              isCloseRange ? "text-white/85" : "text-zinc-400"
            }`}
          >
            {vehicleMake} {vehicleModel}
          </div>
        </div>

        {/* Vehicle Switcher if multiple */}
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
              className={`text-xs rounded-full px-3 py-1.5 pr-7 appearance-none font-medium focus:outline-none border ${
                isCloseRange
                  ? "bg-black/20 border-white/30 text-white"
                  : "bg-[#1A1A1A] border-[#2A2A2A] text-zinc-300"
              }`}
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
                يرجى تسجيل موقف سيارتك لمرة واحدة فقط للبدء في استخدام الملاحة الفضائية بدقة 1 متر.
              </p>
            </div>
            <Link
              href={`/dashboard/calibrate?tag=${selectedTag.tagUid}`}
              className="inline-flex items-center justify-center w-full py-3 rounded-full bg-white text-black font-black text-xs hover:bg-zinc-200 transition-colors shadow-lg"
            >
              بدء المعايرة الآن (0 تأخير)
            </Link>
          </div>
        ) : isCloseRange ? (
          /* CLOSE RANGE (< 5.0m) - Apple Vibrant Green Screen with Precision Forward Arrow & Target Dot */
          <div className="flex flex-col items-center justify-center relative w-full">
            <div className="relative flex flex-col items-center justify-center">
              {/* Solid Precision White Target Dot */}
              <div className="w-6 h-6 rounded-full bg-white shadow-xl animate-pulse mb-6" />

              {/* Bold Precision Forward Arrow */}
              <svg
                width="140"
                height="140"
                viewBox="0 0 100 100"
                className="transition-transform duration-300 drop-shadow-md"
              >
                {/* Clean Apple Precision Find Arrow Shape */}
                <path
                  d="M 50 15 L 82 58 C 84 61 82 65 78 64 L 56 57 L 56 85 C 56 88 53 90 50 90 C 47 90 44 88 44 85 L 44 57 L 22 64 C 18 65 16 61 18 58 Z"
                  fill="#FFFFFF"
                />
              </svg>
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
                {/* Pure Chevron Precision Arrow */}
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
        {calibration && navVector && (
          <div className="space-y-1">
            {/* Big Crisp Distance */}
            <div className="text-5xl font-black tracking-tight leading-none text-white">
              {navVector.distanceMeters.toFixed(1)}{" "}
              <span className="text-3xl font-bold opacity-80">م</span>
            </div>

            {/* Natural Language Direction */}
            <div
              className={`text-2xl font-bold leading-tight ${
                isCloseRange ? "text-white/95" : "text-[#A1A1AA]"
              }`}
            >
              {naturalDirection}
              {isCloseRange && (
                <span className="block text-xs font-semibold text-white/80 mt-1">
                  (أقل من 5 أمتار - انظر حولك في محيطك المباشر)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Controls Glass Bar */}
      <footer className="px-6 pb-8 pt-4 z-20 flex items-center justify-between">
        {/* Left: Circle Exit Button */}
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

        {/* Right: Sound / Haptic Toggle */}
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
          title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
        >
          {soundEnabled ? (
            <Volume2 className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <VolumeX className="w-6 h-6 stroke-[2.5] text-zinc-400" />
          )}
        </button>
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
