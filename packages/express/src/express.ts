import type { Guard } from "@savvycodes/guard-core";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { unless } from "express-unless";

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Error {
  code = "permission_denied";
  status = 403;

  constructor(message = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Configuration options for Express guard middleware
 */
export interface ExpressGuardOptions {
  /**
   * Property name on the request object where the user/decoded JWT is stored
   * @default "user"
   */
  requestProperty?: string;
  /**
   * Property name inside the user object where permissions are stored
   * Can be an array of strings or a space-delimited string (OAuth 2.0 scope style)
   * @default "permissions"
   */
  permissionsProperty?: string;
}

/**
 * Request handler with unless support
 */
export interface RequestHandlerWithUnless extends RequestHandler {
  unless: typeof unless;
}

/**
 * Express guard instance with typed middleware functions
 */
export interface ExpressGuard<T extends string> {
  /**
   * Create middleware to check for required permissions (calls next() if user has permissions)
   */
  check: (requiredPermissions: T | T[] | T[][]) => RequestHandlerWithUnless;
  /**
   * Create middleware to check for required permissions (alias for check)
   * Calls next() if user has permissions, throws error otherwise
   */
  can: (requiredPermissions: T | T[] | T[][]) => RequestHandlerWithUnless;
  /**
   * Create middleware to check if user lacks permissions (inverse of can)
   * Calls next() if user does NOT have permissions, throws error if they do
   */
  cannot: (requiredPermissions: T | T[] | T[][]) => RequestHandlerWithUnless;
}

/**
 * Parse permissions from a request based on configuration
 */
function extractPermissions(
  req: Request,
  requestProperty: string,
  permissionsProperty: string,
): string[] {
  const user = (req as any)[requestProperty];

  if (!user) {
    return [];
  }

  const permissions = user[permissionsProperty];

  if (!permissions) {
    return [];
  }

  // Support space-delimited scope string (OAuth 2.0 style)
  if (typeof permissions === "string") {
    return permissions.split(" ").filter(Boolean);
  }

  // Support array of permissions
  if (Array.isArray(permissions)) {
    return permissions;
  }

  return [];
}

/**
 * Create typed Express middleware utilities from a guard instance
 *
 * @param guardInstance - A typed guard instance created with createGuard() from @savvycodes/guard-core
 * @param options - Configuration options for extracting permissions from requests
 * @returns An object containing typed middleware functions (check, can, cannot)
 *
 * @example
 * ```ts
 * import { createGuard, defineRole } from '@savvycodes/guard-core';
 * import { createGuard as createExpressGuard } from '@savvycodes/guard-express';
 * import express from 'express';
 *
 * // Define roles
 * const admin = defineRole(['admin:write', 'admin:read', 'user:read']);
 * const user = defineRole(['user:read']);
 *
 * // Create guard
 * const guard = createGuard(admin, user);
 *
 * // Create typed Express middleware
 * const { check, can, cannot } = createExpressGuard(guard);
 *
 * const app = express();
 *
 * // Use with full type safety and autocomplete!
 * app.get('/admin', check('admin:write'), (req, res) => {
 *   res.json({ message: 'Admin only' });
 * });
 *
 * app.get('/posts', can(['user:read']), (req, res) => {
 *   res.json({ posts: [] });
 * });
 * ```
 *
 * @example
 * ```ts
 * // With custom configuration
 * const { check, can, cannot } = createExpressGuard(guard, {
 *   requestProperty: 'identity',
 *   permissionsProperty: 'scope'
 * });
 * ```
 */
export function createGuard<T extends string>(
  guardInstance: Guard<T>,
  options?: ExpressGuardOptions,
): ExpressGuard<T> {
  const requestProperty = options?.requestProperty || "user";
  const permissionsProperty = options?.permissionsProperty || "permissions";

  const getPermissions = (req: Request): string[] => {
    return extractPermissions(req, requestProperty, permissionsProperty);
  };

  /**
   * Helper function to attach the unless method to middleware
   */
  const withUnless = (middleware: RequestHandler): RequestHandlerWithUnless => {
    (middleware as any).unless = unless;
    return middleware as RequestHandlerWithUnless;
  };

  return {
    check: (requiredPermissions: T | T[] | T[][]): RequestHandlerWithUnless => {
      return withUnless((req: Request, _res: Response, next: NextFunction) => {
        try {
          const userPermissions = getPermissions(req);
          const hasPermission = guardInstance.can(userPermissions, requiredPermissions);

          if (hasPermission) {
            next();
          } else {
            throw new PermissionDeniedError();
          }
        } catch (error) {
          next(error);
        }
      });
    },
    can: (requiredPermissions: T | T[] | T[][]): RequestHandlerWithUnless => {
      return withUnless((req: Request, _res: Response, next: NextFunction) => {
        try {
          const userPermissions = getPermissions(req);
          const hasPermission = guardInstance.can(userPermissions, requiredPermissions);

          if (hasPermission) {
            next();
          } else {
            throw new PermissionDeniedError();
          }
        } catch (error) {
          next(error);
        }
      });
    },
    cannot: (requiredPermissions: T | T[] | T[][]): RequestHandlerWithUnless => {
      return withUnless((req: Request, _res: Response, next: NextFunction) => {
        try {
          const userPermissions = getPermissions(req);
          const lacksPermission = guardInstance.cannot(userPermissions, requiredPermissions);

          if (lacksPermission) {
            next();
          } else {
            throw new PermissionDeniedError("Forbidden: User has permissions they should not have");
          }
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
