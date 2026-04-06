import React, { useState, useRef } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ChapterList({
  chapters, annotations, uploading, uploadProgress, onCreate, onSelect, onDelete, isAdmin,
  projectTitle, onBack,
}) {
  const [showForm, setShowForm]   = useState(false);
  const [title, setTitle]         = useState('');
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const countFor = (id) => annotations.filter((a) => a.chapterId === id).length;

  const MAX_PDF_MB = 200;
  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { alert('Por favor selecciona un archivo PDF.'); return; }
    if (f.size > MAX_PDF_MB * 1024 * 1024) { alert(`El archivo supera el límite de ${MAX_PDF_MB} MB.`); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!file) { alert('Selecciona un PDF para este capítulo.'); return; }
    onCreate(title.trim(), file);
    setTitle('');
    setFile(null);
    setShowForm(false);
  };

  const handleDeleteClick = (e, ch) => {
    e.stopPropagation();
    if (confirmId === ch.id) {
      onDelete(ch);
      setConfirmId(null);
    } else {
      setConfirmId(ch.id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  return (
    <div className="chapter-page">

      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          {onBack && (
            <button className="btn-outline" onClick={onBack} style={{ marginRight: 12 }}>
              ← Proyectos
            </button>
          )}
          <h1 className="app-title"><span>HASAN</span> Script Breakdown</h1>
          {projectTitle && <span className="app-sub">{projectTitle}</span>}
        </div>
        <div className="app-header-user">
          {auth.currentUser?.photoURL && (
            <img src={auth.currentUser.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />
          )}
          <span className="user-name">{auth.currentUser?.displayName?.split(' ')[0]}</span>
          <button className="btn-signout" onClick={() => signOut(auth)} title="Cerrar sesión">↩</button>
        </div>
      </header>

      {/* Body */}
      <div className="chapter-body">
        <div className="chapter-section-label">
          {chapters.length === 0
            ? 'Aún no hay capítulos. Crea el primero.'
            : `${chapters.length} ${chapters.length === 1 ? 'capítulo' : 'capítulos'}`}
        </div>

        <div className="chapter-grid">

          {/* Existing chapters */}
          {chapters.map((ch) => {
            const count = countFor(ch.id);
            const isConfirm = confirmId === ch.id;
            return (
              <div
                key={ch.id}
                className="chapter-card"
                onClick={() => onSelect(ch)}
              >
                <div className="chapter-card-order">Capítulo {ch.order}</div>
                <div className="chapter-card-title">{ch.title}</div>
                <div className="chapter-card-meta">
                  {count} {count === 1 ? 'anotación' : 'anotaciones'}
                </div>
                <div className="chapter-card-footer">
                  <span className="chapter-open-hint">Clic para abrir →</span>
                  {isAdmin && (
                    <button
                      className={`chapter-delete-btn ${isConfirm ? 'confirm' : ''}`}
                      onClick={(e) => handleDeleteClick(e, ch)}
                      title={isConfirm ? 'Clic de nuevo para confirmar' : 'Eliminar capítulo'}
                    >
                      {isConfirm ? '¿Eliminar?' : '×'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add new chapter — solo admins */}
          {isAdmin && (!showForm ? (
            <button className="chapter-card chapter-add-card" onClick={() => setShowForm(true)}>
              <div className="chapter-add-icon">＋</div>
              <div className="chapter-add-label">Nuevo Capítulo</div>
            </button>
          ) : uploading ? (
            <div className="chapter-card chapter-uploading-card">
              <div className="upload-progress-icon">📤</div>
              <div className="upload-progress-label">Subiendo PDF…</div>
              <div className="progress-bar-track" style={{ width: '100%' }}>
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="progress-pct">{uploadProgress}%</div>
            </div>
          ) : (
            <div className="chapter-card chapter-form-card">
              <form onSubmit={handleSubmit} className="chapter-form">
                <div className="chapter-form-title">Nuevo Capítulo</div>

                <div className="form-field">
                  <label className="form-label">Título</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Capítulo 3 – El Regreso"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Guión PDF</label>
                  <div
                    className={`chapter-drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {file
                      ? <><span className="drop-file-icon">📄</span><span className="drop-file-name">{file.name}</span></>
                      : <><span className="drop-icon">📂</span><span>Arrastra el PDF aquí o clic para elegir</span></>
                    }
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                  </div>
                </div>

                <div className="chapter-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => { setShowForm(false); setTitle(''); setFile(null); }}
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
