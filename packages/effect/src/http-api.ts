import { can, type Guard } from "@savvycodes/guard-core";
import { Context, Effect, Layer } from "effect";
import { HttpApiMiddleware } from "effect/http-api";
import {
  createGuard as createEffectGuard,
  type EffectGuard,
  type PermissionCheck,
  PermissionDenied,
  Scopes,
} from "./index";

/**
 * Endpoint or group annotation holding the permission check the `Authorization`
 * middleware enforces. Endpoint annotations take precedence over group annotations.
 */
export class RequiredPermission extends Context.Service<RequiredPermission, PermissionCheck>()(
  "@savvycodes/guard-effect/http-api/RequiredPermission",
) {}

/**
 * HttpApi middleware that fails with `PermissionDenied` (403) unless the current `Scopes`
 * satisfy the endpoint's `RequiredPermission`. Endpoints without one are allowed through.
 *
 * It requires `Scopes`. Provide them from your authentication middleware (declare
 * `provides: Scopes`) and add that middleware after this one, so it runs first:
 *
 * @example
 * ```ts
 * class UsersApi extends HttpApiGroup.make("users")
 *   .add(HttpApiEndpoint.post("setRoles", "/:id/roles").pipe(authz.permission("user:write")))
 *   .middleware(Authorization)
 *   .middleware(Authentication) {}
 * ```
 */
export class Authorization extends HttpApiMiddleware.Service<Authorization, { requires: Scopes }>()(
  "@savvycodes/guard-effect/http-api/Authorization",
  {
    error: PermissionDenied,
  },
) {}

/** The `Authorization` middleware implementation. */
export const layer: Layer.Layer<Authorization> = Layer.succeed(
  Authorization,
  Authorization.of(
    Effect.fnUntraced(function* (httpEffect, { endpoint, group }) {
      const required =
        Context.getOrUndefined(endpoint.annotations, RequiredPermission) ??
        Context.getOrUndefined(group.annotations, RequiredPermission);
      if (required !== undefined) {
        const scopes = yield* Scopes;
        if (!can(scopes as string[], required)) {
          return yield* new PermissionDenied({ required });
        }
      }
      return yield* httpEffect;
    }),
  ),
);

interface Annotatable {
  annotate<I, S>(key: Context.Key<I, S>, value: S): unknown;
}

/**
 * Effect permission checks plus typed `RequiredPermission` annotations for HttpApi.
 */
export interface HttpApiGuard<T extends string> extends EffectGuard<T> {
  /**
   * Annotate an endpoint or group with the permission the `Authorization` middleware requires.
   *
   * @example
   * ```ts
   * HttpApiEndpoint.post("setRoles", "/:id/roles").pipe(authz.permission("user:write"))
   * ```
   */
  readonly permission: (check: PermissionCheck<T>) => <A extends Annotatable>(self: A) => A;
}

/**
 * Create typed Effect permission checks and HttpApi annotations from a guard-core guard.
 */
export const createGuard = <T extends string>(guard: Guard<T>): HttpApiGuard<T> => ({
  ...createEffectGuard(guard),
  permission: (check) => (self) => self.annotate(RequiredPermission, check) as typeof self,
});

export { PermissionDenied, Scopes };
