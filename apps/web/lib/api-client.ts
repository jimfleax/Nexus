/**
 * @file api-client.ts
 * @description Typed client-side API layer binding frontend calls to the Nexus backend routes.
 * @architecture Wraps the shared axios instance with strongly-typed methods grouped by domain (projects, lists, resources, user, search).
 */

import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  KnowledgeList,
  CreateKnowledgeListInput,
  UpdateKnowledgeListInput,
  ReorderKnowledgeListInput,
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
  UserMetricsDto,
} from "@nexus/shared";
import { api } from "./axios";

/**
 * @constant {object} apiClient
 * @description Grouped endpoint methods consumed by the TanStack Query hooks and pages.
 */
export const apiClient = {
  /**
   * @description Project CRUD endpoints.
   */
  projects: {
    /**
     * @desc    List all projects
     * @returns {Promise<Project[]>} The project list
     */
    async list(): Promise<Project[]> {
      const { data } = await api.get<Project[]>("/projects");
      return data;
    },
    /**
     * @desc    Fetch a single project
     * @param   {string} id - Project ID
     * @returns {Promise<Project>} The project
     */
    async get(id: string): Promise<Project> {
      const { data } = await api.get<Project>(`/projects/${id}`);
      return data;
    },
    /**
     * @desc    Create a project
     * @param   {CreateProjectInput} input - Project payload
     * @returns {Promise<Project>} The created project
     */
    async create(input: CreateProjectInput): Promise<Project> {
      const { data } = await api.post<Project>("/projects", input);
      return data;
    },
    /**
     * @desc    Update a project
     * @param   {string} id - Project ID
     * @param   {UpdateProjectInput} input - Partial project payload
     * @returns {Promise<Project>} The updated project
     */
    async update(id: string, input: UpdateProjectInput): Promise<Project> {
      const { data } = await api.patch<Project>(`/projects/${id}`, input);
      return data;
    },
    /**
     * @desc    Delete a project
     * @param   {string} id - Project ID
     * @returns {Promise<void>} Resolves when deleted
     */
    async delete(id: string): Promise<void> {
      await api.delete(`/projects/${id}`);
    },
  },
  /**
   * @description Knowledge-list endpoints.
   */
  lists: {
    /**
     * @desc    List all lists in a project
     * @param   {string} projectId - Project ID
     * @returns {Promise<KnowledgeList[]>} The ordered list collection
     */
    async list(projectId: string): Promise<KnowledgeList[]> {
      const { data } = await api.get<KnowledgeList[]>(
        `/projects/${projectId}/lists`,
      );
      return data;
    },
    /**
     * @desc    Fetch a single list
     * @param   {string} projectId - Project ID
     * @param   {string} listId - List ID
     * @returns {Promise<KnowledgeList>} The list
     */
    async get(projectId: string, listId: string): Promise<KnowledgeList> {
      const { data } = await api.get<KnowledgeList>(
        `/projects/${projectId}/lists/${listId}`,
      );
      return data;
    },
    /**
     * @desc    Create a list in a project
     * @param   {string} projectId - Project ID
     * @param   {CreateKnowledgeListInput} input - List payload
     * @returns {Promise<KnowledgeList>} The created list
     */
    async create(
      projectId: string,
      input: CreateKnowledgeListInput,
    ): Promise<KnowledgeList> {
      const { data } = await api.post<KnowledgeList>(
        `/projects/${projectId}/lists`,
        input,
      );
      return data;
    },
    /**
     * @desc    Update a list
     * @param   {string} projectId - Project ID
     * @param   {string} listId - List ID
     * @param   {UpdateKnowledgeListInput} input - Partial list payload
     * @returns {Promise<KnowledgeList>} The updated list
     */
    async update(
      projectId: string,
      listId: string,
      input: UpdateKnowledgeListInput,
    ): Promise<KnowledgeList> {
      const { data } = await api.patch<KnowledgeList>(
        `/projects/${projectId}/lists/${listId}`,
        input,
      );
      return data;
    },
    /**
     * @desc    Delete a list
     * @param   {string} projectId - Project ID
     * @param   {string} listId - List ID
     * @returns {Promise<void>} Resolves when deleted
     */
    async delete(projectId: string, listId: string): Promise<void> {
      await api.delete(`/projects/${projectId}/lists/${listId}`);
    },
    /**
     * @desc    Bulk-reorder lists within a project
     * @param   {string} projectId - Project ID
     * @param   {ReorderKnowledgeListInput} input - Ordered list ID/position pairs
     * @returns {Promise<void>} Resolves after reordering
     */
    async reorder(
      projectId: string,
      input: ReorderKnowledgeListInput,
    ): Promise<void> {
      await api.patch(`/projects/${projectId}/lists/reorder`, input);
    },
  },
  /**
   * @description Resource endpoints.
   */
  resources: {
    /**
     * @desc    List resources in a project's list
     * @param   {string} projectId - Project ID
     * @param   {string} listId - List ID
     * @returns {Promise<Resource[]>} The resource list
     */
    async list(projectId: string, listId: string): Promise<Resource[]> {
      const { data } = await api.get<Resource[]>(
        `/projects/${projectId}/lists/${listId}/resources`,
      );
      return data;
    },
    /**
     * @desc    Fetch a single resource
     * @param   {string} resourceId - Resource ID
     * @returns {Promise<Resource>} The resource
     */
    async get(resourceId: string): Promise<Resource> {
      const { data } = await api.get<Resource>(`/resources/${resourceId}`);
      return data;
    },
    /**
     * @desc    Create a resource in a project's list
     * @param   {string} projectId - Project ID
     * @param   {string} listId - List ID
     * @param   {CreateResourceInput} input - Resource payload
     * @returns {Promise<Resource>} The created resource
     */
    async create(
      projectId: string,
      listId: string,
      input: any,
    ): Promise<Resource> {
      if (input.file) {
        const form = new FormData();
        form.append("projectId", projectId);
        form.append("listId", listId);
        Object.keys(input).forEach((key) => {
          if (input[key] !== undefined) form.append(key, input[key]);
        });
        const { data } = await api.post<Resource>("/resources", form, {
          headers: {
             "Content-Type": "multipart/form-data"
          }
        });
        return data;
      }

      const { data } = await api.post<Resource>(
        "/resources",
        { ...input, projectId, listId },
      );
      return data;
    },
    /**
     * @desc    Update a resource
     * @param   {string} resourceId - Resource ID
     * @param   {UpdateResourceInput} input - Partial resource payload
     * @returns {Promise<Resource>} The updated resource
     */
    async update(
      resourceId: string,
      input: UpdateResourceInput,
    ): Promise<Resource> {
      const { data } = await api.patch<Resource>(
        `/resources/${resourceId}`,
        input,
      );
      return data;
    },
    /**
     * @desc    Delete a resource
     * @param   {string} resourceId - Resource ID
     * @returns {Promise<void>} Resolves when deleted
     */
    async delete(resourceId: string): Promise<void> {
      await api.delete(`/resources/${resourceId}`);
    },

    /**
     * @desc    Toggle a resource's favorite flag
     * @param   {string} resourceId - Resource ID
     * @returns {Promise<Resource>} The toggled resource
     */
    async toggleFavorite(resourceId: string): Promise<Resource> {
      const { data } = await api.put<Resource>(
        `/resources/${resourceId}/favorite`,
        {},
      );
      return data;
    },
    /**
     * @desc    Mark a resource as opened to update the recent feed
     * @param   {string} resourceId - Resource ID
     * @returns {Promise<void>} Resolves after the open is recorded
     */
    async markOpened(resourceId: string): Promise<void> {
      await api.post(`/resources/${resourceId}/open`, {});
    },
  },
  /**
   * @description User-level endpoints.
   */
  user: {
    /**
     * @desc    List favorite resources
     * @returns {Promise<Resource[]>} The favorites
     */
    async favorites(): Promise<Resource[]> {
      const { data } = await api.get<Resource[]>("/favorites");
      return data;
    },
    /**
     * @desc    List recently opened resources
     * @returns {Promise<Resource[]>} The recent resources
     */
    async recent(): Promise<Resource[]> {
      const { data } = await api.get<Resource[]>("/recent");
      return data;
    },
    /**
     * @desc    Fetch user storage metrics
     * @returns {Promise<UserMetricsDto>} Aggregate storage and count metrics
     */
    async metrics(): Promise<UserMetricsDto> {
      const { data } = await api.get<UserMetricsDto>("/metrics");
      return data;
    },
  },
  /**
   * @description Search endpoints.
   */
  search: {
    /**
     * @desc    Run a full-text search for resources
     * @param   {string} q - The search query
     * @returns {Promise<Resource[]>} Matching resources
     */
    async query(q: string): Promise<Resource[]> {
      const { data } = await api.get<Resource[]>(`/search`, { params: { q } });
      return data;
    },
    /**
     * @desc    Fetch title suggestions for a query
     * @param   {string} q - The prefix/query text
     * @returns {Promise<string[]>} Matching suggestion titles
     */
    async suggestions(q: string): Promise<string[]> {
      const { data } = await api.get<string[]>(`/search/suggestions`, {
        params: { q },
      });
      return data;
    },
  },
};
