export const projectUrl = (id: string) => `/projects/${id}`;
export const listUrl = (projectId: string, listId: string) =>
  `/projects/${projectId}/lists/${listId}`;
export const resourceUrl = (
  projectId: string,
  listId: string,
  resourceId: string,
) => `/projects/${projectId}/lists/${listId}/resources/${resourceId}`;
export const searchUrl = (q: string) => `/search?q=${encodeURIComponent(q)}`;
