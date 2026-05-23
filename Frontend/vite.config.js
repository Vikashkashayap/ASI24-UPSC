import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

/**
 * Split only heavy / leaf libraries. React + core deps stay in one `vendor` chunk
 * to avoid circular chunk warnings (vendor-misc ↔ vendor-react).
 */
function manualChunks(id) {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("react-pdf") || id.includes("pdfjs-dist")) return "vendor-pdf";
  if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
    return "vendor-charts";
  }
  if (id.includes("framer-motion")) return "vendor-motion";
  if (id.includes("socket.io-client") || id.includes("engine.io")) return "vendor-socket";
  if (id.includes("@dnd-kit")) return "vendor-dnd";
  if (id.includes("lucide-react")) return "vendor-icons";
  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  // Keep dev pre-bundling lean; heavy libs load via route chunks in production.
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "axios"],
    exclude: ["react-pdf"],
  },
  esbuild: {
    legalComments: "none",
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    // Skips gzip size pass — saves hundreds of MB during large builds.
    reportCompressedSize: false,
    minify: "esbuild",
    rollupOptions: {
      // Process fewer files at once — critical on 1 GB RAM VPS.
      maxParallelFileOps: 1,
      output: {
        manualChunks,
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
