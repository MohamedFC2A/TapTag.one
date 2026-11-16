import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeAiMata } from "@/lib/ai-mata";

const AiMataRequestSchema = z.object({
  mode: z
    .enum([
      "GLOBAL_COMMAND",
      "SECURITY_AUDIT",
      "CONTACT_INTEL",
      "QR_COMPOSER",
      "CONVERSION_ADVISOR",
    ])
    .default("GLOBAL_COMMAND"),
  lang: z.enum(["ar", "en"]).default("ar"),
  prompt: z.string().max(4000).optional(),
  context: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AiMataRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid AI mata request" },
        { status: 400 }
      );
    }

    const result = await executeAiMata(parsed.data);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("POST /api/ai-mata error:", error);
    return NextResponse.json(
      { error: "AI mata engine failed" },
      { status: 500 }
    );
  }
}
