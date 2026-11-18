import { createGuard as createCoreGuard, defineRole } from "@savvycodes/guard-core";
import { Effect, Exit } from "effect";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createGuard, PermissionDenied, Scopes } from "./index";

const user = defineRole(["user:me"]);
const admin = defineRole([...user, "user:write"]);
const authz = createGuard(createCoreGuard(user, admin));

const runAs = <A, E>(scopes: ReadonlyArray<string>, effect: Effect.Effect<A, E, Scopes>) =>
  Effect.runSyncExit(Effect.provideService(effect, Scopes, scopes));

describe("require", () => {
  it("should succeed when the scopes satisfy the check", () => {
    expect(Exit.isSuccess(runAs(admin, authz.require("user:write")))).toBe(true);
    expect(Exit.isSuccess(runAs(admin, authz.require(["user:me", "user:write"])))).toBe(true);
    expect(Exit.isSuccess(runAs(user, authz.require([["user:write"], ["user:me"]])))).toBe(true);
  });

  it("should fail with PermissionDenied when the scopes do not satisfy the check", () => {
    const exit = runAs(user, authz.require("user:write"));

    expect(exit).toEqual(Exit.fail(new PermissionDenied({ required: "user:write" })));
  });

  it("should be catchable by tag", () => {
    const program = authz.require(["user:me", "user:write"]).pipe(
      Effect.as("allowed"),
      Effect.catchTag("PermissionDenied", (e) => Effect.succeed(e.required)),
    );

    expect(runAs(user, program)).toEqual(Exit.succeed(["user:me", "user:write"]));
  });

  it("should deny when there are no scopes", () => {
    expect(Exit.isFailure(runAs([], authz.require("user:me")))).toBe(true);
  });

  it("should require Scopes and only accept known permissions", () => {
    expectTypeOf(authz.require("user:me")).toEqualTypeOf<
      Effect.Effect<void, PermissionDenied, Scopes>
    >();
    // @ts-expect-error unknown permission
    authz.require("user:nope");
  });
});

describe("can / cannot", () => {
  it("should report whether the scopes satisfy the check", () => {
    expect(runAs(admin, authz.can("user:write"))).toEqual(Exit.succeed(true));
    expect(runAs(user, authz.can("user:write"))).toEqual(Exit.succeed(false));
    expect(runAs(user, authz.cannot("user:write"))).toEqual(Exit.succeed(true));
  });
});

describe("PermissionDenied", () => {
  it("should describe the missing permission", () => {
    expect(new PermissionDenied({ required: "user:write" }).message).toBe(
      'Missing permission: "user:write"',
    );
  });
});
