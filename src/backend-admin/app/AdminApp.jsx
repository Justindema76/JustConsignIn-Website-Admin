import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import AdminLogin from '../auth/AdminLogin';
import RequireAdmin from '../auth/RequireAdmin';
import AdminLayout from '../components/layout/AdminLayout';
import SiteOnly from '../components/routing/SiteOnly';
import BetaApplicationsAdmin from '../features/beta-applications/BetaApplicationsAdmin';
import BlogAdmin from '../features/blog/BlogAdmin';
import Dashboard from '../features/dashboard/Dashboard';
import DemoRequestsAdmin from '../features/demo-requests/DemoRequestsAdmin';
import ServiceRequestsAdmin from '../features/service-requests/ServiceRequestsAdmin';
import HiringContactsAdmin from '../features/hiring-contacts/HiringContactsAdmin';
import DepartmentsAdmin from '../features/departments/DepartmentsAdmin';
import MediaAdmin from '../features/media/MediaAdmin';
import OutreachMap from '../features/outreach/OutreachMap';
import SocialImageStudio from '../features/media/SocialImageStudio';
import SettingsAdmin from '../features/settings/SettingsAdmin';
import SiteBuilder from '../features/site-builder/SiteBuilder';
import WebsitePages from '../features/site-builder/WebsitePages';
import BlockLibrary from '../features/site-builder/BlockLibrary';
import GlobalBuilder from '../features/site-builder/GlobalBuilder';
import GlobalStylesAdmin from '../features/site-builder/GlobalStylesAdmin';
import SocialAdmin from '../features/social-links/SocialAdmin';
import SocialAutomation from '../features/social-automation/SocialAutomation';
import VideosAdmin from '../features/videos/VideosAdmin';
import WorkPostsAdmin from '../features/work-posts/WorkPostsAdmin';
import AiPostsAdmin from '../features/ai-posts/AiPostsAdmin';
import ServicePostsAdmin from '../sites/sunwings/ServicePostsAdmin';
import LocationPostsAdmin from '../sites/sunwings/LocationPostsAdmin';
import QuoteRequestsAdmin from '../sites/sunwings/QuoteRequestsAdmin';
import SunwingsSettingsAdmin from '../sites/sunwings/SunwingsSettingsAdmin';
import { getAdminSiteKey } from '../services/siteAdminService';

const JUSTIN = ['justindematteis'];
const JCI = ['justconsignin'];
const STANDARD_SITES = ['justindematteis', 'justconsignin'];
const SUNWINGS = ['sunwings'];
const PAGE_BUILDER_SITES = ['justindematteis', 'justconsignin', 'sunwings'];

const only = (sites, element) => <SiteOnly sites={sites}>{element}</SiteOnly>;

function GlobalSectionRoute() {
  const { section } = useParams();
  const siteKey = getAdminSiteKey();
  const allowed = siteKey === 'justindematteis'
    ? ['header', 'footer', 'project-request']
    : ['header', 'footer'];

  if (!STANDARD_SITES.includes(siteKey) || !allowed.includes(section)) {
    return <Navigate to="/admin" replace />;
  }
  return <GlobalBuilder />;
}

export default function AdminApp() {
  return <Routes>
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route element={<RequireAdmin />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />

        <Route path="/admin/demo-requests" element={only(JCI, <DemoRequestsAdmin />)} />
        <Route path="/admin/beta-partners" element={only(JCI, <BetaApplicationsAdmin />)} />
        <Route path="/admin/outreach" element={only(JCI, <OutreachMap />)} />

        <Route path="/admin/service-requests" element={only(JUSTIN, <ServiceRequestsAdmin />)} />
        <Route path="/admin/hiring-contacts" element={only(JUSTIN, <HiringContactsAdmin />)} />
        <Route path="/admin/departments" element={only(JUSTIN, <DepartmentsAdmin />)} />

        <Route path="/admin/blog" element={only(STANDARD_SITES, <BlogAdmin />)} />
        <Route path="/admin/blog/:id" element={only(STANDARD_SITES, <BlogAdmin />)} />
        <Route path="/admin/work-posts" element={only(JUSTIN, <WorkPostsAdmin />)} />
        <Route path="/admin/work-posts/:id" element={only(JUSTIN, <WorkPostsAdmin />)} />
        <Route path="/admin/ai-posts" element={only(JUSTIN, <AiPostsAdmin />)} />
        <Route path="/admin/ai-posts/:id" element={only(JUSTIN, <AiPostsAdmin />)} />
        <Route path="/admin/videos" element={only(STANDARD_SITES, <VideosAdmin />)} />
        <Route path="/admin/videos/:id" element={only(STANDARD_SITES, <VideosAdmin />)} />
        <Route path="/admin/social" element={only(STANDARD_SITES, <SocialAdmin />)} />
        <Route path="/admin/media" element={only(STANDARD_SITES, <MediaAdmin />)} />
        <Route path="/admin/social-image" element={only(JCI, <SocialImageStudio />)} />
        <Route path="/admin/social-automation" element={only(STANDARD_SITES, <SocialAutomation />)} />
        <Route path="/admin/social-automation/:id" element={only(STANDARD_SITES, <SocialAutomation />)} />

        <Route path="/admin/site-builder" element={only(PAGE_BUILDER_SITES, <Navigate to="/admin/website/pages" replace />)} />
        <Route path="/admin/website/pages" element={only(PAGE_BUILDER_SITES, <WebsitePages />)} />
        <Route path="/admin/website/pages/:pageId" element={only(PAGE_BUILDER_SITES, <SiteBuilder />)} />
        <Route path="/admin/website/blocks" element={only(PAGE_BUILDER_SITES, <BlockLibrary />)} />
        <Route path="/admin/website/styles" element={only(STANDARD_SITES, <GlobalStylesAdmin />)} />
        <Route path="/admin/website/global/:section" element={<GlobalSectionRoute />} />
        <Route path="/admin/settings" element={only(STANDARD_SITES, <SettingsAdmin />)} />

        <Route path="/admin/sunwings/pages" element={only(SUNWINGS, <WebsitePages />)} />
        <Route path="/admin/sunwings/pages/:pageId" element={only(SUNWINGS, <SiteBuilder />)} />
        <Route path="/admin/sunwings/blocks" element={only(SUNWINGS, <BlockLibrary />)} />
        <Route path="/admin/sunwings/blog" element={only(SUNWINGS, <BlogAdmin />)} />
        <Route path="/admin/sunwings/blog/:id" element={only(SUNWINGS, <BlogAdmin />)} />
        <Route path="/admin/sunwings/services" element={only(SUNWINGS, <ServicePostsAdmin />)} />
        <Route path="/admin/sunwings/services/:id" element={only(SUNWINGS, <ServicePostsAdmin />)} />
        <Route path="/admin/sunwings/locations" element={only(SUNWINGS, <LocationPostsAdmin />)} />
        <Route path="/admin/sunwings/locations/:id" element={only(SUNWINGS, <LocationPostsAdmin />)} />
        <Route path="/admin/sunwings/quotes" element={only(SUNWINGS, <QuoteRequestsAdmin />)} />
        <Route path="/admin/sunwings/settings" element={only(SUNWINGS, <SunwingsSettingsAdmin />)} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>;
}
