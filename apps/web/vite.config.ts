import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Configuration Vite pour l’application React du panel. */
export default defineConfig({
  plugins: [react()],
});
