import JSZip from "jszip";
import yaml from "yaml";
import Papa from "papaparse";

export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB

export type ConversionCategory =
  | "IMAGE"
  | "DOCUMENT"
  | "DATA"
  | "AUDIO"
  | "VIDEO"
  | "ARCHIVE"
  | "ANY";

export interface FormatInfo {
  ext: string;
  label: string;
  mime: string;
  category: ConversionCategory;
}

export const ALL_TARGET_FORMATS: FormatInfo[] = [
  // Images
  { ext: "png", label: "PNG", mime: "image/png", category: "IMAGE" },
  { ext: "jpg", label: "JPEG", mime: "image/jpeg", category: "IMAGE" },
  { ext: "webp", label: "WEBP", mime: "image/webp", category: "IMAGE" },
  { ext: "avif", label: "AVIF", mime: "image/avif", category: "IMAGE" },
  { ext: "gif", label: "GIF", mime: "image/gif", category: "IMAGE" },
  { ext: "bmp", label: "BMP", mime: "image/bmp", category: "IMAGE" },
  { ext: "tiff", label: "TIFF", mime: "image/tiff", category: "IMAGE" },
  { ext: "ico", label: "ICO", mime: "image/x-icon", category: "IMAGE" },
  { ext: "svg", label: "SVG", mime: "image/svg+xml", category: "IMAGE" },
  // Documents
  { ext: "pdf", label: "PDF", mime: "application/pdf", category: "DOCUMENT" },
  {
    ext: "docx",
    label: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "DOCUMENT",
  },
  { ext: "txt", label: "TXT", mime: "text/plain;charset=utf-8", category: "DOCUMENT" },
  { ext: "md", label: "Markdown", mime: "text/markdown;charset=utf-8", category: "DOCUMENT" },
  { ext: "html", label: "HTML", mime: "text/html;charset=utf-8", category: "DOCUMENT" },
  { ext: "rtf", label: "RTF", mime: "application/rtf", category: "DOCUMENT" },
  // Data / Spreadsheets / Configs
  {
    ext: "xlsx",
    label: "XLSX",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "DATA",
  },
  { ext: "csv", label: "CSV", mime: "text/csv;charset=utf-8", category: "DATA" },
  { ext: "tsv", label: "TSV", mime: "text/tab-separated-values;charset=utf-8", category: "DATA" },
  { ext: "json", label: "JSON", mime: "application/json;charset=utf-8", category: "DATA" },
  { ext: "yaml", label: "YAML", mime: "application/yaml;charset=utf-8", category: "DATA" },
  { ext: "xml", label: "XML", mime: "application/xml;charset=utf-8", category: "DATA" },
  { ext: "sql", label: "SQL", mime: "application/sql;charset=utf-8", category: "DATA" },
  { ext: "toml", label: "TOML", mime: "application/toml;charset=utf-8", category: "DATA" },
  { ext: "ini", label: "INI", mime: "text/plain;charset=utf-8", category: "DATA" },
  { ext: "env", label: "ENV", mime: "text/plain;charset=utf-8", category: "DATA" },
  // Audio & Video
  { ext: "wav", label: "WAV", mime: "audio/wav", category: "AUDIO" },
  { ext: "mp3", label: "MP3", mime: "audio/mpeg", category: "AUDIO" },
  { ext: "ogg", label: "OGG", mime: "audio/ogg", category: "AUDIO" },
  { ext: "webm", label: "WEBM", mime: "video/webm", category: "VIDEO" },
  { ext: "mp4", label: "MP4", mime: "video/mp4", category: "VIDEO" },
  // Archives & Binary
  { ext: "zip", label: "ZIP", mime: "application/zip", category: "ARCHIVE" },
  { ext: "tar", label: "TAR", mime: "application/x-tar", category: "ARCHIVE" },
  { ext: "b64.txt", label: "BASE64", mime: "text/plain;charset=utf-8", category: "ANY" },
  { ext: "hex.txt", label: "HEX", mime: "text/plain;charset=utf-8", category: "ANY" },
];

export function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

