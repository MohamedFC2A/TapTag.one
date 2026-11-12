import React from "react";
import { QrPortalClient } from "./QrPortalClient";

interface QrResolvePageProps {
  params: Promise<{ code: string }>;
}

export default async function QrResolvePage({ params }: QrResolvePageProps) {
  const { code } = await params;
  return <QrPortalClient shortCode={code.trim().toUpperCase()} />;
}
