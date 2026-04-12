import React, { createContext, useContext, useState, useCallback } from 'react';

const strings = {
  es: {
    // Global
    appSubtitle: 'Desglose de Sonido · Sound Department',
    loading: 'Cargando…',
    signOut: 'Cerrar sesión',
    cancel: 'Cancelar',
    create: 'Crear →',
    delete: '×',
    close: 'Cerrar',

    // ProjectList
    project: 'Proyecto',
    projects: 'proyectos',
    projectSingular: 'proyecto',
    noProjects: 'Aún no hay proyectos. Crea el primero.',
    newProject: 'Nuevo Proyecto',
    projectName: 'Nombre',
    projectNamePlaceholder: 'Ej: HASAN S02',
    deleteProject: 'Eliminar proyecto',
    confirmDeleteProject: '¿Eliminar "{title}" y sus {count} capítulo(s) con todas sus anotaciones? Esta acción no se puede deshacer.',
    confirmDeleteProjectEmpty: '¿Eliminar el proyecto "{title}"?',
    confirmDelete: '¿Eliminar?',
    clickToOpen: 'Clic para abrir →',
    members: 'Miembros',
    membersSuffix: 'miembro',
    membersSuffixPlural: 'miembros',
    membersLabel: 'Miembros (emails, separados por coma)',
    membersPlaceholder: 'usuario1@gmail.com, usuario2@gmail.com',
    membersHint: 'El admin siempre tiene acceso. Los miembros se pueden editar después.',
    noMembers: 'Sin miembros — solo admin tiene acceso',
    addMember: 'Agregar',
    manageMembers: 'Gestionar miembros',
    removeMember: 'Quitar',

    // ChapterList
    chapter: 'Capítulo',
    chapters: 'capítulos',
    chapterSingular: 'capítulo',
    noChapters: 'Aún no hay capítulos. Crea el primero.',
    newChapter: 'Nuevo Capítulo',
    chapterTitle: 'Título',
    chapterTitlePlaceholder: 'Ej: Capítulo 3 – El Regreso',
    scriptPdf: 'Guión PDF',
    dropPdf: 'Arrastra el PDF aquí o clic para elegir',
    uploadingPdf: 'Subiendo PDF…',
    selectPdf: 'Selecciona un PDF para este capítulo.',
    selectPdfFile: 'Por favor selecciona un archivo PDF.',
    fileTooLarge: 'El archivo supera el límite de {max} MB.',
    deleteChapter: 'Eliminar capítulo',
    backToProjects: '← Proyectos',

    // Viewer / App
    backToChapters: '← Capítulos',
    dragToMark: 'Arrastra para marcar',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    drawingMode: '✏️ Dibujando…',
    annotateMode: '✏️ Anotar',
    pdfExportError: 'Error al generar el PDF. Intenta de nuevo.',
    uploadError: 'Error al subir el PDF.',

    // AnnotationSidebar
    annotations: 'Anotaciones',
    annotationSingular: 'anotación',
    annotationPlural: 'anotaciones',
    department: 'Departamento',
    phase: 'Etapa',
    allDepts: 'Todos',
    allPhases: 'Todas',
    shiftClickHint: 'Shift+clic: selección múltiple',
    noAnnotations: 'Sin anotaciones',
    noAnnotationsFiltered: 'Sin anotaciones con estos filtros',
    of: 'de',
    page: 'Pág',
    scene: 'Esc',
    jumpToScript: 'Clic para ir al guión',
    edit: 'Editar',
    excelExport: '⬇ Excel',
    pdfExport: '⬇ PDF con notas',
    pdfExporting: '⏳ Generando…',
    pdfExportTooltip: 'Descarga el PDF con los rectángulos y notas dibujados',
    closeSidebar: 'Cerrar',
    fab: '📋',
    fabClose: '✕ Cerrar',

    // Departments & Phases
    dept_dialogos: 'Diálogos',
    dept_ambientes: 'Ambientes',
    dept_efectos: 'Efectos',
    dept_foley: 'Foley',
    phase_pre: 'Pre',
    phase_prod: 'Prod',
    phase_post: 'Post',

    // AnnotationForm
    newAnnotation: 'Nueva Anotación',
    editAnnotation: 'Editar Anotación',
    scenePlaceholder: 'Ej: 120',
    sceneLabel: 'Escena',
    commentLabel: 'Comentario',
    optional: '(opcional)',
    commentPlaceholder: 'Ej: Grabar en locación, ambiente exterior',
    save: 'Guardar',
    update: 'Actualizar',

    // PasswordGate
    loginDesc: 'Accede con la cuenta Google del equipo para continuar.',
    loginBtn: 'Acceder con Google',
    loginError: 'Error al iniciar sesión. Intenta de nuevo.',
    accessDenied: 'Tu cuenta no tiene acceso a esta aplicación.',
    contactAdmin: 'Contacta al administrador para solicitar acceso.',
    tryAnother: 'Intentar con otra cuenta',
    motto: 'escuchar es mirar',
  },

  en: {
    // Global
    appSubtitle: 'Sound Breakdown · Sound Department',
    loading: 'Loading…',
    signOut: 'Sign out',
    cancel: 'Cancel',
    create: 'Create →',
    delete: '×',
    close: 'Close',

    // ProjectList
    project: 'Project',
    projects: 'projects',
    projectSingular: 'project',
    noProjects: 'No projects yet. Create the first one.',
    newProject: 'New Project',
    projectName: 'Name',
    projectNamePlaceholder: 'E.g.: HASAN S02',
    deleteProject: 'Delete project',
    confirmDeleteProject: 'Delete "{title}" and its {count} chapter(s) with all annotations? This cannot be undone.',
    confirmDeleteProjectEmpty: 'Delete project "{title}"?',
    confirmDelete: 'Delete?',
    clickToOpen: 'Click to open →',
    members: 'Members',
    membersSuffix: 'member',
    membersSuffixPlural: 'members',
    membersLabel: 'Members (emails, separated by comma)',
    membersPlaceholder: 'user1@gmail.com, user2@gmail.com',
    membersHint: 'Admin always has access. Members can be edited later.',
    noMembers: 'No members — admin only',
    addMember: 'Add',
    manageMembers: 'Manage members',
    removeMember: 'Remove',

    // ChapterList
    chapter: 'Chapter',
    chapters: 'chapters',
    chapterSingular: 'chapter',
    noChapters: 'No chapters yet. Create the first one.',
    newChapter: 'New Chapter',
    chapterTitle: 'Title',
    chapterTitlePlaceholder: 'E.g.: Chapter 3 – The Return',
    scriptPdf: 'Script PDF',
    dropPdf: 'Drag PDF here or click to choose',
    uploadingPdf: 'Uploading PDF…',
    selectPdf: 'Select a PDF for this chapter.',
    selectPdfFile: 'Please select a PDF file.',
    fileTooLarge: 'File exceeds the {max} MB limit.',
    deleteChapter: 'Delete chapter',
    backToProjects: '← Projects',

    // Viewer / App
    backToChapters: '← Chapters',
    dragToMark: 'Drag to mark',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    drawingMode: '✏️ Drawing…',
    annotateMode: '✏️ Annotate',
    pdfExportError: 'Error generating PDF. Try again.',
    uploadError: 'Error uploading PDF.',

    // AnnotationSidebar
    annotations: 'Annotations',
    annotationSingular: 'annotation',
    annotationPlural: 'annotations',
    department: 'Department',
    phase: 'Phase',
    allDepts: 'All',
    allPhases: 'All',
    shiftClickHint: 'Shift+click: multi-select',
    noAnnotations: 'No annotations',
    noAnnotationsFiltered: 'No annotations with these filters',
    of: 'of',
    page: 'Pg',
    scene: 'Sc',
    jumpToScript: 'Click to jump to script',
    edit: 'Edit',
    excelExport: '⬇ Excel',
    pdfExport: '⬇ Annotated PDF',
    pdfExporting: '⏳ Generating…',
    pdfExportTooltip: 'Download PDF with annotations drawn on it',
    closeSidebar: 'Close',
    fab: '📋',
    fabClose: '✕ Close',

    // Departments & Phases
    dept_dialogos: 'Dialogue',
    dept_ambientes: 'Ambience',
    dept_efectos: 'Effects',
    dept_foley: 'Foley',
    phase_pre: 'Pre',
    phase_prod: 'Prod',
    phase_post: 'Post',

    // AnnotationForm
    newAnnotation: 'New Annotation',
    editAnnotation: 'Edit Annotation',
    scenePlaceholder: 'E.g.: 120',
    sceneLabel: 'Scene',
    commentLabel: 'Comment',
    optional: '(optional)',
    commentPlaceholder: 'E.g.: Record on location, exterior ambience',
    save: 'Save',
    update: 'Update',

    // PasswordGate
    loginDesc: 'Sign in with your team Google account to continue.',
    loginBtn: 'Sign in with Google',
    loginError: 'Error signing in. Try again.',
    accessDenied: 'Your account does not have access to this application.',
    contactAdmin: 'Contact the administrator to request access.',
    tryAnother: 'Try another account',
    motto: 'to listen is to see',
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('hasan-lang') || 'es'; } catch { return 'es'; }
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'es' ? 'en' : 'es';
      try { localStorage.setItem('hasan-lang', next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback((key) => strings[lang]?.[key] ?? strings.es[key] ?? key, [lang]);

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
