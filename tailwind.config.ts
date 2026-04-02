import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "rgb(240 249 255)",
          100: "rgb(224 242 254)",
          200: "rgb(186 230 253)",
          300: "rgb(125 211 252)",
          400: "rgb(56 189 248)",
          500: "rgb(14 165 233)",
          600: "rgb(2 132 199)",
          700: "rgb(3 105 161)",
          800: "rgb(7 89 133)",
          900: "rgb(12 74 110)",
        },
        dark: {
          900: "rgb(9 11 17)",
          800: "rgb(13 16 25)",
          700: "rgb(17 22 35)",
          600: "rgb(22 29 46)",
          500: "rgb(30 40 60)",
          400: "rgb(45 58 82)",
          300: "rgb(68 85 115)",
        },
        accent: {
          green:  "rgb(34 197 94)",
          yellow: "rgb(250 204 21)",
          red:    "rgb(239 68 68)",
          purple: "rgb(168 85 247)",
          orange: "rgb(249 115 22)",
        },
      },
      fontFamily: {
        display: ["'Rajdhani'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow:    "0 0 20px rgba(14,165,233,0.3)",
        "glow-sm": "0 0 10px rgba(14,165,233,0.2)",
      },
      backgroundImage: {
        "grid-dark": "linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
    },
  },
  plugins: [],
};

export default config;
