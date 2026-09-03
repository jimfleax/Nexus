# Test Plan: Project Route Error Paths

## Source Under Test

`apps/api/src/routes/projects.ts`:

- `GET /api/projects/:id` — 404 branch (lines 119–137)
- `PATCH /api/projects/:id` — 404, 409 branches (lines 144–189)
- `DELETE /api/projects/:id` — 404 branch (lines 196–220)
- `POST /api/projects` — invalid-payload + empty-slug edge (lines 77–112)

## Why It Needs Tests

- The existing `projects.test.ts` tests happy paths + one duplicate-409 for create, but all the **404** branches, **PATCH 409**, and the **empty-slug** edge case are untested.
- The slugification edge (a name with only non-alphanumeric chars → empty slug → Mongoose `required` failure) is a real, easily-regressed footgun.

## What the Handlers Do (verified)

```ts
POST /api/projects:
  slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)+/g,"")
  save; on E11000 ({ownerId,slug} unique) → 409 "Project with this name already exists"
  // empty-slug: name="!!!" → slug="" → Mongoose required error (NOT a 409)

GET /api/projects/:id:
  if (!project) → 404 "Project not found"

PATCH /api/projects/:id:
  if (body.name) updates.slug = slugify(body.name)
  findByIdAndUpdate({new, runValidators}); if (!project) → 404 "Project not found"
  on E11000 → 409 "Project with this name already exists"

DELETE /api/projects/:id:
  project = findById(id); if (!project) → 404 "Project not found"
  server.deleter.deleteProject(projectId, ownerId) → 204
```

## Setup / Fixtures

Same mocked-deleter pattern (as `projects.test.ts`):

```ts
const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.decorateRequest("ownerId", null);
app.addHook("onRequest", (request: any, reply: any, done: any) => {
  const ownerId = request.headers["x-test-owner"] || "test-user-1";
  request.ownerId = ownerId;
  tenantContext.run({ ownerId }, () => done());
});
const deleteProject = vi.fn().mockResolvedValue(undefined);
app.decorate("deleter", { deleteProject, deleteList: vi.fn(), deleteResource: vi.fn() });
app.register(projectRoutes);
await app.ready();
```

Seed (inside `tenantContext.run`):

```ts
let projectId: string;   // user-1's project "Proj"/"proj"
let otherTenantProjectId: string;  // user-2's project
let secondProjectId: string;       // user-1's "Other"/"other" (to create name collisions)
```

## Test Cases

| # | Test | Request | Expected |
|---|------|---------|----------|
| 1 | GET nonexistent project → 404 | `GET /api/projects/<random-oid>` | 404 `"Project not found"` |
| 2 | PATCH nonexistent → 404 | `PATCH /api/projects/<random-oid>` body `{ name:"X" }` | 404 `"Project not found"` |
| 3 | PATCH rename regenerates slug | PATCH projectId `{ name:"Proj Renamed" }` | 200, `slug:"proj-renamed"` |
| 4 | PATCH rename collides → 409 | Rename to `"Other"` (secondProject slug `"other"` exists) | 409 `"Project with this name already exists"` |
| 5 | PATCH description only keeps slug | `{ description:"desc" }` | 200, slug unchanged |
| 6 | DELETE nonexistent → 404 + deleter not called | `DELETE /api/projects/<random-oid>` | 404; `deleteProject` mock not called |
| 7 | DELETE happy → 204 + deleter called | `DELETE /api/projects/<projectId>` | 204; `deleteProject` called with `(projectId, "test-user-1")` |
| 8 | POST slugifies Unicode/punctuation name | `POST` `{ name:" Project A " }` | 201, `slug:"project-a"` |
| 9 | POST empty name → 400 | `POST` `{ name:"" }` | 400 (Zod `min(1)` — Fastify schema validation) |
| 10 | POST name too long → 400 | `POST` `{ name: "x".repeat(101) }` | 400 (Zod `max(100)`) |
| 11 | POST name of only punctuation → 500 (empty slug) | `POST` `{ name:"!!!" }` | 500 (Mongoose `slug` required failure is re-thrown as generic error) |
| 12 | POST duplicate name (same tenant) → 409 | POST `{ name:"Other" }` when `"other"` slug exists | 409 |
| 13 | Same name in DIFFERENT tenant → 201 | user-2 POST `{ name:"Other" }` | 201 (slug uniqueness is per-owner) |
| 14 | Tenant isolation: GET another tenant's project → 404 | Switch tenant to user-2 via `x-test-owner`, GET user-1's projectId | 404 |
| 15 | DELETE another tenant's project → 404 + deleter not called | user-2 context, DELETE user-1's project | 404; `deleteProject` mock not called |

## Pitfalls & Challenges

1. **Case 10 (empty-slug → 500) is a real bug in current behavior.** `slug` is `required: true` in `ProjectSchema`. A name like `"!!!"` slugifies to `""`. `slug: ""` fails Mongoose's required validator → MongooseValidationError is thrown from `project.save()`, the catch only handles `E11000`, so it rethrows → Fastify returns **500**. **Assert 500 to pin current behavior** — if a future fix makes this a 400/409, the test will correctly alert you to re-read the handler.

2. **Case 4 vs case 12 (PATCH 409 vs POST 409):** both trigger E11000 on `{ownerId, slug}`. PATCH to `"Other"` slugifies to `"other"` → collides with the existing `"other"` project row for the same `ownerId` → E11000 → 409. The uniqueness is slug-based, not name-based.

3. **Case 13 requires a second tenant.** Use the `x-test-owner` header pattern so the same server can simulate user-2 without a separate Fastify app. Seeding must be inside the correct `tenantContext.run` per user.

4. **The mocked deleter + `projectRoutes` interplay:** every project DELETE calls `server.deleter.deleteProject`. For negative tests (6, 15), assert the mock was **not** called. Remember to `mockReset()` / `mockClear()` in a `beforeEach` where relevant.

5. **Case 14/15: tenant isolation = 404.** Because `findById` is tenant-filtered, another tenant's project is invisible → 404. Do not expect a 403 or a "forbidden" style code.

6. **Slugging regex** `/[^a-z0-9]+/g` strips non-ASCII. A name `"Café"` → `"caf"` (é removed). If you want a deterministic Unicode test, use `"Project A"` (→ `"project-a"`) for case 8 rather than relying on exotic chars.

7. **No `storagePlugin`/`deletionPlugin` needed** — use the mocked delerer. Keep the app minimal.

## Suggested File

`apps/api/tests/projects-errors.test.ts`
