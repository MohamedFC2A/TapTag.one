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
        foundation: {
          deep: "#0A0A0A",
          surface: "#111111",
          elevated: "#18181B",
          border: "#27272A",
        },
        institutional: {
          green: "#059669",
          "green-hover": "#047857",
          "green-light": "#10B981",
          "green-badge": "rgba(5, 150, 105, 0.15)",
          "green-border": "rgba(5, 150, 105, 0.35)",
        },
        typography: {
          primary: "#FFFFFF",
          body: "#E4E4E7",
          muted: "#71717A",
          subtle: "#52525B",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "var(--font-readex)", "sans-serif"],
        display: ["var(--font-ibm-plex)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
      keyframes: {
        spotlight: {
          "0%": {
            opacity: "0",
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: "1",
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
      },
      animation: {
        spotlight: "spotlight 2s ease .75s 1 forwards",
      },
    },
  },
  plugins: [],
};

export default config;
