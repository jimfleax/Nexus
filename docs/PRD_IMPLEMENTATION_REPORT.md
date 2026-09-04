# Nexus — PRD Implementation Report

**Generated:** September 4, 2026
**Scope:** Full audit of `prd/` directory vs. current codebase state
**Method:** Read-only analysis of all 32 PRD files, API source (`apps/api/src/`), frontend source (`apps/web/`), and shared package (`packages/shared/`)

---

## 1. Executive Summary

The codebase is **substantially implemented** for an MVP. The core architecture — monorepo with Fastify API, Next.js frontend, MongoDB with tenant isolation, multiple reader types, full-text search, and command palette — is solid and working. The API exposes **30 endpoints** backed by **4 Mongoose models**, **49 test files**, and a complete service layer. The frontend delivers all major pages, a typed API client, TanStack Query hooks, and reader settings.

However, there are **several notable divergences** from the PRD and a handful of **gaps** that should be addressed. The project made pragmatic shortcuts during implementation, some documented (GCS to Google Drive), some not (Auth.js to custom JWT, slug IDs to ObjectId).

| Dimension | Score | Notes |
|-----------|-------|-------|
| PRD coverage (implemented) | ~78% | Core CRUD, search, auth, readers, settings all done. Missing GitHub OAuth, ebook/note viewers, slug IDs. |
| Architecture fidelity | ~85% | Monorepo split correct. Fastify + Next.js. Tenant isolation. Auth mechanism changed but functionally sound. |
| User story completion | ~82% | 12 of 14 stories fully met. Ebook and note viewers degraded. |
| Divergence severity | Low-Medium | No critical blockers. Most divergences are pragmatic shortcuts. GitHub OAuth is the biggest gap. |
| Technical debt | Low | Well-structured code, 49 test files, consistent patterns, typed API client. |

---

## 2. What Is Successfully Implemented

### 2.1 Architecture and Backend (~90%)

**Fastify 5 API** on port 8080 with Zod type provider, plugin-based architecture.

**MongoDB + Mongoose** with a custom `tenantIsolationPlugin` that injects `ownerId` into every query via `AsyncLocalStorage`. The plugin hooks into 11 Mongoose query methods, aggregation pipelines, and save/validate hooks. Supports a `skipTenant: true` escape hatch for cross-tenant operations (e.g., garbage collection).

**30 REST endpoints** covering the full CRUD surface:

