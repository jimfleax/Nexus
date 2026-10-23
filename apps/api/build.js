import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
);

// Externalize all dependencies except internal monorepo packages (e.g., @nexus/shared)
const external = Object.keys(pkg.dependencies || {}).filter(
  (dep) => !dep.startsWith("@nexus/"),
);

await build({
  entryPoints: [path.resolve(__dirname, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external,
  outfile: path.resolve(__dirname, "server.mjs"),
  sourcemap: true,
});

console.log("✓ Built server.mjs successfully (with @nexus/shared inlined)!");
