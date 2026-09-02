/**
 * @file projects.ts
 * @description Fastify plugin defining CRUD and cascade-delete routes for projects.
 * @architecture Tenant-isolated via the auth plugin; validates payloads with shared Zod schemas.
 *              Business logic delegated to project.service for testability.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectSchema,
} from "@nexus/shared";
import {
  listProjectsWithCounts,
  createProject,
  updateProject,
  findProjectById,
} from "../services/project.service.js";

/**
 * @module projectRoutes
 * @description Fastify plugin exposing project endpoints.
 */
export const projectRoutes: FastifyPluginAsyncZod = async (server) => {
  /**
   * @desc    List all projects, newest first
   * @route   GET /api/projects
   * @access  Private
   */
  server.get(
    "/api/projects",
    {
      schema: {
        response: {
          200: z.array(ProjectSchema),
        },
      },
    },
    async (_request, _reply) => {
      return listProjectsWithCounts();
    },
  );

  /**
   * @desc    Create a project, slugified from its name with unique-per-owner enforcement
   * @route   POST /api/projects
   * @access  Private
   */
  server.post(
    "/api/projects",
    {
      schema: {
        body: CreateProjectSchema,
        response: {
          201: ProjectSchema,
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const project = await createProject(request.body);
        return reply.status(201).send(project);
      } catch (error: any) {
        if (error.code === 11000) {
          return reply
            .status(409)
            .send({ error: "Project with this name already exists" });
        }
        throw error;
      }
    },
  );

  /**
   * @desc    Get a single project by ID
   * @route   GET /api/projects/:id
   * @access  Private
   */
  server.get(
    "/api/projects/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: ProjectSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const project = await findProjectById(request.params.id);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      return project;
    },
  );

  /**
   * @desc    Update a project's details, regenerating its slug when renamed
   * @route   PATCH /api/projects/:id
   * @access  Private
   */
  server.patch(
    "/api/projects/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: UpdateProjectSchema,
        response: {
          200: ProjectSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const project = await updateProject(request.params.id, request.body);

        if (!project) {
          return reply.status(404).send({ error: "Project not found" });
        }

        return project;
      } catch (error: any) {
        if (error.code === 11000) {
          return reply
            .status(409)
            .send({ error: "Project with this name already exists" });
        }
        throw error;
      }
    },
  );

  /**
   * @desc    Delete a project and cascade-delete its lists, resources, and Drive files
   * @route   DELETE /api/projects/:id
   * @access  Private
   */
  server.delete(
    "/api/projects/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          204: z.null(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const ownerId = request.ownerId;
      const projectId = request.params.id;

      const project = await findProjectById(projectId);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      await server.deleter.deleteProject(projectId, ownerId);

      return reply.status(204).send(null);
    },
  );
};
