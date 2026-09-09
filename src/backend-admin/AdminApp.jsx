import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import Dashboard from './Dashboard';
import BlogAdmin from './BlogAdmin';
import VideosAdmin from './VideosAdmin';
import SocialAdmin from './SocialAdmin';
import MediaAdmin from './MediaAdmin';
import SocialAutomation from './SocialAutomation';
import AdminLayout from './components/AdminLayout';
import RequireAdmin from './components/RequireAdmin';

export default function AdminApp() {
  return <Routes>
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route element={<RequireAdmin />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/blog" element={<BlogAdmin />} />
        <Route path="/admin/blog/:id" element={<BlogAdmin />} />
        <Route path="/admin/videos" element={<VideosAdmin />} />
        <Route path="/admin/videos/:id" element={<VideosAdmin />} />
        <Route path="/admin/social" element={<SocialAdmin />} />
        <Route path="/admin/media" element={<MediaAdmin />} />
        <Route path="/admin/social-automation" element={<SocialAutomation />} />
        <Route path="/admin/social-automation/:id" element={<SocialAutomation />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>;
}
