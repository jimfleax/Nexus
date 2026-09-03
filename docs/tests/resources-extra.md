# Test Plan: Resource Extra Routes (listing, content, PATCH errors, file streaming)

## Source Under Test

`apps/api/src/routes/resources.ts`:

- `GET /api/projects/:projectId/resources` (list w/ optional `listId` filter) — lines 31–55
- `GET /api/v1/resources/:id/content` (raw content) — lines 204–227
- `PATCH /api/resources/:id` error branches — lines 381–438
- `GET /api/resources/:id/file` (Drive streaming) — lines 233–316
- `DELETE /api/resources/:id` 404 — lines 445–468

## Why It Needs Tests

- The list-by-project and content endpoints are completely untested.
- PATCH has two untested error branches: list-not-found → 404, and title-uniqueness-on-rename → 400.
- The Drive file-streaming path (Range headers, error passthrough, "not configured") is entirely untested and is the most complex route in the file.

## What the Handlers Do (verified)

```ts
GET /api/projects/:projectId/resources?listId=:
  filter = { projectId } (+ listId if provided)
  find(filter).select("-content").sort({createdAt: -1})   // tenant-filtered by plugin

GET /api/v1/resources/:id/content:
  resource = findById(id).select("content type"); if (!resource) → 404
  reply.header("Content-Type","text/plain; charset=utf-8"); reply.send(resource.content || "")

PATCH /api/resources/:id:
  resource = findById(id); if (!resource) → 404
  if (body.listId):
     list = KnowledgeListModel.findById(body.listId); if (!list) → 404 "Knowledge List not found"
     body.projectId = list.projectId                        // move follows the list's project
  if (body.title && body.title !== resource.title):
     existing = findOne({ projectId: targetProjectId, title: body.title, ownerId, _id: { $ne: id } })
     if (existing) → 400 "A resource with this name already exists in the project"
  findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true })

GET /api/resources/:id/file:
  resource = findById(id); if (!resource || !resource.driveFileId) → 404 "Resource or file not found"
  user = UserModel.findOne({ ownerId }); if (!user || !user.driveRefreshToken) → 400 "Google Drive not configured"
  oauth = new google.auth.OAuth2(AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET); setCredentials({refresh_token})
  accessToken = await oauth.getAccessToken()
  headers = { Authorization: Bearer <token> } (+ Range if request.headers.range)
  driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, { headers })
  if (!driveRes.ok) → reply.status(driveRes.status).send({ error: "Failed to fetch file from Drive" })
  reply.status(driveRes.status)
  copy safe headers: content-type, content-disposition, content-range, accept-ranges
  reply.header("Accept-Ranges","bytes")
  if (!content-disposition) Content-Disposition: inline; filename="<title>"
  reply.send(Readable.fromWeb(driveRes.body))
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
  const ownerId = request.headers["x-test-owner"] || "test-user-1";
  request.ownerId = ownerId;
  tenantContext.run({ ownerId }, () => done());
});
app.register(resourceRoutes);

const deleteResource = vi.fn().mockResolvedValue(undefined);
app.decorate("deleter", { deleteResource, deleteList: vi.fn(), deleteProject: vi.fn() });

await app.ready();
```

Note: **the file-streaming tests** need `UserModel` and cannot use a mocked deleter concept — they use real models + mocked `fetch`/`googleapis`. For the non-streaming tests (list, content, PATCH, DELETE), keep the fake deleter.

Seed (inside `tenantContext.run`), for user-1:

```ts
let projectId: string, listAId: string, listBId: string;
let resourceAId: string;   // pdf with driveFileId + content
let resourceBId: string;   // markdown with content, no driveFileId

// project + 2 lists
// resourceA: { type:"pdf", driveFileId:"file-1", content:"opaque", mimeType:"application/pdf", size:100 }
// resourceB: { type:"markdown", content:"# hello", no driveFileId }
```

Also seed a `UserModel` for user-1 with `driveRefreshToken` where the streaming test needs it.

## Test Cases

### List + Content

| # | Test | Request | Expected |
|---|------|---------|----------|
| 1 | List resources in a project | `GET /api/projects/<projectId>/resources` | 200, array with both resources; each entry has **no** `content` field |
| 2 | Filter by listId | `?listId=<listAId>` | 200, only resources in listA |
| 3 | Empty project (no resources) | `GET /api/projects/<empty-project>/resources` | 200, `[]` |
| 4 | Content endpoint returns raw text | `GET /api/v1/resources/<resourceBId>/content` | 200, body `"# hello"`, `Content-Type: text/plain; charset=utf-8` |
| 5 | Content endpoint returns empty string when content absent | `GET /api/v1/resources/<resourceAId>/content` (content = the pdf with content omitted?) | 200, `""` (if no content) |
| 6 | Content endpoint 404 | `GET /api/v1/resources/<random-oid>/content` | 404 `"Resource not found"` |
| 7 | List by project respects tenant isolation | Switch tenant to user-2, list user-1's project | 200, `[]` |

### PATCH errors

