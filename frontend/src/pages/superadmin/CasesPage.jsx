import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesAPI } from '../../api/client';
import { Spinner, StatusBadge } from '../../components/common';
import { Search, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', bank_name: '' });
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    casesAPI.list({ ...filters, search, limit: 100 })
      .then(r => setCases(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filters]);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Cases</h1>
          <p className="page-subtitle">{cases.length} cases loaded</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} />
            <input className="form-control search-input" placeholder="Search name, loan no, phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
        <select className="form-control" style={{ width: 150 }} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
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
                  <th>Bucket</th>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.customer_name}</strong></td>
                    <td><code style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{c.loan_number}</code></td>
                    <td>{c.primary_phone}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.bank_name || '—'}</td>
                    <td><strong>₹{c.outstanding_amount?.toLocaleString('en-IN')}</strong></td>
                    <td>{c.bucket ? <span className="badge badge-warning">{c.bucket}</span> : '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {c.agent_id ? `Agent #${c.agent_id}` : <span style={{ color: 'var(--danger)' }}>Unallocated</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/cases/${c.id}`)}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {cases.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No cases found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
