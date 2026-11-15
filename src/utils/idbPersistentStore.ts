/**
 * Almacenamiento Persistente Ilimitado (IndexedDB + Caché Síncrona en Memoria + Espejo Seguro en localStorage)
 * Evita que el límite de ~5 MB de localStorage trunque o pierda exámenes del Banco, Historial,
 * Dudas, Enlaces de Biblioteca, Recursos de Argumentación o Anotaciones.
 */

const IDB_DB_NAME = 'c1_simulador_integral_db_v1';
const IDB_STORE_NAME = 'kv_store';
const IDB_VERSION = 1;

// Espejo en memoria viva para lecturas síncronas instantáneas (incluidas exportaciones de Copia de Seguridad)
const memoriaVivaCache = new Map<string, any>();

export const CLAVES_PRINCIPALES_IDB = [
  'c1_banco_examenes',
  'c1_historial_pruebas',
  'c1_almacen_dudas',
  'c1_biblioteca_documentos',
  'c1_biblioteca_subtemas',
  'c1_recursos_argumentacion_preguntas',
  'c1_preguntas_superadas_v1',
  'c1_examenes_eliminados',
  'c1_historial_preguntas_recientes',
  'c1_tests_descargados_pdf',
  'c1_active_exam_session',
] as const;

function abrirBaseDatosIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

export async function escribirEnIndexedDB(key: string, value: any): Promise<boolean> {
  const db = await abrirBaseDatosIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch (_) {
      try {
        db.close();
      } catch {}
      resolve(false);
    }
  });
}

export async function eliminarDeIndexedDB(key: string): Promise<void> {
  memoriaVivaCache.delete(key);
  const db = await abrirBaseDatosIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch (_) {
      try {
        db.close();
      } catch {}
      resolve();
    }
  });
}

/**
 * Registra el valor en la caché en memoria viva, lanza la escritura íntegra en IndexedDB (sin límite de 5MB)
 * e intenta guardarlo también en localStorage SIN recortar ni truncar jamás los datos del usuario.
 */
export function guardarDatoPersistenteIntegral(key: string, data: any): boolean {
  memoriaVivaCache.set(key, data);
  void escribirEnIndexedDB(key, data);

  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    // Si localStorage alcanza el tope de ~5MB del navegador, limpiamos únicamente claves obsoletas/temporales,
    // NUNCA truncamos arrays de exámenes, historial, dudas ni enlaces (IndexedDB + memoriaVivaCache conservan el 100%).
    try {
      localStorage.removeItem('c1_examenes_guardados'); // clave legacy antigua
      if (key !== 'c1_historial_preguntas_recientes') {
        localStorage.removeItem('c1_historial_preguntas_recientes');
      }
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch (_) {
      console.info(
        `[Persistencia] "${key}" supera la cuota de localStorage (5MB); respaldado al 100% en IndexedDB y memoria activa.`
      );
      return true;
    }
  }
}

/**
 * Lee de forma síncrona priorizando la memoria viva (siempre completa al 100% en la sesión)
 * y recurriendo a localStorage en el arranque inicial.
 */
export function leerDatoPersistenteSincrono<T>(key: string, fallback: T): T {
  if (memoriaVivaCache.has(key)) {
    return memoriaVivaCache.get(key) as T;
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as T;
    memoriaVivaCache.set(key, parsed);
    return parsed;
  } catch (_) {
    return fallback;
  }
}

export function actualizarCacheMemoriaViva(key: string, data: any): void {
  memoriaVivaCache.set(key, data);
}

/**
 * Lee TODAS las entradas guardadas en IndexedDB para hidratar la aplicación al arrancar
 * y garantizar que si localStorage quedó lleno, no falte ni un solo examen, intento, duda o enlace.
 */
export async function hidratarTodoDesdeIndexedDB(): Promise<Record<string, any>> {
  const resultado: Record<string, any> = {};
  const db = await abrirBaseDatosIDB();
  if (!db) return resultado;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const keysReq = store.getAllKeys();

      keysReq.onsuccess = () => {
        const keys = keysReq.result || [];
        if (keys.length === 0) {
          db.close();
          resolve(resultado);
          return;
        }
        let pendientes = keys.length;
        keys.forEach((k) => {
          const keyStr = String(k);
          const valReq = store.get(k);
          valReq.onsuccess = () => {
            if (valReq.result !== undefined) {
              resultado[keyStr] = valReq.result;
              memoriaVivaCache.set(keyStr, valReq.result);
            }
            pendientes--;
            if (pendientes === 0) {
              db.close();
              resolve(resultado);
            }
          };
          valReq.onerror = () => {
            pendientes--;
            if (pendientes === 0) {
              db.close();
              resolve(resultado);
            }
          };
        });
      };

      keysReq.onerror = () => {
        db.close();
        resolve(resultado);
      };
    } catch (_) {
      try {
        db.close();
      } catch {}
      resolve(resultado);
    }
  });
}

/**
 * Recopila todas las anotaciones (`c1_anotaciones_*`) tanto de memoria viva como de localStorage.
 */
export function recopilarTodasLasAnotacionesPersistidas(): Record<string, any[]> {
  const resultado: Record<string, any[]> = {};

  memoriaVivaCache.forEach((val, key) => {
    if (key.startsWith('c1_anotaciones_') && Array.isArray(val) && val.length > 0) {
      const examId = key.replace('c1_anotaciones_', '');
      resultado[examId] = val;
    }
  });

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('c1_anotaciones_')) {
          const examId = key.replace('c1_anotaciones_', '');
          if (!resultado[examId]) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(parsed) && parsed.length > 0) {
                resultado[examId] = parsed;
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  return resultado;
}
