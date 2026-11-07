/**
 * Catálogo completo y oficial de:
 * 1. Legislación Oficial para C1 AGE y CAM (Bloques I, II, III, IV y Normativa Autonómica)
 * 2. Temario Oficial de Informática Básica y Ofimática ajustado a las convocatorias:
 *    - Los 8 temas oficiales de la AGE (Bloque VI - C1 Administrativo / C2 Auxiliar)
 *    - Los 2 temas adicionales que incluye la Comunidad de Madrid (CAM)
 */

import { PreguntaExamen } from '../types';

export interface ItemNormativaOTemario {
  id: string;
  nombre: string;
  sigla: string;
  tipo: 'prueba_oficial' | 'legislacion_age' | 'informatica_c1';
  grupo: string;
  descripcionBreve: string;
  urlBOE?: string;
  idBOE?: string;
  numeroTemaInformatica?: number; // 1..8 (AGE) | 9..10 (CAM)
  ambitoConvocatoria?: 'AGE' | 'CAM' | 'AMBOS';
}

export const CATALOGO_LEGISLACION_C1_AGE: ItemNormativaOTemario[] = [
  // BLOQUE I: Organización del Estado y Administración Pública
  {
    id: 'ce-1978',
    nombre: 'Constitución Española de 1978',
    sigla: 'CE 1978',
    tipo: 'legislacion_age',
    grupo: 'Organización del Estado',
    descripcionBreve: 'Derechos fundamentales, Corona, Cortes Generales, Gobierno, Poder Judicial y organización territorial.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229',
    idBOE: 'BOE-A-1978-31229',
  },
  {
    id: 'ley-50-1997',
    nombre: 'Ley 50/1997, de 27 de noviembre, del Gobierno',
    sigla: 'Ley 50/1997 (Gobierno)',
    tipo: 'legislacion_age',
    grupo: 'Organización del Estado',
    descripcionBreve: 'Órganos del Gobierno, Presidente, Ministros, Comisión General de Secretarios de Estado y Subsecretarios, potestad reglamentaria.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1997-25336',
    idBOE: 'BOE-A-1997-25336',
  },
  {
    id: 'ley-40-2015',
    nombre: 'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (LRJSP)',
    sigla: 'Ley 40/2015 (LRJSP)',
    tipo: 'legislacion_age',
    grupo: 'Régimen Jurídico y Sector Público',
    descripcionBreve: 'Principios generales, órganos administrativos, abstención y recusación, convenios, relaciones interadministrativas y responsabilidad patrimonial.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566',
    idBOE: 'BOE-A-2015-10566',
  },
  {
    id: 'ley-19-2013',
    nombre: 'Ley 19/2013, de 9 de diciembre, de transparencia, acceso a la información pública y buen gobierno',
    sigla: 'Ley 19/2013 (Transparencia)',
    tipo: 'legislacion_age',
    grupo: 'Transparencia y Buen Gobierno',
    descripcionBreve: 'Publicidad activa, ejercicio del derecho de acceso, límites, reclamaciones y Consejo de Transparencia.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887',
    idBOE: 'BOE-A-2013-12887',
  },
  {
    id: 'lopdgdd-3-2018',
    nombre: 'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)',
    sigla: 'LO 3/2018 (LOPDGDD)',
    tipo: 'legislacion_age',
    grupo: 'Protección de Datos',
    descripcionBreve: 'Principios de protección de datos, derechos de los afectados, Delegado de Protección de Datos, régimen sancionador y derechos digitales.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673',
    idBOE: 'BOE-A-2018-16673',
  },
  {
    id: 'rgpd-2016-679',
    nombre: 'Reglamento (UE) 2016/679 General de Protección de Datos (RGPD)',
    sigla: 'RGPD UE 2016/679',
    tipo: 'legislacion_age',
    grupo: 'Protección de Datos',
    descripcionBreve: 'Marco europeo de protección de datos personales, consentimiento, responsabilidad proactiva y transferencias internacionales.',
  },
  {
    id: 'lo-igualdad-3-2007',
    nombre: 'Ley Orgánica 3/2007, de 22 de marzo, para la igualdad efectiva de mujeres y hombres',
    sigla: 'LO 3/2007 (Igualdad)',
    tipo: 'legislacion_age',
    grupo: 'Igualdad y Políticas Sociales',
    descripcionBreve: 'Principio de igualdad y tutela contra la discriminación, planes de igualdad en la AGE, distintivo empresarial y medidas de conciliación.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-6115',
    idBOE: 'BOE-A-2007-6115',
  },
  {
    id: 'lo-violencia-genero-1-2004',
    nombre: 'Ley Orgánica 1/2004, de 28 de diciembre, de Medidas de Protección Integral contra la Violencia de Género',
    sigla: 'LO 1/2004 (Violencia de Género)',
    tipo: 'legislacion_age',
    grupo: 'Igualdad y Políticas Sociales',
    descripcionBreve: 'Medidas de sensibilización, prevención y derechos de las víctimas funcionarias.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2004-21760',
    idBOE: 'BOE-A-2004-21760',
  },
  {
    id: 'lo-defensor-pueblo',
    nombre: 'Ley Orgánica 3/1981, de 6 de abril, del Defensor del Pueblo',
    sigla: 'LO 3/1981 (Defensor del Pueblo)',
    tipo: 'legislacion_age',
    grupo: 'Organización del Estado',
    descripcionBreve: 'Elección, estatuto, competencias inspectoras e informes a las Cortes Generales.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1981-10325',
    idBOE: 'BOE-A-1981-10325',
  },
  {
    id: 'lo-tribunal-constitucional',
    nombre: 'Ley Orgánica 2/1979, de 3 de octubre, del Tribunal Constitucional (LOTC)',
    sigla: 'LOTC (LO 2/1979)',
    tipo: 'legislacion_age',
    grupo: 'Organización del Estado',
    descripcionBreve: 'Composición, recurso y cuestión de inconstitucionalidad, recurso de amparo y conflictos de competencias.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1979-23709',
    idBOE: 'BOE-A-1979-23709',
  },
  {
    id: 'lo-poder-judicial',
    nombre: 'Ley Orgánica 6/1985, de 1 de julio, del Poder Judicial (LOPJ)',
    sigla: 'LOPJ (LO 6/1985)',
    tipo: 'legislacion_age',
    grupo: 'Organización del Estado',
    descripcionBreve: 'Estructura jurisdiccional, CGPJ, juzgados y tribunales, carrera judicial y garantías de independencia.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-12666',
    idBOE: 'BOE-A-1985-12666',
  },

  // BLOQUE II: Procedimiento Administrativo y Régimen Jurídico
  {
    id: 'lpacap-39-2015',
    nombre: 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas (LPACAP)',
    sigla: 'Ley 39/2015 (LPACAP)',
    tipo: 'legislacion_age',
    grupo: 'Procedimiento Administrativo',
    descripcionBreve: 'Interesados, actividad de las AAPP, actos administrativos, plazos, cómputos, notificaciones, silencio, recursos y ejecución forzosa.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565',
    idBOE: 'BOE-A-2015-10565',
  },
  {
    id: 'rd-203-2021',
    nombre: 'Real Decreto 203/2021, de 30 de marzo: Reglamento de actuación del sector público por medios electrónicos',
    sigla: 'Real Decreto 203/2021',
    tipo: 'legislacion_age',
    grupo: 'Administración Electrónica',
    descripcionBreve: 'Sede electrónica, portal de internet, identificación y firma, registro electrónico general, notificaciones electrónicas y expediente digital.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-5032',
    idBOE: 'BOE-A-2021-5032',
  },
  {
    id: 'rd-311-2022-ens',
    nombre: 'Real Decreto 311/2022, de 3 de mayo: Esquema Nacional de Seguridad (ENS)',
    sigla: 'Real Decreto 311/2022 (ENS)',
    tipo: 'legislacion_age',
    grupo: 'Administración Electrónica',
    descripcionBreve: 'Principios básicos, requisitos mínimos de seguridad, categorización de sistemas (BÁSICA, MEDIA, ALTA) y medidas de protección.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191',
    idBOE: 'BOE-A-2022-7191',
  },
  {
    id: 'rd-4-2010-eni',
    nombre: 'Real Decreto 4/2010, de 8 de enero: Esquema Nacional de Interoperabilidad (ENI)',
    sigla: 'Real Decreto 4/2010 (ENI)',
    tipo: 'legislacion_age',
    grupo: 'Administración Electrónica',
    descripcionBreve: 'Interoperabilidad técnica, semántica y organizativa, documento y expediente electrónico, normas técnicas de interoperabilidad (NTI).',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-1331',
    idBOE: 'BOE-A-2010-1331',
  },
  {
    id: 'ley-6-2020-confianza',
    nombre: 'Ley 6/2020, de 11 de noviembre, reguladora de determinados aspectos de los servicios electrónicos de confianza',
    sigla: 'Ley 6/2020 (Firma y Confianza)',
    tipo: 'legislacion_age',
    grupo: 'Administración Electrónica',
    descripcionBreve: 'Firma electrónica, sellos electrónicos, sellos de tiempo, prestadores cualificados y DNI electrónico.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2020-14046',
    idBOE: 'BOE-A-2020-14046',
  },
  {
    id: 'rd-938-2005-ciudadano',
    nombre: 'Real Decreto 938/2005, de 29 de julio: Información Administrativa y Atención al Ciudadano',
    sigla: 'Real Decreto 938/2005',
    tipo: 'legislacion_age',
    grupo: 'Procedimiento Administrativo',
    descripcionBreve: 'Información general y particular, libro de quejas y sugerencias, oficinas de atención e información de la AGE.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2005-14478',
    idBOE: 'BOE-A-2005-14478',
  },
  {
    id: 'ljca-29-1998',
    nombre: 'Ley 29/1998, de 13 de julio, reguladora de la Jurisdicción Contencioso-administrativa (LJCA)',
    sigla: 'LJCA (Ley 29/1998)',
    tipo: 'legislacion_age',
    grupo: 'Procedimiento Administrativo',
    descripcionBreve: 'Recurso contencioso-administrativo, legitimación, plazos de interposición, procedimiento ordinario y abreviado, medidas cautelares.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1998-16801',
    idBOE: 'BOE-A-1998-16801',
  },

  // BLOQUE III: Gestión de Personal / Empleo Público
  {
    id: 'trebep-5-2015',
    nombre: 'Real Decreto Legislativo 5/2015: Texto Refundido de la Ley del Estatuto Básico del Empleado Público (TREBEP)',
    sigla: 'TREBEP (RDL 5/2015)',
    tipo: 'legislacion_age',
    grupo: 'Personal y Función Pública',
    descripcionBreve: 'Clases de personal, derechos, deberes, código de conducta, carrera profesional, evaluación del desempeño, retribuciones y régimen disciplinario.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719',
    idBOE: 'BOE-A-2015-11719',
  },
  {
    id: 'rd-364-1995',
    nombre: 'Real Decreto 364/1995, de 10 de marzo: Reglamento General de Ingreso y Provisión de Puestos de Trabajo de la AGE',
    sigla: 'Real Decreto 364/1995',
    tipo: 'legislacion_age',
    grupo: 'Personal y Función Pública',
    descripcionBreve: 'Oferta de empleo público, procesos selectivos, concurso ordinario y específico, libre designación, comisiones de servicio y remoción.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729',
    idBOE: 'BOE-A-1995-8729',
  },
  {
    id: 'rd-365-1995',
    nombre: 'Real Decreto 365/1995, de 10 de marzo: Reglamento de Situaciones Administrativas de los Funcionarios Civiles de la AGE',
    sigla: 'Real Decreto 365/1995',
    tipo: 'legislacion_age',
    grupo: 'Personal y Función Pública',
    descripcionBreve: 'Servicio activo, servicios especiales, servicio en otras Administraciones Públicas, excedencia voluntaria, forzosa y suspensión de funciones.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451',
    idBOE: 'BOE-A-1995-7451',
  },
  {
    id: 'rd-33-1986-disciplinario',
    nombre: 'Real Decreto 33/1986, de 10 de enero: Reglamento de Régimen Disciplinario de los Funcionarios de la AGE',
    sigla: 'Real Decreto 33/1986',
    tipo: 'legislacion_age',
    grupo: 'Personal y Función Pública',
    descripcionBreve: 'Faltas muy graves, graves y leves, sanciones, prescripción y procedimiento sancionador disciplinario.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1986-1349',
    idBOE: 'BOE-A-1986-1349',
  },
  {
    id: 'ley-53-1984-incompatibilidades',
    nombre: 'Ley 53/1984, de 26 de diciembre, de Incompatibilidades del Personal al Servicio de las Administraciones Públicas',
    sigla: 'Ley 53/1984 (Incompatibilidades)',
    tipo: 'legislacion_age',
    grupo: 'Personal y Función Pública',
    descripcionBreve: 'Régimen de incompatibilidades en el sector público, actividades privadas prohibidas y procedimiento de autorización.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-30',
    idBOE: 'BOE-A-1985-30',
  },
  {
    id: 'clases-pasivas-670-1987',
    nombre: 'Real Decreto Legislativo 670/1987: Texto Refundido de la Ley de Clases Pasivas del Estado',
    sigla: 'RDL 670/1987 (Clases Pasivas)',
    tipo: 'legislacion_age',
    grupo: 'Seguridad Social y Clases Pasivas',
    descripcionBreve: 'Pensiones de jubilación de funcionarios públicos, haberes reguladores, años de servicio y pensiones extraordinarias.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1987-10212',
    idBOE: 'BOE-A-1987-10212',
  },
  {
    id: 'lgss-8-2015',
    nombre: 'Real Decreto Legislativo 8/2015: Texto Refundido de la Ley General de la Seguridad Social (LGSS)',
    sigla: 'LGSS (RDL 8/2015)',
    tipo: 'legislacion_age',
    grupo: 'Seguridad Social y Clases Pasivas',
    descripcionBreve: 'Régimen General, afiliación, cotización, incapacidad temporal, maternidad/paternidad y jubilación.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724',
    idBOE: 'BOE-A-2015-11724',
  },
  {
    id: 'prl-31-1995',
    nombre: 'Ley 31/1995, de 8 de noviembre, de Prevención de Riesgos Laborales (LPRL)',
    sigla: 'Ley 31/1995 (LPRL)',
    tipo: 'legislacion_age',
    grupo: 'Personal y Función Pública',
    descripcionBreve: 'Derecho a la protección eficaz, evaluación de riesgos, servicios de prevención y delegados de prevención.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-24290',
    idBOE: 'BOE-A-1995-24290',
  },

  // BLOQUE IV: Gestión Financiera y Contratación Pública
  {
    id: 'lcsp-9-2017',
    nombre: 'Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP)',
    sigla: 'Ley 9/2017 (LCSP)',
    tipo: 'legislacion_age',
    grupo: 'Contratación del Sector Público',
    descripcionBreve: 'Tipos de contratos (obras, suministros, servicios), contratos menores, procedimiento abierto y simplificado, solvencia, pliegos y modificación.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902',
    idBOE: 'BOE-A-2017-12902',
  },
  {
    id: 'lgp-47-2003',
    nombre: 'Ley 47/2003, de 26 de noviembre, General Presupuestaria (LGP)',
    sigla: 'Ley 47/2003 (LGP)',
    tipo: 'legislacion_age',
    grupo: 'Presupuesto y Hacienda Pública',
    descripcionBreve: 'Estructura presupuestaria, créditos iniciales, fases de gasto (A, D, O, P), modificaciones presupuestarias (transferencias, créditos extraordinarios, incorporaciones) y control IGAE.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21618',
    idBOE: 'BOE-A-2003-21618',
  },
  {
    id: 'loepsf-2-2012',
    nombre: 'Ley Orgánica 2/2012, de 27 de abril, de Estabilidad Presupuestaria y Sostenibilidad Financiera (LOEPSF)',
    sigla: 'LO 2/2012 (Estabilidad Presupuestaria)',
    tipo: 'legislacion_age',
    grupo: 'Presupuesto y Hacienda Pública',
    descripcionBreve: 'Principios de estabilidad presupuestaria, sostenibilidad financiera, regla de gasto, límites de déficit y deuda pública, planes económico-financieros y transparencia.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-5730',
    idBOE: 'BOE-A-2012-5730',
  },
  {
    id: 'lgs-38-2003-subvenciones',
    nombre: 'Ley 38/2003, de 17 de noviembre, General de Subvenciones (LGS)',
    sigla: 'Ley 38/2003 (Subvenciones)',
    tipo: 'legislacion_age',
    grupo: 'Presupuesto y Hacienda Pública',
    descripcionBreve: 'Plan estratégico de subvenciones, procedimiento de concesión (concurrencia y concesión directa), justificación y reintegro.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-20977',
    idBOE: 'BOE-A-2003-20977',
  },
  {
    id: 'rd-887-2006-reglamento-subvenciones',
    nombre: 'Real Decreto 887/2006, de 21 de julio: Reglamento de la Ley General de Subvenciones',
    sigla: 'Real Decreto 887/2006',
    tipo: 'legislacion_age',
    grupo: 'Presupuesto y Hacienda Pública',
    descripcionBreve: 'Desarrollo reglamentario de bases reguladoras, convocatorias, justificación económica y cuentas justificativas.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-13437',
    idBOE: 'BOE-A-2006-13437',
  },
  {
    id: 'rd-2188-1995-control-igae',
    nombre: 'Real Decreto 2188/1995: Régimen de control interno ejercido por la Intervención General de la Administración del Estado (IGAE)',
    sigla: 'Real Decreto 2188/1995 (IGAE)',
    tipo: 'legislacion_age',
    grupo: 'Presupuesto y Hacienda Pública',
    descripcionBreve: 'Función interventora (fiscalización previa, intervención material), control financiero permanente y auditoría pública.',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1996-1594',
    idBOE: 'BOE-A-1996-1594',
  },
];

