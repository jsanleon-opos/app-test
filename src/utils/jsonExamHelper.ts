import {
  ExamenCompleto,
  FormatoExamenJSONOficial,
  PreguntaExamen,
  OpcionPregunta,
  ColorResaltador,
  TematicaNormativaId,
  TipoPrueba,
  SustitucionReserva,
  ResultadoExamen,
  CategoriaExamen,
  ConvocatoriaAmbito,
  ItemAlmacenDuda,
  RecursoArgumentacionPregunta,
  DocumentoBibliotecaItem,
} from '../types';
import {
  esNormaGenerica,
  obtenerNormaEfectivaDePregunta,
  deducirNormaOTemaDesdeTexto,
  obtenerReferenciaConvocatoriaOficial,
} from './tematicaClassifier';
import {
  DOCUMENTOS_INICIALES_BIBLIOTECA,
  SUBTEMAS_PREDEFINIDOS_BIBLIOTECA,
} from '../constants/catalogoBibliotecaDocumentos';
import { EXAMENES_PRECARGADOS_OFICIALES } from '../constants/boeData';
import {
  guardarDatoPersistenteIntegral,
  leerDatoPersistenteSincrono,
  recopilarTodasLasAnotacionesPersistidas,
  escribirMultiplesEnIndexedDB,
  esperarEscriturasPendientesIDB,
  limpiarTodasLasAnotacionesDeIndexedDB,
  obtenerInventarioVerificadoIndexedDB,
} from './idbPersistentStore';
import {
  comprimirTextoAGzipBlob,
  descargarBlobConObjectURL,
  limpiarPropiedadesRedundantes,
  soportaCompresionGzipNativa,
} from './backupCompression';

const STORAGE_KEY_RECURSOS_ARGUMENTACION = 'c1_recursos_argumentacion_preguntas';
const STORAGE_KEY_BIBLIOTECA_DOCUMENTOS = 'c1_biblioteca_documentos';
const STORAGE_KEY_BIBLIOTECA_SUBTEMAS = 'c1_biblioteca_subtemas';

/**
 * Sanitiza un registro de la Base de Datos de Documentos de Biblioteca para garantizar
 * estrictamente que NUNCA se almacene el contenido binario/base64 de ningún archivo
 * ni en la aplicación ni en la copia de seguridad JSON (únicamente enlaces web o rutas/referencias locales).
 */
export function sanitizarDocumentoBibliotecaSinBinarios(
  doc: Partial<DocumentoBibliotecaItem>
): DocumentoBibliotecaItem {
  let enlaceLimpio = (doc.enlaceORuta || '').trim();
  if (enlaceLimpio.startsWith('data:')) {
    // Eliminar cualquier contenido binario incrustado dejando solo el nombre o ruta de referencia
    enlaceLimpio = doc.nombreArchivoReferencia
      ? `Documento local: ${doc.nombreArchivoReferencia}`
      : 'Referencia a documento local (sin archivo almacenado)';
  }
  return {
    id: doc.id || `doc-bib-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    titulo: (doc.titulo || 'Documento / Enlace de referencia').trim(),
    tipoEnlace: doc.tipoEnlace === 'documento_local' ? 'documento_local' : 'web_externa',
    enlaceORuta: enlaceLimpio,
    nombreArchivoReferencia: doc.nombreArchivoReferencia,
    formatoDocumento: doc.formatoDocumento,
    descripcion: doc.descripcion || '',
    ambito: doc.ambito === 'CAM' ? 'CAM' : doc.ambito === 'AMBOS' ? 'AMBOS' : 'AGE',
    temasAgeC1: Array.isArray(doc.temasAgeC1) ? doc.temasAgeC1 : [],
    temasCamC1: Array.isArray(doc.temasCamC1) ? doc.temasCamC1 : [],
    leyesYDecretos: Array.isArray(doc.leyesYDecretos) ? doc.leyesYDecretos : [],
    subtemas: Array.isArray(doc.subtemas) ? doc.subtemas : [],
    destacado: Boolean(doc.destacado),
    fechaCreacion: doc.fechaCreacion || new Date().toISOString(),
    fechaActualizacion: doc.fechaActualizacion,
  };
}

export function leerBibliotecaDocumentosDeLocalStorage(): DocumentoBibliotecaItem[] {
  if (typeof window === 'undefined') {
    return DOCUMENTOS_INICIALES_BIBLIOTECA;
  }
  try {
    const parsed = leerDatoPersistenteSincrono<any[] | null>(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS, null);
    if (!parsed) {
      guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS, DOCUMENTOS_INICIALES_BIBLIOTECA);
      return DOCUMENTOS_INICIALES_BIBLIOTECA;
    }
    if (Array.isArray(parsed)) {
      const guardados = parsed.map((d) => sanitizarDocumentoBibliotecaSinBinarios(d));
      // Incorporar automáticamente nuevos documentos oficiales iniciales (ej. RD 1708/2011, RD 366/2007, IV Convenio, RD 951/2005) si aún no constan
      const idsExistentes = new Set(guardados.map((d) => d.id));
      const urlsExistentes = new Set(guardados.map((d) => (d.enlaceORuta || '').trim()));
      let huboNuevos = false;
      for (const docInicial of DOCUMENTOS_INICIALES_BIBLIOTECA) {
        if (!idsExistentes.has(docInicial.id) && !urlsExistentes.has((docInicial.enlaceORuta || '').trim())) {
          guardados.push(docInicial);
          huboNuevos = true;
        }
      }
      if (huboNuevos) {
        guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS, guardados);
      }
      return guardados;
    }
    return DOCUMENTOS_INICIALES_BIBLIOTECA;
  } catch (_) {
    return DOCUMENTOS_INICIALES_BIBLIOTECA;
  }
}

export function guardarBibliotecaDocumentosEnLocalStorage(
  docs: DocumentoBibliotecaItem[]
): DocumentoBibliotecaItem[] {
  const limpios = (docs || []).map((d) => sanitizarDocumentoBibliotecaSinBinarios(d));
  guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS, limpios);
  return limpios;
}

export function fusionarBibliotecaDocumentosEnLocalStorage(
  nuevosDocs?: DocumentoBibliotecaItem[]
): DocumentoBibliotecaItem[] {
  const existentes = leerBibliotecaDocumentosDeLocalStorage();
  if (!Array.isArray(nuevosDocs) || nuevosDocs.length === 0) {
    return existentes;
  }
  const mapa = new Map<string, DocumentoBibliotecaItem>();
  existentes.forEach((doc) => {
    if (doc && doc.id) {
      mapa.set(doc.id, sanitizarDocumentoBibliotecaSinBinarios(doc));
    }
  });
  nuevosDocs.forEach((doc) => {
    if (doc && (doc.id || doc.titulo || doc.enlaceORuta)) {
      const limpio = sanitizarDocumentoBibliotecaSinBinarios(doc);
      mapa.set(limpio.id, limpio);
    }
  });
  const resultado = Array.from(mapa.values());
  guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS, resultado);
  return resultado;
}

export function leerSubtemasBibliotecaDeLocalStorage(): string[] {
  if (typeof window === 'undefined') {
    return SUBTEMAS_PREDEFINIDOS_BIBLIOTECA;
  }
  try {
    const parsed = leerDatoPersistenteSincrono<string[] | null>(STORAGE_KEY_BIBLIOTECA_SUBTEMAS, null);
    if (!parsed) {
      guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_SUBTEMAS, SUBTEMAS_PREDEFINIDOS_BIBLIOTECA);
      return SUBTEMAS_PREDEFINIDOS_BIBLIOTECA;
    }
    if (Array.isArray(parsed)) {
      const combinados = Array.from(
        new Set([...SUBTEMAS_PREDEFINIDOS_BIBLIOTECA, ...parsed.filter((s) => typeof s === 'string' && s.trim())])
      );
      return combinados;
    }
    return SUBTEMAS_PREDEFINIDOS_BIBLIOTECA;
  } catch (_) {
    return SUBTEMAS_PREDEFINIDOS_BIBLIOTECA;
  }
}

export function guardarSubtemasBibliotecaEnLocalStorage(subtemas: string[]): string[] {
  const limpios = Array.from(
    new Set(
      [...SUBTEMAS_PREDEFINIDOS_BIBLIOTECA, ...(subtemas || [])]
        .map((s) => (s || '').trim())
        .filter(Boolean)
    )
  );
  guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_SUBTEMAS, limpios);
  return limpios;
}

export function fusionarSubtemasBibliotecaEnLocalStorage(nuevosSubtemas?: string[]): string[] {
  const actuales = leerSubtemasBibliotecaDeLocalStorage();
  if (!Array.isArray(nuevosSubtemas) || nuevosSubtemas.length === 0) {
    return actuales;
  }
  return guardarSubtemasBibliotecaEnLocalStorage([...actuales, ...nuevosSubtemas]);
}

export function normalizarClaveRecursoPregunta(enunciado?: string): string {
  return (enunciado || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function leerMapaRecursosArgumentacionGlobal(): Record<string, RecursoArgumentacionPregunta[]> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = leerDatoPersistenteSincrono<Record<string, RecursoArgumentacionPregunta[]>>(
      STORAGE_KEY_RECURSOS_ARGUMENTACION,
      {}
    );
    return parsed && typeof parsed === 'object' ? { ...parsed } : {};
  } catch (_) {
    return {};
  }
}

export function guardarRecursosArgumentacionDePregunta(
  enunciado: string,
  recursos: RecursoArgumentacionPregunta[]
): void {
  const clave = normalizarClaveRecursoPregunta(enunciado);
  if (!clave) return;
  const mapa = leerMapaRecursosArgumentacionGlobal();
  if (!recursos || recursos.length === 0) {
    delete mapa[clave];
  } else {
    mapa[clave] = recursos;
  }
  guardarEnLocalStorageSeguro(STORAGE_KEY_RECURSOS_ARGUMENTACION, mapa);
}

export function obtenerRecursosArgumentacionDePregunta(
  pregunta?: { enunciado?: string; recursosArgumentacion?: RecursoArgumentacionPregunta[] } | null
): RecursoArgumentacionPregunta[] {
  if (!pregunta) return [];
  const directos = Array.isArray(pregunta.recursosArgumentacion)
    ? pregunta.recursosArgumentacion
    : [];
  const clave = normalizarClaveRecursoPregunta(pregunta.enunciado);
  if (!clave) return directos;
  const mapa = leerMapaRecursosArgumentacionGlobal();
  const guardados = Array.isArray(mapa[clave]) ? mapa[clave] : [];
  if (directos.length === 0) return guardados;
  if (guardados.length === 0) return directos;

  // Combinar sin duplicar por id o url+titulo
  const vistos = new Set<string>();
  const combinados: RecursoArgumentacionPregunta[] = [];
  for (const r of [...directos, ...guardados]) {
    if (!r || !r.url) continue;
    const k = `${r.id || ''}|${r.tipo}|${r.titulo}|${r.url}`;
    if (!vistos.has(k)) {
      vistos.add(k);
      combinados.push(r);
    }
  }
  return combinados;
}

export function fusionarAlmacenDudasEnLocalStorage(nuevasDudas?: ItemAlmacenDuda[]): ItemAlmacenDuda[] {
  let existentes: ItemAlmacenDuda[] = [];
  try {
    const parsed = leerDatoPersistenteSincrono<ItemAlmacenDuda[]>('c1_almacen_dudas', []);
    if (Array.isArray(parsed)) existentes = parsed;
  } catch (_) {}

  if (!Array.isArray(nuevasDudas) || nuevasDudas.length === 0) {
    return existentes;
  }

  const mapa = new Map<string, ItemAlmacenDuda>();
  existentes.forEach((it) => {
    if (it && it.id) {
      const recursos = obtenerRecursosArgumentacionDePregunta(it);
      mapa.set(it.id, recursos.length > 0 ? { ...it, recursosArgumentacion: recursos } : it);
    }
  });
  nuevasDudas.forEach((it) => {
    if (it && (it.id || it.enunciado)) {
      const idFinal = it.id || `duda-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      if (Array.isArray(it.recursosArgumentacion) && it.recursosArgumentacion.length > 0 && it.enunciado) {
        guardarRecursosArgumentacionDePregunta(it.enunciado, it.recursosArgumentacion);
      }
      const recursos = obtenerRecursosArgumentacionDePregunta(it);
      mapa.set(idFinal, {
        ...it,
        id: idFinal,
        recursosArgumentacion: recursos.length > 0 ? recursos : it.recursosArgumentacion,
      });
    }
  });

  const resultado = Array.from(mapa.values());
  guardarEnLocalStorageSeguro('c1_almacen_dudas', resultado);
  return resultado;
}

export const AMBITOS_LISTA: { id: ConvocatoriaAmbito; label: string; shortLabel: string; icon: string }[] = [
  { id: 'AGE', label: 'AGE - subgrupo C1', shortLabel: 'AGE C1', icon: 'fa-building-columns' },
  { id: 'CAM', label: 'Madrid - C1', shortLabel: 'Madrid C1', icon: 'fa-landmark-flag' },
  { id: 'AMBOS', label: 'AGE/Madrid', shortLabel: 'AGE/Madrid', icon: 'fa-arrows-split-up-and-left' },
];

export const AMBITOS_INFO: Record<
  ConvocatoriaAmbito,
  { id: ConvocatoriaAmbito; label: string; shortLabel: string; badgeClass: string; icon: string }
> = {
  AGE: {
    id: 'AGE',
    label: 'AGE - subgrupo C1',
    shortLabel: 'AGE C1',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    icon: 'fa-building-columns',
  },
  CAM: {
    id: 'CAM',
    label: 'Madrid - C1',
    shortLabel: 'Madrid C1',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    icon: 'fa-landmark-flag',
  },
  AMBOS: {
    id: 'AMBOS',
    label: 'AGE/Madrid',
    shortLabel: 'AGE/Madrid',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    icon: 'fa-arrows-split-up-and-left',
  },
};

export const CATEGORIAS_EXAMEN_LISTA: { id: CategoriaExamen; label: string; icon: string }[] = [
  { id: 'test_oficial', label: 'Test oficial', icon: 'fa-certificate' },
  { id: 'test_academia', label: 'Test de academia', icon: 'fa-graduation-cap' },
  { id: 'test_ia', label: 'Test aleatorio (IA)', icon: 'fa-wand-magic-sparkles' },
  { id: 'supuesto_oficial', label: 'Supuesto oficial', icon: 'fa-scale-balanced' },
  { id: 'supuesto_academia', label: 'Supuesto de academia', icon: 'fa-school' },
  { id: 'supuesto_ia', label: 'Supuesto aleatorio (IA)', icon: 'fa-brain' },
];

export const CATEGORIAS_EXAMEN_INFO: Record<
  CategoriaExamen,
  { label: string; icon: string; bgBadge: string; textBadge: string; borderBadge: string }
> = {
  test_oficial: {
    label: 'Test oficial',
    icon: 'fa-certificate',
    bgBadge: 'bg-sky-50 dark:bg-sky-950/50',
    textBadge: 'text-sky-700 dark:text-sky-300',
    borderBadge: 'border-sky-200 dark:border-sky-800',
  },
  test_academia: {
    label: 'Test de academia',
    icon: 'fa-graduation-cap',
    bgBadge: 'bg-cyan-50 dark:bg-cyan-950/50',
    textBadge: 'text-cyan-700 dark:text-cyan-300',
    borderBadge: 'border-cyan-200 dark:border-cyan-800',
  },
  test_ia: {
    label: 'Test aleatorio (IA)',
    icon: 'fa-wand-magic-sparkles',
    bgBadge: 'bg-purple-50 dark:bg-purple-950/50',
    textBadge: 'text-purple-700 dark:text-purple-300',
    borderBadge: 'border-purple-200 dark:border-purple-800',
  },
  supuesto_oficial: {
    label: 'Supuesto oficial',
    icon: 'fa-scale-balanced',
    bgBadge: 'bg-emerald-50 dark:bg-emerald-950/50',
    textBadge: 'text-emerald-800 dark:text-emerald-300',
    borderBadge: 'border-emerald-200 dark:border-emerald-800',
  },
  supuesto_academia: {
    label: 'Supuesto de academia',
    icon: 'fa-school',
    bgBadge: 'bg-orange-50 dark:bg-orange-950/50',
    textBadge: 'text-orange-800 dark:text-orange-300',
    borderBadge: 'border-orange-200 dark:border-orange-800',
  },
  supuesto_ia: {
    label: 'Supuesto aleatorio (IA)',
    icon: 'fa-brain',
    bgBadge: 'bg-amber-50 dark:bg-amber-950/50',
    textBadge: 'text-amber-800 dark:text-amber-300',
    borderBadge: 'border-amber-200 dark:border-amber-800',
  },
};

export function deducirCategoriaExamen(tipo?: string, origen?: string, categoriaExistente?: CategoriaExamen): CategoriaExamen {
  if (categoriaExistente) return categoriaExistente;
  const esSupuesto = tipo === 'supuesto';
  if (origen === 'academia' || origen === 'academia_json') {
    return esSupuesto ? 'supuesto_academia' : 'test_academia';
  }
  const esOficial = origen === 'oficial_json';
  if (esSupuesto) {
    return esOficial ? 'supuesto_oficial' : 'supuesto_ia';
  } else {
    return esOficial ? 'test_oficial' : 'test_ia';
  }
}

/**
 * Normaliza y limpia una cadena de texto que contiene JSON o texto estructurado:
 * - Elimina Byte Order Mark (\uFEFF)
 * - Elimina bloques de código Markdown (```json ... ``` o ``` ...)
 * - Limpia espacios iniciales/finales
 */
export function limpiarTextoJSON(raw: string): string {
  if (!raw) return '';
  let str = raw.replace(/^\uFEFF/, '').trim();
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json|txt)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }
  return str;
}

/**
 * Convierte un objeto o string JSON (o incluso parsea opciones tipo { A, B, C, D })
 * a un objeto ExamenCompleto válido para el simulador interactivo con
 * separación estricta de preguntas ordinarias y preguntas de reserva según la normativa.
 */
