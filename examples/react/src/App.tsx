import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { PostList } from "./components/PostList";
import {
  AdminSettings,
  UserEditor,
  UserManager,
} from "./components/ProtectedComponents";
import { PermissionProvider, getUserScopes, guard } from "./permissions";
import "./App.css";

type UserType = "admin" | "user" | "guest";

function App() {
  const [userType, setUserType] = useState<UserType>("guest");
  const userScopes = getUserScopes(userType);

  // Get all available permissions for display
  const allPermissions = guard.permissions();

  return (
    <PermissionProvider guard={guard} scopes={userScopes}>
      <div className="app">
        <header className="app-header">
          <h1>🛡️ Guard React Example</h1>
          <p>Demonstrating type-safe permission-based UI rendering</p>
        </header>

        {/* User Type Selector */}
        <div className="user-selector">
          <h3>Select User Type:</h3>
          <div className="button-group">
            <button
              className={userType === "admin" ? "active" : ""}
              onClick={() => setUserType("admin")}
            >
              👑 Admin
            </button>
            <button
              className={userType === "user" ? "active" : ""}
              onClick={() => setUserType("user")}
            >
              👤 User
            </button>
            <button
              className={userType === "guest" ? "active" : ""}
              onClick={() => setUserType("guest")}
            >
              👥 Guest
            </button>
          </div>
        </div>

        {/* Current Permissions Display */}
        <div className="permissions-info">
          <h3>Current Permissions ({userScopes.length}):</h3>
          <div className="permissions-list">
            {userScopes.map((permission) => (
              <span key={permission} className="permission-badge">
                {permission}
              </span>
            ))}
          </div>
        </div>

        {/* All Available Permissions */}
        <details className="all-permissions">
          <summary>All Available Permissions ({allPermissions.length})</summary>
          <div className="permissions-grid">
            {allPermissions.map((permission) => (
              <span
                key={permission}
                className={`permission-badge ${
                  userScopes.includes(permission) ? "active" : "inactive"
                }`}
              >
                {permission}
              </span>
            ))}
          </div>
        </details>

        <main className="app-main">
          {/* Dashboard - different content based on permissions */}
          <Dashboard />

          {/* Post List with conditional buttons */}
          <PostList />

          {/* HOC Examples - only render if user has permission */}
          <div className="hoc-examples">
            <h2>Protected Components (HOC)</h2>
            <div className="components-grid">
              <UserEditor userId="123" />
              <UserManager />
              <AdminSettings />
            </div>
          </div>
        </main>

        <footer className="app-footer">
          <p>
            Built with{" "}
            <a href="https://github.com/savvycodes/guard">@savvycodes/guard</a>
          </p>
        </footer>
      </div>
    </PermissionProvider>
  );
}

export default App;
