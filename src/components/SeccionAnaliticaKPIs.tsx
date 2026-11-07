import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ExamenCompleto, TipoPrueba, ConvocatoriaAmbito } from '../types';
import {
  CATEGORIAS_EXAMEN_INFO,
  AMBITOS_INFO,
  deducirCategoriaExamen,
} from '../utils/jsonExamHelper';

interface SeccionAnaliticaKPIsProps {
  examenes: ExamenCompleto[];
  onCargarExamen?: (examen: ExamenCompleto) => void;
  onIrAGenerador?: () => void;
}

interface ConvocatoriaOficialHistorica {
  id: string;
  nombre: string;
  ambito: ConvocatoriaAmbito;
  anoOEP: string;
  corteTestPD: number; // sobre 70
  corteTestPT: number; // sobre 100
  corteSupuestoPD: number; // sobre 20
  corteSupuestoPT: number; // sobre 50
  plazas: number;
  descripcion: string;
}

interface PuntoGraficoPuntuacion {
  id: string;
  etiqueta: string;
  short?: string;
  titulo: string;
  fecha: string;
  tipo: TipoPrueba;
  puntuacion: number;
  puntuacionTest?: number | null;
  puntuacionSupuesto?: number | null;
  corteAplicable?: number;
  pd: number;
  pdOriginal?: number;
  totalPreguntasOriginal?: number;
  baseOficial?: number;
  esEscalada?: boolean;
  pt: number;
  superaCorte: boolean;
  superaTest?: boolean;
  superaSupuesto?: boolean;
  aciertos: number;
  fallos: number;
  blancos: number;
  penalizacion: number;
  conExamenes?: boolean;
  examenRef?: ExamenCompleto;
}

const HISTORICO_CORTES_C1: ConvocatoriaOficialHistorica[] = [
  {
    id: 'AGE_2025',
    nombre: 'AGE C1 Convocatoria 2025 (Corte OEP 2025)',
    ambito: 'AGE',
    anoOEP: '2025',
    corteTestPD: 31.67,
    corteTestPT: 50.0,
    corteSupuestoPD: 12.67,
    corteSupuestoPT: 25.0,
    plazas: 5120,
    descripcion: 'Puntuaciones de corte oficiales CPS: 31,67 PD en 1ª Parte (Test sobre 70) y 12,67 PD en 2ª Parte (Supuesto sobre 20). Total: 44,34 PD.',
  },
  {
    id: 'AGE_2024',
    nombre: 'AGE C1 OEP 2023 y 2024 Acumulada',
    ambito: 'AGE',
    anoOEP: '2023-2024',
    corteTestPD: 33.33,
    corteTestPT: 50.0,
    corteSupuestoPD: 14.0,
    corteSupuestoPT: 25.0,
    plazas: 5440,
    descripcion: 'Macroconvocatoria conjunta (14 de diciembre de 2024). Corte CPS: 33.33 PD en teoría y 14.00 PD en supuesto práctico. Total: 47.33 PD.',
  },
  {
    id: 'AGE_2022',
    nombre: 'AGE C1 OEP 2021 y 2022 Acumulada',
    ambito: 'AGE',
    anoOEP: '2021-2022',
    corteTestPD: 31.33,
    corteTestPT: 50.0,
    corteSupuestoPD: 14.33,
    corteSupuestoPT: 25.0,
    plazas: 4652,
    descripcion: 'Corte fijado por la CPS en 31.33 PD (test) y 14.33 PD (supuesto práctico). Total: 45.66 PD.',
  },
  {
    id: 'CAM_2023',
    nombre: 'Comunidad de Madrid C1 (OEP 2022/2023 - Orden 1836/2022)',
    ambito: 'CAM',
    anoOEP: '2022-2023',
    corteTestPD: 36.67,
    corteTestPT: 50.0,
    corteSupuestoPD: 12.5,
    corteSupuestoPT: 25.0,
    plazas: 780,
    descripcion: 'Última convocatoria general del cuerpo administrativo CAM (Tribunal Calificador DGFP).',
  },
  {
    id: 'CAM_2021',
    nombre: 'Comunidad de Madrid C1 (Convocatoria OEP 2021)',
    ambito: 'CAM',
    anoOEP: '2021',
    corteTestPD: 35.0,
    corteTestPT: 50.0,
    corteSupuestoPD: 12.0,
    corteSupuestoPT: 25.0,
    plazas: 450,
    descripcion: 'Convocatoria autonómica CAM para el subgrupo C1 con materias específicas de Madrid.',
  },
  {
    id: 'AGE_2019',
    nombre: 'AGE C1 OEP 2019',
    ambito: 'AGE',
    anoOEP: '2019',
    corteTestPD: 37.33,
    corteTestPT: 50.0,
    corteSupuestoPD: 11.33,
    corteSupuestoPT: 25.0,
    plazas: 2029,
    descripcion: 'Corte histórico de 37.33 PD en test teórico y 11.33 PD en caso práctico.',
  },
];

const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', short: 'Lun' },
  { id: 2, nombre: 'Martes', short: 'Mar' },
  { id: 3, nombre: 'Miércoles', short: 'Mié' },
  { id: 4, nombre: 'Jueves', short: 'Jue' },
  { id: 5, nombre: 'Viernes', short: 'Vie' },
  { id: 6, nombre: 'Sábado', short: 'Sáb' },
  { id: 0, nombre: 'Domingo', short: 'Dom' },
];

const MESES_ANO = [
  { id: 0, nombre: 'Enero', short: 'Ene' },
  { id: 1, nombre: 'Febrero', short: 'Feb' },
  { id: 2, nombre: 'Marzo', short: 'Mar' },
  { id: 3, nombre: 'Abril', short: 'Abr' },
  { id: 4, nombre: 'Mayo', short: 'May' },
  { id: 5, nombre: 'Junio', short: 'Jun' },
  { id: 6, nombre: 'Julio', short: 'Jul' },
  { id: 7, nombre: 'Agosto', short: 'Ago' },
  { id: 8, nombre: 'Septiembre', short: 'Sep' },
  { id: 9, nombre: 'Octubre', short: 'Oct' },
  { id: 10, nombre: 'Noviembre', short: 'Nov' },
  { id: 11, nombre: 'Diciembre', short: 'Dic' },
];

