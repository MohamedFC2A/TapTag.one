import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_YepumAOX06iW@ep-holy-smoke-av9d4czd-pooler.c-11.us-east-1.aws.neon.tech/taptag?sslmode=require",
});

async function runDatabaseTestSuite() {
  console.log("=================================================");
  console.log("  TAPTAG ENTERPRISE - NEON POSTGRESQL TEST SUITE ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, durationMs) => {
    if (condition) {
      console.log(`[PASS] ${testName} (${durationMs.toFixed(1)} ms)`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} (${durationMs.toFixed(1)} ms)`);
      failed++;
    }
  };

  try {
    // 1. Connection Ping Test
    const t0 = performance.now();
    const ping = await db.$queryRawUnsafe(`SELECT 1 as ping, NOW() as current_time, version();`);
    const tPing = performance.now() - t0;
    assert(Array.isArray(ping) && ping[0]?.ping === 1, "Neon PostgreSQL Active Connection & TLS Ping", tPing);

    // 2. Schema & Structure Verification for VehicleSpatialPoint
    const t1 = performance.now();
    const columns = await db.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'VehicleSpatialPoint'
      ORDER BY ordinal_position;
    `);
    const tSchema = performance.now() - t1;
    const colNames = columns.map(c => c.column_name);
    const requiredCols = ["id", "tagUid", "rawLat", "rawLng", "userHeading", "accuracy", "centroidLat", "centroidLng", "offsetDistanceMeters", "createdAt"];
    const allColsPresent = requiredCols.every(rc => colNames.includes(rc));
    assert(allColsPresent, `VehicleSpatialPoint Schema Integrity (Found ${columns.length} columns)`, tSchema);

    // 3. Index Verification Test
    const t2 = performance.now();
    const indexes = await db.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'VehicleSpatialPoint';
    `);
    const tIndex = performance.now() - t2;
    const hasTagUidIndex = indexes.some(idx => idx.indexdef.includes("tagUid"));
    assert(hasTagUidIndex, `High-Performance Index on 'tagUid' Exists for 0-Delay Lookups`, tIndex);

    // 4. Test Point Insertion (CRUD - Create)
    const testTagUid = "TEST-SUITE-RUNNER-" + Date.now();
    const testPointId = "pt_test_" + Math.random().toString(36).substring(2, 9);
    const t3 = performance.now();
    await db.$executeRawUnsafe(
      `
      INSERT INTO "VehicleSpatialPoint" (
        "id", "tagUid", "rawLat", "rawLng", "userHeading", "accuracy",
        "centroidLat", "centroidLng", "offsetDistanceMeters", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
      `,
      testPointId,
      testTagUid,
      30.0444,
      31.2357,
      180.0,
      2.5,
      30.04441,
      31.23571,
      1.2
    );
    const tInsert = performance.now() - t3;
    assert(true, `CRUD: Insert Calibration Point into Neon Cloud`, tInsert);

    // 5. Test Point Retrieval (CRUD - Read)
    const t4 = performance.now();
    const retrieved = await db.$queryRawUnsafe(
      `
      SELECT * FROM "VehicleSpatialPoint"
      WHERE "tagUid" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1;
      `,
      testTagUid
    );
    const tRead = performance.now() - t4;
    assert(
      retrieved.length === 1 && retrieved[0].id === testPointId && Number(retrieved[0].accuracy) === 2.5,
      `CRUD: Fast Query Calibration Point by tagUid (${retrieved[0].id})`,
      tRead
    );

    // 6. Test Query Performance Benchmark
    const t5 = performance.now();
    for (let i = 0; i < 5; i++) {
      await db.$queryRawUnsafe(`SELECT "id", "centroidLat", "centroidLng" FROM "VehicleSpatialPoint" WHERE "tagUid" = $1 LIMIT 1;`, testTagUid);
    }
    const tBenchmarkAvg = (performance.now() - t5) / 5;
    assert(tBenchmarkAvg < 250, `Latency Benchmark: Average Neon Query Latency is ${tBenchmarkAvg.toFixed(1)} ms (< 250ms over TLS/WAN)`, tBenchmarkAvg);

    // 7. Test Clean Deletion (CRUD - Delete / Restart Flow)
    const t6 = performance.now();
    await db.$executeRawUnsafe(`DELETE FROM "VehicleSpatialPoint" WHERE "tagUid" = $1;`, testTagUid);
    const verifyDeleted = await db.$queryRawUnsafe(`SELECT count(*) as count FROM "VehicleSpatialPoint" WHERE "tagUid" = $1;`, testTagUid);
    const tDelete = performance.now() - t6;
    assert(
      Number(verifyDeleted[0].count) === 0,
      `CRUD: Restart / Delete Purge Verification`,
      tDelete
    );

    // 8. Overall Tag Fleet Table Health Test
    const t7 = performance.now();
    const tagsCount = await db.$queryRawUnsafe(`SELECT count(*) as count FROM "Tag";`);
    const tTags = performance.now() - t7;
    assert(Number(tagsCount[0].count) >= 0, `Fleet Tag Table Operational (${tagsCount[0].count} tags)`, tTags);

  } catch (error) {
    console.error("Test Suite Runtime Error:", error);
    failed++;
  } finally {
    await db.$disconnect();
  }

  console.log("\n-------------------------------------------------");
  console.log(`Database Test Suite Summary: ${passed} Passed | ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDatabaseTestSuite();
