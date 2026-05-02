import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesAPI, activityAPI, analyticsAPI } from '../../api/client';
import { Spinner, StatusBadge, FeedbackBadge } from '../../components/common';
import { FolderOpen, Phone, Clock, CheckCircle, Search, Eye, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

export function AgentDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      casesAPI.summary(),
      activityAPI.listCallLogs({ today_only: true }),
      analyticsAPI.followUps()
    ]).then(([s, c, f]) => {
      setSummary(s.data);
      setRecentCalls(c.data.slice(0, 5));
      setFollowUps(f.data.slice(0, 5));
    });
  }, []);

  if (!summary) return <Spinner />;

  const STATS = [
    { label: 'My Cases', value: summary.total, icon: FolderOpen, color: 'purple' },
    { label: 'Calls Today', value: summary.calls_today, icon: Phone, color: 'green' },
    { label: 'Follow Ups', value: summary.follow_up, icon: Clock, color: 'amber' },
    { label: 'Closed', value: summary.closed, icon: CheckCircle, color: 'cyan' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user.name} 👋</h1>
          <p className="page-subtitle">Here's your work summary for today</p>
        </div>
      </div>

      <div className="stats-grid">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon ${color}`}><Icon size={20} /></div>
            <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">📞 Today's Calls</span>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/my-cases')}>View Cases</button>
          </div>
          {recentCalls.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentCalls.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <FeedbackBadge code={log.feedback_code} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{log.remarks?.slice(0, 50) || 'No remarks'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(log.called_at), 'hh:mm a')}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No calls logged today yet.</p>}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">⚠️ Pending Follow-ups</span>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/follow-ups')}>See All</button>
          </div>
          {followUps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {followUps.map(c => (
                <div key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <Bell size={14} style={{ color: 'var(--warning)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.follow_up_date ? format(new Date(c.follow_up_date), 'dd MMM') : ''}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending follow-ups. Good work! ✅</p>}
        </div>
      </div>
    </div>
  );
}

export function MyCasesPage() {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    const skip = (page - 1) * limit;
    casesAPI.list({ status, search, skip, limit })
      .then(r => {
        setCases(r.data.items || []);
        setTotal(r.data.total || 0);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [status, page]);


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Cases</h1>
          <p className="page-subtitle">Showing {cases.length} of {total} cases allocated to you</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={14} />
          <input className="form-control search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }} />
        </div>
        <select className="form-control" style={{ width: 150 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="follow_up">Follow Up</option>
          <option value="ptp">PTP</option>
          <option value="rtp">RTP</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Loan No.</th>
                  <th>Phone</th>
                  <th>Bank</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Follow Up</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.customer_name}</strong></td>
                    <td><code style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{c.loan_number}</code></td>
                    <td>
                      <a href={`tel:${c.primary_phone}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>{c.primary_phone}</a>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.bank_name || '—'}</td>
                    <td><strong>₹{c.outstanding_amount?.toLocaleString('en-IN')}</strong></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ fontSize: 12, color: c.follow_up_date && new Date(c.follow_up_date) < new Date() ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {c.follow_up_date ? format(new Date(c.follow_up_date), 'dd MMM') : '—'}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/cases/${c.id}`)}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {cases.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No cases assigned yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {total > limit && (
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={page >= Math.ceil(total / limit)} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    analyticsAPI.followUps().then(r => setFollowUps(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p className="page-subtitle">{followUps.length} pending follow-ups</p>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Customer</th><th>Phone</th><th>Outstanding</th><th>Status</th><th>Follow-up Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {followUps.map(c => (
                  <tr key={c.id} style={{ background: new Date(c.follow_up_date) < new Date() ? '#FFF1F2' : '' }}>
                    <td><strong>{c.customer_name}</strong></td>
                    <td>{c.primary_phone}</td>
                    <td>₹{c.outstanding_amount?.toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ color: new Date(c.follow_up_date) < new Date() ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 600 }}>
                      {c.follow_up_date ? format(new Date(c.follow_up_date), 'dd MMM yyyy') : '—'}
                      {new Date(c.follow_up_date) < new Date() && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Overdue</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/cases/${c.id}`)}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {followUps.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--success)', fontWeight: 600 }}>✅ No pending follow-ups!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
