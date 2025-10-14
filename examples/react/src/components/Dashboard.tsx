import { useGuard } from "../permissions";

export function Dashboard() {
  const canViewAdminDashboard = useGuard("admin:dashboard");
  const canViewUsers = useGuard(["user:view"]);

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      {canViewAdminDashboard ? (
        <div className="admin-section">
          <h3>Admin Dashboard</h3>
          <p>Welcome to the admin dashboard! You have full access.</p>
          <div className="stats">
            <div className="stat-card">
              <h4>Total Users</h4>
              <p>1,234</p>
            </div>
            <div className="stat-card">
              <h4>Total Posts</h4>
              <p>5,678</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="user-section">
          <h3>User Dashboard</h3>
          <p>Welcome! Here's your activity summary.</p>
        </div>
      )}

      {canViewUsers && (
        <div className="users-list">
          <h3>User Management</h3>
          <p>Manage users here...</p>
        </div>
      )}
    </div>
  );
}
