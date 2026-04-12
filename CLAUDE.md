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
| Autenticación | Firebase Auth (Google Sign-In) |
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

## Variables de entorno

Las credenciales de Firebase viven en `.env.local` (gitignoreado) y en Vercel Environment Variables:

```
VITE_FB_API_KEY
VITE_FB_AUTH_DOMAIN
VITE_FB_PROJECT_ID
VITE_FB_STORAGE_BUCKET
VITE_FB_MESSAGING_SENDER_ID
VITE_FB_APP_ID
```

Se consumen en `firebase.js` con `import.meta.env.VITE_FB_*`. La `apiKey` de Firebase es pública por diseño — la seguridad real está en las Security Rules.

---

## Estructura del proyecto

```
src/
├── App.jsx                        # Componente principal — toda la lógica
├── App.css                        # Estilos globales + variables CSS + responsive
├── firebase.js                    # Instancias db, storage y auth
├── main.jsx                       # Punto de entrada React
├── components/
│   ├── AnnotationForm.jsx         # Modal de crear/editar anotación
│   ├── AnnotationSidebar.jsx      # Sidebar de lista + filtros (componente controlado)
│   ├── AnnotationTable.jsx        # Tabla legacy (sin uso activo)
│   ├── ChapterList.jsx            # Página de gestión de capítulos
│   ├── FileUploader.jsx           # Drop zone para subir PDF
│   ├── PasswordGate.jsx           # Auth — Google Sign-In con Firebase
│   └── ProjectList.jsx            # Pantalla de selección de proyectos
└── utils/
    ├── excelExport.js             # Genera .xlsx con las anotaciones filtradas
    └── pdfAnnotate.js             # Dibuja rectángulos + stickers sobre el PDF
```

**Archivos de configuración en raíz:**
- `.env.local` — credenciales Firebase (gitignoreado)
- `.gitignore` — excluye `node_modules/`, `dist/`, `.env*`
- `firestore.rules` — reglas de seguridad Firestore
- `storage.rules` — reglas de seguridad Storage
- `firebase.json` — mapeo de rules para Firebase CLI

---

## Modelos de datos (Firestore)

### Colección `/projects`
```js
{
  id: string,          // auto-generado por Firestore
  title: string,
  members: [string],   // array de emails con acceso al proyecto
  createdAt: number,   // timestamp ms
}
```

### Colección `/chapters`
```js
{
  id: string,          // auto-generado por Firestore
  title: string,
  pdfUrl: string,      // URL de Firebase Storage
  projectId: string,   // ID del proyecto al que pertenece
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
- `projects` / `activeProject` — proyectos y proyecto activo
- `chapters` / `activeChapter` — capítulos y capítulo activo (filtrados por `activeProject.id`)
- `annotations` / `chapterAnnotations` — todas las anotaciones; filtradas por capítulo
- `filteredAnnotations` — `chapterAnnotations` filtradas por `deptFilter` + `phaseFilter` (usado en PDF viewer Y en exports)
- `deptFilter`, `phaseFilter` — **`Set<string>`** (vacío = mostrar todos); se pasa como props a `AnnotationSidebar`
- `selectedAnnotationId` — ID de la anotación actualmente seleccionada (click en PDF → scroll en sidebar)
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
- **Acceso por proyecto**: admin ve todos los proyectos; usuarios normales solo ven proyectos donde su email está en `members[]`
- **Navegación en 3 pantallas**: ProjectList → ChapterList → PDF Viewer

---

## AnnotationSidebar — componente controlado

`AnnotationSidebar` **no tiene estado local de filtros**. Recibe todo como props desde `App.jsx`.

```jsx
<AnnotationSidebar
  deptFilter={deptFilter}           // Set<string>
  phaseFilter={phaseFilter}         // Set<string>
  onDeptFilter={setDeptFilter}
  onPhaseFilter={setPhaseFilter}
  selectedAnnotationId={selectedAnnotationId}
  ...
/>
```

### Filtros multi-selección (Shift+clic)
- **Clic normal**: selección exclusiva (clic en el mismo = deseleccionar todo)
- **Shift+clic**: añade/quita de la selección actual
- **Set vacío** = "mostrar todos" (equivale al botón "Todos")
- Lógica en `toggleDept(id, multi)` / `togglePhase(id, multi)`:

```js
const toggleDept = (id, multi) => {
  if (multi) {
    const next = new Set(deptFilter);
    next.has(id) ? next.delete(id) : next.add(id);
    onDeptFilter(next);
  } else {
    onDeptFilter(deptFilter.size === 1 && deptFilter.has(id) ? new Set() : new Set([id]));
  }
};
```

### Scroll automático al ítem seleccionado
`itemRefs` (`useRef({})`) almacena refs DOM por `annotation.id`. Un `useEffect` sobre `selectedAnnotationId` llama `.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.

---

## Anotaciones clickeables en el PDF

Las áreas de highlight tienen `pointerEvents: 'auto'` y `zIndex: 2`. Al hacer clic:
1. Se setea `selectedAnnotationId`
2. Se abre el sidebar (`setSidebarOpen(true)`)
3. El sidebar hace scroll automático al ítem correspondiente y lo resalta con `.sidebar-item.selected`

El ítem seleccionado también se activa al usar "saltar a anotación" (`onJumpTo`).

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

### Evitar solapamiento de stickers
`placedStickers` es un `Map` keyed por `${pageIndex}-${side}` que rastrea los stickers ya colocados en cada columna (derecha/izquierda/abajo). Antes de colocar uno nuevo, itera para empujarlo hacia arriba si hay conflicto.

**Importante**: La variable interna del slot se llama `slots` (no `col`) para evitar shadowing con `const col = hexToRgb(ann.color)` del scope exterior.

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
- `≤ 768px` **o** dispositivo táctil `≤ 1100px` (`pointer: coarse`): sidebar se convierte en bottom sheet (68vh), aparece FAB, formulario centrado. Cubre tablets como Samsung Galaxy Tab S7 (800px de ancho).
- `≤ 480px`: ajustes adicionales de padding

**Clases clave:**
- `.sidebar.open` — activa la animación slide-up en móvil
- `.floating-form-wrapper.edit-mode` — centra el formulario de edición en todas las pantallas
- `.draw-mode-btn.active` — botón de anotar con animación pulse
- `.sidebar-item.selected` — resalta la anotación activa con borde naranja
- `.filter-hint` — texto "Shift+clic: selección múltiple" (oculto en móvil)
- `.app-header-user` / `.user-avatar` / `.user-name` / `.btn-signout` — sección de usuario en header

---

## Autenticación

`PasswordGate.jsx` protege toda la app con **Google Sign-In** (Firebase Auth):
- `onAuthStateChanged` detecta sesión existente al cargar → no pide login si ya hay sesión
- Firebase persiste la sesión en IndexedDB automáticamente
- `authUser === undefined` = cargando | `null` = no autenticado | objeto = autenticado
- El header muestra foto de perfil, nombre y botón de cerrar sesión (`signOut`)
- **No hay contraseña compartida**: cada usuario inicia sesión con su propia cuenta Google

### Security Rules
Tanto Firestore como Storage requieren `request.auth != null`. Se configuran manualmente en Firebase Console (el proyecto usa una cuenta Firebase distinta a la del CLI local):

- **Firestore**: Console → Firestore → Rules
- **Storage**: Console → Storage → Rules
- **Google Sign-In**: Console → Authentication → Sign-in method → Google → Activar
- **Dominio autorizado**: Console → Authentication → Settings → Authorized domains → agregar dominio de Vercel
