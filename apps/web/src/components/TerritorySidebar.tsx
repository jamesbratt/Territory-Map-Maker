import { useState, type ReactNode } from 'react';
import { COLORS, type Territory } from '../lib/territories';

type Props = {
  locationPanel?: ReactNode;
  markerCounts: Record<string, number> | null;
  territories: Territory[]; activeId: string | null; ready: boolean;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string) => void;
  onUpdate: (territory: Territory) => void;
  onDelete: (id: string) => void;
};

export function TerritorySidebar({ territories, activeId, ready, onSelect, onCreate, onUpdate, onDelete, locationPanel, markerCounts }: Props) {
  const [tab, setTab] = useState<'territories' | 'sales'>('territories');
  function selectTab(next: 'territories' | 'sales') {
    setTab(next);
    if (next === 'sales') onSelect(null);
  }
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const active = territories.find((t) => t.id === activeId);
  return <aside className="sidebar" aria-label="Map workspace">
    <div className="sidebar-tabs" role="tablist" aria-label="Workspace sections">
      {(['territories', 'sales'] as const).map((item) => <button
        key={item} type="button" role="tab" id={`sidebar-tab-${item}`}
        aria-controls={`sidebar-panel-${item}`} aria-selected={tab === item}
        tabIndex={tab === item ? 0 : -1} onClick={() => selectTab(item)}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'territories' : event.key === 'End' ? 'sales' : item === 'territories' ? 'sales' : 'territories';
          selectTab(next);
          document.getElementById(`sidebar-tab-${next}`)?.focus();
        }}
      >{item === 'territories' ? 'Territories' : 'Sales'}</button>)}
    </div>
    <div role="tabpanel" id="sidebar-panel-territories" aria-labelledby="sidebar-tab-territories" hidden={tab !== 'territories'}>
    <div className="sidebar-heading"><span className="eyebrow">YOUR WORKSPACE</span><h1>Territories <span>{territories.length}</span></h1><p>Build your coverage, one postcode district at a time.</p></div>
    <form className="create-form" onSubmit={(event) => {
      event.preventDefault(); if (!name.trim()) return;
      onCreate(name.trim(), color); setName(''); setColor(COLORS[(territories.length + 1) % COLORS.length]);
    }}>
      <label htmlFor="territory-name">New territory</label>
      <div className="form-row"><input id="territory-name" placeholder="e.g. South West" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
      <input aria-label="New territory colour" type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
      <button className="primary" disabled={!name.trim()}>+ Create territory</button>
    </form>
    <div className="territory-list">
      {!territories.length && <div className="empty-state"><span className="empty-icon">◎</span><h2>A place for every district</h2><p>Create your first territory, then click districts on the map to add them.</p></div>}
      {territories.map((territory) => <button key={territory.id} className={`territory-card ${activeId === territory.id ? 'selected' : ''}`} aria-pressed={activeId === territory.id} onClick={() => onSelect(territory.id)}>
        <span className="swatch" style={{ background: territory.color }} /><span className="territory-label"><strong>{territory.name}</strong><small>{territory.districts.length} postcode districts</small>{markerCounts !== null && <small className="territory-sales-count">{ready ? `${(markerCounts[territory.id] ?? 0).toLocaleString('en-GB')} sales` : 'Sales count pending'}</small>}</span><span aria-hidden="true">{activeId === territory.id ? '●' : '›'}</span>
      </button>)}
    </div>
    {active && <section className="editor" aria-label="Edit selected territory">
      <div className="editor-title"><h2>Edit territory</h2><button className="text-button" onClick={() => onSelect(null)}>Done</button></div>
      <label htmlFor="edit-name">Name</label><input id="edit-name" value={active.name} maxLength={80} onChange={(e) => onUpdate({ ...active, name: e.target.value })} onBlur={() => { if (!active.name.trim()) onUpdate({ ...active, name: 'Untitled territory' }); }} />
      <label className="colour-label">Territory colour<input type="color" value={active.color} onChange={(e) => onUpdate({ ...active, color: e.target.value })} /></label>
      <p className="selection-hint">{ready ? 'Selection mode is on. Click a district to add it; click again to remove it. Districts in another territory will move here.' : 'The map is loading. You can edit territory details now.'}</p>
      <div className="district-chips" aria-label="Assigned districts">{[...active.districts].sort().map((district) => <button key={district} aria-label={`Remove ${district}`} onClick={() => onUpdate({ ...active, districts: active.districts.filter((d) => d !== district) })}>{district} <span aria-hidden="true">×</span></button>)}</div>
      <button className="danger" onClick={() => { if (window.confirm(`Delete “${active.name}” and release its ${active.districts.length} districts?`)) onDelete(active.id); }}>Delete territory</button>
    </section>}
    </div>
    <div role="tabpanel" id="sidebar-panel-sales" aria-labelledby="sidebar-tab-sales" hidden={tab !== 'sales'}>
      <div className="sidebar-heading"><span className="eyebrow">YOUR WORKSPACE</span><h1>Sales locations</h1><p>See your customers and sales alongside your territories.</p></div>
      {locationPanel}
    </div>
    <footer className="sidebar-footer">{tab === 'territories' ? 'Territories are saved in this browser.' : 'Locations stay in this browser tab until you refresh.'}</footer>
  </aside>;
}
