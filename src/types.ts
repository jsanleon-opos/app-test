export type ConvocatoriaAmbito = 'AGE' | 'CAM' | 'AMBOS';

export type TipoPrueba = 'unitario' | 'supuesto';

export type DificultadPrueba = 'estandar' | 'trampa_tribunal' | 'plazos';

export type ColorResaltador = 'amarillo' | 'verde' | 'rosa' | 'azul';

export type TematicaNormativaId =
  | 'constitucion_organizacion'
  | 'procedimiento_administrativo'
  | 'regimen_sector_publico'
  | 'funcion_publica_personal'
  | 'contratos_sector_publico'
  | 'presupuestos_hacienda'
  | 'transparencia_datos'
  | 'autonomico_madrid';

export interface TematicaInfo {
  id: TematicaNormativaId;
  nombre: string;
  descripcion: string;
  sigla: string;
  ambito: ConvocatoriaAmbito;
  leyesBOEPrincipales: LeyBOEReferencia[];
}

export interface LeyBOEReferencia {
  idBOE: string; // Ej: "BOE-A-2015-10565"
  nombre: string;
  sigla: string;
  urlBOE: string;
  ambito: ConvocatoriaAmbito;
}

export interface ReferenciaBOE {
  norma: string;
  articulo: string;
  codigoBOE?: string; // Ej: "BOE-A-2015-10565"
  urlBOE?: string; // Enlace canónico a www.boe.es
  fundamento: string;
  ejemploPractico?: string; // Ejemplo práctico específico extraído de la plantilla
}

export interface OpcionPregunta {
  id: 'A' | 'B' | 'C' | 'D';
  texto: string;
  esCorrecta: boolean;
  explicacion: string;
}

export interface RecursoArgumentacionPregunta {
  id: string;
  tipo: 'web' | 'fichero_local';
  titulo: string;
  url: string; // URL web (https://...) o Data URL (base64) del fichero local
  nombreArchivo?: string;
  mimeType?: string;
  tamanoBytes?: number;
  rutaLocal?: string; // Ruta o referencia local opcional
  descripcion?: string; // Argumentación o nota asociada al enlace/fichero
  fechaCreacion: string;
}

export interface PreguntaExamen {
  id: number;
  enunciado: string;
  opciones: OpcionPregunta[];
  justificacionLegal: ReferenciaBOE;
  ejemploPractico?: string; // Ejemplo práctico y aplicación al caso concreto
  tematica?: TematicaNormativaId | string;
  esReserva?: boolean;
  numeroReserva?: number; // 1 a 5 para las preguntas de reserva
  esAnulada?: boolean;
  sustituidaPorReservaId?: number;
  sustituyeAPreguntaId?: number;
  activaEnEvaluacion?: boolean;
  codigoInedita?: string; // Código de verificación de pregunta inédita (ej. "INED-2026-X9A")
  huellaAuditoria?: string; // Huella criptográfica/semántica para prevenir duplicados y permutaciones
  reglaMnemotecnica?: string; // Esquema de 2 líneas, regla mnemotécnica o fórmula visual destacada
  analisisDistractores?: string; // Error exacto de cada distractor / intercambio de términos por el tribunal (epígrafe "distractor:")
  convocatoriasAparecida?: string; // Convocatorias oficiales en que ha aparecido o si es inédita (epígrafe "convocatoria:")
  leyesRelacionadas?: string[]; // Leyes o temas del temario de informática vinculados
  recursosArgumentacion?: RecursoArgumentacionPregunta[]; // Enlaces web y ficheros locales adjuntos para la argumentación de la pregunta
}

export type TipoItemAlmacen =
  | 'pregunta_relevante'
  | 'articulo_clave'
  | 'plazo_computo'
  | 'atajo_mnemotecnia'
  | 'informatica'
  | 'duda'
  | 'fallada'
  | 'comentario'
  | 'repaso';

export type SubtipoInformatica =
  | 'atajo_teclado'
  | 'funcion_excel'
  | 'base_datos_access'
  | 'word_365'
  | 'outlook'
  | 'teams'
  | 'power_bi'
  | 'definicion_redes'
  | 'otro';

