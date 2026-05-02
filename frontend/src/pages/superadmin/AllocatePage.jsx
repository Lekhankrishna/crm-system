import { useState, useEffect } from 'react';
import { casesAPI, usersAPI } from '../../api/client';
import { Spinner } from '../../components/common';
import { Search, CheckSquare, UserCheck, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AllocatePage() {
  const [cases, setCases] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [agentId, setAgentId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ bank: '', bucket: '', unallocated: true });
  const [allocating, setAllocating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, a] = await Promise.all([
      casesAPI.list({ unallocated: true, limit: 200 }),
      usersAPI.agents()
    ]);
    setCases(c.data.items || []);
    setAgents(a.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    return (!q || c.customer_name.toLowerCase().includes(q) || c.loan_number.toLowerCase().includes(q) || c.primary_phone.includes(q))
      && (!filter.bank || c.bank_name?.toLowerCase().includes(filter.bank.toLowerCase()))
      && (!filter.bucket || c.bucket === filter.bucket);
  });

  const toggle = (id) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const handleAllocate = async () => {
    if (!agentId) { toast.error('Select an agent'); return; }
    if (selected.size === 0) { toast.error('Select at least one case'); return; }
    setAllocating(true);
    try {
      const res = await casesAPI.allocate({ agent_id: parseInt(agentId), case_ids: [...selected] });
      toast.success(`${res.data.allocated} cases allocated to ${res.data.agent}`);
      setSelected(new Set());
      load();
    } catch { toast.error('Allocation failed'); } finally { setAllocating(false); }
  };

  const banks = [...new Set(cases.map(c => c.bank_name).filter(Boolean))];
  const buckets = [...new Set(cases.map(c => c.bucket).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Allocate Cases</h1>
          <p className="page-subtitle">{cases.length} unallocated cases available</p>
        </div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{selected.size} selected</span>
            <select className="form-control" value={agentId} onChange={e => setAgentId(e.target.value)} style={{ width: 200 }}>
              <option value="">Select Agent…</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleAllocate} disabled={allocating}>
              <UserCheck size={15} /> {allocating ? 'Allocating…' : 'Allocate'}
            </button>
          </div>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={14} />
          <input className="form-control search-input" placeholder="Search name, loan no, phone…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 150 }} value={filter.bank} onChange={e => setFilter(p => ({ ...p, bank: e.target.value }))}>
          <option value="">All Banks</option>
          {banks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="form-control" style={{ width: 130 }} value={filter.bucket} onChange={e => setFilter(p => ({ ...p, bucket: e.target.value }))}>
          <option value="">All Buckets</option>
          {buckets.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: 'var(--primary)' }} />
                  </th>
                  <th>Customer</th>
                  <th>Loan No.</th>
                  <th>Phone</th>
                  <th>Bank</th>
                  <th>Outstanding</th>
                  <th>Bucket</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => toggle(c.id)} style={{ cursor: 'pointer', background: selected.has(c.id) ? 'var(--primary-light)' : '' }}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ accentColor: 'var(--primary)' }} />
                    </td>
                    <td><strong>{c.customer_name}</strong></td>
                    <td><code style={{ fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{c.loan_number}</code></td>
                    <td>{c.primary_phone}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.bank_name || '—'}</td>
                    <td><strong>₹{c.outstanding_amount?.toLocaleString('en-IN')}</strong></td>
                    <td>
                      {c.bucket ? <span className="badge badge-warning">{c.bucket}</span> : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>All cases are allocated ✓</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
