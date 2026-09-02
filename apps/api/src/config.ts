/**
 * @file config.ts
 * @description Centralized, typed configuration module that reads environment variables once at startup.
 * @architecture Validates required variables and exposes a frozen config object, making all env access
 *              explicit, injectable, and testable. Consumed by auth, storage, GC, and route modules.
 */

/**
 * @interface ApiConfig
 * @description Shape of the validated application configuration.
 */
export interface ApiConfig {
  /** MongoDB connection string */
  mongodbUri: string;
  /** Server listen port */
  port: number;
  /** JWT signing secret for session tokens */
  authSecret: string;
  /** Google OAuth client ID (used for both auth and Drive) */
  authGoogleId: string;
  /** Google OAuth client secret */
  authGoogleSecret: string;
  /** GitHub OAuth client ID */
  authGithubId: string;
  /** GitHub OAuth client secret */
  authGithubSecret: string;
  /** Frontend URL for OAuth redirects */
  frontendUrl: string;
}

/**
 * @desc    Read an environment variable or throw if it is missing and no default is provided
 * @param   {string} key - The environment variable name
 * @param   {string} [defaultValue] - Optional default when the variable is unset
 * @returns {string} The variable's value
 */
function requiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * @desc    Read an optional environment variable with a fallback
 * @param   {string} key - The environment variable name
 * @param   {string} defaultValue - Fallback when the variable is unset
 * @returns {string} The variable's value or the default
 */
function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * @desc    Build and freeze the application config from process.env.
 *          Call this once at startup. Throws immediately if required vars are missing.
 * @returns {Readonly<ApiConfig>} The validated, frozen config object
 */
export function loadConfig(): Readonly<ApiConfig> {
  const config: ApiConfig = {
    mongodbUri: requiredEnv("MONGODB_URI"),
    port: (() => {
      const p = optionalEnv("PORT", "8080");
      if (!/^\d+$/.test(p)) throw new Error("PORT must be a valid integer");
      const parsed = parseInt(p, 10);
      if (parsed < 1 || parsed > 65535)
        throw new Error("PORT must be between 1 and 65535");
      return parsed;
    })(),
    authSecret: requiredEnv("AUTH_SECRET"),
    authGoogleId: optionalEnv("AUTH_GOOGLE_ID", ""),
    authGoogleSecret: optionalEnv("AUTH_GOOGLE_SECRET", ""),
    authGithubId: optionalEnv("AUTH_GITHUB_ID", ""),
    authGithubSecret: optionalEnv("AUTH_GITHUB_SECRET", ""),
    frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:3000"),
  };

  return Object.freeze(config);
}

/**
 * @desc    Create a config object from explicit values (for testing)
 * @param   {Partial<ApiConfig>} overrides - Values to override defaults
 * @returns {Readonly<ApiConfig>} The config object
 */
export function createTestConfig(
  overrides: Partial<ApiConfig> = {},
): Readonly<ApiConfig> {
  return Object.freeze({
    mongodbUri: "mongodb://localhost:27017/test",
    port: 0,
    authSecret: "test-secret-key-for-testing-only-1234",
    authGoogleId: "test-google-id",
    authGoogleSecret: "test-google-secret",
    authGithubId: "test-github-id",
    authGithubSecret: "test-github-secret",
    frontendUrl: "http://localhost:3000",
    ...overrides,
  });
}
