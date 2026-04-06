import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ProjectList({ projects, chapters, onCreate, onSelect, onDelete, isAdmin }) {
  const [showForm, setShowForm]   = useState(false);
  const [title, setTitle]         = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const countFor = (id) => chapters.filter((c) => c.projectId === id).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim());
    setTitle('');
    setShowForm(false);
  };

  const handleDeleteClick = (e, proj) => {
    e.stopPropagation();
    if (confirmId === proj.id) {
      onDelete(proj);
      setConfirmId(null);
    } else {
      setConfirmId(proj.id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  return (
    <div className="chapter-page">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title"><span>HASAN</span> Script Breakdown</h1>
          <span className="app-sub">Desglose de Sonido · Sound Department</span>
        </div>
        <div className="app-header-user">
          {auth.currentUser?.photoURL && (
            <img src={auth.currentUser.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />
          )}
          <span className="user-name">{auth.currentUser?.displayName?.split(' ')[0]}</span>
          <button className="btn-signout" onClick={() => signOut(auth)} title="Cerrar sesión">↩</button>
        </div>
      </header>

      <div className="chapter-body">
        <div className="chapter-section-label">
          {projects.length === 0
            ? 'Aún no hay proyectos. Crea el primero.'
            : `${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'}`}
        </div>

        <div className="chapter-grid">
          {projects.map((proj) => {
            const count    = countFor(proj.id);
            const isConfirm = confirmId === proj.id;
            return (
              <div key={proj.id} className="chapter-card" onClick={() => onSelect(proj)}>
                <div className="chapter-card-order">Proyecto</div>
                <div className="chapter-card-title">{proj.title}</div>
                <div className="chapter-card-meta">
                  {count} {count === 1 ? 'capítulo' : 'capítulos'}
                </div>
                <div className="chapter-card-footer">
                  <span className="chapter-open-hint">Clic para abrir →</span>
                  {isAdmin && (
                    <button
                      className={`chapter-delete-btn ${isConfirm ? 'confirm' : ''}`}
                      onClick={(e) => handleDeleteClick(e, proj)}
                      title={isConfirm ? 'Clic de nuevo para confirmar' : 'Eliminar proyecto'}
                    >
                      {isConfirm ? '¿Eliminar?' : '×'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isAdmin && (!showForm ? (
            <button className="chapter-card chapter-add-card" onClick={() => setShowForm(true)}>
              <div className="chapter-add-icon">＋</div>
              <div className="chapter-add-label">Nuevo Proyecto</div>
            </button>
          ) : (
            <div className="chapter-card chapter-form-card">
              <form onSubmit={handleSubmit} className="chapter-form">
                <div className="chapter-form-title">Nuevo Proyecto</div>
                <div className="form-field">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: HASAN S02"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    autoFocus
                  />
                </div>
                <div className="chapter-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => { setShowForm(false); setTitle(''); }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    Crear →
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
