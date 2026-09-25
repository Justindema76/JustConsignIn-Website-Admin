import { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import { sendDemoRequestEmail } from '../demoRequests.service';

function demoStarterMessage(firstName) {
  return `Hi ${firstName || 'there'},\n\nThanks for requesting a demo of JustConsignIn.\n\n`;
}

export default function DemoRequestEmailComposer({
  request,
  accessToken,
  onCancel,
  onSent,
  sendEmail = sendDemoRequestEmail,
  subjectText = 'Your JustConsignIn demo request',
  starterMessage = demoStarterMessage,
  recipientName,
  savedToLabel = 'this demo request',
  eyebrow = 'Email customer',
  heading = 'Send from Website Admin',
}) {
  const name = recipientName ?? request?.first_name;
  const [subject, setSubject] = useState(subjectText);
  const [message, setMessage] = useState(() => starterMessage(name, request));
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSubject(subjectText);
    setMessage(starterMessage(name, request));
    setCc('');
    setBcc('');
    setError('');
  }, [request?.id, name, subjectText, starterMessage]);

  const submit = async event => {
    event.preventDefault();
    if (!request?.id || !accessToken) return;
    setSending(true);
    setError('');
    try {
      const payload = await sendEmail(accessToken, {
        requestId: request.id,
        subject,
        message,
        ccEmails: cc,
        bccEmails: bcc,
      });
      onSent?.(payload);
    } catch (err) {
      setError(err?.message || 'Unable to send email.');
    } finally {
      setSending(false);
    }
  };

  return <form className="demo-email-composer" onSubmit={submit}>
    <div className="demo-email-composer-head">
      <div>
        <p className="site-admin-eyebrow">{eyebrow}</p>
        <h3>{heading}</h3>
      </div>
      <button type="button" className="demo-email-close" onClick={onCancel} aria-label="Close email form"><X size={18}/></button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}

    <div className="demo-email-fields">
      <label className="wide">
        <span>To</span>
        <input value={request?.email || ''} readOnly />
      </label>
      <label className="wide">
        <span>Subject</span>
        <input required value={subject} onChange={event => setSubject(event.target.value)} maxLength="240" />
      </label>
      <label>
        <span>CC <small>optional</small></span>
        <input value={cc} onChange={event => setCc(event.target.value)} placeholder="name@example.com, another@example.com" autoCapitalize="none" autoCorrect="off" />
      </label>
      <label>
        <span>BCC <small>optional</small></span>
        <input value={bcc} onChange={event => setBcc(event.target.value)} placeholder="name@example.com" autoCapitalize="none" autoCorrect="off" />
      </label>
      <label className="wide">
        <span>Message</span>
        <textarea required rows="9" value={message} onChange={event => setMessage(event.target.value)} maxLength="12000" placeholder="Write your response…" />
      </label>
    </div>

    <div className="demo-email-composer-foot">
      <p>This sends through the mailbox configured in <strong>Settings → Email</strong>. The sent message is saved to {savedToLabel} automatically.</p>
      <div className="demo-email-actions">
        <button type="button" className="site-admin-btn secondary" onClick={onCancel} disabled={sending}>Cancel</button>
        <button type="submit" className="site-admin-btn" disabled={sending}><Send size={15}/>{sending ? 'Sending…' : 'Send Email'}</button>
      </div>
    </div>
  </form>;
}
