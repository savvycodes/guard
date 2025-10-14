# @savvycodes/guard-express

Express middleware for type-safe permission checking with `@savvycodes/guard-core`.

## Installation

```bash
npm install @savvycodes/guard-express @savvycodes/guard-core
```

## Express Middleware

The Express middleware provides a factory function that creates typed middleware from a guard instance, similar to the React API.

### Basic Usage

```typescript
import express from "express";
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

const app = express();

// Define permissions
const permissions = definePermissions(["status", "user:read", "user:write"]);

// Create a guard from core
const guard = createGuard(permissions);

// Create typed Express middleware
const { check, can, cannot } = createExpressGuard(guard);

// Single permission required
app.get("/status", check("status"), (req, res) => {
  res.json({ status: "ok" });
});

// Multiple permissions required (AND logic)
app.get("/user", check(["user:read", "user:write"]), (req, res) => {
  res.json({ user: {} });
});
```

### Type-Safe Permissions

The middleware gets full type safety and autocomplete from the guard:

```typescript
import express from "express";
import {
  createGuard,
  definePermissions,
  defineRole,
} from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

const app = express();

// Define permissions for different roles
const adminPerms = definePermissions([
  "admin",
  "user:read",
  "user:write",
  "posts:write",
  "posts:delete",
]);
const editorPerms = definePermissions([
  "posts:write",
  "posts:read",
  "user:read",
]);
const userPerms = definePermissions(["posts:read", "user:read"]);

// Create guard with full type safety
const guard = createGuard(adminPerms, editorPerms, userPerms);

// Create typed Express middleware - now you get full autocomplete!
const { check, can, cannot } = createExpressGuard(guard);

// Single permission with autocomplete
app.get("/admin", check("admin"), (req, res) => {
  res.json({ admin: true });
});

// AND logic - user needs both permissions
app.post("/posts", check(["posts:write", "posts:read"]), (req, res) => {
  res.json({ success: true });
});

// OR logic - user needs admin OR (posts:write AND posts:delete)
app.delete(
  "/posts/:id",
  check([["admin"], ["posts:write", "posts:delete"]]),
  (req, res) => {
    res.json({ deleted: true });
  }
);
```

### Using `can` and `cannot` as Middleware

The guard instance provides `can` and `cannot` methods that work just like `check`:

```typescript
const { check, can, cannot } = createExpressGuard(guard);

// can() - Same as check(), allows access if user HAS the permission
app.get("/posts", can("posts:read"), (req, res) => {
  res.json({ posts: [] });
});

// cannot() - Inverse of can(), allows access if user LACKS the permission
// Useful for routes that should only be accessible to users without certain permissions
app.get("/upgrade", cannot("premium"), (req, res) => {
  res.json({ message: "Upgrade to premium!" });
});

// All three methods support the same permission logic
app.post("/posts", can(["posts:write", "posts:create"]), (req, res) => {
  res.json({ success: true });
});

app.get("/admin", can([["admin"], ["superuser"]]), (req, res) => {
  res.json({ admin: true });
});
```

**Key Differences:**

- **`check(permissions)`**: Allows access if user HAS the permissions (most common)
- **`can(permissions)`**: Alias for `check()` - allows access if user HAS the permissions
- **`cannot(permissions)`**: Inverse - allows access if user LACKS the permissions

````

### Configuration

By default, the middleware looks for permissions in `req.user.permissions`. You can customize this:

```typescript
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

const permissions = definePermissions(["user:read", "user:write"]);
const guard = createGuard(permissions);

const { check, can, cannot } = createExpressGuard(guard, {
  requestProperty: "identity", // Look for user object in req.identity
  permissionsProperty: "scope", // Look for permissions in scope property
});

app.use(check("user:read"));
```

### Using `.unless()` for Conditional Middleware

All middleware functions (`check`, `can`, `cannot`) support the `.unless()` method from `express-unless`, allowing you to skip permission checks for specific routes or conditions:

```typescript
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

const permissions = definePermissions(["admin", "user:read", "user:write"]);
const guard = createGuard(permissions);
const { check, can } = createExpressGuard(guard);

// Skip auth for specific paths
app.use(
  check("user:read").unless({
    path: ["/public", "/login", "/register"],
  })
);

// Skip auth for specific HTTP methods
app.use(
  check("admin").unless({
    method: ["GET", "HEAD"],
  })
);

// Skip auth based on custom logic
app.use(
  can("user:write").unless({
    custom: (req) => req.headers["x-api-key"] === "secret-key",
  })
);

// Combine multiple conditions
app.use(
  check("admin").unless({
    path: ["/public", { url: "/api", method: "GET" }],
    ext: ["html", "css", "js"],
  })
);
```

