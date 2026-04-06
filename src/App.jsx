import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import {
  collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot,
  setDoc, getDocs, query, where, writeBatch,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { signOut } from 'firebase/auth';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import ChapterList from './components/ChapterList';
import ProjectList from './components/ProjectList';
import { useAuth } from './components/PasswordGate';
import AnnotationForm from './components/AnnotationForm';
import AnnotationSidebar from './components/AnnotationSidebar';
import { exportToExcel } from './utils/excelExport';
import { exportAnnotatedPdf } from './utils/pdfAnnotate';
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
  const { isAdmin } = useAuth();

  // ── Project state ──────────────────────────────────────────
  const [projects, setProjects]           = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  // ── Chapter state ──────────────────────────────────────────
  const [chapters, setChapters]           = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading]             = useState(true);

  // ── Annotation state ───────────────────────────────────────
  const [annotations, setAnnotations]     = useState([]);
  const [activeDept, setActiveDept]       = useState(DEPARTMENTS[0]);

  // ── Sidebar filters (lifted here so PDF viewer reacts too) ─
  // Empty Set = show all; non-empty = show only matching ids
  const [deptFilter,  setDeptFilter]  = useState(new Set());
  const [phaseFilter, setPhaseFilter] = useState(new Set());

  // ── PDF export state ───────────────────────────────────────
  const [exportingPdf, setExportingPdf]   = useState(false);
  const [pdfProgress, setPdfProgress]     = useState(0);

  // ── Editing ────────────────────────────────────────────────
  const [editingAnnotation, setEditingAnnotation] = useState(null);

  // ── Selected annotation (clicked in PDF → highlight in sidebar) ─
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  // ── Mobile sidebar toggle ──────────────────────────────────
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  // ── Mobile draw mode (off by default — touch scrolls the PDF) ─
  const [mobileDrawMode, setMobileDrawMode] = useState(false);
  const mobileDrawModeRef                   = useRef(false);

  // ── Popup / drawing state ──────────────────────────────────
  const [popupMode, setPopupMode]         = useState(null);
  const [popupPos, setPopupPos]           = useState({ x: 0, y: 0 });
  const [pendingHighlight, setPendingHighlight] = useState(null);
  const [drawing, setDrawing]             = useState(null);

  const drawingRef       = useRef(null);
  const activeDeptRef    = useRef(activeDept);
  const popupModeRef     = useRef(null);
  const drawingPageElRef = useRef(null);
  drawingRef.current    = drawing;
  activeDeptRef.current = activeDept;
  popupModeRef.current  = popupMode;

  // ── Load projects ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.createdAt - b.createdAt)
      );
    });
    return () => unsub();
  }, []);

  // Reset activeChapter when project changes
  useEffect(() => {
    setActiveChapter(null);
  }, [activeProject?.id]);

  // ── Load chapters ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'chapters'), (snap) => {
      setChapters(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Load annotations (all, filtered client-side per chapter) ─
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'annotations'), (snap) => {
      setAnnotations(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.pageIndex - b.pageIndex || a.createdAt - b.createdAt)
      );
    });
    return () => unsub();
  }, []);

  // ── Annotations for active chapter ─────────────────────────
  const chapterAnnotations = activeChapter
    ? annotations.filter((a) => a.chapterId === activeChapter.id)
    : [];

  // Reset filters + selection whenever the user opens a different chapter
  useEffect(() => {
    setDeptFilter(new Set());
    setPhaseFilter(new Set());
    setSelectedAnnotationId(null);
  }, [activeChapter?.id]);

  // Filtered subset shared by both the sidebar list and the PDF highlights
  const filteredAnnotations = chapterAnnotations.filter((a) => {
    if (deptFilter.size  > 0 && !deptFilter.has(a.departmentId))  return false;
    if (phaseFilter.size > 0 && !phaseFilter.has(a.phase))        return false;
    return true;
  });

  // ── Document-level mouse + touch events for area drawing ───
  useEffect(() => {
    const onMove = (e) => {
      if (!drawingRef.current) return;
      const { clientX, clientY } = e.touches ? e.touches[0] : e;
      setDrawing((prev) => prev ? { ...prev, currentX: clientX, currentY: clientY } : null);
    };

    const finishDraw = (clientX, clientY) => {
      const d = drawingRef.current;
      if (!d) return;
      drawingRef.current = null;
      setDrawing(null);
      if (Math.abs(clientX - d.startX) < 8 || Math.abs(clientY - d.startY) < 8) return;

      const pageEl = drawingPageElRef.current;
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();

      const left   = Math.max(0, ((Math.min(d.startX, clientX) - rect.left) / rect.width)  * 100);
      const top    = Math.max(0, ((Math.min(d.startY, clientY) - rect.top)  / rect.height) * 100);
      const width  = Math.min(100 - left, (Math.abs(clientX - d.startX) / rect.width)  * 100);
      const height = Math.min(100 - top,  (Math.abs(clientY - d.startY) / rect.height) * 100);

      const highlightAreas = [{ pageIndex: d.pageIndex, left, top, width, height }];
      setPendingHighlight({ highlightAreas });
      setPopupMode('form');

      const isMobile = window.innerWidth < 768;
      setPopupPos(isMobile ? {
        x: 16,
        y: Math.max(60, (window.innerHeight - 460) / 2),
      } : {
        x: Math.max(8, Math.min(clientX - 185, window.innerWidth - 390)),
        y: Math.min(clientY + 10, window.innerHeight - 460),
      });
    };

    const onUp       = (e) => finishDraw(e.clientX, e.clientY);
    const onTouchEnd = (e) => finishDraw(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend',  onTouchEnd);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onTouchEnd);
    };
  }, []);

  const closePopup = useCallback(() => {
    setPopupMode(null);
    setPendingHighlight(null);
    // Auto-exit draw mode on mobile when form closes
    mobileDrawModeRef.current = false;
    setMobileDrawMode(false);
  }, []);

  // ── Chapter CRUD ───────────────────────────────────────────
  const handleChapterCreate = (title, file) => {
    setUploading(true);
    setUploadProgress(0);
    const chapterRef = doc(collection(db, 'chapters'));
    const id = chapterRef.id;
    const task = uploadBytesResumable(ref(storage, `scripts/${id}.pdf`), file);
    task.on(
      'state_changed',
      (s) => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); alert('Error al subir el PDF.'); },
      async () => {
        const pdfUrl = await getDownloadURL(task.snapshot.ref);
        await setDoc(chapterRef, {
          title,
          pdfUrl,
          projectId: activeProject.id,
          order: chapters.length + 1,
          createdAt: Date.now(),
        });
        setUploading(false);
        // Navigate directly to the new chapter
        setActiveChapter({ id, title, pdfUrl, order: chapters.length + 1, createdAt: Date.now() });
      }
    );
  };

  const handleChapterDelete = async (chapter) => {
    // Delete PDF from storage
    try { await deleteObject(ref(storage, `scripts/${chapter.id}.pdf`)); } catch {}
    // Batch-delete all annotations for this chapter
    const snap = await getDocs(query(collection(db, 'annotations'), where('chapterId', '==', chapter.id)));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    // Delete chapter doc
    await deleteDoc(doc(db, 'chapters', chapter.id));
  };

  // ── Project CRUD ───────────────────────────────────────────
  const handleProjectCreate = async (title) => {
    await addDoc(collection(db, 'projects'), { title, createdAt: Date.now() });
  };

  const handleProjectDelete = async (project) => {
    // Find all chapters in this project
    const chapSnap = await getDocs(query(collection(db, 'chapters'), where('projectId', '==', project.id)));
    if (!chapSnap.empty) {
      for (const chapDoc of chapSnap.docs) {
        // Delete annotations for each chapter
        const annSnap = await getDocs(query(collection(db, 'annotations'), where('chapterId', '==', chapDoc.id)));
        if (!annSnap.empty) {
          const batch = writeBatch(db);
          annSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        // Delete PDF from storage
        try { await deleteObject(ref(storage, `scripts/${chapDoc.id}.pdf`)); } catch {}
      }
      // Delete all chapters
      const batch = writeBatch(db);
      chapSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'projects', project.id));
  };

  // ── Annotation CRUD ────────────────────────────────────────
  const addAnnotation = (a) =>
    addDoc(collection(db, 'annotations'), { ...a, chapterId: activeChapter.id, createdAt: Date.now() });

  const deleteAnnotation = (id) => deleteDoc(doc(db, 'annotations', id));

  const updateAnnotation = (id, data) =>
    updateDoc(doc(db, 'annotations', id), {
      department:   data.department,
      departmentId: data.departmentId,
      color:        data.color,
      phase:        data.phase,
      phaseLabel:   data.phaseLabel,
      phaseColor:   data.phaseColor,
      scene:        data.scene,
      note:         data.note,
    });

  const handleExportPdf = async () => {
    if (!activeChapter || exportingPdf) return;
    setExportingPdf(true);
    setPdfProgress(0);
    try {
      await exportAnnotatedPdf(
        activeChapter.pdfUrl,
        filteredAnnotations,
        activeChapter.title,
        setPdfProgress,
      );
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setExportingPdf(false);
      setPdfProgress(0);
    }
  };

  // ── Plugins ────────────────────────────────────────────────
  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, CurrentScale } = zoomPluginInstance;

  const highlightPluginInstance = highlightPlugin({
    renderHighlights: (props) => (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Drawing overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            // Only block native scroll when draw mode is active on mobile
            touchAction: mobileDrawMode ? 'none' : 'auto',
          }}
          onMouseDown={(e) => {
            if (e.button !== 0 || popupModeRef.current) return;
            drawingPageElRef.current = e.currentTarget;
            setDrawing({
              pageIndex: props.pageIndex,
              startX: e.clientX, startY: e.clientY,
              currentX: e.clientX, currentY: e.clientY,
            });
          }}
          onTouchStart={(e) => {
            // On mobile, only draw when draw mode is explicitly enabled
            if (popupModeRef.current || !mobileDrawModeRef.current) return;
            e.preventDefault(); // prevent scroll during drawing gesture
            const touch = e.touches[0];
            drawingPageElRef.current = e.currentTarget;
            setDrawing({
              pageIndex: props.pageIndex,
              startX: touch.clientX, startY: touch.clientY,
              currentX: touch.clientX, currentY: touch.clientY,
            });
          }}
        />
        {/* Saved annotation rectangles — only filtered ones */}
        {filteredAnnotations
          .filter((a) => a.highlightAreas?.some((area) => area.pageIndex === props.pageIndex))
          .flatMap((a) =>
            a.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => {
                const isSelected = selectedAnnotationId === a.id;
                return (
                  <div
                    key={`${a.id}-${idx}`}
                    style={{
                      ...props.getCssProperties(area, props.rotation),
                      background: a.color,
                      opacity: isSelected ? 0.7 : 0.5,
                      mixBlendMode: 'multiply',
                      borderRadius: '2px',
                      zIndex: 2,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      outline: isSelected ? `2px solid ${a.color}` : 'none',
                      outlineOffset: '2px',
                    }}
                    title={`${a.department}${a.phaseLabel ? ' [' + a.phaseLabel + ']' : ''}${a.scene ? ' · Esc ' + a.scene : ''}${a.note ? ': ' + a.note : ''}`}
                    onClick={() => {
                      setSelectedAnnotationId(a.id);
                      setSidebarOpen(true);
                    }}
                  />
                );
              })
          )}
      </div>
    ),
  });

  const { jumpToHighlightArea } = highlightPluginInstance;

  // ── Loading screen ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Cargando…</p>
        </div>
      </div>
    );
  }

  // ── Project list screen ────────────────────────────────────
  if (!activeProject) {
    return (
      <div className="app">
        <ProjectList
          projects={projects}
          chapters={chapters}
          onCreate={handleProjectCreate}
          onSelect={setActiveProject}
          onDelete={handleProjectDelete}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // ── Chapter list screen ────────────────────────────────────
  if (!activeChapter) {
    const projectChapters = chapters.filter((c) => c.projectId === activeProject.id);
    return (
      <div className="app">
        <ChapterList
          chapters={projectChapters}
          annotations={annotations}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onCreate={handleChapterCreate}
          onSelect={setActiveChapter}
          onDelete={handleChapterDelete}
          isAdmin={isAdmin}
          projectTitle={activeProject.title}
          onBack={() => setActiveProject(null)}
        />
      </div>
    );
  }

  // ── Viewer screen ──────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title"><span>HASAN</span> Script Breakdown</h1>
          <span className="app-sub">Desglose de Sonido · Sound Department</span>
        </div>
        <div className="app-header-chapter">
          {activeChapter.title}
        </div>
        <div className="app-header-user">
          {auth.currentUser?.photoURL && (
            <img src={auth.currentUser.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />
          )}
          <span className="user-name">{auth.currentUser?.displayName?.split(' ')[0]}</span>
          <button className="btn-signout" onClick={() => signOut(auth)} title="Cerrar sesión">↩</button>
        </div>
      </header>

      <main className="app-main">
        <div className="viewer-bar">
          <button className="btn-outline" onClick={() => {
            setActiveChapter(null);
            setPopupMode(null);
            setPendingHighlight(null);
          }}>
            ← Capítulos
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

          {/* Zoom */}
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

          {/* Mobile-only: draw mode toggle */}
          <button
            className={`draw-mode-btn ${mobileDrawMode ? 'active' : ''}`}
            onClick={() => {
              const next = !mobileDrawMode;
              mobileDrawModeRef.current = next;
              setMobileDrawMode(next);
            }}
          >
            {mobileDrawMode ? '✏️ Dibujando…' : '✏️ Anotar'}
          </button>
        </div>

        <div className="content-area">
          <div className="pdf-wrapper drawing-mode">
            <Worker workerUrl={WORKER_URL}>
              <Viewer
                fileUrl={activeChapter.pdfUrl}
                plugins={[highlightPluginInstance, zoomPluginInstance]}
                defaultScale={1.0}
              />
            </Worker>
          </div>

          <AnnotationSidebar
            annotations={chapterAnnotations}
            departments={DEPARTMENTS}
            phases={PHASES}
            deptFilter={deptFilter}
            phaseFilter={phaseFilter}
            onDeptFilter={setDeptFilter}
            onPhaseFilter={setPhaseFilter}
            onJumpTo={(a) => { jumpToHighlightArea(a.highlightAreas[0]); setSidebarOpen(false); setSelectedAnnotationId(a.id); }}
            onDelete={deleteAnnotation}
            onEdit={(a) => { setEditingAnnotation(a); setSidebarOpen(false); }}
            onExport={() => exportToExcel(filteredAnnotations, activeChapter.title)}
            onExportPdf={handleExportPdf}
            exportingPdf={exportingPdf}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selectedAnnotationId={selectedAnnotationId}
          />
        </div>
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

      {/* Mobile: sidebar backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile: FAB to toggle sidebar */}
      <button
        className={`sidebar-toggle-fab ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Anotaciones"
      >
        {sidebarOpen ? '✕ Cerrar' : `📋 ${chapterAnnotations.length}`}
      </button>

      {/* New annotation form (after drawing) */}
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
                addAnnotation(data);
                setPopupMode(null);
                setPendingHighlight(null);
              }}
              onCancel={closePopup}
            />
          </div>
        </>
      )}

      {/* Edit annotation form (always centered) */}
      {editingAnnotation && (
        <>
          <div className="form-backdrop" onClick={() => setEditingAnnotation(null)} />
          <div className="floating-form-wrapper edit-mode">
            <AnnotationForm
              highlightAreas={editingAnnotation.highlightAreas}
              dept={DEPARTMENTS.find((d) => d.id === editingAnnotation.departmentId) ?? DEPARTMENTS[0]}
              departments={DEPARTMENTS}
              phases={PHASES}
              initialData={editingAnnotation}
              onSave={(data) => {
                updateAnnotation(editingAnnotation.id, data);
                setEditingAnnotation(null);
              }}
              onCancel={() => setEditingAnnotation(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
