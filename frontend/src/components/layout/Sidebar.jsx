import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, FolderOpen, Phone, BarChart2,
  LogOut, Bell, UserPlus, Upload, ClipboardList, Activity
} from 'lucide-react';

const SUPER_ADMIN_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Manage Users', icon: Users },
  { to: '/upload', label: 'Upload Cases', icon: Upload },
  { to: '/cases', label: 'All Cases', icon: FolderOpen },
  { to: '/allocate', label: 'Allocate Cases', icon: ClipboardList },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/agents-activity', label: 'Agent Activity', icon: Activity },
];

const ADMIN_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cases', label: 'All Cases', icon: FolderOpen },
  { to: '/allocate', label: 'Allocate Cases', icon: ClipboardList },
  { to: '/agents-activity', label: 'Agent Activity', icon: Activity },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
];

const AGENT_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-cases', label: 'My Cases', icon: FolderOpen },
  { to: '/follow-ups', label: 'Follow Ups', icon: Bell },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'super_admin' ? SUPER_ADMIN_LINKS
    : user?.role === 'admin' ? ADMIN_LINKS
    : AGENT_LINKS;

  const roleLabel = user?.role === 'super_admin' ? 'Super Admin'
    : user?.role === 'admin' ? 'Admin' : 'Agent';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>🏦 CRM Recover</h1>
        <p>Debt Recovery Platform</p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        </div>
        <button
          className="sidebar-link w-full mt-2"
          onClick={handleLogout}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-sidebar)' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}
