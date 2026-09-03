# Test Plan: User Settings Routes (`GET`/`PATCH /api/user/settings`)

## Source Under Test

`apps/api/src/routes/user.ts` — `GET /api/user/settings` (lines 43–62) and `PATCH /api/user/settings` (lines 69–96).

## Why It Needs Tests

- These routes **auto-provision the user record** on first visit — a side effect no other route has (creating user docs). Untested.
- Drive token persistence (the only setting currently) drives the file-streaming and GC Drive-deletion features.
- The PATCH branch has a subtle `undefined` guard (`if (body.driveRefreshToken !== undefined)`) that's easy to regress.

## What the Handlers Do (verified)

```ts
GET /api/user/settings:
  ownerId = request.ownerId
  user = UserModel.findOne({ ownerId })
  if (!user) { user = UserModel.create({ ownerId }) }   // auto-create
  return { driveRefreshToken: user.driveRefreshToken }

PATCH /api/user/settings:
  ownerId = request.ownerId
  body = request.body                                   // UpdateUserSettingsSchema
  user = UserModel.findOne({ ownerId })
  if (!user) { user = UserModel.create({ ownerId, ...body }) }
  else {
    if (body.driveRefreshToken !== undefined) {
      user.driveRefreshToken = body.driveRefreshToken
    }
    await user.save()
  }
  return { driveRefreshToken: user.driveRefreshToken }
```

**Note**: `UserModel` is NOT tenant-scoped (users are top-level tenants, no tenant plugin). So looking up `findOne({ ownerId })` works normally regardless of the tenant context, and there's no auto-ownerId injection on save. But `ownerId` should still be set explicitly in the `create` call.

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
app.register(userRoutes);
await app.ready();
```

The `x-test-owner` header pattern (as in `user-metrics.test.ts`) lets you switch tenants per test for isolation assertions.

## Test Cases

| # | Test | Request | Expected |
|---|------|---------|----------|
| 1 | GET auto-creates user on first visit | `GET /api/user/settings` with no seeded user | 200 `{ driveRefreshToken: undefined }`; `UserModel.countDocuments({ ownerId: "test-user-1" })` = 1 |
| 2 | GET returns existing token | Seed `UserModel.create({ ownerId, driveRefreshToken: "tok-1" })` | 200 `{ driveRefreshToken: "tok-1" }` |
| 3 | GET is idempotent (doesn't duplicate) | Call GET twice when no user exists | Both 200; still exactly 1 user row |
| 4 | PATCH creates user when none exists | `PATCH /api/user/settings` body `{ driveRefreshToken: "tok-new" }` with no seed | 200 `{ driveRefreshToken: "tok-new" }`; user row created |
| 5 | PATCH updates existing user's token | Seed user with `"tok-old"`, PATCH `{ driveRefreshToken: "tok-new" }` | 200 `{ driveRefreshToken: "tok-new" }`; DB updated |
| 6 | PATCH with empty body `{}` leaves token unchanged | Seed `"tok-old"`, PATCH `{}` | 200; token still `"tok-old"` (the `undefined` guard) |
| 7 | PATCH `driveRefreshToken: null` replaces token | Seed `"tok-old"`, PATCH `{ driveRefreshToken: null }` | 200 `{ driveRefreshToken: null }` |
| 8 | Tenant isolation: user-1's token not affected by user-2 PATCH | Seed user-2 token, PATCH user-1 empty, or PATCH user-2 and read user-1 | user-1 token unchanged; each sees only their own settings |
| 9 | GET settings is tenant-scoped | Seed tokens for both, GET as user-1 vs user-2 (via `x-test-owner`) | each returns their own token |
| 10 | Invalid body (e.g. `driveRefreshToken` as a number) → 400 | PATCH `{ driveRefreshToken: 123 }` | 400 (Zod type mismatch) |

## Pitfalls & Challenges

1. **`UserModel` is NOT tenant-scoped.** This means:
   - Seeding is simpler — you can create user rows without wrapping in `tenantContext.run`. But `ownerId` won't be auto-filled, so set it explicitly in the object passed to `create`.
   - Direct assertions like `UserModel.findOne({ ownerId })` for verification work **without** `skipTenant`, and do **not** need an active tenant context. (Contrast this with resource/project/list seeding, where the tenant plugin is active.)
   - However, the route handler itself reads `request.ownerId` — which is set by your `onRequest` hook, entirely decoupled from the tenant plugin. So the "isolation" you're testing is just that `findOne({ ownerId })` uses the right owner id.

2. **The `undefined` guard (case 6) is the trickiest assertion.** Sending `PATCH` with `{}` — via Fastify `payload: {}` — results in `body.driveRefreshToken === undefined`, so the `if (body.driveRefreshToken !== undefined)` guard keeps the old value. **Critical subtlety**: if you send `{ driveRefreshToken: null }`, the guard is `null !== undefined` → true, so it sets the token to `null`. Case 6 vs 7 distinguish "absent" (keeps) from "null" (clears). Make sure your test body for case 6 omits the key entirely (not `null`).

3. **The PATCH `create` branch** (`UserModel.create({ ownerId, ...body })`) spreads the entire validated body into the new user. Since `UpdateUserSettingsSchema` only has `driveRefreshToken`, this is fine today, but if the schema grows, extra fields would be silently swallowed by Mongoose (not in schema). Don't test this as a contract — just note it won't throw.

4. **Case 10 (number token)**: `UpdateUserSettingsSchema` is `{ driveRefreshToken: z.string().optional() }`. A number fails Zod parsing. Because the route declares `body: UpdateUserSettingsSchema` in the Fastify schema, Fastify returns 400 automatically — **not** the handler. So this 400 comes from the type-provider, and the response shape is Fastify's default (not `{ error: ... }`). Assert just the status code, not the body, for this case.

5. **Case 4 (`PATCH` create-with-token)**: after `UserModel.create({ ownerId, ...body })`, the return reads `user.driveRefreshToken` from the in-memory created doc. Since `body` spread sets `driveRefreshToken: "tok-new"` on the new doc, the response is `"tok-new"` even before any `save()` (create persists immediately). Assert 200 + DB row exists.

6. **This suite does NOT need `storagePlugin`/`deletionPlugin`.** `userRoutes` only touches models and responds. Keep the app minimal.

## Suggested File

`apps/api/tests/user-settings.test.ts`
