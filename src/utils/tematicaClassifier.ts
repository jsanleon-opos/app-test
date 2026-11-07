import { ExamenCompleto, ItemAlmacenDuda, PreguntaExamen, TematicaNormativaId } from '../types';

export type CategoriaTemarioId = TematicaNormativaId | 'informatica_c1';

export interface InfoCategoriaTemario {
  id: CategoriaTemarioId;
  nombre: string;
  sigla: string;
  icono: string;
  colorText: string;
  colorBg: string;
  colorBorder: string;
  colorBar: string;
}

export const CATEGORIAS_TEMARIO_PROGRESO: InfoCategoriaTemario[] = [
  {
    id: 'constitucion_organizacion',
    nombre: 'Constitución y Organización del Estado',
    sigla: 'CE y Estado',
    icono: 'fa-landmark',
    colorText: 'text-amber-700 dark:text-amber-300',
    colorBg: 'bg-amber-50 dark:bg-amber-950/40',
    colorBorder: 'border-amber-200 dark:border-amber-800',
    colorBar: 'bg-amber-500',
  },
  {
    id: 'procedimiento_administrativo',
    nombre: 'Procedimiento Administrativo (Ley 39/2015)',
    sigla: 'Ley 39/2015 LPACAP',
    icono: 'fa-file-signature',
    colorText: 'text-indigo-700 dark:text-indigo-300',
    colorBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    colorBorder: 'border-indigo-200 dark:border-indigo-800',
    colorBar: 'bg-indigo-600',
  },
  {
    id: 'regimen_sector_publico',
    nombre: 'Régimen Jurídico del Sector Público (Ley 40/2015)',
    sigla: 'Ley 40/2015 LRJSP',
    icono: 'fa-building-columns',
    colorText: 'text-blue-700 dark:text-blue-300',
    colorBg: 'bg-blue-50 dark:bg-blue-950/40',
    colorBorder: 'border-blue-200 dark:border-blue-800',
    colorBar: 'bg-blue-600',
  },
  {
    id: 'funcion_publica_personal',
    nombre: 'Función Pública y Personal (TREBEP y RD 364/365)',
    sigla: 'TREBEP / Personal',
    icono: 'fa-id-badge',
    colorText: 'text-emerald-700 dark:text-emerald-300',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    colorBorder: 'border-emerald-200 dark:border-emerald-800',
    colorBar: 'bg-emerald-600',
  },
  {
    id: 'contratos_sector_publico',
    nombre: 'Contratación del Sector Público (Ley 9/2017)',
    sigla: 'Ley 9/2017 LCSP',
    icono: 'fa-file-contract',
    colorText: 'text-violet-700 dark:text-violet-300',
    colorBg: 'bg-violet-50 dark:bg-violet-950/40',
    colorBorder: 'border-violet-200 dark:border-violet-800',
    colorBar: 'bg-violet-600',
  },
  {
    id: 'presupuestos_hacienda',
    nombre: 'Presupuesto, Estabilidad (LO 2/2012) y LGP (47/2003)',
    sigla: 'LGP 47/2003 y LO 2/2012',
    icono: 'fa-coins',
    colorText: 'text-teal-700 dark:text-teal-300',
    colorBg: 'bg-teal-50 dark:bg-teal-950/40',
    colorBorder: 'border-teal-200 dark:border-teal-800',
    colorBar: 'bg-teal-600',
  },
  {
    id: 'transparencia_datos',
    nombre: 'Transparencia, Protección de Datos e Igualdad',
    sigla: 'Transp. / LOPDGDD / Igualdad',
    icono: 'fa-shield-halved',
    colorText: 'text-sky-700 dark:text-sky-300',
    colorBg: 'bg-sky-50 dark:bg-sky-950/40',
    colorBorder: 'border-sky-200 dark:border-sky-800',
    colorBar: 'bg-sky-500',
  },
  {
    id: 'autonomico_madrid',
    nombre: 'Régimen Autonómico e Instituciones CAM',
    sigla: 'Estatuto y Leyes CAM',
    icono: 'fa-map-location-dot',
    colorText: 'text-rose-700 dark:text-rose-300',
    colorBg: 'bg-rose-50 dark:bg-rose-950/40',
    colorBorder: 'border-rose-200 dark:border-rose-800',
    colorBar: 'bg-rose-500',
  },
  {
    id: 'informatica_c1',
    nombre: 'Informática, Ofimática 365 y Admin. Electrónica',
    sigla: 'Informática y Ofimática C1',
    icono: 'fa-laptop-code',
    colorText: 'text-cyan-700 dark:text-cyan-300',
    colorBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    colorBorder: 'border-cyan-200 dark:border-cyan-800',
    colorBar: 'bg-cyan-600',
  },
];

export function obtenerInfoCategoriaTemario(id: CategoriaTemarioId): InfoCategoriaTemario {
  return (
    CATEGORIAS_TEMARIO_PROGRESO.find((c) => c.id === id) || CATEGORIAS_TEMARIO_PROGRESO[1]
  );
}

/**
 * Determina si una cadena de norma/ley es un marcador genérico por defecto
 * ("Legislación Oficial del Estado", "Normativa Oficial BOE", etc.) que NO debe
 * prevalecer sobre las leyes o temas reales de la pregunta o del examen.
 */
export function esNormaGenerica(raw?: string): boolean {
  if (!raw) return true;
  const s = raw.trim().toLowerCase();
  if (!s) return true;
  const genericas = [
    'legislación oficial del estado',
    'legislacion oficial del estado',
    'legislación consolidada en www.boe.es',
    'legislacion consolidada en www.boe.es',
    'normativa oficial boe',
    'normativa general boe',
    'normativa de referencia',
    'normativa boe',
    'normativa aplicable',
    'precepto aplicable',
    'artículo / precepto',
    'articulo / precepto',
    'temario oficial c1',
    'boe',
    'boe-a',
  ];
  return genericas.includes(s);
}

/**
 * Lista oficial de los 10 temas de Informática (8 de la AGE + 2 adicionales de la CAM)
 */
export const LISTA_10_TEMAS_INFORMATICA_NORMALIZADOS: {
  id: string;
  numero: number;
  ambito: 'AGE' | 'CAM';
  etiqueta: string;
}[] = [
  {
    id: 'tema-1-informatica-basica',
    numero: 1,
    ambito: 'AGE',
    etiqueta: 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)',
  },
  {
    id: 'tema-2-entorno-windows',
    numero: 2,
    ambito: 'AGE',
    etiqueta: 'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows',
  },
  {
    id: 'tema-3-explorador-windows',
    numero: 3,
    ambito: 'AGE',
    etiqueta: 'Tema 3 (AGE): El explorador de Windows',
  },
  {
    id: 'tema-4-word-365',
    numero: 4,
    ambito: 'AGE',
    etiqueta: 'Tema 4 (AGE): Procesadores de texto: Word 365',
  },
  {
    id: 'tema-5-excel-365',
    numero: 5,
    ambito: 'AGE',
    etiqueta: 'Tema 5 (AGE): Hojas de cálculo: Excel 365',
  },
  {
    id: 'tema-6-access-365',
    numero: 6,
    ambito: 'AGE',
    etiqueta: 'Tema 6 (AGE): Bases de datos: Access 365',
  },
  {
    id: 'tema-7-outlook-365',
    numero: 7,
    ambito: 'AGE',
    etiqueta: 'Tema 7 (AGE): Correo electrónico: Outlook 365',
  },
  {
    id: 'tema-8-red-internet',
    numero: 8,
    ambito: 'AGE',
    etiqueta: 'Tema 8 (AGE): La Red Internet',
  },
  {
    id: 'tema-9-cam-power-bi',
    numero: 9,
    ambito: 'CAM',
    etiqueta: 'Tema 9 (CAM): Power BI',
  },
  {
    id: 'tema-10-cam-trabajo-colaborativo',
    numero: 10,
    ambito: 'CAM',
    etiqueta: 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)',
  },
];

/**
 * Deduce el tema de informática (entre los 8 temas AGE y 2 adicionales CAM) o ley específica
 * a partir de un texto libre (título del examen, enunciado, explicación o fundamento).
 */
