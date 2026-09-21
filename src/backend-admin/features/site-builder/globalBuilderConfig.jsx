import { Menu } from 'lucide-react';
import { imageField } from './siteBuilderConfig';

export const headerDefaults = {
  logo: 'https://www.justconsignin.com/images/brand/justconsigin-logo.png',
  brand: 'JustConsignIn',
  nav1Label: 'Features', nav1Url: '/features',
  nav2Label: 'How it works', nav2Url: '/how-it-works',
  nav3Label: 'Pricing', nav3Url: '/pricing',
  nav4Label: 'FAQ', nav4Url: '/faq',
  nav5Label: 'Blog', nav5Url: '/blog',
  nav6Label: 'Partner Program', nav6Url: '/partner-program',
  nav7Label: 'Contact', nav7Url: '/contact',
  buttonText: 'Shopify App Demo',
  buttonUrl: '/shopify-app',
  background: 'white',
};

export const justinHeaderDefaults = {
  logo: '',
  brand: 'JUST INNOVATE.',
  nav1Label: 'About', nav1Url: '/about',
  nav2Label: 'Work', nav2Url: '/work',
  nav3Label: 'AI + Development', nav3Url: '/ai-development',
  nav4Label: 'Skills', nav4Url: '/experience',
  nav5Label: 'Contact', nav5Url: '/contact',
  nav6Label: '', nav6Url: '',
  nav7Label: '', nav7Url: '',
  buttonText: '',
  buttonUrl: '',
  background: 'white',
};

export const footerDefaults = {
  logo: 'https://www.justconsignin.com/images/brand/justconsigin-logo.png',
  brand: 'JustConsignIn',
  tagline: 'Consignment management built for Shopify stores.',
  column1Title: 'Explore',
  link1Label: 'Features', link1Url: '/features',
  link2Label: 'How it works', link2Url: '/how-it-works',
  link3Label: 'Pricing', link3Url: '/pricing',
  link4Label: 'Partner Program', link4Url: '/partner-program',
  column2Title: 'Resources',
  link5Label: 'FAQ', link5Url: '/faq',
  link6Label: 'Blog', link6Url: '/blog',
  link7Label: 'Contact', link7Url: '/contact',
  link8Label: 'Shopify App Demo', link8Url: '/shopify-app',
  socialTitle: 'Follow JustConsignIn',
  socialText: 'Product updates, demos, and consignment tips.',
  copyright: 'JustConsignIn. All rights reserved.',
  privacyLabel: 'Privacy', privacyUrl: '/privacy',
  termsLabel: 'Terms', termsUrl: '/terms',
  background: 'dark',
};

export const justinFooterDefaults = {
  logo: '',
  brand: 'JUST INNOVATE.',
  tagline: 'Justin DeMatteis • Developer • Product Builder • AI-Assisted Problem Solver',
  column1Title: 'Explore',
  link1Label: 'Work', link1Url: '/work',
  link2Label: 'About', link2Url: '/about',
  link3Label: 'AI + Development', link3Url: '/ai-development',
  link4Label: 'Experience', link4Url: '/experience',
  column2Title: 'Connect',
  link5Label: 'Blog', link5Url: '/blog',
  link6Label: 'Contact', link6Url: '/contact',
  link7Label: '', link7Url: '',
  link8Label: '', link8Url: '',
  socialTitle: 'Connect',
  socialText: 'Development work, case studies and product updates.',
  copyright: 'Justin DeMatteis. All rights reserved.',
  privacyLabel: 'Privacy', privacyUrl: '/privacy',
  termsLabel: 'Terms', termsUrl: '/terms',
  background: 'dark',
};

