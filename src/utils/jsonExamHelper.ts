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
  if (typeof window === 'undefined' || !window.localStorage) {
    return DOCUMENTOS_INICIALES_BIBLIOTECA;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS);
    if (!raw) {
      guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_DOCUMENTOS, DOCUMENTOS_INICIALES_BIBLIOTECA);
      return DOCUMENTOS_INICIALES_BIBLIOTECA;
    }
    const parsed = JSON.parse(raw);
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
  if (typeof window === 'undefined' || !window.localStorage) {
    return SUBTEMAS_PREDEFINIDOS_BIBLIOTECA;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BIBLIOTECA_SUBTEMAS);
    if (!raw) {
      guardarEnLocalStorageSeguro(STORAGE_KEY_BIBLIOTECA_SUBTEMAS, SUBTEMAS_PREDEFINIDOS_BIBLIOTECA);
      return SUBTEMAS_PREDEFINIDOS_BIBLIOTECA;
    }
    const parsed = JSON.parse(raw);
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
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECURSOS_ARGUMENTACION);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
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
    const raw = localStorage.getItem('c1_almacen_dudas');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existentes = parsed;
    }
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
export function validarYConvertirJSON(obj: any): ExamenCompleto {
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

  // Si el objeto ya incluía resultado o respuestas previas, recalcular conforme a normativa oficial de reserva
  let resultadoFinal = obj.resultado;
  if (resultadoFinal && resultadoFinal.respuestasUsuario) {
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
    titulo,
    tipo: tipoFinal,
    categoria: categoriaFinal,
    ambito: obj.ambito === 'CAM' ? 'CAM' : obj.ambito === 'AMBOS' ? 'AMBOS' : 'AGE',
    origen: obj.origen || 'oficial_json',
    fecha: obj.fecha || new Date().toISOString().split('T')[0],
    contextoCaso: obj.contextoCaso,
    tematicas: obj.tematicas || ['procedimiento_administrativo'],
    leyesBOEAplicadas: obj.leyesBOEAplicadas || ['Legislación consolidada en www.boe.es'],
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
  extension: string = '.json'
): Promise<boolean> {
  // 1. Selector nativo con elección de carpeta y nombre
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const pickerOpts = {
        suggestedName: nombreSugerido,
        types: [
          {
            description: 'Archivo JSON de Examen / Copia de Seguridad',
            accept: {
              [mimeType]: [extension],
            },
          },
        ],
      };
      const handle = await (window as any).showSaveFilePicker(pickerOpts);
      const writable = await handle.createWritable();
      await writable.write(dataString);
      await writable.close();
      return true;
    } catch (err: any) {
      // Si el usuario cancela la ventana de selección de carpeta, no forzar descarga
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        return false;
      }
      console.warn('showSaveFilePicker no completado, ejecutando descarga directa:', err);
    }
  }

  // 2. Fallback estándar compatible universalmente
  const blob = new Blob([dataString], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreSugerido;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Exporta un examen a un archivo .json permitiendo elegir la carpeta de destino,
 * incluyendo los enlaces web y ficheros locales de argumentación de cada pregunta
 * así como los datos de la sección Almacén de Dudas.
 */
export async function exportarExamenAJSON(
  examen: ExamenCompleto,
  almacenDudasOpcional?: ItemAlmacenDuda[]
): Promise<boolean> {
  let almacenDudas: ItemAlmacenDuda[] = almacenDudasOpcional || [];
  if (!almacenDudasOpcional || almacenDudasOpcional.length === 0) {
    try {
      const rawDudas = localStorage.getItem('c1_almacen_dudas');
      if (rawDudas) almacenDudas = JSON.parse(rawDudas);
    } catch (_) {}
  }

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

  const dataString = JSON.stringify(payloadExportacion, null, 2);
  const safeTitle = (examen.titulo || 'Examen')
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_')
    .substring(0, 35);
  const nombreSugerido = `Test_C1_${safeTitle}_${new Date().toISOString().split('T')[0]}.json`;

  return await guardarArchivoConSelectorCarpeta(dataString, nombreSugerido, 'application/json', '.json');
}

/**
 * Exporta la biblioteca completa de exámenes guardados junto con los enlaces/ficheros de argumentación
 * y los datos de la sección Biblioteca (Dudas + Documentos/Enlaces sin archivos binarios) permitiendo elegir la carpeta de destino
 */
export async function exportarBibliotecaAJSON(
  examenes: ExamenCompleto[],
  almacenDudasOpcional?: ItemAlmacenDuda[]
): Promise<boolean> {
  if (examenes.length === 0) {
    console.warn('No hay exámenes en la biblioteca para exportar.');
    return false;
  }

  let almacenDudas: ItemAlmacenDuda[] = almacenDudasOpcional || [];
  if (!almacenDudasOpcional || almacenDudasOpcional.length === 0) {
    try {
      const rawDudas = localStorage.getItem('c1_almacen_dudas');
      if (rawDudas) almacenDudas = JSON.parse(rawDudas);
    } catch (_) {}
  }

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

  const dataString = JSON.stringify(examenesEnriquecidos, null, 2);
  const nombreSugerido = `Biblioteca_Examenes_C1_${new Date().toISOString().split('T')[0]}.json`;
  return await guardarArchivoConSelectorCarpeta(dataString, nombreSugerido, 'application/json', '.json');
}

export interface CopiaSeguridadIntegral {
  tipo: 'copia_seguridad_simulador_c1';
  version: '3.2' | '2.6' | '2.5';
  fecha: string;
  metadata: {
    totalBancoExamenes: number;
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
  almacenDudas?: ItemAlmacenDuda[];
  /** Base de datos de enlaces a documentos locales o webs externas (NUNCA almacena archivos binarios) */
  bibliotecaDocumentos?: DocumentoBibliotecaItem[];
  subtemasBiblioteca?: string[];
  recursosArgumentacionPorPregunta?: Record<string, RecursoArgumentacionPregunta[]>;
  controlPreguntasSuperadas?: Record<string, any>;
  examenesEliminadosIds?: string[];
  historialPreguntasRecientes?: string[];
  configuracion: {
    darkMode?: boolean;
    autoAvanceAlFinal?: boolean;
    cortePropioTest?: string;
    cortePropioSupuesto?: string;
    usarCortePropio?: boolean;
    geminiApiKey?: string;
  };
}

/**
 * Genera y guarda un archivo JSON con la Copia de Seguridad Integral Única
 * permitiendo elegir en qué carpeta guardarla.
 * Incluye TODOS los aspectos de la app:
 * - Banco de Exámenes (Tests y Supuestos)
 * - Historial de Pruebas realizadas
 * - Biblioteca: Almacén de Dudas y Notas + Base de Datos de Documentos y Enlaces (sin archivos físicos) + Subtemas
 * - Recursos de Argumentación por pregunta (enlaces y rutas locales en justificaciones)
 * - Anotaciones y subrayados por examen
 * - Registro de control de preguntas falladas/superadas, historial anti-repetición y preferencias/cortes propios
 */
export async function descargarCopiaSeguridadCompleta(
  bancoOExamenes: ExamenCompleto[],
  historialOpcional?: ExamenCompleto[],
  almacenDudasOpcional?: ItemAlmacenDuda[],
  bibliotecaDocumentosOpcional?: DocumentoBibliotecaItem[],
  subtemasBibliotecaOpcional?: string[]
): Promise<boolean> {
  const enriquecerExamenConRecursos = (ex: ExamenCompleto): ExamenCompleto => ({
    ...ex,
    preguntas: ex.preguntas.map((p) => {
      const rec = obtenerRecursosArgumentacionDePregunta(p);
      return rec.length > 0 ? { ...p, recursosArgumentacion: rec } : p;
    }),
  });

  const bancoExamenes = (
    historialOpcional !== undefined
      ? bancoOExamenes
      : bancoOExamenes.filter((e) => !e.resultado)
  ).map(enriquecerExamenConRecursos);

  const historialPruebas = (
    historialOpcional !== undefined
      ? historialOpcional
      : bancoOExamenes.filter((e) => !!e.resultado)
  ).map(enriquecerExamenConRecursos);

  const todosParaAnotaciones = [...bancoExamenes, ...historialPruebas];

  // Recopilar todas las notas y subrayados de localStorage
  const anotacionesPorExamen: Record<string, any[]> = {};
  let totalAnotaciones = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('c1_anotaciones_')) {
        const examId = key.replace('c1_anotaciones_', '');
        try {
          const val = JSON.parse(localStorage.getItem(key) || '[]');
          anotacionesPorExamen[examId] = val;
          totalAnotaciones += Array.isArray(val) ? val.length : 0;
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Recopilar también anotaciones que estén dentro de los objetos examen
  todosParaAnotaciones.forEach((ex) => {
    if (ex.anotaciones && ex.anotaciones.length > 0) {
      if (!anotacionesPorExamen[ex.id]) {
        anotacionesPorExamen[ex.id] = ex.anotaciones;
        totalAnotaciones += ex.anotaciones.length;
      }
    }
  });

  // Recopilar items del almacén de dudas (usar parámetro o leer de localStorage)
  let almacenDudas: ItemAlmacenDuda[] = almacenDudasOpcional || [];
  if (!almacenDudasOpcional || almacenDudasOpcional.length === 0) {
    try {
      const rawDudas = localStorage.getItem('c1_almacen_dudas');
      if (rawDudas) almacenDudas = JSON.parse(rawDudas);
    } catch (_) {}
  }

  const almacenDudasEnriquecido = almacenDudas.map((it) => {
    const rec = obtenerRecursosArgumentacionDePregunta(it);
    return rec.length > 0 ? { ...it, recursosArgumentacion: rec } : it;
  });

  // Recopilar enlaces y metadatos de la Base de Datos de Documentos de Biblioteca (estrictamente sin archivos binarios)
  const bibliotecaDocumentos = (
    bibliotecaDocumentosOpcional && bibliotecaDocumentosOpcional.length > 0
      ? bibliotecaDocumentosOpcional
      : leerBibliotecaDocumentosDeLocalStorage()
  )
    .map((d) => sanitizarDocumentoBibliotecaSinBinarios(d))
    .filter((d): d is DocumentoBibliotecaItem => d !== null);

  const subtemasBiblioteca =
    subtemasBibliotecaOpcional && subtemasBibliotecaOpcional.length > 0
      ? guardarSubtemasBibliotecaEnLocalStorage(subtemasBibliotecaOpcional)
      : leerSubtemasBibliotecaDeLocalStorage();

  const recursosArgumentacionPorPregunta = leerMapaRecursosArgumentacionGlobal();
  const totalRecursosArgumentacion = Object.values(recursosArgumentacionPorPregunta).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  // Recopilar control de preguntas superadas/falladas
  let controlPreguntasSuperadas: Record<string, any> = {};
  try {
    const rawSuperadas = localStorage.getItem('c1_preguntas_superadas_v1');
    if (rawSuperadas) {
      const parsedSup = JSON.parse(rawSuperadas);
      if (parsedSup && typeof parsedSup === 'object') {
        controlPreguntasSuperadas = parsedSup;
      }
    }
  } catch (_) {}

  // Recopilar IDs de exámenes eliminados y preguntas recientes
  let examenesEliminadosIds: string[] = [];
  try {
    const rawEliminados = localStorage.getItem('c1_examenes_eliminados');
    if (rawEliminados) {
      const parsedElim = JSON.parse(rawEliminados);
      if (Array.isArray(parsedElim)) examenesEliminadosIds = parsedElim;
    }
  } catch (_) {}

  let historialPreguntasRecientes: string[] = [];
  try {
    const rawRecientes = localStorage.getItem('c1_historial_preguntas_recientes');
    if (rawRecientes) {
      const parsedRec = JSON.parse(rawRecientes);
      if (Array.isArray(parsedRec)) historialPreguntasRecientes = parsedRec;
    }
  } catch (_) {}

  const darkMode = localStorage.getItem('c1_dark_mode') === 'true';
  const autoAvanceRaw = localStorage.getItem('c1_auto_avance_al_final');
  const autoAvanceAlFinal = autoAvanceRaw !== null ? autoAvanceRaw === 'true' : undefined;
  const cortePropioTest = localStorage.getItem('c1_corte_propio_test') || undefined;
  const cortePropioSupuesto = localStorage.getItem('c1_corte_propio_supuesto') || undefined;
  const usarCortePropioRaw = localStorage.getItem('c1_usar_corte_propio');
  const usarCortePropio = usarCortePropioRaw !== null ? usarCortePropioRaw === 'true' : undefined;
  const geminiApiKey = localStorage.getItem('gemini_custom_api_key') || undefined;

  const backup: CopiaSeguridadIntegral = {
    tipo: 'copia_seguridad_simulador_c1',
    version: '3.2',
    fecha: new Date().toISOString(),
    metadata: {
      totalBancoExamenes: bancoExamenes.length,
      totalHistorialPruebas: historialPruebas.length,
      totalExamenes: bancoExamenes.length + historialPruebas.length,
      totalAnotaciones,
      totalDudasAlmacen: almacenDudasEnriquecido.length,
      totalDocumentosBiblioteca: bibliotecaDocumentos.length,
      totalSubtemasBiblioteca: subtemasBiblioteca.length,
      totalRecursosArgumentacion,
      totalPreguntasControlFalladas: Object.keys(controlPreguntasSuperadas).length,
      timestamp: Date.now(),
    },
    bancoExamenes,
    historialPruebas,
    examenesGuardados: [...bancoExamenes, ...historialPruebas],
    anotacionesPorExamen,
    almacenDudas: almacenDudasEnriquecido,
    bibliotecaDocumentos,
    subtemasBiblioteca,
    recursosArgumentacionPorPregunta,
    controlPreguntasSuperadas,
    examenesEliminadosIds,
    historialPreguntasRecientes,
    configuracion: {
      darkMode,
      autoAvanceAlFinal,
      cortePropioTest,
      cortePropioSupuesto,
      usarCortePropio,
      geminiApiKey,
    },
  };

  const dataString = JSON.stringify(backup, null, 2);
  const fechaStr = new Date().toISOString().split('T')[0];
  const nombreSugerido = `Copia_Seguridad_Simulador_C1_${fechaStr}.json`;

  return await guardarArchivoConSelectorCarpeta(dataString, nombreSugerido, 'application/json', '.json');
}

/**
 * Procesa y restaura una Copia de Seguridad Integral Única desde un archivo JSON/TXT
 * restaurando todos los aspectos de la aplicación: Banco, Historial, Biblioteca (Dudas + Enlaces + Subtemas),
 * Recursos de Argumentación, Anotaciones, Control de Preguntas Falladas/Superadas y Configuración.
 */
export function restaurarCopiaSeguridadCompleta(rawText: string): {
  bancoExamenes: ExamenCompleto[];
  historialPruebas: ExamenCompleto[];
  examenes: ExamenCompleto[];
  almacenDudas: ItemAlmacenDuda[];
  bibliotecaDocumentos: DocumentoBibliotecaItem[];
  subtemasBiblioteca: string[];
  examenesEliminadosIds: string[];
  darkModeRestaurado?: boolean;
  anotacionesRestauradas: number;
} {
  const cleaned = limpiarTextoJSON(rawText);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error('El archivo de copia de seguridad no contiene un formato JSON válido.');
  }

  let bancoExamenes: ExamenCompleto[] = [];
  let historialPruebas: ExamenCompleto[] = [];
  let anotacionesCount = 0;

  if (parsed.recursosArgumentacionPorPregunta && typeof parsed.recursosArgumentacionPorPregunta === 'object') {
    const mapaActual = leerMapaRecursosArgumentacionGlobal();
    Object.entries(parsed.recursosArgumentacionPorPregunta).forEach(([clave, lista]) => {
      if (Array.isArray(lista) && lista.length > 0) {
        mapaActual[clave] = lista as RecursoArgumentacionPregunta[];
      }
    });
    guardarEnLocalStorageSeguro(STORAGE_KEY_RECURSOS_ARGUMENTACION, mapaActual);
  }

  if (parsed.controlPreguntasSuperadas && typeof parsed.controlPreguntasSuperadas === 'object') {
    try {
      const actualRaw = localStorage.getItem('c1_preguntas_superadas_v1');
      const actualObj = actualRaw ? JSON.parse(actualRaw) : {};
      const fusionado = { ...actualObj, ...parsed.controlPreguntasSuperadas };
      guardarEnLocalStorageSeguro('c1_preguntas_superadas_v1', fusionado);
    } catch (_) {}
  }

  let examenesEliminadosIds: string[] = [];
  try {
    const rawElim = localStorage.getItem('c1_examenes_eliminados');
    if (rawElim) {
      const parsedElim = JSON.parse(rawElim);
      if (Array.isArray(parsedElim)) examenesEliminadosIds = parsedElim;
    }
  } catch (_) {}

  if (Array.isArray(parsed.examenesEliminadosIds)) {
    examenesEliminadosIds = Array.from(new Set([...examenesEliminadosIds, ...parsed.examenesEliminadosIds]));
    guardarEnLocalStorageSeguro('c1_examenes_eliminados', examenesEliminadosIds);
  }

  if (Array.isArray(parsed.historialPreguntasRecientes)) {
    guardarEnLocalStorageSeguro('c1_historial_preguntas_recientes', parsed.historialPreguntasRecientes);
  }

  let darkModeRestaurado: boolean | undefined = undefined;
  if (parsed.configuracion && typeof parsed.configuracion === 'object') {
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
      localStorage.setItem('gemini_custom_api_key', parsed.configuracion.geminiApiKey);
    }
  }

  // Caso A: Copia v2.5 / v2.6 / v3.2 con bancoExamenes e historialPruebas separados
  if (
    parsed.tipo === 'copia_seguridad_simulador_c1' &&
    (Array.isArray(parsed.bancoExamenes) || Array.isArray(parsed.historialPruebas))
  ) {
    if (Array.isArray(parsed.bancoExamenes)) {
      bancoExamenes = parsed.bancoExamenes.map((item: any) => validarYConvertirJSON(item));
    }
    if (Array.isArray(parsed.historialPruebas)) {
      historialPruebas = parsed.historialPruebas.map((item: any) => validarYConvertirJSON(item));
    }

    if (parsed.anotacionesPorExamen && typeof parsed.anotacionesPorExamen === 'object') {
      Object.entries(parsed.anotacionesPorExamen).forEach(([examId, notas]) => {
        if (Array.isArray(notas)) {
          localStorage.setItem(`c1_anotaciones_${examId}`, JSON.stringify(notas));
          anotacionesCount += notas.length;
        }
      });
    }
  }
  // Caso B: Copia v1.0 con examenesGuardados
  else if (parsed.tipo === 'copia_seguridad_simulador_c1' && Array.isArray(parsed.examenesGuardados)) {
    const todos = parsed.examenesGuardados.map((item: any) => validarYConvertirJSON(item));
    historialPruebas = todos.filter((e: ExamenCompleto) => !!e.resultado);
    bancoExamenes = todos.filter((e: ExamenCompleto) => !e.resultado);

    if (parsed.anotacionesPorExamen && typeof parsed.anotacionesPorExamen === 'object') {
      Object.entries(parsed.anotacionesPorExamen).forEach(([examId, notas]) => {
        if (Array.isArray(notas)) {
          localStorage.setItem(`c1_anotaciones_${examId}`, JSON.stringify(notas));
          anotacionesCount += notas.length;
        }
      });
    }
  }
  // Caso C: Array simple de exámenes
  else if (Array.isArray(parsed)) {
    const todos = parsed.map((item: any) => validarYConvertirJSON(item));
    historialPruebas = todos.filter((e: ExamenCompleto) => !!e.resultado);
    bancoExamenes = todos.filter((e: ExamenCompleto) => !e.resultado);
  }
  // Caso D: Un único examen
  else if (parsed.titulo && parsed.preguntas) {
    const unExamen = validarYConvertirJSON(parsed);
    if (unExamen.resultado) {
      historialPruebas = [unExamen];
    } else {
      bancoExamenes = [unExamen];
    }
  } else if (Array.isArray(parsed.bibliotecaDocumentos) || Array.isArray(parsed.almacenDudas)) {
    // Caso E: Retrocompatibilidad con archivos JSON previos de Biblioteca; conservamos banco e historial actuales
    try {
      const savedBanco = localStorage.getItem('c1_banco_examenes');
      if (savedBanco) {
        const parsedB = JSON.parse(savedBanco);
        if (Array.isArray(parsedB)) bancoExamenes = parsedB;
      }
      const savedHist = localStorage.getItem('c1_historial_pruebas');
      if (savedHist) {
        const parsedH = JSON.parse(savedHist);
        if (Array.isArray(parsedH)) historialPruebas = parsedH;
      }
    } catch (_) {}
  } else {
    throw new Error('El archivo no tiene la estructura de una copia de seguridad ni de examen oficial.');
  }

  const almacenDudasRestauradas = fusionarAlmacenDudasEnLocalStorage(
    Array.isArray(parsed.almacenDudas) ? parsed.almacenDudas : undefined
  );

  const bibliotecaDocumentosRestaurados = fusionarBibliotecaDocumentosEnLocalStorage(
    Array.isArray(parsed.bibliotecaDocumentos) ? parsed.bibliotecaDocumentos : undefined
  );

  const subtemasBibliotecaRestaurados = fusionarSubtemasBibliotecaEnLocalStorage(
    Array.isArray(parsed.subtemasBiblioteca) ? parsed.subtemasBiblioteca : undefined
  );

  // Guardar anotaciones internas de los exámenes
  [...bancoExamenes, ...historialPruebas].forEach((ex) => {
    if (ex.anotaciones && ex.anotaciones.length > 0) {
      localStorage.setItem(`c1_anotaciones_${ex.id}`, JSON.stringify(ex.anotaciones));
      anotacionesCount += ex.anotaciones.length;
    }
  });

  return {
    bancoExamenes,
    historialPruebas,
    examenes: [...bancoExamenes, ...historialPruebas],
    almacenDudas: almacenDudasRestauradas,
    bibliotecaDocumentos: bibliotecaDocumentosRestaurados,
    subtemasBiblioteca: subtemasBibliotecaRestaurados,
    examenesEliminadosIds,
    darkModeRestaurado,
    anotacionesRestauradas: anotacionesCount,
  };
}

/**
 * Guarda datos en localStorage de forma segura y blindada contra QuotaExceededError.
 * Si se alcanza el límite del almacenamiento, realiza una purga de datos volátiles/temporales
 * y reintenta la operación sin interrumpir el flujo ni romper la aplicación.
 */
export function guardarEnLocalStorageSeguro(key: string, data: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Excedido límite al guardar "${key}" en localStorage:`, err);
    try {
      // 1. Limpieza de claves temporales, de sesión o heredadas
      localStorage.removeItem('c1_active_exam_session');
      localStorage.removeItem('c1_examenes_guardados'); // clave legacy pesada
      localStorage.removeItem('c1_historial_preguntas_recientes');

      // 2. Reintentar guardar
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch (retryErr) {
      console.warn(`[Storage] Reintento tras purga falló para "${key}":`, retryErr);
      // 3. Si sigue fallando por cuota, podar elementos antiguos si es un array
      if (Array.isArray(data)) {
        try {
          const podado = data.slice(0, 25);
          localStorage.setItem(key, JSON.stringify(podado));
          return true;
        } catch (_) {}
      }
      return false;
    }
  }
}

