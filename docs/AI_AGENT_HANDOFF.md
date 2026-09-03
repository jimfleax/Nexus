# Nexus — AI Agent Handoff

## Purpose and scope

Nexus is a frontend-first personal knowledge workspace. Its intended hierarchy is:

```text
Workspace → Projects → Lists → Resources
```

Projects are knowledge contexts (for example, `Web3`), Lists are collections inside a project (for example, `Tutorials`), and Resources are the items the user reads or saves. Files are only one resource type; the product is deliberately not framed as a file manager.

The current implementation is the first vertical slice only. It uses realistic mock data and covers:

- dashboard
- project, list, and resource navigation
- Markdown reading
- workspace search UI
- favorites
- responsive application shell
- reader preferences

Do not add authentication, a database, uploads, object storage, AI search, embeddings, or rich-text editing unless the user explicitly asks for them.

## Stack and commands

- Next.js 16, App Router, React 19, TypeScript, Tailwind CSS 4
- pnpm 11 (the `packageManager` field pins the expected version)
- shadcn/ui configured in `components.json` with the `base-nova` style
- Motion (`motion/react`) for restrained transitions
- Lucide React for icons

Run locally:

```bash
corepack enable
pnpm install
pnpm dev
```

Validation:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

The project has been validated with all three commands. This workspace currently is not a Git repository, so do not assume commits or branch history exist.

## Repository map

```text
app/
  page.tsx                                      Dashboard
  layout.tsx                                    Root fonts/providers/shell
  globals.css                                   Theme and reader typography variables
  favorites/page.tsx                            Cross-project favorites
  recent/page.tsx                               Mock recent resources
  search/page.tsx                               Mock full-workspace resource search
  settings/page.tsx                             Reader preferences
  projects/page.tsx                             Project index
  projects/[projectId]/page.tsx                 Project overview
  projects/[projectId]/lists/[listId]/page.tsx List overview
  projects/[projectId]/lists/[listId]/resources/[resourceId]/page.tsx
                                                Resource route
  loading.tsx, error.tsx, not-found.tsx         Root feedback states

components/
  layout/app-shell.tsx                          Sidebar, mobile sheet, top search, page transitions
  workspace-provider.tsx                        Favorites and persisted reader settings
  dashboard.tsx                                 Dashboard presentation
  project-page.tsx                              Project collections view
  list-page.tsx                                 Resource collection view
  resource-card.tsx                             Animated resource list item and favorite control
  resource-page.tsx                             Reader header, metadata, width choice
  resource-viewer.tsx                           Resource-type dispatch point
  markdown-viewer.tsx                           Lightweight Markdown renderer/copy code action
  ui/                                           shadcn generated primitives

lib/
  data/workspace.ts                             All mock projects, lists, resources, data selectors
  types/index.ts                                Project, KnowledgeList, Resource, ResourceType
  utils.ts                                      shadcn `cn` helper

docs/
  AI_AGENT_HANDOFF.md                           This document
```

## Data model and data boundary

`lib/types/index.ts` defines:

- `Project`
- `KnowledgeList` (called `List` conceptually; named differently to avoid the generic browser type)
- `Resource`
- `ResourceType`: `markdown | pdf | image | ebook | text | url | note | chat`

`lib/data/workspace.ts` is the only mock-data source. It exports `projects`, `lists`, `resources`, plus selectors:

- `getProject(id)`
- `getListsForProject(projectId)`
- `getList(projectId, listId)`
- `getResourcesForList(projectId, listId)`
- `getResource(projectId, listId, resourceId)`

When persistence is requested, replace these selectors with a data-access layer/server actions rather than placing database calls inside presentation components. Preserve the existing types or introduce a compatibility layer so route and UI components do not need a broad rewrite.

## Routes and current behavior

| Route | Behavior |
| --- | --- |
| `/` | Dashboard with projects and mock recently opened resources. |
| `/projects` | All projects. |
| `/projects/web3` | Web3 collections. Other project IDs work if they exist in mock data. |
| `/projects/[projectId]/lists/[listId]` | Resources belonging to a list. |
| `/projects/[projectId]/lists/[listId]/resources/[resourceId]` | Type-aware resource view. Markdown is rendered; other types have a deliberately explicit placeholder. |
| `/search?q=ethereum` | Searches mock resource title, description, and tags; presents project/list provenance. |
| `/favorites` | Client-side favorites across projects. |
| `/recent` | Mock recent resource list. |
| `/settings` | Reader font, size, line-height, and width preferences. |

Missing project/list/resource parameters use Next.js `notFound()`. Root `loading.tsx`, `error.tsx`, and `not-found.tsx` are present.

## Interface and design system

The visual direction is a quiet research workspace: neutral paper background, subdued green action color, thin borders, compact navigation, and no dashboard analytics or marketing hero treatment.

### shadcn and Motion

