# Nexus — Test Implementation Plans

This directory contains detailed, implementation-ready test plans for functionality that currently lacks adequate coverage. Each file documents exactly what to test, the setup required, the exact assertions to write, and the challenges/pitfalls you must handle. These are **planning documents only** — no test code is written in this repo yet for the covered functionality; these docs exist so writing the actual `*.test.ts` files is mechanical.

> The web app (`apps/web`) has **no** test framework installed. Docs that cover web functionality (P4) each include a "Tooling prerequisite" section describing what package must be added before the tests can run. These are the only docs that require dependency changes.

## Existing Test Coverage (baseline)

16 test files in `apps/api/tests/`, all Vitest + `mongodb-memory-server`:

| File | Covers |
|------|--------|
| `health.test.ts` | `/health` public, `/api/protected` 401 without token |
| `auth.test.ts` | `verifyToken` valid/invalid JWT (unit) |
| `auth-routes.test.ts` | OAuth initiate redirects, state mismatch, Google/GitHub callback happy paths |
| `db.test.ts` | Tenant plugin: save, fail-closed, query isolation |
| `info.test.ts` | `/api/info` 400 (missing params), 404 (nonexistent project) |
| `lists.test.ts` | List create/list/patch/delete happy paths (mocked deleter) |
| `models.test.ts` | Mongoose required-field and enum validation |
| `projects.test.ts` | Project CRUD happy paths + duplicate 409 |
| `projects-list-count.test.ts` | listCount aggregation |
| `resources.test.ts` | Resource GET/PATCH/DELETE happy paths (mocked deleter) |
| `resources-upload.test.ts` | Multipart file upload to fake storage |
| `search.test.ts` | Search, suggestions, favorites, recent basic paths |
| `user-endpoints.test.ts` | User favorites/recent isolation |
| `user-metrics.test.ts` | Metrics aggregation, drive quota variants, tenant isolation |
| `storage-plugin.test.ts` | Storage plugin wiring + missing-credentials throw |
| `deletion-plugin.test.ts` | deleteProject cascade (ReplSet) |

## Test Plan Documents

### P1 — Critical business logic (untested core)

| Doc | Functionality | Why critical |
|-----|---------------|--------------|
| [`gc.md`](./gc.md) | Garbage collection sweep | Deletes user data + Drive files; zero coverage |
| [`auth-plugin.md`](./auth-plugin.md) | Authentication plugin edge cases | Security-critical token paths untested |
| [`resources-create-json.md`](./resources-create-json.md) | Resource JSON create (non-multipart) | Main create path untested |
| [`resources-toggle-open.md`](./resources-toggle-open.md) | Favorite toggle + open marking | Core interaction, untested |
| [`user-settings.md`](./user-settings.md) | User settings GET/PATCH | User provisioning (auto-create) untested |
| [`info-route.md`](./info-route.md) | Info metadata route success paths | Only error branches tested |

### P2 — Important route gaps

| Doc | Functionality |
|-----|---------------|
| [`lists-errors.md`](./lists-errors.md) | List route error paths + single GET |
| [`lists-reorder.md`](./lists-reorder.md) | List bulk reorder route |
| [`projects-errors.md`](./projects-errors.md) | Project route error paths |
| [`resources-extra.md`](./resources-extra.md) | Resource listing, content, PATCH errors, file streaming |
| [`search-filters.md`](./search-filters.md) | Search projectId filters, empty-q, scoring |

### P3 — Infrastructure / cross-cutting

| Doc | Functionality |
|-----|---------------|
| [`tenant-plugin.md`](./tenant-plugin.md) | Tenant isolation plugin untested branches |
| [`deletion-plugin.md`](./deletion-plugin.md) | deleteList + deleteResource cascade |
| [`auth-routes-failures.md`](./auth-routes-failures.md) | OAuth failure paths |
| [`shared-schemas.md`](./shared-schemas.md) | Shared Zod schema validation |

