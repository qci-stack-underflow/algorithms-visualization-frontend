import { defineConfig, loadEnv} from "vite";
import path from "path";

export default defineConfig((mode) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  root: "./src",
  // Las variables VITE_* se leen del .env en la raíz del proyecto.
  envDir: process.cwd(),
  server: {
    port: env.VITE_PORT || 3030,
    // En desarrollo, /api/* se reenvía al backend local (evita CORS).
    proxy: {
      "/api": {
        target: env.BACKEND_URL || "http://localhost:3000",
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "../dist",
    sourcemap: true,
    // Tres páginas: el inicio (con el visualizador), la pantalla de Huffman
    // y la de grafos.
    rolldownOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "./src/index.html"),
        huffman: path.resolve(import.meta.dirname, "./src/huffman.html"),
        grafos: path.resolve(import.meta.dirname, "./src/grafos.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@sass": path.resolve(import.meta.dirname, "./src/sass"),
    },
  },}
});