The project has shadcn components configured and generated under `components/ui/`. Prefer these primitives for new interactive controls instead of inventing repeated button/input/dialog implementations.

Current shadcn usage includes `Button`, `Input`, `Sheet`, and `Card`. `Dialog` is installed and ready to use for create/delete workflows.

`components/layout/app-shell.tsx` has page transitions, project-list expansion animation, and an accessible mobile navigation `Sheet`. `resource-card.tsx` adds subtle entry and hover motion. `markdown-viewer.tsx` animates reader entry. All Motion use should remain short, subtle, and respect `useReducedMotion()`.

## Typography

The application has an intentional font split:

- **Sora** is the product/UI font: navigation, controls, metadata, standard headings, and shadcn tokens.
- Long-form Markdown reading is controlled by a reader font variable. The default is **Hahmlet**.

The following reader options are loaded using `next/font/google` in `app/layout.tsx`:

- Hahmlet
- Lora
- Merriweather
- Source Serif 4
- Sora

Reader CSS lives in `app/globals.css`. The selected font is exposed as `--reader-font`, while `--reader-font-size` and `--reader-line-height` affect Markdown paragraphs and lists. Do not change the root `font-sans` token away from Sora when adding reader fonts.

## Reader settings

Reader settings live in `components/workspace-provider.tsx` alongside favorites.

```ts
type ReaderSettings = {
  font: "hahmlet" | "lora" | "merriweather" | "source-serif" | "sora"
  fontSize: number
  lineHeight: number
  width: "narrow" | "standard" | "wide"
}
```

The provider:

1. Uses `hahmlet`, `18px`, `1.9`, and `standard` as defaults.
2. Loads saved preferences from `localStorage` key `nexus-reader-settings` in its state initializer.
3. Updates HTML `data-reader-font` and reader CSS variables in an effect.
4. Persists changes to the same local-storage key.

`app/settings/page.tsx` is a client page with a live preview. `components/resource-page.tsx` applies the saved width setting to the reader container. Reader preferences currently affect the Markdown reader, which is the intended scope.

## Markdown and resource viewers

`ResourceViewer` is the extension seam for resource type rendering. Keep each future type in its own viewer component:

```text
ResourceViewer
  ├─ MarkdownViewer
  ├─ PdfViewer             (future)
  ├─ ImageViewer           (future)
  ├─ WebResourceViewer     (future)
  ├─ ChatViewer            (future)
  └─ TextViewer            (future)
```

`MarkdownViewer` currently implements a purposely small parser for the mock resource content: headings, paragraphs, unordered lists, blockquotes, fenced code blocks with copy, simple tables, inline code, bold text, and Markdown links. It is not a complete CommonMark renderer. If requirements demand untrusted content, full Markdown compatibility, syntax highlighting, sanitized HTML, or embedded images, replace it with an appropriately sanitized renderer rather than extending this parser indefinitely.

## Client-state behavior

- Favorites use an in-memory `Set` in `WorkspaceProvider`. They work across routes while the app is open, but are intentionally not persisted yet.
- Reader settings are client-only and persisted in local storage.
- Search is server-rendered from mock data based on the `q` query parameter.

Avoid representing future database behavior as completed persistence. Make a data/service boundary explicit when adding it.

## Known limitations and intentional placeholders

- New Project, New List, Add Resource, and Sort controls are present as UI affordances but do not persist changes. The next appropriate implementation is to add shadcn dialogs and in-memory/mock state or server actions once requested.
- PDFs, images, ebooks, URLs, notes, and chats have type records but do not have dedicated viewers yet.
- Search does not search Markdown body text, files, URLs, or chat transcripts yet.
- Recent resources are static mock ordering; it does not record opens.
- Favorites do not survive a full page reload.
- Markdown parsing is intentionally limited as described above.
- There are no project/list settings pages despite the route concept in the original product plan.

## Product constraints to preserve

- Keep desktop as the primary experience, with the sidebar becoming a mobile sheet/drawer.
- Prefer Server Components; only make a component client-side for state, browser APIs, or interaction.
- Do not introduce dependencies unless a clear capability requires them.
- Use realistic research/learning data, not generic `Project 1` placeholder data.
- Keep UI calm and information-dense. Favor subtle borders, typography, spacing, and restrained motion over gradients, oversized cards, or fake productivity metrics.
- Keep resource types independent from storage/file assumptions.
- Destructive actions must require confirmation once implemented.

## Suggested next work, when requested

1. Implement project/list/resource create dialogs with shadcn `Dialog`; choose either mock client state or a real persistence layer only if authorized.
2. Add real viewer components for PDF, image, URL, text, and chat resources.
3. Replace mock selectors with a server data-access layer, then add PostgreSQL/object storage.
4. Add real recent-resource tracking and persistent favorites.
5. Upgrade search to full-text content and tag search after persistence/content extraction exist.

Do not begin these items proactively. They are a sequence for future user-directed work, not current scope.
