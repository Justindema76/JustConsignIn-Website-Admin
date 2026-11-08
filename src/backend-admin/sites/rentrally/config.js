// Rent & Rally (placeholder name): event and promo equipment rentals.
export default {
  key: 'rentrally',
  name: 'Rent & Rally',
  adminLabel: 'Rent & Rally',
  domain: 'rent-and-rally.vercel.app',
  showSocialSidebar: true,
  navGroups: [
    {
      id: 'catalogue',
      label: 'Catalogue',
      items: [
        { to: '/admin/rentrally/rentals', label: 'Rentals', icon: 'package' },
        { to: '/admin/rentrally/packages', label: 'Packages', icon: 'boxes' },
        { to: '/admin/rentrally/shop', label: 'Shop (buy & keep)', icon: 'tags' },
        { to: '/admin/rentrally/categories', label: 'Categories', icon: 'tags' },
      ],
    },
    {
      id: 'leads',
      label: 'Leads',
      items: [{ to: '/admin/rentrally/quotes', label: 'Quote Requests', icon: 'inbox' }],
    },
    {
      id: 'website',
      label: 'Website',
      items: [{ to: '/admin/website/pages', label: 'Pages', icon: 'panels', ownerOnly: true }],
    },
    {
      id: 'social',
      label: 'Social & Marketing',
      items: [
        { to: '/admin/social', label: 'Social Links', icon: 'link' },
        { to: '/admin/social-automation', label: 'Social Automation', icon: 'sparkles' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [{ to: '/admin/rentrally/settings', label: 'Website Settings', icon: 'settings', ownerOnly: true }],
    },
  ],
  dashboard: {
    intro: 'Manage Rent & Rally rentals, packages and incoming quote requests.',
    quick: [
      { to: '/admin/rentrally/quotes', icon: 'inbox', title: 'Quote Requests', copy: 'See and follow up on new rental quotes' },
      { to: '/admin/rentrally/rentals', icon: 'package', title: 'Rentals', copy: 'Prices, photos, specs and options' },
      { to: '/admin/rentrally/packages', icon: 'boxes', title: 'Packages', copy: 'Bundles and package pricing' },
      { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Automation', copy: 'Create and schedule posts' },
    ],
    sections: [
      {
        id: 'catalogue',
        title: 'Catalogue',
        copy: 'Everything a customer can rent.',
        items: [
          { to: '/admin/rentrally/rentals', icon: 'package', title: 'Rentals', copy: 'Add, edit, draft and publish rental items.' },
          { to: '/admin/rentrally/packages', icon: 'boxes', title: 'Packages', copy: 'Bundle rentals together at a package price.' },
          { to: '/admin/rentrally/categories', icon: 'tags', title: 'Categories', copy: 'Names, blurbs and tile photos for each category.' },
        ],
      },
      {
        id: 'leads',
        title: 'Leads & Settings',
        copy: 'Quotes from the website and site-wide details.',
        items: [
          { to: '/admin/rentrally/quotes', icon: 'inbox', title: 'Quote Requests', copy: 'Every quote request, with status, quoted price and notes.' },
          { to: '/admin/website/pages', icon: 'panels', title: 'Website Pages', copy: 'Drag-and-drop editor for the homepage and How It Works.', ownerOnly: true },
          { to: '/admin/rentrally/settings', icon: 'settings', title: 'Website Settings', copy: 'Top bar message, phone, hours, service areas and Google search.', ownerOnly: true },
        ],
      },
      {
        id: 'social',
        title: 'Social & Marketing',
        copy: 'Social profiles and posts.',
        items: [
          { to: '/admin/social', icon: 'link', title: 'Social Links', copy: 'Facebook, Instagram, TikTok, YouTube and LinkedIn links (shown in the website footer).' },
          { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Automation', copy: 'Create, schedule and publish posts.' },
        ],
      },
    ],
  },
};
