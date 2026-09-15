import { BLOCK_TYPES } from '../blockCatalog';

export default function BlockLibrary({ onAdd }) {
  return <aside className="content-builder-library site-admin-card">
    <div className="content-builder-panel-head">
      <h2>Add Blocks</h2>
      <p>Build the page from reusable sections.</p>
    </div>
    <div className="content-builder-block-list">
      {BLOCK_TYPES.map(({ type, label, icon: Icon }) => <button
        key={type}
        type="button"
        className="content-builder-block-button"
        onClick={() => onAdd(type)}
      >
        <Icon size={17}/>
        <span>{label}</span>
      </button>)}
    </div>
  </aside>;
}
