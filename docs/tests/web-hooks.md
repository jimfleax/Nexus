# Test Plan: TanStack Query Hooks (`apps/web/hooks/*`)

## Source Under Test

`apps/web/hooks/`:

- `use-projects.ts` — `useProjects`, `useProject(id)`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`
- `use-lists.ts`
- `use-resources.ts` — `useResources`, `useResource`, `useCreateResource`, `useUpdateResource`, `useDeleteResource`, `useMarkOpened`
- `use-favorites.ts`
- `use-user-metrics.ts`
- `use-info.ts`

## Why It Needs Tests

- Hooks encode the **cache-key scheme** (e.g. `["resources", projectId, listId]`) and the **invalidation** on mutations — the source of most "stale UI after create/update/delete" bugs.
- `enabled` flags (only fetch when IDs present) and query-key mismatches are exactly the silent regressions you want pinned.
- TanStack Query's `renderHook` gives full control, making these the most testable React code in the app.

## Tooling Prerequisite (P4 / NEW)

Vitest + **jsdom + @testing-library/react + @testing-library/react-hooks (or @testing-library/dom renderHook from RTL 14+)**. See `web-utils.md` for the base vitest install. Additional:

```bash
npm i -D vitest @testing-library/react @testing-library/dom jsdom @vitejs/plugin-react
```

vitest config needs:
```ts
test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"] }
// vitest.setup.ts: import "@testing-library/jest-dom"; (if asserting DOM)
```

React Query needs a `QueryClientProvider` wrapper:

```ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: any) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
```

Chain all hook tests through `renderHook(fn, { wrapper: makeWrapper() })` so no real network hits.

## Setup / Fixtures

Mock the api client entirely (do NOT import the real one — it carries the axios interceptor):

```ts
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    projects: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    lists: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), reorder: vi.fn() },
    resources: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), toggleFavorite: vi.fn(), markOpened: vi.fn() },
    user: { favorites: vi.fn(), recent: vi.fn(), metrics: vi.fn() },
    search: { query: vi.fn(), suggestions: vi.fn() },
  },
}));
import { apiClient } from "@/lib/api-client";
```

## Test Cases

### useProjects (queries)

| # | Test | Mock | Assertion |
|---|------|------|-----------|
| 1 | `useProjects` calls `apiClient.projects.list()` | `list` resolves `[p]` | fetched `["projects"]` key; data `[p]` |
| 2 | `useProject("p1")` key `["projects","p1"]`, enabled only when id | call with `"p1"` | keys `["projects","p1"]`; disabled when id falsy |

### useCreateProject (mutation + invalidation)

| # | Test | Assertion |
|---|------|-----------|
| 3 | `mutate({name})` calls `apiClient.projects.create({name})` | create called with input |
| 4 | On success invalidates `["projects"]` | after mutation resolves, query refetched (spy `list` called again, or invalidate spy) |
| 5 | `useUpdateProject` invalidates `["projects"]` AND `["projects", id]` | both invalidate calls |
| 6 | `useDeleteProject` invalidates `["projects"]` + removes `["projects", id]` | invalidate + removeQueries with id |

### useResources (query key + enablement)

| # | Test | Assertion |
|---|------|-----------|
| 7 | `useResources("p1","l1")` key `["resources","p1","l1"]`, disabled when missing id | `list("p1","l1")` called only when both present |
| 8 | `useResource("p1","l1","r1")` key `["resources","p1","l1","r1"]` | `get("r1")`; enabled only when resourceId |
| 9 | `useCreateResource` on success invalidates `["resources", projectId, listId]` AND `["resources"]` | both invalidate calls; `create` called with (projectId, listId, input) |
| 10 | `useUpdateResource` invalidates `["resources"]` | invalidate called; `update` with (resourceId, input) |
| 11 | `useDeleteResource` invalidates `["resources"]` + calls delete | invalidate + `delete(resourceId)` |
| 12 | `useMarkOpened` calls `markOpened(id)`, no invalidation | `markOpened(resourceId)` called; `invalidateQueries` NOT called |

### useFavorites / useUserMetrics / useInfo (spot checks)

| # | Test | Assertion |
|---|------|-----------|
| 13 | `useFavorites` queries `["favorites"]` | `user.favorites()` called once |
| 14 | `useUserMetrics` queries `["metrics"]` | `user.metrics()` called |
| 15 | `useInfo` queries `["info"]` | `info()` called (adjust to actual hook contract) |

## Pitfalls & Challenges

1. **`renderHook` + `waitFor` for async query resolution.** Query data arrives asynchronously. Assert `result.current.data` inside `await waitFor(() => expect(result.current.data).toEqual([p]))`. Don't assert immediately after `renderHook`.

2. **`retry: false` in the test QueryClient** — otherwise a rejected query retries and you get flaky/failing tests. Always set `defaultOptions.queries.retry = false` (and consider `gcTime: Infinity`).

3. **Invalidation assertions are about cache, not just UI.** `invalidateQueries` triggers a refetch of matching keys. The simplest robust assertion: spy on `apiClient.projects.list` (the queryFn) and assert it's called **twice** after a successful mutation (once for initial + once for invalidation refetch). Or spy on `queryClient.invalidateQueries` — but that's harder without injecting it. Prefer the refetch-count approach.

4. **`useUpdateProject` key shapes:** invalidation uses `["projects", variables.id]` — the SAME key as `useProject(id)` uses for its query. This is the contract: update must invalidate both the list and the single-project cache. Assert both.

5. **`enabled` flags:** `useResources` requires both projectId AND listId; `useResource`/`useProject` require their id. Test the disabled case (pass empty) and assert `queryFn` NOT called (check the fetch mock not invoked).

6. **These are the heaviest web tests** (jsdom + react + RQ renderer). Add them ONLY after `web-utils` + `web-axios` prove the vitest tooling. If `@vitejs/plugin-react` + jsdom isn't already configured, that's a non-trivial setup — budget time; it's the last P4 item for a reason.

7. **`useMarkOpened` has NO invalidation** (lines 105–109) — it just fires the call. Assert `invalidateQueries` is NOT called, pinning that "recent feed only refreshes on navigation" behavior.

8. **Each `use*` mutation wraps `apiClient` — mock all six method groups** or the import crashes. The `vi.mock` factory above mocks the whole `apiClient` object so any hook's import resolves.

## Suggested File

`apps/web/tests/hooks.test.ts` (or `apps/web/hooks/__tests__/use-projects.test.ts` etc., one per file to keep matches focused)
