"use client";

import React from "react";
import Image from "next/image";

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
  lang = "ar",
}: IsometricStanceDiagramProps) {
  const isAr = lang === "ar";

  return (
    <div className="w-full flex flex-col rounded-2xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden select-none">
      {/* Clean Top Bar (Neutral, No Glowing) */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-[#111111]">
        <span className="text-xs font-semibold text-zinc-300">
          {isAr ? "دليل المعايرة المكانية للمركبة" : "Vehicle Spatial Stance Guide"}
        </span>
        <span className="text-xs font-mono text-zinc-400">
          {vehicleMake} {vehicleModel}
        </span>
      </div>

      {/* Photorealistic 3D Luxury Car Render (Uncluttered, No Messy Overlays) */}
      <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
        <Image
          src="/images/car-stance-guide.jpg"
          alt="3D Car Stance Alignment Guide"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Subtle Bottom Shade */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
      </div>

      {/* Minimalist 3-Step Stance Instructions (Pure Apple Monochrome, Zero Clutter) */}
      <div className="p-3.5 space-y-2 bg-[#0A0A0A]">
        <div className="flex items-start gap-3 p-2.5 rounded-xl border border-zinc-800/80 bg-[#121212]">
          <span className="w-6 h-6 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
            1
          </span>
          <div className="text-xs">
            <span className="font-bold text-white block">
              {isAr ? "قِف يسار السيارة (باب السائق)" : "Stand at Driver Door"}
            </span>
            <span className="text-zinc-400 text-[11px] leading-tight block mt-0.5">
              {isAr ? "قف ملاصقاً لباب السائق على يسار المركبة" : "Stand directly beside driver door on the left"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 p-2.5 rounded-xl border border-zinc-800/80 bg-[#121212]">
          <span className="w-6 h-6 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
            2
          </span>
          <div className="text-xs">
            <span className="font-bold text-white block">
              {isAr ? "وجّه الجوال مستوياً للأعلى" : "Hold Phone Flat & Level"}
            </span>
            <span className="text-zinc-400 text-[11px] leading-tight block mt-0.5">
              {isAr ? "الشاشة لأعلى وأعلى الهاتف بمحاذاة مقدمة السيارة" : "Screen facing skyward, aligned with car direction"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 p-2.5 rounded-xl border border-zinc-800/80 bg-[#121212]">
          <span className="w-6 h-6 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
            3
          </span>
          <div className="text-xs">
            <span className="font-bold text-white block">
              {isAr ? "انقر زر المعايرة" : "Tap Calibrate Button"}
            </span>
            <span className="text-zinc-400 text-[11px] leading-tight block mt-0.5">
              {isAr ? "تثبيت سحابي مشفر للنقطة الفضائية بدقة متناهية" : "Instant encrypted cloud synchronization"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
