import { useEffect, useState } from 'react';
import { CheckCircle2, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { addCollaborator, loadCollaborators, removeCollaborator } from './sunwingsAdminService';

const SITE_KEY = 'sunwings';
const ROLE_COPY = {
  admin: 'Full access to this site, same as you.',
  editor: 'Content, social and leads only — no Pages, Global Styles, Header/Footer, Integrations or Settings.',
};

export default function TeamAdmin() {
  const { accessToken } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [role, setRole] = useState('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => {
    if (!accessToken) return;
    loadCollaborators(accessToken, SITE_KEY).then(setCollaborators).catch(err => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(refresh, [accessToken]);

  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await addCollaborator(accessToken, { siteKey: SITE_KEY, email, role, label });
      setEmail(''); setLabel('');
      setMessage('Team member added.');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async collaborator => {
    if (!confirm(`Remove ${collaborator.email}'s access to Sunwings?`)) return;
    setError(''); setMessage('');
    try {
      await removeCollaborator(accessToken, collaborator.id);
      setMessage('Removed.');
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Access</p>
        <h1>Team</h1>
        <p>Give someone else a login scoped to Sunwings only — your own login is never affected by anything here.</p>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="site-admin-card" style={{ padding: 18, marginBottom: 18 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Add someone</h2>
      <form className="site-admin-form" onSubmit={submit}>
        <label>Google email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@gmail.com"/></label>
        <label>Name <small>(optional, just a label for you)</small><input value={label} onChange={e => setLabel(e.target.value)}/></label>
        <label className="wide">
          Access level
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="editor">Editor — content, social and leads</option>
            <option value="admin">Admin — full access to this site</option>
          </select>
          <small>{ROLE_COPY[role]}</small>
        </label>
        <div className="wide">
          <button className="site-admin-btn" type="submit" disabled={busy}><UserPlus size={15}/> {busy ? 'Adding…' : 'Add to Sunwings'}</button>
        </div>
      </form>
    </div>

    <div className="site-admin-card">
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #dfe3e8' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Who has access</h2>
      </div>
      {loading
        ? <div className="site-admin-empty">Loading…</div>
        : !collaborators.length
          ? <div className="site-admin-empty">Only you have access right now.</div>
          : <div>
            {collaborators.map(c => <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px 40px', gap: 14, alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #eef0f2' }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13.5 }}>{c.label || c.email}</strong>
                <small style={{ display: 'block', color: '#6d7175', fontSize: 11.5 }}>{c.email}</small>
              </div>
              <span className={`site-admin-status ${c.role === 'admin' ? 'active' : 'draft'}`}>{c.role}</span>
              <button className="site-admin-text-button" type="button" onClick={() => remove(c)} aria-label={`Remove ${c.email}`}><Trash2 size={15}/></button>
            </div>)}
          </div>}
    </div>
  </>;
}