export interface ItemAlmacenDuda {
  id: string; // ID único (ej: duda-1729... o nota-...)
  preguntaId?: number;
  examenId?: string;
  examenTitulo?: string;
  tipo: TipoItemAlmacen;
  titulo?: string; // Título o concepto principal de la nota
  enunciado: string; // Para preguntas es el enunciado; para notas es el título o concepto
  opciones?: OpcionPregunta[];
  respuestaUsuario?: string;
  respuestaCorrecta?: string;
  esFallada?: boolean; // Para preguntas: true si fue fallada, false si acertada/relevante
  justificacionLegal?: ReferenciaBOE;
  reglaMnemotecnica?: string; // Esquema de 2 líneas o fórmula visual destacada
  ejemploPractico?: string; // Ejemplo práctico o aplicación al caso concreto
  analisisDistractores?: string; // Error exacto de cada distractor (epígrafe "distractor:")
  convocatoriasAparecida?: string; // Convocatoria o si es inédita (epígrafe "convocatoria:")
  comentarioUsuario?: string; // Dudas, apuntes o comentarios del usuario
  leyesRelacionadas: string[]; // Una o varias leyes del temario C1 AGE / Informática
  recursosArgumentacion?: RecursoArgumentacionPregunta[]; // Enlaces web y ficheros locales adjuntos para argumentación

  // Estructuras específicas para cada uno de los tipos de notas:
  // 1. Artículos clave
  articuloClave?: {
    ley: string;
    articulo: string;
    literalArticulo: string;
    resumenOClave: string;
  };
  // 2. Plazos y cómputos
  plazoComputo?: {
    concepto: string;
    plazo: string;
    tipoDias?: 'habiles' | 'naturales' | 'meses' | 'anos' | 'otro';
    inicioComputo?: string; // dies a quo
    finComputo?: string; // dies ad quem / vencimiento
    reglaEspecial?: string;
    ley?: string;
  };
  // 3. Atajos y reglas mnemotécnicas
  atajoMnemotecnia?: {
    concepto: string;
    reglaOFormula: string;
    explicacionTruco: string;
    ley?: string;
  };
  // 4. Temas de Informática y Ofimática (atajos de teclado, definiciones, funciones de Excel, Access, Word 365, Outlook, Teams y Power BI)
  fichaInformatica?: {
    subtipo: SubtipoInformatica;
    softwareOModulo?: string; // Ej: "Word 365", "Outlook", "Microsoft Teams", "Power BI", "Excel 365", "Microsoft Access", "Windows 11 / Explorador", "Redes / TCP-IP"
    atajoOFuncion?: string; // Ej: "CTRL + MAYÚS + L", "=BUSCARX()", "Clave principal / Clave foránea"
    sintaxisOEjemplo?: string; // Ej: "=BUSCARX(valor; matriz_buscada; matriz_devuelta)", "SELECT * FROM tabla"
    explicacion: string; // Definición técnica, qué hace o palabras trampa del tribunal
    temaBloque?: string; // Bloque Informática C1
  };

  fechaCreacion: string;
  fechaActualizacion?: string;
  resuelta?: boolean;
  origen: 'justificacion' | 'test_fallada' | 'manual';
}

export interface SustitucionReserva {
  anuladaId: number;
  reservaId: number;
}

export interface ResultadoExamen {
  aciertos: number;
  fallos: number;
  blancos: number;
  anuladas?: number;
  reservasUsadas?: number;
  sustituciones?: SustitucionReserva[];
  preguntasEvaluadasTotal?: number;
  puntuacionDirecta: number; // PD = Aciertos - (Fallos / 3)
  puntuacionMaxima: number;
  puntuacionTransformada: number;
  superaCorte: boolean;
  duracionSegundos: number;
  fechaRealizacion: string;
  respuestasUsuario: Record<number, string>;
}

// Estructura de anotaciones y subrayados de texto plano
export interface AnotacionResaltado {
  id: string;
  examenId: string;
  seccion: 'contextoCaso' | 'enunciado' | 'opcion' | 'justificacion';
  preguntaId?: number;
  opcionId?: 'A' | 'B' | 'C' | 'D';
  textoSeleccionado: string;
  color: ColorResaltador;
  comentario?: string;
  timestamp: string;
}

