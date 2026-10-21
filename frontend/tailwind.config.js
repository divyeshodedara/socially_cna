/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      borderRadius: {
        card: "16px", // for cards, modals, posts
        input: "10px", // for all form inputs
        btn: "10px", // for all buttons
        pill: "9999px", // for badges and tags
      },
      colors: {
        // Pure monochrome palette - black and white only
        mono: {
          black: "#000000",
          900: "#111111",
          800: "#222222",
          700: "#333333",
          600: "#666666",
          500: "#999999",
          400: "#CCCCCC",
          300: "#DDDDDD",
          200: "#EEEEEE",
          100: "#F5F5F5",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "mono-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        mono: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "mono-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "mono-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "mono-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
