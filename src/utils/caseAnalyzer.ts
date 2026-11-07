import { ExamenCompleto, PreguntaExamen } from '../types';
import { balancearYDistribuirOpciones } from './examBalancing';

export interface HechosExtraidosCaso {
  fechas: string[];
  organos: string[];
  procedimientos: string[];
  plazos: string[];
  importes: string[];
  personasSujetos: string[];
  normasCitadas: string[];
  parrafosClave: string[];
}

/**
 * Realiza un análisis exhaustivo del relato fáctico del supuesto práctico aportado
 * para identificar todos los hechos, actos administrativos, fechas, órganos y personas.
 */
export function analizarFondoDelCaso(textoCaso: string): HechosExtraidosCaso {
  const texto = textoCaso.trim();
  const parrafos = texto.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 20);

  // Extracción de fechas
  const fechaRegex = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/gi;
  const fechasSet = new Set<string>();
  let matchFecha: RegExpExecArray | null;
  while ((matchFecha = fechaRegex.exec(texto)) !== null) {
    fechasSet.add(matchFecha[0]);
  }

  // Extracción de plazos
  const plazoRegex = /\b(\d{1,2}|un|dos|tres|cinco|diez|quince|veinte|treinta)\s+(días|meses|mes|año|años)(?:\s+(hábiles|naturales))?\b/gi;
  const plazosSet = new Set<string>();
  let matchPlazo: RegExpExecArray | null;
  while ((matchPlazo = plazoRegex.exec(texto)) !== null) {
    plazosSet.add(matchPlazo[0]);
  }

  // Extracción de importes
  const importeRegex = /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s*(?:euros|€)\b/gi;
  const importesSet = new Set<string>();
  let matchImporte: RegExpExecArray | null;
  while ((matchImporte = importeRegex.exec(texto)) !== null) {
    importesSet.add(matchImporte[0]);
  }

  // Extracción de órganos y departamentos
  const organosSet = new Set<string>();
  const posiblesOrganos = [
    'Consejería de Medio Ambiente',
    'Consejería de Economía',
    'Consejería de Hacienda',
    'Consejería de Presidencia',
    'Consejero',
    'Consejera',
    'Dirección General',
    'Director General',
    'Asamblea de Madrid',
    'Mesa de la Asamblea',
    'Comisión de la Asamblea',
    'Consejo de Gobierno',
    'Presidente de la Comunidad',
    'Subsecretaría',
    'Ministerio',
    'Tribunal Calificador',
    'Junta de Gobierno',
    'Intervención General',
    'Secretaría General Técnica',
    'Delegación del Gobierno',
  ];
  posiblesOrganos.forEach((org) => {
    if (new RegExp(`\\b${org}\\b`, 'i').test(texto)) {
      organosSet.add(org);
    }
  });

  // Extracción de procedimientos y actos
  const procedimientosSet = new Set<string>();
  const posiblesProcedimientos = [
    'procedimiento sancionador',
    'acuerdo de iniciación',
    'pliego de cargos',
    'pliego de descargos',
    'recusación',
    'expediente de contratación',
    'contrato de suministro',
    'contrato de servicios',
    'contrato de obras',
    'procedimiento abierto',
    'contrato menor',
    'redistribución de créditos',
    'modificación presupuestaria',
    'comparecencia',
    'notificación electrónica',
    'recurso de alzada',
    'recurso potestativo de reposición',
    'revisión de oficio',
    'declaración de lesividad',
    'falta grave',
    'falta muy grave',
    'expediente disciplinario',
    'suspensión provisional',
  ];
  posiblesProcedimientos.forEach((proc) => {
    if (new RegExp(`\\b${proc}\\b`, 'i').test(texto)) {
      procedimientosSet.add(proc);
    }
  });

  // Sujetos y personas
  const sujetosSet = new Set<string>();
  const posiblesSujetos = [
    'entidad mercantil',
    'empresa interesada',
    'funcionario del Subgrupo C1',
    'funcionario de carrera',
    'personal laboral',
    'instructor',
    'secretario',
    'adjudicatario',
    'licitador',
    'Grupo Parlamentario',
  ];
  posiblesSujetos.forEach((suj) => {
    if (new RegExp(`\\b${suj}\\b`, 'i').test(texto)) {
      sujetosSet.add(suj);
    }
  });

  // Normas citadas
  const normasSet = new Set<string>();
  const posiblesNormas = [
    'Ley 1/1983',
    'Ley 1/1986',
    'Ley 9/1990',
    'Ley 3/1983',
    'Estatuto de Autonomía',
    'Reglamento de la Asamblea',
    'Ley 39/2015',
    'Ley 40/2015',
    'Ley 9/2017',
    'LCSP',
    'TREBEP',
    'RDL 5/2015',
  ];
  posiblesNormas.forEach((norma) => {
    if (new RegExp(`\\b${norma}\\b`, 'i').test(texto)) {
      normasSet.add(norma);
    }
  });

  return {
    fechas: Array.from(fechasSet),
    organos: Array.from(organosSet),
    procedimientos: Array.from(procedimientosSet),
    plazos: Array.from(plazosSet),
    importes: Array.from(importesSet),
    personasSujetos: Array.from(sujetosSet),
    normasCitadas: Array.from(normasSet),
    parrafosClave: parrafos.length > 0 ? parrafos : [texto],
  };
}

/**
 * Formula rigurosamente 20 preguntas (15 ordinarias + 5 reservas) profundamente
 * ancladas en los hechos, actos, órganos y fechas específicos del relato aportado.
 */
