import React, { useState, useRef, useEffect } from 'react';

export default function AnnotationForm({
  highlightAreas,
  dept, departments, phases, onSave, onCancel,
  initialData, // if provided → edit mode
}) {
  const isEdit = !!initialData;

  const [scene, setScene]               = useState(initialData?.scene  ?? '');
  const [note, setNote]                 = useState(initialData?.note   ?? '');
  const [selectedDept, setSelectedDept] = useState(
    departments.find((d) => d.id === initialData?.departmentId) ?? dept
  );
  const [selectedPhase, setSelectedPhase] = useState(
    phases.find((p) => p.id === initialData?.phase) ?? phases[1]
  );
  const sceneRef = useRef(null);

  const pageIndex = highlightAreas[0]?.pageIndex ?? 0;

  useEffect(() => { sceneRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      pageIndex,
      highlightAreas,
      department:   selectedDept.label,
      departmentId: selectedDept.id,
      color:        selectedDept.color,
      phase:        selectedPhase.id,
      phaseLabel:   selectedPhase.label,
      phaseColor:   selectedPhase.color,
      scene:        scene.trim(),
      note:         note.trim(),
    });
  };

  return (
    <div className="annotation-form">
      <div className="form-header" style={{ borderTop: `4px solid ${selectedDept.color}` }}>
        <span className="form-title">
          {isEdit ? 'Editar Anotación' : 'Nueva Anotación'} · Pág {pageIndex + 1}
        </span>
        <button className="form-close-btn" type="button" onClick={onCancel}>✕</button>
      </div>

      <form onSubmit={handleSubmit} className="form-body">
        <div className="form-field">
          <label className="form-label">Departamento</label>
          <div className="dept-chip-row">
            {departments.map((d) => (
              <button
                key={d.id} type="button"
                className={`dept-chip ${selectedDept.id === d.id ? 'active' : ''}`}
                style={{ '--dept-color': d.color }}
                onClick={() => setSelectedDept(d)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Etapa</label>
          <div className="dept-chip-row">
            {phases.map((p) => (
              <button
                key={p.id} type="button"
                className={`phase-chip ${selectedPhase.id === p.id ? 'active' : ''}`}
                style={{ '--phase-color': p.color }}
                onClick={() => setSelectedPhase(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="scene-input">
            Escena <span className="form-optional">(opcional)</span>
          </label>
          <input
            id="scene-input" ref={sceneRef} type="text"
            value={scene} onChange={(e) => setScene(e.target.value)}
            placeholder="Ej: 120" className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="note-input">
            Comentario <span className="form-optional">(opcional)</span>
          </label>
          <textarea
            id="note-input" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Grabar en locación, ambiente exterior"
            rows={3} className="form-textarea"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-save" style={{ background: selectedDept.color }}>
            {isEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
