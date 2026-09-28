import fs from "fs";
import path from "path";
import sharp from "sharp";

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a120c" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Pitch Black Luxury Foundation -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)" />
  <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#222226" stroke-width="3" />
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1.5" />

  <!-- Center Contactless Beacon & Waves -->
  <g transform="translate(256, 205)" filter="url(#subtleShadow)">
    <!-- Central Core Transmitter Dot -->
    <circle cx="-60" cy="0" r="18" fill="#00C853" />

    <!-- Wave 1 (Inner Emerald) -->
    <path d="M -22 -44 A 50 50 0 0 1 -22 44" fill="none" stroke="#00C853" stroke-width="16" stroke-linecap="round" />

    <!-- Wave 2 (Middle White) -->
    <path d="M 18 -82 A 92 92 0 0 1 18 82" fill="none" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" />

    <!-- Wave 3 (Outer Emerald) -->
    <path d="M 58 -120 A 134 134 0 0 1 58 120" fill="none" stroke="#00C853" stroke-width="16" stroke-linecap="round" />
  </g>

  <!-- Typography Brand Mark -->
  <g text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <text x="256" y="385" font-size="52" font-weight="900" letter-spacing="-1.5">
      <tspan fill="#FFFFFF">taptag</tspan><tspan fill="#00C853">.</tspan><tspan fill="#E4E4E7">one</tspan>
    </text>
    <text x="256" y="425" font-size="14" font-weight="700" fill="#71717A" letter-spacing="4" font-family="monospace">
      SECURE VEHICLE PROTOCOL
    </text>
  </g>
</svg>`;

async function run() {
  const publicDir = path.resolve("public");

  // Save master SVG
  fs.writeFileSync(path.join(publicDir, "icon.svg"), svg512, "utf8");

  // 1. Generate 512x512 PNG
  await sharp(Buffer.from(svg512))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, "icon-512.png"));
  console.log("Created icon-512.png");

  // 2. Generate 192x192 PNG
  await sharp(Buffer.from(svg512))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, "icon-192.png"));
  console.log("Created icon-192.png");

  // 3. Generate Apple Touch Icon 180x180 PNG
  await sharp(Buffer.from(svg512))
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("Created apple-touch-icon.png");

  // 4. Generate Favicon 48x48 PNG
  await sharp(Buffer.from(svg512))
    .resize(48, 48)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, "favicon.png"));
  console.log("Created favicon.png");
}

run().catch(console.error);