export function deducirNormaOTemaDesdeTexto(texto: string): string | null {
  if (!texto) return null;
  const low = texto.toLowerCase();

  // 1. Los 10 Temas Oficiales de Informática (8 AGE + 2 adicionales CAM)
  // Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive y Videoconferencias)
  if (
    /\b(tema\s*10|trabajo colaborativo|microsoft teams|\bteams\b|canal privado|canal compartido|canal est[áa]ndar|sharepoint|onedrive|videoconferencia|coautor[íi]a)\b/i.test(
      low
    )
  ) {
    return 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)';
  }

  // Tema 9 (CAM): Power BI
  if (
    /\b(tema\s*9|power\s*bi|powerbi|power\s*query|\bdax\b|calculate\(|sumx\(|modelo en estrella|cuadro de mando|cuadros de mando)\b/i.test(
      low
    )
  ) {
    return 'Tema 9 (CAM): Power BI';
  }

  // Tema 7 (AGE): Correo electrónico: Outlook 365
  if (
    /\b(tema\s*7|outlook|correo electr[óo]nico|direcci[óo]n de correo|buz[óo]n|bandeja de entrada|bandeja de salida|cco|smtp|pop3|imap|mensaje de correo|servidor de correo|libreta de direcciones|reglas de mensaje)\b/i.test(
      low
    ) ||
    (/dominio/i.test(low) && /\b(correo|arroba|extensi[óo]n|direcci[óo]n|remate|punto)\b/i.test(low))
  ) {
    return 'Tema 7 (AGE): Correo electrónico: Outlook 365';
  }

  // Tema 4 (AGE): Procesadores de texto: Word 365
  if (
    /\b(tema\s*4\b.*word|word|procesador de textos|procesadores de texto|combinar correspondencia|combinaci[óo]n de correspondencia|salto de secci[óo]n|salto de p[áa]gina|sangr[íi]a|interlineado|tabla de contenido|encabezado y pie|\.dotx|\.docx)\b/i.test(
      low
    )
  ) {
    return 'Tema 4 (AGE): Procesadores de texto: Word 365';
  }

  // Tema 5 (AGE): Hojas de cálculo: Excel 365
  if (
    /\b(tema\s*5\b.*excel|excel|hoja de c[áa]lculo|hojas de c[áa]lculo|buscarv|buscarx|tabla din[áa]mica|tablas din[áa]micas|referencia absoluta|referencia relativa|formato condicional|rango de celdas|concatenar|contar\.si|sumar\.si|\.xlsx)\b/i.test(
      low
    )
  ) {
    return 'Tema 5 (AGE): Hojas de cálculo: Excel 365';
  }

  // Tema 6 (AGE): Bases de datos: Access 365
  if (
    /\b(tema\s*6\b.*access|access|base de datos relacional|bases de datos|clave principal|clave primaria|integridad referencial|autonum[ée]rico|consulta de selecci[óo]n|consulta de acci[óo]n|relaci[óo]n uno a varios|\.accdb)\b/i.test(
      low
    )
  ) {
    return 'Tema 6 (AGE): Bases de datos: Access 365';
  }

  // Tema 3 (AGE): El explorador de Windows
  if (
    /\b(tema\s*3\b.*explorador|explorador de windows|explorador de archivos|gesti[óo]n de carpetas y archivos|este equipo|acceso r[áa]pido|herramientas del sistema|papelera de reciclaje)\b/i.test(
      low
    )
  ) {
    return 'Tema 3 (AGE): El explorador de Windows';
  }

  // Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows
  if (
    /\b(tema\s*2\b.*windows|introducci[óo]n al sistema operativo|entorno windows|entorno gr[áa]fico de windows|men[úu]s contextuales|cuadros de di[áa]logo|men[úu] inicio|cortana|barra de tareas|windows\s*10|windows\s*11|win\s*\+)\b/i.test(
      low
    )
  ) {
    return 'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows';
  }

  // Tema 8 (AGE): La Red Internet
  if (
    /\b(tema\s*8\b.*internet|la red internet|red internet|origen, evoluci[óo]n y estado actual|protocolos y servicios en internet|navegador web|navegadores web|microsoft edge|protocolo tcp\/ip|tcp\/ip|ipv4|ipv6|\bdns\b|\bhttp\b|\bhttps\b|\bftp\b|topolog[íi]a de red|\blan\b|\bwan\b|router|switch|cookie|buscadores)\b/i.test(
      low
    )
  ) {
    return 'Tema 8 (AGE): La Red Internet';
  }

  // Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento, SO y Seguridad)
  if (
    /\b(tema\s*1\b.*inform[áa]tica|inform[áa]tica b[áa]sica|conceptos fundamentales sobre el hardware y el software|sistemas de almacenamiento de datos|nociones b[áa]sicas de seguridad inform[áa]tica|seguridad inform[áa]tica|hardware|arquitectura de von neumann|\bcpu\b|\balu\b|memoria ram|memoria rom|memoria cach[ée]|bios|uefi|perif[ée]rico|disco ssd|disco hdd|placa base|cortafuegos|firewall|malware|phishing|ransomware|troyano|copia de seguridad|certificado digital|firma electr[óo]nica)\b/i.test(
      low
    )
  ) {
    return 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)';
  }

  // 2. Leyes del BOE
  if (/\b(2\/2012|loepsf|estabilidad presupuestaria|sostenibilidad financiera|regla de gasto|d[ée]ficit estructural)\b/i.test(low)) {
    return 'Ley Orgánica 2/2012, de 27 de abril, de Estabilidad Presupuestaria y Sostenibilidad Financiera (LOEPSF)';
  }
  if (/\b(47\/2003|general presupuestaria|\blgp\b|cr[ée]dito presupuestario|transferencia de cr[ée]dito|generaci[óo]n de cr[ée]dito|incorporaci[óo]n de cr[ée]dito)\b/i.test(low)) {
    return 'Ley 47/2003, de 26 de noviembre, General Presupuestaria (LGP)';
  }
  if (/\b(38\/2003|general de subvenciones|subvenciones)\b/i.test(low)) {
    return 'Ley 38/2003, de 17 de noviembre, General de Subvenciones (LGS)';
  }
  if (/\b(9\/2017|\blcsp\b|contratos del sector p[úu]blico|contrato menor|contrato de obras|contrato de suministros|contrato de servicios|mesa de contrataci[óo]n)\b/i.test(low)) {
    return 'Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP)';
  }
  if (/\b(203\/2021|actuaci[óo]n y funcionamiento del sector p[úu]blico por medios electr[óo]nicos)\b/i.test(low)) {
    return 'Real Decreto 203/2021: Reglamento de actuación del sector público por medios electrónicos';
  }
  if (/\b(311\/2022|esquema nacional de seguridad|\bens\b)\b/i.test(low)) {
    return 'Real Decreto 311/2022: Esquema Nacional de Seguridad (ENS)';
  }
  if (/\b(4\/2010|esquema nacional de interoperabilidad|\beni\b)\b/i.test(low)) {
    return 'Real Decreto 4/2010: Esquema Nacional de Interoperabilidad (ENI)';
  }
  if (/\b(39\/2015|\blpacap\b|procedimiento administrativo com[úu]n|silencio administrativo|recurso de alzada|recurso potestativo de reposici[óo]n|recurso extraordinario de revisi[óo]n)\b/i.test(low)) {
    return 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas (LPACAP)';
  }
  if (/\b(40\/2015|\blrjsp\b|r[ée]gimen jur[íi]dico del sector p[úu]blico|[óo]rganos colegiados|abstenci[óo]n|recusaci[óo]n|delegaci[óo]n de competencias|avocaci[óo]n|encomienda de gesti[óo]n|responsabilidad patrimonial)\b/i.test(low)) {
    return 'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (LRJSP)';
  }
  if (/\b(5\/2015|\btrebep\b|estatuto b[áa]sico del empleado p[úu]blico|funcionario de carrera|funcionario interino|personal eventual)\b/i.test(low)) {
    return 'Real Decreto Legislativo 5/2015: Estatuto Básico del Empleado Público (TREBEP)';
  }
  if (/\b(364\/1995|ingreso del personal y de provisi[óo]n)\b/i.test(low)) {
    return 'Real Decreto 364/1995: Reglamento General de Ingreso y Provisión de Puestos de Trabajo de la AGE';
  }
  if (/\b(365\/1995|situaciones administrativas)\b/i.test(low)) {
    return 'Real Decreto 365/1995: Reglamento de Situaciones Administrativas de los Funcionarios Civiles de la AGE';
  }
  if (/\b(53\/1984|incompatibilidades)\b/i.test(low)) {
    return 'Ley 53/1984, de 26 de diciembre, de Incompatibilidades del Personal al Servicio de las Administraciones Públicas';
  }
  if (/\b(19\/2013|transparencia, acceso a la informaci[óo]n p[úu]blica|buen gobierno|publicidad activa)\b/i.test(low)) {
    return 'Ley 19/2013, de 9 de diciembre, de transparencia, acceso a la información pública y buen gobierno';
  }
  if (/\b(3\/2018|\blopdgdd\b|2016\/679|\brgpd\b|protecci[óo]n de datos|delegado de protecci[óo]n de datos)\b/i.test(low)) {
    return 'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)';
  }
  if (/\b(3\/2007|igualdad efectiva de mujeres y hombres)\b/i.test(low)) {
    return 'Ley Orgánica 3/2007, de 22 de marzo, para la igualdad efectiva de mujeres y hombres';
  }
  if (/\b(1\/2004|violencia de g[ée]nero)\b/i.test(low)) {
    return 'Ley Orgánica 1/2004, de 28 de diciembre, de Medidas de Protección Integral contra la Violencia de Género';
  }
  if (/\b(50\/1997|ley del gobierno)\b/i.test(low)) {
    return 'Ley 50/1997, de 27 de noviembre, del Gobierno';
  }
  if (/\b(29\/1998|jurisdicci[óo]n contencioso-administrativa|\bljca\b)\b/i.test(low)) {
    return 'Ley 29/1998, de 13 de julio, reguladora de la Jurisdicción Contencioso-administrativa (LJCA)';
  }
  if (/\b(3\/1983|estatuto de autonom[íi]a de la comunidad de madrid|1\/1983|1\/1986|9\/1990|asamblea de madrid)\b/i.test(low)) {
    return 'Ley Orgánica 3/1983, de Estatuto de Autonomía de la Comunidad de Madrid';
  }
  if (/\b(constituci[óo]n espa[ñn]ola|ce 1978|defensor del pueblo|3\/1981|tribunal constitucional|2\/1979|poder judicial|6\/1985|cortes generales|congreso de los diputados|senado|recurso de amparo)\b/i.test(low)) {
    return 'Constitución Española de 1978';
  }

  return null;
}

/**
 * Obtiene la norma o tema efectivo de una pregunta dando prioridad absoluta a:
 * 1) Las leyes/temas asignados en `pregunta.leyesRelacionadas` (cuando se edita en Justificación)
 * 2) `pregunta.justificacionLegal.norma` si NO es un texto genérico ("Legislación Oficial del Estado")
 * 3) Las leyes aplicadas al examen padre (`examenPadre.leyesBOEAplicadas`) si no son genéricas
 * 4) Deducción inteligente por el título del examen y el texto de la pregunta
 */
