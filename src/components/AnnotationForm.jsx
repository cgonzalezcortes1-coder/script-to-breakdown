import React, { useState, useRef, useEffect } from 'react';

export default function AnnotationForm({
  selectedText, highlightAreas,
  dept, departments, phases, onSave, onCancel,
}) {
  const [scene, setScene]               = useState('');
  const [note, setNote]                 = useState('');
  const [selectedDept, setSelectedDept] = useState(dept);
  const [selectedPhase, setSelectedPhase] = useState(phases[1]); // default: Prod
  const sceneRef = useRef(null);

  const pageIndex = highlightAreas[0]?.pageIndex ?? 0;

  useEffect(() => { sceneRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      pageIndex,
      highlightAreas,
      text: selectedText,
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

  const preview = selectedText.length > 100 ? selectedText.slice(0, 100) + '…' : selectedText;

  return (
    <div className="annotation-form">
      <div className="form-header" style={{ borderTop: `4px solid ${selectedDept.color}` }}>
        <span className="form-title">Nueva Anotación · Pág {pageIndex + 1}</span>
        <button className="form-close-btn" type="button" onClick={onCancel}>✕</button>
      </div>

      <div className="form-preview">"{preview}"</div>

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
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
