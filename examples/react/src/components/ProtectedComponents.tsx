import { withPermission } from "../permissions";

interface UserEditorProps {
  userId: string;
}

function UserEditorComponent({ userId }: UserEditorProps) {
  return (
    <div className="user-editor">
      <h3>User Editor</h3>
      <p>Editing user: {userId}</p>
      <form>
        <div className="form-group">
          <span>Name:</span>
          <input type="text" defaultValue="John Doe" />
        </div>
        <div className="form-group">
          <span>Email:</span>
          <input type="email" defaultValue="john@example.com" />
        </div>
        <div className="form-group">
          <span>Role:</span>
          <select defaultValue="user">
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
}

// Wrap component with permission check - only renders if user has permission
export const UserEditor = withPermission("user:edit")(UserEditorComponent);

// Example of HOC with OR logic - can edit OR is admin
export const UserManager = withPermission([["user:edit"], ["admin:dashboard"]])(
  function UserManagerComponent() {
    return (
      <div className="user-manager">
        <h3>User Manager</h3>
        <p>Manage all users in the system</p>
        <ul>
          <li>User 1</li>
          <li>User 2</li>
          <li>User 3</li>
        </ul>
      </div>
    );
  }
);

// Admin-only component
export const AdminSettings = withPermission("admin:settings")(
  function AdminSettingsComponent() {
    return (
      <div className="admin-settings">
        <h3>Admin Settings</h3>
        <p>Configure system-wide settings</p>
        <div className="settings-grid">
          <div className="setting-item">
            <span>Maintenance Mode:</span>
            <input type="checkbox" />
          </div>
          <div className="setting-item">
            <span>Allow Registration:</span>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>
    );
  }
);
