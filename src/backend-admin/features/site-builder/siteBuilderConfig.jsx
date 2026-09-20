import { useEffect, useState } from 'react';
import { FieldLabel } from '@puckeditor/core';
import { ArrowRight, BarChart3, ClipboardList, FileUp, Image as ImageIcon, Library, PackagePlus, ReceiptText, ScanBarcode, Smartphone, Store, Upload, Users, WalletCards } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import MediaPickerModal from '../social-automation/components/MediaPickerModal';
import { loadAdminMedia, loadAdminVideos, uploadBlogImage } from '../../services/siteAdminService';
import { FALLBACK_VIDEOS } from '../../config/siteContent';

function ImageLibraryField({ field, value, onChange }) {
  const { accessToken } = useAuth();
  const [media, setMedia] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const items = await loadAdminMedia(accessToken);
      setMedia(items.filter(item => (item.mediaType || 'image') === 'image'));
    } catch (err) {
      setError(err.message || 'Unable to load media.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pickerOpen && !media.length) refresh();
  }, [pickerOpen, accessToken]);

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadBlogImage(accessToken, file);
      onChange(url);
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to upload image.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return <>
    <FieldLabel label={field.label || 'Image'}>
      <div className="jci-puck-image-field">
        {value
          ? <img src={value} alt="" className="jci-puck-image-thumb"/>
          : <div className="jci-puck-image-empty"><ImageIcon size={22}/><span>No image selected</span></div>}
        <input
          className="jci-puck-url-input"
          value={value || ''}
          onChange={event => onChange(event.target.value)}
          placeholder="https://example.com/path/image.png"
          aria-label="External image URL"
        />
        <small className="jci-puck-image-help">Use an uploaded image, choose from Media, or paste any public image URL (WordPress/CDN URLs are supported).</small>
        <div className="jci-puck-image-actions">
          <button type="button" onClick={() => setPickerOpen(true)} disabled={loading}>
            <Library size={14}/> {loading ? 'Loading…' : 'Choose Media'}
          </button>
          <label>
            <Upload size={14}/> {uploading ? 'Uploading…' : 'Upload New'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading}/>
          </label>
        </div>
        {error && <small className="jci-puck-field-error">{error}</small>}
      </div>
    </FieldLabel>
    {pickerOpen && <MediaPickerModal
      items={media}
      onClose={() => setPickerOpen(false)}
      onSelect={item => {
        onChange(item.url);
        setPickerOpen(false);
      }}
    />}
  </>;
}

const imageField = {
  type: 'custom',
  label: 'Image',
  render: props => <ImageLibraryField {...props}/>,
};

