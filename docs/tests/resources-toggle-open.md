# Test Plan: Resource Favorite Toggle + Open Marking

## Source Under Test

`apps/api/src/routes/resources.ts`:

- `PUT /api/resources/:id/favorite` — lines 323–346
- `POST /api/resources/:id/open` — lines 353–374

Both are thin `findByIdAndUpdate` calls but they power the favorites star and the "Recent" feed, respectively. Neither is currently tested.

## What the Handlers Do (verified)

```ts
PUT /api/resources/:id/favorite:
  body: { isFavorite: boolean }            // Zod-validated, required
  resource = ResourceModel.findByIdAndUpdate(id, { $set: { isFavorite } }, { new: true })
  if (!resource) → 404 "Resource not found"
  else → 200 resource

POST /api/resources/:id/open:
  resource = ResourceModel.findByIdAndUpdate(id, { $set: { lastOpenedAt: new Date() } }, { new: true })
  if (!resource) → 404 "Resource not found"
  else → 200 resource
```

**Notable**: both use `findByIdAndUpdate` without an explicit `ownerId` filter — but the **tenant plugin** auto-injects `ownerId` into the query (the pre-hook on `findOneAndUpdate`). So they ARE tenant-scoped implicitly, and you must NOT re-add it (test the actual behavior).

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
app.register(resourceRoutes);
await app.ready();
```

Seed two resources (one for user-1, one for user-2 so we can test isolation). Wrap in `tenantContext.run`:

```ts
let r1Id: string;   // user-1
let r2Id: string;   // user-2

await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-1" }, async () => {
    const r1 = await ResourceModel.create({ projectId: "p1", listId: "l1", title: "A", type: "note", isFavorite: false });
    r1Id = r1._id.toString();
    resolve();
  }),
);
await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-2" }, async () => {
    const r2 = await ResourceModel.create({ projectId: "p1", listId: "l1", title: "B", type: "note", isFavorite: false });
    r2Id = r2._id.toString();
    resolve();
  }),
);
```

## Test Cases

| # | Test | Request | Expected |
|---|------|---------|----------|
| 1 | Toggle favorite `false → true` | `PUT /api/resources/:id/favorite` body `{ isFavorite: true }` | 200, body `isFavorite: true`; DB doc updated |
| 2 | Toggle favorite `true → false` | Seed favorite, send `{ isFavorite: false }` | 200, `isFavorite: false`; DB updated |
| 3 | Repeated same value is idempotent | Send `{ isFavorite: true }` twice | Both 200, stays `true` |
| 4 | Nonexistent resource → 404 | `PUT /api/resources/<random-oid>/favorite` | 404 `"Resource not found"` |
| 5 | Missing `isFavorite` in body → 400 | Payload `{}` | 400 (Zod requires the boolean body field) |
| 6 | Non-boolean `isFavorite` → 400 | `{ isFavorite: "yes" }` | 400 (Zod type mismatch) |
| 7 | Tenant isolation: user-1 can't favorite user-2's resource | Request user-2's `r2Id` with user-1 tenant, body `{ isFavorite: true }` | 404 (tenant plugin filters out the `_id` query → `findByIdAndUpdate` finds nothing) |
| 8 | Open sets `lastOpenedAt` to a recent Date | `POST /api/resources/:id/open` | 200, body has `lastOpenedAt` defined and within last minute |
| 9 | Open on nonexistent resource → 404 | `POST /api/resources/<random-oid>/open` | 404 |
| 10 | Open sets `lastOpenedAt` in DB | After open, `findById` (with tenant) returns `lastOpenedAt` is a Date | truthy Date |
| 11 | A resource surfaced by `/api/user/recent` after being opened | Open `r1`, then `GET /api/user/recent` (or seed and check order) | returned, sorted first by `lastOpenedAt` desc |

## Pitfalls & Challenges

1. **Tenant plugin is what makes favorite/open tenant-safe** — the plugin adds `ownerId` to the `findOneAndUpdate` query. So case 7 returns **404**, not 403 or a data leak. Assert `404` and you're validating the isolation mechanism.

2. **The `isFavorite` body field is REQUIRED** by the route schema (`body: z.object({ isFavorite: z.boolean() })`). Sending an absent or invalid field triggers Fastify's schema validation → 400 (NOT the handler's own 404). This is why cases 5–6 are 400.

3. **Case 8 timing**: `lastOpenedAt` uses `new Date()` server-side. Assert `new Date(data.lastOpenedAt).getTime()` is within a few seconds of `Date.now()` — don't assert an exact value (millisecond jitter).

4. **Because `findByIdAndUpdate` returns the updated doc with `{ new: true }`**, the 200 response body reflects the post-update state — assert the updated fields on the response, not by re-querrying, for the toggle cases (fewer async hops).

5. **Case 11 open → recent**: you can either assert via `/api/user/recent` route (feed route) or just assert DB state. If you include the route-level assertion, remember `/api/user/recent` is in `userRoutes` — you'd need to register that plugin too, OR assert only at the DB level to keep this suite self-contained. Keep it DB-level for simplicity.

6. **Seed `isFavorite` explicitly false** so toggles are deterministic. The schema default is `false`, but be explicit.

## Suggested File

`apps/api/tests/resources-toggle-open.test.ts`
