/**
 * Arquitectura de Almacenamiento Persistente en IndexedDB (v3.8)
 * - Sustituye por completo localStorage para todo el estado pesado de la aplicación
 *   (soporta >10.000 preguntas, >300 exámenes y colecciones de +20 MB sin límite de 5 MB).
 * - Mantiene en localStorage ÚNICAMENTE preferencias visuales ligeras (tema oscuro, tamaño lectura, etc.).
 * - Hidrata en memoria al iniciar la aplicación para lecturas síncronas instantáneas en todos los módulos
 *   y guarda automáticamente en segundo plano en IndexedDB ante cualquier cambio.
 */

const IDB_DB_NAME = 'c1_simulador_integral_db_v1';
const IDB_STORE_NAME = 'kv_store';
const IDB_VERSION = 1;

// Caché en memoria viva hidratada desde IndexedDB al iniciar la app
const memoriaVivaCache = new Map<string, any>();

// Claves pesadas gestionadas exclusivamente en IndexedDB (jamás se escriben en localStorage)
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

const SET_CLAVES_PESADAS_IDB = new Set<string>(CLAVES_PRINCIPALES_IDB as readonly string[]);

// Claves ligeras de preferencias visuales permitidas en localStorage
export const CLAVES_PREFERENCIAS_LIGERAS_LS = new Set<string>([
  'c1_dark_mode',
  'c1_modo_lectura_tamano',
  'c1_auto_avance_al_final',
  'c1_corte_propio_test',
  'c1_corte_propio_supuesto',
  'c1_usar_corte_propio',
  'c1_custom_gemini_api_key',
  'gemini_custom_api_key',
  'c1_selected_gemini_model',
]);

export function esClavePesadaIndexedDB(key: string): boolean {
  return SET_CLAVES_PESADAS_IDB.has(key) || key.startsWith('c1_anotaciones_');
}

export interface EstadoBaseDatosIDB {
  listo: boolean;
  guardando: boolean;
  ultimoGuardadoISO: string | null;
  totalExamenesBanco: number;
  totalPreguntasBanco: number;
  totalHistorial: number;
  totalDudas: number;
  totalEnlacesBiblioteca: number;
  error: string | null;
}

export interface InventarioVerificadoIDB {
  totalExamenesBanco: number;
  totalPreguntasBanco: number;
  totalHistorial: number;
  totalPreguntasHistorial: number;
  totalDudas: number;
  totalDocumentosBiblioteca: number;
  bancoExamenesIDB: any[];
  historialPruebasIDB: any[];
}

let estadoDB: EstadoBaseDatosIDB = {
  listo: false,
  guardando: false,
  ultimoGuardadoISO: null,
  totalExamenesBanco: 0,
  totalPreguntasBanco: 0,
  totalHistorial: 0,
  totalDudas: 0,
  totalEnlacesBiblioteca: 0,
  error: null,
};

type ListenerEstadoIDB = (estado: EstadoBaseDatosIDB) => void;
const listenersEstado = new Set<ListenerEstadoIDB>();

function recalcularContadoresDesdeCache(): void {
  const banco = memoriaVivaCache.get('c1_banco_examenes');
  const historial = memoriaVivaCache.get('c1_historial_pruebas');
  const dudas = memoriaVivaCache.get('c1_almacen_dudas');
  const docs = memoriaVivaCache.get('c1_biblioteca_documentos');

  const arrBanco = Array.isArray(banco) ? banco : [];
  const arrHist = Array.isArray(historial) ? historial : [];
  const arrDudas = Array.isArray(dudas) ? dudas : [];
  const arrDocs = Array.isArray(docs) ? docs : [];

  let totalPreguntas = 0;
  for (let i = 0; i < arrBanco.length; i++) {
    const ex = arrBanco[i];
    if (ex && Array.isArray(ex.preguntas)) {
      totalPreguntas += ex.preguntas.length;
    }
  }

  estadoDB = {
    ...estadoDB,
    totalExamenesBanco: arrBanco.length,
    totalPreguntasBanco: totalPreguntas,
    totalHistorial: arrHist.length,
    totalDudas: arrDudas.length,
    totalEnlacesBiblioteca: arrDocs.length,
  };
}