export const SET_10_TEMAS_INFORMATICA_OFICIALES = new Set<string>(
  LISTA_10_TEMAS_INFORMATICA_NORMALIZADOS.map((t) => t.etiqueta)
);

export function esTemaInformaticaOficial(nombre: string): boolean {
  return SET_10_TEMAS_INFORMATICA_OFICIALES.has((nombre || '').trim());
}

function esNormaJuridicaBOE(texto: string): boolean {
  if (!texto) return false;
  return /\b(ley\b|real decreto|decreto legislativo|\brd\b|\brdl\b|\blo\b|constituci[óo]n|estatuto de autonom[íi]a|reglamento de la asamblea|trebep|lpacap|lrjsp|lcsp|lgp|loepsf|lopdgdd|rgpd|\d+\/19\d{2}|\d+\/20\d{2})\b/i.test(
    texto
  );
}

function resolverTemaInformaticaCanonicamente(raw: string, textoContexto?: string): string | null {
  const limpio = (raw || '').trim();
  if (SET_10_TEMAS_INFORMATICA_OFICIALES.has(limpio)) {
    return limpio;
  }
  if (esNormaJuridicaBOE(limpio)) {
    return null;
  }

  // Si es una etiqueta genérica de informática ("Informática Básica y Ofimática", "Bloque V", etc.), deducir primero del texto de la pregunta
  const esGenericaInfo =
    /\b(inform[áa]tica b[áa]sica y ofim[áa]tica|bloque\s*(v|vi|iv)|ofim[áa]tica|inform[áa]tica c1|temario inform[áa]tica)\b/i.test(
      limpio
    );

  if (esGenericaInfo && textoContexto) {
    const porContexto = deducirNormaOTemaDesdeTexto(textoContexto);
    if (porContexto && SET_10_TEMAS_INFORMATICA_OFICIALES.has(porContexto)) {
      return porContexto;
    }
  }

  const porRaw = deducirNormaOTemaDesdeTexto(limpio);
  if (porRaw && SET_10_TEMAS_INFORMATICA_OFICIALES.has(porRaw)) {
    return porRaw;
  }

  const norm = normalizarNombreLey(limpio);
  if (norm && SET_10_TEMAS_INFORMATICA_OFICIALES.has(norm)) {
    return norm;
  }

  if (textoContexto) {
    const porContexto = deducirNormaOTemaDesdeTexto(textoContexto);
    if (porContexto && SET_10_TEMAS_INFORMATICA_OFICIALES.has(porContexto)) {
      return porContexto;
    }
  }

  if (/\b(inform[áa]tica|ofim[áa]tica|windows|word|excel|access|outlook|power\s*bi|teams|sharepoint|onedrive|internet|hardware|software)\b/i.test(limpio)) {
    return 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)';
  }

  return null;
}

export interface PreguntaClasificable {
  enunciado?: string;
  leyesRelacionadas?: string[];
  opciones?: { texto?: string; explicacion?: string }[];
  justificacionLegal?: {
    norma?: string;
    articulo?: string;
    fundamento?: string;
  };
}

export function obtenerNormaEfectivaDePregunta(
  pregunta: PreguntaClasificable,
  examenPadre?: Partial<ExamenCompleto>
): string {
  const textoCombinadoPregunta = [
    pregunta.enunciado || '',
    pregunta.justificacionLegal?.fundamento || '',
    ...(pregunta.opciones?.map((o) => `${o.texto} ${o.explicacion || ''}`) || []),
    examenPadre?.titulo || '',
  ].join(' ');

  // 1. Prioridad máxima: leyesRelacionadas vinculadas en la pregunta (p. ej. desde la ventana Justificación)
  if (pregunta.leyesRelacionadas && pregunta.leyesRelacionadas.length > 0) {
    const primeraReal = pregunta.leyesRelacionadas.find((l) => !esNormaGenerica(l));
    if (primeraReal) {
      const temaInfo = resolverTemaInformaticaCanonicamente(primeraReal, textoCombinadoPregunta);
      if (temaInfo) return temaInfo;
      return primeraReal.trim();
    }
  }

  // 2. justificacionLegal.norma si no es genérica
  const normaJustif = pregunta.justificacionLegal?.norma;
  if (normaJustif && !esNormaGenerica(normaJustif)) {
    const temaInfo = resolverTemaInformaticaCanonicamente(normaJustif, textoCombinadoPregunta);
    if (temaInfo) return temaInfo;
    return normaJustif.trim();
  }

  // 3. Deducción directa a partir del enunciado + fundamento + título del examen padre
  const deducida = deducirNormaOTemaDesdeTexto(textoCombinadoPregunta);
  if (deducida) return deducida;

  // 4. Leyes del examen padre si no son genéricas
  if (examenPadre?.leyesBOEAplicadas && examenPadre.leyesBOEAplicadas.length > 0) {
    const primeraLeyExamen = examenPadre.leyesBOEAplicadas.find((l) => !esNormaGenerica(l));
    if (primeraLeyExamen) {
      const temaInfo = resolverTemaInformaticaCanonicamente(primeraLeyExamen, textoCombinadoPregunta);
      if (temaInfo) return temaInfo;
      return primeraLeyExamen.trim();
    }
  }

  return normaJustif || 'Normativa Oficial BOE';
}

/**
 * Clasifica una pregunta en una de las 9 categorías oficiales del temario C1
 */
export function clasificarPreguntaEnCategoriaTemario(
  pregunta: Partial<PreguntaExamen>,
  examenPadre?: Partial<ExamenCompleto>
): CategoriaTemarioId {
  // 1. Inspeccionar primero las leyes/temas vinculados explícitamente y la norma efectiva
  const normaEfectiva = obtenerNormaEfectivaDePregunta(pregunta, examenPadre);
  if (SET_10_TEMAS_INFORMATICA_OFICIALES.has(normaEfectiva)) {
    return 'informatica_c1';
  }

  const textoPrioritario = [
    ...(pregunta.leyesRelacionadas || []),
    !esNormaGenerica(pregunta.justificacionLegal?.norma) ? pregunta.justificacionLegal?.norma || '' : '',
    normaEfectiva,
    ...(examenPadre?.leyesBOEAplicadas?.filter((l) => !esNormaGenerica(l)) || []),
    examenPadre?.titulo || '',
    pregunta.enunciado || '',
    pregunta.justificacionLegal?.fundamento || '',
  ]
    .join(' ')
    .toLowerCase();

  // Informática y Ofimática C1 (8 temas AGE + 2 temas adicionales CAM)
  if (
    !esNormaJuridicaBOE(normaEfectiva) &&
    (/\b(word\s*365|excel\s*365|access\s*365|outlook\s*365|microsoft\s*word|microsoft\s*excel|microsoft\s*access|microsoft\s*outlook|microsoft\s*teams|sharepoint|onedrive|trabajo colaborativo|power\s*bi|powerbi|explorador de windows|explorador de archivos|entorno windows|cortana|este equipo|acceso r[áa]pido|von neumann|\bram\b|\brom\b|\bcpu\b|\balu\b|bios|uefi|disco ssd|red internet|tcp\/ip|ipv4|ipv6|\bdns\b|bandeja de entrada|cco|smtp|pop3|imap|ofim[áa]tica|buscarx|buscarv|tabla din[áa]mica|\bdax\b|power\s*query|phishing|ransomware|navegadores web)\b/i.test(
      textoPrioritario
    ) ||
      (/dominio/i.test(textoPrioritario) && /\b(correo|arroba|extensi[óo]n|direcci[óo]n)\b/i.test(textoPrioritario)))
  ) {
    return 'informatica_c1';
  }

  // Régimen Autonómico CAM
  if (
    /\b(comunidad de madrid|estatuto de autonom[íi]a de la comunidad de madrid|3\/1983|1\/1983|1\/1986|9\/1990|asamblea de madrid)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'autonomico_madrid';
  }

  // Contratos del Sector Público
  if (
    /\b(9\/2017|lcsp|contratos del sector p[úu]blico|contrato menor|contrato de obras|contrato de suministros|contrato de servicios|adjudicaci[óo]n|licitaci[óo]n|pliego|mesa de contrataci[óo]n|sara)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'contratos_sector_publico';
  }

  // Presupuestos, Estabilidad Presupuestaria (LO 2/2012) y Gestión Financiera (Ley 47/2003)
  if (
    /\b(47\/2003|general presupuestaria|\blgp\b|2\/2012|loepsf|estabilidad presupuestaria|sostenibilidad financiera|regla de gasto|d[ée]ficit estructural|deuda p[úu]blica|38\/2003|subvenciones|presupuesto|cr[ée]dito presupuestario|transferencia de cr[ée]dito|generaci[óo]n de cr[ée]dito|incorporaci[óo]n de cr[ée]dito|ejecuci[óo]n del gasto|reconocimiento de la obligaci[óo]n|ordenaci[óo]n del pago|tribunal de cuentas|igae)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'presupuestos_hacienda';
  }

  // Transparencia, Protección de Datos e Igualdad
  if (
    /\b(19\/2013|transparencia|buen gobierno|3\/2018|lopdgdd|rgpd|2016\/679|protecci[óo]n de datos|delegado de protecci[óo]n|agencia espa[ñn]ola de protecci[óo]n de datos|3\/2007|igualdad efectiva|1\/2004|violencia de g[ée]nero|39\/2006|dependencia|4\/2023)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'transparencia_datos';
  }

  // Función Pública y Personal
  if (
    /\b(5\/2015|trebep|estatuto b[áa]sico del empleado p[úu]blico|364\/1995|365\/1995|53\/1984|incompatibilidades|30\/1984|33\/1986|670\/1987|clases pasivas|8\/2015|31\/1995|riesgos laborales|situaciones administrativas|servicio activo|servicios especiales|excedencia|suspensi[óo]n de funciones|funcionario de carrera|funcionario interino|personal laboral|personal eventual|grado personal|libre designaci[óo]n|concurso de m[ée]ritos|convenio [úu]nico)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'funcion_publica_personal';
  }

  // Régimen Jurídico del Sector Público (Ley 40/2015)
  if (
    /\b(40\/2015|lrjsp|r[ée]gimen jur[íi]dico del sector p[úu]blico|[óo]rganos colegiados|abstenci[óo]n|recusaci[óo]n|delegaci[óo]n de competencias|avocaci[óo]n|encomienda de gesti[óo]n|delegaci[óo]n de firma|suplencia|responsabilidad patrimonial|convenios administrativos|sector p[úu]blico institucional)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'regimen_sector_publico';
  }

  // Procedimiento Administrativo Común (Ley 39/2015 y RD 203/2021)
  if (
    /\b(39\/2015|lpacap|203\/2021|311\/2022|4\/2010|procedimiento administrativo com[úu]n|acto administrativo|silencio administrativo|recurso de alzada|recurso potestativo de reposici[óo]n|recurso extraordinario de revisi[óo]n|revisi[óo]n de oficio|lesividad|nulidad de pleno derecho|anulabilidad|notificaci[óo]n|c[óo]mputo de plazos|interesados|ejecuci[óo]n forzosa|apremio sobre el patrimonio)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'procedimiento_administrativo';
  }

  // Constitución y Organización del Estado
  if (
    /\b(constituci[óo]n|ce 1978|1978|50\/1997|ley del gobierno|defensor del pueblo|3\/1981|tribunal constitucional|2\/1979|lotc|poder judicial|6\/1985|lopj|corona|cortes generales|congreso de los diputados|senado|recurso de amparo|cuesti[óo]n de inconstitucionalidad|estados de alarma|excepci[óo]n y sitio|29\/1998|jurisdicci[óo]n contencioso)\b/i.test(
      textoPrioritario
    )
  ) {
    return 'constitucion_organizacion';
  }

  // Si la pregunta tenía una temática explícita distinta del fallback por defecto
  const temExplicita = pregunta.tematica as CategoriaTemarioId | undefined;
  if (temExplicita && CATEGORIAS_TEMARIO_PROGRESO.some((c) => c.id === temExplicita)) {
    return temExplicita;
  }

  if (examenPadre?.tematicas && examenPadre.tematicas.length > 0) {
    const primera = examenPadre.tematicas[0] as CategoriaTemarioId;
    if (CATEGORIAS_TEMARIO_PROGRESO.some((c) => c.id === primera)) {
      return primera;
    }
  }

  return 'procedimiento_administrativo';
}

