/**
 * Gestor de carpetas de exportación (Carpeta por defecto persistente o Selección de cualquier carpeta).
 * Utiliza File System Access API (showDirectoryPicker / showSaveFilePicker) cuando está disponible
 * en el navegador y contexto, almacenando el puntero FileSystemDirectoryHandle en IndexedDB,
 * y recurre automáticamente a descarga segura mediante Blob + URL.createObjectURL cuando el navegador
 * o el contenedor embebido restringe los selectores nativos del sistema de archivos.
 */

export type ModoCarpetaExportacion = 'carpeta_por_defecto' | 'elegir_cualquier_carpeta';

export interface ConfiguracionCarpetaExportacion {
  modo: ModoCarpetaExportacion;
  nombreCarpetaPorDefecto: string | null;
  tieneHandlePorDefecto: boolean;
  soportaSelectorNativo: boolean;
  enIframeEmbebido: boolean;
}

export interface ArchivoExportableItem {
  blob: Blob;
  nombreArchivo: string;
  mimeType?: string;
}

export interface ResultadoGuardadoExportacion {
  ok: boolean;
  cancelado?: boolean;
  metodoUsado: 'carpeta_defecto_fs' | 'carpeta_elegida_fs' | 'descarga_navegador';
  nombreCarpetaUsada?: string;
  aviso?: string;
}

const LS_MODO_CARPETA = 'c1_modo_destino_exportacion';
const LS_NOMBRE_CARPETA_DEFECTO = 'c1_default_export_dir_name';
const IDB_EXPORT_DB = 'c1_export_folders_db_v1';
const IDB_EXPORT_STORE = 'directory_handles';
const IDB_DEFAULT_DIR_KEY = 'default_export_directory';

type ListenerCambioCarpeta = () => void;
const listeners = new Set<ListenerCambioCarpeta>();

export function suscribirCambiosCarpetaExportacion(fn: ListenerCambioCarpeta): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notificarCambios(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (_) {}
  });
}

export function estaEnIframeEmbebido(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch (_) {
    return true;
  }
}

export function soportaSelectorCarpetaNativo(): boolean {
  if (typeof window === 'undefined') return false;
  const tieneAPI =
    typeof (window as any).showDirectoryPicker === 'function' ||
    typeof (window as any).showSaveFilePicker === 'function';
  return tieneAPI && !estaEnIframeEmbebido();
}

function abrirBaseDatosHandles(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_EXPORT_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_EXPORT_STORE)) {
          db.createObjectStore(IDB_EXPORT_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function guardarHandleCarpetaPorDefectoIDB(handle: any): Promise<boolean> {
  const db = await abrirBaseDatosHandles();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_EXPORT_STORE, 'readwrite');
      tx.objectStore(IDB_EXPORT_STORE).put(handle, IDB_DEFAULT_DIR_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

async function leerHandleCarpetaPorDefectoIDB(): Promise<any | null> {
  const db = await abrirBaseDatosHandles();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_EXPORT_STORE, 'readonly');
      const req = tx.objectStore(IDB_EXPORT_STORE).get(IDB_DEFAULT_DIR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function eliminarHandleCarpetaPorDefectoIDB(): Promise<void> {
  const db = await abrirBaseDatosHandles();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_EXPORT_STORE, 'readwrite');
      tx.objectStore(IDB_EXPORT_STORE).delete(IDB_DEFAULT_DIR_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (_) {
      resolve();
    }
  });
}

export function leerConfiguracionCarpetaExportacionSincrona(): ConfiguracionCarpetaExportacion {
  let modo: ModoCarpetaExportacion = 'carpeta_por_defecto';
  let nombreCarpetaPorDefecto: string | null = null;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const m = localStorage.getItem(LS_MODO_CARPETA);
      if (m === 'carpeta_por_defecto' || m === 'elegir_cualquier_carpeta') {
        modo = m;
      }
      nombreCarpetaPorDefecto = localStorage.getItem(LS_NOMBRE_CARPETA_DEFECTO) || null;
    } catch (_) {}
  }

  return {
    modo,
    nombreCarpetaPorDefecto,
    tieneHandlePorDefecto: Boolean(nombreCarpetaPorDefecto),
    soportaSelectorNativo: soportaSelectorCarpetaNativo(),
    enIframeEmbebido: estaEnIframeEmbebido(),
  };
}

export function cambiarModoCarpetaExportacion(nuevoModo: ModoCarpetaExportacion): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(LS_MODO_CARPETA, nuevoModo);
    } catch (_) {}
  }
  notificarCambios();
}

export async function configurarCarpetaPorDefectoConSelector(): Promise<{
  ok: boolean;
  nombreCarpeta?: string;
  cancelado?: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined' || typeof (window as any).showDirectoryPicker !== 'function') {
    return {
      ok: false,
      error:
        'Este navegador utiliza directamente su carpeta «Descargas» predeterminada. Puedes cambiarla en los ajustes del navegador o usar Chrome/Edge de escritorio.',
    };
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'c1_default_export_folder',
      mode: 'readwrite',
    });

    if (!dirHandle) {
      return { ok: false, cancelado: true };
    }

    await guardarHandleCarpetaPorDefectoIDB(dirHandle);
    const folderName = String(dirHandle.name || 'Carpeta seleccionada');

    try {
      localStorage.setItem(LS_NOMBRE_CARPETA_DEFECTO, folderName);
      localStorage.setItem(LS_MODO_CARPETA, 'carpeta_por_defecto');
    } catch (_) {}

    notificarCambios();
    return { ok: true, nombreCarpeta: folderName };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, cancelado: true };
    }
    if (err?.name === 'SecurityError' || estaEnIframeEmbebido()) {
      return {
        ok: false,
        error:
          'En vista previa embebida el navegador protege el selector de carpetas y guarda en tu carpeta «Descargas» por defecto. Abre la app en pestaña completa para fijar otra carpeta local.',
      };
    }
    return {
      ok: false,
      error: err?.message || 'No se pudo seleccionar la carpeta por defecto.',
    };
  }
}

