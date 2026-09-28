"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { AntiMetalButton } from "@/components/ui/anti-metal-button";
import { MenuBar, MenuBarItem } from "@/components/ui/animated-menu-bar";
import DemoOne from "@/components/ui/demo";
import { Spotlight } from "@/components/ui/Spotlight";
import { Footer } from "@/components/ui/Footer";

export default function DemoPage() {
  const [selectedMenu, setSelectedMenu] = useState<MenuBarItem>("dashboard");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleMenuSelect = (key: MenuBarItem) => {
    setSelectedMenu(key);
    setToastMessage(`Selected Menu: ${key.toUpperCase()}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Background Spotlight */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      {/* Header */}
      <header className="w-full border-b border-white/10 bg-black/50 backdrop-blur-xl px-6 py-4 flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-2 group">
          <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
          <span className="text-xs font-mono tracking-wider text-zinc-400 group-hover:text-white uppercase">
            Return to TapTag.one
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">
            21st.dev Component Lab
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-16 w-full space-y-16 z-10">
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-mono uppercase tracking-widest text-zinc-300">
            Precision Monochrome Design System
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Monochrome Tactile & Navigation Showcase
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Interactive demonstration of the high-performance animated menu bar and the tactile anti-metal sliding wave button.
          </p>
        </div>

        {/* Demo One Container */}
        <section className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            01 / Unified Component Sandbox
          </h2>
          <DemoOne />
        </section>

        {/* Individual Component Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AntiMetalButton Variations */}
          <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">AntiMetalButton</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hardware-inspired tactile button featuring an animated dot-matrix chevron wave, smooth slide expansion on hover, and physical bevel shadows.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">White Diamond</span>
                <AntiMetalButton
                  label="Initialize Tag"
                  accentFrom="#FFFFFF"
                  accentTo="#D4D4D8"
                  dotColor="#000000"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">Pure Obsidian</span>
                <AntiMetalButton
                  label="Zero-Knowledge"
                  accentFrom="#27272A"
                  accentTo="#09090B"
                  dotColor="#FFFFFF"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">Metallic Platinum</span>
                <AntiMetalButton
                  label="Laser Engrave"
                  accentFrom="#E4E4E7"
                  accentTo="#A1A1AA"
                  dotColor="#09090B"
                />
              </div>
            </div>
          </div>

          {/* Animated Menu Bar */}
          <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">AnimatedMenuBar</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Responsive fluid navigation dock with cubic-bezier width transitions, floating tooltip overlays, and pure monochrome status badges.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 pt-4 border-t border-white/5">
              <MenuBar
                active={selectedMenu}
                onSelect={handleMenuSelect}
              />

              {toastMessage && (
                <div className="text-xs font-mono px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white animate-fade-in">
                  {toastMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer lang="en" />
    </div>
  );
}
