"use client";

import React, { useMemo } from "react";
import QRCode from "qrcode";

interface QrRenderMatrixProps {
  value: string;
  logoPreset?: "NONE" | "TAPTAG" | "CUSTOM";
  logoDataUrl?: string | null;
  moduleShape?: "square" | "dots";
  sizeClass?: string;
}

/**
 * Renders a crisp high-contrast monochrome QR code SVG with optional
 * center logo cutout protected by ISO 18004 Level H (30%) error correction.
 */
export function QrRenderMatrix({
  value,
  logoPreset = "NONE",
  logoDataUrl = null,
  moduleShape = "square",
  sizeClass = "w-48 h-48 sm:w-52 sm:h-52",
}: QrRenderMatrixProps) {
  const hasLogo =
    logoPreset === "TAPTAG" || (logoPreset === "CUSTOM" && Boolean(logoDataUrl));

  const qrMatrix = useMemo(() => {
    try {
      const qr = QRCode.create(value || "https://taptag.one", {
        errorCorrectionLevel: hasLogo ? "H" : "M",
      });
      const size = qr.modules.size;
      const cells: Array<{ x: number; y: number; isFinder: boolean }> = [];

      const padModules = Math.max(2, Math.floor(size * 0.13));
      const center = (size - 1) / 2;

      const isFinderCell = (r: number, c: number) =>
        (r < 7 && c < 7) ||
        (r < 7 && c >= size - 7) ||
        (r >= size - 7 && c < 7);

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (
            hasLogo &&
            Math.abs(r - center) <= padModules &&
            Math.abs(c - center) <= padModules
          ) {
            continue;
          }
          if (qr.modules.get(r, c)) {
            cells.push({ x: c, y: r, isFinder: isFinderCell(r, c) });
          }
        }
      }
      return { size, cells };
    } catch {
      return { size: 21, cells: [] };
    }
  }, [value, hasLogo]);

  const s = qrMatrix.size;
  const vbPad = 2;
  const total = s + vbPad * 2;
  const cutoutW = Math.max(7, Math.floor(s * 0.3));
  const cutoutH = logoPreset === "TAPTAG" ? Math.max(4.5, cutoutW * 0.45) : cutoutW;
  const cutoutX = (s - cutoutW) / 2;
  const cutoutY = (s - cutoutH) / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClass}`}>
      <svg
        viewBox={`-${vbPad} -${vbPad} ${total} ${total}`}
        className="w-full h-full"
        shapeRendering={moduleShape === "dots" ? "geometricPrecision" : "crispEdges"}
        role="img"
        aria-label="taptag. QR"
      >
        <rect
          x={-vbPad}
          y={-vbPad}
          width={total}
          height={total}
          fill="#FFFFFF"
        />
        {qrMatrix.cells.map((cell, idx) =>
          moduleShape === "dots" && !cell.isFinder ? (
            <circle
              key={idx}
              cx={cell.x + 0.5}
              cy={cell.y + 0.5}
              r={0.42}
              fill="#09090B"
            />
          ) : (
            <rect
              key={idx}
              x={cell.x}
              y={cell.y}
              width={1}
              height={1}
              fill="#09090B"
            />
          )
        )}
        {hasLogo && (
          <rect
            x={cutoutX}
            y={cutoutY}
            width={cutoutW}
            height={cutoutH}
            rx={0.9}
            fill="#FFFFFF"
          />
        )}
      </svg>

      {logoPreset === "TAPTAG" && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <span
            dir="ltr"
            className="px-2 py-0.5 rounded-[5px] bg-[#09090B] border border-[#27272A] font-taptag text-[13px] sm:text-sm text-[#FFFFFF] leading-none"
          >
            taptag.
          </span>
        </div>
      )}

      {logoPreset === "CUSTOM" && logoDataUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            alt="Logo"
            className="w-[20%] h-[20%] object-contain rounded-[4px] bg-[#FFFFFF] p-0.5"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Generates an SVG string containing the QR matrix, module style, centered typographic taptag./custom logo, and optional frame caption.
 */
export async function buildExportQrSvg(
  value: string,
  logoPreset: "NONE" | "TAPTAG" | "CUSTOM" = "NONE",
  logoDataUrl: string | null = null,
  options?: { moduleShape?: "square" | "dots"; frameCaption?: string | null }
): Promise<string> {
  const moduleShape = options?.moduleShape || "square";
  const frameCaption = options?.frameCaption?.trim() || "";
  const hasLogo =
    logoPreset === "TAPTAG" || (logoPreset === "CUSTOM" && Boolean(logoDataUrl));

  const qr = QRCode.create(value || "https://taptag.one", {
    errorCorrectionLevel: hasLogo ? "H" : "M",
  });
  const s = qr.modules.size;
  const vbPad = 2;
  const captionExtra = frameCaption ? 4.5 : 0;
  const totalW = s + vbPad * 2;
  const totalH = s + vbPad * 2 + captionExtra;
  const padModules = Math.max(2, Math.floor(s * 0.13));
  const center = (s - 1) / 2;

  const isFinderCell = (r: number, c: number) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= s - 7) ||
    (r >= s - 7 && c < 7);

  const shapes: string[] = [];
  for (let r = 0; r < s; r++) {
    for (let c = 0; c < s; c++) {
      if (hasLogo && Math.abs(r - center) <= padModules && Math.abs(c - center) <= padModules) {
        continue;
      }
      if (qr.modules.get(r, c)) {
        if (moduleShape === "dots" && !isFinderCell(r, c)) {
          shapes.push(`<circle cx="${c + 0.5}" cy="${r + 0.5}" r="0.42" fill="#09090B"/>`);
        } else {
          shapes.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="#09090B"/>`);
        }
      }
    }
  }

  let logoLayer = "";
  if (hasLogo) {
    const cutoutW = Math.max(7, Math.floor(s * 0.3));
    const cutoutH = logoPreset === "TAPTAG" ? Math.max(4.5, cutoutW * 0.45) : cutoutW;
    const cutoutX = (s - cutoutW) / 2;
    const cutoutY = (s - cutoutH) / 2;

    logoLayer += `<rect x="${cutoutX}" y="${cutoutY}" width="${cutoutW}" height="${cutoutH}" rx="0.9" fill="#FFFFFF"/>`;

    if (logoPreset === "TAPTAG") {
      const pillW = cutoutW * 0.88;
      const pillH = cutoutH * 0.84;
      const pillX = (s - pillW) / 2;
      const pillY = (s - pillH) / 2;
      logoLayer += `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="0.7" fill="#09090B"/>`;
      logoLayer += `<text x="${s / 2}" y="${s / 2 + pillH * 0.2}" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-weight="900" letter-spacing="-0.04" font-size="${pillH * 0.56}" fill="#FFFFFF">taptag.</text>`;
    } else if (logoPreset === "CUSTOM" && logoDataUrl) {
      const innerDim = cutoutW * 0.82;
      const innerXY = (s - innerDim) / 2;
      const safeHref = logoDataUrl.replace(/"/g, "&quot;");
      logoLayer += `<image href="${safeHref}" x="${innerXY}" y="${innerXY}" width="${innerDim}" height="${innerDim}" preserveAspectRatio="xMidYMid meet"/>`;
    }
  }

  let captionLayer = "";
  if (frameCaption) {
    const escaped = frameCaption
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    captionLayer = `<rect x="-${vbPad}" y="${s + 0.5}" width="${totalW}" height="${captionExtra + 1}" fill="#09090B"/>
    <text x="${s / 2}" y="${s + 3.4}" text-anchor="middle" font-family="Space Grotesk, IBM Plex Sans Arabic, Arial, sans-serif" font-weight="700" font-size="2.2" fill="#FFFFFF">${escaped}</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${Math.round((1024 * totalH) / totalW)}" viewBox="-${vbPad} -${vbPad} ${totalW} ${totalH}" shape-rendering="${moduleShape === "dots" ? "geometricPrecision" : "crispEdges"}">
  <rect x="-${vbPad}" y="-${vbPad}" width="${totalW}" height="${totalH}" fill="#FFFFFF"/>
  ${shapes.join("")}
  ${logoLayer}
  ${captionLayer}
</svg>`;
}

/**
 * Renders high-resolution 1024px PNG (with center typographic/custom logo & caption) via canvas.
 */
export async function buildExportQrPngDataUrl(
  value: string,
  logoPreset: "NONE" | "TAPTAG" | "CUSTOM" = "NONE",
  logoDataUrl: string | null = null,
  options?: { moduleShape?: "square" | "dots"; frameCaption?: string | null }
): Promise<string> {
  const svgString = await buildExportQrSvg(value, logoPreset, logoDataUrl, options);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const blobUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = 1024;
      const h = img.height && img.width ? Math.round((w * img.height) / img.width) : 1024;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(blobUrl);
      reject(err);
    };
    img.src = blobUrl;
  });
}
