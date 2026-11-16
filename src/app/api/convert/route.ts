import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import { marked } from "marked";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  buildDocxBufferFromText,
  escapeXml,
  getExtension,
  htmlToMarkdownBasic,
  parseTabularText,
  rtfToText,
  serializeTabularRows,
  stripHtmlToText,
  textToRtf,
} from "@/lib/conversion-helpers";

const SUPPORTED_SERVER_TARGETS = new Set([
  "xlsx",
  "docx",
  "pdf",
  "csv",
  "tsv",
  "json",
  "yaml",
  "yml",
  "xml",
  "sql",
  "html",
  "md",
  "rtf",
  "txt",
]);

const ConvertServerSchema = z.object({
  fileName: z.string().min(1).max(260),
  fileMimeType: z.string().max(180).optional(),
  fileDataBase64: z.string().min(1).max(8_000_000),
  targetExt: z.string().min(1).max(16),
});

function toWinAnsiSafe(line: string): string {
  // Replace non-WinAnsi glyphs gracefully on server fallback PDF so pdf-lib StandardFonts never throws
  return line.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function isOle2LegacyBinary(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  );
}

function unwrapExcelCellValue(cellVal: unknown): unknown {
  if (cellVal === null || cellVal === undefined) return "";
  if (cellVal instanceof Date) {
    const iso = cellVal.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
  }
  if (typeof cellVal === "object") {
    const obj = cellVal as Record<string, unknown>;
    if ("result" in obj) return unwrapExcelCellValue(obj.result);
    if ("richText" in obj && Array.isArray(obj.richText)) {
      return obj.richText
        .map((r) =>
          r && typeof r === "object" && "text" in r
            ? String((r as { text: unknown }).text)
            : ""
        )
        .join("");
    }
    if ("text" in obj) return unwrapExcelCellValue(obj.text);
    if ("hyperlink" in obj) return String(obj.hyperlink || "");
    if ("error" in obj) return String(obj.error || "");
  }
  return cellVal;
}

