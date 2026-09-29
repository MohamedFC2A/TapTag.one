import React from "react";
import { ScanClient } from "./ScanClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فحص ومسح البطاقة الذكية | taptag.one",
  description: "ماسح ضوئي ذكي لكود QR وشريحة NFC لبطاقات السيارات taptag.one.",
};

export default function ScanPage() {
  return <ScanClient />;
}
