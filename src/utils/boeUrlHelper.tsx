import React from 'react';

export interface LeyBOEInfo {
  clave: string;
  nombre: string;
  sigla: string;
  idBOE: string;
  urlBOE: string;
  patrones: RegExp[];
}

export const CATALOGO_LEYES_BOE: LeyBOEInfo[] = [
  {
    clave: 'ce_1978',
    nombre: 'Constitución Española de 1978',
    sigla: 'CE',
    idBOE: 'BOE-A-1978-31229',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229',
    patrones: [
      /\bConstituci[óo]n\s+Espa[ñn]ola(?:\s+de\s+1978)?\b/gi,
      /\bConstituci[óo]n\b(?!\s+(?:de\s+la\s+Rep[úu]blica|de\s+18|de\s+1931))/gi,
      /\bC\.?E\.?(?:\s+de\s+1978)?\b/g,
    ],
  },
  {
    clave: 'lpac_39_2015',
    nombre: 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común',
    sigla: 'Ley 39/2015',
    idBOE: 'BOE-A-2015-10565',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565',
    patrones: [
      /\bLey\s+39\/2015(?:\s*,\s*de\s+1\s+de\s+octubre)?\b/gi,
      /\bLPACAP\b/gi,
      /\bLPAC\b/gi,
      /\b39\/2015\b/g,
    ],
  },
  {
    clave: 'lrjsp_40_2015',
    nombre: 'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público',
    sigla: 'Ley 40/2015',
    idBOE: 'BOE-A-2015-10566',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566',
    patrones: [
      /\bLey\s+40\/2015(?:\s*,\s*de\s+1\s+de\s+octubre)?\b/gi,
      /\bLRJSP\b/gi,
      /\b40\/2015\b/g,
    ],
  },
  {
    clave: 'trebep_5_2015',
    nombre: 'Real Decreto Legislativo 5/2015, del Estatuto Básico del Empleado Público',
    sigla: 'TREBEP',
    idBOE: 'BOE-A-2015-11719',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719',
    patrones: [
      /\bTREBEP\b/gi,
      /\bEBEP\b/gi,
      /\b(?:Real\s+Decreto\s+Legislativo|RDL)\s+5\/2015\b/gi,
      /\bEstatuto\s+B[áa]sico\s+del\s+Empleado\s+P[úu]blico\b/gi,
      /\b5\/2015\b/g,
    ],
  },
  {
    clave: 'rd_364_1995',
    nombre: 'Real Decreto 364/1995, de 10 de marzo (Ingreso y Provisión AGE)',
    sigla: 'RD 364/1995',
    idBOE: 'BOE-A-1995-8729',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729',
    patrones: [
      /\b(?:Real\s+Decreto|RD)\s+364\/1995\b/gi,
      /\b364\/1995\b/g,
    ],
  },
  {
    clave: 'rd_365_1995',
    nombre: 'Real Decreto 365/1995, de 10 de marzo (Situaciones Administrativas AGE)',
    sigla: 'RD 365/1995',
    idBOE: 'BOE-A-1995-7451',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451',
    patrones: [
      /\b(?:Real\s+Decreto|RD)\s+365\/1995\b/gi,
      /\b365\/1995\b/g,
    ],
  },
  {
    clave: 'lopdgdd_3_2018',
    nombre: 'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos (LOPDGDD)',
    sigla: 'Ley 3/2018 LOPDGDD',
    idBOE: 'BOE-A-2018-16673',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673',
    patrones: [
      /\b(?:Ley\s+Org[áa]nica|LO|Ley)\s+3\/2018\b/gi,
      /\bLOPDGDD\b/gi,
      /\b3\/2018\b/g,
    ],
  },
  {
    clave: 'lcsp_9_2017',
    nombre: 'Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP)',
    sigla: 'Ley 9/2017 LCSP',
    idBOE: 'BOE-A-2017-12902',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902',
    patrones: [
      /\bLey\s+9\/2017\b/gi,
      /\bLCSP\b/gi,
      /\b9\/2017\b/g,
    ],
  },
  {
    clave: 'lgp_47_2003',
    nombre: 'Ley 47/2003, de 26 de noviembre, General Presupuestaria',
    sigla: 'Ley 47/2003 LGP',
    idBOE: 'BOE-A-2003-21618',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21618',
    patrones: [
      /\bLey\s+47\/2003\b/gi,
      /\bLGP\b/gi,
      /\b47\/2003\b/g,
    ],
  },
  {
    clave: 'loepsf_2_2012',
    nombre: 'Ley Orgánica 2/2012, de 27 de abril, de Estabilidad Presupuestaria y Sostenibilidad Financiera',
    sigla: 'LO 2/2012 LOEPSF',
    idBOE: 'BOE-A-2012-5730',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-5730',
    patrones: [
      /\b(?:Ley\s+Org[áa]nica|LO|Ley)\s+2\/2012\b/gi,
      /\bLOEPSF\b/gi,
      /\bEstabilidad\s+Presupuestaria(?:\s+y\s+Sostenibilidad\s+Financiera)?\b/gi,
      /\b2\/2012\b/g,
    ],
  },
  {
    clave: 'ley_gobierno_50_1997',
    nombre: 'Ley 50/1997, de 27 de noviembre, del Gobierno',
    sigla: 'Ley 50/1997',
    idBOE: 'BOE-A-1997-25336',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1997-25336',
    patrones: [
      /\bLey\s+50\/1997\b/gi,
      /\b50\/1997\b/g,
    ],
  },
  {
    clave: 'transparencia_19_2013',
    nombre: 'Ley 19/2013, de 9 de diciembre, de transparencia y buen gobierno',
    sigla: 'Ley 19/2013',
    idBOE: 'BOE-A-2013-12887',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887',
    patrones: [
      /\bLey\s+19\/2013\b/gi,
      /\b19\/2013\b/g,
    ],
  },
  {
    clave: 'ljca_29_1998',
    nombre: 'Ley 29/1998, de 13 de julio, reguladora de la Jurisdicción Contencioso-administrativa',
    sigla: 'Ley 29/1998 LJCA',
    idBOE: 'BOE-A-1998-16801',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1998-16801',
    patrones: [
      /\bLey\s+29\/1998\b/gi,
      /\bLJCA\b/gi,
      /\b29\/1998\b/g,
    ],
  },
  {
    clave: 'lopj_6_1985',
    nombre: 'Ley Orgánica 6/1985, de 1 de julio, del Poder Judicial (LOPJ)',
    sigla: 'LO 6/1985 LOPJ',
    idBOE: 'BOE-A-1985-12666',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-12666',
    patrones: [
      /\b(?:Ley\s+Org[áa]nica|LO)\s+6\/1985\b/gi,
      /\bLOPJ\b/gi,
      /\b6\/1985\b/g,
    ],
  },
  {
    clave: 'estatuto_cam_3_1983',
    nombre: 'Ley Orgánica 3/1983, de Estatuto de Autonomía de la Comunidad de Madrid',
    sigla: 'Estatuto Autonomía CAM',
    idBOE: 'BOE-A-1983-6317',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1983-6317',
    patrones: [
      /\bEstatuto\s+de\s+Autonom[íi]a\s+(?:de\s+la\s+Comunidad\s+de\s+Madrid|CAM|de\s+Madrid)\b/gi,
      /\bLO\s+3\/1983\b/gi,
    ],
  },
  {
    clave: 'gobierno_cam_1_1983',
    nombre: 'Ley 1/1983, de Gobierno y Administración de la Comunidad de Madrid',
    sigla: 'Ley 1/1983 CAM',
    idBOE: 'BOE-A-1983-34139',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1983-34139',
    patrones: [
      /\bLey\s+1\/1983\b/gi,
    ],
  },
  {
    clave: 'funcion_publica_cam_1_1986',
    nombre: 'Ley 1/1986, de la Función Pública de la Comunidad de Madrid',
    sigla: 'Ley 1/1986 CAM',
    idBOE: 'BOE-A-1986-13612',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1986-13612',
    patrones: [
      /\bLey\s+1\/1986\b/gi,
    ],
  },
  {
    clave: 'hacienda_cam_9_1990',
    nombre: 'Ley 9/1990, Reguladora de la Hacienda de la Comunidad de Madrid',
    sigla: 'Ley 9/1990 CAM',
    idBOE: 'BOE-A-1991-3837',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-1991-3837',
    patrones: [
      /\bLey\s+9\/1990\b/gi,
    ],
  },
  {
    clave: 'rd_1708_2011_archivos',
    nombre: 'Real Decreto 1708/2011, de 18 de noviembre, por el que se establece el Sistema Español de Archivos',
    sigla: 'RD 1708/2011 Archivos',
    idBOE: 'BOE-A-2011-18541',
    urlBOE: 'https://www.boe.es/buscar/act.php?id=BOE-A-2011-18541',
    patrones: [
      /\b(?:Real\s+Decreto|RD)\s+1708\/2011\b/gi,
      /\bSistema\s+Espa[ñn]ol\s+de\s+Archivos\b/gi,
      /\b1708\/2011\b/g,
    ],
  },
];

