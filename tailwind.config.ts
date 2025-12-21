/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
      extend: {
        colors: {
          blue: {
            400: "#2589FE",
            500: "#0070F3",
            600: "#2F6FEB",
          },
        },
        gridTemplateColumns: {
          "13": "repeat(13, minmax(0, 1fr))",
        },
        backgroundImage: {
          "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
          "gradient-conic":
            "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        },
        keyframes: {
          "fade-in": {
            "0%": { opacity: "0", transform: "translateY(20px)" },
            "100%": { opacity: "1", transform: "translateY(0)" },
          },
        },
        animation: {
          "fade-in": "fade-in 0.6s ease-out",
        },
        screens: {
          'portrait': { 'raw': '(orientation: portrait)' },
          'landscape': { 'raw': '(orientation: landscape)' },
        },
      },
    },
    plugins: [require("@tailwindcss/forms")],
};