async function buildBasicPdfFromText(text: string, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const lineHeight = 15;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(toWinAnsiSafe(title), {
    x: margin,
    y,
    size: 14,
    font: bold,
    color: rgb(0.05, 0.05, 0.07),
  });
  y -= 26;

  const rawLines = text.split(/\r?\n/);
  const wrapped: string[] = [];
  for (const rl of rawLines) {
    const clean = toWinAnsiSafe(rl);
    if (clean.length <= 82) {
      wrapped.push(clean);
    } else {
      for (let i = 0; i < clean.length; i += 82) {
        wrapped.push(clean.slice(i, i + 82));
      }
    }
  }

  for (const line of wrapped) {
    if (y < margin + 20) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: 10.5,
      font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= lineHeight;
  }

  return await doc.save();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ConvertServerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid conversion request" }, { status: 400 });
    }

    const { fileName, fileDataBase64, targetExt } = parsed.data;
    const srcExt = getExtension(fileName);
    const tgtExt = targetExt.toLowerCase();
    if (!SUPPORTED_SERVER_TARGETS.has(tgtExt)) {
      return NextResponse.json(
        { error: `Unsupported server conversion target format: ${tgtExt}` },
        { status: 400 }
      );
    }
    const baseName = fileName.replace(/\.[^.]+$/, "") || "converted";

    const rawB64 = fileDataBase64.includes(",")
      ? fileDataBase64.split(",")[1]
      : fileDataBase64;
    const inputBuf = Buffer.from(rawB64, "base64");
    if (inputBuf.byteLength === 0) {
      return NextResponse.json(
        { error: "Input file payload is empty" },
        { status: 400 }
      );
    }

    // 1. Extract text/html from PDF, DOCX, or XLSX
    let extractedText = "";
    let extractedHtml = "";
    let extractedRows: Record<string, unknown>[] | null = null;

    if (srcExt === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(inputBuf));
      const res = await extractText(pdf, { mergePages: true });
      extractedText = Array.isArray(res.text) ? res.text.join("\n\n") : String(res.text || "");
      extractedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeXml(baseName)}</title></head><body><pre style="font-family:sans-serif;white-space:pre-wrap">${escapeXml(extractedText)}</pre></body></html>`;
    } else if (srcExt === "docx" || srcExt === "doc") {
      if (isOle2LegacyBinary(inputBuf)) {
        return NextResponse.json(
          {
            error:
              "Legacy binary .doc (OLE2 97-2003) cannot be parsed directly — please re-save as .docx, .rtf, or .pdf and retry.",
          },
          { status: 400 }
        );
      }
      const headUtf8 = inputBuf.toString("utf8", 0, Math.min(inputBuf.length, 64)).trimStart();
      if (inputBuf[0] === 0x50 && inputBuf[1] === 0x4b) {
        const htmlRes = await mammoth.convertToHtml({ buffer: inputBuf });
        const textRes = await mammoth.extractRawText({ buffer: inputBuf });
        extractedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeXml(baseName)}</title></head><body>${htmlRes.value}</body></html>`;
        extractedText = textRes.value || stripHtmlToText(htmlRes.value);
      } else if (headUtf8.startsWith("{\\rtf")) {
        extractedText = rtfToText(inputBuf.toString("utf8"));
      } else if (/^<(?:!doctype|html)/i.test(headUtf8)) {
        const rawHtml = inputBuf.toString("utf8");
        extractedHtml = rawHtml;
        extractedText = stripHtmlToText(rawHtml);
      } else {
        extractedText = inputBuf.toString("utf8");
      }
    } else if (srcExt === "xlsx" || srcExt === "xls") {
      if (isOle2LegacyBinary(inputBuf)) {
        return NextResponse.json(
          {
            error:
              "Legacy binary .xls (OLE2 97-2003) is unsupported — please re-save as .xlsx or .csv and retry.",
          },
          { status: 400 }
        );
      }
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(inputBuf as unknown as ArrayBuffer);
      const ws = wb.worksheets[0];
      const rows: Record<string, unknown>[] = [];
      if (ws) {
        const headers: string[] = [];
        ws.eachRow((row, rowNumber) => {
          const vals = row.values as unknown[];
          if (rowNumber === 1) {
            for (let c = 1; c < vals.length; c++) {
              headers[c] = String(unwrapExcelCellValue(vals[c]) || `col_${c}`);
            }
          } else {
            const obj: Record<string, unknown> = {};
            for (let c = 1; c < Math.max(headers.length, vals.length); c++) {
              const key = headers[c] || `col_${c}`;
              obj[key] = unwrapExcelCellValue(vals[c]);
            }
            rows.push(obj);
          }
        });
      }
      extractedRows = rows;
      extractedText = serializeTabularRows("txt", rows, baseName);
    } else {
      const rawUtf8 = inputBuf.toString("utf8");
      if (["csv", "tsv", "json", "yaml", "yml", "xml"].includes(srcExt)) {
        try {
          extractedRows = parseTabularText(srcExt, rawUtf8);
        } catch (parseErr) {
          return NextResponse.json(
            {
              error: `Invalid ${srcExt.toUpperCase()} content: ${
                parseErr instanceof Error ? parseErr.message : "parse error"
              }`,
            },
            { status: 400 }
          );
        }
        extractedText = serializeTabularRows("txt", extractedRows, baseName);
      } else if (srcExt === "html" || srcExt === "htm") {
        extractedHtml = rawUtf8;
        extractedText = stripHtmlToText(rawUtf8);
      } else if (srcExt === "md" || srcExt === "markdown") {
        extractedText = rawUtf8;
        const rendered = await marked.parse(rawUtf8);
        extractedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeXml(baseName)}</title></head><body>${rendered}</body></html>`;
      } else if (srcExt === "rtf") {
        extractedText = rtfToText(rawUtf8);
      } else {
        extractedText = rawUtf8;
      }
    }

    // 2. Produce Target Output
    let outBuffer: Buffer;
    let outMime = "application/octet-stream";

    if (tgtExt === "xlsx") {
      const rows = extractedRows || parseTabularText("txt", extractedText);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("AI mata Export");
      const cols = Array.from(
        rows.reduce<Set<string>>((set, r) => {
          Object.keys(r).forEach((k) => set.add(k));
          return set;
        }, new Set())
      );
      if (cols.length > 0) {
        ws.columns = cols.map((c) => ({ header: c, key: c, width: 22 }));
        rows.forEach((r) => ws.addRow(r));
        ws.getRow(1).font = { bold: true };
      }
      const arrBuf = await wb.xlsx.writeBuffer();
      outBuffer = Buffer.from(arrBuf);
      outMime =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (tgtExt === "docx") {
      const docxBytes = await buildDocxBufferFromText(extractedText, baseName);
      outBuffer = Buffer.from(docxBytes);
      outMime =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (tgtExt === "pdf") {
      const textForPdf = extractedRows
        ? serializeTabularRows("txt", extractedRows, baseName)
        : extractedText;
      const pdfBytes = await buildBasicPdfFromText(textForPdf, baseName);
      outBuffer = Buffer.from(pdfBytes);
      outMime = "application/pdf";
    } else if (
      ["csv", "tsv", "json", "yaml", "yml", "xml", "sql"].includes(tgtExt)
    ) {
      const rows =
        extractedRows ||
        (tgtExt === "json" && extractedText
          ? [{ fileName, sourceExt: srcExt, content: extractedText }]
          : parseTabularText("txt", extractedText));
      const serialized = serializeTabularRows(tgtExt, rows, baseName);
      outBuffer = Buffer.from(serialized, "utf8");
      outMime =
        tgtExt === "json"
          ? "application/json;charset=utf-8"
          : tgtExt === "csv"
          ? "text/csv;charset=utf-8"
          : "text/plain;charset=utf-8";
    } else if (tgtExt === "html") {
      const htmlOut =
        extractedHtml ||
        (extractedRows
          ? serializeTabularRows("html", extractedRows, baseName)
          : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeXml(baseName)}</title></head><body><pre style="font-family:sans-serif;white-space:pre-wrap">${escapeXml(extractedText)}</pre></body></html>`);
      outBuffer = Buffer.from(htmlOut, "utf8");
      outMime = "text/html;charset=utf-8";
    } else if (tgtExt === "md") {
      const mdOut = extractedRows
        ? serializeTabularRows("md", extractedRows, baseName)
        : extractedHtml
        ? htmlToMarkdownBasic(extractedHtml)
        : extractedText;
      outBuffer = Buffer.from(mdOut, "utf8");
      outMime = "text/markdown;charset=utf-8";
    } else if (tgtExt === "rtf") {
      outBuffer = Buffer.from(textToRtf(extractedText), "utf8");
      outMime = "application/rtf";
    } else {
      outBuffer = Buffer.from(extractedText, "utf8");
      outMime = "text/plain;charset=utf-8";
    }

    return NextResponse.json({
      success: true,
      outputFileName: `${baseName}.${tgtExt}`,
      outputMimeType: outMime,
      outputSize: outBuffer.byteLength,
      outputBase64: outBuffer.toString("base64"),
      extractedPreview: extractedText.slice(0, 600),
    });
  } catch (error) {
    console.error("POST /api/convert error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Conversion failed for the provided file",
      },
      { status: 500 }
    );
  }
}
