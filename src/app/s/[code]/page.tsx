import React from "react";
import { SecureSharePortalClient } from "./SecureSharePortalClient";

interface SharePageProps {
  params: Promise<{ code: string }>;
}

export default async function SecureSharePage({ params }: SharePageProps) {
  const { code } = await params;
  return <SecureSharePortalClient shareCode={code.trim().toUpperCase()} />;
}
