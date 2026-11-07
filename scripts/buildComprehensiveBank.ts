import fs from 'fs';
import path from 'path';

import { PREGUNTAS_UNITARIAS_BOE, PREGUNTAS_SUPUESTO_BOE } from '../src/constants/boeQuestionsBank';

// Additional questions specifically addressing all user-requested laws:
// - Real Decreto 365/1995 (Situaciones Administrativas AGE)
// - Real Decreto 364/1995 (Ingreso y Provisión de Puestos AGE)
// - Real Decreto Legislativo 5/2015 (TREBEP)
// - Ley Orgánica 3/2018 (LOPDGDD)
// - Ley 19/2013 (Transparencia y Buen Gobierno)
// - Ley 47/2003 (General Presupuestaria)
// - Ley 39/2015 (LPACAP - cómputo de plazos y preguntas de opción falsa/incorrecta)
// - Ley 40/2015 (LRJSP)

const NUEVAS_UNITARIAS_EXTRA = [
  // --- REAL DECRETO 365/1995 (SITUACIONES ADMINISTRATIVAS AGE) ---
  {
    enunciado: 'Conforme al artículo 16.1 del Real Decreto 365/1995 (Reglamento de Situaciones Administrativas de la AGE), ¿cuál de los siguientes requisitos es indispensable para que un funcionario de carrera pueda solicitar la excedencia voluntaria por interés particular?',
    opciones: [
      {
        id: 'A',
        texto: 'Haber prestado servicios efectivos en cualquiera de las Administraciones Públicas durante los 5 años inmediatamente anteriores.',
        esCorrecta: true,
        explicacion: 'El art. 16.1 del RD 365/1995 y el TREBEP exigen un periodo mínimo de servicios efectivos de 5 años en cualquiera de las AAPP inmediatamente anteriores a la solicitud.'
      },
      {
        id: 'B',
        texto: 'Acreditar un mínimo de 10 años de servicios ininterrumpidos exclusivamente en la AGE.',
        esCorrecta: false,
        explicacion: 'El requisito legal es de 5 años (no 10) y computan servicios prestados en cualquiera de las Administraciones Públicas.'
      },
      {
        id: 'C',
        texto: 'Contar con informe preceptivo vinculante de la Secretaría de Estado de Función Pública.',
        esCorrecta: false,
        explicacion: 'No se exige informe vinculante ministerial extraordinario.'
      },
      {
        id: 'D',
        texto: 'Haber permanecido un mínimo de 3 años en el último puesto obtenido por concurso ordinario.',
        esCorrecta: false,
        explicacion: 'La permanencia de 2 años rige para participar en concursos (art. 40 RD 364/1995), no para solicitar excedencia.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 16.1',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a16',
      fundamento: 'La concesión de excedencia voluntaria por interés particular quedará subordinada a las necesidades del servicio y sólo podrá ser concedida cuando el funcionario haya prestado servicios efectivos en cualquiera de las Administraciones Públicas durante los cinco años inmediatamente anteriores.'
    }
  },
  {
    enunciado: 'A tenor del artículo 13 del Real Decreto 365/1995 y del artículo 89.4 del TREBEP, respecto a la excedencia por cuidado de familiares, ¿cuál de las siguientes afirmaciones es FALSA?',
    opciones: [
      {
        id: 'A',
        texto: 'El tiempo de permanencia en esta situación computa a efectos de trienios, carrera y derechos en el régimen de Seguridad Social.',
        esCorrecta: false,
        explicacion: 'Verdadera; tanto el TREBEP como el RD 365/1995 reconocen expresamente el cómputo del tiempo para trienios, carrera y seguridad social.'
      },
      {
        id: 'B',
        texto: 'Durante todo el período de duración de la excedencia (hasta un máximo de tres años), el funcionario tiene reserva incondicional de su mismo puesto de trabajo de origen.',
        esCorrecta: true,
        explicacion: 'FALSA (opción correcta): El art. 89.4 del TREBEP y art. 13 del RD 365/1995 establecen reserva del puesto de trabajo durante dos años, y transcurrido dicho plazo la reserva lo es a un puesto en la misma localidad y de igual nivel y retribución, no del mismo puesto exacto.'
      },
      {
        id: 'C',
        texto: 'Puede solicitarse para atender al cuidado de un familiar que se encuentre a su cargo, hasta el segundo grado inclusive de consanguinidad o afinidad.',
        esCorrecta: false,
        explicacion: 'Verdadera; el ámbito familiar causante abarca hasta el segundo grado de consanguinidad o afinidad.'
      },
      {
        id: 'D',
        texto: 'El período de excedencia será único por cada sujeto causante, aunque sucesivas solicitudes produzcan un nuevo período de excedencia que pondrá fin al anterior.',
        esCorrecta: false,
        explicacion: 'Verdadera; cada nuevo sujeto causante genera un derecho que pone fin al disfrute previo.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 13 RD 365/1995 y Art. 89.4 TREBEP',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a13',
      fundamento: 'Durante los dos primeros años los funcionarios tendrán derecho a la reserva del puesto de trabajo que desempeñaban. Transcurrido este periodo, dicha reserva lo será a un puesto en la misma localidad y de igual nivel y retribución.'
    }
  },
  {
    enunciado: 'Según el artículo 4 del Real Decreto 365/1995, los funcionarios de carrera que sean declarados en la situación de SERVICIOS ESPECIALES:',
    opciones: [
      {
        id: 'A',
        texto: 'Perciben las retribuciones del puesto o cargo que desempeñen en dicha situación, sin perjuicio del derecho a percibir los trienios consolidados.',
        esCorrecta: true,
        explicacion: 'El art. 4 del RD 365/1995 y el TREBEP disponen que perciben las retribuciones del puesto efectivo, reconociéndoseles el cómputo y percepción de los trienios causados.'
      },
      {
        id: 'B',
        texto: 'Continúan percibiendo las retribuciones complementarias de su puesto de origen con cargo al ministerio de procedencia.',
        esCorrecta: false,
        explicacion: 'Incorrecto; no se cobran complementarias del puesto de origen mientras se ejerza el cargo determinante de los servicios especiales.'
      },
      {
        id: 'C',
        texto: 'Pierden su condición de funcionario de carrera si permanecen más de dos años en dicha situación.',
        esCorrecta: false,
        explicacion: 'Falso; conservan plenamente su condición de funcionario de carrera y se les computa el tiempo para trienios y derechos pasivos.'
      },
      {
        id: 'D',
        texto: 'Pasan forzosamente a la situación de excedencia voluntaria por interés particular al término del primer año.',
        esCorrecta: false,
        explicacion: 'Falso; al cesar en el puesto causante tienen derecho a reingresar al servicio activo.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 4',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a4',
      fundamento: 'Los funcionarios en servicios especiales percibirán las retribuciones del puesto o cargo que desempeñen y no las que les correspondan como funcionarios de carrera, sin perjuicio del derecho a percibir los trienios que tengan reconocidos.'
    }
  },
  {
    enunciado: 'Conforme al artículo 21 del Real Decreto 365/1995, la situación de SUSPENSIÓN FIRME de funciones impuesta en virtud de sanción disciplinaria o condena judicial:',
    opciones: [
      {
        id: 'A',
        texto: 'Determina la pérdida del puesto de trabajo si la suspensión excede de seis meses.',
        esCorrecta: true,
        explicacion: 'El art. 21.2 del RD 365/1995 dispone expresamente que la suspensión firme superior a 6 meses comporta la pérdida del puesto de trabajo.'
      },
      {
        id: 'B',
        texto: 'Conserva la reserva del mismo puesto de trabajo con independencia de la duración de la sanción disciplinaria.',
        esCorrecta: false,
        explicacion: 'Falso; si excede de 6 meses se produce la pérdida del puesto de trabajo.'
      },
      {
        id: 'C',
        texto: 'Permite el devengo del 75% del sueldo base y la totalidad de los trienios durante el cumplimiento íntegro.',
        esCorrecta: false,
        explicacion: 'Durante la suspensión firme el funcionario queda privado de todos los derechos inherentes a su condición, sin devengar retribución alguna.'
      },
      {
        id: 'D',
        texto: 'Computa íntegramente a efectos de antigüedad para trienios y promoción interna.',
        esCorrecta: false,
        explicacion: 'El tiempo de suspensión firme no se computa a efectos de trienios ni de ascensos.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 21.2',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a21',
      fundamento: 'El funcionario declarado en la situación de suspensión firme quedará privado durante el tiempo de permanencia en la misma del ejercicio de sus funciones y de todos los derechos inherentes a la condición. La suspensión firme determinará la pérdida del puesto de trabajo si excede de seis meses.'
    }
  },
  {
    enunciado: 'En relación con la EXCEDENCIA POR AGRUPACIÓN FAMILIAR regulada en el artículo 17 del Real Decreto 365/1995 y artículo 89.3 del TREBEP:',
    opciones: [
      {
        id: 'A',
        texto: 'No exige período de servicios efectivos previos para poder solicitarla.',
        esCorrecta: true,
        explicacion: 'A diferencia de la excedencia por interés particular (5 años), la excedencia por agrupación familiar no exige periodo previo de servicios.'
      },
      {
        id: 'B',
        texto: 'Exige un mínimo de tres años de servicios prestados inmediatamente anteriores en la misma subdirección general.',
        esCorrecta: false,
        explicacion: 'No se exige ningún periodo de servicio previo.'
      },
      {
        id: 'C',
        texto: 'Genera reserva de puesto de trabajo durante los tres primeros años de permanencia.',
        esCorrecta: false,
        explicacion: 'La excedencia por agrupación familiar no conlleva reserva del puesto de trabajo.'
      },
      {
        id: 'D',
        texto: 'Da derecho a percibir el complemento de destino del grupo o subgrupo de pertenencia.',
        esCorrecta: false,
        explicacion: 'No da derecho a devengo de retribuciones.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 17',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a17',
      fundamento: 'Podrá concederse la excedencia voluntaria por agrupación familiar sin el requisito de haber prestado servicios efectivos en cualquiera de las Administraciones Públicas durante el periodo fijado para la voluntaria ordinaria.'
    }
  },

  // --- REAL DECRETO 364/1995 (INGRESO Y PROVISIÓN AGE) ---
  {
    enunciado: 'A tenor del artículo 48.1 del Real Decreto 364/1995, ¿cuál es el plazo posesorio para incorporarse a un nuevo puesto obtenido por concurso si la provisión comporta cambio de localidad de residencia?',
    opciones: [
      {
        id: 'A',
        texto: 'Un mes a contar desde el día siguiente al del cese.',
        esCorrecta: true,
        explicacion: 'El art. 48.1 del RD 364/1995 fija expresamente un plazo de un mes si implica cambio de residencia o el reingreso al servicio activo.'
      },
      {
        id: 'B',
        texto: 'Tres días hábiles.',
        esCorrecta: false,
        explicacion: 'Tres días hábiles es el plazo cuando no implica cambio de localidad de residencia.'
      },
      {
        id: 'C',
        texto: 'Diez días naturales.',
        esCorrecta: false,
        explicacion: 'El plazo reglamentario es de un mes.'
      },
      {
        id: 'D',
        texto: 'Quince días hábiles improrrogables.',
        esCorrecta: false,
        explicacion: 'El plazo es de un mes.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 48.1',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a48',
      fundamento: 'El plazo de toma de posesión será de tres días hábiles si no implica cambio de residencia del funcionario, o de un mes si comporta cambio de localidad o el reingreso al servicio activo.'
    }
  },
  {
    enunciado: 'Conforme al artículo 64.3 del Real Decreto 364/1995, los funcionarios nombrados para puestos de LIBRE DESIGNACIÓN podrán ser cesados con carácter:',
    opciones: [
      {
        id: 'A',
        texto: 'Discrecional.',
        esCorrecta: true,
        explicacion: 'El cese en puestos de libre designación es discrecional y compete al órgano que acordó el nombramiento.'
      },
      {
        id: 'B',
        texto: 'Exclusivamente disciplinario tras la incoación preceptiva de expediente contradictorio.',
        esCorrecta: false,
        explicacion: 'No es disciplinario; es de naturaleza discrecional por pérdida de confianza.'
      },
      {
        id: 'C',
        texto: 'Automático e ineludible cada dos años de permanencia en el puesto.',
        esCorrecta: false,
        explicacion: 'No cesan automáticamente por el transcurso de dos años.'
      },
      {
        id: 'D',
        texto: 'Provisional hasta la homologación por el Tribunal Superior de Justicia.',
        esCorrecta: false,
        explicacion: 'El cese es inmediatamente eficaz sin requerir homologación judicial.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 64.3',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a64',
      fundamento: 'Los funcionarios nombrados para puestos de trabajo por el procedimiento de libre designación podrán ser cesados con carácter discrecional.'
    }
  },
  {
    enunciado: 'En relación con la COMISIÓN DE SERVICIOS regulada en el artículo 64 del Real Decreto 364/1995, ¿cuál de las siguientes afirmaciones es FALSA?',
    opciones: [
      {
        id: 'A',
        texto: 'Las comisiones de servicios en puesto vacante tienen una duración máxima de un año, prorrogable por otro en caso de no haberse cubierto definitivamente.',
        esCorrecta: false,
        explicacion: 'Verdadera; el art. 64 fija 1 año prorrogable por otro.'
      },
      {
        id: 'B',
        texto: 'El puesto vacante cubierto temporalmente en comisión de servicios debe ser incluido necesariamente en la siguiente convocatoria de provisión por concurso.',
        esCorrecta: false,
        explicacion: 'Verdadera; el puesto vacante debe ser incluido en la siguiente convocatoria.'
      },
      {
        id: 'C',
        texto: 'La comisión de servicios consolida con carácter inamovible la titularidad definitiva del puesto de destino a los doce meses.',
        esCorrecta: true,
        explicacion: 'FALSA (opción correcta): La comisión de servicios tiene naturaleza estrictamente temporal y no atribuye la titularidad definitiva del puesto ni inamovilidad.'
      },
      {
        id: 'D',
        texto: 'El funcionario en comisión de servicios percibe las retribuciones asignadas al puesto efectivamente desempeñado.',
        esCorrecta: false,
        explicacion: 'Verdadera; devenga las retribuciones del puesto desempeñado.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 64',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a64',
      fundamento: 'Cuando un puesto quede vacante podrá ser cubierto en comisión de servicios de carácter voluntario. Las comisiones de servicios tendrán una duración máxima de un año prorrogable por otro.'
    }
  },

  // --- LEY ORGÁNICA 3/2018 (LOPDGDD) ---
  {
    enunciado: 'Conforme al artículo 12 de la Ley Orgánica 3/2018 (LOPDGDD) y el RGPD, ¿cuál es el plazo general para contestar la solicitud de ejercicio de derechos de protección de datos formulada por un ciudadano?',
    opciones: [
      {
        id: 'A',
        texto: 'Un mes a contar desde la recepción de la solicitud.',
        esCorrecta: true,
        explicacion: 'El plazo general es de un mes natural, prorrogable por otros dos meses en supuestos complejos.'
      },
      {
        id: 'B',
        texto: 'Tres meses en todo caso.',
        esCorrecta: false,
        explicacion: 'En materia de protección de datos rige el plazo comunitario de un mes.'
      },
      {
        id: 'C',
        texto: 'Diez días hábiles.',
        esCorrecta: false,
        explicacion: 'El plazo legal es de un mes.'
      },
      {
        id: 'D',
        texto: 'Quince días naturales.',
        esCorrecta: false,
        explicacion: 'El plazo es de un mes.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley Orgánica 3/2018 (LOPDGDD)',
      articulo: 'Artículo 12',
      codigoBOE: 'BOE-A-2018-16673',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a12',
      fundamento: 'El responsable facilitará información de las actuaciones en el plazo de un mes desde la recepción.'
    }
  },
  {
    enunciado: 'En el régimen sancionador aplicable a las ADMINISTRACIONES PÚBLICAS por infracciones de protección de datos según el artículo 77 de la Ley Orgánica 3/2018 (LOPDGDD):',
    opciones: [
      {
        id: 'A',
        texto: 'La resolución sancionadora de la AEPD impondrá un apercibimiento sin que proceda la imposición de multas pecuniarias.',
        esCorrecta: true,
        explicacion: 'El art. 77 excluye las sanciones pecuniarias a las Administraciones Públicas, imponiendo apercibimiento y medidas correctoras.'
      },
      {
        id: 'B',
        texto: 'Se aplicarán multas de hasta 20 millones de euros exactamente igual que a sociedades privadas.',
        esCorrecta: false,
        explicacion: 'Las Administraciones Públicas están exentas de sanciones pecuniarias (art. 77).'
      },
      {
        id: 'C',
        texto: 'Las Administraciones Públicas no pueden ser sancionadas ni apercibidas bajo ningún concepto.',
        esCorrecta: false,
        explicacion: 'Sí son objeto de apercibimiento público y adopción de medidas correctoras vinculantes.'
      },
      {
        id: 'D',
        texto: 'La resolución sancionadora comporta el cese automático e ipso iure del subsecretario departamental.',
        esCorrecta: false,
        explicacion: 'La AEPD no cesa autoridades, propone en su caso actuaciones disciplinarias.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley Orgánica 3/2018 (LOPDGDD)',
      articulo: 'Artículo 77',
      codigoBOE: 'BOE-A-2018-16673',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a77',
      fundamento: 'Cuando las infracciones sean cometidas por autoridades y organismos públicos, la autoridad de protección de datos dictará una resolución que sancione a las mismas con apercibimiento.'
    }
  },

  // --- CÁLCULO DE FECHAS Y PLAZOS (LEY 39/2015) ---
  {
    enunciado: 'Un ciudadano recibe la notificación electrónica de un acto administrativo expreso el viernes 10 de mayo de 2024. Disponiendo del plazo legal de un mes para interponer recurso de alzada (art. 122 Ley 39/2015), ¿cuándo vence el último día hábil para su presentación?',
    opciones: [
      {
        id: 'A',
        texto: 'El 10 de junio de 2024.',
        esCorrecta: true,
        explicacion: 'Según el art. 30.4 de la Ley 39/2015, los plazos fijados por meses se computan de fecha a fecha a partir del día siguiente a la notificación, concluyendo el mismo día correlativo del mes de vencimiento (10 de junio).'
      },
      {
        id: 'B',
        texto: 'El 11 de junio de 2024.',
        esCorrecta: false,
        explicacion: 'El plazo vence el día 10 del mes siguiente (de fecha a fecha), no el 11.'
      },
      {
        id: 'C',
        texto: 'El 31 de mayo de 2024.',
        esCorrecta: false,
        explicacion: 'El plazo es de un mes completo, no hasta fin de mes en mayo.'
      },
      {
        id: 'D',
        texto: 'El 24 de mayo de 2024.',
        esCorrecta: false,
        explicacion: 'Eso correspondería a 10 días hábiles, no al mes de recurso de alzada.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículos 30.4 y 122.1',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a30',
      fundamento: 'Si el plazo se fija en meses o años, éstos se computarán a partir del día siguiente a aquel en que tenga lugar la notificación. El plazo concluirá el mismo día en que se produjo la notificación en el mes o el año de vencimiento.'
    }
  },
  {
    enunciado: 'Se notifica a un interesado un requerimiento de subsanación de 10 días hábiles el martes 1 de octubre de 2024. Sabiendo que los sábados, domingos y el 12 de octubre (fiesta nacional) son días inhábiles según el artículo 30.2 de la Ley 39/2015, ¿cuál es el último día del plazo?',
    opciones: [
      {
        id: 'A',
        texto: 'El martes 15 de octubre de 2024.',
        esCorrecta: true,
        explicacion: 'PROTOCOLO ART. 30 LEY 39/2015: 1) IDENTIFICACIÓN Y DIES A QUO (art. 30.3): Notificación martes 1 de octubre. Dies a quo = miércoles 2 de octubre. 2) TRAZABILIDAD DÍA A DÍA (art. 30.2): 1º Mié 2, 2º Jue 3, 3º Vie 4, [Sáb 5 y Dom 6 inhábiles], 4º Lun 7, 5º Mar 8, 6º Mié 9, 7º Jue 10, 8º Vie 11, [Sáb 12 fiesta nacional y Dom 13 inhábiles], 9º Lun 14, 10º Mar 15 de octubre = DIES AD QUEM natural. 3) REGLA DE CIERRE (art. 30.5): El 15 de octubre es día hábil, el plazo finaliza exactamente ese día a las 23:59:59 horas.'
      },
      {
        id: 'B',
        texto: 'El viernes 11 de octubre de 2024.',
        esCorrecta: false,
        explicacion: 'El viernes 11 sólo se han consumido 8 días hábiles.'
      },
      {
        id: 'C',
        texto: 'El jueves 10 de octubre de 2024.',
        esCorrecta: false,
        explicacion: 'Cálculo erróneo que computa días naturales.'
      },
      {
        id: 'D',
        texto: 'El viernes 18 de octubre de 2024.',
        esCorrecta: false,
        explicacion: 'Sobrepasa el plazo de 10 días hábiles.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 30.2',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a30',
      fundamento: 'Siempre que por Ley o en el Derecho de la Unión Europea no se exprese otro cómputo, cuando los plazos se señalen por días, se entiende que éstos son hábiles, excluyéndose del cómputo los sábados, los domingos y los declarados festivos.'
    }
  }
];

// Rich, multi-law scenarios and questions for SUPUESTOS
// Covers all key statutory areas:
// 1. Situaciones Administrativas AGE (Real Decreto 365/1995)
// 2. Provisión y Concursos AGE (Real Decreto 364/1995)
// 3. Empleado Público y Permisos (TREBEP RDL 5/2015)
// 4. Protección de Datos y Derechos Digitales (Ley Orgánica 3/2018)
// 5. Transparencia y Acceso a la Información (Ley 19/2013)
// 6. Contratos del Sector Público (Ley 9/2017)
// 7. General Presupuestaria (Ley 47/2003)
// 8. Procedimiento Administrativo y Recursos (Ley 39/2015)
// 9. Régimen Jurídico y Abstención (Ley 40/2015)

const NUEVAS_SUPUESTOS_AMPLIADAS = [
  // --- SUPUESTO: REAL DECRETO 365/1995 (SITUACIONES ADMINISTRATIVAS AGE) ---
  {
    enunciado: 'En relación con la solicitud de doña Laura Gómez de excedencia por cuidado de su madre en situación de dependencia, ¿cuál es el régimen jurídico aplicable conforme al artículo 13 del Real Decreto 365/1995?',
    opciones: [
      {
        id: 'A',
        texto: 'Tiene reserva de su puesto durante el primer año (o dos según TREBEP) y el tiempo computa a efectos de trienios, carrera y derechos pasivos.',
        esCorrecta: true,
        explicacion: 'El art. 13 del RD 365/1995 y el TREBEP disponen reserva de puesto y cómputo íntegro a efectos de trienios, carrera profesional y derechos de seguridad social.'
      },
      {
        id: 'B',
        texto: 'La solicitud puede ser denegada por necesidades del servicio si la unidad tiene menos de diez funcionarios.',
        esCorrecta: false,
        explicacion: 'La excedencia por cuidado de familiares es un derecho no supeditado a las necesidades del servicio.'
      },
      {
        id: 'C',
        texto: 'La funcionaria pierde la condición de funcionaria de carrera si no reingresa antes de seis meses.',
        esCorrecta: false,
        explicacion: 'La duración máxima es de hasta tres años sin pérdida de la condición de funcionaria.'
      },
      {
        id: 'D',
        texto: 'Durante la excedencia continúa devengando la totalidad de las retribuciones básicas y complementarias con cargo a los presupuestos generales.',
        esCorrecta: false,
        explicacion: 'No se devengan retribuciones durante la excedencia.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 13',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a13',
      fundamento: 'Los funcionarios tendrán derecho a un período de excedencia para atender al cuidado de un familiar a su cargo. El tiempo computará a efectos de trienios, consolidación de grado y derechos pasivos.'
    }
  },
  {
    enunciado: 'Si don Antonio Ruiz, funcionario del Subgrupo C1 con 7 años de antigüedad, solicita excedencia voluntaria por interés particular, ¿qué consecuencia jurídica se deriva según el artículo 16 del Real Decreto 365/1995?',
    opciones: [
      {
        id: 'A',
        texto: 'No devengará retribuciones ni le será computable el tiempo a efectos de ascensos, trienios ni derechos pasivos.',
        esCorrecta: true,
        explicacion: 'El art. 16 del RD 365/1995 establece que la excedencia por interés particular no devenga retribuciones ni computa para trienios ni derechos pasivos.'
      },
      {
        id: 'B',
        texto: 'Conserva el derecho a percibir el sueldo base y el 50% de los trienios reconocidos.',
        esCorrecta: false,
        explicacion: 'No se percibe retribución alguna.'
      },
      {
        id: 'C',
        texto: 'Tiene reserva automática de su mismo puesto de trabajo durante los dos primeros años.',
        esCorrecta: false,
        explicacion: 'La excedencia por interés particular no conlleva reserva de puesto de trabajo.'
      },
      {
        id: 'D',
        texto: 'Queda inhabilitado de por vida para volver a ingresar en la Función Pública.',
        esCorrecta: false,
        explicacion: 'Conserva su condición y tiene derecho a solicitar el reingreso al servicio activo.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 16',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a16',
      fundamento: 'La excedencia voluntaria por interés particular no devengará retribuciones, ni será computable el tiempo que permanezca en tal situación a efectos de ascensos, trienios y derechos pasivos.'
    }
  },
  {
    enunciado: 'Si un funcionario de carrera del caso práctico es nombrado Director General o miembro de un gabinete ministerial, ¿en qué situación administrativa debe ser declarado formalmente a tenor del artículo 2 del Real Decreto 365/1995?',
    opciones: [
      {
        id: 'A',
        texto: 'Servicios especiales.',
        esCorrecta: true,
        explicacion: 'El art. 2 del RD 365/1995 y art. 87 del TREBEP declaran en servicios especiales a quienes sean nombrados para altos cargos o miembros de gabinetes de ministros o secretarios de Estado.'
      },
      {
        id: 'B',
        texto: 'Excedencia forzosa con retención de destino.',
        esCorrecta: false,
        explicacion: 'La situación legal procedente es servicios especiales.'
      },
      {
        id: 'C',
        texto: 'Suspensión provisional de funciones.',
        esCorrecta: false,
        explicacion: 'La suspensión es una medida cautelar o sanción, no aplicable al desempeño de cargos públicos.'
      },
      {
        id: 'D',
        texto: 'Servicio en otras Administraciones Públicas con pérdida de condición estatutaria.',
        esCorrecta: false,
        explicacion: 'Es servicios especiales con reserva del puesto de trabajo en la misma localidad y de igual nivel.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 365/1995 (Situaciones Administrativas AGE)',
      articulo: 'Artículo 2',
      codigoBOE: 'BOE-A-1995-7451',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451#a2',
      fundamento: 'Serán declarados en servicios especiales los funcionarios que sean designados miembros del Gobierno o de los órganos de gobierno de las CCAA, o para desempeñar cargos de confianza o asesoramiento político.'
    }
  },

  // --- SUPUESTO: REAL DECRETO 364/1995 (INGRESO Y PROVISIÓN AGE) ---
  {
    enunciado: 'Doña Laura Gómez ha obtenido nuevo destino en distinta localidad según resolución de concurso publicada en el BOE el 20 de octubre. A tenor del artículo 48.1 del Real Decreto 364/1995, ¿de qué plazo dispone para tomar posesión en su nuevo puesto de trabajo?',
    opciones: [
      {
        id: 'A',
        texto: 'Un mes a contar desde el día siguiente al del cese en su puesto de origen.',
        esCorrecta: true,
        explicacion: 'El art. 48.1 del RD 364/1995 fija expresamente un plazo posesorio de un mes cuando la provisión por concurso implica cambio de localidad de residencia.'
      },
      {
        id: 'B',
        texto: 'Tres días hábiles.',
        esCorrecta: false,
        explicacion: 'Los 3 días hábiles aplican cuando no hay cambio de localidad.'
      },
      {
        id: 'C',
        texto: 'Diez días naturales.',
        esCorrecta: false,
        explicacion: 'El plazo es de un mes.'
      },
      {
        id: 'D',
        texto: 'Quince días hábiles.',
        esCorrecta: false,
        explicacion: 'El plazo legal reglamentario es de un mes.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 48.1',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a48',
      fundamento: 'El plazo de toma de posesión será de tres días hábiles si no implica cambio de residencia del funcionario, o de un mes si comporta cambio de localidad o el reingreso al servicio activo.'
    }
  },
  {
    enunciado: 'En relación con el plazo de CESE en el puesto de origen de Doña Laura Gómez, ¿de qué plazo dispone el órgano ministerial competente para acordar o notificar el cese según el artículo 48.1 del Real Decreto 364/1995?',
    opciones: [
      {
        id: 'A',
        texto: 'Tres días hábiles siguientes a la publicación de la resolución del concurso en el BOE, prorrogable excepcionalmente hasta un máximo de veinte días hábiles por necesidades del servicio.',
        esCorrecta: true,
        explicacion: 'El cese debe efectuarse dentro de los 3 días hábiles siguientes a la publicación, pudiendo prorrogarse hasta 20 días por necesidades del servicio.'
      },
      {
        id: 'B',
        texto: 'Un mes natural improrrogable sin excepción.',
        esCorrecta: false,
        explicacion: 'El plazo de cese ordinario es de 3 días hábiles.'
      },
      {
        id: 'C',
        texto: 'Veinticuatro horas desde la recepción del correo electrónico.',
        esCorrecta: false,
        explicacion: 'El plazo reglamentario es de 3 días hábiles.'
      },
      {
        id: 'D',
        texto: 'Seis meses si no se encuentra un sustituto interino de inmediato.',
        esCorrecta: false,
        explicacion: 'La prórroga máxima por necesidades del servicio no puede exceder de 20 días hábiles.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 48.1 y 48.2',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a48',
      fundamento: 'El cese deberá efectuarse dentro de los tres días hábiles siguientes a la publicación de la resolución del concurso en el BOE. Excepcionalmente podrá prorrogarse el cese hasta un máximo de veinte días hábiles.'
    }
  },
  {
    enunciado: 'Si la plaza obtenida por doña Laura Gómez en el supuesto práctico fuera provista por LIBRE DESIGNACIÓN y posteriormente fuese cesada discrecionalmente, ¿qué derecho le asiste según el artículo 65 del Real Decreto 364/1995?',
    opciones: [
      {
        id: 'A',
        texto: 'Quedará adscrita provisionalmente a un puesto correspondiente a su cuerpo o escala dentro de la misma localidad y no inferior en más de dos niveles a su grado personal consolidado.',
        esCorrecta: true,
        explicacion: 'El art. 65.1 del RD 364/1995 garantiza la adscripción provisional a un puesto correspondiente a su cuerpo dentro del mismo municipio, no inferior en más de dos niveles al grado consolidado.'
      },
      {
        id: 'B',
        texto: 'Pasa automáticamente a la situación de jubilación forzosa con pensión reducida.',
        esCorrecta: false,
        explicacion: 'No se produce jubilación forzosa.'
      },
      {
        id: 'C',
        texto: 'Pierde su condición de funcionaria de carrera de forma irrevocable.',
        esCorrecta: false,
        explicacion: 'Conserva su condición y se le adscribe provisionalmente a un puesto.'
      },
      {
        id: 'D',
        texto: 'Debe esperar preceptivamente cinco años en excedencia forzosa antes de reingresar.',
        esCorrecta: false,
        explicacion: 'El reingreso y adscripción provisional son inmediatos.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 65.1',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a65',
      fundamento: 'Los funcionarios cesados en puestos de libre designación serán adscritos provisionalmente a un puesto de trabajo correspondiente a su Cuerpo o Escala, no inferior en más de dos niveles a su grado personal en el mismo municipio.'
    }
  },

  // --- SUPUESTO: TREBEP (RDL 5/2015) ---
  {
    enunciado: 'Doña Carmen Martín Sánchez solicita un permiso retribuido de 3 días hábiles por el fallecimiento de un familiar de primer grado en la misma localidad. A tenor del artículo 48.a) del TREBEP, ¿cuál es el régimen de este permiso?',
    opciones: [
      {
        id: 'A',
        texto: 'Por fallecimiento de un familiar dentro del primer grado de consanguinidad o afinidad corresponden 3 días hábiles si es en la misma localidad, y 5 si exige desplazamiento a otra localidad.',
        esCorrecta: true,
        explicacion: 'El art. 48.a) del TREBEP fija exactamente 3 días hábiles en la misma localidad y 5 días hábiles si requiere desplazamiento.'
      },
      {
        id: 'B',
        texto: 'Corresponden 2 días naturales improrrogables sin distinción de localidad.',
        esCorrecta: false,
        explicacion: 'El TREBEP fija 3 días hábiles en la misma localidad y 5 hábiles si hay desplazamiento.'
      },
      {
        id: 'C',
        texto: 'Es un permiso no retribuido que debe compensarse doblando turnos de trabajo.',
        esCorrecta: false,
        explicacion: 'Es un permiso con plenitud de derechos retributivos.'
      },
      {
        id: 'D',
        texto: 'Se conceden diez días hábiles con autorización del Subsecretario de Hacienda.',
        esCorrecta: false,
        explicacion: 'El plazo fijado en el art. 48.a) es de 3 o 5 días hábiles.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto Legislativo 5/2015 (TREBEP)',
      articulo: 'Artículo 48.a)',
      codigoBOE: 'BOE-A-2015-11719',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719#a48',
      fundamento: 'Los funcionarios públicos tendrán derecho a los siguientes permisos: Por fallecimiento, accidente o enfermedad grave de un familiar dentro del primer grado de consanguinidad o afinidad, tres días hábiles cuando el suceso se produzca en la misma localidad, y cinco días hábiles cuando sea en distinta localidad.'
    }
  },
  {
    enunciado: 'Si un funcionario de la unidad del supuesto práctico cometiese una falta muy grave tipificada en el artículo 95.2 del TREBEP (como la obstaculización al ejercicio de las libertades públicas o abandono del servicio), ¿cuándo prescribe dicha falta según el artículo 97?',
    opciones: [
      {
        id: 'A',
        texto: 'A los 3 años.',
        esCorrecta: true,
        explicacion: 'El art. 97 del TREBEP fija el plazo de prescripción de faltas muy graves en 3 años (las graves en 2 años y las leves en 6 meses).'
      },
      {
        id: 'B',
        texto: 'A los 5 años.',
        esCorrecta: false,
        explicacion: 'El plazo legal del TREBEP es de 3 años para faltas muy graves.'
      },
      {
        id: 'C',
        texto: 'Al año de su comisión.',
        esCorrecta: false,
        explicacion: 'El plazo es de 3 años.'
      },
      {
        id: 'D',
        texto: 'A los 6 meses.',
        esCorrecta: false,
        explicacion: '6 meses es el plazo de prescripción para las faltas leves.'
      }
    ],
    justificacionLegal: {
      norma: 'Real Decreto Legislativo 5/2015 (TREBEP)',
      articulo: 'Artículo 97.1',
      codigoBOE: 'BOE-A-2015-11719',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719#a97',
      fundamento: 'Las infracciones muy graves prescribirán a los tres años, las graves a los dos años y las leves a los seis meses.'
    }
  },

  // --- SUPUESTO: LEY ORGÁNICA 3/2018 (LOPDGDD) ---
  {
    enunciado: 'Respecto a la solicitud de supresión de datos personales («derecho al olvido») presentada por el ciudadano el 24 de octubre, ¿cuál es el plazo legal para que la Subdelegación del Gobierno resuelva y notifique la contestación según el artículo 12 de la Ley Orgánica 3/2018 (LOPDGDD)?',
    opciones: [
      {
        id: 'A',
        texto: 'Un mes a partir de la recepción de la solicitud, ampliable hasta un máximo de otros dos meses adicionales por motivos justificados de complejidad.',
        esCorrecta: true,
        explicacion: 'El art. 12 del RGPD y de la LOPDGDD fija el plazo de un mes, ampliable por dos meses adicionales en supuestos complejos previa notificación al interesado dentro del primer mes.'
      },
      {
        id: 'B',
        texto: 'Diez días hábiles improrrogables en todo caso por tratarse de un derecho fundamental.',
        esCorrecta: false,
        explicacion: 'El marco del RGPD y la LOPDGDD fija un plazo uniforme de un mes natural.'
      },
      {
        id: 'C',
        texto: 'Tres meses con arreglo al régimen general del silencio administrativo de la Ley 39/2015.',
        esCorrecta: false,
        explicacion: 'El RGPD y la LOPDGDD constituyen normativa especial de directa aplicación con plazo propio de un mes.'
      },
      {
        id: 'D',
        texto: 'Seis meses si se solicita dictamen facultativo al Consejo de Estado.',
        esCorrecta: false,
        explicacion: 'No se requiere dictamen del Consejo de Estado y el plazo general es de un mes.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley Orgánica 3/2018 (LOPDGDD)',
      articulo: 'Artículo 12',
      codigoBOE: 'BOE-A-2018-16673',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a12',
      fundamento: 'El responsable del tratamiento facilitará al interesado información relativa a sus actuaciones en el plazo de un mes a partir de la recepción de la solicitud. Dicho plazo podrá prorrogarse otros dos meses en caso necesario.'
    }
  },
  {
    enunciado: 'Si la Subdelegación del Gobierno cometiese una infracción en la custodia de datos personales, ¿qué sanción puede imponerle la Agencia Española de Protección de Datos (AEPD) a tenor del artículo 77 de la Ley Orgánica 3/2018 (LOPDGDD)?',
    opciones: [
      {
        id: 'A',
        texto: 'Sanción de apercibimiento con requerimiento de medidas correctoras, sin multas pecuniarias.',
        esCorrecta: true,
        explicacion: 'El art. 77.1 de la LOPDGDD exime a las Administraciones Públicas del pago de sanciones económicas, sustituyéndolas por apercibimiento y posible responsabilidad disciplinaria.'
      },
      {
        id: 'B',
        texto: 'Una multa económica coercitiva de hasta 20.000.000 de euros a cargo de los presupuestos ordinarios del Ministerio.',
        esCorrecta: false,
        explicacion: 'Las Administraciones Públicas están exentas de multas pecuniarias según el art. 77.'
      },
      {
        id: 'C',
        texto: 'La clausura inmediata del registro electrónico y la inhabilitación especial de todos los funcionarios del Subgrupo C1.',
        esCorrecta: false,
        explicacion: 'La AEPD carece de competencias para clausurar registros públicos o inhabilitar funcionarios colectivamente.'
      },
      {
        id: 'D',
        texto: 'Inmunidad sancionadora absoluta impidiendo cualquier actuación o requerimiento de la AEPD.',
        esCorrecta: false,
        explicacion: 'La AEPD ejerce plena potestad sancionadora bajo la modalidad de apercibimiento público y medidas correctoras.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley Orgánica 3/2018 (LOPDGDD)',
      articulo: 'Artículo 77',
      codigoBOE: 'BOE-A-2018-16673',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a77',
      fundamento: 'Cuando las infracciones sean cometidas por autoridades y organismos públicos, la autoridad de protección de datos dictará una resolución que sancione a las mismas con apercibimiento y propondrá la iniciación de actuaciones disciplinarias cuando proceda. No son de aplicación las sanciones económicas pecuniarias.'
    }
  },
  {
    enunciado: 'Conforme al artículo 34 de la Ley Orgánica 3/2018 (LOPDGDD), la designación del DELEGADO DE PROTECCIÓN DE DATOS (DPD) en la Subdelegación del Gobierno:',
    opciones: [
      {
        id: 'A',
        texto: 'Es preceptiva y obligatoria para todos los órganos y organismos de las Administraciones Públicas, debiendo comunicarse a la AEPD en el plazo de 10 días.',
        esCorrecta: true,
        explicacion: 'El art. 34 de la LOPDGDD exige obligatoriamente DPD en las Administraciones Públicas y comunicación a la AEPD en 10 días.'
      },
      {
        id: 'B',
        texto: 'Es potestativa y facultativa según el criterio exclusivo del Subdelegado.',
        esCorrecta: false,
        explicacion: 'En el sector público la figura del DPD es imperativa por ley.'
      },
      {
        id: 'C',
        texto: 'Exige que el designado sea obligatoriamente un funcionario del Subgrupo C2 sin formación técnica.',
        esCorrecta: false,
        explicacion: 'Se exige cualificación profesional y conocimientos especializados en Derecho de protección de datos.'
      },
      {
        id: 'D',
        texto: 'Sólo es obligatoria en empresas privadas que coticen en el IBEX 35.',
        esCorrecta: false,
        explicacion: 'Las Administraciones Públicas figuran en primer lugar en el listado obligatorio del art. 34.1.a).'
      }
    ],
    justificacionLegal: {
      norma: 'Ley Orgánica 3/2018 (LOPDGDD)',
      articulo: 'Artículo 34.1.a) y 34.3',
      codigoBOE: 'BOE-A-2018-16673',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a34',
      fundamento: 'Los responsables y encargados deberán designar un delegado de protección de datos en los supuestos previstos en el RGPD y cuando se trate de las autoridades y organismos públicos.'
    }
  },

  // --- SUPUESTO: LEY 19/2013 (TRANSPARENCIA) ---
  {
    enunciado: 'Ante la solicitud ciudadana de acceso a la información pública sobre los contratos menores de la unidad, si la Subdelegación no resolviera expresamente en el plazo legal de un mes, ¿cuál de las siguientes opciones describe con exactitud la situación jurídica conforme a la Ley 19/2013 de Transparencia?',
    opciones: [
      {
        id: 'A',
        texto: 'Se entenderá desestimada la solicitud por silencio negativo, pudiendo el solicitante interponer reclamación potestativa ante el Consejo de Transparencia y Buen Gobierno (CTBG) en el plazo de un mes.',
        esCorrecta: true,
        explicacion: 'El art. 20.4 de la Ley 19/2013 fija el silencio negativo, y el art. 24 prevé la reclamación potestativa previa ante el CTBG en el plazo de 1 mes.'
      },
      {
        id: 'B',
        texto: 'La solicitud se entenderá estimada por silencio positivo debiendo entregarse los expedientes en 48 horas.',
        esCorrecta: false,
        explicacion: 'En la Ley 19/2013 el silencio ante solicitudes de acceso es expresamente desestimatorio (art. 20.4).'
      },
      {
        id: 'C',
        texto: 'Caducará automáticamente el procedimiento extinguiéndose el derecho de acceso.',
        esCorrecta: false,
        explicacion: 'El silencio faculta al interesado a impugnar.'
      },
      {
        id: 'D',
        texto: 'Sólo cabe acudir directamente a los tribunales penales por delito de prevaricación.',
        esCorrecta: false,
        explicacion: 'El cauce administrativo propio es la reclamación ante el CTBG o recurso contencioso-administrativo.'
      }
    ],
    justificacionLegal: {
      norma: 'Ley 19/2013 de Transparencia',
      articulo: 'Artículos 20.4 y 24',
      codigoBOE: 'BOE-A-2013-12887',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887#a20',
      fundamento: 'Transcurrido el plazo máximo para resolver sin que se haya dictado y notificado resolución expresa se entenderá que la solicitud ha sido desestimada. Frente a toda resolución expresa o presunta en materia de acceso podrá interponerse una reclamación ante el Consejo de Transparencia y Buen Gobierno.'
    }
  },

  // --- SUPUESTO: LEY 47/2003 (GENERAL PRESUPUESTARIA) ---
  {
    enunciado: 'En la tramitación presupuestaria del contrato menor de equipamiento ofimático por importe de 14.500 euros, ¿qué documento y fases de ejecución del gasto deben tramitarse contablemente de acuerdo con el artículo 73 de la Ley 47/2003 (General Presupuestaria)?',
    opciones: [
      {
        id: 'A',
        texto: 'La aprobación y el compromiso del gasto pueden acumularse en un único acto contable (documento mixto AD), requiriendo la factura para el reconocimiento de la obligación (O).',
        esCorrecta: true,
        explicacion: 'En contratos menores y gastos corrientes es común acumular la aprobación y el compromiso en la fase contable mixta AD, previa a la fase O de reconocimiento de obligación con la factura reglamentaria.'
      },
      {
        id: 'B',
        texto: 'Debe realizarse previamente el pago material (P) antes de que el órgano de contratación apruebe el gasto.',
        esCorrecta: false,
        explicacion: 'El pago material (P) es la última fase del ciclo, nunca la inicial.'
      },
      {
        id: 'C',
        texto: 'Los contratos menores están exentos de fiscalización y de cualquier anotación presupuestaria.',
        esCorrecta: false,
        explicacion: 'El art. 118 de la LCSP y la LGP exigen aprobación del gasto e incorporación de la factura en todo contrato menor.'
      },
      {
        id: 'D',
        texto: 'Se requiere preceptivamente autorización previa del Consejo de Ministros al superar los diez mil euros.',
        esCorrecta: false,
        explicacion: 'La autorización del Consejo de Ministros se reserva para contratos de importe superior a 12 millones de euros (art. 324 LCSP).'
      }
    ],
    justificacionLegal: {
      norma: 'Ley 47/2003 General Presupuestaria',
      articulo: 'Artículo 73',
      codigoBOE: 'BOE-A-2003-21618',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21618#a73',
      fundamento: 'La aprobación es el acto mediante el cual se autoriza la realización de un gasto. El compromiso es el acto por el que se acuerda la realización de gastos previamente aprobados. Pueden acumularse en un solo acto cuando las normas lo prevean.'
    }
  }
];

// Rich integrated scenario context covering all laws
const CONTEXTO_SUPUESTO_PRACTICO_BOE_INTEGRAL = `En la Subdelegación del Gobierno se tramitan de forma simultánea diversas actuaciones administrativas y de gestión de recursos humanos y contratación pública:

1. PROCEDIMIENTO, RECURSOS Y CONTRATACIÓN: El 3 de octubre, doña Carmen Martín Sánchez, representante de la mercantil "Servicios Integrales S.L.", presentó telemáticamente solicitud de subvención. El 15 de octubre la unidad instructora notificó telemáticamente requerimiento de subsanación de 10 días hábiles advirtiendo del desistimiento (art. 68 Ley 39/2015), accediendo la interesada el jueves 17 de octubre. Paralelamente, la unidad tramita un contrato menor de suministro de equipamiento ofimático por importe de 14.500 euros más IVA (art. 118 Ley 9/2017) que requiere tramitación presupuestaria de las fases de ejecución del gasto (art. 73 Ley 47/2003 General Presupuestaria).

2. ÓRGANOS, ABSTENCIÓN Y RECURSOS HUMANOS (TREBEP, RD 364/1995 Y RD 365/1995): El 25 de octubre, don Javier Morales, Jefe de Sección encargado de evaluar la subvención y proponer el contrato menor, comunicó por escrito su parentesco en segundo grado de consanguinidad con el administrador de la empresa solicitante, suscitándose el deber de abstención (art. 23 Ley 40/2015). En materia de personal, doña Laura Gómez, funcionaria de carrera del Subgrupo C1 con 6 años de antigüedad en la AGE, solicita excedencia para atender al cuidado de su madre dependiente en primer grado de consanguinidad (TREBEP art. 89.4 y Real Decreto 365/1995 art. 13), habiendo obtenido simultáneamente destino en otra localidad mediante resolución de concurso de méritos publicada en el BOE el 20 de octubre (Real Decreto 364/1995 arts. 44 y 48).

3. PROTECCIÓN DE DATOS Y TRANSPARENCIA (LEY ORGÁNICA 3/2018 Y LEY 19/2013): El 24 de octubre, un particular formula solicitud por sede electrónica ejerciendo su derecho de supresión de datos personales («derecho al olvido») y oposición al tratamiento en los ficheros del registro de la unidad, consultándose al Delegado de Protección de Datos (DPD) de la Delegación sobre los plazos y límites aplicables según la Ley Orgánica 3/2018 (LOPDGDD). Simultáneamente, una asociación ciudadana solicita acceso público al expediente de contratación menor al amparo de la Ley 19/2013 de Transparencia.`;

// Filter unique by enunciado to avoid duplicates
function deduplicarPreguntas(lista: any[]): any[] {
  const vistos = new Set<string>();
  const resultado: any[] = [];
  lista.forEach((p) => {
    const key = p.enunciado.trim().toLowerCase().slice(0, 80);
    if (!vistos.has(key)) {
      vistos.add(key);
      resultado.push(p);
    }
  });
  return resultado;
}

// Combine all unit questions
const ALL_UNITARIAS = deduplicarPreguntas([
  ...PREGUNTAS_UNITARIAS_BOE,
  ...NUEVAS_UNITARIAS_EXTRA,
]).map((p, idx) => ({
  ...p,
  id: idx + 1,
}));

// Combine all supuesto questions
const ALL_SUPUESTOS = deduplicarPreguntas([
  ...PREGUNTAS_SUPUESTO_BOE,
  ...NUEVAS_SUPUESTOS_AMPLIADAS,
]).map((p, idx) => ({
  ...p,
  id: idx + 1,
}));

console.log('Total combined unique unitarias:', ALL_UNITARIAS.length);
console.log('Total combined unique supuestos:', ALL_SUPUESTOS.length);

// Generate boeQuestionsBank.ts file with complete matching and filtering
const targetFile = path.resolve(process.cwd(), 'src/constants/boeQuestionsBank.ts');

const fileContent = `import { PreguntaExamen } from '../types';
import { balancearYDistribuirOpciones } from '../utils/examBalancing';

/**
 * Batería exhaustiva de preguntas normativas oficiales rigurosamente fundamentadas
 * en la legislación consolidada del Boletín Oficial del Estado (www.boe.es).
 * Diseñadas para oposiciones de Administrativo (C1 AGE y Comunidad de Madrid).
 * Contiene ${ALL_UNITARIAS.length} preguntas unitarias y ${ALL_SUPUESTOS.length} preguntas de supuestos prácticos con 4 opciones
 * y cita legal oficial verificable.
 *
 * Cobertura normativa completa:
 * - Ley 39/2015 del Procedimiento Administrativo Común (LPACAP)
 * - Ley 40/2015 de Régimen Jurídico del Sector Público (LRJSP)
 * - Real Decreto Legislativo 5/2015 (TREBEP)
 * - Real Decreto 364/1995 (Ingreso y Provisión AGE)
 * - Real Decreto 365/1995 (Situaciones Administrativas AGE)
 * - Ley Orgánica 3/2018 (LOPDGDD)
 * - Ley 9/2017 de Contratos del Sector Público (LCSP)
 * - Ley 47/2003 General Presupuestaria (LGP)
 * - Ley 19/2013 de Transparencia
 * - Constitución Española de 1978
 * - Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid
 */

export const PREGUNTAS_UNITARIAS_BOE: PreguntaExamen[] = ${JSON.stringify(ALL_UNITARIAS, null, 2)};

export const CONTEXTO_SUPUESTO_PRACTICO_BOE = ${JSON.stringify(CONTEXTO_SUPUESTO_PRACTICO_BOE_INTEGRAL)};

export const PREGUNTAS_SUPUESTO_BOE: PreguntaExamen[] = ${JSON.stringify(ALL_SUPUESTOS, null, 2)};

/**
 * Normaliza un string para facilitar comparaciones y búsquedas de leyes
 */
function normalizarTexto(txt: string): string {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '');
}

/**
 * Determina qué leyes normativas aplican a una pregunta concreta
 */
function getNormaTagsDePregunta(p: PreguntaExamen): string[] {
  const tags: string[] = [];
  const normaNorm = normalizarTexto(p.justificacionLegal?.norma || '');
  const artNorm = normalizarTexto(p.justificacionLegal?.articulo || '');
  const fundNorm = normalizarTexto(p.justificacionLegal?.fundamento || '');
  const enunNorm = normalizarTexto(p.enunciado || '');
  const combined = normaNorm + ' ' + artNorm + ' ' + fundNorm + ' ' + enunNorm;

  // Real Decreto 365/1995 (Situaciones Administrativas)
  if (normaNorm.includes('365/1995') || combined.includes('365/1995') || combined.includes('situaciones administrativas')) {
    tags.push('365/1995');
  }

  // Real Decreto 364/1995 (Ingreso y Provisión)
  if (normaNorm.includes('364/1995') || combined.includes('364/1995') || combined.includes('provision de puestos') || combined.includes('ingreso del personal')) {
    tags.push('364/1995');
  }

  // TREBEP (RDL 5/2015)
  if (normaNorm.includes('trebep') || normaNorm.includes('5/2015') || combined.includes('trebep') || combined.includes('5/2015') || combined.includes('estatuto basico')) {
    tags.push('trebep');
  }

  // Ley Orgánica 3/2018 (LOPDGDD)
  if (normaNorm.includes('3/2018') || combined.includes('3/2018') || combined.includes('lopdgdd') || combined.includes('lopd') || combined.includes('proteccion de datos')) {
    tags.push('3/2018');
  }

  // Ley 39/2015 (LPACAP)
  if (normaNorm.includes('39/2015') || combined.includes('39/2015') || combined.includes('lpac') || combined.includes('procedimiento administrativo')) {
    tags.push('39/2015');
  }

  // Ley 40/2015 (LRJSP)
  if (normaNorm.includes('40/2015') || combined.includes('40/2015') || combined.includes('lrjsp') || combined.includes('sector publico')) {
    tags.push('40/2015');
  }

  // Ley 9/2017 (LCSP)
  if (normaNorm.includes('9/2017') || combined.includes('9/2017') || combined.includes('lcsp') || combined.includes('contratos del sector publico')) {
    tags.push('9/2017');
  }

  // Ley 47/2003 (LGP)
  if (normaNorm.includes('47/2003') || combined.includes('47/2003') || combined.includes('general presupuestaria') || combined.includes('lgp')) {
    tags.push('47/2003');
  }

  // Ley 19/2013 (Transparencia)
  if (normaNorm.includes('19/2013') || combined.includes('19/2013') || combined.includes('transparencia') || combined.includes('buen gobierno')) {
    tags.push('19/2013');
  }

  // Constitución Española
  if (normaNorm.includes('constitucion') || combined.includes('constitucion') || combined.includes('1978')) {
    tags.push('constitucion');
  }

  // Comunidad de Madrid
  if (normaNorm.includes('1/1983') || combined.includes('1/1983') || combined.includes('madrid') || combined.includes('cam')) {
    tags.push('cam');
  }

  return tags;
}

/**
 * Identifica los tags de leyes que el usuario ha solicitado explícitamente en el filtro
 */
function identificarTagsSolicitados(leyesStr: string, tematicasStr: string): string[] {
  const combined = normalizarTexto(leyesStr + ' ' + tematicasStr);
  const tags: string[] = [];

  // Match 365/1995 before general
  if (combined.includes('365/1995') || combined.includes('situaciones')) tags.push('365/1995');
  if (combined.includes('364/1995') || combined.includes('provision') || combined.includes('ingreso')) tags.push('364/1995');
  if (combined.includes('trebep') || combined.includes('5/2015') || combined.includes('empleado') || combined.includes('personal')) tags.push('trebep');
  if (combined.includes('3/2018') || combined.includes('lopd') || combined.includes('proteccion de datos')) tags.push('3/2018');
  if (combined.includes('39/2015') || combined.includes('lpac') || combined.includes('procedimiento')) tags.push('39/2015');
  if (combined.includes('40/2015') || combined.includes('lrjsp') || combined.includes('sector publico')) tags.push('40/2015');
  if (combined.includes('9/2017') || combined.includes('lcsp') || combined.includes('contrato')) tags.push('9/2017');
  if (combined.includes('47/2003') || combined.includes('lgp') || combined.includes('presupuest')) tags.push('47/2003');
  if (combined.includes('19/2013') || combined.includes('transparencia')) tags.push('19/2013');
  if (combined.includes('constitucion') || combined.includes('1978')) tags.push('constitucion');
  if (combined.includes('1/1983') || combined.includes('madrid') || combined.includes('cam')) tags.push('cam');

  return tags;
}

/**
 * Genera un banco normativo oficial garantizado distribuyendo equitativamente
 * las preguntas entre TODAS las leyes seleccionadas por el opositor (evitando sesgos
 * y asegurando cobertura de TREBEP, Reales Decretos 364/95 y 365/95, Ley 3/2018, etc.).
 */
export function generarBancoPreguntasBOE(
  tipo: 'unitario' | 'supuesto' = 'unitario',
  ambito: 'AGE' | 'CAM' | 'AMBOS' = 'AGE',
  cantidad: number = 10,
  tematicas: string = '',
  leyes: string = ''
) {
  const isSupuesto = tipo === 'supuesto';
  const fuenteBase = isSupuesto ? PREGUNTAS_SUPUESTO_BOE : PREGUNTAS_UNITARIAS_BOE;

  const allowedCounts = [5, 10, 20, 70];
  const numParsed = parseInt(String(cantidad), 10);
  const cantidadDeseada = allowedCounts.includes(numParsed) ? numParsed : Math.max(1, numParsed || 10);

  const tagsSolicitados = identificarTagsSolicitados(leyes, tematicas);

  let preguntasSeleccionadas: PreguntaExamen[] = [];

  if (tagsSolicitados.length > 0) {
    // Agrupar preguntas de la base de datos según los tags solicitados
    const bucketPorTag: Record<string, PreguntaExamen[]> = {};
    tagsSolicitados.forEach((t) => {
      bucketPorTag[t] = [];
    });

    fuenteBase.forEach((p) => {
      const pTags = getNormaTagsDePregunta(p);
      tagsSolicitados.forEach((t) => {
        if (pTags.includes(t)) {
          bucketPorTag[t].push(p);
        }
      });
    });

    // Si algún tag no tiene preguntas directas en fuenteBase (p. ej. en supuestos),
    // buscar preguntas relevantes en la base unitaria como complemento de fundamentación
    tagsSolicitados.forEach((t) => {
      if (bucketPorTag[t].length === 0) {
        PREGUNTAS_UNITARIAS_BOE.forEach((p) => {
          const pTags = getNormaTagsDePregunta(p);
          if (pTags.includes(t)) {
            bucketPorTag[t].push(p);
          }
        });
      }
    });

    // Filtramos los tags que tienen al menos una pregunta
    const tagsConPreguntas = tagsSolicitados.filter((t) => bucketPorTag[t].length > 0);

    // Priorizar en cada bucket las preguntas cuya norma o artículo cita directamente la ley
    tagsConPreguntas.forEach((t) => {
      bucketPorTag[t].sort((a, b) => {
        const aNorma = normalizarTexto((a.justificacionLegal?.norma || '') + ' ' + (a.justificacionLegal?.articulo || ''));
        const bNorma = normalizarTexto((b.justificacionLegal?.norma || '') + ' ' + (b.justificacionLegal?.articulo || ''));
        const aDirect = aNorma.includes(t) ? 1 : 0;
        const bDirect = bNorma.includes(t) ? 1 : 0;
        return bDirect - aDirect;
      });
    });

    if (tagsConPreguntas.length > 0) {
      // Reparto rigurosamente equitativo round-robin entre todas las leyes solicitadas
      const indicesPorTag: Record<string, number> = {};
      tagsConPreguntas.forEach((t) => {
        indicesPorTag[t] = 0;
      });

      for (let i = 0; i < cantidadDeseada; i++) {
        const tagActual = tagsConPreguntas[i % tagsConPreguntas.length];
        const bucket = bucketPorTag[tagActual];
        const idx = indicesPorTag[tagActual];
        indicesPorTag[tagActual] = idx + 1;

        const elegida = bucket[idx % bucket.length];
        preguntasSeleccionadas.push(elegida);
      }
    } else {
      // Si ningún tag dio coincidencia, usar la base completa
      for (let i = 0; i < cantidadDeseada; i++) {
        preguntasSeleccionadas.push(fuenteBase[i % fuenteBase.length]);
      }
    }
  } else {
    // Si no se especificaron leyes, distribuir uniformemente sobre la base completa
    for (let i = 0; i < cantidadDeseada; i++) {
      preguntasSeleccionadas.push(fuenteBase[i % fuenteBase.length]);
    }
  }

  // Clonar y numerar preguntas
  const preguntasGeneradas: PreguntaExamen[] = preguntasSeleccionadas.map((plantilla, i) => ({
    ...plantilla,
    id: i + 1,
    opciones: plantilla.opciones.map((opc) => ({
      ...opc,
    })),
    justificacionLegal: {
      ...plantilla.justificacionLegal,
    },
    esReserva: false,
  }));

  // APLICAR BALANCEO RIGUROSO DE OPCIONES:
  // Garantiza ~25% para cada letra (A, B, C, D) e independiza la longitud
  const preguntasBalanceadas = balancearYDistribuirOpciones(preguntasGeneradas);

  const titulo = isSupuesto
    ? \`Supuesto Práctico Oficial BOE (\${ambito}) - \${cantidadDeseada} Preguntas Normativas\`
    : \`Batería Oficial Normativa BOE (\${ambito}) - \${cantidadDeseada} Preguntas\`;

  // Construir leyes aplicadas representativas basadas en lo solicitado
  const leyesAplicadasBase = [
    'Ley 39/2015 del Procedimiento Administrativo Común (BOE-A-2015-10565)',
    'Ley 40/2015 de Régimen Jurídico del Sector Público (BOE-A-2015-10566)',
    'Real Decreto Legislativo 5/2015 TREBEP (BOE-A-2015-11719)',
    'Real Decreto 364/1995 de Ingreso y Provisión AGE (BOE-A-1995-8729)',
    'Real Decreto 365/1995 de Situaciones Administrativas AGE (BOE-A-1995-7451)',
    'Ley Orgánica 3/2018 de Protección de Datos Personales (BOE-A-2018-16673)',
    'Ley 9/2017 de Contratos del Sector Público (BOE-A-2017-12902)',
    'Ley 47/2003 General Presupuestaria (BOE-A-2003-21618)',
    'Ley 19/2013 de Transparencia (BOE-A-2013-12887)',
    'Constitución Española de 1978 (BOE-A-1978-31229)',
    ...(ambito === 'CAM' || ambito === 'AMBOS'
      ? ['Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid (BOE-A-1983-34139)']
      : []),
  ];

  return {
    source: 'curated_boe_official_bank',
    titulo,
    tipo: isSupuesto ? 'supuesto' : 'unitario',
    ambito,
    contextoCaso: isSupuesto ? CONTEXTO_SUPUESTO_PRACTICO_BOE : undefined,
    leyesBOEAplicadas: leyesAplicadasBase,
    preguntas: preguntasBalanceadas,
  };
}
`;

fs.writeFileSync(targetFile, fileContent, 'utf-8');
console.log('Successfully written boeQuestionsBank.ts with', ALL_UNITARIAS.length, 'unitarias and', ALL_SUPUESTOS.length, 'supuestos!');
