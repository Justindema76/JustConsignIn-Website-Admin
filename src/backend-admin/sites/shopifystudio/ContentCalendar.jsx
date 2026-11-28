import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminBlogPosts } from '../../features/blog/blogStore';
import { loadAdminVideos } from '../../services/siteAdminService';

// One schedule for Shopify Studio: blog articles, social posts and videos, past 30 days to next 90,
// plus everything still waiting for approval. Only this website's content (site_key "shopifystudio").
const DAY = 86400000;
const KIND = { blog: 'Blog', social: 'Social', video: 'Video' };

async function loadSocial(accessToken) {
  const response = await fetch('/api/admin/social-automation?site=shopifystudio', { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to load social posts');
  return payload.campaigns || [];
}

export default function ContentCalendar() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [kind, setKind] = useState('all');

  useEffect(() => {
    if (!accessToken) return;
    Promise.allSettled([loadAdminBlogPosts(accessToken), loadSocial(accessToken), loadAdminVideos(accessToken)]).then(([blogs, social, videos]) => {
      const list = [];
      (blogs.value || []).forEach(p => list.push({ kind: 'blog', id: p.id, title: p.title || 'Untitled article', when: p.status === 'published' ? p.publishedAt : '', status: p.status === 'published' ? (new Date(p.publishedAt) > new Date() ? 'scheduled' : 'published') : 'draft', ai: p.contentBlocks?.source === 'chatgpt', to: `/admin/blog/${p.id}` }));
      (social.value || []).forEach(c => list.push({ kind: 'social', id: c.id, title: c.title || 'Untitled post', when: c.scheduledAt || '', status: c.status || 'draft', ai: /^AI:|chatgpt/i.test(c.title || ''), to: `/admin/social-automation/${c.id}`, extra: (c.platforms || []).join(', ') }));
      (videos.value || []).forEach(v => list.push({ kind: 'video', id: v.id, title: v.title || 'Untitled video', when: v.publishAt || v.publish_at || '', status: v.status || 'draft', to: `/admin/videos/${v.id}` }));
      setItems(list);
      const failed = [blogs, social, videos].find(r => r.status === 'rejected');
      if (failed) setError(failed.reason?.message || 'Some content could not be loaded.');
    }).finally(() => setBusy(false));
  }, [accessToken]);

  const shown = items.filter(i => kind === 'all' || i.kind === kind);
  const now = Date.now();
  const dated = useMemo(() => shown.filter(i => i.when && new Date(i.when).getTime() > now - 30 * DAY && new Date(i.when).getTime() < now + 90 * DAY)
    .sort((a, b) => new Date(a.when) - new Date(b.when)), [shown]);
  const waiting = shown.filter(i => (i.kind !== 'video' && !i.when) || i.status === 'draft' || i.status === 'ready');
  const byDay = dated.reduce((acc, i) => { const key = new Date(i.when).toDateString(); (acc[key] ||= []).push(i); return acc; }, {});

  const row = i => <Link key={`${i.kind}-${i.id}`} to={i.to} className="site-admin-table-row" style={{ gridTemplateColumns: '80px 1fr 120px 90px', display: 'grid', textDecoration: 'none', color: 'inherit' }}>
    <span className={`site-admin-status ${i.status === 'published' || i.status === 'active' ? 'published' : 'draft'}`}>{KIND[i.kind]}</span>
    <div><strong>{i.title}</strong>{i.extra && <small>{i.extra}</small>}</div>
    <span>{i.status}{i.ai ? ' · AI draft' : ''}</span>
    <span>{i.when ? new Date(i.when).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span>
  </Link>;

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Planning</p><h1>Content Calendar</h1><p>Every Shopify Studio article, social post and video in one schedule. Drafts (including anything ChatGPT writes) wait at the bottom until you approve them.</p></div>
      <div className="site-admin-actions"><Link className="site-admin-btn secondary" to="/admin/blog/new">New Shopify Tip</Link><Link className="site-admin-btn" to="/admin/social-automation/new">New social post</Link></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-toolbar"><select value={kind} onChange={e => setKind(e.target.value)}><option value="all">Everything</option><option value="blog">Blog</option><option value="social">Social</option><option value="video">Video</option></select></div>
    <div className="site-admin-card site-admin-table" style={{ marginBottom: 18 }}>
      <div className="site-admin-table-head" style={{ gridTemplateColumns: '1fr' }}><span>Schedule · last 30 days and next 90</span></div>
      {busy ? <div className="site-admin-empty">Loading…</div> : Object.keys(byDay).length ? Object.entries(byDay).map(([day, list]) => <div key={day}>
        <div style={{ padding: '10px 16px', background: new Date(day).toDateString() === new Date().toDateString() ? '#eaf2fb' : '#fafbfc', fontWeight: 800, fontSize: 12, borderTop: '1px solid #edf0f2' }}><CalendarDays size={13} style={{ verticalAlign: -2 }} /> {new Date(day).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        {list.map(row)}
      </div>) : <div className="site-admin-empty">Nothing scheduled yet.</div>}
    </div>
    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head" style={{ gridTemplateColumns: '1fr' }}><span>Waiting for approval / not scheduled ({waiting.length})</span></div>
      {busy ? <div className="site-admin-empty">Loading…</div> : waiting.length ? waiting.map(row) : <div className="site-admin-empty">No drafts waiting.</div>}
    </div>
  </>;
}
