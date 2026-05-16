import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Verdana", "Geneva", "DejaVu Sans", "sans-serif"],
        // A slightly cleaner alternative for headings — still familiar
        display: ["Verdana", "Geneva", "Helvetica", "sans-serif"],
        mono:    ["'JetBrains Mono'", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        // Page surfaces
        page:     "#ffffff",
        section:  "#f3f3f3",
        soft:     "#f7f7f7",
        chip:     "#fafafa",

        // Borders
        line:     "#d0d0d0",
        "line-soft": "#e5e5e5",

        // Text
        ink: {
          DEFAULT: "#1a1a1a",
          body:    "#262626",
          muted:   "#5e5e5e",
          dim:     "#8a8a8a",
          deep:    "#b0b0b0",
        },

        // Brand accent — classic YouTube-cherry red, modernized
        brand: {
          DEFAULT: "#cc0000",
          hover:   "#a30000",
          soft:    "#fdecec",
          ring:    "#cc000080",
        },

        // Verdict colors — softened so they don't dominate the page
        verdict: {
          green:      "#157e3a",
          greenSoft:  "#e8f3ec",
          red:        "#c0271f",
          redSoft:    "#fbeae8",
          amber:      "#a86700",
          amberSoft:  "#fbf1de",
          gray:       "#6b6b6b",
          graySoft:   "#f1f1f1",
        },

        // Source link blue (mid-2000s style)
        link: {
          DEFAULT: "#1a4fbf",
          hover:   "#0c2f7d",
          visited: "#5d2a8c",
        },
      },
      maxWidth: {
        prose: "65ch",
        page:  "1120px",
        result: "920px",
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "3px",
        md: "5px",
        lg: "6px",
      },
      boxShadow: {
        focus: "0 0 0 2px #cc000040",
      },
      animation: {
        "fade-in":  "fadeIn 0.18s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
