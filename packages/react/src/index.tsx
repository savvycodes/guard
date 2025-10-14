import type { Guard } from "@savvycodes/guard-core";
import type React from "react";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

/**
 * Permission context value with bound guard
 */
export interface PermissionContextValue<T extends string> {
  scopes: string[];
  guard: Guard<T>;
}

/**
 * Props for PermissionProvider
 */
export interface PermissionProviderProps<T extends string> {
  scopes: string[];
  guard: Guard<T>;
  children: ReactNode;
}

/**
 * Props for Guard component
 */
export interface GuardProps<T extends string> {
  /**
   * Required permission(s) to check
   */
  check: T | T[] | T[][];
  /**
   * Content to render. Can be:
   * - ReactNode: renders only when user has permission
   * - Function: receives hasPermission boolean and returns ReactNode
   */
  children?: ReactNode | ((hasPermission: boolean) => ReactNode);
  /**
   * Alternative to children. Can be:
   * - ReactNode: renders only when user has permission
   * - Function: receives hasPermission boolean and returns ReactNode
   */
  render?: ReactNode | ((hasPermission: boolean) => ReactNode);
}

/**
 * Create typed React permission utilities from a guard instance
 *
 * @param guard - A typed guard instance created with createGuard() from @savvycodes/guard-core
 * @returns An object containing typed Provider, hooks, and components
 *
 * @example
 * ```tsx
 * import { createGuard, defineRole } from '@savvycodes/guard-core';
 * import { createGuard as createGuardReact } from '@savvycodes/guard-react';
 *
 * // Define roles
 * const admin = defineRole(['admin:write', 'admin:read', 'user:read']);
 * const user = defineRole(['user:read']);
 *
 * // Create guard
 * const guard = createGuard(admin, user);
 *
 * // Create typed React utilities
 * const { PermissionProvider, useGuard, usePermissionContext, Guard, withPermission } = createGuardReact(guard);
 *
 * // Use in your app
 * function App() {
 *   const userScopes = ['user:read']; // from DB, JWT, etc.
 *
 *   return (
 *     <PermissionProvider scopes={userScopes} guard={guard}>
 *       <MyComponent />
 *     </PermissionProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const canWrite = useGuard('admin:write'); // Fully typed!
 *
 *   return (
 *     <Guard check="admin:write">
 *       <button>Delete</button>
 *     </Guard>
 *   );
 * }
 * ```
 */
export function createGuard<T extends string>(_guardInstance: Guard<T>) {
  const PermissionContext = createContext<
    PermissionContextValue<T> | undefined
  >(undefined);

  /**
   * Permission provider component
   */
  function PermissionProvider({
    scopes,
    guard,
    children,
  }: PermissionProviderProps<T>) {
    return (
      <PermissionContext.Provider value={{ scopes, guard }}>
        {children}
      </PermissionContext.Provider>
    );
  }

  /**
   * Hook to access permission context
   *
   * @throws Error if used outside of PermissionProvider
   */
  function usePermissionContext(): PermissionContextValue<T> {
    const context = useContext(PermissionContext);
    if (context === undefined) {
      throw new Error(
        "usePermissionContext must be used within a PermissionProvider"
      );
    }
    return context;
  }

  /**
   * Hook to check if user has the required permission(s)
   *
   * @param requiredPermissions - The permission(s) to check. Can be:
   *   - A single permission: `'user:write'`
   *   - Multiple permissions (AND): `['user:write', 'user:read']`
   *   - Multiple permissions (OR): `[['user:write'], ['admin:write']]`
   *
   * @returns Boolean indicating if user has the required permission(s)
   */
  function useGuard(requiredPermissions: T | T[] | T[][]): boolean {
    const { scopes, guard } = usePermissionContext();

    const hasPermission = useMemo(() => {
      return guard.can(scopes, requiredPermissions);
    }, [scopes, guard, requiredPermissions]);

    return hasPermission;
  }

  /**
   * Component to conditionally render content based on permissions
   */
  function Guard({ check, children, render }: GuardProps<T>) {
    const hasPermission = useGuard(check);

    // Determine what to render (render prop takes precedence over children)
    const content = render !== undefined ? render : children;

    // If content is a function, call it with hasPermission
    if (typeof content === "function") {
      return <>{content(hasPermission)}</>;
    }

    // Otherwise, render content only if has permission
    return <>{hasPermission ? content : null}</>;
  }

  /**
   * Higher-Order Component that conditionally renders a component based on permissions
   *
   * @param requiredPermissions - The permission(s) to check
   * @returns A function that accepts a component and returns it wrapped with permission checking
   */
  function withPermission(requiredPermissions: T | T[] | T[][]) {
    return <P extends object>(
      Component: React.ComponentType<P>
    ): React.FC<P> => {
      const WrappedComponent: React.FC<P> = (props) => {
        const hasPermission = useGuard(requiredPermissions);

        if (!hasPermission) {
          return null;
        }

        return <Component {...props} />;
      };

      WrappedComponent.displayName = `withPermission(${
        Component.displayName || Component.name || "Component"
      })`;

      return WrappedComponent;
    };
  }

  return {
    PermissionProvider,
    usePermissionContext,
    useGuard,
    Guard,
    withPermission,
  };
}

// Export types for users who want to use them
export type { Guard } from "@savvycodes/guard-core";
