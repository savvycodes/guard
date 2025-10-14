import { createGuard, definePermissions } from "@savvycodes/guard-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createGuard as createGuardReact } from "./index";

// ============================================================================
// Test Setup with Factory Function
// ============================================================================
// This demonstrates how to use the factory function for type-safe permissions.
// By creating typed utilities from the guard, all hooks and components
// will have TypeScript autocomplete and type checking automatically!
// ============================================================================

// Define test roles and guard
const admin = definePermissions(["admin", "read:posts", "write:posts"]);
const user = definePermissions(["read:posts"]);
const guard = createGuard(admin, user);

// Create typed React utilities from the guard
// Now all hooks and components have full type safety!
const { PermissionProvider, useGuard, Guard, withPermission } =
  createGuardReact(guard);

// ============================================================================
// Tests - Now with full type safety!
// ============================================================================
// All permissions like "read:posts", "write:posts", "admin" are now type-checked.
// Try changing one to an invalid permission and TypeScript will catch it!
// ============================================================================

describe("PermissionProvider", () => {
  it("should provide guard to children", () => {
    function TestComponent() {
      const canRead = useGuard("read:posts");
      return <div>{canRead ? "Has permission" : "No permission"}</div>;
    }

    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <TestComponent />
      </PermissionProvider>
    );

    expect(screen.getByText("Has permission")).toBeDefined();
  });
});

describe("Guard component", () => {
  it("should render children when user has permission", () => {
    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <Guard check="read:posts">
          <div>Content</div>
        </Guard>
      </PermissionProvider>
    );

    expect(screen.getByText("Content")).toBeDefined();
  });

  it("should render nothing when user does not have permission with ReactNode", () => {
    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <Guard check="write:posts">
          <div>Content</div>
        </Guard>
      </PermissionProvider>
    );

    expect(screen.queryByText("Content")).toBeNull();
  });

  it("should support function as children", () => {
    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <Guard check="write:posts">
          {(hasPermission) =>
            hasPermission ? <div>Can write</div> : <div>Cannot write</div>
          }
        </Guard>
      </PermissionProvider>
    );

    expect(screen.getByText("Cannot write")).toBeDefined();
  });

  it("should support render prop with ReactNode", () => {
    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <Guard check="read:posts" render={<div>Rendered content</div>} />
      </PermissionProvider>
    );

    expect(screen.getByText("Rendered content")).toBeDefined();
  });

  it("should support render prop with function", () => {
    render(
      <PermissionProvider scopes={["admin"]} guard={guard}>
        <Guard check="admin">
          {(hasPermission) =>
            hasPermission ? <div>Is admin</div> : <div>Not admin</div>
          }
        </Guard>
      </PermissionProvider>
    );

    expect(screen.getByText("Is admin")).toBeDefined();
  });

  it("should prioritize render prop over children", () => {
    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <Guard check="read:posts" render={<div>From render</div>}>
          <div>From children</div>
        </Guard>
      </PermissionProvider>
    );

    expect(screen.getByText("From render")).toBeDefined();
    expect(screen.queryByText("From children")).toBeNull();
  });
});

describe("withPermission HOC", () => {
  it("should render component when user has permission", () => {
    const TestComponent = () => <div>Has permission</div>;

    const WrappedComponent = withPermission("read:posts")(TestComponent);

    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <WrappedComponent />
      </PermissionProvider>
    );

    expect(screen.getByText("Has permission")).toBeDefined();
  });

  it("should render nothing when user does not have permission", () => {
    const TestComponent = () => <div>Content</div>;

    const WrappedComponent = withPermission("write:posts")(TestComponent);

    render(
      <PermissionProvider scopes={["read:posts"]} guard={guard}>
        <WrappedComponent />
      </PermissionProvider>
    );

    expect(screen.queryByText("Content")).toBeNull();
  });

  it("should pass through all props to wrapped component", () => {
    interface TestProps {
      userId: string;
      name: string;
    }

    function TestComponent({ userId, name }: TestProps) {
      return (
        <div>
          User {userId} - {name}
        </div>
      );
    }

    const WrappedComponent = withPermission("admin")(TestComponent);

    render(
      <PermissionProvider scopes={["admin"]} guard={guard}>
        <WrappedComponent userId="123" name="John" />
      </PermissionProvider>
    );

    expect(screen.getByText("User 123 - John")).toBeDefined();
  });

  it("should set displayName correctly", () => {
    function TestComponent() {
      return <div>Content</div>;
    }

    const WrappedComponent = withPermission("admin")(TestComponent);

    expect(WrappedComponent.displayName).toBe("withPermission(TestComponent)");
  });

  it("should work with inline arrow functions", () => {
    const CanWrite = withPermission("write:posts")(() => (
      <div>I can write</div>
    ));

    render(
      <PermissionProvider scopes={["write:posts"]} guard={guard}>
        <CanWrite />
      </PermissionProvider>
    );

    expect(screen.getByText("I can write")).toBeDefined();
  });

  it("should work with OR logic permissions", () => {
    const CanWriteOrAdmin = withPermission([["write:posts"], ["admin"]])(() => (
      <div>I can write or am an admin</div>
    ));

    render(
      <PermissionProvider scopes={["admin"]} guard={guard}>
        <CanWriteOrAdmin />
      </PermissionProvider>
    );

    expect(screen.getByText("I can write or am an admin")).toBeDefined();
  });
});
