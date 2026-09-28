import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasourceUrl:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_YepumAOX06iW@ep-holy-smoke-av9d4czd-pooler.c-11.us-east-1.aws.neon.tech/taptag?sslmode=require",
});

async function init() {
  console.log("Checking Neon PostgreSQL and creating CardDesign table...");
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
  console.log("CardDesign table initialized successfully in Neon PostgreSQL!");

  const rows = await db.$queryRawUnsafe(`SELECT count(*) as count FROM "CardDesign";`);
  console.log("CardDesign row count:", rows);
  await db.$disconnect();
}

init().catch(err => {
  console.error("Error creating CardDesign table:", err);
  process.exit(1);
});
