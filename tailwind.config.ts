import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        primary: "#2563EB",
        secondary: "#7C3AED",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        heading: ["var(--font-sora)"],
      },
    },
  },
  plugins: [],
};

export default config;
