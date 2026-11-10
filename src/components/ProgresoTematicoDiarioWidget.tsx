import React, { useState, useMemo } from 'react';
import { ExamenCompleto, ItemAlmacenDuda } from '../types';
import {
  CATEGORIAS_TEMARIO_PROGRESO,
  CategoriaTemarioId,
  clasificarPreguntaEnCategoriaTemario,
  extraerPreguntasFalladasConsolidadas,
} from '../utils/tematicaClassifier';

interface ProgresoTematicoDiarioWidgetProps {
  historialPruebas: ExamenCompleto[];
  almacenDudas: ItemAlmacenDuda[];
  onIrATestFalladas: (categoriaId?: CategoriaTemarioId) => void;
}

interface EstadisticaCategoriaDia {
  id: CategoriaTemarioId;
  nombre: string;
  sigla: string;
  icono: string;
  colorText: string;
  colorBg: string;
  colorBorder: string;
  colorBar: string;
  acertadas: number;
  falladas: number;
  blancos: number;
  totalRespondidas: number;
  totalPreguntas: number;
  porcentajeAcierto: number;
}

function normalizarFechaYMD(fechaBruta?: string): string {
  if (!fechaBruta) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(fechaBruta)) {
    return fechaBruta.substring(0, 10);
  }
  const matchDMY = fechaBruta.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDMY) {
    return `${matchDMY[3]}-${matchDMY[2].padStart(2, '0')}-${matchDMY[1].padStart(2, '0')}`;
  }
  const dt = new Date(fechaBruta);
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  return '';
}

