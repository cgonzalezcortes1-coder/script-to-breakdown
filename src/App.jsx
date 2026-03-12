import React, { useState, useRef, useEffect } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';
import '@react-pdf-viewer/core/lib/styles/index.css';
import FileUploader from './components/FileUploader';
import AnnotationForm from './components/AnnotationForm';
import AnnotationTable from './components/AnnotationTable';
import { exportToExcel } from './utils/excelExport';
import './App.css';

export const DEPARTMENTS = [
  { id: 'dialogos',  label: 'Diálogos',  color: '#16a34a' },
  { id: 'ambientes', label: 'Ambientes', color: '#ea580c' },
  { id: 'efectos',   label: 'Efectos',   color: '#db2777' },
  { id: 'foley',     label: 'Foley',     color: '#7c3aed' },
];

const WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

export default function App() {
  const [pdfUrl, setPdfUrl]           = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading]         = useState(true);

  const selectedDeptRef = useRef(DEPARTMENTS[0]);

  // On mount: load current PDF URL + listen to annotations in real time
  useEffect(() => {
    // Load PDF URL from Firestore config doc
    getDoc(doc(db, 'config', 'current'))
      .then((snap) => {
        if (snap.exists() && snap.data().pdfUrl) {
          setPdfUrl(snap.data().pdfUrl);
        }
      })
      .finally(() => setLoading(false));

    // Real-time listener for annotations (sorted client-side to avoid index setup)
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

    const storageRef = ref(storage, 'scripts/current.pdf');
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(pct);
      },
      (error) => {
        console.error('Upload error:', error);
        setUploading(false);
        alert('Error al subir el PDF. Por favor intenta de nuevo.');
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        await setDoc(doc(db, 'config', 'current'), { pdfUrl: downloadUrl });
        setPdfUrl(downloadUrl);
        setUploading(false);
      }
    );
  };

  const handleChangePdf = async () => {
    try {
      await deleteObject(ref(storage, 'scripts/current.pdf'));
    } catch {
      // ignore if file doesn't exist
    }
    await setDoc(doc(db, 'config', 'current'), { pdfUrl: null });
    setPdfUrl(null);
  };

  const addAnnotation = (annotation) => {
    addDoc(collection(db, 'annotations'), annotation);
  };

  const deleteAnnotation = (id) => {
    deleteDoc(doc(db, 'annotations', id));
  };

  // Highlight plugin
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
            onClick={() => {
              selectedDeptRef.current = dept;
              props.toggle();
            }}
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
        onSave={(data) => {
          addAnnotation({ ...data, createdAt: Date.now() });
          props.cancel();
        }}
        onCancel={props.cancel}
      />
    ),

    renderHighlights: (props) => (
      <div>
        {annotations
          .filter((a) =>
            a.highlightAreas?.some((area) => area.pageIndex === props.pageIndex)
          )
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
                    cursor: 'default',
                    borderRadius: '2px',
                  }}
                  title={`${a.department}${a.scene ? ' · Esc ' + a.scene : ''}: ${a.note || a.text}`}
                />
              ))
          )}
      </div>
    ),
  });

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
          <FileUploader
            onUpload={handleFileUpload}
            uploading={uploading}
            progress={uploadProgress}
          />
        ) : (
          <>
            <div className="viewer-bar">
              <button className="btn-outline" onClick={handleChangePdf}>
                ← Cargar otro guión
              </button>
              <span className="viewer-hint">
                Selecciona texto → elige departamento → agrega escena y comentario
              </span>
            </div>

            <div className="pdf-wrapper">
              <Worker workerUrl={WORKER_URL}>
                <Viewer
                  fileUrl={pdfUrl}
                  plugins={[highlightPluginInstance]}
                  defaultScale={1.2}
                />
              </Worker>
            </div>

            {annotations.length > 0 && (
              <AnnotationTable
                annotations={annotations}
                onDelete={deleteAnnotation}
                onExport={() => exportToExcel(annotations)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