export const ETIQUETA_CATALOGACION_TEST_OFICIAL = 'Test oficial';
export const ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL = 'Supuesto oficial';

export function esCatalogacionPruebaOficial(raw: string): boolean {
  const s = (raw || '').trim().toLowerCase();
  return (
    s === 'test oficial' ||
    s === 'test_oficial' ||
    s === 'supuesto oficial' ||
    s === 'supuesto_oficial' ||
    s === 'catalogación: test oficial' ||
    s === 'catalogación: supuesto oficial'
  );
}

/**
 * Normaliza cualquier texto de norma, ley, tema de informática o catalogación oficial
 * a su etiqueta canónica oficial ajustada a las convocatorias.
 */
export function normalizarNombreLey(raw: string): string {
  const s = (raw || '').trim();
  if (!s || esNormaGenerica(s)) return '';
  const low = s.toLowerCase();

  // 0. CATALOGACIÓN EXCLUSIVA COMO TEST OFICIAL O SUPUESTO OFICIAL
  if (
    low === 'test oficial' ||
    low === 'test_oficial' ||
    low === 'catalogación: test oficial' ||
    low === 'examen oficial global'
  ) {
    return ETIQUETA_CATALOGACION_TEST_OFICIAL;
  }
  if (
    low === 'supuesto oficial' ||
    low === 'supuesto_oficial' ||
    low === 'catalogación: supuesto oficial' ||
    low === 'supuesto práctico oficial' ||
    low === 'supuesto practico oficial'
  ) {
    return ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL;
  }

  // 1. LOS 10 TEMAS OFICIALES DE INFORMÁTICA (8 AGE + 2 ADICIONALES CAM)
  // Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive y Videoconferencias)
  if (
    low.includes('tema 10') ||
    low.includes('trabajo colaborativo') ||
    low.includes('teams') ||
    low.includes('sharepoint') ||
    low.includes('onedrive') ||
    low.includes('videoconferencia')
  ) {
    return 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)';
  }

  // Tema 9 (CAM): Power BI
  if (
    low.includes('tema 9') ||
    low.includes('power bi') ||
    low.includes('powerbi') ||
    low.includes('power query') ||
    low.includes('dax') ||
    low.includes('cuadros de mando')
  ) {
    return 'Tema 9 (CAM): Power BI';
  }

  // Tema 7 (AGE): Correo electrónico: Outlook 365
  if (
    low.includes('tema 7') ||
    low.includes('outlook') ||
    low.includes('correo electrónico') ||
    low.includes('correo electronico') ||
    low.includes('reglas de mensaje') ||
    low.includes('libreta de direcciones')
  ) {
    return 'Tema 7 (AGE): Correo electrónico: Outlook 365';
  }

  // Tema 4 (AGE): Procesadores de texto: Word 365
  if (
    low.includes('tema 4') ||
    low.includes('word') ||
    low.includes('procesador de textos') ||
    low.includes('procesadores de texto') ||
    low.includes('combinar correspondencia') ||
    low.includes('combinación de correspondencia')
  ) {
    return 'Tema 4 (AGE): Procesadores de texto: Word 365';
  }

  // Tema 5 (AGE): Hojas de cálculo: Excel 365
  if (
    low.includes('tema 5') ||
    low.includes('excel') ||
    low.includes('hoja de cálculo') ||
    low.includes('hojas de cálculo') ||
    low.includes('tablas dinámicas') ||
    low.includes('fórmulas y funciones')
  ) {
    return 'Tema 5 (AGE): Hojas de cálculo: Excel 365';
  }

  // Tema 6 (AGE): Bases de datos: Access 365
  if (
    low.includes('tema 6') ||
    low.includes('access') ||
    low.includes('bases de datos') ||
    low.includes('base de datos') ||
    low.includes('tablas y relaciones') ||
    low.includes('consultas e informes')
  ) {
    return 'Tema 6 (AGE): Bases de datos: Access 365';
  }

  // Tema 3 (AGE): El explorador de Windows
  if (
    low.includes('tema 3') ||
    low.includes('explorador de windows') ||
    low.includes('explorador de archivos') ||
    low.includes('gestión de carpetas y archivos') ||
    low.includes('este equipo') ||
    low.includes('acceso rápido')
  ) {
    return 'Tema 3 (AGE): El explorador de Windows';
  }

  // Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows
  if (
    low.includes('tema 2') ||
    low.includes('introducción al sistema operativo') ||
    low.includes('introduccion al sistema operativo') ||
    low.includes('entorno windows') ||
    low.includes('entorno gráfico de windows') ||
    low.includes('menú inicio') ||
    low.includes('cortana')
  ) {
    return 'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows';
  }

  // Tema 8 (AGE): La Red Internet
  if (
    low.includes('tema 8') ||
    low.includes('la red internet') ||
    low.includes('red internet') ||
    low.includes('redes') ||
    low.includes('internet') ||
    low.includes('tcp/ip') ||
    low.includes('navegadores web') ||
    low.includes('protocolos y servicios')
  ) {
    return 'Tema 8 (AGE): La Red Internet';
  }

  // Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)
  if (
    low.includes('tema 1') ||
    low.includes('informática básica') ||
    low.includes('informatica basica') ||
    low.includes('hardware') ||
    low.includes('arquitectura de ordenadores') ||
    low.includes('sistemas de almacenamiento') ||
    low.includes('seguridad informática') ||
    low.includes('ciberseguridad') ||
    low.includes('windows 11 y hardware') ||
    low.includes('sistemas operativos')
  ) {
    return 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)';
  }

  // 2. LEGISLACIÓN OFICIAL BOE
  if (low.includes('constitución') || low.includes('constitucion') || low.includes('ce 1978') || low === 'ce') {
    return 'Constitución Española de 1978';
  }
  if (low.includes('203/2021')) {
    return 'RD 203/2021 (Admin. Electrónica)';
  }
  if (low.includes('311/2022') || low.includes('esquema nacional de seguridad')) {
    return 'RD 311/2022 (Esquema Nacional de Seguridad)';
  }
  if (low.includes('4/2010') || low.includes('esquema nacional de interoperabilidad')) {
    return 'RD 4/2010 (Esquema Nacional de Interoperabilidad)';
  }
  if (low.includes('39/2015') || low.includes('lpacap') || low.includes('procedimiento administrativo común')) {
    return 'Ley 39/2015 (LPACAP)';
  }
  if (low.includes('40/2015') || low.includes('lrjsp') || low.includes('régimen jurídico del sector público')) {
    return 'Ley 40/2015 (LRJSP)';
  }
  if (low.includes('5/2015') || low.includes('trebep') || low.includes('estatuto básico del empleado público')) {
    return 'TREBEP (RDL 5/2015)';
  }
  if (low.includes('364/1995')) {
    return 'RD 364/1995 (Ingreso y Provisión)';
  }
  if (low.includes('365/1995')) {
    return 'RD 365/1995 (Situaciones Administrativas)';
  }
  if (low.includes('33/1986') || low.includes('régimen disciplinario')) {
    return 'RD 33/1986 (Régimen Disciplinario)';
  }
  if (low.includes('9/2017') || low.includes('lcsp') || low.includes('contratos del sector público')) {
    return 'Ley 9/2017 (Contratos LCSP)';
  }
  if (low.includes('2/2012') || low.includes('loepsf') || low.includes('estabilidad presupuestaria')) {
    return 'LO 2/2012 (Estabilidad Presupuestaria)';
  }
  if (low.includes('47/2003') || low.includes('general presupuestaria') || low.includes('lgp')) {
    return 'Ley 47/2003 (General Presupuestaria)';
  }
  if (low.includes('38/2003') || low.includes('887/2006') || low.includes('subvenciones')) {
    return 'Ley 38/2003 (Subvenciones)';
  }
  if (low.includes('19/2013') || low.includes('transparencia')) {
    return 'Ley 19/2013 (Transparencia y Buen Gobierno)';
  }
  if (low.includes('3/2018') || low.includes('lopdgdd') || low.includes('2016/679') || low.includes('rgpd') || low.includes('protección de datos')) {
    return 'LO 3/2018 y RGPD (Protección de Datos)';
  }
  if (low.includes('3/2007') || low.includes('igualdad')) {
    return 'LO 3/2007 (Igualdad Efectiva)';
  }
  if (low.includes('1/2004') || low.includes('violencia de género')) {
    return 'LO 1/2004 (Violencia de Género)';
  }
  if (low.includes('50/1997') || low.includes('ley del gobierno')) {
    return 'Ley 50/1997 (Ley del Gobierno)';
  }
  if (low.includes('53/1984') || low.includes('incompatibilidades')) {
    return 'Ley 53/1984 (Incompatibilidades)';
  }
  if (low.includes('29/1998') || low.includes('jurisdicción contencioso') || low.includes('ljca')) {
    return 'Ley 29/1998 (LJCA)';
  }
  if (low.includes('670/1987') || low.includes('clases pasivas') || low.includes('8/2015') || low.includes('seguridad social')) {
    return 'Seguridad Social y Clases Pasivas';
  }
  if (low.includes('31/1995') || low.includes('riesgos laborales') || low.includes('lprl')) {
    return 'Ley 31/1995 (Prevención Riesgos Laborales)';
  }
  if (low.includes('3/1983') || low.includes('1/1983') || low.includes('1/1986') || low.includes('9/1990') || low.includes('comunidad de madrid') || low.includes('asamblea de madrid')) {
    return 'Normativa Autonómica CAM';
  }

  return s.length > 55 ? s.slice(0, 52) + '...' : s;
}

