import { MailCheck, MailWarning } from 'lucide-react';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : '';
}

export default function DemoRequestEmailHistory({ emails, loading }) {
  return <section className="demo-email-history">
    <div className="demo-email-history-head">
      <div>
        <p className="site-admin-eyebrow">Communication</p>
        <h3>Email history</h3>
      </div>
      <span>{emails.length}</span>
    </div>

    {loading ? <p className="demo-email-history-empty">Loading email history…</p> : emails.length === 0 ? <p className="demo-email-history-empty">No emails have been sent from Website Admin for this request yet.</p> : <div className="demo-email-history-list">
      {emails.map(email => {
        const failed = email.delivery_status === 'failed';
        return <details className={`demo-email-history-item${failed ? ' failed' : ''}`} key={email.id}>
          <summary>
            <span className="demo-email-history-icon">{failed ? <MailWarning size={16}/> : <MailCheck size={16}/>}</span>
            <span className="demo-email-history-summary">
              <strong>{email.subject}</strong>
              <small>{failed ? 'Failed' : 'Sent'} · {formatDate(email.sent_at || email.created_at)}</small>
            </span>
          </summary>
          <div className="demo-email-history-body">
            <dl>
              <div><dt>To</dt><dd>{email.to_email}</dd></div>
              {list(email.cc_emails) && <div><dt>CC</dt><dd>{list(email.cc_emails)}</dd></div>}
              {list(email.bcc_emails) && <div><dt>BCC</dt><dd>{list(email.bcc_emails)}</dd></div>}
              {email.from_email && <div><dt>From</dt><dd>{email.from_email}</dd></div>}
            </dl>
            <p>{email.body_text}</p>
            {failed && email.delivery_error && <div className="site-admin-alert error">{email.delivery_error}</div>}
          </div>
        </details>;
      })}
    </div>}
  </section>;
}
