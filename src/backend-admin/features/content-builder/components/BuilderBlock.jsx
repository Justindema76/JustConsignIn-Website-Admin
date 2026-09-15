import { Copy, GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

function BlockPreview({ block }) {
  const { type, data } = block;
  if (type === 'heading') {
    const Tag = data.level || 'h2';
    return <Tag>{data.text || 'Heading'}</Tag>;
  }
  if (type === 'paragraph') return <p>{data.text || 'Paragraph text'}</p>;
  if (type === 'image') return data.src
    ? <figure><img src={data.src} alt={data.alt || ''}/>{data.caption && <figcaption>{data.caption}</figcaption>}</figure>
    : <div className="content-builder-image-placeholder">Choose an image in the inspector</div>;
  if (type === 'gallery') return <div className="content-builder-placeholder">Gallery block · {(data.images || []).length} images</div>;
  if (type === 'video') return <div className="content-builder-placeholder">Video · {data.title || data.url || 'Add a video URL'}</div>;
  if (type === 'bullet-list' || type === 'numbered-list') {
    const Tag = type === 'numbered-list' ? 'ol' : 'ul';
    return <Tag>{(data.items || []).map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}</Tag>;
  }
  if (type === 'callout') return <blockquote>{data.text || 'Callout text'}</blockquote>;
  if (type === 'cta') return <button type="button" className="site-admin-btn">{data.text || 'Button'}</button>;
  if (type === 'related-links') return <div className="content-builder-placeholder">Related links · {(data.links || []).length} links</div>;
  if (type === 'table') return <div className="content-builder-placeholder">Table · {(data.columns || []).length} columns</div>;
  if (type === 'divider') return <hr/>;
  return <div className="content-builder-placeholder">{type}</div>;
}

export default function BuilderBlock({ block, selected, onSelect, onMove, onDuplicate, onRemove }) {
  return <article
    className={`content-builder-block ${selected ? 'selected' : ''}`}
    onClick={() => onSelect(block.id)}
  >
    <div className="content-builder-block-head">
      <div><GripVertical size={15}/><span>{block.type.replaceAll('-', ' ')}</span></div>
      <div className="content-builder-block-actions" onClick={event => event.stopPropagation()}>
        <button type="button" title="Move up" onClick={() => onMove(block.id, -1)}><ArrowUp size={14}/></button>
        <button type="button" title="Move down" onClick={() => onMove(block.id, 1)}><ArrowDown size={14}/></button>
        <button type="button" title="Duplicate" onClick={() => onDuplicate(block.id)}><Copy size={14}/></button>
        <button type="button" title="Delete" className="danger" onClick={() => onRemove(block.id)}><Trash2 size={14}/></button>
      </div>
    </div>
    <div className="content-builder-block-preview"><BlockPreview block={block}/></div>
  </article>;
}
