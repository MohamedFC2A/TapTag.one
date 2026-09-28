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
  CardDesignConfig,
};

/**
 * Initializes CardDesign table in Neon PostgreSQL if not already created.
 */
async function ensureCardDesignTable() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CardDesign" (
        "id" TEXT PRIMARY KEY,
        "tagUid" TEXT UNIQUE NOT NULL,
        "material" TEXT NOT NULL DEFAULT 'MATTE_OBSIDIAN',
        "dimensionStandard" TEXT NOT NULL DEFAULT 'ACRYLIC_TAG_70X50',
        "codeType" TEXT NOT NULL DEFAULT 'QR_CODE',
        "logoPosition" TEXT NOT NULL DEFAULT 'TOP_LEFT',
        "logoColor" TEXT NOT NULL DEFAULT 'SILVER',
        "fontFamily" TEXT NOT NULL DEFAULT 'IBM_PLEX',
        "plateStyle" TEXT NOT NULL DEFAULT 'STANDARD',
        "plateNumber" TEXT NOT NULL DEFAULT 'أ ب ج 1234',
        "showNfcIcon" BOOLEAN NOT NULL DEFAULT true,
        "showEmergency" BOOLEAN NOT NULL DEFAULT false,
        "customText" TEXT NOT NULL DEFAULT 'TAPTAG SMART ACCESS',
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
        "showNfcIcon", "showEmergency", "customText", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
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
      config.customText
    );

    revalidatePath("/");
    revalidatePath("/admin/qr-engine");

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
