"use client";

import React, { useMemo } from "react";
import QRCode from "qrcode";
import { MATA_WORDMARK_PATHS } from "@/lib/mata-brand";

export type QrLogoPreset = "NONE" | "MATA" | "TAPTAG" | "CUSTOM";
export type QrModuleShape = "square" | "dots";

interface QrRenderMatrixProps {
  value: string;
  logoPreset?: QrLogoPreset;
  logoDataUrl?: string | null;
  moduleShape?: QrModuleShape;
  sizeClass?: string;
}

interface QrLayout {
  size: number;
  cells: Array<{ x: number; y: number; isFinder: boolean }>;
  hasLogo: boolean;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
}

/**
 * Shared mathematical QR layout builder ensuring the live preview SVG and exported
 * SVG/PNG use identical quiet-zone cutouts, zero border frames, and exact centering
 * well within ISO 18004 Level H (30%) error-correction capacity.
 */
function buildQrLayout(
  value: string,
  logoPreset: QrLogoPreset,
  logoDataUrl: string | null
): QrLayout {
  const hasLogo =
    logoPreset === "MATA" ||
    logoPreset === "TAPTAG" ||
    (logoPreset === "CUSTOM" && Boolean(logoDataUrl));

  const qr = QRCode.create(value || "https://taptag.one", {
    errorCorrectionLevel: hasLogo ? "H" : "M",
  });
  const size = qr.modules.size;
  const center = (size - 1) / 2;

  // Rectangular horizontal clearing for wide wordmarks ("Mata AI", "taptag.");
  // square clearing for custom emblem images. Keeps module erasure ~3.5%-6.5%.
  const halfCols = !hasLogo
    ? -1
    : logoPreset === "MATA"
    ? Math.max(4, Math.min(8, Math.floor(size * 0.175)))
    : logoPreset === "TAPTAG"
    ? Math.max(4, Math.min(7, Math.floor(size * 0.155)))
    : Math.max(2, Math.min(5, Math.floor(size * 0.11)));

  const halfRows = !hasLogo
    ? -1
    : logoPreset === "CUSTOM"
    ? halfCols
    : Math.max(1, Math.min(3, Math.floor(size * 0.055)));

  const isFinderCell = (r: number, c: number) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= size - 7) ||
    (r >= size - 7 && c < 7);

  const cells: Array<{ x: number; y: number; isFinder: boolean }> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (
        hasLogo &&
        Math.abs(r - center) <= halfRows &&
        Math.abs(c - center) <= halfCols
      ) {
        continue;
      }
      if (qr.modules.get(r, c)) {
        cells.push({ x: c, y: r, isFinder: isFinderCell(r, c) });
      }
    }
  }

  const boxX = center - halfCols;
  const boxY = center - halfRows;
  const boxW = halfCols * 2 + 1;
  const boxH = halfRows * 2 + 1;

  return { size, cells, hasLogo, boxX, boxY, boxW, boxH };
}