export function validarYConvertirJSON(
  obj: any,
  opcionesInternas?: { preservarResultadoIntegro?: boolean }
): ExamenCompleto {
  if (!obj || typeof obj !== 'object') {
    throw new Error('El archivo no contiene un objeto JSON estructurado válido.');
  }

  // Si el JSON importado incluye mapa global de recursos de argumentación o datos del Almacén de Dudas, restaurarlos
  if (obj.recursosArgumentacionPorPregunta && typeof obj.recursosArgumentacionPorPregunta === 'object') {
    const mapaActual = leerMapaRecursosArgumentacionGlobal();
    Object.entries(obj.recursosArgumentacionPorPregunta).forEach(([clave, lista]) => {
      if (Array.isArray(lista) && lista.length > 0) {
        mapaActual[clave] = lista as RecursoArgumentacionPregunta[];
      }
    });
    guardarEnLocalStorageSeguro(STORAGE_KEY_RECURSOS_ARGUMENTACION, mapaActual);
  }

  if (Array.isArray(obj.almacenDudas) && obj.almacenDudas.length > 0) {
    fusionarAlmacenDudasEnLocalStorage(obj.almacenDudas);
  }
  if (Array.isArray(obj.bibliotecaDocumentos) && obj.bibliotecaDocumentos.length > 0) {
    fusionarBibliotecaDocumentosEnLocalStorage(obj.bibliotecaDocumentos);
  }
  if (Array.isArray(obj.subtemasBiblioteca) && obj.subtemasBiblioteca.length > 0) {
    fusionarSubtemasBibliotecaEnLocalStorage(obj.subtemasBiblioteca);
  }

  // Título
  const titulo = typeof obj.titulo === 'string' && obj.titulo.trim().length > 0
    ? obj.titulo.trim()
    : 'Examen Oficial Importado';

  // Preguntas ordinarias y posibles preguntas de reserva en arrays separados
  const rawOrdinarias = Array.isArray(obj.preguntas)
    ? obj.preguntas
    : Array.isArray(obj.questions)
    ? obj.questions
    : [];

  const rawReservas = Array.isArray(obj.preguntasReserva)
    ? obj.preguntasReserva
    : Array.isArray(obj.reserva)
    ? obj.reserva
    : Array.isArray(obj.preguntas_reserva)
    ? obj.preguntas_reserva
    : [];

  const rawPreguntas = [
    ...rawOrdinarias,
    ...rawReservas.map((r: any, rIdx: number) => ({
      ...r,
      esReserva: true,
      numeroReserva: r.numeroReserva || r.numero_reserva || rIdx + 1,
    })),
  ];

  if (rawPreguntas.length === 0) {
    throw new Error('El examen debe incluir una lista "preguntas" con al menos una pregunta.');
  }

  const preguntasValidadas: PreguntaExamen[] = rawPreguntas.map((p: any, idx: number) => {
    const id = typeof p.id === 'number' ? p.id : typeof p.numero === 'number' ? p.numero : idx + 1;
    const enunciado = p.enunciado || p.pregunta || `Pregunta #${id}`;

    let opciones: OpcionPregunta[] = [];

    // Extraer solución declarada en cualquiera de sus variantes
    const rawSol = (
      p.solucion ??
      p.respuestaCorrecta ??
      p.respuesta_correcta ??
      p.respuesta ??
      p.correcta ??
      p.sol ??
      p.clave ??
      p.answer ??
      p.correctAnswer ??
      p.correct_answer ??
      ''
    ).toString().trim();
    const solMatch = rawSol.match(/([A-Da-d])/i);
    const solucionLetra = solMatch ? solMatch[1].toUpperCase() : '';

    // Formato 1: opciones es un array [ { id: 'A', texto: '...', esCorrecta: true } ]
    if (Array.isArray(p.opciones)) {
      opciones = p.opciones.map((o: any, oIdx: number) => {
        const letraId = (o.id || String.fromCharCode(65 + oIdx)).toString().toUpperCase() as 'A' | 'B' | 'C' | 'D';
        let texto = typeof o === 'string' ? o : o.texto || o.opcion || '';

        const tieneMarcaCorrecta =
          o.esCorrecta === true ||
          o.es_correcta === true ||
          o.correct === true ||
          o.isCorrect === true ||
          (solucionLetra !== '' && letraId === solucionLetra) ||
          /\(correcta\)/i.test(texto) ||
          /^\*\s*[A-D]/i.test(texto) ||
          /\*+$/.test(texto.trim()) ||
          /\[x\]/i.test(texto);

        texto = texto.replace(/\(correcta\)/i, '').replace(/\*+$/, '').replace(/^\*+\s*/, '').trim();

        return {
          id: letraId,
          texto,
          esCorrecta: tieneMarcaCorrecta,
          explicacion: o.explicacion || '',
        };
      });
    }
    // Formato 2: opciones es un objeto { A: '...', B: '...', C: '...', D: '...' }
    else if (p.opciones && typeof p.opciones === 'object') {
      const letras: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

      opciones = letras
        .filter((l) => p.opciones[l] !== undefined)
        .map((l) => {
          let texto = String(p.opciones[l]);
          const tieneMarcaCorrecta =
            l === solucionLetra ||
            /\(correcta\)/i.test(texto) ||
            /^\*\s*[A-D]/i.test(texto) ||
            /\*+$/.test(texto.trim()) ||
            /\[x\]/i.test(texto);

          texto = texto.replace(/\(correcta\)/i, '').replace(/\*+$/, '').replace(/^\*+\s*/, '').trim();

          return {
            id: l,
            texto,
            esCorrecta: tieneMarcaCorrecta,
            explicacion: p.explicacion || '',
          };
        });
    }

    if (opciones.length < 2) {
      throw new Error(`La pregunta #${id} debe contener al menos 2 opciones (A, B...).`);
    }

    // Asegurar que al menos una opción esté marcada como correcta (si no venía ninguna, distribuir de forma balanceada)
    const tieneCorrecta = opciones.some((o) => o.esCorrecta);
    if (!tieneCorrecta && opciones.length > 0) {
      const letraBalanceada = (['A', 'B', 'C', 'D'][(id - 1) % 4]) as 'A' | 'B' | 'C' | 'D';
      const opc = opciones.find((o) => o.id === letraBalanceada) || opciones[0];
      opc.esCorrecta = true;
    }

    const esReserva = !!(
      p.esReserva ||
      p.es_reserva ||
      p.esPreguntaReserva ||
      p.tipo === 'reserva' ||
      p.seccion === 'reserva' ||
      p.bloque === 'reserva' ||
      (p.numeroReserva !== undefined && p.numeroReserva !== null) ||
      (p.numero_reserva !== undefined && p.numero_reserva !== null) ||
      /^(?:\[\s*RESERVA\s*\]|\(RESERVA\)|PREGUNTA\s+(?:DE\s+)?RESERVA|CUESTION\s+(?:DE\s+)?RESERVA|RESERVA\s+\d+|R\d+[\.\:\-])/i.test(enunciado) ||
      /\b(?:pregunta\s+de\s+reserva|cuesti[oó]n\s+de\s+reserva)\b/i.test(enunciado)
    );

    let numRes = p.numeroReserva || p.numero_reserva;
    if (!numRes && esReserva) {
      const m = enunciado.match(/(?:Reserva|R)\s*#?(\d+)/i);
      if (m) numRes = parseInt(m[1], 10);
    }

    const esAnulada = !!(p.esAnulada || p.es_anulada || p.anulada);
    const normaResuelta = obtenerNormaEfectivaDePregunta(
      { ...p, enunciado, opciones },
      { titulo, leyesBOEAplicadas: obj.leyesBOEAplicadas }
    );
    const leyesRel =
      Array.isArray(p.leyesRelacionadas) && p.leyesRelacionadas.some((l: string) => !esNormaGenerica(l))
        ? p.leyesRelacionadas.filter((l: string) => !esNormaGenerica(l))
        : !esNormaGenerica(normaResuelta)
        ? [normaResuelta]
        : undefined;

    const recursosRaw = Array.isArray(p.recursosArgumentacion)
      ? p.recursosArgumentacion
      : Array.isArray(p.enlacesArgumentacion)
      ? p.enlacesArgumentacion
      : [];
    if (recursosRaw.length > 0 && enunciado) {
      guardarRecursosArgumentacionDePregunta(enunciado, recursosRaw);
    }
    const recursosResueltos = obtenerRecursosArgumentacionDePregunta({
      enunciado,
      recursosArgumentacion: recursosRaw,
    });

    return {
      id,
      enunciado,
      opciones,
      tematica: p.tematica,
      codigoInedita: p.codigoInedita || p.codigoUnicoInedita,
      huellaAuditoria: p.huellaAuditoria,
      ejemploPractico: p.ejemploPractico,
      reglaMnemotecnica: p.reglaMnemotecnica,
      analisisDistractores: p.analisisDistractores,
      convocatoriasAparecida:
        p.convocatoriasAparecida ||
        p.convocatoria ||
        p.convocatoriaOficial ||
        obj.convocatoriaOficial ||
        obj.convocatoria,
      leyesRelacionadas: leyesRel,
      recursosArgumentacion: recursosResueltos.length > 0 ? recursosResueltos : undefined,
      justificacionLegal: {
        norma: !esNormaGenerica(p.justificacionLegal?.norma) ? p.justificacionLegal.norma : normaResuelta,
        articulo: p.justificacionLegal?.articulo || 'Precepto aplicable',
        codigoBOE: p.justificacionLegal?.codigoBOE || 'BOE-A',
        urlBOE: p.justificacionLegal?.urlBOE || 'https://www.boe.es',
        fundamento: p.justificacionLegal?.fundamento || 'Fundamentado en el Boletín Oficial del Estado (www.boe.es)',
        ejemploPractico: p.justificacionLegal?.ejemploPractico,
      },
      esReserva,
      numeroReserva: numRes,
      esAnulada,
      sustituidaPorReservaId: p.sustituidaPorReservaId,
      sustituyeAPreguntaId: p.sustituyeAPreguntaId,
      activaEnEvaluacion: p.activaEnEvaluacion,
    };
  });

  // Si ninguna pregunta estaba marcada como reserva en el origen, respetar el formato original sin inventar reservas
  // Salvo que vengan expresamente identificadas en el archivo, todas las preguntas se mantienen como ordinarias.


  // Asegurar que las preguntas ordinarias vayan primero y las de reserva al final
  const ordinarias = preguntasValidadas.filter((p) => !p.esReserva);
  const reservas = preguntasValidadas.filter((p) => p.esReserva);

  // Asegurar numeración secuencial de reserva (1 a 5)
  let rCount = 1;
  reservas.forEach((p) => {
    if (!p.numeroReserva) {
      p.numeroReserva = rCount;
    }
    rCount++;
  });

  // Lista ordenada de preguntas
  const todasOrdenadas = [...ordinarias, ...reservas];

  // Si hay preguntas marcadas de reserva, resolver sustituciones de forma ordenada según normativa oficial
  const { preguntasActualizadas, sustituciones, anuladasCount, reservasUsadasCount } =
    resolverSustitucionesDeReserva(todasOrdenadas);

  // Anotaciones y notas si existían
  const rawAnotaciones = obj.resaltadosYNotas || obj.anotaciones || [];
  const validColors: ColorResaltador[] = ['amarillo', 'verde', 'rosa', 'azul'];

  const anotaciones = rawAnotaciones.map((an: any) => ({
    id: an.id || `ANOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    examenId: obj.id || `JSON-${Date.now()}`,
    seccion: an.seccion || 'enunciado',
    preguntaId: an.preguntaId,
    opcionId: an.opcionId,
    textoSeleccionado: an.textoSeleccionado || '',
    color: validColors.includes(an.color) ? an.color : 'amarillo',
    comentario: an.comentario || '',
    timestamp: an.timestamp || new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
  }));

  // Si el objeto ya incluía resultado o respuestas previas:
  // En restauración de copia de seguridad preservamos las métricas exactas guardadas sin sobrescribir cortes propios ni notas históricas.
  let resultadoFinal = obj.resultado;
  if (
    opcionesInternas?.preservarResultadoIntegro &&
    resultadoFinal &&
    typeof resultadoFinal.puntuacionDirecta === 'number'
  ) {
    resultadoFinal = {
      ...resultadoFinal,
      anuladas: resultadoFinal.anuladas ?? anuladasCount,
      reservasUsadas: resultadoFinal.reservasUsadas ?? reservasUsadasCount,
      sustituciones: resultadoFinal.sustituciones ?? sustituciones,
      respuestasUsuario: resultadoFinal.respuestasUsuario || {},
    };
  } else if (resultadoFinal && resultadoFinal.respuestasUsuario) {
    const fechaOriginal = resultadoFinal.fechaRealizacion || obj.fecha;
    const { resultado } = calcularResultadoExamenConReservas(
      preguntasActualizadas,
      resultadoFinal.respuestasUsuario,
      obj.tipo === 'supuesto' ? 'supuesto' : 'unitario',
      resultadoFinal.duracionSegundos || 0,
      fechaOriginal
    );
    resultadoFinal = resultado;
  } else if (resultadoFinal) {
    resultadoFinal = {
      ...resultadoFinal,
      anuladas: anuladasCount,
      reservasUsadas: reservasUsadasCount,
      sustituciones,
    };
  }

  const tipoFinal: TipoPrueba = obj.tipo === 'supuesto' ? 'supuesto' : 'unitario';
  const categoriaFinal: CategoriaExamen =
    (obj.categoria as CategoriaExamen) || deducirCategoriaExamen(tipoFinal, obj.origen || 'oficial_json');

  return {
    id: obj.id || `JSON-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    testBaseId: typeof obj.testBaseId === 'string' && obj.testBaseId ? obj.testBaseId : undefined,
    intentoNumero: typeof obj.intentoNumero === 'number' ? obj.intentoNumero : undefined,
    soloHistorial: typeof obj.soloHistorial === 'boolean' ? obj.soloHistorial : undefined,
    titulo,
    tipo: tipoFinal,
    categoria: categoriaFinal,
    ambito: obj.ambito === 'CAM' ? 'CAM' : obj.ambito === 'AMBOS' ? 'AMBOS' : 'AGE',
    origen: obj.origen || 'oficial_json',
    fecha: obj.fecha || new Date().toISOString().split('T')[0],
    dificultad: obj.dificultad,
    contextoCaso: obj.contextoCaso,
    tematicas: obj.tematicas || ['procedimiento_administrativo'],
    leyesBOEAplicadas: obj.leyesBOEAplicadas || ['Legislación consolidada en www.boe.es'],
    testsIncluidos: Array.isArray(obj.testsIncluidos) ? obj.testsIncluidos : undefined,
    preguntas: preguntasActualizadas,
    anotaciones,
    resultado: resultadoFinal,
  };
}

/**
 * Asegura la separación oficial de preguntas ordinarias y preguntas de reserva
 * en cualquier examen importado o cargado, y aplica la normativa oficial de
 * sustitución correlativa y puntuación de las oposiciones.
 */
export function asegurarSeparacionYNormativaReserva(examen: ExamenCompleto): ExamenCompleto {
  if (!examen || !Array.isArray(examen.preguntas) || examen.preguntas.length === 0) {
    return examen;
  }

  const preguntasClonadas: PreguntaExamen[] = examen.preguntas.map((p, idx) => {
    const esResExplicit = !!(
      p.esReserva ||
      (p as any).es_reserva ||
      (p as any).esPreguntaReserva ||
      (p as any).tipo === 'reserva' ||
      (p as any).seccion === 'reserva' ||
      (p as any).bloque === 'reserva' ||
      (p.numeroReserva !== undefined && p.numeroReserva !== null) ||
      ((p as any).numero_reserva !== undefined && (p as any).numero_reserva !== null) ||
      /^(?:\[\s*RESERVA\s*\]|\(RESERVA\)|PREGUNTA\s+(?:DE\s+)?RESERVA|CUESTION\s+(?:DE\s+)?RESERVA|RESERVA\s+\d+|R\d+[\.\:\-])/i.test(p.enunciado || '') ||
      /\b(?:pregunta\s+de\s+reserva|cuesti[oó]n\s+de\s+reserva)\b/i.test(p.enunciado || '')
    );

    let numRes = p.numeroReserva ?? (p as any).numero_reserva;
    if (!numRes && esResExplicit) {
      const m = (p.enunciado || '').match(/(?:Reserva|R)\s*#?(\d+)/i);
      if (m) numRes = parseInt(m[1], 10);
    }

    const legalExistente = (p as any).justificacionLegal || {};
    const normaRaw = legalExistente.norma || (p as any).norma || '';
    const normaEfectiva = obtenerNormaEfectivaDePregunta(p, examen);
    const normaFinal =
      p.leyesRelacionadas && p.leyesRelacionadas.some((l) => !esNormaGenerica(l))
        ? p.leyesRelacionadas.find((l) => !esNormaGenerica(l))!
        : !esNormaGenerica(normaRaw)
        ? normaRaw
        : normaEfectiva;

    const leyesRelFinales =
      p.leyesRelacionadas && p.leyesRelacionadas.some((l) => !esNormaGenerica(l))
        ? p.leyesRelacionadas.filter((l) => !esNormaGenerica(l))
        : !esNormaGenerica(normaFinal)
        ? [normaFinal]
        : p.leyesRelacionadas;

    const justificacionLegal = {
      norma: normaFinal || 'Normativa Oficial BOE',
      articulo: legalExistente.articulo || (p as any).articulo || 'Precepto aplicable',
      codigoBOE: legalExistente.codigoBOE || (p as any).codigoBOE || 'BOE-A',
      urlBOE: legalExistente.urlBOE || (p as any).urlBOE || 'https://www.boe.es',
      fundamento:
        legalExistente.fundamento ||
        (p as any).fundamento ||
        (p as any).explicacion ||
        'Conforme a la normativa legal vigente publicada en el BOE (www.boe.es).',
    };

    const refConvocatoriaOficial = obtenerReferenciaConvocatoriaOficial(p, examen);
    if (Array.isArray(p.recursosArgumentacion) && p.recursosArgumentacion.length > 0 && p.enunciado) {
      guardarRecursosArgumentacionDePregunta(p.enunciado, p.recursosArgumentacion);
    }
    const recursosPreg = obtenerRecursosArgumentacionDePregunta(p);

    return {
      ...p,
      id: typeof p.id === 'number' ? p.id : idx + 1,
      opciones: Array.isArray(p.opciones) ? p.opciones : [],
      leyesRelacionadas: leyesRelFinales,
      justificacionLegal,
      convocatoriasAparecida: refConvocatoriaOficial || p.convocatoriasAparecida,
      recursosArgumentacion: recursosPreg.length > 0 ? recursosPreg : p.recursosArgumentacion,
      esReserva: esResExplicit,
      numeroReserva: numRes,
      esAnulada: !!(p.esAnulada || (p as any).es_anulada || (p as any).anulada),
    };
  });

  // Si ninguna pregunta estaba marcada como reserva, respetar el examen tal cual sin crear reservas ficticias.
  // Solo se procesan reservas si el examen ya cuenta con preguntas marcadas como tales.


  // Separar en ordinarias y de reserva
  const ordinarias = preguntasClonadas.filter((p) => !p.esReserva);
  const reservas = preguntasClonadas.filter((p) => p.esReserva);

  // Asegurar números de reserva 1 a N
  reservas.forEach((r, idx) => {
    if (!r.numeroReserva) {
      r.numeroReserva = idx + 1;
    }
  });

  const todasOrdenadas = [...ordinarias, ...reservas];

  // Aplicar normativa oficial de sustitución ordenada de preguntas anuladas por las de reserva
  const { preguntasActualizadas, sustituciones, anuladasCount, reservasUsadasCount } =
    resolverSustitucionesDeReserva(todasOrdenadas);

  let resultadoActualizado = examen.resultado;
  if (resultadoActualizado && resultadoActualizado.respuestasUsuario) {
    const fechaOriginal = resultadoActualizado.fechaRealizacion || examen.fecha;
    const { resultado } = calcularResultadoExamenConReservas(
      preguntasActualizadas,
      resultadoActualizado.respuestasUsuario,
      examen.tipo,
      resultadoActualizado.duracionSegundos || 0,
      fechaOriginal
    );
    resultadoActualizado = resultado;
  } else if (resultadoActualizado) {
    resultadoActualizado = {
      ...resultadoActualizado,
      anuladas: anuladasCount,
      reservasUsadas: reservasUsadasCount,
      sustituciones,
    };
  }

  const categoria = examen.categoria || deducirCategoriaExamen(examen.tipo, examen.origen);

  // Asegurar que leyesBOEAplicadas del examen no se quede con textos genéricos si las preguntas o el título tienen normas reales
  const leyesActualesNoGen = (examen.leyesBOEAplicadas || []).filter((l) => !esNormaGenerica(l));
  let leyesBOEAplicadasFinal = leyesActualesNoGen;
  if (leyesBOEAplicadasFinal.length === 0) {
    const deducidasPreguntas = Array.from(
      new Set(
        preguntasActualizadas
          .map((q) => q.justificacionLegal?.norma)
          .filter((n): n is string => Boolean(n) && !esNormaGenerica(n))
      )
    );
    if (deducidasPreguntas.length > 0) {
      leyesBOEAplicadasFinal = deducidasPreguntas;
    } else if (examen.titulo) {
      const deducidaTit = deducirNormaOTemaDesdeTexto(examen.titulo);
      if (deducidaTit) leyesBOEAplicadasFinal = [deducidaTit];
    }
  }

  return {
    ...examen,
    categoria,
    leyesBOEAplicadas:
      leyesBOEAplicadasFinal.length > 0 ? leyesBOEAplicadasFinal : examen.leyesBOEAplicadas,
    preguntas: preguntasActualizadas,
    resultado: resultadoActualizado,
  };
}

export interface OpcionesParseoExamen {
  eliminarReservasSiNoConstan?: boolean;
  forzarSinReservas?: boolean;
}

/**
 * Detecta si un texto pegado o archivo contiene menciones o marcas explícitas
 * que identifiquen que el examen incluye formalmente preguntas de reserva.
 */
export function tieneIndicacionExplicitaDeReserva(texto: string): boolean {
  if (!texto) return false;
  // Encabezados o campos clave en JSON
  if (
    /\"preguntasReserva\"|\"reserva\"\s*\:|\"esReserva\"\s*\:\s*true|\"preguntas_reserva\"/i.test(texto)
  ) {
    return true;
  }
  // Encabezados de sección de reserva en texto plano
  if (
    /^(?:[\#\*\-\=\s\_\~\|]*)(?:(?:(?:preguntas?|cuestiones?|secci[oó]n|bloque|parte|ejercicio|cuestionario)\s+(?:de\s+)?reservas?)|(?:reservas?)|(?:preguntas?\s+adicionales?\s+de\s+reserva)|(?:reserva\s*(?:\([^\)]*\)|\[[^\]]*\])?))(?:[^\w\n].*)?$/im.test(
      texto
    )
  ) {
    return true;
  }
  // Marcas explícitas de pregunta de reserva: [RESERVA], (RESERVA), PREGUNTA DE RESERVA 1, R1: ...
  if (
    /\[\s*RESERVA\s*\]|\(\s*RESERVA\s*\)/i.test(texto) ||
    /^\s*(?:PREGUNTA|CUESTIÓN|ITEM|EJERCICIO)?\s*(?:DE\s+)?RESERVA\s*#?\d+/im.test(texto) ||
    /^\s*R\s*#?[1-9]\d?[\.\:\-\)\s]/im.test(texto) ||
    /^\s*#?\d{1,3}\s*[\.\-\)\:]+\s*(?:\(\s*RESERVA\s*\)|\[\s*RESERVA\s*\]|\bDE\s+RESERVA\b|\bRESERVA\b)/im.test(texto) ||
    /\b(?:preguntas?\s+(?:de\s+)?reserva|cuestionario\s+(?:de\s+)?reserva|bloque\s+(?:de\s+)?reserva)\b/i.test(texto)
  ) {
    return true;
  }
  return false;
}

/**
 * Elimina todas las preguntas de reserva de un examen,
 * convirtiendo todas las preguntas en ordinarias (100% cuestionario ordinario),
 * reseteando estados de sustitución y recalculando puntuaciones sin reservas.
 */
export function eliminarReservasYConvertirATodasOrdinarias(examen: ExamenCompleto): ExamenCompleto {
  const preguntasLimpias: PreguntaExamen[] = examen.preguntas.map((p, idx) => ({
    ...p,
    id: idx + 1,
    esReserva: false,
    numeroReserva: undefined,
    sustituidaPorReservaId: undefined,
    sustituyeAPreguntaId: undefined,
    activaEnEvaluacion: !p.esAnulada,
  }));

  let resultadoActualizado = examen.resultado;
  if (resultadoActualizado && resultadoActualizado.respuestasUsuario) {
    const fechaOriginal = resultadoActualizado.fechaRealizacion || examen.fecha;
    const { resultado } = calcularResultadoExamenConReservas(
      preguntasLimpias,
      resultadoActualizado.respuestasUsuario,
      examen.tipo,
      resultadoActualizado.duracionSegundos || 0,
      fechaOriginal
    );
    resultadoActualizado = resultado;
  } else if (resultadoActualizado) {
    resultadoActualizado = {
      ...resultadoActualizado,
      reservasUsadas: 0,
      sustituciones: [],
      anuladas: preguntasLimpias.filter((p) => p.esAnulada).length,
    };
  }

  return {
    ...examen,
    preguntas: preguntasLimpias,
    resultado: resultadoActualizado,
  };
}

/**
 * Parsea un texto crudo que puede ser JSON puro, JSON dentro de texto,
 * o texto formateado estilo examen (1. Enunciado / A) B) C) D) Solución: X).
 * Preserva preguntas de reserva reconocidas automáticamente salvo que se fuerce su exclusión.
 */
export function parsearTextoOArchivoJSON(
  rawText: string,
  opciones?: OpcionesParseoExamen
): ExamenCompleto | ExamenCompleto[] {
  const cleaned = limpiarTextoJSON(rawText);
  const constanExpresamente = tieneIndicacionExplicitaDeReserva(cleaned);

  const procesarSalida = (resultado: ExamenCompleto): ExamenCompleto => {
    // Si el usuario forzó explícitamente no tener reservas
    if (opciones?.forzarSinReservas) {
      return eliminarReservasYConvertirATodasOrdinarias(resultado);
    }
    // Si el examen ya tiene preguntas detectadas y marcadas formalmente como reserva, PRESERVARLAS SIEMPRE
    if (resultado.preguntas && resultado.preguntas.some((p) => p.esReserva)) {
      return resultado;
    }
    // Solo si se especificó explícitamente eliminar y no constan en el texto
    if (opciones?.eliminarReservasSiNoConstan && !constanExpresamente) {
      return eliminarReservasYConvertirATodasOrdinarias(resultado);
    }
    return resultado;
  };

  // Intento 1: Parsear como JSON estándar
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      // Lista de exámenes
      return parsed.map((item) => procesarSalida(validarYConvertirJSON(item)));
    }
    return procesarSalida(validarYConvertirJSON(parsed));
  } catch (jsonErr) {
    // Intento 2: Buscar un bloque JSON dentro del texto (entre la primera { y la última })
    const primerLlave = cleaned.indexOf('{');
    const ultimaLlave = cleaned.lastIndexOf('}');
    if (primerLlave !== -1 && ultimaLlave > primerLlave) {
      try {
        const subJson = cleaned.substring(primerLlave, ultimaLlave + 1);
        const parsed = JSON.parse(subJson);
        return procesarSalida(validarYConvertirJSON(parsed));
      } catch {
        // Continuar al parser de texto plano
      }
    }

    // Intento 3: Parser heurístico de texto plano (.txt con preguntas)
    const examenDesdeTexto = parsearPreguntasDesdeTextoPlano(cleaned);
    if (examenDesdeTexto) {
      return procesarSalida(examenDesdeTexto);
    }

    throw new Error('No se pudo interpretar el archivo como JSON ni como formato de examen estructurado.');
  }
}

/**
 * Detecta la fundamentación legal y enlace oficial del BOE a partir del texto
 * de la pregunta o del relato del supuesto práctico.
 */
function detectarFundamentacionLegal(
  textoPregunta: string,
  textoSupuesto?: string,
  explicacionAdicional?: string
): { norma: string; articulo: string; codigoBOE: string; urlBOE: string; fundamento: string } {
  const combinado = `${textoPregunta} ${textoSupuesto || ''} ${explicacionAdicional || ''}`.toLowerCase();

  // Extraer número de artículo si está presente (ej. "artículo 21", "art. 70", etc.)
  const artMatch = `${textoPregunta} ${explicacionAdicional || ''}`.match(
    /(?:art[íi]culo|art\.?)\s*(\d+(?:\s*(?:bis|ter|qu[aá]ter))?)/i
  );
  const articulo = artMatch ? `Artículo ${artMatch[1]}` : 'Precepto aplicable';

  if (
    combinado.includes('203/2021') ||
    combinado.includes('reglamento de actuación y funcionamiento') ||
    combinado.includes('sector público por medios electrónicos') ||
    combinado.includes('medios electrónicos')
  ) {
    return {
      norma: 'Real Decreto 203/2021, de 30 de marzo: Reglamento de actuación y funcionamiento del sector público por medios electrónicos',
      articulo,
      codigoBOE: 'BOE-A-2021-5032',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-5032',
      fundamento: explicacionAdicional || 'Fundamentado en el Real Decreto 203/2021 (Reglamento de medios electrónicos AGE) en el BOE.',
    };
  }

  if (combinado.includes('39/2015') || combinado.includes('procedimiento administrativo com')) {
    return {
      norma: 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas',
      articulo,
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565',
      fundamento: explicacionAdicional || 'Fundamentado en el articulado oficial de la Ley 39/2015 en el BOE.',
    };
  }

  if (
    combinado.includes('trebep') ||
    combinado.includes('5/2015') ||
    combinado.includes('estatuto básico del empleado') ||
    combinado.includes('empleado público')
  ) {
    return {
      norma: 'Real Decreto Legislativo 5/2015, de 30 de octubre: Estatuto Básico del Empleado Público (TREBEP)',
      articulo,
      codigoBOE: 'BOE-A-2015-11719',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719',
      fundamento: explicacionAdicional || 'Fundamentado en el Estatuto Básico del Empleado Público (TREBEP).',
    };
  }

  if (combinado.includes('40/2015') || combinado.includes('régimen jurídico del sector público') || combinado.includes('regimen juridico')) {
    return {
      norma: 'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público',
      articulo,
      codigoBOE: 'BOE-A-2015-10566',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566',
      fundamento: explicacionAdicional || 'Fundamentado en la Ley 40/2015 de Régimen Jurídico del Sector Público.',
    };
  }

  if (
    combinado.includes('3/2018') ||
    combinado.includes('lopdgdd') ||
    combinado.includes('protección de datos') ||
    combinado.includes('proteccion de datos')
  ) {
    return {
      norma: 'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales',
      articulo,
      codigoBOE: 'BOE-A-2018-16673',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673',
      fundamento: explicacionAdicional || 'Fundamentado en la Ley Orgánica 3/2018 de Protección de Datos Personales (BOE).',
    };
  }

  if (combinado.includes('364/1995') || (combinado.includes('ingreso') && combinado.includes('provisión'))) {
    return {
      norma: 'Real Decreto 364/1995, de 10 de marzo: Reglamento General de Ingreso y Provisión de Puestos de Trabajo AGE',
      articulo,
      codigoBOE: 'BOE-A-1995-8770',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8770',
      fundamento: explicacionAdicional || 'Fundamentado en el Reglamento General de Ingreso y Provisión de la AGE (RD 364/1995).',
    };
  }

  if (combinado.includes('365/1995') || combinado.includes('situaciones administrativas')) {
    return {
      norma: 'Real Decreto 365/1995, de 10 de marzo: Reglamento de Situaciones Administrativas de los Funcionarios Civiles AGE',
      articulo,
      codigoBOE: 'BOE-A-1995-8771',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8771',
      fundamento: explicacionAdicional || 'Fundamentado en el Reglamento de Situaciones Administrativas de la AGE (RD 365/1995).',
    };
  }

  if (
    combinado.includes('constitución') ||
    combinado.includes('constitucion') ||
    combinado.includes('carta magna') ||
    /\bce\b/.test(combinado)
  ) {
    return {
      norma: 'Constitución Española de 1978',
      articulo,
      codigoBOE: 'BOE-A-1978-31229',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229',
      fundamento: explicacionAdicional || 'Fundamentado en el texto oficial de la Constitución Española en www.boe.es.',
    };
  }

  if (combinado.includes('9/2017') || combinado.includes('contratos del sector público') || combinado.includes('lcsp')) {
    return {
      norma: 'Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP)',
      articulo,
      codigoBOE: 'BOE-A-2017-12902',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902',
      fundamento: explicacionAdicional || 'Fundamentado en la Ley 9/2017 de Contratos del Sector Público.',
    };
  }

  if (combinado.includes('2/2012') || combinado.includes('estabilidad presupuestaria') || combinado.includes('sostenibilidad financiera') || combinado.includes('loepsf')) {
    return {
      norma: 'Ley Orgánica 2/2012, de 27 de abril, de Estabilidad Presupuestaria y Sostenibilidad Financiera (LOEPSF)',
      articulo,
      codigoBOE: 'BOE-A-2012-5730',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-5730',
      fundamento: explicacionAdicional || 'Fundamentado en la Ley Orgánica 2/2012 de Estabilidad Presupuestaria y Sostenibilidad Financiera.',
    };
  }

  if (combinado.includes('47/2003') || combinado.includes('presupuestaria') || combinado.includes('lgp')) {
    return {
      norma: 'Ley 47/2003, de 26 de noviembre, General Presupuestaria (LGP)',
      articulo,
      codigoBOE: 'BOE-A-2003-21618',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21618',
      fundamento: explicacionAdicional || 'Fundamentado en la Ley General Presupuestaria (Ley 47/2003).',
    };
  }

  if (combinado.includes('19/2013') || combinado.includes('transparencia')) {
    return {
      norma: 'Ley 19/2013, de 9 de diciembre, de Transparencia, Acceso a la Información Pública y Buen Gobierno',
      articulo,
      codigoBOE: 'BOE-A-2013-12887',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887',
      fundamento: explicacionAdicional || 'Fundamentado en la Ley 19/2013 de Transparencia del BOE.',
    };
  }

  if (
    combinado.includes('1708/2011') ||
    combinado.includes('sistema español de archivos') ||
    combinado.includes('archivo general de la administración')
  ) {
    return {
      norma: 'Real Decreto 1708/2011, de 18 de noviembre, por el que se establece el Sistema Español de Archivos',
      articulo,
      codigoBOE: 'BOE-A-2011-18541',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2011-18541',
      fundamento:
        explicacionAdicional ||
        'Fundamentado en el Real Decreto 1708/2011 del Sistema Español de Archivos (BOE).',
    };
  }

  if (
    combinado.includes('951/2005') ||
    combinado.includes('marco general para la mejora de la calidad') ||
    combinado.includes('cartas de servicios')
  ) {
    return {
      norma: 'Real Decreto 951/2005, de 29 de julio, por el que se establece el marco general para la mejora de la calidad en la Administración General del Estado',
      articulo,
      codigoBOE: 'BOE-A-2005-14836',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2005-14836',
      fundamento:
        explicacionAdicional ||
        'Fundamentado en el Real Decreto 951/2005 sobre mejora de la calidad en la AGE (BOE).',
    };
  }

  if (
    combinado.includes('366/2007') ||
    (combinado.includes('accesibilidad') && combinado.includes('discapacidad'))
  ) {
    return {
      norma: 'Real Decreto 366/2007, de 16 de marzo, por el que se establecen las condiciones de accesibilidad y no discriminación de las personas con discapacidad en sus relaciones con la Administración General del Estado',
      articulo,
      codigoBOE: 'BOE-A-2007-6567',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-6567',
      fundamento:
        explicacionAdicional ||
        'Fundamentado en el Real Decreto 366/2007 de accesibilidad y no discriminación en la AGE (BOE).',
    };
  }

  if (
    combinado.includes('iv convenio') ||
    combinado.includes('convenio único') ||
    combinado.includes('convenio colectivo único') ||
    combinado.includes('convenio colectivo de personal laboral')
  ) {
    return {
      norma: 'IV Convenio colectivo único para el personal laboral de la Administración General del Estado',
      articulo,
      codigoBOE: 'BOE-A-2019-7414',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-7414',
      fundamento:
        explicacionAdicional ||
        'Fundamentado en el IV Convenio colectivo único para el personal laboral de la AGE (BOE).',
    };
  }

  const normaDeducida = deducirNormaOTemaDesdeTexto(combinado);
  if (normaDeducida) {
    return {
      norma: normaDeducida,
      articulo,
      codigoBOE: 'BOE-A',
      urlBOE: 'https://www.boe.es',
      fundamento: explicacionAdicional || `Fundamentado en ${normaDeducida}.`,
    };
  }

  return {
    norma: 'Legislación Oficial del Estado',
    articulo,
    codigoBOE: 'BOE-A',
    urlBOE: 'https://www.boe.es',
    fundamento: explicacionAdicional || 'Fundamentado en la normativa oficial consolidada publicada en www.boe.es.',
  };
}

/**
 * Resuelve la sustitución ordenada de preguntas ordinarias anuladas por preguntas de reserva:
 * - En la plantilla se marcan como ANULADA algunas preguntas ordinarias.
 * - Por orden estricto, cada anulada se sustituye por las preguntas de reserva (también de manera ordenada).
 * - Las preguntas anuladas quedan inactivas (eliminadas del cómputo).
 * - Las preguntas de reserva activadas se suman al cómputo con las mismas penalizaciones.
 * - Las preguntas de reserva sobrantes no se activan.
 */
export function resolverSustitucionesDeReserva(
  preguntas: PreguntaExamen[]
): {
  preguntasActualizadas: PreguntaExamen[];
  sustituciones: SustitucionReserva[];
  anuladasCount: number;
  reservasUsadasCount: number;
} {
  const preguntasActualizadas = preguntas.map((p) => ({ ...p }));

  const ordinarias = preguntasActualizadas.filter((p) => !p.esReserva);
  const reservas = preguntasActualizadas.filter((p) => p.esReserva);

  const anuladas = ordinarias.filter((p) => p.esAnulada).sort((a, b) => a.id - b.id);
  const reservasDisponibles = reservas
    .filter((p) => !p.esAnulada)
    .sort((a, b) => (a.numeroReserva ?? a.id) - (b.numeroReserva ?? b.id));

  const sustituciones: SustitucionReserva[] = [];

  // Resetear estados
  ordinarias.forEach((p) => {
    if (p.esAnulada) {
      p.activaEnEvaluacion = false;
      p.sustituidaPorReservaId = undefined;
    } else {
      p.activaEnEvaluacion = true;
      p.sustituidaPorReservaId = undefined;
    }
  });

  reservas.forEach((p) => {
    p.activaEnEvaluacion = false;
    p.sustituyeAPreguntaId = undefined;
  });

  // Asignar en orden correlativo cada anulada a una de reserva
  anuladas.forEach((anulada, idx) => {
    if (idx < reservasDisponibles.length) {
      const reserva = reservasDisponibles[idx];
      anulada.sustituidaPorReservaId = reserva.id;
      anulada.activaEnEvaluacion = false;

      reserva.sustituyeAPreguntaId = anulada.id;
      reserva.activaEnEvaluacion = true;

      sustituciones.push({
        anuladaId: anulada.id,
        reservaId: reserva.id,
      });
    }
  });

  return {
    preguntasActualizadas,
    sustituciones,
    anuladasCount: anuladas.length,
    reservasUsadasCount: sustituciones.length,
  };
}

/**
 * Normaliza y resuelve con precisión el mapa de respuestas del usuario:
 * - Si las respuestas están indexadas por índice de array (0 a N-1, como las genera AITestGenerator),
 *   respeta estrictamente que si el índice i no está contestado, esa pregunta está EN BLANCO.
 *   ¡Bajo ninguna circunstancia consulta respuestas[preg.id] como fallback si el mapa es 0-indexed,
 *   ya que eso provocaría que una pregunta en blanco robe la respuesta de la pregunta siguiente!
 * - Si el mapa fue importado con formato ID (1 a N), lo convierte limpiamente a 0-indexed.
 */
export function normalizarMapaRespuestas(
  respuestas: Record<number | string, string> | undefined | null,
  preguntas: PreguntaExamen[]
): Record<number, string> {
  if (!respuestas || typeof respuestas !== 'object') return {};

  const keys = Object.keys(respuestas)
    .map((k) => Number(k))
    .filter((n) => !isNaN(n));
  if (keys.length === 0) return {};

  const total = preguntas.length;
  const tieneIndiceCero = keys.includes(0);
  const maxKey = Math.max(...keys);

  // Caso 1: Si existe la clave 0, o la clave máxima es estrictamente menor que totalPreguntas
  // y ninguna clave supera total-1, es inequívocamente un mapa 0-indexed generado en la sesión.
  if (tieneIndiceCero || (maxKey < total && !keys.some((k) => k >= total))) {
    const normalizado: Record<number, string> = {};
    for (const [k, v] of Object.entries(respuestas)) {
      const idx = Number(k);
      if (!isNaN(idx) && idx >= 0 && idx < total && typeof v === 'string' && v.trim()) {
        normalizado[idx] = v.trim().toUpperCase();
      }
    }
    return normalizado;
  }

  // Caso 2: Si las claves corresponden a IDs de preguntas (ej. 1 a N, o IDs específicos > 0):
  const idMap = new Map<number, number>();
  preguntas.forEach((p, idx) => {
    if (typeof p.id === 'number') {
      idMap.set(p.id, idx);
    }
  });

  const normalizado: Record<number, string> = {};
  for (const [k, v] of Object.entries(respuestas)) {
    const num = Number(k);
    if (!isNaN(num) && typeof v === 'string' && v.trim()) {
      if (idMap.has(num)) {
        const idx = idMap.get(num)!;
        normalizado[idx] = v.trim().toUpperCase();
      } else if (num >= 0 && num < total) {
        normalizado[num] = v.trim().toUpperCase();
      }
    }
  }

  return normalizado;
}

/**
 * Calcula la puntuación oficial del test/supuesto teniendo en cuenta las anuladas y reservas:
 * - Preguntas anuladas eliminadas de la puntuación (0 puntos, 0 penalización).
 * - Preguntas de reserva activadas sumadas al cómputo con las mismas penalizaciones (acierto +1.0, fallo -0.333).
 * - Total de preguntas evaluadas se mantiene constante (70 para test, 20 para supuesto).
 * - Exactitud matemática: aciertos + fallos + blancos === total de preguntas evaluadas activas.
 */
export function calcularResultadoExamenConReservas(
  preguntas: PreguntaExamen[],
  respuestasUsuario: Record<number, string>,
  tipo: TipoPrueba,
  duracionSegundos: number = 0,
  fechaRealizacionPrevia?: string
): { resultado: ResultadoExamen; preguntasConSustitucion: PreguntaExamen[] } {
  const { preguntasActualizadas, sustituciones, anuladasCount, reservasUsadasCount } =
    resolverSustitucionesDeReserva(preguntas);

  const respuestasNormalizadas = normalizarMapaRespuestas(respuestasUsuario, preguntasActualizadas);

  let aciertos = 0;
  let fallos = 0;
  let blancos = 0;

  // Solo se evalúan las preguntas activas
  const preguntasAEvaluar = preguntasActualizadas.filter((p) => p.activaEnEvaluacion);

  preguntasAEvaluar.forEach((preg) => {
    const idx = preguntasActualizadas.findIndex((p) => p.id === preg.id);
    const resp = idx >= 0 ? respuestasNormalizadas[idx] : undefined;

    if (!resp || typeof resp !== 'string' || !resp.trim()) {
      blancos++;
    } else {
      const respLimpia = resp.trim().toUpperCase();
      const opcionCorrecta = preg.opciones.find(
        (o) => o.esCorrecta === true || (o as any).esCorrecta === 'true'
      );
      const letraCorrecta = opcionCorrecta ? opcionCorrecta.id.toString().trim().toUpperCase() : '';

      if (letraCorrecta && letraCorrecta === respLimpia) {
        aciertos++;
      } else {
        fallos++;
      }
    }
  });

  // Puntuación Directa CPS Oficial: Aciertos - (Fallos / 3)
  const pd = Math.max(0, aciertos - fallos / 3);

  const ordinariasCount = preguntasActualizadas.filter((p) => !p.esReserva).length;
  const totalBase = ordinariasCount > 0 ? ordinariasCount : tipo === 'supuesto' ? 20 : 70;
  const totalQ = preguntasAEvaluar.length > 0 ? preguntasAEvaluar.length : totalBase;

  const escala = tipo === 'supuesto' ? 50 : 100;
  const pt = totalQ > 0 ? (pd / totalQ) * escala : 0;
  const umbralCorte = tipo === 'supuesto' ? 25 : 50;
  const superaCorte = pt >= umbralCorte;

  const resultado: ResultadoExamen = {
    aciertos,
    fallos,
    blancos,
    anuladas: anuladasCount,
    reservasUsadas: reservasUsadasCount,
    sustituciones,
    preguntasEvaluadasTotal: totalQ,
    puntuacionDirecta: parseFloat(pd.toFixed(2)),
    puntuacionMaxima: totalQ,
    puntuacionTransformada: parseFloat(pt.toFixed(2)),
    superaCorte,
    duracionSegundos,
    fechaRealizacion: fechaRealizacionPrevia || new Date().toISOString(),
    respuestasUsuario: respuestasNormalizadas,
  };

  return {
    resultado,
    preguntasConSustitucion: preguntasActualizadas,
  };
}

/**
 * Parser para archivos de texto (.txt) que distingue con rigor:
 * - Un TEST NORMAL (unitario) donde las preguntas comienzan de forma directa o
 *   tras un breve encabezado/título o instrucciones de examen.
 * - Un SUPUESTO PRÁCTICO que contiene un texto/relato fáctico largo al principio
 *   y posteriormente el cuestionario con las preguntas.
 * - Identifica automáticamente las 5 preguntas de reserva y gestiona las anuladas por plantilla.
 */
/**
 * Limpia corchetes [ ... ] o comillas envolventes de un texto si engloban todo el contenido,
 * por ejemplo: "[Oficial: ej. C1 AGE 2019 / Auxiliar AGE 2022 | Inédita]" -> "Oficial: ej. C1 AGE 2019 / Auxiliar AGE 2022 | Inédita"
 */
export function limpiarBracketsPlantilla(s: string): string {
  if (!s) return '';
  let str = s.trim();
  // Quitar corchetes envolventes si engloban todo el texto: "[texto]" -> "texto"
  if (str.startsWith('[') && str.endsWith(']') && str.length >= 2) {
    const primerCierre = str.indexOf(']');
    if (primerCierre === str.length - 1) {
      str = str.slice(1, -1).trim();
    }
  }
  // Quitar comillas o ángulos envolventes
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith('«') && str.endsWith('»')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

/**
 * Desglosa un texto que pueda contener incrustadas las secciones
 * "Convocatoria:", "Justificación legal:", "Distractores:", "Ejemplo práctico:" y "Regla mnemotécnica:"
 * en campos separados y limpios, sin importar el orden en que aparezcan y desempacando corchetes.
 */
export function desglosarJustificacionEjemploYRegla(texto: string): {
  justificacion: string;
  ejemploPractico?: string;
  reglaMnemotecnica?: string;
  analisisDistractores?: string;
  convocatoriasAparecida?: string;
} {
  const t = texto.trim();
  if (!t) {
    return { justificacion: '' };
  }

  // Definir los patrones de los 5 encabezados posibles
  const seccionesDef = [
    {
      tipo: 'convocatoria' as const,
      regex: /(?:^|\n)\s*(?:convocatoria(?:s)?(?:\s+oficial(?:es)?)?|origen\s+convocatoria|aparici[oó]n|a[ñn]o\s+convocatoria)[\s\:\-]+/i,
    },
    {
      tipo: 'justificacion' as const,
      regex: /(?:^|\n)\s*(?:justificaci[oó]n(?:\s+oficial|\s+legal)?|argumentaci[oó]n(?:\s+legal)?|fundamentaci[oó]n(?:\s+legal|\s+boe)?|explicaci[oó]n|fundamento|motivo)[\s\:\-]+/i,
    },
    {
      tipo: 'distractores' as const,
      regex: /(?:^|\n)\s*(?:distractor(?:es)?|an[aá]lisis\s+(?:de\s+)?distractor(?:es)?|error(?:es)?\s+distractor(?:es)?|trampas?(?:\s+del\s+tribunal)?)[\s\:\-]*/i,
    },
    {
      tipo: 'ejemplo' as const,
      regex: /(?:^|\n)\s*(?:ejemplo\s+pr[aá]ctico|caso\s+pr[aá]ctico|aplicaci[oó]n(?:\s+pr[aá]ctica|\s+al\s+caso)?|supuesto\s+pr[aá]ctico)[\s\:\-]*/i,
    },
    {
      tipo: 'regla' as const,
      regex: /(?:^|\n)\s*(?:regla\s+mnemot[eé]cnica|mnemot[eé]cnia|f[oó]rmula(?:\s+visual)?|esquema(?:\s+r[aá]pido)?|truco)[\s\:\-]*/i,
    },
  ];

  // Encontrar todas las coincidencias con su posición de inicio y fin en el texto
  interface CoincidenciaSeccion {
    tipo: 'convocatoria' | 'justificacion' | 'distractores' | 'ejemplo' | 'regla';
    inicioMatch: number;
    finMatch: number;
  }

  const matchesEncontrados: CoincidenciaSeccion[] = [];

  for (const sDef of seccionesDef) {
    const m = t.match(sDef.regex);
    if (m && m.index !== undefined) {
      matchesEncontrados.push({
        tipo: sDef.tipo,
        inicioMatch: m.index,
        finMatch: m.index + m[0].length,
      });
    }
  }

  // Si no se encontró ninguna etiqueta, todo es justificación
  if (matchesEncontrados.length === 0) {
    return {
      justificacion: limpiarBracketsPlantilla(t),
    };
  }

  // Ordenar por orden de aparición en el texto
  matchesEncontrados.sort((a, b) => a.inicioMatch - b.inicioMatch);

  let just = '';
  let conv: string | undefined = undefined;
  let dist: string | undefined = undefined;
  let ej: string | undefined = undefined;
  let regla: string | undefined = undefined;

  // Texto previo a la primera sección (si existe y no era una sección con etiqueta)
  if (matchesEncontrados[0].inicioMatch > 0) {
    const previo = t.substring(0, matchesEncontrados[0].inicioMatch).trim();
    if (previo) {
      just = previo;
    }
  }

  // Extraer el contenido entre cada sección y la siguiente
  for (let idx = 0; idx < matchesEncontrados.length; idx++) {
    const actual = matchesEncontrados[idx];
    const siguiente = matchesEncontrados[idx + 1];
    const finContenido = siguiente ? siguiente.inicioMatch : t.length;
    let contenido = t.substring(actual.finMatch, finContenido).trim();

    if (actual.tipo === 'convocatoria') {
      conv = limpiarBracketsPlantilla(contenido) || undefined;
    } else if (actual.tipo === 'justificacion') {
      const limpio = limpiarBracketsPlantilla(contenido);
      just = just ? just + ' ' + limpio : limpio;
    } else if (actual.tipo === 'distractores') {
      // Limpiar distractores preservando líneas de ítems y quitando corchetes individuales si los hay
      const lineasDist = contenido
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const matchDistItem = l.match(/^([\-\*\•\s]*[A-Da-d][\s\:\)\.\-]+)\s*\[(.*)\]\s*$/);
          if (matchDistItem) {
            return `${matchDistItem[1].trim()} ${matchDistItem[2].trim()}`;
          }
          return limpiarBracketsPlantilla(l);
        });
      dist = lineasDist.join('\n') || undefined;
    } else if (actual.tipo === 'ejemplo') {
      ej = limpiarBracketsPlantilla(contenido) || undefined;
    } else if (actual.tipo === 'regla') {
      regla = limpiarBracketsPlantilla(contenido) || undefined;
    }
  }

  return {
    justificacion: limpiarBracketsPlantilla(just),
    ejemploPractico: ej,
    reglaMnemotecnica: regla,
    analisisDistractores: dist,
    convocatoriasAparecida: conv,
  };
}

export interface InfoPlantillaRespuestas {
  idxPlantilla: number;
  solucionesOrdinarias: Map<number, 'A' | 'B' | 'C' | 'D'>;
  solucionesReserva: Map<number, 'A' | 'B' | 'C' | 'D'>;
  anuladasOrdinarias: Set<number>;
  anuladasReserva: Set<number>;
  justificacionesOrdinarias: Map<number, string>;
  justificacionesReserva: Map<number, string>;
  ejemplosPracticosOrdinarios: Map<number, string>;
  ejemplosPracticosReserva: Map<number, string>;
  reglasMnemotecnicasOrdinarias: Map<number, string>;
  reglasMnemotecnicasReserva: Map<number, string>;
  distractoresOrdinarios: Map<number, string>;
  distractoresReserva: Map<number, string>;
  convocatoriasOrdinarias: Map<number, string>;
  convocatoriasReserva: Map<number, string>;
}

/**
 * Determina si una línea corresponde a un encabezado de plantilla o solucionario oficial,
 * incluyendo encabezados extendidos como "PLANTILLA DE RESPUESTAS Y JUSTIFICACIÓN".
 */
export function esLineaEncabezadoPlantilla(linea: string): boolean {
  const l = linea
    .replace(/^[\#\*\=\-\_\s\|\>\(\[]+/, '')
    .replace(/[\#\*\=\-\_\s\|\>\)\]\:]+$/, '')
    .trim()
    .toLowerCase();
  if (!l) return false;

  // Encabezados directos con 'plantilla'
  if (/^plantilla\b/i.test(l)) return true;
  // 'solucionario'
  if (/^solucionario\b/i.test(l)) return true;
  // 'hoja de respuestas', 'tabla de respuestas', 'claves de respuestas', etc.
  if (/^(?:hoja|tabla|clave|claves)\s+(?:de\s+)?(?:respuestas|soluciones|correcci[oó]n)/i.test(l)) return true;
  // 'respuestas y justificación', 'respuestas correctas', 'soluciones y justificación'
  if (
    /^(?:respuestas?|soluciones?)\s+(?:correctas?|oficiales?|del\s+examen|del\s+test|del\s+supuesto|y\s+(?:justificaci[oó]n|explicaci[oó]n|comentarios?)|con\s+(?:justificaci[oó]n|explicaci[oó]n)|comentad[ao]s?|razonad[ao]s?)/i.test(
      l
    )
  ) {
    return true;
  }
  // Líneas concisas que solo dicen 'respuestas' o 'soluciones'
  if (/^(?:respuestas?|soluciones?)\b[\:\.\s]*$/i.test(l)) return true;

  return false;
}

/**
 * Reconoce cualquier formato estándar o no estándar de encabezado de preguntas de reserva
 * (ej: "PREGUNTAS DE RESERVA", "CUESTIONES DE RESERVA", "RESERVA", "RESERVAS", "--- RESERVA ---", etc.)
 */
export function esEncabezadoReservaGeneral(linea: string): boolean {
  const l = linea.trim();
  if (!l) return false;
  const clean = l.replace(/^[\#\*\-\=\_\s\•]+|[\#\*\-\=\_\s\:\.]+$/g, '').trim();
  return /^(?:(?:preguntas?|cuestiones?|secci[oó]n|bloque|parte|ejercicios?)\s+(?:adicionales?\s+)?(?:de\s+)?reservas?|preguntas?\s+reserva|cuestiones?\s+reserva|reservas?|plantilla(?:\s+de)?\s+reservas?)$/i.test(
    clean
  );
}

/**
 * Escanea y extrae exhaustivamente la plantilla oficial de respuestas o tabla de soluciones
 * en cualquier parte del texto o al final del documento.
 */
export function extraerPlantillaDeRespuestasCompleta(
  lineasLimpias: string[],
  idxInicioCuestionario: number = 0
): InfoPlantillaRespuestas {
  const solucionesOrdinarias = new Map<number, 'A' | 'B' | 'C' | 'D'>();
  const solucionesReserva = new Map<number, 'A' | 'B' | 'C' | 'D'>();
  const anuladasOrdinarias = new Set<number>();
  const anuladasReserva = new Set<number>();
  const justificacionesOrdinarias = new Map<number, string>();
  const justificacionesReserva = new Map<number, string>();
  const ejemplosPracticosOrdinarios = new Map<number, string>();
  const ejemplosPracticosReserva = new Map<number, string>();
  const reglasMnemotecnicasOrdinarias = new Map<number, string>();
  const reglasMnemotecnicasReserva = new Map<number, string>();
  const distractoresOrdinarios = new Map<number, string>();
  const distractoresReserva = new Map<number, string>();
  const convocatoriasOrdinarias = new Map<number, string>();
  const convocatoriasReserva = new Map<number, string>();

  let idxPlantilla = -1;

  // 1. Detección de encabezados explícitos de plantilla tras las preguntas
  for (let i = Math.max(0, idxInicioCuestionario); i < lineasLimpias.length; i++) {
    const l = lineasLimpias[i];
    if (esLineaEncabezadoPlantilla(l)) {
      idxPlantilla = i;
      break;
    }
  }

  // Si no se encontró al final, buscar si la plantilla está antes del cuestionario
  if (idxPlantilla === -1 && idxInicioCuestionario > 2) {
    for (let i = 0; i < idxInicioCuestionario; i++) {
      const l = lineasLimpias[i];
      if (esLineaEncabezadoPlantilla(l)) {
        idxPlantilla = i;
        break;
      }
    }
  }

  // 2. Si no hay encabezado explícito, detectar si al final o en el texto hay un bloque de plantilla
  if (idxPlantilla === -1) {
    // Buscar la primera línea que tenga formato de clave "20.b", "1.a" o "R1.b"
    // y que vaya seguida por campos de plantilla (Convocatoria, Justificación, Distractores, etc.) o por más claves
    for (let i = 0; i < lineasLimpias.length; i++) {
      const l = lineasLimpias[i];
      if (!l) continue;

      const esItemClave =
        /^(?:(?:pregunta|p\.?|item)\s*)?#?\d{1,3}\s*[\.\-\:\)\=\/]\s*[A-Da-d]\s*$/i.test(l) ||
        /^(?:R\.?\s*|Reserva\s*)#?\d{1,2}\s*[\.\-\:\)\=\>\|]?\s*[\(\[]?\s*[A-Da-d]\s*$/i.test(l);

      if (esItemClave) {
        let esInicioPlantilla = false;
        for (let j = i + 1; j < Math.min(lineasLimpias.length, i + 8); j++) {
          const lj = lineasLimpias[j];
          if (!lj) continue;
          if (
            /^(?:convocatoria|justificaci[oó]n|argumentaci[oó]n|fundamentaci[oó]n|distractor|ejemplo\s+pr[aá]ctico|caso\s+pr[aá]ctico|regla\s+mnemot[eé]cnica|mnemot[eé]cnia)/i.test(
              lj
            ) ||
            /^(?:(?:pregunta|p\.?|item)\s*)?#?\d{1,3}\s*[\.\-\:\)\=\/]\s*[A-Da-d]\s*$/i.test(lj) ||
            /^(?:R\.?\s*|Reserva\s*)#?\d{1,2}\s*[\.\-\:\)\=\>\|]?\s*[\(\[]?\s*[A-Da-d]\s*$/i.test(lj)
          ) {
            esInicioPlantilla = true;
            break;
          }
        }
        if (esInicioPlantilla) {
          idxPlantilla = i;
          break;
        }
      }
    }
  }

  // 2.b Si aún no se encontró, fallback con búsqueda hacia atrás
  if (idxPlantilla === -1) {
    let candidataIdx = -1;
    let paresConsecutivos = 0;

    for (let i = lineasLimpias.length - 1; i >= Math.max(0, idxInicioCuestionario + 1); i--) {
      const l = lineasLimpias[i];
      if (!l) continue;

      const esItemClave = /^(?:(?:pregunta|p\.?|item)\s*)?#?\d{1,3}\s*[\.\-\:\)\=\/]\s*[A-Da-d]\s*$/i.test(l);
      const esJustificacion =
        /^(?:justificaci[oó]n|explicaci[oó]n|motivo|fundamento|art[íi]culo|disposici[oó]n|distractor|convocatoria|ejemplo|regla)\b/i.test(
          l
        ) || /^[«"“]/.test(l);
      const paresEnLinea = (
        l.match(
          /(?:(?:Pregunta|P\.?|Item)?\s*#?\d{1,3}\s*[\.\-\:\)\=\/]\s*[A-Da-d](?=[\s\,\;\.\—\)\/\|]|$))/gi
        ) || []
      ).length;

      if (esItemClave || paresEnLinea >= 1) {
        paresConsecutivos += Math.max(1, paresEnLinea);
        candidataIdx = i;
      } else if (esJustificacion) {
        candidataIdx = i;
      } else if (paresConsecutivos >= 2) {
        break;
      }
    }

    if (paresConsecutivos >= 2 && candidataIdx !== -1) {
      idxPlantilla = candidataIdx;
    }
  }

  // 3. Extraer pares de respuestas y justificaciones en la sección de plantilla identificada
  if (idxPlantilla !== -1) {
    let enPlantillaReserva = false;
    let ultimoNumeroPregunta: number | null = null;
    let ultimoEsReserva = false;
    let ultimoTipoCampo: 'justificacion' | 'ejemplo_practico' | 'regla_mnemotecnica' | 'distractor' | 'convocatoria' =
      'justificacion';

    const finPlantilla = idxPlantilla < idxInicioCuestionario ? idxInicioCuestionario : lineasLimpias.length;
    const inicioPlantilla = esLineaEncabezadoPlantilla(lineasLimpias[idxPlantilla])
      ? idxPlantilla + 1
      : idxPlantilla;

    for (let i = inicioPlantilla; i < finPlantilla; i++) {
      const l = lineasLimpias[i];
      if (!l) continue;

      // Encabezado de preguntas de reserva dentro de la plantilla
      if (esEncabezadoReservaGeneral(l)) {
        enPlantillaReserva = true;
        ultimoNumeroPregunta = null;
        ultimoTipoCampo = 'justificacion';
        continue;
      }

      // A0) Convocatorias oficiales o si es inédita: "convocatoria: AGE 2019 libre..." o "convocatoria: Inédita"
      const convMatch = l.match(
        /^(?:convocatoria(?:s)?(?:\s+oficial(?:es)?)?|origen\s+convocatoria|aparici[oó]n|a[ñn]o\s+convocatoria)[\s\:\-]*(.*)$/i
      );
      if (convMatch) {
        ultimoTipoCampo = 'convocatoria';
        const textoConv = limpiarBracketsPlantilla(convMatch[1]);
        if (ultimoNumeroPregunta !== null && textoConv) {
          if (ultimoEsReserva) {
            const actual = convocatoriasReserva.get(ultimoNumeroPregunta) || '';
            convocatoriasReserva.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoConv);
          } else {
            const actual = convocatoriasOrdinarias.get(ultimoNumeroPregunta) || '';
            convocatoriasOrdinarias.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoConv);
          }
        }
        continue;
      }

      // A0.1) Análisis de distractores: "distractor: A: cambia término X por Y..." o "Distractores:" solo en línea
      const distMatch = l.match(
        /^(?:distractor(?:es)?|an[aá]lisis\s+(?:de\s+)?distractor(?:es)?|error(?:es)?\s+distractor(?:es)?|trampas?(?:\s+del\s+tribunal)?)[\s\:\-]*(.*)$/i
      );
      if (distMatch) {
        ultimoTipoCampo = 'distractor';
        const textoDist = distMatch[1].trim();
        if (ultimoNumeroPregunta !== null && textoDist) {
          const matchDistItem = textoDist.match(/^([\-\*\•\s]*[A-Da-d][\s\:\)\.\-]+)\s*\[(.*)\]\s*$/);
          const textoLimpio = matchDistItem
            ? `${matchDistItem[1].trim()} ${matchDistItem[2].trim()}`
            : limpiarBracketsPlantilla(textoDist);
          if (ultimoEsReserva) {
            const actual = distractoresReserva.get(ultimoNumeroPregunta) || '';
            distractoresReserva.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLimpio);
          } else {
            const actual = distractoresOrdinarios.get(ultimoNumeroPregunta) || '';
            distractoresOrdinarios.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLimpio);
          }
        }
        continue;
      }

      // A1) Regla mnemotécnica debajo de ejemplo práctico
      const reglaMatch = l.match(
        /^(?:regla\s+mnemot[eé]cnica|mnemot[eé]cnia|f[oó]rmula(?:\s+visual)?|esquema(?:\s+r[aá]pido)?|truco)[\s\:\-]*(.*)$/i
      );
      if (reglaMatch) {
        ultimoTipoCampo = 'regla_mnemotecnica';
        const textoRegla = limpiarBracketsPlantilla(reglaMatch[1]);
        if (ultimoNumeroPregunta !== null && textoRegla) {
          if (ultimoEsReserva) {
            const actual = reglasMnemotecnicasReserva.get(ultimoNumeroPregunta) || '';
            reglasMnemotecnicasReserva.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoRegla);
          } else {
            const actual = reglasMnemotecnicasOrdinarias.get(ultimoNumeroPregunta) || '';
            reglasMnemotecnicasOrdinarias.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoRegla);
          }
        }
        continue;
      }

      // A2) Ejemplo práctico debajo de argumentación legal
      const ejMatch = l.match(
        /^(?:ejemplo\s+pr[aá]ctico|caso\s+pr[aá]ctico|aplicaci[oó]n(?:\s+pr[aá]ctica|\s+al\s+caso)?|supuesto\s+pr[aá]ctico)[\s\:\-]*(.*)$/i
      );
      if (ejMatch) {
        ultimoTipoCampo = 'ejemplo_practico';
        const textoEj = limpiarBracketsPlantilla(ejMatch[1]);
        if (ultimoNumeroPregunta !== null && textoEj) {
          if (ultimoEsReserva) {
            const actual = ejemplosPracticosReserva.get(ultimoNumeroPregunta) || '';
            ejemplosPracticosReserva.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoEj);
          } else {
            const actual = ejemplosPracticosOrdinarios.get(ultimoNumeroPregunta) || '';
            ejemplosPracticosOrdinarios.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoEj);
          }
        }
        continue;
      }

      // A3) Detección de línea de Justificación / Argumentación legal / Explicación
      const justifMatch = l.match(
        /^(?:justificaci[oó]n(?:\s+oficial|\s+legal)?|argumentaci[oó]n(?:\s+legal)?|fundamentaci[oó]n(?:\s+legal|\s+boe)?|explicaci[oó]n|fundamento|motivo)[\s\:\-]*(.*)$/i
      );
      if (justifMatch) {
        ultimoTipoCampo = 'justificacion';
        const textoJustif = limpiarBracketsPlantilla(justifMatch[1]);
        if (ultimoNumeroPregunta !== null && textoJustif) {
          if (ultimoEsReserva) {
            const actual = justificacionesReserva.get(ultimoNumeroPregunta) || '';
            justificacionesReserva.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoJustif);
          } else {
            const actual = justificacionesOrdinarias.get(ultimoNumeroPregunta) || '';
            justificacionesOrdinarias.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoJustif);
          }
        }
        continue;
      }

      // B) Ítems individuales de reserva anulada: "R1 ANULADA", "R.1 ANULADA", "Reserva 1: ANULADA"
      const rAnulMatch = l.match(
        /^(?:R\.?\s*|Reserva\s*)#?(\d{1,2})[\s\.\-\:\)\=\>\|]+(?:[\(\[]?\s*(?:ANULAD[AO]|CANCELAD[AO]|SIN\s+EFECTO|ANUL|MODIFICADA)\b[\)\]]?|[\-\—]{1,2}\b)/i
      );
      if (rAnulMatch) {
        const num = parseInt(rAnulMatch[1], 10);
        anuladasReserva.add(num);
        ultimoNumeroPregunta = num;
        ultimoEsReserva = true;
        ultimoTipoCampo = 'justificacion';
        continue;
      }

      // C) Ítems individuales de ordinaria anulada: "14. ANULADA", "14 - CANCELADA"
      const ordAnulMatch = l.match(
        /^(?:(?:Pregunta|P\.?|Item)\s*)?#?(\d{1,3})[\s\.\-\:\)\=\>\|]+(?:[\(\[]?\s*(?:ANULAD[AO]|CANCELAD[AO]|SIN\s+EFECTO|ANUL|MODIFICADA)\b[\)\]]?|[\-\—]{1,2}\b)/i
      );
      if (ordAnulMatch) {
        const num = parseInt(ordAnulMatch[1], 10);
        if (enPlantillaReserva) {
          anuladasReserva.add(num);
          ultimoEsReserva = true;
        } else {
          anuladasOrdinarias.add(num);
          ultimoEsReserva = false;
        }
        ultimoNumeroPregunta = num;
        ultimoTipoCampo = 'justificacion';
        continue;
      }

      // D) Ítem individual de solución de reserva: "R1: A", "R1.b", "R.1: C", "Reserva 1: C"
      const rSolMatch = l.match(
        /^(?:R\.?\s*|Reserva\s*)#?(\d{1,2})\s*[\.\-\:\)\=\>\|]?\s*[\(\[]?\s*([A-Da-d])\s*$/i
      );
      if (rSolMatch) {
        const num = parseInt(rSolMatch[1], 10);
        const letra = rSolMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        if (!anuladasReserva.has(num)) {
          solucionesReserva.set(num, letra);
        }
        ultimoNumeroPregunta = num;
        ultimoEsReserva = true;
        ultimoTipoCampo = 'justificacion';
        continue;
      }

      // E) Ítem individual formato estándar y del usuario: "1.b", "1. B", "1-b", "1:b", "1)b", "Pregunta 1: B"
      const ordSolMatch = l.match(
        /^(?:(?:Pregunta|P\.?|Item)\s*)?#?(\d{1,3})\s*[\.\-\:\)\=\/]\s*([A-Da-d])\s*$/i
      );
      if (ordSolMatch) {
        const num = parseInt(ordSolMatch[1], 10);
        const letra = ordSolMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        if (enPlantillaReserva) {
          if (!anuladasReserva.has(num)) solucionesReserva.set(num, letra);
          ultimoEsReserva = true;
        } else {
          if (!anuladasOrdinarias.has(num)) solucionesOrdinarias.set(num, letra);
          ultimoEsReserva = false;
        }
        ultimoNumeroPregunta = num;
        ultimoTipoCampo = 'justificacion';
        continue;
      }

      // F) Continuación de justificación, ejemplo práctico, regla mnemotécnica, distractor o convocatoria según ultimoTipoCampo
      const esNuevaClave = /(?:^|\s)(?:#?\d{1,3}|R\d{1,2})\s*[\.\-\:\)\=\/]\s*[A-Da-d]\b/i.test(l);
      if (!esNuevaClave && ultimoNumeroPregunta !== null) {
        if (ultimoTipoCampo === 'convocatoria') {
          const textoLimpio = limpiarBracketsPlantilla(l);
          if (ultimoEsReserva) {
            const actual = convocatoriasReserva.get(ultimoNumeroPregunta) || '';
            convocatoriasReserva.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoLimpio);
          } else {
            const actual = convocatoriasOrdinarias.get(ultimoNumeroPregunta) || '';
            convocatoriasOrdinarias.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoLimpio);
          }
        } else if (ultimoTipoCampo === 'distractor') {
          let textoLinea = l.trim();
          const matchDistItem = textoLinea.match(/^([\-\*\•\s]*[A-Da-d][\s\:\)\.\-]+)\s*\[(.*)\]\s*$/);
          if (matchDistItem) {
            textoLinea = `${matchDistItem[1].trim()} ${matchDistItem[2].trim()}`;
          } else {
            textoLinea = limpiarBracketsPlantilla(textoLinea);
          }
          if (ultimoEsReserva) {
            const actual = distractoresReserva.get(ultimoNumeroPregunta) || '';
            distractoresReserva.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLinea);
          } else {
            const actual = distractoresOrdinarios.get(ultimoNumeroPregunta) || '';
            distractoresOrdinarios.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLinea);
          }
        } else if (ultimoTipoCampo === 'regla_mnemotecnica') {
          const textoLimpio = limpiarBracketsPlantilla(l);
          if (ultimoEsReserva) {
            const actual = reglasMnemotecnicasReserva.get(ultimoNumeroPregunta) || '';
            reglasMnemotecnicasReserva.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLimpio);
          } else {
            const actual = reglasMnemotecnicasOrdinarias.get(ultimoNumeroPregunta) || '';
            reglasMnemotecnicasOrdinarias.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLimpio);
          }
        } else if (ultimoTipoCampo === 'ejemplo_practico') {
          const textoLimpio = limpiarBracketsPlantilla(l);
          if (ultimoEsReserva) {
            const actual = ejemplosPracticosReserva.get(ultimoNumeroPregunta) || '';
            ejemplosPracticosReserva.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLimpio);
          } else {
            const actual = ejemplosPracticosOrdinarios.get(ultimoNumeroPregunta) || '';
            ejemplosPracticosOrdinarios.set(ultimoNumeroPregunta, (actual ? actual + '\n' : '') + textoLimpio);
          }
        } else {
          const textoLimpio = limpiarBracketsPlantilla(l);
          if (ultimoEsReserva) {
            const actual = justificacionesReserva.get(ultimoNumeroPregunta) || '';
            justificacionesReserva.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoLimpio);
          } else {
            const actual = justificacionesOrdinarias.get(ultimoNumeroPregunta) || '';
            justificacionesOrdinarias.set(ultimoNumeroPregunta, (actual ? actual + ' ' : '') + textoLimpio);
          }
        }
        continue;
      }

      // G) Múltiples soluciones en la misma línea: "1.b, 2.a, 3.c, 4.d" o "1-B 2-C 3-A"
      // Se ignora si es una cita legal ("Artículo 2.a) del Reglamento...")
      if (!/^(?:art[íi]culo|disposici[oó]n|seg[úu]n|conforme|en\s+virtud)\b/i.test(l)) {
        const rMulti = l.matchAll(/(?:R|Reserva\s*)#?(\d{1,2})\s*[\.\-\:\)\=\>\|]?\s*[\(\[]?\s*([A-Da-d])(?=[\s\,\;\.\—\)\/\|]|$)/gi);
        for (const m of rMulti) {
          const numRes = parseInt(m[1], 10);
          if (!anuladasReserva.has(numRes)) {
            solucionesReserva.set(numRes, m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D');
          }
        }

        const ordMulti = l.matchAll(/(?:(?:Pregunta|P\.?|Item)\s*)?#?(\d{1,3})\s*[\.\-\:\)\=\/]\s*([A-Da-d])(?=[\s\,\;\.\—\)\/\|]|$)/gi);
        for (const m of ordMulti) {
          const numPreg = parseInt(m[1], 10);
          const letra = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          if (enPlantillaReserva) {
            if (!anuladasReserva.has(numPreg) && !solucionesReserva.has(numPreg)) {
              solucionesReserva.set(numPreg, letra);
            }
          } else {
            if (!anuladasOrdinarias.has(numPreg) && !solucionesOrdinarias.has(numPreg)) {
              solucionesOrdinarias.set(numPreg, letra);
            }
          }
        }
      }
    }
  }

  // 4. Si aún no se encontró ninguna solución ordinaria, realizar un barrido global selectivo
  if (solucionesOrdinarias.size === 0) {
    for (const l of lineasLimpias) {
      if (/^(?:pregunta|supuesto|caso|planteamiento|art[íi]culo|disposici[oó]n|justificaci[oó]n|explicaci[oó]n)/i.test(l)) continue;
      if (l.length > 80 && !l.includes(',')) continue;

      const ordMulti = l.matchAll(/(?:(?:Pregunta|P\.?|Item)\s*)?#?(\d{1,3})\s*[\.\-\:\)\=\/]\s*([A-Da-d])(?=[\s\,\;\.\—\)\/\|]|$)/gi);
      for (const m of ordMulti) {
        const numPreg = parseInt(m[1], 10);
        const letra = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        if (!anuladasOrdinarias.has(numPreg) && !solucionesOrdinarias.has(numPreg)) {
          solucionesOrdinarias.set(numPreg, letra);
        }
      }
    }
  }

  return {
    idxPlantilla,
    solucionesOrdinarias,
    solucionesReserva,
    anuladasOrdinarias,
    anuladasReserva,
    justificacionesOrdinarias,
    justificacionesReserva,
    ejemplosPracticosOrdinarios,
    ejemplosPracticosReserva,
    reglasMnemotecnicasOrdinarias,
    reglasMnemotecnicasReserva,
    distractoresOrdinarios,
    distractoresReserva,
    convocatoriasOrdinarias,
    convocatoriasReserva,
  };
}

/**
 * Parser para archivos de texto (.txt) que distingue con rigor:
 * - Un TEST NORMAL (unitario) donde las preguntas comienzan de forma directa o
 *   tras un breve encabezado/título o instrucciones de examen.
 * - Un SUPUESTO PRÁCTICO que contiene un texto/relato fáctico largo al principio
 *   y posteriormente el cuestionario con las preguntas.
 * - Identifica automáticamente las 5 preguntas de reserva y gestiona las anuladas por plantilla.
 * - Extrae con máxima precisión la plantilla de soluciones oficial, garantizando que cada pregunta
 *   tenga su clave correcta real (A, B, C o D) sin sesgos hacia ninguna letra.
 */
export interface OpcionDetectada {
  letra: 'A' | 'B' | 'C' | 'D';
  texto: string;
}

/**
 * Parsea una línea para extraer una o múltiples opciones (ej: "a) 3 meses" o "a) 3 meses, b) 6 meses, c) 1 año, d) 2 años").
 * Protege estrictamente referencias legales como "art. 24.1.a)", "letra b)", "apartado c)" para evitar que se dividan
 * erróneamente en múltiples opciones dentro de párrafos extensos de artículos normativos.
 */
export function parsearOpcionesDeLinea(linea: string): OpcionDetectada[] {
  const clean = linea.trim();
  if (!clean) return [];

  // Comprobar si la línea empieza con una letra de opción: A, B, C o D
  const inicioMatch = clean.match(/^(?:[\*\_\s]*[\(\[]?\s*([A-Da-d])\s*[\)\]\.\-\:\/]+|\*?\s*([A-Da-d])\))\s*(.*)$/);
  if (!inicioMatch) {
    // Si la línea contiene opciones en el interior precedidas por encabezado tipo "Opciones: a) ..."
    const matchInterior = clean.search(/(?:^|[\s\,\;])[\*\_\s]*[\(\[]?\s*[aA]\s*[\)\]\.\-\:]+\s+/);
    if (matchInterior !== -1 && matchInterior > 0) {
      return parsearOpcionesDeLinea(clean.substring(matchInterior).trim());
    }
    return [];
  }

  const primeraLetra = (inicioMatch[1] || inicioMatch[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
  const textoDespues = inicioMatch[3];

  const letrasValidas: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const idxPrimera = letrasValidas.indexOf(primeraLetra);

  // Si es la opción D o no hay siguientes letras disponibles
  if (idxPrimera === -1 || idxPrimera >= letrasValidas.length - 1) {
    return [{ letra: primeraLetra, texto: textoDespues.trim() }];
  }

  // Buscar si dentro de textoDespues existen marcadores de opciones siguientes consecutivas
  // Excluyendo siempre referencias a artículos legales (ej: art. 24.1.a), letra b), apartado c), etc.)
  const regexCandidatos = /(?:^|[\s\,\;\.\—]+)([\*\_\s]*[\(\[]?\s*([A-Da-d])\s*[\)\]\.\-\:]+\s*)/g;
  const matches = Array.from(textoDespues.matchAll(regexCandidatos));

  const marcadoresValidos: { letra: 'A' | 'B' | 'C' | 'D'; index: number; longitud: number }[] = [];
  let siguienteIndiceEsperado = idxPrimera + 1;

  for (const m of matches) {
    const letraEncontrada = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    if (siguienteIndiceEsperado < letrasValidas.length && letraEncontrada === letrasValidas[siguienteIndiceEsperado]) {
      const matchPos = m.index!;
      const textoPrevio = textoDespues.substring(Math.max(0, matchPos - 30), matchPos);

      // Comprobar si está precedido por una referencia jurídica a letra, artículo, párrafo, apartado o número
      const esReferenciaJuridica =
        /\b(?:art|art[íi]culo|arts|apartado|apartados|p[aá]rrafo|p[aá]rrafos|letra|letras|inciso|secci[oó]n|n[uú]m|n[uú]mero|numeral|ordinal)\s*$/i.test(textoPrevio) ||
        /\d+\.\s*$/.test(textoPrevio); // ej: "24.1."

      if (!esReferenciaJuridica) {
        marcadoresValidos.push({
          letra: letraEncontrada,
          index: matchPos + (m[0].length - m[1].length),
          longitud: m[1].length,
        });
        siguienteIndiceEsperado++;
      }
    }
  }

  // Si no hay marcadores consecutivos válidos, es una sola opción con texto (párrafo/artículo largo)
  if (marcadoresValidos.length === 0) {
    return [{ letra: primeraLetra, texto: textoDespues.trim() }];
  }

  // Si hay marcadores válidos consecutivos en la misma línea
  const resultado: OpcionDetectada[] = [];
  let posActual = 0;
  let letraActual = primeraLetra;

  for (const sig of marcadoresValidos) {
    let fragmento = textoDespues.substring(posActual, sig.index).trim();
    fragmento = fragmento.replace(/[\,\;\.\—]+$/, '').trim();
    resultado.push({ letra: letraActual, texto: fragmento });

    posActual = sig.index + sig.longitud;
    letraActual = sig.letra;
  }

  let fragmentoFinal = textoDespues.substring(posActual).trim();
  fragmentoFinal = fragmentoFinal.replace(/[\,\;\.\—]+$/, '').trim();
  resultado.push({ letra: letraActual, texto: fragmentoFinal });

  return resultado;
}

export interface InfoCandidatoPregunta {
  esPregunta: boolean;
  numero: number;
  esReserva: boolean;
  numeroReserva?: number;
  restoTexto: string;
}

/**
 * Detecta si una línea corresponde al inicio de una pregunta (ordinaria o de reserva),
 * diferenciando números de pregunta de listas o citas de apartados de artículos dentro de opciones.
 */
function detectarCandidatoInicioPregunta(
  linea: string,
  preguntaActual: { id: number; opciones: any[]; esReserva: boolean } | null,
  enSeccionReserva: boolean
): InfoCandidatoPregunta | null {
  const clean = linea.trim();
  if (!clean) return null;

  // 1. Prefijos explícitos de reserva: R1., R-1., R.1., Reserva 1., Pregunta de reserva 1., [RESERVA] 1., etc.
  const rPrefixMatch = clean.match(
    /^(?:[\*\_\#\s\•\-\]]*)*(?:(?:\[\s*RESERVA\s*\]|\(\s*RESERVA\s*\)|\[\s*R\s*\]|\(\s*R\s*\))\s*)?(?:R\.?\s*|Reserva\s+|Pregunta\s+(?:de\s+)?reserva\s+|Cuesti[oó]n\s+(?:de\s+)?reserva\s+)#?(\d{1,2})(?:[\.\-\)\:\/]+|\s+)(.*)$/i
  );
  if (rPrefixMatch) {
    const numRes = parseInt(rPrefixMatch[1], 10);
    const resto = rPrefixMatch[2].trim();
    // Si el resto es simplemente una clave de respuesta ("b", "b.", "b)"), esto pertenece a la plantilla de respuestas, no es pregunta
    if (/^[A-Da-d][\.\)]?$/i.test(resto)) {
      return null;
    }
    return {
      esPregunta: true,
      numero: numRes,
      esReserva: true,
      numeroReserva: numRes,
      restoTexto: resto,
    };
  }

  // 1.b [RESERVA] o (RESERVA) seguido de número: "[RESERVA] 1. ..."
  const rTagMatch = clean.match(
    /^(?:\[\s*RESERVA(?:\s*#?\d{1,2})?\s*\]|\(\s*RESERVA(?:\s*#?\d{1,2})?\s*\))\s*(?:(?:pregunta|cuesti[oó]n|item)\s*)?#?(\d{1,3})(?:[\.\-\)\:\/]+|\s+)(.*)$/i
  );
  if (rTagMatch) {
    const num = parseInt(rTagMatch[1], 10);
    const resto = rTagMatch[2].trim();
    if (/^[A-Da-d][\.\)]?$/i.test(resto)) {
      return null;
    }
    return {
      esPregunta: true,
      numero: num,
      esReserva: true,
      numeroReserva: num <= 10 ? num : undefined,
      restoTexto: resto,
    };
  }

  // 2. Formato estándar numerado:
  // "1. ", "1.- ", "1) ", "Pregunta 1. ", "1.ª pregunta.", "1.a pregunta:", "Item 1."
  const stdMatch = clean.match(
    /^(?:[\*\_\s\•\-]*(?:pregunta|cuesti[oó]n|item|ejercicio)\s*)?#?(\d{1,3})(?:[\.\-\)\:\/]+|[ºªa]\s*[\.\-\)\:\/]*|[ºªa]?\s*[\.\-\)\:\/]*\s*pregunta[\.\:\-\s]*)\s*(.*)$/i
  );

  if (!stdMatch) return null;

  const numBruto = parseInt(stdMatch[1], 10);
  let resto = (stdMatch[2] || '').replace(/^[ºªa\s]*pregunta[\.\:\-\s]*/i, '').trim();

  // Si el resto es simplemente una letra de opción como "b", "b.", "b)" (ej: "20.b", "1.a"), es una clave de solución, no una pregunta
  if (/^[A-Da-d][\.\)]?$/i.test(resto)) {
    return null;
  }

  // Comprobar si el texto tras el número indica explícitamente reserva:
  // Ej: "71. (Reserva) ...", "1. - Pregunta de reserva - ..."
  const marcaReservaEnResto =
    /^(?:[\(\[]\s*reserva\s*[\)\]]|\-\s*reserva\s*\-|(?:pregunta|cuesti[oó]n)\s+(?:de\s+)?reserva[\.\:\-\s])/i.test(resto);

  if (marcaReservaEnResto) {
    resto = resto.replace(/^(?:[\(\[]\s*reserva\s*[\)\]]|\-\s*reserva\s*\-|(?:pregunta|cuesti[oó]n)\s+(?:de\s+)?reserva[\.\:\-\s]*)/i, '').trim();
    return {
      esPregunta: true,
      numero: numBruto,
      esReserva: true,
      numeroReserva: numBruto <= 10 ? numBruto : undefined,
      restoTexto: resto,
    };
  }

  // Si estamos en la sección declarada de reservas
  if (enSeccionReserva) {
    return {
      esPregunta: true,
      numero: numBruto,
      esReserva: true,
      restoTexto: resto,
    };
  }

  // Anti-falsos-positivos para párrafos o numerales dentro de artículos legales:
  // Si ya tenemos una pregunta activa y este número es menor o igual al id actual
  // (ej: estamos en la pregunta 20 y encontramos "1. Los actos que..." o "2. Asimismo..."),
  // se trata indudablemente de una cita legal o lista dentro de la opción o del enunciado.
  if (preguntaActual && numBruto <= preguntaActual.id) {
    return null;
  }

  return {
    esPregunta: true,
    numero: numBruto,
    esReserva: false,
    restoTexto: resto,
  };
}

/**
 * Genera un esquema visual destacado de 2 líneas o fórmula mnemotécnica para una pregunta de examen
 * si no viene especificada explícitamente en el fichero.
 */
export function generarReglaMnemotecnicaAutomatica(
  enunciado: string = '',
  norma: string = '',
  articulo: string = '',
  textoCorrecta: string = ''
): string {
  const txt = `${enunciado} ${norma} ${articulo} ${textoCorrecta}`.toLowerCase();

  // 1. Plazos de días, meses y cómputo (Ley 39/2015, Art. 30)
  if (/plazo|c[oó]mputo|d[íi]as\s+h[aá]biles|d[íi]as\s+naturales|meses|a[ñn]os/i.test(txt)) {
    return '⚡ REGLA DÍAS Y MESES (Art. 30 LPAC):\n• Días hábiles = Excluye sábados, domingos y festivos | Meses/Años = De fecha a fecha (mismo día vencimiento).';
  }

  // 2. Recursos administrativos (Alzada, Reposición, Revisión)
  if (/recurso|alzada|reposici[oó]n|revisi[oó]n|v[íi]a\s+administrativa/i.test(txt)) {
    return '⚡ ESQUEMA RECURSOS (Arts. 121-125 LPAC):\n• Alzada (1 mes) = Órgano superior (NO agota vía) | Reposición (1 mes) = Mismo órgano (SÍ agota vía).';
  }

  // 3. Nulidad de pleno derecho vs Anulabilidad (Arts. 47 y 48 Ley 39/2015)
  if (/nulidad|nulo|anulabilidad|anulable|incompetencia|derechos\s+fundamentales/i.test(txt)) {
    return '⚡ FÓRMULA NULIDAD VS ANULABILIDAD:\n• Nulo (Art. 47): Lesión DDFF, manifiesta incompetencia o imposible | Anulable (Art. 48): Resto de infracciones.';
  }

  // 4. Silencio administrativo (Arts. 24 y 25 Ley 39/2015)
  if (/silencio\s+administrativo|silencio\s+positivo|silencio\s+negativo/i.test(txt)) {
    return '⚡ REGLA SILENCIO ADMINISTRATIVO:\n• Regla general a solicitud = POSITIVO | Excepciones = NEGATIVO (recursos, dominio público, potestades, daño).';
  }

  // 5. Prescripción de faltas y sanciones TREBEP (Art. 95 y 97)
  if (/falta|sanci[oó]n|prescripci[oó]n|trebep|muy\s+grave|grave|leve/i.test(txt)) {
    return '⚡ FÓRMULA 3 - 2 - 1 (TREBEP Arts. 95-97):\n• Faltas prescriben: Muy graves = 3 años | Graves = 2 años | Leves = 6 meses (Sanciones: 3, 2 y 1 año).';
  }

  // 6. Contratos del sector público (Ley 9/2017)
  if (/contrato|licitaci[oó]n|adjudicaci[oó]n|valor\s+estimado|menor/i.test(txt)) {
    return '⚡ UMBRALES CONTRATO MENOR (Art. 118 LCSP):\n• Obras < 40.000 € | Servicios y Suministros < 15.000 € (Sin prórroga ni revisión de precios).';
  }

  // 7. Informática: Bases de datos / Access / SQL
  if (/base\s+de\s+datos|access|tabla|clave\s+principal|registro|campo|sql|relaci[oó]n/i.test(txt)) {
    return '⚡ ESQUEMA BASE DE DATOS (Access C1):\n• Filas = Registros | Columnas = Campos (Atributos) | Clave Principal (PK) = Identificador único no nulo.';
  }

  // 8. Informática: Excel / Hojas de cálculo
  if (/excel|hoja\s+de\s+c[aá]lculo|f[oó]rmula|celda|rango|funci[oó]n/i.test(txt)) {
    return '⚡ REGLA EXCEL C1:\n• Toda fórmula inicia con "=" | Referencias absolutas con "$A$1" (F4) | Rangos con dos puntos "A1:B10".';
  }

  // 9. Informática: Redes, Internet y Correo
  if (/red|ip|tcp|dns|http|correo|smtp|pop|imap|protocolo/i.test(txt)) {
    return '⚡ PROTOCOLOS CLAVE C1:\n• Envío correo = SMTP | Recepción = IMAP (sincronizado) / POP3 (descarga local) | Web segura = HTTPS (443).';
  }

  // 10. Constitución y Órganos Constitucionales
  if (/constituci[oó]n|cortes\s+generales|congreso|senado|gobierno|corona|tribunal\s+constitucional/i.test(txt)) {
    return '⚡ CLAVE CONSTITUCIONAL CE 1978:\n• Título I = Derechos y Deberes | Título II = Corona | Título III = Cortes Generales | Título IV = Gobierno y Admón.';
  }

  // Regla general adaptada de 2 líneas
  const precepto = articulo ? `${articulo} de ${norma || 'la normativa oficial'}` : norma || 'Normativa oficial BOE';
  const claveCorta = textoCorrecta ? textoCorrecta.replace(/^[a-d]\)\s*/i, '').slice(0, 95) : 'Respuesta oficial contrastada';

  return `⚡ CLAVE MEMORIA (${precepto}):\n• Precepto vinculante directo → Clave oficial: «${claveCorta}».`;
}

/**
 * Parser para archivos de texto (.txt) que distingue con rigor:
 * - Un TEST NORMAL (unitario) donde las preguntas comienzan de forma directa o
 *   tras un breve encabezado/título o instrucciones de examen.
 * - Un SUPUESTO PRÁCTICO que contiene un texto/relato fáctico largo al principio
 *   y posteriormente el cuestionario con las preguntas.
 * - Identifica automáticamente las preguntas de reserva (R1-R5, Reserva 1-5, [RESERVA], 71-75).
 * - Interpreta correctamente opciones con textos largos (artículos y párrafos jurídicos normativos)
 *   sin romper ni mezclar líneas del documento.
 * - Extrae con máxima precisión la plantilla de soluciones oficial (ej: "1.b, 2.a, 3.c...").
 */
function parsearPreguntasDesdeTextoPlano(txt: string): ExamenCompleto | null {
  if (!txt || txt.trim().length < 20) return null;

  // Normalizar saltos de línea preservando el documento original
  const lineasBrutas = txt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lineasLimpias = lineasBrutas.map((l) => l.trim());

  // 1. Localizar dónde empieza el cuestionario de preguntas
  const HEADER_CUESTIONARIO_REGEX = /^(?:cuestionario(?:\s+de\s+preguntas)?|preguntas(?:\s+(?:del\s+supuesto|tipo\s+test))?|cuestiones(?:\s+a\s+resolver)?|a\s+continuaci[oó]n\s+responda(?:\s+a)?\s+las\s+siguientes\s+preguntas|responda\s+a\s+las\s+siguientes\s+preguntas)[\:\.]?$/i;

  let idxInicioCuestionario = -1;

  for (let i = 0; i < lineasLimpias.length; i++) {
    const l = lineasLimpias[i];
    if (!l) continue;

    // ¿Es un encabezado explícito del cuestionario (ej: "CUESTIONARIO" o "PREGUNTAS")?
    if (HEADER_CUESTIONARIO_REGEX.test(l)) {
      idxInicioCuestionario = i;
      break;
    }

    // ¿Es una pregunta numerada seguida de opciones A/B/C/D?
    const cand = detectarCandidatoInicioPregunta(l, null, false);
    if (cand) {
      let resto = cand.restoTexto;
      const tieneOpcionesMismaLinea =
        /(?:^|[\s\,\;\.\—]+)[\*\_\s]*[\(\[]?\s*[aA]\s*[\)\]\.\-\:]+\s+/.test(resto) &&
        /(?:^|[\s\,\;\.\—]+)[\*\_\s]*[\(\[]?\s*[bB]\s*[\)\]\.\-\:]+\s+/.test(resto);

      let tieneOpcionesCerca = tieneOpcionesMismaLinea;
      if (!tieneOpcionesCerca) {
        for (let j = i + 1; j < Math.min(lineasLimpias.length, i + 15); j++) {
          const lj = lineasLimpias[j];
          if (parsearOpcionesDeLinea(lj).length > 0) {
            tieneOpcionesCerca = true;
            break;
          }
          if (detectarCandidatoInicioPregunta(lj, null, false)) break;
        }
      }

      if (tieneOpcionesCerca) {
        idxInicioCuestionario = i;
        break;
      }
    }
  }

  // Si no se detectó por encabezado o primera pregunta cercana, buscar la primera línea con candidato a pregunta
  if (idxInicioCuestionario === -1) {
    for (let i = 0; i < lineasLimpias.length; i++) {
      if (detectarCandidatoInicioPregunta(lineasLimpias[i], null, false)) {
        idxInicioCuestionario = i;
        break;
      }
    }
  }

  if (idxInicioCuestionario === -1) return null;

  // 2. Analizar el texto que precede al cuestionario
  const lineasPreviasNoVacias = lineasLimpias.slice(0, idxInicioCuestionario).filter((l) => l.length > 0);

  let lineasParaEvaluar = [...lineasPreviasNoVacias];
  if (
    lineasParaEvaluar.length > 0 &&
    HEADER_CUESTIONARIO_REGEX.test(lineasParaEvaluar[lineasParaEvaluar.length - 1])
  ) {
    lineasParaEvaluar.pop();
  }

  let tituloExtraido: string | null = null;
  let idxLineaTituloEnBrutas = -1;

  if (lineasParaEvaluar.length > 0) {
    const primerLinea = lineasParaEvaluar[0];
    const esTituloCandidato =
      /^(?:supuesto|caso\s+pr[aá]ctico|test|examen|oposici[oó]n|ejercicio|prueba|bater[ií]a|simulacro)/i.test(primerLinea) ||
      (primerLinea.length <= 90 && !primerLinea.endsWith('.') && !primerLinea.includes(';') && lineasParaEvaluar.length > 1);

    if (esTituloCandidato) {
      tituloExtraido = primerLinea.replace(/^[\#\*\-\s]+/, '').trim();
      for (let k = 0; k < idxInicioCuestionario; k++) {
        if (lineasLimpias[k] === primerLinea) {
          idxLineaTituloEnBrutas = k;
          break;
        }
      }
    }
  }

  const inicioCuerpo = idxLineaTituloEnBrutas >= 0 ? idxLineaTituloEnBrutas + 1 : 0;
  let finCuerpo = idxInicioCuestionario;

  while (finCuerpo > inicioCuerpo) {
    const lTest = lineasLimpias[finCuerpo - 1];
    if (lTest === '' || HEADER_CUESTIONARIO_REGEX.test(lTest)) {
      finCuerpo--;
    } else {
      break;
    }
  }

  const lineasCuerpoOriginales = lineasBrutas.slice(inicioCuerpo, finCuerpo);
  const textoCuerpoBruto = lineasCuerpoOriginales.join('\n').trim();
  const textoTodoPrevio = lineasBrutas.slice(0, idxInicioCuestionario).join('\n').trim();

  // 3. Distinguir si es SUPUESTO PRÁCTICO o TEST NORMAL
  const tieneKeywordsSupuesto =
    /(?:supuesto(?:\s+pr[aá]ctico)?|caso\s+pr[aá]ctico|prueba\s+pr[aá]ctica|planteamiento\s+del\s+caso|relato\s+(?:de\s+)?hechos|relato\s+f[aá]ctico)/i.test(
      textoTodoPrevio
    );

  const esInstruccionesPrueba =
    /^(?:instrucciones|el\s+tiempo|duraci[oó]n|cada\s+pregunta|las\s+respuestas\s+err[oó]neas\s+penalizan|dispone\s+de\s+\d+\s+minutos)/i.test(
      textoCuerpoBruto
    ) &&
    !/(?:don|doña|d\.|dª|funcionario|solicitud|resoluci[oó]n|expediente|contratista|ayuntamiento|ministerio|secretar[ií]a|concurso|adjudicaci[oó]n)/i.test(
      textoCuerpoBruto
    );

  const tieneTextoLargoInicial = textoCuerpoBruto.length >= 120 && !esInstruccionesPrueba;

  const esSupuesto = tieneKeywordsSupuesto || tieneTextoLargoInicial;
  const contextoCaso = esSupuesto && textoCuerpoBruto.length > 0 ? textoCuerpoBruto : undefined;

  let titulo = 'Examen Oficial';
  if (tituloExtraido) {
    titulo = tituloExtraido;
  } else if (esSupuesto) {
    titulo = 'Supuesto Práctico Oficial Importado';
  } else {
    titulo = 'Examen Oficial Tipo Test Importado';
  }

  // 4. Escanear y extraer exhaustivamente la plantilla de respuestas
  const {
    idxPlantilla,
    solucionesOrdinarias,
    solucionesReserva,
    anuladasOrdinarias,
    anuladasReserva,
    justificacionesOrdinarias,
    justificacionesReserva,
    ejemplosPracticosOrdinarios,
    ejemplosPracticosReserva,
    reglasMnemotecnicasOrdinarias,
    reglasMnemotecnicasReserva,
    distractoresOrdinarios,
    distractoresReserva,
    convocatoriasOrdinarias,
    convocatoriasReserva,
  } = extraerPlantillaDeRespuestasCompleta(lineasLimpias, idxInicioCuestionario);

  // 5. Procesar las preguntas del cuestionario
  const preguntas: PreguntaExamen[] = [];
  const finPreguntas = idxPlantilla !== -1 ? idxPlantilla : lineasLimpias.length;

  let enSeccionReserva = false;
  let contadorReserva = 1;
  let totalOrdinariasEncontradas = 0;
  let preguntaActual: {
    id: number;
    numeroReserva?: number;
    enunciado: string;
    esReserva: boolean;
    esAnulada: boolean;
    opciones: { id: 'A' | 'B' | 'C' | 'D'; texto: string; esCorrecta: boolean; explicacion: string }[];
    solucion?: 'A' | 'B' | 'C' | 'D';
    explicacion?: string;
    reglaMnemotecnica?: string;
    ejemploPractico?: string;
    analisisDistractores?: string;
    convocatoriasAparecida?: string;
  } | null = null;

  const cerrarPreguntaActual = () => {
    if (!preguntaActual || preguntaActual.opciones.length < 2) return;

    const esRes = preguntaActual.esReserva;
    let sol = preguntaActual.solucion;

    // Si no venía inline en la propia pregunta, buscar en la plantilla
    if (!sol) {
      if (esRes) {
        sol =
          (preguntaActual.numeroReserva ? solucionesReserva.get(preguntaActual.numeroReserva) : undefined) ||
          solucionesReserva.get(preguntaActual.id) ||
          solucionesOrdinarias.get(preguntaActual.id);
      } else {
        sol = solucionesOrdinarias.get(preguntaActual.id);
      }
    }

    // Vincular justificación oficial extraída de la plantilla si no tenía una explícita
    const justifPlantilla = esRes
      ? (preguntaActual.numeroReserva ? justificacionesReserva.get(preguntaActual.numeroReserva) : undefined) ||
        justificacionesReserva.get(preguntaActual.id)
      : justificacionesOrdinarias.get(preguntaActual.id);

    if (justifPlantilla && !preguntaActual.explicacion) {
      preguntaActual.explicacion = justifPlantilla;
    }

    const reglaPlantilla = esRes
      ? (preguntaActual.numeroReserva ? reglasMnemotecnicasReserva.get(preguntaActual.numeroReserva) : undefined) ||
        reglasMnemotecnicasReserva.get(preguntaActual.id)
      : reglasMnemotecnicasOrdinarias.get(preguntaActual.id);

    const ejPlantilla = esRes
      ? (preguntaActual.numeroReserva ? ejemplosPracticosReserva.get(preguntaActual.numeroReserva) : undefined) ||
        ejemplosPracticosReserva.get(preguntaActual.id)
      : ejemplosPracticosOrdinarios.get(preguntaActual.id);

    const distPlantilla = esRes
      ? (preguntaActual.numeroReserva ? distractoresReserva.get(preguntaActual.numeroReserva) : undefined) ||
        distractoresReserva.get(preguntaActual.id)
      : distractoresOrdinarios.get(preguntaActual.id);

    const convPlantilla = esRes
      ? (preguntaActual.numeroReserva ? convocatoriasReserva.get(preguntaActual.numeroReserva) : undefined) ||
        convocatoriasReserva.get(preguntaActual.id)
      : convocatoriasOrdinarias.get(preguntaActual.id);

    // Obtener regla mnemotécnica directamente del TXT (si existe en la plantilla o en la pregunta)
    let reglaMnemotecnicaFinal: string | undefined = undefined;
    const reglaCandidata = (preguntaActual.reglaMnemotecnica || reglaPlantilla || '').trim();
    if (reglaCandidata.length > 0) {
      reglaMnemotecnicaFinal = reglaCandidata;
    }

    let ejemploPracticoFinal: string | undefined = (preguntaActual.ejemploPractico || ejPlantilla || '').trim() || undefined;

    // Obtener análisis de distractores directamente del TXT (si no existe, queda vacío/undefined)
    let analisisDistractoresFinal: string | undefined = undefined;
    const distCandidato = (preguntaActual.analisisDistractores || distPlantilla || '').trim();
    if (distCandidato.length > 0) {
      analisisDistractoresFinal = distCandidato;
    }

    // Obtener historial de convocatorias / inédita directamente del TXT (si no existe, queda vacío/undefined)
    let convocatoriasFinal: string | undefined = undefined;
    const convCandidata = (preguntaActual.convocatoriasAparecida || convPlantilla || '').trim();
    if (convCandidata.length > 0) {
      convocatoriasFinal = convCandidata;
    }

    // Desglosar si la justificación contenía secciones incrustadas
    if (preguntaActual.explicacion) {
      const desglose = desglosarJustificacionEjemploYRegla(preguntaActual.explicacion);
      if (desglose.convocatoriasAparecida && !convocatoriasFinal) {
        convocatoriasFinal = desglose.convocatoriasAparecida.trim();
      }
      if (desglose.analisisDistractores && !analisisDistractoresFinal) {
        analisisDistractoresFinal = desglose.analisisDistractores.trim();
      }
      if (desglose.reglaMnemotecnica && !reglaMnemotecnicaFinal) {
        reglaMnemotecnicaFinal = desglose.reglaMnemotecnica.trim();
      }
      if (desglose.ejemploPractico && !ejemploPracticoFinal) {
        ejemploPracticoFinal = desglose.ejemploPractico.trim();
      }
      preguntaActual.explicacion = desglose.justificacion;
    }

    if (sol) {
      preguntaActual.opciones.forEach((o) => {
        o.esCorrecta = o.id === sol;
        if (o.esCorrecta && preguntaActual?.explicacion && !o.explicacion) {
          o.explicacion = preguntaActual.explicacion;
        }
      });
    } else {
      // Si la opción tenía una marca explícita (asterisco, (correcta), [x]), mantenerla
      const tieneCorrecta = preguntaActual.opciones.some((o) => o.esCorrecta);
      if (!tieneCorrecta && preguntaActual.opciones.length > 0) {
        const letraBalanceada = (['A', 'B', 'C', 'D'][(preguntaActual.id - 1) % 4]) as 'A' | 'B' | 'C' | 'D';
        const opc = preguntaActual.opciones.find((o) => o.id === letraBalanceada) || preguntaActual.opciones[0];
        opc.esCorrecta = true;
      }
    }

    const justificacionLegal = detectarFundamentacionLegal(
      preguntaActual.enunciado,
      contextoCaso,
      preguntaActual.explicacion
    );

    const esAnuladaDefinitiva =
      preguntaActual.esAnulada ||
      (esRes
        ? (preguntaActual.numeroReserva ? anuladasReserva.has(preguntaActual.numeroReserva) : false) ||
          anuladasReserva.has(preguntaActual.id)
        : anuladasOrdinarias.has(preguntaActual.id));

    if (!esRes) {
      totalOrdinariasEncontradas++;
    }

    // CRÍTICO: Si el fichero txt no tiene esta información, el cuadro queda estrictamente vacío (undefined).
    // No improvisar ni inventar ese texto.
    preguntas.push({
      id: preguntaActual.id,
      numeroReserva: preguntaActual.numeroReserva,
      enunciado: preguntaActual.enunciado.trim(),
      opciones: preguntaActual.opciones,
      esReserva: esRes,
      esAnulada: esAnuladaDefinitiva,
      justificacionLegal: {
        ...justificacionLegal,
        ejemploPractico: ejemploPracticoFinal,
      },
      ejemploPractico: ejemploPracticoFinal,
      reglaMnemotecnica: reglaMnemotecnicaFinal,
      analisisDistractores: analisisDistractoresFinal,
      convocatoriasAparecida: convocatoriasFinal,
    });
  };

  let enDistractoresInline = false;

  for (let i = idxInicioCuestionario; i < finPreguntas; i++) {
    const linea = lineasLimpias[i];
    if (!linea) continue;

    // Descartar encabezado del cuestionario si aparece al principio
    if (HEADER_CUESTIONARIO_REGEX.test(linea)) continue;

    // Detectar si comienza la sección de preguntas de reserva
    if (esEncabezadoReservaGeneral(linea)) {
      cerrarPreguntaActual();
      preguntaActual = null;
      enSeccionReserva = true;
      contadorReserva = 1;
      continue;
    }

    // Helper para añadir una opción a la pregunta actual procesando marcas inline
    const agregarOpcionAPregunta = (letra: 'A' | 'B' | 'C' | 'D', textoBruto: string, lineaRef?: string) => {
      if (!preguntaActual) return;
      let textoOpc = textoBruto.trim();

      // 1. Detectar si la opción contiene la solución declarada al final (ej: "d) 1 mes. Solución: C", "d) 1 mes. RC: C")
      const solEnOpcionMatch = textoOpc.match(
        /(?:[\-\.\,\;\—]?\s*(?:[\*\_\s]*)[\(\[]?\s*(?:\bSoluci[oó]n\b|\bSolucion\b|\bSol\b|\bRespuesta(?:\s+correcta)?\b|\bResp\b|\bRta\b|\bRpta\b|\bRC\b|\bR\s*[\:\-\=]|\bCorrecta\b|\bClave\b)[\*\_\s]*[\:\-\=\)]*[\*\_\s]*(?:(?:la\s+|es\s+la\s+|opci[oó]n\s+|letra\s+)?[\(\[]?\s*([A-Da-d])\s*[\)\]\.]?))/i
      );
      if (solEnOpcionMatch && solEnOpcionMatch[1]) {
        preguntaActual.solucion = solEnOpcionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        textoOpc = textoOpc.replace(solEnOpcionMatch[0], '').trim();
      }

      // 2. Comprobar si esta opción específica viene marcada como la correcta
      let esCorrecta = false;
      const refCompleto = (lineaRef || '') + ' ' + textoOpc;
      const esMarcada =
        textoOpc.startsWith('*') ||
        refCompleto.includes('- *') ||
        refCompleto.includes('• *') ||
        /\((?:correcta|correcto|soluci[oó]n|respuesta\s+correcta)\)/i.test(textoOpc) ||
        /\[(?:correcta|correcto|soluci[oó]n|respuesta\s+correcta)\]/i.test(textoOpc) ||
        /(?:\s+|^)\-\s*(?:correcta|correcto)\b/i.test(textoOpc) ||
        /\*+$/.test(textoOpc.trim()) ||
        /\(\s*\*\s*\)$/.test(textoOpc.trim()) ||
        /\[\s*\*\s*\]$/.test(textoOpc.trim()) ||
        /\[[xX✓✔]\]/i.test(refCompleto) ||
        /\([xX✓✔]\)/i.test(refCompleto) ||
        /[✓✔☑]/.test(refCompleto);

      if (esMarcada) {
        esCorrecta = true;
        textoOpc = textoOpc
          .replace(/\((?:correcta|correcto|soluci[oó]n|respuesta\s+correcta)\)/gi, '')
          .replace(/\[(?:correcta|correcto|soluci[oó]n|respuesta\s+correcta)\]/gi, '')
          .replace(/(?:\s+|^)\-\s*(?:correcta|correcto)\b/gi, '')
          .replace(/\*+$/, '')
          .replace(/^\*+\s*/, '')
          .replace(/\(\s*\*\s*\)$/, '')
          .replace(/\[\s*\*\s*\]$/, '')
          .replace(/\[[xX✓✔]\]/g, '')
          .replace(/\([xX✓✔]\)/g, '')
          .replace(/[✓✔☑]/g, '')
          .trim();
        preguntaActual.solucion = letra;
      }

      const idxExistente = preguntaActual.opciones.findIndex((o) => o.id === letra);
      if (idxExistente >= 0) {
        preguntaActual.opciones[idxExistente].texto = textoOpc;
        if (esCorrecta) preguntaActual.opciones[idxExistente].esCorrecta = true;
      } else {
        preguntaActual.opciones.push({
          id: letra,
          texto: textoOpc,
          esCorrecta,
          explicacion: '',
        });
      }
    };

    // Detectar si la línea es un inicio de nueva pregunta (ordinaria o de reserva)
    const candPreg = detectarCandidatoInicioPregunta(linea, preguntaActual, enSeccionReserva);
    if (candPreg) {
      let resto = candPreg.restoTexto;

      const tieneOpcionesMismaLinea =
        /(?:^|[\s\,\;\.\—]+)[\*\_\s]*[\(\[]?\s*[aA]\s*[\)\]\.\-\:]+\s+/.test(resto) &&
        /(?:^|[\s\,\;\.\—]+)[\*\_\s]*[\(\[]?\s*[bB]\s*[\)\]\.\-\:]+\s+/.test(resto);

      let esPreguntaReal = tieneOpcionesMismaLinea;
      if (!esPreguntaReal) {
        for (let j = i + 1; j < Math.min(finPreguntas, i + 15); j++) {
          if (parsearOpcionesDeLinea(lineasLimpias[j]).length > 0) {
            esPreguntaReal = true;
            break;
          }
          if (detectarCandidatoInicioPregunta(lineasLimpias[j], null, enSeccionReserva)) break;
        }
      }

      if (esPreguntaReal) {
        cerrarPreguntaActual();

        const esReserva = candPreg.esReserva || enSeccionReserva;
        let finalId = candPreg.numero;
        let finalNumReserva = candPreg.numeroReserva;

        if (esReserva) {
          finalNumReserva = finalNumReserva || (candPreg.numero <= 10 && candPreg.numero >= 1 ? candPreg.numero : contadorReserva);
          finalId = candPreg.numero > totalOrdinariasEncontradas ? candPreg.numero : totalOrdinariasEncontradas + finalNumReserva;
          contadorReserva++;
        }

        const esAnulada =
          /ANULAD[AO]|CANCELAD[AO]|SIN\s+EFECTO/i.test(linea) ||
          /ANULAD[AO]|CANCELAD[AO]|SIN\s+EFECTO/i.test(resto) ||
          (esReserva
            ? (finalNumReserva ? anuladasReserva.has(finalNumReserva) : false) || anuladasReserva.has(finalId)
            : anuladasOrdinarias.has(finalId));

        let enunciadoFinal = resto;
        let opcionesInline: OpcionDetectada[] = [];

        if (tieneOpcionesMismaLinea) {
          const idxA = resto.search(/(?:^|[\s\,\;\.\—]+)[\*\_\s]*[\(\[]?\s*[aA]\s*[\)\]\.\-\:]+\s+/);
          if (idxA !== -1) {
            enunciadoFinal = resto.substring(0, idxA).trim();
            opcionesInline = parsearOpcionesDeLinea(resto.substring(idxA).trim());
          }
        }

        preguntaActual = {
          id: finalId,
          numeroReserva: finalNumReserva,
          enunciado: enunciadoFinal,
          esReserva,
          esAnulada,
          opciones: [],
        };

        if (opcionesInline.length > 0) {
          for (const opc of opcionesInline) {
            agregarOpcionAPregunta(opc.letra, opc.texto, resto);
          }
        }
        continue;
      }
    }

    // Detectar clave directa de solución inline: "20.b", "1.a", "R1.b"
    const claveDirectaMatch = linea.match(/^(?:(?:pregunta|p\.?|item)\s*)?#?(?:\d{1,3}|R\d{1,2})\s*[\.\-\:\)\=\/]\s*([A-Da-d])\s*$/i);
    if (claveDirectaMatch && preguntaActual) {
      preguntaActual.solucion = claveDirectaMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      enDistractoresInline = false;
      continue;
    }

    // Detectar análisis de distractores / errores del tribunal (epígrafe "distractor:")
    const distMatch = linea.match(
      /^(?:distractor(?:es)?|an[aá]lisis\s+(?:de\s+)?distractor(?:es)?|error(?:es)?\s+distractor(?:es)?|trampas?(?:\s+del\s+tribunal)?)[\s\:\-]*(.*)$/i
    );
    if (distMatch && preguntaActual) {
      enDistractoresInline = true;
      const textoDist = distMatch[1].trim();
      if (textoDist) {
        const matchDistItem = textoDist.match(/^([\-\*\•\s]*[A-Da-d][\s\:\)\.\-]+)\s*\[(.*)\]\s*$/);
        const textoLimpio = matchDistItem
          ? `${matchDistItem[1].trim()} ${matchDistItem[2].trim()}`
          : limpiarBracketsPlantilla(textoDist);
        preguntaActual.analisisDistractores = (preguntaActual.analisisDistractores ? preguntaActual.analisisDistractores + '\n' : '') + textoLimpio;
      }
      continue;
    }

    // Si estamos en la sección de distractores inline, acumular viñetas tipo "- a) [Error...]" o "a) [Error...]"
    if (enDistractoresInline && preguntaActual) {
      const distItemMatch = linea.match(/^([\-\*\•\s]*[A-Da-d][\s\:\)\.\-]+)(.*)$/);
      if (distItemMatch) {
        let textoItem = distItemMatch[2].trim();
        if (textoItem.startsWith('[') && textoItem.endsWith(']')) {
          textoItem = textoItem.slice(1, -1).trim();
        }
        const itemFormateado = `${distItemMatch[1].trim()} ${textoItem}`;
        preguntaActual.analisisDistractores = (preguntaActual.analisisDistractores ? preguntaActual.analisisDistractores + '\n' : '') + itemFormateado;
        continue;
      }
    }

    // Detectar convocatoria oficial o singularidad inédita (epígrafe "convocatoria:")
    const convMatch = linea.match(
      /^(?:convocatoria(?:s)?(?:\s+oficial(?:es)?)?|origen\s+convocatoria|aparici[oó]n|a[ñn]o\s+convocatoria)[\s\:\-]*(.*)$/i
    );
    if (convMatch && preguntaActual) {
      enDistractoresInline = false;
      preguntaActual.convocatoriasAparecida = limpiarBracketsPlantilla(convMatch[1]);
      continue;
    }

    // Detectar explicación, justificación oficial o fundamentación legal
    const expMatch = linea.match(
      /^(?:justificaci[oó]n(?:\s+oficial|\s+legal)?|argumentaci[oó]n(?:\s+legal)?|fundamentaci[oó]n(?:\s+legal|\s+boe)?|explicaci[oó]n|fundamento|art[íi]culo)[\s\:\-]*(.*)$/i
    );
    if (expMatch && preguntaActual) {
      enDistractoresInline = false;
      preguntaActual.explicacion = limpiarBracketsPlantilla(expMatch[1]);
      continue;
    }

    // Detectar ejemplo práctico o aplicación al caso concreto
    const ejMatch = linea.match(
      /^(?:ejemplo\s+pr[aá]ctico|caso\s+pr[aá]ctico|aplicaci[oó]n(?:\s+pr[aá]ctica|\s+al\s+caso)?|supuesto\s+pr[aá]ctico)[\s\:\-]*(.*)$/i
    );
    if (ejMatch && preguntaActual) {
      enDistractoresInline = false;
      preguntaActual.ejemploPractico = limpiarBracketsPlantilla(ejMatch[1]);
      continue;
    }

    // Detectar regla mnemotécnica, fórmula visual o esquema rápido de 2 líneas
    const reglaMatch = linea.match(
      /^(?:regla\s+mnemot[eé]cnica|mnemot[eé]cnia|regla|f[oó]rmula(?:\s+visual)?|esquema(?:\s+r[aá]pido)?|truco)[\s\:\-]*(.*)$/i
    );
    if (reglaMatch && preguntaActual) {
      enDistractoresInline = false;
      preguntaActual.reglaMnemotecnica = limpiarBracketsPlantilla(reglaMatch[1]);
      continue;
    }

    // Detectar opciones: individuales o agrupadas en la línea (ej: "a) ... b) ... c) ... d) ...")
    const opcionesEnLinea = parsearOpcionesDeLinea(linea);
    if (opcionesEnLinea.length > 0 && preguntaActual && !enDistractoresInline) {
      for (const opc of opcionesEnLinea) {
        agregarOpcionAPregunta(opc.letra, opc.texto, linea);
      }
      continue;
    }

    // Detectar si la pregunta está marcada como anulada inline: "Solución: ANULADA", "RC: ANULADA"
    const solAnulMatch = linea.match(
      /^(?:[\*\_\-\s\•\>]*)[\(\[]?\s*(?:\bSoluci[oó]n\b|\bSolucion\b|\bSol\b|\bRespuesta(?:\s+correcta)?\b|\bRC\b|\bR\s*[\:\-\=]|\bResp\b|\bRta\b|\bRpta\b|\bCorrecta\b)[\*\_\s]*[\:\-\=\)]*[\*\_\s]*(?:ANULAD[AO]|CANCELAD[AO]|SIN\s+EFECTO|MODIFICADA)\b/i
    );
    if (solAnulMatch && preguntaActual) {
      preguntaActual.esAnulada = true;
      continue;
    }

    // Detectar solución inline bajo la pregunta: "Solución: B", "**Solución:** B", "RC: C", "Sol: D", etc.
    const solMatch = linea.match(
      /^(?:[\*\_\-\s\•\>]*)[\(\[]?\s*(?:\bSoluci[oó]n\b|\bSolucion\b|\bSol\b|\bRespuesta(?:\s+correcta)?\b|\bResp\b|\bRta\b|\bRpta\b|\bRC\b|\bR\s*[\:\-\=]|\bCorrecta\b|\bClave\b|\bOpci[oó]n\s+correcta\b)[\*\_\s]*[\:\-\=\)]*[\*\_\s]*(?:(?:la\s+|es\s+la\s+|opci[oó]n\s+|letra\s+)?[\(\[]?\s*([A-Da-d])\s*[\)\]\.\,]?)(.*)$/i
    );
    if (solMatch && preguntaActual) {
      preguntaActual.solucion = solMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const restoExplicacion = solMatch[2]?.trim();
      if (restoExplicacion && restoExplicacion.length > 5 && !preguntaActual.explicacion) {
        preguntaActual.explicacion = limpiarBracketsPlantilla(restoExplicacion.replace(/^[\.\-\:\;\s]+/, '').trim());
      }
      continue;
    }

    // Si estamos en una pregunta pero antes de las opciones, es continuación del enunciado
    if (preguntaActual && preguntaActual.opciones.length === 0) {
      preguntaActual.enunciado += ' ' + linea;
      continue;
    }

    // Si estamos dentro de una opción y no en metadatos, es continuación multilínea del texto de la última opción
    if (preguntaActual && preguntaActual.opciones.length > 0 && !enDistractoresInline) {
      preguntaActual.opciones[preguntaActual.opciones.length - 1].texto += ' ' + linea;
    }
  }

  // Cerrar la última pregunta
  cerrarPreguntaActual();

  if (preguntas.length === 0) return null;

  // Asignar numeración de reserva secuencial si se detectaron preguntas de reserva
  const reservasDetectadas = preguntas.filter((p) => p.esReserva).length;
  if (reservasDetectadas > 0) {
    let rNum = 1;
    preguntas.forEach((p) => {
      if (p.esReserva) {
        if (!p.numeroReserva) {
          p.numeroReserva = rNum;
        }
        rNum++;
      }
    });
  }


  // Separar y ordenar: ordinarias primero y reservas después
  const ordinarias = preguntas.filter((p) => !p.esReserva);
  const reservas = preguntas.filter((p) => p.esReserva);
  const preguntasOrdenadas = [...ordinarias, ...reservas];

  // Aplicar el algoritmo oficial de sustitución ordenada de preguntas anuladas por las de reserva
  const { preguntasActualizadas } = resolverSustitucionesDeReserva(preguntasOrdenadas);

  // 6. Detectar temáticas y leyes aplicadas
  const todoElTexto = `${titulo} ${contextoCaso || ''} ${preguntasActualizadas.map((p) => p.enunciado).join(' ')}`.toLowerCase();
  const tematicas = new Set<TematicaNormativaId>();
  const leyesAplicadas = new Set<string>();

  if (
    /funcionari|personal|trienio|excedencia|sanci[oó]n|trebep|364\/1995|365\/1995|emplead|provisi[oó]n|carrera|concurso/i.test(
      todoElTexto
    )
  ) {
    tematicas.add('funcion_publica_personal');
    leyesAplicadas.add('Real Decreto Legislativo 5/2015 (TREBEP)');
    if (todoElTexto.includes('364/1995')) leyesAplicadas.add('Real Decreto 364/1995');
    if (todoElTexto.includes('365/1995')) leyesAplicadas.add('Real Decreto 365/1995');
  }

  if (/presupuest|gasto|cr[eé]dito|lgp|47\/2003|contabilidad|hacienda/i.test(todoElTexto)) {
    tematicas.add('presupuestos_hacienda');
    leyesAplicadas.add('Ley 47/2003, General Presupuestaria');
  }

  if (/contrat|licitaci[oó]n|pliego|adjudicaci[oó]n|9\/2017|lcsp/i.test(todoElTexto)) {
    tematicas.add('contratos_sector_publico');
    leyesAplicadas.add('Ley 9/2017, de Contratos del Sector Público');
  }

  if (/datos|lopdgdd|3\/2018|transparencia|19\/2013|acceso\s+a\s+la\s+informaci[oó]n/i.test(todoElTexto)) {
    tematicas.add('transparencia_datos');
    if (todoElTexto.includes('3/2018') || todoElTexto.includes('lopdgdd')) {
      leyesAplicadas.add('Ley Orgánica 3/2018 (LOPDGDD)');
    }
  }

  if (/constituci[oó]n|corona|cortes\s+generales|gobierno|ministerio|senado|congreso/i.test(todoElTexto)) {
    tematicas.add('constitucion_organizacion');
    leyesAplicadas.add('Constitución Española de 1978');
  }

  if (
    /procedimiento|recurso|acto\s+administrativo|silencio|notificaci[oó]n|39\/2015/i.test(todoElTexto) ||
    tematicas.size === 0
  ) {
    tematicas.add('procedimiento_administrativo');
    leyesAplicadas.add('Ley 39/2015 (LPACAP)');
  }

  if (/40\/2015|r[eé]gimen\s+jur[ií]dico\s+del\s+sector\s+p[uú]blico/i.test(todoElTexto)) {
    tematicas.add('regimen_sector_publico');
    leyesAplicadas.add('Ley 40/2015 (LRJSP)');
  }

  const ambito: 'AGE' | 'CAM' = /comunidad\s+de\s+madrid|\bcam\b|asamblea\s+de\s+madrid/i.test(todoElTexto)
    ? 'CAM'
    : 'AGE';

  const tipoFinal: TipoPrueba = esSupuesto ? 'supuesto' : 'unitario';
  const categoriaFinal: CategoriaExamen = deducirCategoriaExamen(tipoFinal, 'oficial_json');

  return {
    id: `TXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    titulo,
    tipo: tipoFinal,
    categoria: categoriaFinal,
    ambito,
    origen: 'oficial_json',
    fecha: new Date().toISOString().split('T')[0],
    contextoCaso,
    tematicas: Array.from(tematicas),
    leyesBOEAplicadas: leyesAplicadas.size > 0 ? Array.from(leyesAplicadas) : ['Legislación consolidada en www.boe.es'],
    preguntas: preguntasActualizadas,
    anotaciones: [],
  };
}

export interface AuditoriaExamenImportado {
  examen: ExamenCompleto;
  totalPreguntas: number;
  totalOrdinarias: number;
  totalReservas: number;
  totalClavesPlantilla: number;
  clavesMuestra: { num: number; letra: 'A' | 'B' | 'C' | 'D' }[];
  porcentajePlantillaEmparejada: number;
  tipoDetectado: TipoPrueba;
  categoriaSugerida: CategoriaExamen;
  ambitoDetectado: ConvocatoriaAmbito;
  tienePlantilla: boolean;
}

/**
 * Audita y desglosa el contenido de un texto importado (.txt o .json)
 * devolviendo el examen estructurado, las métricas de preguntas y la plantilla de soluciones.
 */
export function auditarExamenDesdeTexto(
  rawText: string,
  opciones?: OpcionesParseoExamen
): AuditoriaExamenImportado {
  const res = parsearTextoOArchivoJSON(rawText, opciones);
  const examen = Array.isArray(res) ? res[0] : res;

  // Extraer información de plantilla
  const lineasLimpias = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map((l) => l.trim());
  const infoPlantilla = extraerPlantillaDeRespuestasCompleta(lineasLimpias);

  const totalClaves = infoPlantilla.solucionesOrdinarias.size + infoPlantilla.solucionesReserva.size;
  const clavesMuestra: { num: number; letra: 'A' | 'B' | 'C' | 'D' }[] = [];

  const ordSorted = Array.from(infoPlantilla.solucionesOrdinarias.entries()).sort(([a], [b]) => a - b);
  ordSorted.slice(0, 100).forEach(([num, letra]) => {
    clavesMuestra.push({ num, letra });
  });

  let preguntasEmparejadas = 0;
  examen.preguntas.forEach((p) => {
    const sol = p.esReserva
      ? (p.numeroReserva ? infoPlantilla.solucionesReserva.get(p.numeroReserva) : undefined) ||
        infoPlantilla.solucionesReserva.get(p.id) ||
        infoPlantilla.solucionesOrdinarias.get(p.id)
      : infoPlantilla.solucionesOrdinarias.get(p.id);
    if (sol) preguntasEmparejadas++;
  });

  const totalP = examen.preguntas.length;
  const porcentaje = totalP > 0 ? Math.round((preguntasEmparejadas / totalP) * 100) : 0;
  const ordinarias = examen.preguntas.filter((p) => !p.esReserva).length;
  const reservas = examen.preguntas.filter((p) => p.esReserva).length;

  return {
    examen,
    totalPreguntas: totalP,
    totalOrdinarias: ordinarias,
    totalReservas: reservas,
    totalClavesPlantilla: totalClaves,
    clavesMuestra,
    porcentajePlantillaEmparejada: totalClaves > 0 ? porcentaje : 100,
    tipoDetectado: examen.tipo,
    categoriaSugerida: examen.categoria || deducirCategoriaExamen(examen.tipo, examen.origen),
    ambitoDetectado: examen.ambito,
    tienePlantilla: totalClaves > 0,
  };
}

/**
 * Exporta un examen individual a un archivo .json estructurado
 */

/**
 * Guarda un archivo en el dispositivo del usuario permitiendo elegir en qué carpeta
 * guardarlo mediante File System Access API (showSaveFilePicker).
 * Si el navegador no dispone de esta API (o en caso de error no abortivo),
 * recurre limpiamente a la descarga mediante enlace estándar <a download>.
 */
export async function guardarArchivoConSelectorCarpeta(
  dataString: string,
  nombreSugerido: string,
  mimeType: string = 'application/json',
  _extension: string = '.json'
): Promise<boolean> {
  // Validar integridad sintáctica antes de disparar cualquier descarga JSON
  if (mimeType.includes('json')) {
    JSON.parse(dataString);
  }
  const blob = new Blob([dataString], { type: `${mimeType};charset=utf-8` });
  return descargarBlobConObjectURL(blob, nombreSugerido);
}

/**
 * Exporta un examen individual a un archivo .json compacto mediante Blob + URL.createObjectURL,
 * incluyendo los enlaces web y ficheros locales de argumentación de cada pregunta
 * así como los datos de la sección Almacén de Dudas.
 */
export async function exportarExamenAJSON(
  examen: ExamenCompleto,
  almacenDudasOpcional?: ItemAlmacenDuda[]
): Promise<boolean> {
  const almacenDudas: ItemAlmacenDuda[] =
    almacenDudasOpcional && almacenDudasOpcional.length > 0
      ? almacenDudasOpcional
      : leerDatoPersistenteSincrono<ItemAlmacenDuda[]>('c1_almacen_dudas', []);

  const almacenDudasEnriquecido = almacenDudas.map((it) => {
    const rec = obtenerRecursosArgumentacionDePregunta(it);
    return rec.length > 0 ? { ...it, recursosArgumentacion: rec } : it;
  });

  const payloadExportacion: FormatoExamenJSONOficial = {
    id: examen.id,
    titulo: examen.titulo,
    tipo: examen.tipo,
    categoria: examen.categoria,
    ambito: examen.ambito,
    descripcion: (examen as any).descripcion || '',
    contextoCaso: examen.contextoCaso,
    leyesBOEAplicadas: examen.leyesBOEAplicadas,
    preguntas: examen.preguntas.map((p) => {
      const recursos = obtenerRecursosArgumentacionDePregunta(p);
      return {
        id: p.id,
        enunciado: p.enunciado,
        opciones: p.opciones,
        justificacionLegal: p.justificacionLegal,
        tematica: p.tematica,
        esReserva: p.esReserva,
        numeroReserva: p.numeroReserva,
        esAnulada: p.esAnulada,
        sustituidaPorReservaId: p.sustituidaPorReservaId,
        sustituyeAPreguntaId: p.sustituyeAPreguntaId,
        activaEnEvaluacion: p.activaEnEvaluacion,
        ejemploPractico: p.ejemploPractico,
        reglaMnemotecnica: p.reglaMnemotecnica,
        analisisDistractores: p.analisisDistractores,
        convocatoriasAparecida: p.convocatoriasAparecida,
        leyesRelacionadas: p.leyesRelacionadas,
        codigoInedita: p.codigoInedita,
        recursosArgumentacion: recursos.length > 0 ? recursos : undefined,
      };
    }),
    resaltadosYNotas: (examen.anotaciones || []).map((an) => ({
      id: an.id,
      seccion: an.seccion,
      preguntaId: an.preguntaId,
      opcionId: an.opcionId,
      textoSeleccionado: an.textoSeleccionado,
      color: an.color,
      comentario: an.comentario || '',
      timestamp: an.timestamp,
    })),
    resultado: examen.resultado,
    almacenDudas: almacenDudasEnriquecido,
    bibliotecaDocumentos: leerBibliotecaDocumentosDeLocalStorage(),
    subtemasBiblioteca: leerSubtemasBibliotecaDeLocalStorage(),
    recursosArgumentacionPorPregunta: leerMapaRecursosArgumentacionGlobal(),
  };

  const payloadCompacto = limpiarPropiedadesRedundantes(payloadExportacion);
  const dataString = JSON.stringify(payloadCompacto);
  const safeTitle = (examen.titulo || 'Examen')
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_')
    .substring(0, 35);
  const nombreSugerido = `Test_C1_${safeTitle}_${new Date().toISOString().split('T')[0]}.json`;

  return await guardarArchivoConSelectorCarpeta(dataString, nombreSugerido, 'application/json', '.json');
}

/**
 * Exporta una colección de exámenes a .json compacto mediante Blob + ObjectURL.
 */
export async function exportarBibliotecaAJSON(
  examenes: ExamenCompleto[],
  almacenDudasOpcional?: ItemAlmacenDuda[]
): Promise<boolean> {
  if (examenes.length === 0) {
    console.warn('No hay exámenes en la biblioteca para exportar.');
    return false;
  }

  const almacenDudas: ItemAlmacenDuda[] =
    almacenDudasOpcional && almacenDudasOpcional.length > 0
      ? almacenDudasOpcional
      : leerDatoPersistenteSincrono<ItemAlmacenDuda[]>('c1_almacen_dudas', []);

  const examenesEnriquecidos = examenes.map((ex, idx) => ({
    ...ex,
    preguntas: ex.preguntas.map((p) => {
      const rec = obtenerRecursosArgumentacionDePregunta(p);
      return rec.length > 0 ? { ...p, recursosArgumentacion: rec } : p;
    }),
    ...(idx === 0
      ? {
          almacenDudas,
          bibliotecaDocumentos: leerBibliotecaDocumentosDeLocalStorage(),
          subtemasBiblioteca: leerSubtemasBibliotecaDeLocalStorage(),
          recursosArgumentacionPorPregunta: leerMapaRecursosArgumentacionGlobal(),
        }
      : {}),
  }));

  const dataString = JSON.stringify(limpiarPropiedadesRedundantes(examenesEnriquecidos));
  const nombreSugerido = `Biblioteca_Examenes_C1_${new Date().toISOString().split('T')[0]}.json`;
  return await guardarArchivoConSelectorCarpeta(dataString, nombreSugerido, 'application/json', '.json');
}

export type ModalidadExportacionCopia = 'completa' | 'solo_progreso' | 'seleccion_examenes';
export type FormatoExportacionCopia = 'json_gz' | 'json';

export interface ResumenCopiaSeguridadExportada {
  modalidad: ModalidadExportacionCopia;
  formato: FormatoExportacionCopia;
  verificadoContraIDB: boolean;
  totalBancoExamenes: number;
  totalPreguntasBanco: number;
  totalHistorialPruebas: number;
  totalDudasAlmacen: number;
  totalDocumentosBiblioteca: number;
  totalSubtemasBiblioteca: number;
  totalRecursosArgumentacion: number;
  totalAnotaciones: number;
  totalPreguntasControlFalladas: number;
  tamanoSinComprimirBytes: number;
  tamanoBytes: number;
  porcentajeReduccion: number;
  nombreArchivo: string;
}

export interface CopiaSeguridadIntegral {
  tipo: 'copia_seguridad_simulador_c1';
  version: '3.8' | '3.7' | '3.2' | '2.6' | '2.5';
  modalidadExportacion?: ModalidadExportacionCopia;
  fecha: string;
  metadata: {
    modalidad?: ModalidadExportacionCopia;
    totalBancoExamenes: number;
    totalPreguntasBanco?: number;
    totalHistorialPruebas: number;
    totalExamenes?: number;
    totalAnotaciones: number;
    totalDudasAlmacen?: number;
    totalDocumentosBiblioteca?: number;
    totalSubtemasBiblioteca?: number;
    totalRecursosArgumentacion?: number;
    totalPreguntasControlFalladas?: number;
    timestamp: number;
  };
  bancoExamenes: ExamenCompleto[];
  historialPruebas: ExamenCompleto[];
  examenesGuardados?: ExamenCompleto[];
  anotacionesPorExamen: Record<string, any[]>;
  almacenDudas: ItemAlmacenDuda[];
  /** Base de datos de enlaces a documentos locales o webs externas (NUNCA almacena archivos binarios) */
  bibliotecaDocumentos: DocumentoBibliotecaItem[];
  subtemasBiblioteca: string[];
  recursosArgumentacionPorPregunta: Record<string, RecursoArgumentacionPregunta[]>;
  controlPreguntasSuperadas: Record<string, any>;
  examenesEliminadosIds: string[];
  historialPreguntasRecientes: string[];
  testsDescargadosPDF: any[];
  sesionExamenActiva?: any;
  clavesAdicionalesLocalStorage?: Record<string, string>;
  configuracion: {
    darkMode?: boolean;
    autoAvanceAlFinal?: boolean;
    cortePropioTest?: string;
    cortePropioSupuesto?: string;
    usarCortePropio?: boolean;
    geminiApiKey?: string;
    geminiSelectedModel?: string;
    modoLecturaTamano?: string;
  };
}

/**
 * Detecta si un texto JSON corresponde a un fichero de Copia de Seguridad Integral
 * (completa, solo progreso o parcial por bloques/exámenes).
 */
export function esArchivoCopiaSeguridadIntegral(rawText: string): boolean {
  if (!rawText || rawText.length < 20) return false;
  try {
    const cleaned = limpiarTextoJSON(rawText);
    if (!cleaned.startsWith('{')) return false;
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return false;
    return (
      parsed.tipo === 'copia_seguridad_simulador_c1' ||
      (Array.isArray(parsed.bancoExamenes) && Array.isArray(parsed.historialPruebas))
    );
  } catch (_) {
    return false;
  }
}

export interface OpcionesExportacionCopiaAvanzada {
  modalidad: ModalidadExportacionCopia;
  formato: FormatoExportacionCopia;
  bancoExamenes: ExamenCompleto[];
  historialPruebas?: ExamenCompleto[];
  almacenDudas?: ItemAlmacenDuda[];
  bibliotecaDocumentos?: DocumentoBibliotecaItem[];
  subtemasBiblioteca?: string[];
  examenesEliminadosIds?: string[];
  idsExamenesSeleccionados?: string[];
  etiquetaBloqueOSeleccion?: string;
}

/**
 * Motor unificado de Exportación de Copias de Seguridad v3.8:
 * - 3 Modalidades:
 *   1. 'completa' (.json.gz y .json): Banco completo + Historial + Anotaciones + Dudas + Biblioteca + Configuración.
 *   2. 'solo_progreso' (.json ultraligero y .json.gz): Excluye el banco de preguntas y guarda únicamente
 *      historialPruebas, estadísticas/controlPreguntasSuperadas, fallos, dudas, anotaciones, biblioteca y configuración.
 *   3. 'seleccion_examenes' (.json y .json.gz): Exporta exclusivamente los bloques o exámenes marcados por el usuario.
 * - Serialización compacta (JSON.stringify sin espacios) y limpieza de propiedades vacías/redundantes.
 * - Validación interna previa a la descarga: JSON.parse íntegro + verificación 100% contra IndexedDB.
 * - Descarga mediante Blob + URL.createObjectURL(blob) con liberación en 1000ms (0% data:text/json).
 */
export async function exportarCopiaSeguridadAvanzada(
  opciones: OpcionesExportacionCopiaAvanzada
): Promise<{ ok: boolean; resumen: ResumenCopiaSeguridadExportada }> {
  const {
    modalidad,
    formato,
    bancoExamenes: bancoOExamenes,
    historialPruebas: historialOpcional,
    almacenDudas: almacenDudasOpcional,
    bibliotecaDocumentos: bibliotecaDocumentosOpcional,
    subtemasBiblioteca: subtemasBibliotecaOpcional,
    examenesEliminadosIds: examenesEliminadosOpcional,
    idsExamenesSeleccionados,
    etiquetaBloqueOSeleccion,
  } = opciones;

  if (formato === 'json_gz' && !soportaCompresionGzipNativa()) {
    throw new Error('Este navegador no soporta CompressionStream("gzip"). Descarga la copia en formato .json estándar.');
  }

  // 1. Consolidar IDs de exámenes eliminados
  const eliminadosPersistidos = leerDatoPersistenteSincrono<string[]>('c1_examenes_eliminados', []);
  const examenesEliminadosIds = Array.from(
    new Set([
      ...(Array.isArray(eliminadosPersistidos) ? eliminadosPersistidos : []),
      ...(Array.isArray(examenesEliminadosOpcional) ? examenesEliminadosOpcional : []),
    ])
  );
  const setEliminados = new Set(examenesEliminadosIds);

  // 2. Consolidar mapa global de recursos de argumentación
  const mapaRecursosGlobal: Record<string, RecursoArgumentacionPregunta[]> = {
    ...leerMapaRecursosArgumentacionGlobal(),
  };

  const registrarRecursosDeItem = (enunciado?: string, lista?: RecursoArgumentacionPregunta[]) => {
    if (!enunciado || !Array.isArray(lista) || lista.length === 0) return;
    const clave = normalizarClaveRecursoPregunta(enunciado);
    if (!clave) return;
    const existentes = Array.isArray(mapaRecursosGlobal[clave]) ? mapaRecursosGlobal[clave] : [];
    const vistos = new Set<string>();
    const combinados: RecursoArgumentacionPregunta[] = [];
    for (const r of [...existentes, ...lista]) {
      if (!r || !r.url) continue;
      const k = `${r.id || ''}|${r.tipo}|${r.titulo}|${r.url}`;
      if (!vistos.has(k)) {
        vistos.add(k);
        combinados.push(r);
      }
    }
    if (combinados.length > 0) {
      mapaRecursosGlobal[clave] = combinados;
    }
  };

  // 3. Consolidar todas las anotaciones y subrayados por examen
  const anotacionesTodas: Record<string, any[]> = {
    ...recopilarTodasLasAnotacionesPersistidas(),
  };

  const enriquecerExamenCompleto = (ex: ExamenCompleto): ExamenCompleto => {
    const preguntasEnriquecidas = (ex.preguntas || []).map((p) => {
      if (Array.isArray(p.recursosArgumentacion) && p.recursosArgumentacion.length > 0) {
        registrarRecursosDeItem(p.enunciado, p.recursosArgumentacion);
      }
      const clave = normalizarClaveRecursoPregunta(p.enunciado);
      const rec =
        clave && Array.isArray(mapaRecursosGlobal[clave])
          ? mapaRecursosGlobal[clave]
          : p.recursosArgumentacion;
      return rec && rec.length > 0 ? { ...p, recursosArgumentacion: rec } : p;
    });

    const notasExamen =
      Array.isArray(ex.anotaciones) && ex.anotaciones.length > 0
        ? ex.anotaciones
        : Array.isArray(anotacionesTodas[ex.id])
        ? anotacionesTodas[ex.id]
        : undefined;

    if (notasExamen && notasExamen.length > 0 && !anotacionesTodas[ex.id]) {
      anotacionesTodas[ex.id] = notasExamen;
    }

    return {
      ...ex,
      preguntas: preguntasEnriquecidas,
      anotaciones: notasExamen,
    };
  };

  // 4. Consolidar Banco de Exámenes íntegro
  const mapaBanco = new Map<string, ExamenCompleto>();
  EXAMENES_PRECARGADOS_OFICIALES.forEach((prec) => {
    if (prec && prec.id && !setEliminados.has(prec.id)) {
      mapaBanco.set(prec.id, asegurarSeparacionYNormativaReserva(prec));
    }
  });

  const bancoPersistido = leerDatoPersistenteSincrono<ExamenCompleto[]>('c1_banco_examenes', []);
  if (Array.isArray(bancoPersistido)) {
    bancoPersistido.forEach((ex) => {
      if (ex && ex.id && !setEliminados.has(ex.id)) {
        mapaBanco.set(ex.id, ex);
      }
    });
  }

  const bancoEntrada =
    historialOpcional !== undefined
      ? bancoOExamenes
      : (bancoOExamenes || []).filter((e) => !e.resultado);

  (bancoEntrada || []).forEach((ex) => {
    if (ex && ex.id && !setEliminados.has(ex.id)) {
      mapaBanco.set(ex.id, ex);
    }
  });

  const bancoConsolidadoCompleto = Array.from(mapaBanco.values()).map(enriquecerExamenCompleto);

  // 5. Consolidar Historial de Pruebas Realizadas íntegro
  const mapaHistorial = new Map<string, ExamenCompleto>();
  const historialPersistido = leerDatoPersistenteSincrono<ExamenCompleto[]>('c1_historial_pruebas', []);
  if (Array.isArray(historialPersistido)) {
    historialPersistido.forEach((h) => {
      if (h && h.id) mapaHistorial.set(h.id, h);
    });
  }

  const historialEntrada =
    historialOpcional !== undefined
      ? historialOpcional
      : (bancoOExamenes || []).filter((e) => !!e.resultado);

  (historialEntrada || []).forEach((h) => {
    if (h && h.id) mapaHistorial.set(h.id, h);
  });

  const historialConsolidadoCompleto = Array.from(mapaHistorial.values()).map(enriquecerExamenCompleto);

  // 6. Consolidar Almacén de Dudas y Biblioteca
  const dudasBase =
    almacenDudasOpcional !== undefined
      ? almacenDudasOpcional
      : leerDatoPersistenteSincrono<ItemAlmacenDuda[]>('c1_almacen_dudas', []);

  const mapaDudas = new Map<string, ItemAlmacenDuda>();
  (dudasBase || []).forEach((it) => {
    if (it && it.id) mapaDudas.set(it.id, it);
  });
  if (mapaDudas.size === 0 && almacenDudasOpcional !== undefined) {
    const dudasPersistidas = leerDatoPersistenteSincrono<ItemAlmacenDuda[]>('c1_almacen_dudas', []);
    if (Array.isArray(dudasPersistidas)) {
      dudasPersistidas.forEach((it) => {
        if (it && it.id) mapaDudas.set(it.id, it);
      });
    }
  }

  const almacenDudasCompleto = Array.from(mapaDudas.values()).map((it) => {
    if (Array.isArray(it.recursosArgumentacion) && it.recursosArgumentacion.length > 0) {
      registrarRecursosDeItem(it.enunciado, it.recursosArgumentacion);
    }
    const clave = normalizarClaveRecursoPregunta(it.enunciado);
    const rec =
      clave && Array.isArray(mapaRecursosGlobal[clave])
        ? mapaRecursosGlobal[clave]
        : it.recursosArgumentacion;
    return rec && rec.length > 0 ? { ...it, recursosArgumentacion: rec } : it;
  });

  const docsOrigen =
    bibliotecaDocumentosOpcional !== undefined && bibliotecaDocumentosOpcional.length > 0
      ? bibliotecaDocumentosOpcional
      : leerBibliotecaDocumentosDeLocalStorage();

  const mapaDocsBib = new Map<string, DocumentoBibliotecaItem>();
  (docsOrigen || []).forEach((d) => {
    if (d) {
      const limpio = sanitizarDocumentoBibliotecaSinBinarios(d);
      mapaDocsBib.set(limpio.id, limpio);
    }
  });
  const bibliotecaDocumentosCompleta = Array.from(mapaDocsBib.values());

  const subtemasCompleta =
    subtemasBibliotecaOpcional !== undefined && subtemasBibliotecaOpcional.length > 0
      ? guardarSubtemasBibliotecaEnLocalStorage(subtemasBibliotecaOpcional)
      : leerSubtemasBibliotecaDeLocalStorage();

  // 7. Sincronizar y volcar en IndexedDB ANTES de verificar conteos contra IndexedDB
  await escribirMultiplesEnIndexedDB({
    c1_banco_examenes: bancoConsolidadoCompleto,
    c1_historial_pruebas: historialConsolidadoCompleto,
    c1_almacen_dudas: almacenDudasCompleto,
    c1_biblioteca_documentos: bibliotecaDocumentosCompleta,
    c1_biblioteca_subtemas: subtemasCompleta,
    [STORAGE_KEY_RECURSOS_ARGUMENTACION]: mapaRecursosGlobal,
    c1_examenes_eliminados: examenesEliminadosIds,
  });
  await esperarEscriturasPendientesIDB();

  // Leer inventario directamente desde IndexedDB para validar al 100%
  const inventarioIDB = await obtenerInventarioVerificadoIndexedDB();

  // 8. Filtrar el payload según la modalidad elegida
  let bancoAExportar: ExamenCompleto[] = [];
  let historialAExportar: ExamenCompleto[] = [];
  let anotacionesAExportar: Record<string, any[]> = {};
  let dudasAExportar: ItemAlmacenDuda[] = [];
  let docsAExportar: DocumentoBibliotecaItem[] = [];
  let subtemasAExportar: string[] = [];
  let recursosAExportar: Record<string, RecursoArgumentacionPregunta[]> = {};
  let superadasAExportar: Record<string, any> = {};
  let eliminadosAExportar: string[] = [];
  let recientesAExportar: string[] = [];
  let pdfsAExportar: any[] = [];
  let sesionActivaAExportar: any = undefined;

  const controlPreguntasSuperadas = leerDatoPersistenteSincrono<Record<string, any>>(
    'c1_preguntas_superadas_v1',
    {}
  );
  const historialPreguntasRecientes = leerDatoPersistenteSincrono<string[]>(
    'c1_historial_preguntas_recientes',
    []
  );
  const testsDescargadosPDF = leerDatoPersistenteSincrono<any[]>('c1_tests_descargados_pdf', []);
  const sesionExamenActiva = leerDatoPersistenteSincrono<any>('c1_active_exam_session', null);

  if (modalidad === 'completa') {
    bancoAExportar = bancoConsolidadoCompleto;
    historialAExportar = historialConsolidadoCompleto;
    anotacionesAExportar = anotacionesTodas;
    dudasAExportar = almacenDudasCompleto;
    docsAExportar = bibliotecaDocumentosCompleta;
    subtemasAExportar = subtemasCompleta;
    recursosAExportar = mapaRecursosGlobal;
    superadasAExportar = controlPreguntasSuperadas || {};
    eliminadosAExportar = examenesEliminadosIds;
    recientesAExportar = Array.isArray(historialPreguntasRecientes) ? historialPreguntasRecientes : [];
    pdfsAExportar = Array.isArray(testsDescargadosPDF) ? testsDescargadosPDF : [];
    sesionActivaAExportar = sesionExamenActiva || undefined;
  } else if (modalidad === 'solo_progreso') {
    // Excluye el banco de preguntas (0 exámenes del banco) y guarda progreso, historial, estadísticas, fallos, dudas, anotaciones y configuración
    bancoAExportar = [];
    historialAExportar = historialConsolidadoCompleto;
    anotacionesAExportar = anotacionesTodas;
    dudasAExportar = almacenDudasCompleto;
    docsAExportar = bibliotecaDocumentosCompleta;
    subtemasAExportar = subtemasCompleta;
    recursosAExportar = mapaRecursosGlobal;
    superadasAExportar = controlPreguntasSuperadas || {};
    eliminadosAExportar = examenesEliminadosIds;
    recientesAExportar = [];
    pdfsAExportar = Array.isArray(testsDescargadosPDF) ? testsDescargadosPDF : [];
    sesionActivaAExportar = undefined;
  } else if (modalidad === 'seleccion_examenes') {
    const setSeleccionados = new Set(idsExamenesSeleccionados || []);
    if (setSeleccionados.size === 0) {
      throw new Error('Selecciona al menos un bloque o examen para exportar una copia parcial.');
    }
    bancoAExportar = bancoConsolidadoCompleto.filter((ex) => setSeleccionados.has(ex.id));
    if (bancoAExportar.length === 0) {
      throw new Error('No se encontraron los exámenes seleccionados en la base de datos local.');
    }
    historialAExportar = [];
    dudasAExportar = [];
    docsAExportar = [];
    subtemasAExportar = [];
    superadasAExportar = {};
    eliminadosAExportar = [];
    recientesAExportar = [];
    pdfsAExportar = [];
    sesionActivaAExportar = undefined;

    bancoAExportar.forEach((ex) => {
      if (anotacionesTodas[ex.id]) {
        anotacionesAExportar[ex.id] = anotacionesTodas[ex.id];
      }
      (ex.preguntas || []).forEach((p) => {
        const clave = normalizarClaveRecursoPregunta(p.enunciado);
        if (clave && mapaRecursosGlobal[clave]) {
          recursosAExportar[clave] = mapaRecursosGlobal[clave];
        }
      });
    });
  }

  // 9. Preferencias visuales ligeras de localStorage
  let darkMode = false;
  let autoAvanceAlFinal: boolean | undefined = undefined;
  let cortePropioTest: string | undefined = undefined;
  let cortePropioSupuesto: string | undefined = undefined;
  let usarCortePropio: boolean | undefined = undefined;
  let geminiApiKey: string | undefined = undefined;
  let geminiSelectedModel: string | undefined = undefined;
  let modoLecturaTamano: string | undefined = undefined;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      darkMode = localStorage.getItem('c1_dark_mode') === 'true';
      const autoAvanceRaw = localStorage.getItem('c1_auto_avance_al_final');
      autoAvanceAlFinal = autoAvanceRaw !== null ? autoAvanceRaw === 'true' : undefined;
      cortePropioTest = localStorage.getItem('c1_corte_propio_test') || undefined;
      cortePropioSupuesto = localStorage.getItem('c1_corte_propio_supuesto') || undefined;
      const usarCortePropioRaw = localStorage.getItem('c1_usar_corte_propio');
      usarCortePropio = usarCortePropioRaw !== null ? usarCortePropioRaw === 'true' : undefined;
      geminiApiKey =
        localStorage.getItem('c1_custom_gemini_api_key') ||
        localStorage.getItem('gemini_custom_api_key') ||
        undefined;
      geminiSelectedModel = localStorage.getItem('c1_selected_gemini_model') || undefined;
      modoLecturaTamano = localStorage.getItem('c1_modo_lectura_tamano') || undefined;
    } catch (_) {}
  }

  const totalRecursosArgumentacion = Object.values(recursosAExportar).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  const totalAnotaciones = Object.values(anotacionesAExportar).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  const totalPreguntasBanco = bancoAExportar.reduce(
    (acc, ex) => acc + (Array.isArray(ex.preguntas) ? ex.preguntas.length : 0),
    0
  );

  const backupRaw: CopiaSeguridadIntegral = {
    tipo: 'copia_seguridad_simulador_c1',
    version: '3.8',
    modalidadExportacion: modalidad,
    fecha: new Date().toISOString(),
    metadata: {
      modalidad,
      totalBancoExamenes: bancoAExportar.length,
      totalPreguntasBanco,
      totalHistorialPruebas: historialAExportar.length,
      totalExamenes: bancoAExportar.length + historialAExportar.length,
      totalAnotaciones,
      totalDudasAlmacen: dudasAExportar.length,
      totalDocumentosBiblioteca: docsAExportar.length,
      totalSubtemasBiblioteca: subtemasAExportar.length,
      totalRecursosArgumentacion,
      totalPreguntasControlFalladas: Object.keys(superadasAExportar || {}).length,
      timestamp: Date.now(),
    },
    bancoExamenes: bancoAExportar,
    historialPruebas: historialAExportar,
    anotacionesPorExamen: anotacionesAExportar,
    almacenDudas: dudasAExportar,
    bibliotecaDocumentos: docsAExportar,
    subtemasBiblioteca: subtemasAExportar,
    recursosArgumentacionPorPregunta: recursosAExportar,
    controlPreguntasSuperadas: superadasAExportar,
    examenesEliminadosIds: eliminadosAExportar,
    historialPreguntasRecientes: recientesAExportar,
    testsDescargadosPDF: pdfsAExportar,
    sesionExamenActiva: sesionActivaAExportar,
    configuracion:
      modalidad === 'seleccion_examenes'
        ? {}
        : {
            darkMode,
            autoAvanceAlFinal,
            cortePropioTest,
            cortePropioSupuesto,
            usarCortePropio,
            geminiApiKey,
            geminiSelectedModel,
            modoLecturaTamano,
          },
  };

  // 10. Limpieza de propiedades vacías/redundantes y serialización compacta (sin indentación)
  const payloadLimpio = limpiarPropiedadesRedundantes(backupRaw);
  const jsonCompacto = JSON.stringify(payloadLimpio);

  // 11. Validación interna obligatoria ANTES de disparar la descarga:
  //     a) Integridad sintáctica JSON.parse
  //     b) Coincidencia 100% del conteo de exámenes y preguntas con IndexedDB
  let verificado: CopiaSeguridadIntegral;
  try {
    verificado = JSON.parse(jsonCompacto) as CopiaSeguridadIntegral;
  } catch (_) {
    throw new Error('Fallo de integridad interna al validar el JSON generado. Descarga abortada por seguridad.');
  }

  const examenesExportadosVerif = Array.isArray(verificado.bancoExamenes) ? verificado.bancoExamenes.length : 0;
  const preguntasExportadasVerif = (verificado.bancoExamenes || []).reduce(
    (acc, ex) => acc + (Array.isArray(ex.preguntas) ? ex.preguntas.length : 0),
    0
  );
  const historialExportadoVerif = Array.isArray(verificado.historialPruebas) ? verificado.historialPruebas.length : 0;

  if (modalidad === 'completa') {
    if (
      examenesExportadosVerif !== inventarioIDB.totalExamenesBanco ||
      preguntasExportadasVerif !== inventarioIDB.totalPreguntasBanco ||
      historialExportadoVerif !== inventarioIDB.totalHistorial
    ) {
      throw new Error(
        `Discrepancia detectada en verificación pre-descarga: exportados ${examenesExportadosVerif}/${inventarioIDB.totalExamenesBanco} exámenes y ${preguntasExportadasVerif}/${inventarioIDB.totalPreguntasBanco} preguntas respecto a IndexedDB.`
      );
    }
  } else if (modalidad === 'solo_progreso') {
    if (examenesExportadosVerif !== 0 || historialExportadoVerif !== inventarioIDB.totalHistorial) {
      throw new Error(
        `Discrepancia detectada en copia de progreso: historial exportado ${historialExportadoVerif}/${inventarioIDB.totalHistorial}.`
      );
    }
  } else if (modalidad === 'seleccion_examenes') {
    const setIdsSel = new Set(idsExamenesSeleccionados || []);
    const seleccionEnIDB = inventarioIDB.bancoExamenesIDB.filter((ex) => ex && setIdsSel.has(ex.id));
    const preguntasSelEnIDB = seleccionEnIDB.reduce(
      (acc, ex) => acc + (Array.isArray(ex.preguntas) ? ex.preguntas.length : 0),
      0
    );
    if (
      examenesExportadosVerif !== seleccionEnIDB.length ||
      preguntasExportadasVerif !== preguntasSelEnIDB
    ) {
      throw new Error(
        `Discrepancia detectada en selección parcial: exportados ${examenesExportadosVerif}/${seleccionEnIDB.length} exámenes y ${preguntasExportadasVerif}/${preguntasSelEnIDB} preguntas respecto a IndexedDB.`
      );
    }
  }

  // 12. Generar Blob sin comprimir o comprimido con GZIP nativo y descargar mediante URL.createObjectURL
  const blobJsonSinComprimir = new Blob([jsonCompacto], { type: 'application/json;charset=utf-8' });
  const tamanoSinComprimirBytes = blobJsonSinComprimir.size;

  const fechaStr = new Date().toISOString().split('T')[0];
  const sufijoBase =
    modalidad === 'completa'
      ? `Copia_Completa_C1_${fechaStr}`
      : modalidad === 'solo_progreso'
      ? `Progreso_Historial_C1_${fechaStr}`
      : `Bloque_Examenes_C1_${(etiquetaBloqueOSeleccion || `${examenesExportadosVerif}_tests`).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 28)}_${fechaStr}`;

  const extensionArchivo = formato === 'json_gz' ? '.json.gz' : '.json';
  const nombreArchivo = `${sufijoBase}${extensionArchivo}`;

  const blobFinal =
    formato === 'json_gz' ? await comprimirTextoAGzipBlob(jsonCompacto) : blobJsonSinComprimir;

  const tamanoBytes = blobFinal.size;
  const porcentajeReduccion =
    tamanoSinComprimirBytes > 0 && tamanoBytes < tamanoSinComprimirBytes
      ? Math.round((1 - tamanoBytes / tamanoSinComprimirBytes) * 100)
      : 0;

  const okDescarga = descargarBlobConObjectURL(blobFinal, nombreArchivo);
  if (!okDescarga) {
    throw new Error('No se pudo iniciar la descarga en el navegador.');
  }

  return {
    ok: true,
    resumen: {
      modalidad,
      formato,
      verificadoContraIDB: true,
      totalBancoExamenes: examenesExportadosVerif,
      totalPreguntasBanco: preguntasExportadasVerif,
      totalHistorialPruebas: historialExportadoVerif,
      totalDudasAlmacen: Array.isArray(verificado.almacenDudas) ? verificado.almacenDudas.length : 0,
      totalDocumentosBiblioteca: Array.isArray(verificado.bibliotecaDocumentos)
        ? verificado.bibliotecaDocumentos.length
        : 0,
      totalSubtemasBiblioteca: Array.isArray(verificado.subtemasBiblioteca)
        ? verificado.subtemasBiblioteca.length
        : 0,
      totalRecursosArgumentacion,
      totalAnotaciones,
      totalPreguntasControlFalladas: Object.keys(verificado.controlPreguntasSuperadas || {}).length,
      tamanoSinComprimirBytes,
      tamanoBytes,
      porcentajeReduccion,
      nombreArchivo,
    },
  };
}

/**
 * Mantiene compatibilidad directa con llamadas existentes descargando Copia Completa en .json.
 */
export async function descargarCopiaSeguridadCompleta(
  bancoOExamenes: ExamenCompleto[],
  historialOpcional?: ExamenCompleto[],
  almacenDudasOpcional?: ItemAlmacenDuda[],
  bibliotecaDocumentosOpcional?: DocumentoBibliotecaItem[],
  subtemasBibliotecaOpcional?: string[],
  examenesEliminadosOpcional?: string[],
  formato: FormatoExportacionCopia = 'json'
): Promise<{ ok: boolean; resumen?: ResumenCopiaSeguridadExportada }> {
  return exportarCopiaSeguridadAvanzada({
    modalidad: 'completa',
    formato,
    bancoExamenes: bancoOExamenes,
    historialPruebas: historialOpcional,
    almacenDudas: almacenDudasOpcional,
    bibliotecaDocumentos: bibliotecaDocumentosOpcional,
    subtemasBiblioteca: subtemasBibliotecaOpcional,
    examenesEliminadosIds: examenesEliminadosOpcional,
  });
}

/**
 * Valida rigurosamente que un texto JSON de copia de seguridad o examen esté completo,
 * bien formado y sin truncamientos ANTES de tocar ningún dato existente en memoria o IndexedDB.
 */
export function validarIntegridadArchivoCopiaOExamen(rawText: string): any {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Archivo corrupto o incompleto: el archivo está vacío.');
  }

  const cleaned = limpiarTextoJSON(rawText);
  const firstChar = cleaned[0];
  const lastChar = cleaned[cleaned.length - 1];

  if (
    !(
      (firstChar === '{' && lastChar === '}') ||
      (firstChar === '[' && lastChar === ']')
    )
  ) {
    throw new Error(
      'Archivo corrupto o incompleto: el contenido JSON está truncado (cierre de estructura inexistente). Tus datos actuales siguen intactos.'
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    throw new Error(
      'Archivo corrupto o incompleto: sintaxis JSON dañada o archivo cortado durante su descarga. Tus datos actuales no han sido modificados.'
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Archivo corrupto o incompleto: estructura raíz inválida.');
  }

  const validarListaExamenesIntegridad = (lista: any[], nombreSeccion: string) => {
    for (let i = 0; i < lista.length; i++) {
      const ex = lista[i];
      if (!ex || typeof ex !== 'object' || !Array.isArray(ex.preguntas)) {
        throw new Error(
          `Archivo corrupto o incompleto: el examen #${i + 1} en "${nombreSeccion}" carece de lista de preguntas válida.`
        );
      }
      for (let j = 0; j < ex.preguntas.length; j++) {
        const p = ex.preguntas[j];
        if (!p || typeof p.enunciado !== 'string' || !Array.isArray(p.opciones) || p.opciones.length === 0) {
          throw new Error(
            `Archivo corrupto o incompleto: pregunta truncada en "${ex.titulo || `#${i + 1}`}" (pregunta #${j + 1}).`
          );
        }
      }
    }
  };

  if (parsed.tipo === 'copia_seguridad_simulador_c1') {
    if (parsed.bancoExamenes !== undefined && !Array.isArray(parsed.bancoExamenes)) {
      throw new Error('Archivo corrupto o incompleto: "bancoExamenes" no es una lista válida.');
    }
    if (parsed.historialPruebas !== undefined && !Array.isArray(parsed.historialPruebas)) {
      throw new Error('Archivo corrupto o incompleto: "historialPruebas" no es una lista válida.');
    }
    if (Array.isArray(parsed.bancoExamenes)) {
      validarListaExamenesIntegridad(parsed.bancoExamenes, 'bancoExamenes');
    }
    if (Array.isArray(parsed.historialPruebas)) {
      validarListaExamenesIntegridad(parsed.historialPruebas, 'historialPruebas');
    }
    if (Array.isArray(parsed.examenesGuardados)) {
      validarListaExamenesIntegridad(parsed.examenesGuardados, 'examenesGuardados');
    }

    // Si la copia incluye metadatos de conteo, verificar que el archivo no quedó cortado a mitad
    if (
      parsed.metadata &&
      typeof parsed.metadata.totalBancoExamenes === 'number' &&
      Array.isArray(parsed.bancoExamenes) &&
      parsed.bancoExamenes.length !== parsed.metadata.totalBancoExamenes
    ) {
      throw new Error(
        `Archivo corrupto o incompleto: la cabecera declara ${parsed.metadata.totalBancoExamenes} exámenes pero el archivo contiene ${parsed.bancoExamenes.length}.`
      );
    }
  } else if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error('Archivo corrupto o incompleto: el listado de exámenes está vacío.');
    }
    validarListaExamenesIntegridad(parsed, 'listado');
  } else if (parsed.titulo && Array.isArray(parsed.preguntas)) {
    validarListaExamenesIntegridad([parsed], 'examen');
  } else if (!Array.isArray(parsed.bibliotecaDocumentos) && !Array.isArray(parsed.almacenDudas)) {
    throw new Error(
      'Archivo corrupto o incompleto: el archivo no corresponde a una copia de seguridad ni a un examen válido.'
    );
  }

  return parsed;
}

export interface ResultadoRestauracionCopia {
  modalidadDetectada: ModalidadExportacionCopia;
  bancoExamenes: ExamenCompleto[];
  historialPruebas: ExamenCompleto[];
  examenes: ExamenCompleto[];
  almacenDudas: ItemAlmacenDuda[];
  bibliotecaDocumentos: DocumentoBibliotecaItem[];
  subtemasBiblioteca: string[];
  examenesEliminadosIds: string[];
  darkModeRestaurado?: boolean;
  modoLecturaTamanoRestaurado?: string;
  anotacionesRestauradas: number;
  recursosRestaurados: number;
  preguntasBancoTotales: number;
}

/**
 * Procesa, valida primero sin destructividad y restaura/fusiona una Copia de Seguridad (.json o descomprimida de .json.gz)
 * guardando el resultado inmediatamente en IndexedDB.
 */
export function restaurarCopiaSeguridadCompleta(
  rawText: string,
  opciones?: { modo?: 'fusionar' | 'reemplazar' }
): ResultadoRestauracionCopia {
  const modo = opciones?.modo || 'fusionar';

  // 1. Validación estricta ANTES de modificar ni un solo dato existente
  const parsed = validarIntegridadArchivoCopiaOExamen(rawText);

  const modalidadDetectada: ModalidadExportacionCopia =
    parsed.modalidadExportacion === 'solo_progreso' ||
    parsed?.metadata?.modalidad === 'solo_progreso'
      ? 'solo_progreso'
      : parsed.modalidadExportacion === 'seleccion_examenes' ||
        parsed?.metadata?.modalidad === 'seleccion_examenes'
      ? 'seleccion_examenes'
      : 'completa';

  const convertirSinPerdida = (item: any): ExamenCompleto =>
    validarYConvertirJSON(item, { preservarResultadoIntegro: true });

  // 2. Parsear y convertir primero TODOS los exámenes en memoria temporal (si hubiera un fallo, no se toca nada existente)
  let bancoImportado: ExamenCompleto[] = [];
  let historialImportado: ExamenCompleto[] = [];

  if (
    parsed.tipo === 'copia_seguridad_simulador_c1' &&
    (Array.isArray(parsed.bancoExamenes) || Array.isArray(parsed.historialPruebas))
  ) {
    if (Array.isArray(parsed.bancoExamenes)) {
      bancoImportado = parsed.bancoExamenes.map(convertirSinPerdida);
    }
    if (Array.isArray(parsed.historialPruebas)) {
      historialImportado = parsed.historialPruebas.map(convertirSinPerdida);
    }
  } else if (parsed.tipo === 'copia_seguridad_simulador_c1' && Array.isArray(parsed.examenesGuardados)) {
    const todos = parsed.examenesGuardados.map(convertirSinPerdida);
    historialImportado = todos.filter((e: ExamenCompleto) => !!e.resultado);
    bancoImportado = todos.filter((e: ExamenCompleto) => !e.resultado);
  } else if (Array.isArray(parsed)) {
    const todos = parsed.map(convertirSinPerdida);
    historialImportado = todos.filter((e: ExamenCompleto) => !!e.resultado);
    bancoImportado = todos.filter((e: ExamenCompleto) => !e.resultado);
  } else if (parsed.titulo && Array.isArray(parsed.preguntas)) {
    const unExamen = convertirSinPerdida(parsed);
    if (unExamen.resultado) {
      historialImportado = [unExamen];
    } else {
      bancoImportado = [unExamen];
    }
  } else if (Array.isArray(parsed.bibliotecaDocumentos) || Array.isArray(parsed.almacenDudas)) {
    bancoImportado = [];
    historialImportado = [];
  }

  // A partir de aquí el archivo es 100% íntegro: aplicar Restaurar (sobrescribir) o Fusionar
  let anotacionesCount = 0;
  let recursosCount = 0;

  if (modo === 'reemplazar' && modalidadDetectada !== 'seleccion_examenes') {
    void limpiarTodasLasAnotacionesDeIndexedDB();
  }

  // 3. Recursos de argumentación por pregunta
  if (parsed.recursosArgumentacionPorPregunta && typeof parsed.recursosArgumentacionPorPregunta === 'object') {
    const mapaBase =
      modo === 'reemplazar' && modalidadDetectada !== 'seleccion_examenes'
        ? {}
        : leerMapaRecursosArgumentacionGlobal();
    Object.entries(parsed.recursosArgumentacionPorPregunta).forEach(([clave, lista]) => {
      if (Array.isArray(lista) && lista.length > 0) {
        mapaBase[clave] = lista as RecursoArgumentacionPregunta[];
        recursosCount += lista.length;
      }
    });
    guardarEnLocalStorageSeguro(STORAGE_KEY_RECURSOS_ARGUMENTACION, mapaBase);
  } else if (modo === 'reemplazar' && modalidadDetectada === 'completa') {
    guardarEnLocalStorageSeguro(STORAGE_KEY_RECURSOS_ARGUMENTACION, {});
  }

  // 4. Control de preguntas superadas/falladas
  if (parsed.controlPreguntasSuperadas && typeof parsed.controlPreguntasSuperadas === 'object') {
    const actualObj =
      modo === 'reemplazar'
        ? {}
        : leerDatoPersistenteSincrono<Record<string, any>>('c1_preguntas_superadas_v1', {});
    const fusionado = { ...actualObj, ...parsed.controlPreguntasSuperadas };
    guardarEnLocalStorageSeguro('c1_preguntas_superadas_v1', fusionado);
  } else if (modo === 'reemplazar' && modalidadDetectada !== 'seleccion_examenes') {
    guardarEnLocalStorageSeguro('c1_preguntas_superadas_v1', {});
  }

  // 5. IDs de exámenes eliminados
  let examenesEliminadosIds: string[] =
    modo === 'reemplazar' && modalidadDetectada === 'completa'
      ? []
      : leerDatoPersistenteSincrono<string[]>('c1_examenes_eliminados', []);

  if (Array.isArray(parsed.examenesEliminadosIds)) {
    examenesEliminadosIds = Array.from(
      new Set([
        ...(Array.isArray(examenesEliminadosIds) ? examenesEliminadosIds : []),
        ...parsed.examenesEliminadosIds,
      ])
    );
  }
  guardarEnLocalStorageSeguro('c1_examenes_eliminados', examenesEliminadosIds);
  const setEliminados = new Set(examenesEliminadosIds);

  // 6. Historial reciente, descargas PDF y sesión activa
  if (Array.isArray(parsed.historialPreguntasRecientes)) {
    guardarEnLocalStorageSeguro('c1_historial_preguntas_recientes', parsed.historialPreguntasRecientes);
  } else if (modo === 'reemplazar' && modalidadDetectada === 'completa') {
    guardarEnLocalStorageSeguro('c1_historial_preguntas_recientes', []);
  }

  if (Array.isArray(parsed.testsDescargadosPDF)) {
    const actualArr =
      modo === 'reemplazar'
        ? []
        : leerDatoPersistenteSincrono<any[]>('c1_tests_descargados_pdf', []);
    const mapaIds = new Map<string, any>();
    [...(Array.isArray(actualArr) ? actualArr : []), ...parsed.testsDescargadosPDF].forEach((it) => {
      if (it && it.id) mapaIds.set(it.id, it);
    });
    guardarEnLocalStorageSeguro('c1_tests_descargados_pdf', Array.from(mapaIds.values()).slice(0, 80));
  }

  if (parsed.sesionExamenActiva && typeof parsed.sesionExamenActiva === 'object') {
    guardarEnLocalStorageSeguro('c1_active_exam_session', parsed.sesionExamenActiva);
  }

  // 7. Preferencias visuales ligeras en localStorage
  let darkModeRestaurado: boolean | undefined = undefined;
  let modoLecturaTamanoRestaurado: string | undefined = undefined;
  if (parsed.configuracion && typeof parsed.configuracion === 'object') {
    try {
      if (typeof parsed.configuracion.darkMode === 'boolean') {
        darkModeRestaurado = parsed.configuracion.darkMode;
        localStorage.setItem('c1_dark_mode', String(parsed.configuracion.darkMode));
      }
      if (typeof parsed.configuracion.autoAvanceAlFinal === 'boolean') {
        localStorage.setItem('c1_auto_avance_al_final', String(parsed.configuracion.autoAvanceAlFinal));
      }
      if (typeof parsed.configuracion.cortePropioTest === 'string') {
        localStorage.setItem('c1_corte_propio_test', parsed.configuracion.cortePropioTest);
      }
      if (typeof parsed.configuracion.cortePropioSupuesto === 'string') {
        localStorage.setItem('c1_corte_propio_supuesto', parsed.configuracion.cortePropioSupuesto);
      }
      if (typeof parsed.configuracion.usarCortePropio === 'boolean') {
        localStorage.setItem('c1_usar_corte_propio', String(parsed.configuracion.usarCortePropio));
      }
      if (parsed.configuracion.geminiApiKey) {
        localStorage.setItem('c1_custom_gemini_api_key', parsed.configuracion.geminiApiKey);
        localStorage.setItem('gemini_custom_api_key', parsed.configuracion.geminiApiKey);
      }
      if (parsed.configuracion.geminiSelectedModel) {
        localStorage.setItem('c1_selected_gemini_model', parsed.configuracion.geminiSelectedModel);
      }
      if (parsed.configuracion.modoLecturaTamano) {
        modoLecturaTamanoRestaurado = parsed.configuracion.modoLecturaTamano;
        localStorage.setItem('c1_modo_lectura_tamano', parsed.configuracion.modoLecturaTamano);
      }
    } catch (_) {}
  }

  // 8. Anotaciones por examen
  if (parsed.anotacionesPorExamen && typeof parsed.anotacionesPorExamen === 'object') {
    Object.entries(parsed.anotacionesPorExamen).forEach(([examId, notas]) => {
      if (Array.isArray(notas)) {
        guardarEnLocalStorageSeguro(`c1_anotaciones_${examId}`, notas);
        anotacionesCount += notas.length;
      }
    });
  }

  // 9. Consolidar Banco de Exámenes según modo y modalidad del archivo
  const mapaBancoFinal = new Map<string, ExamenCompleto>();
  const conservarBancoExistente =
    modo === 'fusionar' || modalidadDetectada === 'solo_progreso';

  if (conservarBancoExistente) {
    EXAMENES_PRECARGADOS_OFICIALES.forEach((prec) => {
      if (prec && prec.id && !setEliminados.has(prec.id)) {
        mapaBancoFinal.set(prec.id, asegurarSeparacionYNormativaReserva(prec));
      }
    });
    const bancoExistente = leerDatoPersistenteSincrono<ExamenCompleto[]>('c1_banco_examenes', []);
    if (Array.isArray(bancoExistente)) {
      bancoExistente.forEach((ex) => {
        if (ex && ex.id && !setEliminados.has(ex.id)) {
          mapaBancoFinal.set(ex.id, ex);
        }
      });
    }
  } else if (bancoImportado.length > 0 && modalidadDetectada === 'completa') {
    // En modo 'reemplazar' sobre copia completa, dejar exactamente los exámenes de la copia (+ precargados no eliminados si procedía de versión antigua)
    EXAMENES_PRECARGADOS_OFICIALES.forEach((prec) => {
      if (prec && prec.id && !setEliminados.has(prec.id)) {
        mapaBancoFinal.set(prec.id, asegurarSeparacionYNormativaReserva(prec));
      }
    });
  }

  bancoImportado.forEach((ex) => {
    if (ex && ex.id && !setEliminados.has(ex.id)) {
      mapaBancoFinal.set(ex.id, ex);
    }
  });
  const bancoExamenes = Array.from(mapaBancoFinal.values());

  // 10. Consolidar Historial de Pruebas
  const mapaHistorialFinal = new Map<string, ExamenCompleto>();
  const conservarHistorialExistente =
    modo === 'fusionar' || modalidadDetectada === 'seleccion_examenes';

  if (conservarHistorialExistente) {
    const histExistente = leerDatoPersistenteSincrono<ExamenCompleto[]>('c1_historial_pruebas', []);
    if (Array.isArray(histExistente)) {
      histExistente.forEach((h) => {
        if (h && h.id) mapaHistorialFinal.set(h.id, h);
      });
    }
  }
  historialImportado.forEach((h) => {
    if (h && h.id) mapaHistorialFinal.set(h.id, h);
  });
  const historialPruebas = Array.from(mapaHistorialFinal.values());

  // 11. Consolidar Biblioteca (Dudas, Enlaces y Subtemas)
  let almacenDudasRestauradas: ItemAlmacenDuda[];
  if (modo === 'reemplazar' && modalidadDetectada !== 'seleccion_examenes' && Array.isArray(parsed.almacenDudas)) {
    almacenDudasRestauradas = parsed.almacenDudas.map((it: ItemAlmacenDuda) => {
      if (Array.isArray(it.recursosArgumentacion) && it.recursosArgumentacion.length > 0 && it.enunciado) {
        guardarRecursosArgumentacionDePregunta(it.enunciado, it.recursosArgumentacion);
      }
      return {
        ...it,
        id: it.id || `duda-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
    });
    guardarEnLocalStorageSeguro('c1_almacen_dudas', almacenDudasRestauradas);
  } else {
    almacenDudasRestauradas = fusionarAlmacenDudasEnLocalStorage(
      Array.isArray(parsed.almacenDudas) ? parsed.almacenDudas : undefined
    );
  }

  let bibliotecaDocumentosRestaurados: DocumentoBibliotecaItem[];
  if (
    modo === 'reemplazar' &&
    modalidadDetectada !== 'seleccion_examenes' &&
    Array.isArray(parsed.bibliotecaDocumentos)
  ) {
    bibliotecaDocumentosRestaurados = guardarBibliotecaDocumentosEnLocalStorage(parsed.bibliotecaDocumentos);
  } else {
    bibliotecaDocumentosRestaurados = fusionarBibliotecaDocumentosEnLocalStorage(
      Array.isArray(parsed.bibliotecaDocumentos) ? parsed.bibliotecaDocumentos : undefined
    );
  }

  let subtemasBibliotecaRestaurados: string[];
  if (
    modo === 'reemplazar' &&
    modalidadDetectada !== 'seleccion_examenes' &&
    Array.isArray(parsed.subtemasBiblioteca)
  ) {
    subtemasBibliotecaRestaurados = guardarSubtemasBibliotecaEnLocalStorage(parsed.subtemasBiblioteca);
  } else {
    subtemasBibliotecaRestaurados = fusionarSubtemasBibliotecaEnLocalStorage(
      Array.isArray(parsed.subtemasBiblioteca) ? parsed.subtemasBiblioteca : undefined
    );
  }

  // 12. Persistir inmediatamente en IndexedDB
  guardarEnLocalStorageSeguro('c1_banco_examenes', bancoExamenes);
  guardarEnLocalStorageSeguro('c1_historial_pruebas', historialPruebas);

  [...bancoExamenes, ...historialPruebas].forEach((ex) => {
    if (ex.anotaciones && ex.anotaciones.length > 0) {
      guardarEnLocalStorageSeguro(`c1_anotaciones_${ex.id}`, ex.anotaciones);
      anotacionesCount += ex.anotaciones.length;
    }
  });

  const preguntasBancoTotales = bancoExamenes.reduce(
    (acc, ex) => acc + (Array.isArray(ex.preguntas) ? ex.preguntas.length : 0),
    0
  );

  return {
    modalidadDetectada,
    bancoExamenes,
    historialPruebas,
    examenes: [...bancoExamenes, ...historialPruebas],
    almacenDudas: almacenDudasRestauradas,
    bibliotecaDocumentos: bibliotecaDocumentosRestaurados,
    subtemasBiblioteca: subtemasBibliotecaRestaurados,
    examenesEliminadosIds,
    darkModeRestaurado,
    modoLecturaTamanoRestaurado,
    anotacionesRestauradas: anotacionesCount,
    recursosRestaurados: recursosCount,
    preguntasBancoTotales,
  };
}

/**
 * Versión asíncrona que espera a que todas las transacciones de IndexedDB se completen en disco.
 */
export async function restaurarCopiaSeguridadCompletaAsync(
  rawText: string,
  opciones?: { modo?: 'fusionar' | 'reemplazar' }
): Promise<ResultadoRestauracionCopia> {
  const res = restaurarCopiaSeguridadCompleta(rawText, opciones);
  await esperarEscriturasPendientesIDB();
  return res;
}

/**
 * Guarda datos pesados exclusivamente en IndexedDB + caché en memoria viva
 * (sin tocar localStorage para colecciones de exámenes, historial, dudas ni biblioteca).
 */
export function guardarEnLocalStorageSeguro(key: string, data: any): boolean {
  return guardarDatoPersistenteIntegral(key, data);
}