export function detectSourceCategory(ext: string, mime = ""): ConversionCategory {
  const e = ext.toLowerCase();
  if (
    ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tiff", "tif", "svg", "ico", "heic"].includes(e) ||
    mime.startsWith("image/")
  ) {
    return "IMAGE";
  }
  if (["xlsx", "xls", "csv", "tsv", "json", "yaml", "yml", "xml", "sql", "toml", "ini", "env"].includes(e)) {
    return "DATA";
  }
  if (["pdf", "docx", "doc", "txt", "md", "markdown", "html", "htm", "rtf", "log"].includes(e)) {
    return "DOCUMENT";
  }
  if (
    ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"].includes(e) ||
    mime.startsWith("audio/")
  ) {
    return "AUDIO";
  }
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(e) || mime.startsWith("video/")) {
    return "VIDEO";
  }
  if (["zip", "tar", "gz", "tgz"].includes(e)) {
    return "ARCHIVE";
  }
  return "ANY";
}

export function getSupportedTargetsForSource(ext: string, mime = ""): string[] {
  const cat = detectSourceCategory(ext, mime);
  const e = ext.toLowerCase();
  const norm =
    e === "jpeg"
      ? "jpg"
      : e === "yml"
      ? "yaml"
      : e === "markdown"
      ? "md"
      : e === "htm"
      ? "html"
      : e === "tif"
      ? "tiff"
      : e;

  if (cat === "IMAGE") {
    return [
      "png",
      "jpg",
      "webp",
      "avif",
      "bmp",
      "tiff",
      "ico",
      "svg",
      "pdf",
      "zip",
      "tar",
      "b64.txt",
      "hex.txt",
    ].filter((t) => t !== norm);
  }
  if (cat === "DATA") {
    return [
      "xlsx",
      "csv",
      "tsv",
      "json",
      "yaml",
      "xml",
      "sql",
      "toml",
      "ini",
      "env",
      "html",
      "md",
      "txt",
      "pdf",
      "docx",
      "rtf",
      "zip",
      "tar",
      "b64.txt",
      "hex.txt",
    ].filter((t) => t !== norm);
  }
  if (cat === "DOCUMENT") {
    return [
      "pdf",
      "docx",
      "txt",
      "md",
      "html",
      "rtf",
      "json",
      "csv",
      "xlsx",
      "png",
      "jpg",
      "webp",
      "svg",
      "zip",
      "tar",
      "b64.txt",
      "hex.txt",
    ].filter((t) => t !== norm);
  }
  if (cat === "AUDIO" || cat === "VIDEO") {
    return ["wav", "json", "zip", "tar", "b64.txt", "hex.txt"].filter((t) => t !== norm);
  }
  if (cat === "ARCHIVE") {
    if (norm === "zip") {
      return ["tar", "json", "txt", "csv", "md", "b64.txt", "hex.txt"];
    }
    return ["zip", "tar", "b64.txt", "hex.txt"].filter((t) => t !== norm);
  }
  return ["zip", "tar", "b64.txt", "hex.txt"].filter((t) => t !== norm);
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function decodeXmlEntities(v: string): string {
  return v
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToMarkdownBasic(html: string): string {
  let out = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  out = out.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  out = out.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  out = out.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  out = out.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  return stripHtmlToText(out);
}

export function textToRtf(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (ch === "\n") return "\\par\n";
      if (code > 127) return `\\u${code}?`;
      return ch;
    })
    .join("");

  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\fs22\n${escaped}\n}`;
}

export function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\u(-?\d+)\??/g, (_, code) => {
      const n = Number(code);
      return String.fromCharCode(n < 0 ? 65536 + n : n);
    })
    .replace(/\{\*?\\[^{}]+\}/g, "")
    .replace(/\\[a-z]+\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .trim();
}

/**
 * Generates a real valid Microsoft Word (.docx) OOXML binary in-memory.
 */
export async function buildDocxBufferFromText(
  text: string,
  title = "taptag | Mata AI Document"
): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  const lines = text.split(/\r?\n/);
  const paragraphs = lines
    .map((line) => {
      const safe = escapeXml(line);
      return `<w:p><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
    })
    .join("");

  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
    ${paragraphs}
    <w:sectPr/>
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({ type: "uint8array" });
}

