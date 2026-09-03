# Test Plan: List Reorder Route (`PUT /api/projects/:projectId/lists/reorder`)

## Source Under Test

`apps/api/src/routes/lists.ts` — lines 220–250.

## Why It Needs Tests

- The bulk reorder endpoint is completely untested.
- It's the only route using `bulkWrite`, and its behavior with empty/partial/foreign-item payloads is subtle and uncovered.
- It has no failure reporting for unmatched IDs (always returns `{ success: true }` even when some IDs don't match) — this "silent partial success" is exactly what a regression test should pin down.

## What the Handler Does (verified)

```ts
PUT /api/projects/:projectId/lists/reorder:
  body: { items: [{ id: string, position: number }] }    // ReorderKnowledgeListSchema
  bulkOps = items.map(item => ({
    updateOne: {
      filter: { _id: item.id, projectId, ownerId },       // tenant-safe filter
      update: { $set: { position: item.position } },
    },
  }))
  if (bulkOps.length > 0) { await KnowledgeListModel.bulkWrite(bulkOps) }
  return { success: true }
```

Key behaviors:
- Each update is filtered by `{ _id, projectId, ownerId }` → cross-tenant or cross-project IDs are silently ignored (no error).
- Empty `items` → no bulkWrite call, still returns `{ success: true }`.
- Positions are set **exactly** to the given numbers — there is no renumbering/compaction of gaps.
- No failure reporting: bogus IDs produce no error.

## Setup / Fixtures

```ts
const mongoServer = await MongoMemoryServer.create();
await connectDB(mongoServer.getUri());

const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.decorateRequest("ownerId", null);
app.addHook("onRequest", (request: any, reply: any, done: any) => {
  const ownerId = request.headers["x-test-owner"] || "test-user-1";
  request.ownerId = ownerId;
  tenantContext.run({ ownerId }, () => done());
});
app.register(listRoutes);
await app.ready();
```

Seed a project with 3 lists (positions 0,1,2) for user-1, plus a list in a different project and a list for user-2 (for the isolation tests).

```ts
let projectId: string;
let listIds: string[];      // [a, b, c] positions [0,1,2]
let otherProjectListId: string;
let otherTenantListId: string;

await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-1" }, async () => {
    const p = await ProjectModel.create({ name: "P", slug: "p" });
    projectId = p._id.toString();
    const a = await KnowledgeListModel.create({ projectId, name: "A", slug: "a", position: 0 });
    const b = await KnowledgeListModel.create({ projectId, name: "B", slug: "b", position: 1 });
    const c = await KnowledgeListModel.create({ projectId, name: "C", slug: "c", position: 2 });
    listIds = [a._id.toString(), b._id.toString(), c._id.toString()];
    const other = await ProjectModel.create({ name: "P2", slug: "p2" });
    const ol = await KnowledgeListModel.create({ projectId: other._id.toString(), name: "OL", slug: "ol", position: 0 });
    otherProjectListId = ol._id.toString();
    resolve();
  }),
);
// user-2's list
await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-2" }, async () => {
    const p3 = await ProjectModel.create({ name: "P3", slug: "p3" });
    const l = await KnowledgeListModel.create({ projectId: p3._id.toString(), name: "UL", slug: "ul", position: 0 });
    otherTenantListId = l._id.toString();
    resolve();
  }),
);
```

## Test Cases

| # | Test | Payload | Expected |
|---|------|---------|----------|
| 1 | Full reorder changes positions | `{ items: [{id:a,pos:2},{id:b,pos:0},{id:c,pos:1}] }` | 200 `{ success:true }`; DB: a→2, b→0, c→1 |
| 2 | Partial reorder (only some lists) | `{ items: [{id:a,pos:5}] }` | 200; a→5, b and c unchanged |
| 3 | Empty items array → no-op | `{ items: [] }` | 200 `{ success:true }`; no positions changed |
| 4 | Bogus/nonexistent item id → no error, no change | `{ items: [{id:"<random-oid>",pos:1}] }` | 200 `{ success:true }`; nothing changed |
| 5 | Cross-project id is ignored | `{ items: [{id:otherProjectListId,pos:9}] }` against user-1's project | 200; other-project list position unchanged (bulkWrite filter excludes it) |
| 6 | Cross-tenant id is ignored | Send `otherTenantListId` in items (user-1 context) | 200; other-tenant list position unchanged |
| 7 | Negative/float position accepted | `{ items: [{id:a,pos:-3.5}] }` | 200; a position = -3.5 (schema allows it — document the behavior) |
| 8 | Tenant isolation via full flow | user-2 reorders their own list | returns success; only user-2's list affected |
| 9 | Reorder respects exact given positions (no renumbering) | `{ items: [{id:b,pos:99}] }` | 200; b→99 (no compaction to lower number) |

## Pitfalls & Challenges

1. **`bulkWrite` on `KnowledgeListModel` is tenant-filtered? No.** The pre-hook on `bulkWrite` is NOT in the `queryMethods` list in `db.ts` (which lists `countDocuments, deleteMany, deleteOne, find, findOne, findOneAndDelete, findOneAndReplace, findOneAndUpdate, replaceOne, updateMany, updateOne`). So `bulkWrite` bypasses the tenant pre-hook. **That's exactly why the handler adds an explicit `ownerId` filter into each update** (`filter: { _id, projectId, ownerId }`). Your test should verify that the explicit filter is what provides isolation (cases 5, 6) — the plugin alone won't save you here.

2. **Because of #1, commit the isolation via the explicit filter.** For case 6, ensure `ownerId` in the filter blocks the other-tenant ID from being updated. For case 5, the `projectId` in the filter blocks the other-project list.

3. **Read back positions with `skipTenant: true` or inside `tenantContext.run`.** Since `bulkWrite` bypasses the tenant pre-hook, reading back via `find` (which IS tenant-filtered) inside user-1's context works for user-1's lists. But for asserting the other-tenant list is unchanged (case 6), wrap the readback in `tenantContext.run({ ownerId: "test-user-2" })` — or use `findOne(..., { skipTenant: true })`.

4. **Schema is permissive (case 7):** `ReorderKnowledgeListSchema.items[].position` is `z.number()` with no `.int()`/`.nonnegative()`. So `-3.5` passes Zod. Document this as intentional/current behavior — do not "fix" it, just pin it.

5. **Case 1 expects exact ordering change.** Because positions are set literally, the arrays a→2,b→0,c→1 change the sort order. After the reorder, `GET /api/projects/:projectId/lists` (sorted by position asc) should return `[b, c, a]`. You could assert either directly on DB positions or via the GET route.

6. **`PUT` vs the route method.** Note the handler is registered with `server.put`. Use `method: "PUT"` in `app.inject`.

7. **No `storagePlugin` / `deletionPlugin` needed** — reorder only touches `listRoutes` and models. Keep the app minimal.

## Suggested File

`apps/api/tests/lists-reorder.test.ts`