export const normalizarEtiquetaLeyONorma = normalizarNombreLey;

/**
 * Obtiene la lista de leyes / temas canónicos aplicables a una pregunta,
 * respetando siempre las modificaciones realizadas en la ventana Justificación (`leyesRelacionadas`)
 * e ignorando placeholders genéricos o etiquetas de catalogación de test ("Test oficial", "Supuesto oficial").
 */
export function obtenerLeyesNormalizadasDePregunta(
  pregunta: Partial<PreguntaExamen>,
  examenPadre?: Partial<ExamenCompleto>
): string[] {
  const fuentesPrioritarias: string[] = [];

  // 1. Si el usuario ha vinculado leyes/temas en la pregunta (ventana Justificación), tienen prioridad total
  const leyesPreguntaNoGenericas = (pregunta.leyesRelacionadas || []).filter(
    (l) => !esNormaGenerica(l) && !esCatalogacionPruebaOficial(l)
  );
  if (leyesPreguntaNoGenericas.length > 0) {
    fuentesPrioritarias.push(...leyesPreguntaNoGenericas);
  }

  // 2. Añadir justificacionLegal.norma SOLO si no es genérica ni catalogación de prueba oficial
  const normaJustif = pregunta.justificacionLegal?.norma;
  if (
    normaJustif &&
    !esNormaGenerica(normaJustif) &&
    !esCatalogacionPruebaOficial(normaJustif) &&
    fuentesPrioritarias.length === 0
  ) {
    fuentesPrioritarias.push(normaJustif);
  }

  // 3. Si aún no hay ley específica, deducir del contenido de la pregunta + título del examen padre
  if (fuentesPrioritarias.length === 0) {
    const normaEfectiva = obtenerNormaEfectivaDePregunta(pregunta, examenPadre);
    if (
      normaEfectiva &&
      !esNormaGenerica(normaEfectiva) &&
      !esCatalogacionPruebaOficial(normaEfectiva)
    ) {
      fuentesPrioritarias.push(normaEfectiva);
    }
  }

  // 4. Fallback a las leyes del examen padre no genéricas ni de catalogación oficial
  if (fuentesPrioritarias.length === 0 && examenPadre?.leyesBOEAplicadas) {
    const leyesExamenNoGen = examenPadre.leyesBOEAplicadas.filter(
      (l) => !esNormaGenerica(l) && !esCatalogacionPruebaOficial(l)
    );
    if (leyesExamenNoGen.length > 0) {
      fuentesPrioritarias.push(...leyesExamenNoGen);
    }
  }

  const normalizadas = Array.from(
    new Set(
      fuentesPrioritarias
        .map((r) => normalizarNombreLey(r))
        .filter((n) => Boolean(n) && !esNormaGenerica(n) && !esCatalogacionPruebaOficial(n))
    )
  );

  if (normalizadas.length > 0) {
    return normalizadas;
  }

  // 5. Último recurso: deducir etiqueta canónica según la categoría temática de la pregunta
  const cat = clasificarPreguntaEnCategoriaTemario(pregunta, examenPadre);
  switch (cat) {
    case 'constitucion_organizacion':
      return ['Constitución Española de 1978'];
    case 'procedimiento_administrativo':
      return ['Ley 39/2015 (LPACAP)'];
    case 'regimen_sector_publico':
      return ['Ley 40/2015 (LRJSP)'];
    case 'funcion_publica_personal':
      return ['TREBEP (RDL 5/2015)'];
    case 'contratos_sector_publico':
      return ['Ley 9/2017 (Contratos LCSP)'];
    case 'presupuestos_hacienda':
      return ['Ley 47/2003 (General Presupuestaria)'];
    case 'transparencia_datos':
      return ['Ley 19/2013 (Transparencia y Buen Gobierno)'];
    case 'autonomico_madrid':
      return ['Normativa Autonómica CAM'];
    case 'informatica_c1':
      return ['Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)'];
  }
}

/**
 * Determina si un examen está catalogado como prueba oficial global ("Test oficial" o "Supuesto oficial")
 * en lugar de por leyes o temas concretos.
 */
export function obtenerTipoCatalogacionOficialDeExamen(
  examen: Partial<ExamenCompleto>
): typeof ETIQUETA_CATALOGACION_TEST_OFICIAL | typeof ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL | null {
  const leyesExplicitas = (examen.leyesBOEAplicadas || []).filter((l) => !esNormaGenerica(l));

  // 1. Si el usuario lo ha catalogado explícitamente como Test oficial o Supuesto oficial en leyesBOEAplicadas
  for (const l of leyesExplicitas) {
    const norm = normalizarNombreLey(l);
    if (norm === ETIQUETA_CATALOGACION_TEST_OFICIAL) return ETIQUETA_CATALOGACION_TEST_OFICIAL;
    if (norm === ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL) return ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL;
  }

  // 2. Si el usuario asignó explícitamente 1 o 2 leyes/temas concretos (y el título no es un examen general de convocatoria INAP/CPS),
  // se respeta su catalogación por ley/tema concreto.
  const titulo = (examen.titulo || '').trim();
  const normDesdeTitulo = deducirNormaOTemaDesdeTexto(titulo);
  const esTituloConvocatoriaGeneral =
    /\b(examen oficial|test oficial|simulacro oficial|supuesto pr[áa]ctico oficial|supuesto oficial|preguntas reales inap)\b/i.test(
      titulo
    ) && !normDesdeTitulo;

  if (esTituloConvocatoriaGeneral) {
    return examen.tipo === 'supuesto' || examen.categoria === 'supuesto_oficial'
      ? ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL
      : ETIQUETA_CATALOGACION_TEST_OFICIAL;
  }

  // 3. Si tiene categoría 'test_oficial' o 'supuesto_oficial' y múltiples leyes distintas (>= 3) sin una ley única en el título
  const leyesNormNoOficiales = Array.from(
    new Set(
      leyesExplicitas
        .map((l) => normalizarNombreLey(l))
        .filter((n) => Boolean(n) && !esCatalogacionPruebaOficial(n))
    )
  );

  if (
    !normDesdeTitulo &&
    leyesNormNoOficiales.length >= 3 &&
    (examen.categoria === 'test_oficial' ||
      examen.categoria === 'supuesto_oficial' ||
      examen.origen === 'oficial_json')
  ) {
    return examen.tipo === 'supuesto' || examen.categoria === 'supuesto_oficial'
      ? ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL
      : ETIQUETA_CATALOGACION_TEST_OFICIAL;
  }

  return null;
}

/**
 * Limpia etiquetas de citación tipo [cite: 538], corchetes o comillas envolventes
 * de una cadena de convocatoria.
 */
export function limpiarTextoConvocatoria(raw?: string): string {
  if (!raw) return '';
  let s = raw
    .replace(/\[\s*(?:cite|source|ref)\s*:\s*[^\]]*\]/gi, '')
    .trim();
  if (s.startsWith('[') && s.endsWith(']') && s.indexOf(']') === s.length - 1) {
    s = s.slice(1, -1).trim();
  }
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith('«') && s.endsWith('»')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s
    .replace(
      /^(?:convocatoria(?:s)?(?:\s+oficial(?:es)?)?|origen(?:\s+convocatoria)?|aparici[oó]n|oficial)[\s:\-]+/i,
      ''
    )
    .trim();
  s = s.replace(/\.+$/, '').trim();
  return s;
}

