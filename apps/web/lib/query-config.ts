/**
 * @file query-config.ts
 * @description Standardized stale times for React Query.
 * @architecture Centralizes cache invalidation thresholds to ensure consistent data freshness across the app.
 */

/**
 * @desc Short stale time threshold (30 seconds)
 * @type {number}
 */
export const STALE_SHORT = 30_000;

/**
 * @desc Medium stale time threshold (60 seconds)
 * @type {number}
 */
export const STALE_MEDIUM = 60_000;

/**
 * @desc Infinite stale time threshold
 * @type {number}
 */
