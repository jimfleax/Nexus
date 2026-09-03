# Test Plan: Tenant Isolation Plugin — Untested Branches

## Source Under Test

`apps/api/src/db.ts` — `tenantIsolationPlugin` (lines 42–115) + `tenantContext`.

## Why It Needs Tests

- The existing `db.test.ts` covers only: ownerId auto-set on save, fail-closed save, query isolation via `find`, and fail-closed `find`.
- **Untested branches:**
  - `skipTenant: true` escape hatch on queries and aggregates
  - Aggregate-query tenant injection (`pre("aggregate")`)
  - Tenant **mismatch** on save (`"Tenant context mismatch on save."`)
  - Delete/update isolation (`deleteMany`, `deleteOne`, `updateOne`, `updateMany`, `findOneAndUpdate`, `countDocuments`)
  - Index auto-creation (the plugin adds `{ ownerId: ... index: true }` if absent)

## What the Plugin Does (verified)

```ts
tenantIsolationPlugin(schema):
  if (!schema.path("ownerId")) schema.add({ ownerId: { type: String, required: true, index: true } })

  injectTenant (query pre-hook for):
    countDocuments, deleteMany, deleteOne, find, findOne, findOneAndDelete,
    findOneAndReplace, findOneAndUpdate, replaceOne, updateMany, updateOne
    if (this.getOptions().skipTenant) return
    if (!store || !store.ownerId) throw "Tenant context missing. Set skipTenant: true to bypass."
    this.where({ ownerId: store.ownerId })

  schema.pre("aggregate", function):
    if (this.options && this.options.skipTenant) return
    if (!store || !store.ownerId) throw "Tenant context missing. Set skipTenant: true to bypass."
    this.pipeline().unshift({ $match: { ownerId: store.ownerId } })

  injectTenantOnSave (pre "validate" + pre "save"):
    if (this.$locals?.skipTenant) return
    if (!store || !store.ownerId) throw "Tenant context missing on save."
    if (!this.ownerId) this.ownerId = store.ownerId
    else if (this.ownerId !== store.ownerId) throw "Tenant context mismatch on save."
```

## Setup / Fixtures

Use the same throwaway-schema pattern as `db.test.ts`:

```ts
const TestSchema = new mongoose.Schema({ group: String, value: Number });
TestSchema.plugin(tenantIsolationPlugin);
const TestModel = mongoose.model("TenantTest", TestSchema);

const mongoServer = await MongoMemoryServer.create();
await mongoose.connect(mongoServer.getUri());
await TestModel.deleteMany({}, { skipTenant: true });
```

Seed helper — wrap all operations in the desired tenant context:

```ts
const as = async (ownerId: string | null, fn: () => Promise<any>) =>
  new Promise<void>((resolve, reject) => {
    if (ownerId === null) { fn().then(() => resolve(), reject); return; }
    tenantContext.run({ ownerId }, async () => { try { await fn(); resolve(); } catch (e) { reject(e); } });
  });

beforeEach(async () => {
  await TestModel.deleteMany({}, { skipTenant: true });
  await as("u1", () => TestModel.create({ group: "a", value: 1 }));
  await as("u1", () => TestModel.create({ group: "b", value: 2 }));
  await as("u2", () => TestModel.create({ group: "c", value: 3 }));
});
```

## Test Cases

### skipTenant queries

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 1 | `find` with `skipTenant` sees all tenants | run `TestModel.find({}, null, { skipTenant: true })` outside any context | returns 3 docs |
| 2 | `findWithoutContext, skipTenant` does NOT throw | same as #1 with no context | resolves (does NOT throw "missing") |
| 3 | `deleteMany` with `skipTenant` deletes across tenants | `TestModel.deleteMany({}, { skipTenant: true })` | removes all 3; `countDocuments({}, {skipTenant:true})` === 0 |
| 4 | `updateMany` with `skipTenant` updates across tenants | `TestModel.updateMany({}, { $set: { value: 99 } }, { skipTenant: true })` | all docs value 99 |

### Aggregate injection

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 5 | `aggregate` inside u1 context prepends `$match` on ownerId | `TestModel.aggregate([{ $group: { _id: "$group" } }])` as u1 | only u1's groups (`a`,`b`), not `c` |
| 6 | `aggregate` with no context throws | `TestModel.aggregate([...])` outside context | throws `"Tenant context missing. Set skipTenant: true to bypass."` |
| 7 | `aggregate` with `{ skipTenant: true }` option bypasses | `TestModel.aggregate([...]).option({ skipTenant: true })` (or pass options) | sees all tenants, no throw |

