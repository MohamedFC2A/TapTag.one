import React from "react";
import { db } from "@/lib/db";
import { CalibrateClient } from "./CalibrateClient";

export const dynamic = "force-dynamic";

interface CalibratePageProps {
  searchParams: Promise<{
    tag?: string;
  }>;
}

export default async function CalibratePage({ searchParams }: CalibratePageProps) {
  const resolvedSearchParams = await searchParams;
  const targetTagUid = resolvedSearchParams.tag;

  let tags: any[] = [];

  try {
    tags = await db.tag.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
      },
    });
  } catch (err) {
    console.error("CalibratePage tags fetch error:", err);
  }

  // Filter strictly for registered vehicles (never show factory placeholders like "غير مسجل")
  const validTags = tags.filter((t) => {
    const plate = t.profile?.vehiclePlate || "";
    return plate.trim() !== "" && !plate.includes("غير مسجل") && !plate.includes("جاهز للتفعيل");
  });

  const finalTags = validTags.length > 0 ? validTags : [
    {
      id: "tt-demo-1",
      tagUid: "TT-88219-X",
      profile: {
        vehiclePlate: "أ ب ج 1234",
        vehicleMake: "Toyota",
        vehicleModel: "Land Cruiser GR Sport",
        vehicleColor: "White Pearl (أبيض لؤلؤي)",
      },
    },
  ];

  // Find active tag or default to first valid registered vehicle
  const activeTag = targetTagUid
    ? finalTags.find((t) => t.tagUid.toUpperCase() === targetTagUid.toUpperCase()) || finalTags[0]
    : finalTags[0];

  return (
    <CalibrateClient
      activeTag={activeTag}
      allTags={finalTags}
    />
  );
}
