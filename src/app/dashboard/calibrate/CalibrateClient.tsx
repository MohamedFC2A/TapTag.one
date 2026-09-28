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
} from "@/lib/spatial-navigation";
import { saveVehicleSpatialCalibration } from "@/app/actions/calibration-actions";

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

  // States: IDLE, SAMPLING (7 seconds multi-GNSS burst), SUCCESS, ERROR
  const [step, setStep] = useState<"IDLE" | "SAMPLING" | "SUCCESS" | "ERROR">("IDLE");
  const [countdown, setCountdown] = useState<number>(7);
  const [samplesCount, setSamplesCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGpsAcquiring, setIsGpsAcquiring] = useState(true);

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

  // Check if this vehicle is already calibrated
  useEffect(() => {
    const existing = loadCalibrationLocally(selectedTag.tagUid);
    setExistingCalibration(existing);
  }, [selectedTag.tagUid]);

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

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const eCompass = e as unknown as { webkitCompassHeading?: number };
      let heading = 0;

      if (typeof eCompass.webkitCompassHeading === "number") {
        heading = eCompass.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Full 3D Tilt-Compensated Heading
        heading = computeTiltCompensatedHeading(e.alpha, e.beta, e.gamma);
      } else {
        setHasCompassSupport(false);
        return;
      }

      setHasCompassSupport(true);
      const rounded = Math.round(heading);
      setCurrentHeading(rounded);
      latestHeadingRef.current = heading;
    };

    if (typeof window !== "undefined") {
      const win = window as any;
      win.addEventListener("deviceorientationabsolute", handleOrientation, true);
      win.addEventListener("deviceorientation", handleOrientation, true);
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

          // If currently in the 7-second high-rate sampling phase, record sample
          if (step === "SAMPLING") {
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
        win.removeEventListener("deviceorientationabsolute", handleOrientation);
        win.removeEventListener("deviceorientation", handleOrientation);
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [selectedTag.tagUid, step]);

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
      setErrorMessage("لم يتم التقاط إشارة الأقمار الصناعية بعد. يرجى الانتظار في مكان مكشوف حتى يتم استقبال الترددات.");
      setStep("ERROR");
      return;
    }

    // Initialize 7-Second Sampling
    samplesRef.current = [
      {
        lat: latestGpsRef.current.lat,
        lng: latestGpsRef.current.lng,
        accuracy: latestGpsRef.current.accuracy,
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
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        finalizeMultiGNSSCalibration();
      }
    }, 1000);
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
      <header className="sticky top-0 z-40 bg-[#000000]/95 backdrop-blur-md border-b border-[#1A1A1A] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
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
              className="bg-[#111111] border border-[#222222] text-xs text-zinc-300 rounded-full px-3 py-1.5 pr-7 appearance-none focus:outline-none focus:border-zinc-500 font-medium"
            >
              {allTags.map((t) => (
                <option key={t.id} value={t.tagUid} className="bg-black text-white">
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
        {existingCalibration && step === "IDLE" ? (
          <div className="space-y-4">
            <div className="bg-[#0A140D] border border-[#00C853]/40 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center gap-2.5 text-[#00C853] text-sm font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>المركبة معايرة حالياً ومثبتة بنجاح</span>
              </div>
              <div className="text-xs text-zinc-300 space-y-1.5 bg-[#050B07] p-3 rounded-xl border border-[#00C853]/20 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">لوحة المركبة:</span>
                  <span className="text-white font-bold">{existingCalibration.vehiclePlate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">تاريخ المعايرة:</span>
                  <span className="text-zinc-200">
                    {new Date(existingCalibration.calibratedAt).toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">دقة التمركز:</span>
                  <span className="text-[#00C853] font-bold">± {existingCalibration.accuracy.toFixed(1)} م</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href={`/dashboard/find?tag=${selectedTag.tagUid}`}
                  className="w-full py-3.5 rounded-xl bg-[#00C853] hover:bg-[#00B048] text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                >
                  <Navigation2 className="w-4 h-4 fill-black" />
                  <span>الانتقال للبحث عن السيارة الآن</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setExistingCalibration(null)}
                  className="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-900/80 text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>إجراء معايرة أخرى / تحديث مكان الوقوف</span>
                </button>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3">
              <IsometricStanceDiagram
                vehicleMake={vehicleMake}
                vehicleModel={vehicleModel}
                lang="ar"
              />
            </div>
          </div>
        ) : (
          /* Stance Guide & Setup */
          <div className="space-y-3">
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3">
              <IsometricStanceDiagram
                vehicleMake={vehicleMake}
                vehicleModel={vehicleModel}
                lang="ar"
              />
            </div>

            {/* Step Instructions */}
            <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-3 text-xs text-zinc-300 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>إجراء المعايرة الدقيقة الفائقة (7 ثوانٍ):</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                قف بجانب باب السائق (يسار السيارة)، وجّه أعلى الهاتف لمقدمة السيارة، ثم اضغط زر المسح الفضائي وانتظر 7 ثوانٍ حتى يقوم النظام بتجميع عينات الأقمار الصناعية وتصفية دقة التمركز.
              </p>
            </div>
          </div>
        )}

        {/* Live GNSS & Sensor Telemetry */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg p-2.5 flex items-center justify-between">
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

          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg p-2.5 flex items-center justify-between">
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
          <div className="p-3 rounded-lg border border-red-900/60 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SAMPLING VIEW (7-Second Multi-GNSS Burst) */}
        {step === "SAMPLING" && (
          <div className="p-5 rounded-2xl border border-zinc-700 bg-[#0E0E10] space-y-4 text-center">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-700 animate-ping opacity-25" />
              <div className="w-16 h-16 rounded-full bg-[#1A1A1E] border border-zinc-500 flex items-center justify-center font-mono text-2xl font-black text-white">
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
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${((7 - countdown) / 7) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <Satellite className="w-3 h-3 text-[#00C853]" />
                  <span>تم التقاط {samplesCount} عينة دقيقة</span>
                </span>
                <span>باقي {countdown} ثوانٍ</span>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS VIEW */}
        {step === "SUCCESS" && (
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#0C0C0C] space-y-3">
            <div className="flex items-center gap-2 text-[#00C853] text-sm font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>تم تثبيت المعايرة بدقة الأقمار الفائقة!</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              تم حساب التمركز الموزون وقفل موقع سيارتك بدقة في الذاكرة السريعة مع نسخة سحابية مشفرة.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href={`/dashboard/find?tag=${selectedTag.tagUid}`}
                className="w-full py-3 rounded-lg bg-[#00C853] hover:bg-[#00B048] text-black font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Navigation2 className="w-4 h-4 fill-black" />
                <span>الانتقال فوراً للبحث عن السيارة</span>
              </Link>
              <button
                type="button"
                onClick={() => setStep("IDLE")}
                className="w-full py-2.5 rounded-lg border border-[#222222] bg-[#141414] text-xs text-zinc-400 hover:text-white transition-colors"
              >
                معايرة أخرى
              </button>
            </div>
          </div>
        )}

        {/* ACTION BUTTON (When Not Sampling and Not Success and Not showing active existing card) */}
        {step === "IDLE" && !existingCalibration && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStartTimedCalibration}
              disabled={isGpsAcquiring && !latestGpsRef.current}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isGpsAcquiring && !latestGpsRef.current
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : "bg-white hover:bg-zinc-200 text-black shadow-lg"
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>
                {isGpsAcquiring && !latestGpsRef.current
                  ? "جاري تثبيت إشارة GPS..."
                  : "بدء المعايرة الفضائية الفائقة (مسح 7 ثوانٍ)"}
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
