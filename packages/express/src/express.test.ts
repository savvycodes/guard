import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { createGuard as createExpressGuard, PermissionDeniedError } from "./express";

describe("Express middleware - basic API", () => {
  const mockRequest = (permissions: string[] = []) =>
    ({
      user: { permissions },
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  // Create a generic permission list for testing
  const testPerms = definePermissions(['read:posts', 'write:posts', 'admin']);

  describe("basic permission checking", () => {
    it("should call next when user has required permission", () => {
      const req = mockRequest(["read:posts"]);
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("read:posts");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should throw permission denied error when user lacks permission", () => {
      const req = mockRequest(["read:posts"]);
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("write:posts");
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
      expect(error.code).toBe("permission_denied");
      expect(error.status).toBe(403);
    });

    it("should check all permissions with AND logic (array)", () => {
      const req = mockRequest(["read:posts", "write:posts"]);
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check(["read:posts", "write:posts"]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should fail when user lacks one permission in AND array", () => {
      const req = mockRequest(["read:posts"]);
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check(["read:posts", "write:posts"]);
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it("should support OR logic with nested arrays", () => {
      const req = mockRequest(["read:posts"]);
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check([["read:posts"], ["write:posts"]]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should support complex OR logic", () => {
      const req = mockRequest(["read:posts", "write:posts"]);
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check([
        ["admin"],
        ["read:posts", "write:posts"],
      ]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("custom configuration", () => {
    it("should support custom requestProperty", () => {
      const req = { identity: { permissions: ["admin"] } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard, { requestProperty: "identity" });
      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should support custom permissionsProperty", () => {
      const req = { user: { scope: ["admin"] } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard, { permissionsProperty: "scope" });
      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should support both custom requestProperty and permissionsProperty", () => {
      const req = { identity: { scope: ["admin"] } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard, {
        requestProperty: "identity",
        permissionsProperty: "scope",
      });
      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("OAuth 2.0 scope format", () => {
    it("should support space-delimited scope string", () => {
      const req = { user: { scope: "status user:read user:write" } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const testOAuthPerms = definePermissions(['status', 'user:read', 'user:write']);
      const guard = createGuard(testOAuthPerms);
      const guardInstance = createExpressGuard(guard, { permissionsProperty: "scope" });
      const middleware = guardInstance.check("user:read");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should handle empty scope string", () => {
      const req = { user: { scope: "" } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const testOAuthPerms = definePermissions(['user:read']);
      const guard = createGuard(testOAuthPerms);
      const guardInstance = createExpressGuard(guard, { permissionsProperty: "scope" });
      const middleware = guardInstance.check("user:read");
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it("should filter empty strings from scope", () => {
      const req = { user: { scope: "status  user:read  " } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const testOAuthPerms = definePermissions(['status', 'user:read']);
      const guard = createGuard(testOAuthPerms);
      const guardInstance = createExpressGuard(guard, { permissionsProperty: "scope" });
      const middleware = guardInstance.check("user:read");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("edge cases", () => {
    it("should handle missing user object", () => {
      const req = {} as Request;
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard(testPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it("should handle missing permissions property", () => {
      const req = { user: {} } as any;
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard();
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("admin" as any);
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it("should handle non-string, non-array permissions", () => {
      const req = { user: { permissions: 123 } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const guard = createGuard();
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("admin" as any);
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });
  });
});

describe("Express middleware - with definePermissions", () => {
  const mockRequest = (permissions: string[] = []) =>
    ({
      user: { permissions },
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const adminPerms = definePermissions(['admin', 'user:read', 'user:write', 'posts:write']);
  const userPerms = definePermissions(['user:read', 'posts:read']);

  describe("type-safe permission checking", () => {
    it("should provide autocomplete for defined permissions", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["admin"]);
      const res = mockResponse();
      const next = vi.fn();

      // These should have full type safety and autocomplete
      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should work with multiple permission lists", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["posts:read"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.check("posts:read");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should support AND logic with defined permissions", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["user:read", "user:write"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.check(["user:read", "user:write"]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should support OR logic with defined permissions", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["posts:read"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.check([["admin"], ["posts:read"]]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("can method", () => {
    it("should call next when user has permission", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["admin"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.can("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should throw error when user lacks permission", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["user:read"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.can("admin");
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it("should work with AND logic", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["user:read", "user:write"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.can(["user:read", "user:write"]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should work with OR logic", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["user:read"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.can([["admin"], ["user:read"]]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("cannot method", () => {
    it("should call next when user lacks permission", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["user:read"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.cannot("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should throw error when user has permission", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["admin"]);
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.cannot("admin");
      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it("should work with complex logic", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const req = mockRequest(["user:read"]);
      const res = mockResponse();
      const next = vi.fn();

      // User has user:read, so cannot check for user:write should pass
      const middleware = guardInstance.cannot("user:write");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("with configuration options", () => {
    it("should work with custom requestProperty", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard, { requestProperty: "identity" });
      const req = { identity: { permissions: ["admin"] } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();

      // Test can as middleware
      const canMiddleware = guardInstance.can("admin");
      const canNext = vi.fn();
      canMiddleware(req, res, canNext);
      expect(canNext).toHaveBeenCalledWith();
    });

    it("should work with custom permissionsProperty", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard, { permissionsProperty: "scope" });
      const req = { user: { scope: ["admin"] } } as any;
      const res = mockResponse();
      const next = vi.fn();

      const middleware = guardInstance.check("admin");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();

      // Test can as middleware
      const canMiddleware = guardInstance.can("admin");
      const canNext = vi.fn();
      canMiddleware(req, res, canNext);
      expect(canNext).toHaveBeenCalledWith();
    });
  });

  describe("unless functionality", () => {
    it("should have unless method attached to check middleware", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("admin");

      expect(middleware.unless).toBeDefined();
      expect(typeof middleware.unless).toBe("function");
    });

    it("should have unless method attached to can middleware", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.can("admin");

      expect(middleware.unless).toBeDefined();
      expect(typeof middleware.unless).toBe("function");
    });

    it("should have unless method attached to cannot middleware", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.cannot("admin");

      expect(middleware.unless).toBeDefined();
      expect(typeof middleware.unless).toBe("function");
    });

    it("should skip permission check for excluded paths", () => {
      const guard = createGuard(adminPerms, userPerms);
      const guardInstance = createExpressGuard(guard);
      const middleware = guardInstance.check("admin");

      // Create unless middleware that skips /public
      const unlessMiddleware = middleware.unless({ path: ["/public"] });

      // Request to /public without admin permission
      const req = {
        url: "/public",
        originalUrl: "/public",
        user: { permissions: ["user:read"] }
      } as any;
      const res = mockResponse();
      const next = vi.fn();

      unlessMiddleware(req, res, next);

      // Should call next without error (skipped the check)
      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
  });
});
