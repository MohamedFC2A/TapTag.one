import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  extractDataFromRawContent,
  extractFromSharedLink,
} from "@/lib/link-extractor";

const ExtractRequestSchema = z.object({
  mode: z.enum(["URL", "TEXT"]).default("URL"),
  url: z.string().trim().max(4000).optional(),
  rawText: z.string().max(500_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExtractRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid extraction request" },
        { status: 400 }
      );
    }

    const { mode, url, rawText } = parsed.data;

    if (mode === "TEXT" || (!url && rawText)) {
      if (!rawText || !rawText.trim()) {
        return NextResponse.json(
          { error: "Please provide text, HTML, or shared contact content." },
          { status: 400 }
        );
      }
      const result = extractDataFromRawContent(rawText, url || null, "TEXT", "DIRECT_TEXT");
      return NextResponse.json({ success: true, result });
    }

    if (!url || !url.trim()) {
      return NextResponse.json(
        { error: "Please enter a share link URL." },
        { status: 400 }
      );
    }

    const result = await extractFromSharedLink(url.trim());
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("POST /api/extract error:", error);
    return NextResponse.json(
      { error: "Failed to extract contact data from link" },
      { status: 500 }
    );
  }
}
