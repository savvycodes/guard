import { can, type Guard } from "@savvycodes/guard-core";
import { Context, Effect, Schema } from "effect";

/**
 * A permission check: a single permission, all of a list (AND), or any of several lists (OR).
 */
export type PermissionCheck<T extends string = string> = T | T[] | T[][];

const Check = Schema.Union([
  Schema.String,
  Schema.Array(Schema.String),
  Schema.Array(Schema.Array(Schema.String)),
]);

/**
 * The permissions held by the current principal (user, token, service account).
 *
 * Provide it once per request, for example from the session or a decoded token:
 *
 * @example
 * ```ts
 * program.pipe(Effect.provideService(Scopes, ["user:me", "user:write"]))
 * ```
 */
export class Scopes extends Context.Service<Scopes, ReadonlyArray<string>>()(
  "@savvycodes/guard-effect/Scopes",
) {}

/**
 * Failure raised when the current scopes do not satisfy a permission check.
 * Responds 403 when used with `effect/http-api`.
 */
export class PermissionDenied extends Schema.TaggedError<PermissionDenied>()(
  "PermissionDenied",
  { required: Check },
  { httpApiStatus: 403 },
) {
  override get message(): string {
    return `Missing permission: ${JSON.stringify(this.required)}`;
  }
}

/**
 * Effect permission checks with type inference from a guard-core guard.
 */
export interface EffectGuard<T extends string> {
  /** Succeeds when the current scopes satisfy `check`, fails with `PermissionDenied` otherwise. */
  readonly require: (check: PermissionCheck<T>) => Effect.Effect<void, PermissionDenied, Scopes>;
  /** Whether the current scopes satisfy `check`. */
  readonly can: (check: PermissionCheck<T>) => Effect.Effect<boolean, never, Scopes>;
  /** Whether the current scopes do not satisfy `check`. */
  readonly cannot: (check: PermissionCheck<T>) => Effect.Effect<boolean, never, Scopes>;
}

/**
 * Create typed Effect permission checks from a guard-core guard.
 *
 * @example
 * ```ts
 * import { createGuard as createCoreGuard, defineRole } from "@savvycodes/guard-core";
 * import { createGuard, Scopes } from "@savvycodes/guard-effect";
 *
 * const user = defineRole(["user:me"]);
 * const admin = defineRole([...user, "user:write"]);
 * const authz = createGuard(createCoreGuard(user, admin));
 *
 * const setRoles = Effect.fn("Users.setRoles")(function* (id: string, roles: string[]) {
 *   yield* authz.require("user:write"); // Effect<void, PermissionDenied, Scopes>
 *   // ...
 * });
 *
 * setRoles("42", ["admin"]).pipe(Effect.provideService(Scopes, [...admin]));
 * ```
 */
export const createGuard = <T extends string>(_guard: Guard<T>): EffectGuard<T> => {
  const check = (required: PermissionCheck<T>) =>
    Effect.map(Effect.service(Scopes), (scopes) => can(scopes as string[], required));

  return {
    require: (required) =>
      Effect.flatMap(check(required), (allowed) =>
        allowed ? Effect.void : Effect.fail(new PermissionDenied({ required })),
      ),
    can: check,
    cannot: (required) => Effect.map(check(required), (allowed) => !allowed),
  };
};
