# Test Plan: Auth Route Failure Paths (`routes/auth.ts`)

## Source Under Test

`apps/api/src/routes/auth.ts` — Google + GitHub OAuth callback failure branches and initiate-when-unconfigured.

## Why It Needs Tests

- The existing `auth-routes.test.ts` covers: initiate redirects (configured), a state-mismatch callback, and happy-path callbacks for both providers.
- **Untested failure paths:**
  - Initiate route when provider client ID env var is unset → 500
  - Callback with missing `code` → redirect auth_failed
  - Callback with missing `oauth_state` cookie → redirect auth_failed
  - Callback token exchange failure (non-OK fetch) → redirect auth_failed
  - Callback userinfo fetch failure → redirect auth_failed
  - Callback throwing (upstream fetch throws) → redirect auth_failed
  - GitHub email-fetch fallback failure (non-fatal)
  - `upsertUser` race-condition duplicate insert (silently swallowed)
  - `AUTH_SECRET` unset during callback → the whole callback catch → auth_failed redirect

## What the Handler Does (verified)

Both callback flows share the same skeleton (Google lines 130–215, GitHub 254–382):

```ts
callback/provider:
  if (error || !code || !state)  → redirect `${frontend}/signin?error=auth_failed`
  cookie = request.headers.cookie; match oauth_state=... ; if (!stateCookie || stateCookie !== state) → redirect auth_failed
  reply.header("Set-Cookie", `oauth_state=; ...; Max-Age=0`)
  try:
    tokenRes = fetch(TOKEN_URL, {...})
    if (!tokenRes.ok) → redirect auth_failed                    // ← token exchange failure
    tokenData = await tokenRes.json()
    // GitHub extra: if (!tokenData.access_token || tokenData.error) → redirect auth_failed
    userRes = fetch(USERINFO_URL, {...})
    if (!userRes.ok) → redirect auth_failed                      // ← userinfo failure
    profile = await userRes.json()
    // GitHub extra: email fallback via /user/emails (try/catch non-fatal)
    await upsertUser(ownerId)
    jwt = await signSessionJwt({...})                            // throws if AUTH_SECRET unset
    return redirect `${frontend}/api/auth/sync?token=${jwt}`
  catch (err):
    log; return redirect auth_failed                             // ← any throw becomes auth_failed
```

## Setup / Fixtures

Mirror the existing `auth-routes.test.ts` setup — same app + env:

```ts
process.env.AUTH_SECRET = "test-secret-12345678901234567890";
process.env.AUTH_GOOGLE_ID = "google-id";
process.env.AUTH_GOOGLE_SECRET = "google-secret";
process.env.AUTH_GITHUB_ID = "github-id";
process.env.AUTH_GITHUB_SECRET = "github-secret";
process.env.FRONTEND_URL = "http://localhost:3000";

const mongoServer = await MongoMemoryServer.create();
await connectDB(mongoServer.getUri());
const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler); app.setSerializerCompiler(serializerCompiler);
app.register(authRoutes);
app.register(authPlugin);
await app.ready();
```

`beforeEach`: wipe `UserModel` (`deleteMany({})` + `skipTenant`) and `vi.restoreAllMocks()`.

## Test Cases

### Initiate when unconfigured

| # | Test | Env setup | Expected |
|---|------|-----------|----------|
| 1 | `/api/auth/google` with no `AUTH_GOOGLE_ID` → 500 | `delete process.env.AUTH_GOOGLE_ID` | 500 `{ error: "Google OAuth not configured" }` |
| 2 | `/api/auth/github` with no `AUTH_GITHUB_ID` → 500 | `delete process.env.AUTH_GITHUB_ID` | 500 `{ error: "GitHub OAuth not configured" }` |

### Google callback failures

| # | Test | Setup | Expected |
|---|------|-------|----------|
| 3 | Missing `code` → auth_failed | `GET /api/auth/callback/google?state=v&cookie=oauth_state=v` (no code) | 302 → `/signin?error=auth_failed` |
| 4 | `error` param present → auth_failed | `?code=x&state=v&error=access_denied&cookie=oauth_state=v` | 302 → auth_failed |
| 5 | State mismatch → auth_failed | `?code=x&state=wrong&cookie=oauth_state=right` | 302 → auth_failed |
| 6 | Missing `oauth_state` cookie → auth_failed | `?code=x&state=v` with NO cookie | 302 → auth_failed |
| 7 | Token exchange returns non-OK | Mock `fetch` for `token` → `{ ok:false, status:400, text:async()=>"x" }` | 302 → auth_failed |
| 8 | Userinfo fetch returns non-OK | Mock `fetch`: token `{ok:true,json:{access_token}}`, userinfo `{ok:false}` | 302 → auth_failed |
| 9 | Upstream fetch throws | Mock `fetch` to `vi.fn().mockRejectedValue(new Error("network"))` | 302 → auth_failed (caught) |
| 10 | `fetch` throws on token request | Mock token fetch reject | 302 → auth_failed |
| 11 | `AUTH_SECRET` unset during callback → auth_failed | `delete process.env.AUTH_SECRET`; mock fetch OK for token+userinfo | 302 → auth_failed (signSessionJwt throws, caught) |
| 12 | Success clears `oauth_state` cookie | Happy path with valid state | 302; `Set-Cookie` contains `oauth_state=; Max-Age=0` |

