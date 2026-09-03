# Test Plan: Resource JSON Create (`POST /api/resources`, non-multipart branch)

## Source Under Test

`apps/api/src/routes/resources.ts` — the `POST /api/resources` handler, lines 62–171. Specifically the **JSON (non-multipart) branch** at lines 96–98, and the shared validation/uniqueness/list-membership logic after it.

## Why It Needs Tests

- The existing `resources-upload.test.ts` only exercises the **multipart** path (line 80 `request.isMultipart()`).
- The **JSON branch** (`body = request.body`) is completely untested: creating `note`, `url`, `markdown` resources with `content`, the duplicate-title → 400, list-not-in-project → 404, and invalid-payload → 400 paths.
- `CreateResourceSchema.safeParse` validation, the manual title-uniqueness check, and the 400-vs-500 StorageError split are all uncovered.

## What the Handler Does (verified)

```ts
POST /api/resources:
  bodyLimit 14MB
  if (request.isMultipart()):      // tested already
     ... parse file + fields ...
  else:
     body = request.body            // ← JSON branch (this doc)

  parsedBody = CreateResourceSchema.safeParse(body)
  if (!parsedBody.success) → 400 "Invalid payload: <msg>"

  list = KnowledgeListModel.findOne({ _id: body.listId, projectId: body.projectId })
  if (!list) → 404 "Knowledge List not found in the specified project"

  existing = ResourceModel.findOne({ projectId, title, ownerId })
  if (existing) → 400 "A resource with this name already exists in the project"

  isFileUpload = (type === "pdf" || type === "image") && !body.url && !body.content
  if (isFileUpload):
     if (!fileStream) → 400 "File stream required for this resource type"   // JSON branch can't have a stream
     try: upload → StorageError → 400 / other → 500
     // (JSON keepers like note/url/markdown skip this block)

  save with { status: "ready", driveFileId, size }  → 201
```

**Key**: In the JSON branch, `type` is usually a non-file type (`note`, `url`, `markdown`, `text`, `ebook`, `chat`), so `isFileUpload` is false and no storage is touched. So the JSON tests do **not** need `storagePlugin` at all — the handler only contacts `server.storage` in the file-upload branch.

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
// NO storagePlugin, NO deletionPlugin, NO multipart for the JSON branch

await app.ready();
```

Seed a project + list (inside `tenantContext.run`):

```ts
await new Promise<void>((resolve) =>
  tenantContext.run({ ownerId: "test-user-1" }, async () => {
    const project = await ProjectModel.create({ name: "Proj", slug: "proj" });
    const list = await KnowledgeListModel.create({
      projectId: project.id, // string form
      name: "L1", slug: "l1", position: 0,
    });
    app.decorate("testIds", { project: project._id.toString(), list: list._id.toString() });
    resolve();
  }),
);
```

## Test Cases

| # | Test | Payload | Expected |
|---|------|---------|----------|
| 1 | Create a `note` resource (content, no file) | `{ projectId, listId, title: "Note", type: "note", content: "hello" }` | 201, body has `id`, `status: "ready"`, `tags: []`, `isFavorite: false` |
| 2 | Create a `url` resource with valid URL | `{ projectId, listId, title: "Link", type: "url", url: "https://example.com" }` | 201, `url` present |
| 3 | Create a `markdown` resource with content | `{ projectId, listId, title: "MD", type: "markdown", content: "# hi" }` | 201, `content` present |
| 4 | Create a `pdf` with JSON (no content, no url, NO file) → 400 | `{ projectId, listId, title: "PDF", type: "pdf" }` | 400 `"File stream required for this resource type"` (because `isFileUpload` true but no stream) |
| 5 | Duplicate title in same project → 400 | Seed A with title "Doc", retry "Doc" same project | 400 `"A resource with this name already exists in the project"` |
| 6 | Same title in DIFFERENT project/list is allowed | Create "Doc" in project/list A, then "Doc" in project/list B | 201 for second |
| 7 | List not in project → 404 | Pass `listId` from a different project, or random | 404 `"Knowledge List not found in the specified project"` |
| 8 | Nonexistent list ID → 404 | `listId: new mongoose.Types.ObjectId().toHexString()` | 404 |
| 9 | Invalid payload (missing title) → 400 | `{ projectId, listId, type: "note" }` | 400, message starts `"Invalid payload:"` |
| 10 | Invalid `type` value → 400 | `{ ..., type: "video" }` | 400, `"Invalid payload:"` |
| 11 | Empty title `""` → 400 | title: `""` | 400, `"Title is required"` in message |
| 12 | `tags` string array accepted | `tags: ["a", "b"]` | 201, `tags: ["a","b"]` |
| 13 | `isFavorite: true` honored | `{ ..., isFavorite: true }` | 201, `isFavorite: true` |
| 14 | `url` invalid → 400 | `{ type: "url", url: "not a url" }` | 400, `"Invalid payload:"` |
| 15 | Persisted to DB with `ownerId` = test-user-1 | Any successful create | `ResourceModel.findOne({ title })` read back has `ownerId: "test-user-1"` |
| 16 | Tenant isolation: user-2 can't see user-1's created resource | Switch tenant to user-2, `findOne({ title })` | Null (or `countDocuments` = 0 for user-2 context) |

## Pitfalls & Challenges

1. **The JSON branch does NOT touch `server.storage`** for non-file types. Do not register `storagePlugin` or `deletionPlugin` for these tests — the handler would only call them in the `isFileUpload` branch (case 4). Keeping the app minimal avoids needing to decorate `server.storage`.

2. **Case 4 (`pdf` JSON → 400) never reaches storage**: `isFileUpload` is true but `fileStream` is `undefined`, so it short-circuits to 400 `"File stream required for this resource type"` before storage. Good — clean test.

3. **`Request.body` comes through the Zod type-provider as the parsed value.** When you `app.inject({ payload })` for a `note`, the Fastify JSON parser + `CreateResourceSchema` type-provider handles it. The route re-parses with `CreateResourceSchema.safeParse` on the already-parsed body — so the `safeParse` 400 cases (9–11, 14) happen when the body is **schema-invalid at the input layer**. Since `POST /api/resources` body schema is NOT declared as `CreateResourceSchema` in the route (only a `response` schema), an invalid body is NOT auto-400'd by Fastify — it flows through to the manual `safeParse`. So sending invalid JSON bodies works and hits the manual branch.

4. **`projectId`/`listId` in the route are strings** in `request.body`. When seeding, use `_id.toString()` for the list's `projectId` and the route's `projectId`. The list lookup `findOne({ _id: body.listId, projectId: body.projectId })` needs both to match exactly.

5. **Manual title uniqueness (not a DB index).** In case 5, seeding resource A then creating B with the same title in the same project triggers the **manual** `findOne` 400 — not a Mongo E11000. There's no unique index on `{projectId, title}` (only `{ownerId, slug}` for projects, `{ownerId, projectId, slug}` for lists). So don't expect a 409 here; it's a 400 from the manual check.

6. **Case 15 ownerId assertion** — since the tenant plugin auto-sets `ownerId` on save, the created resource has `ownerId: "test-user-1"`. Read it back with `ResourceModel.findOne({ ... })` **inside** `tenantContext.run` (or with `skipTenant`), because the plugin filters by the current tenant.

## Suggested File

`apps/api/tests/resources-create-json.test.ts`
