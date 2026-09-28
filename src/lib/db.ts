import { PrismaClient } from "@prisma/client";

const defaultDatabaseUrl =
  "postgresql://neondb_owner:npg_YepumAOX06iW@ep-holy-smoke-av9d4czd-pooler.c-11.us-east-1.aws.neon.tech/taptag?sslmode=require";

const connectionUrl = process.env.DATABASE_URL || defaultDatabaseUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
