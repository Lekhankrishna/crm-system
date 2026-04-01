import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/superadmin/Dashboard';
import UsersPage from './pages/superadmin/UsersPage';
import UploadPage from './pages/superadmin/UploadPage';
import AllocatePage from './pages/superadmin/AllocatePage';
import CasesPage from './pages/superadmin/CasesPage';
import AnalyticsPage from './pages/superadmin/AnalyticsPage';
import AgentActivityPage from './pages/superadmin/AgentActivityPage';
import { AgentDashboard, MyCasesPage, FollowUpsPage } from './pages/agent/AgentPages';
import CaseDetailPage from './pages/CaseDetailPage';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoleRouter({ adminEl, agentEl }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'agent' ? agentEl : adminEl;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<RoleRouter adminEl={<AdminDashboard />} agentEl={<AgentDashboard />} />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/users" element={<ProtectedRoute roles={['super_admin','admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute roles={['super_admin','admin']}><UploadPage /></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute roles={['super_admin','admin']}><CasesPage /></ProtectedRoute>} />
        <Route path="/allocate" element={<ProtectedRoute roles={['super_admin','admin']}><AllocatePage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={['super_admin','admin']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/agents-activity" element={<ProtectedRoute roles={['super_admin','admin']}><AgentActivityPage /></ProtectedRoute>} />
        <Route path="/my-cases" element={<ProtectedRoute roles={['agent']}><MyCasesPage /></ProtectedRoute>} />
        <Route path="/follow-ups" element={<ProtectedRoute roles={['agent']}><FollowUpsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, success: { iconTheme: { primary: '#10B981', secondary: '#fff' } }, error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
