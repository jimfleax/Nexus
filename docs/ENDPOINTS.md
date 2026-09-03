# Nexus — Routes and Endpoints Map

Research output mapping every page, feature, and data entity to the routes that serve them. Current state: no backend exists; all reads come from the mock module `lib/data/workspace.ts` and writes go to `localStorage` via `components/workspace-provider.tsx`.

## Data model

```text
Project → KnowledgeList (position-ordered) → Resource
```

- `Project` — id, name, description, icon, createdAt, updatedAt
- `KnowledgeList` — id, projectId, name, description, position, createdAt, updatedAt
- `Resource` — id, projectId, listId, title, type, mimeType?, description?, content?, url?, tags[], isFavorite, createdAt, updatedAt, readingTime?
- `ResourceType` — markdown | pdf | image | ebook | text | url | note | chat

## Current UI routes

| Route | Page | Data consumed |
| --- | --- | --- |
| `/` | Dashboard (`components/dashboard.tsx`) | All projects, first 5 resources (mock "recent") |
| `/projects` | Project index (`app/projects/page.tsx`) | All projects + list count per project |
| `/projects/:projectId` | Project overview (`components/project-page.tsx`) | 1 project, its lists, resource count per list |
| `/projects/:projectId/lists/:listId` | List view (`components/list-page.tsx`) | 1 list + its resources |
| `/projects/:projectId/lists/:listId/resources/:resourceId` | Resource reader (`components/resource-page.tsx` + `resource-viewer.tsx`) | 1 resource + project/list breadcrumb |
| `/search?q=` | Search (`app/search/page.tsx`) | Title/description/content/tags grep across all resources |
| `/favorites` | Favorites (`app/favorites/page.tsx`) | `useFavorites()` in-memory Set ∩ resources |
| `/recent` | Recent (`app/recent/page.tsx`) | All resources (static mock ordering) |
| `/settings` | Reader settings (`app/settings/page.tsx`) | `localStorage` only — no backend involvement |

## Required backend endpoints

### Reads — replace `getProject`, `getListsForProject`, `getResource`, …

| # | Endpoint | Serves | Shape |
| --- | --- | --- | --- |
| 1 | `GET /api/projects` | Dashboard, projects page, sidebar, dialog project-selects | `Project[]` |
| 2 | `GET /api/projects/:projectId` | Project page, breadcrumb 404 resolution | `Project` |
| 3 | `GET /api/projects/:projectId/lists` | Sidebar expansion, project page, resource-dialog list-select | `KnowledgeList[]` sorted by `position` |
| 4 | `GET /api/projects/:projectId/lists/:listId` | List page | `KnowledgeList` |
| 5 | `GET /api/projects/:projectId/lists/:listId/resources` | List page, per-list resource counts | `Resource[]` |
| 6 | `GET /api/projects/:projectId/lists/:listId/resources/:resourceId` | Resource reader | `Resource` incl. `content` |
| 7 | `GET /api/resources/:resourceId` | Convenience lookup (reader, favorites card) | `Resource` |

### Writes — wired in UI today, currently localStorage-only

| # | Endpoint | Triggered by |
| --- | --- | --- |
| 8 | `POST /api/projects` | New Project dialog → redirects to `/projects/:id` |
| 9 | `POST /api/projects/:projectId/lists` | New List dialog |
| 10 | `POST /api/projects/:projectId/lists/:listId/resources` | Add Resource dialog |
| 11 | `PUT /api/projects/:projectId/lists/:listId/resources/:resourceId/favorite` | Star toggle (`resource-card`, `resource-page`); `isFavorite` already on `Resource` |
| 12 | `POST /api/projects/:projectId/lists/:listId/resources/:resourceId/open` | Real "recent" tracking (dashboard list, `/recent`) |

### Reads implied by UI, no source today

| # | Endpoint | Serves |
| --- | --- | --- |
| 13 | `GET /api/search?q=` | `/search` full-text over title, description, content, tags + snippet |
| 14 | `GET /api/resources/recent` | True recently-opened list |
| 15 | `GET /api/resources/favorites` | `/favorites` with server-persisted favorites |

### Content and assets (viewers already expect URLs)

| # | Endpoint | Serves |
| --- | --- | --- |
| 16 | `GET /api/resources/:resourceId/content` | Raw `content` for text/markdown/chat/note/ebook |
| 17 | `GET /api/resources/:resourceId/file` | Streamed blob (PDF/image); `pdf-viewer.tsx` / `image-viewer.tsx` use `url` today |
| 18 | `POST /api/resources/:resourceId/file` | Upload for pdf/image/ebook (dialog currently accepts URLs only) |

### Needed to close the data boundary (UI placeholders)

| # | Endpoint | Serves |
| --- | --- | --- |
| 19 | `PUT /api/projects/:id`, `.../lists/:id`, `.../resources/:id` | Editing — `createdAt/updatedAt` exist, no edit UI yet |
| 20 | `DELETE /api/projects/:id` (+ descendants) | Destructive ops — handoff mandates confirmation dialogue |
| 21 | `PUT /api/projects/:id/lists` (reorder) | `Sort` button on list page; `position` field on `KnowledgeList` |
| 22 | `GET /api/search/suggestions?q=` | Sidebar `⌘K` search autocomplete |

## Integration notes

- Every read/write above maps 1:1 onto the selectors and mutators in `components/workspace-provider.tsx` (`getProject`, `getListsForProject`, `getResourcesForList`, `getResource`, `createProject`, `createList`, `createResource`) plus `useFavorites()`.
- Prefer **server actions** (`'use server'`) over REST. All data access originates from interactive components; server actions avoid a serialization layer.
- Only #13, #14, and #15 truly need a backend today; the rest are mechanical relocations of mock selectors.
- `settings` and sidebar-collapse remain `localStorage` — intentionally no backend.
- Replacing mock data must preserve the `Project` / `KnowledgeList` / `Resource` types (`lib/types/index.ts`) or introduce a compatibility layer so route and UI components do not need a broad rewrite (per `docs/AI_AGENT_HANDOFF.md`).