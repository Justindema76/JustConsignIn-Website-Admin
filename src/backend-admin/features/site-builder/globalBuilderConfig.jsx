import { Menu } from 'lucide-react';
import { imageField } from './siteBuilderConfig';
import { SOCIAL_NETWORKS } from '../../config/siteContent';

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
  brand: 'Justin DeMatteis',
  brandFirst: 'Justin',
  brandSecond: 'DeMatteis',
  brandFirstColor: '#0B1F33',
  brandSecondColor: '#2F6BFF',
  nav1Label: 'Home', nav1Url: '/',
  nav2Label: 'Skills', nav2Url: '/skills',
  nav3Label: 'Work Experience', nav3Url: '/work',
  nav4Label: 'AI + Development', nav4Url: '/ai-development',
  nav5Label: 'Contact', nav5Url: '/contact',
  nav6Label: '', nav6Url: '',
  nav7Label: '', nav7Url: '',
  buttonText: '',
  buttonUrl: '',
  socialIconColor: '#415162',
  socialIconBackground: 'var(--site-surface,#fff)',
  socialIconBorder: 'var(--site-border,#DCE4EC)',
  socialIconHoverColor: '#ffffff',
  socialIconHoverBackground: 'var(--site-primary,#2F6BFF)',
  background: 'white',
}

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
  socialIconColor: '#ffffff',
  socialIconBackground: 'rgba(255,255,255,.04)',
  socialIconBorder: 'rgba(255,255,255,.18)',
  socialIconHoverColor: '#ffffff',
  socialIconHoverBackground: 'var(--site-primary,#2F6BFF)',
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
  link4Label: 'Work Experience', link4Url: '/work',
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
  socialIconColor: '#ffffff',
  socialIconBackground: 'rgba(255,255,255,.04)',
  socialIconBorder: 'rgba(255,255,255,.18)',
  socialIconHoverColor: '#ffffff',
  socialIconHoverBackground: 'var(--site-primary,#2F6BFF)',
  background: 'dark',
};

export const justinProjectRequestDefaults = {
  id: 'project-request',
  tabLabel: 'Start a Project',
  mobileLabel: 'Start a Project',
  eyebrow: 'Project request',
  title: 'Send a project request.',
  description: 'Share the problem, the systems involved, your timeline, and what you want the finished solution to do.',
  websiteLabel: 'Website',
  serviceLabel: 'Service needed',
  budgetLabel: 'Budget range',
  timelineLabel: 'Timeline',
  messageLabel: 'Project details',
  messagePlaceholder: 'What are you doing manually now? What systems are involved? What do you want the finished solution to do?',
  consentLabel: 'You can contact me about this request.',
  submitLabel: 'Send Service Request',
  submittingLabel: 'Sending request…',
  successTitle: 'Request received.',
  successMessage: 'I have your project details and will review the right next step.',
  nextStepTitle: 'What happens next?',
  nextStepText: 'Your request is saved, organized by service type, and sent to me for review.',
  privacyText: 'By submitting, you are asking Justin DeMatteis to contact you about this project request.',
  errorMessage: 'Unable to submit your request right now.',
  closeLabel: 'Close',
  primary: '#2F6BFF',
  primaryHover: '#2458D8',
  primaryDark: '#1748BE',
};