/**
 * Determina si un texto del campo `convocatoriasAparecida` indica que la pregunta es inédita
 * o carece de convocatoria oficial.
 */
export function esTextoConvocatoriaInedita(raw?: string): boolean {
  const s = limpiarTextoConvocatoria(raw);
  if (!s) return true;
  if (
    /^(?:100%\s*)?(?:pregunta\s+|cuesti[oó]n\s+|item\s+|ítem\s+)?in[eé]dit[ao]s?(?:\s*[\(\-\–\—\:\.,].*)?$/i.test(
      s
    )
  ) {
    return true;
  }
  if (
    /^(?:no\s+consta|ninguna|sin\s+aparici[oó]n(?:es)?(?:\s+previas?)?|sin\s+convocatoria|creaci[oó]n\s+propia|elaboraci[oó]n\s+propia|original|propia|n\/a|ninguno|\-+)$/i.test(
      s
    )
  ) {
    return true;
  }
  // Plantilla sin rellenar tipo "ej. C1 AGE 2019 / Auxiliar AGE 2022 | Inédita"
  if (/\bej\.\s*c1\s+age\b/i.test(s) || /\|\s*in[eé]dita\b/i.test(s)) {
    return true;
  }
  // Si menciona "inédita" pero no cita ningún año (19xx/20xx) ni siglas de convocatoria oficial
  if (
    /\bin[eé]dit[ao]s?\b/i.test(s) &&
    !/\b(19\d{2}|20\d{2}|oep|inap|cps|age|cam|tai|gace)\b/i.test(s)
  ) {
    return true;
  }
  return false;
}

/**
 * Extrae una referencia limpia a la convocatoria oficial a partir de un examen padre
 * cuando dicho examen es un Test Oficial o Supuesto Oficial.
 */
export function extraerNombreConvocatoriaDesdeExamen(
  examenPadre?: Partial<ExamenCompleto> | null
): string | null {
  if (!examenPadre) return null;

  const tituloLimpio = (examenPadre.titulo || '')
    .replace(/\s*\(Intento\s*\d+\)/gi, '')
    .trim();

  // Excluir contenedores mixtos o pruebas de academia / IA / repaso de fallos
  if (
    /^(?:simulacro\s+oficial\s+unificado|test\s+de\s+falladas|simulacro\s+de\s+academia|supuesto\s+de\s+academia|test\s+aleatorio|supuesto\s+aleatorio|bater[ií]a\s+generada)/i.test(
      tituloLimpio
    )
  ) {
    return null;
  }

  const catalogacionOficial = obtenerTipoCatalogacionOficialDeExamen(examenPadre);
  const esIdOficial = /^OFICIAL-/i.test(examenPadre.id || '') || /^OFICIAL-/i.test(examenPadre.testBaseId || '');
  const mencionaConvocatoriaEnTitulo =
    /\b(OEP\s*\d{4}|Preguntas\s+Reales\s+INAP|Cuestionario\s+INAP|Convocatoria\s+OEP|Convocatoria\s+Auton[oó]mica|Examen\s+Oficial\s+C1|Supuesto\s+Pr[aá]ctico\s+Oficial\s+(?:CPS|CAM|AGE|INAP)|Supuesto\s+Oficial\s+(?:CPS|CAM|AGE|INAP))\b/i.test(
      tituloLimpio
    );

  if (!catalogacionOficial && !esIdOficial && !mencionaConvocatoriaEnTitulo) {
    return null;
  }

  if (tituloLimpio) {
    // Limpiar prefijos redundantes para dejar la referencia directa a la convocatoria
    let resumido = tituloLimpio
      .replace(/^(?:Examen\s+Oficial|Test\s+Oficial)\s*[\-—:]?\s*/i, '')
      .replace(/\s*[\-—]\s*Preguntas\s+Reales\s+INAP$/i, ' · INAP')
      .replace(/\s*\(Cuestionario\s+INAP\)$/i, ' · INAP')
      .trim();

    if (!resumido || esCatalogacionPruebaOficial(resumido)) {
      const amb = examenPadre.ambito && examenPadre.ambito !== 'AMBOS' ? ` ${examenPadre.ambito}` : ' C1';
      const anio = examenPadre.fecha ? ` ${examenPadre.fecha.slice(0, 4)}` : '';
      return `${catalogacionOficial || 'Convocatoria Oficial'}${amb}${anio}`;
    }

    return resumido.length > 58 ? resumido.slice(0, 55) + '...' : resumido;
  }

  const amb = examenPadre.ambito && examenPadre.ambito !== 'AMBOS' ? ` ${examenPadre.ambito}` : ' C1';
  const anio = examenPadre.fecha ? ` ${examenPadre.fecha.slice(0, 4)}` : '';
  return `${catalogacionOficial || 'Convocatoria Oficial'}${amb}${anio}`;
}

/**
 * Obtiene la referencia a la convocatoria oficial de la que procede una pregunta,
 * o devuelve `null` si la pregunta es genuinamente inédita.
 */
export function obtenerReferenciaConvocatoriaOficial(
  pregunta?: Partial<PreguntaExamen> | Partial<ItemAlmacenDuda> | null,
  examenPadre?: Partial<ExamenCompleto> | null
): string | null {
  if (!pregunta && !examenPadre) return null;

  // 1. Prioridad máxima: campo `convocatoriasAparecida` de la propia pregunta
  const rawConvPregunta = limpiarTextoConvocatoria(pregunta?.convocatoriasAparecida);
  if (rawConvPregunta) {
    if (!esTextoConvocatoriaInedita(rawConvPregunta)) {
      return rawConvPregunta;
    }
    // Si la pregunta indica explícitamente "Inédita" y no pertenece a un examen catalogado como Test/Supuesto Oficial global,
    // es una pregunta inédita.
    if (!examenPadre || extraerNombreConvocatoriaDesdeExamen(examenPadre) === null) {
      return null;
    }
  }

  // 2. Etiqueta explícita de convocatoria oficial incrustada en el enunciado: ej. "[C1 AGE 2022]" o "(INAP OEP 2021)"
  if (pregunta?.enunciado) {
    const matchEnunciado = pregunta.enunciado.match(
      /(?:[\(\[]\s*((?:Examen\s+Oficial|Convocatoria\s+Oficial|Convocatoria\s+OEP|OEP\s*\d{4}|INAP\s*\d{4}|CPS\s*\d{4}|C1\s+AGE\s*\d{4}|C1\s+CAM\s*\d{4}|Auxiliar\s+AGE\s*\d{4}|TAI\s+AGE\s*\d{4})[^\)\]]{0,42})\s*[\)\]])/i
    );
    if (matchEnunciado && matchEnunciado[1]) {
      return limpiarTextoConvocatoria(matchEnunciado[1]);
    }
  }

  // 3. Si es un ítem del almacén con `examenTitulo` de una convocatoria oficial
  const itemAlmacen = pregunta as Partial<ItemAlmacenDuda> | undefined;
  if (itemAlmacen?.examenTitulo && !examenPadre?.titulo) {
    const desdeItem = extraerNombreConvocatoriaDesdeExamen({
      id: itemAlmacen.examenId,
      titulo: itemAlmacen.examenTitulo,
    });
    if (desdeItem) return desdeItem;
  }

  // 4. Comprobar si el examen padre es una convocatoria oficial
  return extraerNombreConvocatoriaDesdeExamen(examenPadre);
}

/**
 * Formatea la etiqueta visual para el badge donde se muestra la convocatoria oficial
 * en sustitución de "100% INÉDITA".
 */
export function formatearBadgeConvocatoriaOficial(refConv: string): string {
  const limpio = limpiarTextoConvocatoria(refConv);
  if (!limpio) return 'CONVOCATORIA OFICIAL';
  if (/^(?:convocatoria|examen\s+oficial|supuesto\s+(?:pr[aá]ctico\s+)?oficial)\b/i.test(limpio)) {
    return limpio;
  }
  return `CONVOCATORIA OFICIAL · ${limpio}`;
}

/**
 * Obtiene todas las etiquetas de catalogación normalizadas de un examen completo
 * (bien sea ['Test oficial'], ['Supuesto oficial'], o las Leyes BOE / Temas Oficiales de Informática),
 * garantizando separación estricta:
 * - Si está catalogado como Test oficial o Supuesto oficial, NO devuelve leyes ni temas individuales.
 * - Si está catalogado por leyes o temas, NO devuelve Test oficial ni Supuesto oficial.
 */
export function obtenerLeyesNormalizadasDeExamen(
  examen: Partial<ExamenCompleto>
): string[] {
  // 1. Comprobar primero si el examen está catalogado como Test oficial o Supuesto oficial
  const catalogacionOficial = obtenerTipoCatalogacionOficialDeExamen(examen);
  if (catalogacionOficial) {
    return [catalogacionOficial];
  }

  const leyesSet = new Set<string>();

  // 2. Leyes o temas explícitos asignados al examen (sin genéricos ni etiquetas de prueba oficial)
  (examen.leyesBOEAplicadas || []).forEach((l) => {
    if (!esNormaGenerica(l) && !esCatalogacionPruebaOficial(l)) {
      const norm = normalizarNombreLey(l);
      if (norm && !esCatalogacionPruebaOficial(norm)) {
        leyesSet.add(norm);
      }
    }
  });

  // Si el examen ya tiene leyes/temas explícitos catalogados en leyesBOEAplicadas, usarlos directamente
  // sin mezclar todas las leyes internas de las preguntas.
  if (leyesSet.size > 0) {
    return Array.from(leyesSet);
  }

  // 3. Deducción por título del examen si no tenía leyes explícitas
  if (examen.titulo) {
    const deducidaTitulo = deducirNormaOTemaDesdeTexto(examen.titulo);
    if (deducidaTitulo) {
      const norm = normalizarNombreLey(deducidaTitulo);
      if (norm && !esCatalogacionPruebaOficial(norm)) {
        leyesSet.add(norm);
      }
    }
  }

  if (leyesSet.size > 0) {
    return Array.from(leyesSet);
  }

  // 4. Último recurso: deducir de las preguntas solo si el examen no tenía catalogación en cabecera
  if (Array.isArray(examen.preguntas)) {
    examen.preguntas.forEach((p) => {
      obtenerLeyesNormalizadasDePregunta(p, examen).forEach((l) => {
        if (!esCatalogacionPruebaOficial(l)) {
          leyesSet.add(l);
        }
      });
    });
  }

  return Array.from(leyesSet);
}

