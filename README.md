# @savvycodes/guard

A TypeScript permission utility library with **full type safety** and support for Node.js, browsers, React, and HTTP frameworks.

## Features

✨ **Type-Safe Permission Definitions** - Define permissions with automatic type inference
🎯 **Flexible Permission Logic** - Single permissions, AND logic, OR logic  
⚛️ **React Integration** - Provider, hooks, Guard component with render props, and HOC  
🌐 **HTTP Middleware** - Express middleware for route protection  
📦 **Zero Config** - Works out of the box with sensible defaults  
🔒 **Secure by Default** - Permission checks are fail-safe (deny by default)

## Quick Start

### 1. Define Your Permissions

```typescript
import {
  defineRole,
  createGuard,
  InferPermission,
} from "@savvycodes/guard-core";

// Define your roles with permissions
const admin = defineRole(["admin:write", "admin:read", "user:read"]);
const user = defineRole(["user:read"]);

// Create a guard with full type safety
const guard = createGuard(admin, user);

// Extract the permission type
type AppPermission = InferPermission<typeof admin | typeof user>;
```

### 2. Use the Guard with Full Autocomplete

```typescript
// ✅ Full autocomplete for all permissions
const scopes = ["admin:write", "admin:read"];

// Check permissions
guard.can(scopes, "admin:write"); // true
guard.can(scopes, "user:write"); // false
guard.cannot(scopes, "user:write"); // true

// AND logic - user needs ALL permissions
guard.can(scopes, ["admin:write", "admin:read"]); // true

// OR logic - user needs ANY of the permission sets
guard.can(scopes, [["admin:write"], ["user:read"]]); // true

// List all permissions (no duplicates)
const allPermissions = guard.permissions();
// => ["admin:write", "admin:read", "user:read"]

guard.can(scopes, [["admin:write"], ["user:read"]]); // true
```

## Packages

This monorepo contains the following packages:

### [@savvycodes/guard-core](./packages/core)

Core permission utilities with type-safe permission definitions and flexible checking logic.

```typescript
import {
  definePermissions,
  defineRole,
  createGuard,
  InferPermission,
} from "@savvycodes/guard-core";

// Define permissions/roles with full type inference
const adminRole = defineRole(["user:read", "user:write", "admin:write"]);
const userRole = defineRole(["user:read"]);

// Create a guard
const guard = createGuard(adminRole, userRole);

// Extract permission type
type AppPermission = InferPermission<typeof adminRole | typeof userRole>;

const userScopes = ["user:write"];

// Simple permission check
guard.can(userScopes, "user:write"); // true

// AND logic - user needs ALL permissions
guard.can(["user:write", "admin:write"], ["user:write", "admin:write"]); // true

// OR logic - user needs ANY of the permission sets
guard.can(["user:write"], [["user:write"], ["admin:write"]]); // true

// Negative check
guard.cannot(["user:write"], "admin:write"); // true
```

### [@savvycodes/guard-react](./packages/react)

React components, hooks, HOC, and context for declarative permission checks.

```typescript
import { createGuard as createGuardReact } from "@savvycodes/guard-react";
import { defineRole, createGuard } from "@savvycodes/guard-core";

// Define your permissions and create guard
const adminRole = defineRole(["admin:write", "admin:read", "user:read"]);
const userRole = defineRole(["user:read"]);
const guard = createGuard(adminRole, userRole);

// Create typed React utilities
const { PermissionProvider, useGuard, Guard, withPermission } =
  createGuardReact(guard);

// Provider with scopes and guard
function App() {
  const userScopes = ["user:read"]; // from your auth system

  return (
    <PermissionProvider scopes={userScopes} guard={guard}>
      <Dashboard />
    </PermissionProvider>
  );
}

function Dashboard() {
  // Hook - returns boolean
  const canWrite = useGuard("user:write");
  const canRead = useGuard("user:read");

  return (
    <div>
      {/* Guard component with children */}
      <Guard check="user:write">
        <button>Create Post</button>
      </Guard>

      {/* Guard with function - full control */}
      <Guard check="admin:write">
        {(hasPermission) =>
          hasPermission ? <AdminPanel /> : <div>No access</div>
        }
      </Guard>

      {/* Guard with render prop */}
      <Guard
        check="user:read"
        render={(hasPermission) => (hasPermission ? <Posts /> : null)}
      />

      {/* OR logic */}
      <Guard check={[["admin:write"], ["user:write"]]}>
        <EditButton />
      </Guard>

      {/* Use hook result */}
      {canWrite && <PostEditor />}
      {canRead && <PostList />}
    </div>
  );
}

// Higher-Order Component - renders component only if has permission
const AdminPanel = withPermission("admin:write")(() => <div>Admin Panel</div>);

const CanWriteOrAdmin = withPermission([["user:write"], ["admin:write"]])(
  () => <p>I can write or am an admin</p>
);

// HOC with props
interface EditorProps {
  postId: string;
}

const PostEditor = withPermission("user:write")(({ postId }: EditorProps) => (
  <div>Editing post {postId}</div>
));

// Use it
<PostEditor postId="123" />;
```

### [@savvycodes/guard-express](./packages/express)

Express middleware with type-safe permission checks.

```typescript
// Express middleware with type-safe permissions
import { createGuard, defineRole } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard } from "@savvycodes/guard-express";

// Define permissions for autocomplete
const adminRole = defineRole(["admin", "posts:read", "posts:write"]);
const userRole = defineRole(["posts:read"]);

// Create guard
const guard = createGuard(adminRole, userRole);

// Create typed Express middleware
const { check, can, cannot } = createExpressGuard(guard);

// Simple permission check with autocomplete
app.get("/posts", check("posts:read"), (req, res) => {
  res.json({ posts: [] });
});

// AND logic - user needs both permissions
app.post("/posts", check(["posts:write", "posts:publish"]), (req, res) => {
  res.json({ success: true });
});

// OR logic - user needs either permission set
app.get(
  "/admin",
  check([["admin"], ["posts:write", "posts:read"]]),
  (req, res) => {
    res.json({ admin: true });
  }
);

// Use can/cannot as middleware (inverse of check)
app.get("/posts", can("posts:write"), (req, res) => {
  res.json({ message: "You can write posts" });
});

app.get("/upgrade", cannot("premium"), (req, res) => {
  res.json({ message: "Upgrade to premium!" });
});
```

## Type Safety

This library uses TypeScript's const type parameters for automatic type inference:

```typescript
// 1. Define permissions/roles
const adminRole = defineRole(["user:read", "user:write", "admin:write"]);
const userRole = defineRole(["user:read"]);

// 2. Create guard
const guard = createGuard(adminRole, userRole);

// 3. Infer the type
type AppPermission = InferPermission<typeof adminRole | typeof userRole>;
// AppPermission = 'user:read' | 'user:write' | 'admin:write'

// 4. Get full autocomplete and type safety everywhere
const scopes: string[] = ["user:read"]; // flexible - accepts any string[]
guard.can(scopes, "user:read"); // ✅ Autocomplete works!
guard.can(scopes, "user:write"); // ✅ Also autocompletes
```

## Development

This monorepo uses pnpm workspaces.

### Install dependencies

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Run tests in watch mode

```bash
pnpm -r test:watch
```

### Type checking

```bash
pnpm typecheck
```

## License

ISC
