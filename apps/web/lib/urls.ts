/**
 * @file urls.ts
 * @description Centralized URL routing helpers for the frontend.
 * @architecture Enforces consistent route generation to avoid hardcoded paths across the React application.
 */

/**
 * @desc Generates a project URL.
 * @param {string} id - Project ID
 * @returns {string} The project URL
 */
export const projectUrl = (id: string) => `/projects/${id}`;

/**
 * @desc Generates a list URL.
 * @param {string} projectId - Project ID
 * @param {string} listId - List ID
 * @returns {string} The list URL
 */
export const listUrl = (projectId: string, listId: string) =>
  `/projects/${projectId}/lists/${listId}`;

/**
 * @desc Generates a resource URL.
 * @param {string} projectId - Project ID
 * @param {string} listId - List ID
 * @param {string} resourceId - Resource ID
 * @returns {string} The resource URL
 */
export const resourceUrl = (
  projectId: string,
  listId: string,
  resourceId: string,
) => `/projects/${projectId}/lists/${listId}/resources/${resourceId}`;

/**
 * @desc Generates a search URL.
 * @param {string} q - Search query
 * @returns {string} The search URL
 */
export const searchUrl = (q: string) => `/search?q=${encodeURIComponent(q)}`;
