import { useEffect, useRef, useState } from 'react';
import { FileText, Mail, MessageSquare, Plus, RefreshCw, Send, Star, StickyNote, Trash2 } from 'lucide-react';
import { loadQuoteMessages, postQuoteMessage } from './sunwingsAdminService';
import { followUpDraft, reviewAsked } from './jobModel';
import './quoteThread.css';

// Everything said on a job, in order: emails to the customer, their replies, notes and quotes.
// Justin and Marius both write here, so nothing happens outside the system.

const money = n => '$' + Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Hide the quoted earlier email under a customer reply ("On ... wrote:" and below).
function replyText(body) {
  const lines = String(body || '').split('\n');
  const cut = lines.findIndex((line, i) => (/^On\s/i.test(line.trim()) && /wrote:\s*$/i.test(lines.slice(i, i + 3).join(' ').trim())) || /^>/.test(line));
  return (cut > 0 ? lines.slice(0, cut) : lines).join('\n').trim();
}

const LABEL = { review: 'Google review request', email_out: 'Email to customer', email_in: 'Customer replied', note: 'Note', quote: 'Quote sent', system: '' };

function Bubble({ item }) {
  const side = item.kind === 'email_in' ? 'left' : item.kind === 'system' ? 'center' : 'right';
  const who = (item.author || 'System').toLowerCase();
  if (item.kind === 'system') return <div className="qt-system"><span>{item.body}</span><small>{when(item.created_at)}</small></div>;
  return <div className={`qt-msg ${side} k-${item.kind} a-${who}`}>
    <div className="qt-meta"><b>{item.author}</b><span>{item.meta?.review ? LABEL.review : LABEL[item.kind]}</span><small>{when(item.created_at)}</small></div>
    {item.kind === 'quote' ? <div className="qt-quote">
      <div className="qt-quote-head"><FileText size={16}/><b>{money(item.amount)}</b><span>{item.meta?.pdf || 'Quote PDF'}</span></div>
      {(item.lines || []).map((line, i) => <div className="qt-quote-line" key={i}><span>{line.label}</span><span>{money(line.amount)}</span></div>)}
      {item.meta?.includes ? <p className="qt-quote-inc">{item.meta.includes}</p> : null}
    </div> : <>
      {item.subject && item.kind !== 'note' ? <p className="qt-subject">{item.subject}</p> : null}
      <p className="qt-body">{item.kind === 'email_in' ? replyText(item.body) : item.body}</p>
      {item.meta?.attachments?.length ? <p className="qt-att">📎 {item.meta.attachments.join(', ')}</p> : null}
    </>}
  </div>;
}

