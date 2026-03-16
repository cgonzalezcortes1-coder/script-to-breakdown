# CLAUDE.md — HASAN Script Breakdown

Herramienta colaborativa de desglose de guiones para el departamento de sonido. Permite anotar PDFs con notas por departamento, etapa de producción y escena, con sincronización en tiempo real a través de Firebase.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + Vite |
| Estado | React hooks + Firebase real-time listeners |
| Visualización PDF | `@react-pdf-viewer` + `pdfjs-dist@3.4.120` |
| Anotación PDF (export) | `pdf-lib` |
| Base de datos | Firestore |
| Almacenamiento | Firebase Cloud Storage |
| Export Excel | `xlsx` |
| Estilos | CSS plano con custom properties |

---

## Comandos

```bash
npm run dev      # Servidor de desarrollo (Vite)
npm run build    # Build de producción
npm run preview  # Preview del build local
```

El proyecto se despliega en **Vercel** (push a `main` = deploy automático).

---

## Estructura del proyecto

```
src/
├── App.jsx                        # Componente principal — toda la lógica
├── App.css                        # Estilos globales + variables CSS + responsive
├── firebase.js                    # Instancias db y storage (Firestore + Storage)
├── main.jsx                       # Punto de entrada React
├── components/
│   ├── AnnotationForm.jsx         # Modal de crear/editar anotación
│   ├── AnnotationSidebar.jsx      # Sidebar de lista + filtros (componente controlado)
│   ├── AnnotationTable.jsx        # Tabla legacy (sin uso activo)
│   ├── ChapterList.jsx            # Página de gestión de capítulos
│   ├── FileUploader.jsx           # Drop zone para subir PDF
│   └── PasswordGate.jsx           # Auth de sesión por contraseña
└── utils/
    ├── excelExport.js             # Genera .xlsx con las anotaciones filtradas
    └── pdfAnnotate.js             # Dibuja rectángulos + stickers sobre el PDF
```

---

## Modelos de datos (Firestore)

### Colección `/chapters`
```js
{
  id: string,          // auto-generado por Firestore
  title: string,
  pdfUrl: string,      // URL de Firebase Storage
  order: number,       // orden de visualización
  createdAt: number,   // timestamp ms
}
```

### Colección `/annotations`
```js
{
  id: string,
  chapterId: string,
  pageIndex: number,           // 0-indexed
  highlightAreas: [{           // coordenadas en % (0-100) del tamaño de página
    pageIndex, left, top, width, height
  }],
  department: string,          // label: "Diálogos"
  departmentId: string,        // key: "dialogos"
  color: string,               // hex: "#16a34a"
  phase: string,               // id: "prod"
  phaseLabel: string,          // label: "Prod"
  phaseColor: string,          // hex
  scene: string,               // opcional, número de escena
  note: string,                // opcional, comentario libre
  createdAt: number,
}
```

---

## Constantes importantes (definidas en App.jsx)

### Departamentos
```js
DEPARTMENTS = [
  { id: 'dialogos',  label: 'Diálogos',  color: '#16a34a' },
  { id: 'ambientes', label: 'Ambientes', color: '#ea580c' },
  { id: 'efectos',   label: 'Efectos',   color: '#db2777' },
  { id: 'foley',     label: 'Foley',     color: '#7c3aed' },
]
```

### Etapas
```js
PHASES = [
  { id: 'pre',  label: 'Pre',  color: '#3b82f6' },
  { id: 'prod', label: 'Prod', color: '#f59e0b' },
  { id: 'post', label: 'Post', color: '#14b8a6' },
]
```

---

## Arquitectura de App.jsx

### Estado principal
- `chapters` / `activeChapter` — capítulos y capítulo activo
- `annotations` / `chapterAnnotations` — todas las anotaciones; filtradas por capítulo
- `filteredAnnotations` — `chapterAnnotations` filtradas por `deptFilter` + `phaseFilter` (usado en PDF viewer Y en exports)
- `deptFilter`, `phaseFilter` — estado de filtros (se pasa hacia abajo como props a `AnnotationSidebar`)
- `activeDept` — departamento seleccionado para dibujar
- `drawing`, `pendingHighlight`, `popupMode` — estado del modo dibujo
- `mobileDrawMode` + `mobileDrawModeRef` — activa dibujo con toque en móvil
- `editingAnnotation` — anotación en modo edición
- `sidebarOpen` — visibilidad del sidebar en móvil
- `exportingPdf`, `pdfProgress` — estado del export PDF

