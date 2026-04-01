import { useState, useRef } from 'react';
import { casesAPI } from '../../api/client';
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
      setResult(null);
    } else {
      toast.error('Please upload CSV or Excel file only');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await casesAPI.uploadCSV(fd);
      setResult(res.data);
      toast.success(`${res.data.created} cases imported`);
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const csv = `loan_number,customer_name,primary_phone,alternate_number,address,pincode,outstanding_amount,bucket,bank_name,last_payment_date
LN001,John Doe,9876543210,9876543211,"123 Main St, Bangalore",560001,50000,30-60,HDFC Bank,2024-01-15
LN002,Jane Smith,9876543212,,,"456 MG Road, Mumbai",400001,120000,60-90,ICICI Bank,2024-01-10`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cases_template.csv'; a.click();
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Cases</h1>
          <p className="page-subtitle">Import borrower cases via CSV or Excel file</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadTemplate}><Download size={15} /> Download Template</button>
      </div>

      <div className="card mb-4">
        <h2 className="card-title" style={{ marginBottom: 12 }}>📋 Required Columns</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {[
            ['loan_number', 'Unique loan/account ID', true],
            ['customer_name', 'Borrower full name', true],
            ['primary_phone', 'Main contact number', true],
            ['alternate_number', 'Secondary number', false],
            ['address', 'Borrower address', false],
            ['pincode', 'PIN code', false],
            ['outstanding_amount', 'Outstanding balance', false],
            ['bucket', 'DPD bucket (30-60, 60-90...)', false],
            ['bank_name', 'Lending bank name', false],
            ['last_payment_date', 'Last payment date', false],
          ].map(([col, desc, req]) => (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <code style={{ fontSize: 11, background: req ? 'var(--primary-light)' : '#F1F5F9', color: req ? 'var(--primary)' : 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4 }}>{col}</code>
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{desc}</span>
              {req && <span style={{ color: 'var(--danger)', fontSize: 10, fontWeight: 700 }}>REQ</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div
          className={`upload-zone ${drag ? 'drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => handleFile(e.target.files[0])} />
          <Upload size={36} style={{ color: 'var(--primary)', marginBottom: 12 }} />
          {file ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Drop your CSV or Excel file here</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>or click to browse — supports .csv, .xlsx, .xls</div>
            </div>
          )}
        </div>

        {file && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload & Import'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); }}>Clear</button>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 20 }}>
            <div className="alert alert-success" style={{ marginBottom: 10 }}>
              <CheckCircle size={16} />
              <div>
                <strong>{result.created} cases imported successfully</strong>
                <div style={{ fontSize: 12, marginTop: 2 }}>{result.skipped} skipped (duplicates), {result.total_rows} total rows in file</div>
              </div>
            </div>
            {result.skipped > 0 && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} />
                <span>{result.skipped} cases were skipped because the loan number already exists in the system.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