/**
 * LOS 8 TEMAS OFICIALES DE INFORMÁTICA BÁSICA Y OFIMÁTICA DE LA AGE
 * (Bloque VI de las convocatorias de la Administración General del Estado y comunes a la CAM)
 */
export const TEMAS_INFORMATICA_8_AGE: ItemNormativaOTemario[] = [
  {
    id: 'tema-1-informatica-basica',
    numeroTemaInformatica: 1,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 1 (AGE): Informática básica: conceptos fundamentales sobre el hardware y el software. Sistemas de almacenamiento de datos. Sistemas operativos. Nociones básicas de seguridad informática',
    sigla: 'Tema 1 (AGE) · Informática básica',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'Conceptos fundamentales sobre el hardware y el software. Sistemas de almacenamiento de datos. Sistemas operativos. Nociones básicas de seguridad informática.',
  },
  {
    id: 'tema-2-entorno-windows',
    numeroTemaInformatica: 2,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows. Fundamentos. Trabajo en el entorno gráfico de Windows: ventanas, iconos, menús contextuales, cuadros de diálogo. El escritorio y sus elementos. El menú inicio. Cortana',
    sigla: 'Tema 2 (AGE) · Entorno Windows',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'Introducción al sistema operativo: el entorno Windows. Fundamentos. Trabajo en el entorno gráfico: ventanas, iconos, menús contextuales, cuadros de diálogo, escritorio, menú inicio y Cortana.',
  },
  {
    id: 'tema-3-explorador-windows',
    numeroTemaInformatica: 3,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 3 (AGE): El explorador de Windows. Gestión de carpetas y archivos. Operaciones de búsqueda. Herramientas «Este equipo» y «Acceso rápido». Accesorios. Herramientas del sistema',
    sigla: 'Tema 3 (AGE) · Explorador de Windows',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'El explorador de Windows. Gestión de carpetas y archivos. Operaciones de búsqueda. Herramientas «Este equipo» y «Acceso rápido». Accesorios y herramientas del sistema.',
  },
  {
    id: 'tema-4-word-365',
    numeroTemaInformatica: 4,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 4 (AGE): Procesadores de texto: Word 365. Principales funciones y utilidades. Creación y estructuración del documento. Gestión, grabación, recuperación e impresión de ficheros. Personalización del entorno de trabajo',
    sigla: 'Tema 4 (AGE) · Procesadores de texto: Word 365',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'Procesadores de texto: Word 365. Principales funciones y utilidades. Creación y estructuración del documento. Gestión, grabación, recuperación e impresión de ficheros. Personalización del entorno de trabajo.',
  },
  {
    id: 'tema-5-excel-365',
    numeroTemaInformatica: 5,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 5 (AGE): Hojas de cálculo: Excel 365. Principales funciones y utilidades. Libros, hojas y celdas. Configuración. Introducción y edición de datos. Fórmulas y funciones. Gráficos. Gestión de datos. Personalización del entorno de trabajo',
    sigla: 'Tema 5 (AGE) · Hojas de cálculo: Excel 365',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'Hojas de cálculo: Excel 365. Principales funciones y utilidades. Libros, hojas y celdas. Configuración. Introducción y edición de datos. Fórmulas y funciones. Gráficos. Gestión de datos.',
  },
  {
    id: 'tema-6-access-365',
    numeroTemaInformatica: 6,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 6 (AGE): Bases de datos: Access 365. Principales funciones y utilidades. Tablas. Consultas. Formularios. Informes. Relaciones. Importación, vinculación y exportación de datos',
    sigla: 'Tema 6 (AGE) · Bases de datos: Access 365',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'Bases de datos: Access 365. Principales funciones y utilidades. Tablas. Consultas. Formularios. Informes. Relaciones. Importación, vinculación y exportación de datos.',
  },
  {
    id: 'tema-7-outlook-365',
    numeroTemaInformatica: 7,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 7 (AGE): Correo electrónico: Outlook 365. Conceptos elementales y funcionamiento. El entorno de trabajo. Enviar, recibir, responder y reenviar mensajes. Creación de mensajes. Reglas de mensaje. Libreta de direcciones',
    sigla: 'Tema 7 (AGE) · Correo electrónico: Outlook 365',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'Correo electrónico: Outlook 365. Conceptos elementales y funcionamiento. El entorno de trabajo. Enviar, recibir, responder y reenviar mensajes. Creación de mensajes. Reglas de mensaje. Libreta de direcciones.',
  },
  {
    id: 'tema-8-red-internet',
    numeroTemaInformatica: 8,
    ambitoConvocatoria: 'AGE',
    nombre:
      'Tema 8 (AGE): La Red Internet: origen, evolución y estado actual. Conceptos elementales sobre protocolos y servicios en Internet. Funcionalidades básicas de los navegadores web',
    sigla: 'Tema 8 (AGE) · La Red Internet',
    tipo: 'informatica_c1',
    grupo: '8 Temas Oficiales Convocatoria AGE',
    descripcionBreve:
      'La Red Internet: origen, evolución y estado actual. Conceptos elementales sobre protocolos y servicios en Internet. Funcionalidades básicas de los navegadores web.',
  },
];

/**
 * LOS 2 TEMAS ADICIONALES DE INFORMÁTICA Y OFIMÁTICA QUE INCLUYE LA COMUNIDAD DE MADRID (CAM)
 */
export const TEMAS_INFORMATICA_2_ADICIONALES_CAM: ItemNormativaOTemario[] = [
  {
    id: 'tema-9-cam-power-bi',
    numeroTemaInformatica: 9,
    ambitoConvocatoria: 'CAM',
    nombre:
      'Tema 9 (Adicional CAM): Power BI. Principales funciones y utilidades. Conexión a orígenes de datos, transformación (Power Query), modelado de datos, medidas DAX, informes y visualización de datos',
    sigla: 'Tema 9 (CAM) · Power BI',
    tipo: 'informatica_c1',
    grupo: '2 Temas Adicionales Convocatoria CAM',
    descripcionBreve:
      'Power BI en las convocatorias de la Comunidad de Madrid: principales funciones y utilidades, conexión y transformación de datos (Power Query), modelado relacional, fórmulas DAX, informes y cuadros de mando.',
  },
  {
    id: 'tema-10-cam-trabajo-colaborativo',
    numeroTemaInformatica: 10,
    ambitoConvocatoria: 'CAM',
    nombre:
      'Tema 10 (Adicional CAM): Trabajo colaborativo: herramientas y funcionalidades. Microsoft 365: Teams, SharePoint, OneDrive y Outlook. Videoconferencias',
    sigla: 'Tema 10 (CAM) · Trabajo colaborativo 365 (Teams, SharePoint, OneDrive)',
    tipo: 'informatica_c1',
    grupo: '2 Temas Adicionales Convocatoria CAM',
    descripcionBreve:
      'Trabajo colaborativo en las convocatorias de la Comunidad de Madrid: herramientas y funcionalidades de Microsoft 365 (Teams, SharePoint, OneDrive y Outlook), coautoría en la nube y videoconferencias.',
  },
];

/**
 * Catálogo unificado de los 10 temas oficiales de Informática (8 de la AGE + 2 adicionales de la CAM)
 */
export const CATALOGO_INFORMATICA_C1_AGE: ItemNormativaOTemario[] = [
  ...TEMAS_INFORMATICA_8_AGE,
  ...TEMAS_INFORMATICA_2_ADICIONALES_CAM,
];

/**
 * Catálogo de Pruebas Oficiales Globales (Test oficial / Supuesto oficial)
 * para catalogar exámenes completos de convocatoria y separarlos de la búsqueda por leyes o temas concretos.
 */
export const CATALOGO_PRUEBAS_OFICIALES_C1: ItemNormativaOTemario[] = [
  {
    id: 'cat-test-oficial',
    nombre: 'Test oficial',
    sigla: 'Test oficial',
    tipo: 'prueba_oficial',
    grupo: 'Convocatoria Oficial Global',
    ambitoConvocatoria: 'AMBOS',
    descripcionBreve:
      'Cataloga el examen exclusivamente como Test oficial general. El buscador y los filtros por ley o tema no lo mezclarán al buscar por leyes o temas concretos, y viceversa.',
  },
  {
    id: 'cat-supuesto-oficial',
    nombre: 'Supuesto oficial',
    sigla: 'Supuesto oficial',
    tipo: 'prueba_oficial',
    grupo: 'Convocatoria Oficial Global',
    ambitoConvocatoria: 'AMBOS',
    descripcionBreve:
      'Cataloga el examen exclusivamente como Supuesto práctico oficial. El buscador y los filtros por ley o tema no lo mezclarán al buscar por leyes o temas concretos, y viceversa.',
  },
];

/**
 * Catálogo consolidado completo para selección múltiple
 */
export const CATALOGO_COMPLETO_LEGISLACION_E_INFORMATICA: ItemNormativaOTemario[] = [
  ...CATALOGO_PRUEBAS_OFICIALES_C1,
  ...CATALOGO_LEGISLACION_C1_AGE,
  ...CATALOGO_INFORMATICA_C1_AGE,
];

/**
 * Grupos temáticos organizados para el selector modal de catalogación
 */
export const GRUPOS_CATALOGO_C1 = [
  {
    tipo: 'prueba_oficial' as const,
    titulo: 'Catalogación de Pruebas Oficiales Globales (Test oficial y Supuesto oficial · Separados de Leyes/Temas)',
    icono: 'fa-landmark-flag',
    items: CATALOGO_PRUEBAS_OFICIALES_C1,
  },
  {
    tipo: 'legislacion_age' as const,
    titulo: 'Legislación Oficial C1 (Constitución, Procedimiento, Personal, Contratos, Presupuestos y CAM)',
    icono: 'fa-scale-balanced',
    items: CATALOGO_LEGISLACION_C1_AGE,
  },
  {
    tipo: 'informatica_c1' as const,
    titulo: 'Temario Oficial de Informática: 8 Temas Convocatoria AGE + 2 Temas Adicionales CAM',
    icono: 'fa-laptop-code',
    items: CATALOGO_INFORMATICA_C1_AGE,
  },
];

/**
 * Banco de preguntas oficiales de Informática estructurado en los 8 temas de la AGE + 2 temas adicionales de la CAM,
 * garantizando que todas las catalogaciones de tests, preguntas y simulacros dispongan de preguntas en los 10 temas.
 */
