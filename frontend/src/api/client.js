import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  agents: () => api.get('/users/agents'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  sessions: (id) => api.get(`/users/${id}/sessions`),
};

// ── Cases ─────────────────────────────────────────────────────────────────────
export const casesAPI = {
  list: (params) => api.get('/cases', { params }),
  get: (id) => api.get(`/cases/${id}`),
  summary: () => api.get('/cases/stats/summary'),
  uploadCSV: (formData) => api.post('/cases/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  allocate: (data) => api.post('/cases/allocate', data),
  updateStatus: (id, status) => api.put(`/cases/${id}/status`, null, { params: { status } }),
};

// ── Activity ─────────────────────────────────────────────────────────────────
export const activityAPI = {
  createCallLog: (data) => api.post('/activity/call-logs', data),
  listCallLogs: (params) => api.get('/activity/call-logs', { params }),
  addTracing: (data) => api.post('/activity/tracing', data),
  getTracing: (caseId) => api.get(`/activity/tracing/${caseId}`),
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  agentStats: () => api.get('/analytics/agents'),
  agentActivity: (id, days) => api.get(`/analytics/agent/${id}/activity`, { params: { days } }),
  followUps: () => api.get('/analytics/follow-ups'),
};
