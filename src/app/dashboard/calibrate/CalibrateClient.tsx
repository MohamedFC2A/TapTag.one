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
} from "lucide-react";
import { IsometricStanceDiagram } from "@/components/navigation/IsometricStanceDiagram";
import {
  SpatialCalibration,
  computeVehicleCentroid,
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
  const [step, setStep] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  const [isGpsAcquiring, setIsGpsAcquiring] = useState(true);

  // Live sensor readings
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [hasCompassSupport, setHasCompassSupport] = useState<boolean>(true);
  const [hasActiveCalibration, setHasActiveCalibration] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const latestGpsRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);
  const latestHeadingRef = useRef<number>(0);

  const vehiclePlate = selectedTag.profile?.vehiclePlate || selectedTag.tagUid;
  const vehicleMake = selectedTag.profile?.vehicleMake || "المركبة";
  const vehicleModel = selectedTag.profile?.vehicleModel || "";

  // Check if this vehicle is already calibrated
  useEffect(() => {
    const existing = loadCalibrationLocally(selectedTag.tagUid);
    setHasActiveCalibration(!!existing);
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

  // Passive Live Sensors Acquisition
  useEffect(() => {
    setIsGpsAcquiring(true);
    setErrorMessage("");

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const eCompass = e as unknown as { webkitCompassHeading?: number };
      let heading = 0;

      if (typeof eCompass.webkitCompassHeading === "number") {
        heading = eCompass.webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      } else {
        setHasCompassSupport(false);
        return;
      }

      setHasCompassSupport(true);
      setCurrentHeading(Math.round(heading));
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
          latestGpsRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: acc,
            altitude: pos.coords.altitude,
          };
        },
        (err) => {
          setIsGpsAcquiring(false);
          if (err.code === 1) {
            setErrorMessage("صلاحية الوصول للموقع الجغرافي مرفوضة. يرجى تفعيل الموقع الدقيق.");
          } else {
            setErrorMessage("تعذر التقاط إشارة GPS. تأكد من تفعيل خدمة الموقع بدقة عالية.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 4000,
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
    };
  }, [selectedTag.tagUid]);

  /**
   * 0-Delay Calibration Execution
   */
  const handlePerformCalibration = async () => {
    setErrorMessage("");

    try {
      await requestOrientationPermission();
    } catch {
      // Continue
    }

    const currentGps = latestGpsRef.current;
    if (!currentGps) {
      setErrorMessage("لم يتم التقاط إشارة الأقمار الصناعية بعد. يرجى الانتظار ثوانٍ في مكان مفتوح.");
      setStep("ERROR");
      return;
    }

    const heading = latestHeadingRef.current;

    // Shift to vehicle centroid (1.2m offset to right)
    const { centroidLat, centroidLng } = computeVehicleCentroid(
      currentGps.lat,
      currentGps.lng,
      heading,
      1.2
    );

    const calibration: SpatialCalibration = {
      tagUid: selectedTag.tagUid,
      vehiclePlate,
      vehicleMake,
      vehicleModel,
      calibratedAt: new Date().toISOString(),
      rawLat: currentGps.lat,
      rawLng: currentGps.lng,
      userHeading: heading,
      accuracy: currentGps.accuracy,
      altitude: currentGps.altitude,
      centroidLat,
      centroidLng,
      offsetDistanceMeters: 1.2,
    };

    // 1. Instant 0-Delay Local-First Save
    saveCalibrationLocally(calibration);
    playNavigationSound("calibrate_complete");
    setHasActiveCalibration(true);
    setStep("SUCCESS");

    // 2. Asynchronous Non-Blocking Cloud Persistence to Neon
    saveVehicleSpatialCalibration({
      tagUid: selectedTag.tagUid,
      deviceId: "verified_owner",
      rawLat: currentGps.lat,
      rawLng: currentGps.lng,
      userHeading: heading,
      accuracy: currentGps.accuracy,
      altitude: currentGps.altitude,
      centroidLat,
      centroidLng,
      offsetDistanceMeters: 1.2,
    }).catch((err) => {
      console.warn("Neon background sync note:", err);
    });
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] bg-[#000000] text-white flex flex-col font-sans select-none overflow-y-auto"
    >
      {/* Top Mobile Bar */}
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

        {/* Vehicle Switcher if multiple */}
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
              className="bg-[#111111] border border-[#222222] text-xs text-zinc-300 rounded px-2 py-1 pr-6 appearance-none focus:outline-none focus:border-zinc-500 font-medium"
            >
              {allTags.map((t) => (
                <option key={t.id} value={t.tagUid}>
                  {t.profile?.vehiclePlate || t.tagUid}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full p-4 pb-6 space-y-4">
        {/* Step Indicator & Stance Diagram */}
        <div className="space-y-3">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3">
            <IsometricStanceDiagram
              vehicleMake={vehicleMake}
              vehicleModel={vehicleModel}
              lang="ar"
            />
          </div>

          {/* Stance Instruction */}
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-3 text-xs text-zinc-300 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>طريقة المعايرة الصحيحة:</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              قف بجانب باب السائق (الجانب الأيسر للمركبة)، واجعل مقدمة هاتفك موجهة للأمام تماماً في نفس اتجاه مقدمة السيارة، ثم اضغط زر التثبيت.
            </p>
          </div>
        </div>

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

        {/* Success View */}
        {step === "SUCCESS" && (
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#0C0C0C] space-y-3">
            <div className="flex items-center gap-2 text-[#00C853] text-sm font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>تم تثبيت نقطة المعايرة بنجاح (0 تأخير)!</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              تم قفل موقع سيارتك بدقة في الذاكرة السريعة مع نسخة سحابية مؤمنة. يمكنك الآن البحث عنها في أي وقت دون الحاجة لإنترنت سريع.
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
                معايرة مرة أخرى
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {step !== "SUCCESS" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handlePerformCalibration}
              disabled={isGpsAcquiring && !latestGpsRef.current}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isGpsAcquiring && !latestGpsRef.current
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : "bg-white hover:bg-zinc-200 text-black shadow-lg"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>
                {isGpsAcquiring && !latestGpsRef.current
                  ? "جاري تثبيت إشارة GPS..."
                  : "تثبيت نقطة المعايرة الآن (0 تأخير)"}
              </span>
            </button>

            {hasActiveCalibration && (
              <Link
                href={`/dashboard/find?tag=${selectedTag.tagUid}`}
                className="w-full py-2.5 rounded-lg border border-[#222222] bg-[#0A0A0A] text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation2 className="w-3.5 h-3.5" />
                <span>السيارة معايرة مسبقاً - الذهاب للبحث مباشرة</span>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