function notificarListenersEstado(): void {
  recalcularContadoresDesdeCache();
  const snapshot = { ...estadoDB };
  listenersEstado.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (_) {}
  });
}

export function obtenerEstadoBaseDatosIDB(): EstadoBaseDatosIDB {
  recalcularContadoresDesdeCache();
  return { ...estadoDB };
}

export function suscribirEstadoBaseDatosIDB(listener: ListenerEstadoIDB): () => void {
  listenersEstado.add(listener);
  listener(obtenerEstadoBaseDatosIDB());
  return () => {
    listenersEstado.delete(listener);
  };
}

// Conexión singleton reutilizable a IndexedDB para escrituras asíncronas ultrarrápidas
let dbSingletonPromise: Promise<IDBDatabase | null> | null = null;
const escriturasEnCurso = new Set<Promise<any>>();
const colaPorClave = new Map<string, Promise<boolean>>();

function obtenerConexionIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbSingletonPromise) {
    return dbSingletonPromise;
  }
  dbSingletonPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbSingletonPromise = null;
        };
        db.onclose = () => {
          dbSingletonPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbSingletonPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        dbSingletonPromise = null;
        resolve(null);
      };
    } catch (_) {
      dbSingletonPromise = null;
      resolve(null);
    }
  });
  return dbSingletonPromise;
}

function registrarPromesaEscritura<T>(promesa: Promise<T>): Promise<T> {
  escriturasEnCurso.add(promesa);
  if (!estadoDB.guardando) {
    estadoDB = { ...estadoDB, guardando: true };
    notificarListenersEstado();
  }
  void promesa.finally(() => {
    escriturasEnCurso.delete(promesa);
    if (escriturasEnCurso.size === 0) {
      estadoDB = {
        ...estadoDB,
        guardando: false,
        ultimoGuardadoISO: new Date().toISOString(),
      };
      notificarListenersEstado();
    }
  });
  return promesa;
}

/**
 * Espera a que terminen todas las escrituras en segundo plano pendientes en IndexedDB.
 */
export async function esperarEscriturasPendientesIDB(): Promise<void> {
  while (escriturasEnCurso.size > 0) {
    await Promise.allSettled(Array.from(escriturasEnCurso));
  }
}

export function escribirEnIndexedDB(key: string, value: any): Promise<boolean> {
  memoriaVivaCache.set(key, value);
  const previa = colaPorClave.get(key) || Promise.resolve(true);

  const tarea = previa
    .catch(() => false)
    .then(async () => {
      const db = await obtenerConexionIDB();
      if (!db) return false;
      return new Promise<boolean>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          const store = tx.objectStore(IDB_STORE_NAME);
          store.put(value, key);
          tx.oncomplete = () => {
            estadoDB = { ...estadoDB, error: null };
            resolve(true);
          };
          tx.onerror = () => {
            estadoDB = {
              ...estadoDB,
              error: 'Error al guardar en IndexedDB',
            };
            resolve(false);
          };
        } catch (_) {
          dbSingletonPromise = null;
          resolve(false);
        }
      });
    });

  colaPorClave.set(key, tarea);
  void tarea.finally(() => {
    if (colaPorClave.get(key) === tarea) {
      colaPorClave.delete(key);
    }
  });

  return registrarPromesaEscritura(tarea);
}

/**
 * Escribe múltiples pares clave-valor en una única transacción atómica de IndexedDB.
 */
