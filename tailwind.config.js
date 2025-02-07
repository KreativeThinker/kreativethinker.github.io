/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,astro}"],
  theme: {
    fontFamily: {
      sans: ['"Montserrat"'],
      mono: ['"JetBrains Mono"'],
    },
    colors: {
      // background: "#292E42",
      // text: "#7AA2F7",
      // accent: "#FF9E64",
      background: "#e2e2e2",
      accent: "#2e2e2e",
      text: "#555",
    },
    extend: {},
  },
  plugins: [],
};
