import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d10",
        panel: "#12151a",
        panel2: "#171b21",
        border: "#232830",
        accent: "#4f8cff",
        good: "#3ecf8e",
        warn: "#f5a623",
        bad: "#ef5a5a",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
