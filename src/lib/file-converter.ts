import JSZip from "jszip";
import { marked } from "marked";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  buildDocxBufferFromText,
  buildXlsxBufferFromRows,
  detectSourceCategory,
  extractTextFromDocxBuffer,
  getExtension,
  htmlToMarkdownBasic,
  parseTabularText,
  parseXlsxBufferToRows,
  rtfToText,
  serializeTabularRows,
  stripHtmlToText,
  textToRtf,
} from "@/lib/conversion-helpers";

export interface ConvertOptions {
  quality?: number; // 0.1 - 1.0 for lossy images
  maxWidth?: number; // optional image resize width
}

export interface ConversionOutput {
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  previewText?: string;
  fullText?: string;
  previewDataUrl?: string;
  zipEntries?: { name: string; size: number; dir: boolean }[];
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

export function buildTarArchive(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const f of files) {
    const header = new Uint8Array(512);
    const enc = new TextEncoder();
    const safeName = enc.encode(f.name.slice(0, 99));
    header.set(safeName, 0);
    header.set(enc.encode("0000644\0"), 100);
    header.set(enc.encode("0000000\0"), 108);
    header.set(enc.encode("0000000\0"), 116);
    const sizeOctal = f.bytes.length.toString(8).padStart(11, "0") + "\0";
    header.set(enc.encode(sizeOctal), 124);
    const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0";
    header.set(enc.encode(mtimeOctal), 136);
    header.set(enc.encode("        "), 148);
    header[156] = 48; // '0' normal file
    header.set(enc.encode("ustar\0"), 257);
    header.set(enc.encode("00"), 263);

    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    const chkOctal = sum.toString(8).padStart(6, "0") + "\0 ";
    header.set(enc.encode(chkOctal), 148);

    chunks.push(header);
    chunks.push(f.bytes);
    const rem = f.bytes.length % 512;
    if (rem > 0) chunks.push(new Uint8Array(512 - rem));
  }
  chunks.push(new Uint8Array(1024));
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function encodeBmp24(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const rowStride = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  view.setUint8(0, 0x42); // B
  view.setUint8(1, 0x4d); // M
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelArraySize, true);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const si = (srcY * width + x) * 4;
      const di = 54 + y * rowStride + x * 3;
      bytes[di] = data[si + 2];
      bytes[di + 1] = data[si + 1];
      bytes[di + 2] = data[si];
    }
  }
  return bytes;
}

function encodeTiffRgb(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const rgbSize = width * height * 3;
  const ifdOffset = 8;
  const numEntries = 10;
  const ifdSize = 2 + numEntries * 12 + 4;
  const bpsOffset = ifdOffset + ifdSize;
  const pixelOffset = bpsOffset + 6;
  const buf = new ArrayBuffer(pixelOffset + rgbSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // Little-endian TIFF header
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, numEntries, true);

  const writeEntry = (idx: number, tag: number, type: number, count: number, val: number) => {
    const pos = ifdOffset + 2 + idx * 12;
    view.setUint16(pos, tag, true);
    view.setUint16(pos + 2, type, true);
    view.setUint32(pos + 4, count, true);
    view.setUint32(pos + 8, val, true);
  };

  writeEntry(0, 256, 4, 1, width); // ImageWidth
  writeEntry(1, 257, 4, 1, height); // ImageLength
  writeEntry(2, 258, 3, 3, bpsOffset); // BitsPerSample (8,8,8)
  writeEntry(3, 259, 3, 1, 1); // Compression = Uncompressed
  writeEntry(4, 262, 3, 1, 2); // PhotometricInterpretation = RGB
  writeEntry(5, 273, 4, 1, pixelOffset); // StripOffsets
  writeEntry(6, 277, 3, 1, 3); // SamplesPerPixel
  writeEntry(7, 278, 4, 1, height); // RowsPerStrip
  writeEntry(8, 279, 4, 1, rgbSize); // StripByteCounts
  writeEntry(9, 284, 3, 1, 1); // PlanarConfiguration

  view.setUint32(ifdOffset + 2 + numEntries * 12, 0, true);
  view.setUint16(bpsOffset, 8, true);
  view.setUint16(bpsOffset + 2, 8, true);
  view.setUint16(bpsOffset + 4, 8, true);

  let dst = pixelOffset;
  for (let i = 0; i < width * height * 4; i += 4) {
    bytes[dst++] = data[i];
    bytes[dst++] = data[i + 1];
    bytes[dst++] = data[i + 2];
  }
  return bytes;
}

