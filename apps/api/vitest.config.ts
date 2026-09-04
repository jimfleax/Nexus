import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    exclude: ["node_modules", "dist"],
    // Run test files sequentially to avoid flaky transaction errors
    // caused by parallel MongoDB replica set access under memory-server.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      TOKEN_ENCRYPTION_KEY: "test-secret-key-that-is-long-enough-for-aes",
    },
  },
});