/**
 * Resuelve la URL consolidada del BOE para una norma y opcionalmente un artículo.
 */
export function obtenerUrlBOEParaNorma(
  norma: string = '',
  articulo: string = '',
  fallbackUrl?: string
): string {
  if (fallbackUrl && fallbackUrl.startsWith('https://www.boe.es')) {
    return fallbackUrl;
  }

  const texto = `${norma} ${articulo}`.trim();
  if (!texto) return 'https://www.boe.es';

  for (const ley of CATALOGO_LEYES_BOE) {
    for (const pat of ley.patrones) {
      if (pat.test(texto)) {
        let url = ley.urlBOE;
        // Si hay número de artículo, añadir ancla #a... oficial del BOE
        const matchArt = articulo.match(/\b(?:art[íi]culo|art\.?)\s*(\d+)/i) || norma.match(/\b(?:art[íi]culo|art\.?)\s*(\d+)/i);
        if (matchArt && matchArt[1]) {
          url += `#a${matchArt[1]}`;
        }
        return url;
      }
    }
  }

  // Búsqueda directa oficial en el BOE
  return `https://www.boe.es/buscar/boe.php?campo%5B0%5D=DOC&dato%5B0%5D=${encodeURIComponent(norma || texto)}`;
}

/**
 * Detecta leyes conocidas en un texto y las convierte en fragmentos interactivos con enlace al BOE.
 */
