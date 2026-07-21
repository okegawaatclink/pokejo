import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pikablue: "#2b6cb0",
        pokepink: "#ec4899",
        pokemagenta: "#db2777",
        pokegold: "#c8a24a",
        champagne: "#c8a24a",
        ink: "#2f2923",
        muted: "#766f66",
        paper: "#fffaf0",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
      },
      backgroundImage: {
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)",
        "pink-gold": "linear-gradient(135deg, #f3c6d8 0%, #d99aa7 45%, #c8a24a 100%)",
        "gold-shine": "linear-gradient(135deg, #fff2c2 0%, #c8a24a 50%, #9b7626 100%)",
      },
      boxShadow: {
        glow: "0 0 24px -6px var(--glow-color, rgba(236,72,153,0.6))",
      },
    },
  },
  plugins: [],
};

export default config;
