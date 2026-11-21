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
        parchment: {
          DEFAULT: "#E8DDC7",
          50: "#FAF7F0",
          100: "#F4EDE0",
          200: "#E8DDC7",
          300: "#DBCBB0",
          400: "#CBB696",
          500: "#B89E79",
        },
        obsidian: {
          DEFAULT: "#101014",
          light: "#18181F",
          card: "#141419",
          border: "#252530",
          muted: "#8A8A99",
        },
        gold: {
          DEFAULT: "#C6A46A",
          light: "#E2C99A",
          dark: "#A38248",
          glow: "rgba(198, 164, 106, 0.25)",
        },
        bronze: {
          DEFAULT: "#9A7048",
          light: "#B88A5C",
          dark: "#7A5432",
        },
        burgundy: {
          DEFAULT: "#5A2433",
          light: "#793347",
          dark: "#3F1823",
          glow: "rgba(90, 36, 51, 0.3)",
        },
      },
      fontFamily: {
        cinzel: ["var(--font-cinzel)", "Cinzel", "serif"],
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #E2C99A 0%, #C6A46A 50%, #9A7048 100%)",
        "parchment-vignette": "radial-gradient(circle at center, rgba(232, 221, 199, 0.05) 0%, rgba(16, 16, 20, 0.95) 100%)",
        "obsidian-gradient": "linear-gradient(180deg, #101014 0%, #16161D 50%, #101014 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(2deg)" },
        },
        feather: {
          "0%": { transform: "translateY(-10px) translateX(0) rotate(0deg)", opacity: "0" },
          "20%": { opacity: "0.8" },
          "80%": { opacity: "0.8" },
          "100%": { transform: "translateY(120px) translateX(30px) rotate(45deg)", opacity: "0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        feather: "feather 8s ease-in-out infinite",
        pulseGlow: "pulseGlow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
