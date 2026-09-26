import { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, Send, Trash2, X } from 'lucide-react';
import { deleteServiceRequestAttachment, sendServiceRequestEmail, serviceRequestAttachmentLimits, uploadServiceRequestAttachment } from '../serviceRequests.service';

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

function starterMessage(name) {
  return `Hi ${firstName(name)},\n\nThanks for reaching out about your project.\n\n`;
}

export default function ServiceRequestEmailComposer({ request, accessToken, onCancel, onSent }) {
  const [subject, setSubject] = useState('Your project request');
  const [message, setMessage] = useState(starterMessage(request?.name));
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setSubject('Your project request');
    setMessage(starterMessage(request?.name));
    setCc('');
    setBcc('');
    setAttachments([]);
    setUploading(false);
    setError('');
  }, [request?.id, request?.name]);

  const addAttachments = async event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !request?.id || !accessToken) return;

    const remaining = serviceRequestAttachmentLimits.maxCount - attachments.length;
    if (remaining <= 0) {
      setError(`You can attach up to ${serviceRequestAttachmentLimits.maxCount} files.`);
      return;
    }

    const selected = files.slice(0, remaining);
    const currentBytes = attachments.reduce((sum, item) => sum + Number(item.size || 0), 0);
    const selectedBytes = selected.reduce((sum, file) => sum + Number(file.size || 0), 0);
    if (currentBytes + selectedBytes > serviceRequestAttachmentLimits.maxTotalBytes) {
      setError('Attachments must be 20 MB or less in total.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of selected) {
        uploaded.push(await uploadServiceRequestAttachment(accessToken, request.id, file));
      }
      setAttachments(current => [...current, ...uploaded]);
    } catch (err) {
      setError(err?.message || 'Unable to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async attachment => {
    setError('');
    try {
      await deleteServiceRequestAttachment(accessToken, attachment);
      setAttachments(current => current.filter(item => item.path !== attachment.path));
    } catch (err) {
      setError(err?.message || 'Unable to remove attachment.');
    }
  };

  const cancel = async () => {
    const pending = [...attachments];
    setAttachments([]);
    onCancel?.();
    await Promise.allSettled(pending.map(item => deleteServiceRequestAttachment(accessToken, item)));
  };

  const submit = async event => {
    event.preventDefault();
    if (!request?.id || !accessToken) return;
    setSending(true);
    setError('');
    try {
      const payload = await sendServiceRequestEmail(accessToken, {
        requestId: request.id,
        subject,
        message,
        ccEmails: cc,
        bccEmails: bcc,
        attachments,
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
        <p className="site-admin-eyebrow">Email client</p>
        <h3>Send from Website Admin</h3>
      </div>
      <button type="button" className="demo-email-close" onClick={cancel} aria-label="Close email form"><X size={18}/></button>
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

      <div className="wide demo-email-attachments">
        <div className="demo-email-attachments-head">
          <div>
            <span>Attachments <small>optional</small></span>
            <small>PDF, Word, Excel, CSV, TXT, images or ZIP · 10 MB each · 20 MB total</small>
          </div>
          <button type="button" className="site-admin-btn secondary small" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending || attachments.length >= serviceRequestAttachmentLimits.maxCount}>
            <Paperclip size={14}/>{uploading ? 'Uploading…' : 'Add Attachment'}
          </button>
          <input
            ref={fileInputRef}
            className="demo-email-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.zip"
            onChange={addAttachments}
          />
        </div>
        {attachments.length > 0 && <div className="demo-email-attachment-list">
          {attachments.map(attachment => <div className="demo-email-attachment" key={attachment.path}>
            <FileText size={16}/>
            <span>
              <strong>{attachment.name}</strong>
              <small>{Math.max(1, Math.round(Number(attachment.size || 0) / 1024))} KB</small>
            </span>
            <button type="button" onClick={() => removeAttachment(attachment)} disabled={sending || uploading} aria-label={`Remove ${attachment.name}`}><Trash2 size={15}/></button>
          </div>)}
        </div>}
      </div>
    </div>

    <div className="demo-email-composer-foot">
      <p>This uses the mailbox configured in <strong>Settings → Email</strong>. The sent message is saved to this service request automatically.</p>
      <div className="demo-email-actions">
        <button type="button" className="site-admin-btn secondary" onClick={cancel} disabled={sending || uploading}>Cancel</button>
        <button type="submit" className="site-admin-btn" disabled={sending || uploading}><Send size={15}/>{sending ? 'Sending…' : 'Send Email'}</button>
      </div>
    </div>
  </form>;
}
