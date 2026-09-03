# Test Plan: Auth Plugin Edge Cases (`authPlugin` in `apps/api/src/auth.ts`)

## Source Under Test

`apps/api/src/auth.ts` — `authPlugin` (the Fastify plugin) plus `verifyToken` (already unit-tested in `auth.test.ts`).

## Why It Needs Tests

- The plugin's preHandler guards **every** protected route in the app. Breaking it breaks all authentication.
- Only two behaviors are tested today (`health.test.ts`): unauthenticated `/api/protected` → 401, and `/health` is public. The full token-extraction matrix is untested.
- Security-sensitive: cookie and bearer parsing, `AUTH_SECRET` handling, public-route bypass. These need explicit regression tests.

## What the Plugin Does (verified from source)

```ts
onRequest hook:  tenantContext.run({ ownerId: "" }, done)  // seed store wrapping request
preHandler hook:
  routeUrl = request.routeOptions?.url || request.url.split("?")[0]
  if (routeUrl === "/health" || routeUrl.startsWith("/api/auth/")) return   // public bypass

  // token extraction resolution order:
  token = null
  if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7)    // BEARER WINS
  else if (cookieHeader) parse `nexus-session=(...)` from cookie            // cookie fallback

  if (!token)              → 401 "Unauthorized: Missing or invalid token"
  if (!AUTH_SECRET)        → 500 "Internal Server Error"

  payload = jwtVerify(token, secret, { clockTolerance: 30 })
  if (!payload.sub)        → 401 "Unauthorized: Missing sub in token"
  else:
    request.ownerId = payload.sub
    store.ownerId = payload.sub
  on verify error          → 401 "Unauthorized: Invalid token"
```

## Setup / Fixtures

Build a minimal Fastify app registering only the auth plugin + a couple of probe routes:

```ts
const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(authPlugin);

// A protected echo route to observe request.ownerId
app.get("/api/protected", async (request: any) => ({ ok: true, user: request.ownerId }));

// A route that is protected but NOT under /api/auth to verify bypass limits
app.get("/api/something", async (request: any) => ({ ok: true, user: request.ownerId }));

// Manually register a route FORCED under /api/auth prefix to verify the bypass is path-based
app.get("/api/auth/something", async () => ({ ok: true, bypassed: true }));

// Register a /health route for completeness
app.get("/health", async () => ({ ok: true }));

await app.ready();
```

**No Mongo required** unless you want to assert that `request.ownerId` flows into the tenant store (which would then let a model query run). For the token-level matrix, no DB is needed — the plugin gives you `request.ownerId` directly.

### Invoking the probe endpoints

```ts
const protectedRes = await app.inject({ method: "GET", url: "/api/protected", headers: { authorization: "Bearer <token>" } });
const cookieRes = await app.inject({ method: "GET", url: "/api/protected", headers: { cookie: "nexus-session=<token>" } });
```

### Minting test JWTs

Use `jose` like the existing `auth.test.ts`:

```ts
import { SignJWT } from "jose";
const secret = process.env.AUTH_SECRET!;   // set in beforeAll
const key = new TextEncoder().encode(secret);

const mint = (claims: Record<string, unknown>, opts?: { exp?: string }) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(opts?.exp ?? "1h")
    .sign(key);
```

## Test Cases

Set `process.env.AUTH_SECRET` in `beforeAll` (e.g. `"test-secret-12345678901234567890"`), and `process.env.AUTH_SECRET = undefined` only in the one test that needs the 500.

