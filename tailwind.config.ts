import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        "hf-blue": "#00C8FF",
        "hf-blue-text": "#0089B3",
        "hf-purple": "#6D2EFF",
        "hf-fuchsia": "#FF2DB8",
        "hf-fuchsia-text": "#C4127F",
        "hf-black": "#111111",
      },
      fontFamily: {
        // Inter es la fuente por defecto de toda la app (texto, formularios,
        // tablas, botones, dashboard); Space Grotesk se reserva para
        // títulos/encabezados vía la clase "heading" o la variable CSS.
        sans: ["var(--font-hf-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-hf-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-hf-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