export async function restablecerCarpetaPorDefectoADescargas(): Promise<void> {
  await eliminarHandleCarpetaPorDefectoIDB();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(LS_NOMBRE_CARPETA_DEFECTO);
      localStorage.setItem(LS_MODO_CARPETA, 'carpeta_por_defecto');
    } catch (_) {}
  }
  notificarCambios();
}

async function verificarPermisoEscrituraCarpeta(dirHandle: any): Promise<boolean> {
  if (!dirHandle) return false;
  try {
    if (typeof dirHandle.queryPermission === 'function') {
      const estado = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (estado === 'granted') return true;
    }
    if (typeof dirHandle.requestPermission === 'function') {
      const nuevoEstado = await dirHandle.requestPermission({ mode: 'readwrite' });
      return nuevoEstado === 'granted';
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function escribirArchivosEnDirectorioHandle(
  dirHandle: any,
  archivos: ArchivoExportableItem[]
): Promise<void> {
  for (const item of archivos) {
    const fileHandle = await dirHandle.getFileHandle(item.nombreArchivo, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(item.blob);
    await writable.close();
  }
}

function descargarViaEnlaceNavegador(archivos: ArchivoExportableItem[]): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  archivos.forEach((item, idx) => {
    const disparo = () => {
      const url = URL.createObjectURL(item.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.nombreArchivo;
      a.rel = 'noopener';
      a.className = 'hidden';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      }, 1000);
    };
    if (idx === 0) {
      disparo();
    } else {
      setTimeout(disparo, idx * 320);
    }
  });
  return true;
}

/**
 * Guarda uno o varios archivos respetando la preferencia de destino del usuario:
 * - 'carpeta_por_defecto': escribe en la carpeta por defecto configurada (o Descargas del navegador si no se fijó otra).
 * - 'elegir_cualquier_carpeta': abre el selector nativo de carpetas/archivo para que el usuario elija cualquier carpeta.
 */
export async function guardarArchivosSegunPreferenciaCarpeta(
  archivos: ArchivoExportableItem[],
  modoForzado?: ModoCarpetaExportacion
): Promise<ResultadoGuardadoExportacion> {
  if (!Array.isArray(archivos) || archivos.length === 0) {
    return { ok: false, metodoUsado: 'descarga_navegador' };
  }

  const config = leerConfiguracionCarpetaExportacionSincrona();
  const modoEfectivo = modoForzado || config.modo;

  // Caso 1: El usuario eligió "Seleccionar cualquier carpeta al guardar"
  if (modoEfectivo === 'elegir_cualquier_carpeta') {
    if (typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          id: 'c1_custom_export_folder',
          mode: 'readwrite',
        });
        if (!dirHandle) {
          return { ok: false, cancelado: true, metodoUsado: 'carpeta_elegida_fs' };
        }
        await escribirArchivosEnDirectorioHandle(dirHandle, archivos);
        return {
          ok: true,
          metodoUsado: 'carpeta_elegida_fs',
          nombreCarpetaUsada: String(dirHandle.name || 'Carpeta elegida'),
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { ok: false, cancelado: true, metodoUsado: 'carpeta_elegida_fs' };
        }
        // Si está restringido por iframe o política del navegador, hacer fallback limpio
      }
    } else if (
      archivos.length === 1 &&
      typeof window !== 'undefined' &&
      typeof (window as any).showSaveFilePicker === 'function'
    ) {
      try {
        const unico = archivos[0];
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: unico.nombreArchivo,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(unico.blob);
        await writable.close();
        return {
          ok: true,
          metodoUsado: 'carpeta_elegida_fs',
          nombreCarpetaUsada: 'Ubicación seleccionada',
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { ok: false, cancelado: true, metodoUsado: 'carpeta_elegida_fs' };
        }
      }
    }

    const okFallback = descargarViaEnlaceNavegador(archivos);
    return {
      ok: okFallback,
      metodoUsado: 'descarga_navegador',
      nombreCarpetaUsada: 'Descargas del navegador',
      aviso: estaEnIframeEmbebido()
        ? 'Guardado en la carpeta «Descargas» del navegador (abre la app en pestaña propia para abrir el selector de cualquier carpeta del disco).'
        : undefined,
    };
  }

  // Caso 2: El usuario eligió "Carpeta por defecto"
  if (config.tieneHandlePorDefecto && !estaEnIframeEmbebido()) {
    try {
      const handleGuardado = await leerHandleCarpetaPorDefectoIDB();
      if (handleGuardado) {
        const tienePermiso = await verificarPermisoEscrituraCarpeta(handleGuardado);
        if (tienePermiso) {
          await escribirArchivosEnDirectorioHandle(handleGuardado, archivos);
          return {
            ok: true,
            metodoUsado: 'carpeta_defecto_fs',
            nombreCarpetaUsada:
              String(handleGuardado.name || '') || config.nombreCarpetaPorDefecto || 'Carpeta por defecto',
          };
        }
      }
    } catch (_) {
      // Si el handle caducó o la carpeta se movió, continúa hacia Descargas del navegador
    }
  }

  const okDescarga = descargarViaEnlaceNavegador(archivos);
  return {
    ok: okDescarga,
    metodoUsado: 'descarga_navegador',
    nombreCarpetaUsada: 'Descargas (por defecto del navegador)',
  };
}
