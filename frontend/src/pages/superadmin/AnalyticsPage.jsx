import { useState, useEffect } from 'react';
import { analyticsAPI } from '../../api/client';
import { Spinner } from '../../components/common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Phone, CheckCircle, Clock } from 'lucide-react';

const COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#EC4899'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [agentStats, setAgentStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsAPI.dashboard(), analyticsAPI.agentStats()])
      .then(([d, a]) => { setStats(d.data); setAgentStats(a.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const caseStatusData = [
    { name: 'New', value: stats.total_cases - stats.cases_closed - stats.ptp_cases },
    { name: 'Closed', value: stats.cases_closed },
    { name: 'PTP', value: stats.ptp_cases },
    { name: 'Unallocated', value: stats.unallocated },
  ].filter(d => d.value > 0);

  const topAgents = [...agentStats].sort((a, b) => b.calls_today - a.calls_today).slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-subtitle">System-wide performance overview</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">📞 Daily Calls — Last 7 Days</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.weekly_calls}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4, fill: '#4F46E5' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">📊 Case Status Distribution</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={caseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {caseStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">🏆 Top Agents — Calls Today</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topAgents.map(a => ({ name: a.agent.name.split(' ')[0], calls: a.calls_today, closed: a.cases_closed }))} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="calls" fill="#4F46E5" name="Calls" radius={[0,4,4,0]} />
              <Bar dataKey="closed" fill="#10B981" name="Closed" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">📋 Feedback Code Breakdown</span></div>
          {stats.feedback_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.feedback_distribution} barSize={28}>
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {stats.feedback_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No call data yet</p></div>}
        </div>
      </div>

      {/* Agent summary table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title">👥 Full Agent Performance Report</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Total Cases</th>
                <th>Calls Today</th>
                <th>PTP</th>
                <th>RTP</th>
                <th>Closed</th>
                <th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {agentStats.map(a => {
                const rate = a.total_cases > 0 ? Math.round((a.cases_closed / a.total_cases) * 100) : 0;
                return (
                  <tr key={a.agent.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{a.agent.name[0]}</div>
                        <span style={{ fontWeight: 600 }}>{a.agent.name}</span>
                      </div>
                    </td>
                    <td>{a.total_cases}</td>
                    <td><strong style={{ color: 'var(--primary)' }}>{a.calls_today}</strong></td>
                    <td><strong style={{ color: '#7C3AED' }}>{a.ptp_count}</strong></td>
                    <td><strong style={{ color: 'var(--warning)' }}>{a.rtp_count}</strong></td>
                    <td><strong style={{ color: 'var(--success)' }}>{a.cases_closed}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${rate}%`, height: '100%', background: rate > 50 ? 'var(--success)' : rate > 25 ? 'var(--warning)' : 'var(--danger)', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {agentStats.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No agent data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
