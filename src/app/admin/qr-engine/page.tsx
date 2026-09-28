import React from "react";
import { Header } from "@/components/ui/Header";
import { QRStudio } from "@/components/qr/QRStudio";
import { isLocalFactoryRequest, getFactoryInventory } from "@/app/actions/factory-actions";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QREnginePage() {
  const isLocal = await isLocalFactoryRequest();
  const inventoryRes = await getFactoryInventory();

  return (
    <div className="min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col" dir="rtl">
      <Header lang="ar" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <QRStudio
          initialInventory={inventoryRes.tags}
          isLocal={isLocal}
          lang="ar"
        />
      </main>
    </div>
  );
}
