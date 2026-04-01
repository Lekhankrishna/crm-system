import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI, usersAPI } from '../../api/client';
import api from '../../api/client';
import { Spinner, OnlineDot, FeedbackBadge } from '../../components/common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LogIn, LogOut, Download, MessageSquare, RefreshCw } from 'lucide-react';

const CODES = ['NC', 'WN', 'RTP', 'PT', 'RNR'];
const CODE_LABELS = { NC: 'Not Contactable', WN: 'Wrong Number', RTP: 'Ready to Pay', PT: 'Promise to Pay', RNR: 'Ring No Response' };
const CODE_COLORS = { NC: '#6366F1', WN: '#EF4444', RTP: '#F59E0B', PT: '#10B981', RNR: '#94A3B8' };

function downloadCSV(filename, rows, headers) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AgentActivityPage() {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');

  const loadAgents = useCallback(() => {
    setLoading(true);
    analyticsAPI.agentStats()
      .then(r => {
        setAgents(r.data);
        if (r.data.length > 0) loadAgentDetail(r.data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const loadAgentDetail = async (a) => {
    setSelected(a);
    setDetailLoading(true);
    setActiveTab('activity');
    try {
      const [act, sess, logs] = await Promise.all([
        analyticsAPI.agentActivity(a.agent.id, 14),
        usersAPI.sessions(a.agent.id),
        api.get(`/analytics/agent/${a.agent.id}/call-logs`),
      ]);
      setActivity(act.data);
      setSessions(sess.data);
      setCallLogs(logs.data);
    } finally { setDetailLoading(false); }
  };

  const downloadAgentReport = () => {
    if (!selected) return;
    const headers = ['Date', 'Calls', 'NC', 'WN', 'RTP', 'PT', 'RNR', 'Login (IST)', 'Logout (IST)', 'Duration'];
    const rows = activity.map(d => [
      d.date_full, d.calls,
      d.feedback.NC, d.feedback.WN, d.feedback.RTP, d.feedback.PT, d.feedback.RNR,
      d.login_ist || '—', d.logout_ist || '—',
      d.duration_mins != null ? `${Math.floor(d.duration_mins/60)}h ${d.duration_mins%60}m` : '—'
    ]);
    downloadCSV(`${selected.agent.name}_activity_report.csv`, rows, headers);
  };

  const downloadCallLogsReport = () => {
    if (!selected) return;
    const headers = ['Date & Time (IST)', 'Customer', 'Loan No.', 'Phone', 'Feedback', 'Remarks', 'Follow-up Date', 'Promise Amount'];
    const rows = callLogs.map(l => [
      l.called_at_ist, l.customer_name, l.loan_number, l.phone,
      `${l.feedback_code} - ${CODE_LABELS[l.feedback_code] || l.feedback_code}`,
      l.remarks, l.follow_up_date || '', l.promise_amount || ''
    ]);
    downloadCSV(`${selected.agent.name}_call_logs.csv`, rows, headers);
  };

  const downloadAllAgentsReport = () => {
    const headers = ['Agent', 'Email', 'Total Cases', 'Calls Today', 'Total Calls', 'NC', 'WN', 'RTP', 'PT', 'RNR', 'PTP', 'Closed', 'Last Login (IST)', 'Last Logout (IST)', 'Status'];
    const rows = agents.map(a => [
      a.agent.name, a.agent.email,
      a.total_cases, a.calls_today, a.calls_total,
      a.feedback_counts.NC, a.feedback_counts.WN, a.feedback_counts.RTP, a.feedback_counts.PT, a.feedback_counts.RNR,
      a.ptp_count, a.cases_closed,
      a.last_login_ist || '—', a.last_logout_ist || '—',
      a.is_online ? 'Online' : 'Offline'
    ]);
    downloadCSV('all_agents_report.csv', rows, headers);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Activity</h1>
          <p className="page-subtitle">Login/logout times in IST · Real-time call tracking</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadAllAgentsReport}>
          <Download size={14} /> Export All Agents CSV
        </button>
      </div>

      {/* ── Summary feedback table across ALL agents ─────────────────── */}
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title">📊 Feedback Summary — All Agents</span>
          <button className="btn btn-sm btn-secondary" onClick={loadAgents}><RefreshCw size={12} /> Refresh</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Total Calls</th>
                <th style={{ color: CODE_COLORS.NC }}>NC</th>
                <th style={{ color: CODE_COLORS.WN }}>WN</th>
                <th style={{ color: CODE_COLORS.RTP }}>RTP</th>
                <th style={{ color: CODE_COLORS.PT }}>PT</th>
                <th style={{ color: CODE_COLORS.RNR }}>RNR</th>
                <th>PTP</th>
                <th>Closed</th>
                <th>Last Login (IST)</th>
                <th>Last Logout (IST)</th>
                <th>Latest Remark</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr
                  key={a.agent.id}
                  onClick={() => loadAgentDetail(a)}
                  style={{ cursor: 'pointer', background: selected?.agent.id === a.agent.id ? 'var(--primary-light)' : '' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{a.agent.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.agent.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.calls_today} calls today</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${a.is_online ? 'online' : 'offline'}`}>
                      <OnlineDot online={a.is_online} />
                      {a.is_online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td><strong>{a.calls_total}</strong></td>
                  {CODES.map(code => (
                    <td key={code}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <strong style={{ color: CODE_COLORS[code], fontSize: 14 }}>{a.feedback_counts[code]}</strong>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({a.feedback_today[code]} today)</span>
                      </div>
                    </td>
                  ))}
                  <td><strong style={{ color: '#7C3AED' }}>{a.ptp_count}</strong></td>
                  <td><strong style={{ color: 'var(--success)' }}>{a.cases_closed}</strong></td>
                  <td style={{ fontSize: 12 }}>
                    {a.last_login_ist
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)' }}><LogIn size={11} />{a.last_login_ist}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>Never</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {a.last_logout_ist
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}><LogOut size={11} />{a.last_logout_ist}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {a.latest_remark ? (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={a.latest_remark}>
                          {a.latest_remark}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.latest_feedback} · {a.latest_call_at}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No remarks</span>}
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No agents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Per-agent detail ─────────────────────────────────────────── */}
      {selected && (
        <div className="card" style={{ padding: 0 }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{selected.agent.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                {selected.agent.name}
                <span className={`badge badge-${selected.is_online ? 'online' : 'offline'}`}>
                  <OnlineDot online={selected.is_online} />
                  {selected.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selected.agent.email}</div>
            </div>
            {/* Mini feedback pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CODES.map(code => (
                <div key={code} style={{ textAlign: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: CODE_COLORS[code] }}>{selected.feedback_counts[code]}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{code}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={downloadAgentReport}><Download size={12} /> Activity CSV</button>
              <button className="btn btn-sm btn-secondary" onClick={downloadCallLogsReport}><Download size={12} /> Call Logs CSV</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
            {[
              { id: 'activity', label: '📅 14-Day Activity' },
              { id: 'sessions', label: '🕐 Login History' },
              { id: 'calllogs', label: `💬 Call Logs & Remarks (${callLogs.length})` },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '12px 16px', border: 'none', background: 'transparent',
                  fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
                  color: activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: -1,
                }}
              >{t.label}</button>
            ))}
          </div>

          {detailLoading ? <Spinner /> : (
            <div style={{ padding: 20 }}>

              {/* ── Activity tab ── */}
              {activeTab === 'activity' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={activity} barSize={18}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {CODES.map(code => (
                          <Bar key={code} dataKey={`feedback.${code}`} name={code} stackId="a" fill={CODE_COLORS[code]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Total Calls</th>
                          {CODES.map(c => <th key={c} style={{ color: CODE_COLORS[c] }}>{c}</th>)}
                          <th>Login (IST)</th>
                          <th>Logout (IST)</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map(d => (
                          <tr key={d.date}>
                            <td style={{ fontWeight: 500 }}>{d.date_full}</td>
                            <td><strong style={{ color: 'var(--primary)' }}>{d.calls}</strong></td>
                            {CODES.map(code => (
                              <td key={code}>
                                <strong style={{ color: d.feedback[code] > 0 ? CODE_COLORS[code] : 'var(--text-muted)' }}>
                                  {d.feedback[code] || 0}
                                </strong>
                              </td>
                            ))}
                            <td style={{ fontSize: 12 }}>
                              {d.login_ist
                                ? <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}><LogIn size={11} />{d.login_ist}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {d.logout_ist
                                ? <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><LogOut size={11} />{d.logout_ist}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 }}>
                              {d.duration_mins != null ? `${Math.floor(d.duration_mins/60)}h ${d.duration_mins%60}m` : '—'}
                            </td>
                          </tr>
                        ))}
                        {activity.length === 0 && (
                          <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No activity in last 14 days</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Sessions tab ── */}
              {activeTab === 'sessions' && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Login Time (IST)</th>
                        <th>Logout Time (IST)</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => {
                        // Convert UTC to IST in frontend
                        const toIST = (isoStr) => {
                          if (!isoStr) return null;
                          const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
                          return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                        };
                        const loginIST = toIST(s.login_time);
                        const logoutIST = s.logout_time ? toIST(s.logout_time) : null;
                        const loginMs = new Date(s.login_time.endsWith('Z') ? s.login_time : s.login_time + 'Z').getTime();
                        const logoutMs = s.logout_time ? new Date(s.logout_time.endsWith('Z') ? s.logout_time : s.logout_time + 'Z').getTime() : null;
                        const mins = logoutMs ? Math.round((logoutMs - loginMs) / 60000) : null;
                        const dur = mins != null ? `${Math.floor(mins/60)}h ${mins%60}m` : '—';
                        const dateLabel = new Date(s.login_time.endsWith('Z') ? s.login_time : s.login_time + 'Z')
                          .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
                        return (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{dateLabel}</td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--success)', fontSize: 12 }}>
                                <LogIn size={12} />{loginIST}
                              </span>
                            </td>
                            <td>
                              {logoutIST
                                ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--danger)', fontSize: 12 }}><LogOut size={12} />{logoutIST}</span>
                                : <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 12 }}>● Still active</span>}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{dur}</td>
                            <td>
                              <span className={`badge badge-${s.is_active ? 'online' : 'offline'}`}>
                                {s.is_active ? 'Active' : 'Ended'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {sessions.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No session history</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Call Logs + Remarks tab ── */}
              {activeTab === 'calllogs' && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date & Time (IST)</th>
                        <th>Customer</th>
                        <th>Loan No.</th>
                        <th>Phone</th>
                        <th>Feedback</th>
                        <th>Remarks / Comments</th>
                        <th>Follow-up</th>
                        <th>PTP Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{log.called_at_ist}</td>
                          <td style={{ fontWeight: 600 }}>{log.customer_name}</td>
                          <td><code style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{log.loan_number}</code></td>
                          <td style={{ fontSize: 12 }}>{log.phone}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span className="badge" style={{ background: CODE_COLORS[log.feedback_code] + '20', color: CODE_COLORS[log.feedback_code], width: 'fit-content' }}>
                                {log.feedback_code}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{CODE_LABELS[log.feedback_code] || ''}</span>
                            </div>
                          </td>
                          <td style={{ maxWidth: 260 }}>
                            {log.remarks ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <MessageSquare size={12} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{log.remarks}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No remarks</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--info)' }}>
                            {log.follow_up_date ? new Date(log.follow_up_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                            {log.promise_amount ? `₹${Number(log.promise_amount).toLocaleString('en-IN')}` : '—'}
                          </td>
                        </tr>
                      ))}
                      {callLogs.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No calls logged yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}