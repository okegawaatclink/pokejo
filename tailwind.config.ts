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
        pokegold: "#f0b429",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
      },
      backgroundImage: {
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)",
        "pink-gold": "linear-gradient(135deg, #f472b6 0%, #ec4899 45%, #f0b429 100%)",
        "gold-shine": "linear-gradient(135deg, #fde68a 0%, #f0b429 50%, #d97706 100%)",
      },
      boxShadow: {
        glow: "0 0 24px -6px var(--glow-color, rgba(236,72,153,0.6))",
      },
    },
  },
  plugins: [],
};

export default config;
