import React, { useState } from 'react';

const truncateWords = (text, limit = 10) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '…';
};

export default function AnnotationTable({ annotations, onDelete, onExport }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      // Auto-reset after 2 seconds
      setTimeout(() => setConfirmDelete(null), 2000);
    }
  };

  return (
    <section className="table-section">
      <div className="table-header-bar">
        <h2 className="table-title">
          Anotaciones
          <span className="table-count">{annotations.length}</span>
        </h2>
        <button className="btn-export" onClick={onExport}>
          ⬇ Exportar a Excel
        </button>
      </div>

      <div className="table-scroll">
        <table className="annotations-table">
          <thead>
            <tr>
              <th>Ubicación</th>
              <th>Departamento</th>
              <th>Texto Subrayado</th>
              <th>Comentario</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {annotations.map((a) => (
              <tr key={a.id}>
                <td className="col-location">
                  <span className="loc-page">Pág {a.pageIndex + 1}</span>
                  {a.scene && (
                    <span className="loc-scene">Esc {a.scene}</span>
                  )}
                </td>
                <td>
                  <span
                    className="dept-tag"
                    style={{ background: a.color }}
                  >
                    {a.department}
                  </span>
                </td>
                <td className="col-text">
                  "{truncateWords(a.text)}"
                </td>
                <td className="col-note">{a.note || <span className="empty-note">—</span>}</td>
                <td>
                  <button
                    className={`btn-delete ${confirmDelete === a.id ? 'confirm' : ''}`}
                    onClick={() => handleDelete(a.id)}
                    title={confirmDelete === a.id ? 'Haz clic para confirmar' : 'Eliminar anotación'}
                  >
                    {confirmDelete === a.id ? '?' : '×'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
