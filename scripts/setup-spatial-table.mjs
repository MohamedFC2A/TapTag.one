import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_YepumAOX06iW@ep-holy-smoke-av9d4czd-pooler.c-11.us-east-1.aws.neon.tech/taptag?sslmode=require",
});

async function main() {
  console.log("Creating VehicleSpatialPoint table in Neon PostgreSQL...");
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VehicleSpatialPoint" (
      "id" TEXT PRIMARY KEY,
      "tagUid" TEXT NOT NULL,
      "rawLat" DOUBLE PRECISION NOT NULL,
      "rawLng" DOUBLE PRECISION NOT NULL,
      "userHeading" DOUBLE PRECISION NOT NULL,
      "accuracy" DOUBLE PRECISION NOT NULL,
      "centroidLat" DOUBLE PRECISION NOT NULL,
      "centroidLng" DOUBLE PRECISION NOT NULL,
      "offsetDistanceMeters" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VehicleSpatialPoint_tagUid_idx" ON "VehicleSpatialPoint"("tagUid");
  `);

  console.log("VehicleSpatialPoint table created successfully in Neon!");
  const tables = await db.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public';
  `);
  console.log("Current tables in Neon:", tables);
}

main()
  .catch((e) => {
    console.error("Neon setup error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
