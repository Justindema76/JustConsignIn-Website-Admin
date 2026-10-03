import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsQuotes, updateSunwingsQuote } from './sunwingsAdminService';

const STATUS_OPTIONS = ['new','contacted','quoted','closed'];

export default function QuoteRequestsAdmin() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const rows = await loadSunwingsQuotes(accessToken);
    setRequests(rows);
  };

  useEffect(() => {
    if (!accessToken) return;
    setBusy(true);
    refresh().catch(err => setError(err.message)).finally(() => setBusy(false));
  }, [accessToken]);

  const updateStatus = async (request, status) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await updateSunwingsQuote(accessToken, request.id, status);
      setRequests(current => current.map(item => item.id === request.id ? (saved || { ...item, status }) : item));
      setMessage('Quote request updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Leads</p>
        <h1>Quote Requests</h1>
        <p>Only quote requests submitted through the Sunwings Transport website appear here.</p>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head"><span>Customer</span><span>Service</span><span>Route</span><span>Status</span><span>Received</span></div>
      {busy && !requests.length ? <div className="site-admin-empty">Loading quote requests…</div> : requests.map(request => <div className="site-admin-table-row" key={request.id}>
        <div>
          <strong>{request.name}</strong>
          <small>{request.phone}{request.email ? ` · ${request.email}` : ''}</small>
          {request.message && <small>{request.message}</small>}
        </div>
        <span>{request.service || '—'}</span>
        <span>{[request.move_from, request.move_to].filter(Boolean).join(' → ') || '—'}</span>
        <label>
          <select value={request.status || 'new'} onChange={event => updateStatus(request, event.target.value)} disabled={busy}>
            {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <span>{request.created_at ? new Date(request.created_at).toLocaleString() : '—'}</span>
      </div>)}
      {!busy && !requests.length && <div className="site-admin-empty">No Sunwings quote requests yet.</div>}
    </div>
  </>;
}
