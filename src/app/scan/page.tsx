import React from "react";
import { ScanClient } from "./ScanClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فاحص وقارئ رموز QR الذكية | taptag.",
  description: "ماسح ضوئي ذكي لرموز QR وفحص الروابط الديناميكية والملفات المشفرة عبر taptag.",
};

export default function ScanPage() {
  return <ScanClient />;
}
