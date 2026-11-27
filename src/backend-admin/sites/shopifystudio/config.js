// Shopify Studio (justindematteis.com/shopify-studio): its own content, social and Metricool brand,
// kept separate from the main portfolio, JustConsignIn, Sunwings and Rent & Rally.
// Pricing, business details, SEO and the free-review inbox stay on the JustinDeMatteis.com site
// (Website → Shopify Studio, Service Requests) because the pages are part of that website.
export default {
  key: 'shopifystudio',
  name: 'Shopify Studio',
  adminLabel: 'Shopify Studio',
  domain: 'justindematteis.com/shopify-studio',
  navGroups: [
    {
      id: 'plan',
      label: 'Planning',
      items: [
        { to: '/admin/content-calendar', label: 'Content Calendar', icon: 'calendar' },
      ],
    },
    {
      id: 'content',
      label: 'Content',
      items: [
        { to: '/admin/blog', label: 'Blog Posts', icon: 'book' },
        { to: '/admin/videos', label: 'YouTube Videos', icon: 'video' },
        { to: '/admin/media', label: 'Media', icon: 'image' },
      ],
    },
    {
      id: 'social',
      label: 'Social & Marketing',
      items: [
        { to: '/admin/social-automation', label: 'Social Posts', icon: 'sparkles' },
      ],
    },
    {
      id: 'business',
      label: 'Business (on JustinDeMatteis.com)',
      items: [
        { to: '/admin/go?site=justindematteis&to=/admin/shopify-studio', label: 'Pricing, SEO & Business', icon: 'tags' },
        { to: '/admin/go?site=justindematteis&to=/admin/service-requests', label: 'Free Reviews & Quotes', icon: 'inbox' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        { to: '/admin/studio-api', label: 'ChatGPT / API Access', icon: 'plug' },
      ],
    },
  ],
  dashboard: {
    intro: 'Shopify Studio marketing: blog, social posts, videos and the content calendar. Pricing, business details and SEO are under JustinDeMatteis.com → Website → Shopify Studio.',
    quick: [
      { to: '/admin/content-calendar', icon: 'calendar', title: 'Content Calendar', copy: 'Everything scheduled, in one place' },
      { to: '/admin/blog', icon: 'book', title: 'Blog Posts', copy: 'Write, schedule and publish articles' },
      { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Posts', copy: 'Create and schedule through Metricool' },
    ],
    sections: [],
  },
};
