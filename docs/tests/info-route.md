# Test Plan: Info Route Success Paths (`GET /api/info`)

## Source Under Test

`apps/api/src/routes/info.ts` — the whole handler (lines 13–87).

## Why It Needs Tests

- The existing `info.test.ts` covers only two **error** branches: 400 (missing params) and 404 (nonexistent project).
- The **success paths** for all three types (`project`, `list`, `resource`) with their count aggregations and field mapping are entirely untested.
- The invalid `type` enum → 400 is also untested.

## What the Handler Does (verified)

```ts
GET /api/info?type=<project|list|resource>&id=<id>:
  querystring: { type: z.enum(["project","list","resource"]), id: z.string() }

  type === "project":
     project = ProjectModel.findById(id); if (!project) → 404 "Project not found"
     listCount = KnowledgeListModel.countDocuments({ projectId: id })
     resourceCount = ResourceModel.countDocuments({ projectId: id })
     return { id, type:"project", name, description, createdAt, updatedAt, listCount, resourceCount }

  type === "list":
     list = KnowledgeListModel.findById(id); if (!list) → 404 "List not found"
     resourceCount = ResourceModel.countDocuments({ listId: id })
     return { id, type:"list", name, description, createdAt, updatedAt, resourceCount }

  type === "resource":
     resource = ResourceModel.findById(id); if (!resource) → 404 "Resource not found"
     return { id, type:"resource", name: resource.title, description, createdAt, updatedAt,
              resourceType, mimeType, size, status, readingTime }
```

## Setup / Fixtures

```ts
const mongoServer = await MongoMemoryServer.create();
await connectDB(mongoServer.getUri());

const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.decorateRequest("ownerId", null);
app.addHook("onRequest", (request: any, reply: any, done: any) => {
  request.ownerId = "test-user-1";
  tenantContext.run({ ownerId: "test-user-1" }, () => done());
});
app.register(infoRoutes);
await app.ready();
```

Seed (inside `tenantContext.run`):

```ts
let projectId: string, listId: string, resourceId: string;
await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-1" }, async () => {
    const p = await ProjectModel.create({ name: "Proj", slug: "proj", description: "d" });
    projectId = p._id.toString();
    const l = await KnowledgeListModel.create({ projectId: projectId, name: "List", slug: "list", position: 0 });
    listId = l._id.toString();
    const r = await ResourceModel.create({
      projectId, listId, title: "Res", type: "pdf", mimeType: "application/pdf",
      size: 100, status: "ready", readingTime: "5 min",
    });
    resourceId = r._id.toString();
    // a second resource in a second list to prove counts aggregate
    const l2 = await KnowledgeListModel.create({ projectId, name: "List2", slug: "list2", position: 1 });
    await ResourceModel.create({ projectId, listId: l2._id.toString(), title: "Res2", type: "note" });
    resolve();
  }),
);
```

## Test Cases

| # | Test | URL | Expected |
|---|------|-----|----------|
| 1 | Project info returns counts | `?type=project&id=<projectId>` | 200, `{ type:"project", name:"Proj", description:"d", listCount:2, resourceCount:2 }` (2 lists, 2 resources across lists) |
| 2 | Project with zero lists counts | Seed a project with no lists | `listCount:0`, `resourceCount:0` |
| 3 | List info returns resource count | `?type=list&id=<listId>` | 200, `{ type:"list", name:"List", description:undefined, resourceCount:1 }` |
| 4 | Resource info returns all metadata | `?type=resource&id=<resourceId>` | 200, `{ type:"resource", name:"Res", resourceType:"pdf", mimeType:"application/pdf", size:100, status:"ready", readingTime:"5 min" }` |
| 5 | Invalid `type` enum → 400 | `?type=bogus&id=x` | 400 |
| 6 | Missing `id` → 400 | `?type=project` | 400 |
| 7 | Nonexistent project → 404 | `?type=project&id=<random-oid>` | 404 `"Project not found"` |
| 8 | Nonexistent list → 404 | `?type=list&id=<random-oid>` | 404 `"List not found"` |
| 9 | Nonexistent resource → 404 | `?type=resource&id=<random-oid>` | 404 `"Resource not found"` |
| 10 | Tenant isolation: another tenant's id → 404 | Switch tenant to user-2 via `x-test-owner`, query user-1's projectId | 404 (tenant plugin filters lookup) |

## Pitfalls & Challenges

1. **`listCount`/`resourceCount` count via `countDocuments({ projectId: id })`** — note `projectId`/`listId` on lists/resources are **strings**, while the project `_id` is an ObjectId. When seeding, use `projectId: project._id.toString()` explicitly. The route compares `id` (a string from the URL) against the stored string fields — so you must pass the string form.

2. **Tenant isolation (case 10)** returns **404**, not an empty object — because `ProjectModel.findById(id)` is tenant-filtered by the plugin and finds nothing. That surfaces as 404 "Project not found". Assert 404.

3. **The `x-test-owner` header pattern** is the cleanest way to switch tenants within one suite (see `user-metrics.test.ts`). Add it to the `onRequest` hook.

4. **`countDocuments` in info.ts has NO explicit `ownerId` filter** — it relies entirely on the tenant plugin's pre-hook on `countDocuments`. Since you run within a tenant context in the route, the counts are tenant-scoped. Good — that's what makes case 10 correct.

5. **Dates in the response** are `string | Date` per `InfoSchema` — Fastify's `serializerCompiler` will serialize `Date` to ISO strings. Don't assert exact date values; assert presence or use `expect.any(String)` / a `toMatch` date regex.

6. **`description` for a project/list seeded WITHOUT description** comes back as `undefined` → JSON omits it (or sends `null`). For list case 3, either seed a description, or assert `description` is absent/undefined. To keep it clean, seed descriptions so you have a deterministic value to assert.

7. **The `type` enum is validated by the Fastify querystring schema** — so case 5 (`type=bogus`) gives a Fastify-level 400 (not the handler). Same for case 6 (missing id). Assert status code; the body is Fastify's default format.

## Suggested File

`apps/api/tests/info-success.test.ts`
