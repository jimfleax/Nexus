# Test Plan: Deletion Plugin — `deleteList` and `deleteResource`

## Source Under Test

`apps/api/src/plugins/deletion.ts` — `IDeleter` implementation, specifically:

- `deleteList(listId, ownerId)` — lines 69–93
- `deleteResource(resourceId, ownerId)` — lines 100–119

## Why It Needs Tests

- Only `deleteProject` is covered (`deletion-plugin.test.ts`).
- `deleteList` (cascade removes resources + the list + Drive files) and `deleteResource` (removes one resource + Drive file, no-op when missing) are untested.
- Both use Mongoose **transactions** (require a replica set), which is itself a subtle testing setup.

## What the Handlers Do (verified)

```ts
deleteList(listId, ownerId):
  resources = ResourceModel.find({ listId }).select("driveFileId")   // tenant-filtered (no skipTenant here)
  driveFileIds = filter(Boolean)
  session = startSession(); session.startTransaction()
  try:
    ResourceModel.deleteMany({ listId }, { session })
    KnowledgeListModel.deleteOne({ _id: listId }, { session })
    if (driveFileIds.length) await server.storage.deleteFiles(ownerId, driveFileIds)
    commit
  catch: abort; throw
  finally: endSession

deleteResource(resourceId, ownerId):
  resource = ResourceModel.findById(resourceId); if (!resource) return   // NO-OP when missing
  session; startTransaction
  try:
    ResourceModel.deleteOne({ _id: resourceId }, { session })
    if (resource.driveFileId) await server.storage.deleteFiles(ownerId, [resource.driveFileId])
    commit
  catch: abort; throw
  finally: endSession
```

## Setup / Fixtures

**Use `MongoMemoryReplSet`** (must, for transactions) — exactly like the existing `deletion-plugin.test.ts`:

```ts
const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
await connectDB(mongoServer.getUri());

await ProjectModel.createCollection();
await ProjectModel.init();
await KnowledgeListModel.createCollection();
await KnowledgeListModel.init();
await ResourceModel.createCollection();
await ResourceModel.init();

const app = Fastify();
const fakeAdapter = new FakeStorageAdapter();
app.register(storagePlugin, { adapter: fakeAdapter });
app.register(deletionPlugin);
await app.ready();
```

Seed (inside `tenantContext.run({ ownerId: "test-user-1" })`):

```ts
// For deleteList:
//  project → list L1 (with 2 drive-file resources + 1 url resource)
//  project → list L2 (with 1 resource, to prove deleteList only touches L1)
// For deleteResource:
//  a drive-file resource, a url resource (no file), a resource in another tenant
```

Grab IDs after seeding so you know what to pass to the deleter.

## Test Cases

### deleteList

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 1 | Removes the list and its resources | list L1 with 3 resources (2 drive, 1 url) | After `deleteList(L1, "test-user-1")`: `countDocuments({ _id: L1 })` = 0; `countDocuments({ listId: L1 })` = 0 |
| 2 | Deletes Drive files for the drive-backed resources | same as #1, resources have driveFileId "file-1", "file-2" | `fakeAdapter.deletedFiles` contains both |
| 3 | Does NOT delete resources in OTHER lists | list L2 has 1 resource | L2 still has its resource after deleting L1 |
| 4 | Handles a list with no drive-file resources | all url/markdown, no driveFileId | list + resources removed; `deleteFiles` not called (driveFileIds empty) |
| 5 | Leaves the project intact | delete L1 | project still exists |

### deleteResource

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 6 | Deletes a single resource | drive-file resource | after `deleteResource(id, "test-user-1")` `countDocuments({ _id: id })` = 0 |
| 7 | Deletes its Drive file | resource with driveFileId "file-x" | `fakeAdapter.deletedFiles` has "file-x" |
| 8 | Non-file resource deletes without Drive call | url resource (no driveFileId) | `deletedFiles` unchanged |
| 9 | No-op when resource doesn't exist | call with random-oid | resolves (does not throw); no collections changed; no Drive delete |
| 10 | Tenant isolation: cannot delete another tenant's resource | user-2's resource id, called from user-1 context | resolves without error, BUT resource still exists |

## Pitfalls & Challenges

1. **`deleteResource` no-op (case 9)** — the handler `return`s early if `findById` returns null. `findById` is tenant-filtered. So a random-oid returns null → early return → resolves. Assert it resolves and nothing changes.

2. **Tenant isolation semantics (case 10)** — this is subtle: 
   - `findById` in `deleteResource` is tenant-filtered → user-1 calling on user-2's id → `resource` is null → **early return, no-op**. So the resource survives.
   - BUT `deleteList`'s `ResourceModel.find({ listId })` is also tenant-filtered → it only collects user-1's resources. And `deleteMany({ listId })` is tenant-scoped too. So a cross-tenant deleteList similarly only affects user-1's rows.
   - Assert the outside-tenant resource is untouched. Don't assert a 403/404 (there's no route here, you call the deleter directly) — just assert DB state is unchanged for the other tenant.

3. **The deleter methods read `ResourceModel` with the tenant plugin active.** You must invoke them **inside** the tenant context (`tenantContext.run({ ownerId: "test-user-1" }, async () => app.deleter.deleteList(...))`) — otherwise `findById`/`find`/`deleteMany` throw "Tenant context missing". The existing `deletion-plugin.test.ts` wraps the whole block in `tenantContext.run`. Copy that.

4. **Transactions require the replica set** — running on a standalone `MongoMemoryServer` throws a `Transaction numbers are only allowed on a replica set` error. Use `MongoMemoryReplSet` (as the existing test does).

5. **`server.storage.deleteFiles` side effect is inside the DB transaction** — not rolled back. If a later step in the transaction fails, the Drive files are already gone. This is a known design quirk; don't try to test "Drive not deleted on abort" (it won't be — it's already committed). Focus on the happy path + the no-drive-file cases.

6. **Seeding the $text/resource indexes**: `ResourceModel.init()` ensures indexes. Add it (and for all three models) in `beforeAll`, as the deletion test does.

7. **Asserting "no Drive call" (cases 4, 8)**: check `fakeAdapter.deletedFiles.size` is unchanged, or spy on `fakeAdapter.deleteFiles`. If you create a fresh `FakeStorageAdapter` per suite, `deletedFiles` is empty initially.

8. **The `deleteList` resources pre-fetch uses `.select("driveFileId")`** — the returned docs only have `driveFileId` (+ `_id`). Don't try to read `.title` off them in assertions. Only verify via `fakeAdapter.deletedFiles` + DB counts.

## Suggested File

`apps/api/tests/deletion-plugin-extended.test.ts` (or extend the existing `deletion-plugin.test.ts` with new `describe` blocks — extending is cleaner to share the ReplSet + seed setup).
