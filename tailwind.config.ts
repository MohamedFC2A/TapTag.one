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
        obsidian: {
          DEFAULT: "#000000",
          card: "#08080A",
          elevated: "#101014",
          border: "#1C1C20",
          hover: "#18181D",
        },
        emerald: {
          lux: "#00C853",
          deep: "#059669",
          hover: "#047857",
          light: "#10B981",
          dim: "rgba(0, 200, 83, 0.08)",
          border: "rgba(0, 200, 83, 0.28)",
          ring: "rgba(0, 200, 83, 0.4)",
        },
        foundation: {
          deep: "#000000",
          surface: "#08080A",
          elevated: "#101014",
          border: "#1C1C20",
        },
        institutional: {
          green: "#00C853",
          "green-hover": "#059669",
          "green-light": "#10B981",
          "green-badge": "rgba(0, 200, 83, 0.08)",
          "green-border": "rgba(0, 200, 83, 0.28)",
        },
        typography: {
          primary: "#FFFFFF",
          body: "#E4E4E7",
          muted: "#A1A1AA",
          subtle: "#71717A",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "var(--font-readex)", "sans-serif"],
        display: ["var(--font-ibm-plex)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
