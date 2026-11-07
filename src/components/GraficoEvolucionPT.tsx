import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ExamenCompleto, TipoPrueba, ConvocatoriaAmbito } from '../types';
import { CATEGORIAS_EXAMEN_INFO, deducirCategoriaExamen } from '../utils/jsonExamHelper';

interface GraficoEvolucionPTProps {
  examenes: ExamenCompleto[];
  onCargarExamen?: (examen: ExamenCompleto) => void;
}

type FiltroTipoGrafico = 'todos' | 'unitario' | 'supuesto';

interface PuntoGrafico {
  id: string;
  indice: number;
  etiquetaFecha: string;
  fechaCompleta: string;
  titulo: string;
  tipo: TipoPrueba;
  categoriaLabel: string;
  categoriaBadgeBg: string;
  categoriaBadgeText: string;
  categoriaBadgeBorder: string;
  ambito: ConvocatoriaAmbito;
  pt: number;
  pd: number;
  superaCorte: boolean;
  umbralCorte: number;
  aciertos: number;
  fallos: number;
  blancos: number;
  anuladas: number;
  duracionSegundos: number;
  esDemo?: boolean;
  examenRef?: ExamenCompleto;
}

// Datos de demostración oficiales basados en convocatorias históricas para usuarios sin histórico
const DATOS_DEMO_HISTORICO: PuntoGrafico[] = [
  {
    id: 'demo-1',
    indice: 1,
    etiquetaFecha: 'Simulacro 1',
    fechaCompleta: 'Evaluación Inicial (OEP)',
    titulo: 'Simulacro Diagnóstico Inicial C1',
    tipo: 'unitario',
    categoriaLabel: 'Test aleatorio (IA)',
    categoriaBadgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    categoriaBadgeText: 'text-purple-700 dark:text-purple-300',
    categoriaBadgeBorder: 'border-purple-200 dark:border-purple-800',
    ambito: 'AGE',
    pt: 42.5,
    pd: 29.75,
    superaCorte: false,
    umbralCorte: 50,
    aciertos: 38,
    fallos: 25,
    blancos: 7,
    anuladas: 0,
    duracionSegundos: 4500,
    esDemo: true,
  },
  {
    id: 'demo-2',
    indice: 2,
    etiquetaFecha: 'Simulacro 2',
    fechaCompleta: 'Bloque Procedimiento LPACAP',
    titulo: 'Test Oficial AGE OEP 2019 (Parte I)',
    tipo: 'unitario',
    categoriaLabel: 'Test oficial',
    categoriaBadgeBg: 'bg-sky-50 dark:bg-sky-950/50',
    categoriaBadgeText: 'text-sky-700 dark:text-sky-300',
    categoriaBadgeBorder: 'border-sky-200 dark:border-sky-800',
    ambito: 'AGE',
    pt: 54.2,
    pd: 37.94,
    superaCorte: true,
    umbralCorte: 50,
    aciertos: 46,
    fallos: 24,
    blancos: 0,
    anuladas: 1,
    duracionSegundos: 4320,
    esDemo: true,
  },
  {
    id: 'demo-3',
    indice: 3,
    etiquetaFecha: 'Simulacro 3',
    fechaCompleta: 'Supuesto Gestión Personal',
    titulo: 'Supuesto Práctico Oficial CAM 2021',
    tipo: 'supuesto',
    categoriaLabel: 'Supuesto oficial',
    categoriaBadgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    categoriaBadgeText: 'text-emerald-800 dark:text-emerald-300',
    categoriaBadgeBorder: 'border-emerald-200 dark:border-emerald-800',
    ambito: 'CAM',
    pt: 62.0, // Normalizado sobre 100
    pd: 12.4, // sobre 20
    superaCorte: true,
    umbralCorte: 50,
    aciertos: 14,
    fallos: 5,
    blancos: 1,
    anuladas: 0,
    duracionSegundos: 3100,
    esDemo: true,
  },
  {
    id: 'demo-4',
    indice: 4,
    etiquetaFecha: 'Simulacro 4',
    fechaCompleta: 'Bloque Financiero y LCSP',
    titulo: 'Simulacro Avanzado AGE C1 2023',
    tipo: 'unitario',
    categoriaLabel: 'Test aleatorio (IA)',
    categoriaBadgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    categoriaBadgeText: 'text-purple-700 dark:text-purple-300',
    categoriaBadgeBorder: 'border-purple-200 dark:border-purple-800',
    ambito: 'AGE',
    pt: 69.8,
    pd: 48.86,
    superaCorte: true,
    umbralCorte: 50,
    aciertos: 54,
    fallos: 15,
    blancos: 1,
    anuladas: 2,
    duracionSegundos: 4100,
    esDemo: true,
  },
  {
    id: 'demo-5',
    indice: 5,
    etiquetaFecha: 'Simulacro 5',
    fechaCompleta: 'Último Simulacro Global',
    titulo: 'Examen Oficial AGE C1 Convocatoria 2024',
    tipo: 'unitario',
    categoriaLabel: 'Test oficial',
    categoriaBadgeBg: 'bg-sky-50 dark:bg-sky-950/50',
    categoriaBadgeText: 'text-sky-700 dark:text-sky-300',
    categoriaBadgeBorder: 'border-sky-200 dark:border-sky-800',
    ambito: 'AGE',
    pt: 78.5,
    pd: 54.95,
    superaCorte: true,
    umbralCorte: 50,
    aciertos: 59,
    fallos: 12,
    blancos: 0,
    anuladas: 1,
    duracionSegundos: 3950,
    esDemo: true,
  },
];