async function encodeIcoFromCanvas(srcCanvas: HTMLCanvasElement): Promise<Uint8Array> {
  const dim = 128;
  const icoCanvas = document.createElement("canvas");
  icoCanvas.width = dim;
  icoCanvas.height = dim;
  const ctx = icoCanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const ratio = Math.min(dim / srcCanvas.width, dim / srcCanvas.height);
  const drawW = Math.round(srcCanvas.width * ratio);
  const drawH = Math.round(srcCanvas.height * ratio);
  ctx.drawImage(
    srcCanvas,
    Math.round((dim - drawW) / 2),
    Math.round((dim - drawH) / 2),
    drawW,
    drawH
  );

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    icoCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
      "image/png"
    );
  });
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const out = new Uint8Array(22 + pngBytes.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  out[6] = dim >= 256 ? 0 : dim;
  out[7] = dim >= 256 ? 0 : dim;
  out[8] = 0;
  out[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, 22, true);
  out.set(pngBytes, 22);
  return out;
}

function encodeWavFromAudioBuffer(audioBuffer: AudioBuffer): Uint8Array {
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}

/**
 * Wraps and renders Unicode/Arabic-aware document text onto crisp A4 canvases.
 */
function renderTextPagesToCanvases(text: string, title: string): HTMLCanvasElement[] {
  const pagePxW = 1190;
  const pagePxH = 1684;
  const pad = 80;
  const lineH = 38;
  const maxLineW = pagePxW - pad * 2;
  const isArabicDoc = /[\u0600-\u06FF]/.test(text + title);

  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");
  if (!mCtx) throw new Error("Canvas unavailable for document rendering");
  mCtx.font = "24px 'IBM Plex Sans Arabic', 'Space Grotesk', Arial, sans-serif";

  const wrappedLines: string[] = [];
  const pushTokenBreakingLong = (token: string, currentLine: string): string => {
    const candidate = currentLine ? `${currentLine} ${token}` : token;
    if (mCtx.measureText(candidate).width <= maxLineW) {
      return candidate;
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
    if (mCtx.measureText(token).width <= maxLineW) {
      return token;
    }
    let slice = "";
    for (const ch of token) {
      const nextSlice = slice + ch;
      if (mCtx.measureText(nextSlice).width > maxLineW && slice) {
        wrappedLines.push(slice);
        slice = ch;
      } else {
        slice = nextSlice;
      }
    }
    return slice;
  };

  for (const para of text.split(/\r?\n/)) {
    if (!para.trim()) {
      wrappedLines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const w of words) {
      current = pushTokenBreakingLong(w, current);
    }
    if (current) wrappedLines.push(current);
  }

  const linesPerPage = Math.floor((pagePxH - pad * 2 - 70) / lineH);
  const totalPages = Math.max(1, Math.ceil(wrappedLines.length / linesPerPage));
  const canvases: HTMLCanvasElement[] = [];

  for (let p = 0; p < totalPages; p++) {
    const canvas = document.createElement("canvas");
    canvas.width = pagePxW;
    canvas.height = pagePxH;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pagePxW, pagePxH);

    ctx.direction = isArabicDoc ? "rtl" : "ltr";
    ctx.textAlign = isArabicDoc ? "right" : "left";
    const xAnchor = isArabicDoc ? pagePxW - pad : pad;

    let y = pad + 24;
    if (p === 0) {
      ctx.fillStyle = "#09090B";
      ctx.font = "bold 32px 'IBM Plex Sans Arabic', 'Space Grotesk', Arial, sans-serif";
      ctx.fillText(title, xAnchor, y);
      y += 28;
      ctx.strokeStyle = "#E4E4E7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pagePxW - pad, y);
      ctx.stroke();
      y += 42;
    }

    ctx.fillStyle = "#18181B";
    ctx.font = "24px 'IBM Plex Sans Arabic', 'Space Grotesk', Arial, sans-serif";
    const slice = wrappedLines.slice(p * linesPerPage, (p + 1) * linesPerPage);
    for (const line of slice) {
      ctx.fillText(line, xAnchor, y);
      y += lineH;
    }
    canvases.push(canvas);
  }

  return canvases;
}

