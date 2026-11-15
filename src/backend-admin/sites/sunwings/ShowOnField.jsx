import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsSettings, saveSunwingsSettings } from './sunwingsAdminService';

// "Show on": which part of the website a service or blog post appears on: both, the main
// site (Toronto & GTA) or the Hamilton & Niagara section. Saved right away in the
// `site_sections` setting ({ services: { slug: choice }, blog: { slug: choice } }); the site
// reads it in lib/siteSections.js, which has the same defaults as below.
const CHOICES = [['both', 'Both sites'], ['main', 'Toronto & GTA only'], ['hn', 'Hamilton & Niagara only']];
const HN_DEFAULT_SERVICES = ['furniture-delivery', 'commercial-transport'];
const fallback = (kind, slug) => (kind === 'services' ? (HN_DEFAULT_SERVICES.includes(slug) ? 'both' : 'main') : 'both');

function parse(raw) {
  let value = raw;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { value = null; } }
  return { services: value?.services && typeof value.services === 'object' ? value.services : {}, blog: value?.blog && typeof value.blog === 'object' ? value.blog : {} };
}

export default function ShowOnField({ kind, slug }) {
  const { accessToken } = useAuth();
  const [choice, setChoice] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (!accessToken || !slug) return;
    loadSunwingsSettings(accessToken)
      .then(settings => setChoice(parse(settings?.site_sections)[kind][slug] || fallback(kind, slug)))
      .catch(() => setChoice(fallback(kind, slug)));
  }, [accessToken, kind, slug]);

  const change = async next => {
    setChoice(next); setState('Saving…');
    try {
      // Re-read first so a change made in another tab is not overwritten.
      const sections = parse((await loadSunwingsSettings(accessToken))?.site_sections);
      sections[kind] = { ...sections[kind], [slug]: next };
      await saveSunwingsSettings(accessToken, { site_sections: JSON.stringify(sections) });
      setState('Saved. Live in about a minute.');
    } catch (err) {
      setState(err.message || 'Could not save.');
    }
  };

  return <label>Show on
    <select value={choice || fallback(kind, slug)} onChange={event => change(event.target.value)} disabled={!slug}>
      {CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <small>{!slug ? 'Set the URL slug first.' : state || 'Saves as soon as you change it.'}</small>
  </label>;
}