export const ProgresoTematicoDiarioWidget: React.FC<ProgresoTematicoDiarioWidgetProps> = ({
  historialPruebas,
  almacenDudas,
  onIrATestFalladas,
}) => {
  const hoyStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Obtener todas las fechas únicas con tests realizados (ordenadas de más reciente a más antigua)
  const fechasConActividad = useMemo(() => {
    const setFechas = new Set<string>();
    historialPruebas.forEach((ex) => {
      if (!ex.resultado) return;
      const f = normalizarFechaYMD(ex.resultado.fechaRealizacion || ex.fecha);
      if (f) setFechas.add(f);
    });
    return Array.from(setFechas).sort((a, b) => b.localeCompare(a));
  }, [historialPruebas]);

  const hayActividadHoy = fechasConActividad.includes(hoyStr);
  const ultimaFechaActiva = fechasConActividad[0] || hoyStr;

  const [modoPeriodo, setModoPeriodo] = useState<'dia_activo' | 'hoy' | '7dias' | 'global'>('dia_activo');
  const [fechaEspecifica, setFechaEspecifica] = useState<string>('');
  const [colapsado, setColapsado] = useState<boolean>(false);

  // Determinar la fecha efectiva cuando está en modo diario
  const fechaEfectivaDia = useMemo(() => {
    if (fechaEspecifica) return fechaEspecifica;
    if (modoPeriodo === 'hoy') return hoyStr;
    return hayActividadHoy ? hoyStr : ultimaFechaActiva;
  }, [fechaEspecifica, modoPeriodo, hoyStr, hayActividadHoy, ultimaFechaActiva]);

  // Filtrar tests según el periodo seleccionado
  const testsEnPeriodo = useMemo(() => {
    const realizados = historialPruebas.filter((ex) => ex.resultado && ex.preguntas && ex.preguntas.length > 0);
    if (modoPeriodo === 'global' && !fechaEspecifica) {
      return realizados;
    }
    if (modoPeriodo === '7dias' && !fechaEspecifica) {
      const hace7 = new Date();
      hace7.setDate(hace7.getDate() - 6);
      const limiteStr = `${hace7.getFullYear()}-${String(hace7.getMonth() + 1).padStart(2, '0')}-${String(hace7.getDate()).padStart(2, '0')}`;
      return realizados.filter((ex) => {
        const f = normalizarFechaYMD(ex.resultado?.fechaRealizacion || ex.fecha);
        return f >= limiteStr && f <= hoyStr;
      });
    }
    // Modo día concreto ('hoy' o 'dia_activo' o fechaEspecifica)
    return realizados.filter((ex) => {
      const f = normalizarFechaYMD(ex.resultado?.fechaRealizacion || ex.fecha);
      return f === fechaEfectivaDia;
    });
  }, [historialPruebas, modoPeriodo, fechaEspecifica, fechaEfectivaDia, hoyStr]);

  // Calcular desglose de preguntas acertadas, falladas y blancos por cada categoría de temario
  const estadisticasPorCategoria = useMemo<EstadisticaCategoriaDia[]>(() => {
    const mapa = new Map<CategoriaTemarioId, { acertadas: number; falladas: number; blancos: number }>();
    CATEGORIAS_TEMARIO_PROGRESO.forEach((c) => {
      mapa.set(c.id, { acertadas: 0, falladas: 0, blancos: 0 });
    });

    testsEnPeriodo.forEach((ex) => {
      const respMap = ex.resultado?.respuestasUsuario || {};
      ex.preguntas.forEach((preg, idx) => {
        const catId = clasificarPreguntaEnCategoriaTemario(preg, ex);
        const entry = mapa.get(catId) || { acertadas: 0, falladas: 0, blancos: 0 };

        const respU = respMap[idx];
        const opcCorrecta = preg.opciones?.find((o) => o.esCorrecta);
        if (!opcCorrecta) return;

        if (respU === undefined || respU === null || respU === '') {
          entry.blancos += 1;
        } else if (respU === opcCorrecta.id) {
          entry.acertadas += 1;
        } else {
          entry.falladas += 1;
        }
        mapa.set(catId, entry);
      });
    });

    return CATEGORIAS_TEMARIO_PROGRESO.map((cat) => {
      const datos = mapa.get(cat.id) || { acertadas: 0, falladas: 0, blancos: 0 };
      const totalRespondidas = datos.acertadas + datos.falladas;
      const totalPreguntas = totalRespondidas + datos.blancos;
      const porcentajeAcierto =
        totalRespondidas > 0 ? Math.round((datos.acertadas / totalRespondidas) * 100) : 0;

      return {
        ...cat,
        acertadas: datos.acertadas,
        falladas: datos.falladas,
        blancos: datos.blancos,
        totalRespondidas,
        totalPreguntas,
        porcentajeAcierto,
      };
    });
  }, [testsEnPeriodo]);

  const maxAcertadasCategoria = useMemo(() => {
    const max = Math.max(...estadisticasPorCategoria.map((c) => c.acertadas), 0);
    return max > 0 ? max : 1;
  }, [estadisticasPorCategoria]);

  const resumenTotales = useMemo(() => {
    const totalAcertadas = estadisticasPorCategoria.reduce((acc, c) => acc + c.acertadas, 0);
    const totalFalladas = estadisticasPorCategoria.reduce((acc, c) => acc + c.falladas, 0);
    const totalBlancos = estadisticasPorCategoria.reduce((acc, c) => acc + c.blancos, 0);
    const totalContestadas = totalAcertadas + totalFalladas;
    const tasaGlobal = totalContestadas > 0 ? Math.round((totalAcertadas / totalContestadas) * 100) : 0;
    const categoriasActivas = estadisticasPorCategoria.filter((c) => c.totalPreguntas > 0).length;

    // Categoría líder en aciertos
    const ordenadaPorAciertos = [...estadisticasPorCategoria]
      .filter((c) => c.acertadas > 0)
      .sort((a, b) => b.acertadas - a.acertadas);
    const mejorCategoria = ordenadaPorAciertos[0] || null;

    return {
      totalAcertadas,
      totalFalladas,
      totalBlancos,
      totalContestadas,
      tasaGlobal,
      categoriasActivas,
      mejorCategoria,
    };
  }, [estadisticasPorCategoria]);

  // Total de preguntas falladas consolidadas disponibles para practicar
  const preguntasFalladasBanco = useMemo(() => {
    return extraerPreguntasFalladasConsolidadas(historialPruebas, almacenDudas, false);
  }, [historialPruebas, almacenDudas]);

  const falladasPorCategoriaMap = useMemo(() => {
    const m = new Map<CategoriaTemarioId, number>();
    preguntasFalladasBanco.forEach((pf) => {
      m.set(pf.categoriaId, (m.get(pf.categoriaId) || 0) + 1);
    });
    return m;
  }, [preguntasFalladasBanco]);

  const etiquetaPeriodo = useMemo(() => {
    if (fechaEspecifica) {
      return fechaEspecifica === hoyStr ? `Hoy (${hoyStr})` : `Jornada ${fechaEspecifica}`;
    }
    if (modoPeriodo === 'hoy') return `Hoy (${hoyStr})`;
    if (modoPeriodo === '7dias') return 'Últimos 7 días';
    if (modoPeriodo === 'global') return 'Acumulado Global';
    return hayActividadHoy ? `Hoy (${hoyStr})` : `Última jornada activa (${ultimaFechaActiva})`;
  }, [fechaEspecifica, modoPeriodo, hoyStr, hayActividadHoy, ultimaFechaActiva]);

  return (
    <section className="bg-emerald-50/60 dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl shadow-sm overflow-hidden transition-all mb-5">
      {/* Cabecera compacta del Widget */}
      <div className="px-4 py-3 bg-linear-to-r from-emerald-100/85 via-teal-50/80 to-indigo-100/70 dark:from-emerald-950/60 dark:via-slate-800 dark:to-indigo-950/40 border-b-2 border-emerald-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <i className="fa-solid fa-chart-column text-sm"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Progreso Temático Diario · Comparativa de Acertadas
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {etiquetaPeriodo}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {testsEnPeriodo.length} {testsEnPeriodo.length === 1 ? 'test realizado' : 'tests realizados'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Comparativa directa del número de preguntas acertadas y rendimiento por cada bloque oficial del temario C1.
            </p>
          </div>
        </div>

        {/* Controles de periodo + Acceso directo a Test de Falladas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold">
            <button
              type="button"
              onClick={() => {
                setFechaEspecifica('');
                setModoPeriodo('dia_activo');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                !fechaEspecifica && (modoPeriodo === 'dia_activo' || modoPeriodo === 'hoy')
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Ver progreso diario de hoy o de la última fecha con tests realizados"
            >
              <i className="fa-solid fa-calendar-day mr-1 text-[10px] text-indigo-500"></i>
              {hayActividadHoy ? 'Hoy' : 'Último Día'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFechaEspecifica('');
                setModoPeriodo('7dias');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                !fechaEspecifica && modoPeriodo === '7dias'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={() => {
                setFechaEspecifica('');
                setModoPeriodo('global');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                !fechaEspecifica && modoPeriodo === 'global'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Global
            </button>
          </div>

          {fechasConActividad.length > 1 && (
            <select
              value={fechaEspecifica}
              onChange={(e) => setFechaEspecifica(e.target.value)}
              className="h-7.5 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10.5px] font-mono font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              title="Seleccionar una fecha específica con tests"
            >
              <option value="">📅 Elegir fecha...</option>
              {fechasConActividad.slice(0, 15).map((f) => (
                <option key={f} value={f}>
                  {f === hoyStr ? `${f} (Hoy)` : f}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => onIrATestFalladas()}
            className="h-7.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Ir a la sección exclusiva para realizar tests con tus preguntas falladas por ley o temática"
          >
            <i className="fa-solid fa-rotate text-[10px]"></i>
            <span>Test de Falladas</span>
            {preguntasFalladasBanco.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono text-[9.5px]">
                {preguntasFalladasBanco.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setColapsado((prev) => !prev)}
            className="h-7.5 w-7.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
            title={colapsado ? 'Desplegar progreso temático' : 'Contraer panel'}
          >
            <i className={`fa-solid ${colapsado ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
          </button>
        </div>
      </div>

      {/* Cuerpo del Widget */}
      {!colapsado && (
        <div className="p-3.5 sm:p-4 space-y-3.5">
          {/* Cinta rápida de KPIs del periodo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-black uppercase text-emerald-800 dark:text-emerald-300 font-mono block">
                  Preguntas Acertadas
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {resumenTotales.totalAcertadas}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 font-mono">
                  ({resumenTotales.tasaGlobal}% acierto)
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-sm">
                <i className="fa-solid fa-check-double"></i>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-black uppercase text-rose-800 dark:text-rose-300 font-mono block">
                  Preguntas Falladas
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {resumenTotales.totalFalladas}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 font-mono">
                  {resumenTotales.totalBlancos > 0 ? `+ ${resumenTotales.totalBlancos} blancos` : 'en el periodo'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center text-sm">
                <i className="fa-solid fa-xmark"></i>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-black uppercase text-indigo-800 dark:text-indigo-300 font-mono block">
                  Bloques Practicados
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-indigo-700 dark:text-indigo-300">
                  {resumenTotales.categoriasActivas}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {CATEGORIAS_TEMARIO_PROGRESO.length}</span>
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm">
                <i className="fa-solid fa-layer-group"></i>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-[9.5px] font-black uppercase text-amber-800 dark:text-amber-300 font-mono block">
                  Mayor Dominio del Día
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block mt-0.5">
                  {resumenTotales.mejorCategoria
                    ? `${resumenTotales.mejorCategoria.sigla} (${resumenTotales.mejorCategoria.acertadas} ✔)`
                    : 'Sin datos aún'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-trophy"></i>
              </div>
            </div>
          </div>

          {/* Grid comparativo de las 9 categorías de temario */}
          {testsEnPeriodo.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Todavía no hay tests registrados en este periodo ({etiquetaPeriodo}).
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Completa cualquier test del Generador, Banco de Exámenes o Test de Falladas para comparar tus preguntas acertadas por categoría de temario.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {estadisticasPorCategoria.map((cat) => {
                const anchoComparativo =
                  cat.acertadas > 0
                    ? Math.max(8, Math.round((cat.acertadas / maxAcertadasCategoria) * 100))
                    : 0;
                const falladasAcumuladasCat = falladasPorCategoriaMap.get(cat.id) || 0;

                return (
                  <div
                    key={cat.id}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                      cat.totalPreguntas > 0
                        ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs'
                        : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg ${cat.colorBg} ${cat.colorText} border ${cat.colorBorder} flex items-center justify-center text-[11px] shrink-0`}
                        >
                          <i className={`fa-solid ${cat.icono}`}></i>
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate block">
                            {cat.sigla}
                          </span>
                          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 truncate block">
                            {cat.nombre}
                          </span>
                        </div>
                      </div>

                      {/* Contador destacado de acertadas */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-black border ${
                            cat.acertadas > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Preguntas acertadas en esta categoría"
                        >
                          ✔ {cat.acertadas} acertadas
                        </span>
                      </div>
                    </div>

                    {/* Barra comparativa de preguntas acertadas */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700/70 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full ${cat.colorBar} transition-all duration-500 rounded-full`}
                          style={{ width: `${anchoComparativo}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <span>
                            Total: <strong className="text-slate-700 dark:text-slate-200">{cat.totalPreguntas}</strong>
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            ✘ {cat.falladas} fallos
                          </span>
                          {cat.totalRespondidas > 0 && (
                            <span
                              className={`font-bold ${
                                cat.porcentajeAcierto >= 70
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : cat.porcentajeAcierto >= 50
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              ({cat.porcentajeAcierto}%)
                            </span>
                          )}
                        </div>

                        {falladasAcumuladasCat > 0 && (
                          <button
                            type="button"
                            onClick={() => onIrATestFalladas(cat.id)}
                            className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title={`Practicar las ${falladasAcumuladasCat} preguntas falladas de ${cat.sigla}`}
                          >
                            <i className="fa-solid fa-play text-[8px]"></i>
                            <span>Repasar {falladasAcumuladasCat} falladas</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
