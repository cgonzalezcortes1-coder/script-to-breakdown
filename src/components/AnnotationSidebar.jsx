import React from 'react';

export default function AnnotationSidebar({
  annotations, departments, phases, onJumpTo, onDelete, onEdit, onExport, onExportPdf, exportingPdf,
  isOpen, onClose,
  deptFilter, phaseFilter, onDeptFilter, onPhaseFilter,
}) {
  const filtered = annotations.filter((a) => {
    if (deptFilter.size  > 0 && !deptFilter.has(a.departmentId))  return false;
    if (phaseFilter.size > 0 && !phaseFilter.has(a.phase))        return false;
    return true;
  });

  // Normal click → selección exclusiva (clic de nuevo en el mismo = deseleccionar)
  // Shift+clic  → suma / resta de la selección actual
  const toggleDept = (id, multi) => {
    if (multi) {
      const next = new Set(deptFilter);
      next.has(id) ? next.delete(id) : next.add(id);
      onDeptFilter(next);
    } else {
      onDeptFilter(deptFilter.size === 1 && deptFilter.has(id) ? new Set() : new Set([id]));
    }
  };
  const togglePhase = (id, multi) => {
    if (multi) {
      const next = new Set(phaseFilter);
      next.has(id) ? next.delete(id) : next.add(id);
      onPhaseFilter(next);
    } else {
      onPhaseFilter(phaseFilter.size === 1 && phaseFilter.has(id) ? new Set() : new Set([id]));
    }
  };

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
            className={`filter-chip ${deptFilter.size === 0 ? 'active-all' : ''}`}
            onClick={() => onDeptFilter(new Set())}
          >
            Todos
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              className={`filter-chip ${deptFilter.has(d.id) ? 'active' : ''}`}
              style={{ '--filter-color': d.color }}
              onClick={(e) => toggleDept(d.id, e.shiftKey)}
            >
              <span className="filter-dot" style={{ background: d.color }} />
              {d.label}
            </button>
          ))}
        </div>

        <div className="filter-group-label" style={{ marginTop: 6 }}>Etapa</div>
        <div className="filter-row">
          <button
            className={`filter-chip ${phaseFilter.size === 0 ? 'active-all' : ''}`}
            onClick={() => onPhaseFilter(new Set())}
          >
            Todas
          </button>
          {phases.map((p) => (
            <button
              key={p.id}
              className={`filter-chip ${phaseFilter.has(p.id) ? 'active' : ''}`}
              style={{ '--filter-color': p.color }}
              onClick={(e) => togglePhase(p.id, e.shiftKey)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="filter-hint">Shift+clic: selección múltiple</div>
      </div>

      {/* Count */}
      <div className="sidebar-count">
        {filtered.length} {filtered.length === 1 ? 'anotación' : 'anotaciones'}
        {(deptFilter.size > 0 || phaseFilter.size > 0) && (
          <span> (de {annotations.length})</span>
        )}
      </div>

      {/* List */}
      <div className="sidebar-list">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">
            Sin anotaciones{deptFilter.size > 0 || phaseFilter.size > 0 ? ' con estos filtros' : ''}
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
                <div className="sidebar-item-actions">
                  <button
                    className="btn-edit-sm"
                    onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                    title="Editar"
                  >
                    ✏
                  </button>
                  <button
                    className="btn-delete-sm"
                    onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
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
