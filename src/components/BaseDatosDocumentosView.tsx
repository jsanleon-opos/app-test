import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ConvocatoriaAmbito, DocumentoBibliotecaItem } from '../types';
import {
  ETIQUETAS_TEMAS_AGE_C1,
  ETIQUETAS_TEMAS_CAM_C1,
  CATALOGO_LEYES_REALES_DECRETOS_BIBLIOTECA,
} from '../constants/catalogoBibliotecaDocumentos';
import {
  guardarArchivoConSelectorCarpeta,
  limpiarTextoJSON,
  sanitizarDocumentoBibliotecaSinBinarios,
} from '../utils/jsonExamHelper';
import { obtenerUrlBOEParaNorma } from '../utils/boeUrlHelper';

interface BaseDatosDocumentosViewProps {
  documentos: DocumentoBibliotecaItem[];
  onActualizarDocumentos: (docs: DocumentoBibliotecaItem[]) => void;
  subtemasDisponibles: string[];
  onActualizarSubtemas: (subtemas: string[]) => void;
}

// Persistencia ligera de punteros FileSystemFileHandle en IndexedDB del navegador
// (SOLO guarda el puntero del sistema de archivos del navegador, 0 bytes en JSON de copia de seguridad)
const IDB_NAME = 'c1_biblioteca_file_handles_db';
const IDB_STORE = 'file_handles';

async function guardarFileHandleEnIndexedDB(docId: string, handle: any): Promise<void> {
  if (typeof indexedDB === 'undefined' || !handle) return;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(handle, docId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (_) {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch (_) {
      resolve();
    }
  });
}

async function obtenerFileHandleDeIndexedDB(docId: string): Promise<any | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readonly');
          const getReq = tx.objectStore(IDB_STORE).get(docId);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

// Detecta el programa asociado según la extensión o formato del documento
function obtenerInfoProgramaAsociado(doc: DocumentoBibliotecaItem): {
  nombrePrograma: string;
  icono: string;
  badgeClass: string;
  esquemaProtocoloOffice?: 'ms-word' | 'ms-excel' | 'ms-powerpoint' | 'ms-access';
  extensionDetectada: string;
} {
  if (doc.tipoEnlace === 'web_externa') {
    return {
      nombrePrograma: 'Navegador Web / BOE',
      icono: 'fa-globe',
      badgeClass:
        'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      extensionDetectada: 'web',
    };
  }

  const ref = `${doc.nombreArchivoReferencia || ''} ${doc.enlaceORuta || ''} ${doc.formatoDocumento || ''}`.toLowerCase();

  if (/\.(docx?|rtf|odt)\b/.test(ref) || ref.includes('word')) {
    return {
      nombrePrograma: 'Microsoft Word',
      icono: 'fa-file-word',
      badgeClass:
        'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      esquemaProtocoloOffice: 'ms-word',
      extensionDetectada: 'docx',
    };
  }
  if (/\.(xlsx?|xlsm|csv)\b/.test(ref) || ref.includes('excel')) {
    return {
      nombrePrograma: 'Microsoft Excel',
      icono: 'fa-file-excel',
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      esquemaProtocoloOffice: 'ms-excel',
      extensionDetectada: 'xlsx',
    };
  }
  if (/\.(pptx?|ppsx?)\b/.test(ref) || ref.includes('powerpoint') || ref.includes('presentacion')) {
    return {
      nombrePrograma: 'Microsoft PowerPoint',
      icono: 'fa-file-powerpoint',
      badgeClass:
        'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      esquemaProtocoloOffice: 'ms-powerpoint',
      extensionDetectada: 'pptx',
    };
  }
  if (/\.(accdb|mdb)\b/.test(ref) || ref.includes('access')) {
    return {
      nombrePrograma: 'Microsoft Access',
      icono: 'fa-database',
      badgeClass:
        'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      esquemaProtocoloOffice: 'ms-access',
      extensionDetectada: 'accdb',
    };
  }
  if (/\.pdf\b/.test(ref) || ref.includes('pdf')) {
    return {
      nombrePrograma: 'Visor PDF / Acrobat',
      icono: 'fa-file-pdf',
      badgeClass:
        'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      extensionDetectada: 'pdf',
    };
  }
  if (/\.(png|jpe?g|webp|gif|svg)\b/.test(ref) || ref.includes('imagen')) {
    return {
      nombrePrograma: 'Visor de Imágenes',
      icono: 'fa-file-image',
      badgeClass:
        'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      extensionDetectada: 'img',
    };
  }
  if (/\.(txt|md|json)\b/.test(ref)) {
    return {
      nombrePrograma: 'Editor de Texto',
      icono: 'fa-file-lines',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      extensionDetectada: 'txt',
    };
  }

  return {
    nombrePrograma: 'Programa Asociado del Sistema',
    icono: 'fa-file-invoice',
    badgeClass:
      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    extensionDetectada: 'local',
  };
}

