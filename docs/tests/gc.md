# Test Plan: Garbage Collection (`runGarbageCollection`)

## Source Under Test

`apps/api/src/gc.ts` — `runGarbageCollection()`

## Why It Needs Tests

- GC deletes **user-owned data** (resource records + Google Drive files) with **zero test coverage**.
- It runs side-effect-free on **every `/health` hit**, so a regression here is silently triggered in production traffic.
- It has an `isGCRunning` re-entrancy guard, `skipTenant` cross-tenant reads, per-user Drive deletion, and graceful-failure semantics — all untested.

## What the Function Does (verified from source)

```ts
runGarbageCollection():
  if (isGCRunning) return;                    // guard against concurrent sweeps
  isGCRunning = true;
  try:
    thirtyMinsAgo = now - 30min
    stale = ResourceModel.find({ status: "pending", updatedAt: { $lt: thirtyMinsAgo } }, null, { skipTenant: true })
    for each stale resource:
      if (resource.driveFileId):
        user = UserModel.findOne({ ownerId: resource.ownerId })   // no skipTenant — see pitfall #3
        if (user && user.driveRefreshToken):
          oauth = new google.auth.OAuth2(AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET)
          oauth.setCredentials({ refresh_token: user.driveRefreshToken })
          drive = google.drive({ version: "v3", auth: oauth })
          drive.files.delete({ fileId: resource.driveFileId })    // errors logged, non-fatal
      ResourceModel.findByIdAndDelete(resource._id, { skipTenant: true })
  catch: console.error("Garbage collection sweep failed:")
  finally: isGCRunning = false
```

## Setup / Fixtures

### App / DB

```ts
const mongoServer = await MongoMemoryServer.create();
await connectDB(mongoServer.getUri());
```

**No Fastify app needed** — GC calls models directly. You only need Mongo + models + the tenant context for seeding.

### Seeding

Seed resources with `{ skipTenant: true }` (GC itself reads cross-tenant, and you want to seed regardless of a tenant context).

```ts
// helper: seed a pending resource with a chosen updatedAt
const seedStale = async (ownerId: string, updatedAt: Date, driveFileId?: string) =>
  ResourceModel.create(
    {
      ownerId,
      projectId: "p1",
      listId: "l1",
      title: `stale-${Math.random()}`,
      type: driveFileId ? "pdf" : "url",
      status: "pending",
      driveFileId,
      updatedAt,
    },
    { skipTenant: true },   // <-- GC seeds need this because there's no tenant context
  );
```

Seed these categories in `beforeAll`:

| Category | status | updatedAt | expected behavior |
|----------|--------|-----------|-------------------|
| Stale with Drive file | `pending` | 31 min ago | DB deleted + Drive deleted |
| Stale without Drive file | `pending` | 31 min ago | DB deleted, no Drive call |
| Fresh pending | `pending` | 5 min ago | **left alone** |
| Ready resource | `ready` | 2 hours ago | **left alone** (status filter) |
| Error resource | `error` | 2 hours ago | **left alone** |
| Stale with Drive file but **no user row** | `pending` | 31 min ago | DB deleted, no Drive call (user lookup fails) |
| Stale with Drive file but **user has no refresh token** | `pending` | 31 min ago | DB deleted, no Drive call |

### Mocking Google Drive

Mock the `googleapis` module. The two things GC uses from it:

```ts
vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: vi.fn().mockReturnValue({ setCredentials: vi.fn() }) },
    drive: vi.fn().mockReturnValue({
      files: { delete: vi.fn().mockResolvedValue({}) },
    }),
  },
}));
```

The `drive.files.delete` mock lets you assert exactly which file IDs were deleted per user.
Import the mocked function after mocking so you can spy on it:

```ts
import { google } from "googleapis";
const filesDeleteMock = (google.drive as any)().files.delete;
```

### Controlling "now"

`updatedAt` comparison uses `Date.now()` at runtime. To make "31 minutes ago" vs "5 minutes ago" deterministic without fake timers (which can interfere with Mongo), compute `updatedAt` relative to the actual current time:

```ts
const now = Date.now();
const stale = new Date(now - 31 * 60 * 1000);
const fresh = new Date(now - 5 * 60 * 1000);
```

**Do not use `vi.useFakeTimers()` here** — `mongodb-memory-server` and Mongoose rely on real timers; faking them causes hangs in `beforeAll`. Relative dates are the safe, deterministic approach.

## Test Cases

