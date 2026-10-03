import { Navigate } from 'react-router-dom';
import { getAdminSiteKey } from '../../services/siteAdminService';

export default function SiteOnly({ sites, children }) {
  const siteKey = getAdminSiteKey();
  return sites.includes(siteKey) ? children : <Navigate to="/admin" replace />;
}
