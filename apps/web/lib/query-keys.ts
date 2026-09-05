/**
 * @file query-keys.ts
 * @description Centralized React Query key factories.
 * @architecture Enforces consistent query key structures to prevent cache collision and enable targeted invalidation.
 */
/**
 * @desc Project query keys
 */
export const projectKeys = {
  all: () => ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};

/**
 * @desc Knowledge list query keys
 */
export const listKeys = {
  byProject: (projectId: string) => ["lists", projectId] as const,
  byProjectAndId: (projectId: string, listId: string) =>
    ["lists", projectId, listId] as const,
};

/**
 * @desc Resource query keys
 */
export const resourceKeys = {
  byProjectAndList: (projectId: string, listId: string) =>
    ["resources", projectId, listId] as const,
  detail: (projectId: string, listId: string, resourceId: string) =>
    ["resources", projectId, listId, resourceId] as const,
  all: () => ["resources"] as const,
};

/**
 * @desc Favorite resources query keys
 */
export const favoriteKeys = { all: () => ["favorites"] as const };

/**
 * @desc Recent resources query keys
 */
export const recentKeys = { all: () => ["recentResources"] as const };

/**
 * @desc Search query keys
 */
export const searchKeys = {
  query: (q: string) => ["search", q] as const,
  suggestions: (q: string) => ["search-suggestions", q] as const,
};

/**
 * @desc Info query keys
 */
export const infoKeys = {
  byTypeAndId: (type: string, id: string) => ["info", type, id] as const,
};

/**
 * @desc User metrics query keys
 */
export const metricsKeys = { all: () => ["user-metrics"] as const };

/**
 * @desc PDF query keys
 */
