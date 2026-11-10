import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["node_modules", ".next", "dist"],
    include: ["**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
    },
  },
});
