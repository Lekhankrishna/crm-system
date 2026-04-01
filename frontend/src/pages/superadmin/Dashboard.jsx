import { useState, useEffect } from 'react';
import { analyticsAPI, casesAPI } from '../../api/client';
import { Spinner, OnlineDot } from '../../components/common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, FolderOpen, Phone, CheckCircle, Clock, AlertTriangle, TrendingUp, DollarSign, Download } from 'lucide-react';
import { format } from 'date-fns';

const PIE_COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#EC4899','#14B8A6'];

function downloadCSV(filename, rows, headers) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsAPI.dashboard(), analyticsAPI.agentStats()])
      .then(([d, a]) => { setStats(d.data); setAgents(a.data); })
      .finally(() => setLoading(false));
  }, []);

  const downloadReport = () => {
    const headers = ['Agent', 'Email', 'Status', 'Total Cases', 'Calls Today', 'NC', 'WN', 'RTP', 'PT', 'RNR', 'PTP', 'Closed', 'Last Login (IST)', 'Last Logout (IST)'];
    const rows = agents.map(a => [
      a.agent.name, a.agent.email,
      a.is_online ? 'Online' : 'Offline',
      a.total_cases, a.calls_today,
      a.feedback_counts?.NC ?? 0, a.feedback_counts?.WN ?? 0, a.feedback_counts?.RTP ?? 0, a.feedback_counts?.PT ?? 0, a.feedback_counts?.RNR ?? 0,
      a.ptp_count, a.cases_closed,
      a.last_login_ist || '—', a.last_logout_ist || '—'
    ]);
    downloadCSV(`agent_performance_${new Date().toISOString().slice(0,10)}.csv`, rows, headers);
  };

  if (loading) return <Spinner />;

  const STAT_CARDS = [
    { label: 'Total Cases', value: stats.total_cases, icon: FolderOpen, color: 'purple' },
    { label: 'Active Agents', value: stats.total_agents, icon: Users, color: 'blue' },
    { label: 'Calls Today', value: stats.calls_today, icon: Phone, color: 'green' },
    { label: 'Closed Cases', value: stats.closed_cases, icon: CheckCircle, color: 'success' },
    { label: 'PTP Cases', value: stats.ptp_cases, icon: Clock, color: 'amber' },
    { label: 'Unallocated', value: stats.unallocated, icon: AlertTriangle, color: 'red' },
    { label: 'Online Now', value: stats.online_agents, icon: TrendingUp, color: 'cyan' },
    { label: 'Outstanding (₹)', value: `₹${(stats.outstanding_total/100000).toFixed(1)}L`, icon: DollarSign, color: 'purple' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview Dashboard</h1>
          <p className="page-subtitle">Real-time performance metrics — {format(new Date(), 'dd MMM yyyy')}</p>
        </div>
      </div>

      <div className="stats-grid">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon ${color}`}><Icon size={20} /></div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">📞 Calls — Last 7 Days</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weekly_calls} barSize={28}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="calls" fill="#4F46E5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">📊 Feedback Distribution</span></div>
          {stats.feedback_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.feedback_distribution} dataKey="count" nameKey="code" cx="50%" cy="50%" outerRadius={70} label={({ code }) => code}>
                  {stats.feedback_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No call data yet</p></div>}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title">👥 Agent Performance — Feedback Breakdown</span>
          <button className="btn btn-sm btn-secondary" onClick={downloadReport}>
            <Download size={12} /> Export CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Cases</th>
                <th>Calls Today</th>
                <th style={{ color: '#6366F1' }}>NC</th>
                <th style={{ color: '#EF4444' }}>WN</th>
                <th style={{ color: '#F59E0B' }}>RTP</th>
                <th style={{ color: '#10B981' }}>PT</th>
                <th style={{ color: '#94A3B8' }}>RNR</th>
                <th>PTP</th>
                <th>Closed</th>
                <th>Last Login (IST)</th>
                <th>Last Logout (IST)</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.agent.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {a.agent.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.agent.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.agent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${a.is_online ? 'online' : 'offline'}`}>
                      <OnlineDot online={a.is_online} />
                      {a.is_online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td><strong>{a.total_cases}</strong></td>
                  <td><strong style={{ color: 'var(--primary)' }}>{a.calls_today}</strong></td>
                  <td><strong style={{ color: '#6366F1' }}>{a.feedback_counts?.NC ?? 0}</strong></td>
                  <td><strong style={{ color: '#EF4444' }}>{a.feedback_counts?.WN ?? 0}</strong></td>
                  <td><strong style={{ color: '#F59E0B' }}>{a.feedback_counts?.RTP ?? 0}</strong></td>
                  <td><strong style={{ color: '#10B981' }}>{a.feedback_counts?.PT ?? 0}</strong></td>
                  <td><strong style={{ color: '#94A3B8' }}>{a.feedback_counts?.RNR ?? 0}</strong></td>
                  <td><strong style={{ color: '#7C3AED' }}>{a.ptp_count}</strong></td>
                  <td><strong style={{ color: 'var(--success)' }}>{a.cases_closed}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                    {a.last_login_ist || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                    {a.last_logout_ist || '—'}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No agents yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}