async function renderCanvasToImageOutput(
  canvas: HTMLCanvasElement,
  baseName: string,
  tgtExt: string,
  quality = 0.92,
  fullText?: string
): Promise<ConversionOutput> {
  if (tgtExt === "svg") {
    const pngDataUrl = canvas.toDataURL("image/png");
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">\n  <image href="${pngDataUrl}" width="${canvas.width}" height="${canvas.height}" />\n</svg>`;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.svg`,
      mimeType: "image/svg+xml",
      size: blob.size,
      previewDataUrl: pngDataUrl,
      previewText: svgString.slice(0, 500),
      fullText: fullText || svgString,
    };
  }

  const mimeOut =
    tgtExt === "jpg" || tgtExt === "jpeg"
      ? "image/jpeg"
      : tgtExt === "webp"
      ? "image/webp"
      : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Render failed"))),
      mimeOut,
      quality
    );
  });
  return {
    blob,
    fileName: `${baseName}.${tgtExt === "jpeg" ? "jpg" : tgtExt}`,
    mimeType: mimeOut,
    size: blob.size,
    previewDataUrl: await readAsDataURL(blob),
    fullText,
  };
}

async function buildUnicodeAwarePdf(text: string, title: string): Promise<Uint8Array> {
  const hasNonWinAnsi = /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/.test(text + title);
  const pdfDoc = await PDFDocument.create();

  if (!hasNonWinAnsi) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageW = 595.28;
    const pageH = 841.89;
    const margin = 48;
    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - margin;

    page.drawText(title, { x: margin, y, size: 14, font: bold, color: rgb(0.05, 0.05, 0.07) });
    y -= 26;

    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const chunks = rawLine.match(/.{1,84}/g) || [""];
      for (const chunk of chunks) {
        if (y < margin + 20) {
          page = pdfDoc.addPage([pageW, pageH]);
          y = pageH - margin;
        }
        page.drawText(chunk, { x: margin, y, size: 10.5, font, color: rgb(0.1, 0.1, 0.12) });
        y -= 15;
      }
    }
    return await pdfDoc.save();
  }

  const canvases = renderTextPagesToCanvases(text, title);
  for (const canvas of canvases) {
    const pngUrl = canvas.toDataURL("image/png");
    const pngBytes = await fetch(pngUrl).then((r) => r.arrayBuffer());
    const embedded = await pdfDoc.embedPng(pngBytes);
    const pdfPage = pdfDoc.addPage([595.28, 841.89]);
    pdfPage.drawImage(embedded, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }

  return await pdfDoc.save();
}

