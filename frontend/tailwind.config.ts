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
        background: "#000000",
        foreground: "#fafafa",
        dark: {
          900: "#000000",
          800: "#050505",
          700: "#111111",
          600: "#1a1a1a",
        },
        primary: {
          DEFAULT: "#8b5cf6",
          glow: "rgba(139, 92, 246, 0.4)",
        },
        secondary: {
          DEFAULT: "#06b6d4",
          glow: "rgba(6, 182, 212, 0.4)",
        }
      },
      boxShadow: {
        'glow': '0 0 40px -10px var(--tw-shadow-color)',
        'glow-sm': '0 0 20px -5px var(--tw-shadow-color)',
        'glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