function computeMataTransform(boxX: number, boxY: number, boxW: number, boxH: number) {
  const vw = 350;
  const vh = 66;
  const padX = Math.max(0.45, boxW * 0.07);
  const padY = Math.max(0.32, boxH * 0.12);
  const innerW = boxW - padX * 2;
  const innerH = boxH - padY * 2;
  const scale = Math.min(innerW / vw, innerH / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  const tx = boxX + (boxW - drawW) / 2;
  const ty = boxY + (boxH - drawH) / 2;
  return { scale, tx, ty };
}

/**
 * Renders a crisp high-contrast monochrome QR code SVG with exact mathematical
 * centering of the frameless Supra-script "Mata AI" / "taptag." / custom mark.
 */
export function QrRenderMatrix({
  value,
  logoPreset = "NONE",
  logoDataUrl = null,
  moduleShape = "square",
  sizeClass = "w-48 h-48 sm:w-52 sm:h-52",
}: QrRenderMatrixProps) {
  const layout = useMemo(
    () => buildQrLayout(value, logoPreset, logoDataUrl),
    [value, logoPreset, logoDataUrl]
  );

  const s = layout.size;
  const vbPad = 2;
  const total = s + vbPad * 2;
  const mataTx = computeMataTransform(layout.boxX, layout.boxY, layout.boxW, layout.boxH);

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClass}`}>
      <svg
        viewBox={`-${vbPad} -${vbPad} ${total} ${total}`}
        className="w-full h-full"
        shapeRendering={moduleShape === "dots" ? "geometricPrecision" : "crispEdges"}
        role="img"
        aria-label="taptag | Mata AI QR"
      >
        <rect
          x={-vbPad}
          y={-vbPad}
          width={total}
          height={total}
          fill="#FFFFFF"
        />

        {layout.cells.map((cell, idx) =>
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

        {/* Pure frameless white quiet-zone clearing & centered mark inside SVG space */}
        {layout.hasLogo && (
          <rect
            x={layout.boxX}
            y={layout.boxY}
            width={layout.boxW}
            height={layout.boxH}
            fill="#FFFFFF"
          />
        )}

        {logoPreset === "MATA" && (
          <g transform={`translate(${mataTx.tx}, ${mataTx.ty}) scale(${mataTx.scale})`}>
            {MATA_WORDMARK_PATHS.map((d, idx) => (
              <path
                key={idx}
                d={d}
                fill="#09090B"
                opacity={idx === MATA_WORDMARK_PATHS.length - 1 ? 0.9 : 1}
              />
            ))}
          </g>
        )}

        {logoPreset === "TAPTAG" && (
          <text
            x={s / 2}
            y={s / 2 + layout.boxH * 0.22}
            textAnchor="middle"
            fontFamily="var(--font-taptag), Archivo, Helvetica Neue, Arial, sans-serif"
            fontWeight="900"
            letterSpacing="-0.04"
            fontSize={Math.min(layout.boxH * 0.68, layout.boxW * 0.23)}
            fill="#09090B"
          >
            taptag.
          </text>
        )}

        {logoPreset === "CUSTOM" && logoDataUrl && (
          <image
            href={logoDataUrl}
            x={layout.boxX + 0.45}
            y={layout.boxY + 0.45}
            width={Math.max(1, layout.boxW - 0.9)}
            height={Math.max(1, layout.boxH - 0.9)}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Generates an SVG string containing the QR matrix, module style, frameless centered
 * Supra-script "Mata AI" / "taptag." / custom logo, and optional frame caption.
 */
export async function buildExportQrSvg(
  value: string,
  logoPreset: QrLogoPreset = "NONE",
  logoDataUrl: string | null = null,
  options?: { moduleShape?: QrModuleShape; frameCaption?: string | null }
): Promise<string> {
  const moduleShape = options?.moduleShape || "square";
  const frameCaption = options?.frameCaption?.trim() || "";
  const layout = buildQrLayout(value, logoPreset, logoDataUrl);
  const s = layout.size;
  const vbPad = 2;
  const captionExtra = frameCaption ? 4.5 : 0;
  const totalW = s + vbPad * 2;
  const totalH = s + vbPad * 2 + captionExtra;

  const shapes = layout.cells.map((cell) =>
    moduleShape === "dots" && !cell.isFinder
      ? `<circle cx="${cell.x + 0.5}" cy="${cell.y + 0.5}" r="0.42" fill="#09090B"/>`
      : `<rect x="${cell.x}" y="${cell.y}" width="1" height="1" fill="#09090B"/>`
  );

  let logoLayer = "";
  if (layout.hasLogo) {
    logoLayer += `<rect x="${layout.boxX}" y="${layout.boxY}" width="${layout.boxW}" height="${layout.boxH}" fill="#FFFFFF"/>`;

    if (logoPreset === "MATA") {
      const { scale, tx, ty } = computeMataTransform(
        layout.boxX,
        layout.boxY,
        layout.boxW,
        layout.boxH
      );
      const mataSvgPaths = MATA_WORDMARK_PATHS.map(
        (d, idx) =>
          `<path d="${d}" fill="#09090B"${idx === MATA_WORDMARK_PATHS.length - 1 ? ' opacity="0.9"' : ""}/>`
      ).join("");
      logoLayer += `<g transform="translate(${tx}, ${ty}) scale(${scale})">${mataSvgPaths}</g>`;
    } else if (logoPreset === "TAPTAG") {
      const fontSize = Math.min(layout.boxH * 0.68, layout.boxW * 0.23);
      logoLayer += `<text x="${s / 2}" y="${s / 2 + layout.boxH * 0.22}" text-anchor="middle" font-family="Archivo, Helvetica Neue, Arial, sans-serif" font-weight="900" letter-spacing="-0.04" font-size="${fontSize}" fill="#09090B">taptag.</text>`;
    } else if (logoPreset === "CUSTOM" && logoDataUrl) {
      const safeHref = logoDataUrl.replace(/"/g, "&quot;");
      const dimX = Math.max(1, layout.boxW - 0.9);
      const dimY = Math.max(1, layout.boxH - 0.9);
      logoLayer += `<image href="${safeHref}" x="${layout.boxX + 0.45}" y="${layout.boxY + 0.45}" width="${dimX}" height="${dimY}" preserveAspectRatio="xMidYMid meet"/>`;
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
 * Renders high-resolution 1024px PNG (with center frameless logo & caption) via canvas.
 */
export async function buildExportQrPngDataUrl(
  value: string,
  logoPreset: QrLogoPreset = "NONE",
  logoDataUrl: string | null = null,
  options?: { moduleShape?: QrModuleShape; frameCaption?: string | null }
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
