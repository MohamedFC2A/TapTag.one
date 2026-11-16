"use client";

import React from "react";
import { DashboardClient } from "@/app/dashboard/DashboardClient";

/**
 * Unified Scanner route mounting the merged Codes & Scanner hub directly on SCAN tab.
 */
export function ScanClient() {
  return <DashboardClient initialTab="SCAN" />;
}
