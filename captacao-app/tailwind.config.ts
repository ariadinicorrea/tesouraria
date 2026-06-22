import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        warn: "var(--warn)",
        neg: "var(--neg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
