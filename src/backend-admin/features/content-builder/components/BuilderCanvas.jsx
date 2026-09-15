import BuilderBlock from './BuilderBlock';

export default function BuilderCanvas({ blocks, selectedId, onSelect, onMove, onDuplicate, onRemove }) {
  return <section className="content-builder-canvas site-admin-card">
    <div className="content-builder-panel-head canvas-head">
      <div>
        <h2>Page Canvas</h2>
        <p>Click a block to edit it. Reorder, duplicate or remove blocks without touching the rest of the page.</p>
      </div>
    </div>
    <div className={`content-builder-dropzone ${blocks.length ? '' : 'empty'}`}>
      {blocks.map(block => <BuilderBlock
        key={block.id}
        block={block}
        selected={selectedId === block.id}
        onSelect={onSelect}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />)}
      {!blocks.length && <div className="content-builder-empty-canvas">
        <strong>No blocks yet</strong>
        <p>Add a block from the left to start building.</p>
      </div>}
    </div>
  </section>;
}
