# Nexus — TanStack Query Adoption Audit

An audit of the web frontend's data-fetching and API patterns, identifying every part that bypasses TanStack Query (`@tanstack/react-query`) or does not use its full potential.

**Scope:** `apps/web` (Next.js 16 App Router, React 19, TypeScript).

**Package versions:** `@tanstack/react-query` `^5.102.8`, `@tanstack/react-query-devtools` `^5.102.8`.

---

## 1. Executive Summary

The Nexus frontend is **already well-adopted to TanStack Query**. There is no Redux, Zustand, Jotai, or MobX, and no SWR/GraphQL. Five dedicated hooks (`use-projects.ts`, `use-lists.ts`, `use-resources.ts`, `use-favorites.ts`, `use-user-metrics.ts`) provide a clean abstraction over an axios client (`apiClient`), and `providers.tsx` wraps the app in `QueryClientProvider` with devtools.

However, there are **four concrete gaps** where TanStack Query is either bypassed entirely or under-utilized, plus a set of **unused library features** that could improve caching and UX.

### Gap summary

| # | Priority | File | Issue |
| --- | --- | --- | --- |
| 1 | HIGH | `components/pdf-viewer.tsx` | Manual `fetch()` + `useState`/`useEffect` for PDF blob with hand-rolled loading/error/cleanup |
| 2 | MEDIUM | `components/resources/create-resource-dialog.tsx` | Manual `isUploading`/`error` state and raw `fetch()` for file upload, bypassing mutations |
| 3 | LOW | `app/(dashboard)/favorites/page.tsx` | Duplicate query key `"favoritesPage"` for data already cached under `"favorites"` |
| 4 | LOW | `components/resource-page.tsx` | `useEffect` fire-and-forget `markOpened` side effect outside any mutation |

---

## 2. Data-Fetching Architecture Overview

The frontend uses a 3-tier fetching architecture:

1. **Client components/hooks** use `apiClient` (a typed wrapper in `lib/api-client.ts`) via TanStack Query.
2. **`apiClient`** delegates to a shared axios instance (`lib/axios.ts`) that targets `/api/v1`.
3. **Next.js API Route Handlers** (`app/api/v1/*/route.ts`) act as a BFF (Backend-For-Frontend) proxy, using native `fetch()` to forward requests to the Fastify backend at `API_URL`.

```text
Component/Hook
    │  (apiClient: axios → /api/v1)
    ▼
Next.js Route Handler  app/api/v1/*/route.ts   (native fetch, auth + JWT)
    │
    ▼
Fastify backend  API_URL
```

No GraphQL, SWR, XMLHttpRequest, WebSocket, or sendBeacon patterns exist.

---

## 3. Gaps in Detail

### 3.1 `components/pdf-viewer.tsx` — Manual PDF blob fetching (HIGH)

File: `apps/web/components/pdf-viewer.tsx`

**Lines:** state at 43-45, effect at 52-89.

**Pattern:** `useState` + `useEffect` + raw `fetch()` to download a PDF blob, manually managing loading, error, and data.

- `blobUrl` (line 43) — the fetched data.
- `isLoadingPdf` (line 44) — manual loading state.
- `pdfError` (line 45) — manual error state.
- The effect (52-89) fetches the PDF URL, converts it to a blob, creates an object URL via `URL.createObjectURL()`, and manages cleanup with `URL.revokeObjectURL()`. An `isActive` flag prevents state updates on unmounted components.

**Replaceable by TanStack Query?** Yes — strongly recommended. This is the classic "fetch + loading + error" pattern that `useQuery` was designed for. A `useQuery` with a custom `queryFn` returning the blob URL would replace three state variables and the manual `isActive` cleanup. Use `staleTime: Infinity` to prevent re-fetching, and `gcTime` to handle `URL.revokeObjectURL()` cleanup. A custom `usePdfBlob(url)` hook wrapping `useQuery` would encapsulate this cleanly.

---

### 3.2 `components/resources/create-resource-dialog.tsx` — Manual upload orchestration (MEDIUM)

File: `apps/web/components/resources/create-resource-dialog.tsx`

**Lines:** state at 78-79, submit handler at 107-182.

**Pattern:** `useState` for `isUploading` and `error`, plus a raw `fetch()` PUT for file upload inside an async submit handler.

- `isUploading` (line 78) — manual loading state.
- `error` (line 79) — manual error state.
- The submit flow (107-182) first calls `createResource()` (a TanStack `useMutation`), then does `fetch(created.uploadUri, { method: "PUT", body: file })` for the file upload (line 138), then calls `apiClient.resources.completeUpload()` directly (line 149) — bypassing the mutation layer. Error handling is entirely manual with try/catch and `setError`.

