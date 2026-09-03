# Test Plan: Search Filters + Validation Edge Cases

## Source Under Test

`apps/api/src/routes/search.ts` — all four routes:

- `GET /api/search` — lines 22–58
- `GET /api/search/suggestions` — lines 65–102
- `GET /api/favorites` — lines 110–137
- `GET /api/recent` — lines 144–172

## Why It Needs Tests

- The existing `search.test.ts` covers basic single-match behavior for each route (no filtering, no empty-query, no scoring).
- The **optional `?projectId=` filter** on every route is untested.
- The `q`-validation (min length 1) → 400 is untested.
- Search **scoring/ordering** by `textScore` is untested.

## What the Handlers Do (verified)

```ts
GET /api/search?q=<min 1>&projectId?:
  filter = { ownerId, $text: { $search: q } } (+ projectId if provided)
  find(filter, { score: { $meta: "textScore" } }).select("-content").sort({ score: { $meta: "textScore" } }).limit(50)

GET /api/search/suggestions?q=<min 1>&projectId?:
  filter = { ownerId, title: { $regex: q, $options: "i" } } (+ projectId)
  find(filter).select("title type").limit(10)

GET /api/favorites?projectId?:
  filter = { ownerId, isFavorite: true } (+ projectId)
  find(filter).select("-content").sort({ updatedAt: -1 })

GET /api/recent?projectId?:
  filter = { ownerId, lastOpenedAt: { $exists: true } } (+ projectId)
  find(filter).select("-content").sort({ lastOpenedAt: -1 }).limit(20)
```

## Setup / Fixtures

```ts
const mongoServer = await MongoMemoryServer.create();
await connectDB(mongoServer.getUri());

const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.addHook("onRequest", (request: any, reply: any, done: any) => {
  const ownerId = request.headers["x-test-owner"] || "user-1";
  request.ownerId = ownerId;
  tenantContext.run({ ownerId }, () => done());
});
app.register(searchRoutes);
await ResourceModel.init();       // REQUIRED — creates the $text index
await app.ready();
```

Seed a rich dataset inside `tenantContext.run({ ownerId: "user-1" })`:

- **P1** (project "p1"): a resource titled `"Solar Energy Basics"` (type pdf, isFavorite true, lastOpenedAt 3 days ago), and `"Solar Panels Guide"` (type markdown, isFavorite false, lastOpenedAt 1 hour ago)
- **P2** (project "p2"): a resource titled `"Quantum Computing Primer"` (type note, isFavorite true, lastOpenedAt 5 min ago)
- **User-2**: a resource titled `"Solar for Beginners"` (type pdf; for isolation)

## Test Cases

### Search (`/api/search`)

| # | Test | Request | Expected |
|---|------|---------|----------|
| 1 | Basic text search returns only current tenant's matches | `?q=solar` (user-1) | 200, only user-1's solar results (not user-2's) |
| 2 | `projectId` filter restricts results | `?q=solar&projectId=p1` | 200, only p1 results |
| 3 | `projectId` filter with no matches | `?q=quantum&projectId=p1` | 200, `[]` (Quantum is in p2) |
| 4 | Empty/missing `q` → 400 | `?q=` or no `q` | 400 |
| 5 | Search sorted by relevance (textScore) | Seed `"Solar Energy Basics"` (title contains "solar") vs a resource with "solar" only in content/tags | Expect title-strong match first (weight title:10) |
| 6 | `content` field omitted from responses | `?q=solar` | entries lack `content` key |
| 7 | Limit of 50 | Seed 60 matching resources | 200, length 50 |

### Suggestions (`/api/search/suggestions`)

| # | Test | Request | Expected |
|---|------|---------|----------|
| 8 | Regex substring (case-insensitive) | `?q=sola` | 200, titles containing "sola" (both solar ones) |
| 9 | Case-insensitive match | `?q=SOLAR` | 200, same results |
| 10 | `projectId` filter | `?q=solar&projectId=p1` | 200, only p1 |
| 11 | Empty q → 400 | `?q=` | 400 |
| 12 | No matches → 200 empty array | `?q=zzzz` | 200, `[]` |
| 13 | Only returns `id`/`title`/`type` fields | `?q=solar` | entries have exactly `{ id, title, type }` |

### Favorites (`/api/favorites`)

| # | Test | Request | Expected |
|---|------|---------|----------|
| 14 | Only favorites, newest updated first | no params | 200, only `isFavorite: true` resources, `updatedAt` desc |
| 15 | `projectId` filter | `?projectId=p2` | 200, only p2 favorites |
| 16 | Tenant isolation | `x-test-owner: user-2` | 200, only user-2's favorite |
| 17 | No content in response | no params | entries lack `content` |

### Recent (`/api/recent`)

| # | Test | Request | Expected |
|---|------|---------|----------|
| 18 | Only resources with `lastOpenedAt` | no params | 200, all have `lastOpenedAt` set |
| 19 | Sorted by `lastOpenedAt` desc | no params | most-recent-first (p2's Quantum first if opened most recently) |
| 20 | `projectId` filter | `?projectId=p1` | 200, only p1 |
| 21 | Limit 20 | Seed 25 opened resources | 200, length 20 |
| 22 | Tenant isolation | `x-test-owner: user-2` | 200, only user-2's opened |

## Pitfalls & Challenges

1. **`await ResourceModel.init()` is mandatory** for `$text` search. The `resource_text_index` must exist. The existing `search.test.ts` does this in `beforeAll` — copy it. Without it, `$text: { $search }` throws a `text index required` error.

2. **The `q` min-length 400 is Fastify-schema level**, not handler. `querystring: z.object({ q: z.string().min(1), ... })`. So `?q=` sends an empty string → Zod `min(1)` fails → Fastify 400. Assert status code only (body is Fastify's default shape).

3. **Scoring (case 5) is `textScore` based on index weights**: title:10, tags:5, description:2, content:1. To assert order, make one resource match strongly in the **title** and another only weakly in **content/tags**. Then assert the title match comes first. Note: Mongo `$text` requires the match to be a *term*; partial "sola" won't match `$text` (only suggestions use regex). Use full words.

4. **`textScore` requires `.sort({ score: { $meta: "textScore" } })`** which is already in the handler. You don't add it — you just assert the returned order.

5. **Suggestion fields (case 13):** the `.select("title type")` returns `_id` (converted to `id` by toJSON transform) plus `title` + `type`. Assert exactly `{ id, title, type }` keys — no `createdAt`, etc.

6. **Tenant isolation via `x-test-owner`:** your `onRequest` hook sets both `request.ownerId` AND runs `tenantContext.run`. The search route ALSO adds an explicit `ownerId` filter (`filter = { ownerId, ... }`) — double protection. Test as user-2 for isolation.

7. **`/api/recent` requires `lastOpenedAt` to be set** (`{ $exists: true }`). Resources without it are excluded. When seeding, set `lastOpenedAt` explicitly as a `Date` for the ones you want surfaced.

8. **No storage/deletion plugins needed** — search only touches `ResourceModel` + shared schemas. Keep the app minimal.

## Suggested File

`apps/api/tests/search-filters.test.ts`
