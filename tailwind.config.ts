import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Strict Monochrome Swiss Hardware Palette
        obsidian: {
          DEFAULT: "#09090B",
          card: "#121215",
          elevated: "#18181B",
          border: "#27272A",
          hairline: "#27272A",
          hover: "#1F1F23",
        },
        surface: {
          DEFAULT: "#09090B",
          card: "#121215",
          elevated: "#18181B",
          light: "#FAFAFA",
          "light-border": "#E4E4E7",
        },
        // Single micro-dot emerald reserved ONLY for live active status indicators
        emerald: {
          micro: "#10B981",
          active: "#10B981",
          DEFAULT: "#10B981",
        },
        border: {
          DEFAULT: "#27272A",
          dark: "#27272A",
          light: "#E4E4E7",
          subtle: "#1F1F23",
        },
        typography: {
          primary: "#FFFFFF",
          body: "#F4F4F5",
          muted: "#A1A1AA",
          subtle: "#71717A",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "var(--font-space-grotesk)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-ibm-plex)", "sans-serif"],
        mono: ["var(--font-space-grotesk)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        none: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        inner: "none",
        glass: "none",
        "glass-elevated": "none",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
