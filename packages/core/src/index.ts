import every from "lodash/every";
import isArray from "lodash/isArray";
import isString from "lodash/isString";

/**
 * Base permission type - string by default
 */
export type Permission = string;

/**
 * A readonly array of permissions with type information
 */
export type PermissionList<T extends string> = readonly T[];

/**
 * Infer permission type from a permission list
 */
export type InferPermission<T> = T extends PermissionList<infer P> ? P : never;

/**
 * Guard instance with bound permission checking functions
 */
export interface Guard<T extends string> {
  can: (scopes: string[], requiredScopes: T | T[] | T[][]) => boolean;
  cannot: (scopes: string[], requiredScopes: T | T[] | T[][]) => boolean;
  /**
   * Get all unique permissions known to this guard
   * @returns Array of all unique permissions (no duplicates)
   */
  permissions: () => T[];
}

/**
 * Define a permission set with automatic type inference (no `as const` needed!)
 *
 * @example
 * ```ts
 * // Array syntax
 * const superuser = definePermissions(['superuser', 'user:write', 'user:read', 'admin:read', 'admin:write']);
 * const admin = definePermissions(['admin:write', 'admin:read', 'user:read']);
 * const user = definePermissions(['user:read']);
 *
 * // Variadic syntax
 * const admin = definePermissions('admin', 'user:view');
 * const user = definePermissions('user:read');
 *
 * // superuser is readonly ['superuser', 'user:write', ...] with full type info
 * ```
 */
export function definePermissions<const T extends readonly string[]>(
  permissions: T,
): PermissionList<T[number]>;
export function definePermissions<const T extends string>(...permissions: T[]): PermissionList<T>;
export function definePermissions<const T extends readonly string[] | string>(
  ...args: T extends readonly string[] ? [T] : T[]
): PermissionList<T extends readonly string[] ? T[number] : T extends string ? T : never> {
  // If first argument is an array, use it directly
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0] as any;
  }
  // Otherwise, treat all arguments as individual permissions
  return args as any;
}

/**
 * Alias for definePermissions - use this when defining permissions for a role
 *
 * @example
 * ```ts
 * const superuser = defineRole(['superuser', 'user:write', 'user:read', 'admin:read', 'admin:write']);
 * const admin = defineRole(['admin:write', 'admin:read', 'user:read']);
 * const user = defineRole(['user:read']);
 * ```
 */
export const defineRole = definePermissions;

/**
 * Create a guard with bound permission checking functions that know about all available permissions
 *
 * @example
 * ```ts
 * const superuser = definePermissions(['superuser', 'user:write', 'user:read']);
 * const admin = definePermissions(['admin:write', 'admin:read', 'user:read']);
 * const user = definePermissions(['user:read']);
 *
 * const guard = createGuard(superuser, admin, user);
 *
 * const scopes = ['superuser'];
 * guard.can(scopes, 'superuser'); // ✅ Full autocomplete
 * guard.can(scopes, 'user:write'); // ✅ Full autocomplete
 * ```
 */
export function createGuard<const T extends readonly PermissionList<string>[]>(
  ...permissionLists: T
): Guard<InferPermission<T[number]>> {
  type P = InferPermission<T[number]>;

  // Flatten and deduplicate permissions
  const allPermissions = [...new Set(permissionLists.flat())] as P[];

  return {
    can: (scopes: string[], requiredScopes: P | P[] | P[][]) => can(scopes, requiredScopes),
    cannot: (scopes: string[], requiredScopes: P | P[] | P[][]) => cannot(scopes, requiredScopes),
    permissions: () => allPermissions,
  };
}

/**
 * Check for required scopes
 *
 * Example:
 * ```js
 * const scopes = ['user:write'];
 * const userWriteOrAdmin = [['user:write'], ['admin']]
 * const userWriteAndAdmin = ['user:write', 'admin']
 * const singlePermission = 'user:write'
 * const noPermission = ['permission:not:in:scope']
 *
 * can(scopes, userWriteOrAdmin) // => true
 * can(scopes, userWriteAndAdmin) // => false
 * can(scopes, singlePermission) // => true
 * can(scopes, noPermission) // => false
 * ```
 *
 * @param {*} scopes
 * @param {*} requiredScopes
 * @returns
 */
export function can<T extends string = Permission>(
  scopes: string[],
  requiredScopes: T | T[] | T[][],
): boolean {
  if (!requiredScopes || !scopes) return false;

  const required = isString(requiredScopes)
    ? ([[requiredScopes]] as T[][])
    : isArray(requiredScopes) && every(requiredScopes, isString)
      ? ([requiredScopes] as T[][])
      : (requiredScopes as T[][]);

  // Check if scopes have sufficient permissions
  const sufficient = required.some((scope) => {
    return every(scope, (permission: T) => {
      return scopes.indexOf(permission) !== -1;
    });
  });

  return sufficient;
}

export function cannot<T extends string = Permission>(
  scopes: string[],
  requiredScopes: T | T[] | T[][],
): boolean {
  return !can(scopes, requiredScopes);
}
