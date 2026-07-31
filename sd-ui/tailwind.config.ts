import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Category accent colors
        cat: {
          fund:  "hsl(var(--cat-fund))",
          stor:  "hsl(var(--cat-stor))",
          core:  "hsl(var(--cat-core))",
          infra: "hsl(var(--cat-infra))",
          adv:   "hsl(var(--cat-adv))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in":    { from: { opacity: "0" },                                    to: { opacity: "1" } },
        "slide-up":   { from: { opacity: "0", transform: "translateY(16px)" },     to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in":   { from: { opacity: "0", transform: "translateX(-16px)" },    to: { opacity: "1", transform: "translateX(0)" } },
        "pulse-ring": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".5", transform: "scale(.9)" },
        },
        "stream-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0" },
        },
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "fade-in":      "fade-in 0.4s ease-out",
        "slide-up":     "slide-up 0.35s ease-out",
        "slide-in":     "slide-in 0.35s ease-out",
        "pulse-ring":   "pulse-ring 2s ease-in-out infinite",
        "stream-cursor":"stream-cursor 0.8s step-end infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        soft:     "0 1px 4px rgba(0,0,0,0.06)",
        elevated: "0 4px 16px rgba(0,0,0,0.1)",
        card:     "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px hsl(var(--border))",
        glow:     "0 0 0 3px hsl(var(--primary) / .15)",
      },
    },
  },
  plugins: [],
};

export default config;
