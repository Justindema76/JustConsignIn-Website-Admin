export default function CaseStudyButtonFields({
  draft,
  update,
  updateSection,
  backLabel = 'Back',
  backUrl = '',
  relatedEyebrowDefault = 'More',
  relatedHeadingDefault = 'Related projects',
  ctaTextDefault = 'This case study can continue growing as the project changes.',
}) {
  const sections = draft?.sections || {};

  const primaryEnabled = sections.heroPrimaryEnabled !== false;
  const primaryText = sections.heroPrimaryText ?? '';
  const primaryUrl = sections.heroPrimaryUrl ?? draft?.projectUrl ?? '';
  const primaryStyle = sections.heroPrimaryStyle || 'primary';
  const primaryNewTab = sections.heroPrimaryNewTab !== false;

  const secondaryEnabled = sections.heroSecondaryEnabled !== false;
  const secondaryText = sections.heroSecondaryText ?? backLabel;
  const secondaryUrl = sections.heroSecondaryUrl ?? backUrl;
  const secondaryStyle = sections.heroSecondaryStyle || 'secondary';
  const secondaryNewTab = sections.heroSecondaryNewTab === true;

  const updatePrimaryUrl = value => {
    updateSection('heroPrimaryUrl', value);
    update('projectUrl', value);
  };

  return <div className="site-admin-card site-admin-side-card case-study-button-controls">
    <h2>Case study controls</h2>
    <p className="case-study-button-help">
      Button colours, height and corner radius come from Global Styles. These controls only change this case study's content, links and visibility.
    </p>

    <div className="case-study-control-section">
      <h3>Hero buttons</h3>

      <div className="case-study-button-group">
        <div className="case-study-button-group-head">
          <strong>Button 1</strong>
          <label className="case-study-button-toggle">
            <input
              type="checkbox"
              checked={primaryEnabled}
              onChange={event => updateSection('heroPrimaryEnabled', event.target.checked)}
            />
            Show
          </label>
        </div>

        <label>Button text
          <input
            value={primaryText}
            onChange={event => updateSection('heroPrimaryText', event.target.value)}
            placeholder={draft?.company ? `Visit ${draft.company} →` : 'Visit project →'}
          />
        </label>

        <label>Button URL
          <input
            value={primaryUrl}
            onChange={event => updatePrimaryUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>Button type
          <select value={primaryStyle} onChange={event => updateSection('heroPrimaryStyle', event.target.value)}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
        </label>

        <label className="case-study-button-check">
          <input
            type="checkbox"
            checked={primaryNewTab}
            onChange={event => updateSection('heroPrimaryNewTab', event.target.checked)}
          />
          Open in new tab
        </label>
      </div>

      <div className="case-study-button-group">
        <div className="case-study-button-group-head">
          <strong>Button 2</strong>
          <label className="case-study-button-toggle">
            <input
              type="checkbox"
              checked={secondaryEnabled}
              onChange={event => updateSection('heroSecondaryEnabled', event.target.checked)}
            />
            Show
          </label>
        </div>

        <label>Button text
          <input
            value={secondaryText}
            onChange={event => updateSection('heroSecondaryText', event.target.value)}
            placeholder={backLabel}
          />
        </label>

        <label>Button URL
          <input
            value={secondaryUrl}
            onChange={event => updateSection('heroSecondaryUrl', event.target.value)}
            placeholder={backUrl || '/'}
          />
        </label>

        <label>Button type
          <select value={secondaryStyle} onChange={event => updateSection('heroSecondaryStyle', event.target.value)}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
        </label>

        <label className="case-study-button-check">
          <input
            type="checkbox"
            checked={secondaryNewTab}
            onChange={event => updateSection('heroSecondaryNewTab', event.target.checked)}
          />
          Open in new tab
        </label>
      </div>
    </div>

    <div className="case-study-control-section">
      <div className="case-study-button-group-head">
        <h3>Technology section</h3>
        <label className="case-study-button-toggle">
          <input
            type="checkbox"
            checked={sections.techEnabled !== false}
            onChange={event => updateSection('techEnabled', event.target.checked)}
          />
          Show
        </label>
      </div>
      <label>Eyebrow
        <input
          value={sections.techEyebrow ?? ''}
          onChange={event => updateSection('techEyebrow', event.target.value)}
          placeholder="Technology"
        />
      </label>
      <label>Heading
        <input
          value={sections.techHeading ?? ''}
          onChange={event => updateSection('techHeading', event.target.value)}
          placeholder="What I used to build it."
        />
      </label>
    </div>

    <div className="case-study-control-section">
      <div className="case-study-button-group-head">
        <h3>Bottom CTA</h3>
        <label className="case-study-button-toggle">
          <input
            type="checkbox"
            checked={sections.footerCtaEnabled !== false}
            onChange={event => updateSection('footerCtaEnabled', event.target.checked)}
          />
          Show
        </label>
      </div>

      <label>Eyebrow
        <input
          value={sections.footerCtaEyebrow ?? ''}
          onChange={event => updateSection('footerCtaEyebrow', event.target.value)}
          placeholder="Live Product"
        />
      </label>
      <label>Heading
        <input
          value={sections.footerCtaHeading ?? ''}
          onChange={event => updateSection('footerCtaHeading', event.target.value)}
          placeholder={draft?.company ? `See ${draft.company} in action.` : 'See the project in action.'}
        />
      </label>
      <label>Description
        <textarea
          rows="3"
          value={sections.footerCtaText ?? ''}
          onChange={event => updateSection('footerCtaText', event.target.value)}
          placeholder={ctaTextDefault}
        />
      </label>
      <label>Button text
        <input
          value={sections.footerCtaButtonText ?? ''}
          onChange={event => updateSection('footerCtaButtonText', event.target.value)}
          placeholder={draft?.company ? `Visit ${draft.company} →` : 'Visit project →'}
        />
      </label>
      <label>Button URL
        <input
          value={sections.footerCtaButtonUrl ?? ''}
          onChange={event => updateSection('footerCtaButtonUrl', event.target.value)}
          placeholder={draft?.projectUrl || 'https://...'}
        />
      </label>
    </div>

    <div className="case-study-control-section">
      <div className="case-study-button-group-head">
        <h3>Related projects</h3>
        <label className="case-study-button-toggle">
          <input
            type="checkbox"
            checked={sections.relatedEnabled !== false}
            onChange={event => updateSection('relatedEnabled', event.target.checked)}
          />
          Show
        </label>
      </div>

      <label>Eyebrow
        <input
          value={sections.relatedEyebrow ?? ''}
          onChange={event => updateSection('relatedEyebrow', event.target.value)}
          placeholder={relatedEyebrowDefault}
        />
      </label>
      <label>Heading
        <input
          value={sections.relatedHeading ?? ''}
          onChange={event => updateSection('relatedHeading', event.target.value)}
          placeholder={relatedHeadingDefault}
        />
      </label>
      <label>Related post slugs
        <input
          value={sections.relatedSlugs ?? ''}
          onChange={event => updateSection('relatedSlugs', event.target.value)}
          placeholder="Leave blank for automatic, or enter up to 3 slugs separated by commas"
        />
      </label>
    </div>
  </div>;
}
