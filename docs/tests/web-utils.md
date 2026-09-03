# Test Plan: Web Data Formatting Utils (`apps/web/lib/utils.ts`)

## Source Under Test

`apps/web/lib/utils.ts` — the **pure, sync, dependency-light** helpers, which are the most easily testable code in the whole web app:

- `formatBytes(bytes)` — lines 24–36
- `formatDate(date)` — lines 38–47
- `formatFilenameToTitle(filename, maxLength?)` — lines 55–81

Note: `cn` (lines 15–17) is just `twMerge(clsx(..))` — a thin wrapper around shadcn's standard util. Not worth a dedicated test; skip it unless you want a smoke test.

## Why It Needs Tests

- These are the ONLY pure-and-simple functions in `apps/web` (everything else is server components, route handlers, or hooks needing React/Next mocks).
- They're the cheapest possible way to bootstrap `apps/web` test coverage.
- They encode real business formatting rules (byte units, camelCase-splitting filenames, title-casing) that are easy to regress with no test suite.

## Tooling Prerequisite (P4 / NEW)

**`apps/web` currently has NO test framework.** Unlike `apps/api`, there is no vitest in the web workspace. You must add one to the FIRST P4 doc you implement. Recommended (matches the existing repo tooling):

```bash
# from apps/web
npm i -D vitest
```

Add to `apps/web/package.json`:

```jsonc
"scripts": { "test": "vitest run" },
"test": { "environment": "node" }   // or a vitest.config.ts
```

Place tests in `apps/web/lib/__tests__/*.test.ts` or `apps/web/tests/`. Keep `environment: "node"` — these utils are framework-agnostic pure functions (`formatBytes`/`formatDate` don't touch the DOM). You may need to verify `import.meta.env`/path handling works in the installed vitest version.

## Setup / Fixtures

No fixtures needed — pure functions, direct imports:

```ts
import { describe, it, expect } from "vitest";
import { formatBytes, formatDate, formatFilenameToTitle } from "../utils";
```

## Test Cases

### formatBytes

| # | Input | Expected |
|---|-------|----------|
| 1 | `0` | `"0 B"` |
| 2 | `null` | `"—"` |
| 3 | `undefined` | `"—"` |
| 4 | `NaN` (e.g. `formatBytes(NaN)`) | `"—"` |
| 5 | `1023` | `"1023 B"` (i=0 → toFixed 0) |
| 6 | `1024` | `"1.0 KB"` (i=1, value 1 < 100 → 1 decimal) |
| 7 | `1536` | `"1.5 KB"` |
| 8 | `1048576` (2^20) | `"1.0 MB"` |
| 9 | `1073741824 * 1.5` (1.5 GB) | `"1.5 GB"` |
| 10 | huge (e.g. `Math.pow(1024,5)*2`) | `"2.0 TB"` |
| 11 | exactly `100` | `"100 B"` (i=0 → 0 decimals) |
| 12 | `100 * 1024` (=102400, ~99.6KB... value≈100) | boundary: the `value >= 100 ? 0 : 1` rule → `"100 KB"` |

Key rule to pin: **left-of-decimal threshold.** `value >= 100 || i === 0 ? 0 : 1` decimals. Case 12 asserts the 100-unit boundary.

### formatDate

| # | Input | Expected |
|---|-------|----------|
| 13 | `null`/`undefined` | `"—"` |
| 14 | invalid string `"not-a-date"` | `"—"` |
| 15 | ISO date string `"2024-03-05T00:00:00Z"` | `"Mar 5, 2024"` (en-US locale) |
| 16 | `Date` object | `"Mar 5, 2024"` (same) |
| 17 | date-only zero-time `"2024-03-05"` (parses to local midnight) | pin what your timezone yields; assert stable via explicit expected string computed for the machine's TZ if `TZ` may differ |

### formatFilenameToTitle

| # | Input | Expected |
|---|-------|----------|
| 18 | `"my_document (2).pdf"` | `"My document (2)"` (ext stripped, underscore→space, capitalized) |
| 19 | `"report-final-v3.pdf"` | `"Report final v3"` (hyphen→space) |
| 20 | camelCase `"monthlyReport.docx"` | `"Monthly report"` (camel split) |
| 21 | PascalCase `"QuarterlyReport.xlsx"` | `"Quarterly report"` |
| 22 | multiple extensions `"archive.tar.gz"` | `"Archive.tar"` (regex strips only last ext) |
| 23 | title-casing already-uppercase first letter `"Report.pdf"` | `"Report"` unchanged |
| 24 | truncation with `maxLength: 10` on a long name | length ≤10 + trailing `"…"`, `trimEnd()` applied |
| 25 | no extension `"notes"` | `"Notes"` |
| 26 | all-symbols `"___"` | `""` (empty after collapse, returns as-is) |
| 27 | leading/trailing spaces get trimmed | `" file .txt"` → `"File"` |

## Pitfalls & Challenges

1. **These are sync pure functions** — no async, no mocks, no jsdom. The whole file is testable in `environment: "node"`. This is the ideal pick to prove out the vitest setup before attempting the harder React/Next tests.

2. **`formatBytes` decimal rule** (value 100 threshold) is subtle — test cases 5, 11, 12 specifically exercise `i === 0` and the `value >= 100` boundary. Get the boundary exactly right: `formatBytes(100 * 1024)` → 102400 → i=2 (MB? no: 102400 = 100KB exactly, value = 100, i=1). So `value >= 100` → 0 decimals → `"100 KB"`.

3. **`formatDate` is timezone-sensitive** (case 17). The `new Date("2024-03-05")` (date-only) parses as UTC midnight, then `toLocaleDateString` renders in the server's local TZ. For deterministic tests, prefer full ISO timestamps (case 15) and avoid the date-only variant, or globally set `TZ=UTC` in the vitest config to make all tests deterministic.

4. **`formatFilenameToTitle` camel-split `([a-z])([A-Z])`** does NOT split after an uppercase followed by lowercase boundary like "HTMLFile" (no `[a-z]` before the `[A-Z]`... actually "lF" = l→F matches `([a-z])([A-Z])`, so "HTMLFile" → "HTML File"). Test an acronym-leading case deliberately (e.g. `"HTMLGuide.md"` → `"HTML Guide"`) to pin this exact regex behavior.

5. **Double extension (case 22):** `/\.[^/.]+$/` strips only the last extension. `"archive.tar.gz"` → `"archive.tar"`. Assert this so nobody "improves" it to strip both.

6. **`formatDate` returns the em dash `"—"`** (U+2014), not a hyphen. Match it exactly in assertions. Same em dash used by `formatBytes`.

7. **Adding vitest is the prerequisite for ALL web tests.** Once `apps/web` has `vitest run`, the later P4 docs (hooks, axios, route handlers, layout) build on it. Consider doing `web-utils` first to validate the tooling, then expand.

## Suggested File

`apps/web/lib/__tests__/utils.test.ts`
