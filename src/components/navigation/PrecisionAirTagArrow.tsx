"use client";

import React, { useMemo } from "react";
import { NavigationVector } from "@/lib/spatial-navigation";
import { Compass, ShieldCheck, AlertTriangle } from "lucide-react";

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
    if (isDirectlyAligned) {
      return isAr ? "أمامك مباشرة ➔" : "Direct Ahead ➔";
    }
    if (Math.abs(relativeBearing) > 135) {
      return isAr ? "المركبة خلفك ⬇ (استدر 180°)" : "Vehicle is Behind You ⬇";
    }
    if (relativeBearing > 12) {
      return isAr ? "انعطف لليمين ➔" : "Turn Right ➔";
    }
    return isAr ? "⬅ انعطف لليسار" : "⬅ Turn Left";
  }, [isDirectlyAligned, relativeBearing, isAr]);

  // Ring scaling based on distance (tighter rings as user gets closer)
  const ringScale = Math.min(1.25, Math.max(0.7, distanceMeters / 25));

  return (
    <div className="relative w-full flex flex-col items-center justify-between select-none py-2">
      {/* Top Status Bar (Confidence & Plate & Compass) */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1F2228] bg-[#0A0A0E] text-[11px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
          <span className="text-zinc-400">{isAr ? "دقة التوجيه:" : "Accuracy:"}</span>
          <span className="text-[#00C853] font-bold">{confidencePercent}%</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1F2228] bg-[#0A0A0E] text-[11px] font-mono text-zinc-300">
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">{Math.round(deviceHeading)}°</span>
          <span className="text-zinc-600">•</span>
          <span className="font-bold text-white">{vehiclePlate}</span>
        </div>
      </div>

      {/* Extreme Distance Warning (> 2km) */}
      {distanceMeters > 2000 && (
        <div className="w-full max-w-sm mb-2 p-2.5 rounded-xl border border-amber-900/60 bg-amber-950/30 flex items-center gap-2 text-xs text-amber-200 font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isAr
              ? `المسافة (${formattedDistance} كم) بعيدة جداً! تأكد من إعادة المعايرة بجوار السيارة.`
              : `Distance (${formattedDistance} km) is extreme! Please recalibrate beside car.`}
          </span>
        </div>
      )}

      {/* Main Apple AirTag Precision Finding Viewport */}
      <div className="relative w-full max-w-sm h-80 sm:h-96 flex items-center justify-center overflow-hidden">
        {/* Concentric Precision Rings */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-700 ease-out"
          style={{ transform: `scale(${ringScale})` }}
        >
          {/* Ring 3 (Outer) */}
          <div className="w-72 h-72 rounded-full border border-[#1C2028] opacity-40" />
          {/* Ring 2 (Middle) */}
          <div className="absolute w-52 h-52 rounded-full border border-[#242A35] opacity-60" />
          {/* Ring 1 (Inner) */}
          <div
            className={`absolute w-36 h-36 rounded-full border transition-colors duration-300 ${
              isDirectlyAligned ? "border-[#00C853]/60 bg-[#00C853]/5" : "border-[#2E3644] opacity-80"
            }`}
          />
        </div>

        {/* Dynamic Forward Beam when directly aligned */}
        {isDirectlyAligned && (
          <div
            className="absolute w-2 h-44 bg-gradient-to-t from-[#00C853] to-transparent opacity-40 pointer-events-none transition-opacity duration-300"
            style={{
              top: "6%",
              transform: `rotate(${relativeBearing}deg)`,
              transformOrigin: "bottom center",
            }}
          />
        )}

        {/* 3D DIRECTIONAL ARROW (Clean Matte Apple AirTag Green - ZERO Glowing) */}
        <div
          className="relative z-10 w-48 h-48 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            perspective: "900px",
            transform: `rotateZ(${relativeBearing}deg)`,
          }}
        >
          {/* SVG 3D Faceted Precision Arrowhead */}
          <svg
            viewBox="0 0 120 160"
            className="w-36 h-44 overflow-visible transition-transform duration-300"
            style={{
              transform: isDirectlyAligned ? "scale(1.08)" : "scale(1)",
              filter: "drop-shadow(0 10px 20px rgba(0, 0, 0, 0.8))",
            }}
          >
            <defs>
              {/* Left facet shaded slightly darker for genuine 3D perspective depth */}
              <linearGradient id="arrowLeftFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E676" />
                <stop offset="100%" stopColor="#00A844" />
              </linearGradient>

              {/* Right facet slightly lighter to simulate single-source light */}
              <linearGradient id="arrowRightFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00C853" />
                <stop offset="100%" stopColor="#008E3A" />
              </linearGradient>

              {/* Arrow Stem Gradient */}
              <linearGradient id="arrowStem" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00A844" />
                <stop offset="50%" stopColor="#00C853" />
                <stop offset="100%" stopColor="#008E3A" />
              </linearGradient>
            </defs>

            {/* Left 3D Wing Facet */}
            <polygon
              points="60,8 10,98 60,78"
              fill="url(#arrowLeftFacet)"
              stroke="#00C853"
              strokeWidth="0.5"
            />

            {/* Right 3D Wing Facet */}
            <polygon
              points="60,8 110,98 60,78"
              fill="url(#arrowRightFacet)"
              stroke="#00C853"
              strokeWidth="0.5"
            />

            {/* Center Ridge Crease Line */}
            <line x1="60" y1="8" x2="60" y2="148" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.5" />

            {/* Arrow Stem / Tail */}
            <polygon
              points="48,78 72,78 68,148 52,148"
              fill="url(#arrowStem)"
            />

            {/* Base Cap */}
            <polygon points="52,148 68,148 60,154" fill="#007A33" />
          </svg>
        </div>

        {/* Dynamic Direction Guidance Badge */}
        <div
          className={`absolute bottom-3 z-20 px-3.5 py-1 rounded-full border text-xs font-mono font-bold transition-all ${
            isDirectlyAligned
              ? "border-[#00C853] bg-black text-[#00C853] shadow-lg animate-bounce"
              : "border-[#1F2228] bg-black/90 text-zinc-300"
          }`}
        >
          {directionText}
        </div>
      </div>

      {/* Large Numerical Distance Readout (AirTag Precision Typography) */}
      <div className="flex flex-col items-center justify-center mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
            {formattedDistance}
          </span>
          <span className="text-2xl sm:text-3xl font-bold font-mono text-[#00C853]">
            {distanceUnit}
          </span>
        </div>

        <p className="text-xs text-zinc-400 font-mono mt-1">
          {isDirectlyAligned
            ? isAr
              ? "تقدّم للأمام باتجاه السهم مباشرة"
              : "Walk straight ahead following arrow"
            : isAr
            ? "التف حولك نحو السهم لتوجيه المسار"
            : "Turn towards arrow to orient direction"}
        </p>
      </div>
    </div>
  );
}
