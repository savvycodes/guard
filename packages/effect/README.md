# @savvycodes/guard-effect

Type-safe permission checks for [Effect](https://effect.website) v4.

- Permission checks are Effects that require the current `Scopes` and fail with a typed `PermissionDenied` error
- Permission names are inferred from your guard-core roles
- `effect/http-api` middleware that responds 403 from endpoint or group annotations

## Installation

```bash
npm install @savvycodes/guard-effect @savvycodes/guard-core effect
```

Requires `effect@^4.1`. The package is ESM-only, like Effect v4.

## Usage

```ts
import { createGuard as createCoreGuard, defineRole } from "@savvycodes/guard-core";
import { createGuard, Scopes } from "@savvycodes/guard-effect";
import { Effect } from "effect";

const user = defineRole(["user:me"]);
const admin = defineRole([...user, "user:write"]);

export const authz = createGuard(createCoreGuard(user, admin));

const setRoles = Effect.fn("Users.setRoles")(function* (id: string, roles: string[]) {
  yield* authz.require("user:write");
  // ...
});
// (id, roles) => Effect<void, PermissionDenied, Scopes>
```

`Scopes` holds the permissions of the current principal. Provide it once per request, for example from the session:

```ts
setRoles("42", ["admin"]).pipe(Effect.provideService(Scopes, [...admin]));
```

Because `Scopes` is part of the effect's requirements, the compiler rejects running a permission-checked program without one.

### API

| Function               | Type                                     |
| ---------------------- | ---------------------------------------- |
| `authz.require(check)` | `Effect<void, PermissionDenied, Scopes>` |
| `authz.can(check)`     | `Effect<boolean, never, Scopes>`         |
| `authz.cannot(check)`  | `Effect<boolean, never, Scopes>`         |

`check` is a single permission, a list (AND), or a list of lists (OR), as in guard-core.

`PermissionDenied` is a `Schema.TaggedError` with a `required` field. Handle it like any other error:

```ts
program.pipe(Effect.catchTag("PermissionDenied", (e) => Effect.succeed(forbidden(e.required))));
```

## HttpApi

`@savvycodes/guard-effect/http-api` adds an `Authorization` middleware for `effect/http-api`. It reads the required permission from endpoint or group annotations, and fails with `PermissionDenied` (HTTP 403) when the current `Scopes` don't satisfy it. Endpoint annotations take precedence over group annotations; endpoints without one are allowed through.

```ts
import { Authorization, createGuard, layer as AuthorizationLayer } from "@savvycodes/guard-effect/http-api";

export const authz = createGuard(createCoreGuard(user, admin));

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("me", "/me", { success: User }),
    HttpApiEndpoint.post("setRoles", "/:id/roles", { payload: Roles }).pipe(
      authz.permission("user:write"),
    ),
  )
  .pipe(authz.permission("user:me")) // default for the group
  .middleware(Authorization)
  .middleware(Authentication) {}
```

`Authorization` requires `Scopes`, so it needs an authentication middleware that provides them (declare it with `provides: Scopes`). Middleware added later runs first, so add `Authentication` after `Authorization`:

```ts
class Authentication extends HttpApiMiddleware.Service<Authentication, { provides: Scopes }>()(
  "app/Authentication",
  { security: { bearer: HttpApiSecurity.bearer }, error: Unauthorized },
) {}

const AuthenticationLayer = Layer.succeed(
  Authentication,
  Authentication.of({
    bearer: Effect.fn(function* (httpEffect, { credential }) {
      const session = yield* verify(credential);
      return yield* Effect.provideService(httpEffect, Scopes, session.permissions);
    }),
  }),
);
```

Provide `AuthorizationLayer` and `AuthenticationLayer` to your handlers. Handlers can also call `authz.require` or `authz.can` for checks that depend on the request, such as ownership.
