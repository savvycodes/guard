# @savvycodes/guard-react

Type-safe permission-based UI rendering for React applications.

## Features

✨ **Automatic Type Inference** - Types are automatically inferred from your guard instance  
🎯 **Zero Configuration** - No module augmentation or type declaration files needed  
🪝 **React Hooks** - Use `useGuard` to check permissions in components  
🧩 **Guard Component** - Conditionally render content with the `<Guard>` component  
🎨 **HOC Support** - Wrap components with `withPermission` for clean code  
💪 **Fully Type-Safe** - Get autocomplete and type checking for all permissions

## Installation

```bash
npm install @savvycodes/guard-react @savvycodes/guard-core
# or
pnpm add @savvycodes/guard-react @savvycodes/guard-core
# or
yarn add @savvycodes/guard-react @savvycodes/guard-core
```

## Quick Start

### 1. Define Your Permissions and Create Typed Utilities

```typescript
// permissions.ts
import { defineRole, createGuard } from "@savvycodes/guard-core";
import { createGuard as createGuardReact } from "@savvycodes/guard-react";

// Define roles with their permissions
const admin = defineRole([
  "admin:dashboard",
  "admin:settings",
  "user:create",
  "user:edit",
  "user:delete",
  "user:view",
]);

const user = defineRole(["user:view", "user:edit"]);

const guest = defineRole(["user:view"]);

// Create the guard - this will know about ALL permissions
export const guard = createGuard(admin, user, guest);

// Create typed React utilities from the guard
// This gives you fully typed hooks and components!
export const {
  PermissionProvider,
  useGuard,
  usePermissionContext,
  Guard,
  withPermission,
} = createGuardReact(guard);
```

### 2. Set Up the Provider

```tsx
// App.tsx
import { PermissionProvider, guard } from "./permissions";

function App() {
  // Get user's scopes from your auth system (JWT, session, etc.)
  const userScopes = ["user:view", "user:edit"];

  return (
    <PermissionProvider guard={guard} scopes={userScopes}>
      <YourApp />
    </PermissionProvider>
  );
}
```

### 3. Use in Components

**With the `useGuard` Hook:**

```tsx
import { useGuard } from "./permissions";

function EditButton() {
  const canEdit = useGuard("user:edit"); // ✅ Fully type-safe!

  if (!canEdit) {
    return null;
  }

  return <button>Edit User</button>;
}
```

**With the `Guard` Component:**

```tsx
import { Guard } from "./permissions";

function AdminPanel() {
  return (
    <Guard check="admin:dashboard">
      <div>Admin Dashboard Content</div>
    </Guard>
  );
}

// Function as children pattern
function UserActions() {
  return (
    <Guard check="user:edit">
      {(canEdit) => (canEdit ? <button>Edit</button> : <span>View Only</span>)}
    </Guard>
  );
}
```

**With the `withPermission` HOC:**

```tsx
import { withPermission } from "./permissions";

function UserEditor({ userId }: { userId: string }) {
  return <div>Editing user {userId}</div>;
}

// Wrap component - only renders if user has permission
const ProtectedUserEditor = withPermission("user:edit")(UserEditor);

// Use it
<ProtectedUserEditor userId="123" />;
```

## API Reference

### `createGuard(guard)`

Factory function that creates typed React utilities from a guard instance.

```typescript
import { createGuard } from "@savvycodes/guard-core";
import { createGuard as createGuardReact } from "@savvycodes/guard-react";

const guard = createGuard(admin, user, guest);

// Creates fully typed utilities
const {
  PermissionProvider,
  useGuard,
  usePermissionContext,
  Guard,
  withPermission,
} = createGuardReact(guard);
```

**Note:** Import as `createGuardReact` (or any name you prefer) to avoid naming conflicts with the core package's `createGuard`.

### `PermissionProvider`

Provides permission context to child components.

```tsx
<PermissionProvider
  guard={guard} // Your guard instance
  scopes={userScopes} // User's current scopes
>
  {children}
</PermissionProvider>
```

### `useGuard(requiredPermissions)`

Hook to check if user has required permission(s).

```tsx
// Single permission
const canView = useGuard("user:view");

// Multiple permissions (AND logic - needs all)
const canEditAndDelete = useGuard(["user:edit", "user:delete"]);

// Multiple permissions (OR logic - needs any)
const canEditOrDelete = useGuard([["user:edit"], ["user:delete"]]);
```

### `<Guard>`

Component to conditionally render based on permissions.

```tsx
// Simple render when has permission
<Guard check="admin:dashboard">
  <AdminDashboard />
</Guard>

// Function as children (receives boolean)
<Guard check="user:edit">
  {(canEdit) => canEdit ? <Editor /> : <Viewer />}
</Guard>

// With render prop
<Guard
  check="user:delete"
  render={(canDelete) => canDelete && <DeleteButton />}
/>
```

### `withPermission(requiredPermissions)`

Higher-Order Component to wrap components with permission checking.

```tsx
// Simple usage
const ProtectedComponent = withPermission("admin:settings")(Settings);

// With multiple permissions
const ProtectedEditor = withPermission(["user:view", "user:edit"])(Editor);

// With OR logic
const ProtectedButton = withPermission([["admin"], ["user:edit"]])(EditButton);
```

## Permission Logic

### Single Permission (String)

```tsx
useGuard("user:edit");
// Checks if user has 'user:edit'
```

### Multiple Permissions - AND Logic (Array)

```tsx
useGuard(["user:view", "user:edit"]);
// User must have BOTH 'user:view' AND 'user:edit'
```

### Multiple Permissions - OR Logic (Nested Array)

```tsx
useGuard([["admin"], ["user:edit"]]);
// User needs EITHER 'admin' OR 'user:edit'
```

### Complex Logic

```tsx
useGuard([
  ["admin"], // Admin, OR
  ["user:edit", "user:delete"], // (user:edit AND user:delete)
]);
```

## Type Safety

Types are **automatically inferred** from your guard instance. No manual type declarations needed!

```typescript
const guard = createGuard(admin, user);

// In your components:
useGuard("admin:dashboard"); // ✅ Autocomplete works!
useGuard("invalid:perm"); // ❌ TypeScript error!
```

## Migration from Module Augmentation

If you're upgrading from a version that used module augmentation, see [MIGRATION.md](./MIGRATION.md) for a complete guide.

**TL;DR:**

1. Delete your `types/guard.d.ts` file
2. Everything else works the same!

## Examples

Check out the [examples/react](../../examples/react) directory for a complete working example with:

- Multiple user roles (admin, user, guest)
- Permission-based UI rendering
- All API patterns demonstrated

## License

ISC