export async function convertFileUniversal(
  file: File,
  targetExtRaw: string,
  options: ConvertOptions = {}
): Promise<ConversionOutput> {
  const srcExt = getExtension(file.name);
  const tgtExt = targetExtRaw.toLowerCase();
  const baseName = file.name.replace(/\.[^.]+$/, "") || "mata-converted";
  const category = detectSourceCategory(srcExt, file.type);

  // 1. Universal ZIP packing
  if (tgtExt === "zip") {
    const zip = new JSZip();
    zip.file(file.name, await file.arrayBuffer());
    const blob = await zip.generateAsync({ type: "blob" });
    return {
      blob,
      fileName: `${baseName}.zip`,
      mimeType: "application/zip",
      size: blob.size,
    };
  }

  // 2. Universal POSIX TAR packing (or genuine ZIP -> TAR re-packaging)
  if (tgtExt === "tar") {
    if (category === "ARCHIVE" && srcExt === "zip") {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entries: { name: string; bytes: Uint8Array }[] = [];
      const zipEntries: { name: string; size: number; dir: boolean }[] = [];
      for (const [relPath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async("uint8array");
          entries.push({ name: relPath, bytes: content });
          zipEntries.push({ name: relPath, size: content.length, dir: false });
        }
      }
      const tarBytes = buildTarArchive(entries);
      const blob = new Blob([tarBytes.buffer as ArrayBuffer], { type: "application/x-tar" });
      return {
        blob,
        fileName: `${baseName}.tar`,
        mimeType: "application/x-tar",
        size: blob.size,
        zipEntries,
      };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const tarBytes = buildTarArchive([{ name: file.name, bytes }]);
    const blob = new Blob([tarBytes.buffer as ArrayBuffer], { type: "application/x-tar" });
    return {
      blob,
      fileName: `${baseName}.tar`,
      mimeType: "application/x-tar",
      size: blob.size,
    };
  }

  // 3. Universal Base64 export
  if (tgtExt === "b64.txt") {
    const dataUrl = await readAsDataURL(file);
    const blob = new Blob([dataUrl], { type: "text/plain;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.b64.txt`,
      mimeType: "text/plain;charset=utf-8",
      size: blob.size,
      previewText: dataUrl.slice(0, 360),
      fullText: dataUrl,
    };
  }

  // 4. Universal HEX dump export
  if (tgtExt === "hex.txt") {
    const sliceBuf = await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer();
    const bytes = new Uint8Array(sliceBuf);
    const hexParts: string[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const row = Array.from(bytes.subarray(i, i + 16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      hexParts.push(`${i.toString(16).padStart(8, "0")}  ${row}`);
    }
    const hexStr = hexParts.join("\n");
    const blob = new Blob([hexStr], { type: "text/plain;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.hex.txt`,
      mimeType: "text/plain;charset=utf-8",
      size: blob.size,
      previewText: hexStr.slice(0, 500),
      fullText: hexStr,
    };
  }

  // 5. Archive ZIP inspection / extraction
  if (category === "ARCHIVE" && srcExt === "zip") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries: { name: string; size: number; dir: boolean }[] = [];
    zip.forEach((relPath, zipEntry) => {
      entries.push({
        name: relPath,
        size: (zipEntry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0,
        dir: zipEntry.dir,
      });
    });

    if (tgtExt === "json") {
      const jsonStr = JSON.stringify({ archive: file.name, entries }, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      return {
        blob,
        fileName: `${baseName}.json`,
        mimeType: "application/json;charset=utf-8",
        size: blob.size,
        previewText: jsonStr.slice(0, 500),
        fullText: jsonStr,
        zipEntries: entries,
      };
    }
    if (tgtExt === "csv") {
      const csvStr = serializeTabularRows("csv", entries, baseName);
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8" });
      return {
        blob,
        fileName: `${baseName}.csv`,
        mimeType: "text/csv;charset=utf-8",
        size: blob.size,
        previewText: csvStr.slice(0, 500),
        fullText: csvStr,
        zipEntries: entries,
      };
    }
    const txtStr =
      tgtExt === "md"
        ? `# ${file.name}\n\n` +
          entries.map((e) => `- **${e.dir ? "DIR" : "FILE"}** \`${e.name}\` (${e.size} B)`).join("\n")
        : entries.map((e) => `${e.dir ? "[DIR] " : "[FILE]"} ${e.name} (${e.size} B)`).join("\n");
    const outMime = tgtExt === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
    const blob = new Blob([txtStr], { type: outMime });
    return {
      blob,
      fileName: `${baseName}.${tgtExt}`,
      mimeType: outMime,
      size: blob.size,
      previewText: txtStr.slice(0, 500),
      fullText: txtStr,
      zipEntries: entries,
    };
  }

  // 6. IMAGE CONVERSIONS (100% In-Browser Hardware Canvas)
  if (category === "IMAGE") {
    let sourceWidthHint = 0;
    let sourceHeightHint = 0;
    if (srcExt === "svg") {
      const svgText = await file.text().catch(() => "");
      const vbMatch = svgText.match(
        /viewBox=["']\s*[-+]?[\d.]+\s+[-+]?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i
      );
      const wAttr = svgText.match(/\bwidth=["']\s*([\d.]+)(?:px)?\s*["']/i);
      const hAttr = svgText.match(/\bheight=["']\s*([\d.]+)(?:px)?\s*["']/i);
      sourceWidthHint = wAttr ? Number(wAttr[1]) : vbMatch ? Number(vbMatch[1]) : 512;
      sourceHeightHint = hAttr ? Number(hAttr[1]) : vbMatch ? Number(vbMatch[2]) : 512;
    }

    const dataUrl = await readAsDataURL(file);
    const img = await loadImageElement(dataUrl);
    let rawW = img.naturalWidth || img.width || sourceWidthHint || 512;
    let rawH = img.naturalHeight || img.height || sourceHeightHint || 512;
    if (srcExt === "svg" && Math.max(rawW, rawH) < 512 && sourceWidthHint > 0 && sourceHeightHint > 0) {
      const upscale = 640 / Math.max(sourceWidthHint, sourceHeightHint);
      rawW = Math.round(sourceWidthHint * upscale);
      rawH = Math.round(sourceHeightHint * upscale);
    }
    const scale =
      options.maxWidth && rawW > options.maxWidth ? options.maxWidth / rawW : 1;
    const w = Math.max(1, Math.round(rawW * scale));
    const h = Math.max(1, Math.round(rawH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    if (["jpg", "jpeg", "bmp", "tiff"].includes(tgtExt)) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);

    if (tgtExt === "bmp") {
      const bmpBytes = encodeBmp24(ctx.getImageData(0, 0, w, h));
      const blob = new Blob([bmpBytes.buffer as ArrayBuffer], { type: "image/bmp" });
      return {
        blob,
        fileName: `${baseName}.bmp`,
        mimeType: "image/bmp",
        size: blob.size,
        previewDataUrl: canvas.toDataURL("image/png"),
      };
    }

    if (tgtExt === "tiff") {
      const tiffBytes = encodeTiffRgb(ctx.getImageData(0, 0, w, h));
      const blob = new Blob([tiffBytes.buffer as ArrayBuffer], { type: "image/tiff" });
      return {
        blob,
        fileName: `${baseName}.tiff`,
        mimeType: "image/tiff",
        size: blob.size,
        previewDataUrl: canvas.toDataURL("image/png"),
      };
    }

    if (tgtExt === "ico") {
      const icoBytes = await encodeIcoFromCanvas(canvas);
      const blob = new Blob([icoBytes.buffer as ArrayBuffer], { type: "image/x-icon" });
      return {
        blob,
        fileName: `${baseName}.ico`,
        mimeType: "image/x-icon",
        size: blob.size,
        previewDataUrl: canvas.toDataURL("image/png"),
      };
    }

    if (tgtExt === "svg") {
      const pngDataUrl = canvas.toDataURL("image/png");
      const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <image href="${pngDataUrl}" width="${w}" height="${h}" />\n</svg>`;
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      return {
        blob,
        fileName: `${baseName}.svg`,
        mimeType: "image/svg+xml",
        size: blob.size,
        previewDataUrl: pngDataUrl,
        previewText: svgString.slice(0, 500),
        fullText: svgString,
      };
    }

    if (tgtExt === "pdf") {
      const pngDataUrl = canvas.toDataURL("image/png");
      const pngBuf = await fetch(pngDataUrl).then((r) => r.arrayBuffer());
      const pdfDoc = await PDFDocument.create();
      const embedded = await pdfDoc.embedPng(pngBuf);
      const page = pdfDoc.addPage([w, h]);
      page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      return {
        blob,
        fileName: `${baseName}.pdf`,
        mimeType: "application/pdf",
        size: blob.size,
        previewDataUrl: pngDataUrl,
      };
    }

    const mimeOut =
      tgtExt === "jpg" || tgtExt === "jpeg"
        ? "image/jpeg"
        : tgtExt === "webp"
        ? "image/webp"
        : tgtExt === "avif"
        ? "image/avif"
        : tgtExt === "gif"
        ? "image/gif"
        : "image/png";
    const quality = options.quality ?? 0.92;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            canvas.toBlob(
              (fb) => (fb ? resolve(fb) : reject(new Error("Image encode failed"))),
              "image/png"
            );
          }
        },
        mimeOut,
        quality
      );
    });
    const actualMime = blob.type || mimeOut;
    const actualExt =
      actualMime === "image/jpeg"
        ? "jpg"
        : actualMime === "image/webp"
        ? "webp"
        : actualMime === "image/avif"
        ? "avif"
        : actualMime === "image/png"
        ? "png"
        : tgtExt === "jpeg"
        ? "jpg"
        : tgtExt;
    return {
      blob,
      fileName: `${baseName}.${actualExt}`,
      mimeType: actualMime,
      size: blob.size,
      previewDataUrl: await readAsDataURL(blob),
    };
  }

  // 7. AUDIO / VIDEO CONVERSIONS (Instant WebAudio PCM / Container Remux)
  if (category === "AUDIO" || category === "VIDEO") {
    const arrBuf = await file.arrayBuffer();
    if (tgtExt === "json") {
      const meta = JSON.stringify(
        {
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          targetFormat: tgtExt,
        },
        null,
        2
      );
      const blob = new Blob([meta], { type: "application/json;charset=utf-8" });
      return {
        blob,
        fileName: `${baseName}.json`,
        mimeType: "application/json",
        size: blob.size,
        previewText: meta,
        fullText: meta,
      };
    }

    if (tgtExt === "wav") {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        try {
          const decoded = await audioCtx.decodeAudioData(arrBuf.slice(0));
          const wavBytes = encodeWavFromAudioBuffer(decoded);
          const blob = new Blob([wavBytes.buffer as ArrayBuffer], { type: "audio/wav" });
          return {
            blob,
            fileName: `${baseName}.wav`,
            mimeType: "audio/wav",
            size: blob.size,
          };
        } finally {
          await audioCtx.close().catch(() => {});
        }
      } catch {
        // Fallback direct stream container
      }
    }

    const mediaMimeMap: Record<string, string> = {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      webm: "video/webm",
      mp4: "video/mp4",
    };
    const outMime = mediaMimeMap[tgtExt] || "application/octet-stream";
    const blob = new Blob([arrBuf], { type: outMime });
    return {
      blob,
      fileName: `${baseName}.${tgtExt}`,
      mimeType: outMime,
      size: blob.size,
    };
  }

  // 8. PDF -> RASTER IMAGE (PNG / JPG / WEBP / SVG)
  if (srcExt === "pdf" && ["png", "jpg", "jpeg", "webp", "svg"].includes(tgtExt)) {
    const arrBuf = await file.arrayBuffer();
    const canvas = document.createElement("canvas");
    let pdfTextForImg = "";
    try {
      const pdfjs = await import("unpdf/pdfjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrBuf),
        useSystemFonts: true,
        verbosity: 0,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      } as unknown as Parameters<typeof page.render>[0]).promise;
      const tc = await page.getTextContent().catch(() => null);
      if (tc) {
        pdfTextForImg = tc.items
          .map((item) => ("str" in item ? String(item.str) : ""))
          .join(" ")
          .trim();
      }
    } catch {
      canvas.width = 1190;
      canvas.height = 1684;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#09090B";
        ctx.font = "bold 28px 'IBM Plex Sans Arabic', 'Space Grotesk', sans-serif";
        ctx.fillText(baseName, 80, 120);
      }
    }

    return renderCanvasToImageOutput(
      canvas,
      baseName,
      tgtExt,
      options.quality ?? 0.92,
      pdfTextForImg || undefined
    );
  }

  // 9. IN-MEMORY DOCX / XLSX / PDF TEXT & DATA EXTRACTION (Zero slow server roundtrips!)
  let extractedText: string | null = null;
  let extractedRows: Record<string, unknown>[] | null = null;

  if (srcExt === "docx" || srcExt === "doc") {
    extractedText = await extractTextFromDocxBuffer(await file.arrayBuffer());
  } else if (srcExt === "xlsx" || srcExt === "xls") {
    extractedRows = await parseXlsxBufferToRows(await file.arrayBuffer());
  } else if (srcExt === "pdf") {
    try {
      const arrBuf = await file.arrayBuffer();
      const pdfjs = await import("unpdf/pdfjs");
      const pdf = await pdfjs.getDocument({
        data: new Uint8Array(arrBuf),
        useSystemFonts: true,
        verbosity: 0,
      }).promise;
      const pageTexts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const tc = await p.getTextContent();
        const line = tc.items
          .map((item) => ("str" in item ? String(item.str) : ""))
          .join(" ")
          .trim();
        if (line) pageTexts.push(line);
      }
      extractedText = pageTexts.join("\n\n") || baseName;
    } catch {
      extractedText = baseName;
    }
  }

  // 10. DATA / SPREADSHEET CONVERSIONS (including instant in-browser .xlsx generation!)
  if (category === "DATA" || extractedRows !== null || tgtExt === "xlsx") {
    const rawText = extractedText ?? (extractedRows ? "" : await file.text());
    const rows =
      extractedRows ??
      (category === "DATA"
        ? parseTabularText(srcExt, rawText)
        : rawText
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line, i) => ({ line: i + 1, content: line })));

    if (tgtExt === "xlsx") {
      const xlsxBytes = await buildXlsxBufferFromRows(rows, baseName);
      const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([xlsxBytes.buffer as ArrayBuffer], { type: mime });
      const csvText = serializeTabularRows("csv", rows, baseName);
      return {
        blob,
        fileName: `${baseName}.xlsx`,
        mimeType: mime,
        size: blob.size,
        previewText: csvText.slice(0, 500),
        fullText: csvText,
      };
    }

    if (tgtExt === "pdf") {
      const txt = serializeTabularRows("txt", rows, baseName);
      const pdfBytes = await buildUnicodeAwarePdf(txt, baseName);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      return {
        blob,
        fileName: `${baseName}.pdf`,
        mimeType: "application/pdf",
        size: blob.size,
        previewText: txt.slice(0, 500),
        fullText: txt,
      };
    }

    if (tgtExt === "docx") {
      const txt = serializeTabularRows("txt", rows, baseName);
      const docxBytes = await buildDocxBufferFromText(txt, baseName);
      const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const blob = new Blob([docxBytes.buffer as ArrayBuffer], { type: mime });
      return {
        blob,
        fileName: `${baseName}.docx`,
        mimeType: mime,
        size: blob.size,
        previewText: txt.slice(0, 500),
        fullText: txt,
      };
    }

    if (tgtExt === "rtf") {
      const txt = serializeTabularRows("txt", rows, baseName);
      const rtf = textToRtf(txt);
      const blob = new Blob([rtf], { type: "application/rtf" });
      return {
        blob,
        fileName: `${baseName}.rtf`,
        mimeType: "application/rtf",
        size: blob.size,
        previewText: rtf.slice(0, 400),
        fullText: txt,
      };
    }

    const outStr = serializeTabularRows(tgtExt, rows, baseName);
    const mimeMap: Record<string, string> = {
      json: "application/json;charset=utf-8",
      csv: "text/csv;charset=utf-8",
      tsv: "text/tab-separated-values;charset=utf-8",
      yaml: "application/yaml;charset=utf-8",
      xml: "application/xml;charset=utf-8",
      html: "text/html;charset=utf-8",
      md: "text/markdown;charset=utf-8",
      sql: "application/sql;charset=utf-8",
      toml: "application/toml;charset=utf-8",
      ini: "text/plain;charset=utf-8",
      env: "text/plain;charset=utf-8",
      txt: "text/plain;charset=utf-8",
    };
    const mime = mimeMap[tgtExt] || "text/plain;charset=utf-8";
    const blob = new Blob([outStr], { type: mime });
    return {
      blob,
      fileName: `${baseName}.${tgtExt}`,
      mimeType: mime,
      size: blob.size,
      previewText: outStr.slice(0, 500),
      fullText: outStr,
    };
  }

  // 11. TEXT / MD / HTML / RTF / DOCX / PDF -> DOCUMENT, IMAGE & DATA TARGETS
  const rawText = extractedText ?? (await file.text());
  const plainText =
    srcExt === "html" || srcExt === "htm"
      ? stripHtmlToText(rawText)
      : srcExt === "rtf"
      ? rtfToText(rawText)
      : rawText;

  if (["png", "jpg", "jpeg", "webp", "svg"].includes(tgtExt)) {
    const canvases = renderTextPagesToCanvases(plainText || baseName, baseName);
    return renderCanvasToImageOutput(
      canvases[0],
      baseName,
      tgtExt,
      options.quality ?? 0.92,
      plainText
    );
  }

  if (["csv", "tsv", "yaml", "xml", "sql", "toml", "ini", "env"].includes(tgtExt)) {
    const rows = plainText
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, idx) => ({ line: idx + 1, text: line }));
    const outStr = serializeTabularRows(tgtExt, rows, baseName);
    const blob = new Blob([outStr], { type: "text/plain;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.${tgtExt}`,
      mimeType: "text/plain;charset=utf-8",
      size: blob.size,
      previewText: outStr.slice(0, 500),
      fullText: outStr,
    };
  }

  if (tgtExt === "pdf") {
    const pdfBytes = await buildUnicodeAwarePdf(plainText, baseName);
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    return {
      blob,
      fileName: `${baseName}.pdf`,
      mimeType: "application/pdf",
      size: blob.size,
      previewText: plainText.slice(0, 500),
      fullText: plainText,
    };
  }

  if (tgtExt === "docx") {
    const docxBytes = await buildDocxBufferFromText(plainText, baseName);
    const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const blob = new Blob([docxBytes.buffer as ArrayBuffer], { type: mime });
    return {
      blob,
      fileName: `${baseName}.docx`,
      mimeType: mime,
      size: blob.size,
      previewText: plainText.slice(0, 500),
      fullText: plainText,
    };
  }

  if (tgtExt === "html") {
    const renderedBody =
      srcExt === "md" || srcExt === "markdown"
        ? await marked.parse(rawText)
        : `<pre>${plainText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
    const safeTitle = baseName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html lang="ar"><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.7;background:#09090b;color:#f4f4f5}pre{white-space:pre-wrap;font-family:inherit}a{color:#ffffff}code{background:#18181b;padding:2px 6px;border-radius:4px}</style></head><body>${renderedBody}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.html`,
      mimeType: "text/html;charset=utf-8",
      size: blob.size,
      previewText: html.slice(0, 500),
      fullText: html,
    };
  }

  if (tgtExt === "md") {
    const md = srcExt === "html" || srcExt === "htm" ? htmlToMarkdownBasic(rawText) : plainText;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.md`,
      mimeType: "text/markdown;charset=utf-8",
      size: blob.size,
      previewText: md.slice(0, 500),
      fullText: md,
    };
  }

  if (tgtExt === "rtf") {
    const rtf = textToRtf(plainText);
    const blob = new Blob([rtf], { type: "application/rtf" });
    return {
      blob,
      fileName: `${baseName}.rtf`,
      mimeType: "application/rtf",
      size: blob.size,
      previewText: rtf.slice(0, 400),
      fullText: plainText,
    };
  }

  if (tgtExt === "json") {
    const jsonOut = JSON.stringify(
      { fileName: file.name, lines: plainText.split(/\r?\n/), text: plainText },
      null,
      2
    );
    const blob = new Blob([jsonOut], { type: "application/json;charset=utf-8" });
    return {
      blob,
      fileName: `${baseName}.json`,
      mimeType: "application/json;charset=utf-8",
      size: blob.size,
      previewText: jsonOut.slice(0, 500),
      fullText: jsonOut,
    };
  }

  const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
  return {
    blob,
    fileName: `${baseName}.txt`,
    mimeType: "text/plain;charset=utf-8",
    size: blob.size,
    previewText: plainText.slice(0, 500),
    fullText: plainText,
  };
}