/**
 * Extracts plain text from a .docx buffer directly in the browser via JSZip.
 */
export async function extractTextFromDocxBuffer(buf: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buf);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) return "";
    const paragraphs = docXml.split(/<\/w:p>/i);
    const outLines: string[] = [];
    for (const p of paragraphs) {
      const texts: string[] = [];
      const regex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(p)) !== null) {
        texts.push(decodeXmlEntities(m[1]));
      }
      if (texts.length > 0) outLines.push(texts.join(""));
    }
    return outLines.join("\n").trim();
  } catch {
    return new TextDecoder().decode(buf);
  }
}

function colIndexToLetter(colIdx: number): string {
  let n = colIdx + 1;
  let str = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    n = Math.floor((n - 1) / 26);
  }
  return str;
}

/**
 * Builds a valid Microsoft Excel (.xlsx) OOXML binary directly in-memory in milliseconds.
 */
export async function buildXlsxBufferFromRows(
  rows: Record<string, unknown>[],
  sheetName = "Data"
): Promise<Uint8Array> {
  const zip = new JSZip();
  const cols = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const allRows: unknown[][] =
    cols.length > 0
      ? [cols, ...rows.map((r) => cols.map((c) => r[c] ?? ""))]
      : [["Empty"]];

  const sheetRowsXml = allRows
    .map((rowVals, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = rowVals
        .map((val, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
          if (typeof val === "number" && Number.isFinite(val)) {
            return `<c r="${ref}"><v>${val}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            String(val ?? "")
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
  );

  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const safeSheet = escapeXml(sheetName.slice(0, 31) || "Data");
  zip.folder("xl")?.file(
    "workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
  );

  zip.folder("xl")?.folder("_rels")?.file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
  );

  zip.folder("xl")?.folder("worksheets")?.file(
    "sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`
  );

  return await zip.generateAsync({ type: "uint8array" });
}

/**
 * Parses an Excel (.xlsx) buffer directly in-memory via JSZip.
 */
export async function parseXlsxBufferToRows(
  buf: ArrayBuffer
): Promise<Record<string, unknown>[]> {
  try {
    const zip = await JSZip.loadAsync(buf);
    const sharedStrings: string[] = [];
    const ssXml = await zip.file("xl/sharedStrings.xml")?.async("string");
    if (ssXml) {
      const siRegex = /<si>([\s\S]*?)<\/si>/gi;
      let sm: RegExpExecArray | null;
      while ((sm = siRegex.exec(ssXml)) !== null) {
        const parts: string[] = [];
        const tRegex = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi;
        let tm: RegExpExecArray | null;
        while ((tm = tRegex.exec(sm[1])) !== null) {
          parts.push(decodeXmlEntities(tm[1]));
        }
        sharedStrings.push(parts.join(""));
      }
    }

    const sheetXml =
      (await zip.file("xl/worksheets/sheet1.xml")?.async("string")) || "";
    if (!sheetXml) return [];

    const grid: string[][] = [];
    const rowRegex = /<row(?:\s+[^>]*)?>([\s\S]*?)<\/row>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRegex.exec(sheetXml)) !== null) {
      const rowCells: string[] = [];
      const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRegex.exec(rm[1])) !== null) {
        const attrs = cm[1];
        const inner = cm[2];
        const typeMatch = attrs.match(/\bt=["']([^"']+)["']/i);
        const cellType = typeMatch ? typeMatch[1] : "";
        if (cellType === "inlineStr") {
          const tMatch = inner.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/i);
          rowCells.push(tMatch ? decodeXmlEntities(tMatch[1]) : "");
        } else {
          const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/i);
          const rawV = vMatch ? decodeXmlEntities(vMatch[1]) : "";
          if (cellType === "s") {
            const idx = Number(rawV);
            rowCells.push(sharedStrings[idx] ?? rawV);
          } else {
            rowCells.push(rawV);
          }
        }
      }
      if (rowCells.length > 0) grid.push(rowCells);
    }

    if (grid.length === 0) return [];
    const headers = grid[0].map((h, i) => h.trim() || `col_${i + 1}`);
    const records: Record<string, unknown>[] = [];
    for (let i = 1; i < grid.length; i++) {
      const r = grid[i];
      const obj: Record<string, unknown> = {};
      headers.forEach((h, cIdx) => {
        obj[h] = r[cIdx] ?? "";
      });
      records.push(obj);
    }
    return records.length > 0
      ? records
      : [Object.fromEntries(headers.map((h, i) => [`col_${i + 1}`, h]))];
  } catch {
    return [];
  }
}

