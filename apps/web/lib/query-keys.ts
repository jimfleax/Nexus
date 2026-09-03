/**
 * @file query-keys.ts
 * @description Centralized React Query key factories.
 * @architecture Enforces consistent query key structures to prevent cache collision and enable targeted invalidation.
 */
export const projectKeys = {
  all: () => ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};
export const listKeys = {
  byProject: (projectId: string) => ["lists", projectId] as const,
  byProjectAndId: (projectId: string, listId: string) =>
    ["lists", projectId, listId] as const,
};
export const resourceKeys = {
  byProjectAndList: (projectId: string, listId: string) =>
    ["resources", projectId, listId] as const,
  detail: (projectId: string, listId: string, resourceId: string) =>
    ["resources", projectId, listId, resourceId] as const,
  all: () => ["resources"] as const,
};
export const favoriteKeys = { all: () => ["favorites"] as const };
export const recentKeys = { all: () => ["recentResources"] as const };
export const searchKeys = {
  query: (q: string) => ["search", q] as const,
  suggestions: (q: string) => ["search-suggestions", q] as const,
};
export const infoKeys = {
  byTypeAndId: (type: string, id: string) => ["info", type, id] as const,
};
export const metricsKeys = { all: () => ["user-metrics"] as const };
export const pdfKeys = { byUrl: (url: string) => ["pdf", url] as const };
