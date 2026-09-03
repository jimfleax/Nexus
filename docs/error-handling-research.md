# Error Handling Best Practices & Codebase Audit

## 1. Research: Best Practices

### Fastify 5
- **Centralized Error Handling**: Use `fastify.setErrorHandler` to globally manage and format errors, avoiding redundant `try/catch` blocks in every route.
- **Throwing Errors**: Throw `Error` instances (or custom error classes like `ApiError`) rather than manually returning `reply.status().send()` inside business logic.
- **Schema Validation**: Leverage Fastify's built-in schema validation instead of manually validating input in controllers (Nexus uses Zod, which is excellent).
- **Encapsulation**: Error handlers can be encapsulated within plugins for domain-specific error management.
*Source: Fastify Error Handling Documentation*

### Next.js 16 (App Router)
- **Granular Error Boundaries**: Use `error.tsx` (Client Components) for isolating errors in specific route segments. Provide a recovery mechanism via the `reset()` function.
- **Global Error Handling**: Implement `app/global-error.tsx` to catch exceptions thrown in the root layout (must include `<html>` and `<body>`).
- **Expected Errors**: Model expected failures (like form validation) as return values (e.g., using `useActionState` for Server Actions) instead of throwing exceptions.
- **Not Found Boundaries**: Use `not-found.tsx` for missing resources (404 scenarios) rather than treating them as generic errors.
*Source: Next.js Documentation (Error Handling)*

### Mongoose 9
- **Async/Await**: Rely strictly on `async/await` since callback-based middleware has been removed.
- **Specific Error Identification**: Check error types using `instanceof` (e.g., `mongoose.Error.ValidationError`) or by specific error codes (e.g., MongoDB `11000` for Duplicate Keys).
- **Post-Middleware for Errors**: Use Mongoose post-middleware hooks (e.g., `schema.post('save', function(error, doc, next))`) to intercept errors like Duplicate Key violations and pass standardized domain errors to the application.
- **Update Validation**: Always set `{ runValidators: true }` in operations like `findByIdAndUpdate` as they don't validate by default.
*Source: Mongoose API Documentation (Middleware & Errors)*

---

## 2. Codebase Audit (Nexus Project)

### Backend (`@nexus/api`)
- **Missing Global Error Handler (`setErrorHandler`)**: The Fastify application (`apps/api/src/index.ts`) does not utilize `fastify.setErrorHandler`. As a result, route controllers manually handle errors utilizing redundant `try/catch` blocks.
- **Manual Error Management in Routes**: Routes (e.g., `projects.ts`, `lists.ts`) manually check for specific errors like MongoDB duplicate keys (`if (error.code === 11000)`) and explicitly call `reply.status(409).send(...)`. This should ideally be delegated to a centralized Mongoose error middleware or Fastify error handler.
- **No Mongoose Error Middleware**: The Mongoose models do not employ `post` middleware to intercept specific database errors (like `11000`). Mongoose's `tenantIsolationPlugin` (`db.ts`) handles isolation via `pre` hooks, but error management is entirely left to the route handlers.

### Frontend (`nexus-workspace`)
- **Error Boundaries (`error.tsx`)**: The App Router implements a generic `app/error.tsx` boundary utilizing a `<ErrorState />` component, which aligns with best practices for catching unexpected rendering errors in nested segments.
- **Missing `global-error.tsx`**: There is no `app/global-error.tsx` to act as a fallback for the root layout, meaning root layout exceptions could crash the application shell.
- **Client-Side API Error Interceptor**: The frontend heavily relies on `axios` with `react-query` (e.g., `hooks/use-projects.ts`) rather than Server Actions. API errors are captured via a global Axios response interceptor (`apps/web/lib/axios.ts`) which surfaces errors as UI toasts (`sonner` library) and centrally handles `401 Unauthorized` responses by signing the user out.

### Conclusion
The Nexus project handles errors functionally but violates several modern best practices. The Fastify API needs a centralized `setErrorHandler` coupled with custom error classes, and Mongoose models could leverage post-middleware to abstract database-specific errors out of route handlers. The Next.js frontend has a decent setup with `axios` interceptors and `error.tsx` but should add a `global-error.tsx` to fully secure the root layout.