// Convierte una ruta local (ej. C:\Carpeta\Archivo.docx) en file:/// URI válida
function convertirRutaLocalAFileUri(ruta: string): string {
  const limpia = ruta.trim().replace(/^["']|["']$/g, '');
  if (/^file:\/\//i.test(limpia)) return limpia;
  const conSlashes = limpia.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(conSlashes)) {
    return `file:///${encodeURI(conSlashes)}`;
  }
  if (conSlashes.startsWith('/')) {
    return `file://${encodeURI(conSlashes)}`;
  }
  return `file:///${encodeURI(conSlashes)}`;
}

export const BaseDatosDocumentosView: React.FC<BaseDatosDocumentosViewProps> = ({
  documentos,
  onActualizarDocumentos,
  subtemasDisponibles,
  onActualizarSubtemas,
}) => {
  // Vista activa: 'listado' (por defecto, igual que Historial y Banco de Exámenes) o 'tarjetas'
  const [vistaDocumentos, setVistaDocumentos] = useState<'listado' | 'tarjetas'>('listado');

  // Paginación: 10 registros por página (igual que Historial y Banco de Exámenes)
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const REGISTROS_POR_PAGINA = 10;

  // Ordenación por columnas en vista listado
  const [columnaOrden, setColumnaOrden] = useState<'titulo' | 'tipo' | 'ambito' | 'normativa' | 'fecha'>('fecha');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('desc');

  // Estados de búsqueda y filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoEnlace, setFiltroTipoEnlace] = useState<'todos' | 'web_externa' | 'documento_local'>('todos');
  const [filtroAmbito, setFiltroAmbito] = useState<'todos' | ConvocatoriaAmbito>('todos');
  const [filtroLeyODecreto, setFiltroLeyODecreto] = useState<string>('todas');
  const [filtroTema, setFiltroTema] = useState<string>('todos');
  const [filtroSubtema, setFiltroSubtema] = useState<string>('todos');
  const [soloDestacados, setSoloDestacados] = useState<boolean>(false);

  // Estados de modales
  const [mostrarModalFormulario, setMostrarModalFormulario] = useState<boolean>(false);
  const [documentoEnEdicion, setDocumentoEnEdicion] = useState<DocumentoBibliotecaItem | null>(null);
  const [documentoAEliminar, setDocumentoAEliminar] = useState<DocumentoBibliotecaItem | null>(null);
  const [mostrarGestorSubtemas, setMostrarGestorSubtemas] = useState<boolean>(false);
  const [copiadoRutaId, setCopiadoRutaId] = useState<string | null>(null);
  const [mensajeFeedback, setMensajeFeedback] = useState<{ texto: string; tipo: 'exito' | 'info' | 'error' } | null>(null);

  // Memoria de sesión para archivos locales seleccionados (0 bytes en localStorage / JSON backup)
  const sessionFilesRef = useRef<Map<string, File>>(new Map());
  const pendingFileHandleRef = useRef<any | null>(null);
  const pendingFileObjRef = useRef<File | null>(null);
  const [docPendienteVincularEnDobleClic, setDocPendienteVincularEnDobleClic] =
    useState<DocumentoBibliotecaItem | null>(null);
  const fallbackInputFileRef = useRef<HTMLInputElement | null>(null);

  // Campos del formulario de Añadir / Editar Documento o Enlace
  const [formTitulo, setFormTitulo] = useState('');
  const [formTipoEnlace, setFormTipoEnlace] = useState<'web_externa' | 'documento_local'>('web_externa');
  const [formEnlaceORuta, setFormEnlaceORuta] = useState('');
  const [formNombreArchivoRef, setFormNombreArchivoRef] = useState('');
  const [formFormatoDocumento, setFormFormatoDocumento] = useState('PDF');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formAmbito, setFormAmbito] = useState<ConvocatoriaAmbito>('AGE');
  const [formTemasAge, setFormTemasAge] = useState<string[]>([]);
  const [formTemasCam, setFormTemasCam] = useState<string[]>([]);
  const [formLeyesYDecretos, setFormLeyesYDecretos] = useState<string[]>([]);
  const [formSubtemas, setFormSubtemas] = useState<string[]>([]);
  const [formDestacado, setFormDestacado] = useState<boolean>(false);

  // Buscadores internos dentro del modal de etiquetado
  const [tabEtiquetadoModal, setTabEtiquetadoModal] = useState<'leyes' | 'temas_age' | 'temas_cam' | 'subtemas'>('leyes');
  const [busquedaEtiquetaModal, setBusquedaEtiquetaModal] = useState('');
  const [nuevaLeyPersonalizadaInput, setNuevaLeyPersonalizadaInput] = useState('');
  const [nuevoSubtemaInput, setNuevoSubtemaInput] = useState('');

  const mostrarNotificacion = (texto: string, tipo: 'exito' | 'info' | 'error' = 'exito') => {
    setMensajeFeedback({ texto, tipo });
    setTimeout(() => setMensajeFeedback(null), 4200);
  };

  // Todas las leyes/decretos disponibles (catálogo oficial + cualquier etiqueta personalizada en documentos)
  const todasLasLeyesDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    CATALOGO_LEYES_REALES_DECRETOS_BIBLIOTECA.forEach((item) => {
      mapa.set(item.etiqueta, item.nombreCompleto);
    });
    documentos.forEach((doc) => {
      (doc.leyesYDecretos || []).forEach((l) => {
        if (l && !mapa.has(l)) {
          mapa.set(l, l);
        }
      });
    });
    return Array.from(mapa.entries()).map(([etiqueta, nombreCompleto]) => ({
      etiqueta,
      nombreCompleto,
    }));
  }, [documentos]);

  // Todos los subtemas disponibles (predefinidos/guardados + usados en documentos)
  const todosLosSubtemas = useMemo(() => {
    const set = new Set<string>(subtemasDisponibles);
    documentos.forEach((d) => {
      (d.subtemas || []).forEach((s) => {
        if (s && s.trim()) set.add(s.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [subtemasDisponibles, documentos]);

  // Filtrado y ordenación de documentos
  const documentosFiltradosYOrdenados = useMemo(() => {
    const filtrados = documentos.filter((doc) => {
      if (soloDestacados && !doc.destacado) return false;
      if (filtroTipoEnlace !== 'todos' && doc.tipoEnlace !== filtroTipoEnlace) return false;
      if (filtroAmbito !== 'todos' && doc.ambito !== filtroAmbito && doc.ambito !== 'AMBOS') return false;

      if (filtroLeyODecreto !== 'todas') {
        if (!(doc.leyesYDecretos || []).includes(filtroLeyODecreto)) return false;
      }

      if (filtroTema !== 'todos') {
        const enAge = (doc.temasAgeC1 || []).includes(filtroTema);
        const enCam = (doc.temasCamC1 || []).includes(filtroTema);
        if (!enAge && !enCam) return false;
      }

      if (filtroSubtema !== 'todos') {
        if (!(doc.subtemas || []).includes(filtroSubtema)) return false;
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const textoTotal = [
          doc.titulo,
          doc.descripcion || '',
          doc.enlaceORuta,
          doc.nombreArchivoReferencia || '',
          doc.formatoDocumento || '',
          ...(doc.temasAgeC1 || []),
          ...(doc.temasCamC1 || []),
          ...(doc.leyesYDecretos || []),
          ...(doc.subtemas || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!textoTotal.includes(q)) return false;
      }

      return true;
    });

    filtrados.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (columnaOrden) {
        case 'titulo':
          valA = a.titulo.toLowerCase();
          valB = b.titulo.toLowerCase();
          break;
        case 'tipo':
          valA = `${a.tipoEnlace}_${a.formatoDocumento || ''}`.toLowerCase();
          valB = `${b.tipoEnlace}_${b.formatoDocumento || ''}`.toLowerCase();
          break;
        case 'ambito':
          valA = a.ambito;
          valB = b.ambito;
          break;
        case 'normativa':
          valA = (a.leyesYDecretos?.[0] || '').toLowerCase();
          valB = (b.leyesYDecretos?.[0] || '').toLowerCase();
          break;
        case 'fecha':
        default:
          valA = a.fechaActualizacion || a.fechaCreacion || '';
          valB = b.fechaActualizacion || b.fechaCreacion || '';
          break;
      }

      if (valA < valB) return direccionOrden === 'asc' ? -1 : 1;
      if (valA > valB) return direccionOrden === 'asc' ? 1 : -1;
      return 0;
    });

    return filtrados;
  }, [
    documentos,
    soloDestacados,
    filtroTipoEnlace,
    filtroAmbito,
    filtroLeyODecreto,
    filtroTema,
    filtroSubtema,
    busqueda,
    columnaOrden,
    direccionOrden,
  ]);

  // Reiniciar a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [
    busqueda,
    filtroTipoEnlace,
    filtroAmbito,
    filtroLeyODecreto,
    filtroTema,
    filtroSubtema,
    soloDestacados,
    columnaOrden,
    direccionOrden,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(documentosFiltradosYOrdenados.length / REGISTROS_POR_PAGINA));

  const documentosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    return documentosFiltradosYOrdenados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [documentosFiltradosYOrdenados, paginaActual]);

  const toggleOrdenColumna = (col: typeof columnaOrden) => {
    if (columnaOrden === col) {
      setDireccionOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColumnaOrden(col);
      setDireccionOrden(col === 'fecha' ? 'desc' : 'asc');
    }
  };

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = documentos.length;
    const webs = documentos.filter((d) => d.tipoEnlace === 'web_externa').length;
    const locales = documentos.filter((d) => d.tipoEnlace === 'documento_local').length;
    const conTemasAge = documentos.filter((d) => (d.temasAgeC1 || []).length > 0).length;
    const conTemasCam = documentos.filter((d) => (d.temasCamC1 || []).length > 0).length;
    const conRD1708 = documentos.filter((d) =>
      (d.leyesYDecretos || []).some((l) => l.includes('1708/2011'))
    ).length;
    return { total, webs, locales, conTemasAge, conTemasCam, conRD1708 };
  }, [documentos]);

  const obtenerHrefParaEnlaceWeb = (enlace: string): string => {
    const limpio = enlace.trim();
    if (/^https?:\/\//i.test(limpio)) return limpio;
    return `https://${limpio}`;
  };

  const dispararEnlaceAnchor = (href: string, nuevaPestana: boolean = true, downloadName?: string) => {
    const a = document.createElement('a');
    a.href = href;
    if (downloadName) {
      a.download = downloadName;
    } else if (nuevaPestana) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const abrirArchivoFileConProgramaAsociado = (file: File, doc: DocumentoBibliotecaItem) => {
    const infoProg = obtenerInfoProgramaAsociado(doc);
    const blobUrl = URL.createObjectURL(file);

    // Si es PDF, imagen o texto que el visor del sistema/navegador abre directamente, abrir en pestaña;
    // si es Word, Excel, PowerPoint, Access u otro binario de escritorio, lanzar con nombre de archivo para que el SO lo abra con su programa asociado
    if (['pdf', 'img', 'txt'].includes(infoProg.extensionDetectada)) {
      dispararEnlaceAnchor(blobUrl, true);
    } else {
      dispararEnlaceAnchor(blobUrl, false, file.name || doc.nombreArchivoReferencia || `${doc.titulo}`);
    }

    mostrarNotificacion(
      `Abriendo "${file.name || doc.titulo}" con ${infoProg.nombrePrograma}...`,
      'exito'
    );

    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);
  };

  /**
   * MANEJADOR CENTRAL DE DOBLE CLIC / APERTURA CON PROGRAMA ASOCIADO
   * 1. Si es web externa -> Abre en nueva pestaña.
   * 2. Si es documento local ->
   *    a) Intenta abrirlo directamente en el sistema operativo local mediante /api/open-local-file (cmd start / open / xdg-open).
   *    b) Si tiene un puntero FileSystemFileHandle o File vinculado en la sesión/IndexedDB, lo abre al instante sin almacenar el archivo en el JSON.
   *    c) Si es un documento de Microsoft Office (Word, Excel, PowerPoint, Access) con ruta local, invoca el esquema de protocolo nativo (ms-word:ofe|u|file:///..., ms-excel:..., etc.) que abre directamente el programa de escritorio asociado.
   *    d) Si aún no está vinculado en el navegador y el servidor es remoto, copia su ruta automáticamente y permite seleccionarlo una sola vez para abrirlo al instante en este y futuros dobles clics.
   */
  const handleAbrirDocumentoConProgramaAsociado = async (doc: DocumentoBibliotecaItem) => {
    if (doc.tipoEnlace === 'web_externa') {
      dispararEnlaceAnchor(obtenerHrefParaEnlaceWeb(doc.enlaceORuta), true);
      mostrarNotificacion(`Abriendo enlace web "${doc.titulo}"...`, 'info');
      return;
    }

    const infoProg = obtenerInfoProgramaAsociado(doc);

    // 1. Intentar apertura nativa directa en el Sistema Operativo vía servidor local (/api/open-local-file)
    try {
      const resp = await fetch('/api/open-local-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.enlaceORuta }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.openedOnHost) {
          mostrarNotificacion(
            `Abriendo "${doc.titulo}" directamente en tu equipo con ${infoProg.nombrePrograma}.`,
            'exito'
          );
          return;
        }
      }
    } catch (_) {
      // Si el servidor no responde o es remoto, continuamos con las estrategias de cliente
    }

    // 2. Comprobar si ya tenemos el archivo en la memoria de sesión actual
    const sessionFile = sessionFilesRef.current.get(doc.id);
    if (sessionFile) {
      abrirArchivoFileConProgramaAsociado(sessionFile, doc);
      return;
    }

    // 3. Comprobar si tenemos un puntero FileSystemFileHandle guardado en IndexedDB del navegador
    const savedHandle = await obtenerFileHandleDeIndexedDB(doc.id);
    if (savedHandle) {
      try {
        if (typeof savedHandle.queryPermission === 'function') {
          let perm = await savedHandle.queryPermission({ mode: 'read' });
          if (perm !== 'granted' && typeof savedHandle.requestPermission === 'function') {
            perm = await savedHandle.requestPermission({ mode: 'read' });
          }
          if (perm === 'granted') {
            const fileFromHandle: File = await savedHandle.getFile();
            sessionFilesRef.current.set(doc.id, fileFromHandle);
            abrirArchivoFileConProgramaAsociado(fileFromHandle, doc);
            return;
          }
        } else if (typeof savedHandle.getFile === 'function') {
          const fileFromHandle: File = await savedHandle.getFile();
          sessionFilesRef.current.set(doc.id, fileFromHandle);
          abrirArchivoFileConProgramaAsociado(fileFromHandle, doc);
          return;
        }
      } catch (_) {
        // Si el archivo cambió de ubicación, continuamos al protocolo o revinculación
      }
    }

    // 4. Si es un documento de Microsoft Office (Word, Excel, PowerPoint, Access) con ruta de disco (C:\... o /...),
    // lanzar el esquema de protocolo oficial de Office (ms-word:ofe|u|file:///...) que abre el programa de escritorio asociado
    const tieneRutaCompleta =
      /^[a-zA-Z]:[\\/]/.test(doc.enlaceORuta.trim()) ||
      /^file:\/\//i.test(doc.enlaceORuta.trim()) ||
      doc.enlaceORuta.trim().startsWith('/');

    if (infoProg.esquemaProtocoloOffice && tieneRutaCompleta) {
      const fileUri = convertirRutaLocalAFileUri(doc.enlaceORuta);
      const officeUri = `${infoProg.esquemaProtocoloOffice}:ofe|u|${fileUri}`;
      dispararEnlaceAnchor(officeUri, false);
      mostrarNotificacion(
        `Invocando ${infoProg.nombrePrograma} para abrir "${doc.enlaceORuta}"...`,
        'exito'
      );
      return;
    }

    // 5. Copiar automáticamente la ruta local al portapapeles y abrir selector directo del sistema
    // para vincular el puntero local (0 KB en JSON) y abrirlo inmediatamente
    try {
      await navigator.clipboard.writeText(doc.enlaceORuta);
    } catch (_) {}

    const win = window as any;
    if (typeof win.showOpenFilePicker === 'function') {
      try {
        mostrarNotificacion(
          `Ruta copiada al portapapeles (${doc.enlaceORuta}). Confirma el archivo (Ctrl+V) para abrirlo con ${infoProg.nombrePrograma}.`,
          'info'
        );
        const [fileHandle] = await win.showOpenFilePicker({
          multiple: false,
        });
        if (fileHandle) {
          await guardarFileHandleEnIndexedDB(doc.id, fileHandle);
          const file: File = await fileHandle.getFile();
          sessionFilesRef.current.set(doc.id, file);
          abrirArchivoFileConProgramaAsociado(file, doc);
        }
        return;
      } catch (_) {
        return;
      }
    }

    // Fallback estándar para navegadores sin showOpenFilePicker
    setDocPendienteVincularEnDobleClic(doc);
    mostrarNotificacion(
      `Ruta copiada (${doc.enlaceORuta}). Selecciona el archivo local para abrirlo con ${infoProg.nombrePrograma}.`,
      'info'
    );
    setTimeout(() => {
      fallbackInputFileRef.current?.click();
    }, 50);
  };

  const handleFallbackInputDobleClic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && docPendienteVincularEnDobleClic) {
      sessionFilesRef.current.set(docPendienteVincularEnDobleClic.id, file);
      abrirArchivoFileConProgramaAsociado(file, docPendienteVincularEnDobleClic);
    }
    setDocPendienteVincularEnDobleClic(null);
    e.target.value = '';
  };

  // Abrir modal para nuevo documento o enlace
  const handleAbrirNuevo = (tipoInicial: 'web_externa' | 'documento_local' = 'web_externa') => {
    setDocumentoEnEdicion(null);
    pendingFileHandleRef.current = null;
    pendingFileObjRef.current = null;
    setFormTitulo('');
    setFormTipoEnlace(tipoInicial);
    setFormEnlaceORuta('');
    setFormNombreArchivoRef('');
    setFormFormatoDocumento(tipoInicial === 'web_externa' ? 'Web / BOE' : 'PDF');
    setFormDescripcion('');
    setFormAmbito('AGE');
    setFormTemasAge([]);
    setFormTemasCam([]);
    setFormLeyesYDecretos([]);
    setFormSubtemas([]);
    setFormDestacado(false);
    setBusquedaEtiquetaModal('');
    setTabEtiquetadoModal('leyes');
    setMostrarModalFormulario(true);
  };

  // Abrir modal para editar documento existente
  const handleAbrirEdicion = (doc: DocumentoBibliotecaItem) => {
    setDocumentoEnEdicion(doc);
    pendingFileHandleRef.current = null;
    pendingFileObjRef.current = null;
    setFormTitulo(doc.titulo);
    setFormTipoEnlace(doc.tipoEnlace);
    setFormEnlaceORuta(doc.enlaceORuta);
    setFormNombreArchivoRef(doc.nombreArchivoReferencia || '');
    setFormFormatoDocumento(doc.formatoDocumento || (doc.tipoEnlace === 'web_externa' ? 'Web / BOE' : 'PDF'));
    setFormDescripcion(doc.descripcion || '');
    setFormAmbito(doc.ambito || 'AGE');
    setFormTemasAge(doc.temasAgeC1 || []);
    setFormTemasCam(doc.temasCamC1 || []);
    setFormLeyesYDecretos(doc.leyesYDecretos || []);
    setFormSubtemas(doc.subtemas || []);
    setFormDestacado(Boolean(doc.destacado));
    setBusquedaEtiquetaModal('');
    setTabEtiquetadoModal('leyes');
    setMostrarModalFormulario(true);
  };

  // Selector de referencia de archivo local usando File System Access API (si está disponible) o input file
  // (SOLO guarda el puntero y nombre para el doble clic, jamás sube ni guarda binarios en el JSON)
  const handleBotonVincularArchivoLocalModal = async () => {
    const win = window as any;
    if (typeof win.showOpenFilePicker === 'function') {
      try {
        const [handle] = await win.showOpenFilePicker({ multiple: false });
        if (handle) {
          const file: File = await handle.getFile();
          pendingFileHandleRef.current = handle;
          pendingFileObjRef.current = file;
          aplicarMetadatosDeArchivoSeleccionado(file);
        }
        return;
      } catch (_) {
        return;
      }
    }
    document.getElementById('modal-input-file-referencia-local')?.click();
  };

  const aplicarMetadatosDeArchivoSeleccionado = (file: File) => {
    const nombre = file.name;
    setFormNombreArchivoRef(nombre);
    if (!formTitulo.trim()) {
      setFormTitulo(nombre.replace(/\.[^/.]+$/, ''));
    }
    if (!formEnlaceORuta.trim()) {
      setFormEnlaceORuta(`C:\\Documentos_Oposicion_C1\\${nombre}`);
    }
    const ext = nombre.split('.').pop()?.toUpperCase();
    if (ext && ['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'PPTX', 'ACCDB', 'TXT', 'MD'].includes(ext)) {
      setFormFormatoDocumento(ext);
    }
  };

  const handleSeleccionarReferenciaArchivoLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileObjRef.current = file;
    aplicarMetadatosDeArchivoSeleccionado(file);
    e.target.value = '';
  };

  const toggleElementoEnArray = (
    lista: string[],
    item: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (lista.includes(item)) {
      setter(lista.filter((x) => x !== item));
    } else {
      setter([...lista, item]);
    }
  };

  const handleAnadirSubtemaPersonalizado = () => {
    const limpio = nuevoSubtemaInput.trim();
    if (!limpio) return;
    if (!todosLosSubtemas.includes(limpio)) {
      onActualizarSubtemas([...todosLosSubtemas, limpio]);
    }
    if (!formSubtemas.includes(limpio)) {
      setFormSubtemas([...formSubtemas, limpio]);
    }
    setNuevoSubtemaInput('');
    mostrarNotificacion(`Subtema "${limpio}" añadido y disponible para etiquetar`, 'exito');
  };

  const handleAnadirLeyPersonalizada = () => {
    const limpia = nuevaLeyPersonalizadaInput.trim();
    if (!limpia) return;
    if (!formLeyesYDecretos.includes(limpia)) {
      setFormLeyesYDecretos([...formLeyesYDecretos, limpia]);
    }
    setNuevaLeyPersonalizadaInput('');
    mostrarNotificacion(`Norma "${limpia}" asignada al documento`, 'exito');
  };

  // Guardar documento o enlace (sanitizando estrictamente para no guardar nunca binarios en JSON)
  const handleGuardarFormulario = async () => {
    if (!formTitulo.trim() || !formEnlaceORuta.trim()) {
      mostrarNotificacion('Por favor, indica el título y la URL o ruta local del documento.', 'error');
      return;
    }

    if (formEnlaceORuta.trim().toLowerCase().startsWith('data:')) {
      mostrarNotificacion(
        'No se permite almacenar archivos binarios (data:). Introduce únicamente un enlace web (https://...) o una ruta/referencia a un documento local.',
        'error'
      );
      return;
    }

    const ahora = new Date().toISOString();
    const docId = documentoEnEdicion ? documentoEnEdicion.id : `doc-bib-${Date.now()}`;
    const nuevoDocRaw: DocumentoBibliotecaItem = {
      id: docId,
      titulo: formTitulo.trim(),
      tipoEnlace: formTipoEnlace,
      enlaceORuta: formEnlaceORuta.trim(),
      nombreArchivoReferencia:
        formTipoEnlace === 'documento_local' ? formNombreArchivoRef.trim() || undefined : undefined,
      formatoDocumento: formFormatoDocumento.trim() || undefined,
      descripcion: formDescripcion.trim() || undefined,
      ambito: formAmbito,
      temasAgeC1: formTemasAge,
      temasCamC1: formTemasCam,
      leyesYDecretos: formLeyesYDecretos,
      subtemas: formSubtemas,
      destacado: formDestacado,
      fechaCreacion: documentoEnEdicion ? documentoEnEdicion.fechaCreacion : ahora,
      fechaActualizacion: ahora,
    };

    const docSanitizado = sanitizarDocumentoBibliotecaSinBinarios(nuevoDocRaw);
    if (!docSanitizado) return;

    // Si el usuario vinculó el puntero del archivo local, guardarlo en memoria/IndexedDB para apertura instantánea con doble clic
    if (pendingFileObjRef.current) {
      sessionFilesRef.current.set(docId, pendingFileObjRef.current);
    }
    if (pendingFileHandleRef.current) {
      await guardarFileHandleEnIndexedDB(docId, pendingFileHandleRef.current);
    }

    let nuevaLista: DocumentoBibliotecaItem[];
    if (documentoEnEdicion) {
      nuevaLista = documentos.map((d) => (d.id === documentoEnEdicion.id ? docSanitizado : d));
      mostrarNotificacion(`Referencia documental "${docSanitizado.titulo}" actualizada`, 'exito');
    } else {
      nuevaLista = [docSanitizado, ...documentos];
      mostrarNotificacion(`Enlace/documento "${docSanitizado.titulo}" añadido a la Biblioteca`, 'exito');
    }

    onActualizarDocumentos(nuevaLista);
    setMostrarModalFormulario(false);
    setDocumentoEnEdicion(null);
  };

  const handleToggleDestacado = (id: string) => {
    const nuevaLista = documentos.map((d) =>
      d.id === id ? { ...d, destacado: !d.destacado, fechaActualizacion: new Date().toISOString() } : d
    );
    onActualizarDocumentos(nuevaLista);
  };

  const handleConfirmarEliminar = () => {
    if (!documentoAEliminar) return;
    const nuevaLista = documentos.filter((d) => d.id !== documentoAEliminar.id);
    onActualizarDocumentos(nuevaLista);
    setDocumentoAEliminar(null);
    mostrarNotificacion('Referencia eliminada de la base de datos documental', 'info');
  };

  const handleCopiarRutaLocal = async (doc: DocumentoBibliotecaItem) => {
    try {
      await navigator.clipboard.writeText(doc.enlaceORuta);
      setCopiadoRutaId(doc.id);
      setTimeout(() => setCopiadoRutaId(null), 2500);
    } catch (_) {
      mostrarNotificacion(`Ruta: ${doc.enlaceORuta}`, 'info');
    }
  };

  // Exportar únicamente las referencias de la Base de Datos Documental (sin archivos binarios)
  const handleExportarBaseDatosJSON = async () => {
    const payload = {
      version: '3.2',
      tipoExportacion: 'BaseDatosDocumentosEnlacesBibliotecaC1',
      avisoPrivacidad:
        'Este fichero contiene exclusivamente enlaces web, rutas de referencia local, etiquetas de temas AGE/CAM, leyes y subtemas. No almacena archivos binarios.',
      fechaExportacion: new Date().toISOString(),
      subtemasBiblioteca: todosLosSubtemas,
      bibliotecaDocumentos: documentos
        .map((d) => sanitizarDocumentoBibliotecaSinBinarios(d))
        .filter((d): d is DocumentoBibliotecaItem => d !== null),
    };
    const fecha = new Date().toISOString().split('T')[0];
    await guardarArchivoConSelectorCarpeta(
      JSON.stringify(payload, null, 2),
      `Biblioteca_Enlaces_Y_Documentos_C1_${fecha}.json`,
      'application/json',
      '.json'
    );
    mostrarNotificacion('Base de datos de enlaces y etiquetas exportada a JSON', 'exito');
  };

  // Importar referencias de un archivo JSON
  const handleImportarBaseDatosJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = typeof ev.target?.result === 'string' ? ev.target.result : '';
        const parsed = JSON.parse(limpiarTextoJSON(raw));
        let docsEntrantes: any[] = [];
        let subtemasEntrantes: string[] = [];

        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && Array.isArray(parsed[0]?.bibliotecaDocumentos)) {
            docsEntrantes = parsed[0].bibliotecaDocumentos;
            if (Array.isArray(parsed[0]?.subtemasBiblioteca)) {
              subtemasEntrantes = parsed[0].subtemasBiblioteca;
            }
          } else {
            docsEntrantes = parsed;
          }
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.bibliotecaDocumentos)) {
            docsEntrantes = parsed.bibliotecaDocumentos;
          }
          if (Array.isArray(parsed.subtemasBiblioteca)) {
            subtemasEntrantes = parsed.subtemasBiblioteca;
          }
        }

        const sanitizados = docsEntrantes
          .map((d) => sanitizarDocumentoBibliotecaSinBinarios(d))
          .filter((d): d is DocumentoBibliotecaItem => d !== null);

        if (sanitizados.length === 0 && subtemasEntrantes.length === 0) {
          mostrarNotificacion('El archivo JSON no contiene registros de documentos o enlaces válidos.', 'error');
          return;
        }

        if (sanitizados.length > 0) {
          const mapa = new Map<string, DocumentoBibliotecaItem>();
          documentos.forEach((d) => mapa.set(d.id, d));
          sanitizados.forEach((d) => mapa.set(d.id, d));
          onActualizarDocumentos(Array.from(mapa.values()));
        }

        if (subtemasEntrantes.length > 0) {
          const nuevoSet = new Set([
            ...todosLosSubtemas,
            ...subtemasEntrantes.map((s) => String(s).trim()).filter(Boolean),
          ]);
          onActualizarSubtemas(Array.from(nuevoSet));
        }

        mostrarNotificacion(`Se han importado ${sanitizados.length} documentos/enlaces y sus etiquetas.`, 'exito');
      } catch (_) {
        mostrarNotificacion('Error al leer el archivo JSON de documentos.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    filtroTipoEnlace !== 'todos' ||
    filtroAmbito !== 'todos' ||
    filtroLeyODecreto !== 'todas' ||
    filtroTema !== 'todos' ||
    filtroSubtema !== 'todos' ||
    soloDestacados;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTipoEnlace('todos');
    setFiltroAmbito('todos');
    setFiltroLeyODecreto('todas');
    setFiltroTema('todos');
    setFiltroSubtema('todos');
    setSoloDestacados(false);
  };

  // Paginador superior e inferior idéntico al de Historial y Banco de Exámenes (10 registros por página)
  const renderPaginacionDocumentos = (posicion: 'superior' | 'inferior') => {
    if (documentosFiltradosYOrdenados.length === 0) return null;
    const desde = (paginaActual - 1) * REGISTROS_POR_PAGINA + 1;
    const hasta = Math.min(paginaActual * REGISTROS_POR_PAGINA, documentosFiltradosYOrdenados.length);

    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 ${
          posicion === 'superior'
            ? 'pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-700/80'
            : 'pt-3 border-t border-slate-100 dark:border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Mostrando <strong className="text-slate-800 dark:text-slate-200">{desde}</strong> -{' '}
            <strong className="text-slate-800 dark:text-slate-200">{hasta}</strong> de{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {documentosFiltradosYOrdenados.length}
            </strong>{' '}
            documentos/enlaces (10 por página)
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="font-mono text-[11px] text-slate-500">
            Página <strong className="text-slate-800 dark:text-slate-200">{paginaActual}</strong> de {totalPaginas}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
            disabled={paginaActual <= 1}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página anterior"
          >
            <i className="fa-solid fa-chevron-up text-[10px] text-emerald-600 dark:text-emerald-400"></i>
            <span>▲ Pág. Arriba</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
              .map((p, idx, arr) => {
                const prevP = arr[idx - 1];
                const separator =
                  prevP && p - prevP > 1 ? (
                    <span key={`sep-doc-${posicion}-${p}`} className="px-1 text-slate-400 font-mono">
                      ...
                    </span>
                  ) : null;
                return (
                  <React.Fragment key={p}>
                    {separator}
                    <button
                      type="button"
                      onClick={() => setPaginaActual(p)}
                      className={`h-7 min-w-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        paginaActual === p
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            type="button"
            onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
            disabled={paginaActual >= totalPaginas}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página siguiente"
          >
            <span>▼ Pág. Abajo</span>
            <i className="fa-solid fa-chevron-down text-[10px] text-emerald-600 dark:text-emerald-400"></i>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-5 py-3 space-y-5">
      {/* Input oculto de respaldo para vincular y abrir documento local al hacer doble clic */}
      <input
        ref={fallbackInputFileRef}
        type="file"
        onChange={handleFallbackInputDobleClic}
        className="hidden"
      />

      {/* Notificación flotante */}
      {mensajeFeedback && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-sm ${
            mensajeFeedback.tipo === 'exito'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : mensajeFeedback.tipo === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <i
              className={`fa-solid ${
                mensajeFeedback.tipo === 'exito'
                  ? 'fa-circle-check text-emerald-600'
                  : mensajeFeedback.tipo === 'error'
                  ? 'fa-triangle-exclamation text-rose-600'
                  : 'fa-circle-info text-indigo-600'
              }`}
            ></i>
            <span>{mensajeFeedback.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* CABECERA DE LA BASE DE DATOS DE DOCUMENTOS Y ENLACES */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xl shadow-sm ring-4 ring-emerald-500/10 shrink-0">
              <i className="fa-solid fa-folder-tree"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Base de Datos de Documentos Locales y Enlaces Web
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-black">
                  {stats.total} referencias catalogadas
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex items-center gap-1">
                  <i className="fa-solid fa-computer-mouse text-[9px]"></i>
                  <span>Doble clic en cualquier fila para abrir con su programa asociado</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-4xl leading-relaxed">
                Catálogo indexado de <strong>enlaces a páginas web externas (BOE, sedes oficiales)</strong> y{' '}
                <strong>documentos locales de tu equipo (Word, Excel, PDF, Access, esquemas)</strong> etiquetados por{' '}
                <strong>Temas AGE C1</strong>, <strong>Temas CAM C1</strong>,{' '}
                <strong>Leyes / Reales Decretos (incluido el RD 1708/2011 de Archivos)</strong> y{' '}
                <strong>Subtemas</strong>. Haz <strong>doble clic</strong> sobre cualquier documento local para abrirlo con su aplicación asociada.
              </p>
            </div>
          </div>

          {/* Botones de Acción Principales + Toggle Vista Listado / Tarjetas */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <input
              id="importar-bd-documentos-json"
              type="file"
              accept=".json"
              onChange={handleImportarBaseDatosJSON}
              className="hidden"
            />

            {/* Selector Vista: Listado vs Tarjetas (idéntico a Historial y Banco de Exámenes) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setVistaDocumentos('listado')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  vistaDocumentos === 'listado'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Ver en formato listado paginado (10 registros por página)"
              >
                <i className="fa-solid fa-table-list text-[11px]"></i>
                <span>Listado</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaDocumentos('tarjetas')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  vistaDocumentos === 'tarjetas'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Ver en formato tarjetas"
              >
                <i className="fa-solid fa-grip text-[11px]"></i>
                <span>Tarjetas</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAbrirNuevo('web_externa')}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-globe text-[11px]"></i>
              <span>+ Añadir Enlace Web</span>
            </button>

            <button
              type="button"
              onClick={() => handleAbrirNuevo('documento_local')}
              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-folder-open text-[11px]"></i>
              <span>+ Enlazar Documento Local</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarGestorSubtemas(true)}
              className="py-2 px-3 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Crear o gestionar subtemas personalizados"
            >
              <i className="fa-solid fa-sitemap text-[11px] text-amber-600"></i>
              <span>Subtemas ({todosLosSubtemas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => document.getElementById('importar-bd-documentos-json')?.click()}
              className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Importar referencias de documentos y etiquetas desde JSON"
            >
              <i className="fa-solid fa-file-import text-[11px] text-emerald-500"></i>
              <span>Importar JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportarBaseDatosJSON}
              className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exportar catálogo de enlaces, rutas locales, leyes, temas y subtemas en JSON"
            >
              <i className="fa-solid fa-download text-[11px] text-indigo-500"></i>
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Tarjetas métricas rápidas interactivas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <div
            onClick={() => {
              setFiltroTipoEnlace('todos');
              setFiltroLeyODecreto('todas');
            }}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              filtroTipoEnlace === 'todos' && filtroLeyODecreto === 'todas'
                ? 'bg-slate-100 dark:bg-slate-800 border-emerald-500 border-t-4 border-t-emerald-600'
                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
            }`}
          >
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 font-mono block">
              Total Referencias
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{stats.total}</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">En JSON seguro</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroTipoEnlace(filtroTipoEnlace === 'web_externa' ? 'todos' : 'web_externa')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              filtroTipoEnlace === 'web_externa'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 border-t-4 border-t-sky-600'
                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-sky-300'
            }`}
          >
            <span className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-globe text-[9px]"></i>
              Webs Externas / BOE
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-sky-700 dark:text-sky-300">{stats.webs}</span>
              <span className="text-[10px] font-mono text-sky-600">URLs directas</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroTipoEnlace(filtroTipoEnlace === 'documento_local' ? 'todos' : 'documento_local')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              filtroTipoEnlace === 'documento_local'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 border-t-4 border-t-indigo-600'
                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-hard-drive text-[9px]"></i>
              Documentos Locales
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-300">{stats.locales}</span>
              <span className="text-[10px] font-mono text-indigo-600">Doble clic abre app</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroAmbito(filtroAmbito === 'AGE' ? 'todos' : 'AGE')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              filtroAmbito === 'AGE'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 border-t-4 border-t-blue-600'
                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-blue-300'
            }`}
          >
            <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-landmark text-[9px]"></i>
              Temario AGE C1
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-blue-700 dark:text-blue-300">{stats.conTemasAge}</span>
              <span className="text-[10px] font-mono text-blue-600">{ETIQUETAS_TEMAS_AGE_C1.length} temas ofic.</span>
            </div>
          </div>

          <div
            onClick={() => setFiltroAmbito(filtroAmbito === 'CAM' ? 'todos' : 'CAM')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              filtroAmbito === 'CAM'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 border-t-4 border-t-rose-600'
                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-rose-300'
            }`}
          >
            <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-building-flag text-[9px]"></i>
              Temario CAM C1
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-rose-700 dark:text-rose-300">{stats.conTemasCam}</span>
              <span className="text-[10px] font-mono text-rose-600">{ETIQUETAS_TEMAS_CAM_C1.length} temas CAM</span>
            </div>
          </div>

          <div
            onClick={() =>
              setFiltroLeyODecreto(
                filtroLeyODecreto === 'RD 1708/2011 (Sistema Español de Archivos)'
                  ? 'todas'
                  : 'RD 1708/2011 (Sistema Español de Archivos)'
              )
            }
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              filtroLeyODecreto === 'RD 1708/2011 (Sistema Español de Archivos)'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 border-t-4 border-t-amber-600'
                : 'bg-white dark:bg-slate-850 border-amber-200 dark:border-amber-800/70 hover:border-amber-400'
            }`}
            title="Filtrar documentos del Real Decreto 1708/2011, de 18 de noviembre, del Sistema Español de Archivos"
          >
            <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-box-archive text-[9px]"></i>
              RD 1708/2011 Archivos
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-amber-800 dark:text-amber-300">{stats.conRD1708}</span>
              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold">BOE-A-2011-18541</span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS MULTIDIMENSIONALES: POR LEY/RD, POR TEMA (AGE O CAM), POR SUBTEMA Y BÚSQUEDA */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1.5">
              <i className="fa-solid fa-filter text-emerald-600"></i>
              <span>Filtros por Ley / Real Decreto, Tema Oficial (AGE C1 / CAM C1) y Subtema</span>
            </span>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-filter-circle-xmark"></i>
                <span>Limpiar todos los filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Buscador libre */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, norma, ruta, subtema..."
                className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Filtro 1: Por Ley, Real Decreto o Norma Concreta */}
            <div>
              <select
                value={filtroLeyODecreto}
                onChange={(e) => setFiltroLeyODecreto(e.target.value)}
                aria-label="Filtrar por Ley o Real Decreto concreto"
                className="w-full py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="todas">⚖️ Todas las Leyes y Reales Decretos ({todasLasLeyesDisponibles.length})</option>
                {todasLasLeyesDisponibles.map((ley) => (
                  <option key={ley.etiqueta} value={ley.etiqueta}>
                    {ley.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 2: Por Tema del Temario AGE C1 o CAM C1 */}
            <div>
              <select
                value={filtroTema}
                onChange={(e) => setFiltroTema(e.target.value)}
                aria-label="Filtrar por Tema del Temario AGE C1 o CAM C1"
                className="w-full py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">
                  📚 Todos los Temas AGE C1 ({ETIQUETAS_TEMAS_AGE_C1.length}) y CAM C1 ({ETIQUETAS_TEMAS_CAM_C1.length})
                </option>
                <optgroup label="🏛️ Temario Oficial AGE C1 (6 Bloques)">
                  {ETIQUETAS_TEMAS_AGE_C1.map((t) => (
                    <option key={t.id} value={t.etiqueta}>
                      {t.etiqueta}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏙️ Temario Específico Comunidad de Madrid (CAM C1)">
                  {ETIQUETAS_TEMAS_CAM_C1.map((t) => (
                    <option key={t.id} value={t.etiqueta}>
                      {t.etiqueta}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Filtro 3: Por Subtema */}
            <div>
              <select
                value={filtroSubtema}
                onChange={(e) => setFiltroSubtema(e.target.value)}
                aria-label="Filtrar por Subtema"
                className="w-full py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">🔖 Todos los Subtemas ({todosLosSubtemas.length})</option>
                {todosLosSubtemas.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Segunda fila de filtros rápidos: Tipo de Enlace, Ámbito y Destacados */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">Tipo:</span>
              {(
                [
                  { id: 'todos', label: 'Todos', icon: 'fa-layer-group' },
                  { id: 'web_externa', label: 'Web Externa / BOE', icon: 'fa-globe' },
                  { id: 'documento_local', label: 'Documento Local', icon: 'fa-hard-drive' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFiltroTipoEnlace(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    filtroTipoEnlace === t.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <i className={`fa-solid ${t.icon} text-[10px]`}></i>
                  <span>{t.label}</span>
                </button>
              ))}

              <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">Ámbito:</span>
              {(['todos', 'AGE', 'CAM', 'AMBOS'] as const).map((amb) => (
                <button
                  key={amb}
                  type="button"
                  onClick={() => setFiltroAmbito(amb)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filtroAmbito === amb
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {amb === 'todos' ? 'Todos' : amb}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSoloDestacados(!soloDestacados)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                soloDestacados
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-400'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <i className={`fa-solid fa-star text-[10px] ${soloDestacados ? 'text-amber-500' : 'text-slate-400'}`}></i>
              <span>Solo Destacados</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO PAGINADO (10 REGISTROS POR PÁGINA): VISTA LISTADO O VISTA TARJETAS */}
        {documentosFiltradosYOrdenados.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center text-xl">
              <i className="fa-solid fa-folder-open"></i>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                No se encontraron documentos o enlaces con los filtros actuales
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Añade enlaces a webs externas (BOE, sedes electrónicas) o referencias a tus documentos locales etiquetados por tema AGE/CAM, ley o subtema.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Restablecer filtros
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAbrirNuevo('web_externa')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                + Añadir primer documento o enlace
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {renderPaginacionDocumentos('superior')}

            {vistaDocumentos === 'listado' ? (
              /* VISTA LISTADO ALINEADA ESTILO HISTORIAL Y BANCO DE EXÁMENES */
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 select-none">
                      {/* 1. Título / Ruta o URL (Doble clic abre documento) */}
                      <th
                        onClick={() => toggleOrdenColumna('titulo')}
                        className={`py-2.5 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors ${
                          columnaOrden === 'titulo'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : ''
                        }`}
                        title="Ordenar por título del documento o enlace"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Documento / Enlace y Ruta Local</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'titulo' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 2. Tipo / Programa Asociado */}
                      <th
                        onClick={() => toggleOrdenColumna('tipo')}
                        className={`py-2.5 px-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[155px] ${
                          columnaOrden === 'tipo'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : ''
                        }`}
                        title="Ordenar por tipo de recurso o programa asociado"
                      >
                        <div className="flex items-center gap-1">
                          <span>Programa / Tipo</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'tipo' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 3. Ámbito */}
                      <th
                        onClick={() => toggleOrdenColumna('ambito')}
                        className={`py-2.5 px-2 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[82px] ${
                          columnaOrden === 'ambito'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : ''
                        }`}
                        title="Ordenar por ámbito (AGE / CAM / AMBOS)"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Ámbito</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'ambito' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 4. Ley / Real Decreto */}
                      <th
                        onClick={() => toggleOrdenColumna('normativa')}
                        className={`py-2.5 px-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors hidden lg:table-cell w-[215px] ${
                          columnaOrden === 'normativa'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : ''
                        }`}
                        title="Ordenar por Ley o Real Decreto asignado"
                      >
                        <div className="flex items-center gap-1">
                          <span>Ley / Real Decreto</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'normativa' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 5. Temas AGE / CAM y Subtemas */}
                      <th className="py-2.5 px-2.5 hidden xl:table-cell w-[250px]">
                        <span>Temas (AGE / CAM) & Subtemas</span>
                      </th>

                      {/* 6. Acciones */}
                      <th className="py-2.5 px-3 text-right w-[185px] min-w-[185px]">
                        <span>Acciones</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {documentosPaginados.map((doc) => {
                      const esWeb = doc.tipoEnlace === 'web_externa';
                      const infoProg = obtenerInfoProgramaAsociado(doc);
                      const todosTemasDoc = [...(doc.temasAgeC1 || []), ...(doc.temasCamC1 || [])];

                      return (
                        <tr
                          key={doc.id}
                          onDoubleClick={() => handleAbrirDocumentoConProgramaAsociado(doc)}
                          className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group select-none"
                          title={
                            esWeb
                              ? `Doble clic para abrir la web: ${doc.enlaceORuta}`
                              : `Doble clic para abrir el documento local con ${infoProg.nombrePrograma}: ${doc.enlaceORuta}`
                          }
                        >
                          {/* Columna 1: Título, descripción y ruta/URL */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDestacado(doc.id);
                                }}
                                className="mt-0.5 text-xs cursor-pointer shrink-0"
                                title={doc.destacado ? 'Quitar destacado' : 'Destacar documento'}
                              >
                                <i
                                  className={`fa-solid fa-star ${
                                    doc.destacado ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                ></i>
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors line-clamp-1">
                                    {doc.titulo}
                                  </span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Doble clic ⚡
                                  </span>
                                </div>

                                <div
                                  className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5"
                                  title={doc.enlaceORuta}
                                >
                                  {esWeb ? '🌐 ' : '📂 '}
                                  {doc.enlaceORuta}
                                </div>

                                {doc.descripcion && (
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                                    {doc.descripcion}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Columna 2: Programa Asociado / Tipo */}
                          <td className="py-2.5 px-2.5 align-middle">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono inline-flex items-center gap-1.5 border ${infoProg.badgeClass}`}
                              >
                                <i className={`fa-solid ${infoProg.icono} text-[10px]`}></i>
                                <span className="truncate max-w-[115px]">{infoProg.nombrePrograma}</span>
                              </span>
                              {doc.formatoDocumento && (
                                <span className="text-[9.5px] font-mono text-slate-400 pl-0.5">
                                  Formato: <strong>{doc.formatoDocumento}</strong>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Columna 3: Ámbito */}
                          <td className="py-2.5 px-2 text-center align-middle">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black border inline-block ${
                                doc.ambito === 'AGE'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : doc.ambito === 'CAM'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              }`}
                            >
                              {doc.ambito}
                            </span>
                          </td>

                          {/* Columna 4: Ley / Real Decreto */}
                          <td className="py-2.5 px-2.5 align-middle hidden lg:table-cell">
                            {(doc.leyesYDecretos || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {doc.leyesYDecretos.slice(0, 2).map((ley) => {
                                  const urlBoe = obtenerUrlBOEParaNorma(ley);
                                  return (
                                    <span
                                      key={ley}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFiltroLeyODecreto(ley);
                                      }}
                                      className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[10px] font-bold inline-flex items-center gap-1 max-w-full truncate"
                                      title={ley}
                                    >
                                      <i className="fa-solid fa-scale-balanced text-[8.5px] text-amber-600 shrink-0"></i>
                                      <span className="truncate">{ley}</span>
                                      {urlBoe && (
                                        <a
                                          href={urlBoe}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-amber-700 dark:text-amber-300 hover:underline shrink-0"
                                          title="Abrir norma consolidada en el BOE"
                                        >
                                          <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
                                        </a>
                                      )}
                                    </span>
                                  );
                                })}
                                {doc.leyesYDecretos.length > 2 && (
                                  <span className="text-[9.5px] font-mono text-slate-400">
                                    +{doc.leyesYDecretos.length - 2} más
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin ley específica</span>
                            )}
                          </td>

                          {/* Columna 5: Temas AGE/CAM y Subtemas */}
                          <td className="py-2.5 px-2.5 align-middle hidden xl:table-cell">
                            <div className="space-y-1">
                              {todosTemasDoc.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFiltroTema(todosTemasDoc[0]);
                                    }}
                                    className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold truncate max-w-[200px]"
                                    title={todosTemasDoc.join(' • ')}
                                  >
                                    {todosTemasDoc[0]}
                                  </span>
                                  {todosTemasDoc.length > 1 && (
                                    <span className="text-[9.5px] font-mono text-blue-600 font-bold">
                                      +{todosTemasDoc.length - 1}
                                    </span>
                                  )}
                                </div>
                              )}

                              {(doc.subtemas || []).length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {doc.subtemas.slice(0, 2).map((sub) => (
                                    <span
                                      key={sub}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFiltroSubtema(sub);
                                      }}
                                      className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-[9.5px] font-bold truncate max-w-[140px]"
                                    >
                                      # {sub}
                                    </span>
                                  ))}
                                  {doc.subtemas.length > 2 && (
                                    <span className="text-[9px] font-mono text-slate-400">
                                      +{doc.subtemas.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Columna 6: Acciones alineadas */}
                          <td
                            className="py-2.5 px-3 text-right align-middle whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopiarRutaLocal(doc)}
                                className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
                                title="Copiar enlace o ruta local al portapapeles"
                              >
                                <i
                                  className={`fa-solid ${
                                    copiadoRutaId === doc.id ? 'fa-check text-emerald-500' : 'fa-copy'
                                  } text-[10px]`}
                                ></i>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAbrirEdicion(doc)}
                                className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
                                title="Editar referencia o etiquetas"
                              >
                                <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDocumentoAEliminar(doc)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
                                title="Eliminar referencia"
                              >
                                <i className="fa-solid fa-trash-can text-[10px]"></i>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAbrirDocumentoConProgramaAsociado(doc)}
                                className={`h-7 px-2.5 rounded-lg text-white text-[10.5px] font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                  esWeb
                                    ? 'bg-sky-600 hover:bg-sky-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                                title={
                                  esWeb
                                    ? 'Abrir enlace web en nueva pestaña'
                                    : `Abrir documento local con ${infoProg.nombrePrograma}`
                                }
                              >
                                <span>Abrir</span>
                                <i
                                  className={`fa-solid ${
                                    esWeb ? 'fa-arrow-up-right-from-square' : 'fa-up-right-from-square'
                                  } text-[8.5px]`}
                                ></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* VISTA TARJETAS (CON SOPORTE DE DOBLE CLIC PARA ABRIR CON PROGRAMA ASOCIADO) */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {documentosPaginados.map((doc) => {
                  const esWeb = doc.tipoEnlace === 'web_externa';
                  const infoProg = obtenerInfoProgramaAsociado(doc);
                  return (
                    <div
                      key={doc.id}
                      onDoubleClick={() => handleAbrirDocumentoConProgramaAsociado(doc)}
                      title={
                        esWeb
                          ? `Doble clic para abrir web: ${doc.enlaceORuta}`
                          : `Doble clic para abrir con ${infoProg.nombrePrograma}: ${doc.enlaceORuta}`
                      }
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md cursor-pointer select-none ${
                        esWeb
                          ? 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 border-l-4 border-l-sky-500'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-500'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Cabecera de la tarjeta */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono flex items-center gap-1 border ${infoProg.badgeClass}`}
                            >
                              <i className={`fa-solid ${infoProg.icono} text-[9px]`}></i>
                              <span>{infoProg.nombrePrograma}</span>
                            </span>

                            {doc.formatoDocumento && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold">
                                {doc.formatoDocumento}
                              </span>
                            )}

                            {doc.ambito && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black border ${
                                  doc.ambito === 'AGE'
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : doc.ambito === 'CAM'
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                }`}
                              >
                                {doc.ambito}
                              </span>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleDestacado(doc.id)}
                              className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs cursor-pointer"
                              title={doc.destacado ? 'Quitar de destacados' : 'Marcar como documento destacado'}
                            >
                              <i
                                className={`fa-solid fa-star ${
                                  doc.destacado ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                                }`}
                              ></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirEdicion(doc)}
                              className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center text-xs cursor-pointer"
                              title="Editar enlace, ruta o etiquetas"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDocumentoAEliminar(doc)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs cursor-pointer"
                              title="Eliminar referencia"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>

                        {/* Título y Descripción */}
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                            {doc.titulo}
                          </h3>
                          {doc.descripcion && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {doc.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Caja de Ruta Local o URL Externa */}
                        <div
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">
                              {esWeb
                                ? 'URL Externa (Doble clic para abrir):'
                                : `Ruta Local — Doble clic abre ${infoProg.nombrePrograma}:`}
                            </div>
                            <div
                              className="text-xs font-mono text-slate-700 dark:text-slate-200 truncate"
                              title={doc.enlaceORuta}
                            >
                              {doc.enlaceORuta}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopiarRutaLocal(doc)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Copiar enlace o ruta al portapapeles"
                            >
                              <i
                                className={`fa-solid ${
                                  copiadoRutaId === doc.id ? 'fa-check text-emerald-500' : 'fa-copy text-slate-400'
                                }`}
                              ></i>
                              <span>{copiadoRutaId === doc.id ? 'Copiado' : 'Copiar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAbrirDocumentoConProgramaAsociado(doc)}
                              className={`px-3 py-1.5 rounded-lg text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                esWeb ? 'bg-sky-600 hover:bg-sky-700' : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              <span>{esWeb ? 'Abrir Web' : 'Abrir con Programa'}</span>
                              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                            </button>
                          </div>
                        </div>

                        {/* ETIQUETAS ASIGNADAS */}
                        <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                          {(doc.leyesYDecretos || []).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] font-black uppercase text-amber-700 dark:text-amber-400 font-mono">
                                Normativa:
                              </span>
                              {doc.leyesYDecretos.map((ley) => {
                                const urlBoe = obtenerUrlBOEParaNorma(ley);
                                return (
                                  <span
                                    key={ley}
                                    onClick={() => setFiltroLeyODecreto(ley)}
                                    className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-amber-100"
                                  >
                                    <i className="fa-solid fa-scale-balanced text-[8.5px] text-amber-600"></i>
                                    <span>{ley}</span>
                                    {urlBoe && (
                                      <a
                                        href={urlBoe}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-amber-700 dark:text-amber-300 hover:underline ml-0.5"
                                        title="Consultar norma consolidada en el BOE"
                                      >
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
                                      </a>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {(doc.temasAgeC1 || []).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] font-black uppercase text-blue-700 dark:text-blue-400 font-mono">
                                Temas AGE C1:
                              </span>
                              {doc.temasAgeC1.map((tema) => (
                                <span
                                  key={tema}
                                  onClick={() => setFiltroTema(tema)}
                                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold cursor-pointer hover:bg-blue-100"
                                >
                                  {tema}
                                </span>
                              ))}
                            </div>
                          )}

                          {(doc.temasCamC1 || []).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] font-black uppercase text-rose-700 dark:text-rose-400 font-mono">
                                Temas CAM C1:
                              </span>
                              {doc.temasCamC1.map((tema) => (
                                <span
                                  key={tema}
                                  onClick={() => setFiltroTema(tema)}
                                  className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold cursor-pointer hover:bg-rose-100"
                                >
                                  {tema}
                                </span>
                              ))}
                            </div>
                          )}

                          {(doc.subtemas || []).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-400 font-mono">
                                Subtemas:
                              </span>
                              {doc.subtemas.map((sub) => (
                                <span
                                  key={sub}
                                  onClick={() => setFiltroSubtema(sub)}
                                  className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold cursor-pointer hover:bg-emerald-100"
                                >
                                  # {sub}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {renderPaginacionDocumentos('inferior')}
          </div>
        )}
      </div>

      {/* MODAL PARA AÑADIR O EDITAR ENLACE WEB / DOCUMENTO LOCAL CON ETIQUETADO COMPLETO */}
      {mostrarModalFormulario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shrink-0">
                  <i className={`fa-solid ${formTipoEnlace === 'web_externa' ? 'fa-globe' : 'fa-folder-open'}`}></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {documentoEnEdicion
                      ? 'Editar Referencia Documental o Enlace'
                      : 'Añadir Nuevo Enlace Web o Referencia a Documento Local'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Solo se guarda la dirección/ruta y sus etiquetas en el JSON de seguridad (jamás se almacena el archivo físico).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalFormulario(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Selector Tipo de Enlace y Ámbito */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                  Tipo de Recurso (Sin almacenamiento binario)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipoEnlace('web_externa');
                      if (formFormatoDocumento === 'PDF') setFormFormatoDocumento('Web / BOE');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      formTipoEnlace === 'web_externa'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-globe"></i>
                    <span>Web Externa / BOE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipoEnlace('documento_local');
                      if (formFormatoDocumento === 'Web / BOE') setFormFormatoDocumento('PDF');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      formTipoEnlace === 'documento_local'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-hard-drive"></i>
                    <span>Documento Local</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Ámbito Principal
                  </label>
                  <select
                    value={formAmbito}
                    onChange={(e) => setFormAmbito(e.target.value as ConvocatoriaAmbito)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="AGE">AGE (Estado)</option>
                    <option value="CAM">CAM (Comunidad de Madrid)</option>
                    <option value="AMBOS">AMBOS (AGE + CAM)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Formato Referencia
                  </label>
                  <input
                    type="text"
                    value={formFormatoDocumento}
                    onChange={(e) => setFormFormatoDocumento(e.target.value)}
                    placeholder="Ej. PDF, DOCX, XLSX, BOE..."
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Título y URL / Ruta Local */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                  Título del Documento o Enlace *
                </label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ej. Esquema Plazos Archivos RD 1708/2011 o Texto Consolidado BOE..."
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    {formTipoEnlace === 'web_externa'
                      ? 'URL de la Web Externa (https://...) *'
                      : 'Ruta Local en tu Equipo (C:\\... o file:///...) *'}
                  </label>

                  {formTipoEnlace === 'documento_local' && (
                    <>
                      <input
                        id="modal-input-file-referencia-local"
                        type="file"
                        onChange={handleSeleccionarReferenciaArchivoLocal}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={handleBotonVincularArchivoLocalModal}
                        className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <i className="fa-solid fa-folder-open"></i>
                        <span>Seleccionar archivo del equipo para vincular apertura rápida (sin subir el archivo)</span>
                      </button>
                    </>
                  )}
                </div>

                <input
                  type="text"
                  value={formEnlaceORuta}
                  onChange={(e) => setFormEnlaceORuta(e.target.value)}
                  placeholder={
                    formTipoEnlace === 'web_externa'
                      ? 'https://www.boe.es/buscar/act.php?id=BOE-A-2011-18541'
                      : 'C:\\Temario_C1\\Bloque_II\\Esquema_RD_1708_2011_Archivos.pdf'
                  }
                  className="w-full py-2 px-3 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                  Descripción / Notas de Contenido (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Resumen breve de qué contiene este enlace o documento local (artículos clave, cuadros comparativos, etc.)..."
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* PANEL DE ETIQUETADO MULTICRITERIO: LEYES/RD, TEMAS AGE C1, TEMAS CAM C1 Y SUBTEMAS */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTabEtiquetadoModal('leyes')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      tabEtiquetadoModal === 'leyes'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-scale-balanced text-[10px]"></i>
                    <span>Leyes y Reales Decretos ({formLeyesYDecretos.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabEtiquetadoModal('temas_age')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      tabEtiquetadoModal === 'temas_age'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-landmark text-[10px]"></i>
                    <span>Temas AGE C1 ({formTemasAge.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabEtiquetadoModal('temas_cam')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      tabEtiquetadoModal === 'temas_cam'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-building-flag text-[10px]"></i>
                    <span>Temas CAM C1 ({formTemasCam.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabEtiquetadoModal('subtemas')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      tabEtiquetadoModal === 'subtemas'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-sitemap text-[10px]"></i>
                    <span>Subtemas ({formSubtemas.length})</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={busquedaEtiquetaModal}
                  onChange={(e) => setBusquedaEtiquetaModal(e.target.value)}
                  placeholder="Filtrar etiquetas..."
                  className="py-1.5 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Pestaña 1: Leyes, Reales Decretos y Normas concretas */}
              {tabEtiquetadoModal === 'leyes' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nuevaLeyPersonalizadaInput}
                      onChange={(e) => setNuevaLeyPersonalizadaInput(e.target.value)}
                      placeholder="Añadir otra Ley, Real Decreto u Orden concreta (ej. RD 208/1996)..."
                      className="flex-1 py-1.5 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleAnadirLeyPersonalizada}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                    >
                      + Añadir Norma
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {todasLasLeyesDisponibles
                      .filter(
                        (l) =>
                          !busquedaEtiquetaModal.trim() ||
                          l.etiqueta.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase()) ||
                          l.nombreCompleto.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase())
                      )
                      .map((ley) => {
                        const activa = formLeyesYDecretos.includes(ley.etiqueta);
                        return (
                          <button
                            key={ley.etiqueta}
                            type="button"
                            onClick={() => toggleElementoEnArray(formLeyesYDecretos, ley.etiqueta, setFormLeyesYDecretos)}
                            className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              activa
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{ley.etiqueta}</span>
                            <i
                              className={`fa-solid ${
                                activa ? 'fa-square-check text-amber-600' : 'fa-square text-slate-300'
                              }`}
                            ></i>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Pestaña 2: Temas del Temario Oficial AGE C1 */}
              {tabEtiquetadoModal === 'temas_age' && (
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {ETIQUETAS_TEMAS_AGE_C1.filter(
                    (t) =>
                      !busquedaEtiquetaModal.trim() ||
                      t.etiqueta.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase()) ||
                      t.bloque.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase())
                  ).map((tema) => {
                    const activo = formTemasAge.includes(tema.etiqueta);
                    return (
                      <button
                        key={tema.id}
                        type="button"
                        onClick={() => toggleElementoEnArray(formTemasAge, tema.etiqueta, setFormTemasAge)}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          activo
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block">
                            {tema.bloque}
                          </span>
                          <span>{tema.etiqueta}</span>
                        </div>
                        <i
                          className={`fa-solid ${
                            activo ? 'fa-square-check text-blue-600' : 'fa-square text-slate-300'
                          }`}
                        ></i>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pestaña 3: Temas del Temario Oficial CAM C1 */}
              {tabEtiquetadoModal === 'temas_cam' && (
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {ETIQUETAS_TEMAS_CAM_C1.filter(
                    (t) =>
                      !busquedaEtiquetaModal.trim() ||
                      t.etiqueta.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase()) ||
                      t.bloque.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase())
                  ).map((tema) => {
                    const activo = formTemasCam.includes(tema.etiqueta);
                    return (
                      <button
                        key={tema.id}
                        type="button"
                        onClick={() => toggleElementoEnArray(formTemasCam, tema.etiqueta, setFormTemasCam)}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          activo
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 block">
                            {tema.bloque}
                          </span>
                          <span>{tema.etiqueta}</span>
                        </div>
                        <i
                          className={`fa-solid ${
                            activo ? 'fa-square-check text-rose-600' : 'fa-square text-slate-300'
                          }`}
                        ></i>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pestaña 4: Subtemas */}
              {tabEtiquetadoModal === 'subtemas' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nuevoSubtemaInput}
                      onChange={(e) => setNuevoSubtemaInput(e.target.value)}
                      placeholder="Crear nuevo subtema personalizado (ej. Transferencias al AGA, Cuadro de Plazos)..."
                      className="flex-1 py-1.5 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleAnadirSubtemaPersonalizado}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      + Crear Subtema
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap max-h-48 overflow-y-auto">
                    {todosLosSubtemas
                      .filter(
                        (s) =>
                          !busquedaEtiquetaModal.trim() ||
                          s.toLowerCase().includes(busquedaEtiquetaModal.toLowerCase())
                      )
                      .map((sub) => {
                        const activo = formSubtemas.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleElementoEnArray(formSubtemas, sub, setFormSubtemas)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              activo
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span># {sub}</span>
                            {activo && <i className="fa-solid fa-check text-[10px]"></i>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formDestacado}
                  onChange={(e) => setFormDestacado(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>⭐ Marcar como documento / enlace destacado</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalFormulario(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarFormulario}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>{documentoEnEdicion ? 'Guardar Cambios' : 'Guardar en Biblioteca'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTOR DE SUBTEMAS */}
      {mostrarGestorSubtemas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <i className="fa-solid fa-sitemap"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Gestión de Subtemas de la Biblioteca
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Crea o elimina subtemas para clasificar tus documentos locales y enlaces web
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarGestorSubtemas(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nuevoSubtemaInput}
                onChange={(e) => setNuevoSubtemaInput(e.target.value)}
                placeholder="Nuevo subtema (ej. Archivos de Oficina RD 1708/2011)..."
                className="flex-1 py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAnadirSubtemaPersonalizado}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                + Añadir
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {todosLosSubtemas.map((sub) => (
                <div
                  key={sub}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200"># {sub}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onActualizarSubtemas(todosLosSubtemas.filter((s) => s !== sub));
                    }}
                    className="text-slate-400 hover:text-rose-600 px-2 py-0.5 cursor-pointer"
                    title="Eliminar este subtema del listado"
                  >
                    <i className="fa-solid fa-trash-can text-[11px]"></i>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMostrarGestorSubtemas(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINAR DOCUMENTO */}
      {documentoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-lg">
                <i className="fa-solid fa-trash-can"></i>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  ¿Eliminar esta referencia documental?
                </h3>
                <p className="text-xs text-slate-500">
                  Se eliminará el enlace de la base de datos de la Biblioteca.
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              {documentoAEliminar.titulo}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocumentoAEliminar(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