export async function escribirMultiplesEnIndexedDB(entradas: Record<string, any>): Promise<boolean> {
  const claves = Object.keys(entradas);
  if (claves.length === 0) return true;

  claves.forEach((k) => {
    memoriaVivaCache.set(k, entradas[k]);
  });
  notificarListenersEstado();

  const tarea = (async () => {
    const db = await obtenerConexionIDB();
    if (!db) return false;
    return new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        for (const k of claves) {
          store.put(entradas[k], k);
        }
        tx.oncomplete = () => {
          estadoDB = { ...estadoDB, error: null };
          resolve(true);
        };
        tx.onerror = () => {
          estadoDB = { ...estadoDB, error: 'Error en transacción múltiple de IndexedDB' };
          resolve(false);
        };
      } catch (_) {
        dbSingletonPromise = null;
        resolve(false);
      }
    });
  })();

  return registrarPromesaEscritura(tarea);
}

export async function eliminarDeIndexedDB(key: string): Promise<void> {
  memoriaVivaCache.delete(key);
  notificarListenersEstado();
  const db = await obtenerConexionIDB();
  if (!db) return;

  const tarea = new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (_) {
      dbSingletonPromise = null;
      resolve();
    }
  });

  await registrarPromesaEscritura(tarea);
}

/**
 * Elimina de IndexedDB y de memoria viva todas las claves `c1_anotaciones_*` existentes
 * (usado al restaurar una copia en modo sobrescribir todo para no dejar restos antiguos).
 */
export async function limpiarTodasLasAnotacionesDeIndexedDB(): Promise<void> {
  const clavesBorrar: string[] = [];
  memoriaVivaCache.forEach((_v, k) => {
    if (k.startsWith('c1_anotaciones_')) {
      clavesBorrar.push(k);
    }
  });
  clavesBorrar.forEach((k) => memoriaVivaCache.delete(k));

  const db = await obtenerConexionIDB();
  if (!db) return;

  const tarea = new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const keys = keysReq.result || [];
        keys.forEach((rawKey) => {
          const kStr = String(rawKey);
          if (kStr.startsWith('c1_anotaciones_')) {
            store.delete(rawKey);
          }
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (_) {
      resolve();
    }
  });

  await registrarPromesaEscritura(tarea);
}

/**
 * Guarda en segundo plano en IndexedDB (y actualiza al instante memoriaVivaCache).
 * NUNCA escribe datos pesados en localStorage: localStorage queda reservado exclusivamente
 * para preferencias visuales ligeras.
 */
export function guardarDatoPersistenteIntegral(key: string, data: any): boolean {
  if (!esClavePesadaIndexedDB(key) && CLAVES_PREFERENCIAS_LIGERAS_LS.has(key)) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
      } catch (_) {}
    }
    return true;
  }

  memoriaVivaCache.set(key, data);
  notificarListenersEstado();
  void escribirEnIndexedDB(key, data);
  return true;
}

/**
 * Lectura síncrona instantánea desde la caché hidratada por IndexedDB.
 */
export function leerDatoPersistenteSincrono<T>(key: string, fallback: T): T {
  if (memoriaVivaCache.has(key)) {
    return memoriaVivaCache.get(key) as T;
  }
  if (!esClavePesadaIndexedDB(key) && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
}

export function actualizarCacheMemoriaViva(key: string, data: any): void {
  memoriaVivaCache.set(key, data);
  notificarListenersEstado();
}

/**
 * Lee directamente un valor desde IndexedDB en disco (sin usar caché) para auditoría e integridad.
 */
export async function leerDirectoDesdeIndexedDB<T>(key: string): Promise<T | undefined> {
  await esperarEscriturasPendientesIDB();
  const db = await obtenerConexionIDB();
  if (!db) {
    return memoriaVivaCache.get(key) as T | undefined;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const req = tx.objectStore(IDB_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(memoriaVivaCache.get(key) as T | undefined);
    } catch (_) {
      resolve(memoriaVivaCache.get(key) as T | undefined);
    }
  });
}