### P4 — Web app (no framework installed)

| Doc | Functionality |
|-----|---------------|
| [`web-route-handlers.md`](./web-route-handlers.md) | `sync` / `signout` route handlers |
| [`web-utils.md`](./web-utils.md) | `formatBytes`, `formatDate`, `formatFilenameToTitle` |
| [`web-axios.md`](./web-axios.md) | Axios interceptor error handling |
| [`web-hooks.md`](./web-hooks.md) | TanStack Query hook cache semantics |
| [`web-dashboard-layout.md`](./web-dashboard-layout.md) | Dashboard auth gate |

## Common Setup Patterns (all API tests)

Every API test in this repo follows this structure:

```ts
// 1. Spin up in-memory Mongo
const mongoServer = await MongoMemoryServer.create(); // or MongoMemoryReplSet for transactions
await connectDB(mongoServer.getUri());

// 2. Build a standalone Fastify app with Zod compilers
const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// 3. Decorate ownerId + seed tenant context per request (bypasses real auth)
app.decorateRequest("ownerId", null);
app.addHook("onRequest", (request: any, reply: any, done: any) => {
  request.ownerId = "test-user-1";
  tenantContext.run({ ownerId: "test-user-1" }, () => done());
});

// 4. Register the plugins + routes under test
app.register(storagePlugin, { adapter: new FakeStorageAdapter() });
app.register(deletionPlugin);
app.register(resourceRoutes);
await app.ready();

// 5. Seed data INSIDE tenantContext.run(...) (the isolation plugin fail-closes otherwise)

// 6. Use app.inject() for requests, assert on response
```

If the test is testing the `authPlugin` itself, register it instead of the bypass hook (see `auth-plugin.md`).

## Common Challenges You Will Hit

1. **Tenant isolation fail-closes** — any query/save outside `tenantContext.run(...)` throws. Wrap all seeding and all direct model assertions in `tenantContext.run(...)`, or use `.setOptions({ skipTenant: true })` for deliberate cross-tenant reads.

2. **Resource IDs are strings, not ObjectIds** — `ProjectModel` `_id` is an ObjectId but lists/resources store `projectId`/`listId` as strings. When seeding, either pass explicit ObjectId-derived strings (e.g. `new mongoose.Types.ObjectId().toHexString()`) and use them consistently, or let `create()` generate them and read back `doc._id.toString()`.

3. **Aggregation requires the tenant plugin** — `aggregate()` prepends `{ $match: { ownerId } }`. Without context it fails. Note that the aggregation matches on the raw pipeline, so a manual `ownerId` filter is sometimes added as belt-and-suspenders (see `search.ts`).

4. **`mongodb-memory-server` startup is slow** — pass `60000` as the timeout argument to `beforeAll`/`afterAll` for DB-backed suites (the existing tests all do this).

5. **`$text` search needs the text index** — the `resource_text_index` must exist for `$text: { $search }` queries to work. Existing `search.test.ts` calls `await ResourceModel.init()` in `beforeAll`. Do the same.

6. **Multipart tests need `@fastify/multipart` + `form-data`** — register the plugin and use `FormData` from the `form-data` package (not the browser `FormData`) with `form.getHeaders()` + `form.getBuffer()`.

7. **Drive streaming requires mocking `fetch` + `googleapis`** — the file-streaming and GC tests both touch real Google APIs. Mock `global.fetch` for the streaming path and mock the `google`/`googleapis` objects for GC.

## Document Format

Each test-plan doc uses this consistent structure:

- **Source under test** — exact files + line references
- **Why it needs tests**
- **Setup / fixtures** — how to spin up the app + seed data
- **Test cases** — table of exact behaviors to assert, with request/response expectations
- **Pitfalls & challenges** — the specific hurdles you'll hit writing this test, pre-solved
- **Suggested file name** — where the `*.test.ts` should live

See each individual doc for the full detail.
