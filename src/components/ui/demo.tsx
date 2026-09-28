"use client";

import React from "react";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
import { MenuBar, MenuBarItem } from "@/components/ui/animated-menu-bar";

export default function DemoOne() {
  const [activeMenu, setActiveMenu] = React.useState<MenuBarItem>("dashboard");

  return (
    <div className="flex min-h-[350px] w-full flex-col items-center justify-center gap-8 p-6 bg-black text-white rounded-2xl border border-white/10">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold tracking-tight text-white">
          21st.dev Component Showcase
        </h3>
        <p className="text-xs text-zinc-400">
          Monochrome Anti-Metal Tactile Button & Animated Dynamic Menu Bar
        </p>
      </div>

      {/* Button Variants */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Default Luxury Silver Accent */}
        <AntiMetalButton label="Book a Demo" />

        {/* White Obsidian */}
        <AntiMetalButton
          label="Provision Tag"
          accentFrom="#ffffff"
          accentTo="#e4e4e7"
          dotColor="#000000"
        />

        {/* Titanium Slate */}
        <AntiMetalButton
          label="System Audit"
          accentFrom="#a1a1aa"
          accentTo="#52525b"
          dotColor="#000000"
        />
      </div>

      {/* Animated Dynamic Menu Bar */}
      <div className="pt-4">
        <MenuBar
          active={activeMenu}
          onSelect={(key) => setActiveMenu(key)}
        />
      </div>
    </div>
  );
}
