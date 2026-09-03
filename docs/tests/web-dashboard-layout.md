# Test Plan: Dashboard Layout Session Guard (`app/(dashboard)/layout.tsx`)

## Source Under Test

`apps/web/app/(dashboard)/layout.tsx` — `getSessionUser()` (lines 18–47) and `DashboardLayout` (lines 54–70).

## Why It Needs Tests

- This is the **server-side auth guard** for the entire dashboard. Any regression means authenticated users get bounced to `/signin` or unauthenticated users leak in.
- It uses `cookies()` (next/headers), `jwtVerify` (jose), `redirect` (next/navigation) — all of which need mocking.
- The multi-branch logic (`no cookie`, `no secret`, `invalid JWT`, `no sub`) is exactly the kind of thing that silently breaks.

## Tooling Prerequisite (P4 / NEW)

Vitest required (per `web-utils.md`). For this test you must mock THREE external modules:

```ts
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("REDIRECT"); }) }));
vi.mock("jose", () => ({ jwtVerify: vi.fn() }));
```

Import the mocked fns:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import DashboardLayout, { getSessionUser } from "../app/(dashboard)/layout";
```

Because `redirect()` throws (that's how Next signals a redirect), you can assert it was called by `expect(redirect).toHaveBeenCalledWith("/signin")` — the throw just stops render.

## Setup

```ts
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_SECRET", "test-secret-12345678901234567890");
});
```

Helper to shape the cookie store:

```ts
const mockCookie = (value: string | undefined) =>
  (cookies as any).mockResolvedValue({
    get: (name: string) => name === "nexus-session" && value ? { name, value } : undefined,
  });
```

Note `cookies()` is `async` (returns a Promise in Next 15+/16), so `.mockResolvedValue`.

## Test Cases

### getSessionUser()

| # | Test | Mock | Expected |
|---|------|------|----------|
| 1 | No cookie → null | `mockCookie(undefined)` | returns `null` |
| 2 | `AUTH_SECRET` unset → null | `vi.stubEnv("AUTH_SECRET", "")` | returns `null` (no jwtVerify call) |
| 3 | Valid token + sub → user payload | `cookies` returns token; `jwtVerify` resolves `{ payload: { sub:"u1", name:"N", email:"e@x", image:"img" } }` | returns `{ id:"u1", name:"N", email:"e@x", image:"img" }` |
| 4 | Payload WITHOUT `sub` → null | `jwtVerify` resolves `{ payload: { name:"N" } }` | returns `null` |
| 5 | Payload with `sub` but missing name/email/image → nulled fields | `jwtVerify` resolves `{ payload: { sub:"u1" } }` | returns `{ id:"u1", name:null, email:null, image:null }` |
| 6 | `jwtVerify` throws (invalid JWT) → null | `jwtVerify` rejects | returns `null` |
| 7 | `jwtVerify` verifies with `clockTolerance: 30` | spy on `jwtVerify` | assert called with `(token, key, { clockTolerance: 30 })` — pin the 30s skew |
| 8 | No cookie stored value (empty) → null | token = `""` | returns `null` |

### DashboardLayout

| # | Test | Mock | Expected |
|---|------|------|----------|
| 9 | No user → redirect to /signin | `getSessionUser` null path (no cookie) | `redirect` called with `"/signin"`; render throws → nothing else |
| 10 | Valid user → renders Providers + AppShell | jwtVerify resolves valid payload | does NOT call redirect; output contains `Providers`/`AppShell` (string match on rendered tree) |
| 11 | `getSessionUser` returns user, layout passes it to AppShell | valid payload | `AppShell` receives `user={...}` (assert via the rendered component/children) |

## Pitfalls & Challenges

1. **`cookies()` is async in Next 15/16.** It returns `Promise<ReadonlyRequestCookies>`, so the mock must use `.mockResolvedValue(...)`, not `.mockReturnValue(...)`. If you mock it synchronously, `await cookies()` never resolves and the test hangs.

2. **The default export `DashboardLayout` is a React Server Component** (async function returning JSX). Rendering a true server component to its React element tree is awkward. **Recommendation:** export `getSessionUser` separately for the unit branches (cases 1–8), and for `DashboardLayout` only test the *control flow* — i.e. that `redirect` is called (case 9) and NOT called with a valid user (case 10), by actually `await`ing the component function `await DashboardLayout({ children: <div /> })` and asserting it doesn't throw / and checking the returned element exists. Don't try to fully render `Providers`/`AppShell` (they pull in heavy client deps).

3. **`redirect` throws.** Any test that expects a redirect MUST treat the control flow as an exception. Wrap in `try/catch` or just assert `expect(redirect).toHaveBeenCalledWith("/signin")` before the throw propagates. If you `await` the layout and it throws "REDIRECT", catch it — that's the expected signal.

4. **Importing the layout file pulls the real `Providers`/`AppShell`/`@/` path aliases.** These may import shadcn UI, TanStack, sonner, etc. — heavy. If imports fail in vitest, either mock `@/components/layout/app-shell` and `@/components/providers` to trivial stubs, or (cleaner) only import `getSessionUser` and test the layout's redirect logic via a lighter re-exported helper. Confirm the alias resolution (`tsconfig` path `@/*` → `./*`) is handled by vitest config (`resolve.alias`) or a `vite-tsconfig-paths` plugin.

5. **`payload.sub` is the JWT subject → `user.id`.** The layout maps `sub → id`. Assert that mapping explicitly (case 3/5).

6. **The `clockTolerance: 30` gives 30s skew tolerance** — worth pinning in a test (case 7) so someone doesn't remove it silently. Pass an exact `TextEncoder().encode(AUTH_SECRET)` as the expected key arg.

7. **Server-only APIs (`cookies`, `redirect`) throw if called in a non-server runtime.** Mocking `next/headers` and `next/navigation` fully sidesteps this — never let the real ones execute in vitest.

## Suggested File

`apps/web/app/(dashboard)/__tests__/layout.test.ts`