export const PREGUNTAS_OFICIALES_INFORMATICA_10_TEMAS: PreguntaExamen[] = [
  // TEMA 1 (AGE): Informática básica (Hardware, Software, Almacenamiento, SO y Seguridad)
  {
    id: 9001,
    enunciado:
      'En relación con la arquitectura de ordenadores y los conceptos fundamentales de hardware (Tema 1 AGE), ¿cuál de los siguientes elementos de la CPU se encarga específicamente de realizar las operaciones aritméticas (suma, resta) y las operaciones lógicas (AND, OR, NOT)?',
    opciones: [
      {
        id: 'A',
        texto: 'La Unidad Aritmético-Lógica (ALU).',
        esCorrecta: true,
        explicacion:
          'La ALU (Arithmetic Logic Unit) es el circuito digital dentro del microprocesador encargado de ejecutar todas las operaciones aritméticas y booleanas.',
      },
      {
        id: 'B',
        texto: 'La Unidad de Control (UC).',
        esCorrecta: false,
        explicacion:
          'La Unidad de Control busca las instrucciones en memoria principal, las decodifica y coordina al resto de componentes mediante señales de control.',
      },
      {
        id: 'C',
        texto: 'El Registro Contador de Programa (PC).',
        esCorrecta: false,
        explicacion:
          'El Contador de Programa almacena únicamente la dirección de memoria de la siguiente instrucción que va a ser ejecutada.',
      },
      {
        id: 'D',
        texto: 'El Bus de Direcciones de la placa base.',
        esCorrecta: false,
        explicacion:
          'El bus de direcciones es un canal de comunicación unidireccional para indicar posiciones de memoria, no una unidad de cálculo.',
      },
    ],
    leyesRelacionadas: ['Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)'],
    justificacionLegal: {
      norma: 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)',
      articulo: 'Tema 1 · Hardware, Almacenamiento y Seguridad',
      fundamento:
        'En la arquitectura de Von Neumann, la CPU se compone de la Unidad de Control (UC), la Unidad Aritmético-Lógica (ALU) y los registros internos.',
    },
  },
  {
    id: 9002,
    enunciado:
      'Dentro de las nociones básicas de seguridad informática y sistemas de almacenamiento (Tema 1 AGE), ¿qué tipo de copia de seguridad (backup) copia únicamente los archivos que han cambiado desde la última copia de seguridad de cualquier tipo (completa o incremental) y desmarca el bit de modificado?',
    opciones: [
      {
        id: 'A',
        texto: 'Copia de seguridad incremental.',
        esCorrecta: true,
        explicacion:
          'La copia incremental respalda solo los archivos creados o modificados desde el último backup (completo o incremental) y limpia el atributo de archivo (archive bit).',
      },
      {
        id: 'B',
        texto: 'Copia de seguridad diferencial.',
        esCorrecta: false,
        explicacion:
          'La copia diferencial respalda los archivos modificados desde la última copia completa y NO desmarca el bit de archivo modificado.',
      },
      {
        id: 'C',
        texto: 'Copia de seguridad espejo (Mirror).',
        esCorrecta: false,
        explicacion:
          'La copia espejo replica exactamente el origen sin compresión y elimina en el destino los ficheros borrados en origen.',
      },
      {
        id: 'D',
        texto: 'Copia de seguridad volátil en memoria caché L1.',
        esCorrecta: false,
        explicacion:
          'La memoria caché L1 es memoria SRAM volátil del procesador, no un sistema de copia de seguridad.',
      },
    ],
    leyesRelacionadas: ['Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)'],
    justificacionLegal: {
      norma: 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)',
      articulo: 'Tema 1 · Sistemas de almacenamiento y Seguridad informática',
      fundamento:
        'La copia incremental copia los datos modificados desde el último backup completo o incremental y desactiva el bit de archivo modificado, siendo más rápida de crear pero requiriendo toda la cadena para restaurar.',
    },
  },

  // TEMA 2 (AGE): Introducción al sistema operativo: el entorno Windows
  {
    id: 9003,
    enunciado:
      'En el entorno gráfico del sistema operativo Windows (Tema 2 AGE), ¿qué combinación de teclas permite mostrar inmediatamente el Escritorio minimizando todas las ventanas abiertas y, al volver a pulsarla, restaurar las ventanas a su posición anterior?',
    opciones: [
      {
        id: 'A',
        texto: 'Tecla del logotipo de Windows + D.',
        esCorrecta: true,
        explicacion:
          'El atajo Windows + D muestra y oculta el escritorio de forma conmutada (toggle), permitiendo restaurar las ventanas al volver a pulsarlo.',
      },
      {
        id: 'B',
        texto: 'Tecla del logotipo de Windows + M.',
        esCorrecta: false,
        explicacion:
          'Windows + M minimiza todas las ventanas, pero al volver a pulsar Windows + M no las restaura (requeriría Windows + Mayús + M).',
      },
      {
        id: 'C',
        texto: 'Tecla del logotipo de Windows + L.',
        esCorrecta: false,
        explicacion:
          'Windows + L bloquea la sesión del equipo o cambia de cuenta de usuario.',
      },
      {
        id: 'D',
        texto: 'Alt + F4.',
        esCorrecta: false,
        explicacion:
          'Alt + F4 cierra la ventana o aplicación activa.',
      },
    ],
    leyesRelacionadas: ['Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows'],
    justificacionLegal: {
      norma: 'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows',
      articulo: 'Tema 2 · Entorno gráfico de Windows, Escritorio y Ventanas',
      fundamento:
        'El atajo oficial Windows + D alterna entre mostrar el Escritorio y restaurar las ventanas abiertas en el entorno gráfico de Windows.',
    },
  },
  {
    id: 9004,
    enunciado:
      'En el trabajo con ventanas, iconos, menús contextuales y cuadros de diálogo en Windows (Tema 2 AGE), ¿qué combinación de teclas despliega directamente el menú de Vínculos Rápidos (menú de usuario avanzado del botón Inicio)?',
    opciones: [
      {
        id: 'A',
        texto: 'Tecla del logotipo de Windows + X.',
        esCorrecta: true,
        explicacion:
          'Windows + X (o clic derecho sobre el botón Inicio) abre el menú de Vínculos Rápidos con acceso a Administrador de discos, Administrador de dispositivos, Terminal y Configuración.',
      },
      {
        id: 'B',
        texto: 'Tecla del logotipo de Windows + I.',
        esCorrecta: false,
        explicacion:
          'Windows + I abre directamente la ventana de Configuración de Windows.',
      },
      {
        id: 'C',
        texto: 'Tecla del logotipo de Windows + A.',
        esCorrecta: false,
        explicacion:
          'Windows + A abre el panel de Configuración rápida (Wi-Fi, volumen, batería).',
      },
      {
        id: 'D',
        texto: 'Tecla del logotipo de Windows + S.',
        esCorrecta: false,
        explicacion:
          'Windows + S abre el cuadro de Búsqueda de Windows.',
      },
    ],
    leyesRelacionadas: ['Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows'],
    justificacionLegal: {
      norma: 'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows',
      articulo: 'Tema 2 · El menú Inicio y menús contextuales de Windows',
      fundamento:
        'La combinación Windows + X abre el menú contextual avanzado del botón Inicio (menú Power User).',
    },
  },

  // TEMA 3 (AGE): El explorador de Windows
  {
    id: 9005,
    enunciado:
      'En el Explorador de Windows (Tema 3 AGE), al arrastrar un archivo con el botón izquierdo del ratón desde una carpeta a otra carpeta situada en la MISMA unidad de disco (por ejemplo, de C:\\Informes a C:\\Archivo), ¿qué operación realiza Windows por defecto sin pulsar ninguna tecla adicional?',
    opciones: [
      {
        id: 'A',
        texto: 'Mueve el archivo a la carpeta de destino.',
        esCorrecta: true,
        explicacion:
          'Al arrastrar entre carpetas de la misma unidad lógica, la acción predeterminada del Explorador de Windows es Mover (para copiar habría que mantener pulsada la tecla CTRL).',
      },
      {
        id: 'B',
        texto: 'Copia el archivo manteniendo el original en la carpeta de origen.',
        esCorrecta: false,
        explicacion:
          'Copiar por defecto solo ocurre cuando se arrastra entre unidades de disco distintas (por ejemplo, de C: a D:).',
      },
      {
        id: 'C',
        texto: 'Crea únicamente un acceso directo (.lnk) en la carpeta de destino.',
        esCorrecta: false,
        explicacion:
          'Para forzar la creación de un acceso directo al arrastrar se debe mantener pulsada la tecla ALT (o CTRL + MAYÚS).',
      },
      {
        id: 'D',
        texto: 'Comprime automáticamente el archivo en formato .ZIP antes de trasladarlo.',
        esCorrecta: false,
        explicacion:
          'El arrastre estándar nunca comprime archivos automáticamente.',
      },
    ],
    leyesRelacionadas: ['Tema 3 (AGE): El explorador de Windows'],
    justificacionLegal: {
      norma: 'Tema 3 (AGE): El explorador de Windows',
      articulo: 'Tema 3 · Gestión de carpetas y archivos en el Explorador de Windows',
      fundamento:
        'En el Explorador de archivos de Windows, arrastrar elementos dentro de la misma unidad los mueve por defecto; arrastrarlos entre distintas unidades los copia por defecto.',
    },
  },
  {
    id: 9006,
    enunciado:
      'Dentro del Explorador de Windows (Tema 3 AGE), ¿qué tecla de función o combinación permite cambiar el nombre (renombrar) directamente al archivo o carpeta que se encuentra seleccionado?',
    opciones: [
      {
        id: 'A',
        texto: 'F2.',
        esCorrecta: true,
        explicacion:
          'La tecla F2 activa inmediatamente la edición del nombre del archivo o carpeta seleccionado en el Explorador de Windows.',
      },
      {
        id: 'B',
        texto: 'F5.',
        esCorrecta: false,
        explicacion:
          'F5 actualiza (refresca) el contenido de la ventana activa del Explorador.',
      },
      {
        id: 'C',
        texto: 'F3.',
        esCorrecta: false,
        explicacion:
          'F3 (o Ctrl + F / Ctrl + E) sitúa el foco en el cuadro de búsqueda del Explorador de archivos.',
      },
      {
        id: 'D',
        texto: 'Alt + Intro.',
        esCorrecta: false,
        explicacion:
          'Alt + Intro abre el cuadro de diálogo de Propiedades del archivo o carpeta seleccionado.',
      },
    ],
    leyesRelacionadas: ['Tema 3 (AGE): El explorador de Windows'],
    justificacionLegal: {
      norma: 'Tema 3 (AGE): El explorador de Windows',
      articulo: 'Tema 3 · Operaciones con archivos, Este equipo y Acceso rápido',
      fundamento:
        'La tecla F2 es el atajo estándar en el Explorador de Windows para renombrar el elemento seleccionado.',
    },
  },

  // TEMA 4 (AGE): Procesadores de texto: Word 365
  {
    id: 9007,
    enunciado:
      'En el procesador de textos Microsoft Word 365 (Tema 4 AGE), ¿qué tipo de salto se debe insertar si se desea cambiar la orientación de una página concreta a Horizontal manteniendo el resto del documento en orientación Vertical?',
    opciones: [
      {
        id: 'A',
        texto: 'Un salto de sección (Página siguiente).',
        esCorrecta: true,
        explicacion:
          'La orientación de página, los márgenes y los encabezados/pies independientes son propiedades de sección en Word 365, por lo que exigen un salto de sección.',
      },
      {
        id: 'B',
        texto: 'Un salto de página simple (Ctrl + Intro).',
        esCorrecta: false,
        explicacion:
          'Un salto de página simple mantiene la misma sección, por lo que al cambiar la orientación cambiaría todo el documento o toda la sección actual.',
      },
      {
        id: 'C',
        texto: 'Un salto de ajuste del texto.',
        esCorrecta: false,
        explicacion:
          'El salto de ajuste del texto solo desplaza el texto alrededor de imágenes u objetos web.',
      },
      {
        id: 'D',
        texto: 'Un salto de columna (Ctrl + Mayús + Intro).',
        esCorrecta: false,
        explicacion:
          'El salto de columna mueve el texto a la siguiente columna periodística dentro de la misma sección.',
      },
    ],
    leyesRelacionadas: ['Tema 4 (AGE): Procesadores de texto: Word 365'],
    justificacionLegal: {
      norma: 'Tema 4 (AGE): Procesadores de texto: Word 365',
      articulo: 'Tema 4 · Creación y estructuración del documento en Word 365',
      fundamento:
        'En Word 365 (pestaña Disposición > Configurar página > Saltos), los saltos de sección permiten dividir el documento en partes con configuración de página independiente.',
    },
  },
  {
    id: 9008,
    enunciado:
      'En Microsoft Word 365 en español (Tema 4 AGE), ¿cuál es el método abreviado de teclado predeterminado para aplicar o quitar el formato de texto Subrayado a la selección actual?',
    opciones: [
      {
        id: 'A',
        texto: 'Ctrl + S.',
        esCorrecta: true,
        explicacion:
          'En la versión en español de Word 365, Ctrl + S aplica Subrayado, Ctrl + N aplica Negrita y Ctrl + K aplica Cursiva (mientras que Guardar es Ctrl + G).',
      },
      {
        id: 'B',
        texto: 'Ctrl + U.',
        esCorrecta: false,
        explicacion:
          'En Word en español, Ctrl + U crea un documento nuevo en blanco.',
      },
      {
        id: 'C',
        texto: 'Ctrl + G.',
        esCorrecta: false,
        explicacion:
          'En Word en español, Ctrl + G guarda el documento activo.',
      },
      {
        id: 'D',
        texto: 'Ctrl + T.',
        esCorrecta: false,
        explicacion:
          'En Word en español, Ctrl + T centra el párrafo seleccionado.',
      },
    ],
    leyesRelacionadas: ['Tema 4 (AGE): Procesadores de texto: Word 365'],
    justificacionLegal: {
      norma: 'Tema 4 (AGE): Procesadores de texto: Word 365',
      articulo: 'Tema 4 · Principales funciones, formato y atajos en Word 365',
      fundamento:
        'En Microsoft Word 365 (edición en español), los atajos de formato de fuente son Ctrl+N (Negrita), Ctrl+K (Cursiva) y Ctrl+S (Subrayado).',
    },
  },

  // TEMA 5 (AGE): Hojas de cálculo: Excel 365
  {
    id: 9009,
    enunciado:
      'En Microsoft Excel 365 (Tema 5 AGE), si en la celda C2 escribimos la fórmula =$A1+B$1 y la copiamos y pegamos en la celda D4, ¿qué fórmula resultante aparecerá en la celda D4?',
    opciones: [
      {
        id: 'A',
        texto: '=$A3+C$1',
        esCorrecta: true,
        explicacion:
          'Al desplazarnos 1 columna a la derecha (de C a D) y 2 filas hacia abajo (de 2 a 4): en $A1 la columna A está fijada ($) y la fila 1 suma 2 -> $A3; en B$1 la columna B avanza a C y la fila 1 está fijada ($) -> C$1.',
      },
      {
        id: 'B',
        texto: '=$B3+C$3',
        esCorrecta: false,
        explicacion:
          'La columna $A tiene referencia absoluta de columna y la fila $1 tiene referencia absoluta de fila, por lo que no varían al copiar.',
      },
      {
        id: 'C',
        texto: '=$A1+B$1',
        esCorrecta: false,
        explicacion:
          'Las partes relativas de las referencias mixtas (la fila 1 en $A1 y la columna B en B$1) sí se actualizan al copiar la celda.',
      },
      {
        id: 'D',
        texto: '=B3+C1',
        esCorrecta: false,
        explicacion:
          'El símbolo $ mantiene bloqueada la coordenada a la que precede.',
      },
    ],
    leyesRelacionadas: ['Tema 5 (AGE): Hojas de cálculo: Excel 365'],
    justificacionLegal: {
      norma: 'Tema 5 (AGE): Hojas de cálculo: Excel 365',
      articulo: 'Tema 5 · Fórmulas, funciones y referencias de celda en Excel 365',
      fundamento:
        'En Excel 365, el signo $ antes de la letra fija la columna y antes del número fija la fila (referencias mixtas).',
    },
  },
  {
    id: 9010,
    enunciado:
      'En Microsoft Excel 365 (Tema 5 AGE), ¿qué error devuelve una fórmula cuando se intenta dividir un valor numérico por cero o por una celda que se encuentra vacía?',
    opciones: [
      {
        id: 'A',
        texto: '#¡DIV/0!',
        esCorrecta: true,
        explicacion:
          'El código de error #¡DIV/0! aparece cuando una fórmula divide explícitamente por 0 o hace referencia a una celda en blanco como divisor.',
      },
      {
        id: 'B',
        texto: '#¿NOMBRE?',
        esCorrecta: false,
        explicacion:
          '#¿NOMBRE? aparece cuando Excel no reconoce el texto de una fórmula (por ejemplo, el nombre de una función mal escrito).',
      },
      {
        id: 'C',
        texto: '#¡REF!',
        esCorrecta: false,
        explicacion:
          '#¡REF! se produce cuando una referencia de celda no es válida (por ejemplo, por haberse eliminado la fila o columna referenciada).',
      },
      {
        id: 'D',
        texto: '#N/A',
        esCorrecta: false,
        explicacion:
          '#N/A indica que un valor buscado no está disponible para una función de búsqueda como BUSCARV o BUSCARX.',
      },
    ],
    leyesRelacionadas: ['Tema 5 (AGE): Hojas de cálculo: Excel 365'],
    justificacionLegal: {
      norma: 'Tema 5 (AGE): Hojas de cálculo: Excel 365',
      articulo: 'Tema 5 · Introducción y edición de datos, fórmulas y funciones en Excel 365',
      fundamento:
        'Excel 365 muestra el error #¡DIV/0! cuando el denominador de una operación de división es 0 o una celda vacía.',
    },
  },

  // TEMA 6 (AGE): Bases de datos: Access 365
  {
    id: 9011,
    enunciado:
      'En una base de datos relacional creada con Microsoft Access 365 (Tema 6 AGE), ¿qué propiedad o regla garantiza que no se pueda introducir en una tabla secundaria un valor de clave externa (foránea) que no exista previamente como clave principal en la tabla relacionada?',
    opciones: [
      {
        id: 'A',
        texto: 'La Integridad referencial.',
        esCorrecta: true,
        explicacion:
          'La integridad referencial es el sistema de reglas que utiliza Access 365 para asegurarse de que las relaciones entre los registros de tablas relacionadas son válidas y no se crean registros huérfanos.',
      },
      {
        id: 'B',
        texto: 'La Máscara de entrada.',
        esCorrecta: false,
        explicacion:
          'La máscara de entrada solo restringe el formato de los caracteres que el usuario teclea en un campo individual.',
      },
      {
        id: 'C',
        texto: 'La Indexación con duplicados permitidos.',
        esCorrecta: false,
        explicacion:
          'Un índice acelera las búsquedas y ordenaciones en una tabla, pero no exige correspondencia entre tablas.',
      },
      {
        id: 'D',
        texto: 'El tipo de datos Autonumérico.',
        esCorrecta: false,
        explicacion:
          'Autonumérico genera valores secuenciales o aleatorios únicos, pero por sí solo no impone integridad entre tablas.',
      },
    ],
    leyesRelacionadas: ['Tema 6 (AGE): Bases de datos: Access 365'],
    justificacionLegal: {
      norma: 'Tema 6 (AGE): Bases de datos: Access 365',
      articulo: 'Tema 6 · Tablas, relaciones e integridad referencial en Access 365',
      fundamento:
        'En Access 365, exigir integridad referencial en una relación impide registros huérfanos y permite activar Actualizar y Eliminar en cascada.',
    },
  },
  {
    id: 9012,
    enunciado:
      'En Microsoft Access 365 (Tema 6 AGE), ¿cuál de los siguientes objetos está diseñado específicamente para dar formato, calcular resúmenes, agrupar registros y presentar los datos optimizados para su impresión o exportación a PDF?',
    opciones: [
      {
        id: 'A',
        texto: 'El Informe.',
        esCorrecta: true,
        explicacion:
          'Los Informes en Access 365 son los objetos destinados a formatear, agrupar, resumir e imprimir los datos de tablas o consultas.',
      },
      {
        id: 'B',
        texto: 'El Formulario.',
        esCorrecta: false,
        explicacion:
          'Los Formularios están orientados principalmente a la introducción, edición y visualización interactiva de registros en pantalla.',
      },
      {
        id: 'C',
        texto: 'La Consulta de actualización.',
        esCorrecta: false,
        explicacion:
          'Las consultas de actualización son consultas de acción que modifican masivamente valores en las tablas.',
      },
      {
        id: 'D',
        texto: 'La Macro condicional.',
        esCorrecta: false,
        explicacion:
          'Las macros automatizan tareas y eventos en la base de datos.',
      },
    ],
    leyesRelacionadas: ['Tema 6 (AGE): Bases de datos: Access 365'],
    justificacionLegal: {
      norma: 'Tema 6 (AGE): Bases de datos: Access 365',
      articulo: 'Tema 6 · Tablas, Consultas, Formularios e Informes en Access 365',
      fundamento:
        'En Access 365, los Informes permiten presentar la información de las tablas o consultas con niveles de agrupamiento y totales listos para imprimir.',
    },
  },

  // TEMA 7 (AGE): Correo electrónico: Outlook 365
  {
    id: 9013,
    enunciado:
      'En el cliente de correo electrónico Microsoft Outlook 365 (Tema 7 AGE), ¿qué diferencia técnica fundamental existe entre configurar una cuenta mediante el protocolo IMAP frente al protocolo POP3 por defecto?',
    opciones: [
      {
        id: 'A',
        texto: 'IMAP sincroniza los mensajes y carpetas directamente con el servidor permitiendo el acceso multidispositivo, mientras que POP3 descarga los mensajes al equipo local.',
        esCorrecta: true,
        explicacion:
          'IMAP mantiene los correos y estados de lectura sincronizados en el servidor; POP3 descarga por defecto los mensajes al dispositivo local.',
      },
      {
        id: 'B',
        texto: 'IMAP se utiliza exclusivamente para el envío de correo saliente y POP3 para la recepción de correo entrante.',
        esCorrecta: false,
        explicacion:
          'Tanto IMAP como POP3 son protocolos de recepción/acceso a correo; el protocolo encargado del envío de correo saliente es SMTP.',
      },
      {
        id: 'C',
        texto: 'POP3 permite sincronizar el calendario y la libreta de contactos en tiempo real en la nube y IMAP no permite adjuntos.',
        esCorrecta: false,
        explicacion:
          'POP3 solo descarga mensajes de la bandeja de entrada y no sincroniza carpetas ni calendarios.',
      },
      {
        id: 'D',
        texto: 'IMAP impide el uso del campo CCO (Con Copia Oculta) al redactar mensajes.',
        esCorrecta: false,
        explicacion:
          'El campo CCO depende del cliente y del envío SMTP, estando disponible con cualquier protocolo.',
      },
    ],
    leyesRelacionadas: ['Tema 7 (AGE): Correo electrónico: Outlook 365'],
    justificacionLegal: {
      norma: 'Tema 7 (AGE): Correo electrónico: Outlook 365',
      articulo: 'Tema 7 · Conceptos elementales y funcionamiento del correo electrónico en Outlook 365',
      fundamento:
        'En Outlook 365, los protocolos de recepción son POP3 e IMAP (sincronización bidireccional con servidor), y el protocolo de envío es SMTP.',
    },
  },
  {
    id: 9014,
    enunciado:
      'Al redactar y enviar un mensaje en Microsoft Outlook 365 (Tema 7 AGE), si incluimos a los destinatarios A y B en el campo «Para», al destinatario C en «CC» y a los destinatarios D y E en «CCO», ¿quiénes podrán ver que el destinatario D ha recibido el correo?',
    opciones: [
      {
        id: 'A',
        texto: 'Únicamente el remitente y el propio destinatario D (ni A, ni B, ni C, ni siquiera E verán la dirección de D).',
        esCorrecta: true,
        explicacion:
          'Los destinatarios incluidos en CCO (Con Copia Oculta) permanecen ocultos para todos los demás destinatarios del mensaje, incluidos otros destinatarios que también estén en CCO.',
      },
      {
        id: 'B',
        texto: 'El destinatario E por estar también en el campo CCO, pero no A, B ni C.',
        esCorrecta: false,
        explicacion:
          'Los destinatarios en CCO tampoco pueden verse entre sí.',
      },
      {
        id: 'C',
        texto: 'Los destinatarios principales A y B, pero quedará oculto para C.',
        esCorrecta: false,
        explicacion:
          'Ningún destinatario en Para ni en CC puede ver a los destinatarios en CCO.',
      },
      {
        id: 'D',
        texto: 'Todos los destinatarios si pulsan en «Responder a todos».',
        esCorrecta: false,
        explicacion:
          'Al pulsar «Responder a todos», los destinatarios en CCO no reciben la respuesta ni quedan expuestos.',
      },
    ],
    leyesRelacionadas: ['Tema 7 (AGE): Correo electrónico: Outlook 365'],
    justificacionLegal: {
      norma: 'Tema 7 (AGE): Correo electrónico: Outlook 365',
      articulo: 'Tema 7 · Creación, envío, respuesta y reenvío de mensajes en Outlook 365',
      fundamento:
        'El campo CCO (Con Copia Oculta / BCC) oculta la identidad de cada destinatario incluido en él frente al resto de receptores del correo.',
    },
  },

  // TEMA 8 (AGE): La Red Internet
  {
    id: 9015,
    enunciado:
      'En relación con los conceptos elementales sobre protocolos y servicios en la Red Internet (Tema 8 AGE), ¿qué servicio o protocolo de red tiene como función traducir un nombre de dominio legible (como www.administracion.gob.es) en su correspondiente dirección IP numérica?',
    opciones: [
      {
        id: 'A',
        texto: 'DNS (Domain Name System).',
        esCorrecta: true,
        explicacion:
          'El sistema de nombres de dominio (DNS) resuelve nombres de dominio alfanuméricos convirtiéndolos en direcciones IP (IPv4 o IPv6) para localizar el servidor.',
      },
      {
        id: 'B',
        texto: 'DHCP (Dynamic Host Configuration Protocol).',
        esCorrecta: false,
        explicacion:
          'DHCP asigna dinámicamente direcciones IP y parámetros de red a los equipos clientes cuando se conectan a la red.',
      },
      {
        id: 'C',
        texto: 'FTP (File Transfer Protocol).',
        esCorrecta: false,
        explicacion:
          'FTP es un protocolo de la capa de aplicación destinado a la transferencia de ficheros entre cliente y servidor.',
      },
      {
        id: 'D',
        texto: 'ICMP (Internet Control Message Protocol).',
        esCorrecta: false,
        explicacion:
          'ICMP se emplea para enviar mensajes de control y diagnóstico de red (como el comando ping).',
      },
    ],
    leyesRelacionadas: ['Tema 8 (AGE): La Red Internet'],
    justificacionLegal: {
      norma: 'Tema 8 (AGE): La Red Internet',
      articulo: 'Tema 8 · Conceptos elementales sobre protocolos y servicios en Internet',
      fundamento:
        'El servicio DNS (Domain Name System) traduce nombres de dominio en direcciones IP numéricas dentro de la arquitectura TCP/IP de Internet.',
    },
  },
  {
    id: 9016,
    enunciado:
      'Dentro de las funcionalidades básicas de los navegadores web como Microsoft Edge o Google Chrome (Tema 8 AGE), ¿qué combinación de teclas permite abrir directamente una nueva ventana de navegación en modo InPrivate o Incógnito?',
    opciones: [
      {
        id: 'A',
        texto: 'Ctrl + Mayús + N.',
        esCorrecta: true,
        explicacion:
          'En Microsoft Edge y Google Chrome, Ctrl + Mayús + N abre una nueva ventana de navegación privada (InPrivate / Incógnito) que no guarda historial local ni cookies al cerrarse.',
      },
      {
        id: 'B',
        texto: 'Ctrl + T.',
        esCorrecta: false,
        explicacion:
          'Ctrl + T abre una pestaña nueva ordinaria dentro de la ventana actual.',
      },
      {
        id: 'C',
        texto: 'Ctrl + H.',
        esCorrecta: false,
        explicacion:
          'Ctrl + H abre el panel del Historial de navegación.',
      },
      {
        id: 'D',
        texto: 'Ctrl + J.',
        esCorrecta: false,
        explicacion:
          'Ctrl + J abre el historial y gestor de Descargas del navegador.',
      },
    ],
    leyesRelacionadas: ['Tema 8 (AGE): La Red Internet'],
    justificacionLegal: {
      norma: 'Tema 8 (AGE): La Red Internet',
      articulo: 'Tema 8 · Funcionalidades básicas de los navegadores web',
      fundamento:
        'En los navegadores basados en Chromium (Microsoft Edge y Chrome), Ctrl + Mayús + N abre una ventana InPrivate/Incógnito y Ctrl + Mayús + T reabre la última pestaña cerrada.',
    },
  },

  // TEMA 9 (ADICIONAL CAM): Power BI
  {
    id: 9017,
    enunciado:
      'En Microsoft Power BI (Tema 9 Adicional CAM), ¿qué herramienta integrada permite conectarse a diversos orígenes de datos, limpiar, filtrar, dividir columnas y transformar los datos (proceso ETL) antes de cargarlos en el modelo de datos?',
    opciones: [
      {
        id: 'A',
        texto: 'El Editor de Power Query.',
        esCorrecta: true,
        explicacion:
          'Power Query (basado en el lenguaje M) es el motor de extracción, transformación y carga (ETL) de Power BI Desktop.',
      },
      {
        id: 'B',
        texto: 'El Lienzo de Cuadros de Mando DAX.',
        esCorrecta: false,
        explicacion:
          'DAX (Data Analysis Expressions) es el lenguaje de fórmulas para crear medidas y columnas calculadas una vez cargado el modelo.',
      },
      {
        id: 'C',
        texto: 'Microsoft OneDrive Sincronizador.',
        esCorrecta: false,
        explicacion:
          'OneDrive es almacenamiento en la nube, no el editor de transformación de datos de Power BI.',
      },
      {
        id: 'D',
        texto: 'El Analizador de Rendimiento de Informes Paginados.',
        esCorrecta: false,
        explicacion:
          'El analizador de rendimiento mide tiempos de carga de objetos visuales, no realiza transformaciones ETL.',
      },
    ],
    leyesRelacionadas: ['Tema 9 (CAM): Power BI'],
    justificacionLegal: {
      norma: 'Tema 9 (CAM): Power BI',
      articulo: 'Tema 9 (CAM) · Power BI: Orígenes de datos, Power Query, Modelado y Visualización',
      fundamento:
        'En Power BI Desktop, el Editor de Power Query («Transformar datos») permite depurar y dar forma a los datos antes de incorporarlos al modelo relacional.',
    },
  },
  {
    id: 9018,
    enunciado:
      'En el lenguaje de fórmulas DAX de Microsoft Power BI (Tema 9 Adicional CAM), ¿cuál es la función más importante que permite evaluar una expresión modificando o sobrescribiendo el contexto de filtro actual?',
    opciones: [
      {
        id: 'A',
        texto: 'CALCULATE.',
        esCorrecta: true,
        explicacion:
          'La función CALCULATE(expresión; filtro1; filtro2...) evalúa una expresión en un contexto de filtro modificado por los filtros especificados.',
      },
      {
        id: 'B',
        texto: 'CONCATENATEX.',
        esCorrecta: false,
        explicacion:
          'CONCATENATEX concatena el resultado de una expresión evaluada para cada fila de una tabla.',
      },
      {
        id: 'C',
        texto: 'CALENDARAUTO.',
        esCorrecta: false,
        explicacion:
          'CALENDARAUTO devuelve una tabla con una sola columna de fechas calculada automáticamente a partir del modelo.',
      },
      {
        id: 'D',
        texto: 'BUSCARV.',
        esCorrecta: false,
        explicacion:
          'BUSCARV es una función de Excel; en DAX se emplean RELATED o LOOKUPVALUE.',
      },
    ],
    leyesRelacionadas: ['Tema 9 (CAM): Power BI'],
    justificacionLegal: {
      norma: 'Tema 9 (CAM): Power BI',
      articulo: 'Tema 9 (CAM) · Power BI: Modelo de datos, Medidas DAX y Visualizaciones',
      fundamento:
        'CALCULATE es la función nuclear de DAX en Power BI para alterar el contexto de filtro en medidas dinámicas.',
    },
  },

  // TEMA 10 (ADICIONAL CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)
  {
    id: 9019,
    enunciado:
      'Dentro de las herramientas de trabajo colaborativo de Microsoft 365 (Tema 10 Adicional CAM: Teams, SharePoint y OneDrive), ¿dónde se almacenan automáticamente los archivos que se comparten en la pestaña «Archivos» de un canal estándar de un equipo en Microsoft Teams?',
    opciones: [
      {
        id: 'A',
        texto: 'En una carpeta dentro de la biblioteca de documentos del sitio de SharePoint Online asociado al equipo.',
        esCorrecta: true,
        explicacion:
          'Cada equipo de Microsoft Teams aprovisiona un sitio de SharePoint Online; los archivos de los canales se guardan en la biblioteca de documentos de SharePoint (mientras que los archivos compartidos en un chat privado 1 a 1 se guardan en OneDrive para la Empresa del remitente).',
      },
      {
        id: 'B',
        texto: 'Exclusivamente en el disco duro local C:\\Usuarios del propietario del equipo.',
        esCorrecta: false,
        explicacion:
          'El almacenamiento colaborativo de canales de Teams reside en la nube sobre SharePoint Online.',
      },
      {
        id: 'C',
        texto: 'En una base de datos local de Microsoft Access (.accdb) adjunta al calendario.',
        esCorrecta: false,
        explicacion:
          'Access no es el motor de almacenamiento documental de Teams.',
      },
      {
        id: 'D',
        texto: 'En la bandeja de elementos enviados de POP3 del administrador.',
        esCorrecta: false,
        explicacion:
          'Los archivos de un canal de Teams se gestionan documentalmente en SharePoint Online.',
      },
    ],
    leyesRelacionadas: [
      'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)',
    ],
    justificacionLegal: {
      norma: 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)',
      articulo: 'Tema 10 (CAM) · Trabajo colaborativo: Teams, SharePoint, OneDrive y Videoconferencias',
      fundamento:
        'En Microsoft 365, los archivos compartidos en canales de un equipo de Teams se almacenan en el sitio de SharePoint del equipo, permitiendo coautoría y control de versiones.',
    },
  },
  {
    id: 9020,
    enunciado:
      'En relación con los tipos de canales de un equipo en Microsoft Teams dentro del entorno colaborativo Microsoft 365 (Tema 10 Adicional CAM), ¿qué tipo de canal permite colaborar con personas tanto de dentro como de fuera del equipo (o de otras organizaciones con acceso directo B2B) sin necesidad de añadirlas como miembros de todo el equipo completo?',
    opciones: [
      {
        id: 'A',
        texto: 'Un canal compartido.',
        esCorrecta: true,
        explicacion:
          'Los canales compartidos permiten invitar a usuarios específicos que no son miembros del equipo principal sin darles acceso al resto de canales del equipo.',
      },
      {
        id: 'B',
        texto: 'Un canal estándar.',
        esCorrecta: false,
        explicacion:
          'Un canal estándar es accesible para todos los miembros del equipo, pero no permite añadir usuarios externos exclusivamente a ese canal.',
      },
      {
        id: 'C',
        texto: 'Un canal privado.',
        esCorrecta: false,
        explicacion:
          'Un canal privado restringe el acceso a un subconjunto de personas que YA tienen que ser miembros previamente del equipo principal.',
      },
      {
        id: 'D',
        texto: 'El canal «General» predeterminado.',
        esCorrecta: false,
        explicacion:
          'El canal General es un canal estándar obligatorio para todos los miembros del equipo.',
      },
    ],
    leyesRelacionadas: [
      'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)',
    ],
    justificacionLegal: {
      norma: 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)',
      articulo: 'Tema 10 (CAM) · Microsoft Teams: Equipos, Canales y Videoconferencias',
      fundamento:
        'Microsoft Teams dispone de tres tipos de canales: Estándar (todos los miembros del equipo), Privado (subconjunto de miembros del equipo) y Compartido (usuarios dentro o fuera del equipo).',
    },
  },
];

