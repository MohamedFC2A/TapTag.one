import React from "react";
import { Header } from "@/components/ui/Header";
import { QRStudio } from "@/components/qr/QRStudio";
import { isLocalFactoryRequest, getFactoryInventory } from "@/app/actions/factory-actions";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QREnginePage() {
  const isLocal = await isLocalFactoryRequest();

  // Enforce local server access only for the factory minting engine
  if (!isLocal && process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-full border border-red-800 bg-red-950/40 flex items-center justify-center text-red-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">403 — وصول غير مصرح (Restricted Factory Zone)</h1>
        <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
          محرك طباعة وسك البطاقات الفيزيائية مقصور حصرياً على السيرفر الداخلي للمصنع (Local Server Only).
          لا يمكن الوصول إليه من خارج البيئة المحلية الآمنة لحماية منظومة الأصول.
        </p>
      </div>
    );
  }

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
