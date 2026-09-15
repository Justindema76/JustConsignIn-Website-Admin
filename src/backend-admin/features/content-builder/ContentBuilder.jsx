import { useMemo, useState } from 'react';
import { Eye, Save } from 'lucide-react';
import BlockLibrary from './components/BlockLibrary';
import BuilderCanvas from './components/BuilderCanvas';
import BlockInspector from './components/BlockInspector';
import SeoPanel from './components/SeoPanel';
import { createBlock, SAMPLE_BLOCKS } from './blockCatalog';

const initialDocument = {
  title: 'How to Organize Consignment Drop-Offs Before They Become a Mess',
  slug: 'organize-consignment-drop-offs',
  status: 'draft',
  contentType: 'article',
};

const initialSeo = {
  title: 'How to Organize Consignment Drop-Offs | JustConsignIn',
  description: 'Learn how consignment stores can organize bags, boxes and intake inventory before it becomes a tracking problem.',
  primaryPhrase: 'consignment drop off organization',
  relatedPhrases: 'consignment intake process\norganize consignment inventory\nconsignment inventory tracking',
};

export default function ContentBuilder() {
  const [document, setDocument] = useState(initialDocument);
  const [blocks, setBlocks] = useState(SAMPLE_BLOCKS);
  const [selectedId, setSelectedId] = useState(SAMPLE_BLOCKS[0]?.id || '');
  const [panel, setPanel] = useState('block');
  const [seo, setSeo] = useState(initialSeo);
  const [message, setMessage] = useState('');
  const selectedBlock = useMemo(() => blocks.find(block => block.id === selectedId) || null, [blocks, selectedId]);

  const addBlock = type => {
    const block = createBlock(type);
    setBlocks(current => [...current, block]);
    setSelectedId(block.id);
    setPanel('block');
  };

  const moveBlock = (id, direction) => setBlocks(current => {
    const index = current.findIndex(block => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const duplicateBlock = id => setBlocks(current => {
    const index = current.findIndex(block => block.id === id);
    if (index < 0) return current;
    const source = current[index];
    const copy = { ...source, id: `${source.type}-${Date.now()}`, data: structuredClone(source.data) };
    const next = [...current];
    next.splice(index + 1, 0, copy);
    setSelectedId(copy.id);
    return next;
  });

  const removeBlock = id => setBlocks(current => {
    const index = current.findIndex(block => block.id === id);
    const next = current.filter(block => block.id !== id);
    if (selectedId === id) setSelectedId(next[Math.min(index, next.length - 1)]?.id || '');
    return next;
  });

  const updateBlock = (id, data) => setBlocks(current => current.map(block => block.id === id ? { ...block, data } : block));

  const showPreview = () => {
    setMessage('Preview will render this block document with the public website styles. Nothing is published from this prototype section.');
  };

  const savePrototype = () => {
    setMessage('This isolated builder section is not connected to production blog data yet. The existing blog system remains untouched.');
  };

  return <div className="content-builder-page">
    <div className="site-admin-page-head content-builder-page-head">
      <div>
        <p className="site-admin-eyebrow">New isolated section</p>
        <h1>Content Builder</h1>
        <p>Reusable blocks for articles first, with the structure ready to expand into pages, landing sections and banners.</p>
      </div>
      <div className="site-admin-actions">
        <button className="site-admin-btn secondary" type="button" onClick={showPreview}><Eye size={15}/> Preview</button>
        <button className="site-admin-btn" type="button" onClick={savePrototype}><Save size={15}/> Save Draft</button>
      </div>
    </div>

    {message && <div className="site-admin-alert success">{message}</div>}

    <section className="site-admin-card content-builder-document-settings">
      <label>Content type<select value={document.contentType} onChange={event => setDocument(current => ({ ...current, contentType: event.target.value }))}><option value="article">Blog Article</option><option value="page">Website Page</option><option value="landing">Landing Page</option><option value="banner">Banner / Promo Section</option></select></label>
      <label className="wide">Title<input value={document.title} onChange={event => setDocument(current => ({ ...current, title: event.target.value }))}/></label>
      <label>Slug<input value={document.slug} onChange={event => setDocument(current => ({ ...current, slug: event.target.value }))}/></label>
      <label>Status<select value={document.status} onChange={event => setDocument(current => ({ ...current, status: event.target.value }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
    </section>

    <div className="content-builder-layout">
      <BlockLibrary onAdd={addBlock}/>
      <BuilderCanvas
        blocks={blocks}
        selectedId={selectedId}
        onSelect={id => { setSelectedId(id); setPanel('block'); }}
        onMove={moveBlock}
        onDuplicate={duplicateBlock}
        onRemove={removeBlock}
      />
      <aside className="content-builder-inspector site-admin-card">
        <div className="content-builder-inspector-tabs">
          <button type="button" className={panel === 'block' ? 'active' : ''} onClick={() => setPanel('block')}>Block</button>
          <button type="button" className={panel === 'seo' ? 'active' : ''} onClick={() => setPanel('seo')}>SEO</button>
        </div>
        {panel === 'block'
          ? <BlockInspector block={selectedBlock} onChange={updateBlock}/>
          : <SeoPanel seo={seo} onChange={setSeo} blocks={blocks}/>
        }
      </aside>
    </div>
  </div>;
}
