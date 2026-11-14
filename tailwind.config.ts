import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        marasim: {
          espresso: {
            DEFAULT: "#1B1111",
            50: "#FAF7F5",
            100: "#F2EBE6",
            200: "#E3D3C8",
            300: "#CDB5A5",
            400: "#9A735E",
            500: "#6B4938",
            600: "#4A3023",
            700: "#362218",
            800: "#241610",
            900: "#1B1111",
            950: "#120B0B",
          },
          gold: {
            DEFAULT: "#D49A3D",
            50: "#FDF9F0",
            100: "#FAF1DC",
            200: "#F5E2B5",
            300: "#EDCE89",
            400: "#E5B65A",
            500: "#D49A3D",
            600: "#BD7E26",
            700: "#995F1B",
            800: "#7C4C18",
            900: "#643D15",
          },
          glow: "#FFC217",
          burgundy: {
            DEFAULT: "#682722",
            50: "#FAF3F3",
            100: "#F3E3E2",
            200: "#E8C8C6",
            300: "#D6A3A0",
            400: "#BA6F6B",
            500: "#994742",
            600: "#7C322D",
            700: "#682722",
            800: "#55211D",
            900: "#441C19",
          },
          cream: "#FBF8F5",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