const backgroundOptions = [
  { label: 'White', value: 'white' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function previewClick(event) { event.preventDefault(); }

function CssColorField({ field, value, onChange }) {
  const raw = value || '';
  const pickerValue = /^#[0-9a-f]{6}$/i.test(raw) ? raw : '#000000';
  return <label className="global-css-color-field">
    <span>{field.label}</span>
    <div>
      <input type="color" value={pickerValue} onChange={event => onChange(event.target.value)} aria-label={field.label}/>
      <input type="text" value={raw} onChange={event => onChange(event.target.value)} placeholder="#000000 or any CSS colour"/>
    </div>
  </label>;
}

const cssColorField = label => ({
  type: 'custom',
  label,
  render: props => <CssColorField {...props}/>,
});

export function globalConfigFor(type, siteKey = 'justconsignin', socialLinks = {}) {
  const isJustin = siteKey === 'justindematteis';
  const activeHeaderDefaults = isJustin ? justinHeaderDefaults : headerDefaults;
  const activeFooterDefaults = isJustin ? justinFooterDefaults : footerDefaults;
  const socialOrder = ['linkedin','github','instagram','facebook','youtube','tiktok'];
  const activeSocial = socialOrder
    .map(key => SOCIAL_NETWORKS.find(network => network.key === key))
    .filter(Boolean)
    .filter(network => socialLinks?.[network.key]?.url && socialLinks?.[network.key]?.enabled !== false);

  if (type === 'project-request') {
    const defaults = justinProjectRequestDefaults;
    return {
      categories: { global: { title: 'Global Project Request Drawer', components: ['ProjectRequestBlock'] } },
      components: {
        ProjectRequestBlock: {
          label: 'Project Request Drawer',
          fields: {
            tabLabel: { type: 'text', label: 'Desktop tab label' },
            mobileLabel: { type: 'text', label: 'Mobile button label' },
            eyebrow: { type: 'text', label: 'Eyebrow' },
            title: { type: 'text', label: 'Drawer heading' },
            description: { type: 'textarea', label: 'Drawer description' },
            websiteLabel: { type: 'text', label: 'Website field label' },
            serviceLabel: { type: 'text', label: 'Service field label' },
            budgetLabel: { type: 'text', label: 'Budget field label' },
            timelineLabel: { type: 'text', label: 'Timeline field label' },
            messageLabel: { type: 'text', label: 'Project details field label' },
            messagePlaceholder: { type: 'textarea', label: 'Project details placeholder' },
            consentLabel: { type: 'text', label: 'Consent checkbox text' },
            nextStepTitle: { type: 'text', label: 'Next step heading' },
            nextStepText: { type: 'textarea', label: 'Next step text' },
            submitLabel: { type: 'text', label: 'Submit button text' },
            submittingLabel: { type: 'text', label: 'Submitting button text' },
            successTitle: { type: 'text', label: 'Success heading' },
            successMessage: { type: 'textarea', label: 'Success text' },
            privacyText: { type: 'textarea', label: 'Privacy / consent footer' },
            errorMessage: { type: 'text', label: 'Error message' },
            closeLabel: { type: 'text', label: 'Close button text' },
            primary: cssColorField('Primary colour'),
            primaryHover: cssColorField('Primary hover colour'),
            primaryDark: cssColorField('Primary dark colour'),
          },
          defaultProps: defaults,
          render: raw => {
            const p = { ...defaults, ...raw };
            return <div style={{
              '--drawer-primary': p.primary || '#2F6BFF',
              maxWidth:'760px',
              margin:'0 auto',
              border:'1px solid #dce4ec',
              borderRadius:'18px',
              overflow:'hidden',
              background:'#fff',
              boxShadow:'0 16px 40px rgba(18,40,60,.08)',
            }}>
              <div style={{padding:'24px 26px',borderBottom:'1px solid #e4e9ee'}}>
                <span style={{display:'inline-flex',padding:'7px 12px',borderRadius:'999px',background:'#eaf2ff',color:'var(--drawer-primary)',fontSize:'11px',fontWeight:900,letterSpacing:'.08em',textTransform:'uppercase'}}>{p.eyebrow}</span>
                <h2 style={{margin:'14px 0 8px',fontSize:'36px',lineHeight:1.05}}>{p.title}</h2>
                <p style={{margin:0,color:'#66727e',lineHeight:1.55}}>{p.description}</p>
              </div>
              <div style={{padding:'22px 26px',display:'grid',gap:'12px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div style={{height:'48px',border:'1px solid #d7dce1',borderRadius:'10px',background:'#f8fafc'}} />
                  <div style={{height:'48px',border:'1px solid #d7dce1',borderRadius:'10px',background:'#f8fafc'}} />
                </div>
                <div style={{height:'48px',border:'1px solid #d7dce1',borderRadius:'10px',background:'#f8fafc'}} />
                <div style={{height:'120px',border:'1px solid #d7dce1',borderRadius:'10px',background:'#f8fafc'}} />
                <div style={{padding:'13px 14px',border:'1px solid #dfe5ea',borderRadius:'10px',background:'#f7f9fb'}}>
                  <strong style={{display:'block',fontSize:'12px'}}>{p.nextStepTitle}</strong>
                  <span style={{display:'block',marginTop:'4px',color:'#6d7782',fontSize:'11px'}}>{p.nextStepText}</span>
                </div>
                <button type="button" style={{height:'48px',border:0,borderRadius:'10px',background:'var(--drawer-primary)',color:'#fff',fontWeight:900}}>{p.submitLabel}</button>
              </div>
            </div>;
          },
        },
      },
    };
  }

  if (type === 'header') {
    return {
      categories: { global: { title: 'Global Header', components: ['HeaderBlock'] } },
      components: {
        HeaderBlock: {
          label: 'Website Header',
          fields: {
            logo: { ...imageField, label: 'Logo' },
            ...(isJustin ? {
              brandFirst: { type: 'text', label: 'Brand first part' },
              brandFirstColor: { type: 'text', label: 'Brand first colour' },
              brandSecond: { type: 'text', label: 'Brand second part' },
              brandSecondColor: { type: 'text', label: 'Brand second colour' },
            } : {
              brand: { type: 'text', label: 'Brand name' },
            }),
            nav1Label: { type: 'text', label: 'Link 1 label' }, nav1Url: { type: 'text', label: 'Link 1 URL' },
            nav2Label: { type: 'text', label: 'Link 2 label' }, nav2Url: { type: 'text', label: 'Link 2 URL' },
            nav3Label: { type: 'text', label: 'Link 3 label' }, nav3Url: { type: 'text', label: 'Link 3 URL' },
            nav4Label: { type: 'text', label: 'Link 4 label' }, nav4Url: { type: 'text', label: 'Link 4 URL' },
            nav5Label: { type: 'text', label: 'Link 5 label' }, nav5Url: { type: 'text', label: 'Link 5 URL' },
            nav6Label: { type: 'text', label: 'Link 6 label' }, nav6Url: { type: 'text', label: 'Link 6 URL' },
            nav7Label: { type: 'text', label: 'Link 7 label' }, nav7Url: { type: 'text', label: 'Link 7 URL' },
            buttonText: { type: 'text', label: 'Button text' },
            buttonUrl: { type: 'text', label: 'Button URL' },
            ...(isJustin ? {
              socialIconColor: cssColorField('Social icon colour'),
              socialIconBackground: cssColorField('Social icon background'),
              socialIconBorder: cssColorField('Social icon border'),
              socialIconHoverColor: cssColorField('Social icon hover colour'),
              socialIconHoverBackground: cssColorField('Social icon hover background'),
            } : {}),
            background: { type: 'select', label: 'Background', options: backgroundOptions },
          },
          defaultProps: activeHeaderDefaults,
          render: raw => {
            const p = { ...activeHeaderDefaults, ...raw };
            const links = Array.from({ length: 7 }, (_, i) => [p[`nav${i + 1}Label`], p[`nav${i + 1}Url`]]).filter(([label]) => label);
            return <div className={`global-header-preview global-theme-${p.background || 'white'}`}>
              <a className="global-preview-brand" href="/" onClick={previewClick}>
                {p.logo ? <img src={p.logo} alt=""/> : null}
                {isJustin
                  ? <strong><span style={{color:p.brandFirstColor || '#0B1F33'}}>{p.brandFirst || 'Justin'}</span>{' '}<span style={{color:p.brandSecondColor || '#2F6BFF'}}>{p.brandSecond || 'DeMatteis'}</span></strong>
                  : <strong>{p.brand}</strong>}
              </a>
              <nav>{links.map(([label,url],i)=><a key={i} href={url || '#'} onClick={previewClick}>{label}{['/work','/ai-development'].includes(url) ? ' ▾' : ''}</a>)}</nav>
              {isJustin && activeSocial.length > 0 && <div className="global-social-preview" style={{
                '--preview-social-color':p.socialIconColor,
                '--preview-social-background':p.socialIconBackground,
                '--preview-social-border':p.socialIconBorder,
                '--preview-social-hover-color':p.socialIconHoverColor,
                '--preview-social-hover-background':p.socialIconHoverBackground,
              }}>{activeSocial.map(network => <a key={network.key} href={socialLinks[network.key].url} onClick={previewClick} aria-label={network.label}><img src={network.icon} alt=""/></a>)}</div>}
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
          ...(isJustin ? {
            socialIconColor: cssColorField('Social icon colour'),
            socialIconBackground: cssColorField('Social icon background'),
            socialIconBorder: cssColorField('Social icon border'),
            socialIconHoverColor: cssColorField('Social icon hover colour'),
            socialIconHoverBackground: cssColorField('Social icon hover background'),
          } : {}),
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
              <div><strong>{p.socialTitle}</strong><p>{p.socialText}</p>{isJustin
                ? (activeSocial.length > 0 ? <div className="global-social-preview" style={{
                    '--preview-social-color':p.socialIconColor,
                    '--preview-social-background':p.socialIconBackground,
                    '--preview-social-border':p.socialIconBorder,
                    '--preview-social-hover-color':p.socialIconHoverColor,
                    '--preview-social-hover-background':p.socialIconHoverBackground,
                  }}>{activeSocial.map(network => <a key={network.key} href={socialLinks[network.key].url} onClick={previewClick} aria-label={network.label}><img src={network.icon} alt=""/></a>)}</div> : <div className="global-social-placeholder">No enabled social links</div>)
                : <div className="global-social-placeholder">Social icons use your Social Links settings</div>}</div>
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
  if (type === 'project-request') {
    return {
      content: [{ type: 'ProjectRequestBlock', props: { id: 'project-request', ...justinProjectRequestDefaults } }],
      root: { props: {} },
    };
  }
  const defaults = type === 'header'
    ? (isJustin ? justinHeaderDefaults : headerDefaults)
    : (isJustin ? justinFooterDefaults : footerDefaults);
  return {
    content: [{ type: type === 'header' ? 'HeaderBlock' : 'FooterBlock', props: { id: `global-${type}`, ...defaults } }],
    root: { props: {} },
  };
}