### Refs (para event handlers)
`drawingRef`, `activeDeptRef`, `popupModeRef`, `drawingPageElRef`, `mobileDrawModeRef`

### Patrones clave
- **Listeners en tiempo real**: `onSnapshot()` en `/chapters` y `/annotations` — sin refresh manual
- **Filtrado en cliente**: todas las anotaciones se cargan en memoria y se filtran en JS
- **Coordenadas en porcentaje**: `highlightAreas` usa % del tamaño de página → zoom-independent
- **Eliminación en batch**: al borrar capítulo se usa `writeBatch()` para eliminar capítulo + todas sus anotaciones
- **Estado de filtros elevado**: `deptFilter`/`phaseFilter` viven en `App.jsx` para que el PDF viewer y los exports los usen

---

## AnnotationSidebar — componente controlado

`AnnotationSidebar` **no tiene estado local de filtros**. Recibe `deptFilter`, `phaseFilter`, `onDeptFilter`, `onPhaseFilter` como props desde `App.jsx`.

```jsx
<AnnotationSidebar
  deptFilter={deptFilter}
  phaseFilter={phaseFilter}
  onDeptFilter={setDeptFilter}
  onPhaseFilter={setPhaseFilter}
  ...
/>
```

---

## Modo dibujo (desktop vs móvil)

- **Desktop**: clic + arrastre sobre el PDF directamente
- **Móvil**: el toque por defecto hace scroll; hay que activar "✏ Anotar" para dibujar
- `mobileDrawModeRef` se usa dentro de los event handlers (evita stale closure)
- `touchAction: mobileDrawMode ? 'none' : 'auto'` en el overlay para dejar pasar el scroll

---

## pdfAnnotate.js — lógica de stickers

Al exportar, cada anotación dibuja:
1. **Rectángulo** translúcido con borde de color
2. **Strip de label** (departamento + escena) en la parte superior del rect
3. **Sticker de nota** (si hay nota): se intenta colocar en este orden:
   - Margen derecho → margen izquierdo → debajo del rect (fallback)
   - Caja blanca semitransparente + línea conectora al rect
   - `wrapText()` incluye `truncateWord()` para que no se salga del margen

**Importante**: La función `toAscii()` elimina tildes porque Helvetica (la fuente embebida) no soporta caracteres no-ASCII.

---

## Exports

Ambos exports usan `filteredAnnotations` (respetan los filtros activos del sidebar):

```js
// Excel
exportToExcel(filteredAnnotations, activeChapter.title)

// PDF anotado
exportAnnotatedPdf(activeChapter.pdfUrl, filteredAnnotations, activeChapter.title, setPdfProgress)
```

**Nombres de archivo:** `hasan-breakdown-{slug}-{YYYY-MM-DD}.xlsx / .pdf`

---

## CSS — variables y responsive

```css
/* Variables principales */
--orange: #F5A623
--bg, --surface, --surface2, --surface3   /* grises */
--border, --text, --text-muted, --accent
```

**Breakpoints:**
- `≤ 768px`: sidebar se convierte en bottom sheet (68vh), aparece FAB, formulario centrado
- `≤ 480px`: ajustes adicionales de padding

**Clases clave:**
- `.sidebar.open` — activa la animación slide-up en móvil
- `.floating-form-wrapper.edit-mode` — centra el formulario de edición en todas las pantallas
- `.draw-mode-btn.active` — botón de anotar con animación pulse

---

## Autenticación

`PasswordGate.jsx` protege toda la app con una contraseña única compartida:
- Almacenada en `sessionStorage` → se pide una vez por sesión del navegador
- **No es autenticación de usuario**: todos los usuarios comparten el mismo acceso y ven los mismos datos
- La contraseña se valida comparando contra un valor hard-codeado en el componente
