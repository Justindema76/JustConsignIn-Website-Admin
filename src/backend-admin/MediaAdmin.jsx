import { Image } from 'lucide-react';

export default function MediaAdmin() {
  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Assets</p><h1>Media</h1><p>Blog uploads already use the shared blog image storage. This section is intentionally left simple so it can grow with the site later.</p></div>
    </div>
    <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>Media library foundation</h2><p>Uploaded blog images will be reusable here when you decide how you want the media library organized.</p></div>
  </>;
}
