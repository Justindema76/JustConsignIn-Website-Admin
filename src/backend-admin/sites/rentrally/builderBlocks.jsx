// Rent & Rally blocks for the shared page builder (Website › Pages).
// The preview renders the real website markup (rrBlocks.jsx) with the website's CSS,
// scoped under .rr-live (rentrallyLivePreview.css). Both files are generated from the
// rent-and-rally repo: `npm run sync-admin` in web/.
import { useEffect, useState } from 'react';
import { imageField } from '../../features/site-builder/siteBuilderConfig';
import { DEFAULT_PAGES, ICON_OPTIONS, RRBlock } from './rrBlocks';
import { RENTRALLY_SITE_URL, categoriesApi, packagesApi, productsApi } from './rentrallyAdminService';
import './rentrallyLivePreview.css';

// ---- catalogue for previews (published items only, same as the website) ----
let cataloguePromise = null;
function loadCatalogue() {
  cataloguePromise ||= Promise.all([categoriesApi.list(), productsApi.list(), packagesApi.list()])
    .then(([cats, prods, pkgs]) => {
      const published = rows => rows.filter(r => r.status === 'published');
      const products = Object.fromEntries(published(prods).map(p => [p.slug, {
        slug: p.slug, name: p.name, sku: p.sku, images: p.images || [], price: Number(p.day_rate) || 0, badge: p.badge, featured: p.featured,
      }]));
      return {
        categories: published(cats).map(c => ({ slug: c.slug, name: c.name, image: c.image })),
        products,
        packages: published(pkgs).map(pk => ({
          slug: pk.slug, name: pk.name, tag: pk.tag, image: pk.hero_image, price: Number(pk.day_rate) || 0,
          items: (pk.items || []).filter(i => products[i.product]),
        })).filter(pk => pk.items.length),
      };
    })
    .catch(() => { cataloguePromise = null; return { categories: [], products: {}, packages: [] }; });
  return cataloguePromise;
}

// Links in the preview shouldn't navigate the editor away.
const PreviewLink = ({ href, children, ...rest }) => <a href={href} onClick={e => e.preventDefault()} {...rest}>{children}</a>;

// The website's own photos (/img/…) live on the website, not the admin.
const siteAsset = value => (typeof value === 'string' && value.startsWith('/img/') ? `${RENTRALLY_SITE_URL}${value}` : value);

function Preview({ type, props }) {
  const [catalogue, setCatalogue] = useState({ categories: [], products: {}, packages: [] });
  useEffect(() => { let on = true; loadCatalogue().then(c => on && setCatalogue(c)); return () => { on = false; }; }, []);
  const shown = Object.fromEntries(Object.entries(props).map(([key, value]) => [key, Array.isArray(value) ? value.map(v => (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, siteAsset(x)])) : v)) : siteAsset(value)]));
  return <div className="rr-live" data-block-type={type}><RRBlock type={type} props={shown} ctx={{ ...catalogue, Link: PreviewLink }}/></div>;
}

// ---- field helpers ----
const t = label => ({ type: 'text', label });
const ta = label => ({ type: 'textarea', label });
const img = label => ({ ...imageField, label });
const yesNo = label => ({ type: 'radio', label, options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] });
const bg = { type: 'select', label: 'Section background', options: [{ label: 'White', value: 'white' }, { label: 'Light grey', value: 'soft' }] };
const tight = yesNo('Remove space above');

const defaultsFrom = (pageId, blockId) => {
  const found = DEFAULT_PAGES[pageId]?.content.find(b => b.props.id === blockId);
  if (!found) return {};
  const { id, ...props } = found.props; // eslint-disable-line no-unused-vars
  return props;
};

const numbered = (count, make) => Object.assign({}, ...Array.from({ length: count }, (_, i) => make(i + 1)));

