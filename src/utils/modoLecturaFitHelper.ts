import { PreguntaExamen } from '../types';

export interface ClasesAjusteModoLectura {
  densidad: 'holgado' | 'medio' | 'denso' | 'muy_denso';
  claseContenedorTarjeta: string;
  claseBloqueCentral: string;
  claseEnunciado: string;
  claseListaOpciones: string;
  claseCajaOpcion: string;
  claseTextoOpcion: string;
  claseBadgeLetra: string;
  claseRelatoSupuesto: string;
}

/**
 * Calcula dinámicamente los tamaños tipográficos y espaciados verticales del Modo Lectura
 * para que el enunciado completo, las 4 opciones (A–D) y la barra inferior de navegación
 * se ajusten a la ventana sin quedar cortados en la parte inferior.
 */
export function calcularClasesAjusteVentanaModoLectura(
  pregunta: PreguntaExamen | null | undefined,
  tamanoPreferido: 'grande' | 'muy_grande' | 'extra' = 'muy_grande',
  tieneRelatoDesplegado: boolean = false
): ClasesAjusteModoLectura {
  const longitudEnunciado = (pregunta?.enunciado || '').trim().length;
  const longitudOpciones = (pregunta?.opciones || []).reduce(
    (acc, op) => acc + (op?.texto || '').trim().length,
    0
  );
  const opcionMasLarga = (pregunta?.opciones || []).reduce(
    (max, op) => Math.max(max, (op?.texto || '').trim().length),
    0
  );

  const pesoCaracteres =
    longitudEnunciado * 1.15 +
    longitudOpciones +
    (opcionMasLarga > 150 ? 90 : 0) +
    (tieneRelatoDesplegado ? 280 : 0);

  const densidad: ClasesAjusteModoLectura['densidad'] =
    pesoCaracteres > 820
      ? 'muy_denso'
      : pesoCaracteres > 560
      ? 'denso'
      : pesoCaracteres > 350
      ? 'medio'
      : 'holgado';

  if (densidad === 'muy_denso') {
    return {
      densidad,
      claseContenedorTarjeta:
        'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl px-4 sm:px-8 py-3 sm:py-4 shadow-lg flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-hidden transition-all',
      claseBloqueCentral:
        'flex-1 min-h-0 flex flex-col justify-center gap-2.5 overflow-y-auto pr-1',
      claseEnunciado:
        tamanoPreferido === 'extra'
          ? 'text-base sm:text-lg lg:text-[19px] leading-snug'
          : tamanoPreferido === 'muy_grande'
          ? 'text-[15px] sm:text-[17px] lg:text-lg leading-snug'
          : 'text-sm sm:text-base leading-snug',
      claseListaOpciones: 'space-y-1.5 max-w-3xl mx-auto w-full',
      claseCajaOpcion: 'px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border',
      claseTextoOpcion:
        tamanoPreferido === 'extra'
          ? 'text-sm sm:text-[15.5px] leading-snug'
          : 'text-[13.5px] sm:text-[14.5px] leading-snug',
      claseBadgeLetra: 'w-6.5 h-6.5 text-xs rounded-lg',
      claseRelatoSupuesto: 'text-xs sm:text-sm leading-snug',
    };
  }

  if (densidad === 'denso') {
    return {
      densidad,
      claseContenedorTarjeta:
        'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl px-5 sm:px-9 py-3.5 sm:py-5 shadow-lg flex-1 min-h-0 flex flex-col justify-between gap-3 overflow-hidden transition-all',
      claseBloqueCentral:
        'flex-1 min-h-0 flex flex-col justify-center gap-3 overflow-y-auto pr-1',
      claseEnunciado:
        tamanoPreferido === 'extra'
          ? 'text-lg sm:text-xl lg:text-[22px] leading-snug'
          : tamanoPreferido === 'muy_grande'
          ? 'text-base sm:text-lg lg:text-[20px] leading-snug'
          : 'text-[15px] sm:text-[17px] leading-snug',
      claseListaOpciones: 'space-y-2 max-w-3xl mx-auto w-full',
      claseCajaOpcion: 'px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border',
      claseTextoOpcion:
        tamanoPreferido === 'extra'
          ? 'text-[15px] sm:text-[17px] leading-snug'
          : tamanoPreferido === 'muy_grande'
          ? 'text-sm sm:text-[16px] leading-snug'
          : 'text-sm sm:text-[15px] leading-snug',
      claseBadgeLetra: 'w-7 h-7 text-xs rounded-xl',
      claseRelatoSupuesto: 'text-xs sm:text-[15px] leading-relaxed',
    };
  }

  if (densidad === 'medio') {
    return {
      densidad,
      claseContenedorTarjeta:
        'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl px-5 sm:px-10 py-4 sm:py-6 shadow-lg flex-1 min-h-0 flex flex-col justify-between gap-4 overflow-hidden transition-all',
      claseBloqueCentral:
        'flex-1 min-h-0 flex flex-col justify-center gap-4 overflow-y-auto pr-1',
      claseEnunciado:
        tamanoPreferido === 'extra'
          ? 'text-xl sm:text-2xl lg:text-[25px] leading-normal'
          : tamanoPreferido === 'muy_grande'
          ? 'text-lg sm:text-xl lg:text-[22px] leading-normal'
          : 'text-base sm:text-lg lg:text-[19px] leading-normal',
      claseListaOpciones: 'space-y-2.5 max-w-3xl mx-auto w-full',
      claseCajaOpcion: 'px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border',
      claseTextoOpcion:
        tamanoPreferido === 'extra'
          ? 'text-base sm:text-[18.5px] leading-normal'
          : tamanoPreferido === 'muy_grande'
          ? 'text-[15px] sm:text-[17px] leading-normal'
          : 'text-sm sm:text-base leading-normal',
      claseBadgeLetra: 'w-7.5 h-7.5 text-sm rounded-xl',
      claseRelatoSupuesto: 'text-sm sm:text-base leading-relaxed',
    };
  }

  // 'holgado' (enunciados y opciones concisos: aprovecha tipografía generosa dentro de la ventana)
  return {
    densidad,
    claseContenedorTarjeta:
      'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl px-6 sm:px-11 py-4 sm:py-7 shadow-lg flex-1 min-h-0 flex flex-col justify-between gap-4 overflow-hidden transition-all',
    claseBloqueCentral:
      'flex-1 min-h-0 flex flex-col justify-center gap-5 overflow-y-auto pr-1',
    claseEnunciado:
      tamanoPreferido === 'extra'
        ? 'text-xl sm:text-2xl lg:text-[27px] leading-relaxed'
        : tamanoPreferido === 'muy_grande'
        ? 'text-lg sm:text-xl lg:text-[24px] leading-relaxed'
        : 'text-base sm:text-lg lg:text-[20px] leading-relaxed',
    claseListaOpciones: 'space-y-2.5 sm:space-y-3 max-w-3xl mx-auto w-full',
    claseCajaOpcion: 'px-4 py-3 sm:px-6 sm:py-3.5 rounded-2xl border',
    claseTextoOpcion:
      tamanoPreferido === 'extra'
        ? 'text-base sm:text-[20px] leading-snug'
        : tamanoPreferido === 'muy_grande'
        ? 'text-[15.5px] sm:text-[18px] leading-snug'
        : 'text-sm sm:text-[16.5px] leading-snug',
    claseBadgeLetra: 'w-8 h-8 text-sm rounded-xl',
    claseRelatoSupuesto: 'text-sm sm:text-lg leading-relaxed',
  };
}
