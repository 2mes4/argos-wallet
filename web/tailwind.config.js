/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#0a0a0b",
          surface: "#131316",
          elevated: "#1c1c20",
          border: "#2a2a30",
        },
        amber: {
          DEFAULT: "#e8a838",
          50: "#fdf8ed",
          100: "#faedd0",
          200: "#f5d99c",
          300: "#f0c468",
          400: "#ebb034",
          500: "#e8a838",
          600: "#c98a1e",
          700: "#9c6918",
          800: "#6f4a14",
          900: "#422b0c",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(232, 168, 56, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(232, 168, 56, 0.35)" },
        },
      },
    },
  },
  plugins: [],
};