/**
 * Clasifica un examen/test completo en una o varias categorías del temario C1,
 * excluyendo los exámenes catalogados como "Test oficial" o "Supuesto oficial"
 * para que al filtrar por temática o ley no se incluyan los tests/supuestos oficiales.
 */
export function clasificarExamenEnCategoriasTemario(
  examen: Partial<ExamenCompleto>
): CategoriaTemarioId[] {
  // Si el examen está catalogado como Test oficial o Supuesto oficial, no se incluye en filtros por bloque de ley/temática
  if (obtenerTipoCatalogacionOficialDeExamen(examen) !== null) {
    return [];
  }

  const categorias = new Set<CategoriaTemarioId>();
  const leyesDelExamen = obtenerLeyesNormalizadasDeExamen(examen);

  if (leyesDelExamen.length > 0) {
    leyesDelExamen.forEach((ley) => {
      const cat = clasificarPreguntaEnCategoriaTemario(
        { enunciado: ley, leyesRelacionadas: [ley] },
        examen
      );
      categorias.add(cat);
    });
    return Array.from(categorias);
  }

  // Fallback por título
  if (examen.titulo && examen.titulo.trim()) {
    const catCabecera = clasificarPreguntaEnCategoriaTemario(
      { enunciado: examen.titulo },
      examen
    );
    categorias.add(catCabecera);
  }

  return Array.from(categorias);
}

/**
 * Evalúa si un examen coincide con el término del buscador garantizando que:
 * - Al buscar por leyes o temas concretos, NO se incluyan los catalogados como "Test oficial" o "Supuesto oficial".
 * - Al buscar "Test oficial" o "Supuesto oficial", NO se incluyan los catalogados por leyes o temas concretos.
 */
export function coincideBusquedaExamenConSeparacionOficial(
  examen: Partial<ExamenCompleto>,
  terminoBusqueda: string
): boolean {
  const term = (terminoBusqueda || '').toLowerCase().trim();
  if (!term) return true;

  const catalogacionOficial = obtenerTipoCatalogacionOficialDeExamen(examen);
  const etiquetasExamen = obtenerLeyesNormalizadasDeExamen(examen);

  const buscaTestOficial =
    term === 'test oficial' ||
    term === 'test_oficial' ||
    term.includes('test oficial');
  const buscaSupuestoOficial =
    term === 'supuesto oficial' ||
    term === 'supuesto_oficial' ||
    term.includes('supuesto oficial');

  // Si el usuario busca específicamente "test oficial" o "supuesto oficial"
  if (buscaTestOficial) {
    return catalogacionOficial === ETIQUETA_CATALOGACION_TEST_OFICIAL;
  }
  if (buscaSupuestoOficial) {
    return catalogacionOficial === ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL;
  }

  // Detectar si el término buscado corresponde a una ley BOE o tema de informática
  const leyOTemaBuscado = deducirNormaOTemaDesdeTexto(term);

  // Si el examen está catalogado como Test oficial o Supuesto oficial:
  if (catalogacionOficial !== null) {
    // Si el usuario está buscando por una ley o tema de informática, excluir siempre el Test oficial / Supuesto oficial
    if (leyOTemaBuscado !== null) {
      return false;
    }
    // Solo permitir coincidencia por título (si no es nombre de ley), ID o etiqueta oficial
    return (
      (examen.titulo || '').toLowerCase().includes(term) ||
      (examen.id || '').toLowerCase().includes(term) ||
      (examen.testBaseId || '').toLowerCase().includes(term) ||
      catalogacionOficial.toLowerCase().includes(term)
    );
  }

  // El examen está catalogado por leyes o temas concretos:
  // Si busca una ley o tema concreto, comprobar que esté en sus etiquetas catalogadas o en su título
  if (leyOTemaBuscado !== null) {
    const leyBuscadaNorm = normalizarNombreLey(leyOTemaBuscado);
    if (leyBuscadaNorm && etiquetasExamen.includes(leyBuscadaNorm)) {
      return true;
    }
  }

  return (
    (examen.titulo || '').toLowerCase().includes(term) ||
    (examen.id || '').toLowerCase().includes(term) ||
    (examen.testBaseId || '').toLowerCase().includes(term) ||
    (examen.contextoCaso || '').toLowerCase().includes(term) ||
    etiquetasExamen.some((l) => l.toLowerCase().includes(term))
  );
}

export interface PreguntaFalladaConsolidada {
  claveNormalizada: string;
  pregunta: PreguntaExamen;
  categoriaId: CategoriaTemarioId;
  leyes: string[];
  vecesFallada: number;
  vecesAcertada: number;
  pendienteSuperar: boolean;
  esEnBlanco: boolean;
  ultimaFechaFallo: string;
  examenOrigenId?: string;
  examenOrigenTitulo: string;
  ultimaRespuestaErronea?: string;
}

export function normalizarClavePregunta(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sáéíóúüñ]/gi, '')
    .trim();
}

const STORAGE_KEY_SUPERADAS = 'c1_preguntas_superadas_v1';

export function obtenerMapaPreguntasSuperadasStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPERADAS);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Registra inmediatamente las respuestas de un test o pregunta individual:
 * - Si el usuario acierta una pregunta, queda marcada como superada (deja de estar como pregunta fallada).
 * - Si el usuario falla una pregunta, se elimina de superadas para que vuelva al circuito de repaso de fallos.
 */
export function registrarRespuestasEnControlFalladas(
  preguntas: PreguntaExamen[],
  respuestasUsuario: Record<number, string>,
  fechaISO?: string
): Record<string, string> {
  const mapaActual = obtenerMapaPreguntasSuperadasStorage();
  const ahora = fechaISO || new Date().toISOString();
  let huboCambio = false;

  preguntas.forEach((preg, idx) => {
    if (!preg || !preg.enunciado || !preg.opciones) return;
    const resp = respuestasUsuario[idx];
    if (!resp) return;
    const opcCorr = preg.opciones.find((o) => o.esCorrecta);
    if (!opcCorr) return;
    const clave = normalizarClavePregunta(preg.enunciado);
    if (!clave) return;

    if (resp === opcCorr.id) {
      mapaActual[clave] = ahora;
      huboCambio = true;
    } else {
      if (mapaActual[clave]) {
        delete mapaActual[clave];
        huboCambio = true;
      }
    }
  });

  if (huboCambio) {
    try {
      localStorage.setItem(STORAGE_KEY_SUPERADAS, JSON.stringify(mapaActual));
    } catch (_) {}
  }
  return mapaActual;
}

/**
 * Extrae y consolida todas las preguntas falladas (y opcionalmente en blanco)
 * a partir del Historial de Pruebas realizadas y del Almacén de Dudas.
 * Cuando una pregunta ha sido acertada en un test posterior, deja automáticamente
 * de estar marcada como pregunta fallada (salvo que `incluirYaSuperadas` sea true).
 */