| # | Test | Request/setup | Expected assertion |
|---|------|---------------|--------------------|
| 1 | Sweeps stale pending resources and deletes their DB records | Seed 2 stale + 1 fresh pending | After `runGarbageCollection()`, `countDocuments({ status: "pending" }, { skipTenant: true })` equals 1 (only fresh remains) |
| 2 | Deletes the Drive file for stale resources that have `driveFileId` + a user token | Seed stalew with `driveFileId: "file-abc"`, `UserModel.create({ ownerId, driveRefreshToken: "tok" })` | `filesDeleteMock` called with `{ fileId: "file-abc" }` |
| 3 | Does not delete Drive files when the owning user is missing | Seed stale with `driveFileId` but no `UserModel` row | `filesDeleteMock` not called |
| 4 | Does not delete Drive files when user has no `driveRefreshToken` | Seed stale + `UserModel.create({ ownerId })` (no token) | `filesDeleteMock` not called |
| 5 | Leaves fresh (`< 30min`) pending resources alone | Seed stale + fresh pending | Both still present after sweep |
| 6 | Leaves `ready` and `error` resources alone even if old | Seed 2h-old `ready` + 2h-old `error` | Both still present after sweep |
| 7 | GC never throws — errors are swallowed | Force `filesDeleteMock` to reject | `runGarbageCollection()` resolves without throwing |
| 8 | Re-entrancy guard: second concurrent call is a no-op | Call twice synchronously / while first in flight | Only one sweep runs (assert via a counter on the delete mock, or by checking `isGCRunning` guard via a delayed delete mock) |
| 9 | Deletes resources even when Drive deletion fails | Make `filesDeleteMock` reject for one resource but succeed for another | Both DB records deleted; one Drive error logged, not fatal |
| 10 | Triggers from `/health` (integration) | Register the full app (`index.ts`-style route) | Calling `GET /health` eventually sweeps stale resources (may need a small delay / poll) |

## Pitfalls & Challenges

1. **`skipTenant: true` on seeding is mandatory.** GC reads with `skipTenant` itself and you seed outside a tenant context. `ResourceModel.create(...)` without `skipTenant` will throw `"Tenant context missing on save."`.

2. **`UserModel.findOne({ ownerId: resource.ownerId })` in GC has NO `skipTenant`** — and `UserModel` does NOT have the tenant plugin (users are deliberately not tenant-scoped). So this call works fine even outside a tenant context. **Do not** add `skipTenant` to this assertion in your test — it would actually exercise a bug. Just have `UserModel` rows present.

3. **The `google` mock must include `auth.OAuth2`.** GC constructs `new google.auth.OAuth2(clientId, clientSecret)`. If you only mock `google.drive`, you'll get `TypeError: google.auth is undefined`. The full mock above handles both.

4. **`drive.files.delete` is called via a `drive` function call** — `google.drive({...})()` returns an object with `files.delete`. To spy, capture the return of calling `google.drive(...)` once and reference its `files.delete`. Since the mock returns a fresh object each call, you must either make `drive.files.delete` a `vi.fn()` that's shared, or make `google.drive` return the **same** object across calls.

   Recommended mock shape:
   ```ts
   const filesDelete = vi.fn();
   vi.mock("googleapis", () => ({
     google: {
       auth: { OAuth2: vi.fn().mockReturnValue({ setCredentials: vi.fn() }) },
       drive: vi.fn().mockReturnValue({ files: { delete: filesDelete } }),
     },
   }));
   ```

5. **Don't assert "no Drive call" using `toHaveBeenCalledTimes(0)` on a per-test basis unless you reset the mock** in `beforeEach` (`filesDelete.mockReset()`). Otherwise state leaks between tests.

6. **The `isGCRunning` guard test (case 8) requires a race.** Either mock `files.delete` to delay (return a promise you control), or refactor to expose the guard. The simplest deterministic approach: make `filesDelete` return a controlled deferred promise in one test, start `runGarbageCollection()`, immediately call it again, resolve the first, and assert the delete mock was only called once (or assert via a counter on DB operations).

7. **Relative `updatedAt` seeding**: MongoDB stores `Date`. Use `new Date(Date.now() - 31 * 60 * 1000)` — don't hardcode an absolute timestamp, or the test breaks the day it runs.

8. **`ResourceModel.init()`** may be needed before `find` with certain conditions (it ensures indexes exist). Add `await ResourceModel.init()` in `beforeAll` before seeding to be safe (the `search.test.ts` pattern does this).

## Suggested File

`apps/api/tests/gc.test.ts`

## Suggested imports

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { runGarbageCollection } from "../src/gc.js";
import { ResourceModel } from "../src/models/Resource.js";
import { UserModel } from "../src/models/User.js";
import { connectDB } from "../src/db.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { google } from "googleapis"; // after vi.mock
```
