import React, { useRef, useState } from 'react';

export default function FileUploader({ onUpload, uploading, progress }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    } else {
      alert('Por favor selecciona un archivo PDF válido.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  if (uploading) {
    return (
      <div className="uploader-wrapper">
        <div className="upload-progress-box">
          <div className="upload-progress-icon">⬆</div>
          <p className="upload-progress-label">Subiendo guión a la nube…</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-pct">{progress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="uploader-wrapper">
      <div
        className={`uploader ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div className="uploader-icon">📄</div>
        <p className="uploader-title">Arrastra tu guión aquí</p>
        <p className="uploader-sub">o haz clic para seleccionar</p>
        <button
          className="btn-primary"
          onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
        >
          Seleccionar PDF
        </button>
        <p className="uploader-note">El PDF se sube a la nube — todo el equipo lo verá</p>
      </div>

      <div className="uploader-info">
        <div className="info-card">
          <span className="info-icon" style={{ color: '#16a34a' }}>●</span>
          <span><strong>Diálogos</strong> – Líneas habladas</span>
        </div>
        <div className="info-card">
          <span className="info-icon" style={{ color: '#ea580c' }}>●</span>
          <span><strong>Ambientes</strong> – Sonido de ambiente</span>
        </div>
        <div className="info-card">
          <span className="info-icon" style={{ color: '#db2777' }}>●</span>
          <span><strong>Efectos</strong> – Efectos de sonido</span>
        </div>
        <div className="info-card">
          <span className="info-icon" style={{ color: '#7c3aed' }}>●</span>
          <span><strong>Foley</strong> – Foley y pasos</span>
        </div>
      </div>
    </div>
  );
}
