const fs = require('fs');

const unitarias = [
  // 1. CÁLCULO DE FECHAS - Meses de fecha a fecha (Art. 30.4 LPACAP)
  {
    id: 1,
    enunciado: 'Un acto administrativo resolutorio expreso es notificado formalmente a una empresa el día 31 de marzo de 2026. Si el interesado desea interponer recurso de alzada ante el superior jerárquico, cuyo plazo legal según el artículo 122.1 de la Ley 39/2015 es de un mes, ¿en qué fecha concluye exactamente el último día del plazo para interponerlo válidamente?',
    opciones: [
      { id: 'A', texto: 'El día 30 de abril de 2026, ya que el artículo 30.4 dispone que si en el mes de vencimiento no hubiera día equivalente al inicial del cómputo, el plazo expira el último día del mes.', esCorrecta: true, explicacion: 'El art. 30.4 de la Ley 39/2015 establece literalmente que si en el mes de vencimiento no hubiera día equivalente al inicial del cómputo, se entenderá que el plazo expira el último día del mes (abril sólo cuenta con 30 días).' },
      { id: 'B', texto: 'El día 2 de mayo de 2026, por trasladarse el vencimiento al segundo día hábil del mes de mayo al no tener abril 31 días naturales.', esCorrecta: false, explicacion: 'No se traslada a mayo; la regla expresa del artículo 30.4 hace que expire el último día de abril.' },
      { id: 'C', texto: 'El día 1 de mayo de 2026 a las 24:00 horas, completando 31 días naturales continuados desde el día de la notificación.', esCorrecta: false, explicacion: 'Los plazos fijados por meses se computan de fecha a fecha, no por suma de días naturales.' },
      { id: 'D', texto: 'El día 15 de mayo de 2026, al aplicarse la regla supletoria general de los procedimientos administrativos sancionadores.', esCorrecta: false, explicacion: 'El plazo de alzada contra acto expreso es taxativamente de un mes de fecha a fecha.' }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 30.4',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a30',
      fundamento: 'Si el plazo se fija en meses o años, éstos se computarán a partir del día siguiente a aquel en que tenga lugar la notificación o publicación del acto de que se trate. Si en el mes de vencimiento no hubiera día equivalente a aquel en que comienza el cómputo, se entenderá que el plazo expira el último día del mes.'
    }
  },

  // 2. PREGUNTA NEGATIVA - Nulidad de pleno derecho (Art. 47 LPACAP)
  {
    id: 2,
    enunciado: 'A tenor del artículo 47.1 de la Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas, señale cuál de los siguientes supuestos NO determina la nulidad de pleno derecho del acto administrativo:',
    opciones: [
      { id: 'A', texto: 'Los actos expresos o presuntos contrarios al ordenamiento jurídico por los que se adquieren facultades o derechos cuando se carezca de los requisitos esenciales.', esCorrecta: false, explicacion: 'Es una causa tasada de nulidad de pleno derecho tipificada expresamente en el artículo 47.1.f).' },
      { id: 'B', texto: 'Los actos que incurran en cualquier defecto de incompetencia jerárquica dictados por un órgano perteneciente a la misma Administración.', esCorrecta: true, explicacion: 'La incompetencia jerárquica no genera nulidad de pleno derecho, sino anulabilidad convalidable conforme al artículo 52.3 de la Ley 39/2015 (la nulidad exige incompetencia manifiesta por razón de la materia o del territorio).' },
      { id: 'C', texto: 'Los actos dictados prescindiendo total y absolutamente del procedimiento legalmente establecido o de las normas esenciales para la formación de la voluntad de órganos colegiados.', esCorrecta: false, explicacion: 'Constituye causa indubitada de nulidad absoluta según el artículo 47.1.e).' },
      { id: 'D', texto: 'Los actos que lesionen los derechos y libertades susceptibles de amparo constitucional contemplados en los artículos 14 a 29 y 30.2 de la Constitución.', esCorrecta: false, explicacion: 'Figura en la letra a) del artículo 47.1 como supuesto indiscutible de nulidad de pleno derecho.' }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 47.1 y Artículo 52.3',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a47',
      fundamento: 'Los actos son nulos de pleno derecho sólo por incompetencia manifiesta por razón de la materia o del territorio (art. 47.1.b). Si el vicio consistiera en incompetencia no determinante de nulidad (como la jerárquica), la convalidación podrá realizarse por el órgano competente cuando sea superior jerárquico del que dictó el acto viciado (art. 52.3).'
    }
  },

  // 3. CÁLCULO DE FECHAS - Cómputo de días hábiles excluyendo sábados y festivos (Art. 30.2 LPACAP)
  {
    id: 3,
    enunciado: 'Una unidad administrativa de la AGE notifica el jueves 1 de octubre de 2026 un requerimiento de subsanación de solicitud concediendo el plazo legal ordinario de diez días (art. 68.1 LPACAP). Sabiendo que los sábados y domingos son días inhábiles (días 3, 4, 10 y 11 de octubre) y que el lunes 12 de octubre es festivo nacional oficial de carácter inhábil, ¿en qué fecha vence exactamente el plazo para subsanar?',
    opciones: [
      { id: 'A', texto: 'El viernes 9 de octubre de 2026 al computarse el sábado como día hábil judicial.', esCorrecta: false, explicacion: 'En el procedimiento administrativo común los sábados son días inhábiles por mandato del art. 30.2 de la Ley 39/2015.' },
      { id: 'B', texto: 'El lunes 12 de octubre de 2026 por aplicación del calendario general de la sede electrónica.', esCorrecta: false, explicacion: 'El 12 de octubre es festivo nacional de carácter inhábil, por lo que no puede vencer un plazo hábil en dicha fecha.' },
      { id: 'C', texto: 'El jueves 15 de octubre de 2026 a las 23:59 horas en el registro electrónico.', esCorrecta: false, explicacion: 'El décimo día hábil contando desde el viernes 2 de octubre es el viernes 16 de octubre.' },
      { id: 'D', texto: 'El viernes 16 de octubre de 2026, ya que el cómputo se inicia el viernes 2 de octubre y se excluyen sábados, domingos y el festivo del 12 de octubre.', esCorrecta: true, explicacion: 'Días hábiles: 1º (vie 2), 2º (lun 5), 3º (mar 6), 4º (mié 7), 5º (jue 8), 6º (vie 9), 7º (mar 13), 8º (mié 14), 9º (jue 15) y 10º (vie 16 de octubre).' }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 30.2',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a30',
      fundamento: 'Siempre que por Ley o en el Derecho de la Unión Europea no se exprese otro cómputo, cuando los plazos se señalen por días, se entiende que éstos son hábiles, excluyéndose del cómputo los sábados, los domingos y los declarados festivos.'
    }
  },

  // 4. PREGUNTA NEGATIVA - Sujetos no obligados a relacionarse electrónicamente (Art. 14 LPACAP)
  {
    id: 4,
    enunciado: 'Conforme al artículo 14 de la Ley 39/2015, ¿cuál de los siguientes sujetos NO está obligado en todo caso a relacionarse obligatoriamente a través de medios electrónicos con las Administraciones Públicas?',
    opciones: [
      { id: 'A', texto: 'Las personas físicas que formulen una solicitud administrativa ordinaria actuando estrictamente en su propio nombre y por interés particular.', esCorrecta: true, explicacion: 'El artículo 14.1 reconoce a las personas físicas el derecho a elegir si se comunican con las Administraciones Públicas a través de medios electrónicos o en soporte papel, salvo que pertenezcan a colectivos obligados.' },
      { id: 'B', texto: 'Las entidades sin personalidad jurídica, tales como comunidades de bienes, herencias yacentes y comunidades de propietarios.', esCorrecta: false, explicacion: 'Están obligadas taxativamente en todo caso según el artículo 14.2.c).' },
      { id: 'C', texto: 'Quienes representen a un interesado que esté obligado a relacionarse electrónicamente con la Administración.', esCorrecta: false, explicacion: 'El art. 14.2.e) impone la obligación electrónica a quienes ejerzan la representación de un obligado.' },
      { id: 'D', texto: 'Las personas jurídicas, con independencia de su forma societaria, capital fundacional o sector de actividad económica.', esCorrecta: false, explicacion: 'Todas las personas jurídicas están obligadas por el artículo 14.2.a).' }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 14.1 y 14.2',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a14',
      fundamento: 'Las personas físicas podrán elegir en todo momento si se comunican con las Administraciones Públicas a través de medios electrónicos o no, salvo que estén obligadas a relacionarse a través de medios electrónicos con las Administraciones Públicas.'
    }
  },

  // 5. CÁLCULO DE FECHAS - Notificación electrónica y rechazo por 10 días naturales (Art. 43.2 LPACAP)
  {
    id: 5,
    enunciado: 'Una notificación administrativa preceptiva es puesta a disposición de una sociedad mercantil en la Dirección Electrónica Habilitada única (DEHú) el lunes 1 de junio de 2026 a las 09:15 horas. Si ningún representante de la sociedad accede a su contenido, ¿en qué fecha exacta se entenderá legalmente producida la eficacia del rechazo por el transcurso de diez días naturales previsto en el artículo 43.2 de la Ley 39/2015?',
    opciones: [
      { id: 'A', texto: 'El día 10 de junio de 2026, al computarse el propio día 1 de junio como primer día natural del plazo.', esCorrecta: false, explicacion: 'El cómputo de los plazos se inicia siempre el día siguiente a la puesta a disposición conforme a las reglas generales de plazos.' },
      { id: 'B', texto: 'El día 11 de junio de 2026, una vez transcurridos diez días naturales completos desde el día siguiente a su puesta a disposición.', esCorrecta: true, explicacion: 'El cómputo de 10 días naturales empieza el 2 de junio (2, 3, 4, 5, 6, 7, 8, 9, 10 y 11 de junio); transcurridos los diez días naturales, se entiende rechazado el 11 de junio.' },
      { id: 'C', texto: 'El día 15 de junio de 2026, por descontarse los sábados y domingos intermedios del calendario mercantil.', esCorrecta: false, explicacion: 'El art. 43.2 fija expresamente días naturales, por lo que sábados y domingos computan plenamente.' },
      { id: 'D', texto: 'El día 1 de julio de 2026, aplicándose supletoriamente el plazo de un mes para la caducidad del depósito telemático.', esCorrecta: false, explicacion: 'No existe plazo de un mes para el rechazo electrónico; son estrictamente diez días naturales.' }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 43.2',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a43',
      fundamento: 'Se entenderá rechazada cuando hayan transcurrido diez días naturales desde la puesta a disposición de la notificación sin que se acceda a su contenido.'
    }
  },

  // 6. PREGUNTA NEGATIVA - Materias indelegables (Art. 9.2 LRJSP)
  {
    id: 6,
    enunciado: 'De conformidad con el artículo 9.2 de la Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (LRJSP), señale qué materia SÍ puede ser válidamente objeto de delegación de competencias (es decir, señale la que NO está legalmente prohibida):',
    opciones: [
      { id: 'A', texto: 'Los asuntos que se refieran a relaciones con la Jefatura del Estado, la Presidencia del Gobierno de la Nación, las Cortes Generales y las Asambleas Legislativas autonómicas.', esCorrecta: false, explicacion: 'El artículo 9.2.a) prohíbe taxativamente delegar las relaciones con estas altas instituciones constitucionales.' },
      { id: 'B', texto: 'La adopción de disposiciones de carácter general con rango reglamentario dictadas por los Departamentos ministeriales.', esCorrecta: false, explicacion: 'La potestad reglamentaria es indelegable por mandato expreso del artículo 9.2.b).' },
      { id: 'C', texto: 'La resolución de un procedimiento administrativo sancionador ordinario cuando la ley reguladora específica no atribuya la competencia con carácter exclusivo e indelegable.', esCorrecta: true, explicacion: 'La potestad sancionadora ordinaria sí es susceptible de delegación conforme a las reglas generales, al no figurar entre las exclusiones taxativas del artículo 9.2.' },
      { id: 'D', texto: 'La resolución de recursos administrativos en los órganos administrativos que hayan dictado los actos objeto de recurso.', esCorrecta: false, explicacion: 'El artículo 9.2.c) veda terminantemente delegar la resolución de recursos en el propio órgano autor del acto impugnado.' }
    ],
    justificacionLegal: {
      norma: 'Ley 40/2015 de Régimen Jurídico del Sector Público',
      articulo: 'Artículo 9.2',
      codigoBOE: 'BOE-A-2015-10566',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566#a9',
      fundamento: 'En ningún caso podrán ser objeto de delegación las competencias relativas a: a) Los asuntos que se refieran a relaciones con la Jefatura del Estado, Presidencia del Gobierno... b) La adopción de disposiciones de carácter general. c) La resolución de recursos en los órganos administrativos que hayan dictado los actos objeto de recurso.'
    }
  },

  // 7. CÁLCULO DE FECHAS - Toma de posesión por concurso (Art. 48 RD 364/1995)
  {
    id: 7,
    enunciado: 'Un funcionario de carrera del Cuerpo General Administrativo de la AGE cesa en su puesto de trabajo el viernes 8 de mayo de 2026 tras haber obtenido un nuevo destino definitivo por concurso ordinario en el mismo municipio (misma localidad sin cambio de residencia). Sabiendo que el 9 y 10 de mayo son sábado y domingo (días inhábiles) y que no concurre festivo alguno, ¿en qué fecha concluye su plazo de toma de posesión según el artículo 48.1 del Real Decreto 364/1995?',
    opciones: [
      { id: 'A', texto: 'El lunes 11 de mayo de 2026, al considerarse el cese como un acto de eficacia inmediata en el primer día hábil siguiente.', esCorrecta: false, explicacion: 'El plazo posesorio no es de un día, sino de tres días hábiles.' },
      { id: 'B', texto: 'El miércoles 13 de mayo de 2026, al computar tres días hábiles completos (lunes 11, martes 12 y miércoles 13) iniciados al día siguiente del cese.', esCorrecta: true, explicacion: 'El art. 48.1 del RD 364/1995 fija tres días hábiles si no implica cambio de residencia. El cómputo comienza el día hábil siguiente al cese: lunes 11 (1º), martes 12 (2º) y miércoles 13 (3º).' },
      { id: 'C', texto: 'El lunes 8 de junio de 2026, ya que la provisión por concurso otorga en todo caso un mes natural al funcionario.', esCorrecta: false, explicacion: 'El plazo de un mes se reserva a destinos que comporten cambio de residencia o reingreso al servicio activo.' },
      { id: 'D', texto: 'El viernes 15 de mayo de 2026, al aplicarse supletoriamente el plazo de cinco días hábiles de la normativa de personal laboral.', esCorrecta: false, explicacion: 'Para funcionarios de la AGE el plazo reglado es de tres días hábiles.' }
    ],
    justificacionLegal: {
      norma: 'Real Decreto 364/1995 (Ingreso y Provisión AGE)',
      articulo: 'Artículo 48.1',
      codigoBOE: 'BOE-A-1995-8729',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729#a48',
      fundamento: 'El plazo de toma de posesión del nuevo destino obtenido será de tres días hábiles si no implica cambio de residencia del funcionario, o de un mes si comporta cambio de residencia o el reingreso al servicio activo.'
    }
  },

  // 8. PREGUNTA NEGATIVA - Faltas disciplinarias muy graves (Art. 95 TREBEP)
  {
    id: 8,
    enunciado: 'A tenor del artículo 95.2 del Real Decreto Legislativo 5/2015 (TREBEP), señale cuál de las siguientes conductas NO está legalmente tipificada como falta disciplinaria MUY GRAVE:',
    opciones: [
      { id: 'A', texto: 'El abandono del servicio, así como no hacerse cargo voluntariamente de las tareas o funciones encomendadas.', esCorrecta: false, explicacion: 'Constituye falta muy grave tipificada expresamente en el artículo 95.2.c).' },
      { id: 'B', texto: 'La adopción de acuerdos manifiestamente ilegales que causen perjuicio grave a la Administración o a los ciudadanos.', esCorrecta: false, explicacion: 'Es falta muy grave tipificada en el artículo 95.2.d).' },
      { id: 'C', texto: 'La falta de asistencia injustificada durante dos jornadas de trabajo consecutivas sin previo aviso al jefe de servicio.', esCorrecta: true, explicacion: 'La falta de asistencia de dos días aislados constituye falta grave o leve según el régimen disciplinario, pero NO es falta muy grave (las muy graves exigen abandono del servicio o reiteración continuada tipificada expresamente).' },
      { id: 'D', texto: 'La obstaculización al ejercicio de las libertades públicas y de los derechos sindicales de los empleados públicos.', esCorrecta: false, explicacion: 'Constituye falta muy grave tipificada en el artículo 95.2.e).' }
    ],
    justificacionLegal: {
      norma: 'Real Decreto Legislativo 5/2015 (TREBEP)',
      articulo: 'Artículo 95.2',
      codigoBOE: 'BOE-A-2015-11719',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719#a95',
      fundamento: 'El art. 95.2 enumera taxativamente las faltas muy graves (incumplimiento del deber de fidelidad a la Constitución, discriminación, abandono del servicio, adopción de acuerdos manifiestamente ilegales, obstaculización sindical...). Faltar dos días no es abandono de servicio ni falta muy grave.'
    }
  },

  // 9. CÁLCULO DE FECHAS - Ampliación de plazos (Art. 32 LPACAP)
  {
    id: 9,
    enunciado: 'En la tramitación de un procedimiento administrativo con un plazo legal ordinario de veinte días hábiles para aportar informes periciales, el interesado solicita motivadamente una ampliación de plazo. Si la Administración decide estimar la solicitud concediendo la ampliación máxima permitida por el artículo 32 de la Ley 39/2015, ¿cuántos días hábiles adicionales como máximo podrán otorgarse y en qué momento procesal debe acordarse?',
    opciones: [
      { id: 'A', texto: 'Un máximo de diez días hábiles adicionales, debiendo acordarse necesariamente antes del vencimiento del plazo ordinario de veinte días.', esCorrecta: true, explicacion: 'El art. 32.1 de la Ley 39/2015 establece que la ampliación no podrá exceder de la mitad de los plazos establecidos (la mitad de 20 es 10 días hábiles) y debe producirse antes del vencimiento del plazo originario.' },
      { id: 'B', texto: 'Un máximo de veinte días hábiles adicionales, duplicando el plazo originario previa solicitud del Consejo Consultivo.', esCorrecta: false, explicacion: 'El tope legal es de la mitad del plazo, no el doble.' },
      { id: 'C', texto: 'Cinco días naturales improrrogables comunicados tras la expiración del plazo para subsanar la extemporaneidad.', esCorrecta: false, explicacion: 'Los plazos vencidos no pueden ser objeto de ampliación (art. 32.3).' },
      { id: 'D', texto: 'Quince días hábiles siempre que no perjudique derechos de terceros reconocidos en el procedimiento.', esCorrecta: false, explicacion: 'El límite matemático estricto es la mitad (diez días hábiles).' }
    ],
    justificacionLegal: {
      norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
      articulo: 'Artículo 32.1 y 32.3',
      codigoBOE: 'BOE-A-2015-10565',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a32',
      fundamento: 'La Administración, salvo precepto en contrario, podrá conceder de oficio o a petición de los interesados, una ampliación de los plazos establecidos, que no exceda de la mitad de los mismos... En todo caso, la ampliación de los plazos deberá producirse antes del vencimiento del plazo de que se trate. En ningún caso podrá ser objeto de ampliación un plazo ya vencido.'
    }
  },

  // 10. PREGUNTA NEGATIVA - Motivos de abstención (Art. 23 LRJSP)
  {
    id: 10,
    enunciado: 'Conforme al artículo 23.2 de la Ley 40/2015 (LRJSP), señale cuál de las siguientes circunstancias NO constituye causa legal de abstención para las autoridades y el personal al servicio de las Administraciones:',
    opciones: [
      { id: 'A', texto: 'Tener interés personal en el asunto de que se trate o en otro en cuya resolución pudiera influir la de aquél.', esCorrecta: false, explicacion: 'Constituye el motivo básico de abstención del artículo 23.2.a).' },
      { id: 'B', texto: 'Tener relación de parentesco de consanguinidad de quinto grado o afinidad de tercer grado con el solicitante.', esCorrecta: true, explicacion: 'El límite legal del parentesco fijado en el artículo 23.2.b) alcanza hasta el cuarto grado de consanguinidad o segundo de afinidad. El quinto grado de consanguinidad o tercero de afinidad no constituye causa de abstención.' },
      { id: 'C', texto: 'Tener amistad íntima o enemistad manifiesta con alguna de las personas interesadas en el procedimiento.', esCorrecta: false, explicacion: 'Es causa taxativa de abstención tipificada en el artículo 23.2.c).' },
      { id: 'D', texto: 'Haber intervenido como perito o como testigo en el procedimiento de cuya resolución se trate.', esCorrecta: false, explicacion: 'Figura expresamente tipificada en el artículo 23.2.d).' }
    ],
    justificacionLegal: {
      norma: 'Ley 40/2015 de Régimen Jurídico del Sector Público',
      articulo: 'Artículo 23.2.b',
      codigoBOE: 'BOE-A-2015-10566',
      urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566#a23',
      fundamento: 'Son motivos de abstención: b) Tener parentesco de consanguinidad dentro del cuarto grado o de afinidad dentro del segundo, con cualquiera de los interesados. El quinto grado de consanguinidad no está incluido en la ley.'
    }
  }
];

console.log('Sample questions prepared. Now building full 70 unitarias and 20 supuestos.');
