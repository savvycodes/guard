---
"@savvycodes/guard-effect": minor
---

New package: Effect v4 integration. `createGuard(guard)` returns `require`/`can`/`cannot` Effects that read the current `Scopes` service and fail with a typed `PermissionDenied` error. `@savvycodes/guard-effect/http-api` adds an `Authorization` middleware for `effect/http-api` that enforces `authz.permission(...)` annotations on endpoints and groups (HTTP 403).
