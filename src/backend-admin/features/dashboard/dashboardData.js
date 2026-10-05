import { loadAdminBlogPosts } from '../blog/blogStore';
import { loadBetaApplications } from '../beta-applications/betaApplications.service';
import { loadDemoRequests } from '../demo-requests/demoRequests.service';
import { loadServiceRequests } from '../service-requests/serviceRequests.service';
import { loadAdminWorkPosts } from '../work-posts/workPostStore';
import { loadSunwingsQuotes } from '../../sites/sunwings/sunwingsAdminService';
import { loadLocationPosts, loadServicePosts } from '../../sites/sunwings/sunwingsPostStore';

const REQUEST_TYPE_LABEL = { quote: 'Full Quote', quick_quote: 'Quick Quote', contact: 'Contact' };

function timeAgo(value) {
  if (!value) return '—';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

async function loadSunwingsDashboard(accessToken) {
  const [services, locations, blog, quotes] = await Promise.all([
    loadServicePosts(accessToken),
    loadLocationPosts(accessToken),
    loadAdminBlogPosts(accessToken),
    loadSunwingsQuotes(accessToken),
  ]);
  const newQuotes = quotes.filter(item => item.status === 'new').length;

  return {
    metrics: [
      { label: 'Service Posts', value: services.length, note: `${services.filter(item => item.status === 'published').length} published, ${services.filter(item => item.status !== 'published').length} draft` },
      { label: 'Location Posts', value: locations.length, note: 'Hamilton & Niagara coverage' },
      { label: 'Moving Tips', value: blog.length, note: blog[0]?.updatedAt ? `Last updated ${timeAgo(blog[0].updatedAt)}` : 'No posts yet' },
    ],
    leads: {
      title: 'Leads',
      copy: 'Quote requests from the Sunwings website.',
      viewAllTo: '/admin/sunwings/quotes',
      attentionCount: newQuotes,
      items: quotes.slice(0, 5).map(item => ({
        id: item.id,
        title: item.name || 'Unknown',
        meta: item.move_from && item.move_to ? `${item.move_from} → ${item.move_to}` : (item.service || 'General enquiry'),
        chip: REQUEST_TYPE_LABEL[item.request_type] || 'Contact',
        time: timeAgo(item.created_at),
      })),
    },
  };
}

async function loadJustconsigninDashboard(accessToken) {
  const [blog, demoRequests, betaApplications] = await Promise.all([
    loadAdminBlogPosts(accessToken),
    loadDemoRequests(accessToken),
    loadBetaApplications(accessToken),
  ]);
  const newDemoRequests = demoRequests.filter(item => item.status === 'new').length;

  return {
    metrics: [
      { label: 'Blog Posts', value: blog.length, note: `${blog.filter(item => item.status === 'published').length} published, ${blog.filter(item => item.status !== 'published').length} draft` },
      { label: 'Demo Requests', value: newDemoRequests, note: newDemoRequests ? 'Needs a reply today' : 'All caught up' },
      { label: 'Beta Partners', value: betaApplications.length, note: `${betaApplications.filter(item => ['active', 'installed'].includes(item.status)).length} active` },
    ],
    leads: {
      title: 'Leads & Growth',
      copy: 'Demo requests submitted through the JustConsignIn website.',
      viewAllTo: '/admin/demo-requests',
      attentionCount: newDemoRequests,
      items: demoRequests.slice(0, 5).map(item => ({
        id: item.id,
        title: item.business_name || [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Unknown',
        meta: item.interest || 'Demo request',
        chip: item.status === 'new' ? 'New' : item.status,
        time: timeAgo(item.created_at),
      })),
    },
  };
}

async function loadJustindematteisDashboard(accessToken) {
  const [blog, workPosts, serviceRequests] = await Promise.all([
    loadAdminBlogPosts(accessToken),
    loadAdminWorkPosts(accessToken),
    loadServiceRequests(accessToken),
  ]);
  const newServiceRequests = serviceRequests.filter(item => item.status === 'new').length;

  return {
    metrics: [
      { label: 'Blog Posts', value: blog.length, note: `${blog.filter(item => item.status === 'published').length} published, ${blog.filter(item => item.status !== 'published').length} draft` },
      { label: 'Work Posts', value: workPosts.length, note: 'Case studies & experience' },
      { label: 'Service Requests', value: newServiceRequests, note: newServiceRequests ? 'Needs a reply today' : 'All caught up' },
    ],
    leads: {
      title: 'Project Requests',
      copy: 'Service requests submitted through the website.',
      viewAllTo: '/admin/service-requests',
      attentionCount: newServiceRequests,
      items: serviceRequests.slice(0, 5).map(item => ({
        id: item.id,
        title: item.company || item.name || 'Unknown',
        meta: item.requested_service || 'Service enquiry',
        chip: item.status === 'new' ? 'New' : item.status,
        time: timeAgo(item.created_at),
      })),
    },
  };
}

export async function loadDashboardData(siteKey, accessToken) {
  if (siteKey === 'sunwings') return loadSunwingsDashboard(accessToken);
  if (siteKey === 'justconsignin') return loadJustconsigninDashboard(accessToken);
  if (siteKey === 'justindematteis') return loadJustindematteisDashboard(accessToken);
  return { metrics: [], leads: null };
}
