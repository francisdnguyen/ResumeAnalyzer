/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind v4 uses its own PostCSS plugin — replaces the old "tailwindcss" entry
    "@tailwindcss/postcss": {},
  },
};

export default config;
