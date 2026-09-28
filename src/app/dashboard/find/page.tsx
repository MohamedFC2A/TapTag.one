import React from "react";
import { db } from "@/lib/db";
import { FindClient } from "./FindClient";

export const dynamic = "force-dynamic";

interface FindPageProps {
  searchParams: Promise<{
    tag?: string;
  }>;
}

export default async function FindPage({ searchParams }: FindPageProps) {
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
    console.error("FindPage tags fetch error:", err);
  }

  // Fallback demo tag if database has no registered tags
  if (!tags || tags.length === 0) {
    tags = [
      {
        id: "tt-demo-1",
        tagUid: "TT-88219-X",
        profile: {
          vehiclePlate: "أ ب ج 1234",
          vehicleMake: "Toyota",
          vehicleModel: "Land Cruiser",
          vehicleColor: "White Pearl",
        },
      },
    ];
  }

  // Find active tag or default to first
  const activeTag = targetTagUid
    ? tags.find((t) => t.tagUid.toUpperCase() === targetTagUid.toUpperCase()) || tags[0]
    : tags[0];

  return (
    <FindClient
      activeTag={activeTag}
      allTags={tags}
    />
  );
}
