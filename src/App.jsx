import React, { useState, useRef, useEffect } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';
import '@react-pdf-viewer/core/lib/styles/index.css';
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

  const selectedDeptRef = useRef(DEPARTMENTS[0]);

  useEffect(() => {
    getDoc(doc(db, 'config', 'current'))
      .then((snap) => {
        if (snap.exists() && snap.data().pdfUrl) setPdfUrl(snap.data().pdfUrl);
      })
      .finally(() => setLoading(false));

    const unsubscribe = onSnapshot(collection(db, 'annotations'), (snapshot) => {
      const docs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.pageIndex - b.pageIndex || a.createdAt - b.createdAt);
      setAnnotations(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = (file) => {
    setUploading(true);
    setUploadProgress(0);
    const uploadTask = uploadBytesResumable(ref(storage, 'scripts/current.pdf'), file);
    uploadTask.on(
      'state_changed',
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); alert('Error al subir el PDF.'); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
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

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (props) => (
      <div
        className="dept-popup"
        style={{
          position: 'absolute',
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          transform: 'translate(0, 6px)',
          zIndex: 10,
        }}
      >
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.id}
            className="dept-btn"
            style={{ background: dept.color }}
            onClick={() => { selectedDeptRef.current = dept; props.toggle(); }}
          >
            {dept.label}
          </button>
        ))}
        <button className="dept-cancel-btn" onClick={props.cancel}>✕</button>
      </div>
    ),

    renderHighlightContent: (props) => (
      <AnnotationForm
        selectedText={props.selectedText}
        highlightAreas={props.highlightAreas}
        selectionRegion={props.selectionRegion}
        dept={selectedDeptRef.current}
        departments={DEPARTMENTS}
        phases={PHASES}
        onSave={(data) => { addAnnotation({ ...data, createdAt: Date.now() }); props.cancel(); }}
        onCancel={props.cancel}
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
              <span className="viewer-hint">
                Selecciona texto → elige departamento → agrega etapa, escena y comentario
              </span>
            </div>

            <div className="content-area">
              <div className="pdf-wrapper">
                <Worker workerUrl={WORKER_URL}>
                  <Viewer
                    fileUrl={pdfUrl}
                    plugins={[highlightPluginInstance]}
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
    </div>
  );
}