**Replaceable by TanStack Query?** Partially — recommended to improve. Resource creation already uses `useCreateResource()`, but the file upload + `completeUpload` steps bypass it. Suggested refactors:

1. Move the full create + upload + complete flow into `useCreateResource`'s `mutationFn`, or
2. Create a dedicated `useUploadFile` mutation wrapping the `fetch` PUT and `completeUpload`.

Either approach lets `isPending` and `error` from TanStack replace the manual `isUploading`/`error` state (lines 78-79), giving automatic status tracking and consistent error handling.

---

### 3.3 `app/(dashboard)/favorites/page.tsx` — Duplicate favorites query (LOW)

File: `apps/web/app/(dashboard)/favorites/page.tsx`

**Line:** 19-22.

**Pattern:** A `useQuery` with `queryKey: ["favoritesPage"]` that calls the same endpoint already queried by the `use-favorites.ts` hook under `queryKey: ["favorites"]`.

```ts
// favorites/page.tsx
useQuery({ queryKey: ["favoritesPage"], queryFn: () => apiClient.user.favorites() })

// hooks/use-favorites.ts
useQuery({ queryKey: ["favorites"], queryFn: () => apiClient.user.favorites() })
```

Both call `apiClient.user.favorites()` but with different query keys, creating two independent cache entries and potentially two network requests.

**Fix:** Share the `["favorites"]` query key (or just use the `useFavorites()` hook directly) so the cache is shared with the favorites toggle in `use-favorites.ts`.

---

### 3.4 `components/resource-page.tsx` — Fire-and-forget `markOpened` (LOW)

File: `apps/web/components/resource-page.tsx`

**Lines:** 72-78.

**Pattern:** A `useEffect` calls `apiClient.resources.markOpened(resourceId)` on mount, with errors swallowed by `console.error`.

```ts
useEffect(() => {
  if (resourceId) {
    apiClient.resources.markOpened(resourceId).catch((err) => {
      console.error("Failed to mark resource as opened:", err);
    });
  }
}, [resourceId]);
```

**Replaceable by TanStack Query?** Yes — wrap it in a `useMutation` with `mutationFn: () => apiClient.resources.markOpened(resourceId)`. This adds retry-on-failure, status tracking, and consistency with the rest of the codebase's mutation patterns.

---

## 4. TanStack Query Features NOT Used (Under-utilization)

The library is used at its baseline; these features are absent anywhere in the codebase:

| Feature | Impact of absence |
| --- | --- |
| `useInfiniteQuery` | No paginated / infinite-scroll lists |
| `prefetchQuery` / `usePrefetchQuery` | No data prefetching on hover or route transition |
| `select` (data transformation) | No cached derived/shaped data — transform work is repeated per render |
| `keepPreviousData` / `placeholderData` | The search page drops to a loading state on every new query instead of showing previous results |
| `refetchOnWindowFocus` | Data can go stale when returning to the tab |
| `gcTime` tuning | Global default is used; aggressive gc can evict blob data or cross-page caches |
| Optimistic updates | Implemented only in `use-favorites.ts`; all other mutations wait on a full invalidation roundtrip |
| `onSuccess` / `onError` / `onSettled` on queries | Query-level error handling is inconsistent across pages (only mutation callbacks are used) |

---

## 5. Global Query Client Configuration

File: `apps/web/components/providers.tsx`

- `QueryClient` created lazily in `useState`.
- `defaultOptions.queries.staleTime`: `1000 * 60 * 5` (5 minutes).
- `defaultOptions.queries.retry`: custom function — returns `false` on HTTP 401; otherwise retries up to 1 time (`failureCount < 1`).
- Wraps the app in `<QueryClientProvider>` and renders `<ReactQueryDevtools>`.

---

## 6. Query Key Map

| Query Key | Defined In | Consumed In |
| --- | --- | --- |
| `["projects"]` | `hooks/use-projects.ts` | `dashboard.tsx`, `projects/page.tsx`, `create-project-dialog.tsx`, `create-list-dialog.tsx`, `app-shell.tsx` |
| `["projects", id]` | `hooks/use-projects.ts` | `projects/[projectId]/page.tsx`, `resource-page.tsx` |
| `["lists", projectId]` | `hooks/use-lists.ts` | `project-page.tsx`, `create-resource-dialog.tsx`, `edit-resource-dialog.tsx`, `sidebar-project.tsx` |
| `["lists", projectId, listId]` | `hooks/use-lists.ts` | `search/page.tsx`, `lists/[listId]/page.tsx`, `resource-page.tsx` |
| `["resources", projectId, listId]` | `hooks/use-resources.ts` | `list-page.tsx` |
| `["resources", projectId, listId, resourceId]` | `hooks/use-resources.ts` | `resource-page.tsx` |
| `["resources"]` (broad) | — (invalidated) | Invalidated by update/delete/complete-upload mutations |
| `["favorites"]` | `hooks/use-favorites.ts` | `resource-page.tsx` (via `useFavorites`) |
| `["favoritesPage"]` | `favorites/page.tsx` | `favorites/page.tsx` only — **duplicate of `["favorites"]` (see 3.3)** |
| `["recentResources"]` | `dashboard.tsx`, `recent/page.tsx` | Shared between both files |
| `["search", query]` | `search/page.tsx` | `search/page.tsx` only |
| `["user-metrics"]` | `hooks/use-user-metrics.ts` | Settings/profile modal |

