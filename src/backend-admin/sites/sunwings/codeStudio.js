import { uploadSunwingsImage } from '../../services/siteAdminService';

// Banner Studio (Code Studio) settings for Sunwings. Another site switches it on with its own
// file like this one, a route in AdminApp.jsx and its key in api/admin/code-studio.js.
export default {
  site: 'sunwings',
  siteName: 'Sunwings Transport',
  basePath: '/admin/sunwings/banner-studio',
  languages: ['en'],
  // Spots on the website a banner can replace (key = what the website asks for).
  placements: [
    ['home', 'Homepage'],
    ['services', 'Services'],
    ['locations', 'Service Areas'],
    ['pricing', 'Pricing'],
    ['blog', 'Moving Tips'],
    ['contact', 'Contact'],
    ['privacy', 'Privacy Policy'],
  ],
  // Starting colours and fonts for new slides (Code Studio settings).
  settings: {
    eyebrow_bg: '#F7931E',
    button_bg: '#F7931E',
    dash_color: '#F7931E',
    fonts: 'Plus Jakarta Sans\nOswald\nInter\nArial\nGeorgia',
  },
  uploadImage: uploadSunwingsImage,
  help: 'Tip: set a button link to #quote to open the Sunwings quote form.',
};
