import React from "react";
import { Header } from "@/components/ui/Header";
import { CardStudio } from "@/components/card/CardStudio";
import { getFactoryInventory } from "@/app/actions/factory-actions";
import { getCardDesignAction } from "@/app/actions/card-customization-actions";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const inventoryRes = await getFactoryInventory();
  const activeUid = inventoryRes.tags?.[0]?.tagUid || "MW-88219-X";
  const designRes = await getCardDesignAction(activeUid);

  const availableTags = (inventoryRes.tags || []).map((t) => ({
    tagUid: t.tagUid,
    vehiclePlate: t.vehiclePlate,
    vehicleMake: t.vehicleMake,
  }));

  return (
    <div className="min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col" dir="rtl">
      <Header lang="ar" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <CardStudio
          initialConfig={designRes.config}
          availableTags={availableTags}
        />
      </main>
    </div>
  );
}
