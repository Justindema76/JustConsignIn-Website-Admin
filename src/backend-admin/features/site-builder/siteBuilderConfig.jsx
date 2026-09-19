import { useEffect, useState } from 'react';
import { FieldLabel } from '@puckeditor/core';
import { Image as ImageIcon, Library, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import MediaPickerModal from '../social-automation/components/MediaPickerModal';
import { loadAdminMedia, uploadBlogImage } from '../../services/siteAdminService';

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
          placeholder="Image URL"
        />
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

export const siteBuilderConfig = {
  categories: {
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
