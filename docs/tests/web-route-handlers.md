# Test Plan: Auth Route Handlers (`app/api/auth/sync` + `app/api/auth/signout`)

## Source Under Test

- `apps/web/app/api/auth/sync/route.ts` — `GET /api/auth/sync`
- `apps/web/app/api/auth/signout/route.ts` — `POST /api/auth/signout`

## Why It Needs Tests

- Both are Route Handlers (Next.js 16 App Router `app/api/`), which shadow the backend proxy for the same paths.
- The `sync` handler is the landing point of the OAuth callback: it takes the `?token=` from the backend and sets the `nexus-session` cookie. A regression here breaks the entire login flow.
- The `signout` handler clears the cookie. Both are pure `Request` → `NextResponse` functions with no external I/O, so they're trivially testable.

## Tooling Prerequisite (P4 / NEW)

Same as `web-utils.md` — `apps/web` has NO test framework. Add vitest. For route handlers, import the exported functions directly and invoke with a real `Request`:

```bash
# from apps/web
npm i -D vitest
```

```jsonc
// package.json
"scripts": { "test": "vitest run" }
```

These handlers only touch `next/server` (`NextResponse`) + `next/types`. To import `next/server` outside a Next runtime you may need to alias it. If vitest can't resolve `next/server` (it typically can — it's a normal module), mock it minimally:

```ts
vi.mock("next/server", () => {
  class NextResponse extends Response {
    cookies: any;
    constructor(...a: any[]) { super(...a); this.cookies = { set: vi.fn(), delete: vi.fn() }; }
    static redirect(url: any) { const r = new NextResponse(null, { status: 302 }); r.headers.set("location", String(url)); return r; }
    static json(obj: any) { return new NextResponse(JSON.stringify(obj), { headers: { "content-type": "application/json" } }); }
  }
  return { NextResponse };
});
```

## What the Handlers Do (verified)

```ts
GET /api/auth/sync:
  token = url.searchParams.get("token")
  if (!token) → redirect `/signin?error=auth_failed`
  response = redirect(`/projects`)
  response.cookies.set("nexus-session", token, {
    httpOnly: true, secure: NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:2592000,
  })
  return response

POST /api/auth/signout:
  response = json({ ok: true })
  response.cookies.delete("nexus-session")
  return response
```

## Setup

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as syncGET } from "../app/api/auth/sync/route";
import { POST as signoutPOST } from "../app/api/auth/signout/route";
```

Note the `next/headers` `cookies()` is NOT used by these two handlers (that's the layout). So no request cookies to mock for sync/signout — good, minimal surface.

## Test Cases

### sync (GET)

| # | Test | Input Request | Expected |
|---|------|---------------|----------|
| 1 | No `token` param → redirect auth_failed | `new Request("http://localhost/api/auth/sync")` | status 302; `location` = `/signin?error=auth_failed` (verify full origin or path) |
| 2 | Token present → redirect to /projects | `new Request("http://localhost/api/auth/sync?token=abc")` | status 302; `location` = `/projects` |
| 3 | Cookie `nexus-session` set to token | same as #2 | `response.cookies.set` called; cookie name `nexus-session`, value `abc` |
| 4 | Cookie `httpOnly: true` | same | `httpOnly` flag true |
| 5 | Cookie `sameSite: "lax"` | same | `sameSite` = `lax` |
| 6 | Cookie `path: "/"` | same | `path` = `/` |
| 7 | Cookie `maxAge: 2592000` | same | `maxAge` = 2592000 |
| 8 | `secure` depends on NODE_ENV | set `process.env.NODE_ENV="production"` → expect true; `.test`/`development` → false | pin both branches |
| 9 | Empty `?token=` (present but empty) | `?token=` | NOT auth_failed (truthy check `if (!token)`) — an empty string is falsy so → auth_failed. Assert 302 to signin |

### signout (POST)

| # | Test | Expected |
|---|------|----------|
| 10 | Returns JSON `{ ok: true }` | status 200; body `{ "ok": true }`; `content-type` includes `application/json` |
| 11 | Deletes `nexus-session` cookie | `response.cookies.delete` called with `"nexus-session"` |

## Pitfalls & Challenges

1. **`NextResponse.cookies` isn't a plain array** — `response.cookies` is a `ResponseCookies` object whose `.set()`/`.delete()` chain to update `Set-Cookie`. With a minimal mock you can just store call args separately (via `vi.fn()`) and assert on those rather than trying to parse `Set-Cookie` headers — simpler and more robust than asserting the serialized header.

2. **`location` header value**: `NextResponse.redirect(new URL("/projects", request.url))` produces an **absolute** URL (`http://localhost/projects`). Assert on the full URL or use `new URL(loc).pathname === "/projects"`. Don't assert a bare relative path unless you know Next normalizes it.

3. **`if (!token)` treats `""` as missing.** An explicit `?token=` yields empty string → auth_failed (case 9). And `?token=0` would be truthy (string "0") → success. These edge cases pin the truthiness semantics.

4. **`process.env.NODE_ENV` is often `"test"` under vitest, not `"production"`.** For case 8, explicitly `vi.stubEnv("NODE_ENV", "production")` then restore. Vitest sets `NODE_ENV=test` by default; don't assume.

5. **Importing the route module pulls in `next/server`.** Vitest resolves it as a normal JS module (it exports `NextResponse` etc.), but the Next runtime-specific classes may behave unexpectedly outside a server context. The `vi.mock("next/server")` shim above sidesteps all of it — strongly recommended for determinism.

6. **These handlers don't use `@/lib/...` imports** — they're self-contained. That keeps the mock surface tiny (just `next/server`), making them the 2nd easiest web file to test after `utils.ts`.

## Suggested File

`apps/web/app/api/auth/__tests__/routes.test.ts`
