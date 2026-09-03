# Test Plan: Axios Instance + Error Interceptor (`apps/web/lib/axios.ts`) + apiClient

## Source Under Test

- `apps/web/lib/axios.ts` — the shared `api` axios instance + its response error interceptor (lines 22–45).
- `apps/web/lib/api-client.ts` — `apiClient` grouped methods (projects, lists, resources, user, search).

## Why It Needs Tests

- The **401 auto-signout** behavior is security-critical: on any 401 the client toasts "Session expired", POSTs `/api/auth/signout`, and redirects to `/signin`. A regression here could lock users out or fail to log out.
- The **404 suppression** (`else if (status !== 404)` → no toast) and the generic error-message extraction are behavioral contracts worth pinning.
- The interceptor is pure on `error.response` — easily testable with a mocked axios `AxiosError`-shaped object.
- `apiClient` is a thin typed wrapper over `api`; its per-method URL/method verification catches path drift between the web client and backend routes.

## Tooling Prerequisite (P4 / NEW)

Vitest required. To test axios's interceptor you don't need real HTTP — you create an `AxiosError`-shaped error and dispatch it through the registered interceptor. Two approaches:

**A. Test the interceptor directly (recommended, no network):**
```ts
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { toast } from "sonner";
import { api } from "./axios";

// Grab the registered error handler
const errorInterceptor = (api.interceptors.response as any).handlers[0].rejected;
```
Then call `errorInterceptor(errorObject)` with hand-built error objects, and assert toast/fetch behavior.

**B. Mock the underlying adapter** so `api.get` rejects, and assert via a wrapped promise:
```ts
(api.defaults.adapter as any) = async (config) => Promise.reject(makeAxiosError("boom", 500));
await expect(api.get("/x")).rejects.toThrow();
await waitFor(() => expect(toast.error).toHaveBeenCalled());
```
A is cleaner and faster; B is closer to integration. Start with A.

## AxiosError fixture helper

```ts
function makeError(status: number | undefined, data: unknown, message = "boom") {
  return {
    isAxiosError: true,
    message,
    response: status === undefined ? undefined : { status, data, statusText: "Error", headers: {}, config: {} },
  };
}
// Note: interceptor uses error.response?.data?.error, error.message, error.response?.status — so this shape suffices.
```

## Test Cases

### Interceptor — message selection

| # | Test | Error | Assertion |
|---|------|-------|-----------|
| 1 | Uses `response.data.error` when present | status 500, `data: { error: "Custom!" }` | `toast.error("Custom!")` → wait, see pitfall: a non-401/404 with a status DOES toast. Fix: this should be status e.g. 422. Use `data: { error: "Custom" }` | `toast.error` called with `"Custom"` |
| 2 | Falls back to `error.message` when no data.error | status 422, `data: {}`, `message: "Network Error"` | `toast.error("Network Error")` |
| 3 | **404 is silent** — no toast | status 404, `data: { error: "not found" }` | `toast.error` NOT called |
| 4 | **401 is silent for the message toast** (handled by the signout branch) | status 401 | `toast.error` NOT called with the message (only the "Session expired" toast may fire) |

### Interceptor — 401 signout flow

For 401 tests you must also mock `global.fetch`:

```ts
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
```

| # | Test | Error | Assertion |
|---|------|-------|-----------|
| 5 | 401 with `window` → toasts session-expired + signs out + redirects | status 401, `window` defined | `toast.error("Session expired. Please sign in again.")`; `fetch` called with `/api/auth/signout`, method `POST`; then `window.location.href === "/signin"` |
| 6 | 401 but signout res NOT ok → toasts "Failed to sign out", no redirect | `fetch` resolves `{ ok: false }` | `toast.error("Failed to sign out")`; `window.location.href` unchanged |
| 7 | 401 and signout fetch REJECTS → toasts "Failed to sign out" | `fetch` rejects | `toast.error("Failed to sign out")` |
| 8 | 401 with `window` undefined (SSR/preload) → no fetch, no toast | set `window` undefined | no `fetch` call, no toast (the `typeof window !== "undefined"` guard) |