| # | Test | Request | Expected |
|---|------|---------|----------|
| 8 | PATCH to a nonexistent list → 404 | `PATCH /api/resources/<resourceAId>` body `{ listId:"<random-oid>" }` | 404 `"Knowledge List not found"` |
| 9 | PATCH rename collides with existing title → 400 | Rename resourceB's title to resourceA's title in same project | 400 `"A resource with this name already exists in the project"` |
| 10 | PATCH rename to same title as self → OK | PATCH resourceA title unchanged | 200 (the `_id: { $ne: id }` excludes self) |
| 11 | PATCH moving to a list in another project overrides projectId | Move resourceA to listBId (listB belongs to projectId anyway — to test override, create listB in a different project) | 200, `resource.projectId === listB.projectId` |
| 12 | PATCH nonexistent resource → 404 | `PATCH /api/resources/<random-oid>` | 404 `"Resource not found"` |

### DELETE 404

| # | Test | Request | Expected |
|---|------|---------|----------|
| 13 | DELETE nonexistent → 404 + deleter not called | `DELETE /api/resources/<random-oid>` | 404; `deleteResource` mock not called |
| 14 | DELETE happy → 204 + deleter called | `DELETE /api/resources/<resourceAId>` | 204; `deleteResource` called with `(resourceAId, "test-user-1")` |

### File streaming (mock `fetch` + `googleapis`)

| # | Test | Mock setup | Expected |
|---|------|-----------|----------|
| 15 | "Drive not configured" → 400 | `UserModel` has no `driveRefreshToken` (or no user) | 400 `"Google Drive not configured"` |
| 16 | Resource without driveFileId → 404 | Resource with no `driveFileId` | 404 `"Resource or file not found"` |
| 17 | Successful stream passes through | Mock `fetch` → `{ ok:true, status:200, headers: Map, body: ReadableStream }`; mock `googleapis` OAuth2 | 200 with file content; `Content-Disposition: inline; filename="<title>"`; `Accept-Ranges: bytes` |
| 18 | Range request forwarded + 206 | Set `Range: bytes=0-9` header; mock Drive returns `206` with `content-range` header | 206; request `Range` header forwarded to Drive; `content-range` header on response |
| 19 | Drive error passthrough | Mock `fetch` → `{ ok:false, status:502, statusText:"Bad Gateway" }` | 502 `{ "error": "Failed to fetch file from Drive" }` |
| 20 | Missing resource → 404 | Nonexistent id | 404 |
| 21 | OAuth access token failure → propagates | Mock `oauth.getAccessToken` to throw | 500 (uncaught in handler) |

## Pitfalls & Challenges

1. **File-streaming tests require mocking BOTH `global.fetch` AND `googleapis`.** The handler calls `oauth2Client.getAccessToken()` (via `google.auth.OAuth2`) and `fetch(...)`. Mock both:

   ```ts
   // mock googleapis OAuth2 to return a stub with getAccessToken
   vi.mock("googleapis", () => ({
     google: {
       auth: { OAuth2: vi.fn().mockReturnValue({
         setCredentials: vi.fn(),
         getAccessToken: vi.fn().mockResolvedValue({ token: "fake-at" }),
       })},
       drive: vi.fn(),
     },
   }));
   ```

2. **`Readable.fromWeb(driveRes.body)`** — the body from the mocked fetch must be a web `ReadableStream`. Use `new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("file content")); controller.close(); } })` or `Readable.toWeb` from a Node stream. Node 22 supports `Readable.toWeb`.

3. **`driveRes.headers` in the copy loop** — the handler calls `driveRes.headers.forEach(...)`. The mocked fetch response must have a real `Headers`-interface object with `.forEach((value,key)=>...)`. Use the actual Web `Headers` class (available globally in Node 22). Populate it with `content-type`, `content-disposition`, etc.

4. **Asserting streamed content from `app.inject`:** Fastify `inject` buffers the reply payload. `response.payload`/`response.body` gives the streamed bytes as a string. For binary, `response.rawPayload` is a Buffer. Use `response.payload` for the text-file test.

5. **Case 11 (move changes projectId):** To exercise the override, you must have a list in a **different** project than the resource. `body.projectId = list.projectId` — so the resulting resource gets the list's project. Create `listB` under a project different from `resourceA.projectId` to see the change.

6. **Case 9 (title collision with self excluded):** The uniqueness check excludes `_id: { $ne: request.params.id }`. So renaming resourceB to resourceA's existing title → collision → 400. But renaming resourceA to resourceA's own title (i.e., title unchanged) → skipped entirely because `body.title !== resource.title` is false → 200.

7. **The list selective `-content` projection (case 1):** assert the returned resources do NOT contain a `content` key (`expect(data[0]).not.toHaveProperty("content")`).

8. **Content endpoint returns raw string, not JSON.** `reply.send(resource.content || "")` with `Content-Type: text/plain`. `app.inject` → `response.statusCode === 200`, `response.payload === "# hello"`. Do NOT `JSON.parse` it.

9. **The `x-test-owner` header** gives you tenant switching (case 7). Your `onRequest` hook must read it.

10. **Case 15 requires the `UserModel` to lack a token **in user-1's context**. Because `UserModel.findOne({ ownerId })` is NOT tenant-scoped, seeding a user without a token is enough.

## Suggested File

`apps/api/tests/resources-extra.test.ts`