/**
 * Parse tabular or key-value data from CSV, TSV, JSON, YAML, XML, ENV, INI, TOML, SQL.
 */
export function parseTabularText(ext: string, text: string): Record<string, unknown>[] {
  const e = ext.toLowerCase();

  if (e === "json") {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((row) =>
          typeof row === "object" && row !== null ? (row as Record<string, unknown>) : { value: row }
        );
      }
      if (typeof parsed === "object" && parsed !== null) {
        return [parsed as Record<string, unknown>];
      }
      return [{ value: parsed }];
    } catch {
      return [{ value: text }];
    }
  }

  if (e === "yaml" || e === "yml") {
    try {
      const parsed = yaml.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((row) =>
          typeof row === "object" && row !== null ? (row as Record<string, unknown>) : { value: row }
        );
      }
      if (typeof parsed === "object" && parsed !== null) {
        return [parsed as Record<string, unknown>];
      }
      return [{ value: parsed }];
    } catch {
      return [{ value: text }];
    }
  }

  if (e === "csv" || e === "tsv") {
    const res = Papa.parse<Record<string, unknown>>(text.trim(), {
      header: true,
      skipEmptyLines: true,
      delimiter: e === "tsv" ? "\t" : undefined,
    });
    return res.data.length > 0 ? res.data : [{ value: text }];
  }

  if (e === "env" || e === "ini" || e === "toml") {
    const obj: Record<string, unknown> = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";") || trimmed.startsWith("[")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        obj[k] = v;
      }
    }
    return Object.keys(obj).length > 0 ? [obj] : [{ value: text }];
  }

  if (e === "xml") {
    const cleaned = text
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
      .trim();

    const rows: Record<string, unknown>[] = [];
    const rootMatch = cleaned.match(/^<([a-zA-Z0-9_:-]+)(?:\s+[^>]*)?>([\s\S]*)<\/\1>\s*$/);
    const body = rootMatch ? rootMatch[2] : cleaned;

    const childElemRegex = /<([a-zA-Z0-9_:-]+)(\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
    let cm: RegExpExecArray | null;
    const directChildren: { tag: string; attrs: string; inner: string }[] = [];
    while ((cm = childElemRegex.exec(body)) !== null) {
      directChildren.push({ tag: cm[1], attrs: cm[2] || "", inner: cm[3] });
    }

    for (const child of directChildren) {
      const rec: Record<string, unknown> = {};
      const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*["']([^"']*)["']/g;
      let am: RegExpExecArray | null;
      while ((am = attrRegex.exec(child.attrs)) !== null) {
        rec[am[1]] = decodeXmlEntities(am[2]);
      }

      const subFieldRegex = /<([a-zA-Z0-9_:-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
      let fm: RegExpExecArray | null;
      let subCount = 0;
      while ((fm = subFieldRegex.exec(child.inner)) !== null) {
        subCount++;
        rec[fm[1]] = decodeXmlEntities(fm[2].replace(/<[^>]+>/g, ""));
      }

      if (subCount > 0 || Object.keys(rec).length > 0) {
        if (subCount === 0 && child.inner.trim()) {
          rec[child.tag] = decodeXmlEntities(child.inner);
        }
        rows.push(rec);
      }
    }

    if (rows.length === 0 && directChildren.length > 0 && rootMatch) {
      const single: Record<string, unknown> = {};
      for (const child of directChildren) {
        single[child.tag] = decodeXmlEntities(child.inner.replace(/<[^>]+>/g, ""));
      }
      if (Object.keys(single).length > 0) rows.push(single);
    }

    if (rows.length > 0) return rows;
    return [{ xml: text }];
  }

  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, idx) => ({ line: idx + 1, value: line }));
}

