# Test Plan: List Route Error Paths + Single GET

## Source Under Test

`apps/api/src/routes/lists.ts`:

- `GET /api/lists/:id` (single fetch) — lines 54–72 (untested entirely)
- `POST /api/projects/:projectId/lists` — error branches, lines 92–128 (only happy path tested)
- `PATCH /api/lists/:id` — error branches, lines 137–182 (only happy path tested)
- `DELETE /api/lists/:id` — error branch, lines 189–213 (only happy path tested)

## What the Handlers Do (verified)

```ts
GET /api/lists/:id:
  list = KnowledgeListModel.findById(id); if (!list) → 404 "List not found"

POST /api/projects/:projectId/lists:           // body schema omits projectId (from URL)
  project = ProjectModel.findById(projectId); if (!project) → 404 "Project not found"   // ← untested
  slug = slugify(name)
  position = (highest existing position for project in tenant) + 1, or 0
  save → on E11000 (unique {ownerId, projectId, slug}) → 409 "List with this name already exists in the project"  // ← untested

PATCH /api/lists/:id:
  if (body.name) updates.slug = slugify(name)
  findByIdAndUpdate({ new: true, runValidators: true })
  if (!list) → 404 "List not found"            // ← untested
  on E11000 → 409 "List with this name already exists in the project"  // ← untested

DELETE /api/lists/:id:
  list = findById(id); if (!list) → 404 "List not found"    // ← untested; then server.deleter.deleteList(listId, ownerId)
```

## Setup / Fixtures

Use the same "mocked deleter" pattern as the existing `lists.test.ts` (it decorates a fake `server.deleter` instead of registering `deletionPlugin`) — but note that DELETE needs `server.deleter` decorated OR the real `deletionPlugin`+`storagePlugin`+ReplSet combo. For the 404 branch, the fake deleter lets you assert that `deleteList` is NOT called for a missing list.

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

const deleteList = vi.fn().mockResolvedValue(undefined);
app.decorate("deleter", { deleteList, deleteProject: vi.fn(), deleteResource: vi.fn() });

app.register(listRoutes);
await app.ready();
```

Seed (inside `tenantContext.run`): a project and 2–3 lists with known positions:

```ts
let projectId: string, listAId: string, listBId: string;
await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-1" }, async () => {
    const p = await ProjectModel.create({ name: "Proj", slug: "proj" });
    projectId = p._id.toString();
    const a = await KnowledgeListModel.create({ projectId, name: "A", slug: "a", position: 0 });
    const b = await KnowledgeListModel.create({ projectId, name: "B", slug: "b", position: 1 });
    listAId = a._id.toString(); listBId = b._id.toString();
    resolve();
  }),
);
```

## Test Cases

| # | Test | Request | Expected |
|---|------|---------|----------|
| 1 | GET single list by id | `GET /api/lists/<listAId>` | 200, `{ id, name:"A", slug:"a", position:0 }` |
| 2 | GET single list nonexistent → 404 | `GET /api/lists/<random-oid>` | 404 `"List not found"` |
| 3 | POST to nonexistent project → 404 | `POST /api/projects/<random-oid>/lists` body `{ name:"X" }` | 404 `"Project not found"` |
| 4 | POST duplicate name (same project) → 409 | `POST .../lists` name `"B"` (listB already exists, slug `"b"`) | 409 `"List with this name already exists in the project"` |
| 5 | POST same name in a DIFFERENT project → 201 | Create a second project, POST name `"B"` there | 201 |
| 6 | POST position appends to end | After A(pos0), B(pos1), POST `"C"` | 201, `position: 2` |
| 7 | POST position 0 when project has no lists | Fresh project, POST `"Solo"` | 201, `position: 0` |
| 8 | PATCH nonexistent id → 404 | `PATCH /api/lists/<random-oid>` body `{ name:"Z" }` | 404 `"List not found"` |
| 9 | PATCH rename causes slug regen | `PATCH /api/lists/<listAId>` body `{ name:"A Renamed" }` | 200, `name:"A Renamed"`, `slug:"a-renamed"` |
| 10 | PATCH rename collides with existing slug → 409 | Rename A to `"B"` (B exists, slug `"b"`) | 409 |
| 11 | PATCH with description only (no name) keeps slug | `PATCH` body `{ description:"hi" }` | 200, slug unchanged |
| 12 | DELETE nonexistent id → 404 and deleter NOT called | `DELETE /api/lists/<random-oid>` | 404; `deleteList` mock not called |
| 13 | DELETE happy path calls deleter | `DELETE /api/lists/<listAId>` | 204; `deleteList` called with `(listAId, "test-user-1")` |
| 14 | Tenant isolation: another tenant's list → 404 | Switch tenant to user-2 via `x-test-owner`, GET user-1's listAId | 404 |
| 15 | GET lists for a project sorts by position | `GET /api/projects/<projectId>/lists` | 200, arrays where positions ascending |

## Pitfalls & Challenges

1. **`projectId` as string vs ObjectId mismatch.** `findById` on the ProjectModel uses the URL param `projectId` (a string). Mongoose `findById` coerces a 24-hex string to ObjectId, so it works — BUT the list's `projectId` field is a **string** (e.g. `project._id.toString()`). For the `find()` of lists by `{ projectId }`, you MUST seed the list's `projectId` as the string form. Mixing types silently returns nothing.

2. **Case 4 (409) depends on the `{ownerId, projectId, slug}` unique index.** It must exist. `KnowledgeListModel.init()` in `beforeAll` (after connect) creates it. Add `await KnowledgeListModel.init()` to be safe.

3. **Slug collision is what causes the 409** — not name equality. Renaming A to "B" slugifies to `"b"`, colliding with B's slug → E11000 → 409. Name `"B"` itself is not unique-checked; only slug. So case 10 must rename to something that slugifies identically (`"B"`, `"b"`, `" b "` all → `"b"`).

4. **The mocked `deleter` must be decorated BEFORE `app.ready()`** and before registering route plugins that read `server.deleter`. The `DELETE` handler calls `server.deleter.deleteList` — if you forget to decorate, you get `TypeError: server.deleter is undefined`.

5. **Case 13: assert the deleter was called with `(listAId, "test-user-1")`.** The second arg is `request.ownerId` which your hook sets to `"test-user-1"`. Good way to confirm the ownerId wiring.

6. **Case 14 tenant isolation for lists** surfaces as **404**, not empty array — because `findById` is tenant-filtered. For `GET /api/lists/:id` of another tenant's list → 404.

7. **Case 6 position append**: the handler computes `position = lastList.position + 1` where `lastList = findOne({ projectId }).sort({ position: -1 })`. Seeding explicit positions (0,1) makes the append deterministic (→ 2).

8. **Do NOT re-register `deletionPlugin` alongside the mocked `deleter`** — `deletionPlugin` celebrates `server.deleter` and would throw "already decorated". Pick one approach per suite.

## Suggested File

`apps/api/tests/lists-errors.test.ts`