function parsearFechaExamen(raw?: string): Date {
  if (!raw) return new Date();
  const str = String(raw).trim();
  // 1. DD/MM/YYYY o DD-MM-YYYY
  const dmYMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmYMatch) {
    const day = parseInt(dmYMatch[1], 10);
    const month = parseInt(dmYMatch[2], 10) - 1;
    const year = parseInt(dmYMatch[3], 10);
    const hour = dmYMatch[4] !== undefined ? parseInt(dmYMatch[4], 10) : 12;
    const min = dmYMatch[5] !== undefined ? parseInt(dmYMatch[5], 10) : 0;
    return new Date(year, month, day, hour, min, 0);
  }
  // 2. YYYY-MM-DD o YYYY/MM/DD
  const yMDMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (yMDMatch) {
    const year = parseInt(yMDMatch[1], 10);
    const month = parseInt(yMDMatch[2], 10) - 1;
    const day = parseInt(yMDMatch[3], 10);
    const hour = yMDMatch[4] !== undefined ? parseInt(yMDMatch[4], 10) : 12;
    const min = yMDMatch[5] !== undefined ? parseInt(yMDMatch[5], 10) : 0;
    return new Date(year, month, day, hour, min, 0);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

function formatearClaveDia(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatearClaveMes(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getLunesSemana(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const diaSemana = c.getDay(); // 0 Dom, 1 Lun, ..., 6 Sáb
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  c.setDate(c.getDate() + diff);
  return c;
}

export const SeccionAnaliticaKPIs: React.FC<SeccionAnaliticaKPIsProps> = ({
  examenes,
  onCargarExamen,
  onIrAGenerador,
}) => {
  // Filtro de ámbito y tipo general
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'unitario' | 'supuesto'>('todos');
  const [filtroAmbito, setFiltroAmbito] = useState<'todos' | ConvocatoriaAmbito>('todos');

  // CONTROLES GRÁFICO 1: Número de tests realizados
  const [vistaVolumen, setVistaVolumen] = useState<'hoy' | 'semanal' | 'mensual'>('semanal');
  const [modoDetalleVolumen, setModoDetalleVolumen] = useState<'cumulado' | 'individual'>('cumulado');

  // CONTROLES DE NAVEGACIÓN TEMPORAL (HISTÓRICO DE SEMANAS)
  const [offsetSemana, setOffsetSemana] = useState<number>(0);

  // CONTROLES GRÁFICO 2: Puntuaciones vs Notas de corte
  const [vistaPuntuaciones, setVistaPuntuaciones] = useState<'hoy' | 'semanal' | 'mensual' | 'tests'>('tests');
  const [modoDetallePuntuaciones, setModoDetallePuntuaciones] = useState<'cumulado' | 'individual'>('cumulado');
  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState<string>('AGE_2025');
  const [metricaPuntuacion, setMetricaPuntuacion] = useState<'pd' | 'pt'>('pd');

  // Corte de nota propuesto por el usuario (Personalizado)
  const [cortePropioTestPD, setCortePropioTestPD] = useState<number>(() => {
    const saved = localStorage.getItem('c1_corte_propio_test');
    return saved ? parseFloat(saved) : 31.67;
  });
  const [cortePropioSupuestoPD, setCortePropioSupuestoPD] = useState<number>(() => {
    const saved = localStorage.getItem('c1_corte_propio_supuesto');
    return saved ? parseFloat(saved) : 12.67;
  });
  const [usarCortePropio, setUsarCortePropio] = useState<boolean>(() => {
    return localStorage.getItem('c1_usar_corte_propio') === 'true';
  });

  const handleGuardarCortePropio = (testPD: number, supuestoPD: number, activo: boolean) => {
    setCortePropioTestPD(testPD);
    setCortePropioSupuestoPD(supuestoPD);
    setUsarCortePropio(activo);
    localStorage.setItem('c1_corte_propio_test', testPD.toString());
    localStorage.setItem('c1_corte_propio_supuesto', supuestoPD.toString());
    localStorage.setItem('c1_usar_corte_propio', activo ? 'true' : 'false');
  };

  const cortePropioPTCalculado = useMemo(() => {
    if (filtroTipo === 'supuesto') {
      return parseFloat(((cortePropioSupuestoPD / 20) * 50).toFixed(2));
    }
    return parseFloat(((cortePropioTestPD / 70) * 100).toFixed(2));
  }, [cortePropioTestPD, cortePropioSupuestoPD, filtroTipo]);

  const ahora = useMemo(() => new Date(), []);
  const hoyFechaCompleta = useMemo(
    () => ahora.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
    [ahora]
  );

  // Exámenes evaluados reales con enriquecimiento cronológico día a día
  const examenesEvaluados = useMemo(() => {
    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasShorts = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return examenes
      .filter((ex) => {
        if (!ex.resultado) return false;
        const res = ex.resultado;
        const total = (res.aciertos || 0) + (res.fallos || 0) + (res.blancos || 0);
        return total > 0 && typeof res.puntuacionDirecta === 'number';
      })
      .map((ex, idx) => {
        const res = ex.resultado!;
        // Cómputo 100% automático: la fecha en KPIs es la fecha exacta en que se realizó la prueba
        const fechaBruta = res.fechaRealizacion || (ex.fecha && ex.fecha !== 'Sin fecha' ? ex.fecha : new Date().toISOString());
        const fechaObj = parsearFechaExamen(fechaBruta);
        const claveDia = formatearClaveDia(fechaObj);
        const claveMes = formatearClaveMes(fechaObj);
        const diaSemIdx = fechaObj.getDay();
        const diaSemanaShort = diasShorts[diaSemIdx];
        const diaSemanaNombre = diasNombres[diaSemIdx];
        const etiquetaDiaCompleta = `${diaSemanaShort} ${fechaObj.getDate()}/${fechaObj.getMonth() + 1}`;
        const cat = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
        const ambKey = ex.ambito || 'AGE';
        const penalizacion = parseFloat(((res.fallos || 0) / 3).toFixed(2));

        // Determinación del total de preguntas de la prueba para estandarización
        const totalPreguntasExamen =
          res.preguntasEvaluadasTotal ||
          ((res.aciertos || 0) + (res.fallos || 0) + (res.blancos || 0)) ||
          (ex.preguntas?.filter((p) => !p.esReserva)?.length) ||
          (ex.preguntas?.length) ||
          (ex.tipo === 'supuesto' ? 20 : 70);

        // Modelo oficial: 70 preguntas para tests ordinarios, 20 preguntas para supuestos
        const baseOficial = ex.tipo === 'supuesto' ? 20 : 70;
        const esEscalada = totalPreguntasExamen !== baseOficial;

        // Conversión proporcional oficial: (pd / totalPreguntasExamen) * baseOficial
        // Ejemplo usuario: En test de 20 preguntas, 10 PD = 35.00 PD sobre 70 Q
        const pdConvertida =
          totalPreguntasExamen > 0
            ? parseFloat(((res.puntuacionDirecta / totalPreguntasExamen) * baseOficial).toFixed(2))
            : res.puntuacionDirecta;

        return {
          id: ex.id,
          indice: idx + 1,
          titulo: ex.titulo,
          tipo: ex.tipo,
          categoria: cat,
          categoriaInfo: CATEGORIAS_EXAMEN_INFO[cat],
          ambito: ambKey,
          ambitoInfo: AMBITOS_INFO[ambKey] || AMBITOS_INFO['AGE'],
          fechaObj,
          claveDia,
          claveMes,
          diaSemanaShort,
          diaSemanaNombre,
          etiquetaDiaCompleta,
          fechaTexto: fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          pd: res.puntuacionDirecta,
          pdReal: res.puntuacionDirecta,
          pdConvertida,
          totalPreguntasExamen,
          baseOficial,
          esEscalada,
          pt: res.puntuacionTransformada,
          aciertos: res.aciertos,
          fallos: res.fallos,
          blancos: res.blancos,
          penalizacion,
          duracionSegundos: res.duracionSegundos || 0,
          superaCorteOficial: res.superaCorte,
          examenRef: ex,
        };
      })
      .sort((a, b) => a.fechaObj.getTime() - b.fechaObj.getTime());
  }, [examenes]);

  // Exámenes filtrados por tipo y ámbito
  const examenesFiltrados = useMemo(() => {
    return examenesEvaluados.filter((ex) => {
      if (filtroTipo !== 'todos' && ex.tipo !== filtroTipo) return false;
      if (filtroAmbito !== 'todos' && ex.ambito !== filtroAmbito) return false;
      return true;
    });
  }, [examenesEvaluados, filtroTipo, filtroAmbito]);

  // KPIS SUPERIORES (Se conservan exactamente según requerimiento)
  const kpis = useMemo(() => {
    const data = examenesFiltrados;
    if (data.length === 0) {
      return {
        totalPruebas: 0,
        mediaPT: 0,
        mediaPD: 0,
        aprobadosCount: 0,
        tasaAprobados: 0,
        penalizacionMedia: 0,
        tendenciaDelta: 0,
        segundosPorPregunta: 0,
      };
    }

    const n = data.length;
    const sumaPT = data.reduce((acc, p) => acc + p.pt, 0);
    const mediaPT = parseFloat((sumaPT / n).toFixed(1));

    const sumaPD = data.reduce((acc, p) => acc + p.pd, 0);
    const mediaPD = parseFloat((sumaPD / n).toFixed(2));

    const aprobadosCount = data.filter((p) => p.superaCorteOficial).length;
    const tasaAprobados = Math.round((aprobadosCount / n) * 100);

    const penalizacionTotal = data.reduce((acc, p) => acc + p.penalizacion, 0);
    const penalizacionMedia = parseFloat((penalizacionTotal / n).toFixed(2));

    const tiempoTotal = data.reduce((acc, p) => acc + p.duracionSegundos, 0);
    const totalPreguntas = data.reduce((acc, p) => acc + p.aciertos + p.fallos + p.blancos, 0);
    const segundosPorPregunta = totalPreguntas > 0 ? Math.round(tiempoTotal / totalPreguntas) : 0;

    let tendenciaDelta = 0;
    if (n >= 2) {
      const mitad = Math.floor(n / 2);
      const primeras = data.slice(0, mitad);
      const ultimas = data.slice(-mitad);
      const medPri = primeras.reduce((a, b) => a + b.pt, 0) / primeras.length;
      const medUlt = ultimas.reduce((a, b) => a + b.pt, 0) / ultimas.length;
      tendenciaDelta = parseFloat((medUlt - medPri).toFixed(1));
    }

    return {
      totalPruebas: n,
      mediaPT,
      mediaPD,
      aprobadosCount,
      tasaAprobados,
      penalizacionMedia,
      tendenciaDelta,
      segundosPorPregunta,
    };
  }, [examenesFiltrados]);

  // ==========================================
  // GESTIÓN DE SEMANAS Y CALENDARIO HISTÓRICO
  // ==========================================
  const lunesSemanaActiva = useMemo(() => {
    const lunesBase = getLunesSemana(ahora);
    const res = new Date(lunesBase.getFullYear(), lunesBase.getMonth(), lunesBase.getDate() + offsetSemana * 7, 12, 0, 0);
    return res;
  }, [ahora, offsetSemana]);

  const diasSemanaActiva = useMemo(() => {
    const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const shorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunesSemanaActiva.getFullYear(), lunesSemanaActiva.getMonth(), lunesSemanaActiva.getDate() + i, 12, 0, 0);
      const clave = formatearClaveDia(d);
      const diaNum = d.getDate();
      const mesNum = d.getMonth() + 1;
      dias.push({
        fechaObj: d,
        clave,
        nombre: nombres[i],
        short: shorts[i],
        diaNum,
        mesNum,
        etiqueta: `${shorts[i]} ${diaNum}/${mesNum}`,
        etiquetaCompleta: `${nombres[i]} ${diaNum}/${mesNum}`,
        diaSemanaId: (i + 1) % 7,
      });
    }
    return dias;
  }, [lunesSemanaActiva]);

  const textoRangoSemana = useMemo(() => {
    const dIni = diasSemanaActiva[0];
    const dFin = diasSemanaActiva[6];
    return `Semana del ${dIni.etiquetaCompleta} al ${dFin.etiquetaCompleta} de ${lunesSemanaActiva.getFullYear()}`;
  }, [diasSemanaActiva, lunesSemanaActiva]);

  // Lista de todas las semanas con exámenes en el histórico del usuario
  const semanasHistoricas = useMemo(() => {
    const map = new Map<string, { lunes: Date; count: number; label: string; offset: number }>();
    const lunesBase = getLunesSemana(ahora);
    examenesFiltrados.forEach((ex) => {
      const lunesEx = getLunesSemana(ex.fechaObj);
      const clave = formatearClaveDia(lunesEx);
      const diffDias = Math.round((lunesEx.getTime() - lunesBase.getTime()) / (1000 * 60 * 60 * 24));
      const offset = Math.round(diffDias / 7);
      const fin = new Date(lunesEx.getFullYear(), lunesEx.getMonth(), lunesEx.getDate() + 6, 12, 0, 0);
      const label = `${lunesEx.getDate()}/${lunesEx.getMonth() + 1} - ${fin.getDate()}/${fin.getMonth() + 1}/${fin.getFullYear()}`;
      if (!map.has(clave)) {
        map.set(clave, { lunes: lunesEx, count: 1, label, offset });
      } else {
        map.get(clave)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lunes.getTime() - a.lunes.getTime());
  }, [examenesFiltrados, ahora]);

  // ==========================================
  // 1º GRÁFICO: NÚMERO DE TESTS REALIZADOS
  // ==========================================

  // A) Vista Día Actual (Hoy)
  const datosVolumenHoy = useMemo(() => {
    const testsDeHoy = examenesFiltrados.filter((ex) => ex.claveDia === formatearClaveDia(ahora));

    if (modoDetalleVolumen === 'individual') {
      if (testsDeHoy.length === 0) {
        return {
          datos: [{ etiqueta: 'Sin tests hoy', tests: 0, supuestos: 0, total: 0 }],
          totalHoy: 0,
          testsHoy: 0,
          supuestosHoy: 0,
        };
      }
      const datos = testsDeHoy.map((ex, i) => ({
        id: ex.id,
        etiqueta: `Hoy #${i + 1} (${ex.tipo === 'supuesto' ? 'Supuesto' : 'Test'})`,
        titulo: ex.titulo,
        tests: ex.tipo === 'unitario' ? 1 : 0,
        supuestos: ex.tipo === 'supuesto' ? 1 : 0,
        total: 1,
        fechaTexto: ex.fechaTexto,
        examenRef: ex.examenRef,
      }));
      return {
        datos,
        totalHoy: testsDeHoy.length,
        testsHoy: testsDeHoy.filter((e) => e.tipo === 'unitario').length,
        supuestosHoy: testsDeHoy.filter((e) => e.tipo === 'supuesto').length,
      };
    }

    // modoDetalleVolumen === 'cumulado' por franjas horarias
    const franjas = [
      { hora: '08:00', label: '08:00-10:00', hInicio: 8, hFin: 10, tests: 0, supuestos: 0, total: 0 },
      { hora: '10:00', label: '10:00-12:00', hInicio: 10, hFin: 12, tests: 0, supuestos: 0, total: 0 },
      { hora: '12:00', label: '12:00-14:00', hInicio: 12, hFin: 14, tests: 0, supuestos: 0, total: 0 },
      { hora: '14:00', label: '14:00-16:00', hInicio: 14, hFin: 16, tests: 0, supuestos: 0, total: 0 },
      { hora: '16:00', label: '16:00-18:00', hInicio: 16, hFin: 18, tests: 0, supuestos: 0, total: 0 },
      { hora: '18:00', label: '18:00-20:00', hInicio: 18, hFin: 20, tests: 0, supuestos: 0, total: 0 },
      { hora: '20:00', label: '20:00-22:00', hInicio: 20, hFin: 22, tests: 0, supuestos: 0, total: 0 },
      { hora: '22:00', label: '22:00-24:00', hInicio: 22, hFin: 24, tests: 0, supuestos: 0, total: 0 },
    ];

    testsDeHoy.forEach((ex) => {
      const h = ex.fechaObj.getHours();
      const match = franjas.find((f) => h >= f.hInicio && h < f.hFin) || franjas[franjas.length - 1];
      if (ex.tipo === 'supuesto') {
        match.supuestos += 1;
      } else {
        match.tests += 1;
      }
      match.total += 1;
    });

    return {
      datos: franjas.map((f) => ({ etiqueta: f.hora, tests: f.tests, supuestos: f.supuestos, total: f.total })),
      totalHoy: testsDeHoy.length,
      testsHoy: testsDeHoy.filter((e) => e.tipo === 'unitario').length,
      supuestosHoy: testsDeHoy.filter((e) => e.tipo === 'supuesto').length,
    };
  }, [examenesFiltrados, ahora, modoDetalleVolumen]);

  // B) Vista Semanal (Lunes a Domingo con día del mes y histórico real)
  const datosVolumenSemanal = useMemo(() => {
    const examenesSemana = examenesFiltrados.filter((ex) =>
      diasSemanaActiva.some((d) => d.clave === ex.claveDia)
    );

    if (modoDetalleVolumen === 'individual') {
      if (examenesSemana.length === 0) {
        return {
          datos: diasSemanaActiva.map((d) => ({
            id: d.clave,
            etiqueta: d.etiqueta,
            titulo: `${d.nombre} (${d.etiquetaCompleta})`,
            tests: 0,
            supuestos: 0,
            total: 0,
            fechaTexto: d.etiquetaCompleta,
          })),
          totalSemana: 0,
          mediaDiaria: '0.0',
          examenesEnSemanaCount: 0,
        };
      }
      const datos = examenesSemana.map((ex, idx) => ({
        id: ex.id,
        etiqueta: `${ex.etiquetaDiaCompleta} · ${ex.tipo === 'supuesto' ? 'Sup' : 'Test'} #${idx + 1}`,
        titulo: ex.titulo,
        diaNombre: ex.diaSemanaNombre,
        tests: ex.tipo === 'unitario' ? 1 : 0,
        supuestos: ex.tipo === 'supuesto' ? 1 : 0,
        total: 1,
        fechaTexto: `${ex.diaSemanaNombre} ${ex.fechaTexto}`,
        examenRef: ex.examenRef,
      }));
      const totalSemana = examenesSemana.length;
      const mediaDiaria = (totalSemana / 7).toFixed(1);
      return { datos, totalSemana, mediaDiaria, examenesEnSemanaCount: totalSemana };
    }

    // modoDetalleVolumen === 'cumulado' (desglose por cada uno de los 7 días de la semana activa)
    const datos = diasSemanaActiva.map((dia) => {
      const examenesDia = examenesFiltrados.filter((ex) => ex.claveDia === dia.clave);
      const tests = examenesDia.filter((e) => e.tipo === 'unitario').length;
      const supuestos = examenesDia.filter((e) => e.tipo === 'supuesto').length;
      return {
        id: dia.clave,
        etiqueta: dia.etiqueta,
        diaNombre: dia.nombre,
        titulo: `${dia.nombre} (${dia.etiquetaCompleta})`,
        tests,
        supuestos,
        total: tests + supuestos,
        fechaTexto: dia.etiquetaCompleta,
      };
    });

    const totalSemana = datos.reduce((acc, d) => acc + d.total, 0);
    const mediaDiaria = (totalSemana / 7).toFixed(1);
    return { datos, totalSemana, mediaDiaria, examenesEnSemanaCount: totalSemana };
  }, [examenesFiltrados, diasSemanaActiva, modoDetalleVolumen]);

  // C) Vista Mensual Acumulada (Histórico cronológico de meses)
  const datosVolumenMensual = useMemo(() => {
    const mapaMeses = new Map<string, { label: string; mesNombre: string; ano: number; tests: number; supuestos: number; total: number }>();

    // Generar últimos 12 meses cronológicos de forma garantizada
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 15, 12, 0, 0);
      const clave = formatearClaveMes(d);
      const mesNombre = MESES_ANO[d.getMonth()].nombre;
      const mesShort = MESES_ANO[d.getMonth()].short;
      const label = `${mesShort} ${d.getFullYear().toString().slice(-2)}`;
      mapaMeses.set(clave, { label, mesNombre, ano: d.getFullYear(), tests: 0, supuestos: 0, total: 0 });
    }

    // Añadir meses adicionales del histórico si existiesen
    examenesFiltrados.forEach((ex) => {
      const clave = ex.claveMes;
      if (!mapaMeses.has(clave)) {
        const mesNombre = MESES_ANO[ex.fechaObj.getMonth()].nombre;
        const mesShort = MESES_ANO[ex.fechaObj.getMonth()].short;
        const label = `${mesShort} ${ex.fechaObj.getFullYear().toString().slice(-2)}`;
        mapaMeses.set(clave, { label, mesNombre, ano: ex.fechaObj.getFullYear(), tests: 0, supuestos: 0, total: 0 });
      }
      const item = mapaMeses.get(clave)!;
      if (ex.tipo === 'supuesto') {
        item.supuestos += 1;
      } else {
        item.tests += 1;
      }
      item.total += 1;
    });

    const datos = Array.from(mapaMeses.entries())
      .sort(([kA], [kB]) => kA.localeCompare(kB))
      .slice(-12)
      .map(([clave, v]) => ({
        id: clave,
        clave,
        etiqueta: v.label,
        nombreCompleto: `${v.mesNombre} ${v.ano}`,
        tests: v.tests,
        supuestos: v.supuestos,
        total: v.total,
      }));

    const totalMensual = datos.reduce((acc, m) => acc + m.total, 0);
    return { datos, totalMensual };
  }, [examenesFiltrados, ahora]);

  // Datos activos del Gráfico 1
  const datosGrafico1 = useMemo(() => {
    if (vistaVolumen === 'hoy') return datosVolumenHoy.datos;
    if (vistaVolumen === 'semanal') return datosVolumenSemanal.datos;
    return datosVolumenMensual.datos;
  }, [vistaVolumen, datosVolumenHoy, datosVolumenSemanal, datosVolumenMensual]);

  // ==============================================================
  // 2º GRÁFICO: PUNTUACIONES DE LOS TESTS VS NOTAS DE CORTE
  // ==============================================================

  // Convocatoria de referencia activa
  const convocatoriaActiva = useMemo(() => {
    if (convocatoriaSeleccionada === 'personalizada') {
      return {
        id: 'personalizada',
        nombre: '🎯 Mi Nota de Corte Personalizada',
        corteTestPD: cortePropioTestPD,
        corteTestPT: cortePropioPTCalculado,
        corteSupuestoPD: cortePropioSupuestoPD,
        corteSupuestoPT: parseFloat(((cortePropioSupuestoPD / 20) * 50).toFixed(2)),
        ambito: 'AGE' as ConvocatoriaAmbito,
        anoOEP: 'Personal',
        plazas: 0,
        descripcion: 'Umbral definido a medida en la sección de objetivos personales.',
      };
    }
    return (
      HISTORICO_CORTES_C1.find((c) => c.id === convocatoriaSeleccionada) || HISTORICO_CORTES_C1[0]
    );
  }, [convocatoriaSeleccionada, cortePropioTestPD, cortePropioSupuestoPD, cortePropioPTCalculado]);

  // Cortes específicos según la métrica seleccionada
  const corteTest = useMemo(() => {
    return metricaPuntuacion === 'pd' ? convocatoriaActiva.corteTestPD : convocatoriaActiva.corteTestPT;
  }, [convocatoriaActiva, metricaPuntuacion]);

  const corteSupuesto = useMemo(() => {
    return metricaPuntuacion === 'pd' ? convocatoriaActiva.corteSupuestoPD : convocatoriaActiva.corteSupuestoPT;
  }, [convocatoriaActiva, metricaPuntuacion]);

  // Umbral numérico de corte según métrica y tipo de filtro
  const umbralCorteActivo = useMemo(() => {
    const esSupuesto = filtroTipo === 'supuesto';
    return esSupuesto ? corteSupuesto : corteTest;
  }, [corteSupuesto, corteTest, filtroTipo]);

  // Dataset para Gráfico 2
  const datosPuntuacionesGrafico2: PuntoGraficoPuntuacion[] = useMemo(() => {
    const data = examenesFiltrados;
    if (data.length === 0) return [];

    if (vistaPuntuaciones === 'tests') {
      // Examen a examen cronológico con indicación explícita del día de la semana y fecha
      return data.map((ex, i) => {
        // En PD se utiliza la puntuación convertida a la escala oficial (70 Q para tests / 20 Q para supuestos)
        const val = metricaPuntuacion === 'pd' ? ex.pdConvertida : ex.pt;
        const corteEsp = ex.tipo === 'supuesto' ? corteSupuesto : corteTest;
        const supera = val >= corteEsp;
        return {
          id: ex.id,
          etiqueta: `${ex.etiquetaDiaCompleta} · ${ex.tipo === 'supuesto' ? 'Sup' : 'Test'} #${i + 1}`,
          titulo: ex.titulo,
          fecha: `${ex.diaSemanaNombre} ${ex.fechaTexto}`,
          tipo: ex.tipo,
          puntuacion: parseFloat(val.toFixed(2)),
          puntuacionTest: ex.tipo === 'unitario' ? parseFloat(val.toFixed(2)) : null,
          puntuacionSupuesto: ex.tipo === 'supuesto' ? parseFloat(val.toFixed(2)) : null,
          corteAplicable: corteEsp,
          pd: ex.pdConvertida,
          pdOriginal: ex.pdReal,
          totalPreguntasOriginal: ex.totalPreguntasExamen,
          baseOficial: ex.baseOficial,
          esEscalada: ex.esEscalada,
          pt: ex.pt,
          superaCorte: supera,
          superaTest: ex.tipo === 'unitario' ? supera : undefined,
          superaSupuesto: ex.tipo === 'supuesto' ? supera : undefined,
          aciertos: ex.aciertos,
          fallos: ex.fallos,
          blancos: ex.blancos,
          penalizacion: ex.penalizacion,
          examenRef: ex.examenRef,
        };
      });
    }

    if (vistaPuntuaciones === 'hoy') {
      const testsHoy = data.filter((ex) => ex.claveDia === formatearClaveDia(ahora));
      return testsHoy.map((ex, i) => {
        const val = metricaPuntuacion === 'pd' ? ex.pdConvertida : ex.pt;
        const corteEsp = ex.tipo === 'supuesto' ? corteSupuesto : corteTest;
        const supera = val >= corteEsp;
        return {
          id: ex.id,
          etiqueta: `Hoy #${i + 1} (${ex.tipo === 'supuesto' ? 'Sup' : 'Test'})`,
          titulo: ex.titulo,
          fecha: ex.fechaTexto,
          tipo: ex.tipo,
          puntuacion: parseFloat(val.toFixed(2)),
          puntuacionTest: ex.tipo === 'unitario' ? parseFloat(val.toFixed(2)) : null,
          puntuacionSupuesto: ex.tipo === 'supuesto' ? parseFloat(val.toFixed(2)) : null,
          corteAplicable: corteEsp,
          pd: ex.pdConvertida,
          pdOriginal: ex.pdReal,
          totalPreguntasOriginal: ex.totalPreguntasExamen,
          baseOficial: ex.baseOficial,
          esEscalada: ex.esEscalada,
          pt: ex.pt,
          superaCorte: supera,
          superaTest: ex.tipo === 'unitario' ? supera : undefined,
          superaSupuesto: ex.tipo === 'supuesto' ? supera : undefined,
          aciertos: ex.aciertos,
          fallos: ex.fallos,
          blancos: ex.blancos,
          penalizacion: ex.penalizacion,
          examenRef: ex.examenRef,
        };
      });
    }

    if (vistaPuntuaciones === 'semanal') {
      const examenesSemana = examenesFiltrados.filter((ex) =>
        diasSemanaActiva.some((d) => d.clave === ex.claveDia)
      );

      if (modoDetallePuntuaciones === 'individual') {
        if (examenesSemana.length === 0) return [];
        return examenesSemana.map((ex, i) => {
          const val = metricaPuntuacion === 'pd' ? ex.pdConvertida : ex.pt;
          const corteEsp = ex.tipo === 'supuesto' ? corteSupuesto : corteTest;
          const supera = val >= corteEsp;
          return {
            id: ex.id,
            etiqueta: `${ex.etiquetaDiaCompleta} · ${ex.tipo === 'supuesto' ? 'Sup' : 'Test'} #${i + 1}`,
            titulo: ex.titulo,
            fecha: `${ex.diaSemanaNombre} ${ex.fechaTexto}`,
            tipo: ex.tipo,
            puntuacion: parseFloat(val.toFixed(2)),
            puntuacionTest: ex.tipo === 'unitario' ? parseFloat(val.toFixed(2)) : null,
            puntuacionSupuesto: ex.tipo === 'supuesto' ? parseFloat(val.toFixed(2)) : null,
            corteAplicable: corteEsp,
            pd: ex.pdConvertida,
            pdOriginal: ex.pdReal,
            totalPreguntasOriginal: ex.totalPreguntasExamen,
            baseOficial: ex.baseOficial,
            esEscalada: ex.esEscalada,
            pt: ex.pt,
            superaCorte: supera,
            superaTest: ex.tipo === 'unitario' ? supera : undefined,
            superaSupuesto: ex.tipo === 'supuesto' ? supera : undefined,
            aciertos: ex.aciertos,
            fallos: ex.fallos,
            blancos: ex.blancos,
            penalizacion: ex.penalizacion,
            examenRef: ex.examenRef,
          };
        });
      }

      // modoDetallePuntuaciones === 'cumulado': Promedio por cada día de la semana activa usando notas estandarizadas
      return diasSemanaActiva.map((dia) => {
        const examenesDia = examenesFiltrados.filter((ex) => ex.claveDia === dia.clave);
        const testsDia = examenesDia.filter((e) => e.tipo === 'unitario');
        const supuestosDia = examenesDia.filter((e) => e.tipo === 'supuesto');

        const valsTest = testsDia.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
        const valsSup = supuestosDia.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));

        const mediaTest = valsTest.length > 0 ? parseFloat((valsTest.reduce((a, b) => a + b, 0) / valsTest.length).toFixed(2)) : null;
        const mediaSup = valsSup.length > 0 ? parseFloat((valsSup.reduce((a, b) => a + b, 0) / valsSup.length).toFixed(2)) : null;

        const tieneExamenes = examenesDia.length > 0;
        const todosVals = examenesDia.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
        const mediaGeneral = todosVals.length > 0 ? parseFloat((todosVals.reduce((a, b) => a + b, 0) / todosVals.length).toFixed(2)) : 0;

        return {
          id: `dia-${dia.clave}`,
          etiqueta: dia.etiqueta,
          short: dia.short,
          titulo: `${dia.nombre} (${dia.etiquetaCompleta})`,
          fecha: `${examenesDia.length} examen${examenesDia.length === 1 ? '' : 'es'} (${testsDia.length} tests, ${supuestosDia.length} supuestos)`,
          tipo: 'unitario' as TipoPrueba,
          puntuacion: mediaGeneral,
          puntuacionTest: mediaTest,
          puntuacionSupuesto: mediaSup,
          corteAplicable: corteTest,
          pd: mediaGeneral,
          pt: mediaGeneral,
          superaCorte: (mediaTest !== null && mediaTest >= corteTest) || (mediaSup !== null && mediaSup >= corteSupuesto),
          superaTest: mediaTest !== null ? mediaTest >= corteTest : false,
          superaSupuesto: mediaSup !== null ? mediaSup >= corteSupuesto : false,
          aciertos: 0,
          fallos: 0,
          blancos: 0,
          penalizacion: 0,
          conExamenes: tieneExamenes,
          examenRef: undefined,
        };
      });
    }

    // vistaPuntuaciones === 'mensual': Promedio por mes del histórico con notas estandarizadas
    return datosVolumenMensual.datos.map((m) => {
      const examenesMes = data.filter((ex) => ex.claveMes === m.clave);
      const testsMes = examenesMes.filter((e) => e.tipo === 'unitario');
      const supuestosMes = examenesMes.filter((e) => e.tipo === 'supuesto');

      const valsTest = testsMes.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
      const valsSup = supuestosMes.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));

      const mediaTest = valsTest.length > 0 ? parseFloat((valsTest.reduce((a, b) => a + b, 0) / valsTest.length).toFixed(2)) : null;
      const mediaSup = valsSup.length > 0 ? parseFloat((valsSup.reduce((a, b) => a + b, 0) / valsSup.length).toFixed(2)) : null;

      const todosVals = examenesMes.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
      const mediaGeneral = todosVals.length > 0 ? parseFloat((todosVals.reduce((a, b) => a + b, 0) / todosVals.length).toFixed(2)) : 0;

      return {
        id: `mes-${m.clave}`,
        etiqueta: m.etiqueta,
        titulo: `Promedio ${m.nombreCompleto}`,
        fecha: `${examenesMes.length} exámenes (${testsMes.length} tests, ${supuestosMes.length} supuestos)`,
        tipo: 'unitario' as TipoPrueba,
        puntuacion: mediaGeneral,
        puntuacionTest: mediaTest,
        puntuacionSupuesto: mediaSup,
        corteAplicable: corteTest,
        pd: mediaGeneral,
        pt: mediaGeneral,
        superaCorte: (mediaTest !== null && mediaTest >= corteTest) || (mediaSup !== null && mediaSup >= corteSupuesto),
        superaTest: mediaTest !== null ? mediaTest >= corteTest : false,
        superaSupuesto: mediaSup !== null ? mediaSup >= corteSupuesto : false,
        aciertos: 0,
        fallos: 0,
        blancos: 0,
        penalizacion: 0,
        conExamenes: examenesMes.length > 0,
        examenRef: undefined,
      };
    });
  }, [
    examenesFiltrados,
    vistaPuntuaciones,
    modoDetallePuntuaciones,
    diasSemanaActiva,
    datosVolumenMensual,
    metricaPuntuacion,
    corteTest,
    corteSupuesto,
    ahora,
  ]);

  // Estadísticas del Gráfico 2 frente a la convocatoria seleccionada con detalle dual Test y Supuesto
  const estadisticasComparativaCorte = useMemo(() => {
    if (examenesFiltrados.length === 0) {
      return {
        total: 0,
        aptos: 0,
        tasaAptos: 0,
        media: 0,
        max: 0,
        deltaCorte: 0,
        totalTests: 0,
        aptosTests: 0,
        tasaAptosTests: 0,
        mediaTests: 0,
        maxTests: 0,
        deltaTests: 0,
        totalSupuestos: 0,
        aptosSupuestos: 0,
        tasaAptosSupuestos: 0,
        mediaSupuestos: 0,
        maxSupuestos: 0,
        deltaSupuestos: 0,
      };
    }
    const tests = examenesFiltrados.filter((e) => e.tipo === 'unitario');
    const supuestos = examenesFiltrados.filter((e) => e.tipo === 'supuesto');

    // Métrica comparativa estandarizada (PD convertida a 70 Q / 20 Q o PT)
    const valoresTest = tests.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
    const aptosTest = valoresTest.filter((v) => v >= corteTest).length;
    const mediaTest = valoresTest.length > 0 ? parseFloat((valoresTest.reduce((a, b) => a + b, 0) / valoresTest.length).toFixed(2)) : 0;
    const maxTest = valoresTest.length > 0 ? parseFloat(Math.max(...valoresTest).toFixed(2)) : 0;
    const deltaTest = valoresTest.length > 0 ? parseFloat((mediaTest - corteTest).toFixed(2)) : 0;
    const tasaAptosTests = valoresTest.length > 0 ? Math.round((aptosTest / valoresTest.length) * 100) : 0;

    const valoresSup = supuestos.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
    const aptosSup = valoresSup.filter((v) => v >= corteSupuesto).length;
    const mediaSup = valoresSup.length > 0 ? parseFloat((valoresSup.reduce((a, b) => a + b, 0) / valoresSup.length).toFixed(2)) : 0;
    const maxSup = valoresSup.length > 0 ? parseFloat(Math.max(...valoresSup).toFixed(2)) : 0;
    const deltaSup = valoresSup.length > 0 ? parseFloat((mediaSup - corteSupuesto).toFixed(2)) : 0;
    const tasaAptosSup = valoresSup.length > 0 ? Math.round((aptosSup / valoresSup.length) * 100) : 0;

    const totalAptos = aptosTest + aptosSup;
    const tasaAptos = Math.round((totalAptos / examenesFiltrados.length) * 100);
    const todosValores = examenesFiltrados.map((e) => (metricaPuntuacion === 'pd' ? e.pdConvertida : e.pt));
    const mediaGlobal = parseFloat((todosValores.reduce((a, b) => a + b, 0) / todosValores.length).toFixed(2));
    const maxGlobal = parseFloat(Math.max(...todosValores).toFixed(2));

    return {
      total: examenesFiltrados.length,
      aptos: totalAptos,
      tasaAptos,
      media: mediaGlobal,
      max: maxGlobal,
      deltaCorte: parseFloat((mediaGlobal - corteTest).toFixed(2)),
      totalTests: tests.length,
      aptosTests: aptosTest,
      tasaAptosTests,
      mediaTests: mediaTest,
      maxTests: maxTest,
      deltaTests: deltaTest,
      totalSupuestos: supuestos.length,
      aptosSupuestos: aptosSup,
      tasaAptosSupuestos: tasaAptosSup,
      mediaSupuestos: mediaSup,
      maxSupuestos: maxSup,
      deltaSupuestos: deltaSup,
    };
  }, [examenesFiltrados, metricaPuntuacion, corteTest, corteSupuesto]);

  // Tooltip personalizado para Gráfico 1 (Volumen)
  const CustomTooltipVolumen = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const tests = payload.find((p: any) => p.dataKey === 'tests')?.value || 0;
      const supuestos = payload.find((p: any) => p.dataKey === 'supuestos')?.value || 0;
      const total = tests + supuestos;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs font-mono space-y-1">
          <div className="font-bold text-slate-300 pb-1 border-b border-slate-700">
            {dataItem.titulo || label}
          </div>
          {dataItem.fechaTexto && (
            <div className="text-[10px] text-slate-400">
              Fecha: {dataItem.fechaTexto}
            </div>
          )}
          <div className="flex justify-between gap-4 text-indigo-300">
            <span>Tests Unitarios:</span>
            <span className="font-bold">{tests}</span>
          </div>
          <div className="flex justify-between gap-4 text-amber-300">
            <span>Supuestos Prácticos:</span>
            <span className="font-bold">{supuestos}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 font-bold text-white">
            <span>Total Realizados:</span>
            <span className="text-emerald-400">{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip personalizado para Gráfico 2 (Puntuaciones vs Cortes)
  const CustomTooltipPuntuacion = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const esIndividual = data.examenRef !== undefined;
      const esSupuesto = data.tipo === 'supuesto';
      const corte = data.corteAplicable || (esSupuesto ? corteSupuesto : corteTest);
      const val = data.puntuacion;
      const baseOficial = data.baseOficial || (esSupuesto ? 20 : 70);
      const esEscalada = data.esEscalada;

      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs font-mono space-y-2 max-w-sm">
          <div className="font-bold text-slate-200 line-clamp-1 pb-1 border-b border-slate-700 flex items-center justify-between gap-2">
            <span className="truncate">{data.titulo || data.etiqueta}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal shrink-0">
              {esSupuesto ? 'Supuesto' : 'Test'}
            </span>
          </div>
          {data.fecha && (
            <div className="text-[10px] text-slate-400">
              {data.fecha}
            </div>
          )}

          {/* Tarjeta de puntuación estandarizada vs corte */}
          <div className="bg-slate-850 p-2.5 rounded-lg border border-slate-750 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold text-[11px]">
                {metricaPuntuacion === 'pd'
                  ? `PD Estandarizada (${baseOficial} Q):`
                  : 'Puntuación (PT):'}
              </span>
              <span className="font-bold text-sm text-emerald-400">
                {val} {metricaPuntuacion.toUpperCase()}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    val >= corte
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {val >= corte ? 'Apto' : 'No apto'}
                </span>
              </span>
            </div>

            {/* Si el test original tenía diferente número de preguntas (ej. 20 Q en vez de 70 Q) */}
            {esIndividual && esEscalada && metricaPuntuacion === 'pd' && (
              <div className="pt-1.5 border-t border-slate-700/60 space-y-1">
                <div className="flex justify-between items-center text-[10.5px] text-indigo-300">
                  <span>Nota original del test:</span>
                  <span className="font-bold">
                    {data.pdOriginal !== undefined ? data.pdOriginal : data.pd} PD ({data.totalPreguntasOriginal} preguntas)
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 bg-slate-900/60 px-1.5 py-1 rounded border border-slate-800">
                  ⚖️ Conversión oficial: ({data.pdOriginal} ÷ {data.totalPreguntasOriginal}) × {baseOficial} = {val} PD
                </div>
              </div>
            )}
          </div>

          {/* Desglose de respuestas en tests individuales */}
          {esIndividual && data.aciertos !== undefined && (
            <div className="grid grid-cols-3 gap-1 text-[10px] text-center bg-slate-800/60 p-1.5 rounded">
              <div className="text-emerald-400 font-bold">✓ {data.aciertos} aciertos</div>
              <div className="text-rose-400 font-bold">✗ {data.fallos} fallos</div>
              <div className="text-slate-400">⚪ {data.blancos} blancos</div>
            </div>
          )}

          {/* Datos de corte oficial */}
          <div className="pt-1.5 border-t border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between text-indigo-300">
              <span>Corte {esSupuesto ? 'Supuesto' : 'Test'} {convocatoriaActiva.anoOEP}:</span>
              <span className="font-bold">{corte} {metricaPuntuacion.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10.5px]">
              <span>Diferencia con corte:</span>
              <span className={`font-bold ${val >= corte ? 'text-emerald-400' : 'text-rose-400'}`}>
                {val >= corte ? `+${(val - corte).toFixed(2)}` : (val - corte).toFixed(2)} {metricaPuntuacion.toUpperCase()}
              </span>
            </div>
          </div>

          {data.examenRef && onCargarExamen && (
            <button
              type="button"
              onClick={() => onCargarExamen(data.examenRef)}
              className="w-full mt-2 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors shadow-2xs"
            >
              Ver examen
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* CABECERA PRINCIPAL DE LA SECCIÓN ANALÍTICA */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9.5px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-md font-mono flex items-center gap-1.5 shadow-2xs">
                <i className="fa-solid fa-chart-column text-[11px]"></i>
                Módulo Académico Recharts
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                Convocatorias C1 (AGE · Comunidad de Madrid)
              </span>
              <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Actualizado a Hoy ({hoyFechaCompleta})</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Panel de Analítica y Rendimiento C1
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Supervisión de volumen de estudio diario, semanal y mensual, y auditoría comparativa de puntuaciones frente a las notas de corte de la CPS y Comunidad de Madrid.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            {onIrAGenerador && (
              <button
                type="button"
                onClick={onIrAGenerador}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-play text-white"></i>
                <span>Realizar Nuevo Test</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 TARJETAS EJECUTIVAS DE KPIS ACADÉMICOS (INTACTAS SEGÚN REQUERIMIENTO) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/80">
          <div className="bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
              Nota Media (PT)
            </span>
            <div className="my-1">
              <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {kpis.mediaPT.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">/ 100</span>
            </div>
            <span
              className={`text-[9.5px] font-bold font-mono ${
                kpis.mediaPT >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}
            >
              {kpis.mediaPT >= 50 ? '✓ Supera corte medio' : '✗ Bajo corte medio'}
            </span>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
              Tasa Aprobados
            </span>
            <div className="my-1">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {kpis.tasaAprobados}%
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400">
              {kpis.aprobadosCount} de {kpis.totalPruebas} cortes superados
            </span>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
              Puntuación Directa
            </span>
            <div className="my-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {kpis.mediaPD.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">PD</span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-400">
              Aciertos − (Fallos / 3)
            </span>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
              Coste Penalizaciones
            </span>
            <div className="my-1">
              <span className="text-2xl font-black font-mono text-rose-500">
                -{kpis.penalizacionMedia.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">pts</span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-400">
              Puntos restados por fallos
            </span>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
              Tendencia Reciente
            </span>
            <div className="my-1">
              <span
                className={`text-2xl font-black font-mono flex items-center gap-1 ${
                  kpis.tendenciaDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                <i className={`fa-solid text-sm ${kpis.tendenciaDelta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                {kpis.tendenciaDelta >= 0 ? `+${kpis.tendenciaDelta}` : kpis.tendenciaDelta}
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-400">
              Delta últimas vs primeras
            </span>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
              Velocidad Media
            </span>
            <div className="my-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {kpis.segundosPorPregunta > 0 ? `${kpis.segundosPorPregunta}s` : '54s'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">/ preg</span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-400">
              Objetivo oficial: ≤ 65s
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS GLOBALES DE ÁMBITO Y TIPO */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase font-mono">
            Filtrar datos por:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'unitario', label: 'Tipo Test' },
              { id: 'supuesto', label: 'Supuestos' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFiltroTipo(t.id as any)}
                className={`py-1 px-2.5 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                  filtroTipo === t.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase font-mono">
            Ámbito:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setFiltroAmbito('todos')}
              className={`py-1 px-2 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                filtroAmbito === 'todos'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            {AMBITOS_INFO &&
              Object.entries(AMBITOS_INFO).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFiltroAmbito(key as ConvocatoriaAmbito)}
                  className={`py-1 px-2 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                    filtroAmbito === key
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {info.shortLabel}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1º GRÁFICO: NÚMERO DE TESTS REALIZADOS (DÍA ACTUAL, SEMANAL, MENSUAL) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono">
                Gráfico 1 de 2
              </span>
              <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-wider">
                Número de Tests Realizados
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Colocación exacta en cada día de la semana o mes con histórico continuo y selección de vista acumulada o examen a examen.
            </p>
          </div>

          {/* Selector de Vista: Día Actual | Semanal | Mensual Acumulada */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/70 p-1 rounded-xl border border-slate-200 dark:border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setVistaVolumen('hoy')}
              className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                vistaVolumen === 'hoy'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-clock text-[10px]"></i>
              <span>Día Actual (Hoy)</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaVolumen('semanal')}
              className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                vistaVolumen === 'semanal'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-calendar-week text-[10px]"></i>
              <span>Día a Día Semanal (Lun - Dom)</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaVolumen('mensual')}
              className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                vistaVolumen === 'mensual'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-calendar-days text-[10px]"></i>
              <span>Mensual Acumulado (Resumen del Mes)</span>
            </button>
          </div>
        </div>

        {/* Barra interactiva de control para Semanal: Navegación de Semanas + Modo Día a Día / Cada Test */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          {vistaVolumen === 'semanal' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOffsetSemana((prev) => prev - 1)}
                  className="py-1 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-lg transition-colors cursor-pointer text-xs font-bold"
                  title="Semana anterior"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <span className="py-1 px-3 text-xs font-bold font-mono text-slate-800 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">
                  {textoRangoSemana}
                </span>
                <button
                  type="button"
                  onClick={() => setOffsetSemana((prev) => prev + 1)}
                  className="py-1 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r-lg transition-colors cursor-pointer text-xs font-bold"
                  title="Semana siguiente"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>

              {offsetSemana !== 0 && (
                <button
                  type="button"
                  onClick={() => setOffsetSemana(0)}
                  className="py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Semana Actual
                </button>
              )}

              {semanasHistoricas.length > 0 && (
                <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                  <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">Historial:</span>
                  <select
                    value={offsetSemana}
                    onChange={(e) => setOffsetSemana(parseInt(e.target.value, 10))}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-[10.5px] font-mono font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                  >
                    <option value={0}>Semana actual (en curso)</option>
                    {semanasHistoricas.map((s) => (
                      <option key={s.offset} value={s.offset}>
                        {s.label} ({s.count} examen{s.count === 1 ? '' : 'es'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : vistaVolumen === 'mensual' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-calendar text-indigo-500 text-xs"></i>
                <span>Histórico mensual acumulado de evaluaciones (resumen del mes)</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-clock text-indigo-500 text-xs"></i>
                <span>Actividad registrada hoy ({hoyFechaCompleta})</span>
              </span>
            </div>
          )}

          {/* Toggle Día a Día vs Cada Test Individual */}
          <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setModoDetalleVolumen('cumulado')}
              className={`py-1 px-2.5 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                modoDetalleVolumen === 'cumulado'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {vistaVolumen === 'semanal'
                ? 'Día a Día (Lun-Dom)'
                : vistaVolumen === 'mensual'
                ? 'Mensual Acumulado'
                : 'Franjas de Hoy'}
            </button>
            <button
              type="button"
              onClick={() => setModoDetalleVolumen('individual')}
              className={`py-1 px-2.5 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                modoDetalleVolumen === 'individual'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cada Test Individual
            </button>
          </div>
        </div>

        {/* Resumen métrico según la vista seleccionada */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
          {vistaVolumen === 'hoy' ? (
            <>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Total Pruebas Hoy</span>
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {datosVolumenHoy.totalHoy}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Tipo Test Hoy</span>
                <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">
                  {datosVolumenHoy.testsHoy}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Supuestos Hoy</span>
                <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {datosVolumenHoy.supuestosHoy}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Estado de Hoy</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {datosVolumenHoy.totalHoy > 0 ? '✓ Jornada activa' : 'Pendiente de inicio'}
                </span>
              </div>
            </>
          ) : vistaVolumen === 'semanal' ? (
            <>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Total en Esta Semana</span>
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {datosVolumenSemanal.totalSemana}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Media Diaria</span>
                <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">
                  {datosVolumenSemanal.mediaDiaria} <span className="text-xs font-normal text-slate-400">/día</span>
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Días con Actividad</span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {diasSemanaActiva.filter((d) => examenesFiltrados.some((ex) => ex.claveDia === d.clave)).length} / 7
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Cálculo y Modo</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {modoDetalleVolumen === 'cumulado' ? 'Día a Día (Lun - Dom)' : 'Cada Test en su Día'}
                </span>
                <span className="text-[9.5px] text-slate-400 block font-mono">
                  Pruebas en cada día
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Total Acumulado</span>
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {datosVolumenMensual.totalMensual}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Meses Evaluados</span>
                <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">
                  {datosVolumenMensual.datos.filter((m) => m.total > 0).length} / {datosVolumenMensual.datos.length}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Mes Más Intenso</span>
                <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {datosVolumenMensual.datos.reduce((max, m) => (m.total > max.total ? m : max), { total: 0, etiqueta: '-' }).etiqueta}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Periodo Histórico</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Últimos 12 meses
                </span>
              </div>
            </>
          )}
        </div>

        {/* Gráfico Recharts de Barras */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGrafico1} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="etiqueta" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltipVolumen />} />
              <Legend />
              <Bar dataKey="tests" name="Tipo Test" fill="#6366f1" radius={[4, 4, 0, 0]} stackId="vol" />
              <Bar dataKey="supuestos" name="Supuestos Prácticos" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="vol" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2º GRÁFICO: PUNTUACIONES DE LOS TESTS VS NOTAS DE CORTE DE CONVOCATORIA   */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded font-mono">
                Gráfico 2 de 2
              </span>
              <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-wider">
                Puntuaciones Obtenidas vs Notas de Corte
              </h3>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 shadow-2xs">
                <i className="fa-solid fa-scale-balanced text-[10px]"></i>
                Escala oficial convertida (Base 70 Q)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tus notas se convierten proporcionalmente al modelo oficial (Test sobre 70 preguntas · Supuesto sobre 20 preguntas) para permitir una comparación homogénea con las notas de corte de la CPS (AGE 2025, 2024, CAM) o tu umbral personalizado.
            </p>
          </div>

          {/* Agrupación temporal: Examen a Examen | Día Actual | Semanal | Mensual */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/70 p-1 rounded-xl border border-slate-200 dark:border-slate-600 text-xs flex-wrap">
            {[
              { id: 'tests', label: 'Por Examen' },
              { id: 'hoy', label: 'Día Actual' },
              { id: 'semanal', label: 'Día a Día Semanal (Lun - Dom)' },
              { id: 'mensual', label: 'Mensual Acumulado' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setVistaPuntuaciones(p.id as any)}
                className={`py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  vistaPuntuaciones === p.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-barra de controles de semana y modo para la vista Semanal en Gráfico 2 */}
        {vistaPuntuaciones === 'semanal' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOffsetSemana((prev) => prev - 1)}
                  className="py-1 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-lg transition-colors cursor-pointer text-xs font-bold"
                  title="Semana anterior"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <span className="py-1 px-3 text-xs font-bold font-mono text-slate-800 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">
                  {textoRangoSemana}
                </span>
                <button
                  type="button"
                  onClick={() => setOffsetSemana((prev) => prev + 1)}
                  className="py-1 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r-lg transition-colors cursor-pointer text-xs font-bold"
                  title="Semana siguiente"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>

              {offsetSemana !== 0 && (
                <button
                  type="button"
                  onClick={() => setOffsetSemana(0)}
                  className="py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Semana Actual
                </button>
              )}
            </div>

            {/* Toggle Día a Día (Media diaria) vs Cada Test individual */}
            <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setModoDetallePuntuaciones('cumulado')}
                className={`py-1 px-2.5 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                  modoDetallePuntuaciones === 'cumulado'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Día a Día (Media diaria)
              </button>
              <button
                type="button"
                onClick={() => setModoDetallePuntuaciones('individual')}
                className={`py-1 px-2.5 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                  modoDetallePuntuaciones === 'individual'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cada Test Individual
              </button>
            </div>
          </div>
        )}

        {/* Barra de Configuración de Comparación: Selector de Convocatoria + Métrica PD/PT */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          {/* Selector de Convocatoria */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
              Convocatoria de Referencia:
            </span>
            <div className="relative flex-1 max-w-md">
              <select
                value={convocatoriaSeleccionada}
                onChange={(e) => setConvocatoriaSeleccionada(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                {HISTORICO_CORTES_C1.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Corte: {c.corteTestPD} PD Test / {c.corteSupuestoPD} PD Supuesto)
                  </option>
                ))}
                <option value="personalizada">
                  🎯 Mi Nota de Corte Personalizada ({cortePropioTestPD} PD Test / {cortePropioSupuestoPD} PD Supuesto)
                </option>
              </select>
            </div>
          </div>

          {/* Selector de Métrica: PD (Puntuación Directa) vs PT (Puntuación Transformada) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
              Métrica:
            </span>
            <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setMetricaPuntuacion('pd')}
                className={`py-1 px-3 rounded-md font-black text-[10.5px] transition-all cursor-pointer ${
                  metricaPuntuacion === 'pd'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Puntuación Directa Oficial: Aciertos - (Fallos / 3)"
              >
                Puntuación Directa (PD)
              </button>
              <button
                type="button"
                onClick={() => setMetricaPuntuacion('pt')}
                className={`py-1 px-3 rounded-md font-black text-[10.5px] transition-all cursor-pointer ${
                  metricaPuntuacion === 'pt'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Puntuación Transformada: Escala oficial CPS 0-100 / 0-50"
              >
                Punt. Transformada (PT)
              </button>
            </div>
          </div>
        </div>

        {/* Banner explicativo de equivalencia oficial CPS 70 preguntas */}
        <div className="flex items-start sm:items-center gap-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/60 rounded-xl p-2.5 text-xs text-indigo-950 dark:text-indigo-200">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] shrink-0 shadow-2xs mt-0.5 sm:mt-0">
            <i className="fa-solid fa-calculator"></i>
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-indigo-900 dark:text-indigo-100">
              Conversión oficial automática activada:
            </span>{' '}
            Todos los tests de longitud reducida o variable se adaptan proporcionalmente al modelo oficial de <strong>70 preguntas</strong> (ej.: 10 PD en un test de 20 preguntas equivale exactamente a <strong>35,00 PD</strong>) y los supuestos al modelo de <strong>20 preguntas</strong>, garantizando una comparación 100% equiparable con la nota de corte oficial.
          </div>
        </div>

        {/* Tarjetas de Estadísticas de la Comparativa Activa (Cortes de Test y Supuesto) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50/70 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <div>
            <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold">Cortes {convocatoriaActiva.anoOEP}</span>
            <div className="flex flex-col gap-0.5 mt-0.5 font-mono">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                Test: {corteTest} <span className="text-[9px] font-normal text-slate-400">{metricaPuntuacion.toUpperCase()}</span>
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                Supuesto: {corteSupuesto} <span className="text-[9px] font-normal text-slate-400">{metricaPuntuacion.toUpperCase()}</span>
              </span>
            </div>
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold">Tasa Superación</span>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {estadisticasComparativaCorte.tasaAptos}%
            </span>
            <div className="text-[9px] font-mono text-slate-400">
              <span>Test: {estadisticasComparativaCorte.aptosTests}/{estadisticasComparativaCorte.totalTests}</span>
              <span className="ml-1.5">Sup: {estadisticasComparativaCorte.aptosSupuestos}/{estadisticasComparativaCorte.totalSupuestos}</span>
            </div>
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold">Tu Nota Media</span>
            <div className="flex flex-col gap-0.5 mt-0.5 font-mono">
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                Test: {estadisticasComparativaCorte.mediaTests} <span className="text-[9px] font-normal text-slate-400">{metricaPuntuacion.toUpperCase()}</span>
              </span>
              <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                Sup: {estadisticasComparativaCorte.mediaSupuestos} <span className="text-[9px] font-normal text-slate-400">{metricaPuntuacion.toUpperCase()}</span>
              </span>
            </div>
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold">Diferencia Corte</span>
            <div className="flex flex-col gap-0.5 mt-0.5 font-mono">
              <span
                className={`text-xs font-black ${
                  estadisticasComparativaCorte.deltaTests >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                Test: {estadisticasComparativaCorte.deltaTests >= 0 ? `+${estadisticasComparativaCorte.deltaTests}` : estadisticasComparativaCorte.deltaTests}
              </span>
              <span
                className={`text-xs font-black ${
                  estadisticasComparativaCorte.deltaSupuestos >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                Sup: {estadisticasComparativaCorte.deltaSupuestos >= 0 ? `+${estadisticasComparativaCorte.deltaSupuestos}` : estadisticasComparativaCorte.deltaSupuestos}
              </span>
            </div>
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold">Puntuación Máx.</span>
            <div className="flex flex-col gap-0.5 mt-0.5 font-mono">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                Test: {estadisticasComparativaCorte.maxTests} <span className="text-[9px] font-normal text-slate-400">{metricaPuntuacion.toUpperCase()}</span>
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                Sup: {estadisticasComparativaCorte.maxSupuestos} <span className="text-[9px] font-normal text-slate-400">{metricaPuntuacion.toUpperCase()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico Recharts de Puntuaciones vs Corte */}
        <div className="w-full h-80 sm:h-96">
          {datosPuntuacionesGrafico2.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-2xs">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Sin puntuaciones registradas para el periodo seleccionado
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  {vistaPuntuaciones === 'semanal'
                    ? 'No se realizaron exámenes en esta semana específica. Usa los botones de navegación [◀] para ver semanas anteriores con exámenes.'
                    : `Completa cualquier test o supuesto práctico para contrastar tu resultado con la nota de corte de ${convocatoriaActiva.nombre}.`}
                </p>
              </div>
              {vistaPuntuaciones === 'semanal' && semanasHistoricas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOffsetSemana(semanasHistoricas[0].offset)}
                  className="py-1.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Ir a la semana con más exámenes ({semanasHistoricas[0].label})
                </button>
              )}
              {onIrAGenerador && (
                <button
                  type="button"
                  onClick={onIrAGenerador}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-play text-[10px]"></i>
                  <span>Realizar un Examen Ahora</span>
                </button>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosPuntuacionesGrafico2} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="etiqueta" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  unit={` ${metricaPuntuacion.toUpperCase()}`}
                  domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.15), Math.ceil(Math.max(corteTest, corteSupuesto) * 1.2))]}
                />
                <Tooltip content={<CustomTooltipPuntuacion />} />
                <Legend />

                {/* 1. Línea horizontal de corte oficial para Tests (Azul / Indigo) */}
                <ReferenceLine
                  y={corteTest}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Corte Test ${convocatoriaActiva.anoOEP}: ${corteTest} ${metricaPuntuacion.toUpperCase()}`,
                    position: 'insideTopRight',
                    fill: '#4f46e5',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* 2. Línea horizontal de corte oficial para Supuestos (Ámbar / Naranja) */}
                <ReferenceLine
                  y={corteSupuesto}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Corte Supuesto ${convocatoriaActiva.anoOEP}: ${corteSupuesto} ${metricaPuntuacion.toUpperCase()}`,
                    position: 'insideTopLeft',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* Renderizado de barras: examen individual vs media diaria de test y supuesto */}
                {vistaPuntuaciones === 'tests' || vistaPuntuaciones === 'hoy' || (vistaPuntuaciones === 'semanal' && modoDetallePuntuaciones === 'individual') ? (
                  <Bar dataKey="puntuacion" name="Puntuación Obtenida" radius={[6, 6, 0, 0]}>
                    {datosPuntuacionesGrafico2.map((entry, index) => (
                      <Cell
                        key={`cell-pt-${index}`}
                        fill={entry.superaCorte ? '#10b981' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                ) : (
                  <>
                    <Bar dataKey="puntuacionTest" name="Media Tests" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {datosPuntuacionesGrafico2.map((entry, index) => (
                        <Cell
                          key={`cell-test-${index}`}
                          fill={
                            entry.puntuacionTest !== null && entry.puntuacionTest !== undefined
                              ? (entry.puntuacionTest >= corteTest ? '#10b981' : '#6366f1')
                              : 'transparent'
                          }
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="puntuacionSupuesto" name="Media Supuestos" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                      {datosPuntuacionesGrafico2.map((entry, index) => (
                        <Cell
                          key={`cell-sup-${index}`}
                          fill={
                            entry.puntuacionSupuesto !== null && entry.puntuacionSupuesto !== undefined
                              ? (entry.puntuacionSupuesto >= corteSupuesto ? '#059669' : '#f59e0b')
                              : 'transparent'
                          }
                        />
                      ))}
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN INFERIOR (INTACTA SEGÚN REQUERIMIENTO): CORTE PROPIO Y TABLA CPS  */}
      {/* ========================================================================= */}

      {/* PANEL INTERACTIVO: PROPONER MI PROPIA NOTA DE CORTE (PERSONALIZADA) */}
      <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
              <i className="fa-solid fa-crosshairs"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <span>Proponer Mi Propia Nota de Corte (Simulación Personalizada)</span>
                <span className="text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300">
                  Objetivo Propio
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fija tus propios umbrales de exigencia académica para test y supuesto. Puedes proyectarlos como línea objetivo en los gráficos y medir tu tasa de superación.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 shadow-2xs shrink-0">
            <input
              type="checkbox"
              checked={usarCortePropio}
              onChange={(e) => handleGuardarCortePropio(cortePropioTestPD, cortePropioSupuestoPD, e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer h-4 w-4"
            />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              Activar en gráficos y simulación
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
          {/* Input Test PD */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                1ª Parte: Test (sobre 70 PD)
              </label>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {((cortePropioTestPD / 70) * 100).toFixed(1)} PT
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="70"
                value={cortePropioTestPD}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleGuardarCortePropio(val, cortePropioSupuestoPD, usarCortePropio);
                }}
                className="w-full pl-3 pr-8 py-1.5 text-sm font-black font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                PD
              </span>
            </div>
          </div>

          {/* Input Supuesto PD */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                2ª Parte: Supuesto (sobre 20 PD)
              </label>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {((cortePropioSupuestoPD / 20) * 50).toFixed(1)} PT
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                value={cortePropioSupuestoPD}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleGuardarCortePropio(cortePropioTestPD, val, usarCortePropio);
                }}
                className="w-full pl-3 pr-8 py-1.5 text-sm font-black font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                PD
              </span>
            </div>
          </div>

          {/* Total acumulado y equivalencia */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
              Suma Directa Acumulada
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {(cortePropioTestPD + cortePropioSupuestoPD).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">PD totales</span>
            </div>
            <span className="text-[9.5px] text-slate-500 block">
              Línea objetivo en gráficos: {cortePropioPTCalculado.toFixed(1)} PT
            </span>
          </div>

          {/* Presets rápidos */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
              Baremos Rápidos
            </span>
            <div className="grid grid-cols-2 gap-1 text-[9px] font-mono font-bold">
              <button
                type="button"
                onClick={() => handleGuardarCortePropio(31.67, 12.67, true)}
                className="py-1 px-1.5 rounded bg-slate-100 hover:bg-amber-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-center transition-colors cursor-pointer"
                title="Convocatoria 2025: Test 31,67 | Supuesto 12,67"
              >
                OEP 2025 (31.67/12.67)
              </button>
              <button
                type="button"
                onClick={() => handleGuardarCortePropio(33.33, 14.0, true)}
                className="py-1 px-1.5 rounded bg-slate-100 hover:bg-amber-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-center transition-colors cursor-pointer"
                title="Convocatoria 2024: Test 33,33 | Supuesto 14,00"
              >
                OEP 2024 (33.33/14.00)
              </button>
              <button
                type="button"
                onClick={() => handleGuardarCortePropio(31.33, 14.33, true)}
                className="py-1 px-1.5 rounded bg-slate-100 hover:bg-amber-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-center transition-colors cursor-pointer"
                title="Convocatoria 2023: Test 31,33 | Supuesto 14,33"
              >
                OEP 2023 (31.33/14.33)
              </button>
              <button
                type="button"
                onClick={() => handleGuardarCortePropio(38.0, 15.5, true)}
                className="py-1 px-1.5 rounded bg-amber-50 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-center transition-colors cursor-pointer"
                title="Exigente: Test 38,00 | Supuesto 15,50"
              >
                Exigente (38.0/15.5)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA COMPARATIVA FRENTE A CORTES OFICIALES HISTÓRICOS */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-scale-balanced text-indigo-600"></i>
              <span>Simulador de Posición en Convocatorias Históricas Oficiales C1</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparativa frente a las notas reales de corte de la Comisión Permanente de Selección (CPS / INAP) y de la Comunidad de Madrid.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
              Tu Media Actual: {kpis.mediaPT.toFixed(1)} PT ({kpis.mediaPD.toFixed(2)} PD)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Convocatoria Oficial</th>
                <th className="py-2.5 px-3">Ámbito</th>
                <th className="py-2.5 px-3 text-center">Plazas</th>
                <th className="py-2.5 px-3 text-center">Corte Test PD (sobre 70)</th>
                <th className="py-2.5 px-3 text-center">Corte Supuesto PD (sobre 20)</th>
                <th className="py-2.5 px-3 text-center">Diagnóstico con tu media</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {usarCortePropio && (
                <tr className="bg-amber-50/80 dark:bg-amber-950/40 border-b-2 border-amber-300 dark:border-amber-700">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-crosshairs text-amber-600 text-xs"></i>
                      <span className="font-black text-amber-950 dark:text-amber-200 block">
                        Mi Nota de Corte Propia (Personalizada)
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                      Umbral personalizado definido por el opositor para su plan de estudio.
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="text-[9.5px] font-black uppercase font-mono px-2 py-0.5 rounded border bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900 dark:text-amber-200">
                      Personalizado
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-300">
                    Objetivo
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-amber-950 dark:text-amber-200">
                    {cortePropioTestPD.toFixed(2)} PD
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-amber-950 dark:text-amber-200">
                    {cortePropioSupuestoPD.toFixed(2)} PD
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {kpis.totalPruebas > 0 ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase font-mono border ${
                          kpis.mediaPD >= cortePropioTestPD || kpis.mediaPT >= cortePropioPTCalculado
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            kpis.mediaPD >= cortePropioTestPD || kpis.mediaPT >= cortePropioPTCalculado
                              ? 'fa-circle-check'
                              : 'fa-circle-xmark'
                          } text-[10px]`}
                        ></i>
                        {kpis.mediaPD >= cortePropioTestPD || kpis.mediaPT >= cortePropioPTCalculado
                          ? 'Superas tu Corte Objetivo'
                          : 'Por debajo de tu objetivo'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono italic">Sin evaluaciones</span>
                    )}
                  </td>
                </tr>
              )}

              {HISTORICO_CORTES_C1.map((conv) => {
                const superaTest = kpis.mediaPD >= conv.corteTestPD;
                const superaPT = kpis.mediaPT >= conv.corteTestPT;
                const esAptoProbable = superaTest || superaPT;

                return (
                  <tr key={conv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 dark:text-slate-100 block">
                        {conv.nombre}
                      </span>
                      <span className="text-[10px] text-slate-400">{conv.descripcion}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[9.5px] font-black uppercase font-mono px-2 py-0.5 rounded border ${
                          conv.ambito === 'CAM'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {conv.ambito === 'CAM' ? 'Madrid - C1' : 'AGE - subgrupo C1'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {conv.plazas.toLocaleString('es-ES')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {conv.corteTestPD.toFixed(2)} PD
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {conv.corteSupuestoPD.toFixed(2)} PD
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase font-mono border ${
                          esAptoProbable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <i className={`fa-solid ${esAptoProbable ? 'fa-circle-check' : 'fa-circle-xmark'} text-[10px]`}></i>
                        {esAptoProbable ? 'Supera Corte Oficial' : 'Por debajo del corte'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
