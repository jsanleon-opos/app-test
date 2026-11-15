import { jsPDF } from 'jspdf';
import { ExamenCompleto, PreguntaExamen } from '../types';
import {
  eliminarDeIndexedDB,
  guardarDatoPersistenteIntegral,
  leerDatoPersistenteSincrono,
} from './idbPersistentStore';

export interface OpcionesExportacionPDFOficial {
  modelo?: 'A' | 'B';
  codigoPiePagina?: string;
  incluirPlantillaSoluciones?: boolean;
  incluirPortadaInstruccionesTribunal?: boolean;
  incluirAnexoJustificacionesBOE?: boolean;
  barajarPreguntas?: boolean;
  semillaBarajado?: number;
  duracionMinutosPortada?: number;
  subtituloCuerpo?: string;
  supuestoAdicional1?: ExamenCompleto | null;
  supuestoAdicional2?: ExamenCompleto | null;
}

interface BloqueSeccionCuadernillo {
  tipoSeccion: 'primera_parte' | 'supuesto';
  tituloRecuadro: string; // Ej: "PRIMERA PARTE", "SUPUESTO I", "SUPUESTO II"
  tituloClave: string; // Ej: "Primera parte", "Supuesto I", "Supuesto II"
  contextoCaso?: string;
  preguntasOrdinarias: PreguntaExamen[];
  preguntasReserva: PreguntaExamen[];
  iniciarEnNuevaPagina: boolean;
}

export interface ResultadoGeneracionPDFOficial {
  cuadernilloBlob: Blob;
  cuadernilloNombreArchivo: string;
  paginasCuadernillo: number;
  plantillaOMRBlob: Blob;
  plantillaOMRNombreArchivo: string;
  combinadoBlob: Blob;
  combinadoNombreArchivo: string;
  anexoJustificacionesBlob: Blob;
  anexoJustificacionesNombreArchivo: string;
  paginasAnexoJustificaciones: number;
  codigoPieAplicado: string;
  totalOrdinarias: number;
  totalReservas: number;
  testsIncluidos: string[];
  resumenSecciones: Array<{ titulo: string; ordinarias: number; reservas: number }>;
}

export interface RegistroTestDescargadoPDF {
  id: string;
  examenId: string;
  testBaseId?: string;
  tituloPrincipal: string;
  testsIncluidos: string[];
  modelo: 'A' | 'B';
  tipoArchivo:
    | 'examen_y_plantilla'
    | 'todo_en_1_pdf'
    | 'solo_examen'
    | 'solo_plantilla'
    | 'solo_anexo_boe';
  fechaDescargaISO: string;
}

const STORAGE_KEY_TESTS_DESCARGADOS_PDF = 'c1_tests_descargados_pdf';

export function leerTestsDescargadosDeLocalStorage(): RegistroTestDescargadoPDF[] {
  const lista = leerDatoPersistenteSincrono<RegistroTestDescargadoPDF[]>(
    STORAGE_KEY_TESTS_DESCARGADOS_PDF,
    []
  );
  return Array.isArray(lista) ? lista : [];
}

