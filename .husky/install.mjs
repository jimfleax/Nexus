/**
 * @file install.mjs
 * @description Installs Husky Git hooks in development while silently skipping in CI/production.
 */

if (
  process.env.NODE_ENV === "production" ||
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  Boolean(process.env.VERCEL)
) {
  process.exit(0);
}

try {
  const { default: husky } = await import("husky");
  husky();
} catch {
  // Husky is not installed (e.g. devDependencies were omitted)
  process.exit(0);
}
