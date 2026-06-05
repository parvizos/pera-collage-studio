/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
      },
      colors: {
        ink: "#121212",
        sand: "#f6f1ea",
        clay: "#d47516",
        line: "#e7ddd0",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