### Tenant mismatch on save

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 8 | Saving a doc whose ownerId differs from context throws | `as("u1", async () => { const d = new TestModel({ ownerId: "u2", ... }); await d.save(); })` | rejects `"Tenant context mismatch on save."` |
| 9 | Saving with explicit matching ownerId is allowed | `as("u1", () => TestModel.create({ ownerId: "u1", ... }))` | succeeds |
| 10 | `$locals.skipTenant` on save bypasses | `const d = new TestModel({...}); d.$locals.skipTenant = true; await d.save()` outside context | succeeds, does NOT throw, and does NOT auto-assign ownerId |

### Delete / update isolation (implicit tenant filter)

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 11 | `countDocuments` inside u1 context counts only u1 | `as("u1", () => TestModel.countDocuments())` | 2 |
| 12 | `deleteOne` inside u1 context only deletes u1's doc | delete one u1 doc as u1 | u1 count 1, u2 count 1 (u2's c still there) |
| 13 | `deleteMany` inside u1 context deletes only u1 | `as("u1", () => TestModel.deleteMany({}))` | u1 0, u2 1 |
| 14 | `updateOne`/`updateMany` inside u1 affect only u1 | `as("u1", () => TestModel.updateMany({}, { $set: { value: 5 } }))` | u1 docs value 5, u2 doc value 3 |
| 15 | `findOneAndUpdate` inside u1 scoped to u1 | `as("u1", async () => TestModel.findOneAndUpdate({ group: "a" }, { $set: { value: 7 } }, { new: true }))` | returns u1's doc; u2 unaffected |

### Index auto-creation

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| 16 | Schema without `ownerId` gets it added | create `new mongoose.Schema({ x: String })`, apply plugin | `schema.path("ownerId")` truthy, `required: true`, `index: true` |
| 17 | Schema already having `ownerId` is not duplicated | schema with ownerId already present | still one `ownerId` path, not re-added |

## Pitfalls & Challenges

1. **`skipTenant` is a Mongoose *query option*, passed differently per method:**
   - For query builders: `Model.find({...}, null, { skipTenant: true })` ✓
   - For `.option({ skipTenant: true })` — works on the query chain (used by aggregate via `this.options`)
   - On **save/document operations**, it's `doc.$locals.skipTenant` — completely different mechanism. Get these right per test.

2. **`aggregate` skipTenant is read from `this.options.skipTenant`** — the aggregate query's `.option()` or the object passed to `.aggregate(pipeline, options)`? Look at the code: `if (this.options && this.options.skipTenant)`. So you must set it via the aggregate's options, e.g. `TestModel.aggregate([...]).option({ skipTenant: true })` OR pass as an option — but `aggregate(pipeline, options)` isn't how it's called here. The cleanest is to use the chain `.option({ skipTenant: true })`.

3. **The auto-`ownerId` index (case 16/17)** requires inspecting the schema. `schema.path("ownerId")` returns the path. Check `.instance === "String"`, `.options.required` and `.options.index` after the plugin runs on a plain schema.

4. **Seeding races:** `beforeEach` deletes all docs *inside a tenant context?* Careful — `TestModel.deleteMany({}, { skipTenant: true })` (the plugin respects the option) avoids the missing-context throw. Use that form, not the tenant-scoped one. The existing `db.test.ts` uses exactly this.

5. **Unique-model-name collisions:** declaring `mongoose.model("TenantTest", schema)` twice (e.g. after HMR or across test files) throws "OverwriteModelError". Since this is a single-file test, it's fine, but don't re-declare with the same name in `beforeEach`.

6. **`required: true` on auto-added ownerId** means `create()` without ownerId fails unless inside context (which auto-assigns on save). For the mismatch test (case 8) you create a doc with an *explicit wrong* ownerId *inside* a different context — the `pre("validate")`/`pre("save")` sees `this.ownerId !== store.ownerId` → throws.

7. **Case 10 (`$locals.skipTenant`)**: since `skipTenant` on document bypasses both the validate and save pre-hooks, the doc is saved WITHOUT ownerId. But the auto-added field is `required: true` — so how does it pass validation? Because Mongoose's `required` validator only runs when the pre-`validate` hook registered by the plugin doesn't short-circuit... Actually the required validator is independent. If you save a doc with no ownerId and `$locals.skipTenant`, the `required` validator will still fail. **To test case 10 cleanly**, seed with an explicit `ownerId` (works), OR verify that with `$locals.skipTenant` and an explicit ownerId the save succeeds outside any context. Adjust the assertion accordingly: the point is that `$locals.skipTenant` bypasses the "missing context" throw, not that it bypasses required validation.

## Suggested File

`apps/api/tests/db-extended.test.ts`