export function extraerPreguntasFalladasConsolidadas(
  historialPruebas: ExamenCompleto[],
  almacenDudas: ItemAlmacenDuda[],
  incluirBlancos: boolean = false,
  incluirYaSuperadas: boolean = false
): PreguntaFalladaConsolidada[] {
  const mapa = new Map<string, PreguntaFalladaConsolidada>();
  const superadasStorage = obtenerMapaPreguntasSuperadasStorage();
  const ultimoResultadoHistorial = new Map<string, { estado: 'acierto' | 'fallo'; fechaISO: string }>();

  // Crear índice rápido de leyes editadas en el Almacén de Dudas por enunciado normalizado
  const leyesEditadasEnAlmacen = new Map<string, string[]>();
  almacenDudas.forEach((item) => {
    if (item.enunciado && item.leyesRelacionadas && item.leyesRelacionadas.length > 0) {
      const noGen = item.leyesRelacionadas.filter((l) => !esNormaGenerica(l));
      if (noGen.length > 0) {
        leyesEditadasEnAlmacen.set(normalizarClavePregunta(item.enunciado), noGen);
      }
    }
  });

  // Ordenar historial estrictamente del más antiguo al más reciente.
  // Nota: en App.tsx los nuevos exámenes se insertan al principio (índice 0 = más reciente),
  // por lo que ante igual fecha o día desempatamos por índice inverso (mayor índice primero).
  const historialConIndice = historialPruebas
    .map((ex, originalIdx) => ({ ex, originalIdx }))
    .filter(({ ex }) => ex.resultado && ex.preguntas && ex.preguntas.length > 0);

  historialConIndice.sort((a, b) => {
    const fA = a.ex.resultado?.fechaRealizacion || a.ex.fecha || '';
    const fB = b.ex.resultado?.fechaRealizacion || b.ex.fecha || '';
    const diaA = fA.substring(0, 10);
    const diaB = fB.substring(0, 10);
    if (diaA !== diaB) {
      return diaA.localeCompare(diaB);
    }
    if (fA.length > 10 && fB.length > 10 && fA !== fB) {
      return fA.localeCompare(fB);
    }
    // Mayor índice en historialPruebas = más antiguo
    return b.originalIdx - a.originalIdx;
  });

  historialConIndice.forEach(({ ex }) => {
    const respMap = ex.resultado?.respuestasUsuario || {};
    const fechaCompletaEx = ex.resultado?.fechaRealizacion || ex.fecha || new Date().toISOString();
    const fechaEx = fechaCompletaEx.split('T')[0];

    ex.preguntas.forEach((preg, idx) => {
      if (!preg || !preg.enunciado || !preg.opciones || preg.opciones.length < 2) return;
      const clave = normalizarClavePregunta(preg.enunciado);
      if (!clave) return;

      // Sincronizar con leyes editadas en Almacén o en la propia pregunta
      const leyesDeAlmacen = leyesEditadasEnAlmacen.get(clave);
      const leyesEfectivasPregunta =
        preg.leyesRelacionadas && preg.leyesRelacionadas.some((l) => !esNormaGenerica(l))
          ? preg.leyesRelacionadas.filter((l) => !esNormaGenerica(l))
          : leyesDeAlmacen;

      const refConvocatoriaEfectiva = obtenerReferenciaConvocatoriaOficial(preg, ex);
      const pregEnriquecida: PreguntaExamen = {
        ...preg,
        leyesRelacionadas: leyesEfectivasPregunta || preg.leyesRelacionadas,
        convocatoriasAparecida: refConvocatoriaEfectiva || preg.convocatoriasAparecida,
      };
      const normaEfectiva = obtenerNormaEfectivaDePregunta(pregEnriquecida, ex);
      pregEnriquecida.justificacionLegal = {
        ...(pregEnriquecida.justificacionLegal || {
          norma: normaEfectiva,
          articulo: 'Precepto aplicable',
          fundamento: '',
        }),
        norma: normaEfectiva,
      };

      const respU = respMap[idx];
      const opcCorr = preg.opciones.find((o) => o.esCorrecta);
      if (!opcCorr) return;

      const contestada = respU !== undefined && respU !== null && respU !== '';
      const esAcierto = contestada && respU === opcCorr.id;
      const esFallo = contestada && respU !== opcCorr.id;
      const esBlanco = !contestada;

      const existente = mapa.get(clave);

      if (esFallo || (incluirBlancos && esBlanco)) {
        ultimoResultadoHistorial.set(clave, { estado: 'fallo', fechaISO: fechaCompletaEx });
        const catId = clasificarPreguntaEnCategoriaTemario(pregEnriquecida, ex);
        const leyes = obtenerLeyesNormalizadasDePregunta(pregEnriquecida, ex);

        if (existente) {
          existente.vecesFallada += esFallo ? 1 : 0;
          existente.pendienteSuperar = true;
          if (esFallo) existente.esEnBlanco = false;
          existente.ultimaFechaFallo = fechaEx;
          existente.examenOrigenId = ex.id;
          existente.examenOrigenTitulo = ex.titulo;
          if (respU) existente.ultimaRespuestaErronea = respU;
          existente.categoriaId = catId;
          existente.leyes = leyes;
          existente.pregunta = {
            ...pregEnriquecida,
            tematica: catId === 'informatica_c1' ? pregEnriquecida.tematica : catId,
            leyesRelacionadas: leyesEfectivasPregunta && leyesEfectivasPregunta.length > 0 ? leyesEfectivasPregunta : leyes,
          };
        } else {
          mapa.set(clave, {
            claveNormalizada: clave,
            pregunta: {
              ...pregEnriquecida,
              tematica: catId === 'informatica_c1' ? pregEnriquecida.tematica : catId,
              leyesRelacionadas: leyesEfectivasPregunta && leyesEfectivasPregunta.length > 0 ? leyesEfectivasPregunta : leyes,
            },
            categoriaId: catId,
            leyes,
            vecesFallada: esFallo ? 1 : 0,
            vecesAcertada: 0,
            pendienteSuperar: true,
            esEnBlanco: esBlanco && !esFallo,
            ultimaFechaFallo: fechaEx,
            examenOrigenId: ex.id,
            examenOrigenTitulo: ex.titulo,
            ultimaRespuestaErronea: respU || undefined,
          });
        }
      } else if (esAcierto) {
        ultimoResultadoHistorial.set(clave, { estado: 'acierto', fechaISO: fechaCompletaEx });
        if (existente) {
          existente.vecesAcertada += 1;
          existente.pendienteSuperar = false;
          if (leyesEfectivasPregunta && leyesEfectivasPregunta.length > 0) {
            existente.categoriaId = clasificarPreguntaEnCategoriaTemario(pregEnriquecida, ex);
            existente.leyes = obtenerLeyesNormalizadasDePregunta(pregEnriquecida, ex);
            existente.pregunta = {
              ...existente.pregunta,
              justificacionLegal: pregEnriquecida.justificacionLegal,
              leyesRelacionadas: leyesEfectivasPregunta,
            };
          }
        }
      }
    });
  });

  // Incorporar y sincronizar las preguntas guardadas o editadas en el Almacén de Dudas
  almacenDudas.forEach((item) => {
    const esPreguntaAlmacen =
      (item.tipo === 'pregunta_relevante' || item.tipo === 'fallada' || item.tipo === 'duda') &&
      item.opciones &&
      item.opciones.length >= 2;
    if (!esPreguntaAlmacen) return;

    const clave = normalizarClavePregunta(item.enunciado);
    if (!clave) return;

    const leyesItemNoGen = (item.leyesRelacionadas || []).filter((l) => !esNormaGenerica(l));

    const pregConstruida: PreguntaExamen = {
      id: item.preguntaId || Math.floor(Math.random() * 90000) + 10000,
      enunciado: item.enunciado,
      opciones: item.opciones!,
      justificacionLegal: item.justificacionLegal || {
        norma: leyesItemNoGen[0] || 'Normativa Oficial BOE',
        articulo: 'Artículo aplicable',
        fundamento: item.comentarioUsuario || 'Revisión de pregunta en Almacén.',
      },
      ejemploPractico: item.ejemploPractico,
      reglaMnemotecnica: item.reglaMnemotecnica,
      analisisDistractores: item.analisisDistractores,
      convocatoriasAparecida: item.convocatoriasAparecida,
      leyesRelacionadas: leyesItemNoGen.length > 0 ? leyesItemNoGen : item.leyesRelacionadas,
    };

    const normaEfectiva = obtenerNormaEfectivaDePregunta(pregConstruida, { titulo: item.examenTitulo });
    pregConstruida.justificacionLegal = {
      ...pregConstruida.justificacionLegal,
      norma: normaEfectiva,
    };

    const catId = clasificarPreguntaEnCategoriaTemario(pregConstruida, { titulo: item.examenTitulo });
    const leyes = obtenerLeyesNormalizadasDePregunta(pregConstruida, { titulo: item.examenTitulo });
    const fechaItem = (item.fechaCreacion || new Date().toISOString()).split('T')[0];

    const existente = mapa.get(clave);
    const ultimoHist = ultimoResultadoHistorial.get(clave);
    const yaSuperadaEnTest = ultimoHist?.estado === 'acierto' || Boolean(superadasStorage[clave]);

    if (existente) {
      if (leyesItemNoGen.length > 0 || leyes.length > 0) {
        existente.categoriaId = catId;
        existente.leyes = leyes;
        existente.pregunta = {
          ...existente.pregunta,
          justificacionLegal: {
            ...existente.pregunta.justificacionLegal,
            norma: normaEfectiva,
          },
          leyesRelacionadas: leyesItemNoGen.length > 0 ? leyesItemNoGen : leyes,
        };
      }
      if (item.resuelta || yaSuperadaEnTest) {
        existente.pendienteSuperar = false;
      }
    } else if (!yaSuperadaEnTest && !item.resuelta) {
      const fueFallada =
        Boolean(item.esFallada) ||
        item.tipo === 'fallada' ||
        Boolean(item.respuestaUsuario && item.respuestaCorrecta && item.respuestaUsuario !== item.respuestaCorrecta);

      if (fueFallada) {
        mapa.set(clave, {
          claveNormalizada: clave,
          pregunta: {
            ...pregConstruida,
            leyesRelacionadas: leyesItemNoGen.length > 0 ? leyesItemNoGen : leyes,
          },
          categoriaId: catId,
          leyes,
          vecesFallada: 1,
          vecesAcertada: 0,
          pendienteSuperar: true,
          esEnBlanco: false,
          ultimaFechaFallo: fechaItem,
          examenOrigenId: item.examenId,
          examenOrigenTitulo: item.examenTitulo || 'Almacén de Preguntas Relevantes',
          ultimaRespuestaErronea: item.respuestaUsuario,
        });
      }
    }
  });

  // Si una pregunta consta en el registro de preguntas superadas en un test más reciente que su último fallo,
  // asegurar que pendienteSuperar sea false
  mapa.forEach((item, clave) => {
    const fechaSuperada = superadasStorage[clave];
    const ultimoHist = ultimoResultadoHistorial.get(clave);
    if (ultimoHist?.estado === 'acierto') {
      item.pendienteSuperar = false;
    } else if (fechaSuperada) {
      const fechaUltimoFallo = ultimoHist?.fechaISO || item.ultimaFechaFallo || '';
      if (!fechaUltimoFallo || fechaSuperada >= fechaUltimoFallo) {
        item.pendienteSuperar = false;
      }
    }
  });

  const listaConsolidada = Array.from(mapa.values());
  const filtrada = incluirYaSuperadas
    ? listaConsolidada
    : listaConsolidada.filter((item) => item.pendienteSuperar);

  return filtrada.sort((a, b) => {
    if (b.vecesFallada !== a.vecesFallada) return b.vecesFallada - a.vecesFallada;
    return b.ultimaFechaFallo.localeCompare(a.ultimaFechaFallo);
  });
}