const backgroundOptions = [
  { label: 'White', value: 'white' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];


const publicAsset = path => `https://www.justconsignin.com${path}`;

function previewClick(event) {
  event.preventDefault();
}

function HomeVideosPreview({ eyebrow = 'Watch the Shopify workflow', heading = 'See JustConsignIn in action.' }) {
  const { accessToken } = useAuth();
  const [videos, setVideos] = useState(FALLBACK_VIDEOS);

  useEffect(() => {
    let active = true;
    if (!accessToken) return () => { active = false; };
    loadAdminVideos(accessToken)
      .then(rows => {
        if (!active) return;
        const homepage = rows.filter(video => video.status !== 'hidden' && video.placement === 'homepage');
        setVideos(homepage.length ? homepage : FALLBACK_VIDEOS);
      })
      .catch(() => {
        if (active) setVideos(FALLBACK_VIDEOS);
      });
    return () => { active = false; };
  }, [accessToken]);

  const regularVideos = videos.filter(video => video.contentType !== 'short' && video.youtubeId);
  const shorts = videos.filter(video => video.contentType === 'short' && video.youtubeId);

  return <div className="jci-public-preview">
    <section className="home-video-section public-section" aria-labelledby="builder-home-video-heading">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2 id="builder-home-video-heading">{heading}</h2>
      </div>
      <div className="youtube-gallery">
        {regularVideos.length > 0 && <section className="youtube-gallery-group" aria-label="YouTube videos">
          <div className="youtube-gallery-group-title"><span>Videos</span></div>
          <div className="home-video-grid">
            {regularVideos.map(video => <div className="youtube-gallery-card" key={video.id || video.youtubeId}>
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0&playsinline=1`}
                title={video.title || 'JustConsignIn video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>)}
          </div>
        </section>}
        {shorts.length > 0 && <section className="youtube-gallery-group shorts" aria-label="YouTube Shorts">
          <div className="youtube-gallery-group-title"><span>Shorts</span></div>
          <div className="home-shorts-grid">
            {shorts.map(video => <div className="youtube-gallery-card short" key={video.id || video.youtubeId}>
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0&playsinline=1`}
                title={video.title || 'JustConsignIn short'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>)}
          </div>
        </section>}
      </div>
    </section>
  </div>;
}

const homeHeroDefaults = {
  brandText: 'Consignment management built for Shopify stores',
  eyebrow: 'JustConsignIn for Shopify',
  heading: 'Create consignment products from your phone and sell them through Shopify.',
  text: 'JustConsignIn connects consignors, inventory, Shopify products, POS sales and payouts in one workflow — without spreadsheets or duplicate entry.',
  primaryButtonText: 'Open Shopify app demo',
  primaryButtonUrl: '/shopify-app',
  watchButtonText: 'Watch videos',
  watchButtonUrl: '#home-video-heading',
  partnerButtonText: 'Founding Partner Program',
  partnerButtonUrl: '/partner-program',
  note1: 'Create products from your phone',
  note2: 'Shopify POS ready',
  note3: 'Track consignor payouts',
  panelTitle: 'Shopify connected',
  panelSubtitle: 'Products · POS · Consignment',
  panelDate: 'Today',
  panelHeading: 'Consignment overview',
  metric1Label: 'Consignors',
  metric1Value: '24',
  metric2Label: 'Available items',
  metric2Value: '118',
  metric3Label: 'Sales',
  metric3Value: '$3,840',
  metric4Label: 'Owed',
  metric4Value: '$1,426',
  person1Initials: 'SM',
  person1Name: 'Sarah Miller',
  person1Detail: '4 items · $84.00 due',
  person1Percent: '60%',
  person2Initials: 'DR',
  person2Name: 'Daniel Reed',
  person2Detail: '2 items · $35.00 due',
  person2Percent: '50%',
};

const homeIntegrationDefaults = {
  eyebrow: 'Built around Shopify',
  heading: 'Intake, product creation and POS in one consignment workflow.',
  text: 'Use JustConsignIn to manage the consignment details Shopify does not track on its own, while keeping the product and sale inside your Shopify workflow.',
  card1Heading: 'Create Shopify products from your phone',
  card1Text: 'Enter the consignor and item once, add the product details and photo, then create the Shopify product directly from intake.',
  card2Heading: 'Sell consignment items at the point of sale',
  card2Text: 'Publish items to Shopify POS and keep the consignment item tied back to the correct consignor when it sells.',
  card3Heading: 'Know exactly what each consignor is owed',
  card3Text: 'Track sold-unpaid items, commission splits, payouts and transaction history without maintaining a second spreadsheet.',
};

const homeLinksDefaults = {
  link1Title: 'Shopify features',
  link1Text: 'Products, POS, consignors, sales, payouts and reporting.',
  link1Url: '/features',
  link2Title: 'How it works',
  link2Text: 'Follow the Shopify consignment workflow from intake through payout.',
  link2Url: '/how-it-works',
  link3Title: 'Open the Shopify app demo',
  link3Text: 'Explore the JustConsignIn interface and connected workflow.',
  link3Url: '/shopify-app',
};

const featuresHeroDefaults = {
  brandText: 'Built for Shopify consignment stores',
  eyebrow: 'Features',
  heading: 'Move consignment inventory from intake to sale faster.',
  text: 'JustConsignIn is built for Shopify store owners who process lots of unique consignment and resale inventory. Enter items quickly, create Shopify products without duplicate entry, track every sale back to the correct consignor and keep payouts organized in one workflow.',
  image: '',
  imageAlt: '',
  imagePosition: 'right',
};

const featuresGridDefaults = {
  eyebrow: 'Made for real resale workflows',
  heading: 'When every item is different, intake speed matters.',
  text: 'Traditional retail receives repeatable SKUs from suppliers. Consignment and resale stores often receive one-of-a-kind items in batches. JustConsignIn focuses on making that store-owner workflow faster and easier to manage from the moment inventory comes in.',
  headingAlign: 'center',
  cardAlign: 'left',
  columns: '2',
  background: 'light',
  sectionImage: '',
  sectionImagePosition: 'right',
  item1Title: 'Built for high-volume resale inventory',
  item1Text: 'JustConsignIn is designed for consignment and resale stores that receive lots of unique items. Move quickly from an item in hand to a complete consignment record without relying on paper notes or spreadsheets.',
  item1Image: '',
  item2Title: 'Consignor accounts',
  item2Text: 'Keep contact details, commission split, notes, balances and every item connected to the correct consignor.',
  item2Image: '',
  item3Title: 'Fast mobile item intake',
  item3Text: 'Create consignors and add items from your phone while you are receiving inventory. Enter the item once, add product details and photos, and keep the intake process moving.',
  item3Image: '',
  item4Title: 'Create Shopify products without duplicate entry',
  item4Text: 'Turn a consignment item into a Shopify product without typing the same information into a second system. Publish to Shopify POS and choose whether the item should also be available online.',
  item4Image: '',
  item5Title: 'Shopify POS, online and manual sales tracking',
  item5Text: 'Keep each consignment item tied to the correct consignor whether it sells in-store through Shopify POS, through your Shopify online store, or through a manual sale workflow.',
  item5Image: '',
  item6Title: 'Payout management',
  item6Text: 'See sold-unpaid items, calculate the consignor share and record payouts while preserving the full sale and payout history.',
  item6Image: '',
  item7Title: 'Reports and transactions',
  item7Text: 'Review sales, consignor earnings, payout history and transaction activity from the same workspace so you always know what sold and what is still owed.',
  item7Image: '',
  item8Title: 'Import and export for larger inventories',
  item8Text: 'Bulk import consignors and items from CSV and keep downloadable data tools available when you are moving existing inventory into JustConsignIn or maintaining your own records.',
  item8Image: '',
};

const featuresAudienceDefaults = {
  eyebrow: 'Who JustConsignIn is for',
  heading: 'Shopify stores with a lot of unique resale inventory to enter and track.',
  text: 'The common problem is volume: many individual items, many consignors and a constant need to know who owns what, what sold and what each person is owed.',
  headingAlign: 'center',
  cardAlign: 'left',
  columns: '2',
  background: 'light',
  sectionImage: '',
  sectionImagePosition: 'right',
  item1Title: 'Consignment & resale shops',
  item1Text: 'Stores taking in a steady flow of one-of-a-kind inventory from consignors.',
  item1Image: '',
  item2Title: 'Secondhand & thrift-style stores',
  item2Text: 'Shops using Shopify that need a faster way to enter and manage large amounts of resale inventory tied to individual consignors.',
  item2Image: '',
  item3Title: 'Children’s & family resale',
  item3Text: 'Clothing, toys, baby gear and other categories where many unique items can arrive from the same consignor at once.',
  item3Image: '',
  item4Title: 'Vintage & clothing stores',
  item4Text: 'Apparel, accessories and vintage inventory where every item may need its own title, price, photos and consignor record.',
  item4Image: '',
  item5Title: 'Furniture & home décor consignment',
  item5Text: 'Larger one-off pieces that need ownership, pricing, sale status and payout information kept together.',
  item5Image: '',
  item6Title: 'Specialty resale stores',
  item6Text: 'Sporting goods, collectibles, designer goods and other resale businesses handling unique inventory through Shopify.',
  item6Image: '',
};

const featuresCtaDefaults = {
  heading: 'Spend less time entering inventory and more time selling it.',
  text: 'Explore consignors, fast mobile intake, Shopify product creation, POS and online sales tracking, and payouts in the working app demo.',
  buttonText: 'Open Shopify App Demo',
  buttonUrl: '/shopify-app',
};


export const siteBuilderConfig = {
  categories: {
    homepage: {
      title: 'Homepage',
      components: ['HomeHeroBlock', 'HomeIntegrationBlock', 'HomeVideosBlock', 'HomeLinksBlock'],
    },
    featuresPage: {
      title: 'Features page',
      components: ['FeaturesHeroBlock', 'FeaturesGridBlock', 'FeaturesAudienceBlock', 'FeaturesCtaBlock'],
    },
    content: {
      title: 'Content',
      components: ['HeadingBlock', 'TextBlock', 'ImageBlock', 'ImageTextBlock'],
    },
    marketing: {
      title: 'Marketing',
      components: ['HeroBlock', 'CtaBlock'],
    },
  },
  components: {

    HomeHeroBlock: {
      label: 'Homepage Hero',
      fields: {
        brandText: { type: 'text', label: 'Shopify badge text' },
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Description' },
        primaryButtonText: { type: 'text', label: 'Primary button text' },
        primaryButtonUrl: { type: 'text', label: 'Primary button link' },
        watchButtonText: { type: 'text', label: 'Watch button text' },
        watchButtonUrl: { type: 'text', label: 'Watch button link' },
        partnerButtonText: { type: 'text', label: 'Partner button text' },
        partnerButtonUrl: { type: 'text', label: 'Partner button link' },
        note1: { type: 'text', label: 'Feature pill 1' },
        note2: { type: 'text', label: 'Feature pill 2' },
        note3: { type: 'text', label: 'Feature pill 3' },
        panelTitle: { type: 'text', label: 'Panel title' },
        panelSubtitle: { type: 'text', label: 'Panel subtitle' },
        panelDate: { type: 'text', label: 'Panel date label' },
        panelHeading: { type: 'text', label: 'Panel heading' },
        metric1Label: { type: 'text', label: 'Metric 1 label' },
        metric1Value: { type: 'text', label: 'Metric 1 value' },
        metric2Label: { type: 'text', label: 'Metric 2 label' },
        metric2Value: { type: 'text', label: 'Metric 2 value' },
        metric3Label: { type: 'text', label: 'Metric 3 label' },
        metric3Value: { type: 'text', label: 'Metric 3 value' },
        metric4Label: { type: 'text', label: 'Metric 4 label' },
        metric4Value: { type: 'text', label: 'Metric 4 value' },
        person1Name: { type: 'text', label: 'Example consignor 1' },
        person1Detail: { type: 'text', label: 'Example detail 1' },
        person1Percent: { type: 'text', label: 'Example split 1' },
        person2Name: { type: 'text', label: 'Example consignor 2' },
        person2Detail: { type: 'text', label: 'Example detail 2' },
        person2Percent: { type: 'text', label: 'Example split 2' },
      },
      defaultProps: homeHeroDefaults,
      render: rawProps => {
        const props = { ...homeHeroDefaults, ...rawProps };
        return <div className="jci-public-preview">
          <section className="hero-section compact-home-hero shopify-home-hero">
            <div className="hero-copy">
              <div className="shopify-hero-brand">
                <img src={publicAsset('/images/brand/shopify-logo1.png?v=20260907')} alt="Shopify" />
                <span>{props.brandText}</span>
              </div>
              <span className="hero-kicker">{props.eyebrow}</span>
              <h1>{props.heading}</h1>
              <p>{props.text}</p>
              <div className="hero-actions">
                <a className="public-button large" href={props.primaryButtonUrl || '#'} onClick={previewClick}>{props.primaryButtonText} <ArrowRight size={18}/></a>
                <a className="public-button secondary large" href={props.watchButtonUrl || '#'} onClick={previewClick}>{props.watchButtonText}</a>
                <a className="public-button secondary large" href={props.partnerButtonUrl || '#'} onClick={previewClick}>{props.partnerButtonText}</a>
              </div>
              <div className="shopify-hero-notes">
                <span><Smartphone size={16}/> {props.note1}</span>
                <span><ScanBarcode size={16}/> {props.note2}</span>
                <span><WalletCards size={16}/> {props.note3}</span>
              </div>
            </div>
            <div className="hero-panel">
              <div className="hero-panel-shopify">
                <img src={publicAsset('/images/brand/shopify-logo2.png?v=20260907')} alt="" />
                <div><strong>{props.panelTitle}</strong><span>{props.panelSubtitle}</span></div>
              </div>
              <div className="hero-panel-top"><span>{props.panelDate}</span><strong>{props.panelHeading}</strong></div>
              <div className="hero-metrics">
                <div><span>{props.metric1Label}</span><strong>{props.metric1Value}</strong></div>
                <div><span>{props.metric2Label}</span><strong>{props.metric2Value}</strong></div>
                <div><span>{props.metric3Label}</span><strong>{props.metric3Value}</strong></div>
                <div><span>{props.metric4Label}</span><strong>{props.metric4Value}</strong></div>
              </div>
              <div className="hero-list">
                <div><span className="mini-avatar">{props.person1Initials || 'SM'}</span><span><strong>{props.person1Name}</strong><small>{props.person1Detail}</small></span><span>{props.person1Percent}</span></div>
                <div><span className="mini-avatar">{props.person2Initials || 'DR'}</span><span><strong>{props.person2Name}</strong><small>{props.person2Detail}</small></span><span>{props.person2Percent}</span></div>
              </div>
            </div>
          </section>
        </div>;
      },
    },
    HomeIntegrationBlock: {
      label: 'Shopify Integration Section',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Description' },
        card1Heading: { type: 'text', label: 'Card 1 heading' },
        card1Text: { type: 'text', label: 'Card 1 text' },
        card2Heading: { type: 'text', label: 'Card 2 heading' },
        card2Text: { type: 'text', label: 'Card 2 text' },
        card3Heading: { type: 'text', label: 'Card 3 heading' },
        card3Text: { type: 'text', label: 'Card 3 text' },
      },
      defaultProps: homeIntegrationDefaults,
      render: rawProps => {
        const props = { ...homeIntegrationDefaults, ...rawProps };
        return <div className="jci-public-preview">
          <section className="shopify-integration-section public-section">
            <div className="shopify-integration-heading">
              <div>
                <span>{props.eyebrow}</span>
                <h2>{props.heading}</h2>
                <p>{props.text}</p>
              </div>
              <img src={publicAsset('/images/brand/shopify-logo1.png?v=20260907')} alt="Shopify" />
            </div>
            <div className="shopify-feature-strip">
              <article><Smartphone size={25}/><h3>{props.card1Heading}</h3><p>{props.card1Text}</p></article>
              <article className="shopify-pos-card"><div className="shopify-pos-mark"><img src={publicAsset('/images/brand/shopify-logo2.png?v=20260907')} alt=""/><strong>Shopify POS</strong></div><h3>{props.card2Heading}</h3><p>{props.card2Text}</p></article>
              <article><WalletCards size={25}/><h3>{props.card3Heading}</h3><p>{props.card3Text}</p></article>
            </div>
          </section>
        </div>;
      },
    },
    HomeVideosBlock: {
      label: 'Homepage Videos',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
      },
      defaultProps: { eyebrow: 'Watch the Shopify workflow', heading: 'See JustConsignIn in action.' },
      render: props => <HomeVideosPreview {...props}/>,
    },
    HomeLinksBlock: {
      label: 'Homepage Links',
      fields: {
        link1Title: { type: 'text', label: 'Link 1 title' },
        link1Text: { type: 'text', label: 'Link 1 description' },
        link1Url: { type: 'text', label: 'Link 1 URL' },
        link2Title: { type: 'text', label: 'Link 2 title' },
        link2Text: { type: 'text', label: 'Link 2 description' },
        link2Url: { type: 'text', label: 'Link 2 URL' },
        link3Title: { type: 'text', label: 'Link 3 title' },
        link3Text: { type: 'text', label: 'Link 3 description' },
        link3Url: { type: 'text', label: 'Link 3 URL' },
      },
      defaultProps: homeLinksDefaults,
      render: rawProps => {
        const props = { ...homeLinksDefaults, ...rawProps };
        return <div className="jci-public-preview">
          <section className="home-link-grid" aria-label="Explore JustConsignIn">
            <a href={props.link1Url || '#'} onClick={previewClick}><Users size={22}/><div><strong>{props.link1Title}</strong><span>{props.link1Text}</span></div><ArrowRight size={18}/></a>
            <a href={props.link2Url || '#'} onClick={previewClick}><ClipboardList size={22}/><div><strong>{props.link2Title}</strong><span>{props.link2Text}</span></div><ArrowRight size={18}/></a>
            <a href={props.link3Url || '#'} onClick={previewClick}><Store size={22}/><div><strong>{props.link3Title}</strong><span>{props.link3Text}</span></div><ArrowRight size={18}/></a>
          </section>
        </div>;
      },
    },

    FeaturesHeroBlock: {
      label: 'Features Hero',
      fields: {
        brandText: { type: 'text', label: 'Shopify badge text' },
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Description' },
        image: imageField,
        imageAlt: { type: 'text', label: 'Image alt text' },
        imagePosition: {
          type: 'radio',
          label: 'Image position',
          options: [
            { label: 'Right', value: 'right' },
            { label: 'Left', value: 'left' },
          ],
        },
      },
      defaultProps: featuresHeroDefaults,
      render: rawProps => {
        const props = { ...featuresHeroDefaults, ...rawProps };
        return <div className="jci-public-preview">
          <section className={`public-page-hero ${props.image ? 'with-media' : ''} ${props.imagePosition === 'left' ? 'media-left' : 'media-right'}`}>
            <div className="public-page-hero-copy">
              <div className="shopify-page-brand"><img src={publicAsset('/images/brand/shopify-logo1.png')} alt="Shopify"/><span>{props.brandText}</span></div>
              <span>{props.eyebrow}</span>
              <h1>{props.heading}</h1>
              <p>{props.text}</p>
            </div>
            {props.image && <div className="public-page-hero-media"><img src={props.image} alt={props.imageAlt || ''}/></div>}
          </section>
        </div>;
      },
    },
    FeaturesGridBlock: {
      label: 'Features Grid',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Description' },
        headingAlign: { type: 'radio', label: 'Heading alignment', options: [{ label: 'Left', value: 'left' }, { label: 'Centre', value: 'center' }] },
        cardAlign: { type: 'radio', label: 'Card alignment', options: [{ label: 'Left', value: 'left' }, { label: 'Centre', value: 'center' }] },
        columns: { type: 'radio', label: 'Desktop columns', options: [{ label: '2', value: '2' }, { label: '3', value: '3' }] },
        background: { type: 'select', label: 'Section background', options: backgroundOptions },
        sectionImage: { ...imageField, label: 'Section image' },
        sectionImagePosition: { type: 'radio', label: 'Section image position', options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }, { label: 'Above', value: 'above' }] },
        item1Title: { type: 'text', label: 'Feature 1 title' }, item1Text: { type: 'text', label: 'Feature 1 text' }, item1Image: { ...imageField, label: 'Feature 1 image' },
        item2Title: { type: 'text', label: 'Feature 2 title' }, item2Text: { type: 'text', label: 'Feature 2 text' }, item2Image: { ...imageField, label: 'Feature 2 image' },
        item3Title: { type: 'text', label: 'Feature 3 title' }, item3Text: { type: 'text', label: 'Feature 3 text' }, item3Image: { ...imageField, label: 'Feature 3 image' },
        item4Title: { type: 'text', label: 'Feature 4 title' }, item4Text: { type: 'text', label: 'Feature 4 text' }, item4Image: { ...imageField, label: 'Feature 4 image' },
        item5Title: { type: 'text', label: 'Feature 5 title' }, item5Text: { type: 'text', label: 'Feature 5 text' }, item5Image: { ...imageField, label: 'Feature 5 image' },
        item6Title: { type: 'text', label: 'Feature 6 title' }, item6Text: { type: 'text', label: 'Feature 6 text' }, item6Image: { ...imageField, label: 'Feature 6 image' },
        item7Title: { type: 'text', label: 'Feature 7 title' }, item7Text: { type: 'text', label: 'Feature 7 text' }, item7Image: { ...imageField, label: 'Feature 7 image' },
        item8Title: { type: 'text', label: 'Feature 8 title' }, item8Text: { type: 'text', label: 'Feature 8 text' }, item8Image: { ...imageField, label: 'Feature 8 image' },
      },
      defaultProps: featuresGridDefaults,
      render: rawProps => {
        const props = { ...featuresGridDefaults, ...rawProps };
        const items = [
          [Store, props.item1Title, props.item1Text, props.item1Image],
          [Users, props.item2Title, props.item2Text, props.item2Image],
          [Smartphone, props.item3Title, props.item3Text, props.item3Image],
          [PackagePlus, props.item4Title, props.item4Text, props.item4Image],
          [ReceiptText, props.item5Title, props.item5Text, props.item5Image],
          [WalletCards, props.item6Title, props.item6Text, props.item6Image],
          [BarChart3, props.item7Title, props.item7Text, props.item7Image],
          [FileUp, props.item8Title, props.item8Text, props.item8Image],
        ];
        const introClass = `feature-section-intro align-${props.headingAlign || 'center'} ${props.sectionImage ? `with-media media-${props.sectionImagePosition || 'right'}` : ''}`;
        return <div className="jci-public-preview">
          <section className={`public-section editable-feature-section theme-${props.background || 'light'}`}>
            <div className={introClass}>
              <div className="section-heading">
                <span>{props.eyebrow}</span>
                <h2>{props.heading}</h2>
                <p>{props.text}</p>
              </div>
              {props.sectionImage && <div className="feature-section-image"><img src={props.sectionImage} alt=""/></div>}
            </div>
            <div className={`feature-grid public-feature-grid columns-${props.columns || '2'} cards-${props.cardAlign || 'left'}`}>
              {items.map(([Icon,title,copy,image], index) => <article key={index}>
                {image ? <img className="feature-card-image" src={image} alt=""/> : <Icon size={26}/>}
                <h3>{title}</h3><p>{copy}</p>
              </article>)}
            </div>
          </section>
        </div>;
      },
    },
    FeaturesAudienceBlock: {
      label: 'Store Types Grid',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Description' },
        headingAlign: { type: 'radio', label: 'Heading alignment', options: [{ label: 'Left', value: 'left' }, { label: 'Centre', value: 'center' }] },
        cardAlign: { type: 'radio', label: 'Card alignment', options: [{ label: 'Left', value: 'left' }, { label: 'Centre', value: 'center' }] },
        columns: { type: 'radio', label: 'Desktop columns', options: [{ label: '2', value: '2' }, { label: '3', value: '3' }] },
        background: { type: 'select', label: 'Section background', options: backgroundOptions },
        sectionImage: { ...imageField, label: 'Section image' },
        sectionImagePosition: { type: 'radio', label: 'Section image position', options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }, { label: 'Above', value: 'above' }] },
        item1Title: { type: 'text', label: 'Store type 1 title' }, item1Text: { type: 'text', label: 'Store type 1 text' }, item1Image: { ...imageField, label: 'Store type 1 image' },
        item2Title: { type: 'text', label: 'Store type 2 title' }, item2Text: { type: 'text', label: 'Store type 2 text' }, item2Image: { ...imageField, label: 'Store type 2 image' },
        item3Title: { type: 'text', label: 'Store type 3 title' }, item3Text: { type: 'text', label: 'Store type 3 text' }, item3Image: { ...imageField, label: 'Store type 3 image' },
        item4Title: { type: 'text', label: 'Store type 4 title' }, item4Text: { type: 'text', label: 'Store type 4 text' }, item4Image: { ...imageField, label: 'Store type 4 image' },
        item5Title: { type: 'text', label: 'Store type 5 title' }, item5Text: { type: 'text', label: 'Store type 5 text' }, item5Image: { ...imageField, label: 'Store type 5 image' },
        item6Title: { type: 'text', label: 'Store type 6 title' }, item6Text: { type: 'text', label: 'Store type 6 text' }, item6Image: { ...imageField, label: 'Store type 6 image' },
      },
      defaultProps: featuresAudienceDefaults,
      render: rawProps => {
        const props = { ...featuresAudienceDefaults, ...rawProps };
        const items = [
          [props.item1Title, props.item1Text, props.item1Image],
          [props.item2Title, props.item2Text, props.item2Image],
          [props.item3Title, props.item3Text, props.item3Image],
          [props.item4Title, props.item4Text, props.item4Image],
          [props.item5Title, props.item5Text, props.item5Image],
          [props.item6Title, props.item6Text, props.item6Image],
        ];
        const introClass = `feature-section-intro align-${props.headingAlign || 'center'} ${props.sectionImage ? `with-media media-${props.sectionImagePosition || 'right'}` : ''}`;
        return <div className="jci-public-preview">
          <section className={`public-section editable-feature-section theme-${props.background || 'light'}`}>
            <div className={introClass}>
              <div className="section-heading">
                <span>{props.eyebrow}</span>
                <h2>{props.heading}</h2>
                <p>{props.text}</p>
              </div>
              {props.sectionImage && <div className="feature-section-image"><img src={props.sectionImage} alt=""/></div>}
            </div>
            <div className={`feature-grid public-feature-grid columns-${props.columns || '2'} cards-${props.cardAlign || 'left'}`}>
              {items.map(([title,copy,image], index) => <article key={index}>
                {image && <img className="feature-card-image" src={image} alt=""/>}
                <h3>{title}</h3><p>{copy}</p>
              </article>)}
            </div>
          </section>
        </div>;
      },
    },
    FeaturesCtaBlock: {
      label: 'Features CTA',
      fields: {
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Text' },
        buttonText: { type: 'text', label: 'Button text' },
        buttonUrl: { type: 'text', label: 'Button link' },
      },
      defaultProps: featuresCtaDefaults,
      render: rawProps => {
        const props = { ...featuresCtaDefaults, ...rawProps };
        return <div className="jci-public-preview">
          <section className="public-cta">
            <h2>{props.heading}</h2>
            <p>{props.text}</p>
            <a className="public-button large" href={props.buttonUrl || '#'} onClick={previewClick}>{props.buttonText}</a>
          </section>
        </div>;
      },
    },
    HeroBlock: {
      label: 'Hero',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Description' },
        image: imageField,
        imageAlt: { type: 'text', label: 'Image alt text' },
        buttonText: { type: 'text', label: 'Button text' },
        buttonUrl: { type: 'text', label: 'Button link' },
        background: { type: 'select', label: 'Background', options: backgroundOptions },
      },
      defaultProps: {
        eyebrow: 'JustConsignIn',
        heading: 'Consignment management built for Shopify',
        text: 'Manage consignors, items, sales and payouts from one organized workflow.',
        image: '',
        imageAlt: '',
        buttonText: 'Start 14-Day Free Trial',
        buttonUrl: '/shopify-app',
        background: 'light',
      },
      render: props => <section className={`jci-builder-section jci-builder-hero theme-${props.background || 'light'}`}>
        <div className="jci-builder-hero-copy">
          {props.eyebrow && <p className="jci-builder-eyebrow">{props.eyebrow}</p>}
          <h1>{props.heading}</h1>
          <p>{props.text}</p>
          {props.buttonText && <a className="jci-builder-button" href={props.buttonUrl || '#'}>{props.buttonText}</a>}
        </div>
        <div className="jci-builder-hero-media">
          {props.image
            ? <img src={props.image} alt={props.imageAlt || ''}/>
            : <div className="jci-builder-placeholder"><ImageIcon size={34}/><span>Choose an image</span></div>}
        </div>
      </section>,
    },
    HeadingBlock: {
      label: 'Heading',
      fields: {
        text: { type: 'text', label: 'Heading' },
        level: {
          type: 'select',
          label: 'Size',
          options: [
            { label: 'Large', value: 'h2' },
            { label: 'Medium', value: 'h3' },
            { label: 'Small', value: 'h4' },
          ],
        },
        align: {
          type: 'radio',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Centre', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      },
      defaultProps: { text: 'Section heading', level: 'h2', align: 'left' },
      render: ({ text, level = 'h2', align = 'left' }) => {
        const Tag = level;
        return <div className="jci-builder-heading-wrap" style={{ textAlign: align }}><Tag>{text}</Tag></div>;
      },
    },
    TextBlock: {
      label: 'Text',
      fields: {
        text: { type: 'text', label: 'Text' },
        align: {
          type: 'radio',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Centre', value: 'center' },
          ],
        },
      },
      defaultProps: { text: 'Add your text here.', align: 'left' },
      render: ({ text, align = 'left' }) => <div className="jci-builder-text" style={{ textAlign: align }}><p>{text}</p></div>,
    },
    ImageBlock: {
      label: 'Image',
      fields: {
        image: imageField,
        alt: { type: 'text', label: 'Alt text' },
        width: {
          type: 'select',
          label: 'Width',
          options: [
            { label: '50%', value: '50' },
            { label: '75%', value: '75' },
            { label: '100%', value: '100' },
          ],
        },
      },
      defaultProps: { image: '', alt: '', width: '100' },
      render: ({ image, alt, width = '100' }) => <div className="jci-builder-image-wrap">
        {image
          ? <img src={image} alt={alt || ''} style={{ width: `${width}%` }}/>
          : <div className="jci-builder-placeholder"><ImageIcon size={34}/><span>Choose an image</span></div>}
      </div>,
    },
    ImageTextBlock: {
      label: 'Image + Text',
      fields: {
        image: imageField,
        alt: { type: 'text', label: 'Image alt text' },
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Text' },
        imagePosition: {
          type: 'radio',
          label: 'Image position',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ],
        },
        background: { type: 'select', label: 'Background', options: backgroundOptions },
      },
      defaultProps: {
        image: '',
        alt: '',
        heading: 'Create products from your phone',
        text: 'Replace this text with the finished copy for the section.',
        imagePosition: 'left',
        background: 'white',
      },
      render: ({ image, alt, heading, text, imagePosition = 'left', background = 'white' }) => <section className={`jci-builder-section jci-builder-image-text theme-${background} image-${imagePosition}`}>
        <div className="jci-builder-image-text-media">
          {image
            ? <img src={image} alt={alt || ''}/>
            : <div className="jci-builder-placeholder"><ImageIcon size={34}/><span>Choose an image</span></div>}
        </div>
        <div className="jci-builder-image-text-copy"><h2>{heading}</h2><p>{text}</p></div>
      </section>,
    },
    CtaBlock: {
      label: 'Call to Action',
      fields: {
        heading: { type: 'text', label: 'Heading' },
        text: { type: 'text', label: 'Text' },
        buttonText: { type: 'text', label: 'Button text' },
        buttonUrl: { type: 'text', label: 'Button link' },
        background: { type: 'select', label: 'Background', options: backgroundOptions },
      },
      defaultProps: {
        heading: 'Ready to simplify consignment?',
        text: 'Try JustConsignIn free for 14 days.',
        buttonText: 'Start Free Trial',
        buttonUrl: '/shopify-app',
        background: 'dark',
      },
      render: ({ heading, text, buttonText, buttonUrl, background = 'dark' }) => <section className={`jci-builder-section jci-builder-cta theme-${background}`}>
        <h2>{heading}</h2><p>{text}</p>
        {buttonText && <a className="jci-builder-button" href={buttonUrl || '#'}>{buttonText}</a>}
      </section>,
    },
  },
};

export const defaultSiteBuilderData = {
  content: [
    {
      type: 'HeroBlock',
      props: {
        id: 'hero-prototype',
        eyebrow: 'JustConsignIn',
        heading: 'Consignment management built for Shopify',
        text: 'This is a safe editor prototype. Change the text, replace the image, move sections and publish a draft without changing the live website.',
        image: '',
        imageAlt: '',
        buttonText: 'Start 14-Day Free Trial',
        buttonUrl: '/shopify-app',
        background: 'light',
      },
    },
    {
      type: 'ImageTextBlock',
      props: {
        id: 'phone-prototype',
        image: '',
        alt: '',
        heading: 'Create Shopify products from your phone',
        text: 'Choose an image from the existing Supabase media library or upload a new one directly inside the editor.',
        imagePosition: 'left',
        background: 'white',
      },
    },
  ],
  root: { props: {} },
};
