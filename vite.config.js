import { defineConfig, loadEnv} from "vite";
import path from "path";

export default defineConfig((mode) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  root: "./src",
  server: {
    port: env.VITE_PORT || 3030,
  },
  build: {
    outDir: "../dist",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@sass": path.resolve(import.meta.dirname, "./src/sass"),
    },
  },}
});
