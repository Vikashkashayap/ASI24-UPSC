import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

/** 1 GB VPS: set VITE_LOW_MEM=1 (uses esbuild minify — lower peak RSS than terser). */
const lowMem = process.env.VITE_LOW_MEM === "1";

/**
 * Split only heavy leaf libraries. React + router + scheduler stay in `vendor`
 * to avoid circular chunk warnings (vendor ↔ vendor-charts ↔ vendor-react-dom).
 */
function manualChunks(id) {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("react-pdf") || id.includes("pdfjs-dist")) return "vendor-pdf";
  if (
    id.includes("recharts") ||
    id.includes("d3-") ||
    id.includes("victory-vendor") ||
    id.includes("/lodash/")
  ) {
    return "vendor-charts";
  }
  if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
    return "vendor-motion";
  }
  if (id.includes("socket.io-client") || id.includes("engine.io")) return "vendor-socket";
  if (id.includes("@dnd-kit")) return "vendor-dnd";
  if (id.includes("lucide-react")) return "vendor-icons";
  if (id.includes("papaparse")) return "vendor-csv";
  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    exclude: ["react-pdf", "pdfjs-dist"],
    esbuildOptions: {
      target: "es2020",
      legalComments: "none",
    },
  },
  esbuild: {
    legalComments: "none",
    treeShaking: true,
    target: "es2020",
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: false,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,
    // esbuild on 1 GB RAM; terser via `npm run build:terser` when more headroom is available
    minify: lowMem ? "esbuild" : "terser",
    terserOptions: lowMem
      ? undefined
      : {
          compress: {
            passes: 1,
            drop_console: true,
            drop_debugger: true,
          },
          mangle: true,
          format: { comments: false },
        },
    rollupOptions: {
      maxParallelFileOps: 1,
      treeshake: {
        preset: "recommended",
        moduleSideEffects: "no-external",
      },
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