const BATERIA_CONCEPTOS_POR_TEMA_INFORMATICA: Record<
  string,
  { concepto: string; respuestaCorrecta: string; distractores: [string, string, string]; fundamento: string }[]
> = {
  'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)': [
    {
      concepto: 'la memoria caché integrada en el procesador (L1, L2 y L3)',
      respuestaCorrecta: 'Es una memoria estática (SRAM) ultrarrápida y volátil que almacena los datos e instrucciones de uso más frecuente para reducir los accesos a la memoria RAM.',
      distractores: [
        'Es una memoria óptica de solo lectura permanente donde se almacena el sistema operativo completo.',
        'Es un dispositivo magnético secundario conectado por interfaz SATA III para copias de seguridad.',
        'Es una partición del disco duro mecánico reservada exclusivamente para archivos temporales de impresión.',
      ],
      fundamento: 'La memoria caché (SRAM) se sitúa entre la CPU y la memoria principal DRAM para acelerar el ciclo de instrucción.',
    },
    {
      concepto: 'el firmware UEFI frente al tradicional BIOS en la placa base',
      respuestaCorrecta: 'Permite el arranque seguro (Secure Boot), soporta particiones GPT con discos mayores de 2 TB y ofrece una interfaz gráfica.',
      distractores: [
        'Limita el tamaño máximo de los discos de arranque a 512 MB en esquema MBR de 16 bits.',
        'Sustituye físicamente a la memoria RAM ejecutando las aplicaciones ofimáticas de usuario.',
        'Actúa exclusivamente como controlador de impresoras matriciales por puerto paralelo LPT1.',
      ],
      fundamento: 'UEFI reemplaza al antiguo firmware BIOS superando la limitación de 2 TB del esquema MBR gracias al particionado GPT y añadiendo Secure Boot.',
    },
    {
      concepto: 'el sistema de archivos NTFS propio de los sistemas Windows',
      respuestaCorrecta: 'Soporta permisos de seguridad a nivel de archivo/carpeta (ACL), cifrado EFS, compresión nativa y registro por diario (journaling).',
      distractores: [
        'Impone un tamaño máximo de archivo individual de 4 GB igual que el sistema FAT32.',
        'Solo puede utilizarse en disquetes magnéticos de 3,5 pulgadas y tarjetas SD de menos de 2 GB.',
        'Carece de soporte para nombres largos de archivo, limitándolos al formato 8.3 caracteres.',
      ],
      fundamento: 'NTFS (New Technology File System) es el sistema de archivos estándar de Windows con soporte de ACL, cuotas, cifrado EFS, sombras VSS y archivos de gran tamaño.',
    },
    {
      concepto: 'la configuración de almacenamiento RAID 1 en servidores y estaciones de trabajo',
      respuestaCorrecta: 'Implementa duplicación en espejo (mirroring) escribiendo los mismos datos simultáneamente en dos discos para ofrecer tolerancia a fallos.',
      distractores: [
        'Divide los datos en bloques (striping) sin paridad ni redundancia, perdiendo toda la información si falla un disco.',
        'Exige un mínimo obligatorio de 8 discos duros magnéticos con doble paridad distribuida.',
        'Comprime los ejecutables del sistema operativo eliminando la necesidad de memoria RAM.',
      ],
      fundamento: 'RAID 1 duplica la información en espejo sobre dos o más discos, garantizando alta disponibilidad ante la rotura de una unidad.',
    },
    {
      concepto: 'el malware de tipo Ransomware dentro de la seguridad informática',
      respuestaCorrecta: 'Secuestra los archivos del sistema mediante cifrado criptográfico y exige un rescate económico para proporcionar la clave de descifrado.',
      distractores: [
        'Es un componente físico del cortafuegos perimetral encargado de filtrar paquetes UDP.',
        'Es una utilidad legítima de Windows para desfragmentar unidades de estado sólido NVMe.',
        'Consiste únicamente en mostrar banners publicitarios no intrusivos en el protector de pantalla.',
      ],
      fundamento: 'El ransomware bloquea o cifra los ficheros del usuario o de la red corporativa exigiendo el pago de un rescate.',
    },
    {
      concepto: 'la firma electrónica cualificada según la normativa de seguridad y criptografía asimétrica',
      respuestaCorrecta: 'Se genera mediante la clave privada del firmante contenida en un dispositivo cualificado y se verifica con su clave pública asociada al certificado digital.',
      distractores: [
        'Se firma con la clave pública del destinatario y solo puede verificarse mediante la contraseña Wi-Fi.',
        'Garantiza el anonimato absoluto del emisor impidiendo conocer quién ha suscrito el documento.',
        'Consiste en escanear una rúbrica manuscrita en formato BMP sin emplear algoritmos hash.',
      ],
      fundamento: 'En criptografía asimétrica de firma digital, el emisor aplica la función resumen (hash) y cifra con su clave privada, garantizando autenticidad, integridad y no repudio.',
    },
    {
      concepto: 'las unidades de estado sólido (SSD) con protocolo NVMe sobre bus PCIe',
      respuestaCorrecta: 'Carecen de partes móviles mecánicas, emplean memorias flash NAND y alcanzan velocidades de lectura/escritura muy superiores a la interfaz SATA III.',
      distractores: [
        'Utilizan platos magnéticos giratorios a 7.200 rpm con cabezales electromecánicos de lectura.',
        'Son memorias volátiles que pierden todos los documentos guardados al apagar el ordenador.',
        'Tienen una velocidad máxima teórica limitada a 150 MB/s por el estándar IDE/PATA.',
      ],
      fundamento: 'Las unidades SSD NVMe se conectan directamente a través de líneas PCI Express, reduciendo la latencia y superando el cuello de botella de los 600 MB/s de SATA III.',
    },
    {
      concepto: 'el principio de privilegio mínimo en seguridad de sistemas operativos',
      respuestaCorrecta: 'Establece que cada usuario, proceso o programa debe disponer únicamente de los permisos estrictamente necesarios para desempeñar sus funciones.',
      distractores: [
        'Obliga a que todos los empleados trabajen habitualmente con la cuenta de Administrador local.',
        'Desactiva las contraseñas de inicio de sesión para agilizar el acceso a las carpetas compartidas.',
        'Prohíbe el uso de software antivirus en los equipos conectados a la red local.',
      ],
      fundamento: 'El principio de mínimo privilegio reduce la superficie de ataque limitando los permisos de cuentas y procesos a los indispensables.',
    },
  ],
  'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows': [
    {
      concepto: 'el Administrador de tareas de Windows y su atajo de apertura directa',
      respuestaCorrecta: 'Se abre directamente pulsando Ctrl + Mayús + Esc y permite supervisar procesos, rendimiento de CPU/RAM, aplicaciones de inicio y servicios.',
      distractores: [
        'Se abre con Windows + E y sirve únicamente para cambiar el fondo de pantalla del Escritorio.',
        'Se abre con Alt + Barra espaciadora y formatea automáticamente las particiones del disco.',
        'Solo puede ejecutarse arrancando el equipo desde un medio externo de instalación USB.',
      ],
      fundamento: 'Ctrl + Mayús + Esc abre de forma inmediata el Administrador de tareas de Windows sin pasar por la pantalla de seguridad Ctrl + Alt + Supr.',
    },
    {
      concepto: 'la función de Escritorios virtuales (Vista de tareas) en el entorno Windows',
      respuestaCorrecta: 'Se invoca mediante Windows + Tabulador y permite agrupar ventanas abiertas en distintos escritorios de trabajo independientes.',
      distractores: [
        'Requiere instalar un monitor físico adicional por cada escritorio virtual creado.',
        'Cierra y desinstala todas las aplicaciones que no estén visibles en la barra de tareas.',
        'Solo permite abrir una única ventana de Bloc de notas por cada sesión de usuario.',
      ],
      fundamento: 'Windows + Tab abre la Vista de tareas, permitiendo crear escritorios virtuales (Windows + Ctrl + D) y desplazarse entre ellos (Windows + Ctrl + Flechas).',
    },
    {
      concepto: 'el Historial del Portapapeles en el entorno gráfico de Windows',
      respuestaCorrecta: 'Se muestra al pulsar Windows + V y permite pegar varios elementos copiados recientemente o anclar los de uso frecuente.',
      distractores: [
        'Se abre con Ctrl + Z y borra permanentemente el contenido del disco duro principal.',
        'Solo admite almacenar un único carácter numérico sin formato.',
        'Se activa con Alt + F4 y apaga el equipo tras vaciar la cola de impresión.',
      ],
      fundamento: 'El atajo Windows + V abre el panel del Historial del Portapapeles en Windows 10 y Windows 11.',
    },
    {
      concepto: 'la captura de recortes de pantalla en el entorno Windows',
      respuestaCorrecta: 'La combinación Windows + Mayús + S abre la barra de la herramienta Recortes para capturar una región rectangular, forma libre, ventana o pantalla completa.',
      distractores: [
        'La combinación Windows + L envía automáticamente la pantalla actual a la impresora predeterminada.',
        'La tecla Esc realiza una grabación de vídeo en formato AVI de todas las ventanas minimizadas.',
        'No es posible realizar capturas de pantalla en Windows sin adquirir hardware capturador externo.',
      ],
      fundamento: 'Windows + Mayús + S invoca el selector de recorte de pantalla copiando la selección al portapapeles.',
    },
    {
      concepto: 'el bloqueo rápido de la sesión de trabajo en Windows',
      respuestaCorrecta: 'Al pulsar Windows + L se bloquea inmediatamente el escritorio y se muestra la pantalla de bloqueo para proteger la sesión activa.',
      distractores: [
        'Al pulsar Windows + L se eliminan todas las cuentas de usuario configuradas en el equipo.',
        'Al pulsar Windows + L se abre el Editor del Registro (regedit) con permisos de sistema.',
        'Al pulsar Windows + L se desinstalan los controladores de red inalámbrica.',
      ],
      fundamento: 'Windows + L (Lock) es el atajo de seguridad corporativo para bloquear el puesto de trabajo al ausentarse.',
    },
    {
      concepto: 'la gestión de colas de impresión y el servicio Spooler en Windows',
      respuestaCorrecta: 'El servicio Cola de impresión (Spooler) almacena temporalmente los trabajos en disco permitiendo que la aplicación continúe trabajando mientras se imprime en segundo plano.',
      distractores: [
        'Bloquea por completo el sistema operativo y el ratón hasta que la impresora termina la última hoja.',
        'Obliga a mantener abierto el navegador web para poder imprimir documentos desde Word.',
        'Convierte todos los documentos impresos en archivos de audio MP3.',
      ],
      fundamento: 'El spooler de impresión gestiona en segundo plano la cola de trabajos enviados a las impresoras locales o de red.',
    },
    {
      concepto: 'la ventana de Configuración del sistema en Windows',
      respuestaCorrecta: 'Se abre directamente mediante la combinación Windows + I y agrupa las opciones de Sistema, Bluetooth y dispositivos, Red e Internet, Personalización, Aplicaciones, Cuentas y Windows Update.',
      distractores: [
        'Se abre exclusivamente mediante Ctrl + P desde el Bloc de notas.',
        'Solo permite modificar la hora del reloj de la BIOS mediante comandos en ensamblador.',
        'Sustituye al explorador de archivos impidiendo crear carpetas nuevas.',
      ],
      fundamento: 'Windows + I abre de forma directa la aplicación Configuración de Windows.',
    },
    {
      concepto: 'el cuadro de diálogo Ejecutar en el entorno Windows',
      respuestaCorrecta: 'Se abre con la combinación Windows + R y permite abrir programas, carpetas, documentos o recursos de red escribiendo su nombre o comando (como cmd, calc, msconfig o control).',
      distractores: [
        'Se abre con Ctrl + Alt + Fin y formatea la partición de recuperación.',
        'Solo acepta direcciones de correo electrónico con dominio .gov.',
        'Es una papelera secundaria para archivos de más de 10 GB.',
      ],
      fundamento: 'Windows + R abre el cuadro de diálogo Ejecutar para lanzar ejecutables y consolas administrativas.',
    },
  ],
  'Tema 3 (AGE): El explorador de Windows': [
    {
      concepto: 'la eliminación permanente de un archivo sin pasar por la Papelera de reciclaje en el Explorador de Windows',
      respuestaCorrecta: 'Se realiza seleccionando el archivo y pulsando la combinación Mayús (Shift) + Supr.',
      distractores: [
        'Se realiza pulsando únicamente la tecla Retroceso (Backspace).',
        'Se realiza pulsando Ctrl + C seguido de Ctrl + V en la misma carpeta.',
        'Se realiza pulsando la tecla F1 con el archivo seleccionado.',
      ],
      fundamento: 'Mayús + Supr (Shift + Delete) elimina definitivamente el elemento seleccionado sin enviarlo a la Papelera de reciclaje.',
    },
    {
      concepto: 'el uso de caracteres comodín (* y ?) en el cuadro de búsqueda del Explorador de Windows',
      respuestaCorrecta: 'El asterisco (*) sustituye a cualquier cadena de cero o más caracteres, mientras que el signo de interrogación (?) sustituye a un único carácter.',
      distractores: [
        'El signo (?) sustituye a carpetas completas y el asterisco (*) borra los archivos encontrados.',
        'Ambos caracteres están prohibidos en el cuadro de búsqueda y bloquean el Explorador.',
        'El asterisco (*) busca solo archivos ocultos del sistema y (?) busca solo imágenes.',
      ],
      fundamento: 'En las búsquedas del Explorador de Windows, * representa cualquier secuencia de caracteres (ej. *.pdf) y ? representa un solo carácter.',
    },
    {
      concepto: 'la apertura rápida de una nueva ventana del Explorador de Windows',
      respuestaCorrecta: 'Se realiza desde cualquier lugar de Windows pulsando la combinación Tecla del logotipo de Windows + E.',
      distractores: [
        'Se realiza pulsando Alt + F4 desde el Escritorio.',
        'Se realiza pulsando Ctrl + Alt + Supr y seleccionando Apagar.',
        'Se realiza pulsando F12 en la calculadora de Windows.',
      ],
      fundamento: 'Windows + E es el atajo global para abrir el Explorador de archivos (Este equipo / Inicio rápido).',
    },
    {
      concepto: 'la creación rápida de una Nueva carpeta en la ubicación actual del Explorador de Windows',
      respuestaCorrecta: 'Se ejecuta directamente mediante el atajo de teclado Ctrl + Mayús + N.',
      distractores: [
        'Se ejecuta mediante Ctrl + P.',
        'Se ejecuta mediante Alt + Tabulador.',
        'Se ejecuta mediante Windows + L.',
      ],
      fundamento: 'En el Explorador de Windows, Ctrl + Mayús + N crea inmediatamente una nueva carpeta en el directorio activo.',
    },
    {
      concepto: 'la selección de múltiples archivos NO consecutivos en el Explorador de Windows',
      respuestaCorrecta: 'Se realiza manteniendo pulsada la tecla Ctrl mientras se hace clic con el ratón sobre cada uno de los archivos deseados.',
      distractores: [
        'Se realiza manteniendo pulsada la tecla Mayús (Shift), que solo permite selecciones contiguas.',
        'Se realiza pulsando Ctrl + E, que selecciona exclusivamente los archivos impares.',
        'No es posible seleccionar archivos discontinuos en la vista Detalles.',
      ],
      fundamento: 'La tecla Ctrl permite alternar la selección individual de elementos discontinuos, mientras que Mayús (Shift) selecciona un rango continuo.',
    },
    {
      concepto: 'la consulta del cuadro de diálogo Propiedades de un archivo o carpeta en el Explorador de Windows',
      respuestaCorrecta: 'Se abre seleccionando el elemento y pulsando Alt + Intro (o haciendo doble clic mientras se mantiene pulsada la tecla Alt).',
      distractores: [
        'Se abre pulsando la tecla Supr.',
        'Se abre pulsando Ctrl + X.',
        'Se abre pulsando F5.',
      ],
      fundamento: 'Alt + Intro muestra directamente la ventana de Propiedades (tamaño, fechas, atributos de solo lectura/oculto y permisos de seguridad).',
    },
    {
      concepto: 'la sección «Acceso rápido» (o Inicio) y «Este equipo» del panel de navegación del Explorador de Windows',
      respuestaCorrecta: '«Acceso rápido» muestra las carpetas ancladas y los archivos/carpetas recientes, mientras que «Este equipo» muestra las unidades de almacenamiento locales, unidades ópticas y ubicaciones de red.',
      distractores: [
        '«Acceso rápido» formatea las unidades USB y «Este equipo» solo muestra correos electrónicos.',
        'Ambos paneles muestran exclusivamente el contenido de la Papelera de reciclaje.',
        '«Este equipo» solo está disponible si el ordenador carece de disco duro.',
      ],
      fundamento: 'En el Explorador de Windows, Acceso rápido facilita llegar a carpetas frecuentes/ancladas y Este equipo gestiona las unidades y dispositivos de almacenamiento.',
    },
    {
      concepto: 'las Herramientas del sistema integradas en Windows (Liberador de espacio en disco y Desfragmentar y optimizar unidades)',
      respuestaCorrecta: 'El Liberador de espacio elimina archivos temporales e innecesarios, mientras que Optimizar unidades aplica TRIM en unidades SSD y desfragmenta bloques contiguos en discos HDD.',
      distractores: [
        'Desfragmentar unidades aumenta físicamente la capacidad en gigabytes de la memoria RAM.',
        'El Liberador de espacio borra la BIOS de la placa base.',
        'Ninguna de estas herramientas puede ejecutarse en sistemas de archivos NTFS.',
      ],
      fundamento: 'Las herramientas administrativas de almacenamiento optimizan el espacio libre y el rendimiento de lectura/escritura según el tipo de soporte (HDD o SSD).',
    },
  ],
  'Tema 4 (AGE): Procesadores de texto: Word 365': [
    {
      concepto: 'la herramienta Combinar correspondencia (pestaña Correspondencia) en Word 365',
      respuestaCorrecta: 'Permite generar un conjunto de documentos personalizados (cartas, sobres, etiquetas o correos) combinando un documento principal fijo con un origen de datos (como una lista de Excel o Access).',
      distractores: [
        'Sirve para fusionar varios archivos PDF protegidos con contraseña en una hoja de cálculo.',
        'Traduce automáticamente el documento a código máquina binario.',
        'Reemplaza el corrector ortográfico por una base de datos de imágenes vectoriales.',
      ],
      fundamento: 'Combinar correspondencia une un documento maestro con campos de combinación («Insertar campo combinado») procedentes de una tabla o lista de destinatarios.',
    },
    {
      concepto: 'la generación automática de una Tabla de contenido (índice de capítulos) en Word 365',
      respuestaCorrecta: 'Se inserta desde la pestaña Referencias y se construye automáticamente a partir de los párrafos a los que se han aplicado estilos de título jerárquicos (Título 1, Título 2, Título 3).',
      distractores: [
        'Obliga a escribir manualmente los números de página uno por uno sin posibilidad de actualización.',
        'Se inserta desde la pestaña Vista > Zoom y solo detecta palabras escritas en color rojo.',
        'Solo funciona si el documento se guarda en formato de texto plano .txt.',
      ],
      fundamento: 'En Word 365 (pestaña Referencias > Tabla de contenido), el índice automático recopila los estilos Título 1..9 y permite actualizar solo los números de página o toda la tabla (F9).',
    },
    {
      concepto: 'la herramienta Copiar formato (icono de brocha en la pestaña Inicio) en Word 365',
      respuestaCorrecta: 'Al hacer un clic copia el formato a un único destino, y al hacer doble clic sobre el icono mantiene activa la brocha para aplicar el formato a múltiples selecciones hasta pulsar Esc.',
      distractores: [
        'Copia el texto literal borrando el formato de fuente y párrafo original.',
        'Envía el documento por correo electrónico a través de Outlook.',
        'Bloquea la edición del documento mediante contraseña criptográfica.',
      ],
      fundamento: 'Copiar formato (Ctrl + Mayús + C para copiar formato y Ctrl + Mayús + V para pegarlo) permite replicar atributos tipográficos y de párrafo; con doble clic permanece fijo.',
    },
    {
      concepto: 'la configuración de encabezados o pies de página distintos en un mismo documento de Word 365',
      respuestaCorrecta: 'Para que una nueva sección tenga un encabezado distinto al de la sección previa es imprescindible desactivar la opción «Vincular al anterior» en las herramientas de Encabezado y pie de página.',
      distractores: [
        'Es imposible tener más de un encabezado distinto dentro de un mismo archivo .docx.',
        'Basta con cambiar el zoom de la ventana al 200%.',
        'Se debe cambiar la extensión del archivo de .docx a .dotx en el Explorador.',
      ],
      fundamento: 'Word 365 ofrece las opciones «Primera página diferente», «Páginas pares e impares diferentes» y, entre secciones, el botón «Vincular al anterior».',
    },
    {
      concepto: 'las opciones de control de paginación de párrafo en Word 365 (Control de líneas viudas y huérfanas)',
      respuestaCorrecta: 'Impide que la última línea de un párrafo quede sola al principio de una página (viuda) o que la primera línea de un párrafo quede sola al final de una página (huérfana).',
      distractores: [
        'Elimina automáticamente todas las palabras que contengan faltas de ortografía.',
        'Convierte todos los párrafos del documento en tablas de 4 columnas.',
        'Divide el documento en archivos separados de una sola línea.',
      ],
      fundamento: 'En el cuadro de diálogo Párrafo > pestaña Líneas y saltos de página, se encuentran «Control de líneas viudas y huérfanas», «Conservar con el siguiente» y «Conservar líneas juntas».',
    },
    {
      concepto: 'la diferencia entre las extensiones de archivo .docx, .dotx y .docm en Word 365',
      respuestaCorrecta: '.docx es un documento estándar sin macros, .dotx es una plantilla de Word sin macros y .docm es un documento habilitado para contener macros VBA.',
      distractores: [
        '.dotx es un archivo de audio grabado con Cortana y .docm es una imagen de mapa de bits.',
        '.docx permite ejecutar macros VBA automáticamente y .docm las bloquea.',
        'Las tres extensiones corresponden a bases de datos de Microsoft Access.',
      ],
      fundamento: 'El formato OpenXML de Word 365 distingue entre documentos (.docx/.docm) y plantillas (.dotx/.dotm) según admitan o no código de macros.',
    },
    {
      concepto: 'la sangría francesa en el formato de párrafo de Word 365',
      respuestaCorrecta: 'Es una sangría especial en la que la primera línea del párrafo se mantiene más a la izquierda que el resto de las líneas del mismo párrafo, las cuales quedan sangradas hacia el interior.',
      distractores: [
        'Desplaza únicamente la primera línea hacia la derecha dejando el resto pegado al margen izquierdo.',
        'Aplica automáticamente el idioma francés al corrector gramatical del documento.',
        'Gira el texto 90 grados en sentido vertical dentro del margen derecho.',
      ],
      fundamento: 'La sangría francesa (atalho Ctrl + F en Word en español) sangra todas las líneas del párrafo excepto la primera; la sangría de primera línea sangra solo la primera.',
    },
    {
      concepto: 'el Control de cambios (pestaña Revisar) en Microsoft Word 365',
      respuestaCorrecta: 'Registra todas las inserciones, eliminaciones y cambios de formato realizados en el documento para que posteriormente puedan ser aceptados o rechazados individualmente o en bloque.',
      distractores: [
        'Impide guardar el documento en el disco duro local.',
        'Borra el historial de versiones de SharePoint sin dejar rastro.',
        'Cambia automáticamente la fuente de todo el texto a Wingdings.',
      ],
      fundamento: 'El Control de cambios (Ctrl + Mayús + E) permite auditar y revisar colaborativamente las modificaciones propuestas sobre un documento.',
    },
  ],
  'Tema 5 (AGE): Hojas de cálculo: Excel 365': [
    {
      concepto: 'la función BUSCARX frente a la clásica función BUSCARV en Excel 365',
      respuestaCorrecta: 'BUSCARX permite buscar tanto a la izquierda como a la derecha sin depender del número de columna y devuelve por defecto una coincidencia exacta.',
      distractores: [
        'BUSCARX solo puede buscar en la primera fila horizontal y exige que los datos estén ordenados alfabéticamente.',
        'BUSCARV permite buscar hacia la izquierda de la columna clave sin necesidad de usar ÍNDICE y COINCIDIR.',
        'Ambas funciones sirven exclusivamente para crear gráficos circulares en 3D.',
      ],
      fundamento: 'BUSCARX(valor_buscado; matriz_buscada; matriz_devuelta; [si_no_se_encuentra]; [modo_coincidencia]) supera la limitación de BUSCARV de buscar solo hacia la derecha.',
    },
    {
      concepto: 'las Tablas dinámicas (pestaña Insertar > Tabla dinámica) en Excel 365',
      respuestaCorrecta: 'Permiten resumir, agrupar, filtrar y cruzar grandes volúmenes de datos dinámicamente distribuyendo campos en las áreas de Filtros, Columnas, Filas y Valores.',
      distractores: [
        'Modifican y sobrescriben destructivamente las celdas de la tabla de origen cada vez que se aplica un filtro.',
        'Solo admiten un máximo de 10 filas y 2 columnas de datos numéricos.',
        'No permiten calcular sumas, promedios ni recuentos sin programar macros en C++.',
      ],
      fundamento: 'Las tablas dinámicas son la herramienta analítica de Excel 365 para cruzar dimensiones (Filas/Columnas) y métricas agregadas (Valores) con segmentación de datos.',
    },
    {
      concepto: 'las funciones condicionales CONTAR.SI.CONJUNTO y SUMAR.SI.CONJUNTO en Excel 365',
      respuestaCorrecta: 'Permiten contar o sumar celdas que cumplen simultáneamente múltiples criterios aplicados sobre uno o varios rangos (lógica Y).',
      distractores: [
        'Admiten únicamente una sola condición y devuelven #¡VALOR! si se indica un segundo rango.',
        'Sirven para convertir números decimales en texto en números romanos.',
        'En SUMAR.SI.CONJUNTO el rango_suma se coloca como último argumento al final de la fórmula.',
      ],
      fundamento: 'En SUMAR.SI.CONJUNTO(rango_suma; rango_criterios1; criterios1; ...) el primer argumento es siempre el rango que se desea sumar, seguido de los pares de rango y criterio.',
    },
    {
      concepto: 'la herramienta Inmovilizar paneles (pestaña Vista) en Excel 365',
      respuestaCorrecta: 'Permite mantener visibles determinadas filas superiores y/o columnas izquierdas al desplazarse vertical u horizontalmente por la hoja de cálculo.',
      distractores: [
        'Bloquea con contraseña el libro impidiendo abrirlo en otros ordenadores.',
        'Congela el recálculo de fórmulas dejando todas las celdas con valor cero.',
        'Oculta definitivamente la barra de fórmulas y las etiquetas de las hojas.',
      ],
      fundamento: 'En Vista > Inmovilizar se puede «Inmovilizar fila superior», «Inmovilizar primera columna» o «Inmovilizar paneles» (fija las filas por encima y las columnas a la izquierda de la celda activa).',
    },
    {
      concepto: 'la Validación de datos (pestaña Datos > Herramientas de datos) en Excel 365',
      respuestaCorrecta: 'Restringe el tipo de datos o los valores que los usuarios pueden introducir en una celda (por ejemplo, una lista desplegable, un número entero en un rango o una fecha válida).',
      distractores: [
        'Verifica mediante certificado digital de la FNMT la identidad del autor del libro.',
        'Corrige automáticamente las faltas de ortografía en los encabezados de impresión.',
        'Elimina las hojas del libro que no contengan gráficos.',
      ],
      fundamento: 'La Validación de datos permite definir criterios de entrada, un mensaje de entrada informativo y un mensaje de error (Detener, Advertencia o Información).',
    },
    {
      concepto: 'el Formato condicional (pestaña Inicio) en Microsoft Excel 365',
      respuestaCorrecta: 'Aplica automáticamente estilos visuales (colores de relleno, barras de datos, escalas de color o conjuntos de iconos) a las celdas cuyo valor cumple una regla determinada.',
      distractores: [
        'Redondea permanentemente el valor numérico almacenado en la celda eliminando sus decimales reales.',
        'Borra las filas que contengan números negativos.',
        'Solo puede aplicarse a celdas que contengan texto en mayúsculas.',
      ],
      fundamento: 'El formato condicional resalta visualmente tendencias, duplicados, valores superiores/inferiores o fórmulas lógicas sin alterar el dato subyacente.',
    },
    {
      concepto: 'la combinación de funciones ÍNDICE y COINCIDIR en Excel 365',
      respuestaCorrecta: 'COINCIDIR devuelve la posición relativa de un elemento dentro de un rango y ÍNDICE devuelve el valor de una celda situada en la intersección de una fila y columna dadas.',
      distractores: [
        'ÍNDICE ordena alfabéticamente las hojas del libro y COINCIDIR elimina las celdas duplicadas.',
        'Ambas funciones devuelven exclusivamente valores booleanos VERDADERO o FALSO.',
        'Solo pueden utilizarse dentro de comentarios de celda.',
      ],
      fundamento: 'Anidar ÍNDICE(matriz; COINCIDIR(valor; rango_busqueda; 0)) permite búsquedas bidireccionales flexibles en cualquier columna.',
    },
    {
      concepto: 'los atajos de teclado en una celda de Excel 365 para introducir la fecha actual o la hora actual como valor estático',
      respuestaCorrecta: 'Ctrl + , (coma) o Ctrl + ; inserta la fecha actual estática, mientras que las funciones =HOY() y =AHORA() devuelven la fecha y hora dinámicas que se actualizan al recalcular.',
      distractores: [
        '=HOY() inserta una fecha fija que nunca cambia aunque se abra el libro al año siguiente.',
        '=AHORA() devuelve únicamente el nombre del día de la semana en texto.',
        'Alt + F4 inserta la fecha de creación del sistema operativo en la celda A1.',
      ],
      fundamento: 'Las funciones volátiles HOY() y AHORA() sin argumentos se actualizan en cada recálculo del libro de Excel 365.',
    },
  ],
  'Tema 6 (AGE): Bases de datos: Access 365': [
    {
      concepto: 'las Consultas de acción frente a las Consultas de selección en Microsoft Access 365',
      respuestaCorrecta: 'Las consultas de acción (Creación de tabla, Anexar, Actualización y Eliminación) modifican o copian datos en las tablas, mientras que las de selección solo recuperan y muestran datos sin alterarlos.',
      distractores: [
        'Las consultas de selección borran las tablas originales cada vez que se ejecutan.',
        'Access 365 no permite actualizar ni eliminar registros mediante consultas.',
        'Las consultas de datos anexados sirven únicamente para cambiar el color de los formularios.',
      ],
      fundamento: 'En Access 365 existen cuatro tipos de consultas de acción: Crear tabla, Anexar, Actualizar y Eliminar, además de las consultas de Selección, Parámetros y Tabla de referencias cruzadas.',
    },
    {
      concepto: 'la propiedad «Actualizar en cascada los campos relacionados» dentro de una relación con Integridad referencial en Access 365',
      respuestaCorrecta: 'Si se modifica el valor de la clave principal en la tabla principal, Access actualiza automáticamente dicho valor en la clave externa de todos los registros relacionados de la tabla secundaria.',
      distractores: [
        'Elimina todos los registros de la base de datos cuando se cierra el formulario principal.',
        'Impide modificar cualquier campo de texto de la tabla principal.',
        'Duplica la tabla principal creando una copia de seguridad cada minuto.',
      ],
      fundamento: 'Dentro de la Integridad referencial, «Actualizar en cascada» propaga los cambios de clave primaria y «Eliminar en cascada» borra los registros hijos al borrar el registro padre.',
    },
    {
      concepto: 'el tipo de datos «Texto corto» frente a «Texto largo» (anteriormente Memo) en las tablas de Access 365',
      respuestaCorrecta: 'El tipo «Texto corto» almacena hasta un máximo de 255 caracteres, mientras que «Texto largo» permite almacenar grandes bloques de texto alfanumérico de hasta aproximadamente 1 GB (63.999 caracteres por interfaz).',
      distractores: [
        '«Texto corto» solo admite 8 caracteres numéricos y «Texto largo» admite un máximo de 50 caracteres.',
        'Los campos de tipo «Texto corto» no pueden ser clave principal ni indexarse.',
        '«Texto largo» solo permite almacenar fórmulas trigonométricas.',
      ],
      fundamento: 'En el diseño de tablas de Access 365, la propiedad Tamaño del campo para Texto corto se configura entre 1 y 255 caracteres.',
    },
    {
      concepto: 'las Consultas de parámetros en Microsoft Access 365',
      respuestaCorrecta: 'Al ejecutarse muestran un cuadro de diálogo solicitando al usuario un valor (definido entre corchetes [ ] en la fila Criterios) para filtrar dinámicamente los resultados.',
      distractores: [
        'Reparan automáticamente los sectores defectuosos del disco duro.',
        'Se definen escribiendo el criterio entre llaves { } en la barra de estado de Windows.',
        'Exportan la base de datos completa al servidor DNS.',
      ],
      fundamento: 'En la vista Diseño de consulta de Access 365, escribir un texto entre corchetes como [Introduzca el NIF:] en la fila Criterios convierte la consulta en parametrizada.',
    },
    {
      concepto: 'las relaciones de tipo «Varios a varios» (N:M) en el modelo relacional de Access 365',
      respuestaCorrecta: 'Se implementan creando una tercera tabla intermedia (tabla de unión o enlace) cuya clave principal suele estar compuesta por las claves externas de las dos tablas principales mediante dos relaciones de «Uno a varios».',
      distractores: [
        'Se crean arrastrando directamente dos campos de tipo Objeto OLE sin clave principal.',
        'No están permitidas en el modelo relacional ni siquiera mediante tablas intermedias.',
        'Se configuran activando una casilla especial llamada «Muchos a muchos directo» en el panel de informes.',
      ],
      fundamento: 'En Access 365, una relación N:M se descompone en dos relaciones 1:N hacia una tabla puente o intermedia.',
    },
    {
      concepto: 'la diferencia entre Importar datos y Vincular tablas externas en Access 365 (pestaña Datos externos)',
      respuestaCorrecta: 'Al importar se crea una copia local independiente de los datos dentro del archivo .accdb, mientras que al vincular se conecta en vivo al origen externo reflejando los cambios en ambos sentidos sin duplicar la tabla.',
      distractores: [
        'Al vincular se borra el archivo original de Excel o SQL Server.',
        'Al importar no es posible modificar ni consultar los registros copiados en Access.',
        'Access 365 solo permite importar archivos de imagen .bmp.',
      ],
      fundamento: 'El administrador de tablas vinculadas de Access 365 gestiona las conexiones dinámicas a orígenes externos (otras bases Access, Excel, listas de SharePoint o SQL).',
    },
    {
      concepto: 'la herramienta «Compactar y reparar base de datos» en Microsoft Access 365',
      respuestaCorrecta: 'Recupera el espacio en disco fragmentado por objetos y registros eliminados, reduce el tamaño del archivo .accdb y repara posibles corrupciones de índices.',
      distractores: [
        'Elimina todas las consultas e informes dejando únicamente la primera tabla.',
        'Comprime la base de datos en un archivo .MP4 de vídeo.',
        'Borra las relaciones e índices de clave principal para aumentar el tamaño del fichero.',
      ],
      fundamento: '«Compactar y reparar base de datos» (en Herramientas de base de datos o Archivo > Información) reorganiza el almacenamiento interno del archivo .accdb.',
    },
    {
      concepto: 'las secciones estructurales de un Informe en vista Diseño de Access 365',
      respuestaCorrecta: 'Un informe dispone de Encabezado del informe (se imprime una vez al inicio), Encabezado de página (en cada página), Encabezados/Pies de grupo, Detalle (por cada registro), Pie de página y Pie del informe (al final del todo).',
      distractores: [
        'El Encabezado del informe se repite en todas las páginas y el Encabezado de página solo aparece en la última hoja.',
        'La sección Detalle solo puede mostrar el título general de la base de datos sin campos de tabla.',
        'Los informes carecen de secciones de agrupación y ordenación.',
      ],
      fundamento: 'Para mostrar un total general al final del documento se coloca el control calculado =Suma([Importe]) en el Pie del informe (no en el Pie de página).',
    },
  ],
  'Tema 7 (AGE): Correo electrónico: Outlook 365': [
    {
      concepto: 'las Reglas de mensajes en Microsoft Outlook 365',
      respuestaCorrecta: 'Permiten automatizar acciones sobre los mensajes entrantes o salientes que cumplan determinadas condiciones (mover a una carpeta, asignar categoría, reenviar o marcar importancia).',
      distractores: [
        'Son normas gramaticales que impiden escribir correos de más de 140 caracteres.',
        'Sirven únicamente para cambiar la resolución del monitor cuando llega un correo.',
        'Solo pueden aplicarse manualmente mensaje por mensaje después de imprimirlos.',
      ],
      fundamento: 'El Asistente para reglas de Outlook 365 evalúa condiciones (remitente, palabras en el asunto, mi nombre en Para/CC) y ejecuta acciones y excepciones automáticas.',
    },
    {
      concepto: 'la diferencia entre los archivos de datos de Outlook .ost y .pst',
      respuestaCorrecta: 'El archivo .ost es una copia sincronizada sin conexión de un buzón en servidor (Exchange, Microsoft 365 o IMAP), mientras que el archivo .pst es una carpeta personal de almacenamiento local o archivo histórico.',
      distractores: [
        'El archivo .pst es una plantilla de presentación de PowerPoint y .ost es una imagen.',
        'Los archivos .ost no permiten leer correos cuando el equipo pierde la conexión a Internet.',
        'Ninguno de los dos formatos admite almacenar elementos de calendario ni contactos.',
      ],
      fundamento: 'Outlook 365 utiliza archivos .ost (Offline Storage Table) para caché de cuentas Exchange/M365/IMAP y archivos .pst (Personal Storage Table) para exportación, copia local y cuentas POP3.',
    },
    {
      concepto: 'la programación de «Respuestas automáticas (Fuera de la oficina)» en Outlook 365',
      respuestaCorrecta: 'Permite configurar el envío automático de un mensaje de aviso a quienes escriban durante un intervalo de fechas/horas, pudiendo diferenciar el texto para remitentes de dentro y de fuera de la organización.',
      distractores: [
        'Elimina permanentemente todos los correos recibidos durante las vacaciones del usuario.',
        'Envía automáticamente un mensaje a todos los contactos de la libreta aunque no nos hayan escrito.',
        'Solo funciona si el ordenador permanece encendido con la pantalla desbloqueada.',
      ],
      fundamento: 'En cuentas corporativas Microsoft 365 / Exchange, las Respuestas automáticas se procesan en el servidor aunque el cliente Outlook esté cerrado.',
    },
    {
      concepto: 'el uso del Asistente para programación al convocar una reunión en el Calendario de Outlook 365',
      respuestaCorrecta: 'Muestra visualmente la disponibilidad (Libre, Provisional, Ocupado, Fuera de la oficina) de los asistentes obligatorios y opcionales y de las salas para elegir el hueco horario óptimo.',
      distractores: [
        'Redacta automáticamente el acta de la reunión antes de que se celebre.',
        'Sustituye el servidor SMTP por una base de datos Access.',
        'Impide invitar a más de dos personas a una misma convocatoria.',
      ],
      fundamento: 'El Asistente para programación de Outlook 365 cruza los calendarios de los asistentes y recursos (salas/equipos) de la organización.',
    },
    {
      concepto: 'las Carpetas de búsqueda en Microsoft Outlook 365',
      respuestaCorrecta: 'Son carpetas virtuales que muestran una vista unificada de todos los elementos de correo que cumplen unos criterios de búsqueda específicos sin mover físicamente los mensajes de sus carpetas originales.',
      distractores: [
        'Duplican físicamente cada mensaje en el disco duro multiplicando por dos el tamaño del buzón.',
        'Al eliminar una Carpeta de búsqueda se borran únicamente los criterios de la vista virtual, o bien si se borra un mensaje dentro de ella se elimina el mensaje real.',
        'Solo pueden buscar correos recibidos en las últimas 2 horas.',
      ],
      fundamento: 'Las Carpetas de búsqueda son contenedores virtuales dinámicos; eliminar la carpeta de búsqueda solo borra la definición de la consulta, no los correos subyacentes.',
    },
    {
      concepto: 'los Grupos de contactos (Listas de distribución) en la Libreta de direcciones de Outlook 365',
      respuestaCorrecta: 'Permiten agrupar múltiples direcciones de correo bajo un único nombre para enviar mensajes o convocatorias a todo el colectivo sin teclear cada dirección individualmente.',
      distractores: [
        'Ocultan automáticamente los destinatarios como si fuera el campo CCO sin necesidad de usar CCO.',
        'Solo admiten un máximo de 3 contactos por grupo.',
        'Requieren que todos los contactos pertenezcan al mismo dominio de Internet.',
      ],
      fundamento: 'En la vista Personas (Contactos) de Outlook 365, «Nuevo grupo de contactos» agrupa destinatarios frecuentes bajo un alias común.',
    },
    {
      concepto: 'los puertos estándar asociados a los protocolos de correo electrónico (SMTP, POP3 e IMAP) con y sin cifrado TLS/SSL',
      respuestaCorrecta: 'POP3 utiliza el puerto 110 (995 con SSL/TLS), IMAP utiliza el puerto 143 (993 con SSL/TLS) y SMTP utiliza el puerto 25 o 587 para envío autenticado (465 con SSL).',
      distractores: [
        'SMTP utiliza el puerto 80, POP3 utiliza el puerto 443 e IMAP utiliza el puerto 21.',
        'Todos los protocolos de correo utilizan exclusivamente el puerto 53 UDP.',
        'IMAP carece de puerto asignado en la arquitectura TCP/IP.',
      ],
      fundamento: 'Los puertos estándar IANA para correo son: SMTP (25/587/465), POP3 (110/995) e IMAP (143/993).',
    },
    {
      concepto: 'la función «Retrasar entrega» (No entregar antes de) en las opciones de un mensaje de Outlook 365',
      respuestaCorrecta: 'Permite programar la fecha y hora a partir de la cual se enviará el mensaje, permaneciendo en la Bandeja de salida o en el servidor hasta el instante programado.',
      distractores: [
        'Retrasa la recepción de todos los correos entrantes de nuestros compañeros durante 24 horas.',
        'Envía el mensaje inmediatamente pero borra el texto en el buzón del destinatario.',
        'Solo está disponible para mensajes sin asunto.',
      ],
      fundamento: 'En la pestaña Opciones > Retrasar entrega de un mensaje nuevo en Outlook 365 se configura la entrega diferida («No entregar antes de»).',
    },
  ],
  'Tema 8 (AGE): La Red Internet': [
    {
      concepto: 'la diferencia técnica entre las direcciones IPv4 e IPv6 en la Red Internet',
      respuestaCorrecta: 'IPv4 emplea direcciones de 32 bits representadas en 4 octetos decimales separados por puntos, mientras que IPv6 emplea direcciones de 128 bits representadas en 8 grupos hexadecimales separados por dos puntos (:).',
      distractores: [
        'IPv4 utiliza direcciones de 128 bits en hexadecimal e IPv6 utiliza 16 bits en binario.',
        'IPv6 fue diseñado en 1970 y ya ha sido sustituido por completo por IPv4 debido al agotamiento de IPv6.',
        'Las direcciones IPv4 contienen obligatoriamente el símbolo @ en la mitad.',
      ],
      fundamento: 'IPv4 tiene 32 bits (ej. 192.168.1.1) e IPv6 amplía el espacio de direccionamiento a 128 bits en notación hexadecimal (ej. 2001:0db8::1).',
    },
    {
      concepto: 'el protocolo HTTPS frente al protocolo HTTP en la navegación web',
      respuestaCorrecta: 'HTTPS incorpora una capa de cifrado y autenticación mediante TLS/SSL (habitualmente sobre el puerto TCP 443), protegiendo la confidencialidad e integridad de los datos transmitidos entre navegador y servidor.',
      distractores: [
        'HTTPS transmite las contraseñas en texto plano sin cifrar por el puerto TCP 80.',
        'HTTP es más seguro que HTTPS porque no utiliza certificados digitales.',
        'HTTPS solo permite visualizar páginas web que no contengan imágenes.',
      ],
      fundamento: 'HTTP opera por defecto en el puerto 80 en texto claro, mientras que HTTPS opera en el puerto 443 cifrando el canal mediante certificados TLS.',
    },
    {
      concepto: 'la estructura de un localizador uniforme de recursos (URL) en Internet',
      respuestaCorrecta: 'Se compone del esquema o protocolo (ej. https://), el nombre de dominio o host (y puerto opcional), la ruta del recurso en el servidor y, opcionalmente, parámetros de consulta (?clave=valor) y fragmento (#ancla).',
      distractores: [
        'Debe comenzar obligatoriamente por el código postal del servidor seguido de una barra invertida \\.',
        'No puede contener barras inclinadas (/) ni puntos (.).',
        'Es idéntico a la dirección física MAC de 48 bits grabada en la tarjeta de red.',
      ],
      fundamento: 'El estándar RFC 3986 define la sintaxis de URI/URL: esquema://host[:puerto]/ruta[?query][#fragmento].',
    },
    {
      concepto: 'las cookies de navegación web y su gestión en los navegadores modernos',
      respuestaCorrecta: 'Son pequeños fragmentos de datos enviados por un sitio web y almacenados en el navegador del usuario para recordar el estado de la sesión, preferencias o seguimiento.',
      distractores: [
        'Son archivos ejecutables .exe con permisos de administrador que modifican la BIOS.',
        'Son cables físicos de fibra óptica submarina que conectan continentes.',
        'No pueden eliminarse nunca del navegador salvo formateando el disco duro.',
      ],
      fundamento: 'Las cookies (de sesión o persistentes, propias o de terceros) mantienen el estado en el protocolo HTTP(S) y pueden borrarse desde Ctrl + Mayús + Supr en el navegador.',
    },
    {
      concepto: 'el atajo de teclado en los navegadores web (Edge, Chrome, Firefox) para reabrir la última pestaña que se ha cerrado accidentalmente',
      respuestaCorrecta: 'Ctrl + Mayús + T.',
      distractores: [
        'Ctrl + W (que cierra la pestaña actual).',
        'Alt + F4 (que cierra toda la ventana del navegador).',
        'Ctrl + D (que añade la página actual a Favoritos/Marcadores).',
      ],
      fundamento: 'Ctrl + Mayús + T restaura en orden inverso las últimas pestañas cerradas en el navegador web.',
    },
    {
      concepto: 'la función de un servidor Proxy y de una red privada virtual (VPN) en el acceso a Internet',
      respuestaCorrecta: 'Una VPN crea un túnel cifrado de extremo a extremo para todo el tráfico de red del dispositivo, mientras que un Proxy actúa como intermediario de solicitudes (caché, filtrado y control de acceso) a nivel de aplicación.',
      distractores: [
        'Una VPN desactiva el cifrado de la red dejando públicos los paquetes en Internet.',
        'Un servidor Proxy es un periférico de entrada similar a un escáner óptico.',
        'Ninguno de los dos permite conectarse a redes corporativas.',
      ],
      fundamento: 'Las VPN (IPsec, OpenVPN, WireGuard) cifran el tráfico entre el cliente remoto y la red corporativa a través de Internet.',
    },
    {
      concepto: 'las capas de la arquitectura de protocolos TCP/IP utilizada en la Red Internet',
      respuestaCorrecta: 'Se estructura en 4 capas: Acceso a la red (Enlace), Internet (IP/ICMP), Transporte (TCP/UDP) y Aplicación (HTTP, DNS, SMTP, FTP, SSH).',
      distractores: [
        'Se estructura en 12 capas exclusivas para cables coaxiales analógicos.',
        'Sitúa el protocolo HTTP en la capa física y el cable Ethernet en la capa de aplicación.',
        'Carece de capa de transporte, enviando los correos directamente por Bluetooth.',
      ],
      fundamento: 'En el modelo TCP/IP, TCP (orientado a conexión y fiable) y UDP (no orientado a conexión y rápido) operan en la capa de Transporte sobre la capa de Internet (IP).',
    },
    {
      concepto: 'los operadores avanzados de búsqueda en motores de búsqueda web (como site:, filetype: y comillas "")',
      respuestaCorrecta: 'Las comillas "" buscan la frase exacta, site: restringe los resultados a un dominio concreto (ej. site:boe.es) y filetype: filtra por extensión de archivo (ej. filetype:pdf).',
      distractores: [
        'El operador site: borra el sitio web indicado del índice mundial de Internet.',
        'Las comillas "" excluyen todas las páginas que contengan esas palabras.',
        'filetype: convierte automáticamente las páginas HTML en hojas de cálculo Excel.',
      ],
      fundamento: 'Los operadores booleanos y de filtrado en buscadores permiten acotar consultas técnicas sobre dominios institucionales y formatos documentales.',
    },
  ],
  'Tema 9 (CAM): Power BI': [
    {
      concepto: 'la diferencia entre una Columna calculada y una Medida en DAX dentro de Power BI (Tema 9 CAM)',
      respuestaCorrecta: 'Una columna calculada se evalúa fila a fila durante la carga/actualización de datos y consume memoria RAM en el modelo, mientras que una medida se calcula dinámicamente en tiempo de consulta según los filtros del informe.',
      distractores: [
        'Las medidas se almacenan físicamente en cada fila de la tabla duplicando el tamaño del archivo .pbix.',
        'Las columnas calculadas no pueden utilizarse nunca como ejes ni segmentadores en un gráfico.',
        'En Power BI no es posible crear medidas con funciones de agregación como SUM o AVERAGE.',
      ],
      fundamento: 'En el motor VertiPaq de Power BI, las columnas calculadas operan en contexto de fila al procesar el modelo y las medidas operan en contexto de filtro en tiempo real.',
    },
    {
      concepto: 'las tres vistas principales del área de trabajo de Power BI Desktop (Tema 9 CAM)',
      respuestaCorrecta: 'Vista de Informe (lienzo de visualizaciones), Vista de Tabla/Datos (inspección de tablas y columnas) y Vista de Modelo (diagrama de relaciones entre tablas).',
      distractores: [
        'Vista de Diapositivas, Vista de Esquema y Clasificador de páginas.',
        'Vista de Borrador, Vista de Impresión en papel y Vista de Macros VBA.',
        'Power BI Desktop carece de vista de relaciones entre tablas.',
      ],
      fundamento: 'En la barra lateral izquierda de Power BI Desktop se alterna entre la Vista de Informe, la Vista de Tabla (Datos) y la Vista de Modelo (más la vista de consultas DAX).',
    },
    {
      concepto: 'el esquema en Estrella (Star Schema) recomendado en el modelado de datos de Power BI (Tema 9 CAM)',
      respuestaCorrecta: 'Organiza el modelo en tablas de Hechos centrales (métricas numéricas y claves) rodeadas de tablas de Dimensiones (atributos descriptivos para filtrar y agrupar, como Calendario, Unidades o Territorios) mediante relaciones 1 a varios.',
      distractores: [
        'Consiste en meter todos los datos de la organización en una única tabla de una sola columna sin relaciones.',
        'Prohíbe el uso de una tabla de Calendario o Fechas en los informes.',
        'Exige que todas las relaciones entre tablas sean de tipo Varios a varios sin claves.',
      ],
      fundamento: 'El modelo dimensional en estrella optimiza el rendimiento de DAX y evita ambigüedades en la propagación de filtros.',
    },
    {
      concepto: 'la diferencia entre un Informe (Report) y un Panel o Cuadro de mando (Dashboard) en el servicio en la nube de Power BI (Tema 9 CAM)',
      respuestaCorrecta: 'Un Informe puede tener múltiples páginas con interactividad completa y se diseña en Power BI Desktop, mientras que un Panel (Dashboard) es un lienzo de una sola página en Power BI Service que reúne iconos (tiles) anclados desde uno o varios informes.',
      distractores: [
        'Los Paneles (Dashboards) tienen hasta 500 páginas y solo pueden crearse sin conexión en Power BI Desktop.',
        'Los Informes no admiten segmentadores de datos ni filtros.',
        'No se puede anclar ningún objeto visual de un informe a un panel.',
      ],
      fundamento: 'Los Dashboards son exclusivos del servicio web Power BI Service, constan de una única página y permiten configurar alertas de datos sobre tarjetas KPI.',
    },
    {
      concepto: 'las operaciones «Combinar consultas» (Merge) y «Anexar consultas» (Append) en el Editor de Power Query de Power BI (Tema 9 CAM)',
      respuestaCorrecta: 'Combinar consultas une horizontalmente columnas de dos tablas mediante una columna común (equivalente a un JOIN en SQL), mientras que Anexar consultas apila verticalmente las filas de dos o más tablas con igual estructura (equivalente a UNION ALL).',
      distractores: [
        'Anexar consultas multiplica el número de columnas y Combinar consultas borra las filas duplicadas sin columna clave.',
        'Ambas operaciones eliminan el modelo de datos de Power BI.',
        'Solo pueden ejecutarse sobre imágenes JPEG.',
      ],
      fundamento: 'En Power Query, Merge Queries realiza uniones relacionales (Left Outer, Inner, Full Outer, Anti-join) y Append Queries concatena filas.',
    },
    {
      concepto: 'la función «Anular dinamización de columnas» (Unpivot Columns) en Power Query dentro de Power BI (Tema 9 CAM)',
      respuestaCorrecta: 'Transforma columnas que representan periodos o categorías (ej. Enero, Febrero, Marzo...) en dos columnas normalizadas («Atributo» y «Valor»), facilitando el análisis tabular.',
      distractores: [
        'Elimina todas las columnas numéricas del origen de datos.',
        'Bloquea la actualización programada del conjunto de datos en la nube.',
        'Convierte un gráfico de barras en una tabla de Word.',
      ],
      fundamento: 'Unpivot Columns convierte tablas cruzadas o matrices anchas en un formato tabular vertical óptimo para el motor de Power BI.',
    },
    {
      concepto: 'los modos de almacenamiento y conexión de datos en Power BI: Importar (Import) frente a DirectQuery (Tema 9 CAM)',
      respuestaCorrecta: 'El modo Importar carga y comprime una copia de los datos en memoria ofreciendo el máximo rendimiento DAX, mientras que DirectQuery consulta directamente la base de datos de origen en tiempo real sin copiar los datos al archivo .pbix.',
      distractores: [
        'El modo Importar borra los datos del servidor SQL original al finalizar la carga.',
        'DirectQuery funciona únicamente cuando el ordenador está desconectado de la red.',
        'En modo Importar no se permite usar el Editor de Power Query.',
      ],
      fundamento: 'Power BI admite modo Import (en memoria VertiPaq), DirectQuery (consultas en directo al origen) y Modelos compuestos (Dual).',
    },
    {
      concepto: 'la Seguridad a nivel de fila (Row-Level Security - RLS) en Power BI (Tema 9 CAM)',
      respuestaCorrecta: 'Permite definir roles con filtros DAX en Power BI Desktop y asignar usuarios o grupos en Power BI Service para que cada usuario vea únicamente los datos autorizados para su unidad o ámbito.',
      distractores: [
        'Oculta la barra de tareas de Windows al abrir el navegador.',
        'Impide que dos personas abran el mismo informe en el mismo día.',
        'Cifra el nombre de las columnas en lenguaje binario para el autor del informe.',
      ],
      fundamento: 'RLS (pestaña Modelado > Administrar roles) restringe el acceso a las filas de datos para distintos usuarios sobre un mismo informe publicado.',
    },
  ],
  'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)': [
    {
      concepto: 'el almacenamiento de archivos compartidos en chats privados (1 a 1 o grupales) frente a canales de equipos en Microsoft Teams (Tema 10 CAM)',
      respuestaCorrecta: 'Los archivos compartidos en un chat privado se guardan en la carpeta «Archivos de chat de Microsoft Teams» del OneDrive para la Empresa del usuario que los sube, mientras que los compartidos en un canal se guardan en el sitio de SharePoint Online del equipo.',
      distractores: [
        'Tanto los archivos de chats privados como los de canales se guardan únicamente en la Papelera de reciclaje local.',
        'Los archivos de un chat privado se publican automáticamente en el sitio web público de Internet.',
        'Microsoft Teams no permite adjuntar ni compartir documentos de Office.',
      ],
      fundamento: 'La arquitectura de Microsoft 365 delega el almacenamiento de chats en OneDrive for Business y el de equipos/canales en SharePoint Online.',
    },
    {
      concepto: 'la funcionalidad «Archivos a petición» (Files On-Demand) del cliente de sincronización de OneDrive en Windows (Tema 10 CAM)',
      respuestaCorrecta: 'Permite ver y navegar en el Explorador de Windows por todos los archivos de la nube sin ocupar espacio en el disco local hasta que se abren (icono de nube azul), pudiendo marcar carpetas como «Mantener siempre en este dispositivo» (círculo verde sólido).',
      distractores: [
        'Descarga obligatoriamente todos los terabytes de SharePoint al disco C: bloqueando el equipo.',
        'Elimina de la nube cualquier archivo que se cierre en el ordenador.',
        'Impide abrir documentos de Word si el equipo está conectado por cable Ethernet.',
      ],
      fundamento: 'Archivos a petición de OneDrive utiliza tres estados de icono: solo en línea (nube azul), disponible localmente (círculo blanco con check verde) y disponible siempre sin conexión (círculo verde relleno).',
    },
    {
      concepto: 'la Coautoría en tiempo real e Historial de versiones en documentos de Word, Excel y PowerPoint alojados en SharePoint u OneDrive (Tema 10 CAM)',
      respuestaCorrecta: 'Permite que varios usuarios editen simultáneamente el mismo documento viendo la posición de los cursores de sus compañeros, guardando los cambios automáticamente (Autoguardado) y conservando un historial de versiones restaurables.',
      distractores: [
        'Sobrescribe y destruye el trabajo del resto de usuarios dejando solo la copia del último en cerrar.',
        'Exige desactivar el Autoguardado y enviar el archivo por correo POP3 a cada participante.',
        'Solo permite que una persona abra el documento en modo lectura y ninguna en modo edición.',
      ],
      fundamento: 'Al alojar ficheros OpenXML (.docx, .xlsx, .pptx) en SharePoint Online u OneDrive, Microsoft 365 habilita la coautoría concurrente y el control de versiones.',
    },
    {
      concepto: 'las Salas para subgrupos (Breakout Rooms) en las videoconferencias de Microsoft Teams (Tema 10 CAM)',
      respuestaCorrecta: 'Permiten al organizador de la reunión dividir a los asistentes en salas de trabajo más pequeñas (de forma automática o manual) para debates en grupo y volver a reunirlos después en la sesión principal.',
      distractores: [
        'Cierran definitivamente la reunión expulsando a todos los usuarios de la organización.',
        'Desinstalan la cámara web y el micrófono de los participantes.',
        'Solo pueden utilizarse en llamadas telefónicas analógicas sin vídeo.',
      ],
      fundamento: 'El organizador o los administradores de salas para subgrupos en Teams pueden crear hasta 50 salas secundarias, fijar temporizadores y enviar anuncios a todas ellas.',
    },
    {
      concepto: 'las Bibliotecas de documentos frente a las Listas en un sitio de Microsoft SharePoint Online (Tema 10 CAM)',
      respuestaCorrecta: 'Las Bibliotecas de documentos están diseñadas para almacenar, clasificar con metadatos, versionar y gestionar permisos sobre ficheros, mientras que las Listas almacenan registros estructurados en filas y columnas (similar a una tabla).',
      distractores: [
        'Las Bibliotecas de documentos no admiten subir archivos PDF ni Word, solo números enteros.',
        'Las Listas de SharePoint sirven únicamente para reproducir música en streaming.',
        'En SharePoint Online no se pueden crear columnas de metadatos personalizadas.',
      ],
      fundamento: 'SharePoint Online estructura la información del sitio en Listas (datos tabulares, seguimiento de tareas/incidencias) y Bibliotecas de documentos (gestión documental con control de versiones mayor/menor y aprobación).',
    },
    {
      concepto: 'la función « Extraer del archivo » (Check Out / Proteger) en una Biblioteca de documentos de SharePoint Online (Tema 10 CAM)',
      respuestaCorrecta: 'Bloquea temporalmente el documento frente a la edición por parte de otros usuarios mientras la persona que lo ha extraído realiza cambios, hasta que vuelve a «Insertar en el archivo» (Check In / Desproteger) publicando la nueva versión.',
      distractores: [
        'Borra el documento de la biblioteca y lo envía a la papelera del sitio.',
        'Imprime automáticamente 100 copias del documento en la impresora de red.',
        'Comparte el archivo públicamente con cualquier usuario anónimo de Internet.',
      ],
      fundamento: 'El mecanismo Check-Out / Check-In de SharePoint garantiza la edición exclusiva cuando se requiere evitar ediciones concurrentes hasta completar una revisión formal.',
    },
    {
      concepto: 'los niveles de permisos predeterminados en un sitio de SharePoint Online (Propietarios, Integrantes/Miembros y Visitantes) (Tema 10 CAM)',
      respuestaCorrecta: 'Los Propietarios tienen Control total sobre el sitio, los Integrantes (Miembros) tienen permisos de Edición (crear, editar y eliminar documentos/elementos) y los Visitantes tienen permisos de solo Lectura.',
      distractores: [
        'Los Visitantes tienen Control total para eliminar el sitio completo y los Propietarios solo pueden leer.',
        'Todos los usuarios tienen exactamente los mismos permisos sin posibilidad de restricción.',
        'SharePoint Online no permite romper la herencia de permisos en una carpeta o biblioteca.',
      ],
      fundamento: 'SharePoint Online gestiona la seguridad mediante grupos predeterminados (Propietarios, Miembros, Visitantes) y permite permisos únicos rompiendo la herencia cuando es necesario.',
    },
    {
      concepto: 'las opciones de uso compartido de vínculos en OneDrive y SharePoint Online (Tema 10 CAM)',
      respuestaCorrecta: 'Permiten elegir el alcance del vínculo («Cualquier persona con el vínculo», «Usuarios de la organización», «Personas con acceso existente» o «Personas determinadas»), definir si permite editar o solo ver, fijar fecha de expiración y bloquear la descarga.',
      distractores: [
        'Obligan siempre a que cualquier enlace compartido sea público e indexado en buscadores sin fecha de caducidad.',
        'No permiten compartir carpetas, únicamente archivos de menos de 1 KB.',
        'Envían la contraseña de inicio de sesión del autor a todos los destinatarios del enlace.',
      ],
      fundamento: 'El diálogo Compartir de OneDrive y SharePoint Online proporciona control granular de permisos (Edición / Solo visualización / Bloquear descarga / Caducidad).',
    },
  ],
};

