import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { tenantContext } from "../src/db.js";
import { projectRoutes } from "../src/routes/projects.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

const OWNER = "test-user-1";

describe("GET /api/projects – listCount", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [projectRoutes] });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await inTenant(OWNER, async () => {
      await ProjectModel.deleteMany({});
      await KnowledgeListModel.deleteMany({});
    });
  });

  it("returns listCount=0 for a project with no lists", async () => {
    await inTenant(OWNER, async () => {
      await ProjectModel.create({
        ownerId: OWNER,
        name: "Empty Project",
        slug: "empty-project",
      });
    });

    const res = await ctx.app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const projects = JSON.parse(res.body);
    expect(projects).toHaveLength(1);
    expect(projects[0].listCount).toBe(0);
  });

  it("returns correct listCount per project", async () => {
    await inTenant(OWNER, async () => {
      const projectA = await ProjectModel.create({
        ownerId: OWNER,
        name: "Project A",
        slug: "project-a",
      });
      const projectB = await ProjectModel.create({
        ownerId: OWNER,
        name: "Project B",
        slug: "project-b",
      });

      // 3 lists under A, 1 under B
      for (let i = 0; i < 3; i++) {
        await KnowledgeListModel.create({
          ownerId: OWNER,
          projectId: String(projectA._id),
          name: `List A${i}`,
          slug: `list-a${i}`,
          position: i,
        });
      }
      await KnowledgeListModel.create({
        ownerId: OWNER,
        projectId: String(projectB._id),
        name: "List B0",
        slug: "list-b0",
        position: 0,
      });
    });

    const res = await ctx.app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const projects: any[] = JSON.parse(res.body);
    expect(projects).toHaveLength(2);

    const a = projects.find((p) => p.name === "Project A");
    const b = projects.find((p) => p.name === "Project B");
    expect(a.listCount).toBe(3);
    expect(b.listCount).toBe(1);
  });
});
