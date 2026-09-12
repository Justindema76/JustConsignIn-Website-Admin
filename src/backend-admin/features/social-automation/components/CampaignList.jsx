import { ExternalLink, WandSparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MediaPreview from '../../../components/media/MediaPreview';

export default function CampaignList({ campaigns, loading, busy, onDelete }) {
  const navigate = useNavigate();

  return <div className="site-admin-card social-campaign-list">
    <div className="social-list-head"><strong>Campaigns</strong><span>Instagram · Facebook · TikTok · YouTube</span></div>
    {loading && !campaigns.length ? <div className="site-admin-empty">Loading campaigns…</div> : campaigns.map(item => {
      const isActive = item.status === 'active' || (item.status === 'scheduled' && item.autoPublish);
      const statusLabel = isActive ? 'Active' : item.status;
      const statusClass = isActive ? 'published' : item.status;
      return <div className="social-campaign-row" key={item.id}>
        <div className="social-campaign-thumb"><MediaPreview url={item.mediaUrl} type={item.mediaType} controls={false} muted fallbackSize={22}/></div>
        <div className="social-campaign-copy">
          <strong>{item.title}</strong>
          <small>{item.platforms.join(' · ') || 'No networks'}{item.scheduledAt ? ` · ${new Date(item.scheduledAt).toLocaleString()}` : ''}</small>
          {item.lastError && <small className="error-copy">{item.lastError}</small>}
        </div>
        <span className={`site-admin-status ${statusClass}`}>{statusLabel}</span>
        <div className="site-admin-actions right">
          <button className="site-admin-btn secondary small" onClick={() => navigate(`/admin/social-automation/${item.id}`)}>Edit</button>
          {item.metricoolPosts?.[0]?.response?.plannerUrl && <a className="site-admin-btn secondary small" href={item.metricoolPosts[0].response.plannerUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a>}
          <button className="site-admin-btn danger small" onClick={() => onDelete(item)} disabled={busy}>Delete</button>
        </div>
      </div>;
    })}
    {!loading && !campaigns.length && <div className="site-admin-empty large"><WandSparkles size={30}/><h2>No campaigns yet</h2><p>Create the first campaign and choose media from the shared library.</p></div>}
  </div>;
}
