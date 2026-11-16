export interface AspectoEstructuralNorma {
  id: string;
  etiquetaCorta: string;
  descripcionCompleta: string;
  articulosClave?: string;
  palabrasClaveFiltro?: string[];
}

export interface EstructuraNormaBOE {
  idBOE: string;
  patronesIdentificacion: string[];
  siglaCorta: string;
  aspectos: AspectoEstructuralNorma[];
}

/**
 * Catálogo estructurado oficial de Títulos, Capítulos, Secciones y Bloques de Artículos
 * de las Leyes, Reales Decretos, Convenio Colectivo y Temas Oficiales C1 (AGE y CAM).
 * Permite acotar la generación por IA a un aspecto concreto de una norma.
 */
export const ESTRUCTURA_DETALLADA_LEYES_BOE: EstructuraNormaBOE[] = [
  {
    idBOE: 'BOE-A-2015-10565',
    patronesIdentificacion: ['39/2015', 'lpacap', 'procedimiento administrativo comun'],
    siglaCorta: 'Ley 39/2015 (LPACAP)',
    aspectos: [
      {
        id: 'l39_tp',
        etiquetaCorta: 'Título Preliminar · Disposiciones generales (Arts. 1–2)',
        descripcionCompleta: 'Título Preliminar: Objeto de la Ley y ámbito subjetivo de aplicación (artículos 1 y 2)',
        articulosClave: '1, 2',
        palabrasClaveFiltro: ['artículo 1', 'artículo 2', 'ámbito subjetivo', 'sector público'],
      },
      {
        id: 'l39_t1_c1',
        etiquetaCorta: 'Título I · Cap. I: Capacidad y concepto de interesado (Arts. 3–8)',
        descripcionCompleta: 'Título I, Capítulo I: La capacidad de obrar, concepto de interesado, representación y registros electrónicos de apoderamientos (artículos 3 a 8)',
        articulosClave: '3, 4, 5, 6, 7, 8',
        palabrasClaveFiltro: ['interesado', 'representación', 'apoderamiento', 'capacidad de obrar'],
      },
      {
        id: 'l39_t1_c2',
        etiquetaCorta: 'Título I · Cap. II: Identificación y firma de los interesados (Arts. 9–12)',
        descripcionCompleta: 'Título I, Capítulo II: Sistemas de identificación y firma de los interesados en el procedimiento y asistencia en el uso de medios electrónicos (artículos 9 a 12)',
        articulosClave: '9, 10, 11, 12',
        palabrasClaveFiltro: ['identificación', 'firma', 'funcionario habilitado'],
      },
      {
        id: 'l39_t2_c1',
        etiquetaCorta: 'Título II · Cap. I: Normas generales, Registros, Archivo y Silencio (Arts. 13–28)',
        descripcionCompleta: 'Título II, Capítulo I: Derechos de las personas, lengua, registros electrónicos, archivo único, obligación de resolver, silencio administrativo y documentos y copias (artículos 13 a 28)',
        articulosClave: '13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28',
        palabrasClaveFiltro: ['silencio', 'obligación de resolver', 'registro electrónico', 'copias auténticas', 'artículo 21', 'artículo 24'],
      },
      {
        id: 'l39_t2_c2',
        etiquetaCorta: 'Título II · Cap. II: Términos y plazos y su cómputo (Arts. 29–33)',
        descripcionCompleta: 'Título II, Capítulo II: Obligatoriedad de términos y plazos, cómputo de plazos por horas, días, meses y años, ampliación y tramitación de urgencia (artículos 29 a 33)',
        articulosClave: '29, 30, 31, 32, 33',
        palabrasClaveFiltro: ['artículo 30', 'artículo 31', 'artículo 32', 'artículo 33', 'cómputo', 'plazo', 'urgencia', 'días hábiles'],
      },
      {
        id: 'l39_t3_c1_c2',
        etiquetaCorta: 'Título III · Cap. I y II: Eficacia de los actos y Notificaciones (Arts. 34–46)',
        descripcionCompleta: 'Título III, Capítulos I y II: Requisitos de los actos administrativos, motivación, eficacia, práctica de notificaciones en papel y por medios electrónicos y publicación (artículos 34 a 46)',
        articulosClave: '34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46',
        palabrasClaveFiltro: ['motivación', 'notificación', 'artículo 35', 'artículo 40', 'artículo 42', 'artículo 43'],
      },
      {
        id: 'l39_t3_c3',
        etiquetaCorta: 'Título III · Cap. III: Nulidad y anulabilidad (Arts. 47–52)',
        descripcionCompleta: 'Título III, Capítulo III: Nulidad de pleno derecho, anulabilidad, límites a la extensión, conversión, conservación y convalidación de actos (artículos 47 a 52)',
        articulosClave: '47, 48, 49, 50, 51, 52',
        palabrasClaveFiltro: ['nulidad', 'anulabilidad', 'convalidación', 'artículo 47', 'artículo 48', 'artículo 52'],
      },
      {
        id: 'l39_t4_fases',
        etiquetaCorta: 'Título IV · Cap. I–V: Fases del Procedimiento: Iniciación a Finalización (Arts. 53–95)',
        descripcionCompleta: 'Título IV, Capítulos I a V: Derechos del interesado, iniciación de oficio y a solicitud, medidas provisionales, subsanación, ordenación, instrucción, prueba, informes, audiencia, resolución, desistimiento, renuncia y caducidad (artículos 53 a 95)',
        articulosClave: '53, 56, 66, 68, 70, 77, 80, 82, 84, 88, 94, 95',
        palabrasClaveFiltro: ['subsanación', 'audiencia', 'informes', 'prueba', 'caducidad', 'desistimiento', 'medidas provisionales'],
      },
      {
        id: 'l39_t4_c6_c7',
        etiquetaCorta: 'Título IV · Cap. VI y VII: Tramitación simplificada y Ejecución forzosa (Arts. 96–105)',
        descripcionCompleta: 'Título IV, Capítulos VI y VII: Tramitación simplificada del procedimiento administrativo común y medios de ejecución forzosa: apremio, ejecución subsidiaria, multa coercitiva y compulsión (artículos 96 a 105)',
        articulosClave: '96, 97, 98, 99, 100, 101, 102, 103, 104, 105',
        palabrasClaveFiltro: ['simplificada', 'ejecución forzosa', 'apremio', 'multa coercitiva', 'artículo 96', 'artículo 100'],
      },
      {
        id: 'l39_t5_c1',
        etiquetaCorta: 'Título V · Cap. I: Revisión de oficio y declaración de lesividad (Arts. 106–111)',
        descripcionCompleta: 'Título V, Capítulo I: Revisión de disposiciones y actos nulos, declaración de lesividad de actos anulables, suspensión, revocación y rectificación de errores (artículos 106 a 111)',
        articulosClave: '106, 107, 108, 109, 110, 111',
        palabrasClaveFiltro: ['revisión de oficio', 'lesividad', 'revocación', 'rectificación de errores', 'artículo 106', 'artículo 107'],
      },
      {
        id: 'l39_t5_c2',
        etiquetaCorta: 'Título V · Cap. II: Recursos administrativos (Alzada, Reposición y Revisión, Arts. 112–126)',
        descripcionCompleta: 'Título V, Capítulo II: Principios generales de los recursos administrativos, fin de la vía administrativa, recurso de alzada, potestativo de reposición y extraordinario de revisión (artículos 112 a 126)',
        articulosClave: '112, 114, 115, 116, 117, 121, 122, 123, 124, 125, 126',
        palabrasClaveFiltro: ['alzada', 'reposición', 'extraordinario de revisión', 'vía administrativa', 'artículo 114', 'artículo 121', 'artículo 123', 'artículo 125'],
      },
      {
        id: 'l39_t6',
        etiquetaCorta: 'Título VI · Iniciativa legislativa y potestad reglamentaria (Arts. 127–133)',
        descripcionCompleta: 'Título VI: Principios de buena regulación, planificación normativa, evaluación normativa y consulta pública y audiencia ciudadana (artículos 127 a 133)',
        articulosClave: '127, 128, 129, 130, 131, 132, 133',
        palabrasClaveFiltro: ['buena regulación', 'plan anual normativo', 'consulta pública', 'artículo 129', 'artículo 133'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2015-10566',
    patronesIdentificacion: ['40/2015', 'lrjsp', 'regimen juridico del sector publico'],
    siglaCorta: 'Ley 40/2015 (LRJSP)',
    aspectos: [
      {
        id: 'l40_tp_c2_s1_s2',
        etiquetaCorta: 'Título Preliminar · Cap. II Secc. 1ª–2ª: Órganos y Competencia (Arts. 5–14)',
        descripcionCompleta: 'Título Preliminar, Capítulo II, Secciones 1ª y 2ª: Órganos administrativos, competencia, delegación de competencias, avocación, encomienda de gestión, delegación de firma y suplencia (artículos 5 a 14)',
        articulosClave: '5, 8, 9, 10, 11, 12, 13, 14',
        palabrasClaveFiltro: ['delegación', 'avocación', 'encomienda', 'suplencia', 'delegación de firma', 'artículo 9', 'artículo 10'],
      },
      {
        id: 'l40_tp_c2_s3_s4',
        etiquetaCorta: 'Título Preliminar · Cap. II Secc. 3ª–4ª: Órganos colegiados, Abstención y Recusación (Arts. 15–24)',
        descripcionCompleta: 'Título Preliminar, Capítulo II, Secciones 3ª y 4ª: Funcionamiento de los órganos colegiados, convocatorias, actas, abstención y recusación (artículos 15 a 24)',
        articulosClave: '15, 16, 17, 18, 19, 23, 24',
        palabrasClaveFiltro: ['órgano colegiado', 'abstención', 'recusación', 'artículo 17', 'artículo 19', 'artículo 23', 'artículo 24'],
      },
      {
        id: 'l40_tp_c3_c4',
        etiquetaCorta: 'Título Preliminar · Cap. III y IV: Potestad sancionadora y Responsabilidad patrimonial (Arts. 25–37)',
        descripcionCompleta: 'Título Preliminar, Capítulos III y IV: Principios de la potestad sancionadora, prescripción de infracciones y sanciones, y responsabilidad patrimonial de las Administraciones Públicas y de sus autoridades (artículos 25 a 37)',
        articulosClave: '25, 26, 27, 28, 29, 30, 32, 33, 34, 36',
        palabrasClaveFiltro: ['potestad sancionadora', 'prescripción', 'responsabilidad patrimonial', 'artículo 30', 'artículo 32', 'artículo 36'],
      },
      {
        id: 'l40_tp_c5_c6',
        etiquetaCorta: 'Título Preliminar · Cap. V y VI: Funcionamiento electrónico y Convenios (Arts. 38–53)',
        descripcionCompleta: 'Título Preliminar, Capítulos V y VI: Sede electrónica, portal de internet, actuación administrativa automatizada, archivo electrónico y régimen jurídico, vigencia y extinción de los Convenios (artículos 38 a 53)',
        articulosClave: '38, 39, 40, 41, 42, 47, 48, 49, 50, 51',
        palabrasClaveFiltro: ['sede electrónica', 'actuación administrativa automatizada', 'convenio', 'artículo 47', 'artículo 49'],
      },
      {
        id: 'l40_t1',
        etiquetaCorta: 'Título I · Administración General del Estado: Central, Territorial y Exterior (Arts. 54–80)',
        descripcionCompleta: 'Título I: Organización administrativa de la AGE, Ministros, Secretarios de Estado, Subsecretarios, Secretarios Generales, Secretarios Generales Técnicos, Directores y Subdirectores Generales, Delegados y Subdelegados del Gobierno (artículos 54 a 80)',
        articulosClave: '54, 55, 56, 61, 62, 63, 64, 65, 66, 67, 72, 73, 74, 75',
        palabrasClaveFiltro: ['subsecretario', 'secretario general técnico', 'director general', 'delegado del gobierno', 'subdelegado'],
      },
      {
        id: 'l40_t2_t3',
        etiquetaCorta: 'Títulos II y III · Sector Público Institucional y Relaciones Interadministrativas (Arts. 81–158)',
        descripcionCompleta: 'Títulos II y III: Organismos autónomos, entidades públicas empresariales, agencias estatales, autoridades administrativas independientes, consorcios, fundaciones y Conferencias Sectoriales (artículos 81 a 158)',
        articulosClave: '84, 88, 98, 103, 118, 140, 147, 151',
        palabrasClaveFiltro: ['organismo autónomo', 'entidad pública empresarial', 'consorcio', 'conferencia sectorial'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2015-11719',
    patronesIdentificacion: ['5/2015', 'trebep', 'estatuto basico del empleado publico'],
    siglaCorta: 'TREBEP (RDL 5/2015)',
    aspectos: [
      {
        id: 'trebep_t1_t2',
        etiquetaCorta: 'Títulos I y II · Ámbito y Clases de personal (Arts. 1–13)',
        descripcionCompleta: 'Títulos I y II: Objeto, ámbito de aplicación y clases de personal: funcionarios de carrera, funcionarios interinos, personal laboral, personal eventual y personal directivo profesional (artículos 1 a 13)',
        articulosClave: '1, 2, 8, 9, 10, 11, 12, 13',
        palabrasClaveFiltro: ['interino', 'eventual', 'funcionario de carrera', 'personal directivo', 'artículo 10', 'artículo 12'],
      },
      {
        id: 'trebep_t3_c1_c3',
        etiquetaCorta: 'Título III · Cap. I–III: Derechos, Carrera profesional y Retribuciones (Arts. 14–30)',
        descripcionCompleta: 'Título III, Capítulos I a III: Derechos individuales e individuales ejercidos colectivamente, carrera horizontal y vertical, promoción interna, evaluación del desempeño y régimen retributivo (artículos 14 a 30)',
        articulosClave: '14, 15, 16, 17, 18, 20, 22, 23, 24',
        palabrasClaveFiltro: ['derechos individuales', 'carrera horizontal', 'promoción interna', 'retribuciones básicas', 'trienios', 'artículo 14', 'artículo 15'],
      },
      {
        id: 'trebep_t3_c4',
        etiquetaCorta: 'Título III · Cap. IV: Negociación colectiva, Juntas de Personal y Delegados (Arts. 31–46)',
        descripcionCompleta: 'Título III, Capítulo IV: Derecho a la negociación colectiva, Mesas de Negociación, Juntas de Personal y Delegados de Personal, garantías y crédito horario (artículos 31 a 46)',
        articulosClave: '31, 34, 36, 37, 39, 40, 41',
        palabrasClaveFiltro: ['mesa general', 'junta de personal', 'delegados de personal', 'negociación colectiva', 'artículo 37', 'artículo 39'],
      },
      {
        id: 'trebep_t3_c5_c6',
        etiquetaCorta: 'Título III · Cap. V y VI: Jornada, Permisos, Vacaciones y Código de Conducta (Arts. 47–54)',
        descripcionCompleta: 'Título III, Capítulos V y VI: Jornada de trabajo, permisos de los funcionarios públicos, permisos por motivos de conciliación, vacaciones y deberes y principios éticos y de conducta (artículos 47 a 54)',
        articulosClave: '47, 48, 49, 50, 52, 53, 54',
        palabrasClaveFiltro: ['permiso', 'vacaciones', 'asuntos particulares', 'conciliación', 'principios éticos', 'artículo 48', 'artículo 49', 'artículo 50'],
      },
      {
        id: 'trebep_t4_t5',
        etiquetaCorta: 'Títulos IV y V · Adquisición/Pérdida de la condición y Provisión de puestos (Arts. 55–84)',
        descripcionCompleta: 'Títulos IV y V: Acceso al empleo público, órganos de selección, adquisición y pérdida de la condición de funcionario, rehabilitación, RPT, concurso y libre designación (artículos 55 a 84)',
        articulosClave: '55, 56, 60, 61, 62, 63, 64, 67, 68, 74, 78, 79, 80',
        palabrasClaveFiltro: ['acceso', 'órganos de selección', 'renuncia', 'jubilación', 'rehabilitación', 'libre designación', 'artículo 60', 'artículo 62', 'artículo 63'],
      },
      {
        id: 'trebep_t6',
        etiquetaCorta: 'Título VI · Situaciones administrativas (Arts. 85–92)',
        descripcionCompleta: 'Título VI: Servicio activo, servicios especiales, servicio en otras Administraciones Públicas, excedencias (interés particular, agrupación familiar, cuidado de familiares, violencia de género/terrorista) y suspensión de funciones (artículos 85 a 92)',
        articulosClave: '85, 86, 87, 88, 89, 90, 91',
        palabrasClaveFiltro: ['servicios especiales', 'excedencia', 'suspensión de funciones', 'artículo 85', 'artículo 87', 'artículo 89', 'artículo 90'],
      },
      {
        id: 'trebep_t7',
        etiquetaCorta: 'Título VII · Régimen disciplinario: Faltas, Sanciones y Prescripción (Arts. 93–98)',
        descripcionCompleta: 'Título VII: Responsabilidad disciplinaria, faltas muy graves, graves y leves, sanciones disciplinarias, prescripción de faltas y sanciones y medidas provisionales (artículos 93 a 98)',
        articulosClave: '93, 94, 95, 96, 97, 98',
        palabrasClaveFiltro: ['disciplinario', 'falta muy grave', 'sanción', 'prescripción', 'suspensión provisional', 'artículo 95', 'artículo 96', 'artículo 97', 'artículo 98'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1978-31229',
    patronesIdentificacion: ['constitucion', 'ce 1978', '1978'],
    siglaCorta: 'Constitución Española',
    aspectos: [
      {
        id: 'ce_tp_t1',
        etiquetaCorta: 'Título Preliminar y Título I · Derechos y Deberes Fundamentales y Garantías (Arts. 1–55)',
        descripcionCompleta: 'Título Preliminar y Título I: Valores superiores, derechos fundamentales y libertades públicas, garantías normativas y jurisdiccionales, Defensor del Pueblo y suspensión de derechos (artículos 1 a 55)',
        articulosClave: '1, 9, 14, 15, 17, 18, 20, 23, 24, 53, 54, 55',
        palabrasClaveFiltro: ['derechos fundamentales', 'defensor del pueblo', 'artículo 1', 'artículo 9', 'artículo 14', 'artículo 53', 'artículo 54', 'artículo 55'],
      },
      {
        id: 'ce_t2',
        etiquetaCorta: 'Título II · De la Corona (Arts. 56–65)',
        descripcionCompleta: 'Título II: De la Corona: el Rey, sucesión, Regencia, tutela, funciones constitucionales y refrendo (artículos 56 a 65)',
        articulosClave: '56, 57, 59, 60, 62, 64, 65',
        palabrasClaveFiltro: ['corona', 'regencia', 'refrendo', 'artículo 56', 'artículo 57', 'artículo 62', 'artículo 64'],
      },
      {
        id: 'ce_t3',
        etiquetaCorta: 'Título III · De las Cortes Generales y Elaboración de las Leyes (Arts. 66–96)',
        descripcionCompleta: 'Título III: Congreso de los Diputados y Senado, estatuto de parlamentarios, Diputación Permanente, elaboración de las leyes, decretos-leyes, decretos legislativos y tratados internacionales (artículos 66 a 96)',
        articulosClave: '66, 68, 69, 78, 81, 82, 86, 87, 90, 94',
        palabrasClaveFiltro: ['congreso', 'senado', 'diputación permanente', 'decreto-ley', 'ley orgánica', 'artículo 81', 'artículo 82', 'artículo 86'],
      },
      {
        id: 'ce_t4_t5',
        etiquetaCorta: 'Títulos IV y V · Gobierno, Administración y Relaciones con las Cortes (Arts. 97–116)',
        descripcionCompleta: 'Títulos IV y V: El Gobierno y la Administración, investidura del Presidente, Consejo de Estado, cuestión de confianza, moción de censura, disolución y estados de alarma, excepción y sitio (artículos 97 a 116)',
        articulosClave: '97, 98, 99, 103, 105, 106, 107, 112, 113, 115, 116',
        palabrasClaveFiltro: ['investidura', 'moción de censura', 'cuestión de confianza', 'alarma', 'excepción', 'artículo 99', 'artículo 103', 'artículo 113', 'artículo 116'],
      },
      {
        id: 'ce_t6_t9_t10',
        etiquetaCorta: 'Títulos VI, IX y X · Poder Judicial, Tribunal Constitucional y Reforma (Arts. 117–127 y 159–169)',
        descripcionCompleta: 'Títulos VI, IX y X: Poder Judicial y CGPJ, Ministerio Fiscal, Tribunal Constitucional y procedimientos de reforma constitucional ordinaria y agravada (artículos 117 a 127 y 159 a 169)',
        articulosClave: '117, 122, 124, 159, 161, 162, 167, 168',
        palabrasClaveFiltro: ['poder judicial', 'cgpj', 'tribunal constitucional', 'reforma constitucional', 'artículo 122', 'artículo 159', 'artículo 167', 'artículo 168'],
      },
      {
        id: 'ce_t8',
        etiquetaCorta: 'Título VIII · Organización Territorial del Estado y CCAA (Arts. 137–158)',
        descripcionCompleta: 'Título VIII: Administración Local, Comunidades Autónomas, vías de acceso, Estatutos de Autonomía y distribución de competencias de los artículos 148, 149 y 150 (artículos 137 a 158)',
        articulosClave: '137, 140, 141, 143, 147, 148, 149, 150, 155',
        palabrasClaveFiltro: ['municipio', 'provincia', 'comunidades autónomas', 'artículo 148', 'artículo 149', 'artículo 150', 'artículo 155'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1995-8729',
    patronesIdentificacion: ['364/1995'],
    siglaCorta: 'RD 364/1995 (Ingreso y Provisión AGE)',
    aspectos: [
      {
        id: 'rd364_t1',
        etiquetaCorta: 'Título I · Ingreso del personal al servicio de la AGE (Arts. 1–27)',
        descripcionCompleta: 'Título I: Oferta de Empleo Público, sistemas selectivos (oposición, concurso-oposición, concurso), convocatorias, órganos de selección y nombramiento (artículos 1 a 27)',
        articulosClave: '1, 4, 15, 16, 19, 22, 25',
        palabrasClaveFiltro: ['ingreso', 'convocatoria', 'nombramiento', 'prácticas'],
      },
      {
        id: 'rd364_t3_c2',
        etiquetaCorta: 'Título III · Cap. II: Concurso de méritos y Plazos posesorios (Arts. 39–50)',
        descripcionCompleta: 'Título III, Capítulo II: Provisión de puestos mediante concurso general y específico, requisitos de permanencia de 2 años, valoración de méritos, cese y plazos de toma de posesión de 3 días hábiles o 1 mes (artículos 39 a 50)',
        articulosClave: '39, 41, 44, 48',
        palabrasClaveFiltro: ['concurso', 'toma de posesión', 'artículo 41', 'artículo 44', 'artículo 48'],
      },
      {
        id: 'rd364_t3_c3_c4',
        etiquetaCorta: 'Título III · Cap. III–IV: Libre designación, Comisiones de servicio y Reasignación (Arts. 51–72)',
        descripcionCompleta: 'Título III, Capítulos III y IV: Libre designación, remoción del puesto, comisiones de servicios voluntarias y forzosas, redistribución de efectivos, reasignación de efectivos y adscripción provisional (artículos 51 a 72)',
        articulosClave: '50, 51, 56, 58, 59, 60, 61, 63, 64, 72',
        palabrasClaveFiltro: ['libre designación', 'comisión de servicios', 'reasignación', 'redistribución', 'adscripción provisional', 'artículo 63', 'artículo 64'],
      },
      {
        id: 'rd364_t2_t4',
        etiquetaCorta: 'Títulos II y IV · Carrera profesional, Grado personal y Promoción interna (Arts. 70–79)',
        descripcionCompleta: 'Títulos II y IV: Consolidación del grado personal (2 años continuados o 3 con interrupción), intervalos de niveles por Subgrupos y promoción interna (artículos 70 a 79)',
        articulosClave: '70, 71, 73, 76, 78',
        palabrasClaveFiltro: ['grado personal', 'intervalos de niveles', 'promoción interna', 'artículo 70', 'artículo 71'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1995-7451',
    patronesIdentificacion: ['365/1995'],
    siglaCorta: 'RD 365/1995 (Situaciones Administrativas)',
    aspectos: [
      {
        id: 'rd365_c1_c3',
        etiquetaCorta: 'Capítulos I–III · Servicio activo, Servicios especiales y en otras AAPP (Arts. 1–12)',
        descripcionCompleta: 'Capítulos I a III: Servicio activo, declaración y efectos de los servicios especiales con reserva de puesto y localidad, y servicio en otras Administraciones Públicas (artículos 1 a 12)',
        articulosClave: '2, 3, 4, 7, 8, 9, 10, 11',
        palabrasClaveFiltro: ['servicio activo', 'servicios especiales', 'otras administraciones', 'artículo 4', 'artículo 8'],
      },
      {
        id: 'rd365_c4_c5',
        etiquetaCorta: 'Capítulos IV y V · Expectativa de destino y Excedencias (Arts. 12–19)',
        descripcionCompleta: 'Capítulos IV y V: Expectativa de destino (máximo 1 año), excedencia forzosa, excedencia voluntaria por interés particular, agrupación familiar, cuidado de hijos/familiares y excedencia voluntaria incentivada (artículos 12 a 19)',
        articulosClave: '12, 13, 14, 15, 16, 17, 18',
        palabrasClaveFiltro: ['expectativa de destino', 'excedencia forzosa', 'interés particular', 'agrupación familiar', 'incentivada', 'artículo 12', 'artículo 14', 'artículo 16'],
      },
      {
        id: 'rd365_c6_c7',
        etiquetaCorta: 'Capítulos VI y VII · Suspensión de funciones y Reingreso al servicio activo (Arts. 20–23)',
        descripcionCompleta: 'Capítulos VI y VII: Suspensión provisional y firme de funciones y prelación y plazos para el reingreso al servicio activo sin reserva de puesto (artículos 20 a 23)',
        articulosClave: '20, 21, 22, 23, 29 bis',
        palabrasClaveFiltro: ['suspensión firme', 'suspensión provisional', 'reingreso al servicio activo', 'artículo 21', 'artículo 22'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2019-7414',
    patronesIdentificacion: ['iv convenio', 'convenio colectivo', '2019-7414'],
    siglaCorta: 'IV Convenio Único Personal Laboral AGE',
    aspectos: [
      {
        id: 'ivc_c1_c3',
        etiquetaCorta: 'Capítulos I–III · Ámbito, Comisión Paritaria y Clasificación Profesional (Grupos M y E)',
        descripcionCompleta: 'Capítulos I a III: Ámbito funcional, personal y temporal, Comisión Paritaria y Subcomisiones, clasificación profesional en Grupos M1, M2, M3 y E1, E2 y familias profesionales (artículos 1 a 15)',
        articulosClave: '1, 2, 3, 7, 8, 9, 10',
        palabrasClaveFiltro: ['comisión paritaria', 'm1', 'e1', 'e2', 'clasificación profesional'],
      },
      {
        id: 'ivc_c5_c6',
        etiquetaCorta: 'Capítulos V–VI · Movilidad funcional/geográfica, Ingreso, Período de prueba y Concurso abierto',
        descripcionCompleta: 'Capítulos V y VI: Movilidad funcional y geográfica, concurso abierto y permanente, acceso, promoción profesional y duración del período de prueba por grupos profesionales (artículos 19 a 38)',
        articulosClave: '20, 27, 28, 30, 31, 35',
        palabrasClaveFiltro: ['concurso abierto y permanente', 'período de prueba', 'movilidad'],
      },
      {
        id: 'ivc_c8_c14',
        etiquetaCorta: 'Capítulos VIII–XIV · Jornada, Vacaciones, Permisos, Excedencias y Régimen disciplinario',
        descripcionCompleta: 'Capítulos VIII a XIV: Jornada y horarios, vacaciones, licencias y permisos, suspensión del contrato con reserva, excedencias del personal laboral y régimen disciplinario (artículos 57 a 104)',
        articulosClave: '57, 68, 72, 89, 92, 97, 98, 100',
        palabrasClaveFiltro: ['jornada', 'excedencia', 'disciplinario', 'suspensión con reserva'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2007-6567',
    patronesIdentificacion: ['366/2007', 'accesibilidad'],
    siglaCorta: 'RD 366/2007 (Accesibilidad AGE)',
    aspectos: [
      {
        id: 'rd366_c1_c2',
        etiquetaCorta: 'Capítulos I y II · Oficinas de Atención al Ciudadano: Acceso, Señalización y Puestos (Arts. 1–11)',
        descripcionCompleta: 'Capítulos I y II: Condiciones de accesibilidad de las Oficinas de Atención al Ciudadano de la AGE: ubicación en planta a nivel de vía pública, acceso, recepción, señalización interior/exterior, configuración de puestos de atención y sistemas interactivos (artículos 1 a 11)',
        articulosClave: '1, 3, 4, 5, 6, 7, 8, 9, 10, 11',
        palabrasClaveFiltro: ['oficina', 'rampa', 'señalización', 'puesto de atención', 'bucle magnético', 'interfono'],
      },
      {
        id: 'rd366_c3_c4',
        etiquetaCorta: 'Capítulos III y IV · Documentos e Impresos Accesibles y Prestación de Servicios (Arts. 12–16)',
        descripcionCompleta: 'Capítulos III y IV: Condiciones de accesibilidad en impresos y documentos administrativos, lenguaje claro, formatos alternativos (Braille, macrocaracteres) y prestación de servicios de atención (artículos 12 a 16)',
        articulosClave: '12, 13, 14, 15, 16',
        palabrasClaveFiltro: ['impresos', 'documentos', 'braille', 'lenguaje sencillo', 'artículo 12', 'artículo 13'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2005-14836',
    patronesIdentificacion: ['951/2005', 'mejora de la calidad'],
    siglaCorta: 'RD 951/2005 (Calidad en la AGE)',
    aspectos: [
      {
        id: 'rd951_c1_c3',
        etiquetaCorta: 'Capítulos I–III · Marco general, Análisis de la demanda y Cartas de Servicios (Arts. 1–13)',
        descripcionCompleta: 'Capítulos I a III: Los 6 programas del marco general para la mejora de la calidad en la AGE, análisis de la demanda y evaluación de la satisfacción de usuarios y aprobación, contenido y seguimiento de las Cartas de Servicios (artículos 1 a 13)',
        articulosClave: '1, 2, 3, 5, 8, 9, 10, 11, 12',
        palabrasClaveFiltro: ['carta de servicios', 'análisis de la demanda', 'subsecretario', 'artículo 3', 'artículo 8', 'artículo 11'],
      },
      {
        id: 'rd951_c4_c7',
        etiquetaCorta: 'Capítulos IV–VII · Quejas y Sugerencias, Evaluación, Premios y Observatorio (Arts. 14–29)',
        descripcionCompleta: 'Capítulos IV a VII: Programa de quejas y sugerencias (plazo de 20 días hábiles de contestación), evaluación de la calidad de las organizaciones, programa de reconocimiento y Observatorio de la Calidad de los Servicios Públicos (artículos 14 a 29)',
        articulosClave: '14, 15, 16, 17, 20, 23, 27',
        palabrasClaveFiltro: ['quejas y sugerencias', '20 días', 'evaluación de la calidad', 'observatorio', 'artículo 16'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2011-18541',
    patronesIdentificacion: ['1708/2011', 'sistema espanol de archivos'],
    siglaCorta: 'RD 1708/2011 (Archivos)',
    aspectos: [
      {
        id: 'rd1708_c1_c2',
        etiquetaCorta: 'Capítulos I y II · Sistema Español de Archivos y Tipos de Archivos AGE (Arts. 1–15)',
        descripcionCompleta: 'Capítulos I y II: Sistema Español de Archivos, Consejo de Cooperación Archivística y clases de archivos de la AGE según el ciclo vital: de oficina o gestión, centrales, intermedio (AGA) e históricos (artículos 1 a 15)',
        articulosClave: '1, 5, 7, 8, 9, 10, 11, 12',
        palabrasClaveFiltro: ['archivo de oficina', 'archivo central', 'archivo general de la administración', 'histórico', '5 años', '15 años', '30 años'],
      },
      {
        id: 'rd1708_c3_c4',
        etiquetaCorta: 'Capítulos III y IV · Transferencias, Calificación (CSCDA) y Acceso a Documentos (Arts. 16–32)',
        descripcionCompleta: 'Capítulos III y IV: Transferencias documentales, valoración y eliminación de documentos, Comisión Superior Calificadora de Documentos Administrativos y procedimiento de acceso a documentos y archivos (artículos 16 a 32)',
        articulosClave: '16, 18, 23, 24, 26, 28, 30',
        palabrasClaveFiltro: ['transferencia', 'eliminación', 'acceso a documentos', 'calificadora'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2017-12902',
    patronesIdentificacion: ['9/2017', 'lcsp', 'contratos del sector publico'],
    siglaCorta: 'Ley 9/2017 (LCSP)',
    aspectos: [
      {
        id: 'lcsp_tp',
        etiquetaCorta: 'Título Preliminar · Ámbito subjetivo (PANAP), Tipos de contratos y Contratos SARA (Arts. 1–27)',
        descripcionCompleta: 'Título Preliminar: Objeto, ámbito subjetivo (Sector Público, Poderes Adjudicadores y AAPP), delimitación de los contratos de obras, concesión, suministro, servicios y mixtos, contratos SARA y contratos administrativos vs privados (artículos 1 a 27)',
        articulosClave: '1, 3, 12, 13, 14, 15, 16, 17, 18, 19, 25, 26',
        palabrasClaveFiltro: ['poder adjudicador', 'sara', 'contrato de obras', 'suministro', 'servicios', 'artículo 3', 'artículo 13', 'artículo 25'],
      },
      {
        id: 'lcsp_l1',
        etiquetaCorta: 'Libro I · Partes, Objeto, Presupuesto/Valor estimado, Garantías y Recurso especial (Arts. 28–114)',
        descripcionCompleta: 'Libro I: Duración y prórroga (art. 29), invalidez y recurso especial en materia de contratación (arts. 44–60), órganos de contratación, aptitud y clasificación del empresario, presupuesto base, valor estimado y precio (arts. 100–102) y garantías provisional y definitiva (arts. 106–114)',
        articulosClave: '29, 39, 44, 50, 61, 65, 71, 77, 99, 100, 101, 102, 106, 107',
        palabrasClaveFiltro: ['recurso especial', 'valor estimado', 'presupuesto base', 'garantía definitiva', 'clasificación', 'artículo 29', 'artículo 44', 'artículo 101', 'artículo 107'],
      },
      {
        id: 'lcsp_l2_t1_c1',
        etiquetaCorta: 'Libro II · Título I Cap. I: Expediente, Contrato menor y Procedimientos de adjudicación (Arts. 115–187)',
        descripcionCompleta: 'Libro II, Título I, Capítulo I: Preparación del expediente, contrato menor (art. 118), tramitación urgente y de emergencia, pliegos y procedimientos de adjudicación: abierto, abierto simplificado, restringido, licitación con negociación, diálogo competitivo y asociación para la innovación (artículos 115 a 187)',
        articulosClave: '116, 118, 119, 120, 131, 153, 156, 159, 160, 168',
        palabrasClaveFiltro: ['contrato menor', 'abierto simplificado', 'emergencia', 'urgente', 'formalización', 'artículo 118', 'artículo 156', 'artículo 159'],
      },
      {
        id: 'lcsp_l2_t1_c2',
        etiquetaCorta: 'Libro II · Título I Cap. II y Título II: Ejecución, Modificación, Cesión y Extinción (Arts. 188–315)',
        descripcionCompleta: 'Libro II, Título I Capítulo II y Título II: Prerrogativas de la Administración, ejecución defectuosa y demora, pago del precio, modificación de los contratos (arts. 203–207), suspensión, cesión y subcontratación, cumplimiento, recepción, plazo de garantía y resolución (artículos 188 a 315)',
        articulosClave: '190, 193, 198, 203, 204, 205, 210, 211, 214, 215',
        palabrasClaveFiltro: ['prerrogativas', 'modificación', 'cesión', 'subcontratación', 'resolución del contrato', 'artículo 190', 'artículo 203', 'artículo 205', 'artículo 211'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2003-21618',
    patronesIdentificacion: ['47/2003', 'lgp', 'general presupuestaria'],
    siglaCorta: 'Ley 47/2003 (LGP)',
    aspectos: [
      {
        id: 'lgp_t1_t2_c1_c3',
        etiquetaCorta: 'Títulos I y II (Cap. I–III) · Principios, Estructura de los PGE y Créditos y Modificaciones (Arts. 1–68)',
        descripcionCompleta: 'Títulos I y II (Capítulos I a III): Sector público estatal, principios presupuestarios, elaboración y prórroga de los PGE, estructura de los estados de gastos e ingresos, vinculación jurídica de créditos y modificaciones presupuestarias: transferencias, generaciones, ampliaciones, suplementos e incorporaciones (artículos 1 a 68)',
        articulosClave: '2, 3, 26, 27, 34, 36, 38, 40, 43, 44, 49, 51, 52, 54, 55, 58',
        palabrasClaveFiltro: ['vinculación', 'prórroga', 'transferencia de crédito', 'fondo de contingencia', 'ampliables', 'generación de crédito', 'artículo 40', 'artículo 43', 'artículo 50', 'artículo 52'],
      },
      {
        id: 'lgp_t2_c6',
        etiquetaCorta: 'Título II · Cap. VI: Gestión Presupuestaria, Fases del Gasto (A, D, O, P), Anticipos y Pagos a justificar (Arts. 69–81)',
        descripcionCompleta: 'Título II, Capítulo VI: Fases del procedimiento de gestión de los gastos (Autorización, Disposición o Compromiso, Reconocimiento de la obligación y Ordenación del pago), acumulación AD/ADO, competencias para autorizar gastos, anticipos de caja fija y pagos a justificar (artículos 69 a 81)',
        articulosClave: '73, 74, 75, 78, 79',
        palabrasClaveFiltro: ['autorización', 'disposición', 'reconocimiento de la obligación', 'anticipos de caja fija', 'pagos a justificar', 'artículo 73', 'artículo 74', 'artículo 78', 'artículo 79'],
      },
      {
        id: 'lgp_t6',
        etiquetaCorta: 'Título VI · Control de la gestión económico-financiera por la IGAE y Función interventora (Arts. 140–167)',
        descripcionCompleta: 'Título VI: Control interno ejercido por la Intervención General de la Administración del Estado (IGAE), modalidades de la función interventora, reparos, discrepancias, omisión de fiscalización, control financiero permanente y auditoría pública (artículos 140 a 167)',
        articulosClave: '140, 142, 148, 150, 152, 154, 155, 156',
        palabrasClaveFiltro: ['igae', 'función interventora', 'fiscalización previa', 'reparo', 'auditoría pública'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2018-16673',
    patronesIdentificacion: ['3/2018', 'lopdgdd', 'proteccion de datos'],
    siglaCorta: 'LO 3/2018 (LOPDGDD)',
    aspectos: [
      {
        id: 'lopd_t1_t3',
        etiquetaCorta: 'Títulos I–III · Principios de Protección de Datos, Consentimiento y Derechos ARSOPOL (Arts. 1–18)',
        descripcionCompleta: 'Títulos I a III: Objeto, datos de personas fallecidas, exactitud, deber de confidencialidad, consentimiento de menores (14 años), categorías especiales y ejercicio de derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición (artículos 1 a 18)',
        articulosClave: '1, 3, 4, 5, 6, 7, 9, 12, 13, 14, 15, 16, 17, 18',
        palabrasClaveFiltro: ['consentimiento', '14 años', 'confidencialidad', 'acceso', 'rectificación', 'supresión', 'portabilidad', 'oposición'],
      },
      {
        id: 'lopd_t5_t8',
        etiquetaCorta: 'Títulos V–IX · Responsable/Encargado, DPD, AEPD y Régimen Sancionador (Arts. 28–78)',
        descripcionCompleta: 'Títulos V a IX: Responsable y encargado del tratamiento, bloqueo de datos, Delegado de Protección de Datos (DPD), Agencia Española de Protección de Datos (AEPD) e infracciones y prescripción en el sector público (artículos 28 a 78)',
        articulosClave: '28, 32, 34, 37, 44, 47, 70, 72, 73, 74, 77',
        palabrasClaveFiltro: ['delegado de protección de datos', 'dpd', 'bloqueo', 'agencia española de protección de datos', 'apercibimiento'],
      },
      {
        id: 'lopd_t10',
        etiquetaCorta: 'Título X · Garantía de los Derechos Digitales y Desconexión Digital (Arts. 79–97)',
        descripcionCompleta: 'Título X: Garantía de los derechos digitales, neutralidad de Internet, seguridad digital, derecho a la intimidad ante dispositivos digitales en el ámbito laboral, desconexión digital (art. 88), videovigilancia y testamento digital (artículos 79 a 97)',
        articulosClave: '79, 87, 88, 89, 90, 93, 96',
        palabrasClaveFiltro: ['derechos digitales', 'desconexión digital', 'artículo 88', 'testamento digital'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2013-12887',
    patronesIdentificacion: ['19/2013', 'transparencia'],
    siglaCorta: 'Ley 19/2013 (Transparencia)',
    aspectos: [
      {
        id: 'l19_t1_c1_c2',
        etiquetaCorta: 'Título I · Cap. I y II: Ámbito subjetivo y Publicidad Activa / Portal de la Transparencia (Arts. 1–11)',
        descripcionCompleta: 'Título I, Capítulos I y II: Ámbito subjetivo de aplicación y obligaciones de publicidad activa (información institucional, jurídica, económica, presupuestaria y estadística) y Portal de la Transparencia (artículos 1 a 11)',
        articulosClave: '2, 3, 5, 6, 7, 8, 9, 10',
        palabrasClaveFiltro: ['publicidad activa', 'portal de la transparencia', 'información económica', 'artículo 8', 'artículo 10'],
      },
      {
        id: 'l19_t1_c3',
        etiquetaCorta: 'Título I · Cap. III: Derecho de acceso a la información pública y Reclamación ante el CTBG (Arts. 12–24)',
        descripcionCompleta: 'Título I, Capítulo III: Derecho de acceso a la información pública, límites, causas de inadmisión, procedimiento de solicitud, plazo de resolución de 1 mes (silencio desestimatorio), Unidades de Información y reclamación potestativa ante el CTBG (artículos 12 a 24)',
        articulosClave: '12, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24',
        palabrasClaveFiltro: ['derecho de acceso', 'inadmisión', 'consejo de transparencia', 'ctbg', 'artículo 14', 'artículo 18', 'artículo 20', 'artículo 24'],
      },
      {
        id: 'l19_t2_t3',
        etiquetaCorta: 'Títulos II y III · Buen Gobierno (Infracciones y Sanciones) y Consejo de Transparencia (Arts. 25–40)',
        descripcionCompleta: 'Títulos II y III: Principios de buen gobierno de altos cargos, infracciones y sanciones en materia de conflicto de intereses, gestión económico-presupuestaria y disciplinaria, y estructura del Consejo de Transparencia y Buen Gobierno (artículos 25 a 40)',
        articulosClave: '25, 26, 28, 29, 30, 32, 33, 35, 36',
        palabrasClaveFiltro: ['buen gobierno', 'altos cargos', 'comisión de transparencia', 'presidente del consejo de transparencia'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1997-25336',
    patronesIdentificacion: ['50/1997', 'ley del gobierno'],
    siglaCorta: 'Ley 50/1997 (del Gobierno)',
    aspectos: [
      {
        id: 'l50_t1_t2',
        etiquetaCorta: 'Títulos I y II · Composición y Órganos del Gobierno y Estatuto de sus Miembros (Arts. 1–16)',
        descripcionCompleta: 'Títulos I y II: El Presidente, Vicepresidentes, Ministros, Consejo de Ministros, Comisiones Delegadas del Gobierno, Comisión General de Secretarios de Estado y Subsecretarios, Secretariado del Gobierno y Gabinetes (artículos 1 a 16)',
        articulosClave: '1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13',
        palabrasClaveFiltro: ['consejo de ministros', 'comisiones delegadas', 'secretariado del gobierno', 'suplencia', 'artículo 2', 'artículo 5', 'artículo 8'],
      },
      {
        id: 'l50_t3_t5',
        etiquetaCorta: 'Títulos III–V · Funcionamiento, Gobierno en Funciones e Iniciativa Legislativa y Reglamentaria (Arts. 17–29)',
        descripcionCompleta: 'Títulos III a V: Funcionamiento del Gobierno, delegación de competencias, límites del Gobierno en funciones (art. 21), potestad reglamentaria, jerarquía normativa, Plan Anual Normativo, Memoria del Análisis de Impacto Normativo y control del Gobierno (artículos 17 a 29)',
        articulosClave: '20, 21, 22, 23, 24, 25, 26, 27, 29',
        palabrasClaveFiltro: ['gobierno en funciones', 'potestad reglamentaria', 'impacto normativo', 'artículo 21', 'artículo 24', 'artículo 26'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-2012-5730',
    patronesIdentificacion: ['2/2012', 'loepsf', 'estabilidad presupuestaria'],
    siglaCorta: 'LO 2/2012 (Estabilidad Presupuestaria)',
    aspectos: [
      {
        id: 'lo2_c1_c2',
        etiquetaCorta: 'Capítulos I y II · Principios Generales: Estabilidad, Sostenibilidad y Regla de Gasto (Arts. 1–10)',
        descripcionCompleta: 'Capítulos I y II: Ámbito subjetivo y los principios generales de estabilidad presupuestaria, sostenibilidad financiera, plurianualidad, transparencia, eficiencia, responsabilidad y lealtad institucional (artículos 1 a 10)',
        articulosClave: '1, 2, 3, 4, 5, 6, 7, 8, 9',
        palabrasClaveFiltro: ['estabilidad presupuestaria', 'sostenibilidad financiera', 'plurianualidad'],
      },
      {
        id: 'lo2_c3_c5',
        etiquetaCorta: 'Capítulos III–V · Déficit estructural, Regla de gasto (Art. 12), Deuda pública y Medidas correctivas (Arts. 11–32)',
        descripcionCompleta: 'Capítulos III a V: Instrumentación del principio de estabilidad, regla de gasto (art. 12), límite de deuda pública (60% PIB), fijación de objetivos de estabilidad, medidas preventivas, correctivas (Plan Económico-Financiero) y coercitivas (artículos 11 a 32)',
        articulosClave: '11, 12, 13, 15, 16, 18, 21, 25',
        palabrasClaveFiltro: ['regla de gasto', 'deuda pública', '60%', 'plan económico-financiero', 'artículo 11', 'artículo 12', 'artículo 13'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1983-6317',
    patronesIdentificacion: ['3/1983', 'estatuto de autonomia de la comunidad de madrid'],
    siglaCorta: 'Estatuto Autonomía CAM (LO 3/1983)',
    aspectos: [
      {
        id: 'eacam_tp_t1',
        etiquetaCorta: 'Título Preliminar y Título I · Organización Institucional: Asamblea, Presidente y Gobierno (Arts. 1–25)',
        descripcionCompleta: 'Título Preliminar y Título I: La Comunidad de Madrid, símbolos, capitalidad y organización institucional: la Asamblea de Madrid, el Presidente y el Gobierno de la Comunidad de Madrid (artículos 1 a 25)',
        articulosClave: '1, 4, 8, 9, 10, 11, 16, 17, 18, 21, 22',
        palabrasClaveFiltro: ['asamblea de madrid', 'presidente', 'estatuto de autonomía'],
      },
      {
        id: 'eacam_t2_t6',
        etiquetaCorta: 'Títulos II–VI · Competencias (Exclusivas, Desarrollo y Ejecución), Justicia, Economía, Hacienda y Reforma (Arts. 26–64)',
        descripcionCompleta: 'Títulos II a VI: Competencias exclusivas (art. 26), de desarrollo legislativo (art. 27) y de ejecución (art. 28), régimen jurídico, TSJM, Economía y Hacienda autonómica y reforma del Estatuto (artículos 26 a 64)',
        articulosClave: '26, 27, 28, 37, 45, 51, 61, 64',
        palabrasClaveFiltro: ['competencias exclusivas', 'artículo 26', 'artículo 27', 'artículo 28', 'reforma del estatuto'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1983-34139',
    patronesIdentificacion: ['1/1983', 'gobierno y administracion de la comunidad de madrid'],
    siglaCorta: 'Ley 1/1983 (Gobierno y Adm. CAM)',
    aspectos: [
      {
        id: 'l1_83_t1_t2',
        etiquetaCorta: 'Títulos I y II · El Presidente y el Consejo de Gobierno de la CAM (Arts. 1–30)',
        descripcionCompleta: 'Títulos I y II: Elección, estatuto y atribuciones del Presidente de la Comunidad de Madrid y composición, atribuciones y funcionamiento del Consejo de Gobierno (artículos 1 a 30)',
        articulosClave: '1, 7, 9, 18, 19, 21, 22',
        palabrasClaveFiltro: ['presidente de la comunidad', 'consejo de gobierno', 'artículo 19', 'artículo 21'],
      },
      {
        id: 'l1_83_t3_t4',
        etiquetaCorta: 'Títulos III y IV · Consejeros, Estructura de Consejerías y Régimen Jurídico Autonómico (Arts. 31–80)',
        descripcionCompleta: 'Títulos III y IV: Los Consejeros, Viceconsejeros, Secretarios Generales Técnicos, Directores Generales, forma de las disposiciones y resoluciones y régimen jurídico de la Administración autonómica (artículos 31 a 80)',
        articulosClave: '31, 38, 41, 44, 46, 47, 50, 53',
        palabrasClaveFiltro: ['consejero', 'viceconsejero', 'secretario general técnico', 'orden del consejero'],
      },
    ],
  },
  {
    idBOE: 'BOE-A-1986-13612',
    patronesIdentificacion: ['1/1986', 'funcion publica de la comunidad de madrid'],
    siglaCorta: 'Ley 1/1986 (Función Pública CAM)',
    aspectos: [
      {
        id: 'l1_86_t1_t3',
        etiquetaCorta: 'Títulos I–III · Órganos Superiores, Clases de Personal y Cuerpos y Escalas CAM',
        descripcionCompleta: 'Títulos I a III: Ámbito, órganos superiores de la Función Pública madrileña, clases de personal y estructura de Cuerpos y Escalas de Administración General y Especial',
      },
      {
        id: 'l1_86_t4_t6',
        etiquetaCorta: 'Títulos IV–VI · Selección, Provisión de Puestos, Carrera, Situaciones y Régimen Disciplinario CAM',
        descripcionCompleta: 'Títulos IV a VI: Selección de personal, provisión de puestos de trabajo, carrera administrativa, situaciones administrativas, derechos, deberes y régimen disciplinario en la Comunidad de Madrid',
      },
    ],
  },
  {
    idBOE: 'BOE-A-1991-3837',
    patronesIdentificacion: ['9/1990', 'hacienda de la comunidad de madrid'],
    siglaCorta: 'Ley 9/1990 (Hacienda CAM)',
    aspectos: [
      {
        id: 'l9_90_t1_t2',
        etiquetaCorta: 'Títulos I y II · Régimen de la Hacienda de la CAM, Presupuestos Generales y Modificaciones',
        descripcionCompleta: 'Títulos I y II: Principios generales, derechos y obligaciones de la Hacienda de la CAM, estructura y elaboración de los Presupuestos Generales de la Comunidad y modificaciones de crédito',
      },
      {
        id: 'l9_90_t2_ej_t5',
        etiquetaCorta: 'Títulos II (Gestión del Gasto), III y V · Ejecución del Gasto, Tesorería e Intervención General CAM',
        descripcionCompleta: 'Gestión y fases de ejecución del presupuesto de gastos de la CAM, Tesorería, Endeudamiento y control interno por la Intervención General de la Comunidad de Madrid',
      },
    ],
  },
];

export function obtenerEstructuraParaLey(
  idBOE?: string,
  nombreOSigla?: string
): EstructuraNormaBOE | undefined {
  if (idBOE) {
    const porId = ESTRUCTURA_DETALLADA_LEYES_BOE.find((e) => e.idBOE === idBOE);
    if (porId) return porId;
  }
  if (!nombreOSigla) return undefined;
  const norm = nombreOSigla
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return ESTRUCTURA_DETALLADA_LEYES_BOE.find((e) =>
    e.patronesIdentificacion.some((p) => norm.includes(p))
  );
}
