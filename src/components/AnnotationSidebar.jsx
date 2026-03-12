import React, { useState } from 'react';

export default function AnnotationSidebar({
  annotations, departments, phases, onJumpTo, onDelete, onExport, onExportPdf, exportingPdf,
  isOpen, onClose,
}) {
  const [deptFilter,  setDeptFilter]  = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');

  const filtered = annotations.filter((a) => {
    if (deptFilter  !== 'all' && a.departmentId !== deptFilter)  return false;
    if (phaseFilter !== 'all' && a.phase        !== phaseFilter) return false;
    return true;
  });

  const toggleDept  = (id) => setDeptFilter( (prev) => prev === id ? 'all' : id);
  const togglePhase = (id) => setPhaseFilter((prev) => prev === id ? 'all' : id);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

      {/* Mobile drag handle (hidden on desktop via CSS) */}
      <div className="sidebar-handle" onClick={onClose}>
        <div className="sidebar-handle-bar" />
      </div>

      {/* Mobile close row (hidden on desktop via CSS) */}
      <div className="sidebar-close-row">
        <span className="sidebar-close-label">Anotaciones</span>
        <button className="sidebar-close-x" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      {/* Filters */}
      <div className="sidebar-filters">
        <div className="filter-group-label">Departamento</div>
        <div className="filter-row">
          <button
            className={`filter-chip ${deptFilter === 'all' ? 'active-all' : ''}`}
            onClick={() => setDeptFilter('all')}
          >
            Todos
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              className={`filter-chip ${deptFilter === d.id ? 'active' : ''}`}
              style={{ '--filter-color': d.color }}
              onClick={() => toggleDept(d.id)}
            >
              <span className="filter-dot" style={{ background: d.color }} />
              {d.label}
            </button>
          ))}
        </div>

        <div className="filter-group-label" style={{ marginTop: 6 }}>Etapa</div>
        <div className="filter-row">
          <button
            className={`filter-chip ${phaseFilter === 'all' ? 'active-all' : ''}`}
            onClick={() => setPhaseFilter('all')}
          >
            Todas
          </button>
          {phases.map((p) => (
            <button
              key={p.id}
              className={`filter-chip ${phaseFilter === p.id ? 'active' : ''}`}
              style={{ '--filter-color': p.color }}
              onClick={() => togglePhase(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="sidebar-count">
        {filtered.length} {filtered.length === 1 ? 'anotación' : 'anotaciones'}
        {(deptFilter !== 'all' || phaseFilter !== 'all') && (
          <span> (de {annotations.length})</span>
        )}
      </div>

      {/* List */}
      <div className="sidebar-list">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">
            Sin anotaciones{deptFilter !== 'all' || phaseFilter !== 'all' ? ' con estos filtros' : ''}
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="sidebar-item"
              style={{ borderLeft: `3px solid ${a.color}` }}
              onClick={() => onJumpTo(a)}
              title="Clic para ir al guión"
            >
              <div className="sidebar-item-header">
                <div className="sidebar-item-badges">
                  <span className="dept-tag" style={{ background: a.color }}>
                    {a.department}
                  </span>
                  {a.phaseLabel && (
                    <span className="phase-tag" style={{ background: a.phaseColor }}>
                      {a.phaseLabel}
                    </span>
                  )}
                </div>
                <button
                  className="btn-delete-sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>

              <div className="sidebar-item-location">
                Pág {a.pageIndex + 1}{a.scene ? ` · Esc ${a.scene}` : ''}
              </div>

              {a.note && (
                <div className="sidebar-item-note">{a.note}</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="btn-export sidebar-export" onClick={onExport}>
          ⬇ Excel
        </button>
        <button
          className="btn-export sidebar-export btn-export-pdf"
          onClick={onExportPdf}
          disabled={exportingPdf}
          title="Descarga el PDF con los rectángulos y notas dibujados"
        >
          {exportingPdf ? '⏳ Generando…' : '⬇ PDF con notas'}
        </button>
      </div>
    </aside>
  );
}
