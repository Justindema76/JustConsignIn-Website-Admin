import {
  Heading2,
  Image,
  Images,
  Link2,
  List,
  ListOrdered,
  Minus,
  MousePointerClick,
  Pilcrow,
  Quote,
  Table2,
  Video,
} from 'lucide-react';

export const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: Heading2 },
  { type: 'paragraph', label: 'Paragraph', icon: Pilcrow },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'gallery', label: 'Gallery', icon: Images },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'bullet-list', label: 'Bullet List', icon: List },
  { type: 'numbered-list', label: 'Numbered List', icon: ListOrdered },
  { type: 'callout', label: 'Callout', icon: Quote },
  { type: 'cta', label: 'Button / CTA', icon: MousePointerClick },
  { type: 'related-links', label: 'Related Links', icon: Link2 },
  { type: 'table', label: 'Table', icon: Table2 },
  { type: 'divider', label: 'Divider', icon: Minus },
];

const defaults = {
  heading: { level: 'h2', text: 'New heading' },
  paragraph: { text: 'Write your paragraph here.' },
  image: { src: '', alt: '', caption: '' },
  gallery: { images: [] },
  video: { url: '', title: '' },
  'bullet-list': { items: ['First point', 'Second point'] },
  'numbered-list': { items: ['First step', 'Second step'] },
  callout: { text: 'Highlight an important point.' },
  cta: { text: 'Learn More', url: '/', style: 'primary' },
  'related-links': { links: [] },
  table: { columns: ['Column 1', 'Column 2'], rows: [['', '']] },
  divider: {},
};

export function createBlock(type) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    data: structuredClone(defaults[type] || {}),
  };
}

export const SAMPLE_BLOCKS = [
  { id: 'sample-heading', type: 'heading', data: { level: 'h2', text: 'The Consignment Drop-Off Challenge' } },
  { id: 'sample-paragraph', type: 'paragraph', data: { text: 'Bags, boxes and totes pile up quickly. A good intake workflow keeps every drop-off tied to the right consignor and makes it obvious what still needs to be sorted.' } },
  { id: 'sample-list', type: 'bullet-list', data: { items: ['Create a drop-off batch', 'Label every bag, box or tote', 'Track the physical storage location', 'Process items when staff have time'] } },
  { id: 'sample-cta', type: 'cta', data: { text: 'See How JustConsignIn Works', url: '/how-it-works', style: 'primary' } },
];
