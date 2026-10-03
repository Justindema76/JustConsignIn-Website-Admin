export default {
  key: 'sunwings',
  name: 'Sunwings Transport',
  adminLabel: 'Sunwings Transport',
  domain: 'sunwingstransport.ca',
  showSocialSidebar: false,
  navGroups: [
    {
      id: 'content',
      label: 'Content Management',
      items: [
        { to: '/admin/sunwings/services', label: 'Service Posts', icon: 'truck' },
        { to: '/admin/sunwings/locations', label: 'Location Posts', icon: 'map' },
      ],
    },
    {
      id: 'leads',
      label: 'Leads',
      items: [
        { to: '/admin/sunwings/quotes', label: 'Quote Requests', icon: 'inbox' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        { to: '/admin/sunwings/settings', label: 'Sunwings Settings', icon: 'settings' },
      ],
    },
  ],
  dashboard: {
    intro: 'Manage only the content and leads that belong to Sunwings Transport.',
    quick: [
      { to: '/admin/sunwings/services', icon: 'truck', title: 'Service Posts', copy: 'Add and edit Sunwings services' },
      { to: '/admin/sunwings/locations', icon: 'map', title: 'Location Posts', copy: 'Add and edit service areas' },
      { to: '/admin/sunwings/quotes', icon: 'inbox', title: 'Quote Requests', copy: 'Review incoming transport leads' },
      { to: '/admin/sunwings/settings', icon: 'settings', title: 'Sunwings Settings', copy: 'Homepage banner and contact details' },
    ],
    sections: [
      {
        id: 'content',
        title: 'Sunwings Content',
        copy: 'Services and locations are entered as structured posts and rendered by the Sunwings frontend.',
        items: [
          { to: '/admin/sunwings/services', icon: 'truck', title: 'Service Posts', copy: 'Create, edit, draft and publish services.' },
          { to: '/admin/sunwings/locations', icon: 'map', title: 'Location Posts', copy: 'Create, edit, draft and publish locations.' },
        ],
      },
      {
        id: 'leads',
        title: 'Quote Requests',
        copy: 'Transport, moving and commercial enquiries submitted through the Sunwings website.',
        items: [
          { to: '/admin/sunwings/quotes', icon: 'inbox', title: 'Quote Requests', copy: 'Review new leads and update their status.' },
        ],
      },
      {
        id: 'settings',
        title: 'Website Settings',
        copy: 'Sunwings-specific homepage and contact settings only.',
        items: [
          { to: '/admin/sunwings/settings', icon: 'settings', title: 'Sunwings Settings', copy: 'Manage the main banner, phone, email and CTA.' },
        ],
      },
    ],
  },
};
