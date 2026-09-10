import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLogin from '../auth/AdminLogin';
import RequireAdmin from '../auth/RequireAdmin';
import AdminLayout from '../components/layout/AdminLayout';
import BlogAdmin from '../features/blog/BlogAdmin';
import Dashboard from '../features/dashboard/Dashboard';
import DemoRequestsAdmin from '../features/demo-requests/DemoRequestsAdmin';
import MediaAdmin from '../features/media/MediaAdmin';
import SocialImageStudio from '../features/media/SocialImageStudio';
import SocialAdmin from '../features/social-links/SocialAdmin';
import SocialAutomation from '../features/social-automation/SocialAutomation';
import VideosAdmin from '../features/videos/VideosAdmin';

export default function AdminApp() {
  return <Routes>
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route element={<RequireAdmin />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/demo-requests" element={<DemoRequestsAdmin />} />
        <Route path="/admin/blog" element={<BlogAdmin />} />
        <Route path="/admin/blog/:id" element={<BlogAdmin />} />
        <Route path="/admin/videos" element={<VideosAdmin />} />
        <Route path="/admin/videos/:id" element={<VideosAdmin />} />
        <Route path="/admin/social" element={<SocialAdmin />} />
        <Route path="/admin/media" element={<MediaAdmin />} />
        <Route path="/admin/social-image" element={<SocialImageStudio />} />
        <Route path="/admin/social-automation" element={<SocialAutomation />} />
        <Route path="/admin/social-automation/:id" element={<SocialAutomation />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>;
}