### GitHub callback failures

| # | Test | Setup | Expected |
|---|------|-------|----------|
| 13 | Token exchange `access_token` missing | Mock token json → `{ error: "bad" }` | 302 → auth_failed |
| 14 | Token exchange `access_token` null | Mock token json → `{}` | 302 → auth_failed |
| 15 | Email fallback fetch fails (non-fatal) | Mock userinfo `{ id, login, name, avatar_url }` (no email); `/user/emails` returns `ok:false` | 302 → `/api/auth/sync?token=`; user upserted with email null; does NOT redirect to auth_failed |
| 16 | Email fallback returns no primary/verified | `/user/emails` returns `[{ email, primary:false, verified:true }]` | proceeds with email null (non-fatal) |
| 17 | User fetch returns non-OK | Mock userinfo `{ok:false}` | 302 → auth_failed |
| 18 | Userinfo throws | Mock fetch reject for userinfo | 302 → auth_failed |

### Upsert race

| # | Test | Setup | Expected |
|---|------|-------|----------|
| 19 | Concurrent callback upsert swallows duplicate | Pre-insert a user with the same ownerId, then run callback (mock fetch OK). OR mock `UserModel.create` to reject with E11000(can't easily mock model) — simplest: pre-create the user then call callback | 302 → sync; no throw (the `.catch()` in `upsertUser` swallows the duplicate `create`) |

## Pitfalls & Challenges

1. **`fetch` mocking must distinguish endpoints.** The Google callback hits `oauth2.googleapis.com/token` and `www.googleapis.com/oauth2/v3/userinfo`. The GitHub callback hits `github.com/login/oauth/access_token`, `api.github.com/user`, `api.github.com/user/emails`. In `vi.fn().mockImplementation(async (url) => ...)`, branch on `url.toString().includes(...)` to return the right mock per stage. The existing test does this — reuse the pattern.

2. **`fetch` calls `await tokenRes.text()`** on the failure path (before `.json()`). When you mock a non-OK token response, provide a `text: async () => "..."` method, not just `json`. Otherwise `await tokenRes.text()` throws → caught → still auth_failed, but the assertion about *why* it failed is muddied.

3. **`process.env` mutation must be restored.** For cases 1, 2, 11, delete the env var then restore it in a `finally` (or `vi.stubEnv` per-test with restore). Other tests in the same suite depend on the vars being set. Do NOT delete them permanently.

4. **The state-mismatch and missing-code cases return **before** any `fetch` is called.** So you don't need to mock `fetch` for cases 3–6. Only cases 7+ need fetch mocks.

5. **Case 12 (cookie cleared)** — assert the `Set-Cookie` header on the auth_failed-less success path. Fastify's `reply.header("Set-Cookie", ...)` sets a single header. `res.headers["set-cookie"]` may be an array (Fastify merges). Check it contains `oauth_state=` and `Max-Age=0`.

6. **Case 19 (upsert race) is hard to test directly.** The `upsertUser` does `findOne` then `create([{ownerId}], {skipTenant}).catch(()=>{})`. If you pre-insert the user, the `findOne` finds it and no `create` happens → no race. To actually exercise the `.catch`, you'd mock `UserModel.create` to reject. That's fragile. **Recommendation:** test that a pre-existing user with the same ownerId does NOT duplicate (idempotent upsert), and separately that a *rejected* create (via `vi.spyOn(UserModel, "create").mockRejectedValueOnce(...)`) does not propagate. The second is the clearest regression guard for the swallow behavior.

7. **`upsertUser` uses `skipTenant: true`** internally (since there's no tenant context during OAuth). So your `UserModel` assertions after a callback should use `.setOptions({ skipTenant: true })` or the user won't be visible in a tenant-scoped find. The existing test does exactly this.

8. **`AUTH_SECRET` unset (case 11)** — `signSessionJwt` → `getSigningKey()` throws `"AUTH_SECRET is not configured"`, which is caught by the outer try/catch → auth_failed redirect. But note: the user WAS already upserted by that point (upsert happens before sign). So the DB has the user, but the client gets auth_failed. That's a real quirk worth pinning — assert both the redirect AND that the user exists.

## Suggested File

`apps/api/tests/auth-routes-failures.test.ts`