/**
 * Verifica directamente contra los registros almacenados en IndexedDB el conteo exacto
 * de exámenes, preguntas, historial, dudas y documentos antes de disparar cualquier exportación.
 */
export async function obtenerInventarioVerificadoIndexedDB(): Promise<InventarioVerificadoIDB> {
  await esperarEscriturasPendientesIDB();

  const [bancoIDB, historialIDB, dudasIDB, docsIDB] = await Promise.all([
    leerDirectoDesdeIndexedDB<any[]>('c1_banco_examenes'),
    leerDirectoDesdeIndexedDB<any[]>('c1_historial_pruebas'),
    leerDirectoDesdeIndexedDB<any[]>('c1_almacen_dudas'),
    leerDirectoDesdeIndexedDB<any[]>('c1_biblioteca_documentos'),
  ]);

  const arrBanco = Array.isArray(bancoIDB) ? bancoIDB : [];
  const arrHist = Array.isArray(historialIDB) ? historialIDB : [];
  const arrDudas = Array.isArray(dudasIDB) ? dudasIDB : [];
  const arrDocs = Array.isArray(docsIDB) ? docsIDB : [];

  let totalPreguntasBanco = 0;
  for (const ex of arrBanco) {
    if (ex && Array.isArray(ex.preguntas)) {
      totalPreguntasBanco += ex.preguntas.length;
    }
  }

  let totalPreguntasHistorial = 0;
  for (const h of arrHist) {
    if (h && Array.isArray(h.preguntas)) {
      totalPreguntasHistorial += h.preguntas.length;
    }
  }

  return {
    totalExamenesBanco: arrBanco.length,
    totalPreguntasBanco,
    totalHistorial: arrHist.length,
    totalPreguntasHistorial,
    totalDudas: arrDudas.length,
    totalDocumentosBiblioteca: arrDocs.length,
    bancoExamenesIDB: arrBanco,
    historialPruebasIDB: arrHist,
  };
}

let inicializacionEnCurso: Promise<Record<string, any>> | null = null;

/**
 * Inicializa IndexedDB antes del primer renderizado de la aplicación:
 * 1. Carga todas las claves almacenadas en IndexedDB hacia memoriaVivaCache.
 * 2. Migra automáticamente cualquier clave pesada heredada de sesiones antiguas en localStorage
 *    hacia IndexedDB y la elimina de localStorage para liberar los 5 MB de forma definitiva.
 */
