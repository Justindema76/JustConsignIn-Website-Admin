// Rent & Rally (placeholder name): event and promo equipment rentals.
export default {
  key: 'rentrally',
  name: 'Rent & Rally',
  adminLabel: 'Rent & Rally',
  domain: 'rent-and-rally.vercel.app',
  showSocialSidebar: false,
  navGroups: [
    {
      id: 'catalogue',
      label: 'Catalogue',
      items: [
        { to: '/admin/rentrally/rentals', label: 'Rentals', icon: 'package' },
        { to: '/admin/rentrally/packages', label: 'Packages', icon: 'boxes' },
        { to: '/admin/rentrally/categories', label: 'Categories', icon: 'tags' },
      ],
    },
    {
      id: 'leads',
      label: 'Leads',
      items: [{ to: '/admin/rentrally/quotes', label: 'Quote Requests', icon: 'inbox' }],
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
          { to: '/admin/rentrally/settings', icon: 'settings', title: 'Website Settings', copy: 'Top bar message, homepage hero, phone, hours and service areas.', ownerOnly: true },
        ],
      },
    ],
  },
};
