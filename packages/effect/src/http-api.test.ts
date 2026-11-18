import { createGuard as createCoreGuard, defineRole } from "@savvycodes/guard-core";
import { Effect, FileSystem, Layer, Path, Schema } from "effect";
import { Etag, HttpPlatform, HttpRouter, HttpServerRequest } from "effect/http";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
} from "effect/http-api";
import { afterAll, describe, expect, it } from "vitest";
import { Authorization, layer as AuthorizationLayer, createGuard, Scopes } from "./http-api";

const user = defineRole(["user:me"]);
const admin = defineRole([...user, "user:write"]);
const authz = createGuard(createCoreGuard(user, admin));

// Stand-in for real authentication: scopes come from a header.
class Authentication extends HttpApiMiddleware.Service<Authentication, { provides: Scopes }>()(
  "test/Authentication",
) {}

const AuthenticationLayer = Layer.succeed(
  Authentication,
  Authentication.of(
    Effect.fnUntraced(function* (httpEffect) {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const scopes = (request.headers["x-scopes"] ?? "").split(" ").filter(Boolean);
      return yield* Effect.provideService(httpEffect, Scopes, scopes);
    }),
  ),
);

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("me", "/me", { success: Schema.String }),
    HttpApiEndpoint.post("setRoles", "/roles", { success: Schema.String }).pipe(
      authz.permission("user:write"),
    ),
    HttpApiEndpoint.get("public", "/public", { success: Schema.String }).pipe(authz.permission([])),
  )
  .pipe(authz.permission("user:me"))
  .middleware(Authorization)
  .middleware(Authentication) {}

class OpenApi extends HttpApiGroup.make("open").add(
  HttpApiEndpoint.get("health", "/health", { success: Schema.String }),
) {}

class Api extends HttpApi.make("api").add(UsersApi).add(OpenApi) {}

const UsersLive = HttpApiBuilder.group(Api, "users", (handlers) =>
  handlers
    .handle("me", () => Effect.succeed("me"))
    .handle("setRoles", () =>
      // Handlers can read the scopes the authentication middleware provided.
      Effect.map(authz.can("user:write"), (allowed) => `roles set (${allowed})`),
    )
    .handle("public", () => Effect.succeed("public")),
);

const OpenLive = HttpApiBuilder.group(Api, "open", (handlers) =>
  handlers.handle("health", () => Effect.succeed("ok")),
);

const TestServices = Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
  Layer.provideMerge(FileSystem.layerNoop({})),
);

const { handler, dispose } = HttpRouter.toWebHandler(
  HttpApiBuilder.layer(Api).pipe(
    Layer.provide([UsersLive, OpenLive]),
    Layer.provide([AuthorizationLayer, AuthenticationLayer]),
    Layer.provide(TestServices),
  ),
  { disableLogger: true },
);

afterAll(() => dispose());

const request = async (method: string, path: string, scopes?: ReadonlyArray<string>) => {
  const response = await handler(
    new Request(`http://localhost${path}`, {
      method,
      headers: scopes ? { "x-scopes": scopes.join(" ") } : {},
    }),
  );
  return { status: response.status, body: await response.json() };
};

describe("Authorization middleware", () => {
  it("should enforce the group's permission", async () => {
    expect(await request("GET", "/me", user)).toEqual({ status: 200, body: "me" });
    expect(await request("GET", "/me", [])).toMatchObject({
      status: 403,
      body: { _tag: "PermissionDenied", required: "user:me" },
    });
  });

  it("should let an endpoint permission override the group's", async () => {
    expect(await request("POST", "/roles", admin)).toEqual({
      status: 200,
      body: "roles set (true)",
    });
    expect(await request("POST", "/roles", user)).toMatchObject({
      status: 403,
      body: { _tag: "PermissionDenied", required: "user:write" },
    });
  });

  it("should allow an endpoint that requires no permissions", async () => {
    // An empty AND list is satisfied by any scopes.
    expect(await request("GET", "/public", [])).toEqual({ status: 200, body: "public" });
  });

  it("should not affect groups without the middleware", async () => {
    expect(await request("GET", "/health")).toEqual({ status: 200, body: "ok" });
  });
});
