import { useEffect, useState } from 'react';
import { CheckCircle2, Clipboard, MailCheck, Phone } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsQuotes, updateSunwingsQuote } from './sunwingsAdminService';

const STATUS_OPTIONS = ['new','contacted','quoted','closed'];

function phoneHref(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits ? `tel:+${digits.startsWith('1') ? digits : `1${digits}`}` : '#';
}

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

  const copyPhone = async phone => {
    try {
      await navigator.clipboard.writeText(phone || '');
      setMessage('Phone number copied.');
    } catch {
      setError('Unable to copy the phone number.');
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
      <div className="site-admin-table-head"><span>Customer</span><span>Job</span><span>Route</span><span>Status</span><span>Received</span></div>
      {busy && !requests.length ? <div className="site-admin-empty">Loading quote requests…</div> : requests.map(request => <div className="site-admin-table-row" key={request.id}>
        <div>
          <strong>{request.name}</strong>
          <small>
            <a href={phoneHref(request.phone)}><Phone size={12}/> {request.phone}</a>
            <button className="site-admin-inline-icon" type="button" title="Copy phone" aria-label="Copy phone" onClick={() => copyPhone(request.phone)}><Clipboard size={12}/></button>
          </small>
          {request.email ? <small><a href={`mailto:${request.email}`}>{request.email}</a></small> : null}
          {request.email_notified_at ? <small><MailCheck size={12}/> Notification emailed</small> : request.email_notification_error ? <small className="site-admin-error-text">Email notification failed: {request.email_notification_error}</small> : null}
        </div>
        <div>
          <strong>{request.service || '—'}</strong>
          {request.move_size ? <small>{request.move_size}</small> : null}
          {request.preferred_date ? <small>Preferred: {new Date(`${request.preferred_date}T12:00:00`).toLocaleDateString()}</small> : null}
          {request.message ? <small>{request.message}</small> : null}
        </div>
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
