import React from "react";
import { ScanClient } from "./ScanClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فحص ومسح البطاقة الذكية | tagtap.one",
  description: "ماسح ضوئي ذكي لكود QR وشريحة NFC لبطاقات السيارات tagtap.one.",
};

export default function ScanPage() {
  return <ScanClient />;
}