function QuoteForm({ service, onSend, busy }) {
  const [lines, setLines] = useState([{ label: service || 'Moving service', amount: '' }]);
  const [includes, setIncludes] = useState('');
  const [message, setMessage] = useState('');
  const [validDays, setValidDays] = useState('14');
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const set = (i, key, value) => setLines(rows => rows.map((row, j) => (j === i ? { ...row, [key]: value } : row)));
  return <div className="qt-quote-form">
    {lines.map((line, i) => <div className="qt-line-row" key={i}>
      <input value={line.label} onChange={e => set(i, 'label', e.target.value)} placeholder="What it’s for, e.g. 3 movers + truck, 4 hrs"/>
      <input className="amt" inputMode="decimal" value={line.amount} onChange={e => set(i, 'amount', e.target.value)} placeholder="$"/>
      {lines.length > 1 ? <button type="button" className="qt-icon" onClick={() => setLines(rows => rows.filter((_, j) => j !== i))} aria-label="Remove line"><Trash2 size={15}/></button> : null}
    </div>)}
    <button type="button" className="qt-link" onClick={() => setLines(rows => [...rows, { label: '', amount: '' }])}><Plus size={14}/> Add a line</button>
    <label>What’s included (one per line)<textarea rows="3" value={includes} onChange={e => setIncludes(e.target.value)} placeholder={'Blankets and wrapping\nDisassembly and reassembly'}/></label>
    <label>Message to the customer (optional)<textarea rows="3" value={message} onChange={e => setMessage(e.target.value)} placeholder="A short note above the quote. Leave blank for the standard one."/></label>
    <div className="qt-quote-foot">
      <label className="days">Good for<select value={validDays} onChange={e => setValidDays(e.target.value)}>{['7', '14', '30'].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      <b className="qt-total">Total {money(total)}</b>
    </div>
    <button type="button" className="site-admin-btn qt-send" disabled={busy || total <= 0} onClick={() => onSend({ action: 'quote', lines, includes, message, validDays })}><Send size={15}/> {busy ? 'Sending…' : `Send quote ${money(total)} with PDF`}</button>
  </div>;
}

export default function QuoteThread({ accessToken, request, isOwner, onUpdated }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(request.email ? 'email' : 'note');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const end = useRef(null);
  const isContact = request.request_type === 'contact';
  const done = request.status === 'complete';
  // The Google review email, ready to edit (same wording as the Jobs calendar).
  function reviewDraft() {
    return followUpDraft({ name: request.name, service: request.service, requested: request.preferred_date ? String(request.preferred_date).slice(0, 10) : '', stage: 'complete' });
  }
  function pick(next) {
    setMode(next);
    if (next === 'review') { const draft = reviewDraft(); setSubject(draft.subject); setText(draft.message); }
    else if (mode === 'review') { setSubject(''); setText(''); }
  }

  async function load(force = false) {
    setLoading(true); setError('');
    try {
      const data = await loadQuoteMessages(accessToken, request.id, force);
      setItems(data.messages || []);
      if (data.request) onUpdated?.(data.request);
      if (data.inbox?.error && isOwner) setError(`Couldn’t check for new replies: ${data.inbox.error}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [request.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [items.length]);

  async function send(body) {
    setBusy(true); setError('');
    try {
      const data = await postQuoteMessage(accessToken, { id: request.id, ...body });
      setItems(data.messages || []);
      if (data.request) onUpdated?.(data.request);
      setText(''); setSubject('');
      if (body.action === 'quote' || body.review) setMode('email');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="service-request-drawer-section qt">
    <div className="qt-head">
      <p className="site-admin-eyebrow"><MessageSquare size={14}/> Conversation</p>
      <button type="button" className="qt-icon" onClick={() => load(true)} disabled={loading} aria-label="Check for new replies"><RefreshCw size={15}/></button>
    </div>
    <p className="qt-hint">{isOwner ? 'Every email, reply, note and quote on this job. Marius sees this too.' : 'Message the customer and send your quote from here. Justin sees everything on this job.'}</p>

    <div className="qt-list">
      {loading && !items.length ? <p className="qt-empty">Loading…</p>
        : !items.length ? <p className="qt-empty">Nothing yet. Emails, replies, notes and quotes will show here.</p>
        : items.map(item => <Bubble key={item.id} item={item}/>)}
      <div ref={end}/>
    </div>

    {error ? <div className="site-admin-alert error">{error}</div> : null}

    <div className="qt-tabs" role="tablist">
      {request.email ? <button type="button" className={mode === 'email' ? 'on' : ''} onClick={() => pick('email')}><Mail size={15}/> Email customer</button> : null}
      <button type="button" className={mode === 'note' ? 'on' : ''} onClick={() => pick('note')}><StickyNote size={15}/> Note</button>
      {!isContact && request.email && !done ? <button type="button" className={mode === 'quote' ? 'on' : ''} onClick={() => pick('quote')}><FileText size={15}/> Send quote</button> : null}
      {done && request.email ? <button type="button" className={`qt-review-tab${mode === 'review' ? ' on' : ''}`} onClick={() => pick('review')}><Star size={15}/> Google review</button> : null}
    </div>

    {mode === 'quote' ? <QuoteForm service={request.service} busy={busy} onSend={send}/> : <div className="qt-compose">
      {mode === 'review' ? <p className="qt-review-note">{reviewAsked(request) ? `Review request already sent ${new Date(request.last_follow_up_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}. You can send it again.` : 'Not sent yet. Edit if you like, then send. The Google review link is in the message.'}</p> : null}
      {mode === 'email' || mode === 'review' ? <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={`Subject (default: Your ${request.service || 'Sunwings Transport'} request)`}/> : null}
      <textarea rows="4" value={text} onChange={e => setText(e.target.value)} placeholder={mode === 'email' ? `Write to ${request.name || 'the customer'}. Their reply comes back here.` : isOwner ? 'Note for you and Marius (the customer never sees it).' : 'Note for Justin (the customer never sees it). Phone call? Write what was said.'}/>
      <button type="button" className="site-admin-btn qt-send" disabled={busy || !text.trim()} onClick={() => send(mode === 'review' ? { action: 'email', review: true, subject, body: text } : { action: mode, subject, body: text })}>
        <Send size={15}/> {busy ? 'Sending…' : mode === 'review' ? `Send review request to ${request.email}` : mode === 'email' ? `Send to ${request.email}` : 'Save note'}
      </button>
    </div>}
  </section>;
}
