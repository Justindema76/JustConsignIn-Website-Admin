import { useCallback, useEffect, useState } from 'react';
import { Mail, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { createDepartment, deleteDepartment, loadDepartments, updateDepartment } from './departments.service';

export default function DepartmentsAdmin() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [draft, setDraft] = useState({ name: '', email: '', active: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setDepartments(await loadDepartments(accessToken));
    } catch (err) {
      setError(err?.message || 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  async function addDepartment(event) {
    event.preventDefault();
    setSaving('new');
    setError('');
    setSuccess('');
    try {
      const created = await createDepartment(accessToken, draft);
      setDepartments(rows => [...rows, created].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name)));
      setDraft({ name: '', email: '', active: true });
      setSuccess('Department added.');
    } catch (err) {
      setError(err?.message || 'Unable to add department.');
    } finally {
      setSaving('');
    }
  }

  async function saveDepartment(department) {
    setSaving(department.id);
    setError('');
    setSuccess('');
    try {
      const updated = await updateDepartment(accessToken, {
        id: department.id,
        name: department.name,
        email: department.email,
        active: department.active,
        sortOrder: department.sort_order || 0,
      });
      setDepartments(rows => rows.map(row => row.id === updated.id ? updated : row));
      setSuccess(`${updated.name} saved.`);
    } catch (err) {
      setError(err?.message || 'Unable to save department.');
    } finally {
      setSaving('');
    }
  }

  async function removeDepartment(department) {
    if (!window.confirm(`Delete ${department.name}? Existing requests keep their saved department name/email, but it will no longer be available for new assignments.`)) return;
    setSaving(department.id);
    setError('');
    try {
      await deleteDepartment(accessToken, department.id);
      setDepartments(rows => rows.filter(row => row.id !== department.id));
      setSuccess('Department deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete department.');
    } finally {
      setSaving('');
    }
  }

  function change(id, key, value) {
    setDepartments(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  }

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Routing</p>
        <h1>Departments</h1>
        <p>Departments are the only assignment target for now. Each department has one notification email. No employee accounts or individual assignment yet.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && <div className="site-admin-alert success">{success}</div>}

    <form className="site-admin-card department-create" onSubmit={addDepartment}>
      <div>
        <p className="site-admin-eyebrow">Add department</p>
        <h2>New routing destination</h2>
      </div>
      <label><span>Department name</span><input required value={draft.name} onChange={e => setDraft(v => ({...v,name:e.target.value}))} placeholder="Development" /></label>
      <label><span>Department email</span><input required type="email" value={draft.email} onChange={e => setDraft(v => ({...v,email:e.target.value}))} placeholder="development@company.com" /></label>
      <button className="site-admin-btn" type="submit" disabled={saving === 'new'}><Plus size={15}/>{saving === 'new' ? 'Adding…' : 'Add Department'}</button>
    </form>

    <div className="department-list">
      {loading ? <div className="site-admin-card site-admin-empty">Loading departments…</div> : departments.map(department => <article className="site-admin-card department-row" key={department.id}>
        <div className="department-icon"><Mail size={18}/></div>
        <label className="department-name"><span>Name</span><input value={department.name} onChange={e => change(department.id,'name',e.target.value)} /></label>
        <label className="department-email"><span>Email</span><input type="email" value={department.email} onChange={e => change(department.id,'email',e.target.value)} /></label>
        <label className="department-active"><span>Active</span><input type="checkbox" checked={department.active !== false} onChange={e => change(department.id,'active',e.target.checked)} /></label>
        <button className="site-admin-btn secondary small" type="button" onClick={() => saveDepartment(department)} disabled={saving === department.id}><Save size={14}/>{saving === department.id ? 'Saving…' : 'Save'}</button>
        <button className="department-delete" type="button" onClick={() => removeDepartment(department)} disabled={saving === department.id} aria-label={`Delete ${department.name}`}><Trash2 size={16}/></button>
      </article>)}
    </div>
  </>;
}
