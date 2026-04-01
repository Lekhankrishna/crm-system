import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users': 'Manage Users',
  '/upload': 'Upload Cases',
  '/cases': 'All Cases',
  '/my-cases': 'My Cases',
  '/allocate': 'Allocate Cases',
  '/analytics': 'Analytics',
  '/agents-activity': 'Agent Activity',
  '/follow-ups': 'Follow Ups',
};

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const title = PAGE_TITLES[location.pathname] || 'CRM';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
              {user?.name}
            </span>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
