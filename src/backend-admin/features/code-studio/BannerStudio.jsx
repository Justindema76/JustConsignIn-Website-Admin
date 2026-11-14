import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, ImageIcon, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { createBanner, deleteBanner, duplicateBanner, listBanners, placeBanners } from './codeStudioService';
import '../work-posts/workPosts.css';
import './bannerStudio.css';

const when = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const placementMap = banners => Object.fromEntries(banners.flatMap(banner => banner.placements.map(spot => [spot, banner.id])));

// Banner Studio list: every Code Studio banner for one website, plus where each one shows.
// `studio` is the site's settings, e.g. sites/sunwings/codeStudio.js.
export default function BannerStudio({ studio }) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [spots, setSpots] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const labels = useMemo(() => Object.fromEntries(studio.placements), [studio]);
  const savedSpots = useMemo(() => placementMap(banners), [banners]);
  const spotsChanged = studio.placements.some(([key]) => (spots[key] || '') !== (savedSpots[key] || ''));

  const show = list => { setBanners(list); setSpots(placementMap(list)); };

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    listBanners(accessToken, studio.site).then(show).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [accessToken, studio.site]);

  const run = async (key, task) => {
    setBusy(key); setError(''); setMessage('');
    try { await task(); } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const create = () => run('new', async () => {
    const banner = await createBanner(accessToken, studio.site);
    navigate(`${studio.basePath}/${banner.id}`);
  });

  const duplicate = banner => run(`dup-${banner.id}`, async () => {
    await duplicateBanner(accessToken, studio.site, banner.id);
    show(await listBanners(accessToken, studio.site));
    setMessage(`Copied “${banner.title}”.`);
  });

  const remove = banner => {
    const where = banner.placements.map(spot => labels[spot] || spot).join(', ');
    const warning = where ? `\n\nIt shows on: ${where}. Those pages go back to their normal banner.` : '';
    if (!window.confirm(`Delete “${banner.title}”? This can’t be undone.${warning}`)) return;
    run(`del-${banner.id}`, async () => {
      await deleteBanner(accessToken, studio.site, banner.id);
      show(banners.filter(item => item.id !== banner.id));
      setMessage('Banner deleted.');
    });
  };

  const saveSpots = () => run('spots', async () => {
    const wanted = Object.fromEntries(studio.placements.map(([key]) => [key, spots[key] || '']));
    show(await placeBanners(accessToken, studio.site, wanted));
    setMessage('Saved. The website updates within about a minute.');
  });

  return <div className="banner-studio">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">{studio.siteName}</p>
        <h1>Banner Studio</h1>
        <p>Design banners with Code Studio, then choose which pages show them.</p>
      </div>
      <button className="site-admin-btn" type="button" onClick={create} disabled={busy === 'new'}><Plus size={15}/> {busy === 'new' ? 'Creating…' : 'New banner'}</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <section className="site-admin-card bs-card">
      <div className="bs-card-head">
        <div><h2>Banners</h2><p>{loading ? 'Loading…' : `${banners.length} banner${banners.length === 1 ? '' : 's'}`}</p></div>
      </div>
      {!loading && !banners.length ? <p className="bs-empty">No banners yet. Click <b>New banner</b> to make one.</p> : null}
      <div className="bs-list">
        {banners.map(banner => (
          <article className="bs-item" key={banner.id}>
            <Link className="bs-thumb" to={`${studio.basePath}/${banner.id}`} aria-label={`Edit ${banner.title}`}>
              {banner.image ? <img src={banner.image} alt="" loading="lazy"/> : <ImageIcon size={22}/>}
            </Link>
            <div className="bs-info">
              <Link className="bs-title" to={`${studio.basePath}/${banner.id}`}>{banner.title}</Link>
              <div className="bs-meta">
                {banner.slideCount || 0} slide{banner.slideCount === 1 ? '' : 's'}{banner.updated_at ? ` · ${when(banner.updated_at)}` : ''}
                {!banner.saved ? <span className="bs-chip warn">Not saved yet</span> : null}
              </div>
              {banner.placements.length ? <div className="bs-chips">{banner.placements.map(spot => <span className="bs-chip" key={spot}>{labels[spot] || spot}</span>)}</div> : null}
            </div>
            <div className="bs-actions">
              <Link className="site-admin-btn small" to={`${studio.basePath}/${banner.id}`}><Pencil size={13}/> Edit</Link>
              <button className="site-admin-btn secondary small" type="button" onClick={() => duplicate(banner)} disabled={!!busy} aria-label={`Duplicate ${banner.title}`}><Copy size={13}/><span className="bs-hide-sm"> Duplicate</span></button>
              <button className="site-admin-btn secondary small" type="button" onClick={() => remove(banner)} disabled={!!busy} aria-label={`Delete ${banner.title}`}><Trash2 size={13}/></button>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="site-admin-card bs-card">
      <div className="bs-card-head">
        <div><h2>Where banners show</h2><p>Pick a banner for a page, or leave it on the normal {studio.siteName} banner.</p></div>
        <button className="site-admin-btn" type="button" onClick={saveSpots} disabled={!spotsChanged || busy === 'spots'}><Save size={15}/> {busy === 'spots' ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="bs-spots">
        {studio.placements.map(([key, label]) => (
          <label className="bs-spot" key={key}>
            <span>{label}</span>
            <select value={spots[key] || ''} onChange={event => { setSpots(current => ({ ...current, [key]: event.target.value })); setMessage(''); }}>
              <option value="">Normal banner</option>
              {banners.map(banner => (
                <option key={banner.id} value={banner.id} disabled={!banner.saved}>{banner.title}{banner.saved ? '' : ' (save it first)'}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {studio.help ? <p className="bs-help">{studio.help}</p> : null}
    </section>
  </div>;
}