export const GraficoEvolucionPT: React.FC<GraficoEvolucionPTProps> = ({
  examenes,
  onCargarExamen,
}) => {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoGrafico>('todos');
  const [filtroAmbito, setFiltroAmbito] = useState<'todos' | 'AGE' | 'CAM'>('todos');
  const [panelMinimizado, setPanelMinimizado] = useState(false);
  const [mostrarDemoSiVacio, setMostrarDemoSiVacio] = useState(false);

  // Filtrar exámenes completados con resultado numérico
  const puntosReales: PuntoGrafico[] = useMemo(() => {
    const evaluados = examenes
      .filter((ex) => ex.resultado && typeof ex.resultado.puntuacionTransformada === 'number')
      .sort((a, b) => {
        const fechaA = new Date(a.resultado?.fechaRealizacion || a.fecha).getTime();
        const fechaB = new Date(b.resultado?.fechaRealizacion || b.fecha).getTime();
        return fechaA - fechaB;
      });

    return evaluados.map((ex, idx) => {
      const res = ex.resultado!;
      const cat = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
      const catInfo = CATEGORIAS_EXAMEN_INFO[cat];

      // Formatear fecha para el eje X
      let etiquetaFecha = `T${idx + 1}`;
      let fechaCompleta = ex.fecha;
      try {
        const d = new Date(res.fechaRealizacion || ex.fecha);
        if (!isNaN(d.getTime())) {
          etiquetaFecha = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          fechaCompleta = d.toLocaleString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch (_) {
        // mantener fallback
      }

      // Si es supuesto en vista 'todos', normalizamos sobre 100 para comparar con el corte de 50
      let ptValor = res.puntuacionTransformada;
      let umbralCorte = ex.tipo === 'supuesto' ? 25 : 50;

      if (filtroTipo === 'todos' && ex.tipo === 'supuesto') {
        // En vista combinada, escalamos 0-50 a 0-100 para que la línea de corte 50 sea unificada
        ptValor = parseFloat((res.puntuacionTransformada * 2).toFixed(2));
        umbralCorte = 50;
      }

      return {
        id: ex.id,
        indice: idx + 1,
        etiquetaFecha,
        fechaCompleta,
        titulo: ex.titulo,
        tipo: ex.tipo,
        categoriaLabel: catInfo.label,
        categoriaBadgeBg: catInfo.bgBadge,
        categoriaBadgeText: catInfo.textBadge,
        categoriaBadgeBorder: catInfo.borderBadge,
        ambito: ex.ambito,
        pt: ptValor,
        pd: res.puntuacionDirecta,
        superaCorte: res.superaCorte,
        umbralCorte,
        aciertos: res.aciertos,
        fallos: res.fallos,
        blancos: res.blancos,
        anuladas: res.anuladas || 0,
        duracionSegundos: res.duracionSegundos || 0,
        examenRef: ex,
      };
    });
  }, [examenes, filtroTipo]);

  const hayDatosReales = puntosReales.length > 0;
  const usandoDatosDemo = !hayDatosReales && mostrarDemoSiVacio;

  // Filtrado activo de puntos según los controles
  const puntosFiltrados = useMemo(() => {
    let base = hayDatosReales ? puntosReales : usandoDatosDemo ? DATOS_DEMO_HISTORICO : [];

    if (filtroTipo !== 'todos') {
      base = base.filter((p) => p.tipo === filtroTipo);
    }
    if (filtroAmbito !== 'todos') {
      base = base.filter((p) => p.ambito === filtroAmbito || p.ambito === 'AMBOS');
    }

    return base;
  }, [puntosReales, hayDatosReales, usandoDatosDemo, filtroTipo, filtroAmbito]);

  // Métricas estadísticas agregadas
  const metricas = useMemo(() => {
    if (puntosFiltrados.length === 0) {
      return {
        total: 0,
        mediaPT: 0,
        maxPT: 0,
        minPT: 0,
        tasaAprobados: 0,
        aprobadosCount: 0,
        tendenciaDelta: 0,
      };
    }

    const total = puntosFiltrados.length;
    const sumaPT = puntosFiltrados.reduce((acc, p) => acc + p.pt, 0);
    const mediaPT = parseFloat((sumaPT / total).toFixed(1));
    const maxPT = Math.max(...puntosFiltrados.map((p) => p.pt));
    const minPT = Math.min(...puntosFiltrados.map((p) => p.pt));
    const aprobadosCount = puntosFiltrados.filter((p) => p.superaCorte).length;
    const tasaAprobados = Math.round((aprobadosCount / total) * 100);

    // Tendencia: comparar los últimos puntos contra los primeros
    let tendenciaDelta = 0;
    if (total >= 2) {
      const mitad = Math.floor(total / 2);
      const primeros = puntosFiltrados.slice(0, mitad);
      const ultimos = puntosFiltrados.slice(-mitad);
      const mediaPri = primeros.reduce((a, b) => a + b.pt, 0) / primeros.length;
      const mediaUlt = ultimos.reduce((a, b) => a + b.pt, 0) / ultimos.length;
      tendenciaDelta = parseFloat((mediaUlt - mediaPri).toFixed(1));
    }

    return {
      total,
      mediaPT,
      maxPT,
      minPT,
      tasaAprobados,
      aprobadosCount,
      tendenciaDelta,
    };
  }, [puntosFiltrados]);

  // Umbral de corte de referencia
  const corteReferencia = useMemo(() => {
    if (filtroTipo === 'supuesto') return 25;
    return 50; // Para 'todos' o 'test'
  }, [filtroTipo]);

  const maxEscalaY = useMemo(() => {
    if (filtroTipo === 'supuesto') return 50;
    return 100;
  }, [filtroTipo]);

  // Tooltip personalizado estilizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: PuntoGrafico = payload[0].payload;
      const esApto = data.superaCorte;
      const min = Math.floor(data.duracionSegundos / 60);
      const seg = data.duracionSegundos % 60;
      const tiempoStr = `${min}m ${seg.toString().padStart(2, '0')}s`;

      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl shadow-xl text-xs max-w-xs space-y-2 z-50">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {data.fechaCompleta}
            </span>
            <span
              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-black ${data.categoriaBadgeBg} ${data.categoriaBadgeText} ${data.categoriaBadgeBorder}`}
            >
              {data.categoriaLabel}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2 text-[11px] leading-snug">
              {data.titulo}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Ámbito: {data.ambito}
              </span>
              <span>·</span>
              <span>Tiempo: {tiempoStr}</span>
            </div>
          </div>

          {/* Tarjeta de Calificación Transformada */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] uppercase font-mono text-slate-400 block">
                Puntuación Transformada (PT)
              </span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {data.pt.toFixed(2)}{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  / {data.tipo === 'supuesto' && filtroTipo === 'supuesto' ? '50' : '100'} PT
                </span>
              </span>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border ${
                  esApto
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                <i className={`fa-solid ${esApto ? 'fa-circle-check' : 'fa-circle-xmark'} text-[9px]`}></i>
                {esApto ? 'Supera Corte' : 'Bajo Corte'}
              </span>
              <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                Corte oficial: {data.umbralCorte} PT
              </span>
            </div>
          </div>

          {/* Desglose de preguntas y Puntuación Directa */}
          <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9.5px] pt-1">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-1 rounded border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold block">{data.aciertos}</span>
              <span className="text-[8px] text-slate-400">Aciertos</span>
            </div>
            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-1 rounded border border-rose-100 dark:border-rose-900/40">
              <span className="text-rose-700 dark:text-rose-300 font-bold block">{data.fallos}</span>
              <span className="text-[8px] text-slate-400">Fallos</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300 font-bold block">{data.blancos}</span>
              <span className="text-[8px] text-slate-400">Blancos</span>
            </div>
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-1 rounded border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-indigo-700 dark:text-indigo-300 font-bold block">{data.pd.toFixed(2)}</span>
              <span className="text-[8px] text-slate-400">PD Neta</span>
            </div>
          </div>

          {data.examenRef && onCargarExamen && (
            <button
              type="button"
              onClick={() => onCargarExamen(data.examenRef!)}
              className="w-full mt-1.5 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              <span>Revisar este examen en detalle</span>
            </button>
          )}

          {data.esDemo && (
            <div className="text-[9px] text-amber-600 dark:text-amber-400 font-mono text-center bg-amber-50 dark:bg-amber-950/40 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
              Dato de simulación demostrativa
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Renderizado de puntos en el gráfico: verde si supera corte, rojo si no
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const esApto = payload.superaCorte;
    const fillColor = esApto ? '#10b981' : '#f43f5e';
    const strokeColor = esApto ? '#059669' : '#e11d48';

    return (
      <g key={`dot-${payload.id || cx}`}>
        <circle cx={cx} cy={cy} r={5} fill={fillColor} stroke="#ffffff" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
      </g>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Cabecera del Gráfico con Controles Interactivos */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/80 bg-linear-to-r from-slate-50/80 via-white to-slate-50/50 dark:from-slate-850 dark:via-slate-800 dark:to-slate-850">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                <i className="fa-solid fa-chart-line text-[10px]"></i>
                Progreso Académico Recharts
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                Evolución de Puntuación Transformada (PT)
              </span>
              {usandoDatosDemo && (
                <span className="text-[9.5px] font-black uppercase font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse">
                  Modo Ejemplo Ilustrativo
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mt-1 flex items-center gap-2">
              <span>Curva de Rendimiento y Cortes Oficiales C1</span>
              <span className="text-xs font-normal normal-case text-slate-500 dark:text-slate-400">
                (Comisión Permanente de Selección)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Monitoriza tu progreso a lo largo del tiempo frente a la nota de corte oficial reglamentaria.
            </p>
          </div>

          {/* Barra de Filtros y Controles del Gráfico */}
          <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
            {/* Segmented Control Tipo de Prueba */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600 text-xs">
              {[
                { id: 'todos', label: 'Todos', icon: 'fa-layer-group' },
                { id: 'unitario', label: 'Tests (100 PT)', icon: 'fa-list-check' },
                { id: 'supuesto', label: 'Supuestos (50 PT)', icon: 'fa-scale-balanced' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltroTipo(item.id as FiltroTipoGrafico)}
                  className={`py-1 px-2.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                    filtroTipo === item.id
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-[10px]`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Filtro Ámbito */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/70 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600 text-xs">
              {(['todos', 'AGE', 'CAM'] as const).map((amb) => (
                <button
                  key={amb}
                  type="button"
                  onClick={() => setFiltroAmbito(amb)}
                  className={`py-1 px-2 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                    filtroAmbito === amb
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {amb === 'todos' ? 'Ámbito: Todos' : amb}
                </button>
              ))}
            </div>

            {/* Botón Minimizar / Expandir */}
            <button
              type="button"
              onClick={() => setPanelMinimizado((prev) => !prev)}
              className="py-1 px-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
              title={panelMinimizado ? 'Expandir gráfico' : 'Plegar gráfico'}
            >
              <i className={`fa-solid ${panelMinimizado ? 'fa-chevron-down' : 'fa-chevron-up'} text-[11px]`}></i>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Estadísticas del Rendimiento */}
        {!panelMinimizado && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                Media Transformada
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {metricas.mediaPT.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  / {corteReferencia === 25 ? '50' : '100'} PT
                </span>
              </div>
              <span
                className={`text-[9px] font-bold font-mono mt-0.5 block ${
                  metricas.mediaPT >= corteReferencia
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                }`}
              >
                {metricas.mediaPT >= corteReferencia ? '✓ Supera corte medio' : '✗ Bajo corte medio'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                Tasa de Aprobados
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {metricas.tasaAprobados}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({metricas.aprobadosCount}/{metricas.total})
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium">
                {metricas.tasaAprobados >= 70 ? 'Nivel óptimo para plaza' : 'Requiere consolidación'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                Mejor Calificación
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {metricas.maxPT.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">PT</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">
                Mínimo: {metricas.minPT.toFixed(1)} PT
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                Tendencia Reciente
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-xl font-black font-mono flex items-center gap-1 ${
                    metricas.tendenciaDelta >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  <i
                    className={`fa-solid text-xs ${
                      metricas.tendenciaDelta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'
                    }`}
                  ></i>
                  {metricas.tendenciaDelta >= 0 ? `+${metricas.tendenciaDelta}` : metricas.tendenciaDelta}
                </span>
                <span className="text-[10px] font-mono text-slate-400">PT</span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium">
                Últimas pruebas vs iniciales
              </span>
            </div>

            <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                  Muestra Analizada
                </span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {metricas.total} {metricas.total === 1 ? 'Prueba' : 'Pruebas'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Apto</span>
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-1"></span>
                <span>No Apto</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cuerpo del Gráfico o Estado Vacío */}
      {!panelMinimizado && (
        <div className="p-4 sm:p-5">
          {puntosFiltrados.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/60 dark:bg-slate-850/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  Sin pruebas evaluadas con los filtros seleccionados
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Realiza tus primeros simulacros en el Generador IA o importa exámenes resueltos para visualizar la curva de evolución cronológica de tu Puntuación Transformada (PT).
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarDemoSiVacio(true)}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-amber-300"></i>
                  <span>Ver simulación demostrativa</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gráfico Recharts Responsive */}
              <div className="w-full h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={puntosFiltrados}
                    margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="ptGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />

                    <XAxis
                      dataKey="etiquetaFecha"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.5 }}
                    />

                    <YAxis
                      domain={[0, maxEscalaY]}
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.5 }}
                      unit=" PT"
                    />

                    <Tooltip content={<CustomTooltip />} />

                    {/* Línea de Corte Oficial de la Oposición */}
                    <ReferenceLine
                      y={corteReferencia}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: `Corte Oficial (${corteReferencia} PT)`,
                        position: 'insideTopRight',
                        fill: '#d97706',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />

                    {/* Línea de Media del Opositor */}
                    {metricas.mediaPT > 0 && (
                      <ReferenceLine
                        y={metricas.mediaPT}
                        stroke="#6366f1"
                        strokeDasharray="3 3"
                        strokeWidth={1.2}
                        opacity={0.8}
                        label={{
                          value: `Tu Media (${metricas.mediaPT.toFixed(1)} PT)`,
                          position: 'insideBottomRight',
                          fill: '#6366f1',
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}
                      />
                    )}

                    {/* Área sombreada bajo la curva */}
                    <Area
                      type="monotone"
                      dataKey="pt"
                      stroke="none"
                      fillOpacity={1}
                      fill="url(#ptGradient)"
                    />

                    {/* Línea principal de evolución */}
                    <Line
                      type="monotone"
                      dataKey="pt"
                      name="Puntuación Transformada (PT)"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={renderCustomDot}
                      activeDot={{ r: 7, stroke: '#4f46e5', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda y Nota explicativa sobre la escala CPS */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3 flex-wrap font-mono text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">Apto (Supera corte)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">No Apto (Bajo corte)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Nota de Corte ({corteReferencia} PT)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-500 inline-block"></span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Media Personal ({metricas.mediaPT} PT)</span>
                  </span>
                </div>

                {usandoDatosDemo && (
                  <button
                    type="button"
                    onClick={() => setMostrarDemoSiVacio(false)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    Ocultar simulación demo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
