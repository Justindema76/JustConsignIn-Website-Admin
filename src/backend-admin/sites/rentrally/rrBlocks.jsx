// Rent & Rally page-builder blocks.
//
// This exact file is used in two places:
//   - the website (web/components/rrBlocks.jsx) to render published pages, and
//   - the admin (src/backend-admin/sites/rentrally/rrBlocks.jsx) for the live editor preview.
// Keep the two copies identical: edit it here, then run `npm run sync-blocks` in web/.
//
// No framework imports on purpose: links use ctx.Link (next/link on the site, <a> in the admin).

export const money = n => 'CAD$ ' + Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money0 = n => '$' + Number(n || 0).toLocaleString('en-CA', { maximumFractionDigits: 2 });

export const rentalHref = slug => `/rental/${slug}`;
export const packageHref = slug => `/packages/${slug}`;
export const categoryHref = slug => (slug && slug !== 'all' ? `/rentals/${slug}` : '/rentals');

const lines = value => String(value || '').split('\n').map(s => s.trim()).filter(Boolean);
const paragraphs = value => String(value || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
// An old launch photo like /img/gorilla-1.jpg shows that rental's current first photo instead,
// once a new photo has been set on the rental in the admin.
const isLaunchPhoto = url => /(^|vercel\.app)\/img\//.test(url || '');
export const livePhoto = (url, ctx) => {
  const m = /\/img\/([a-z0-9-]+?)-\d+\.(jpg|png|webp)$/i.exec(url || '');
  const now = m && ctx?.products?.[m[1]]?.images?.[0];
  return now && !isLaunchPhoto(now) ? now : url;
};

const A = ({ ctx, href, children, ...rest }) => {
  const L = ctx?.Link || 'a';
  if (!href) return null;
  if (/^(https?:|tel:|mailto:|#)/i.test(href)) return <a href={href} {...rest}>{children}</a>;
  return <L href={href} {...rest}>{children}</L>;
};
const Heading = ({ level = 'h2', className, children }) => {
  const Tag = ['h1', 'h2', 'h3'].includes(level) ? level : 'h2';
  return <Tag className={className}>{children}</Tag>;
};

export const ICONS = {
  truck: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6h13v10H1zM14 10h4l3 3v3h-7"/><circle cx="5.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/></svg>,
  wrench: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z"/></svg>,
  tag: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12 12 20 3 11V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>,
  cal: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  star: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>,
  shield: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>,
  phone: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>,
};

export const ICON_OPTIONS = [
  { label: 'Truck', value: 'truck' }, { label: 'Calendar', value: 'cal' }, { label: 'Wrench', value: 'wrench' },
  { label: 'Price tag', value: 'tag' }, { label: 'Star', value: 'star' }, { label: 'Shield', value: 'shield' }, { label: 'Phone', value: 'phone' },
];

// ---------- cards (also used by the catalogue pages) ----------

export function ProductCard({ p, ctx }) {
  return (
    <A ctx={ctx} className="card" href={rentalHref(p.slug)}>
      <div className="im"><img src={p.images[0] || ''} alt={p.name} loading="lazy"/>{p.badge ? <span className="badge">{p.badge}</span> : null}</div>
      <div className="bd">
        <div className="sku">SKU {p.sku}</div>
        <div className="nm">{p.name}</div>
        <div className="from">{p.price > 0 || !(p.buy > 0) ? 'Rent from' : 'Buy & keep'}</div>
        <div className="pr"><b>{p.price > 0 || !(p.buy > 0) ? <>{money(p.price)} <small>/day</small></> : <>{money(p.buy)} <small>each</small></>}</b><span className="arrow">→</span></div>
      </div>
    </A>
  );
}

export function PackageCard({ pk, ctx }) {
  const products = ctx.products || {};
  const list = pk.items.reduce((s, i) => s + (products[i.product]?.price || 0) * i.qty, 0);
  return (
    <A ctx={ctx} className="pkg" href={packageHref(pk.slug)}>
      <div className="im"><img src={pk.image} alt={pk.name} loading="lazy"/>{pk.tag ? <span className="tag">{pk.tag}</span> : null}</div>
      <div className="bd">
        <h3>{pk.name}</h3>
        <div className="inc">{pk.items.map(i => `${i.qty > 1 ? i.qty + ' × ' : ''}${products[i.product]?.name || ''}`).join(' · ')}</div>
        <div className="ft">
          <div><span className="from">Package from</span><b>{money0(pk.price)} <small>/day</small></b></div>
          {list > pk.price ? <span className="save">Save {money0(list - pk.price)}/day</span> : null}
        </div>
      </div>
    </A>
  );
}

function SecHead({ p, ctx }) {
  if (!p.heading && !p.linkText) return null;
  return (
    <div className="sec-head">
      {p.heading ? <h2 className="sec-title">{p.heading}</h2> : <span/>}
      {p.linkText ? <A ctx={ctx} href={p.linkUrl || '/rentals'}>{p.linkText}</A> : null}
    </div>
  );
}

const sectionClass = (p, extra = '') => `section ${p.background === 'soft' ? 'rentbuy' : ''} ${extra}`.trim();

// ---------- blocks ----------

// Live price for a rental or package web address, e.g. "gorilla" -> "$425/day".
// Used by banner badges so they never show an old price.
export function livePrice(slug, ctx) {
  const key = String(slug || '').trim().replace(/^\/?(rental|packages)\//, '');
  if (!key) return null;
  const p = ctx?.products?.[key];
  if (p) return { text: `${money0(p.price)}/day`, href: rentalHref(p.slug), image: p.images?.[0] || '', name: p.name };
  const pk = (ctx?.packages || []).find(x => x.slug === key);
  if (pk) return { text: `${money0(pk.price)}/day package`, href: packageHref(pk.slug), image: pk.image || '', name: pk.name };
  return null;
}

// One banner slide: text on the left, photo with a red price badge on the right.
function Slide({ s, ctx, level = 'h2' }) {
  const price = livePrice(s.rental, ctx);
  const image = livePhoto(s.image || price?.image || '', ctx);
  return (
    <div className="wrap">
      <div>
        {s.eyebrow ? <div className="hero-eyebrow">{s.eyebrow}</div> : null}
        <Heading level={level}>{s.title}{s.highlight ? <><br/><em>{s.highlight}</em></> : null}</Heading>
        {s.text ? <p>{s.text}</p> : null}
        <div className="ctas">
          {s.button1Text ? <A ctx={ctx} className="btn btn-red" href={s.button1Url || price?.href || '/packages'}>{s.button1Text}</A> : null}
          {s.button2Text ? <A ctx={ctx} className="btn btn-line" href={s.button2Url || '/rentals'}>{s.button2Text}</A> : null}
        </div>
      </div>
      <div className="hero-img">
        {image ? <img src={image} alt={s.imageAlt || s.badgeTitle || price?.name || ''} {...(level === 'h1' ? { fetchPriority: 'high' } : {})}/> : null}
        {s.badgeTitle || price ? <A ctx={ctx} className="hero-tag" href={price?.href || s.button1Url || '/rentals'}><b>{s.badgeTitle || price?.name}</b>{price ? price.text : ''}</A> : null}
      </div>
    </div>
  );
}

// Banner slider. On the website ctx.Slider (components/HeroSlider.js) rotates the slides;
// anywhere without it (the admin preview) the first slide shows on its own.
function HeroSliderBlock({ p, ctx }) {
  const list = (Array.isArray(p.slides) ? p.slides : []).filter(s => s && (s.title || s.highlight));
  if (!list.length) return null;
  const slides = list.map((s, i) => ({ key: `${i}-${s.rental || s.title}`, content: <Slide s={s} ctx={ctx} level={i === 0 ? (p.headingLevel || 'h1') : 'h2'}/> }));
  const S = ctx?.Slider;
  if (S) return <S slides={slides}/>;
  // Admin preview: every slide one under another, numbered, so each edit is visible.
  return <>{slides.map((sl, i) => <section className="hero rr-slider rr-slider-preview" key={sl.key}><div className="rr-slides"><div className="rr-slide is-active">{sl.content}</div></div><span className="rr-slide-no">Slide {i + 1} of {slides.length}</span></section>)}</>;
}

function Hero({ p, ctx }) {
  return (
    <section className="hero"><div className="wrap">
      <div>
        <Heading level={p.headingLevel || 'h1'}>{p.title}{p.highlight ? <><br/><em>{p.highlight}</em></> : null}</Heading>
        {p.text ? <p>{p.text}</p> : null}
        <div className="ctas">
          {p.button1Text ? <A ctx={ctx} className="btn btn-red" href={p.button1Url || '/packages'}>{p.button1Text}</A> : null}
          {p.button2Text ? <A ctx={ctx} className="btn btn-line" href={p.button2Url || '/rentals'}>{p.button2Text}</A> : null}
        </div>
      </div>
      <div className="hero-img">
        {p.image ? <img src={livePhoto(p.image, ctx)} alt={p.imageAlt || p.badgeTitle || ''} fetchPriority="high"/> : null}
        {p.badgeTitle ? <A ctx={ctx} className="hero-tag" href={p.badgeUrl || '/rentals'}><b>{p.badgeTitle}</b>{livePrice(p.badgeUrl, ctx)?.text || p.badgeText}</A> : null}
      </div>
    </div></section>
  );
}

function PageHeader({ p, ctx }) {
  return (
    <>
      {p.showBreadcrumbs !== false ? <div className="wrap crumbs"><A ctx={ctx} href="/">Home</A><span>›</span>{p.breadcrumb || p.heading}</div> : null}
      <section className="section page-head" style={{ paddingBottom: 0 }}><div className="wrap">
        <Heading level="h1" className="page-title">{p.heading}</Heading>
        {p.text ? <p className="page-intro">{p.text}</p> : null}
      </div></section>
    </>
  );
}

function Usp({ p }) {
  const items = [1, 2, 3, 4].map(n => ({ icon: p[`item${n}Icon`], title: p[`item${n}Title`], text: p[`item${n}Text`] })).filter(i => i.title || i.text);
  return (
    <div className="usp"><div className="wrap">
      {items.map((i, n) => <div key={n}>{ICONS[i.icon] || ICONS.truck}<span><b>{i.title}</b>{i.text}</span></div>)}
    </div></div>
  );
}

// Category icons (line drawings, red), picked from the category's web address or name.
const CAT_ICONS = [
  [/tent|canop/, 'M2 10 12 4l10 6zM2 10c1.7 1.3 3.3 1.3 5 0 1.7 1.3 3.3 1.3 5 0 1.7 1.3 3.3 1.3 5 0 1.7 1.3 3.3 1.3 5 0M4 11v10M20 11v10'],
  [/dancer|blower/, 'M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2'],
  [/balloon/, 'M12 15c-3.3 0-6-2.9-6-6.3S8.7 3 12 3s6 2.4 6 5.7S15.3 15 12 15Zm-1.2 0 1.2 2 1.2-2M12 17c0 2-2 2.2-2 4'],
  [/inflat/, 'M8 21h8M12 17v4M7 10a5 5 0 0 1 10 0v2a5 5 0 0 1-10 0Zm2-1h.01M15 9h.01M10 13c1.2.8 2.8.8 4 0'],
  [/flag/, 'M4 22V4M4 4h13l-2.5 4L17 12H4'],
  [/display|banner|stand|sign/, 'M4 3h16v11H4zM8 21l2-7M16 21l-2-7M8 7h8M8 10h5'],
  [/vehicle|ramp|car/, 'M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm18 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 13l2-5h11l4 5M3 13h18v4'],
  [/lot|event|cone|barrier/, 'M12 3l6 18H6zM5 21h14M8.3 15h7.4M9.7 10h4.6'],
  [/decor|shop|buy|pennant|bow/, 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4ZM7.5 7.5h.01'],
];
const catIcon = c => (CAT_ICONS.find(([re]) => re.test(`${c.slug} ${c.name}`.toLowerCase())) || [null, 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'])[1];
const Icon = ({ d }) => <svg className="cat-ic" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;

// Category tiles: grey tiles with a red icon and the name, then a black "browse everything" tile.
function Categories({ p, ctx }) {
  const cats = ctx.categories || [];
  return (
    <section className={sectionClass(p)}><div className="wrap">
      <SecHead p={p} ctx={ctx}/>
      <div className="cat-tiles">
        {cats.map(c => (
          <A ctx={ctx} key={c.slug} className="cat-tile" href={categoryHref(c.slug)}>
            <Icon d={catIcon(c)}/>
            <span>{c.name}</span>
          </A>
        ))}
        {cats.length ? <A ctx={ctx} className="cat-tile all" href={p.linkUrl || '/rentals'}>
          <Icon d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>
          <span>Browse all rentals</span>
        </A> : null}
      </div>
      {!cats.length ? <p className="count-note">Categories appear here once they are published in Admin › Categories.</p> : null}
    </div></section>
  );
}

function Packages({ p, ctx }) {
  const limit = Number(p.limit) || 0;
  const pkgs = (ctx.packages || []).slice(0, limit || undefined);
  return (
    <section className={sectionClass(p)} style={p.tight ? { paddingTop: 0 } : undefined}><div className="wrap">
      <SecHead p={p} ctx={ctx}/>
      <div className="pkgs">{pkgs.map(pk => <PackageCard key={pk.slug} pk={pk} ctx={ctx}/>)}</div>
      {!pkgs.length ? <p className="count-note">Packages appear here once they are published in Admin › Packages.</p> : null}
    </div></section>
  );
}

function Popular({ p, ctx }) {
  const all = Object.values(ctx.products || {});
  let list = p.source === 'all' ? all : all.filter(x => x.featured);
  if (!list.length) list = all;
  const limit = Number(p.limit) || 10;
  return (
    <section className={sectionClass(p)} style={p.tight ? { paddingTop: 0 } : undefined}><div className="wrap">
      <SecHead p={p} ctx={ctx}/>
      <div className="carousel">{list.slice(0, limit).map(x => <ProductCard key={x.slug} p={x} ctx={ctx}/>)}</div>
    </div></section>
  );
}

function Steps({ p }) {
  const steps = [1, 2, 3, 4].map(n => ({ title: p[`step${n}Title`], text: p[`step${n}Text`] })).filter(s => s.title || s.text);
  return (
    <section className={sectionClass(p)}><div className="wrap">
      {p.heading ? <h2 className="sec-title">{p.heading}</h2> : null}
      <div className="steps">{steps.map((s, i) => <div key={i}><i>{String(i + 1).padStart(2, '0')}</i><h3>{s.title}</h3><p>{s.text}</p></div>)}</div>
    </div></section>
  );
}

function RentBuy({ p }) {
  const col = side => ({ title: p[`${side}Title`], text: p[`${side}Text`], list: lines(p[`${side}List`]) });
  return (
    <section className={`section ${p.background === 'white' ? '' : 'rentbuy'}`}><div className="wrap">
      {p.heading ? <h2 className="sec-title">{p.heading}</h2> : null}
      <div className="rb">{['left', 'right'].map(side => {
        const c = col(side);
        return <div key={side}><h3>{c.title}</h3>{c.text ? <p>{c.text}</p> : null}{c.list.length ? <ul>{c.list.map((li, i) => <li key={i}>{li}</li>)}</ul> : null}</div>;
      })}</div>
    </div></section>
  );
}

export function faqItems(p) {
  return [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ q: String(p[`question${n}`] || '').trim(), a: String(p[`answer${n}`] || '').trim() })).filter(i => i.q && i.a);
}

function Faq({ p }) {
  const items = faqItems(p);
  return (
    <section className={sectionClass(p)} id={p.anchor || 'faq'}><div className="wrap" style={{ maxWidth: 900 }}>
      {p.heading ? <h2 className="sec-title">{p.heading}</h2> : null}
      <div className="faq">{items.map((i, n) => <details key={n} open={n === 0}><summary>{i.q}</summary><p>{i.a}</p></details>)}</div>
    </div></section>
  );
}

function TextBlock({ p, ctx }) {
  return (
    <section className={sectionClass(p)} id={p.anchor || undefined}><div className="wrap prose" style={{ maxWidth: p.width === 'wide' ? undefined : 900 }}>
      {p.heading ? <h2 className="sec-title">{p.heading}</h2> : null}
      {paragraphs(p.text).map((para, i) => <p key={i}>{para}</p>)}
      {p.buttonText ? <A ctx={ctx} className="btn btn-red" href={p.buttonUrl || '/quote'}>{p.buttonText}</A> : null}
    </div></section>
  );
}

function ImageText({ p, ctx }) {
  return (
    <section className={sectionClass(p)}><div className={`wrap imgtext ${p.imagePosition === 'right' ? 'flip' : ''}`}>
      <div className="imgtext-im">{p.image ? <img src={livePhoto(p.image, ctx)} alt={p.imageAlt || p.heading || ''} loading="lazy"/> : null}</div>
      <div className="prose">
        {p.heading ? <h2 className="sec-title">{p.heading}</h2> : null}
        {paragraphs(p.text).map((para, i) => <p key={i}>{para}</p>)}
        {lines(p.list).length ? <ul>{lines(p.list).map((li, i) => <li key={i}>{li}</li>)}</ul> : null}
        {p.buttonText ? <A ctx={ctx} className="btn btn-red" href={p.buttonUrl || '/quote'}>{p.buttonText}</A> : null}
      </div>
    </div></section>
  );
}

function Cta({ p, ctx }) {
  return (
    <section className="section" style={{ paddingTop: p.tight ? 0 : undefined }}><div className="wrap">
      <div className="cta-band">
        <div>
          {p.heading ? <h2>{p.heading}</h2> : null}
          {p.text ? <p>{p.text}</p> : null}
        </div>
        <div className="ctas">
          {p.buttonText ? <A ctx={ctx} className="btn btn-red" href={p.buttonUrl || '/quote'}>{p.buttonText}</A> : null}
          {p.button2Text ? <A ctx={ctx} className="btn btn-line" href={p.button2Url || '/rentals'}>{p.button2Text}</A> : null}
        </div>
      </div>
    </div></section>
  );
}

export const RR_BLOCKS = {
  RRHeroBlock: Hero,
  RRHeroSliderBlock: HeroSliderBlock,
  RRPageHeaderBlock: PageHeader,
  RRUspBlock: Usp,
  RRCategoriesBlock: Categories,
  RRPackagesBlock: Packages,
  RRPopularBlock: Popular,
  RRStepsBlock: Steps,
  RRRentBuyBlock: RentBuy,
  RRFaqBlock: Faq,
  RRTextBlock: TextBlock,
  RRImageTextBlock: ImageText,
  RRCtaBlock: Cta,
};

export function RRBlock({ type, props, ctx }) {
  const Component = RR_BLOCKS[type];
  return Component ? <Component p={props || {}} ctx={ctx}/> : null;
}

export function RRPage({ data, ctx }) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return <>{blocks.map((b, i) => <RRBlock key={b.props?.id || i} type={b.type} props={b.props} ctx={ctx}/>)}</>;
}

// ---------- the pages as they were before anyone edits them ----------

const block = (type, id, props) => ({ type, props: { id, ...props } });

export const DEFAULT_PAGES = {
  home: {
    root: { props: { seoTitle: '', seoDescription: '', ogImage: '' } },
    content: [
      block('RRHeroSliderBlock', 'rr-home-slider', {
        headingLevel: 'h1',
        slides: [
          { eyebrow: 'Giant inflatables', title: 'Rent the gear that', highlight: 'stops traffic.',
            text: 'A 22 ft gorilla seen from blocks away. Giant inflatables, air dancers and tents, delivered and set up for your sale, opening or event.',
            button1Text: 'See the Gorilla', button1Url: '', button2Text: 'Browse All Rentals', button2Url: '/rentals',
            rental: 'gorilla', badgeTitle: "22' Gorilla", image: '', imageAlt: '22 foot inflatable gorilla rental at a car dealership' },
          { eyebrow: 'Air dancers', title: 'Wave them', highlight: 'onto your lot.',
            text: 'Crazy Car Salesman air dancers, over 16 ft tall with the blower included. Pick Used Cars, Auto Sale, Trucks, New Cars or plain.',
            button1Text: 'Pick Your Dancers', button1Url: '', button2Text: 'All Air Dancers', button2Url: '/rentals/air-dancers',
            rental: 'crazy-salesman-air-dancers', badgeTitle: 'Crazy Car Salesman', image: '', imageAlt: 'Crazy Car Salesman air dancer in front of a used car lot' },
          { eyebrow: 'Packages', title: 'Open with', highlight: 'a bang.',
            text: 'The gorilla, two tube men and four swooper flags in one package, for less than renting each piece.',
            button1Text: 'See the Package', button1Url: '', button2Text: 'All Packages', button2Url: '/packages',
            rental: 'grand-opening', badgeTitle: 'Grand Opening Blowout', image: '', imageAlt: 'Grand opening rental package with air dancers' },
          { eyebrow: 'Retail & storefronts', title: 'Turn heads at', highlight: 'any storefront.',
            text: 'The Sale Clown air dancer, two tube men and two blade flags in one package, for less than renting each piece.',
            button1Text: 'See the Package', button1Url: '', button2Text: 'All Packages', button2Url: '/packages',
            rental: 'attention-grabber', badgeTitle: 'Retail Attention Grabber', image: '', imageAlt: 'Sale clown air dancer in front of a furniture store sale' },
        ],
      }),
      block('RRUspBlock', 'rr-home-usp', {
        item1Icon: 'truck', item1Title: 'Delivery & setup', item1Text: 'Hamilton, Niagara & GTA',
        item2Icon: 'cal', item2Title: 'Daily to weekly', item2Text: 'Weekend & week rates',
        item3Icon: 'wrench', item3Title: 'We install it', item3Text: 'Anchored, powered, ready',
        item4Icon: 'tag', item4Title: 'Rent or buy', item4Text: 'Own the same equipment',
      }),
      block('RRCategoriesBlock', 'rr-home-cats', { heading: 'Shop by Category', linkText: 'View all rentals →', linkUrl: '/rentals', background: 'white' }),
      block('RRPackagesBlock', 'rr-home-pkgs', { heading: 'Rental Packages', linkText: 'All packages →', linkUrl: '/packages', limit: '8', tight: true, background: 'white' }),
      block('RRCtaBlock', 'rr-home-bundle', { heading: 'Build your own bundle', text: 'Mix any rentals you like. Rent 3 different items and save 5%, 4 save 7%, 5 or more save 10%. The discount comes off automatically on your quote.', buttonText: 'Start Your Bundle', buttonUrl: '/rentals', button2Text: 'Ready-made packages', button2Url: '/packages', tight: true }),
      block('RRPopularBlock', 'rr-home-popular', { heading: 'Popular Rentals', linkText: 'Shop all →', linkUrl: '/rentals', limit: '10', source: 'featured', tight: true, background: 'white' }),
      block('RRStepsBlock', 'rr-home-steps', {
        heading: 'How Renting Works', background: 'white',
        step1Title: 'Pick your gear', step1Text: 'Choose a package or build your own from individual rentals.',
        step2Title: 'Request a quote', step2Text: 'Add items to your quote with your dates. We confirm availability the same day.',
        step3Title: 'We deliver & set up', step3Text: 'Our crew drops off, anchors and powers everything before your event.',
        step4Title: 'We pick it up', step4Text: 'When your event is over, we take it all down. No storage, no hassle.',
      }),
      block('RRRentBuyBlock', 'rr-home-rentbuy', {
        heading: 'Rent or Buy', background: 'soft',
        leftTitle: 'Rent it', leftText: 'Best for one-time events, seasonal sales and trying something new.',
        leftList: 'Delivery, setup and pickup\nNo storage or maintenance\nSwap gear between events',
        rightTitle: 'Buy it', rightText: 'Promoting every weekend? Every rental is also available to buy new.',
        rightList: 'The same equipment you rented\nCustom messages and branding\nLook for "Prefer to own it?" on any product',
      }),
    ],
  },
  'how-it-works': {
    root: { props: { seoTitle: 'How Renting Works', seoDescription: 'How event and promo rentals work at Rent & Rally: pick your gear, request a quote, and we deliver, set up and pick up across Hamilton, Niagara and the GTA.', ogImage: '' } },
    content: [
      block('RRPageHeaderBlock', 'rr-how-head', { heading: 'How Renting Works', text: 'From picking your gear to pickup day, here is what to expect.', showBreadcrumbs: true }),
      block('RRStepsBlock', 'rr-how-steps', {
        heading: '', background: 'white',
        step1Title: 'Pick your gear', step1Text: 'Choose a package or build your own from individual rentals.',
        step2Title: 'Request a quote', step2Text: 'Add items to your quote with your dates. We confirm availability the same day.',
        step3Title: 'We deliver & set up', step3Text: 'Our crew drops off, anchors and powers everything before your event.',
        step4Title: 'We pick it up', step4Text: 'When your event is over, we take it all down. No storage, no hassle.',
      }),
      block('RRFaqBlock', 'rr-how-faq', {
        heading: 'FAQ', anchor: 'faq', background: 'white',
        question1: 'Is delivery and setup included?', answer1: 'Delivery, setup and pickup are quoted based on your location. Most of Hamilton, Stoney Creek and Burlington is a flat delivery fee.',
        question2: 'How do weekend and weekly rates work?', answer2: 'The longer you rent, the more you save. 2 days is billed as 1.75 days, a weekend (Friday drop-off, Monday pickup) or 3 days as 2 days, a week as 4 days and 2 weeks as 7 days.',
        question3: 'What about wind and rain?', answer3: "Inflatables and air dancers are staked and tethered. If winds are forecast above safe limits, we'll reschedule at no charge.",
        question4: 'Do I need power?', answer4: "Air dancers and inflatables run on a standard outdoor outlet. If power isn't available, tell us in your quote and we'll work out options.",
        question5: 'Can I add my own message or logo?', answer5: 'Yes. Rent the reusable hardware and buy custom printed flags, banners or sign faces to go with it.',
        question6: 'Can I buy something after renting it?', answer6: 'Yes. Every rental is available to buy new. Look for "Prefer to own it?" on any product page.',
        question7: 'Is there a security deposit?', answer7: 'Yes. A security deposit for damage is required before delivery. When we pick the gear up and there is no damage, the deposit goes toward your rental. The amount is confirmed with your quote.', question8: 'How far ahead do I need to book?', answer8: 'At least 3 days before your start date, so we can prepare, deliver and set up. Busy weekends book up early, so the sooner the better.',
      }),
      block('RRCtaBlock', 'rr-how-cta', { heading: 'Ready to plan your event?', text: 'Build your quote online and we will confirm availability and pricing, usually the same day.', buttonText: 'Start a Quote', buttonUrl: '/packages', button2Text: 'Browse Rentals', button2Url: '/rentals', tight: true }),
    ],
  },
};
