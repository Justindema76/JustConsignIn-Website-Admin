// Shopify Studio (justindematteis.com/shopify-studio): everything for the Studio in one dashboard —
// requests, pages, pricing, SEO, Shopify Tips, social, analytics and ChatGPT access.
// The page settings are stored on the justindematteis website (the pages are part of it), but are
// edited only from here. JustinDeMatteis.com's dashboard keeps only the main portfolio site.
export default {
  key: 'shopifystudio',
  name: 'Shopify Studio',
  adminLabel: 'Shopify Studio',
  domain: 'justindematteis.com/shopify-studio',
  navGroups: [
    {
      id: 'customers',
      label: 'Customers',
      items: [
        { to: '/admin/service-requests', label: 'Free Reviews & Quotes', icon: 'inbox' },
      ],
    },
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
        { to: '/admin/blog', label: 'Shopify Tips', icon: 'book' },
        { to: '/admin/videos', label: 'YouTube Videos', icon: 'video' },
        { to: '/admin/media', label: 'Media', icon: 'image' },
      ],
    },
    {
      id: 'social',
      label: 'Social & Marketing',
      items: [
        { to: '/admin/social-automation', label: 'Social Posts', icon: 'sparkles' },
        { to: '/admin/social', label: 'Social Links', icon: 'link' },
      ],
    },
    {
      id: 'website',
      label: 'Website',
      items: [
        { to: '/admin/shopify-studio', label: 'Pages, Pricing & SEO', icon: 'tags' },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      items: [
        { to: '/admin/studio-analytics', label: 'Analytics', icon: 'chart' },
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
    intro: 'Everything for Shopify Studio in one place: free reviews and quotes, Shopify Tips, social posts, pages, pricing, SEO and analytics.',
    quick: [
      { to: '/admin/service-requests', icon: 'inbox', title: 'Free Reviews & Quotes', copy: 'New requests from the Studio pages' },
      { to: '/admin/blog', icon: 'book', title: 'Shopify Tips', copy: 'Write, schedule and publish how-to articles' },
      { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Posts', copy: 'Create and schedule through Metricool' },
      { to: '/admin/studio-analytics', icon: 'chart', title: 'Analytics', copy: 'Visits, top tips and leads' },
    ],
    sections: [
      {
        id: 'website',
        title: 'Website',
        copy: 'The Shopify Studio pages on justindematteis.com.',
        items: [
          { to: '/admin/shopify-studio', icon: 'tags', title: 'Pages, Pricing & SEO', copy: 'Designs, prices, business details, SEO and footer links.' },
          { to: '/admin/content-calendar', icon: 'calendar', title: 'Content Calendar', copy: 'Every scheduled tip and post in one place.' },
          { to: '/admin/social', icon: 'link', title: 'Social Links', copy: 'The social icons in the Studio footer.' },
          { to: '/admin/studio-api', icon: 'plug', title: 'ChatGPT / API Access', copy: 'Let ChatGPT write drafts for you to approve.' },
        ],
      },
    ],
  },
};