// Ampliar automáticamente PREGUNTAS_OFICIALES_INFORMATICA_10_TEMAS con las preguntas de BATERIA_CONCEPTOS_POR_TEMA_INFORMATICA
// para que cada uno de los 10 temas oficiales tenga al menos 10 preguntas reales en el banco base
let nextInfoId = 9100;
Object.entries(BATERIA_CONCEPTOS_POR_TEMA_INFORMATICA).forEach(([temaEtiqueta, listaConceptos]) => {
  listaConceptos.forEach((item) => {
    PREGUNTAS_OFICIALES_INFORMATICA_10_TEMAS.push({
      id: nextInfoId++,
      enunciado: `En relación con ${item.concepto} (${temaEtiqueta}), señale la afirmación correcta:`,
      opciones: [
        {
          id: 'A',
          texto: item.respuestaCorrecta,
          esCorrecta: true,
          explicacion: item.fundamento,
        },
        {
          id: 'B',
          texto: item.distractores[0],
          esCorrecta: false,
          explicacion: 'Afirmación técnica incorrecta conforme al temario oficial de informática.',
        },
        {
          id: 'C',
          texto: item.distractores[1],
          esCorrecta: false,
          explicacion: 'Distractor técnico incompatible con el funcionamiento real de la herramienta.',
        },
        {
          id: 'D',
          texto: item.distractores[2],
          esCorrecta: false,
          explicacion: 'Opción falsa que no se corresponde con las especificaciones del programa.',
        },
      ],
      leyesRelacionadas: [temaEtiqueta],
      justificacionLegal: {
        norma: temaEtiqueta,
        articulo: 'Especificación técnica oficial del bloque de Informática y Ofimática',
        fundamento: item.fundamento,
      },
    });
  });
});

