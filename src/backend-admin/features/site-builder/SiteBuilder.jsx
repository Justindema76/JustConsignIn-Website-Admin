import { useEffect, useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { ArrowLeft, CheckCircle2, ExternalLink, Image, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import {
  getAdminSiteKey,
  loadAdminGlobalStyles,
  loadAdminSitePage,
  publishAdminSitePage,
  saveAdminSitePageDraft,
} from '../../services/siteAdminService';
import { siteBuilderConfig } from './siteBuilderConfig';
import { getInitialPageBuilderData, getWebsitePage, getWebsitePages, livePageUrl } from './websitePages';
import { DEFAULT_GLOBAL_STYLES, globalStyleVars, normalizeGlobalStyles } from './globalStyles';
import './siteBuilder.css';

function storageKey(siteKey, pageId) {
  const version = siteKey === 'justconsignin' && pageId === 'features' ? 'v3' : 'v2';
  return `justinnovate-site-builder-${siteKey}-${pageId}-${version}`;
}

function readLocalDraft(siteKey, pageId) {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(storageKey(siteKey, pageId));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function writeLocalDraft(siteKey, pageId, data) {
  try {
    window.localStorage.setItem(storageKey(siteKey, pageId), JSON.stringify(data));
  } catch {}
}

function validatePublishData(page, data, siteKey) {
  const blocks = Array.isArray(data?.content) ? data.content : [];

  if (siteKey === 'justindematteis') {
    const allowed = new Set([
      'HeroBlock', 'HeadingBlock', 'TextBlock', 'ImageBlock', 'ImageTextBlock', 'CtaBlock', 'ProjectCardBlock',
      'ShowcaseHeroBlock', 'ProofStripBlock', 'CaseStudyBlock', 'CardGridBlock', 'StorySplitBlock', 'ProcessRowsBlock', 'SkillsGridBlock', 'LargeCtaBlock',
      'WorkExperiencePreviewBlock',
      'ResumeHeroBlock', 'ResumeSkillsBlock', 'ResumeWorkBlock', 'ResumeProjectsBlock', 'ResumeAiBlock', 'ResumeEducationBlock', 'ResumeAboutBlock', 'ResumeContactBlock'
    ]);
    const unsupported = blocks.map(block => block?.type).filter(type => type && !allowed.has(type));
    if (!blocks.length) throw new Error('This page needs at least one shared block before publishing.');
    if (unsupported.length) {
      throw new Error(`Portfolio publish blocked: remove unsupported site-specific blocks (${[...new Set(unsupported)].join(', ')}).`);
    }
    return;
  }
  const types = new Set(blocks.map(block => block?.type).filter(Boolean));
  const justinOnlyBlocks = new Set([
    'ShowcaseHeroBlock', 'ProofStripBlock', 'CaseStudyBlock', 'CardGridBlock', 'WorkExperiencePreviewBlock',
    'StorySplitBlock', 'ProcessRowsBlock', 'SkillsGridBlock', 'LargeCtaBlock',
  ]);
  const crossSiteBlocks = blocks
    .map(block => block?.type)
    .filter(type => type && justinOnlyBlocks.has(type));

  if (crossSiteBlocks.length) {
    throw new Error(`JustConsignIn publish blocked: remove Justin / Just Innovate site blocks (${[...new Set(crossSiteBlocks)].join(', ')}).`);
  }

  const requiredByPage = {
    home: ['HomeHeroBlock', 'HomeIntegrationBlock', 'HomeVideosBlock', 'HomeLinksBlock'],
    features: ['FeaturesHeroBlock', 'FeaturesGridBlock', 'FeaturesAudienceBlock', 'FeaturesCtaBlock'],
  };

  const required = requiredByPage[page.id];
  if (!required) {
    throw new Error(`${page.title} publish is temporarily blocked until its exact live React template is connected to the builder.`);
  }

  const missing = required.filter(type => !types.has(type));
  if (missing.length) {
    throw new Error(`${page.title} publish blocked: restore the live page sections before publishing.`);
  }
}

export default function SiteBuilder() {
  const { pageId = '' } = useParams();
  const navigate = useNavigate();
  const siteKey = getAdminSiteKey();
  const page = getWebsitePage(pageId, siteKey);
  const editorPages = useMemo(
    () => getWebsitePages(siteKey).filter(item => item.editor === 'visual'),
    [siteKey]
  );
  const { accessToken } = useAuth();

  if (!page) return <Navigate to="/admin/website/pages" replace />;
  if (page.editor !== 'visual') return <Navigate to="/admin/website/pages" replace />;

  const fallbackData = useMemo(() => getInitialPageBuilderData(page.id, siteKey), [page.id, siteKey]);
  const builderConfig = useMemo(() => {
    const standardBlocks = ['HeadingBlock', 'TextBlock', 'ImageBlock', 'ImageTextBlock', 'HeroBlock', 'CtaBlock', 'ProjectCardBlock'];
    const justConsignInBlocks = [
      'HomeHeroBlock', 'HomeIntegrationBlock', 'HomeVideosBlock', 'HomeLinksBlock',
      'FeaturesHeroBlock', 'FeaturesGridBlock', 'FeaturesAudienceBlock', 'FeaturesCtaBlock',
    ];
    const justinBlocks = [
      'ShowcaseHeroBlock', 'ProofStripBlock', 'CaseStudyBlock', 'CardGridBlock',
      'StorySplitBlock', 'ProcessRowsBlock', 'SkillsGridBlock', 'LargeCtaBlock',
    ];

    const resumeBlocks = [
      'ResumeHeroBlock', 'ResumeSkillsBlock', 'WorkExperiencePreviewBlock', 'ResumeProjectsBlock', 'ResumeAiBlock',
      'ResumeEducationBlock', 'ResumeAboutBlock', 'ResumeContactBlock',
    ];

    const resumeAliases = {
      ResumeHeroBlock: {
        base: 'HeroBlock',
        label: 'RESUME · Hero',
        defaultProps: {
          eyebrow: 'Portfolio · Résumé',
          heading: 'Justin DeMatteis',
          headingLevel: 'h1',
          accent: 'Web, Ecommerce & Application Developer',
          text: 'Developer with hands-on experience building and improving ecommerce platforms, Shopify applications, internal business tools and data-driven web applications. My background combines software development, ecommerce, SEO and practical workflow problem-solving.',
          primaryButtonText: 'View Work Experience →',
          primaryButtonUrl: '/work',
          secondaryButtonText: 'AI + Development',
          secondaryButtonUrl: '/ai-development',
          note: 'Ontario, Canada • Open to development opportunities',
          image: 'https://raw.githubusercontent.com/Justindema76/Justin-DeMatteis-Main-Site/main/public/images/projects/justconsignin-showcase.svg',
          imageAlt: 'JustConsignIn featured project',
          background: 'light',
        },
      },
      ResumeSkillsBlock: {
        base: 'SkillsGridBlock',
        label: 'RESUME · Skills',
        defaultProps: {
          eyebrow: 'Technical Skills',
          heading: 'Skills',
          headingLevel: 'h2',
          itemHeadingLevel: 'h4',
          text: 'Development, ecommerce, data, SEO and delivery skills used across real client work and application projects.',
          item1Title: 'Frontend Development',
          item1Text: 'HTML, CSS, JavaScript, React, Angular, TypeScript, Bootstrap, responsive UI and mobile-first development.',
          item2Title: 'Backend & Data',
          item2Text: 'Node, Express, PHP, MySQL, Supabase, REST APIs and data-driven application workflows.',
          item3Title: 'Ecommerce',
          item3Text: 'Shopify, Shopify POS, Adobe Commerce / Magento, WordPress, B2B ecommerce and product workflows.',
          item4Title: 'SEO & Digital',
          item4Text: 'Technical SEO, Google Search Console, analytics, product and category content, search visibility and ecommerce optimization.',
          item5Title: 'Development & Delivery',
          item5Text: 'Git, GitHub, Vercel, Linux, QA, debugging, testing and production deployment.',
          item6Title: 'AI-Assisted Development',
          item6Text: 'Research, architecture, prototyping, debugging, refactoring, documentation and faster iteration with AI tools.',
        },
      },
      ResumeWorkBlock: {
        base: 'SkillsGridBlock',
        label: 'RESUME · Work Experience',
        defaultProps: {
          eyebrow: 'Professional Experience',
          heading: 'Work Experience',
          headingLevel: 'h2',
          itemHeadingLevel: 'h4',
          text: 'Real operating businesses where I apply development, ecommerce, SEO and problem-solving skills.',
          item1Title: 'Wheels Automotive Dealer Supplies',
          item1Text: 'Adobe Commerce / Magento frontend and PageBuilder work, B2B account and checkout testing, QA, SEO, product/category content, launch support and vendor coordination.',
          item2Title: 'Jill & The Beanstalk',
          item2Text: 'Shopify management, technical and on-page SEO, ecommerce UX, product/category content, onsite search, reviews, integrations and ongoing optimization.',
          item3Title: 'JustConsignIn',
          item3Text: 'Product strategy, UX/UI and full-stack development for a Shopify consignment application connecting consignors, inventory, products, POS sales and payouts.',
          item4Title: 'Client Website Development',
          item4Text: 'Responsive WordPress and Elementor websites, forms, SEO, content integration, mobile usability and ongoing support for small businesses.',
          item5Title: '',
          item5Text: '',
          item6Title: '',
          item6Text: '',
        },
      },
      ResumeProjectsBlock: {
        base: 'SkillsGridBlock',
        label: 'RESUME · Projects',
        defaultProps: {
          eyebrow: 'Selected Projects',
          heading: 'Projects',
          headingLevel: 'h2',
          itemHeadingLevel: 'h4',
          text: 'Applications and systems built around real business workflows rather than portfolio-only mockups.',
          item1Title: 'JustConsignIn',
          item1Text: 'Shopify consignment management application with consignor intake, inventory, Shopify product creation, POS sales tracking, commissions and payouts.',
          item2Title: 'Website Admin & Content System',
          item2Text: 'Multi-site website administration tools for visual page editing, shared blocks, work posts, media, SEO content and global site controls.',
          item3Title: 'Shopify Product & Workflow Tools',
          item3Text: 'Custom ecommerce tooling and product workflows designed to reduce duplicate entry and connect business operations to Shopify.',
          item4Title: 'WordPress Client Sites',
          item4Text: 'Responsive small-business websites built with WordPress, Elementor, forms, SEO and maintainable client content.',
          item5Title: '',
          item5Text: '',
          item6Title: '',
          item6Text: '',
        },
      },
      ResumeAiBlock: {
        base: 'ProcessRowsBlock',
        label: 'RESUME · AI + Development',
        defaultProps: {
          eyebrow: 'AI + Development',
          heading: 'AI-assisted development',
          headingLevel: 'h2',
          rowHeadingLevel: 'h4',
          text: 'I use AI throughout the development process to move faster across research, architecture, prototyping, debugging and refinement while keeping product decisions and final direction human-led.',
          note: 'AI supports the workflow. The business problem, architecture, testing and product decisions still need human judgment.',
          row1Label: 'RESEARCH',
          row1Text: 'Explore technologies, requirements and implementation approaches quickly.',
          row2Label: 'ARCHITECTURE',
          row2Text: 'Break products into workflows, data structures, APIs and technical components.',
          row3Label: 'BUILD',
          row3Text: 'Accelerate frontend, backend, integrations and rapid prototyping.',
          row4Label: 'DEBUG',
          row4Text: 'Investigate failures, compare approaches and iterate faster.',
          row5Label: 'REFINE',
          row5Text: 'Improve UX, documentation, SEO, content and deployment workflows.',
        },
      },
      ResumeEducationBlock: {
        base: 'SkillsGridBlock',
        label: 'RESUME · Education',
        defaultProps: {
          eyebrow: 'Education & Training',
          heading: 'Education',
          headingLevel: 'h2',
          itemHeadingLevel: 'h4',
          text: 'Formal technical education combined with software, ecommerce and digital marketing training.',
          item1Title: 'triOS College',
          item1Text: 'Web & Mobile Developer diploma program, 2024–2025. Web, mobile, frontend, backend, databases and application development.',
          item2Title: 'Humber College',
          item2Text: 'Mechanical Engineering Technologist diploma, 1995–1998. Engineering design, manufacturing systems and technical problem-solving.',
          item3Title: 'Google Digital Marketing & E-commerce',
          item3Text: 'Professional certificate coursework covering digital marketing, ecommerce, analytics and online growth, 2025.',
          item4Title: 'Summit College',
          item4Text: 'Microsoft Office training, 2023.',
          item5Title: '',
          item5Text: '',
          item6Title: '',
          item6Text: '',
        },
      },
      ResumeAboutBlock: {
        base: 'StorySplitBlock',
        label: 'RESUME · About Summary',
        defaultProps: {
          leftEyebrow: 'Background',
          leftHeading: 'Engineering thinking applied to software.',
          leftHeadingLevel: 'h3',
          leftText1: 'My first career was in mechanical engineering technology, CNC machining and programming, and tool & die design. That work taught me to think in systems, understand tolerances and solve practical problems.',
          leftText2: 'I brought that same problem-solving mindset into web, mobile, ecommerce and application development.',
          rightEyebrow: 'What I Bring',
          rightHeading: 'Development that stays connected to the real workflow.',
          rightHeadingLevel: 'h2',
          pointHeadingLevel: 'h4',
          point1Title: 'Development',
          point1Text: 'Frontend, backend, APIs, databases and responsive interfaces.',
          point2Title: 'Ecommerce',
          point2Text: 'Shopify, Shopify POS, Adobe Commerce / Magento, WordPress and B2B workflows.',
          point3Title: 'Product Thinking',
          point3Text: 'Workflow mapping, UX decisions, data structure, testing and iteration around real users.',
          point4Title: 'Delivery',
          point4Text: 'GitHub, Vercel, QA, deployment, SEO, analytics and AI-assisted development.',
        },
      },
      ResumeContactBlock: {
        base: 'LargeCtaBlock',
        label: 'RESUME · Contact CTA',
        defaultProps: {
          eyebrow: 'Contact',
          heading: 'Looking for a developer who understands both the code and the workflow?',
          headingLevel: 'h2',
          buttonText: 'Get in touch →',
          buttonUrl: '/contact',
        },
      },
    };

    const allowedBlocks = siteKey === 'justindematteis'
      ? [...standardBlocks, ...justinBlocks, ...resumeBlocks]
      : [...standardBlocks, ...justConsignInBlocks];

    const allowedSet = new Set(allowedBlocks);
    const justConsignInSet = new Set(justConsignInBlocks);
    const justinSet = new Set(justinBlocks);
    const standardSet = new Set(standardBlocks);

    const components = Object.fromEntries(
      Object.entries(siteBuilderConfig.components)
        .filter(([name]) => allowedSet.has(name))
        .map(([name, definition]) => {
          const prefix = justinSet.has(name)
            ? 'JUSTIN'
            : justConsignInSet.has(name)
              ? 'JUSTCONSIGNIN'
              : standardSet.has(name)
                ? 'STANDARD'
                : '';
          return [name, {
            ...definition,
            label: prefix ? `${prefix} · ${definition.label || name}` : (definition.label || name),
          }];
        })
    );

    if (siteKey === 'justindematteis') {
      Object.entries(resumeAliases).forEach(([alias, config]) => {
        if (components[alias]) return;
        const base = siteBuilderConfig.components[config.base];
        if (!base) return;
        const defaultProps = config.defaultProps || base.defaultProps;
        components[alias] = {
          ...base,
          label: config.label,
          defaultProps,
        };
      });
    }

    if (siteKey === 'justindematteis') {
      const backgroundField = {
        type: 'select',
        label: 'Block background',
        options: [
          { label: 'White', value: 'white' },
          { label: 'Light', value: 'light' },
          { label: 'Page background', value: 'page' },
          { label: 'Dark', value: 'dark' },
          { label: 'Primary blue', value: 'primary' },
        ],
      };

      Object.entries(components).forEach(([name, definition]) => {
        const originalRender = definition.render;
        const originalFields = definition.fields || {};
        const fallbackBackground = ['HeroBlock','ResumeHeroBlock','ShowcaseHeroBlock','WorkExperiencePreviewBlock'].includes(name)
          ? 'light'
          : ['ProcessRowsBlock','ResumeAiBlock','CtaBlock'].includes(name)
            ? 'dark'
            : ['LargeCtaBlock','ResumeContactBlock'].includes(name)
              ? 'primary'
              : name === 'ProjectCardBlock'
                ? 'page'
                : 'white';
        const defaultBackground = definition.defaultProps?.background || fallbackBackground;

        components[name] = {
          ...definition,
          fields: {
            ...originalFields,
            background: backgroundField,
          },
          defaultProps: {
            ...(definition.defaultProps || {}),
            background: defaultBackground,
          },
          render: props => {
            const background = props.background || defaultBackground;
            const content = typeof originalRender === 'function' ? originalRender(props) : null;
            return <div
              className={`jci-builder-block-surface theme-${background} block-${name}`}
              data-block-type={name}
              data-block-background={background}
            >
              {content}
            </div>;
          },
        };
      });
    }

    const categories = siteKey === 'justindematteis'
      ? {
          resumeHomepage: {
            title: 'RESUME HOMEPAGE — New Draft Blocks',
            components: resumeBlocks,
          },
          justinShowcase: {
            title: 'JUSTIN / JUST INNOVATE — Site Blocks',
            components: justinBlocks,
          },
          standardContent: {
            title: 'STANDARD — Shared Content',
            components: ['HeadingBlock', 'TextBlock', 'ImageBlock', 'ImageTextBlock'],
          },
          standardMarketing: {
            title: 'STANDARD — Shared Marketing',
            components: ['HeroBlock', 'CtaBlock'],
          },
          standardProjects: {
            title: 'STANDARD — Projects / Work',
            components: ['ProjectCardBlock'],
          },
        }
      : {
          justConsignInHome: {
            title: 'JUSTCONSIGNIN — Homepage Blocks',
            components: ['HomeHeroBlock', 'HomeIntegrationBlock', 'HomeVideosBlock', 'HomeLinksBlock'],
          },
          justConsignInFeatures: {
            title: 'JUSTCONSIGNIN — Features Blocks',
            components: ['FeaturesHeroBlock', 'FeaturesGridBlock', 'FeaturesAudienceBlock', 'FeaturesCtaBlock'],
          },
          standardContent: {
            title: 'STANDARD — Shared Content',
            components: ['HeadingBlock', 'TextBlock', 'ImageBlock', 'ImageTextBlock'],
          },
          standardMarketing: {
            title: 'STANDARD — Shared Marketing',
            components: ['HeroBlock', 'CtaBlock'],
          },
          standardProjects: {
            title: 'STANDARD — Projects / Work',
            components: ['ProjectCardBlock'],
          },
        };

    return { ...siteBuilderConfig, categories, components };
  }, [siteKey]);
  const [initialData, setInitialData] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [savedAt, setSavedAt] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [globalStyles, setGlobalStyles] = useState(DEFAULT_GLOBAL_STYLES);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const [state, styleState] = await Promise.all([
          loadAdminSitePage(accessToken, page.id),
          loadAdminGlobalStyles(accessToken).catch(() => ({ value: null })),
        ]);
        if (!active) return;
        setGlobalStyles(normalizeGlobalStyles(styleState.value));

        let data = state.draft?.content || null;
        let migratedLocal = false;

        if (!data) {
          const localDraft = readLocalDraft(siteKey, page.id);
          if (localDraft) {
            data = localDraft;
            migratedLocal = true;
          }
        }

        data ||= fallbackData;
        setInitialData(data);
        setCurrentData(data);
        setSavedAt(state.draft?.updated_at || '');
        setPublishedAt(state.published?.published_at || '');

        if (migratedLocal) {
          try {
            const saved = await saveAdminSitePageDraft(accessToken, page, data);
            if (!active) return;
            setSavedAt(saved.draft?.updated_at || new Date().toISOString());
            setMessage('Your existing browser draft was moved into the website database.');
          } catch (migrationError) {
            if (!active) return;
            setError(migrationError.message || 'The local draft is loaded, but it could not be moved to the website database yet.');
          }
        }
      } catch (loadError) {
        if (!active) return;
        const localDraft = readLocalDraft(siteKey, page.id);
        const data = localDraft || fallbackData;
        setInitialData(data);
        setCurrentData(data);
        setError(loadError.message || 'Unable to load the saved website page.');
      } finally {
        if (active) setLoading(false);
      }
    }

    if (accessToken) load();
    return () => { active = false; };
  }, [accessToken, page.id, siteKey, fallbackData]);

  const handleChange = data => {
    setCurrentData(data);
    writeLocalDraft(siteKey, page.id, data);
  };

  const saveDraft = async () => {
    const data = currentData || initialData || fallbackData;
    setSavingDraft(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveAdminSitePageDraft(accessToken, page, data);
      const when = saved.draft?.updated_at || new Date().toISOString();
      setSavedAt(when);
      writeLocalDraft(siteKey, page.id, data);
      setMessage('Draft saved. The live website has not changed.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const publish = async data => {
    setPublishing(true);
    setError('');
    setMessage('');
    try {
      validatePublishData(page, data, siteKey);
      const saved = await publishAdminSitePage(accessToken, page, data);
      const draftWhen = saved.draft?.updated_at || new Date().toISOString();
      const publishWhen = saved.published?.published_at || new Date().toISOString();
      setCurrentData(data);
      setSavedAt(draftWhen);
      setPublishedAt(publishWhen);
      writeLocalDraft(siteKey, page.id, data);
      setMessage('Published. This page is now using this version on the public website.');
    } catch (publishError) {
      setError(publishError.message || 'Unable to publish the page.');
      throw publishError;
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setInitialData(fallbackData);
    setCurrentData(fallbackData);
    writeLocalDraft(siteKey, page.id, fallbackData);
    setMessage('Live website template content restored in the editor. Save Draft or Publish when you are ready.');
    setError('');
    setEditorKey(value => value + 1);
  };

  if (loading || !initialData) {
    return <div className="jci-site-builder-loading">
      <LoaderCircle className="jci-spin" size={26}/>
      <strong>Loading {page.title} editor…</strong>
    </div>;
  }

  return <div className="jci-site-builder-page">
    <div className="jci-builder-breadcrumb">
      <Link to="/admin/website/pages"><ArrowLeft size={14}/> Website Pages</Link>
      <span>/</span>
      <strong>{page.title}</strong>
    </div>

    <div className="site-admin-page-head jci-site-builder-head">
      <div>
        <p className="site-admin-eyebrow">Website · {page.path}</p>
        <h1>Edit {page.title}</h1>
        <p>Edit the page, save a private draft, and publish it to the live website when it is ready.</p>
        <label className="jci-builder-page-switcher">
          <span>Edit page</span>
          <select
            value={page.id}
            onChange={event => navigate(`/admin/website/pages/${event.target.value}`)}
            aria-label="Choose website page to edit"
          >
            {editorPages.map(item => (
              <option key={item.id} value={item.id}>
                {item.id.startsWith('work-') ? `Work → ${item.title.replace('Case Study — ', '')}` : item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="site-admin-actions">
        <button className="site-admin-btn" type="button" onClick={saveDraft} disabled={savingDraft || publishing}>
          {savingDraft ? <LoaderCircle className="jci-spin" size={14}/> : <Save size={14}/>}
          {savingDraft ? 'Saving…' : 'Save Draft'}
        </button>
        <Link className="site-admin-btn secondary" to="/admin/media"><Image size={15}/> Media Library</Link>
        <a className="site-admin-btn secondary" href={livePageUrl(page.path, siteKey)} target="_blank" rel="noreferrer">
          Open Live Page <ExternalLink size={13}/>
        </a>
        <button className="site-admin-btn secondary" type="button" onClick={reset}>
          <RotateCcw size={14}/> Restore Imported Content
        </button>
      </div>
    </div>

    <div className="jci-builder-notice">
      <strong>Live publishing is connected to the page template.</strong> The builder preview uses the same public layout and CSS. Use <strong>Save Draft</strong> for private changes and <strong>Publish</strong> only when the preview is correct.
      {savedAt && <span> Draft saved {new Date(savedAt).toLocaleString()}.</span>}
      {publishedAt && <span> Published {new Date(publishedAt).toLocaleString()}.</span>}
    </div>

    {message && <div className="jci-builder-message success"><CheckCircle2 size={17}/><span>{message}</span></div>}
    {error && <div className="jci-builder-message error"><span>{error}</span></div>}
    {publishing && <div className="jci-builder-message publishing"><LoaderCircle className="jci-spin" size={17}/><span>Publishing {page.title}…</span></div>}

    <div className="jci-puck-editor" style={globalStyleVars(globalStyles)}>
      <Puck
        key={`${siteKey}-${page.id}-${editorKey}`}
        config={builderConfig}
        data={initialData}
        headerTitle={page.title}
        headerPath={page.path}
        onChange={handleChange}
        onPublish={publish}
      />
    </div>
  </div>;
}
