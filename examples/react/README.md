# Guard React Example

This example demonstrates how to use `@savvycodes/guard-react` for type-safe, permission-based UI rendering in a React application.

## Features Demonstrated

### 1. **Module Augmentation for Type Safety**

- Type declaration in `src/types/guard.d.ts` provides autocomplete and type checking
- No need to specify generic type parameters everywhere
- Permissions are type-checked at compile time

### 2. **Permission Checking Patterns**

#### Using the `useGuard` Hook

```tsx
const canEdit = useGuard("post:edit");
const canDelete = useGuard("post:delete");

{
  canEdit && <button>Edit</button>;
}
```

#### Using the `Guard` Component

```tsx
// Simple conditional rendering
<Guard check="post:create">
  <button>Create Post</button>
</Guard>

// Function pattern with hasPermission boolean
<Guard check="admin:dashboard">
  {(hasPermission) =>
    hasPermission ? <AdminPanel /> : <UserPanel />
  }
</Guard>
```

#### Using the `withPermission` HOC

```tsx
// Wrap component - only renders if user has permission
const UserEditor = withPermission("user:edit")(UserEditorComponent);

// OR logic - multiple permission options
const UserManager = withPermission([["user:edit"], ["admin:dashboard"]])(
  UserManagerComponent
);
```

### 3. **Permission Logic**

#### AND Logic (all permissions required)

```tsx
<Guard check={["post:edit", "post:publish"]}>
  <button>Edit & Publish</button>
</Guard>
```

#### OR Logic (any permission works)

```tsx
<Guard check={[["admin:dashboard"], ["user:edit"]]}>
  <button>Manage</button>
</Guard>
```

### 4. **Dynamic Permission Display**

- Shows current user's permissions
- Lists all available permissions in the system
- Visual indicators for active/inactive permissions

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

The app will open at `http://localhost:5173`

### Build for Production

```bash
pnpm build
```

## Project Structure

```
src/
├── types/
│   └── guard.d.ts          # Module augmentation for type safety
├── permissions.ts          # Permission definitions and guard creation
├── components/
│   ├── Dashboard.tsx       # useGuard hook example
│   ├── PostList.tsx        # Guard component examples
│   └── ProtectedComponents.tsx  # withPermission HOC examples
├── App.tsx                 # Main app with PermissionProvider
├── App.css                 # Styles
└── main.tsx               # Entry point
```

## How It Works

1. **Define Permissions** (`permissions.ts`):

   ```tsx
   const adminRole = defineRole(['admin:dashboard', 'user:create', ...]);
   const userRole = defineRole(['user:view', 'post:create', ...]);
   const guard = createGuard(adminRole, userRole);
   ```

2. **Module Augmentation** (`types/guard.d.ts`):

   ```tsx
   declare module "@savvycodes/guard-react" {
     interface DefaultPermissions {
       permissions: InferPermission<typeof adminRole | typeof userRole>;
     }
   }
   ```

3. **Provide Guard** (`App.tsx`):

   ```tsx
   <PermissionProvider guard={guard} scopes={userScopes}>
     <YourApp />
   </PermissionProvider>
   ```

4. **Use in Components**:
   - `useGuard()` hook for conditional logic
   - `<Guard>` component for conditional rendering
   - `withPermission()` HOC for wrapping components

## User Types

Toggle between three user types to see different permissions:

- **👑 Admin**: Full access to all features
- **👤 User**: Can view and create posts, limited admin access
- **👥 Guest**: Read-only access to posts

## Key Learnings

1. **Type Safety**: All permissions are type-checked at compile time
2. **No Generics Needed**: Module augmentation means no `<T>` everywhere
3. **Flexible Patterns**: Choose the pattern that fits your use case
4. **AND/OR Logic**: Complex permission requirements made simple
5. **List All Permissions**: `guard.permissions()` returns all unique permissions

## Learn More

- [@savvycodes/guard Documentation](../../README.md)
- [Module Augmentation Guide](../../packages/react/README-module-augmentation.md)
- [Core Package](../../packages/core)
- [React Package](../../packages/react)
