import { createGuard, defineRole } from "@savvycodes/guard-core";
import { createGuard as createGuardReact } from "@savvycodes/guard-react";

/**
 * Define application roles with their permissions
 */
export const admin = defineRole([
  "admin:dashboard",
  "admin:settings",
  "user:create",
  "user:edit",
  "user:delete",
  "user:view",
  "post:create",
  "post:edit",
  "post:delete",
  "post:view",
  "post:publish",
]);

export const user = defineRole(["user:view", "post:create", "post:edit", "post:view"]);

export const guest = defineRole(["post:view"]);

/**
 * Create the guard instance with all roles
 * This guard knows about all permissions across all roles
 */
export const guard = createGuard(admin, user, guest);

/**
 * Create typed React utilities from the guard
 * This gives us fully typed hooks and components!
 */
export const { PermissionProvider, useGuard, usePermissionContext, Guard, withPermission } = createGuardReact(guard);

/**
 * Mock function to simulate getting user scopes from authentication
 * In a real app, this would come from your auth system (JWT, session, etc.)
 */
export function getUserScopes(userType: "admin" | "user" | "guest") {
  switch (userType) {
    case "admin":
      return [...admin];
    case "user":
      return [...user];
    case "guest":
      return [...guest];
    default:
      return [];
  }
}
