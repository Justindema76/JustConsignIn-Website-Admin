export default {
  key: 'justindematteis',
  name: 'Justin DeMatteis',
  adminLabel: 'JustinDeMatteis.com',
  domain: 'justindematteis.com',
  navGroups: [
    {
      id: 'projects',
      label: 'Projects & Quotes',
      items: [
        { to: '/admin/service-requests', label: 'Service Requests', icon: 'inbox' },
        { to: '/admin/departments', label: 'Departments', icon: 'building' },
      ],
    },
    {
      id: 'recruitment',
      label: 'Recruitment',
      items: [
        { to: '/admin/hiring-contacts', label: 'Hiring Contacts', icon: 'briefcase' },
      ],
    },
    {
      id: 'content',
      label: 'Content Management',
      items: [
        { to: '/admin/blog', label: 'Blog Posts', icon: 'book' },
        { to: '/admin/work-posts', label: 'Work Posts', icon: 'panels' },
        { to: '/admin/ai-posts', label: 'AI Posts', icon: 'sparkles' },
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
        { to: '/admin/website/global/project-request', label: 'Project Request Drawer', icon: 'inbox' },
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
    intro: 'Everything currently available in the JustinDeMatteis.com admin, organized in one place.',
    quick: [
      { to: '/admin/service-requests', icon: 'inbox', title: 'Service Requests', copy: 'Project and quote workflow' },
      { to: '/admin/hiring-contacts', icon: 'briefcase', title: 'Hiring Contacts', copy: 'Jobs, recruiters and interviews' },
      { to: '/admin/work-posts', icon: 'panels', title: 'Work Posts', copy: 'Work experience and case studies' },
      { to: '/admin/ai-posts', icon: 'sparkles', title: 'AI Posts', copy: 'AI + development project content' },
    ],
    sections: [
      {
        id: 'operations',
        title: 'Operations',
        copy: 'Departments and recruiter contacts.',
        items: [
          { to: '/admin/departments', icon: 'building', title: 'Departments', copy: 'Manage departments used to route project requests.' },
          { to: '/admin/hiring-contacts', icon: 'briefcase', title: 'Hiring Contacts', copy: 'Review employment enquiries separately from project work.' },
        ],
      },
      {
        id: 'content',
        title: 'Content',
        copy: 'Manage content that belongs to JustinDeMatteis.com.',
        items: [
          { to: '/admin/blog', icon: 'book', title: 'Blog Posts', copy: 'Create and manage articles.' },
          { to: '/admin/work-posts', icon: 'panels', title: 'Work Posts', copy: 'Manage work experience, case studies and project content.' },
          { to: '/admin/ai-posts', icon: 'sparkles', title: 'AI Posts', copy: 'Manage AI + development project content.' },
          { to: '/admin/videos', icon: 'video', title: 'YouTube Videos', copy: 'Manage videos and Shorts used by the site.' },
          { to: '/admin/media', icon: 'image', title: 'Media', copy: 'Manage reusable images, videos and uploaded assets.' },
        ],
      },
      {
        id: 'website',
        title: 'Website',
        copy: 'Pages, reusable blocks and global website controls.',
        items: [
          { to: '/admin/website/pages', icon: 'panels', title: 'Pages', copy: 'Open and edit public pages.' },
          { to: '/admin/website/blocks', icon: 'library', title: 'Block Library', copy: 'See reusable page-builder blocks.' },
          { to: '/admin/website/styles', icon: 'palette', title: 'Global Styles', copy: 'Control colours, typography, spacing, cards and buttons.' },
          { to: '/admin/website/global/header', icon: 'panelTop', title: 'Header', copy: 'Edit the global website header.' },
          { to: '/admin/website/global/project-request', icon: 'inbox', title: 'Project Request Drawer', copy: 'Edit the Start a Project form.' },
          { to: '/admin/website/global/footer', icon: 'panelBottom', title: 'Footer', copy: 'Edit the global website footer.' },
        ],
      },
      {
        id: 'tools',
        title: 'Social & Settings',
        copy: 'Social links, automation and website configuration.',
        items: [
          { to: '/admin/social', icon: 'link', title: 'Social Links', copy: 'Manage the social links used by the website.' },
          { to: '/admin/social-automation', icon: 'sparkles', title: 'Social Automation', copy: 'Create, schedule and publish social content.' },
          { to: '/admin/settings', icon: 'settings', title: 'Website Settings', copy: 'Manage email, notification routing and website services.' },
        ],
      },
    ],
  },
};
