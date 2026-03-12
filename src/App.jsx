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

export default function App() {
  const [pdfUrl, setPdfUrl]           = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [activeDept, setActiveDept]   = useState(DEPARTMENTS[0]);

  const [popupMode, setPopupMode]     = useState(null); // null | 'form'
  const [popupPos, setPopupPos]       = useState({ x: 0, y: 0 });
  const [pendingHighlight, setPendingHighlight] = useState(null);

  const [drawing, setDrawing]         = useState(null); // { startX, startY, currentX, currentY }
  const drawingRef    = useRef(null);
  const activeDeptRef = useRef(activeDept);
  drawingRef.current    = drawing;
  activeDeptRef.current = activeDept;

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

  // Document-level mouse events for area drawing
  useEffect(() => {
    const onMove = (e) => {
      if (!drawingRef.current) return;
      setDrawing((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    };

    const onUp = (e) => {
      const d = drawingRef.current;
      if (!d) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      drawingRef.current = null;
      setDrawing(null);

      if (Math.abs(currentX - d.startX) < 8 || Math.abs(currentY - d.startY) < 8) return;

      // Find which PDF page contains the drag midpoint
      const pages = document.querySelectorAll('.rpv-core__page-layer');
      const midX = (d.startX + currentX) / 2;
      const midY = (d.startY + currentY) / 2;
      let foundPage = null;

      pages.forEach((page, i) => {
        const rect = page.getBoundingClientRect();
        if (midX >= rect.left && midX <= rect.right && midY >= rect.top && midY <= rect.bottom) {
          foundPage = { rect, index: i };
        }
      });

      if (!foundPage) return;

      const { rect, index } = foundPage;
      const left   = Math.max(0, ((Math.min(d.startX, currentX) - rect.left) / rect.width)  * 100);
      const top    = Math.max(0, ((Math.min(d.startY, currentY) - rect.top)  / rect.height) * 100);
      const width  = (Math.abs(currentX - d.startX) / rect.width)  * 100;
      const height = (Math.abs(currentY - d.startY) / rect.height) * 100;

      const highlightAreas = [{ pageIndex: index, left, top, width, height }];
      setPendingHighlight({ highlightAreas });
      setPopupMode('form');
      setPopupPos({
        x: Math.max(8, Math.min(currentX - 185, window.innerWidth - 390)),
        y: Math.min(currentY + 10, window.innerHeight - 460),
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const closePopup = useCallback(() => {
    setPopupMode(null);
    setPendingHighlight(null);
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

  // Highlight plugin — rendering saved areas only, no text selection
  const highlightPluginInstance = highlightPlugin({
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
                    opacity: 0.5,
                    mixBlendMode: 'multiply',
                    borderRadius: '2px',
                  }}
                  title={`${a.department}${a.phaseLabel ? ' [' + a.phaseLabel + ']' : ''}${a.scene ? ' · Esc ' + a.scene : ''}${a.note ? ': ' + a.note : ''}`}
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

              {/* Department selector */}
              <div className="dept-toolbar">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.id}
                    className={`dept-toolbar-btn ${activeDept.id === dept.id ? 'active' : ''}`}
                    style={{ '--dept-color': dept.color }}
                    onClick={() => setActiveDept(dept)}
                  >
                    {dept.label}
                  </button>
                ))}
              </div>

              {/* Zoom controls */}
              <div className="zoom-controls">
                <ZoomOut>
                  {(p) => <button className="zoom-btn" onClick={p.onClick} title="Alejar">−</button>}
                </ZoomOut>
                <CurrentScale>
                  {(p) => <span className="zoom-level">{Math.round(p.scale * 100)}%</span>}
                </CurrentScale>
                <ZoomIn>
                  {(p) => <button className="zoom-btn" onClick={p.onClick} title="Acercar">+</button>}
                </ZoomIn>
              </div>

              <span className="viewer-hint">Arrastra para marcar</span>
            </div>

            <div className="content-area">
              <div
                className="pdf-wrapper drawing-mode"
                onMouseDown={(e) => {
                  if (e.button !== 0 || popupMode) return;
                  setDrawing({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
                }}
              >
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

      {/* Live drawing rectangle */}
      {drawing && (
        <div
          style={{
            position: 'fixed',
            left:   Math.min(drawing.startX, drawing.currentX),
            top:    Math.min(drawing.startY, drawing.currentY),
            width:  Math.abs(drawing.currentX - drawing.startX),
            height: Math.abs(drawing.currentY - drawing.startY),
            background: activeDept.color,
            opacity: 0.45,
            pointerEvents: 'none',
            zIndex: 99997,
            borderRadius: 2,
            border: `2px solid ${activeDept.color}`,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Annotation form */}
      {popupMode === 'form' && pendingHighlight && (
        <>
          <div className="form-backdrop" onClick={closePopup} />
          <div
            className="floating-form-wrapper"
            style={{
              left: Math.max(8, Math.min(popupPos.x, window.innerWidth - 390)),
              top:  Math.min(popupPos.y, window.innerHeight - 460),
            }}
          >
            <AnnotationForm
              highlightAreas={pendingHighlight.highlightAreas}
              dept={activeDeptRef.current}
              departments={DEPARTMENTS}
              phases={PHASES}
              onSave={(data) => {
                addAnnotation({ ...data, createdAt: Date.now() });
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
