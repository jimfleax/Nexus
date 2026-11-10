# Phase 2 PRD & Implementation Plan: Dependency Security & Lockfile Remediation

## Executive Summary
This document outlines the requirements, dependency architecture, and execution plan for Phase 2: Transitive Security Vulnerability Remediation across the Nexus monorepo.
Dependabot security alerts flagged multiple high and moderate severity vulnerabilities residing in transitive dependency subtrees.
This phase enforces root-level npm package overrides, lockfile reconciliation, and hoisting integrity checks to remediate all flagged vulnerabilities without regressing developer tooling or breaking the build/test pipeline.

## 1. Problem Statement
The Nexus repository currently suffers from transitive vulnerabilities identified in `package-lock.json`:
1. `systeminformation`: Vulnerable to path traversal, prototype pollution, and command injection (CVE-2026-116576, CVE-2026-116674, CVE-2026-116673).
2. `fast-uri`: Authority injection, host confusion, and URI scheme spoofing (GHSA-qw65-cvwx-89v3, GHSA-58mr-gqgx-xq4g, GHSA-w74x-v6f9-j3xg, GHSA-hrr3-gc8f-f4qj, etc.).
3. `vite`: Arbitrary command execution, path traversal, and cross-origin script execution (GHSA-rq7h-c2jc-7f22, GHSA-9jrq-w75r-8gcw, GHSA-698v-4r3x-3vcv, etc.).
4. `undici`: Multiple denial-of-service vectors, TLS bypass, and cache poisoning vulnerabilities (GHSA-2m5v-pch6-74hx, GHSA-9fm3-97px-rjf6, GHSA-qrxm-fqhp-jwvm, etc.).
5. `follow-redirects`: Sensitive credential leakage and header stripping bypasses (GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c, GHSA-mrwp-f3q8-3g9p).
6. `ip-address`: Incorrect subnet containment evaluation causing auth/filter bypasses (GHSA-83, GHSA-56, GHSA-29).
7. `source-map-js`: Event-loop DoS via indexed source-map section offsets (GHSA-68fv-2mgg-jv7q).
8. `brace-expansion`: Quadratic-time expansion and recursion stack exhaustion DoS (GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p).
9. `postcss-selector-parser`: ReDoS in pseudo/attribute selector matching (GHSA-rj75-hqrm-r3gf).

Additionally, npm workspaces hoisting behavior can de-hoist or fail to resolve `typescript` from `node_modules/typescript-eslint` if root `package.json` does not preserve `typescript` hoisting integrity.

## 2. Target Remediation Specifications

| Package | Current Vulnerable Range | Target Safe Version | Key Vulnerability IDs |
|---|---|---|---|
| `systeminformation` | `<=5.33.15` | `^5.33.19` | CVE-2026-116576, CVE-2026-116674, CVE-2026-116673 |
| `fast-uri` | `3.0.0-3.1.8`, `4.0.0-4.2.2` | `^4.2.3` | GHSA-qw65-cvwx-89v3, GHSA-58mr-gqgx-xq4g, GHSA-w74x-v6f9-j3xg |
| `vite` | `8.2.0-8.2.2` | `^8.3.5` | GHSA-rq7h-c2jc-7f22, GHSA-9jrq-w75r-8gcw |
| `undici` | `8.0.0-8.12.1` | `^8.12.3` | GHSA-2m5v-pch6-74hx, GHSA-9fm3-97px-rjf6, GHSA-qrxm-fqhp-jwvm |
| `follow-redirects` | `1.16.0-1.16.1` | `^1.16.2` | GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c |
| `ip-address` | `<=10.7.3` | `^10.7.5` | GHSA-83, GHSA-56, GHSA-29 |
| `source-map-js` | `1.0.0-1.2.1` | `^1.2.2` | GHSA-68fv-2mgg-jv7q |
| `brace-expansion` | `<=1.1.20`, `4.0.0-5.0.11` | `^5.0.12` | GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7 |
| `postcss-selector-parser` | `<=6.1.4` | `^6.1.5` | GHSA-rj75-hqrm-r3gf |

## 3. Hoisting & Tooling Constraints
- **TypeScript Hoisting for `typescript-eslint`**:
  `typescript-eslint@8.72.1` requires `typescript` peer dependency `'>=4.8.4 <6.1.0'`. Root `package.json` must declare `"typescript": "^5.9.3"` in `devDependencies` to ensure proper top-level hoisting into root `node_modules/typescript`.
  `npm run lint:all` must execute across all packages with zero errors and zero warnings.

## 4. Implementation Steps
1. **Configure Root `package.json`**:
   - Add `"overrides"` block containing the 9 target packages with specified semver ranges.
   - Add `"typescript": "^5.9.3"` in root `devDependencies` to guarantee hoisting and peer compatibility for `typescript-eslint`.
2. **Execute Clean Dependency Install**:
   - Run `npm install` inside the worktree directory.
   - Inspect lockfile delta to confirm overrides are applied cleanly.
3. **Validation & Verification Suite**:
   - Audit check: `npm audit` to verify target vulnerabilities are resolved.
   - Type check: `npm run typecheck:ci` (build shared package + check all workspaces).
   - Lint check: `npm run lint:all` (0 warnings, 0 errors).
   - Test check: `npm run test:all` (all Vitest suites in API and Web pass).
4. **Delivery**:
   - Deliver complete report and verification evidence to orchestrator.