export function serializeTabularRows(
  targetExt: string,
  rows: Record<string, unknown>[],
  tableName = "mata_export"
): string {
  const t = targetExt.toLowerCase();

  if (t === "json") {
    return JSON.stringify(rows, null, 2);
  }
  if (t === "yaml" || t === "yml") {
    return yaml.stringify(rows);
  }
  if (t === "csv") {
    return "\uFEFF" + Papa.unparse(rows);
  }
  if (t === "tsv") {
    return Papa.unparse(rows, { delimiter: "\t" });
  }
  if (t === "env") {
    const flat = rows[0] || {};
    return Object.entries(flat)
      .map(([k, v]) => `${k.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}=${JSON.stringify(String(v ?? ""))}`)
      .join("\n");
  }
  if (t === "ini") {
    return rows
      .map((r, idx) => {
        const kv = Object.entries(r)
          .map(([k, v]) => `${k} = ${String(v ?? "")}`)
          .join("\n");
        return `[record_${idx + 1}]\n${kv}`;
      })
      .join("\n\n");
  }
  if (t === "toml") {
    return rows
      .map((r) => {
        const kv = Object.entries(r)
          .map(([k, v]) =>
            typeof v === "number" || typeof v === "boolean"
              ? `${k.replace(/[^a-zA-Z0-9_-]/g, "_")} = ${v}`
              : `${k.replace(/[^a-zA-Z0-9_-]/g, "_")} = ${JSON.stringify(String(v ?? ""))}`
          )
          .join("\n");
        return `[[records]]\n${kv}`;
      })
      .join("\n\n");
  }
  if (t === "xml") {
    const body = rows
      .map((r) => {
        const fields = Object.entries(r)
          .map(([k, v]) => {
            const tag = k.replace(/[^a-zA-Z0-9_-]/g, "_") || "field";
            return `    <${tag}>${escapeXml(String(v ?? ""))}</${tag}>`;
          })
          .join("\n");
        return `  <record>\n${fields}\n  </record>`;
      })
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<records>\n${body}\n</records>`;
  }

  const cols = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );

  if (t === "sql") {
    if (cols.length === 0) return "-- Empty dataset";
    const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, "_") || "mata_export";
    const colList = cols.map((c) => `"${c.replace(/"/g, "")}"`).join(", ");
    return rows
      .map((r) => {
        const vals = cols
          .map((c) => {
            const v = r[c];
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "number" && Number.isFinite(v)) return String(v);
            if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(", ");
        return `INSERT INTO "${safeTable}" (${colList}) VALUES (${vals});`;
      })
      .join("\n");
  }

  if (t === "md") {
    if (cols.length === 0) return "";
    const head = `| ${cols.join(" | ")} |`;
    const sep = `| ${cols.map(() => "---").join(" | ")} |`;
    const lines = rows.map(
      (r) => `| ${cols.map((c) => String(r[c] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`
    );
    return [head, sep, ...lines].join("\n");
  }

  if (t === "html") {
    const th = cols.map((c) => `<th>${escapeXml(c)}</th>`).join("");
    const trs = rows
      .map(
        (r) =>
          `<tr>${cols
            .map((c) => `<td>${escapeXml(String(r[c] ?? ""))}</td>`)
            .join("")}</tr>`
      )
      .join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeXml(tableName)}</title>
<style>body{font-family:system-ui,sans-serif;background:#09090b;color:#fff;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #27272a;padding:8px 10px;text-align:left;font-size:13px}th{background:#121215}</style>
</head>
<body><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  }

  // txt
  return rows
    .map((r) => cols.map((c) => `${c}: ${String(r[c] ?? "")}`).join(" | "))
    .join("\n");
}