---

## 7. Inventory of All API / Data-Fetching Call Sites

### 7.1 Axios infrastructure (`lib/`)

**`apps/web/lib/axios.ts`**
- `import axios from "axios"` (line 7).
- `api = axios.create(...)` (line 16) — shared instance, `baseURL: "/api/v1"`.
- Response interceptor (line 24) — error handling and 401 sign-out.

**`apps/web/lib/api-client.ts`** — typed endpoint wrapper (~35 call sites):

| Endpoint | Method |
| --- | --- |
| `/projects` (list / create) | GET / POST |
| `/projects/:id` (get / update / delete) | GET / PATCH / DELETE |
| `/projects/:projectId/lists` (list / create) | GET / POST |
| `/projects/:projectId/lists/:listId` (get / update / delete) | GET / PATCH / DELETE |
| `/projects/:projectId/lists/reorder` | PATCH |
| `/projects/:projectId/lists/:listId/resources` (list / create) | GET / POST |
| `/resources/:resourceId` (get / update / delete) | GET / PATCH / DELETE |
| `/resources/:resourceId/upload/complete` | POST |
| `/resources/:resourceId/favorite` | PUT |
| `/resources/:resourceId/open` | POST |
| `/favorites` | GET |
| `/recent` | GET |
| `/metrics` | GET |
| `/search?q=` | GET |
| `/search/suggestions?q=` | GET |

### 7.2 Dedicated TanStack Query hooks (`hooks/`)

| Hook file | Features | Covers |
| --- | --- | --- |
| `hooks/use-projects.ts` | `useQuery`, `useMutation`, `useQueryClient` | 5 hooks (project CRUD) |
| `hooks/use-lists.ts` | `useQuery`, `useMutation`, `useQueryClient` | 6 hooks (list CRUD + reorder) |
| `hooks/use-resources.ts` | `useQuery`, `useMutation`, `useQueryClient` | 5 hooks (resource CRUD + complete-upload) |
| `hooks/use-favorites.ts` | `useQuery`, `useMutation`, `useQueryClient` + **optimistic updates** | favorites query + toggle |
| `hooks/use-user-metrics.ts` | `useSuspenseQuery` | user metrics |

### 7.3 Direct `apiClient` calls in components/pages

| File | Line | Pattern |
| --- | --- | --- |
| `components/dashboard.tsx` | 43 | `useQuery` for recent resources |
| `app/(dashboard)/search/page.tsx` | 69 | `useQuery` for search |
| `app/(dashboard)/recent/page.tsx` | 20 | `useQuery` for recent (shared key with dashboard) |
| `app/(dashboard)/favorites/page.tsx` | 19 | `useQuery` — **duplicate key, see 3.3** |
| `components/resource-page.tsx` | 74 | raw `apiClient.resources.markOpened` in `useEffect` — **see 3.4** |
| `components/resources/create-resource-dialog.tsx` | 138, 149 | raw `fetch` PUT + `completeUpload` — **see 3.2** |

### 7.4 Direct `fetch()` calls outside route handlers

| File | Line | Purpose |
| --- | --- | --- |
| `auth.ts` | 59 | Server-side: sync Google refresh token after OAuth (NextAuth JWT callback). **Not applicable** — server-side, TanStack cannot run here. |
| `components/pdf-viewer.tsx` | 66 | Client-side: download PDF as blob — **see 3.1**. |

### 7.5 Next.js API Route Handlers (BFF proxy layer)

All of `apps/web/app/api/v1/**` use native `fetch()` server-side to proxy to the Fastify backend. This is **correct and appropriate** — the BFF layer is server-side only.

