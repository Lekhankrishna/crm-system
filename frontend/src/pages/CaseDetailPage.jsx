import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casesAPI, activityAPI } from '../api/client';
import { Spinner, StatusBadge, FeedbackBadge, Modal } from '../components/common';
import { ArrowLeft, Phone, Plus, Clock, CheckCircle, MessageSquare, Calendar, IndianRupee, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/* ── Feedback code definitions ───────────────────────────────────── */
const FEEDBACK_CODES = [
  {
    value: 'NC', label: 'Not Contactable', short: 'NC',
    color: '#6366F1', bg: '#EEF2FF',
    desc: 'Called but customer did not pick up',
    needsRemark: false, needsFollowup: true, needsPTP: false,
  },
  {
    value: 'RNR', label: 'Ring No Response', short: 'RNR',
    color: '#94A3B8', bg: '#F1F5F9',
    desc: 'Phone rang but no one answered',
    needsRemark: false, needsFollowup: true, needsPTP: false,
  },
  {
    value: 'WN', label: 'Wrong Number', short: 'WN',
    color: '#EF4444', bg: '#FEF2F2',
    desc: 'Number does not belong to this customer',
    needsRemark: true, needsFollowup: false, needsPTP: false,
  },
  {
    value: 'RTP', label: 'Ready to Pay', short: 'RTP',
    color: '#F59E0B', bg: '#FFFBEB',
    desc: 'Customer is willing and ready to pay',
    needsRemark: true, needsFollowup: true, needsPTP: true,
  },
  {
    value: 'PT', label: 'Promise to Pay', short: 'PT',
    color: '#10B981', bg: '#ECFDF5',
    desc: 'Customer has promised a specific payment',
    needsRemark: true, needsFollowup: true, needsPTP: true,
  },
  {
    value: 'PTP', label: 'PTP Scheduled', short: 'PTP',
    color: '#7C3AED', bg: '#F3E8FF',
    desc: 'Payment scheduled for a future date',
    needsRemark: true, needsFollowup: true, needsPTP: true,
  },
  {
    value: 'CB', label: 'Call Back', short: 'CB',
    color: '#3B82F6', bg: '#EFF6FF',
    desc: 'Customer asked to call back later',
    needsRemark: false, needsFollowup: true, needsPTP: false,
  },
  {
    value: 'PAID', label: 'Payment Received', short: 'PAID',
    color: '#059669', bg: '#D1FAE5',
    desc: 'Customer has already made the payment',
    needsRemark: true, needsFollowup: false, needsPTP: true,
  },
  {
    value: 'DISPUTE', label: 'Dispute', short: 'DISPUTE',
    color: '#DC2626', bg: '#FEE2E2',
    desc: 'Customer is disputing the loan/amount',
    needsRemark: true, needsFollowup: true, needsPTP: false,
  },
];

const TRACING_TYPES = ['phone', 'whatsapp', 'telegram', 'address', 'employer', 'email', 'other'];

/* ── Inline Call Log Panel (no modal) ───────────────────────────── */
function CallLogPanel({ caseId, onSaved, onCancel }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ remarks: '', follow_up_date: '', promise_amount: '', promise_date: '' });
  const [saving, setSaving] = useState(false);

  const codeInfo = FEEDBACK_CODES.find(f => f.value === selected?.value);

  const handleSubmit = async () => {
    if (!selected) { toast.error('Select a feedback code'); return; }
    if ((codeInfo?.needsRemark) && !form.remarks.trim()) {
      toast.error('Please add a remark for this feedback code');
      return;
    }
    setSaving(true);
    try {
      await activityAPI.createCallLog({
        case_id: parseInt(caseId),
        feedback_code: selected.value,
        remarks: form.remarks || null,
        follow_up_date: form.follow_up_date || null,
        promise_amount: form.promise_amount ? parseFloat(form.promise_amount) : null,
        promise_date: form.promise_date || null,
      });
      toast.success('Call logged successfully!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: '#fff', border: '2px solid var(--primary)', borderRadius: 14,
      overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 20px rgba(79,70,229,0.12)'
    }}>
      <div style={{ background: 'var(--primary)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Phone size={18} color="#fff" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Log Call Outcome</span>
        </div>
        <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: step === 1 ? 0 : 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Step 1 — What was the call outcome?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
            {FEEDBACK_CODES.map(code => (
              <button
                key={code.value}
                onClick={() => { setSelected(code); setStep(2); }}
                style={{
                  border: `2px solid ${selected?.value === code.value ? code.color : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                  background: selected?.value === code.value ? code.bg : '#fff',
                  transition: 'all 0.15s', position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    background: code.color, color: '#fff', borderRadius: 6,
                    padding: '2px 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.3px'
                  }}>{code.short}</span>
                  {selected?.value === code.value && (
                    <CheckCircle size={14} style={{ color: code.color, marginLeft: 'auto' }} />
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{code.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{code.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 2 — Add details for
              </p>
              <span style={{ background: selected.color, color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
                {selected.short} — {selected.label}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={13} />
                  Remarks / Comments
                  {codeInfo?.needsRemark && <span style={{ color: 'var(--danger)', fontSize: 11 }}>* required</span>}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={
                    selected.value === 'NC'    ? 'e.g. Called 3 times, not picking up. Will try in evening.' :
                    selected.value === 'WN'    ? 'e.g. Wrong person answered, says no one by this name.' :
                    selected.value === 'RTP'   ? 'e.g. Customer ready to pay ₹5000 this week. Needs bank details.' :
                    selected.value === 'PT'    ? 'e.g. Promised to pay ₹10,000 by 5th of this month.' :
                    selected.value === 'PTP'   ? 'e.g. PTP of ₹15,000 scheduled. Customer confirmed.' :
                    selected.value === 'PAID'  ? 'e.g. Customer says paid via UPI on 28th. Verify with bank.' :
                    selected.value === 'DISPUTE' ? 'e.g. Customer says amount is wrong. Claims already settled.' :
                    selected.value === 'CB'    ? 'e.g. Customer in meeting. Asked to call after 5 PM.' :
                    'Add your notes about this call…'
                  }
                  value={form.remarks}
                  onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: 80 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {form.remarks.length} characters
                </div>
              </div>

              {codeInfo?.needsFollowup && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} /> Follow-up Date
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.follow_up_date}
                    onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))}
                    style={{ maxWidth: 220 }}
                  />
                </div>
              )}

              {codeInfo?.needsPTP && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 14, background: '#ECFDF5', borderRadius: 10, border: '1px solid #A7F3D0' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065F46' }}>
                      <IndianRupee size={13} /> Promise Amount (₹)
                    </label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="e.g. 15000"
                      min="0"
                      value={form.promise_amount}
                      onChange={e => setForm(p => ({ ...p, promise_amount: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065F46' }}>
                      <Calendar size={13} /> Promise Date
                    </label>
                    <input
                      className="form-control"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.promise_date}
                      onChange={e => setForm(p => ({ ...p, promise_date: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {selected.value === 'WN' && (
                <div className="alert alert-warning" style={{ fontSize: 12 }}>
                  <AlertCircle size={14} />
                  <span>Marking as Wrong Number will flag this number for review. Add any alternate contact you found in remarks.</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving}
                style={{ minWidth: 140, justifyContent: 'center' }}
              >
                {saving ? 'Saving…' : `✓ Save — ${selected.short}`}
              </button>
              <button className="btn btn-secondary" onClick={() => { setSelected(null); setStep(1); setForm({ remarks: '', follow_up_date: '', promise_amount: '', promise_date: '' }); }}>
                ← Change Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Case Detail Page ───────────────────────────────────────── */
export default function CaseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCallLog, setShowCallLog] = useState(false);
  const [showTracing, setShowTracing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tracingForm, setTracingForm] = useState({ data_type: 'phone', value: '', source: 'self-traced', is_verified: false });

  const load = () => {
    setLoading(true);
    casesAPI.get(id).then(r => setCaseData(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleTracing = async () => {
    setSaving(true);
    try {
      await activityAPI.addTracing({ case_id: parseInt(id), ...tracingForm });
      toast.success('Tracing data added');
      setShowTracing(false);
      load();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (!caseData) return <div className="empty-state"><h3>Case not found</h3></div>;

  const c = caseData;
  const backPath = user.role === 'agent' ? '/my-cases' : '/cases';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(backPath)}><ArrowLeft size={14} /></button>
          <div>
            <h1 className="page-title">{c.customer_name}</h1>
            <p className="page-subtitle">Loan: {c.loan_number} · {c.bank_name || 'Unknown Bank'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <StatusBadge status={c.status} />
          {!showCallLog && (
            <button className="btn btn-primary" onClick={() => setShowCallLog(true)}>
              <Phone size={14} /> Log Call
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowTracing(true)}>
            <Plus size={14} /> Add Tracing
          </button>
        </div>
      </div>

      {showCallLog && (
        <CallLogPanel
          caseId={id}
          onSaved={() => { setShowCallLog(false); load(); }}
          onCancel={() => setShowCallLog(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Borrower details */}
        <div className="card">
          <div className="card-header"><span className="card-title">👤 Borrower Details</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Name', c.customer_name],
              ['Primary Phone', c.primary_phone],
              ['Alternate Phone', c.alternate_number || '—'],
              ['Address', c.address || '—'],
              ['Pincode', c.pincode || '—'],
              ['Bank', c.bank_name || '—'],
              ['Loan Amount', c.loan_amount != null ? `₹${c.loan_amount?.toLocaleString('en-IN')}` : '—'],
              ['POS', c.pos != null ? `₹${c.pos?.toLocaleString('en-IN')}` : '—'],
              ['Outstanding', `₹${c.outstanding_amount?.toLocaleString('en-IN')}`],
              ['Bucket (DPD)', c.bucket || '—'],
              ['Last Payment', c.last_payment_date || '—'],
              ['Assigned Agent', c.agent?.name || 'Unallocated'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracing */}
        <div className="card">
          <div className="card-header"><span className="card-title">🔍 Traced Information</span></div>
          {c.tracing_data?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.tracing_data.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{t.data_type}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{t.value}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.source}</span>
                  {t.is_verified && <CheckCircle size={13} style={{ color: 'var(--success)' }} />}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 30 }}>
              <p>No tracing data added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Call History */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📞 Call History ({c.call_logs?.length || 0})</span>
        </div>
        {c.call_logs?.length > 0 ? (
          <div className="timeline">
            {c.call_logs.map(log => {
              const codeInfo = FEEDBACK_CODES.find(f => f.value === log.feedback_code);
              return (
                <div key={log.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: codeInfo?.color || 'var(--primary)' }} />
                  <div className="timeline-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: codeInfo?.color || 'var(--primary)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
                        {log.feedback_code}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: codeInfo?.color }}>{codeInfo?.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>by {log.agent?.name}</span>
                    </div>

                    {log.remarks && (
                      <div style={{ display: 'flex', gap: 8, background: codeInfo?.bg || '#F8FAFC', borderRadius: 8, padding: '8px 12px', marginBottom: 8, border: `1px solid ${codeInfo?.color}30` }}>
                        <MessageSquare size={13} style={{ color: codeInfo?.color, flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 13, color: '#0F172A', lineHeight: 1.5, margin: 0 }}>{log.remarks}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {log.follow_up_date && (
                        <span style={{ fontSize: 11, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> Follow-up: {format(new Date(log.follow_up_date), 'dd MMM yyyy')}
                        </span>
                      )}
                      {log.promise_amount && (
                        <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> PTP ₹{log.promise_amount?.toLocaleString('en-IN')}
                          {log.promise_date && ` by ${format(new Date(log.promise_date), 'dd MMM')}`}
                        </span>
                      )}
                    </div>
                    <div className="timeline-meta">
                      {new Date(log.called_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} IST
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Phone size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <h3>No calls logged yet</h3>
            <p>Click "Log Call" above to record your first call outcome</p>
          </div>
        )}
      </div>

      {/* Tracing Modal */}
      {showTracing && (
        <Modal title="🔍 Add Tracing Data" onClose={() => setShowTracing(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowTracing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleTracing} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
          </>}>
          <div className="form-group">
            <label className="form-label">Data Type</label>
            <select className="form-control" value={tracingForm.data_type} onChange={e => setTracingForm(p => ({ ...p, data_type: e.target.value }))}>
              {TRACING_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Value *</label>
            <input className="form-control" placeholder="Phone number / address / employer name…" value={tracingForm.value} onChange={e => setTracingForm(p => ({ ...p, value: e.target.value }))} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-control" value={tracingForm.source} onChange={e => setTracingForm(p => ({ ...p, source: e.target.value }))}>
                <option value="self-traced">Self-traced</option>
                <option value="external">External</option>
                <option value="customer-provided">Customer Provided</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Verified?</label>
              <select className="form-control" value={tracingForm.is_verified} onChange={e => setTracingForm(p => ({ ...p, is_verified: e.target.value === 'true' }))}>
                <option value="false">Unverified</option>
                <option value="true">Verified</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}