const defs = {
  RRHeroBlock: {
    label: 'Hero (big photo banner)',
    fields: {
      title: t('Headline (white)'), highlight: t('Headline (red second line)'),
      headingLevel: { type: 'select', label: 'Heading level', options: [{ label: 'H1 (main page heading)', value: 'h1' }, { label: 'H2', value: 'h2' }] },
      text: ta('Intro paragraph'),
      button1Text: t('Red button text'), button1Url: t('Red button link'),
      button2Text: t('Outline button text'), button2Url: t('Outline button link'),
      image: img('Photo'), imageAlt: t('Photo description (for Google & screen readers)'),
      badgeTitle: t('Red badge title'), badgeText: t('Red badge text'), badgeUrl: t('Red badge link'),
    },
    defaultProps: defaultsFrom('home', 'rr-home-hero'),
  },
  RRHeroSliderBlock: {
    label: 'Hero slider (rotating banners)',
    fields: {
      headingLevel: { type: 'select', label: 'First slide heading level', options: [{ label: 'H1 (main page heading)', value: 'h1' }, { label: 'H2', value: 'h2' }] },
      slides: {
        type: 'array',
        label: 'Slides (they rotate every 7 seconds)',
        getItemSummary: (item, i) => `${(i ?? 0) + 1}. ${[item?.title, item?.highlight].filter(Boolean).join(' ') || 'New slide'}`,
        defaultItemProps: { eyebrow: '', title: 'New slide', highlight: '', text: '', button1Text: 'See it', button1Url: '', button2Text: 'Browse All Rentals', button2Url: '/rentals', rental: '', badgeTitle: '', image: '', imageAlt: '' },
        arrayFields: {
          rental: t('Rental or package web address (e.g. gorilla or grand-opening). The red badge shows its current price.'),
          eyebrow: t('Small red label (e.g. Giant inflatables)'),
          title: t('Headline (white)'), highlight: t('Headline (red second line)'),
          text: ta('Text'),
          button1Text: t('Red button text'), button1Url: t('Red button link (blank = the rental or package)'),
          button2Text: t('Outline button text'), button2Url: t('Outline button link'),
          badgeTitle: t('Red badge title (blank = the rental name)'),
          image: img('Photo (blank = the rental or package photo)'), imageAlt: t('Photo description (for Google & screen readers)'),
        },
      },
    },
    defaultProps: defaultsFrom('home', 'rr-home-slider'),
  },
  RRPageHeaderBlock: {
    label: 'Page title + intro',
    fields: { heading: t('Page title (H1)'), text: ta('Intro'), breadcrumb: t('Breadcrumb label (optional)'), showBreadcrumbs: yesNo('Show breadcrumbs') },
    defaultProps: { heading: 'Page title', text: '', breadcrumb: '', showBreadcrumbs: true },
  },
  RRUspBlock: {
    label: 'Selling points strip (4 icons)',
    fields: numbered(4, n => ({
      [`item${n}Icon`]: { type: 'select', label: `Point ${n} icon`, options: ICON_OPTIONS },
      [`item${n}Title`]: t(`Point ${n} title`),
      [`item${n}Text`]: t(`Point ${n} text`),
    })),
    defaultProps: defaultsFrom('home', 'rr-home-usp'),
  },
  RRCategoriesBlock: {
    label: 'Category tiles (automatic)',
    fields: { heading: t('Heading'), linkText: t('Link text'), linkUrl: t('Link URL'), background: bg },
    defaultProps: defaultsFrom('home', 'rr-home-cats'),
  },
  RRPackagesBlock: {
    label: 'Rental packages (automatic)',
    fields: {
      heading: t('Heading'), linkText: t('Link text'), linkUrl: t('Link URL'),
      limit: { type: 'select', label: 'How many', options: [{ label: '3', value: '3' }, { label: '6', value: '6' }, { label: 'All', value: '0' }] },
      tight, background: bg,
    },
    defaultProps: defaultsFrom('home', 'rr-home-pkgs'),
  },
  RRPopularBlock: {
    label: 'Rentals grid (automatic)',
    fields: {
      heading: t('Heading'), linkText: t('Link text'), linkUrl: t('Link URL'),
      source: { type: 'select', label: 'Which rentals', options: [{ label: '“Popular” ticked in Rentals', value: 'featured' }, { label: 'All rentals', value: 'all' }] },
      limit: { type: 'select', label: 'How many', options: ['5', '10', '15', '20'].map(v => ({ label: v, value: v })) },
      tight, background: bg,
    },
    defaultProps: defaultsFrom('home', 'rr-home-popular'),
  },
  RRStepsBlock: {
    label: 'Numbered steps (4)',
    fields: { heading: t('Heading'), ...numbered(4, n => ({ [`step${n}Title`]: t(`Step ${n} title`), [`step${n}Text`]: ta(`Step ${n} text`) })), background: bg },
    defaultProps: defaultsFrom('home', 'rr-home-steps'),
  },
  RRRentBuyBlock: {
    label: 'Two columns (Rent or Buy)',
    fields: {
      heading: t('Heading'),
      leftTitle: t('Left title'), leftText: ta('Left text'), leftList: ta('Left bullet points (one per line)'),
      rightTitle: t('Right title'), rightText: ta('Right text'), rightList: ta('Right bullet points (one per line)'),
      background: bg,
    },
    defaultProps: defaultsFrom('home', 'rr-home-rentbuy'),
  },
  RRFaqBlock: {
    label: 'FAQ (shows in Google as FAQ)',
    fields: { heading: t('Heading'), anchor: t('Anchor (for links like /how-it-works#faq)'), ...numbered(8, n => ({ [`question${n}`]: t(`Question ${n}`), [`answer${n}`]: ta(`Answer ${n}`) })), background: bg },
    defaultProps: defaultsFrom('how-it-works', 'rr-how-faq'),
  },
  RRTextBlock: {
    label: 'Text section',
    fields: {
      heading: t('Heading'), text: ta('Text (blank line = new paragraph)'),
      buttonText: t('Button text (optional)'), buttonUrl: t('Button link'),
      width: { type: 'select', label: 'Width', options: [{ label: 'Narrow (easy reading)', value: 'narrow' }, { label: 'Full width', value: 'wide' }] },
      anchor: t('Anchor (optional)'), background: bg,
    },
    defaultProps: { heading: 'Section heading', text: 'Write your text here.', buttonText: '', buttonUrl: '/quote', width: 'narrow', anchor: '', background: 'white' },
  },
  RRImageTextBlock: {
    label: 'Photo + text',
    fields: {
      image: img('Photo'), imageAlt: t('Photo description'),
      imagePosition: { type: 'select', label: 'Photo side', options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }] },
      heading: t('Heading'), text: ta('Text (blank line = new paragraph)'), list: ta('Bullet points (optional, one per line)'),
      buttonText: t('Button text (optional)'), buttonUrl: t('Button link'), background: bg,
    },
    defaultProps: { image: '/img/tent20-1.jpg', imageAlt: '', imagePosition: 'left', heading: 'Section heading', text: 'Write your text here.', list: '', buttonText: 'Request a Quote', buttonUrl: '/quote', background: 'white' },
  },
  RRCtaBlock: {
    label: 'Call to action (black band)',
    fields: { heading: t('Heading'), text: ta('Text'), buttonText: t('Red button text'), buttonUrl: t('Red button link'), button2Text: t('Outline button text'), button2Url: t('Outline button link'), tight },
    defaultProps: defaultsFrom('how-it-works', 'rr-how-cta'),
  },
};

export const RENTRALLY_BLOCK_NAMES = Object.keys(defs);

export const rentrallyBuilderComponents = Object.fromEntries(Object.entries(defs).map(([type, def]) => [type, {
  ...def,
  render: ({ puck, editMode, id, ...props }) => <Preview type={type} props={props}/>, // eslint-disable-line no-unused-vars
}]));

export const rentrallyBuilderCategories = {
  rentrallyPage: { title: 'RENT & RALLY — Page sections', components: ['RRHeroSliderBlock', 'RRHeroBlock', 'RRPageHeaderBlock', 'RRUspBlock', 'RRStepsBlock', 'RRRentBuyBlock', 'RRFaqBlock', 'RRCtaBlock'] },
  rentrallyCatalogue: { title: 'RENT & RALLY — Automatic catalogue', components: ['RRCategoriesBlock', 'RRPackagesBlock', 'RRPopularBlock'] },
  rentrallyContent: { title: 'RENT & RALLY — Text & photos', components: ['RRTextBlock', 'RRImageTextBlock'] },
};
