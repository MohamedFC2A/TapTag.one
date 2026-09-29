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
          elevated: "#0E0E12",
          border: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.04)",
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
          surface: "#070709",
          elevated: "#0E0E12",
          border: "rgba(255, 255, 255, 0.08)",
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
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        "glass-elevated": "0 20px 50px -10px rgba(0, 0, 0, 0.7)",
      },
      borderRadius: {
        DEFAULT: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