/**
 * Genera preguntas adicionales bajo demanda para cualquier tema oficial de Informática o Ley del BOE
 * cuando el usuario solicita en el configurador aleatorio un número de preguntas superior a las existentes en la base.
 */
export function generarPreguntasAdicionalesMateria(
  nombreMateria: string,
  esInformatica: boolean,
  cantidadNecesaria: number,
  preguntasBase: PreguntaExamen[]
): PreguntaExamen[] {
  const resultado: PreguntaExamen[] = [];
  if (cantidadNecesaria <= 0) return resultado;

  const plantillasFuente =
    preguntasBase.length > 0
      ? preguntasBase
      : PREGUNTAS_OFICIALES_INFORMATICA_10_TEMAS;

  const letras: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  for (let i = 0; i < cantidadNecesaria; i++) {
    const base = plantillasFuente[i % plantillasFuente.length];
    const numVariante = i + 1;
    const rotacion = (i + 1) % 4;

    // Rotar el orden de las opciones para que la letra correcta varíe equilibradamente (A, B, C, D)
    const textosRotados = [0, 1, 2, 3].map((idx) => {
      const orig = base.opciones[(idx + rotacion) % base.opciones.length];
      return {
        id: letras[idx],
        texto: orig.texto,
        esCorrecta: orig.esCorrecta,
        explicacion: orig.explicacion,
      };
    });

    const prefijo = esInformatica
      ? `[Supuesto Técnico #${numVariante} · ${nombreMateria}]`
      : `[Cuestión Normativa #${numVariante} · ${nombreMateria}]`;

    resultado.push({
      ...base,
      id: 95000 + i,
      enunciado: `${prefijo} ${base.enunciado}`,
      opciones: textosRotados,
      leyesRelacionadas: [nombreMateria],
      justificacionLegal: {
        ...(base.justificacionLegal || {
          norma: nombreMateria,
          articulo: 'Precepto / Especificación aplicable',
          fundamento: 'Fundamentación técnica y normativa verificada.',
        }),
        norma: nombreMateria,
      },
    });
  }

  return resultado;
}

