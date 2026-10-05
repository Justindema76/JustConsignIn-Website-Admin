import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Handshake,
  Image,
  Inbox,
  LibraryBig,
  Link2,
  MapPinned,
  PanelBottom,
  PanelTop,
  Palette,
  PanelsTopLeft,
  Plug,
  Settings,
  Sparkles,
  Truck,
  Video,
} from 'lucide-react';

const ICONS = {
  book: BookOpen,
  briefcase: BriefcaseBusiness,
  building: Building2,
  handshake: Handshake,
  image: Image,
  inbox: Inbox,
  library: LibraryBig,
  link: Link2,
  map: MapPinned,
  panelBottom: PanelBottom,
  panelTop: PanelTop,
  palette: Palette,
  panels: PanelsTopLeft,
  plug: Plug,
  settings: Settings,
  sparkles: Sparkles,
  truck: Truck,
  video: Video,
};

export function getSiteIcon(key) {
  return ICONS[key] || PanelsTopLeft;
}
