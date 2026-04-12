import React, { useRef, useEffect } from 'react';
import { useI18n } from '../i18n';

export default function AnnotationSidebar({
  annotations, departments, phases, onJumpTo, onDelete, onEdit, onExport, onExportPdf, exportingPdf,
  isOpen, onClose,
  deptFilter, phaseFilter, onDeptFilter, onPhaseFilter,
  selectedAnnotationId,
}) {
  const { t } = useI18n();
  const itemRefs = useRef({});

  // Scroll al ítem seleccionado cuando cambia desde el PDF
  useEffect(() => {
    if (selectedAnnotationId && itemRefs.current[selectedAnnotationId]) {
      itemRefs.current[selectedAnnotationId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedAnnotationId]);
  const filtered = annotations.filter((a) => {
    if (deptFilter.size  > 0 && !deptFilter.has(a.departmentId))  return false;
    if (phaseFilter.size > 0 && !phaseFilter.has(a.phase))        return false;
    return true;
  });

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

      <div className="sidebar-handle" onClick={onClose}>
        <div className="sidebar-handle-bar" />
      </div>

      <div className="sidebar-close-row">
        <span className="sidebar-close-label">{t('annotations')}</span>
        <button className="sidebar-close-x" onClick={onClose} aria-label={t('closeSidebar')}>✕</button>
      </div>

      {/* Filters */}
      <div className="sidebar-filters">
        <div className="filter-group-label">{t('department')}</div>
        <div className="filter-row">
          <button
            className={`filter-chip ${deptFilter.size === 0 ? 'active-all' : ''}`}
            onClick={() => onDeptFilter(new Set())}
          >
            {t('allDepts')}
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

        <div className="filter-group-label" style={{ marginTop: 6 }}>{t('phase')}</div>
        <div className="filter-row">
          <button
            className={`filter-chip ${phaseFilter.size === 0 ? 'active-all' : ''}`}
            onClick={() => onPhaseFilter(new Set())}
          >
            {t('allPhases')}
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
        <div className="filter-hint">{t('shiftClickHint')}</div>
      </div>

      {/* Count */}
      <div className="sidebar-count">
        {filtered.length} {filtered.length === 1 ? t('annotationSingular') : t('annotationPlural')}
        {(deptFilter.size > 0 || phaseFilter.size > 0) && (
          <span> ({t('of')} {annotations.length})</span>
        )}
      </div>

      {/* List */}
      <div className="sidebar-list">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">
            {deptFilter.size > 0 || phaseFilter.size > 0 ? t('noAnnotationsFiltered') : t('noAnnotations')}
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              ref={(el) => { itemRefs.current[a.id] = el; }}
              className={`sidebar-item ${selectedAnnotationId === a.id ? 'selected' : ''}`}
              style={{ borderLeft: `3px solid ${a.color}` }}
              onClick={() => onJumpTo(a)}
              title={t('jumpToScript')}
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
                    title={t('edit')}
                  >
                    ✏
                  </button>
                  <button
                    className="btn-delete-sm"
                    onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
                    title={t('delete')}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="sidebar-item-location">
                {t('page')} {a.pageIndex + 1}{a.scene ? ` · ${t('scene')} ${a.scene}` : ''}
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
          {t('excelExport')}
        </button>
        <button
          className="btn-export sidebar-export btn-export-pdf"
          onClick={onExportPdf}
          disabled={exportingPdf}
          title={t('pdfExportTooltip')}
        >
          {exportingPdf ? t('pdfExporting') : t('pdfExport')}
        </button>
      </div>
    </aside>
  );
}
