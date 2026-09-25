export default function CaseStudyButtonFields({
  draft,
  update,
  updateSection,
  backLabel = 'Back',
  backUrl = '',
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
    <h2>Hero buttons</h2>
    <p className="case-study-button-help">The same controls are used by Work Posts and AI Posts.</p>

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

      <label>Button style
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

      <label>Button style
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
  </div>;
}