export function registrarDescargaTestEnLocalStorage(
  nuevo: Omit<RegistroTestDescargadoPDF, 'id' | 'fechaDescargaISO'>
): RegistroTestDescargadoPDF[] {
  const actuales = leerTestsDescargadosDeLocalStorage();
  const ahora = new Date().toISOString();
  const firmaTests = nuevo.testsIncluidos.join(' | ').trim().toLowerCase();

  // Si el mismo conjunto de tests ya estaba registrado, actualizar su fecha/formato y subirlo al primer lugar
  const sinDuplicadoExacto = actuales.filter((item) => {
    const firmaItem = item.testsIncluidos.join(' | ').trim().toLowerCase();
    return !(item.examenId === nuevo.examenId && firmaItem === firmaTests);
  });

  const registroCompleto: RegistroTestDescargadoPDF = {
    ...nuevo,
    id: `dl-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fechaDescargaISO: ahora,
  };

  const actualizados = [registroCompleto, ...sinDuplicadoExacto].slice(0, 50);
  guardarDatoPersistenteIntegral(STORAGE_KEY_TESTS_DESCARGADOS_PDF, actualizados);
  return actualizados;
}

export function eliminarRegistroTestDescargadoDeLocalStorage(
  registroId: string
): RegistroTestDescargadoPDF[] {
  const filtrados = leerTestsDescargadosDeLocalStorage().filter((r) => r.id !== registroId);
  guardarDatoPersistenteIntegral(STORAGE_KEY_TESTS_DESCARGADOS_PDF, filtrados);
  return filtrados;
}

export function limpiarTestsDescargadosDeLocalStorage(): RegistroTestDescargadoPDF[] {
  guardarDatoPersistenteIntegral(STORAGE_KEY_TESTS_DESCARGADOS_PDF, []);
  try {
    localStorage.removeItem(STORAGE_KEY_TESTS_DESCARGADOS_PDF);
  } catch (_) {}
  void eliminarDeIndexedDB(STORAGE_KEY_TESTS_DESCARGADOS_PDF);
  return [];
}

/**
 * Devuelve la lista exacta y legible de los tests y/o supuestos incluidos en una descarga PDF.
 */
export function obtenerResumenTestsIncluidosEnDescarga(
  examen: ExamenCompleto,
  opciones?: OpcionesExportacionPDFOficial
): string[] {
  const resultado: string[] = [];

  if (Array.isArray(examen.testsIncluidos) && examen.testsIncluidos.length > 0) {
    examen.testsIncluidos.forEach((t) => {
      const limpio = String(t || '').trim();
      if (limpio) resultado.push(limpio);
    });
  } else if (examen.titulo?.trim()) {
    const esSup =
      examen.tipo === 'supuesto' ||
      examen.categoria?.startsWith('supuesto') ||
      Boolean(examen.contextoCaso && examen.contextoCaso.trim().length > 20);
    const totalOrd = Array.isArray(examen.preguntas)
      ? examen.preguntas.filter((p) => !p.esReserva).length
      : 0;
    const totalRes = Array.isArray(examen.preguntas)
      ? examen.preguntas.filter((p) => Boolean(p.esReserva)).length
      : 0;
    const sufijoPreg =
      totalOrd > 0 ? ` (${totalOrd}${totalRes > 0 ? `+${totalRes} res.` : ''} preg.)` : '';
    resultado.push(
      `${esSup ? 'Supuesto práctico' : 'Test'}: ${examen.titulo.trim()}${
        examen.titulo.includes('preg') ? '' : sufijoPreg
      }`
    );
  }

  const extras = [opciones?.supuestoAdicional1, opciones?.supuestoAdicional2].filter(
    (x): x is ExamenCompleto => Boolean(x && x.preguntas && x.preguntas.length > 0)
  );

  // Contar cuántos supuestos había ya en el examen principal
  const yaTieneSupuestoBase =
    examen.tipo === 'supuesto' ||
    examen.categoria?.startsWith('supuesto') ||
    Boolean(examen.contextoCaso && examen.contextoCaso.trim().length > 20) ||
    (Array.isArray(examen.preguntas) &&
      examen.preguntas.some((p) => Boolean((p as any).bloqueSimulacro === 'parte2_ordinaria')));

  extras.forEach((supExtra, idx) => {
    const numSup = (yaTieneSupuestoBase ? 1 : 0) + idx + 1;
    const romano = numSup === 1 ? 'I' : numSup === 2 ? 'II' : String(numSup);
    resultado.push(`Supuesto ${romano}: ${supExtra.titulo.trim()}`);
  });

  return resultado;
}

/**
 * Normaliza caracteres tipográficos especiales fuera de WinAnsi/Latin-1 para evitar
 * cualquier símbolo extraño en las fuentes vectoriales estándar de PDF (Helvetica/Arial).
 */
export function normalizarTextoParaPDFOficial(texto: string | undefined | null): string {
  if (!texto) return '';
  return String(texto)
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u2260/g, '!=')
    .replace(/[\u2192\u2794\u27A1]/g, '->')
    .replace(/[\u2022\u25CF\u25AA]/g, '-')
    // Eliminar emojis decorativos fuera de BMP o pictogramas de interfaz si aparecieran en títulos
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Mantener rango imprimible Latin-1 + símbolo Euro (€ = \u20AC) y saltos de línea
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF\u20AC]/g, '')
    .replace(/[ \t]+/g, ' ');
}

function limpiarEnunciadoPregunta(enunciado: string): string {
  let limpio = normalizarTextoParaPDFOficial(enunciado).trim();
  limpio = limpio.replace(/^\[?\s*RESERVA(?:\s*\d+)?\s*\]?\s*[-:.)]?\s*/i, '');
  limpio = limpio.replace(/^\d+\s*[.)\-]\s+/, '');
  return limpio.trim();
}

function limpiarTextoOpcion(texto: string): string {
  let limpio = normalizarTextoParaPDFOficial(texto).trim();
  limpio = limpio.replace(/^[a-dA-D]\s*[.)\-]\s+/, '');
  return limpio.trim();
}

function generarSlugArchivo(titulo: string): string {
  const base = normalizarTextoParaPDFOficial(titulo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 55);
  return base || 'Examen_Oficial_C1';
}

export function deducirCodigoPiePorDefecto(
  examen: ExamenCompleto,
  modelo: 'A' | 'B' = 'A'
): string {
  const matchAno = examen.titulo.match(/\b(202\d)\b/) || examen.fecha?.match(/\b(202\d)\b/);
  const ano = matchAno ? matchAno[1] : new Date().getFullYear().toString();
  const codigoCuerpo = examen.ambito === 'CAM' ? 'ADVO-CAM' : 'ADVO-L';
  return `${ano} - ${codigoCuerpo} - MODELO ${modelo}`;
}

export function deducirSubtituloCuerpoPorDefecto(examen: ExamenCompleto): string {
  if (examen.ambito === 'CAM') {
    return 'Cuerpo de Administrativos de Administración General de la Comunidad de Madrid';
  }
  return 'Cuerpo General Administrativo de la Administración del Estado - Ingreso Libre';
}

function barajarArrayDeterminista<T>(items: T[], semillaBase: number): T[] {
  const copia = [...items];
  let s = (Math.abs(Math.floor(semillaBase)) || 1234567) % 2147483647;
  if (s <= 0) s = 9876543;
  for (let i = copia.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    const tmp = copia[i];
    copia[i] = copia[j];
    copia[j] = tmp;
  }
  return copia;
}

/**
 * Extrae las secciones estructuradas (Primera Parte, Supuesto I, Supuesto II...)
 * a partir de cualquier ExamenCompleto (Test unitario, Supuesto práctico o Simulacro Unificado 70+20).
 */
function construirSeccionesCuadernillo(
  examen: ExamenCompleto,
  opciones?: OpcionesExportacionPDFOficial
): BloqueSeccionCuadernillo[] {
  const secciones: BloqueSeccionCuadernillo[] = [];
  const preguntasRaw = Array.isArray(examen.preguntas) ? examen.preguntas : [];

  const tieneBloquesSimulacro = preguntasRaw.some(
    (p) => Boolean((p as any).bloqueSimulacro)
  );

  if (tieneBloquesSimulacro) {
    const p1Ord = preguntasRaw.filter((p) => (p as any).bloqueSimulacro === 'parte1_ordinaria');
    const p1Res = preguntasRaw.filter((p) => (p as any).bloqueSimulacro === 'parte1_reserva');
    const p2Ord = preguntasRaw.filter((p) => (p as any).bloqueSimulacro === 'parte2_ordinaria');
    const p2Res = preguntasRaw.filter((p) => (p as any).bloqueSimulacro === 'parte2_reserva');

    if (p1Ord.length > 0 || p1Res.length > 0) {
      secciones.push({
        tipoSeccion: 'primera_parte',
        tituloRecuadro: 'PRIMERA PARTE',
        tituloClave: 'Primera parte',
        preguntasOrdinarias: p1Ord,
        preguntasReserva: p1Res,
        iniciarEnNuevaPagina: false,
      });
    }

    if (p2Ord.length > 0 || p2Res.length > 0) {
      secciones.push({
        tipoSeccion: 'supuesto',
        tituloRecuadro: 'SUPUESTO I',
        tituloClave: 'Supuesto I',
        contextoCaso: examen.contextoCaso,
        preguntasOrdinarias: p2Ord,
        preguntasReserva: p2Res,
        iniciarEnNuevaPagina: secciones.length > 0,
      });
    }
  } else {
    const esSupuesto =
      examen.tipo === 'supuesto' ||
      examen.categoria?.startsWith('supuesto') ||
      Boolean(examen.contextoCaso && examen.contextoCaso.trim().length > 20);

    const ordinarias = preguntasRaw.filter((p) => !p.esReserva);
    const reservas = preguntasRaw.filter((p) => Boolean(p.esReserva));

    if (esSupuesto) {
      const esSupuestoDos = /\bsupuesto\s*(ii|2)\b/i.test(examen.titulo);
      secciones.push({
        tipoSeccion: 'supuesto',
        tituloRecuadro: esSupuestoDos ? 'SUPUESTO II' : 'SUPUESTO I',
        tituloClave: esSupuestoDos ? 'Supuesto II' : 'Supuesto I',
        contextoCaso: examen.contextoCaso,
        preguntasOrdinarias: ordinarias,
        preguntasReserva: reservas,
        iniciarEnNuevaPagina: false,
      });
    } else {
      secciones.push({
        tipoSeccion: 'primera_parte',
        tituloRecuadro: 'PRIMERA PARTE',
        tituloClave: 'Primera parte',
        preguntasOrdinarias: ordinarias,
        preguntasReserva: reservas,
        iniciarEnNuevaPagina: false,
      });
    }
  }

  // Si el usuario adjuntó opcionalmente Supuesto I o Supuesto II adicionales para armar cuadernillo completo
  const extras = [opciones?.supuestoAdicional1, opciones?.supuestoAdicional2].filter(
    (x): x is ExamenCompleto => Boolean(x && x.preguntas && x.preguntas.length > 0)
  );

  extras.forEach((supExtra) => {
    const numSupuestosPrevios = secciones.filter((s) => s.tipoSeccion === 'supuesto').length;
    const etiquetaRomana =
      numSupuestosPrevios === 0 ? 'I' : numSupuestosPrevios === 1 ? 'II' : `${numSupuestosPrevios + 1}`;
    secciones.push({
      tipoSeccion: 'supuesto',
      tituloRecuadro: `SUPUESTO ${etiquetaRomana}`,
      tituloClave: `Supuesto ${etiquetaRomana}`,
      contextoCaso: supExtra.contextoCaso,
      preguntasOrdinarias: supExtra.preguntas.filter((p) => !p.esReserva),
      preguntasReserva: supExtra.preguntas.filter((p) => Boolean(p.esReserva)),
      iniciarEnNuevaPagina: true,
    });
  });

  if (opciones?.barajarPreguntas) {
    const semilla = opciones.semillaBarajado || 202601;
    return secciones.map((sec, idx) => ({
      ...sec,
      preguntasOrdinarias: barajarArrayDeterminista(sec.preguntasOrdinarias, semilla + idx * 97),
      preguntasReserva: barajarArrayDeterminista(sec.preguntasReserva, semilla + idx * 193 + 31),
    }));
  }

  return secciones;
}

function dibujarUnaLineaJustificada(
  doc: jsPDF,
  lineaRaw: string,
  x: number,
  y: number,
  anchoMaximo: number,
  esUltimaLinea: boolean
): void {
  const linea = lineaRaw.trim();
  if (!linea) return;

  if (esUltimaLinea) {
    doc.text(linea, x, y);
    return;
  }

  const palabras = linea.split(/\s+/).filter(Boolean);
  if (palabras.length <= 1) {
    doc.text(linea, x, y);
    return;
  }

  const anchoEspacioNormal = doc.getTextWidth(' ');
  const anchoPalabras = palabras.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
  const espacioRestante = anchoMaximo - anchoPalabras;
  const huecoPorEspacio = espacioRestante / (palabras.length - 1);

  if (huecoPorEspacio > 0 && huecoPorEspacio <= anchoEspacioNormal * 3.2) {
    let cursorX = x;
    for (let wIdx = 0; wIdx < palabras.length; wIdx++) {
      const palabra = palabras[wIdx];
      doc.text(palabra, cursorX, y);
      cursorX += doc.getTextWidth(palabra) + huecoPorEspacio;
    }
  } else {
    doc.text(linea, x, y);
  }
}

/**
 * Dibuja un bloque de líneas de texto con justificación completa (izquierda y derecha)
 * en todas las líneas salvo la última del párrafo, idéntico a la maquetación oficial INAP/BOE.
 */
function dibujarLineasJustificadas(
  doc: jsPDF,
  lineas: string[],
  x: number,
  yInicial: number,
  anchoMaximo: number,
  altoLinea: number
): number {
  let cursorY = yInicial;
  for (let i = 0; i < lineas.length; i++) {
    dibujarUnaLineaJustificada(
      doc,
      lineas[i],
      x,
      cursorY,
      anchoMaximo,
      i === lineas.length - 1
    );
    cursorY += altoLinea;
  }
  return cursorY;
}

/**
 * Renderiza el Cuadernillo Oficial de Examen (idéntico al PDF adjunto de la CPS / INAP)
 * sobre una instancia jsPDF dada y devuelve el número de páginas del cuadernillo.
 */
function renderizarCuadernilloEnDocumento(
  doc: jsPDF,
  examen: ExamenCompleto,
  opciones?: OpcionesExportacionPDFOficial
): {
  paginasCuadernillo: number;
  totalOrdinarias: number;
  totalReservas: number;
  seccionesRenderizadas: BloqueSeccionCuadernillo[];
} {
  const modelo = opciones?.modelo || 'A';
  const codigoPie =
    opciones?.codigoPiePagina?.trim() || deducirCodigoPiePorDefecto(examen, modelo);
  const incluirSoluciones = opciones?.incluirPlantillaSoluciones ?? true;
  const subtituloCuerpo =
    opciones?.subtituloCuerpo?.trim() || deducirSubtituloCuerpoPorDefecto(examen);
  const testsIncluidos = obtenerResumenTestsIncluidosEnDescarga(examen, opciones);

  const secciones = construirSeccionesCuadernillo(examen, opciones);

  const MARGEN_IZQ = 15;
  const MARGEN_DER = 15;
  const ANCHO_UTIL = 210 - MARGEN_IZQ - MARGEN_DER; // 180 mm
  const MARGEN_SUP = 14.5;
  const LIMITE_Y_CONTENIDO = 276.5;

  const X_NUMERO_PREG = MARGEN_IZQ; // 15 mm
  const X_TEXTO_PREG = 22.5; // Sangría francesa del enunciado y de las letras a) b) c) d)
  const ANCHO_TEXTO_PREG = 210 - MARGEN_DER - X_TEXTO_PREG; // 172.5 mm

  const X_OPC_COL1_LETRA = 22.5;
  const X_OPC_COL1_TEXTO = 29.5;
  const ANCHO_OPC_COL1 = 74.5; // hasta x = 104 mm

  const X_OPC_COL2_LETRA = 108.5;
  const X_OPC_COL2_TEXTO = 115.5;
  const ANCHO_OPC_COL2 = 79.5; // hasta x = 195 mm

  const ANCHO_OPC_1COL = 210 - MARGEN_DER - X_OPC_COL1_TEXTO; // 165.5 mm

  const FONT_PT = 9.5;
  const ALTO_LINEA_ENUNCIADO = 4.05;
  const ALTO_LINEA_OPCION = 3.95;
  const ALTO_LINEA_CASO = 4.1;
  const ESPACIO_ENTRE_PREGUNTAS = 3.5;

  let cursorY = MARGEN_SUP;

  const nuevaPaginaCuadernillo = () => {
    doc.addPage('a4', 'portrait');
    cursorY = MARGEN_SUP;
  };

  const dibujarEncabezadoTestsDescargadosPortada = () => {
    if (testsIncluidos.length === 0) return;

    const etiquetaCab =
      testsIncluidos.length > 1
        ? 'TESTS Y SUPUESTOS DESCARGADOS PARA REALIZAR:'
        : 'TEST / PRUEBA DESCARGADA PARA REALIZAR:';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    const lineasItems: string[] = [];
    testsIncluidos.forEach((item) => {
      const limpio = normalizarTextoParaPDFOficial(item);
      const prefijo = testsIncluidos.length > 1 ? '- ' : '';
      const envueltas: string[] = doc.splitTextToSize(`${prefijo}${limpio}`, ANCHO_UTIL - 6);
      lineasItems.push(...envueltas);
    });

    const altoLineaItem = 3.55;
    const altoCaja = 5.4 + lineasItems.length * altoLineaItem + 1.8;

    doc.setDrawColor(60, 60, 60);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.24);
    doc.rect(MARGEN_IZQ, cursorY, ANCHO_UTIL, altoCaja, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(30, 41, 59);
    doc.text(etiquetaCab, MARGEN_IZQ + 3, cursorY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(0, 0, 0);
    let yTexto = cursorY + 7.4;
    lineasItems.forEach((lin) => {
      doc.text(lin, MARGEN_IZQ + 3, yTexto);
      yTexto += altoLineaItem;
    });

    cursorY += altoCaja + 3.2;
  };

  const dibujarRecuadroSeccion = (titulo: string) => {
    const altoCaja = 6.4;
    if (cursorY + altoCaja + 18 > LIMITE_Y_CONTENIDO) {
      nuevaPaginaCuadernillo();
    }
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.rect(MARGEN_IZQ, cursorY, ANCHO_UTIL, altoCaja, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(
      normalizarTextoParaPDFOficial(titulo).toUpperCase(),
      105,
      cursorY + 4.45,
      { align: 'center' }
    );
    cursorY += altoCaja + 5.8;
  };

  const dibujarRelatoSupuesto = (contextoCaso: string) => {
    const limpio = normalizarTextoParaPDFOficial(contextoCaso).trim();
    if (!limpio) return;

    const parrafos = limpio
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_PT);
    doc.setTextColor(0, 0, 0);

    for (const parrafo of parrafos) {
      const lineas: string[] = doc.splitTextToSize(parrafo, ANCHO_UTIL);
      // Si el párrafo no cabe, pasar de línea/página limpiamente
      for (let i = 0; i < lineas.length; i++) {
        if (cursorY + ALTO_LINEA_CASO > LIMITE_Y_CONTENIDO) {
          nuevaPaginaCuadernillo();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(FONT_PT);
          doc.setTextColor(0, 0, 0);
        }
        dibujarUnaLineaJustificada(
          doc,
          lineas[i],
          MARGEN_IZQ,
          cursorY,
          ANCHO_UTIL,
          i === lineas.length - 1
        );
        cursorY += ALTO_LINEA_CASO;
      }
      cursorY += 2.6;
    }

    // Añadir la frase canónica del tribunal si el supuesto aún no la incluye al final
    const ultimoParrafo = parrafos[parrafos.length - 1] || '';
    if (!/siguientes\s+cuestiones\s*:\s*$/i.test(ultimoParrafo)) {
      if (cursorY + ALTO_LINEA_CASO + 4 > LIMITE_Y_CONTENIDO) {
        nuevaPaginaCuadernillo();
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_PT);
      doc.text('Se plantean las siguientes cuestiones:', MARGEN_IZQ, cursorY);
      cursorY += ALTO_LINEA_CASO + 3.2;
    } else {
      cursorY += 1.2;
    }
  };

  const dibujarSubtituloPreguntasReserva = () => {
    if (cursorY + 26 > LIMITE_Y_CONTENIDO) {
      nuevaPaginaCuadernillo();
    } else {
      cursorY += 2.2;
    }
    const texto = 'Preguntas de reserva';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_PT);
    doc.setTextColor(0, 0, 0);
    doc.text(texto, MARGEN_IZQ, cursorY);
    const anchoSub = doc.getTextWidth(texto);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.28);
    doc.line(MARGEN_IZQ, cursorY + 0.85, MARGEN_IZQ + anchoSub, cursorY + 0.85);
    cursorY += 5.2;
  };

  const dibujarPreguntaOficial = (pregunta: PreguntaExamen, numeroVisible: number) => {
    const enunciado = limpiarEnunciadoPregunta(pregunta.enunciado);
    const letrasOrden: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const textosOpciones = letrasOrden.map((letra, idx) => {
      const encontrada =
        pregunta.opciones?.find((o) => o.id?.toUpperCase() === letra) ||
        pregunta.opciones?.[idx];
      return limpiarTextoOpcion(encontrada?.texto || '');
    });

    // 1. Medir altura exacta del enunciado en negrita
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_PT);
    const lineasEnunciado: string[] = doc.splitTextToSize(
      enunciado || 'Pregunta sin enunciado.',
      ANCHO_TEXTO_PREG
    );
    const altoEnunciado = lineasEnunciado.length * ALTO_LINEA_ENUNCIADO;

    // 2. Determinar si las 4 opciones caben en formato de 2 columnas (a/b arriba, c/d abajo)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_PT);
    const cabenEnDosColumnas =
      doc.getTextWidth(textosOpciones[0]) <= ANCHO_OPC_COL1 - 1.5 &&
      doc.getTextWidth(textosOpciones[1]) <= ANCHO_OPC_COL2 - 1.5 &&
      doc.getTextWidth(textosOpciones[2]) <= ANCHO_OPC_COL1 - 1.5 &&
      doc.getTextWidth(textosOpciones[3]) <= ANCHO_OPC_COL2 - 1.5;

    let lineasOpcionesVerticales: string[][] = [];
    let altoOpciones = 0;

    if (cabenEnDosColumnas) {
      altoOpciones = 2 * ALTO_LINEA_OPCION;
    } else {
      lineasOpcionesVerticales = textosOpciones.map((txt) =>
        doc.splitTextToSize(txt || '-', ANCHO_OPC_1COL)
      );
      const totalLineasOpc = lineasOpcionesVerticales.reduce(
        (acc, arr) => acc + Math.max(1, arr.length),
        0
      );
      altoOpciones = totalLineasOpc * ALTO_LINEA_OPCION;
    }

    const altoTotalPregunta = altoEnunciado + 0.6 + altoOpciones;

    // Evitar partir una pregunta por la mitad entre dos páginas
    if (
      cursorY + altoTotalPregunta > LIMITE_Y_CONTENIDO &&
      cursorY > MARGEN_SUP + 8
    ) {
      nuevaPaginaCuadernillo();
    }

    // 3. Dibujar número + enunciado en negrita justificado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_PT);
    doc.setTextColor(0, 0, 0);
    doc.text(`${numeroVisible}.`, X_NUMERO_PREG, cursorY);
    cursorY = dibujarLineasJustificadas(
      doc,
      lineasEnunciado,
      X_TEXTO_PREG,
      cursorY,
      ANCHO_TEXTO_PREG,
      ALTO_LINEA_ENUNCIADO
    );
    cursorY += 0.5;

    // 4. Dibujar opciones a), b), c), d) en fuente normal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_PT);
    const etiquetasMin = ['a)', 'b)', 'c)', 'd)'];

    if (cabenEnDosColumnas) {
      // Fila 1: a) izquierda, b) derecha
      doc.text('a)', X_OPC_COL1_LETRA, cursorY);
      doc.text(textosOpciones[0], X_OPC_COL1_TEXTO, cursorY);
      doc.text('b)', X_OPC_COL2_LETRA, cursorY);
      doc.text(textosOpciones[1], X_OPC_COL2_TEXTO, cursorY);
      cursorY += ALTO_LINEA_OPCION;

      // Fila 2: c) izquierda, d) derecha
      doc.text('c)', X_OPC_COL1_LETRA, cursorY);
      doc.text(textosOpciones[2], X_OPC_COL1_TEXTO, cursorY);
      doc.text('d)', X_OPC_COL2_LETRA, cursorY);
      doc.text(textosOpciones[3], X_OPC_COL2_TEXTO, cursorY);
      cursorY += ALTO_LINEA_OPCION;
    } else {
      for (let idxOpc = 0; idxOpc < 4; idxOpc++) {
        const lineasOpc = lineasOpcionesVerticales[idxOpc];
        if (cursorY + lineasOpc.length * ALTO_LINEA_OPCION > LIMITE_Y_CONTENIDO) {
          nuevaPaginaCuadernillo();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(FONT_PT);
        }
        doc.text(etiquetasMin[idxOpc], X_OPC_COL1_LETRA, cursorY);
        cursorY = dibujarLineasJustificadas(
          doc,
          lineasOpc,
          X_OPC_COL1_TEXTO,
          cursorY,
          ANCHO_OPC_1COL,
          ALTO_LINEA_OPCION
        );
      }
    }

    cursorY += ESPACIO_ENTRE_PREGUNTAS;
  };

  let totalOrdinarias = 0;
  let totalReservas = 0;

  if (opciones?.incluirPortadaInstruccionesTribunal) {
    renderizarPortadaInstruccionesTribunalEnPaginaActual(
      doc,
      examen,
      secciones,
      modelo,
      subtituloCuerpo,
      testsIncluidos,
      opciones.duracionMinutosPortada || 100
    );
    nuevaPaginaCuadernillo();
  }

  // Encabezado inicial en la primera página de preguntas indicando qué test(s) se han descargado para realizar
  dibujarEncabezadoTestsDescargadosPortada();

  // Renderizado secuencial de todas las secciones del cuadernillo
  secciones.forEach((sec, secIdx) => {
    if (secIdx > 0 && sec.iniciarEnNuevaPagina) {
      nuevaPaginaCuadernillo();
    }

    dibujarRecuadroSeccion(sec.tituloRecuadro);

    if (sec.tipoSeccion === 'supuesto' && sec.contextoCaso) {
      dibujarRelatoSupuesto(sec.contextoCaso);
    }

    sec.preguntasOrdinarias.forEach((preg, idx) => {
      totalOrdinarias++;
      dibujarPreguntaOficial(preg, idx + 1);
    });

    if (sec.preguntasReserva.length > 0) {
      // En Primera Parte de 70 preguntas, si queda muy poco espacio, empieza en página limpia como en el modelo INAP
      if (
        sec.tipoSeccion === 'primera_parte' &&
        sec.preguntasOrdinarias.length >= 60 &&
        cursorY > 225
      ) {
        nuevaPaginaCuadernillo();
      }
      dibujarSubtituloPreguntasReserva();
      sec.preguntasReserva.forEach((preg, idx) => {
        totalReservas++;
        dibujarPreguntaOficial(preg, idx + 1);
      });
    }
  });

  const paginasCuadernillo = doc.getNumberOfPages();
  const textoCabeceraCorrida = normalizarTextoParaPDFOficial(
    `Prueba para realizar: ${testsIncluidos.join('  |  ')}`
  );
  const paginaInicioPreguntas = opciones?.incluirPortadaInstruccionesTribunal ? 2 : 1;

  // Estampar encabezado corrido en páginas interiores y pie de página oficial en todas las páginas
  for (let p = 1; p <= paginasCuadernillo; p++) {
    doc.setPage(p);

    if (p > paginaInicioPreguntas && testsIncluidos.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(80, 80, 80);
      const recorteCab = doc.splitTextToSize(textoCabeceraCorrida, ANCHO_UTIL)[0] || '';
      doc.text(recorteCab, MARGEN_IZQ, 9.2);
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.18);
      doc.line(MARGEN_IZQ, 10.4, 210 - MARGEN_DER, 10.4);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(normalizarTextoParaPDFOficial(codigoPie), 105, 286.5, {
      align: 'center',
    });
    doc.text(`Página ${p} de ${paginasCuadernillo}`, 210 - MARGEN_DER, 286.5, {
      align: 'right',
    });
  }

  // Página final: PLANTILLA DEFINITIVA DE RESPUESTAS (idéntica a la pág. 15 del examen adjunto)
  if (incluirSoluciones) {
    renderizarPaginaPlantillaDefinitivaSoluciones(
      doc,
      secciones,
      modelo,
      subtituloCuerpo,
      testsIncluidos
    );
  }

  // Páginas adicionales opcionales: ANEXO DE CORRECCIÓN COMENTADA CON FUNDAMENTACIÓN BOE
  if (opciones?.incluirAnexoJustificacionesBOE) {
    renderizarAnexoJustificacionesBOE(
      doc,
      secciones,
      modelo,
      subtituloCuerpo,
      testsIncluidos,
      true
    );
  }

  return {
    paginasCuadernillo,
    totalOrdinarias,
    totalReservas,
    seccionesRenderizadas: secciones,
  };
}

/**
 * Renderiza la hoja «PLANTILLA DEFINITIVA DE RESPUESTAS DEL EJERCICIO ÚNICO – MODELO A»
 * idéntica a la página 15 del examen oficial adjunto.
 */
function renderizarPaginaPlantillaDefinitivaSoluciones(
  doc: jsPDF,
  secciones: BloqueSeccionCuadernillo[],
  modelo: 'A' | 'B',
  subtituloCuerpo: string,
  testsIncluidos: string[] = []
) {
  doc.addPage('a4', 'portrait');

  const textoTestsClave =
    testsIncluidos.length > 0
      ? normalizarTextoParaPDFOficial(`Test / Pruebas: ${testsIncluidos.join(' | ')}`)
      : '';

  const dibujarCabeceraSoluciones = () => {
    const tieneLineaTests = Boolean(textoTestsClave);
    const altoCab = tieneLineaTests ? 15.6 : 11.8;

    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.rect(15, 13.5, 180, altoCab, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `PLANTILLA DEFINITIVA DE RESPUESTAS DEL EJERCICIO ÚNICO - MODELO ${modelo}`,
      105,
      18.3,
      { align: 'center' }
    );
    doc.setFontSize(9.2);
    doc.text(normalizarTextoParaPDFOficial(subtituloCuerpo), 105, 22.9, {
      align: 'center',
    });

    if (tieneLineaTests) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      const lineaRecortada = doc.splitTextToSize(textoTestsClave, 174)[0] || '';
      doc.text(lineaRecortada, 105, 27.1, { align: 'center' });
    }
  };

  dibujarCabeceraSoluciones();

  const obtenerRespuestaClave = (p: PreguntaExamen): string => {
    if (p.esAnulada) return 'ANULADA';
    const correcta = p.opciones?.find((o) => o.esCorrecta);
    if (!correcta?.id) return '-';
    return correcta.id.toLowerCase();
  };

  const Y_INICIO_COL = textoTestsClave ? 34.5 : 31.5;
  const Y_MAX_COL = 282;
  const ALTO_FILA = 3.52;

  interface BloqueClaveLineas {
    titulo: string;
    filas: Array<{ num: number; valor: string }>;
  }

  const bloquesIzquierda: BloqueClaveLineas[] = [];
  const bloquesDerecha: BloqueClaveLineas[] = [];

  const primeraParte = secciones.find((s) => s.tipoSeccion === 'primera_parte');
  const supuestos = secciones.filter((s) => s.tipoSeccion === 'supuesto');

  if (primeraParte) {
    bloquesIzquierda.push({
      titulo: primeraParte.tituloClave,
      filas: primeraParte.preguntasOrdinarias.map((p, idx) => ({
        num: idx + 1,
        valor: obtenerRespuestaClave(p),
      })),
    });
    if (primeraParte.preguntasReserva.length > 0) {
      bloquesDerecha.push({
        titulo: 'Preguntas de reserva',
        filas: primeraParte.preguntasReserva.map((p, idx) => ({
          num: idx + 1,
          valor: obtenerRespuestaClave(p),
        })),
      });
    }
    supuestos.forEach((sup) => {
      bloquesDerecha.push({
        titulo: sup.tituloClave,
        filas: sup.preguntasOrdinarias.map((p, idx) => ({
          num: idx + 1,
          valor: obtenerRespuestaClave(p),
        })),
      });
      if (sup.preguntasReserva.length > 0) {
        bloquesDerecha.push({
          titulo: 'Preguntas de reserva',
          filas: sup.preguntasReserva.map((p, idx) => ({
            num: idx + 1,
            valor: obtenerRespuestaClave(p),
          })),
        });
      }
    });
  } else {
    // Solo supuesto(s): Supuesto I a la izquierda y sus reservas / Supuesto II a la derecha
    supuestos.forEach((sup, idxSup) => {
      const destino = idxSup === 0 ? bloquesIzquierda : bloquesDerecha;
      destino.push({
        titulo: sup.tituloClave,
        filas: sup.preguntasOrdinarias.map((p, idx) => ({
          num: idx + 1,
          valor: obtenerRespuestaClave(p),
        })),
      });
      if (sup.preguntasReserva.length > 0) {
        const destinoRes = idxSup === 0 && supuestos.length === 1 ? bloquesDerecha : destino;
        destinoRes.push({
          titulo: 'Preguntas de reserva',
          filas: sup.preguntasReserva.map((p, idx) => ({
            num: idx + 1,
            valor: obtenerRespuestaClave(p),
          })),
        });
      }
    });
  }

  const paginaBase = doc.getNumberOfPages();

  const dibujarColumnaClave = (bloques: BloqueClaveLineas[], xBase: number) => {
    let curPag = paginaBase;
    doc.setPage(curPag);
    let y = Y_INICIO_COL;

    bloques.forEach((bloque, bIdx) => {
      if (bIdx > 0) y += 3.5;
      if (y + 10 > Y_MAX_COL) {
        curPag++;
        if (doc.getNumberOfPages() < curPag) {
          doc.addPage('a4', 'portrait');
          dibujarCabeceraSoluciones();
        } else {
          doc.setPage(curPag);
        }
        y = Y_INICIO_COL;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(bloque.titulo, xBase, y);
      const wTit = doc.getTextWidth(bloque.titulo);
      doc.setLineWidth(0.26);
      doc.line(xBase, y + 0.75, xBase + wTit, y + 0.75);
      y += 4.2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      for (const fila of bloque.filas) {
        if (y > Y_MAX_COL) {
          curPag++;
          if (doc.getNumberOfPages() < curPag) {
            doc.addPage('a4', 'portrait');
            dibujarCabeceraSoluciones();
          } else {
            doc.setPage(curPag);
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          y = Y_INICIO_COL;
        }
        doc.text(`${fila.num}.`, xBase, y);
        doc.text(fila.valor, xBase + 9.2, y);
        y += ALTO_FILA;
      }
    });
  };

  dibujarColumnaClave(bloquesIzquierda, 18.5);
  dibujarColumnaClave(bloquesDerecha, 111.5);
}

/**
 * Renderiza una Portada Oficial de Instrucciones del Tribunal Calificador (estilo CPS / INAP)
 * para realizar simulacros impresos con todas las pautas reales de examen.
 */
function renderizarPortadaInstruccionesTribunalEnPaginaActual(
  doc: jsPDF,
  examen: ExamenCompleto,
  secciones: BloqueSeccionCuadernillo[],
  modelo: 'A' | 'B',
  subtituloCuerpo: string,
  testsIncluidos: string[],
  duracionMinutos: number
) {
  const X = 18;
  const W = 174;

  // Cabecera institucional superior encuadrada
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.45);
  doc.rect(X, 18, W, 28, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    examen.ambito === 'CAM'
      ? 'COMUNIDAD DE MADRID - PROCESOS SELECTIVOS FUNCIÓN PÚBLICA'
      : 'COMISIÓN PERMANENTE DE SELECCIÓN - INSTITUTO NACIONAL DE ADMINISTRACIÓN PÚBLICA',
    105,
    25.5,
    { align: 'center' }
  );

  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  const linCuerpo = doc.splitTextToSize(normalizarTextoParaPDFOficial(subtituloCuerpo), W - 12);
  doc.text(linCuerpo[0] || subtituloCuerpo, 105, 33.2, { align: 'center' });

  doc.setFontSize(13);
  doc.text(`EJERCICIO ÚNICO - CUADERNILLO MODELO ${modelo}`, 105, 41.5, {
    align: 'center',
  });

  // Recuadro de identificación de las pruebas incluidas
  let y = 53;
  doc.setDrawColor(70, 70, 70);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.28);
  const lineasTests: string[] = [];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  testsIncluidos.forEach((t) => {
    const env = doc.splitTextToSize(`- ${normalizarTextoParaPDFOficial(t)}`, W - 10);
    lineasTests.push(...env);
  });
  const altoCajaTests = Math.max(16, 8 + lineasTests.length * 4.2 + 3);
  doc.rect(X, y, W, altoCajaTests, 'FD');
  doc.setFontSize(8.2);
  doc.setTextColor(50, 50, 50);
  doc.text('CONTENIDO PREPARADO EN ESTE CUADERNILLO PARA REALIZAR:', X + 4, y + 5.2);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  let yt = y + 9.8;
  lineasTests.forEach((l) => {
    doc.text(l, X + 5, yt);
    yt += 4.2;
  });

  y += altoCajaTests + 8;

  // Título de Instrucciones del Tribunal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('INSTRUCCIONES OFICIALES PARA LA REALIZACIÓN DEL EJERCICIO', 105, y, {
    align: 'center',
  });
  doc.setLineWidth(0.3);
  doc.line(X + 18, y + 1.2, X + W - 18, y + 1.2);
  y += 8.5;

  const p1 = secciones.find((s) => s.tipoSeccion === 'primera_parte');
  const sups = secciones.filter((s) => s.tipoSeccion === 'supuesto');
  const descPartes: string[] = [];
  if (p1) {
    descPartes.push(
      `Primera Parte: cuestionario de ${p1.preguntasOrdinarias.length} preguntas ordinarias${
        p1.preguntasReserva.length > 0
          ? ` más ${p1.preguntasReserva.length} preguntas de reserva`
          : ''
      }.`
    );
  }
  if (sups.length > 0) {
    descPartes.push(
      `Segunda Parte (Supuesto Práctico): ${
        sups.length > 1
          ? `se proponen ${sups.length} supuestos (${sups.map((s) => s.tituloClave).join(' y ')}), debiendo elegir y resolver únicamente UNO de ellos y marcar el recuadro correspondiente en la hoja de respuestas`
          : `consta de 1 supuesto práctico (${sups[0].tituloClave}) con ${sups[0].preguntasOrdinarias.length} preguntas ordinarias${
              sups[0].preguntasReserva.length > 0
                ? ` más ${sups[0].preguntasReserva.length} de reserva`
                : ''
            }`
      }.`
    );
  }

  const puntosInstrucciones = [
    `1. No abra este cuadernillo ni comience el ejercicio hasta que se indique el inicio del tiempo cronometrado.`,
    `2. El tiempo total máximo para la realización del ejercicio es de ${duracionMinutos} MINUTOS ininterrumpidos.`,
    `3. Estructura de este cuadernillo: ${descPartes.join(' ')}`,
    `4. Todas las cuestiones cuentan con cuatro respuestas alternativas (a, b, c, d), siendo solo una de ellas la correcta.`,
    `5. Criterio oficial de valoración: todas las preguntas tienen el mismo valor. Cada contestación errónea se penalizará descontando un tercio del valor de una respuesta correcta: PD = Aciertos - (Errores / 3). Las respuestas en blanco no penalizan.`,
    `6. Las preguntas de reserva deberán ser contestadas obligatoriamente dentro del tiempo ordinario, ya que únicamente entrarán en juego por su orden correlativo en caso de que el Tribunal acuerde la anulación de alguna pregunta ordinaria.`,
    `7. Anote todas sus contestaciones exclusivamente en la Plantilla Oficial de Hoja de Respuestas (Modelo ${modelo}) que acompaña a este cuadernillo.`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.4);
  puntosInstrucciones.forEach((punto) => {
    const lineas: string[] = doc.splitTextToSize(normalizarTextoParaPDFOficial(punto), W);
    y = dibujarLineasJustificadas(doc, lineas, X, y, W, 4.35);
    y += 2.8;
  });

  // Recuadro final de aviso clásico de examen oficial
  const yAviso = Math.max(y + 8, 236);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(245, 245, 245);
  doc.setLineWidth(0.5);
  doc.rect(X + 12, yAviso, W - 24, 16, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('NO ABRA ESTE CUESTIONARIO HASTA QUE SE LE INDIQUE', 105, yAviso + 9.8, {
    align: 'center',
  });
}

/**
 * Renderiza el Anexo de Corrección Fundamentada en Normativa BOE (respuesta correcta + norma + artículo + explicación).
 */
function renderizarAnexoJustificacionesBOE(
  doc: jsPDF,
  secciones: BloqueSeccionCuadernillo[],
  modelo: 'A' | 'B',
  subtituloCuerpo: string,
  testsIncluidos: string[],
  anadirPaginaInicial: boolean
): number {
  const paginasAntes = doc.getNumberOfPages();
  if (anadirPaginaInicial) {
    doc.addPage('a4', 'portrait');
  }

  const MARGEN_X = 15;
  const ANCHO = 180;
  const LIMITE_Y = 281;
  let y = 14;

  const dibujarCabeceraAnexo = () => {
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.rect(MARGEN_X, 13, ANCHO, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `ANEXO DE CORRECCIÓN Y FUNDAMENTACIÓN NORMATIVA BOE - MODELO ${modelo}`,
      105,
      17.8,
      { align: 'center' }
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const sub = normalizarTextoParaPDFOficial(
      testsIncluidos.length > 0 ? testsIncluidos.join(' | ') : subtituloCuerpo
    );
    doc.text(doc.splitTextToSize(sub, 172)[0] || '', 105, 22.8, { align: 'center' });
    y = 32;
  };

  dibujarCabeceraAnexo();

  const renderListaPreguntasComentadas = (tituloBloque: string, lista: PreguntaExamen[]) => {
    if (lista.length === 0) return;
    if (y + 16 > LIMITE_Y) {
      doc.addPage('a4', 'portrait');
      dibujarCabeceraAnexo();
    }
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(120, 120, 140);
    doc.setLineWidth(0.22);
    doc.rect(MARGEN_X, y - 3.6, ANCHO, 5.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 25, 60);
    doc.text(normalizarTextoParaPDFOficial(tituloBloque).toUpperCase(), MARGEN_X + 2.5, y + 0.4);
    y += 5.4;

    lista.forEach((preg, idx) => {
      const correcta = preg.opciones?.find((o) => o.esCorrecta);
      const letra = preg.esAnulada
        ? 'ANULADA'
        : correcta?.id
        ? `${correcta.id.toLowerCase()})`
        : '-';
      const textoResp = correcta?.texto ? limpiarTextoOpcion(correcta.texto) : '';
      const norma = normalizarTextoParaPDFOficial(preg.justificacionLegal?.norma || 'Normativa BOE');
      const art = normalizarTextoParaPDFOficial(preg.justificacionLegal?.articulo || '');
      const fund = normalizarTextoParaPDFOficial(
        preg.justificacionLegal?.fundamento || correcta?.explicacion || ''
      );

      const cabeceraLinea = `${idx + 1}. Respuesta: ${letra}${
        textoResp ? ` ${textoResp}` : ''
      }`;
      const refLegal = `[${norma}${art ? ` - ${art}` : ''}]`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      const linCab: string[] = doc.splitTextToSize(cabeceraLinea, ANCHO - 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.0);
      const textoFundCompleto = fund ? `${refLegal} ${fund}` : refLegal;
      const linFund: string[] = doc.splitTextToSize(textoFundCompleto, ANCHO - 5);

      const altoEstimado = linCab.length * 3.5 + linFund.length * 3.4 + 2.5;
      if (y + altoEstimado > LIMITE_Y) {
        doc.addPage('a4', 'portrait');
        dibujarCabeceraAnexo();
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      doc.setTextColor(0, 0, 0);
      linCab.forEach((l) => {
        doc.text(l, MARGEN_X, y);
        y += 3.5;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.9);
      doc.setTextColor(45, 55, 72);
      linFund.forEach((l) => {
        doc.text(l, MARGEN_X + 4, y);
        y += 3.35;
      });

      y += 2.0;
    });
    y += 2.2;
  };

  secciones.forEach((sec) => {
    renderListaPreguntasComentadas(sec.tituloClave, sec.preguntasOrdinarias);
    if (sec.preguntasReserva.length > 0) {
      renderListaPreguntasComentadas(
        `${sec.tituloClave} - Preguntas de reserva`,
        sec.preguntasReserva
      );
    }
  });

  const paginasDespues = doc.getNumberOfPages();
  return anadirPaginaInicial ? paginasDespues - paginasAntes : paginasDespues;
}

// ============================================================================
// PLANTILLA OFICIAL DE HOJA DE RESPUESTAS (OMR VERDE CPS / INAP EN BLANCO)
// Idéntica a la imagen adjunta, descartando todos los datos personales y marcas
// ============================================================================

const VERDE_OMR = { r: 84, g: 138, b: 46 };
const VERDE_FONDO_BANDA = { r: 242, g: 247, b: 236 };
const VERDE_TEXTO_PIE = { r: 222, g: 238, b: 205 };

function aplicarStrokeVerdeOMR(doc: jsPDF, grosor = 0.28) {
  doc.setDrawColor(VERDE_OMR.r, VERDE_OMR.g, VERDE_OMR.b);
  doc.setLineWidth(grosor);
}

function aplicarTextoVerdeOMR(doc: jsPDF, tamanoPt: number, bold = false) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(tamanoPt);
  doc.setTextColor(VERDE_OMR.r, VERDE_OMR.g, VERDE_OMR.b);
}

/**
 * Dibuja la cápsula oficial CPS con borde izquierdo semicircular y borde derecho recto.
 */
function dibujarCapsulaIzquierdaRedondeada(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const r = h / 2;
  const k = 0.5522847498 * r;

  doc.setFillColor(246, 250, 242);
  aplicarStrokeVerdeOMR(doc, 0.26);

  doc.moveTo(x + w, y);
  doc.lineTo(x + r, y);
  doc.curveTo(x + r - k, y, x, y + r - k, x, y + r);
  doc.curveTo(x, y + r + k, x + r - k, y + h, x + r, y + h);
  doc.lineTo(x + w, y + h);
  doc.lineTo(x + w, y);
  doc.close();
  doc.fillStroke();
}

/**
 * Dibuja el Escudo Constitucional esquemático oficial en trazos vectoriales verdes
 * sobre la esquina superior izquierda de la hoja OMR.
 */
function dibujarEscudoMinisterioVectorial(doc: jsPDF, cx: number, topY: number) {
  aplicarStrokeVerdeOMR(doc, 0.26);
  doc.setFillColor(255, 255, 255);

  // Corona real superior
  doc.roundedRect(cx - 3.6, topY + 1.4, 7.2, 2.2, 0.6, 0.6, 'FD');
  doc.circle(cx, topY + 0.7, 0.55, 'FD');
  doc.line(cx, topY + 0.1, cx, topY - 0.5);
  doc.line(cx - 0.3, topY - 0.2, cx + 0.3, topY - 0.2);

  // Escudo central cuartelado
  const sx = cx - 4.2;
  const sy = topY + 4.0;
  const sw = 8.4;
  const sh = 9.4;
  doc.roundedRect(sx, sy, sw, sh, 1.2, 1.8, 'FD');
  doc.line(cx, sy, cx, sy + sh);
  doc.line(sx, sy + sh * 0.48, sx + sw, sy + sh * 0.48);
  // Escusón central ovalado
  doc.ellipse(cx, sy + sh * 0.48, 1.35, 1.75, 'FD');

  // Columnas de Hércules a izquierda y derecha
  const colIzqX = cx - 7.1;
  const colDerX = cx + 5.7;
  doc.rect(colIzqX, sy + 0.6, 1.4, 8.6, 'FD');
  doc.rect(colDerX, sy + 0.6, 1.4, 8.6, 'FD');
  // Capiteles y basas
  doc.rect(colIzqX - 0.35, sy + 0.1, 2.1, 0.7, 'FD');
  doc.rect(colDerX - 0.35, sy + 0.1, 2.1, 0.7, 'FD');
  doc.rect(colIzqX - 0.45, sy + 9.2, 2.3, 0.8, 'FD');
  doc.rect(colDerX - 0.45, sy + 9.2, 2.3, 0.8, 'FD');
  // Cintas PLUS ULTRA
  doc.rect(colIzqX - 0.55, sy + 4.1, 2.5, 1.3, 'FD');
  doc.rect(colDerX - 0.55, sy + 4.1, 2.5, 1.3, 'FD');

  // Texto institucional del Ministerio
  aplicarTextoVerdeOMR(doc, 4.7, true);
  doc.text('MINISTERIO', cx, topY + 16.4, { align: 'center' });
  aplicarTextoVerdeOMR(doc, 4.3, false);
  doc.text('PARA LA TRANSFORMACIÓN DIGITAL', cx, topY + 18.6, { align: 'center' });
  doc.text('Y DE LA FUNCIÓN PÚBLICA', cx, topY + 20.7, { align: 'center' });
}

/**
 * Dibuja una fila de casillas de caracteres totalmente EN BLANCO (sin datos personales).
 */
function dibujarCasillasCaracteresEnBlanco(
  doc: jsPDF,
  etiqueta: string,
  x: number,
  y: number,
  numCasillas: number,
  anchoCasilla = 5.15,
  altoCasilla = 7.2
) {
  if (etiqueta) {
    aplicarTextoVerdeOMR(doc, 5.3, false);
    doc.text(etiqueta, x, y - 0.9);
  }
  doc.setFillColor(255, 255, 255);
  aplicarStrokeVerdeOMR(doc, 0.26);

  const anchoTotal = numCasillas * anchoCasilla;
  doc.rect(x, y, anchoTotal, altoCasilla, 'FD');
  for (let i = 1; i < numCasillas; i++) {
    const cx = x + i * anchoCasilla;
    doc.line(cx, y, cx, y + altoCasilla);
  }
}

/**
 * Dibuja una columna completa de preguntas OMR con cabeceras circulares (A)(B)(C)(D)
 * y casillas cuadradas totalmente en blanco (descartando respuestas marcadas).
 */
function dibujarColumnaRespuestasOMR(
  doc: jsPDF,
  x: number,
  yPrimeraFila: number,
  anchoCol: number,
  altoFila: number,
  numInicio: number,
  numFin: number
) {
  const letras = ['A', 'B', 'C', 'D'];
  const ladoCuadro = 3.05;
  const xPrimerCentro = x + 9.2;
  const pasoCentros = 5.65;

  // Cabeceras circulares (A) (B) (C) (D)
  const yCirculos = yPrimeraFila - 3.1;
  letras.forEach((letra, idx) => {
    const cx = xPrimerCentro + idx * pasoCentros;
    doc.setFillColor(255, 255, 255);
    aplicarStrokeVerdeOMR(doc, 0.28);
    doc.circle(cx, yCirculos, 2.05, 'FD');
    aplicarTextoVerdeOMR(doc, 6.8, true);
    doc.text(letra, cx, yCirculos + 0.85, { align: 'center' });
  });

  // Filas numeradas con cápsula redondeada a la izquierda y 4 recuadros en blanco
  for (let num = numInicio; num <= numFin; num++) {
    const filaIdx = num - numInicio;
    const fy = yPrimeraFila + filaIdx * altoFila;

    dibujarCapsulaIzquierdaRedondeada(doc, x, fy, anchoCol, altoFila);

    // Número de pregunta
    aplicarTextoVerdeOMR(doc, 6.9, true);
    doc.text(String(num), x + 4.3, fy + altoFila * 0.66, { align: 'center' });

    // 4 casillas cuadradas vacías (A, B, C, D)
    doc.setFillColor(255, 255, 255);
    aplicarStrokeVerdeOMR(doc, 0.25);
    for (let c = 0; c < 4; c++) {
      const cx = xPrimerCentro + c * pasoCentros;
      doc.rect(
        cx - ladoCuadro / 2,
        fy + (altoFila - ladoCuadro) / 2,
        ladoCuadro,
        ladoCuadro,
        'FD'
      );
    }
  }
}

/**
 * Dibuja en la página actual del documento jsPDF la Plantilla Oficial de Hoja de Respuestas
 * idéntica a la adjunta, totalmente limpia (sin datos personales y sin respuestas marcadas).
 */
export function dibujarPlantillaHojaRespuestasEnPagina(
  doc: jsPDF,
  modelo: 'A' | 'B' = 'A',
  testsIncluidos: string[] = []
) {
  // Fondo general limpio de la hoja
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  // 1. Banda diagonal verde superior izquierda + Escudo del Ministerio
  doc.setFillColor(VERDE_OMR.r, VERDE_OMR.g, VERDE_OMR.b);
  doc.moveTo(8.5, 0);
  doc.lineTo(17.5, 0);
  doc.lineTo(0, 23.5);
  doc.lineTo(0, 11.5);
  doc.close();
  doc.fill();

  dibujarEscudoMinisterioVectorial(doc, 24.5, 11.5);

  // Encabezado institucional superior con el nombre del test / supuesto descargado para realizar
  const xDatos = 44.5;
  if (testsIncluidos.length > 0) {
    const lineaRef = normalizarTextoParaPDFOficial(
      `PRUEBA DESCARGADA PARA REALIZAR: ${testsIncluidos.join('  |  ')}`
    );
    aplicarTextoVerdeOMR(doc, 5.4, true);
    const lineaAjustada = doc.splitTextToSize(lineaRef, 158)[0] || '';
    doc.text(lineaAjustada, xDatos, 4.1);
  }

  // 2. Bloque superior de Datos Personales EN BLANCO (1º Apellido, 2º Apellido, Nombre, NIF/Pasaporte, Firma)
  dibujarCasillasCaracteresEnBlanco(doc, '1º APELLIDO', xDatos, 8.2, 18);
  dibujarCasillasCaracteresEnBlanco(doc, '2º APELLIDO', xDatos, 19.2, 18);
  dibujarCasillasCaracteresEnBlanco(doc, 'NOMBRE', xDatos, 30.2, 18);
  dibujarCasillasCaracteresEnBlanco(doc, 'N.I.F. / PASAPORTE', xDatos, 41.2, 8);

  // Guion y casilla LETRA
  aplicarTextoVerdeOMR(doc, 8, true);
  doc.text('-', xDatos + 8 * 5.15 + 2.3, 45.8, { align: 'center' });
  dibujarCasillasCaracteresEnBlanco(
    doc,
    'LETRA',
    xDatos + 8 * 5.15 + 4.8,
    41.2,
    1
  );

  // Casillas administrativas derechas EN BLANCO (Cuerpo, Ing./Acc., Sistema, Provincia)
  const xCodigos = 149.5;
  dibujarCasillasCaracteresEnBlanco(doc, '', xCodigos, 8.2, 4);
  dibujarCasillasCaracteresEnBlanco(doc, 'ING. / ACC.', xCodigos, 19.2, 2);
  dibujarCasillasCaracteresEnBlanco(doc, 'SISTEMA', xCodigos, 30.2, 3);
  dibujarCasillasCaracteresEnBlanco(doc, 'PROVINCIA', xCodigos, 41.2, 2);

  // Recuadro FIRMA EN BLANCO (sin rúbrica)
  doc.setFillColor(255, 255, 255);
  aplicarStrokeVerdeOMR(doc, 0.28);
  doc.rect(116.5, 51.2, 51.5, 13.5, 'FD');
  doc.rect(119.2, 49.2, 14.2, 3.8, 'FD');
  aplicarTextoVerdeOMR(doc, 5.2, false);
  doc.text('FIRMA', 126.3, 51.8, { align: 'center' });

  // 3. BLOQUE CENTRAL: PRIMERA PARTE (1-70 + 1-5 Preguntas de Reserva)
  const yBanda1 = 68.0;
  const hBanda1 = 133.5;
  doc.setFillColor(
    VERDE_FONDO_BANDA.r,
    VERDE_FONDO_BANDA.g,
    VERDE_FONDO_BANDA.b
  );
  doc.rect(6.5, yBanda1, 197, hBanda1, 'F');

  // Triángulo verde esquina izquierda con letra del Modelo (A / B)
  doc.setFillColor(VERDE_OMR.r, VERDE_OMR.g, VERDE_OMR.b);
  doc.triangle(6.5, yBanda1, 25.5, yBanda1, 6.5, yBanda1 + 24.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text(modelo, 11.8, yBanda1 + 11.2, { align: 'center' });

  // Título PRIMERA PARTE
  aplicarTextoVerdeOMR(doc, 11.8, true);
  doc.text('PRIMERA PARTE', 103, yBanda1 + 6.8, { align: 'center' });

  // 4 columnas ordinarias (1-18, 19-36, 37-54, 55-70)
  const altoFilaOMR = 6.35;
  const anchoColOMR = 30.5;
  const yFilasParte1 = 83.2;

  dibujarColumnaRespuestasOMR(doc, 16.5, yFilasParte1, anchoColOMR, altoFilaOMR, 1, 18);
  dibujarColumnaRespuestasOMR(doc, 51.5, yFilasParte1, anchoColOMR, altoFilaOMR, 19, 36);
  dibujarColumnaRespuestasOMR(doc, 86.5, yFilasParte1, anchoColOMR, altoFilaOMR, 37, 54);
  dibujarColumnaRespuestasOMR(doc, 121.5, yFilasParte1, anchoColOMR, altoFilaOMR, 55, 70);

  // 5.ª columna derecha: PREGUNTAS DE RESERVA (1-5)
  const xReservaP1 = 158.0;
  aplicarTextoVerdeOMR(doc, 8.8, true);
  doc.text('PREGUNTAS', xReservaP1 + anchoColOMR / 2, 76.2, { align: 'center' });
  doc.text('DE RESERVA', xReservaP1 + anchoColOMR / 2, 80.2, { align: 'center' });
  dibujarColumnaRespuestasOMR(
    doc,
    xReservaP1,
    88.0,
    anchoColOMR,
    altoFilaOMR,
    1,
    5
  );

  // 4. BLOQUE INFERIOR: SEGUNDA PARTE - SUPUESTO PRÁCTICO (Supuesto I/II + 1-20 + 1-5 Reserva)
  const yBanda2 = 204.5;
  const hBanda2 = 76.5;
  doc.setFillColor(
    VERDE_FONDO_BANDA.r,
    VERDE_FONDO_BANDA.g,
    VERDE_FONDO_BANDA.b
  );
  doc.rect(6.5, yBanda2, 197, hBanda2, 'F');

  aplicarTextoVerdeOMR(doc, 11.2, true);
  doc.text('SEGUNDA PARTE - SUPUESTO PRÁCTICO', 103, yBanda2 + 6.8, {
    align: 'center',
  });

  const avisoSupuesto = 'MUY IMPORTANTE: NO OLVIDE MARCAR EL SUPUESTO ELEGIDO';
  aplicarTextoVerdeOMR(doc, 7.8, true);
  doc.text(avisoSupuesto, 103, yBanda2 + 11.4, { align: 'center' });
  const wAviso = doc.getTextWidth(avisoSupuesto);
  aplicarStrokeVerdeOMR(doc, 0.25);
  doc.line(103 - wAviso / 2, yBanda2 + 12.1, 103 + wAviso / 2, yBanda2 + 12.1);

  // Selector izquierdo: MARQUE EL SUPUESTO ELEGIDO (Supuesto I / Supuesto II en blanco)
  const xSupSel = 15.5;
  aplicarTextoVerdeOMR(doc, 6.8, true);
  doc.text('MARQUE EL', xSupSel, 226.2);
  doc.text('SUPUESTO ELEGIDO:', xSupSel, 229.4);

  const wSupBox = 31.5;
  const hSupBox = 7.1;
  ['Supuesto I', 'Supuesto II'].forEach((etiquetaSup, idx) => {
    const sy = 231.8 + idx * hSupBox;
    dibujarCapsulaIzquierdaRedondeada(doc, xSupSel, sy, wSupBox, hSupBox);
    aplicarTextoVerdeOMR(doc, 8.2, true);
    doc.text(etiquetaSup, xSupSel + 4.2, sy + 4.8);
    // Casilla cuadrada en blanco a la derecha
    doc.setFillColor(255, 255, 255);
    aplicarStrokeVerdeOMR(doc, 0.26);
    doc.rect(xSupSel + wSupBox - 6.0, sy + (hSupBox - 3.3) / 2, 3.3, 3.3, 'FD');
  });

  // 3 columnas de respuestas del Supuesto Práctico (1-7, 8-14, 15-20)
  const yFilasParte2 = 226.0;
  dibujarColumnaRespuestasOMR(doc, 52.5, yFilasParte2, anchoColOMR, altoFilaOMR, 1, 7);
  dibujarColumnaRespuestasOMR(doc, 88.0, yFilasParte2, anchoColOMR, altoFilaOMR, 8, 14);
  dibujarColumnaRespuestasOMR(doc, 123.5, yFilasParte2, anchoColOMR, altoFilaOMR, 15, 20);

  // Columna derecha de PREGUNTAS DE RESERVA del Supuesto (1-5)
  const xReservaP2 = 159.0;
  aplicarTextoVerdeOMR(doc, 8.8, true);
  doc.text('PREGUNTAS', xReservaP2 + anchoColOMR / 2, 221.0, { align: 'center' });
  doc.text('DE RESERVA', xReservaP2 + anchoColOMR / 2, 225.0, { align: 'center' });
  dibujarColumnaRespuestasOMR(
    doc,
    xReservaP2,
    232.8,
    anchoColOMR,
    altoFilaOMR,
    1,
    5
  );

  // 5. Código lateral izquierdo vertical + Franja verde inferior «EJEMPLAR PARA EL INTERESADO»
  aplicarTextoVerdeOMR(doc, 4.8, false);
  doc.text(`MOD. ADVO-L-MOD.${modelo}`, 9.2, 279.5, { angle: 90 });

  doc.setFillColor(VERDE_OMR.r, VERDE_OMR.g, VERDE_OMR.b);
  doc.rect(11.5, 283.2, 188, 7.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(VERDE_TEXTO_PIE.r, VERDE_TEXTO_PIE.g, VERDE_TEXTO_PIE.b);
  doc.text('EJEMPLAR PARA EL INTERESADO', 105.5, 288.2, { align: 'center' });
}

/**
 * Descarga un archivo Blob en el navegador de forma compatible con iframes (sin window.open).
 */
export function descargarBlobPDF(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {}
  }, 4000);
}

/**
 * Genera el paquete completo de exportación PDF oficial:
 * 1) Cuadernillo de Examen Oficial (formato INAP/CPS Modelo A/B + Plantilla Definitiva de Respuestas)
 * 2) Plantilla Oficial de Hoja de Respuestas OMR en Blanco (sin datos personales ni marcas)
 * 3) Versión combinada en un único PDF (Cuadernillo + Hoja OMR en blanco)
 */
export function generarPaquetePDFOficial(
  examen: ExamenCompleto,
  opciones?: OpcionesExportacionPDFOficial
): ResultadoGeneracionPDFOficial {
  const modelo = opciones?.modelo || 'A';
  const slug = generarSlugArchivo(examen.titulo);
  const codigoPieAplicado =
    opciones?.codigoPiePagina?.trim() || deducirCodigoPiePorDefecto(examen, modelo);
  const testsIncluidos = obtenerResumenTestsIncluidosEnDescarga(examen, opciones);

  // 1. Generar Cuadernillo de Examen Oficial
  const docCuadernillo = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  const { paginasCuadernillo, totalOrdinarias, totalReservas, seccionesRenderizadas } =
    renderizarCuadernilloEnDocumento(docCuadernillo, examen, opciones);
  const cuadernilloBlob = docCuadernillo.output('blob');
  const cuadernilloNombreArchivo = `${slug}_Modelo_${modelo}.pdf`;

  // 2. Generar Plantilla Oficial de Hoja de Respuestas OMR en Blanco
  const docPlantilla = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  dibujarPlantillaHojaRespuestasEnPagina(docPlantilla, modelo, testsIncluidos);
  const plantillaOMRBlob = docPlantilla.output('blob');
  const plantillaOMRNombreArchivo = `Plantilla_Hoja_Respuestas_Modelo_${modelo}_${slug}.pdf`;

  // 3. Generar PDF Combinado (Cuadernillo + Hoja OMR en Blanco al final)
  const docCombinado = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  renderizarCuadernilloEnDocumento(docCombinado, examen, opciones);
  docCombinado.addPage('a4', 'portrait');
  dibujarPlantillaHojaRespuestasEnPagina(docCombinado, modelo, testsIncluidos);
  const combinadoBlob = docCombinado.output('blob');
  const combinadoNombreArchivo = `Completo_Examen_y_Hoja_Respuestas_Modelo_${modelo}_${slug}.pdf`;

  // 4. Generar Anexo independiente de Corrección y Fundamentación BOE
  const subtituloCuerpo =
    opciones?.subtituloCuerpo?.trim() || deducirSubtituloCuerpoPorDefecto(examen);
  const docAnexo = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  const paginasAnexoJustificaciones = renderizarAnexoJustificacionesBOE(
    docAnexo,
    seccionesRenderizadas,
    modelo,
    subtituloCuerpo,
    testsIncluidos,
    false
  );
  const anexoJustificacionesBlob = docAnexo.output('blob');
  const anexoJustificacionesNombreArchivo = `Anexo_Justificaciones_BOE_Modelo_${modelo}_${slug}.pdf`;

  const resumenSecciones = seccionesRenderizadas.map((s) => ({
    titulo: s.tituloRecuadro,
    ordinarias: s.preguntasOrdinarias.length,
    reservas: s.preguntasReserva.length,
  }));

  return {
    cuadernilloBlob,
    cuadernilloNombreArchivo,
    paginasCuadernillo,
    plantillaOMRBlob,
    plantillaOMRNombreArchivo,
    combinadoBlob,
    combinadoNombreArchivo,
    anexoJustificacionesBlob,
    anexoJustificacionesNombreArchivo,
    paginasAnexoJustificaciones,
    codigoPieAplicado,
    totalOrdinarias,
    totalReservas,
    testsIncluidos,
    resumenSecciones,
  };
}
