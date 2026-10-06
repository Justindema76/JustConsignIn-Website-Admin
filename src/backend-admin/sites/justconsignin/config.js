export default {
  key: 'justconsignin',
  name: 'JustConsignIn',
  adminLabel: 'JustConsignIn',
  domain: 'justconsignin.com',
  navGroups: [
    {
      id: 'leads',
      label: 'Leads & Growth',
      items: [
        { to: '/admin/demo-requests', label: 'Demo Requests', icon: 'inbox' },
        { to: '/admin/beta-partners', label: 'Beta Partners', icon: 'handshake' },
        { to: '/admin/outreach', label: 'Outreach Map', icon: 'map' },
      ],
    },
    {
      id: 'content',
      label: 'Content Management',
      items: [
        { to: '/admin/blog', label: 'Blog Posts', icon: 'book' },
        { to: '/admin/videos', label: 'YouTube Videos', icon: 'video' },
        { to: '/admin/media', label: 'Media', icon: 'image' },
      ],
    },
    {
      id: 'website',
      label: 'Website',
      items: [
        { to: '/admin/website/pages', label: 'Pages', icon: 'panels' },
        { to: '/admin/website/blocks', label: 'Block Library', icon: 'library' },
        { to: '/admin/website/styles', label: 'Global Styles', icon: 'palette' },
        { to: '/admin/website/global/header', label: 'Header', icon: 'panelTop' },
        { to: '/admin/website/global/footer', label: 'Footer', icon: 'panelBottom' },
      ],
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
      items: [
        { to: '/admin/settings', label: 'Website Settings', icon: 'settings' },
      ],
    },
  ],
  dashboard: {
    intro: 'Everything currently available in the JustConsignIn admin, organized in one place.',
    quick: [
      { to: '/admin/demo-requests', icon: 'inbox', title: 'Demo Requests', copy: 'New demo leads' },
      { to: '/admin/beta-partners', icon: 'handshake', title: 'Beta Partners', copy: 'Founding Partner workflow' },
      { to: '/admin/website/pages', icon: 'panels', title: 'Pages', copy: 'Edit public pages' },
      { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Automation', copy: 'Create and schedule content' },
    ],
    sections: [
      {
        id: 'content',
        title: 'Content',
        copy: 'Manage content that belongs to JustConsignIn.',
        items: [
          { to: '/admin/blog', icon: 'book', title: 'Blog Posts', copy: 'Create and manage articles.' },
          { to: '/admin/videos', icon: 'video', title: 'YouTube Videos', copy: 'Manage videos and Shorts.' },
          { to: '/admin/media', icon: 'image', title: 'Media', copy: 'Manage reusable images and uploaded assets.' },
        ],
      },
      {
        id: 'website',
        title: 'Website',
        copy: 'Pages, reusable blocks and global website controls.',
        items: [
          { to: '/admin/website/pages', icon: 'panels', title: 'Pages', copy: 'Open and edit public pages.' },
          { to: '/admin/website/blocks', icon: 'library', title: 'Block Library', copy: 'Browse reusable page-builder blocks.' },
          { to: '/admin/website/styles', icon: 'palette', title: 'Global Styles', copy: 'Control site-wide visual styles.' },
          { to: '/admin/website/global/header', icon: 'panelTop', title: 'Header', copy: 'Edit the global header.' },
          { to: '/admin/website/global/footer', icon: 'panelBottom', title: 'Footer', copy: 'Edit the global footer.' },
        ],
      },
      {
        id: 'tools',
        title: 'Growth, Social & Settings',
        copy: 'Beta partners, outreach, social tools and website configuration.',
        items: [
          { to: '/admin/beta-partners', icon: 'handshake', title: 'Beta Partners', copy: 'Manage Founding Partner applications and active testing.' },
          { to: '/admin/outreach', icon: 'map', title: 'Outreach Map', copy: 'Track consignment-shop leads and outreach activity.' },
          { to: '/admin/social', icon: 'link', title: 'Social Links', copy: 'Manage website social links.' },
          { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Automation', copy: 'Create and schedule social content.' },
          { to: '/admin/settings', icon: 'settings', title: 'Website Settings', copy: 'Manage email and shared website services.' },
        ],
      },
    ],
  },
};
