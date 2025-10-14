import { describe, expect, it } from "vitest";
import { can, cannot, createGuard, definePermissions } from "./index";

describe("can", () => {
  it("should return true when user has the required permission (string)", () => {
    const scopes = ["user:write"];
    expect(can(scopes, "user:write")).toBe(true);
  });

  it("should return false when user does not have the required permission", () => {
    const scopes = ["user:write"];
    expect(can(scopes, "user:read")).toBe(false);
  });

  it("should check all permissions in array (AND logic)", () => {
    const scopes = ["user:write", "admin"];
    expect(can(scopes, ["user:write", "admin"])).toBe(true);
    expect(can(scopes, ["user:write", "user:read"])).toBe(false);
  });

  it("should check any permission in nested array (OR logic)", () => {
    const scopes = ["user:write"];
    const userWriteOrAdmin = [["user:write"], ["admin"]];
    expect(can(scopes, userWriteOrAdmin)).toBe(true);
  });

  it("should handle complex nested arrays", () => {
    const scopes = ["user:write"];
    const userWriteOrAdmin = [["user:write"], ["admin"]];
    const userWriteAndAdmin = ["user:write", "admin"];

    expect(can(scopes, userWriteOrAdmin)).toBe(true);
    expect(can(scopes, userWriteAndAdmin)).toBe(false);
  });

  it("should return false when scopes or requiredScopes are null/undefined", () => {
    expect(can([], null as any)).toBe(false);
    expect(can(null as any, "user:write")).toBe(false);
  });

  it("should handle empty permission array", () => {
    const scopes = ["user:write"];
    expect(can(scopes, ["permission:not:in:scope"])).toBe(false);
  });
});

describe("cannot", () => {
  it("should return true when user does not have permission", () => {
    const scopes = ["user:write"];
    expect(cannot(scopes, "admin")).toBe(true);
  });

  it("should return false when user has permission", () => {
    const scopes = ["user:write"];
    expect(cannot(scopes, "user:write")).toBe(false);
  });

  it("should work with nested arrays", () => {
    const scopes = ["user:write"];
    expect(cannot(scopes, [["admin"], ["superuser"]])).toBe(true);
    expect(cannot(scopes, [["user:write"], ["admin"]])).toBe(false);
  });
});

describe("definePermissions and createGuard", () => {
  it("should define permissions without as const", () => {
    const superuser = definePermissions([
      "superuser",
      "user:write",
      "user:read",
      "admin:read",
      "admin:write",
    ]);
    const admin = definePermissions(["admin:write", "admin:read", "user:read"]);
    const user = definePermissions(["user:read"]);

    expect(superuser).toEqual([
      "superuser",
      "user:write",
      "user:read",
      "admin:read",
      "admin:write",
    ]);
    expect(admin).toEqual(["admin:write", "admin:read", "user:read"]);
    expect(user).toEqual(["user:read"]);
  });

  it("should define permissions using variadic syntax", () => {
    const admin = definePermissions("admin", "user:view");
    const user = definePermissions("user:read");
    const moderator = definePermissions("post:edit", "post:delete", "user:view");

    expect(admin).toEqual(["admin", "user:view"]);
    expect(user).toEqual(["user:read"]);
    expect(moderator).toEqual(["post:edit", "post:delete", "user:view"]);
  });

  it("should work with guard when using variadic syntax", () => {
    const admin = definePermissions("admin:write", "admin:read", "user:read");
    const user = definePermissions("user:read");

    const guard = createGuard(admin, user);

    expect(guard.can(["admin:write"], "admin:write")).toBe(true);
    expect(guard.can(["user:read"], "user:read")).toBe(true);
    expect(guard.cannot(["user:read"], "admin:write")).toBe(true);
  });

  it("should create a guard with full type safety", () => {
    const superuser = definePermissions(["superuser", "user:write", "user:read"]);
    const admin = definePermissions(["admin:write", "admin:read", "user:read"]);
    const user = definePermissions(["user:read"]);

    const guard = createGuard(superuser, admin, user);

    const scopes = ["user:write", "user:read"];

    expect(guard.can(scopes, "user:write")).toBe(true);
    expect(guard.can(scopes, "user:read")).toBe(true);
    expect(guard.cannot(scopes, "admin:write")).toBe(true);
  });

  it("should provide type-safe can method through guard", () => {
    const superuser = definePermissions(["superuser", "user:write", "user:read"]);
    const admin = definePermissions(["admin:write", "admin:read"]);

    const guard = createGuard(superuser, admin);

    const userPerms = ["user:read", "user:write"];

    expect(guard.can(userPerms, "user:read")).toBe(true);
    expect(guard.can(userPerms, "admin:write")).toBe(false);
  });

  it("should provide type-safe cannot method through guard", () => {
    const user = definePermissions(["user:read"]);
    const admin = definePermissions(["admin:write", "admin:read"]);

    const guard = createGuard(user, admin);

    const userPerms = ["user:read"];

    expect(guard.cannot(userPerms, "admin:write")).toBe(true);
    expect(guard.cannot(userPerms, "user:read")).toBe(false);
  });

  it("should support complex permission checks with guard", () => {
    const superuser = definePermissions(["superuser"]);
    const user = definePermissions(["user:read", "user:write"]);
    const admin = definePermissions(["admin:read", "admin:write"]);

    const guard = createGuard(superuser, user, admin);

    const userPerms = ["user:read"];

    // OR logic
    expect(guard.can(userPerms, [["user:read"], ["admin:read"]])).toBe(true);
    expect(guard.can(userPerms, [["admin:read"], ["superuser"]])).toBe(false);

    // AND logic
    expect(guard.can(userPerms, ["user:read", "user:write"])).toBe(false);
  });

  it("should list all unique permissions", () => {
    const admin = definePermissions(["admin:write", "admin:read", "user:read"]);
    const user = definePermissions(["user:read", "user:write"]);

    const guard = createGuard(admin, user);

    const allPermissions = guard.permissions();

    // Should contain all unique permissions
    expect(allPermissions).toHaveLength(4);
    expect(allPermissions).toContain("admin:write");
    expect(allPermissions).toContain("admin:read");
    expect(allPermissions).toContain("user:read");
    expect(allPermissions).toContain("user:write");
  });

  it("should not return duplicate permissions", () => {
    const admin = definePermissions(["admin:write", "admin:read", "user:read"]);
    const user = definePermissions(["user:read", "user:write"]);
    const superuser = definePermissions(["superuser", "admin:write", "user:read"]);

    const guard = createGuard(admin, user, superuser);

    const allPermissions = guard.permissions();

    // user:read and admin:write appear in multiple roles, should only appear once
    expect(allPermissions.filter((p) => p === "user:read")).toHaveLength(1);
    expect(allPermissions.filter((p) => p === "admin:write")).toHaveLength(1);

    // Total should be 5 unique permissions (admin:write, admin:read, user:read, user:write, superuser)
    expect(allPermissions).toHaveLength(5);
    expect(allPermissions).toContain("admin:write");
    expect(allPermissions).toContain("admin:read");
    expect(allPermissions).toContain("user:read");
    expect(allPermissions).toContain("user:write");
    expect(allPermissions).toContain("superuser");
  });

  it("should return empty array when no permissions defined", () => {
    const empty = definePermissions([]);
    const guard = createGuard(empty);

    expect(guard.permissions()).toEqual([]);
  });
});
