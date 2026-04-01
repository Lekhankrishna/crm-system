import { X } from 'lucide-react';

export function Modal({ title, onClose, children, footer, size = '' }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

const STATUS_LABELS = { new: 'New', follow_up: 'Follow Up', closed: 'Closed', ptp: 'PTP', rtp: 'RTP' };
const FEEDBACK_LABELS = { NC: 'Not Contactable', WN: 'Wrong Number', RTP: 'Ready to Pay', PT: 'Promise to Pay', RNR: 'Ring No Response', CB: 'Call Back', PTP: 'Promise to Pay', PAID: 'Paid', DISPUTE: 'Dispute' };

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function FeedbackBadge({ code }) {
  const colors = { NC: 'gray', WN: 'danger', RTP: 'warning', PT: 'info', PTP: 'ptp', RNR: 'gray', CB: 'info', PAID: 'success', DISPUTE: 'danger' };
  return <span className={`badge badge-${colors[code] || 'gray'}`}>{FEEDBACK_LABELS[code] || code}</span>;
}

export function Spinner() {
  return <div className="loader-wrap"><div className="spinner" /></div>;
}

export function Avatar({ name, size = 34 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0
    }}>{initials}</div>
  );
}

export function OnlineDot({ online }) {
  return <span className={`dot ${online ? 'dot-green' : 'dot-gray'}`} style={{ marginRight: 4 }} />;
}
