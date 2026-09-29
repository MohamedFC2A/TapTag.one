"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Compass,
  CheckCircle2,
  AlertCircle,
  Radio,
  RotateCw,
  Navigation2,
  ChevronDown,
  Timer,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { IsometricStanceDiagram } from "@/components/navigation/IsometricStanceDiagram";
import {
  SpatialCalibration,
  computeVehicleCentroid,
  computeTiltCompensatedHeading,
  computeWeightedGNSSCentroid,
  saveCalibrationLocally,
  loadCalibrationLocally,
  playNavigationSound,
  formatCalibrationDateTime,
  getRelativeTimeArabic,
} from "@/lib/spatial-navigation";
import {
  saveVehicleSpatialCalibration,
  getLatestVehicleSpatialPoint,
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

interface CalibrateClientProps {
  activeTag: TagItem;
  allTags: TagItem[];
}

export function CalibrateClient({ activeTag: initialTag, allTags }: CalibrateClientProps) {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<TagItem>(initialTag);
  const [existingCalibration, setExistingCalibration] = useState<SpatialCalibration | null>(null);
  const [isReCalibrating, setIsReCalibrating] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Live dynamic relative time state (e.g. "الآن (منذ لحظات)", "منذ دقيقة", etc.)
  const [liveRelativeTime, setLiveRelativeTime] = useState<string>("");

  // States: IDLE, SAMPLING (7 seconds multi-GNSS burst), SUCCESS, ERROR
  const [step, setStep] = useState<"IDLE" | "SAMPLING" | "SUCCESS" | "ERROR">("IDLE");
  const [countdown, setCountdown] = useState<number>(7);
  const [samplesCount, setSamplesCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGpsAcquiring, setIsGpsAcquiring] = useState(true);
  const [isWaitingForGpsLock, setIsWaitingForGpsLock] = useState(false);

  // Live sensor readings
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [hasCompassSupport, setHasCompassSupport] = useState<boolean>(true);

  const watchIdRef = useRef<number | null>(null);
  const samplesRef = useRef<Array<{ lat: number; lng: number; accuracy: number; heading: number }>>([]);
  const latestGpsRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);
  const latestHeadingRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const vehiclePlate = selectedTag.profile?.vehiclePlate || selectedTag.tagUid;
  const vehicleMake = selectedTag.profile?.vehicleMake || "المركبة";
  const vehicleModel = selectedTag.profile?.vehicleModel || "";

  const isSamplingRef = useRef<boolean>(false);
  const pendingGpsLockRef = useRef<boolean>(false);

  // 1. Check local storage and Neon Cloud database for existing calibration
  useEffect(() => {
    if (!isMounted) return;
    setIsReCalibrating(false);

    // A. Local-first 0-delay load
    const existing = loadCalibrationLocally(selectedTag.tagUid);
    if (existing) {
      setExistingCalibration(existing);
    }

    // B. Cloud synchronization
    getLatestVehicleSpatialPoint(selectedTag.tagUid)
      .then((res) => {
        if (res.success && res.point) {
          const cloudCal: SpatialCalibration = {
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
          if (!existing || new Date(res.point.createdAt).getTime() > new Date(existing.calibratedAt).getTime()) {
            setExistingCalibration(cloudCal);
            saveCalibrationLocally(cloudCal);
          }
        }
      })
      .catch((err) => {
        console.warn("Neon background check note:", err);
      });
  }, [isMounted, selectedTag.tagUid, vehiclePlate, vehicleMake, vehicleModel]);

  // 2. Live dynamic relative time loop (updates every 10s)
  useEffect(() => {
    if (!existingCalibration?.calibratedAt) {
      setLiveRelativeTime("");
      return;
    }
    const update = () => {
      setLiveRelativeTime(getRelativeTimeArabic(existingCalibration.calibratedAt));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [existingCalibration?.calibratedAt]);

  // 3. Isolated Component Unmount Timer Cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

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

  // Passive Live Sensors Acquisition with 3D Tilt-Compensation
  useEffect(() => {
    setIsGpsAcquiring(true);
    setErrorMessage("");

    let usingAbsolute = false;
    const handleOrientation = (e: DeviceOrientationEvent, isAbsoluteEvent: boolean) => {
      let heading: number | null = null;
      const eCompass = e as unknown as { webkitCompassHeading?: number };

      if (typeof eCompass.webkitCompassHeading === "number" && !isNaN(eCompass.webkitCompassHeading)) {
        heading = eCompass.webkitCompassHeading;
      } else if (e.alpha !== null && !isNaN(e.alpha)) {
        if (isAbsoluteEvent || e.absolute) {
          usingAbsolute = true;
        } else if (usingAbsolute) {
          return;
        }
        const b = typeof e.beta === "number" ? e.beta : 0;
        const g = typeof e.gamma === "number" ? e.gamma : 0;
        heading = computeTiltCompensatedHeading(e.alpha, b, g);
      } else {
        setHasCompassSupport(false);
        return;
      }

      setHasCompassSupport(true);
      const rounded = Math.round(heading);
      setCurrentHeading(rounded);
      latestHeadingRef.current = heading;
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

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setIsGpsAcquiring(false);
          const acc = pos.coords.accuracy;
          setCurrentAccuracy(acc);

          const sample = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: acc,
            altitude: pos.coords.altitude,
          };
          latestGpsRef.current = sample;

          // If user clicked start while GPS was still acquiring, begin now automatically
          if (pendingGpsLockRef.current) {
            pendingGpsLockRef.current = false;
            setIsWaitingForGpsLock(false);
            startBurstSamplingInternal(sample);
          } else if (isSamplingRef.current) {
            samplesRef.current.push({
              lat: sample.lat,
              lng: sample.lng,
              accuracy: sample.accuracy,
              heading: latestHeadingRef.current,
            });
            setSamplesCount(samplesRef.current.length);
          }
        },
        (err) => {
          setIsGpsAcquiring(false);
          if (err.code === 1) {
            setErrorMessage("صلاحية الوصول للموقع الجغرافي مرفوضة. يرجى تفعيل الموقع الدقيق من إعدادات المتصفح.");
          } else {
            setErrorMessage("تعذر التقاط إشارة الأقمار الصناعية. تأكد من تفعيل خدمة الموقع بدقة عالية.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000,
        }
      );
    } else {
      setIsGpsAcquiring(false);
      setErrorMessage("مستشعر GPS غير مدعوم في هذا المتصفح.");
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
    };
  }, [selectedTag.tagUid]);

  /**
   * Internal Sampling Burst Engine (Runs 7-second countdown reliably)
   */
  const startBurstSamplingInternal = (initialGps?: { lat: number; lng: number; accuracy: number }) => {
    const baseGps = initialGps || latestGpsRef.current;
    if (!baseGps) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    isSamplingRef.current = true;
    samplesRef.current = [
      {
        lat: baseGps.lat,
        lng: baseGps.lng,
        accuracy: baseGps.accuracy,
        heading: latestHeadingRef.current,
      },
    ];
    setSamplesCount(1);
    setCountdown(7);
    setStep("SAMPLING");
    playNavigationSound("tick");

    let remaining = 7;
    timerIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      playNavigationSound("tick");

      // Push latest reading in each tick as an additional multi-burst sample
      if (latestGpsRef.current) {
        samplesRef.current.push({
          lat: latestGpsRef.current.lat,
          lng: latestGpsRef.current.lng,
          accuracy: latestGpsRef.current.accuracy,
          heading: latestHeadingRef.current,
        });
        setSamplesCount(samplesRef.current.length);
      }

      if (remaining <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        isSamplingRef.current = false;
        finalizeMultiGNSSCalibration();
      }
    }, 1000);
  };

  /**
   * Start 7-Second High-Precision Multi-GNSS Sampling Engine
   */
  const handleStartTimedCalibration = async () => {
    setErrorMessage("");

    try {
      await requestOrientationPermission();
    } catch {
      // Continue
    }

    if (!latestGpsRef.current) {
      // Auto-wait for GPS lock instead of failing with an error
      setIsWaitingForGpsLock(true);
      pendingGpsLockRef.current = true;
      return;
    }

    startBurstSamplingInternal();
  };

  /**
   * Finalize Weighted Centroid & Save
   */
  const finalizeMultiGNSSCalibration = () => {
    try {
      const samples = samplesRef.current;
      if (samples.length === 0) {
        throw new Error("لم يتم تجميع عينات كافية");
      }

      // Compute weighted inverse-variance centroid
      const { avgLat, avgLng, avgAccuracy, avgHeading } = computeWeightedGNSSCentroid(samples);

      // Shift to vehicle true centroid (1.2m offset to the right from driver stance)
      const { centroidLat, centroidLng } = computeVehicleCentroid(
        avgLat,
        avgLng,
        avgHeading,
        1.2
      );

      const calibration: SpatialCalibration = {
        tagUid: selectedTag.tagUid,
        vehiclePlate,
        vehicleMake,
        vehicleModel,
        calibratedAt: new Date().toISOString(),
        rawLat: avgLat,
        rawLng: avgLng,
        userHeading: avgHeading,
        accuracy: avgAccuracy,
        centroidLat,
        centroidLng,
        offsetDistanceMeters: 1.2,
      };

      // 1. Instant 0-Delay Local-First Persistence
      saveCalibrationLocally(calibration);
      setExistingCalibration(calibration);
      playNavigationSound("calibrate_complete");
      setStep("SUCCESS");

      // 2. Background Sync to Cloud Database (Non-blocking)
      saveVehicleSpatialCalibration({
        tagUid: selectedTag.tagUid,
        deviceId: "verified_owner",
        rawLat: avgLat,
        rawLng: avgLng,
        userHeading: avgHeading,
        accuracy: avgAccuracy,
        centroidLat,
        centroidLng,
        offsetDistanceMeters: 1.2,
      }).catch((err) => {
        console.warn("Cloud background sync note:", err);
      });
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء معالجة عينات الأقمار الصناعية.");
      setStep("ERROR");
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] bg-[#000000] text-white flex flex-col font-sans select-none overflow-y-auto"
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 glass-surface-elevated border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-full glass-pill flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="العودة للوحة التحكم"
          >
            <X className="w-5 h-5" />
          </Link>
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
              معايرة الموقف الفضائي
            </div>
            <div className="text-sm font-bold text-white leading-tight">
              {vehiclePlate} ({vehicleMake} {vehicleModel})
            </div>
          </div>
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
                  setStep("IDLE");
                }
              }}
              className="glass-input text-xs text-zinc-300 rounded-full px-3 py-1.5 pr-7 appearance-none focus:outline-none font-medium cursor-pointer"
            >
              {allTags.map((t) => (
                <option key={t.id} value={t.tagUid} className="bg-zinc-950 text-white">
                  {t.profile?.vehiclePlate || t.tagUid}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full p-4 pb-6 space-y-4">
        {/* Active Existing Calibration Notice Card */}
        {isMounted && existingCalibration && !isReCalibrating && step === "IDLE" ? (
          <div className="space-y-4">
            <div className="glass-surface-elevated rounded-3xl p-5 space-y-4 border border-white/[0.12] shadow-glass">
              <div className="flex items-center gap-2.5 text-white text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 text-[#00C853]" />
                <span>المركبة معايرة حالياً ومثبتة بنجاح</span>
              </div>
              <div className="text-xs text-zinc-300 space-y-2.5 glass-surface p-3.5 rounded-2xl border border-white/[0.08] font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">لوحة المركبة:</span>
                  <span className="text-white font-bold">{existingCalibration.vehiclePlate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">توقيت المعايرة:</span>
                  <span className="text-zinc-200 font-medium">
                    {formatCalibrationDateTime(existingCalibration.calibratedAt).fullFormatted}
                  </span>
                </div>
                {liveRelativeTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">حالة التحديث:</span>
                    <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
                      <span>{liveRelativeTime}</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">دقة التمركز:</span>
                  <span className="text-white font-bold">± {existingCalibration.accuracy.toFixed(1)} م</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href={`/dashboard/find?tag=${selectedTag.tagUid}`}
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-glass cursor-pointer"
                >
                  <Navigation2 className="w-4 h-4 fill-black" />
                  <span>الانتقال للبحث عن السيارة الآن</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsReCalibrating(true)}
                  className="w-full py-2.5 rounded-xl glass-card text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>إجراء معايرة أخرى / تحديث مكان الوقوف</span>
                </button>
              </div>
            </div>

            <div className="glass-surface border border-white/[0.08] rounded-3xl p-4 shadow-glass">
              <IsometricStanceDiagram
                vehicleMake={vehicleMake}
                vehicleModel={vehicleModel}
                lang="ar"
              />
            </div>
          </div>
        ) : (
          /* Stance Guide & Setup */
          <div className="space-y-4">
            {isReCalibrating && existingCalibration && step === "IDLE" && (
              <div className="flex items-center justify-between glass-surface-elevated border border-white/[0.10] rounded-2xl px-3.5 py-2.5 text-xs">
                <span className="text-zinc-300">يتم الآن تجهيز معايرة جديدة للموقف</span>
                <button
                  type="button"
                  onClick={() => setIsReCalibrating(false)}
                  className="text-amber-400 hover:text-amber-300 underline font-medium text-[11px] cursor-pointer"
                >
                  تراجع والاحتفاظ بالموقف الحالي
                </button>
              </div>
            )}

            <div className="glass-surface border border-white/[0.08] rounded-3xl p-4 shadow-glass">
              <IsometricStanceDiagram
                vehicleMake={vehicleMake}
                vehicleModel={vehicleModel}
                lang="ar"
              />
            </div>

            {/* Step Instructions */}
            <div className="glass-surface border border-white/[0.08] rounded-2xl p-4 text-xs text-zinc-300 space-y-1.5 shadow-glass">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
                <span>إجراء المعايرة الدقيقة الفائقة (7 ثوانٍ):</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-xs">
                قف بجانب باب السائق (يسار السيارة)، وجّه أعلى الهاتف لمقدمة السيارة، ثم اضغط زر المسح الفضائي وانتظر 7 ثوانٍ حتى يقوم النظام بتجميع عينات الأقمار الصناعية وتصفية دقة التمركز.
              </p>
            </div>
          </div>
        )}

        {/* Live GNSS & Sensor Telemetry */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="glass-card rounded-2xl p-3 flex items-center justify-between border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Radio
                className={`w-4 h-4 ${
                  isGpsAcquiring
                    ? "text-amber-400 animate-spin"
                    : currentAccuracy !== null && currentAccuracy <= 5
                    ? "text-[#00C853]"
                    : "text-zinc-400"
                }`}
              />
              <span className="text-zinc-400 text-[11px]">دقة الأقمار:</span>
            </div>
            <span className="font-mono font-bold text-white text-[11px]">
              {isGpsAcquiring
                ? "جاري الالتقاط..."
                : currentAccuracy !== null
                ? `± ${currentAccuracy.toFixed(1)} م`
                : "غير متاح"}
            </span>
          </div>

          <div className="glass-card rounded-2xl p-3 flex items-center justify-between border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Compass
                className="w-4 h-4 text-zinc-300"
                style={{ transform: `rotate(${currentHeading}deg)` }}
              />
              <span className="text-zinc-400 text-[11px]">زاوية البوصلة:</span>
            </div>
            <span className="font-mono font-bold text-white text-[11px]">
              {hasCompassSupport ? `${currentHeading}°` : "يدوي"}
            </span>
          </div>
        </div>

        {/* Error Message if any */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl border border-red-500/30 glass-surface-elevated text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SAMPLING VIEW (7-Second Multi-GNSS Burst) */}
        {step === "SAMPLING" && (
          <div className="p-6 rounded-3xl glass-surface-elevated border border-white/[0.12] space-y-5 text-center shadow-glass">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-30" />
              <div className="w-16 h-16 rounded-full glass-surface border border-white/30 flex items-center justify-center font-mono text-2xl font-black text-white shadow-glass">
                {countdown}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">جاري المسح الفضائي وتجميع الإشارات...</h3>
              <p className="text-xs text-zinc-400">
                يرجى الثبات في مكانك مع توجيه الهاتف للأمام بمحاذاة السيارة
              </p>
            </div>

            {/* Progress Bar & Samples Count */}
            <div className="space-y-2 pt-1">
              <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden border border-white/[0.06]">
                <div
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${((7 - countdown) / 7) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>تم التقاط {samplesCount} عينة دقيقة</span>
                </span>
                <span>باقي {countdown} ثوانٍ</span>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS VIEW */}
        {step === "SUCCESS" && (
          <div className="p-5 sm:p-6 rounded-3xl glass-surface-elevated border border-white/[0.12] space-y-4 shadow-glass">
            <div className="flex items-center gap-2.5 text-white text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-[#00C853]" />
              <span>تم تثبيت المعايرة بدقة الأقمار الفائقة!</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              تم حساب التمركز الموزون وقفل موقع سيارتك بدقة في الذاكرة السريعة مع نسخة سحابية مشفرة.
            </p>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                href={`/dashboard/find?tag=${selectedTag.tagUid}`}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-glass cursor-pointer"
              >
                <Navigation2 className="w-4 h-4 fill-black" />
                <span>الانتقال فوراً للبحث عن السيارة</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsReCalibrating(false);
                  setStep("IDLE");
                }}
                className="w-full py-2.5 rounded-xl glass-card text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                عرض بطاقة الموقف المثبت
              </button>
            </div>
          </div>
        )}

        {/* ACTION BUTTON */}
        {step === "IDLE" && (!existingCalibration || isReCalibrating) && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStartTimedCalibration}
              disabled={isWaitingForGpsLock}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-glass active:scale-95 ${
                isWaitingForGpsLock
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                  : isGpsAcquiring && !latestGpsRef.current
                  ? "glass-card text-zinc-400 border border-white/[0.08]"
                  : "bg-white hover:bg-zinc-200 text-black"
              }`}
            >
              {isWaitingForGpsLock ? (
                <>
                  <Radio className="w-4 h-4 animate-spin text-amber-400" />
                  <span>جاري قفل إشارة الأقمار الصناعية... سيبدأ العد تلقائياً</span>
                </>
              ) : isGpsAcquiring && !latestGpsRef.current ? (
                <>
                  <Radio className="w-4 h-4 animate-pulse text-zinc-400" />
                  <span>جاري استقبال ترددات GPS... (اضغط للبدء التلقائي)</span>
                </>
              ) : (
                <>
                  <Timer className="w-4 h-4" />
                  <span>بدء المعايرة الفضائية الفائقة (مسح 7 ثوانٍ)</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
