import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: { port: 5173 },
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|@tanstack|cookie|set-cookie-parser|turbo-stream)\//.test(id))
            return "vendor";
          if (/\/node_modules\/gsap\//.test(id)) return "gsap";
          return undefined;
        },
      },
    },
  },
});
