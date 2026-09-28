"use client";

import React, { useMemo } from "react";
import { NavigationVector } from "@/lib/spatial-navigation";
import { Compass, CheckCircle2 } from "lucide-react";

interface PrecisionAirTagArrowProps {
  navVector: NavigationVector;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel?: string;
  lang?: "ar" | "en";
}

export function PrecisionAirTagArrow({
  navVector,
  vehiclePlate,
  vehicleMake,
  vehicleModel,
  lang = "ar",
}: PrecisionAirTagArrowProps) {
  const isAr = lang === "ar";
  const {
    distanceMeters,
    relativeBearing,
    deviceHeading,
    confidencePercent,
    isDirectlyAligned,
    isWithinLockoutRange, // <= 5.0 meters
  } = navVector;

  // Format distance & unit cleanly
  const isKilometers = distanceMeters >= 1000;
  const formattedDistance = useMemo(() => {
    if (isKilometers) {
      return (distanceMeters / 1000).toFixed(1);
    } else if (distanceMeters >= 100) {
      return Math.round(distanceMeters).toString();
    } else {
      return distanceMeters.toFixed(1);
    }
  }, [distanceMeters, isKilometers]);

  const distanceUnit = isKilometers ? (isAr ? "كم" : "km") : (isAr ? "متر" : "m");

  // Relative direction prompt
  const directionText = useMemo(() => {
    if (isWithinLockoutRange) {
      return isAr ? "وصلت لنطاق السيارة (< 5م)" : "Within Vehicle Range (< 5m)";
    }
    if (isDirectlyAligned) {
      return isAr ? "أمامك مباشرة ➔" : "Direct Ahead ➔";
    }
    if (Math.abs(relativeBearing) > 135) {
      return isAr ? "المركبة خلفك ⬇ (استدر)" : "Vehicle Behind You ⬇";
    }
    if (relativeBearing > 12) {
      return isAr ? "انعطف لليمين ➔" : "Turn Right ➔";
    }
    return isAr ? "⬅ انعطف لليسار" : "⬅ Turn Left";
  }, [isWithinLockoutRange, isDirectlyAligned, relativeBearing, isAr]);

  return (
    <div className="relative w-full flex flex-col items-center justify-between select-none py-1">
      {/* Top Neutral Status Bar (No Green, No Glowing) */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 border-b border-zinc-900 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">{isAr ? "الدقة:" : "Accuracy:"}</span>
          <span className="font-bold text-zinc-200">{confidencePercent}%</span>
        </div>

        <div className="flex items-center gap-2">
          <span>{Math.round(deviceHeading)}°</span>
          <span className="text-zinc-700">•</span>
          <span className="font-bold text-white">{vehiclePlate}</span>
        </div>
      </div>

      {/* Main Apple AirTag Precision Finding Viewport */}
      <div className="relative w-full max-w-xs h-72 sm:h-80 flex items-center justify-center overflow-hidden my-2">
        {/* Subtle Neutral Concentric Circles (Matte Monochrome, Zero Glowing) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full border border-zinc-800/50" />
          <div className="absolute w-44 h-44 rounded-full border border-zinc-800/80" />
          <div className="absolute w-28 h-28 rounded-full border border-zinc-800" />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CASE A: DISTANCE <= 5 METERS -> STOP ARROW & RENDER TARGET DOT */}
        {/* ------------------------------------------------------------- */}
        {isWithinLockoutRange ? (
          <div className="relative z-10 flex flex-col items-center justify-center space-y-3 animate-in zoom-in-95">
            {/* Precision Target Dot (نقطة بيضاء ناصعة بدون توهج أخضر) */}
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black shadow-2xl">
                <CheckCircle2 className="w-7 h-7 text-black" />
              </div>
              {/* Clean Single Neutral Pulse */}
              <div className="absolute w-20 h-20 rounded-full border-2 border-white animate-ping opacity-30" />
            </div>

            <div className="px-3 py-1 rounded-full border border-zinc-700 bg-[#111111] text-xs font-mono text-zinc-200">
              {isAr ? "انظر لمحيطك بحثاً عنها!" : "Look around for your car!"}
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* CASE B: DISTANCE > 5 METERS -> 3D ROTATING DIRECTIONAL ARROW   */
          /* ------------------------------------------------------------- */
          <div
            className="relative z-10 w-44 h-44 flex items-center justify-center transition-transform duration-200 ease-out"
            style={{
              perspective: "900px",
              transform: `rotateZ(${relativeBearing}deg)`,
            }}
          >
            {/* Solid Chiseled Titanium Monochrome Arrow (Zero Glow) */}
            <svg
              viewBox="0 0 120 160"
              className="w-32 h-40 overflow-visible transition-transform duration-300"
              style={{
                transform: isDirectlyAligned ? "scale(1.06)" : "scale(1)",
              }}
            >
              <defs>
                <linearGradient id="arrowLeftFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#D4D4D8" />
                </linearGradient>

                <linearGradient id="arrowRightFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E4E4E7" />
                  <stop offset="100%" stopColor="#71717A" />
                </linearGradient>

                <linearGradient id="arrowStemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4D4D8" />
                  <stop offset="100%" stopColor="#52525B" />
                </linearGradient>
              </defs>

              {/* Left 3D Wing Facet */}
              <polygon
                points="60,8 10,98 60,78"
                fill="url(#arrowLeftFacet)"
              />

              {/* Right 3D Wing Facet */}
              <polygon
                points="60,8 110,98 60,78"
                fill="url(#arrowRightFacet)"
              />

              {/* Center Ridge Crease */}
              <line x1="60" y1="8" x2="60" y2="148" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.7" />

              {/* Arrow Stem */}
              <polygon
                points="48,78 72,78 68,148 52,148"
                fill="url(#arrowStemGrad)"
              />
            </svg>
          </div>
        )}

        {/* Direction Badge */}
        <div className="absolute bottom-2 z-20 px-3 py-1 rounded-full border border-zinc-800 bg-[#111111] text-xs font-mono text-zinc-300">
          {directionText}
        </div>
      </div>

      {/* Large Numerical Distance Readout (Clean Monochrome & White Unit) */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
            {formattedDistance}
          </span>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-400">
            {distanceUnit}
          </span>
        </div>

        <p className="text-xs text-zinc-400 font-mono mt-1">
          {isWithinLockoutRange
            ? isAr
              ? "المركبة في محيطك المباشر تماماً"
              : "Vehicle is in your direct vicinity"
            : isDirectlyAligned
            ? isAr
              ? "تقدّم للأمام باتجاه السهم"
              : "Walk straight ahead"
            : isAr
            ? "التف حولك نحو السهم"
            : "Turn towards arrow"}
        </p>
      </div>
    </div>
  );
}
