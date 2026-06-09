/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "DM Sans", "system-ui", "sans-serif"],
        serif: ["var(--font-head)", "Instrument Serif", "serif"],
      },
      colors: {
        ink: "#121212",
        sand: "rgb(var(--bg-rgb) / <alpha-value>)",
        clay: "rgb(var(--accent-rgb) / <alpha-value>)",
        line: "#e7ddd0",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
