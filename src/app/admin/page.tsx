import React from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { adminGetFullMetrics } from "@/app/actions/factory-actions";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await adminGetFullMetrics();

  return (
    <div className="min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col" dir="rtl">
      <Header lang="ar" />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <AdminClient
          initialMetrics={data.metrics}
          initialTags={data.tags}
          initialIncidents={data.incidents}
        />
      </main>
      <Footer lang="ar" />
    </div>
  );
}