**Unless Options:**

- `path`: String, RegExp, or array of paths to skip
- `method`: String or array of HTTP methods to skip (e.g., `['GET', 'POST']`)
- `ext`: String or array of file extensions to skip (e.g., `['html', 'css']`)
- `custom`: Function that receives the request and returns `true` to skip the middleware
- `useOriginalUrl`: Boolean, whether to use `req.originalUrl` instead of `req.url` (default: `true`)

**Example with path patterns:**

```typescript
// Skip for exact paths
check("admin").unless({ path: ["/login", "/register"] });

// Skip for paths matching regex
check("admin").unless({ path: [/^\/public\//] });

// Skip for specific path and method combinations
check("admin").unless({
  path: [
    "/public",
    { url: "/api/users", method: "GET" },
    { url: /^\/api\/posts/, methods: ["GET", "HEAD"] },
  ],
});
```
````

### Permission Format

The middleware supports two permission formats:

1. **Array of strings** (default)

```json
{
  "permissions": ["status", "user:read", "user:write"]
}
```

2. **Space-delimited string** (OAuth 2.0 scope format)

```json
{
  "scope": "status user:read user:write"
}
```

### Permission Logic

**Single permission:**

```typescript
// User must have 'admin' permission
check("admin");
```

**AND logic (all required):**

```typescript
// User must have both 'read' AND 'write'
check(["read", "write"]);
```

**OR logic (at least one required):**

```typescript
// User must have 'read' OR 'write'
check([["read"], ["write"]]);

// User must have 'admin' OR ('read' AND 'write')
check([["admin"], ["read", "write"]]);
```

### Error Handling

The middleware throws a `PermissionDeniedError` when permissions are insufficient:

```typescript
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import {
  createGuard as createExpressGuard,
  PermissionDeniedError,
} from "@savvycodes/guard-express";

const permissions = definePermissions(["admin"]);
const guard = createGuard(permissions);
const { check } = createExpressGuard(guard);

app.use(check("admin"));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof PermissionDeniedError) {
    // err.code === 'permission_denied'
    // err.status === 403
    res.status(403).send("Forbidden");
  } else {
    next(err);
  }
});
```

### Complete Example with JWT

```typescript
import express from "express";
import jwt from "express-jwt";
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

const app = express();

// JWT authentication middleware
app.use(
  jwt({
    secret: "your-secret",
    algorithms: ["HS256"],
  })
);

// Define permissions and create guard
const permissions = definePermissions([
  "status",
  "posts:read",
  "posts:write",
  "posts:create",
  "posts:delete",
  "admin",
]);
const guard = createGuard(permissions);
const { check } = createExpressGuard(guard);

// Routes with permission checks
app.get("/public", (req, res) => {
  res.json({ message: "Public endpoint" });
});

app.get("/status", check("status"), (req, res) => {
  res.json({ status: "ok" });
});

app.get("/posts", check("posts:read"), (req, res) => {
  res.json({ posts: [] });
});

app.post("/posts", check(["posts:write", "posts:create"]), (req, res) => {
  res.json({ success: true });
});

app.get(
  "/admin",
  check([["admin"], ["posts:write", "posts:read", "posts:delete"]]),
  (req, res) => {
    res.json({ admin: true });
  }
);

// Error handling
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.status(401).send("Invalid token");
  } else if (err.code === "permission_denied") {
    res.status(403).send("Forbidden");
  } else {
    res.status(500).send("Internal server error");
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## TypeScript Support

Full TypeScript support with automatic type inference when using `definePermissions`:

```typescript
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

// Define your permissions - types are automatically inferred!
const adminPerms = definePermissions([
  "admin",
  "user:read",
  "user:write",
  "posts:read",
  "posts:write",
]);
const userPerms = definePermissions(["user:read", "posts:read"]);

const guard = createGuard(adminPerms, userPerms);
const { check, can, cannot } = createExpressGuard(guard);

// Full autocomplete and type checking for all methods
app.get("/user", check("user:read"), handler); // ✅ Autocomplete!
app.get("/admin", check("admin"), handler); // ✅ Autocomplete!

// Type errors for invalid permissions
app.get("/invalid", check("invalid:perm"), handler); // ❌ TypeScript error!

// Also works with can/cannot middleware
app.get("/posts", can("posts:write"), handler); // ✅ Autocomplete!
app.get("/free-only", cannot("premium"), handler); // ✅ Autocomplete!
```

## License

ISC