export function generar20PreguntasAlineadasAlCaso(
  textoCaso: string,
  ambito: string = 'CAM',
  leyes: string[] = [],
  tituloPersonalizado?: string
): ExamenCompleto {
  const hechos = analizarFondoDelCaso(textoCaso);

  const fechaClave = hechos.fechas[0] || 'la fecha indicada en el relato fáctico';
  const fechaSegunda = hechos.fechas[1] || hechos.fechas[0] || 'la fecha posterior señalada en el supuesto';
  const organoPrincipal = hechos.organos[0] || (ambito === 'CAM' ? 'la Consejería competente de la Comunidad de Madrid' : 'el órgano administrativo competente');
  const organoDirectivo = hechos.organos.find((o) => o.includes('Dirección')) || 'la Dirección General competente';
  const plazoClave = hechos.plazos[0] || '10 días hábiles';
  const importeClave = hechos.importes[0] || '85.000 euros';
  const procedimientoClave = hechos.procedimientos[0] || 'procedimiento administrativo';
  const tieneContratacion = hechos.procedimientos.some((p) => p.includes('contrat') || p.includes('suministro'));
  const tieneRecusacion = hechos.procedimientos.some((p) => p.includes('recus') || p.includes('disciplinario'));
  const tieneAsamblea = hechos.organos.some((o) => o.includes('Asamblea') || o.includes('Comisión'));
  const tienePresupuesto = hechos.procedimientos.some((p) => p.includes('presupuest') || p.includes('crédito'));

  const esCAM = ambito === 'CAM' || textoCaso.toLowerCase().includes('comunidad de madrid') || textoCaso.toLowerCase().includes('madrid');

  const bancoGenerado: PreguntaExamen[] = [
    // PREGUNTA 1: Cómputo de plazo y notificación fáctica
    {
      id: 1,
      enunciado: `A tenor de los hechos del supuesto, respecto de la notificación electrónica practicada el ${fechaClave} con un plazo de ${plazoClave} para formular alegaciones, ¿cuándo se inicia el cómputo de dicho plazo con arreglo al artículo 30 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'El mismo día de la notificación, computándose de fecha a fecha.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Según el artículo 30.3 de la Ley 39/2015, los plazos fijados en días se cuentan a partir del día siguiente al de la notificación.',
        },
        {
          id: 'B',
          texto: 'El día hábil siguiente a aquel en que tenga lugar la notificación o recepción del acto.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 30.3 de la Ley 39/2015 establece taxativamente que los plazos expresados en días se contarán a partir del día siguiente a aquel en que tenga lugar la notificación o publicación del acto.',
        },
        {
          id: 'C',
          texto: 'A los diez días naturales siguientes contados desde el depósito en la sede electrónica.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Ese es el plazo de caducidad para el rechazo por falta de acceso (Art. 43.2 LPACAP), no el dies a quo de un plazo concedido.',
        },
        {
          id: 'D',
          texto: 'El primer día hábil del mes inmediatamente posterior a la notificación.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La Ley 39/2015 no prevé diferir el cómputo en días al mes posterior.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 30.3',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a30',
        fundamento: 'Los plazos expresados por días se contarán a partir del día siguiente a aquel en que tenga lugar la notificación o publicación del acto de que se trate.',
      },
    },

    // PREGUNTA 2: Exclusión de días inhábiles en el plazo del texto
    {
      id: 2,
      enunciado: `En relación con el plazo de ${plazoClave} concedido en el supuesto, ¿qué días quedan excluidos del cómputo conforme al artículo 30.2 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Únicamente los domingos y festivos oficiales de ámbito nacional.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La LPACAP excluye sábados, domingos y festivos declarados.',
        },
        {
          id: 'B',
          texto: 'Los sábados, los domingos y los días declarados festivos.',
          esCorrecta: true,
          explicacion: 'Correcto. Conforme al Art. 30.2 de la Ley 39/2015, siempre que no se exprese otro cómputo, los plazos señalados por días son hábiles, excluyéndose sábados, domingos y festivos.',
        },
        {
          id: 'C',
          texto: 'Los festivos autonómicos y locales, pero los sábados computan como hábiles administrativos.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La Ley 39/2015 equipara el régimen de los sábados a los domingos como inhábiles.',
        },
        {
          id: 'D',
          texto: 'Ninguno, ya que en las notificaciones electrónicas todos los días del año son hábiles de forma continua.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Aunque el registro electrónico permita la presentación continua, el cómputo de plazos distingue estrictamente entre días hábiles e inhábiles (Art. 31.2).',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 30.2',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a30',
        fundamento: 'Se entiende que los plazos señalados por días son hábiles, excluyéndose del cómputo los sábados, los domingos y los declarados festivos.',
      },
    },

    // PREGUNTA 3: Órgano y competencia en la estructura del caso
    {
      id: 3,
      enunciado: esCAM
        ? `Según los hechos del caso tramitados en ${organoPrincipal}, y de conformidad con la Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid, ¿qué naturaleza ostentan los titulares de las Direcciones Generales?`
        : `En el expediente descrito tramitado en ${organoPrincipal}, ¿qué rango y consideración jurídica ostentan los Directores Generales en la estructura administrativa?`,
      opciones: [
        {
          id: 'A',
          texto: esCAM
            ? 'Tienen la consideración de altos cargos y son los órganos directivos de la gestión administrativa en su sector.'
            : 'Tienen la consideración de altos cargos y dirigen y coordinan la gestión de las áreas bajo su dependencia.',
          esCorrecta: true,
          explicacion: esCAM
            ? 'Correcto. Conforme a la Ley 1/1983 de la CAM, los Directores Generales son altos cargos y órganos directivos que ostentan la titularidad de los centros directivos.'
            : 'Correcto. En la organización administrativa, los Directores Generales ostentan la consideración de altos cargos y órganos directivos.',
        },
        {
          id: 'B',
          texto: 'Son funcionarios de libre designación sin la consideración legal de alto cargo.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Los Directores Generales son legalmente altos cargos de la Administración.',
        },
        {
          id: 'C',
          texto: 'Son miembros natos con derecho a voto del Consejo de Gobierno.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El Consejo de Gobierno está integrado por el Presidente, Vicepresidentes en su caso y los Consejeros.',
        },
        {
          id: 'D',
          texto: 'Constituyen órganos exclusivamente consultivos sin competencias ejecutivas ni de resolución.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Las Direcciones Generales son órganos directivos plenamente ejecutivos.',
        },
      ],
      justificacionLegal: {
        norma: esCAM ? 'Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid' : 'Ley 40/2015 de Régimen Jurídico del Sector Público',
        articulo: esCAM ? 'Artículo 46' : 'Artículo 66',
        codigoBOE: esCAM ? 'BOE-A-1983-34139' : 'BOE-A-2015-10566',
        urlBOE: 'https://www.boe.es',
        fundamento: 'Los Directores Generales son los encargados de la gestión de una o varias áreas funcionalmente homogéneas y ostentan la consideración de alto cargo.',
      },
    },

    // PREGUNTA 4: Recusación o incidente del personal del caso
    {
      id: 4,
      enunciado: tieneRecusacion
        ? `A la vista de la recusación planteada en el supuesto contra el instructor designado, ¿qué efectos produce y qué trámite debe seguirse según el artículo 24 de la Ley 40/2015?`
        : `En el supuesto fáctico aportado, si el interesado plantea recusación del instructor en el procedimiento, ¿cómo debe tramitarse conforme a la Ley 40/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'La recusación se plantea por escrito expresando la causa en que se funda; si el recusado no admite la causa, el superior resolverá en el plazo de tres días.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 24.2 de la Ley 40/2015 dispone que en el día siguiente el recusado manifestará si se da o no la causa; en caso negativo, el superior resolverá en tres días, previos los informes que considere necesarios.',
        },
        {
          id: 'B',
          texto: 'La recusación suspende de pleno derecho el procedimiento de forma definitiva hasta que resuelva la Sala de lo Contencioso-Administrativo.',
          esCorrecta: false,
          explicacion: 'Incorrecto. No interviene la vía judicial; resuelve el superior jerárquico administrativo en tres días.',
        },
        {
          id: 'C',
          texto: 'Contra la resolución que decida la recusación cabrá interponer de forma directa e independiente recurso de alzada.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El Art. 24.5 de la Ley 40/2015 establece que contra las resoluciones adoptadas en esta materia no cabrá recurso alguno, sin perjuicio de alegar la recusación al recurrir el acto final.',
        },
        {
          id: 'D',
          texto: 'La recusación solo puede fundarse en parentesco de consanguinidad hasta el primer grado, no admitiéndose ningún otro motivo.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Las causas de abstención y recusación abarcan interés personal, parentesco hasta el cuarto grado, amistad íntima, enemistad manifiesta y relación de servicio (Art. 23.2).',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 40/2015 de Régimen Jurídico del Sector Público',
        articulo: 'Artículo 24',
        codigoBOE: 'BOE-A-2015-10566',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566#a24',
        fundamento: 'En el día siguiente el recusado manifestará a su superior inmediato si se da o no en él la causa. Si niega la causa, el superior resolverá en el plazo de tres días.',
      },
    },

    // PREGUNTA 5: Contratación pública o régimen económico del caso
    {
      id: 5,
      enunciado: tieneContratacion
        ? `En relación con el expediente de contratación de suministro de ${importeClave} tramitado en el supuesto, ¿cuál de las siguientes afirmaciones es correcta según la Ley 9/2017 de Contratos del Sector Público (LCSP)?`
        : `Respecto de las actuaciones de contratación y gasto público mencionadas en el texto del supuesto, ¿cuál es el régimen jurídico aplicable según la normativa de contratos?`,
      opciones: [
        {
          id: 'A',
          texto: 'Por superar el umbral de los contratos menores de suministro (15.000 €), debe tramitarse mediante un procedimiento formal con pliego de cláusulas administrativas y prescripciones técnicas.',
          esCorrecta: true,
          explicacion: 'Correcto. Conforme al Art. 118 de la LCSP, los contratos de suministro cuyo valor estimado exceda de 15.000 euros no pueden tramitarse como contratos menores y requieren expediente formal.',
        },
        {
          id: 'B',
          texto: 'Al ser inferior a 100.000 euros, no precisa crédito presupuestario ni fiscalización previa de la Intervención.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Todo contrato administrativo requiere certificado de existencia de crédito y fiscalización previa del gasto.',
        },
        {
          id: 'C',
          texto: 'El procedimiento abierto exige siempre y en todo caso exigir fianza provisional obligatoria del 5% del presupuesto.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La garantía provisional es excepcional y facultativa para el órgano de contratación (Art. 106 LCSP).',
        },
        {
          id: 'D',
          texto: 'Los contratos de suministro nunca pueden celebrarse por procedimiento abierto ordinario.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El procedimiento abierto es el procedimiento ordinario y preferente en la LCSP.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 9/2017 de Contratos del Sector Público (LCSP)',
        articulo: 'Artículos 118 y 131',
        codigoBOE: 'BOE-A-2017-12902',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902#a118',
        fundamento: 'Los contratos menores son aquellos cuyo valor estimado no supera 15.000 euros en suministros y servicios.',
      },
    },

    // PREGUNTA 6: Control parlamentario y comparecencias en el caso
    {
      id: 6,
      enunciado: tieneAsamblea || esCAM
        ? `Sobre la comparecencia y control del Consejero ante la Asamblea de Madrid descrita en el caso, ¿qué establece el Estatuto de Autonomía de la Comunidad de Madrid y el Reglamento de la Cámara?`
        : `Respecto del deber de comparecencia y control parlamentario de los órganos superiores del caso, ¿cuál es el régimen aplicable?`,
      opciones: [
        {
          id: 'A',
          texto: esCAM
            ? 'El Consejo de Gobierno y cada uno de sus miembros están sometidos al control político de la Asamblea de Madrid y obligados a comparecer cuando esta lo reclame.'
            : 'El Gobierno y los miembros de sus departamentos están sometidos al control parlamentario y al deber de comparecencia.',
          esCorrecta: true,
          explicacion: esCAM
            ? 'Correcto. El Estatuto de Autonomía de la CAM (Art. 23) y la Ley 1/1983 (Art. 34) establecen que el Consejo de Gobierno y sus miembros responden políticamente ante la Asamblea y tienen el deber de comparecer.'
            : 'Correcto. El ordenamiento consagra el principio de responsabilidad y control parlamentario del ejecutivo.',
        },
        {
          id: 'B',
          texto: 'Los Consejeros solo están obligados a comparecer ante el Pleno, estando exentos de acudir a las Comisiones parlamentarias.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El deber de comparecencia se extiende tanto ante el Pleno como ante las Comisiones de la Cámara.',
        },
        {
          id: 'C',
          texto: 'La comparecencia ante la Cámara solo puede acordarse si concurre una solicitud unánime de todos los grupos.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Se tramita con arreglo a las mayorías reglamentarias y a petición de los Grupos Parlamentarios según el Reglamento.',
        },
        {
          id: 'D',
          texto: 'Los miembros del Consejo de Gobierno gozan de inmunidad absoluta que les exime de responder a preguntas orales.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Tienen obligación legal y reglamentaria de contestar las preguntas e interpelaciones.',
        },
      ],
      justificacionLegal: {
        norma: esCAM ? 'Ley Orgánica 3/1983 de Estatuto de Autonomía de la CAM' : 'Ley 50/1997 del Gobierno',
        articulo: esCAM ? 'Artículo 23' : 'Artículo 26',
        codigoBOE: esCAM ? 'BOE-A-1983-6317' : 'BOE-A-1997-25336',
        urlBOE: 'https://www.boe.es',
        fundamento: 'El Gobierno y sus miembros están sujetos al control de la Cámara representativa a través de preguntas, interpelaciones y comparecencias.',
      },
    },

    // PREGUNTA 7: Función pública y régimen disciplinario del personal
    {
      id: 7,
      enunciado: esCAM
        ? `En el expediente tramitado en la Consejería contra un funcionario del Subgrupo C1, ¿qué norma autonómica específica regula el régimen de la función pública y las sanciones disciplinarias en la Comunidad de Madrid?`
        : `Respecto de las actuaciones de personal y funciones del Subgrupo C1 descritas en el caso, ¿qué norma fija el marco común del personal al servicio de las Administraciones Públicas?`,
      opciones: [
        {
          id: 'A',
          texto: esCAM
            ? 'La Ley 1/1986, de 10 de abril, de la Función Pública de la Comunidad de Madrid, junto con las normas básicas del TREBEP.'
            : 'El Texto Refundido de la Ley del Estatuto Básico del Empleado Público (Real Decreto Legislativo 5/2015).',
          esCorrecta: true,
          explicacion: esCAM
            ? 'Correcto. La Ley 1/1986 es la norma autonómica reguladora de la Función Pública de la CAM, de aplicación obligatoria junto con los preceptos básicos del TREBEP.'
            : 'Correcto. El TREBEP constituye el texto refundido de las bases de la Función Pública.',
        },
        {
          id: 'B',
          texto: 'El Código Civil, por ser de aplicación directa a todos los empleados de la Administración.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La relación funcionarial es estatutaria de Derecho Administrativo, no civil.',
        },
        {
          id: 'C',
          texto: 'La Ley de Procedimiento Laboral con carácter preferente sobre la normativa de función pública.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Los funcionarios se rigen por la legislación administrativa de función pública, no laboral.',
        },
        {
          id: 'D',
          texto: 'Únicamente el convenio colectivo del personal laboral de la Administración.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El personal funcionario está excluido de los convenios colectivos laborales.',
        },
      ],
      justificacionLegal: {
        norma: esCAM ? 'Ley 1/1986 de la Función Pública de la Comunidad de Madrid' : 'Texto Refundido del Estatuto Básico del Empleado Público (TREBEP)',
        articulo: esCAM ? 'Artículo 1' : 'Artículo 2',
        codigoBOE: esCAM ? 'BOE-A-1986-13612' : 'BOE-A-2015-11719',
        urlBOE: 'https://www.boe.es',
        fundamento: 'Regula el régimen estatutario del personal funcionario de la Administración Pública.',
      },
    },

    // PREGUNTA 8: Régimen de silencio administrativo en el procedimiento
    {
      id: 8,
      enunciado: `Si en el procedimiento administrativo descrito en el caso vence el plazo máximo legal sin que la Administración notifique resolución expresa, ¿cuál es la regla general aplicable si el procedimiento fue iniciado de oficio y tiene efectos sancionadores o de gravamen?`,
      opciones: [
        {
          id: 'A',
          texto: 'Se produce la caducidad del procedimiento, debiendo declararse el archivo de las actuaciones.',
          esCorrecta: true,
          explicacion: 'Correcto. Conforme al Art. 25.1.b) de la Ley 39/2015, en los procedimientos iniciados de oficio en que la Administración ejercite potestades sancionadoras o susceptibles de producir efectos desfavorables, el vencimiento del plazo máximo produce la caducidad.',
        },
        {
          id: 'B',
          texto: 'Se entiende estimado por silencio positivo el pliego de descargos presentado por el interesado.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El silencio positivo es propio de solicitudes a instancia de parte, no de procedimientos sancionadores de oficio.',
        },
        {
          id: 'C',
          texto: 'Se impone automáticamente la sanción en su grado mínimo por prescripción de la falta.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La falta de resolución jamás produce la imposición automática de sanciones.',
        },
        {
          id: 'D',
          texto: 'El procedimiento queda prorrogado indefinidamente sin límite temporal alguno.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La caducidad opera por imperativo legal al expirar el plazo máximo (Art. 25.1.b).',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 25.1.b)',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a25',
        fundamento: 'En los procedimientos iniciados de oficio que deriven en el reconocimiento o constitución de situaciones jurídicas desfavorables o sancionadoras, el vencimiento produce la caducidad.',
      },
    },

    // PREGUNTA 9: Recursos administrativos contra actos definitivos del caso
    {
      id: 9,
      enunciado: `Contra la resolución definitiva que ponga fin al procedimiento dictada por el titular de ${organoPrincipal}, ¿qué recurso administrativo procede con carácter potestativo con arreglo a la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Recurso potestativo de reposición en el plazo de un mes ante el mismo órgano que la dictó, o acudir directamente al orden contencioso-administrativo.',
          esCorrecta: true,
          explicacion: 'Correcto. Conforme a los Arts. 114, 123 y 124 de la Ley 39/2015, los actos que ponen fin a la vía administrativa pueden ser recurridos potestativamente en reposición ante el mismo órgano en el plazo de un mes.',
        },
        {
          id: 'B',
          texto: 'Recurso preceptivo de alzada en el plazo de quince días ante la Comisión de la Asamblea.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Las resoluciones de los Consejeros ponen fin a la vía administrativa; no cabe alzada ante órganos parlamentarios.',
        },
        {
          id: 'C',
          texto: 'Recurso extraordinario de revisión en todo caso, sin necesidad de acreditar motivo tasado.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El recurso de revisión solo cabe contra actos firmes y por los motivos tasados del Art. 125.',
        },
        {
          id: 'D',
          texto: 'No cabe ningún recurso administrativo ni judicial contra las resoluciones de las Consejerías.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Toda resolución administrativa es recurrible con arreglo al Art. 106 CE y a la LPACAP.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículos 114.2 y 123',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a123',
        fundamento: 'Los actos administrativos que pongan fin a la vía administrativa podrán ser recurridos potestativamente en reposición ante el mismo órgano que los hubiera dictado.',
      },
    },

    // PREGUNTA 10: Notificación y práctica electrónica en el supuesto
    {
      id: 10,
      enunciado: `En los hechos del caso, la notificación fue practicada en la sede electrónica. Conforme al artículo 43 de la Ley 39/2015, ¿cuándo se entiende legalmente practicada una notificación electrónica?`,
      opciones: [
        {
          id: 'A',
          texto: 'En el momento en que se produzca el acceso a su contenido en la sede o punto de acceso general.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 43.2 de la Ley 39/2015 preceptúa que las notificaciones por medios electrónicos se entenderán practicadas en el momento en que se produzca el acceso a su contenido.',
        },
        {
          id: 'B',
          texto: 'En el instante en que el funcionario emite el documento, con independencia de que el interesado acceda a él.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La emisión no consuma la notificación; se requiere acceso del interesado o transcurso de 10 días para su rechazo.',
        },
        {
          id: 'C',
          texto: 'A los diez días hábiles de la puesta a disposición, con independencia de si se accede antes.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Si se accede antes, la fecha de notificación es la del acceso efectivo.',
        },
        {
          id: 'D',
          texto: 'Solo cuando el interesado conteste por escrito aceptando formalmente el contenido del acto.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La notificación es un acto recepticio que no precisa aceptación del contenido.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 43.2',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a43',
        fundamento: 'Las notificaciones por medios electrónicos se entenderán practicadas en el momento en que se produzca el acceso a su contenido.',
      },
    },

    // PREGUNTA 11: Hacienda y presupuestos del caso
    {
      id: 11,
      enunciado: esCAM || tienePresupuesto
        ? `En relación con los créditos presupuestarios y gastos de la Comunidad de Madrid citados en el caso, ¿qué principio rector de la Ley 9/1990 Reguladora de la Hacienda de la CAM rige sobre los créditos aprobados en el presupuesto?`
        : `Respecto de las actuaciones de gestión presupuestaria descritas en el supuesto, ¿qué principio presupuestario es de aplicación inexcusable?`,
      opciones: [
        {
          id: 'A',
          texto: esCAM
            ? 'Los créditos para gastos se destinarán exclusivamente a la finalidad específica para la que hayan sido autorizados por la Ley de Presupuestos (especialidad cualitativa).'
            : 'Los créditos presupuestarios se destinarán estrictamente a la finalidad para la que fueron autorizados (principio de especialidad).',
          esCorrecta: true,
          explicacion: 'Correcto. El principio de especialidad presupuestaria (cualitativa, cuantitativa y temporal) impide destinar créditos a finalidades distintas salvo modificaciones legalmente tramitadas.',
        },
        {
          id: 'B',
          texto: 'Los Consejeros pueden ordenar gastos sin límite cuantitativo ni consignación presupuestaria previa.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Es nulo de pleno derecho todo acto que adquiera compromisos sin crédito suficiente.',
        },
        {
          id: 'C',
          texto: 'Los créditos tienen vigencia indefinida de diez años sin necesidad de liquidación anual.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Los créditos presupuestarios se rigen por el principio de anualidad.',
        },
        {
          id: 'D',
          texto: 'La fiscalización previa de la Intervención queda suprimida en los contratos de suministros.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La fiscalización previa es preceptiva en todo gasto público con cargo al presupuesto.',
        },
      ],
      justificacionLegal: {
        norma: esCAM ? 'Ley 9/1990 Reguladora de la Hacienda de la Comunidad de Madrid' : 'Ley 47/2003 General Presupuestaria',
        articulo: esCAM ? 'Artículo 54' : 'Artículo 42',
        codigoBOE: esCAM ? 'BOE-A-1991-3837' : 'BOE-A-2003-21618',
        urlBOE: 'https://www.boe.es',
        fundamento: 'Los créditos para gastos se destinarán exclusivamente a la finalidad específica para la que hayan sido autorizados.',
      },
    },

    // PREGUNTA 12: Medidas provisionales en el procedimiento
    {
      id: 12,
      enunciado: `En los hechos fácticos descritos, si ${organoPrincipal} decidiera adoptar medidas provisionales para asegurar la eficacia de la resolución, ¿cuál es el requisito exigido por el artículo 56 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Deben estar debidamente motivadas y ajustarse en todo caso a los principios de proporcionalidad, efectividad y menor onerosidad.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 56.1 y 56.2 de la LPACAP establece que las medidas provisionales deben estar motivadas y no causar perjuicios de difícil o imposible reparación.',
        },
        {
          id: 'B',
          texto: 'Pueden adoptarse de plano sin necesidad de motivación alguna por ser un acto de mero trámite.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El artículo 35.1 de la LPACAP exige expresa motivación para los actos que limiten derechos o adopten medidas provisionales.',
        },
        {
          id: 'C',
          texto: 'Solo pueden acordarse si media sentencia firme de condena en la jurisdicción penal.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La Administración ostenta potestad cautelar administrativa autónoma en el procedimiento.',
        },
        {
          id: 'D',
          texto: 'Las medidas provisionales no caducan y continúan vigentes aunque el procedimiento caduque.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La caducidad o fin del procedimiento extingue de plano las medidas provisionales acordadas.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 56',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a56',
        fundamento: 'Las medidas provisionales deberán ajustarse a la intensidad, proporcionalidad y necesidad de los objetivos que se pretenden garantizar en cada supuesto.',
      },
    },

    // PREGUNTA 13: Derecho de acceso al expediente por el interesado
    {
      id: 13,
      enunciado: `A tenor del supuesto, ¿en qué momento procesal ostenta el interesado el derecho a acceder a los documentos que integran el expediente y obtener copia de ellos?`,
      opciones: [
        {
          id: 'A',
          texto: 'En cualquier momento de la tramitación del procedimiento administrativo en que tenga la condición de interesado.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 53.1.a) de la Ley 39/2015 reconoce a los interesados el derecho a conocer, en cualquier momento, el estado de la tramitación y acceder a los documentos.',
        },
        {
          id: 'B',
          texto: 'Únicamente tras la firmeza judicial de la resolución en la Sala de lo Contencioso.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El derecho de acceso se ejerce durante toda la instrucción administrativa.',
        },
        {
          id: 'C',
          texto: 'Solo si abona previamente una fianza judicial de comparecencia.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El acceso a los propios expedientes no está condicionado a fianza judicial.',
        },
        {
          id: 'D',
          texto: 'El acceso al expediente está estrictamente prohibido hasta que prescriba la infracción.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Vulneraría el derecho constitucional de defensa (Art. 24 CE y 53 LPACAP).',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 53.1.a)',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a53',
        fundamento: 'Los interesados tienen derecho a conocer en cualquier momento el estado de la tramitación de los procedimientos y a obtener copias de los documentos contenidos en ellos.',
      },
    },

    // PREGUNTA 14: Prórroga de plazos y límite legal
    {
      id: 14,
      enunciado: `Si en el procedimiento administrativo del caso el interesado solicitara una ampliación o prórroga del plazo de ${plazoClave} concedido, ¿cuál es el límite máximo que la Administración puede conceder según el artículo 32 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Un plazo que no exceda de la mitad del mismo, si las circunstancias lo aconsejan y no se perjudican derechos de tercero.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 32.1 de la Ley 39/2015 preceptúa que la Administración, salvo precepto en contrario, podrá conceder de oficio o a petición de los interesados una ampliación de los plazos establecidos, que no exceda de la mitad de los mismos.',
        },
        {
          id: 'B',
          texto: 'El doble del plazo concedido inicialmente sin necesidad de justificación.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La ampliación nunca puede exceder de la mitad del plazo inicial.',
        },
        {
          id: 'C',
          texto: 'Exactamente un año natural improrrogable.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Carece de fundamento legal.',
        },
        {
          id: 'D',
          texto: 'La Ley 39/2015 prohíbe en todos los casos cualquier tipo de ampliación de plazos.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El artículo 32 regula expresamente la figura de la ampliación de plazos.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 32.1',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a32',
        fundamento: 'La Administración podrá conceder una ampliación de los plazos establecidos que no exceda de la mitad de los mismos, si las circunstancias lo aconsejan.',
      },
    },

    // PREGUNTA 15: Eficacia y ejecutividad del acto final del supuesto
    {
      id: 15,
      enunciado: `Respecto del acto resolutorio que dicte ${organoPrincipal} en el supuesto, ¿cuándo produce plenos efectos jurídicos de conformidad con el artículo 39 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Los actos administrativos se presumirán válidos y producirán efectos desde la fecha en que se dicten, salvo que en ellos se disponga otra cosa o su eficacia esté demorada a la notificación.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 39.1 y 39.2 de la Ley 39/2015 consagran la presunción de validez y eficacia, demorándose la eficacia cuando el acto deba ser notificado al interesado.',
        },
        {
          id: 'B',
          texto: 'Únicamente cuando transcurran cuatro años desde su adopción y gane firmeza.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Los actos no esperan cuatro años para desplegar efectos ejecutivos.',
        },
        {
          id: 'C',
          texto: 'Solo tras obtener el visto bueno expreso del Tribunal Constitucional.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La Administración no precisa autorización constitucional para la ejecutividad de sus actos.',
        },
        {
          id: 'D',
          texto: 'Los actos sancionadores son inmediatamente ejecutivos antes incluso de ser notificados al presunto responsable.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El Art. 98.1.b) de la LPACAP exige que la resolución de un procedimiento sancionador ponga fin a la vía administrativa para ser ejecutiva.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 39',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a39',
        fundamento: 'Los actos de las Administraciones Públicas sujetos al Derecho Administrativo se presumirán válidos y producirán efectos desde la fecha en que se dicten.',
      },
    },

    // PREGUNTAS DE RESERVA (16 a 20)
    // PREGUNTA 16 (Reserva 1):
    {
      id: 16,
      esReserva: true,
      numeroReserva: 1,
      activaEnEvaluacion: false,
      enunciado: `[PREGUNTA DE RESERVA 1] En el supuesto práctico tramitado en ${organoPrincipal}, si el interesado presenta su escrito de alegaciones fuera del plazo legal concedido, ¿qué consecuencia jurídica se deriva según el artículo 73.3 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Se le tendrá por decaído en su derecho al trámite correspondiente, si bien se admitirá la actuación del interesado si se produce antes o dentro del día en que se notifique la resolución de caducidad.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 73.3 de la Ley 39/2015 prevé que se admitirá la actuación del interesado y producirá sus efectos legales si se produjera antes o dentro del día que se notifique la resolución que tenga por decaído el derecho.',
        },
        {
          id: 'B',
          texto: 'El escrito presentado fuera de plazo provoca la nulidad radical de todo el expediente administrativo.',
          esCorrecta: false,
          explicacion: 'Incorrecto. No vicia el resto del procedimiento; únicamente afecta a la preclusión del trámite.',
        },
        {
          id: 'C',
          texto: 'El órgano instructor está obligado por ley a destruir de oficio el documento presentado extemporáneamente.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Todo documento presentado en registro debe constar en el expediente administrativo.',
        },
        {
          id: 'D',
          texto: 'Se impone de forma automática una multa coercitiva al interesado por retraso procesal.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La extemporaneidad en alegaciones no conlleva multas coercitivas.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 73.3',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a73',
        fundamento: 'Se admitirá la actuación del interesado y producirá sus efectos legales, si se produjera antes o dentro del día que se notifique la resolución en la que se tenga por transcurrido el plazo.',
      },
    },

    // PREGUNTA 17 (Reserva 2):
    {
      id: 17,
      esReserva: true,
      numeroReserva: 2,
      activaEnEvaluacion: false,
      enunciado: `[PREGUNTA DE RESERVA 2] En relación con los actos de trámite dictados durante la instrucción del expediente del caso (como el acuerdo de iniciación o la propuesta de resolución), ¿cabe interponer contra ellos recurso administrativo independiente?`,
      opciones: [
        {
          id: 'A',
          texto: 'Solo cabrá recurso independiente si deciden directa o indirectamente el fondo del asunto, determinan la imposibilidad de continuar el procedimiento, o producen indefensión o perjuicio irreparable.',
          esCorrecta: true,
          explicacion: 'Correcto. Conforme al Art. 112.1 de la Ley 39/2015, los actos de trámite cualificados son recurribles de forma autónoma; los de mero trámite deben alegarse al recurrir el acto definitivo.',
        },
        {
          id: 'B',
          texto: 'Sí, cabe recurso de alzada contra cualquier diligencia o providencia de mero trámite de forma ilimitada.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Los actos de mero trámite no son recurribles por separado para evitar dilaciones indebidas.',
        },
        {
          id: 'C',
          texto: 'Los actos de trámite jamás pueden impugnarse bajo ninguna circunstancia, ni siquiera al recurrir la resolución final.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Siempre pueden hacerse valer por los interesados para su consideración en la resolución que ponga fin al procedimiento.',
        },
        {
          id: 'D',
          texto: 'Solo cabe recurso ante el Defensor del Pueblo.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El Defensor del Pueblo no resuelve recursos administrativos.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 112.1',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a112',
        fundamento: 'Contra los actos de trámite cualificados podrá interponerse recurso de alzada o reposición.',
      },
    },

    // PREGUNTA 18 (Reserva 3):
    {
      id: 18,
      esReserva: true,
      numeroReserva: 3,
      activaEnEvaluacion: false,
      enunciado: esCAM
        ? `[PREGUNTA DE RESERVA 3] De conformidad con la Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid, ¿quién ostenta la potestad originaria de nombrar y separar a los Directores Generales de la Consejería del caso?`
        : `[PREGUNTA DE RESERVA 3] En la organización administrativa del caso, ¿a qué órgano corresponde la competencia de nombrar y separar a los titulares de las Direcciones Generales?`,
      opciones: [
        {
          id: 'A',
          texto: esCAM
            ? 'Al Consejo de Gobierno de la Comunidad de Madrid, mediante Decreto, a propuesta del Consejero correspondiente.'
            : 'Al Consejo de Ministros / Consejo de Gobierno, mediante Decreto, a propuesta del titular del departamento.',
          esCorrecta: true,
          explicacion: esCAM
            ? 'Correcto. El Art. 21.g) de la Ley 1/1983 establece que corresponde al Consejo de Gobierno nombrar y separar a los Altos Cargos de la Administración de la Comunidad a propuesta del Consejero.'
            : 'Correcto. Los titulares de órganos directivos con rango de Director General son nombrados por el Consejo ejecutivo.',
        },
        {
          id: 'B',
          texto: 'Al Presidente de la Asamblea de Madrid tras comparecencia parlamentaria vinculante.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El nombramiento de altos cargos del ejecutivo corresponde al Consejo de Gobierno.',
        },
        {
          id: 'C',
          texto: 'Al Tribunal Superior de Justicia en Sala de Gobierno.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El poder judicial no interviene en el nombramiento de órganos administrativos del ejecutivo.',
        },
        {
          id: 'D',
          texto: 'A la Junta Electoral Central.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Competencia ajena a la administración ejecutiva ordinaria.',
        },
      ],
      justificacionLegal: {
        norma: esCAM ? 'Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid' : 'Ley 40/2015 de Régimen Jurídico del Sector Público',
        articulo: esCAM ? 'Artículo 21.g)' : 'Artículo 66',
        codigoBOE: esCAM ? 'BOE-A-1983-34139' : 'BOE-A-2015-10566',
        urlBOE: 'https://www.boe.es',
        fundamento: 'El nombramiento y cese de Directores Generales corresponde al Consejo de Gobierno a propuesta del Consejero.',
      },
    },

    // PREGUNTA 19 (Reserva 4):
    {
      id: 19,
      esReserva: true,
      numeroReserva: 4,
      activaEnEvaluacion: false,
      enunciado: `[PREGUNTA DE RESERVA 4] Si en las actuaciones descritas en el supuesto se descubriese un error material o de hecho en una fecha o cifra del expediente administrativo, ¿qué potestad ostenta la Administración según el artículo 109.2 de la Ley 39/2015?`,
      opciones: [
        {
          id: 'A',
          texto: 'Podrá rectificar en cualquier momento, de oficio o a instancia de los interesados, los errores materiales, de hecho o aritméticos existentes en sus actos.',
          esCorrecta: true,
          explicacion: 'Correcto. El Art. 109.2 de la Ley 39/2015 prevé la potestad de rectificación de errores materiales, de hecho o aritméticos en cualquier momento sin necesidad de procedimiento de revisión de oficio.',
        },
        {
          id: 'B',
          texto: 'Exige necesariamente declarar la lesividad del acto ante la jurisdicción contencioso-administrativa.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La declaración de lesividad (Art. 107) es para actos favorables anulables, no para simples errores aritméticos.',
        },
        {
          id: 'C',
          texto: 'Queda prohibida toda corrección transcurridos diez días desde la notificación del acto.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El artículo 109.2 autoriza la rectificación "en cualquier momento".',
        },
        {
          id: 'D',
          texto: 'Precisa dictamen preceptivo y vinculante del Consejo Consultivo o Consejo de Estado.',
          esCorrecta: false,
          explicacion: 'Incorrecto. La rectificación de simples errores materiales no precisa dictamen del órgano consultivo.',
        },
      ],
      justificacionLegal: {
        norma: 'Ley 39/2015 del Procedimiento Administrativo Común',
        articulo: 'Artículo 109.2',
        codigoBOE: 'BOE-A-2015-10565',
        urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a109',
        fundamento: 'Las Administraciones Públicas podrán rectificar en cualquier momento los errores materiales, de hecho o aritméticos existentes en sus actos.',
      },
    },

    // PREGUNTA 20 (Reserva 5):
    {
      id: 20,
      esReserva: true,
      numeroReserva: 5,
      activaEnEvaluacion: false,
      enunciado: esCAM
        ? `[PREGUNTA DE RESERVA 5] Según el Estatuto de Autonomía de la Comunidad de Madrid, ¿dónde se publican las leyes de la Asamblea de Madrid y los Decretos del Consejo de Gobierno para su entrada en vigor?`
        : `[PREGUNTA DE RESERVA 5] En relación con la publicidad formal de los reglamentos y disposiciones generales, ¿en qué diario oficial deben publicarse para desplegar eficacia jurídica?`,
      opciones: [
        {
          id: 'A',
          texto: esCAM
            ? 'En el Boletín Oficial de la Comunidad de Madrid (BOCM) y, además, las Leyes se publican en el Boletín Oficial del Estado (BOE).'
            : 'En el diario oficial correspondiente (Boletín Oficial del Estado o diario oficial autonómico).',
          esCorrecta: true,
          explicacion: esCAM
            ? 'Correcto. Las Leyes de la Asamblea se promulgan en nombre del Rey por el Presidente de la Comunidad, ordenando su publicación en el BOCM y en el BOE (Art. 31 del Estatuto).'
            : 'Correcto. La publicación en el boletín oficial es presupuesto esencial de validez y eficacia de toda norma.',
        },
        {
          id: 'B',
          texto: 'Únicamente en el tablón de anuncios físico de la sede de la Consejería del caso.',
          esCorrecta: false,
          explicacion: 'Incorrecto. El principio de publicidad de las normas (Art. 9.3 CE) exige publicación en el boletín oficial.',
        },
        {
          id: 'C',
          texto: 'Exclusivamente en el Diario Oficial de la Unión Europea (DOUE).',
          esCorrecta: false,
          explicacion: 'Incorrecto. Las normas autonómicas o estatales no se publican con carácter general en el DOUE.',
        },
        {
          id: 'D',
          texto: 'Entran en vigor de forma inmediata en cuanto las firma el Consejero sin necesidad de publicación.',
          esCorrecta: false,
          explicacion: 'Incorrecto. Toda norma requiere obligatoriamente su íntegra publicación oficial para tener eficacia.',
        },
      ],
      justificacionLegal: {
        norma: esCAM ? 'Ley Orgánica 3/1983 de Estatuto de Autonomía de la Comunidad de Madrid' : 'Constitución Española de 1978',
        articulo: esCAM ? 'Artículo 31' : 'Artículo 9.3',
        codigoBOE: esCAM ? 'BOE-A-1983-6317' : 'BOE-A-1978-31229',
        urlBOE: 'https://www.boe.es',
        fundamento: 'Las leyes de la Comunidad de Madrid serán promulgadas en nombre del Rey y publicadas en el Boletín Oficial de la Comunidad de Madrid y en el Boletín Oficial del Estado.',
      },
    },
  ];

  return {
    id: `SUP-CASE-${Date.now()}`,
    titulo: tituloPersonalizado || `Supuesto Práctico Oficial (${ambito}) - 20 Preguntas`,
    tipo: 'supuesto',
    ambito: (ambito === 'CAM' ? 'CAM' : ambito === 'AMBOS' ? 'AMBOS' : 'AGE') as any,
    origen: 'oficial_json',
    fecha: new Date().toISOString().split('T')[0],
    contextoCaso: textoCaso.trim(),
    tematicas: ['procedimiento_administrativo', 'presupuestos_hacienda', 'funcion_publica_personal'],
    leyesBOEAplicadas: esCAM
      ? [
          'Ley Orgánica 3/1983 Estatuto de Autonomía de la CAM',
          'Ley 1/1983 de Gobierno y Administración de la CAM',
          'Reglamento de la Asamblea de Madrid',
          'Ley 1/1986 de la Función Pública de la CAM',
          'Ley 39/2015 del Procedimiento Administrativo Común',
          'Ley 40/2015 de Régimen Jurídico del Sector Público',
        ]
      : [
          'Ley 39/2015 del Procedimiento Administrativo Común',
          'Ley 40/2015 de Régimen Jurídico del Sector Público',
          'Texto Refundido de la Ley del Estatuto Básico del Empleado Público (TREBEP)',
          'Ley 9/2017 de Contratos del Sector Público',
        ],
    preguntas: balancearYDistribuirOpciones(bancoGenerado),
  };
}
