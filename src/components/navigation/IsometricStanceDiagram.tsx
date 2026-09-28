"use client";

import React from "react";
import Image from "next/image";
import { Smartphone, Compass, ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";

interface IsometricStanceDiagramProps {
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  isCalibrating?: boolean;
  lang?: "ar" | "en";
}

export function IsometricStanceDiagram({
  vehicleMake = "Toyota",
  vehicleModel = "Land Cruiser",
  vehicleColor = "White",
  isCalibrating = false,
  lang = "ar",
}: IsometricStanceDiagramProps) {
  const isAr = lang === "ar";

  return (
    <div className="relative w-full rounded-2xl border border-[#1F2228] bg-[#050608] overflow-hidden select-none shadow-2xl">
      {/* Header Tag */}
      <div className="relative z-10 flex items-center justify-between p-3.5 sm:p-4 border-b border-[#1F2228] bg-[#0A0C10]">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#00C853]/40 bg-[#00C853]/10 text-[11px] font-mono text-[#00C853] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
          <span>{isAr ? "دليل الوضعية المكانية ثلاثي الأبعاد" : "3D Spatial Alignment Guide"}</span>
        </div>
        <span className="text-xs font-mono font-bold text-zinc-300">
          {vehicleMake} {vehicleModel}
        </span>
      </div>

      {/* Photorealistic 3D Render Canvas with HUD Overlays */}
      <div className="relative w-full aspect-[16/9] max-h-72 sm:max-h-80 overflow-hidden bg-black">
        {/* The Photorealistic 3D Stance Render */}
        <Image
          src="/images/car-stance-guide.jpg"
          alt="3D Car Stance Alignment Guide"
          fill
          priority
          className="object-cover object-center filter brightness-95 contrast-105"
        />

        {/* Ambient Dark Gradient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30 pointer-events-none" />

        {/* HUD Overlay 1: Stance Position Marker over Driver's Door */}
        <div className="absolute bottom-6 left-8 sm:left-16 z-20 flex flex-col items-start gap-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00C853] bg-black/90 backdrop-blur-md text-[11px] font-mono font-bold text-white shadow-xl">
            <span className="w-2 h-2 rounded-full bg-[#00C853] animate-ping" />
            <span>{isAr ? "👤 موضعك: يسار السيارة (باب السائق)" : "👤 Stance: Driver Side Door"}</span>
          </div>
          <div className="text-[10px] font-mono text-[#00C853] bg-black/80 px-2 py-0.5 rounded border border-[#00C853]/30">
            {isAr ? "إزاحة المركز: 1.2م لليمين آلياً" : "Auto Centroid: +1.2m offset"}
          </div>
        </div>

        {/* HUD Overlay 2: Phone Orientation Indicator in Person's Hands */}
        <div className="absolute top-1/2 left-[48%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          {/* Subtle targeting reticle over hands */}
          <div className="relative flex items-center justify-center">
            <div className={`w-12 h-12 rounded-full border-2 border-[#00C853] ${isCalibrating ? "animate-spin" : "animate-pulse"} opacity-80`} />
            <div className="absolute w-2 h-2 rounded-full bg-[#00C853]" />
          </div>
        </div>

        {/* HUD Overlay 3: Vehicle Front Direction */}
        <div className="absolute top-4 right-4 z-20">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/20 bg-black/80 backdrop-blur-md text-[10px] font-mono text-zinc-300">
            <span>{isAr ? "مقدمة المركبة ➔" : "Vehicle Front ➔"}</span>
          </div>
        </div>
      </div>

      {/* Clear, Beautifully Spaced 3-Step Instruction Cards */}
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#080A0E] border-t border-[#1F2228]">
        <div className="p-3 rounded-xl border border-[#1F2228] bg-[#050608] flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-xs font-mono font-bold shrink-0 mt-0.5">
            1
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">
              {isAr ? "قِف يسار السيارة" : "Stand at Driver Side"}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              {isAr ? "بجوار باب السائق مباشرة (على يسار المركبة)" : "Directly beside driver door (left of vehicle)"}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[#1F2228] bg-[#050608] flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-xs font-mono font-bold shrink-0 mt-0.5">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">
              {isAr ? "وجّه الجوال أفقياً" : "Hold Phone Flat & Level"}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              {isAr ? "الشاشة مستوية للأعلى ومقدمة الهاتف بمحاذاة السيارة" : "Screen flat facing skyward, aligned with car"}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[#1F2228] bg-[#050608] flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-xs font-mono font-bold shrink-0 mt-0.5">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">
              {isAr ? "معايرة فورية بلمسة واحدة" : "Instant 1-Tap Sync"}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              {isAr ? "التقاط فوري لإشارة الأقمار الصناعية وحفظ الموقع" : "Locks high-accuracy GPS & True North compass"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
