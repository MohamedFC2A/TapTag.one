"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type {
  CardMaterial,
  CardDimension,
  CardCodeType,
  CardLogoPosition,
  CardLogoColor,
  CardFontFamily,
  CardPlateStyle,
  CardLayoutPreset,
  CardQrPlacement,
  CardDesignConfig,
} from "@/types/card-design";
import { DEFAULT_CARD_DESIGN } from "@/types/card-design";

export type {
  CardMaterial,
  CardDimension,
  CardCodeType,
  CardLogoPosition,
  CardLogoColor,
  CardFontFamily,
  CardPlateStyle,
  CardLayoutPreset,
  CardQrPlacement,
  CardDesignConfig,
};

/**
 * Initializes CardDesign table in Neon PostgreSQL if not already created,
 * and ensures all luxury Tap attributes (logoText, layoutPreset, qrPlacement, nfcPosition) exist.
 */
async function ensureCardDesignTable() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CardDesign" (
        "id" TEXT PRIMARY KEY,
        "tagUid" TEXT UNIQUE NOT NULL,
        "material" TEXT NOT NULL DEFAULT 'MATTE_OBSIDIAN',
        "dimensionStandard" TEXT NOT NULL DEFAULT 'CR80_STANDARD',
        "codeType" TEXT NOT NULL DEFAULT 'QR_CODE',
        "logoPosition" TEXT NOT NULL DEFAULT 'CENTER',
        "logoColor" TEXT NOT NULL DEFAULT 'WHITE',
        "fontFamily" TEXT NOT NULL DEFAULT 'INTER',
        "plateStyle" TEXT NOT NULL DEFAULT 'STANDARD',
        "plateNumber" TEXT NOT NULL DEFAULT 'أ ب ج 1234',
        "showNfcIcon" BOOLEAN NOT NULL DEFAULT true,
        "showEmergency" BOOLEAN NOT NULL DEFAULT false,
        "customText" TEXT NOT NULL DEFAULT 'TAPTAG SMART ACCESS',
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure new columns exist
    await db.$executeRawUnsafe(`ALTER TABLE "CardDesign" ADD COLUMN IF NOT EXISTS "logoText" TEXT DEFAULT 'taptag.one';`);
    await db.$executeRawUnsafe(`ALTER TABLE "CardDesign" ADD COLUMN IF NOT EXISTS "layoutPreset" TEXT DEFAULT 'TAP_MINIMAL';`);
    await db.$executeRawUnsafe(`ALTER TABLE "CardDesign" ADD COLUMN IF NOT EXISTS "qrPlacement" TEXT DEFAULT 'BACK_ONLY';`);
    await db.$executeRawUnsafe(`ALTER TABLE "CardDesign" ADD COLUMN IF NOT EXISTS "nfcPosition" TEXT DEFAULT 'BOTTOM_LEFT';`);
    await db.$executeRawUnsafe(`ALTER TABLE "CardDesign" ADD COLUMN IF NOT EXISTS "cardColor" TEXT DEFAULT '#0E0F12';`);
    await db.$executeRawUnsafe(`ALTER TABLE "CardDesign" ADD COLUMN IF NOT EXISTS "acrylicFinish" TEXT DEFAULT 'GLOSSY_CRYSTAL';`);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_carddesign_taguid" ON "CardDesign" ("tagUid");
    `);
  } catch (err) {
    console.error("ensureCardDesignTable error (non-fatal):", err);
  }
}

/**
 * Saves or updates a CardDesign configuration in Neon PostgreSQL
 */
export async function saveCardDesignAction(config: CardDesignConfig) {
  try {
    await ensureCardDesignTable();

    const cleanTagUid = (config.tagUid || "MW-88219-X").trim().toUpperCase();
    const id = config.id || `cd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.$executeRawUnsafe(
      `
      INSERT INTO "CardDesign" (
        "id", "tagUid", "material", "dimensionStandard", "codeType",
        "logoPosition", "logoColor", "fontFamily", "plateStyle", "plateNumber",
        "showNfcIcon", "showEmergency", "customText", "logoText", "layoutPreset",
        "qrPlacement", "nfcPosition", "cardColor", "acrylicFinish", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      ON CONFLICT ("tagUid") DO UPDATE SET
        "material" = EXCLUDED."material",
        "dimensionStandard" = EXCLUDED."dimensionStandard",
        "codeType" = EXCLUDED."codeType",
        "logoPosition" = EXCLUDED."logoPosition",
        "logoColor" = EXCLUDED."logoColor",
        "fontFamily" = EXCLUDED."fontFamily",
        "plateStyle" = EXCLUDED."plateStyle",
        "plateNumber" = EXCLUDED."plateNumber",
        "showNfcIcon" = EXCLUDED."showNfcIcon",
        "showEmergency" = EXCLUDED."showEmergency",
        "customText" = EXCLUDED."customText",
        "logoText" = EXCLUDED."logoText",
        "layoutPreset" = EXCLUDED."layoutPreset",
        "qrPlacement" = EXCLUDED."qrPlacement",
        "nfcPosition" = EXCLUDED."nfcPosition",
        "cardColor" = EXCLUDED."cardColor",
        "acrylicFinish" = EXCLUDED."acrylicFinish",
        "updatedAt" = NOW();
      `,
      id,
      cleanTagUid,
      config.material,
      config.dimensionStandard,
      config.codeType,
      config.logoPosition,
      config.logoColor,
      config.fontFamily,
      config.plateStyle,
      config.plateNumber,
      config.showNfcIcon,
      config.showEmergency,
      config.customText,
      config.logoText || "taptag.one",
      config.layoutPreset || "TAP_MINIMAL",
      config.qrPlacement || "BACK_ONLY",
      config.nfcPosition || "BOTTOM_LEFT",
      config.cardColor || "#0E0F12",
      config.acrylicFinish || "GLOSSY_CRYSTAL"
    );

    revalidatePath("/");
    revalidatePath("/admin/qr-engine");
    revalidatePath("/studio");

    return {
      success: true,
      message: "تم حفظ وتثبيت تصميم البطاقة سحابياً بنجاح.",
      config: {
        ...config,
        tagUid: cleanTagUid,
        id,
      },
    };
  } catch (error) {
    console.error("saveCardDesignAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل حفظ التصميم سحابياً.",
    };
  }
}