export function inicializarAlmacenamientoPersistenteIDB(): Promise<Record<string, any>> {
  if (inicializacionEnCurso) return inicializacionEnCurso;

  inicializacionEnCurso = (async () => {
    const resultado: Record<string, any> = {};
    const db = await obtenerConexionIDB();

    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE_NAME, 'readonly');
          const store = tx.objectStore(IDB_STORE_NAME);
          const keysReq = store.getAllKeys();

          keysReq.onsuccess = () => {
            const keys = keysReq.result || [];
            if (keys.length === 0) {
              resolve();
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
                if (pendientes === 0) resolve();
              };
              valReq.onerror = () => {
                pendientes--;
                if (pendientes === 0) resolve();
              };
            });
          };
          keysReq.onerror = () => resolve();
        } catch (_) {
          resolve();
        }
      });
    }

    // Migración única y limpieza de claves pesadas heredadas en localStorage -> IndexedDB
    if (typeof window !== 'undefined' && window.localStorage) {
      const aMigrar: Record<string, any> = {};
      const clavesLimpiarLS: string[] = [];

      try {
        const todasLasClavesLS: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) todasLasClavesLS.push(k);
        }

        for (const k of todasLasClavesLS) {
          if (k === 'c1_examenes_guardados') {
            // Migración legacy v1 si IndexedDB aún no tenía banco/historial
            try {
              const rawLegacy = localStorage.getItem(k);
              if (rawLegacy && !memoriaVivaCache.has('c1_banco_examenes') && !memoriaVivaCache.has('c1_historial_pruebas')) {
                const parsedLegacy = JSON.parse(rawLegacy);
                if (Array.isArray(parsedLegacy)) {
                  const bancoMig: any[] = [];
                  const histMig: any[] = [];
                  parsedLegacy.forEach((ex: any) => {
                    if (!ex) return;
                    if (ex.resultado) histMig.push(ex);
                    const baseId = ex.testBaseId || String(ex.id || '').replace(/-intento-\d+$/, '');
                    if (baseId && !bancoMig.some((b) => b.id === baseId)) {
                      bancoMig.push({
                        ...ex,
                        id: baseId,
                        titulo: String(ex.titulo || '').replace(/\s*\(Intento\s*\d+\)/i, '').trim(),
                        resultado: undefined,
                      });
                    }
                  });
                  if (bancoMig.length > 0) aMigrar['c1_banco_examenes'] = bancoMig;
                  if (histMig.length > 0) aMigrar['c1_historial_pruebas'] = histMig;
                }
              }
            } catch (_) {}
            clavesLimpiarLS.push(k);
            continue;
          }

          if (esClavePesadaIndexedDB(k)) {
            try {
              const rawVal = localStorage.getItem(k);
              if (rawVal !== null) {
                const parsedVal = JSON.parse(rawVal);
                const actualIDB = memoriaVivaCache.get(k);

                if (actualIDB === undefined) {
                  aMigrar[k] = parsedVal;
                  resultado[k] = parsedVal;
                } else if (Array.isArray(parsedVal) && Array.isArray(actualIDB) && parsedVal.length > actualIDB.length) {
                  // Conservar la colección más completa si localStorage tenía elementos previos no volcados
                  const mapa = new Map<string, any>();
                  actualIDB.forEach((it: any, idx: number) => {
                    const idK = it && typeof it === 'object' && it.id ? String(it.id) : `idb-${idx}`;
                    mapa.set(idK, it);
                  });
                  parsedVal.forEach((it: any, idx: number) => {
                    const idK = it && typeof it === 'object' && it.id ? String(it.id) : `ls-${idx}`;
                    if (!mapa.has(idK)) mapa.set(idK, it);
                  });
                  const fusionado = Array.from(mapa.values());
                  aMigrar[k] = fusionado;
                  resultado[k] = fusionado;
                }
              }
            } catch (_) {}
            clavesLimpiarLS.push(k);
          }
        }

        if (Object.keys(aMigrar).length > 0) {
          await escribirMultiplesEnIndexedDB(aMigrar);
        }

        // Eliminar definitivamente todas las claves pesadas de localStorage tras volcarlas en IndexedDB
        for (const kBorrar of clavesLimpiarLS) {
          try {
            localStorage.removeItem(kBorrar);
          } catch (_) {}
        }
      } catch (_) {}
    }

    estadoDB = {
      ...estadoDB,
      listo: true,
      guardando: false,
      ultimoGuardadoISO: estadoDB.ultimoGuardadoISO || new Date().toISOString(),
    };
    notificarListenersEstado();
    return resultado;
  })();

  return inicializacionEnCurso;
}

/**
 * Alias compatible para llamadas existentes.
 */
export async function hidratarTodoDesdeIndexedDB(): Promise<Record<string, any>> {
  return inicializarAlmacenamientoPersistenteIDB();
}

/**
 * Recopila todas las anotaciones (`c1_anotaciones_*`) almacenadas en IndexedDB / memoria viva.
 */
export function recopilarTodasLasAnotacionesPersistidas(): Record<string, any[]> {
  const resultado: Record<string, any[]> = {};

  memoriaVivaCache.forEach((val, key) => {
    if (key.startsWith('c1_anotaciones_') && Array.isArray(val) && val.length > 0) {
      const examId = key.replace('c1_anotaciones_', '');
      resultado[examId] = val;
    }
  });

  return resultado;
}
