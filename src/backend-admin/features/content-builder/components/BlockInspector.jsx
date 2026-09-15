function Field({ label, children }) {
  return <label className="content-builder-field"><span>{label}</span>{children}</label>;
}

function TextListEditor({ items = [], onChange }) {
  const value = items.join('\n');
  return <textarea
    rows="7"
    value={value}
    onChange={event => onChange(event.target.value.split('\n'))}
    placeholder="One item per line"
  />;
}

export default function BlockInspector({ block, onChange }) {
  if (!block) return <div className="content-builder-inspector-empty">
    <strong>Select a block</strong>
    <p>Its controls will appear here without cluttering the canvas.</p>
  </div>;

  const update = (key, value) => onChange(block.id, { ...block.data, [key]: value });
  const { type, data } = block;

  return <div className="content-builder-inspector-fields">
    <div className="content-builder-inspector-type">{type.replaceAll('-', ' ')}</div>

    {type === 'heading' && <>
      <Field label="Heading level"><select value={data.level || 'h2'} onChange={event => update('level', event.target.value)}><option value="h2">H2</option><option value="h3">H3</option><option value="h4">H4</option></select></Field>
      <Field label="Heading text"><textarea rows="4" value={data.text || ''} onChange={event => update('text', event.target.value)}/></Field>
    </>}

    {type === 'paragraph' && <Field label="Paragraph"><textarea rows="9" value={data.text || ''} onChange={event => update('text', event.target.value)}/></Field>}

    {type === 'image' && <>
      <Field label="Image URL"><input value={data.src || ''} onChange={event => update('src', event.target.value)} placeholder="Choose from Media Library or paste a URL"/></Field>
      <Field label="Alt text"><input value={data.alt || ''} onChange={event => update('alt', event.target.value)} placeholder="Describe the image for accessibility and search"/></Field>
      <Field label="Caption"><textarea rows="3" value={data.caption || ''} onChange={event => update('caption', event.target.value)} /></Field>
    </>}

    {(type === 'bullet-list' || type === 'numbered-list') && <Field label="Items"><TextListEditor items={data.items || []} onChange={items => update('items', items)}/></Field>}

    {type === 'callout' && <Field label="Callout text"><textarea rows="6" value={data.text || ''} onChange={event => update('text', event.target.value)}/></Field>}

    {type === 'cta' && <>
      <Field label="Button text"><input value={data.text || ''} onChange={event => update('text', event.target.value)}/></Field>
      <Field label="Destination URL"><input value={data.url || ''} onChange={event => update('url', event.target.value)}/></Field>
      <Field label="Button style"><select value={data.style || 'primary'} onChange={event => update('style', event.target.value)}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></Field>
    </>}

    {type === 'video' && <>
      <Field label="Video URL"><input value={data.url || ''} onChange={event => update('url', event.target.value)} placeholder="YouTube or video URL"/></Field>
      <Field label="Accessible title"><input value={data.title || ''} onChange={event => update('title', event.target.value)}/></Field>
    </>}

    {type === 'gallery' && <p className="content-builder-help">Gallery media controls will use the shared Media Library rather than a separate upload system.</p>}
    {type === 'related-links' && <p className="content-builder-help">Related links will use internal website and blog URLs so articles can be connected without hand-building HTML.</p>}
    {type === 'table' && <p className="content-builder-help">Table row and column controls will live here so tables stay editable instead of being pasted HTML.</p>}
    {type === 'divider' && <p className="content-builder-help">Divider has no content settings.</p>}
  </div>;
}