/**
 * Retrieves CardDesign configuration for a given tagUid from Neon PostgreSQL
 */
export async function getCardDesignAction(tagUid?: string): Promise<{
  success: boolean;
  config: CardDesignConfig;
  source: "cloud" | "default";
}> {
  try {
    await ensureCardDesignTable();

    const cleanTagUid = (tagUid || "MW-88219-X").trim().toUpperCase();

    const rows = await db.$queryRawUnsafe<any[]>(
      `
      SELECT * FROM "CardDesign"
      WHERE "tagUid" = $1
      LIMIT 1;
      `,
      cleanTagUid
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        success: true,
        source: "cloud",
        config: {
          id: row.id,
          tagUid: row.tagUid,
          material: row.material as CardMaterial,
          dimensionStandard: row.dimensionStandard as CardDimension,
          codeType: row.codeType as CardCodeType,
          logoPosition: row.logoPosition as CardLogoPosition,
          logoColor: row.logoColor as CardLogoColor,
          fontFamily: row.fontFamily as CardFontFamily,
          plateStyle: row.plateStyle as CardPlateStyle,
          plateNumber: row.plateNumber,
          showNfcIcon: Boolean(row.showNfcIcon),
          showEmergency: Boolean(row.showEmergency),
          customText: row.customText,
          logoText: row.logoText || "tagtap.one",
          layoutPreset: (row.layoutPreset as CardLayoutPreset) || "TAP_MINIMAL",
          qrPlacement: (row.qrPlacement as CardQrPlacement) || "BACK_ONLY",
          nfcPosition: row.nfcPosition || "BOTTOM_LEFT",
          cardColor: row.cardColor || "#0E0F12",
          acrylicFinish: row.acrylicFinish || "GLOSSY_CRYSTAL",
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
        },
      };
    }

    return {
      success: true,
      source: "default",
      config: { ...DEFAULT_CARD_DESIGN, tagUid: cleanTagUid },
    };
  } catch (error) {
    console.error("getCardDesignAction error:", error);
    return {
      success: false,
      source: "default",
      config: { ...DEFAULT_CARD_DESIGN, tagUid: tagUid || "MW-88219-X" },
    };
  }
}
