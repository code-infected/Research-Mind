import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        // Cold Precision - Digital Void
        background: "#020202",
        foreground: "#F8F8F8",
        
        // Surface layers
        "surface": "#020202",
        "surface-container": "#080808",
        "surface-container-low": "#020202",
        "surface-container-high": "#0F0F0F",
        "surface-container-highest": "#1E1E1E",
        "surface-container-lowest": "#000000",
        
        // Electric Cyan - the only accent
        "primary": {
          DEFAULT: "#00D9FF",
          foreground: "#020202",
        },
        "primary-container": {
          DEFAULT: "#00D9FF",
          foreground: "#020202",
        },
        
        // Secondary - muted gray
        "secondary": {
          DEFAULT: "#8A8A8A",
          foreground: "#F8F8F8",
        },
        
        // Tertiary - darker gray
        "tertiary": {
          DEFAULT: "#484848",
          foreground: "#F8F8F8",
        },
        
        // Semantic colors
        "error": {
          DEFAULT: "#E34234",
          foreground: "#020202",
        },
        "success": {
          DEFAULT: "#1DB954",
          foreground: "#020202",
        },
        "warning": {
          DEFAULT: "#D4A017",
          foreground: "#020202",
        },
        
        muted: {
          DEFAULT: "#0F0F0F",
          foreground: "#8A8A8A",
        },
        
        accent: {
          DEFAULT: "#00D9FF",
          foreground: "#020202",
        },
        
        popover: {
          DEFAULT: "#0F0F0F",
          foreground: "#F8F8F8",
        },
        
        card: {
          DEFAULT: "#080808",
          foreground: "#F8F8F8",
        },
        
        // Hairline borders
        border: "rgba(255, 255, 255, 0.04)",
        input: "#484848",
        ring: "#00D9FF",
      },
      
      // No gradients - flat design
      backgroundImage: {},
      
      // No shadows - flat design
      boxShadow: {},
      
      // Zero radius - sharp corners
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
        DEFAULT: "0px",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