| # | Test | Request / env | Expected |
|---|------|---------------|----------|
| 1 | Valid bearer token sets `request.ownerId` | Bearer with `{ sub: "user-1" }` | 200, body `{ ok: true, user: "user-1" }` |
| 2 | Valid cookie token sets `request.ownerId` | Cookie `nexus-session=<valid>` | 200, `user: "user-1"` |
| 3 | Bearer takes precedence over cookie | Both present, different subs | 200, `user` = bearer's sub |
| 4 | Expired token → 401 | `{ sub }` with `setExpirationTime("0s")` (or a past `nbf`) | 401, `{"error": "Unauthorized: Invalid token"}` |
| 5 | Malformed/garbage token → 401 | `authorization: "Bearer not.a.jwt"` | 401, `{"error": "Unauthorized: Invalid token"}` |
| 6 | Token missing `sub` → 401 | Signed token with `{ email: "x@y.z" }` but **no sub** | 401, `{"error": "Unauthorized: Missing sub in token"}` |
| 7 | No token at all → 401 | No header, no cookie | 401, `{"error": "Unauthorized: Missing or invalid token"}` |
| 8 | Header present but not Bearer (e.g. `Basic`) → 401 | `authorization: "Basic abc"` | 401 (no token extracted) |
| 9 | `AUTH_SECRET` unset → 500 | Temporarily `delete process.env.AUTH_SECRET`, send valid token | 500, `{"error": "Internal Server Error"}` |
| 10 | `/health` bypasses auth even with no token | `GET /health` no auth | 200 |
| 11 | `/api/auth/*` bypasses auth | `GET /api/auth/something` no auth | 200 (route runs) |
| 12 | Non-`/api/auth/*` route does NOT bypass | `GET /api/something` no auth | 401 |
| 13 | Token within 30s clock tolerance still valid | Mint with `setExpirationTime(Math.floor(Date.now()/1000) + 20)` (expires +20s) | 200 (tolerated) |
| 14 | Token expired beyond tolerance → 401 | Mint with exp = now - 60s | 401 |
| 15 | Valid token flows into tenant store | Valid bearer; then inside the handler (or a subsequent model query) the store has ownerId | `tenantContext.getStore()?.ownerId === "user-1"` |

## Pitfalls & Challenges

1. **`process.env.AUTH_SECRET` is read at request time**, not import time. Good — you can flip it per test with `vi.stubEnv` / manual assign + restore. But `vi.stubEnv("AUTH_SECRET", undefined)` sets it to the string `"undefined"` — not actual `undefined`. To truly unset, use:
   ```ts
   const original = process.env.AUTH_SECRET;
   delete process.env.AUTH_SECRET;
   try { /* test */ } finally { process.env.AUTH_SECRET = original; }
   ```

2. **Route matching for the bypass uses `request.routeOptions.url`.** Registering `app.get("/api/auth/something", ...)` works, but note that `authRoutes` and other plugins must NOT also be registered (conflicting `/api/auth/*` paths). Keep this app minimal — just `authPlugin` + the probe routes.

3. **`request.decorateRequest("ownerId", null)` is called by `authPlugin` itself** — do not re-decorate in your test app, or `app.ready()` throws "already decorated".

4. **The `onRequest` tenant seeding** runs `tenantContext.run({ ownerId: "" }, done)`. This means by the time your handler runs, `tenantContext.getStore()` IS set but with `ownerId: ""` until the preHandler mutates it. If you assert store state, do it inside a route handler (which runs after preHandler) — not in an `onRequest`-level hook you add.

5. **Clock tolerance test (case 13/14)**: `jose`'s `jwtVerify` with `clockTolerance: 30` accepts tokens expiring up to 30 seconds in the future. `Math.floor(Date.now()/1000) + 20` is within tolerance (passes); `- 60` is beyond (fails). Avoid boundary-exact values (`+30` exactly) since timing jitter can flip the result.

6. **Bearer precedence (case 3)**: the code checks the auth header first and only falls back to cookie. To craft the test, send a valid bearer for `user-a` and a cookie for `user-b`; expect `user-a` back.

7. **No DB needed** for the token matrix, so this suite is fast. Only add Mongo if you test the "flows into tenant store" integration (case 15), and even then it's optional — you can assert `tenantContext.getStore()` directly inside a handler without a DB.

8. **Malformed cookie edge**: `nexus-session=` with no value, or multiple cookies. The regex `(?:^|;\s*)nexus-session=([^;]*)` requires the equals sign. Test a cookie with no `=` match yields 401. Also test `nexus-session=valid; other=val` (works) and a cookie with HTML-encoded/URL-encoded chars (JWT chars are url-safe, so they parse fine).

## Suggest File

`apps/api/tests/auth-plugin.test.ts`
