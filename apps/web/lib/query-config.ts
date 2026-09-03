/**
 * @file query-config.ts
 * @description Standardized stale times for React Query.
 * @architecture Centralizes cache invalidation thresholds to ensure consistent data freshness across the app.
 */
export const STALE_SHORT = 30_000;
export const STALE_MEDIUM = 60_000;
export const STALE_FOREVER = Infinity;