const backgroundOptions = [
  { label: 'White', value: 'white' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function previewClick(event) { event.preventDefault(); }

export function globalConfigFor(type, siteKey = 'justconsignin') {
  const isJustin = siteKey === 'justindematteis';
  const activeHeaderDefaults = isJustin ? justinHeaderDefaults : headerDefaults;
  const activeFooterDefaults = isJustin ? justinFooterDefaults : footerDefaults;

  if (type === 'header') {
    return {
      categories: { global: { title: 'Global Header', components: ['HeaderBlock'] } },
      components: {
        HeaderBlock: {
          label: 'Website Header',
          fields: {
            logo: { ...imageField, label: 'Logo' },
            brand: { type: 'text', label: 'Brand name' },
            nav1Label: { type: 'text', label: 'Link 1 label' }, nav1Url: { type: 'text', label: 'Link 1 URL' },
            nav2Label: { type: 'text', label: 'Link 2 label' }, nav2Url: { type: 'text', label: 'Link 2 URL' },
            nav3Label: { type: 'text', label: 'Link 3 label' }, nav3Url: { type: 'text', label: 'Link 3 URL' },
            nav4Label: { type: 'text', label: 'Link 4 label' }, nav4Url: { type: 'text', label: 'Link 4 URL' },
            nav5Label: { type: 'text', label: 'Link 5 label' }, nav5Url: { type: 'text', label: 'Link 5 URL' },
            nav6Label: { type: 'text', label: 'Link 6 label' }, nav6Url: { type: 'text', label: 'Link 6 URL' },
            nav7Label: { type: 'text', label: 'Link 7 label' }, nav7Url: { type: 'text', label: 'Link 7 URL' },
            buttonText: { type: 'text', label: 'Button text' },
            buttonUrl: { type: 'text', label: 'Button URL' },
            background: { type: 'select', label: 'Background', options: backgroundOptions },
          },
          defaultProps: activeHeaderDefaults,
          render: raw => {
            const p = { ...activeHeaderDefaults, ...raw };
            const links = Array.from({ length: 7 }, (_, i) => [p[`nav${i + 1}Label`], p[`nav${i + 1}Url`]]).filter(([label]) => label);
            return <div className={`global-header-preview global-theme-${p.background || 'white'}`}>
              <a className="global-preview-brand" href="/" onClick={previewClick}>{p.logo ? <img src={p.logo} alt=""/> : null}<strong>{p.brand}</strong></a>
              <nav>{links.map(([label,url],i)=><a key={i} href={url || '#'} onClick={previewClick}>{label}</a>)}</nav>
              {p.buttonText && <a className="global-preview-button" href={p.buttonUrl || '#'} onClick={previewClick}>{p.buttonText}</a>}
              <span className="global-mobile-menu"><Menu size={24}/></span>
            </div>;
          },
        },
      },
    };
  }

  return {
    categories: { global: { title: 'Global Footer', components: ['FooterBlock'] } },
    components: {
      FooterBlock: {
        label: 'Website Footer',
        fields: {
          logo: { ...imageField, label: 'Logo' },
          brand: { type: 'text', label: 'Brand name' },
          tagline: { type: 'text', label: 'Tagline' },
          column1Title: { type: 'text', label: 'Column 1 title' },
          link1Label: { type: 'text', label: 'Link 1 label' }, link1Url: { type: 'text', label: 'Link 1 URL' },
          link2Label: { type: 'text', label: 'Link 2 label' }, link2Url: { type: 'text', label: 'Link 2 URL' },
          link3Label: { type: 'text', label: 'Link 3 label' }, link3Url: { type: 'text', label: 'Link 3 URL' },
          link4Label: { type: 'text', label: 'Link 4 label' }, link4Url: { type: 'text', label: 'Link 4 URL' },
          column2Title: { type: 'text', label: 'Column 2 title' },
          link5Label: { type: 'text', label: 'Link 5 label' }, link5Url: { type: 'text', label: 'Link 5 URL' },
          link6Label: { type: 'text', label: 'Link 6 label' }, link6Url: { type: 'text', label: 'Link 6 URL' },
          link7Label: { type: 'text', label: 'Link 7 label' }, link7Url: { type: 'text', label: 'Link 7 URL' },
          link8Label: { type: 'text', label: 'Link 8 label' }, link8Url: { type: 'text', label: 'Link 8 URL' },
          socialTitle: { type: 'text', label: 'Social heading' },
          socialText: { type: 'text', label: 'Social text' },
          copyright: { type: 'text', label: 'Copyright text' },
          privacyLabel: { type: 'text', label: 'Privacy label' }, privacyUrl: { type: 'text', label: 'Privacy URL' },
          termsLabel: { type: 'text', label: 'Terms label' }, termsUrl: { type: 'text', label: 'Terms URL' },
          background: { type: 'select', label: 'Background', options: backgroundOptions },
        },
        defaultProps: activeFooterDefaults,
        render: raw => {
          const p = { ...activeFooterDefaults, ...raw };
          const col1 = [1,2,3,4].map(i => [p[`link${i}Label`], p[`link${i}Url`]]).filter(([label]) => label);
          const col2 = [5,6,7,8].map(i => [p[`link${i}Label`], p[`link${i}Url`]]).filter(([label]) => label);
          return <footer className={`global-footer-preview global-theme-${p.background || 'light'}`}>
            <div className="global-footer-grid">
              <div><a className="global-preview-brand" href="/" onClick={previewClick}>{p.logo ? <img src={p.logo} alt=""/> : null}<strong>{p.brand}</strong></a><p>{p.tagline}</p></div>
              <div className="global-footer-links"><strong>{p.column1Title}</strong>{col1.map(([l,u],i)=><a href={u || '#'} onClick={previewClick} key={i}>{l}</a>)}</div>
              <div className="global-footer-links"><strong>{p.column2Title}</strong>{col2.map(([l,u],i)=><a href={u || '#'} onClick={previewClick} key={i}>{l}</a>)}</div>
              <div><strong>{p.socialTitle}</strong><p>{p.socialText}</p><div className="global-social-placeholder">Social icons use your Social Links settings</div></div>
            </div>
            <div className="global-footer-bottom"><span>© {new Date().getFullYear()} {p.copyright}</span><span><a href={p.privacyUrl} onClick={previewClick}>{p.privacyLabel}</a><a href={p.termsUrl} onClick={previewClick}>{p.termsLabel}</a></span></div>
          </footer>;
        },
      },
    },
  };
}

export function defaultGlobalData(type, siteKey = 'justconsignin') {
  const isJustin = siteKey === 'justindematteis';
  const defaults = type === 'header'
    ? (isJustin ? justinHeaderDefaults : headerDefaults)
    : (isJustin ? justinFooterDefaults : footerDefaults);
  return {
    content: [{ type: type === 'header' ? 'HeaderBlock' : 'FooterBlock', props: { id: `global-${type}`, ...defaults } }],
    root: { props: {} },
  };
}