| Route handler | Methods proxied |
| --- | --- |
| `api/v1/projects/route.ts` | GET, POST |
| `api/v1/projects/[projectId]/route.ts` | GET, PATCH, DELETE |
| `api/v1/projects/[projectId]/lists/route.ts` | GET, POST |
| `api/v1/projects/[projectId]/lists/[listId]/route.ts` | GET, PATCH, DELETE |
| `api/v1/projects/[projectId]/lists/[listId]/resources/route.ts` | GET, POST |
| `api/v1/projects/[projectId]/lists/reorder/route.ts` | PUT |
| `api/v1/resources/[resourceId]/route.ts` | GET, PATCH, DELETE |
| `api/v1/resources/[resourceId]/open/route.ts` | POST |
| `api/v1/resources/[resourceId]/upload/complete/route.ts` | POST |
| `api/v1/resources/[resourceId]/favorite/route.ts` | PUT |
| `api/v1/resources/[resourceId]/file/route.ts` | GET (binary stream) |
| `api/v1/favorites/route.ts` | GET |
| `api/v1/recent/route.ts` | GET |
| `api/v1/metrics/route.ts` | GET |
| `api/v1/search/route.ts` | GET |
| `api/v1/search/suggestions/route.ts` | GET |

Non-API handlers (`api/auth/[...nextauth]/route.ts`, `api/v1/test-token/route.ts`) make no outbound calls relevant to this audit.

---

## 8. Files Confirmed Using TanStack Query Correctly

| File | Notes |
| --- | --- |
| `hooks/use-projects.ts` | `useQuery` + `useMutation` + proper cache invalidation |
| `hooks/use-lists.ts` | `useQuery` + `useMutation` + proper cache invalidation |
| `hooks/use-resources.ts` | `useQuery` + `useMutation` + proper cache invalidation |
| `hooks/use-favorites.ts` | `useQuery` + `useMutation` + **optimistic updates with rollback** (most advanced consumer) |
| `hooks/use-user-metrics.ts` | `useSuspenseQuery` (only Suspense usage) |
| `components/providers.tsx` | `QueryClientProvider` + devtools + global defaults |
| `components/dashboard.tsx` | `useProjects()` + inline `useQuery` for recent |
| `components/project-page.tsx` | `useLists()` + `useReorderLists()` |
| `components/list-page.tsx` | `useResources()` |
| `components/resource-page.tsx` | `useProject()`, `useList()`, `useResource()` (aside from 3.4) |
| `components/layout/app-shell.tsx` | `useProjects()` for sidebar |
| `components/layout/sidebar-project.tsx` | `useLists()` |
| `components/projects/create-project-dialog.tsx` | `useCreateProject()` (`mutateAsync`/`isPending`) |
| `components/lists/create-list-dialog.tsx` | `useCreateList()` |
| `components/lists/edit-list-dialog.tsx` | `useUpdateList()`, `useDeleteList()` |
| `components/resources/edit-resource-dialog.tsx` | `useUpdateResource()`, `useDeleteResource()` |
| `components/layout/profile-modal.tsx` | `useUserMetrics()` with Suspense |
| `app/(dashboard)/projects/page.tsx` | `useProjects()`, `useLists()` |
| `app/(dashboard)/projects/[projectId]/page.tsx` | `useProject()` |
| `app/(dashboard)/projects/[projectId]/lists/[listId]/page.tsx` | `useProject()`, `useList()` |
| `app/(dashboard)/recent/page.tsx` | `useQuery` for recent (shared key) |
| `app/(dashboard)/search/page.tsx` | `useQuery` for search + `useProject()`/`useList()` for breadcrumbs |

---

## 9. Not Applicable (Correctly Raw)

| File | Reason |
| --- | --- |
| `auth.ts` (line 59) | Server-side NextAuth JWT callback — TanStack is client-side and cannot run here. |
| `app/api/v1/**` route handlers | BFF proxy layer — server-side only; native `fetch` is the correct tool. |

---

## 10. Recommended Action Plan

| Priority | Task | Files |
| --- | --- | --- |
| HIGH | Extract PDF blob fetching into a `usePdfBlob(url)` hook backed by `useQuery` (`staleTime: Infinity`, `gcTime` for blob cleanup); replace `blobUrl`/`isLoadingPdf`/`pdfError` state. | `components/pdf-viewer.tsx` |
| MEDIUM | Move the file-upload + complete flow into a mutation (`useCreateResource` `mutationFn` or a new `useUploadFile`); replace `isUploading`/`error` with `isPending`/`error`. | `components/resources/create-resource-dialog.tsx`, `hooks/use-resources.ts` |
| LOW | Share the `["favorites"]` query key (or use `useFavorites()` directly) on the favorites page. | `app/(dashboard)/favorites/page.tsx` |
| LOW | Wrap `markOpened` in a `useMutation` for retry/consistency. | `components/resource-page.tsx` |
| OPTIONAL | Adopt `keepPreviousData`/`placeholderData` on search; consider `useInfiniteQuery` for long lists; add `prefetchQuery` on hover; tune `gcTime`; add optimistic updates to other mutations. | `app/(dashboard)/search/page.tsx`, `hooks/*` |

---

*Generated from a full grep/explore audit of `apps/web`. Line numbers refer to the state of the code at the time of this audit.*
