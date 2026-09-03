# Test Plan: Shared Package — Zod Schema Validation

## Source Under Test

`packages/shared/src/schemas/` — all Zod schemas:

- `project.ts` — `CreateProjectSchema`, `UpdateProjectSchema`
- `knowledge-list.ts` — `CreateKnowledgeListSchema`, `UpdateKnowledgeListSchema`, `ReorderKnowledgeListSchema`
- `resource.ts` — `CreateResourceSchema`, `UpdateResourceSchema`
- `user.ts` — `UpdateUserSchema`
- `info.ts` — `InfoSchema` / `AuthConfig` shapes

Also the shared enums/constants locators (`packages/shared/src`) if any.

## Why It Needs Tests

- The shared package is the single source of contract truth consumed by **both** `apps/api` (Fastify Zod `validatorCompiler`) and `apps/web` (request body building).
- Modifying a schema here propagates validation behavior to every route's 400/422 responses. There are currently **no tests anywhere** for these schemas.
- Even when a route handler is tested, schema-level edge cases (bounds, trimming, empty strings) are best pinned down in isolation in the package where they live.

## Setup / Fixtures

Add a test runner to the shared package. There is currently **no test setup** in `packages/shared`. You'll need to:

```jsonc
// packages/shared/package.json — add:
"scripts": { "test": "vitest run" },
"devDependencies": { "vitest": "..." }
```

Shared schemas are pure Zod — no Mongo, no Fastify, no env. So the tests are dependency-free unit tests. Confirm the current package.json to avoid clobbering existing scripts.

```ts
import { describe, it, expect } from "vitest";
import { CreateProjectSchema } from "@nexus/shared"; // or relative import to src
```

Use relative imports into `src/schemas/...` if the shared root index doesn't re-export everything; check what `packages/shared/src/index.ts` exports.

## Test Cases

The pattern for every schema: **`safeParse` accepts a VALID shape and rejects each INVALID shape with a message-level assertion.**

### `CreateProjectSchema` (project.ts)

| # | Test | Input | Assertion |
|---|------|-------|-----------|
| 1 | Valid minimal | `{ name: "Proj" }` | success |
| 2 | Name empty string | `{ name: "" }` | fail (min 1) |
| 3 | Name too long | `{ name: "x".repeat(101) }` | fail (max 100) |
| 4 | Name not trimmed/leading space | `{ name: "  " }` or `{ name: "  Proj" }` | if `.trim()` — succeeds & trims; else succeeds. Pin actual (see Pitfalls) |
| 5 | Description optional | `{ name: "P" }` (no desc) | success; description undefined |
| 6 | Description too long | `{ name: "P", description: "x".repeat(501) }` | fail (max 500) |
| 7 | Unknown key stripped | `{ name: "P", bogus: 1 }` | success, output has no `bogus` |

### `UpdateProjectSchema`

| # | Test | Assertion |
|---|------|-----------|
| 8 | Valid full patch `{ name, description }` | success |
| 9 | Completely empty body `{}` | success (all optional) |
| 10 | `{ name: "" }` | fail if min enforced |
| 11 | Partial `{ description: "d" }` alone | success, only desc in output |

### `ReorderKnowledgeListSchema` (knowledge-list.ts)

| # | Test | Assertion |
|---|------|-----------|
| 12 | Valid `{ items: [{ id }] }` | success |
| 13 | Empty items `{ items: [] }` | success (currently allowed) — document actual |
| 14 | Missing `id` in item | fail (required) |
| 15 | Non-string item id | fail |
| 16 | Negative position | if `z.number()` no min → success; pin actual (see Pitfalls) |
| 17 | Float position | pin actual (int vs number) |

### `CreateKnowledgeListSchema` / `UpdateKnowledgeListSchema`

| # | Test | Assertion |
|---|------|-----------|
| 18 | Valid `{ name }` | success |
| 19 | Empty name | fail (min 1) |
| 20 | Name max length | pin actual (e.g. 100) fail above |
| 21 | Update empty body `{}` | success |

### `CreateResourceSchema`

| # | Test | Assertion |
|---|------|-----------|
| 22 | Valid with url `{ projectId, title, type:"url", url }` | success |
| 23 | Valid with drive file `{ projectId, title, type:"file", driveFileId }` | success |
| 24 | Type requires matching discriminator field (url without url on type url) | fail / success — pin actual (fields may be optional) |
| 25 | Empty title | fail (min 1) |
| 26 | `url` not a valid URL | fail if `.url()` |

### `UpdateResourceSchema`

| # | Test | Assertion |
|---|------|-----------|
| 27 | Empty body | success |
| 28 | `{ title: "" }` | fail (min 1) if enforced |
| 29 | Partial `{ title: "new" }` | success |

### `UpdateUserSchema` (user.ts)

| # | Test | Assertion |
|---|------|-----------|
| 30 | Valid `{ displayName }` | success |
| 31 | Empty `displayName` | fail (min 1) if enforced |
| 32 | Empty body | success (optional) |

### Discriminated unions (if resource uses one)

| # | Test | Assertion |
|---|------|-----------|
| 33 | Unknown `type` value rejected | fail |

## Pitfalls & Challenges

1. **Read the actual schema before writing assertions.** The table above hedges ("pin actual") because I have not verified every constraint (min/max/trim/optional/url). You MUST read `packages/shared/src/schemas/*.ts` first and fill in the exact numbers. Do not guess at `max(100)` etc. — the test should mirror the source exactly so it's a real contract test, not a coincidence test.

2. **Zod strips unknown keys by default** (strict vs strip). All schemas in this package default to **strip** unless a `.strict()` or `.passthrough()` is applied. Case 7 asserts the stripped shape. If any schema is `.strict()`, unknown keys would *fail* instead — read and correct.

3. **Test outputs not just pass/fail** to catch `.transform()` behavior (slugify may live here or in the route). If a schema `.transform()`s form, assert on `.data` (the transformed output).

4. **Package has no vitest yet.** If you don't want to add a test framework to the shared workspace, an alternative is to test the schemas from within `apps/api/tests/` (which already has vitest) by importing from `@nexus/shared`. That avoids a new dev-server setup. **Recommendation: add vitest to shared** so web can share them too, but if you want minimal churn, colocate in `apps/api`'s suite — decide based on repo conventions. Run `npm run build -w packages/shared` after schema changes either way so `dist/` (which the API consumes) is fresh.

5. **Cross-package import in tests:** if tests live in `packages/shared`, import via relative path `../src/schemas/project` to avoid depending on the built `dist/`. If they live in `apps/api`, import from `@nexus/shared` (built) — remember to rebuild.

6. **These tests are pure and fast** (no mongodb-memory-server, no network). They should be in the `test:all` path and run in milliseconds. Keep them dependency-free.

## Suggested Files

- If added to shared: `packages/shared/src/schemas/__tests__/*.test.ts` (one per schema file)
- Or colocated in api: `apps/api/tests/shared-schemas.test.ts`