export function renderizarTextoConEnlacesBOE(texto: string): React.ReactNode {
  if (!texto) return null;

  // Patrones combinados para detectar referencias normativas en el texto
  const combinedRegex = /(Constituci[óo]n\s+Espa[ñn]ola(?:\s+de\s+1978)?|Ley\s+39\/2015|LPACAP|LPAC|Ley\s+40\/2015|LRJSP|TREBEP|EBEP|RDL\s+5\/2015|Real\s+Decreto\s+Legislativo\s+5\/2015|Real\s+Decreto\s+364\/1995|RD\s+364\/1995|Real\s+Decreto\s+365\/1995|RD\s+365\/1995|Real\s+Decreto\s+1708\/2011|RD\s+1708\/2011|Sistema\s+Espa[ñn]ol\s+de\s+Archivos|Ley\s+Org[áa]nica\s+3\/2018|LO\s+3\/2018|LOPDGDD|Ley\s+9\/2017|LCSP|Ley\s+47\/2003|LGP|Ley\s+Org[áa]nica\s+2\/2012|LO\s+2\/2012|Ley\s+2\/2012|LOEPSF|Ley\s+50\/1997|Ley\s+19\/2013|Ley\s+29\/1998|LJCA|Ley\s+Org[áa]nica\s+6\/1985|LOPJ|Estatuto\s+de\s+Autonom[íi]a\s+de\s+Madrid|Ley\s+1\/1983|Ley\s+1\/1986|Ley\s+9\/1990)/gi;

  const partes = texto.split(combinedRegex);

  return partes.map((parte, idx) => {
    // Si la parte coincide con alguna ley
    const url = obtenerUrlBOEParaNorma(parte);
    const esLey = CATALOGO_LEYES_BOE.some((ley) => ley.patrones.some((p) => p.test(parte)));

    if (esLey) {
      return (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-bold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-100 decoration-amber-400 dark:decoration-amber-500 hover:decoration-2 transition-all cursor-pointer"
          title={`Consultar ${parte} en el BOE oficial`}
        >
          <span>{parte}</span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-80 ml-0.5"></i>
        </a>
      );
    }

    return <React.Fragment key={idx}>{parte}</React.Fragment>;
  });
}
