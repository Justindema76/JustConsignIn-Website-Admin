export default {
  key: 'sunwings',
  name: 'Sunwings Transport',
  adminLabel: 'Sunwings Transport',
  domain: 'sunwingstransport.ca',
  showSocialSidebar: true,
  navGroups: [
    {
      id: 'content',
      label: 'Content Management',
      items: [
        { to: '/admin/sunwings/services', label: 'Service Posts', icon: 'truck' },
        { to: '/admin/sunwings/locations', label: 'Location Posts', icon: 'map' },
        { to: '/admin/sunwings/blog', label: 'Moving Tips Posts', icon: 'book', ownerOnly: true },
        { to: '/admin/sunwings/media', label: 'Media', icon: 'image', ownerOnly: true },
      ],
    },
    {
      id: 'website',
      label: 'Website',
      items: [
        { to: '/admin/sunwings/pages', label: 'Pages', icon: 'panels', ownerOnly: true },
        { to: '/admin/sunwings/blocks', label: 'Block Library', icon: 'library', ownerOnly: true },
        { to: '/admin/sunwings/styles', label: 'Global Styles', icon: 'palette', ownerOnly: true },
        { to: '/admin/sunwings/global/header', label: 'Header', icon: 'panelTop', ownerOnly: true },
        { to: '/admin/sunwings/global/footer', label: 'Footer', icon: 'panelBottom', ownerOnly: true },
      ],
    },
    {
      id: 'social',
      label: 'Social & Marketing',
      items: [
        { to: '/admin/sunwings/social', label: 'Social Links', icon: 'link', ownerOnly: true },
        { to: '/admin/sunwings/social-posts', label: 'Social Posts', icon: 'sparkles', ownerOnly: true },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        { to: '/admin/sunwings/settings', label: 'Website Settings', icon: 'settings', ownerOnly: true },
        { to: '/admin/sunwings/integrations', label: 'Integrations', icon: 'plug' },
        { to: '/admin/sunwings/team', label: 'Team', icon: 'users', ownerOnly: true },
      ],
    },
    {
      id: 'leads',
      label: 'Leads',
      items: [
        { to: '/admin/sunwings/quotes', label: 'Quote Requests', icon: 'inbox' },
      ],
    },
  ],
  dashboard: {
    intro: 'Manage the Sunwings Transport website using the same shared admin template as the other sites.',
    quick: [
      { to: '/admin/sunwings/pages', icon: 'panels', title: 'Pages', copy: 'Edit main pages with the shared block editor', ownerOnly: true },
      { to: '/admin/sunwings/services', icon: 'truck', title: 'Service Posts', copy: 'Add and edit Sunwings services' },
      { to: '/admin/sunwings/locations', icon: 'map', title: 'Location Posts', copy: 'Add and edit service areas' },
      { to: '/admin/sunwings/blog', icon: 'book', title: 'Moving Tips Posts', copy: 'Add and edit moving articles', ownerOnly: true },
      { to: '/admin/sunwings/quotes', icon: 'inbox', title: 'Quote Requests', copy: 'Review incoming leads' },
    ],
    sections: [
      {
        id: 'content',
        title: 'Content',
        copy: 'Manage the structured content that belongs to Sunwings Transport.',
        items: [
          { to: '/admin/sunwings/services', icon: 'truck', title: 'Service Posts', copy: 'Create, edit, draft and publish services.' },
          { to: '/admin/sunwings/locations', icon: 'map', title: 'Location Posts', copy: 'Create, edit, draft and publish service areas.' },
          { to: '/admin/sunwings/blog', icon: 'book', title: 'Moving Tips Posts', copy: 'Create, edit, draft and publish moving articles.', ownerOnly: true },
          { to: '/admin/sunwings/media', icon: 'image', title: 'Media', copy: 'Manage reusable images and uploaded assets.', ownerOnly: true },
        ],
      },
      {
        id: 'website',
        title: 'Website',
        copy: 'Pages, reusable blocks and global website controls.',
        items: [
          { to: '/admin/sunwings/pages', icon: 'panels', title: 'Pages', copy: 'Open and edit the main public pages.', ownerOnly: true },
          { to: '/admin/sunwings/blocks', icon: 'library', title: 'Block Library', copy: 'Browse the reusable Sunwings page-builder blocks.', ownerOnly: true },
          { to: '/admin/sunwings/styles', icon: 'palette', title: 'Global Styles', copy: 'Control colours, typography, spacing, cards and buttons.', ownerOnly: true },
          { to: '/admin/sunwings/global/header', icon: 'panelTop', title: 'Header', copy: 'Edit the global Sunwings header.', ownerOnly: true },
          { to: '/admin/sunwings/global/footer', icon: 'panelBottom', title: 'Footer', copy: 'Edit the global Sunwings footer.', ownerOnly: true },
        ],
      },
      {
        id: 'social',
        title: 'Social & Settings',
        copy: 'Social profiles, content and website configuration.',
        items: [
          { to: '/admin/sunwings/social', icon: 'link', title: 'Social Links', copy: 'Manage Facebook, Instagram, LinkedIn, YouTube, TikTok and other social profile links.', ownerOnly: true },
          { to: '/admin/sunwings/social-posts', icon: 'sparkles', title: 'Social Posts', copy: 'Create, save, schedule and publish social content for Sunwings.', ownerOnly: true },
          { to: '/admin/sunwings/settings', icon: 'settings', title: 'Website Settings', copy: 'Manage Sunwings website configuration, SMTP and notification routing.', ownerOnly: true },
          { to: '/admin/sunwings/integrations', icon: 'plug', title: 'Integrations', copy: 'Connect Google Reviews and the Facebook Page feed.' },
          { to: '/admin/sunwings/team', icon: 'users', title: 'Team', copy: 'Add or remove who has access to this site.', ownerOnly: true },
        ],
      },
    ],
  },
};
