"use client";

import React from "react";
import { Smartphone, Compass, ArrowUp, CheckCircle2 } from "lucide-react";

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
    <div className="relative w-full rounded-2xl border border-[#1F2228] bg-gradient-to-b from-[#0B0D11] via-[#050608] to-[#000000] p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Architectural Grid Lines */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00C853 1px, transparent 1px),
            linear-gradient(to bottom, #00C853 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          transform: "perspective(400px) rotateX(45deg) translateY(-20px)",
        }}
      />

      {/* Header Tag */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#00C853]/40 bg-[#00C853]/10 text-[11px] font-mono text-[#00C853] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
          <span>{isAr ? "دليل الوضعية المكانية للمعايرة (3D Stance Guide)" : "3D Spatial Alignment Guide"}</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          {vehicleMake} {vehicleModel}
        </span>
      </div>

      {/* Main 3D / Isometric Canvas / SVG Container */}
      <div className="relative w-full h-64 sm:h-72 flex items-center justify-center">
        <svg
          viewBox="0 0 500 320"
          className="w-full h-full max-w-lg overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A2D35" />
              <stop offset="50%" stopColor="#1E2026" />
              <stop offset="100%" stopColor="#121317" />
            </linearGradient>

            <linearGradient id="carRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3C404B" />
              <stop offset="100%" stopColor="#202229" />
            </linearGradient>

            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C2F38" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0B1317" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="personGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00C853" />
              <stop offset="100%" stopColor="#007A33" />
            </linearGradient>

            <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00C853" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Ground Footprint & Shadow */}
          <ellipse cx="290" cy="190" rx="145" ry="55" fill="#000000" fillOpacity="0.75" />
          <ellipse cx="150" cy="225" rx="35" ry="14" fill="#000000" fillOpacity="0.6" />

          {/* Lateral Vector Line between User stance and Car Centroid */}
          <g>
            <line
              x1="150"
              y1="210"
              x2="290"
              y2="175"
              stroke="#00C853"
              strokeWidth="2"
              strokeDasharray="4 3"
              className={isCalibrating ? "animate-pulse" : ""}
            />
            {/* Center target circle */}
            <circle cx="290" cy="175" r="5" fill="#00C853" />
            <circle cx="290" cy="175" r="12" stroke="#00C853" strokeWidth="1.5" fill="none" opacity="0.4" />
          </g>

          {/* ---------------- ISOMETRIC CAR MODEL (Right side of user) ---------------- */}
          <g transform="translate(180, 70)">
            {/* Vehicle Shadow Base */}
            <path
              d="M 20 130 L 150 70 L 220 100 L 90 160 Z"
              fill="#060709"
              opacity="0.9"
            />

            {/* Car Wheels */}
            {/* Rear Left Wheel */}
            <ellipse cx="65" cy="135" rx="14" ry="24" fill="#111215" stroke="#333" strokeWidth="2" />
            {/* Front Left Wheel */}
            <ellipse cx="165" cy="95" rx="14" ry="24" fill="#111215" stroke="#333" strokeWidth="2" />

            {/* Lower Body Side Panel */}
            <path
              d="M 30 115 L 85 92 L 150 65 L 195 85 L 180 120 L 115 145 L 30 115 Z"
              fill="url(#carBodyGrad)"
              stroke="#3A3E4A"
              strokeWidth="1.5"
            />

            {/* Car Hood & Front Bumper (Pointing forward-right) */}
            <path
              d="M 150 65 L 205 88 L 195 105 L 140 82 Z"
              fill="#22252C"
              stroke="#3A3E4A"
              strokeWidth="1.5"
            />
            {/* Headlights (Subtle Amber/White) */}
            <polygon points="195,90 205,88 200,97 192,97" fill="#E2E8F0" opacity="0.9" />

            {/* Greenhouse / Windows / Windshield */}
            <path
              d="M 75 90 L 115 55 L 150 70 L 125 100 Z"
              fill="url(#glassGrad)"
              stroke="#475569"
              strokeWidth="1.2"
            />

            {/* Roof Top */}
            <path
              d="M 75 90 L 115 55 L 145 68 L 105 103 Z"
              fill="url(#carRoofGrad)"
              stroke="#52525B"
              strokeWidth="1.5"
            />

            {/* Forward Direction Arrow on Car */}
            <g transform="translate(140, 45)">
              <line x1="0" y1="20" x2="35" y2="5" stroke="#A1A1AA" strokeWidth="2" strokeDasharray="3 2" />
              <polygon points="35,5 28,3 30,10" fill="#A1A1AA" />
              <text x="42" y="5" fill="#A1A1AA" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {isAr ? "مقدمة السيارة" : "Front Axis"}
              </text>
            </g>
          </g>

          {/* ---------------- USER STANCE AVATAR (Left Side of Car) ---------------- */}
          <g transform="translate(110, 110)">
            {/* Person Silhouette (Isometric standing person) */}
            {/* Head */}
            <circle cx="40" cy="35" r="12" fill="#E4E4E7" stroke="#18181B" strokeWidth="2" />

            {/* Torso & Shoulders (Facing forward along car axis) */}
            <path
              d="M 28 50 L 52 50 L 56 95 L 24 95 Z"
              fill="#27272A"
              stroke="#3F3F46"
              strokeWidth="1.5"
            />

            {/* Legs */}
            <rect x="26" y="95" width="9" height="35" rx="4" fill="#18181B" />
            <rect x="44" y="95" width="9" height="35" rx="4" fill="#18181B" />

            {/* Arms holding phone horizontally in front of chest */}
            {/* Left Arm */}
            <path d="M 26 55 L 15 75 L 30 78" stroke="#3F3F46" strokeWidth="5" strokeLinecap="round" fill="none" />
            {/* Right Arm */}
            <path d="M 52 55 L 58 72 L 45 78" stroke="#3F3F46" strokeWidth="5" strokeLinecap="round" fill="none" />

            {/* SMARTPHONE: Held FLAT, Screen UP, Parallel to vehicle axis */}
            <g transform="translate(26, 68)">
              {/* Phone Isometric 3D body */}
              <polygon
                points="0,10 22,0 36,6 14,16"
                fill="#000000"
                stroke="#00C853"
                strokeWidth="2"
                filter="url(#subtleGlow)"
              />
              {/* Phone Screen (Green tinted display) */}
              <polygon points="3,10 21,2 33,7 15,14" fill="#00C853" fillOpacity="0.4" />

              {/* Pulsing indicator from phone */}
              {isCalibrating && (
                <circle cx="18" cy="8" r="8" fill="none" stroke="#00C853" strokeWidth="2">
                  <animate attributeName="r" values="4;18;24" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.4;0" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>

            {/* Stance Label Tag */}
            <g transform="translate(-15, 140)">
              <rect x="0" y="0" width="115" height="24" rx="6" fill="#09090B" stroke="#00C853" strokeWidth="1.2" />
              <text x="57" y="16" fill="#00C853" fontSize="10" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                {isAr ? "👤 موضعك (يسار السيارة)" : "👤 Stance (Left Side)"}
              </text>
            </g>
          </g>

          {/* Centroid Offset Bracket Annotation */}
          <g transform="translate(195, 230)">
            <rect x="0" y="0" width="160" height="26" rx="6" fill="#08080A" stroke="#1F2228" strokeWidth="1" />
            <text x="80" y="17" fill="#A1A1AA" fontSize="9.5" fontFamily="monospace" textAnchor="middle">
              {isAr ? "إزاحة المركز التلقائية: ~1.2m ➔" : "Centroid Offset: ~1.2m ➔"}
            </text>
          </g>
        </svg>
      </div>

      {/* Clear 3-Step Visual Breakdown Badges */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#1F2228]">
        <div className="p-2.5 rounded-xl border border-[#1F2228] bg-[#08080A] flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-xs font-mono font-bold shrink-0">
            1
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              {isAr ? "الوقوف يسار السيارة" : "Stand at Driver Side"}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
              {isAr ? "بجوار باب السائق (على يسار المركبة)" : "Position yourself to the left of the car"}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-[#1F2228] bg-[#08080A] flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-xs font-mono font-bold shrink-0">
            2
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              {isAr ? "توجيه الجوال أفقياً" : "Hold Phone Flat & Up"}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
              {isAr ? "الشاشة لأعلى وأعلى الهاتف بمحاذاة مقدمة السيارة" : "Screen facing skyward, aligned with car front"}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-[#1F2228] bg-[#08080A] flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-xs font-mono font-bold shrink-0">
            3
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              {isAr ? "معايرة فورية بلمسة واحدة" : "1-Tap Instant Sync"}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
              {isAr ? "التقاط فائق السرعة خلال ثانية واحدة بدون كتابة" : "Captures orientation & offset centroid in 1s"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