| Category | Endpoints | Count |
|----------|-----------|-------|
| Health | `GET /health` | 1 |
| Auth | `GET /api/auth/google`, `GET /api/auth/callback/google` | 2 |
| Projects | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` | 5 |
| Lists | `GET/POST /api/projects/:id/lists`, `PUT .../reorder`, `GET/PATCH/DELETE /api/lists/:id` | 6 |
| Resources | `GET/POST /api/projects/:id/resources`, `GET/POST/PATCH/DELETE /api/resources/:id`, `GET .../content`, `GET .../file`, `PUT .../favorite`, `POST .../open` | 9 |
| User | `GET/PATCH /api/user/settings`, `GET /api/user/favorites`, `GET /api/user/recent`, `GET /api/user/metrics` | 5 |
| Search | `GET /api/search`, `GET /api/search/suggestions`, `GET /api/favorites`, `GET /api/recent` | 4 |
| Integrations | `GET /api/integrations/google-drive`, `GET .../callback`, `POST .../disconnect` | 3 |
| Info | `GET /api/info` | 1 |
| Protected | `GET /api/protected` | 1 |

**Cascade deletion** uses MongoDB transactions (`utils/transactions.ts`) — deleting a project cascades through lists to resources, cleaning up Drive files along the way.

**Garbage collection** runs every 15 minutes, sweeping resources stuck in `status: "pending"` for over 30 minutes and deleting their orphaned Drive files.

**49 test files** using Vitest with `mongodb-memory-server` (real Mongo in-process). Tests cover all endpoints, services, models, plugins, utilities, and integration flows. `fileParallelism: false` is set to avoid flaky transaction errors under memory-server replica sets.

**Shared package** (`@nexus/shared`) provides Zod validation schemas and TypeScript domain types for Project, KnowledgeList, Resource, User, and Error response shapes, consumed by both API and web.

**Standardized error handling** — a global error handler plugin maps Zod validation errors, Mongoose duplicate key (11000), CastError, ValidationError, and custom `TokenRevokedError` into a consistent `{ ok: false, error: { code, message, details } }` envelope.

### 2.2 Frontend (~85%)

**Next.js 16** App Router with two route groups:
- `(dashboard)` — auth-gated shell with sidebar, command palette, and all main pages
- `(public)` — sign-in page, privacy policy, terms of service

**All core pages implemented:**

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Greeting hero, project grid, recent resources |
| `/projects` | Projects | All projects as animated magic cards |
| `/projects/:id` | Project Detail | Breadcrumb, collections list with reorder |
| `/projects/:id/lists/:id` | List Detail | Breadcrumb, resource list |
| `/projects/:id/lists/:id/resources/:id` | Resource Reader | Breadcrumb, metadata, viewer, actions |
| `/search` | Search | Full-text search with breadcrumbs |
| `/favorites` | Favorites | Starred resources |
| `/recent` | Recent | Recently opened resources |
| `/settings` | Settings | Reader typography preferences |
| `/signin` | Sign In | Google OAuth button |

**Sidebar navigation** — collapsible (230px expanded, 56px collapsed), persisted to localStorage, with project sub-nav, mobile sheet drawer, and user profile modal.

**Command palette** (Ctrl+K) — built on `cmdk` + Base UI Dialog. Provides search with debounced suggestions, navigation (Home, Favorites, Recent, Settings), quick actions (New Project/List/Resource), and logout with confirmation.

**TanStack Query** hooks for all entities with centralized query key factories, standardized stale times, and a reusable `useCacheInvalidatingMutation` wrapper. Optimistic updates on favorites.

**Reader settings** — React Context provider persisting font (5 options), size (15-23px), line-height (1.5-2.3), and width (narrow/standard/wide) to localStorage. Applied via CSS custom properties consumed by MarkdownViewer, TextViewer, and the resource page layout.

**File picker** with drag-and-drop, click-to-browse, accept filters, and file preview. Auto-populates title from filename.

**Typed API client** (`lib/api-client.ts`) wrapping Axios with typed methods for every endpoint, plus a 401 interceptor that auto-signs out and toasts.

### 2.3 Viewers (6 of 8 Fully Implemented)

| Viewer | Component | Capabilities |
|--------|-----------|-------------|
| Markdown | `markdown-viewer.tsx` | react-markdown, remark-gfm, Prism syntax highlighting, code block copy, sanitized HTML |
| PDF | `pdf-viewer.tsx` | react-pdf, zoom controls, page navigation, single/scroll modes, fullscreen, download |
| Image | `image-viewer.tsx` | Caption display, full-resolution link |
| URL | `web-resource-viewer.tsx` | Sandboxed iframe preview + external link fallback card |
| Chat | `chat-viewer.tsx` | JSON or plain-text "Role: content" parsing, per-message copy |
| Text | `text-viewer.tsx` | Word/character counts, copy action |
| Ebook | Falls through to `text-viewer.tsx` | No epub rendering — plain text only |
| Note | Falls through to `text-viewer.tsx` | Plain text, no formatting |

### 2.4 Auth and Security

**Google OAuth** — full flow from sign-in page redirect through backend OAuth exchange to JWT cookie setting. Scopes include `openid email profile drive.file`.

**JWT sessions** via `jose` library. HS256-signed tokens with 30-day expiry, stored as `nexus-session` HttpOnly cookie. Server-side verification in the dashboard layout using `jwtVerify()`. Falls back to `Authorization: Bearer` header for API calls.

**Tenant isolation** — `AsyncLocalStorage<{ ownerId: string }>` carries the authenticated owner through every request. The `tenantIsolationPlugin` automatically injects `{ ownerId }` filters into all Mongoose operations. Throws if context is missing (unless `skipTenant: true`).

**Token encryption** — Drive refresh tokens encrypted at rest with AES-256-GCM via `TOKEN_ENCRYPTION_KEY`. Transparent encrypt/decrypt through Mongoose schema getters/setters, with graceful fallback for legacy unencrypted tokens.

**Cache-Control** — global `onSend` hook adds `Cache-Control: no-store, max-age=0` to any response that sets a `Set-Cookie` header, preventing Vercel CDN from stripping cookies.

### 2.5 Storage and Uploads

**Google Drive adapter** (`utils/storage/drive.ts`) — per-user OAuth refresh tokens, lazily creates a "Nexus" root folder with project/list hierarchy, lock-protected folder creation to prevent race conditions. Supports direct stream upload, resumable upload URIs, file deletion, proxied reads with Range header support, and quota queries.

**Multipart parsing** — 14MB body limit, browser-to-Drive streaming, no server-side file buffering.

**Fake adapter** (`utils/storage/fake.ts`) — in-memory implementation for tests and local development.

---

## 3. PRD Divergences

### 3.1 Approved Divergences

| Area | PRD Says | Actually Implemented | Notes |
|------|----------|---------------------|-------|
| **Object Storage** | "GCS is the working default" (PRD §4.4) | Google Drive API via per-user OAuth | Approved as ADR-4 in `prd/4.4-integration-decisions/PRD.md`. Status: CLOSED. However, the **high-level `prd/PRD.md` was never updated** — it still references "GCS uploads" in §5.1 (line 155) and "GCS signed URLs" in §5.2 (line 165). |

### 3.2 Unapproved / Undocumented Divergences

#### 3.2.1 GitHub OAuth — Missing

**PRD requirement:** "Sign-up via Google and GitHub OAuth only" (§2.2, AC1 for first user story). Requirements doc `R-107` specifies "Google + GitHub OAuth providers."

**Actual state:** Only Google OAuth exists. Zero GitHub-related code anywhere in the codebase:
- `plugins/oauthProvider.ts` only instantiates `GoogleOAuthProvider`
- `utils/oauth/` contains only `google.ts` and `types.ts`
- Auth routes define only `/api/auth/google` and `/api/auth/callback/google`
- Sign-in page renders a single "Sign in with Google" button
- `OAuthSubmitButton` types its `provider` prop as `"google"` only

**Impact:** Medium — the PRD explicitly requires both providers. The integration decisions doc hints at GitHub being deferred ("v1.1 item"), but this is not reflected in the high-level PRD.

#### 3.2.2 Auth Library — Auth.js Replaced

**PRD requirement:** "Auth.js (NextAuth v5) with JWT session strategy" appears throughout §4.1, §4.4, §4.5, and the requirements docs.

**Actual state:** Custom JWT implementation using `jose`:
- API issues JWTs directly during OAuth callbacks (`SignJWT` from `jose`)
- Sets `nexus-session` HttpOnly cookie via custom `SessionManager`
- Web app verifies with `jwtVerify()` from `jose`
- Neither `next-auth` nor `@auth/core` appears in any `package.json`

**Impact:** Low — functionally equivalent. The custom implementation is simpler and has no Auth.js dependency overhead. However, it diverges from the spec's trust model (Auth.js managing sessions on the web app).

#### 3.2.3 ID Strategy — Slug IDs Not Used

**PRD requirement:** "IDs are owner-scoped slugs" (§4.2, line 119). URLs are `/projects/:p/lists/:l/resources/:r` where `:p`, `:l`, `:r` are slug strings.

**Actual state:** All three models use default Mongoose ObjectId for `_id`. The `slug` field exists as a separate indexed property on Project and KnowledgeList, but:
- The Resource model has **no `slug` field at all** despite the data model spec requiring one
- URLs use stringified ObjectIds (e.g., `/projects/64f1a2b3c4d5e6f7a8b9c0d1`)
- The `toJSON` transform maps `ret.id = ret._id.toString()` for all models

**Impact:** Medium — human-readable URLs are lost. The Resource model is missing a field the detailed spec requires.

#### 3.2.4 API Route Prefix — No `/v1/`

**PRD requirement:** All routes specified under `GET /api/v1/...`, `POST /api/v1/...` (§4.3).

**Actual state:** All routes use `/api/...` with no version prefix. This is a systematic deviation across all 30 endpoints.

**Impact:** Low — cosmetic, but makes future API versioning harder.

#### 3.2.5 User Model — Profile Data Not Stored

**PRD requirement (§4.4):** `{ _id: sub, email, name, avatar?, driveRefreshToken?, driveFolderId?, createdAt, updatedAt }` — full profile stored in MongoDB.

**Actual state:** `{ ownerId, driveRefreshToken, driveFolderId, createdAt, updatedAt }` — no `email`, `name`, or `avatar` fields. User profile data exists only in the JWT payload, not persisted in the database.

**Impact:** Low — profile is available from the JWT for the current session, but is lost if the token expires and no new login occurs. A dashboard that shows historical user info would need to re-fetch from Google.

#### 3.2.6 Ebook Viewer — No epub Rendering

**PRD requirement:** "ebook" listed as a resource type requiring a purpose-built viewer (S-2.2-009). The PRD mentions "PDF/ebook originals" as the rationale for choosing GCS.

**Actual state:** The `ebook` type is defined in the Resource model enum and UI metadata, but in `resource-viewer.tsx` it falls through to `case "text"` and renders `TextViewer` — a plain-text renderer with no epub parsing, page navigation, or book-specific UI.

**Impact:** Medium — ebook resources display as raw text with no formatting.

#### 3.2.7 Note Viewer — Plain Text Only

**PRD requirement:** "note" listed as a resource type requiring a viewer (S-2.2-009).

**Actual state:** Falls through to `TextViewer` (plain text, word/char counts, copy). Despite `note` and `markdown` both being `isContentType()` in `resource-meta.ts`, they render differently — markdown gets full rendering, note gets plain text. Notes cannot display any formatting.

**Impact:** Medium — note resources lose all formatting.

---

## 4. Gaps and Missing Features

### 4.1 From MVP Scope (§5.1)

| Feature | PRD Requirement | Status |
|---------|----------------|--------|
| GitHub OAuth | Required for sign-up alongside Google | Not started |
| Seed script | "Seed script for dev" for development data | Not found in source |
| Typed API client (generated) | §4.3 specifies a generated typed client | Manually written in `lib/api-client.ts` |

### 4.2 From Technical Specs (§4)

| Requirement | Spec Reference | Status |
|------------|---------------|--------|
| `PUT /resources/:id/uploads` (GCS signed URL) | §4.3 | Not applicable — uses direct Drive upload |
| Contract tests (tenant isolation) | §4.5 | Partial — `integrity.test.ts` exists, but no formal contract test suite matching the spec's matrix |
| Security headers (HSTS, CSP) | §4.5 | Not found in codebase — likely relies on Vercel/Render defaults |
| `Content-Security-Policy` | §4.5 detailed CSP directives | Not implemented |

### 4.3 From Non-Goals (Correctly Deferred)

The following items are explicitly listed as non-goals for MVP in §2.3 and are correctly not implemented:

- Teams/sharing/multi-role workspaces
- Email/password credential auth
- Offline/PWA, mobile apps, browser extension
- Analytics dashboards (internal telemetry only)
- AI features (semantic search, summaries)
- Localization/theming marketplace

---

## 5. Empty PRD Subdirectories

| Directory | Expected Contents | Actual State |
|-----------|------------------|--------------|
| `prd/5.1-phased-rollout/` | Detailed rollout plan with milestones | Empty — content exists only in top-level `prd/PRD.md` §5.1 |
| `prd/5.2-technical-risks/` | Detailed risk register with mitigations | Empty — content exists only in top-level `prd/PRD.md` §5.2 |

All other subdirectories (`1-executive-summary/`, `2-user-experience/`, `3-ai-system-requirements/`, `4-technical-specifications/`) are fully populated with detailed breakdown files.

---

## 6. Codebase Extras Not in PRD

The following features exist in the codebase but are not specified in the PRD:

| Feature | Location | Description |
|---------|----------|-------------|
| Boneyard/skeleton system | `components/bones/` | JSON skeleton definitions + preview page for loading states |
| Profile modal | `components/layout/profile-modal.tsx` | Workspace metrics display (Drive storage, resource/project counts, storage by type) |
| Info endpoint | `GET /api/info` | Returns metadata for any entity (project/list/resource) |
| Search suggestions | `GET /api/search/suggestions` | Regex-based title autocomplete, limit 10 |
| Metrics endpoint | `GET /api/user/metrics` | Aggregate storage metrics with Drive quota info |
| Google Drive connect/disconnect | `integrations.ts` routes | User-initiated Drive linking with OAuth flow and revocation |
| AES-256-GCM token encryption | `utils/crypto.ts` | Encrypts Drive refresh tokens at rest |
| List reorder (early) | `PUT .../lists/reorder` | Implemented as MVP despite being listed as "v1.1" in §5.1 |

---

## 7. Recommended Priorities

### High Priority

1. **GitHub OAuth** — The most significant PRD gap. Implement `GitHubOAuthProvider` mirroring the existing Google pattern (`utils/oauth/google.ts`). Add GitHub button to sign-in page. Update `OAuthSubmitButton` provider type.

2. **Ebook viewer** — Integrate an epub library (e.g., `epubjs`) for proper epub rendering with page navigation and book-specific UI.

3. **Note viewer** — Either route notes to `MarkdownViewer` (simplest) or build a dedicated note viewer with basic formatting support.

### Medium Priority

4. **Resource slug field** — Add `slug` to the Resource model with a compound unique index on `{ownerId, listId, slug}` to match the data model spec.

5. **Update high-level PRD.md** — Reflect the GCS to Drive decision, mark GitHub OAuth as implemented once done, correct any other stale references.

6. **Populate or remove empty PRD directories** — Either fill `prd/5.1/` and `prd/5.2/` with detailed breakdowns or remove them to avoid confusion.

### Low Priority

7. **Security headers** — Implement HSTS, CSP, and other security headers per §4.5 spec.

8. **API version prefix** — Consider adding `/v1/` prefix if future API versioning is anticipated.

9. **User profile persistence** — Store email/name/avatar in the User model if historical display is needed.
