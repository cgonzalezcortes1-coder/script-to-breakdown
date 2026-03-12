import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import FileUploader from './components/FileUploader';
import AnnotationForm from './components/AnnotationForm';
import AnnotationSidebar from './components/AnnotationSidebar';
import { exportToExcel } from './utils/excelExport';
import './App.css';

export const DEPARTMENTS = [
  { id: 'dialogos',  label: 'Diálogos',  color: '#16a34a' },
  { id: 'ambientes', label: 'Ambientes', color: '#ea580c' },
  { id: 'efectos',   label: 'Efectos',   color: '#db2777' },
  { id: 'foley',     label: 'Foley',     color: '#7c3aed' },
];

export const PHASES = [
  { id: 'pre',  label: 'Pre',  color: '#3b82f6' },
  { id: 'prod', label: 'Prod', color: '#f59e0b' },
  { id: 'post', label: 'Post', color: '#14b8a6' },
];

const WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

// ─── Trigger components (rendered inside PDF viewer, set state in parent) ───

const DeptPickerTrigger = ({ cancel, toggle, onShow }) => {
  useEffect(() => { onShow({ cancel, toggle }); }, []);
  return <div style={{ display: 'none' }} />;
};

const FormTrigger = ({ cancel, highlightAreas, selectedText, onShow }) => {
  useEffect(() => { onShow({ cancel, highlightAreas, selectedText }); }, []);
  return <div style={{ display: 'none' }} />;
};

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [pdfUrl, setPdfUrl]           = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading]         = useState(true);

  // Popup state (rendered OUTSIDE the PDF viewer to avoid z-index issues)
  const [popupMode, setPopupMode]       = useState(null); // null | 'dept' | 'form'
  const [popupPos, setPopupPos]         = useState({ x: 0, y: 0 });
  const [pendingHighlight, setPendingHighlight] = useState(null);

  const selectedDeptRef = useRef(DEPARTMENTS[0]);
  const cancelRef       = useRef(null);
  const toggleRef       = useRef(null);

  // Callbacks stored in refs so plugin closures stay stable
  const onDeptTrigger = useRef(null);
  onDeptTrigger.current = ({ cancel, toggle }) => {
    cancelRef.current = cancel;
    toggleRef.current = toggle;
    setPopupMode('dept');
  };

  const onFormTrigger = useRef(null);
  onFormTrigger.current = ({ cancel, highlightAreas, selectedText }) => {
    cancelRef.current = cancel;
    setPendingHighlight({ highlightAreas, selectedText });
    setPopupMode('form');
  };

  // Capture mouse position when user finishes selecting text
  const handlePdfMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim() && sel.rangeCount > 0) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setPopupPos({
        x: Math.max(8, Math.min(rect.left + rect.width / 2 - 130, window.innerWidth - 280)),
        y: rect.bottom + 10,
      });
    }
  }, []);

  const closePopup = useCallback(() => {
    cancelRef.current?.();
    setPopupMode(null);
    setPendingHighlight(null);
  }, []);

  // Firebase
  useEffect(() => {
    getDoc(doc(db, 'config', 'current'))
      .then((snap) => { if (snap.exists() && snap.data().pdfUrl) setPdfUrl(snap.data().pdfUrl); })
      .finally(() => setLoading(false));

    const unsub = onSnapshot(collection(db, 'annotations'), (snap) => {
      setAnnotations(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.pageIndex - b.pageIndex || a.createdAt - b.createdAt)
      );
    });
    return () => unsub();
  }, []);

  const handleFileUpload = (file) => {
    setUploading(true);
    setUploadProgress(0);
    const task = uploadBytesResumable(ref(storage, 'scripts/current.pdf'), file);
    task.on(
      'state_changed',
      (s) => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); alert('Error al subir el PDF.'); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await setDoc(doc(db, 'config', 'current'), { pdfUrl: url });
        setPdfUrl(url);
        setUploading(false);
      }
    );
  };

  const handleChangePdf = async () => {
    try { await deleteObject(ref(storage, 'scripts/current.pdf')); } catch {}
    await setDoc(doc(db, 'config', 'current'), { pdfUrl: null });
    setPdfUrl(null);
  };

  const addAnnotation    = (a)  => addDoc(collection(db, 'annotations'), a);
  const deleteAnnotation = (id) => deleteDoc(doc(db, 'annotations', id));

  // Zoom plugin
  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, CurrentScale } = zoomPluginInstance;

  // Highlight plugin
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (props) => (
      <DeptPickerTrigger
        cancel={props.cancel}
        toggle={props.toggle}
        onShow={(d) => onDeptTrigger.current(d)}
      />
    ),
    renderHighlightContent: (props) => (
      <FormTrigger
        cancel={props.cancel}
        highlightAreas={props.highlightAreas}
        selectedText={props.selectedText}
        onShow={(d) => onFormTrigger.current(d)}
      />
    ),
    renderHighlights: (props) => (
      <div>
        {annotations
          .filter((a) => a.highlightAreas?.some((area) => area.pageIndex === props.pageIndex))
          .flatMap((a) =>
            a.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => (
                <div
                  key={`${a.id}-${idx}`}
                  style={{
                    ...props.getCssProperties(area, props.rotation),
                    background: a.color,
                    opacity: 0.38,
                    mixBlendMode: 'multiply',
                    borderRadius: '2px',
                  }}
                  title={`${a.department} [${a.phaseLabel || ''}]${a.scene ? ' · Esc ' + a.scene : ''}: ${a.note || a.text}`}
                />
              ))
          )}
      </div>
    ),
  });

  const { jumpToHighlightArea } = highlightPluginInstance;

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">Desglose de Sonido</h1>
          <span className="app-sub">Script Breakdown Tool</span>
        </div>
        <div className="dept-legend">
          {DEPARTMENTS.map((d) => (
            <span key={d.id} className="legend-badge" style={{ background: d.color }}>
              {d.label}
            </span>
          ))}
        </div>
      </header>

      <main className="app-main">
        {!pdfUrl ? (
          <FileUploader onUpload={handleFileUpload} uploading={uploading} progress={uploadProgress} />
        ) : (
          <>
            <div className="viewer-bar">
              <button className="btn-outline" onClick={handleChangePdf}>
                ← Cargar otro guión
              </button>

              {/* Zoom controls */}
              <div className="zoom-controls">
                <ZoomOut>
                  {(p) => (
                    <button className="zoom-btn" onClick={p.onClick} title="Alejar">−</button>
                  )}
                </ZoomOut>
                <CurrentScale>
                  {(p) => <span className="zoom-level">{Math.round(p.scale * 100)}%</span>}
                </CurrentScale>
                <ZoomIn>
                  {(p) => (
                    <button className="zoom-btn" onClick={p.onClick} title="Acercar">+</button>
                  )}
                </ZoomIn>
              </div>

              <span className="viewer-hint">
                Selecciona texto → elige departamento
              </span>
            </div>

            <div className="content-area">
              <div className="pdf-wrapper" onMouseUp={handlePdfMouseUp}>
                <Worker workerUrl={WORKER_URL}>
                  <Viewer
                    fileUrl={pdfUrl}
                    plugins={[highlightPluginInstance, zoomPluginInstance]}
                    defaultScale={1.0}
                  />
                </Worker>
              </div>

              <AnnotationSidebar
                annotations={annotations}
                departments={DEPARTMENTS}
                phases={PHASES}
                onJumpTo={(a) => jumpToHighlightArea(a.highlightAreas[0])}
                onDelete={deleteAnnotation}
                onExport={() => exportToExcel(annotations)}
              />
            </div>
          </>
        )}
      </main>

      {/* ── Dept picker — rendered OUTSIDE pdf viewer ── */}
      {popupMode === 'dept' && (
        <div
          className="floating-dept-picker"
          style={{ left: popupPos.x, top: popupPos.y }}
        >
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              className="dept-btn"
              style={{ background: dept.color }}
              onClick={() => {
                selectedDeptRef.current = dept;
                toggleRef.current?.();
              }}
            >
              {dept.label}
            </button>
          ))}
          <button className="dept-cancel-btn" onClick={closePopup}>✕</button>
        </div>
      )}

      {/* ── Annotation form — rendered OUTSIDE pdf viewer ── */}
      {popupMode === 'form' && pendingHighlight && (
        <>
          <div className="form-backdrop" onClick={closePopup} />
          <div
            className="floating-form-wrapper"
            style={{
              left: Math.max(8, Math.min(popupPos.x, window.innerWidth - 390)),
              top: Math.min(popupPos.y, window.innerHeight - 460),
            }}
          >
            <AnnotationForm
              selectedText={pendingHighlight.selectedText}
              highlightAreas={pendingHighlight.highlightAreas}
              dept={selectedDeptRef.current}
              departments={DEPARTMENTS}
              phases={PHASES}
              onSave={(data) => {
                addAnnotation({ ...data, createdAt: Date.now() });
                cancelRef.current?.();
                setPopupMode(null);
                setPendingHighlight(null);
              }}
              onCancel={closePopup}
            />
          </div>
        </>
      )}
    </div>
  );
}