### Interceptor — rejection propagation

| # | Test | Assertion |
|---|------|-----------|
| 9 | Always re-rejects the original error | call interceptor with any error | returns a rejected promise with the SAME error object |

### apiClient — URL + method contract (approach B, adapter-mocked)

| # | Method | Asserted `api` call |
|----|--------|--------------------|
| 10 | `apiClient.projects.list()` | `api.get("/projects")` |
| 11 | `apiClient.projects.get("p1")` | `api.get("/projects/p1")` |
| 12 | `apiClient.projects.create({name:"P"})` | `api.post("/projects", {name:"P"})` |
| 13 | `apiClient.lists.reorder("p1", {items})` | `api.patch("/projects/p1/lists/reorder", {items})` |
| 14 | `apiClient.resources.list("p1","l1")` | `api.get("/projects/p1/lists/l1/resources")` |
| 15 | `apiClient.resources.toggleFavorite("r1")` | `api.put("/resources/r1/favorite", {})` |
| 16 | `apiClient.resources.markOpened("r1")` | `api.post("/resources/r1/open", {})` |
| 17 | `apiClient.user.favorites()` | `api.get("/favorites")` |
| 18 | `apiClient.user.metrics()` | `api.get("/metrics")` |
| 19 | `apiClient.search.query("q")` | `api.get("/search", { params: { q: "q" } })` |
| 20 | `apiClient.search.suggestions("q")` | `api.get("/search/suggestions", { params: { q } })` |

To assert these URLs, spy on `api.get`/`api.post`/etc.:

```ts
const getSpy = vi.spyOn(api, "get").mockResolvedValue({ data: [] });
await apiClient.projects.list();
expect(getSpy).toHaveBeenCalledWith("/projects");
// IMPORTANT: restore — other tests share this instance
```

## Pitfalls & Challenges

1. **`apiClient` methods and the axios interceptor share the SAME singleton `api`.** If you mock `api.get` via `vi.spyOn(api, "get")` for URL tests, the interceptor also runs on rejected responses — but for URL tests you mock to **resolve**, so no interceptor path. Just `mockRestore()` any spy in `afterEach` so the shared instance isn't left dormant for other suites.

2. **The 401 "Session expired" toast fires, but the generic message toast is skipped** for 401 (the `if/else if` structure: 401 branch does its own toasting, the `else if (status !== 404)` branch handles other statuses). So for a 401 you should NOT see the raw message toast (case 4). Get the branch structure right — the `toast.error("Session expired...")` and `toast.error(message)` are mutually exclusive.

3. **`error.response?.data?.error`** — if data.error is undefined, falls to `error.message`. Test both present/absent. Also note the message may be `"An unexpected error occurred"` if `error.message` is also missing — worth one assertion (status 422, `data: {}`, no `message`).

4. **Order of operations on 401:** toast → `fetch("/api/auth/signout")` → `.then` checks `res.ok` → `window.location.href = "/signin"`. The redirect must be asserted AFTER the fetch promise resolves. In a sync interceptor test you must `await` a microtask / use `await waitFor` or `await vi.waitFor(...)` to let the `.then` run. vitest has `vi.waitFor` for this.

5. **`toast` from `sonner` (client-only) must be mocked** — importing it in a Node test env directly will pull browser code. `vi.mock("sonner", ...)`.

6. **`typeof window !== "undefined"` guard (case 8)** — in Node vitest, `window` is undefined by default. To test the "window present" branch (cases 5–7) you must `vi.stubGlobal("window", { location: { href: "" } })`. Restore in `afterEach` so other tests aren't polluted.

7. **apiClient is used by the hooks (P4 `web-hooks`) — keep these tests independent.** When you later test hooks, you'll mock `@/lib/api-client` entirely rather than the real one, so the axios tests here stand alone.

## Suggested Files

- `apps/web/lib/__tests__/axios.test.ts` (interceptor)
- `apps/web/lib/__tests__/api-client.test.ts` (URL/method contract)
