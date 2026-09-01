/**
 * @file projects.ts
 * @description Fastify plugin defining CRUD and cascade-delete routes for projects.
 * @architecture Tenant-isolated via the auth plugin; validates payloads with shared Zod schemas, slugifies names, and deletes lists, resources, and Drive files transactionally.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ProjectModel } from "../models/Project.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { ResourceModel } from "../models/Resource.js";
import mongoose from "mongoose";

import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectSchema,
} from "@nexus/shared";

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
    async (request, reply) => {
      const projects = await ProjectModel.aggregate([
        // $match with ownerId is auto-injected by the tenant plugin pre-aggregate hook
        {
          $lookup: {
            from: "knowledgelists",
            let: { projectId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$projectId", "$$projectId"] },
                },
              },
              { $count: "count" },
            ],
            as: "listData",
          },
        },
        {
          $addFields: {
            id: { $toString: "$_id" },
            listCount: {
              $ifNull: [{ $arrayElemAt: ["$listData.count", 0] }, 0],
            },
          },
        },
        { $project: { listData: 0, __v: 0 } },
        { $sort: { createdAt: -1 } },
      ]);
      return projects;
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
      const body = request.body;
      const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const project = new ProjectModel({
        ...body,
        slug,
      });

      try {
        await project.save();
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
      const project = await ProjectModel.findById(request.params.id);
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
      const body = request.body;
      const updates: any = { ...body };

      if (body.name) {
        updates.slug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }

      try {
        const project = await ProjectModel.findByIdAndUpdate(
          request.params.id,
          { $set: updates },
          { new: true, runValidators: true },
        );

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
      const ownerId = (request as any).ownerId;
      const projectId = request.params.id;

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      await server.deleter.deleteProject(projectId, ownerId);

      return reply.status(204).send(null);
    },
  );
};
