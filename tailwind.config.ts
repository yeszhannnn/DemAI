import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: "#EAFC5F",
        ink: "#212121",
        slate: "#899FB0",
        "bg-light": "#F1F2F4",
        "card-peek": "#8AA0B1",
        "icon-bg": "#EDEFF1",
        risk: {
          low: "#BFE95C",
          mid: "#F6D24E",
          high: "#F09A3E",
          severe: "#E8603C",
        },
      },
      borderRadius: {
        card: "28px",
        inner: "22px",
        chip: "14px",
      },
      boxShadow: {
        card: "0 12px 28px rgba(33,33,33,.10)",
        soft: "0 6px 16px rgba(33,33,33,.05)",
        float: "0 10px 24px rgba(33,33,33,.18)",
      },
      fontFamily: {
        sans: ["var(--font-onest)", "Onest", "system-ui", "sans-serif"],
      },
      fontSize: {
        "num-hero": ["64px", { lineHeight: "68px", fontWeight: "600" }],
        "num-card": ["44px", { lineHeight: "48px", fontWeight: "600" }],
        "num-metric": ["34px", { lineHeight: "38px", fontWeight: "600" }],
        h1: ["34px", { lineHeight: "40px", fontWeight: "500" }],
        h2: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "500" }],
        caption: ["13px", { lineHeight: "18px", fontWeight: "500" }],
        unit: ["12px", { lineHeight: "14px", fontWeight: "600" }],
        chip: ["13px", { lineHeight: "16px", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};

export default config;