export type CategoriaExamen =
  | 'test_ia'          // test aleatorio (IA)
  | 'test_oficial'     // test oficial
  | 'test_academia'    // test de academia
  | 'supuesto_ia'      // supuesto aleatorio (IA)
  | 'supuesto_oficial' // supuesto oficial
  | 'supuesto_academia'; // supuesto de academia

export interface ExamenCompleto {
  id: string;
  testBaseId?: string; // ID del examen base si es un intento de repetición
  intentoNumero?: number; // Contador correlativo de intentos (1, 2, 3...)
  soloHistorial?: boolean; // Si es true (ej. test de preguntas falladas), computa en Historial pero no se guarda en el Banco de Exámenes
  titulo: string;
  tipo: TipoPrueba;
  categoria?: CategoriaExamen;
  ambito: ConvocatoriaAmbito;
  origen: 'generado_ia' | 'oficial_json';
  fecha: string;
  dificultad?: DificultadPrueba;
  tematicas: TematicaNormativaId[];
  contextoCaso?: string; // Solo para supuestos prácticos: relato de hechos administrativos
  leyesBOEAplicadas: string[];
  preguntas: PreguntaExamen[];
  resultado?: ResultadoExamen;
  anotaciones?: AnotacionResaltado[];
}

export interface ConvocatoriaCorteC1 {
  id: string;
  convocatoria: string;
  anoOEP: string;
  fechaExamen: string;
  plazasTotal: number;
  plazasGeneral: number;
  corteParte1PD: number; // sobre 70 preguntas
  totalParte1Q: number; // 70
  corteParte2PD: number; // sobre 20 preguntas
  totalParte2Q: number; // 20
  corteTotalPD: number; // suma directa sobre 90
  totalPreguntas: number; // 90
  porcentajeAprobadoNetoParte1: number;
  porcentajeAprobadoNetoParte2: number;
  porcentajeAprobadoNetoTotal: number;
  notaTransformadaMinima: number; // 25 sobre 50
  observaciones: string;
}

// Estructura para importar/exportar exámenes oficiales en formato JSON
export interface FormatoExamenJSONOficial {
  id?: string;
  titulo: string;
  tipo: 'unitario' | 'supuesto';
  categoria?: CategoriaExamen;
  ambito: 'AGE' | 'CAM' | 'AMBOS';
  descripcion?: string;
  convocatoriaOficial?: string;
  contextoCaso?: string;
  tematicas?: string[];
  fuenteOficial?: string;
  leyesBOEAplicadas?: string[];
  preguntas: {
    id: number;
    enunciado: string;
    opciones: {
      id: 'A' | 'B' | 'C' | 'D';
      texto: string;
      esCorrecta: boolean;
      explicacion?: string;
    }[];
    justificacionLegal?: {
      norma: string;
      articulo: string;
      codigoBOE?: string;
      urlBOE?: string;
      fundamento: string;
    };
    esReserva?: boolean;
    numeroReserva?: number;
    esAnulada?: boolean;
    sustituidaPorReservaId?: number;
    sustituyeAPreguntaId?: number;
    activaEnEvaluacion?: boolean;
    reglaMnemotecnica?: string;
    analisisDistractores?: string;
    convocatoriasAparecida?: string;
    ejemploPractico?: string;
    leyesRelacionadas?: string[];
    codigoInedita?: string;
    recursosArgumentacion?: RecursoArgumentacionPregunta[];
  }[];
  preguntasReserva?: any[];
  // Registro completo de notas y resaltados para exportación
  resaltadosYNotas?: {
    id: string;
    seccion: string;
    preguntaId?: number;
    opcionId?: string;
    textoSeleccionado: string;
    color: string;
    comentario?: string;
    timestamp: string;
  }[];
  resultado?: ResultadoExamen;
  // Datos de la sección Almacén de Dudas y recursos de argumentación incluidos en la exportación JSON
  almacenDudas?: ItemAlmacenDuda[];
  recursosArgumentacionPorPregunta?: Record<string, RecursoArgumentacionPregunta[]>;
}
