import React, { useState, useEffect, useMemo } from 'react';
import { ExamenCompleto, ItemAlmacenDuda, PreguntaExamen } from '../types';
import {
  CATEGORIAS_TEMARIO_PROGRESO,
  CategoriaTemarioId,
  esNormaGenerica,
  extraerPreguntasFalladasConsolidadas,
  formatearBadgeConvocatoriaOficial,
  obtenerInfoCategoriaTemario,
  obtenerNormaEfectivaDePregunta,
  obtenerReferenciaConvocatoriaOficial,
  PreguntaFalladaConsolidada,
  registrarRespuestasEnControlFalladas,
} from '../utils/tematicaClassifier';
import { obtenerUrlBOEParaNorma, renderizarTextoConEnlacesBOE } from '../utils/boeUrlHelper';
import { SelectorLeyesEInformaticaModal } from './SelectorLeyesEInformaticaModal';
import { ConfirmarEvaluacionModal } from './ConfirmarEvaluacionModal';
import { GestorRecursosArgumentacionPregunta } from './GestorRecursosArgumentacionPregunta';

interface SeccionTestPreguntasFalladasProps {
  historialPruebas: ExamenCompleto[];
  almacenDudas: ItemAlmacenDuda[];
  categoriaPreseleccionada?: CategoriaTemarioId | null;
  onLimpiarPreseleccion?: () => void;
  onExamenGuardado: (examen: ExamenCompleto) => void;
  onGuardarEnAlmacenDudas?: (item: ItemAlmacenDuda) => void;
  onIrAHistorial: () => void;
  onActualizarPreguntaGlobal?: (preguntaActualizada: PreguntaExamen) => void;
  onRegistrarResultadoPreguntas?: (
    preguntas: PreguntaExamen[],
    respuestas: Record<number, string>
  ) => void;
  onExportarExamenPDF?: (examen: ExamenCompleto) => void;
}

export const SeccionTestPreguntasFalladas: React.FC<SeccionTestPreguntasFalladasProps> = ({
  historialPruebas,
  almacenDudas,
  categoriaPreseleccionada,
  onLimpiarPreseleccion,
  onExamenGuardado,
  onGuardarEnAlmacenDudas,
  onIrAHistorial,
  onActualizarPreguntaGlobal,
  onRegistrarResultadoPreguntas,
  onExportarExamenPDF,
}) => {
  // Filtros de selección de preguntas falladas
  const [modoFiltroPrincipal, setModoFiltroPrincipal] = useState<'ambos' | 'tematica' | 'ley'>('ambos');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<CategoriaTemarioId[]>([]);
  const [leyesSeleccionadas, setLeyesSeleccionadas] = useState<string[]>([]);
  const [incluirYaSuperadas, setIncluirYaSuperadas] = useState<boolean>(false);
  const [versionSuperadas, setVersionSuperadas] = useState<number>(0);
  const [incluirBlancos, setIncluirBlancos] = useState<boolean>(false);
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  // Configuración del test de falladas
  const [cantidadPreguntas, setCantidadPreguntas] = useState<number | 'todas'>(15);
  const [ordenPreguntas, setOrdenPreguntas] = useState<'mas_falladas' | 'recientes' | 'aleatorio'>('mas_falladas');
  const [modalidadCorreccion, setModalidadCorreccion] = useState<'paso_a_paso' | 'final'>('paso_a_paso');
  const [relojActivado, setRelojActivado] = useState<boolean>(true);
  const [tituloPersonalizado, setTituloPersonalizado] = useState<string>('');

  // Estado de ejecución del test activo
  const [testActivo, setTestActivo] = useState<ExamenCompleto | null>(null);
  const [metadatosFallosTest, setMetadatosFallosTest] = useState<PreguntaFalladaConsolidada[]>([]);
  const [indicePreguntaActual, setIndicePreguntaActual] = useState<number>(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState<{ [idx: number]: string }>({});
  const [preguntasDudosas, setPreguntasDudosas] = useState<Set<number>>(new Set());
  const [segundosTranscurridos, setSegundosTranscurridos] = useState<number>(0);
  const [testFinalizado, setTestFinalizado] = useState<boolean>(false);
  const [mostrarConfirmarEvaluacion, setMostrarConfirmarEvaluacion] = useState<boolean>(false);
  const [preguntaModalJustificacion, setPreguntaModalJustificacion] = useState<number | null>(null);
  const [preguntaParaSelectorLeyes, setPreguntaParaSelectorLeyes] = useState<PreguntaExamen | null>(null);

  // Aplicar categoría preseleccionada si viene desde el widget de Progreso Temático Diario
  useEffect(() => {
    if (categoriaPreseleccionada) {
      setCategoriasSeleccionadas([categoriaPreseleccionada]);
      setLeyesSeleccionadas([]);
      if (onLimpiarPreseleccion) {
        onLimpiarPreseleccion();
      }
    }
  }, [categoriaPreseleccionada, onLimpiarPreseleccion]);

  // Reloj del test activo
  useEffect(() => {
    if (!testActivo || testFinalizado || !relojActivado) return;
    const timer = setInterval(() => {
      setSegundosTranscurridos((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [testActivo, testFinalizado, relojActivado]);

  // Extraer todas las preguntas falladas consolidadas (por defecto solo las pendientes de superar)
  const todasLasFalladas = useMemo(() => {
    void versionSuperadas;
    return extraerPreguntasFalladasConsolidadas(
      historialPruebas,
      almacenDudas,
      incluirBlancos,
      incluirYaSuperadas
    );
  }, [historialPruebas, almacenDudas, incluirBlancos, incluirYaSuperadas, versionSuperadas]);

  // Conteo por categoría temática
  const conteoPorCategoria = useMemo(() => {
    const mapa = new Map<CategoriaTemarioId, number>();
    CATEGORIAS_TEMARIO_PROGRESO.forEach((c) => mapa.set(c.id, 0));
    todasLasFalladas.forEach((item) => {
      if (!incluirYaSuperadas && !item.pendienteSuperar) return;
      mapa.set(item.categoriaId, (mapa.get(item.categoriaId) || 0) + 1);
    });
    return mapa;
  }, [todasLasFalladas, incluirYaSuperadas]);

  // Catálogo dinámico de leyes y normas presentes en las preguntas falladas
  const leyesDisponiblesConConteo = useMemo(() => {
    const mapa = new Map<string, number>();
    todasLasFalladas.forEach((item) => {
      if (!incluirYaSuperadas && !item.pendienteSuperar) return;
      if (
        categoriasSeleccionadas.length > 0 &&
        !categoriasSeleccionadas.includes(item.categoriaId)
      ) {
        return;
      }
      item.leyes.forEach((ley) => {
        mapa.set(ley, (mapa.get(ley) || 0) + 1);
      });
    });
    return Array.from(mapa.entries())
      .map(([ley, count]) => ({ ley, count }))
      .sort((a, b) => b.count - a.count || a.ley.localeCompare(b.ley));
  }, [todasLasFalladas, incluirYaSuperadas, categoriasSeleccionadas]);

  // Filtrar y ordenar el pool de preguntas falladas según la selección del usuario
  const preguntasFiltradasPool = useMemo(() => {
    let lista = [...todasLasFalladas];

    if (!incluirYaSuperadas) {
      lista = lista.filter((item) => item.pendienteSuperar);
    }

    if (categoriasSeleccionadas.length > 0) {
      lista = lista.filter((item) => categoriasSeleccionadas.includes(item.categoriaId));
    }

    if (leyesSeleccionadas.length > 0) {
      lista = lista.filter((item) => item.leyes.some((l) => leyesSeleccionadas.includes(l)));
    }

    if (busquedaTexto.trim()) {
      const q = busquedaTexto.toLowerCase().trim();
      lista = lista.filter(
        (item) =>
          item.pregunta.enunciado.toLowerCase().includes(q) ||
          item.leyes.some((l) => l.toLowerCase().includes(q)) ||
          item.examenOrigenTitulo.toLowerCase().includes(q)
      );
    }

    if (ordenPreguntas === 'mas_falladas') {
      lista.sort((a, b) => b.vecesFallada - a.vecesFallada || b.ultimaFechaFallo.localeCompare(a.ultimaFechaFallo));
    } else if (ordenPreguntas === 'recientes') {
      lista.sort((a, b) => b.ultimaFechaFallo.localeCompare(a.ultimaFechaFallo) || b.vecesFallada - a.vecesFallada);
    }

    return lista;
  }, [
    todasLasFalladas,
    incluirYaSuperadas,
    categoriasSeleccionadas,
    leyesSeleccionadas,
    busquedaTexto,
    ordenPreguntas,
  ]);

  const toggleCategoria = (id: CategoriaTemarioId) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleLey = (ley: string) => {
    setLeyesSeleccionadas((prev) =>
      prev.includes(ley) ? prev.filter((l) => l !== ley) : [...prev, ley]
    );
  };

  const formatearTiempo = (totalSeg: number) => {
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  };

  // Iniciar el test de preguntas falladas
  const handleIniciarTestFalladas = () => {
    if (preguntasFiltradasPool.length === 0) return;

    let seleccion = [...preguntasFiltradasPool];
    if (ordenPreguntas === 'aleatorio') {
      seleccion = seleccion.sort(() => Math.random() - 0.5);
    }

    const limite =
      cantidadPreguntas === 'todas'
        ? seleccion.length
        : Math.min(Number(cantidadPreguntas), seleccion.length);
    const itemsElegidos = seleccion.slice(0, limite);

    // Construir etiqueta descriptiva automática si no hay título personalizado
    let etiquetaFiltro = 'Selección Global';
    if (leyesSeleccionadas.length === 1) {
      etiquetaFiltro = leyesSeleccionadas[0];
    } else if (leyesSeleccionadas.length > 1) {
      etiquetaFiltro = `${leyesSeleccionadas.length} Leyes seleccionadas`;
    } else if (categoriasSeleccionadas.length === 1) {
      etiquetaFiltro = obtenerInfoCategoriaTemario(categoriasSeleccionadas[0]).sigla;
    } else if (categoriasSeleccionadas.length > 1) {
      etiquetaFiltro = `${categoriasSeleccionadas.length} Bloques temáticos`;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const tituloFinal =
      tituloPersonalizado.trim() ||
      `Test de Falladas · ${etiquetaFiltro} (${itemsElegidos.length} preg.)`;

    const preguntasExamen: PreguntaExamen[] = itemsElegidos.map((item, idx) => {
      const refConv = obtenerReferenciaConvocatoriaOficial(item.pregunta, {
        id: item.examenOrigenId,
        titulo: item.examenOrigenTitulo,
      });
      return {
        ...item.pregunta,
        id: idx + 1,
        esReserva: false,
        convocatoriasAparecida: refConv || item.pregunta.convocatoriasAparecida,
        codigoInedita: item.pregunta.codigoInedita || `FALLO-${String(idx + 1).padStart(3, '0')}`,
      };
    });

    const leyesUnicas = Array.from(new Set(itemsElegidos.flatMap((i) => i.leyes)));
    const tematicasUnicas = Array.from(
      new Set(
        itemsElegidos.map((i) =>
          i.categoriaId === 'informatica_c1' ? 'procedimiento_administrativo' : i.categoriaId
        )
      )
    );

    const nuevoExamenFalladas: ExamenCompleto = {
      id: `FALLADAS-${Date.now()}`,
      titulo: tituloFinal,
      tipo: 'unitario',
      ambito: 'AMBOS',
      origen: 'generado_ia',
      categoria: 'test_ia',
      soloHistorial: true,
      fecha: fechaHoy,
      tematicas: tematicasUnicas.length > 0 ? (tematicasUnicas as any) : ['procedimiento_administrativo'],
      leyesBOEAplicadas: leyesUnicas.length > 0 ? leyesUnicas : ['Normativa Oficial BOE'],
      preguntas: preguntasExamen,
    };

    setMetadatosFallosTest(itemsElegidos);
    setTestActivo(nuevoExamenFalladas);
    setIndicePreguntaActual(0);
    setRespuestasUsuario({});
    setPreguntasDudosas(new Set());
    setSegundosTranscurridos(0);
    setTestFinalizado(false);
    setPreguntaModalJustificacion(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Marcar / Desmarcar opción
  const handleSeleccionarOpcion = (idxPregunta: number, letraOpcion: string) => {
    if (testFinalizado) return;
    const actual = respuestasUsuario[idxPregunta];
    if (actual === letraOpcion) {
      setRespuestasUsuario((prev) => {
        const copia = { ...prev };
        delete copia[idxPregunta];
        return copia;
      });
      return;
    }

    setRespuestasUsuario((prev) => ({ ...prev, [idxPregunta]: letraOpcion }));

    // Si estamos en modalidad paso a paso, registrar inmediatamente si la pregunta fue acertada para desmarcarla como fallada
    if (modalidadCorreccion === 'paso_a_paso' && testActivo?.preguntas[idxPregunta]) {
      const preg = testActivo.preguntas[idxPregunta];
      registrarRespuestasEnControlFalladas([preg], { 0: letraOpcion });
      setVersionSuperadas((v) => v + 1);
      if (onRegistrarResultadoPreguntas) {
        onRegistrarResultadoPreguntas([preg], { 0: letraOpcion });
      }
    }
  };

  const handleDesmarcarPregunta = (idxPregunta: number) => {
    if (testFinalizado) return;
    setRespuestasUsuario((prev) => {
      const copia = { ...prev };
      delete copia[idxPregunta];
      return copia;
    });
  };

  const toggleDudosa = (idxPregunta: number) => {
    setPreguntasDudosas((prev) => {
      const next = new Set(prev);
      if (next.has(idxPregunta)) next.delete(idxPregunta);
      else next.add(idxPregunta);
      return next;
    });
  };

  const solicitarEvaluarTestFalladas = () => {
    if (!testActivo || testFinalizado) return;
    setMostrarConfirmarEvaluacion(true);
  };

  // Finalizar test y guardar exclusivamente en Historial (nunca en Banco de Exámenes)
  const handleFinalizarYEvaluarTest = () => {
    if (!testActivo || testFinalizado) return;
    setMostrarConfirmarEvaluacion(false);

    const total = testActivo.preguntas.length;
    let aciertos = 0;
    let fallos = 0;
    let blancos = 0;

    testActivo.preguntas.forEach((preg, idx) => {
      const resp = respuestasUsuario[idx];
      const corr = preg.opciones.find((o) => o.esCorrecta)?.id;
      if (!resp) {
        blancos++;
      } else if (resp === corr) {
        aciertos++;
      } else {
        fallos++;
      }
    });

    // Fórmula oficial C1: Aciertos - (Fallos / 3)
    const puntuacionDirecta = Math.max(0, Number((aciertos - fallos / 3).toFixed(2)));
    const puntuacionTransformada =
      total > 0 ? Math.max(0, Number(((puntuacionDirecta / total) * 100).toFixed(2))) : 0;

    const fechaAhoraISO = new Date().toISOString();

    // Registrar respuestas en el control de preguntas falladas para que las acertadas dejen de figurar como falladas
    registrarRespuestasEnControlFalladas(testActivo.preguntas, respuestasUsuario, fechaAhoraISO);
    setVersionSuperadas((v) => v + 1);
    if (onRegistrarResultadoPreguntas) {
      onRegistrarResultadoPreguntas(testActivo.preguntas, respuestasUsuario);
    }

    const examenConResultado: ExamenCompleto = {
      ...testActivo,
      soloHistorial: true,
      resultado: {
        puntuacionDirecta,
        puntuacionTransformada,
        puntuacionMaxima: 100,
        superaCorte: puntuacionTransformada >= 50,
        duracionSegundos: relojActivado ? segundosTranscurridos : 0,
        aciertos,
        fallos,
        blancos,
        respuestasUsuario: { ...respuestasUsuario },
        fechaRealizacion: fechaAhoraISO,
      },
    };

    setTestActivo(examenConResultado);
    setTestFinalizado(true);
    onExamenGuardado(examenConResultado);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Si hay un test en curso o recién finalizado, mostrar la interfaz del Test Runner
  if (testActivo) {
    const preguntaActual = testActivo.preguntas[indicePreguntaActual];
    const metaFalloActual = metadatosFallosTest[indicePreguntaActual];
    const respActual = respuestasUsuario[indicePreguntaActual];
    const opcionCorrectaActual = preguntaActual?.opciones.find((o) => o.esCorrecta);
    const mostrarCorreccionInmediata =
      testFinalizado || (modalidadCorreccion === 'paso_a_paso' && Boolean(respActual));
    const totalContestadas = Object.keys(respuestasUsuario).length;

    // Pregunta abierta en el modal de Justificación BOE (50% / 50%)
    const preguntaEnModal =
      preguntaModalJustificacion !== null ? testActivo.preguntas[preguntaModalJustificacion] : null;
    const respEnModal =
      preguntaModalJustificacion !== null ? respuestasUsuario[preguntaModalJustificacion] : undefined;
    const opcCorrectaModal = preguntaEnModal?.opciones.find((o) => o.esCorrecta);

    // Equivalencia oficial sobre 70 preguntas cuando está finalizado
    const pdEquivalente70 = testActivo.resultado
      ? ((testActivo.resultado.puntuacionDirecta / Math.max(1, testActivo.preguntas.length)) * 70).toFixed(2)
      : '0.00';

    return (
      <div className="space-y-5">
        {/* Barra superior de control del Test de Falladas */}
        <div className="bg-rose-50/85 dark:bg-rose-950/35 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-base shadow-xs shrink-0">
              <i className="fa-solid fa-rotate"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-mono">
                  Test Exclusivo de Preguntas Falladas
                </span>
                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Computa en Historial · No duplica Banco de Exámenes
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {testActivo.titulo}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
            {relojActivado && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <i className="fa-regular fa-clock text-indigo-500"></i>
                <span>{formatearTiempo(segundosTranscurridos)}</span>
              </div>
            )}

            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {totalContestadas} de {testActivo.preguntas.length} contestadas
            </span>

            {onExportarExamenPDF && (
              <button
                type="button"
                onClick={() => onExportarExamenPDF(testActivo)}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs font-black shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Exportar test en formato PDF oficial + Plantilla de hoja de respuestas en blanco"
              >
                <i className="fa-solid fa-file-pdf text-rose-600 dark:text-rose-400"></i>
                <span>Exportar PDF</span>
              </button>
            )}

            {!testFinalizado ? (
              <button
                type="button"
                onClick={solicitarEvaluarTestFalladas}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-flag-checkered"></i>
                <span>Evaluar y Guardar en Historial</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onIrAHistorial}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-table-list"></i>
                  <span>Ver en Historial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTestActivo(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Configurar Otro Test
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resumen Final de Resultados cuando el test ha concluido */}
        {testFinalizado && testActivo.resultado && (
          <div className="bg-linear-to-br from-emerald-50/90 via-white to-indigo-50/60 dark:from-emerald-950/30 dark:via-slate-800 dark:to-indigo-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-xs">
                  <i className="fa-solid fa-award"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Resumen del Test de Preguntas Falladas
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      ✔ Guardado en Historial · Excluido del Banco de Exámenes
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Este test ya computa en tu Historial de Pruebas, en el Progreso Temático Diario y en la Analítica de KPIs.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Aciertos / Fallos / Blancos
                </span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-1 block">
                  <span className="text-emerald-600">+{testActivo.resultado.aciertos}</span> /{' '}
                  <span className="text-rose-600">-{testActivo.resultado.fallos}</span> /{' '}
                  <span className="text-slate-400">{testActivo.resultado.blancos}b</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Puntuación Directa (PD)
                </span>
                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {testActivo.resultado.puntuacionDirecta.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400">/ {testActivo.preguntas.length}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Equivalente Modelo 70 Preg.
                </span>
                <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {pdEquivalente70} <span className="text-xs text-slate-400">/ 70</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Nota Transformada (PT)
                </span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {testActivo.resultado.puntuacionTransformada.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400">/ 100</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Tiempo Invertido
                </span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                  {relojActivado ? formatearTiempo(testActivo.resultado.duracionSegundos) : 'Sin reloj'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Errores Superados Hoy
                </span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {testActivo.resultado.aciertos} de {testActivo.preguntas.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Barra de navegación numérica de preguntas */}
        <div className="bg-sky-50/85 dark:bg-slate-800 border-2 border-sky-300 dark:border-sky-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wider font-mono text-[10.5px]">
              Mapa de Preguntas del Test de Falladas ({testActivo.preguntas.length})
            </span>
            <span className="text-[11px] font-mono">
              Haz clic en cualquier número para desplazarte
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {testActivo.preguntas.map((p, idx) => {
              const resp = respuestasUsuario[idx];
              const corr = p.opciones.find((o) => o.esCorrecta)?.id;
              const esDudosa = preguntasDudosas.has(idx);
              const evaluada = testFinalizado || (modalidadCorreccion === 'paso_a_paso' && Boolean(resp));

              let estiloBoton =
                'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
              if (evaluada && resp) {
                estiloBoton =
                  resp === corr
                    ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                    : 'bg-rose-600 text-white border-rose-700 font-black';
              } else if (resp) {
                estiloBoton = 'bg-indigo-600 text-white border-indigo-700 font-black';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIndicePreguntaActual(idx)}
                  className={`h-8 min-w-8 px-2 rounded-lg border text-xs font-mono transition-all cursor-pointer relative ${estiloBoton} ${
                    indicePreguntaActual === idx ? 'ring-2 ring-offset-1 ring-indigo-500 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                  {esDudosa && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjeta de la Pregunta Actual */}
        {preguntaActual && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
            {/* Cabecera de la pregunta con botones 100% Inédita, Desmarcar y Dudosa juntos */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                  PREGUNTA #{indicePreguntaActual + 1} (DE {testActivo.preguntas.length})
                </span>

                {(() => {
                  const refConvFallo = obtenerReferenciaConvocatoriaOficial(
                    preguntaActual,
                    metaFalloActual
                      ? { id: metaFalloActual.examenOrigenId, titulo: metaFalloActual.examenOrigenTitulo }
                      : testActivo
                  );
                  if (refConvFallo) {
                    return (
                      <span
                        className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-mono font-black flex items-center gap-1.5"
                        title={`Pregunta procedente de convocatoria oficial: ${refConvFallo}`}
                      >
                        <i className="fa-solid fa-landmark-flag text-amber-600 dark:text-amber-400 text-[9px]"></i>
                        <span>{formatearBadgeConvocatoriaOficial(refConvFallo)}</span>
                      </span>
                    );
                  }
                  return (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-black flex items-center gap-1">
                      <i className="fa-solid fa-shield-halved text-[9px]"></i>
                      <span>100% INÉDITA · {preguntaActual.codigoInedita || `FALLO-${indicePreguntaActual + 1}`}</span>
                    </span>
                  );
                })()}

                {metaFalloActual && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-mono font-bold">
                    Fallada {metaFalloActual.vecesFallada} {metaFalloActual.vecesFallada === 1 ? 'vez' : 'veces'} ·{' '}
                    {obtenerInfoCategoriaTemario(metaFalloActual.categoriaId).sigla}
                  </span>
                )}

                {respActual && !testFinalizado && (
                  <button
                    type="button"
                    onClick={() => handleDesmarcarPregunta(indicePreguntaActual)}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-600 border border-slate-300 dark:border-slate-600 text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <i className="fa-solid fa-eraser text-[9px]"></i>
                    <span>DESMARCAR ({respActual})</span>
                  </button>
                )}

                {/* Botón Dudosa situado directamente en el recuadro de la pregunta junto a 100% inédita y desmarcar */}
                <button
                  type="button"
                  onClick={() => toggleDudosa(indicePreguntaActual)}
                  className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    preguntasDudosas.has(indicePreguntaActual)
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-400 font-black'
                      : 'bg-amber-50/60 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-slate-700 hover:bg-amber-100'
                  }`}
                >
                  <i className="fa-regular fa-flag text-[9px]"></i>
                  <span>{preguntasDudosas.has(indicePreguntaActual) ? 'DUDOSA MARCADA' : 'Dudosa'}</span>
                </button>
              </div>

              {metaFalloActual?.leyes && metaFalloActual.leyes.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {metaFalloActual.leyes.map((ley, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold"
                    >
                      {ley}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Enunciado */}
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
              {preguntaActual.enunciado}
            </p>

            {/* Opciones A, B, C, D (altura invariable, colores suaves, visado verde ✓ y aspa roja ✗) */}
            <div className="space-y-2.5 pt-1">
              {preguntaActual.opciones.map((opc) => {
                const seleccionada = respActual === opc.id;
                let claseCaja =
                  'border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70 hover:bg-indigo-50/40 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200';
                let claseLetra =
                  'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200';
                let indicadorDerecha: React.ReactNode = null;

                if (mostrarCorreccionInmediata) {
                  if (opc.esCorrecta) {
                    claseCaja =
                      'border-emerald-300/85 dark:border-emerald-800/70 bg-emerald-50/45 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100';
                    claseLetra =
                      'bg-emerald-100/85 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
                    indicadorDerecha = (
                      <span
                        className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                        title="Respuesta acertada / correcta"
                      >
                        <i className="fa-solid fa-check text-xs"></i>
                      </span>
                    );
                  } else if (seleccionada && !opc.esCorrecta) {
                    claseCaja =
                      'border-rose-300/85 dark:border-rose-800/70 bg-rose-50/45 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100';
                    claseLetra =
                      'bg-rose-100/85 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200';
                    indicadorDerecha = (
                      <span
                        className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                        title="Respuesta incorrecta"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </span>
                    );
                  } else {
                    claseCaja =
                      'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400';
                  }
                } else if (seleccionada) {
                  claseCaja =
                    'border-indigo-400 dark:border-indigo-600 bg-indigo-50/55 dark:bg-indigo-950/35 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-400/50';
                  claseLetra = 'bg-indigo-600 border border-indigo-600 text-white';
                  indicadorDerecha = (
                    <span
                      className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"
                      title="Opción seleccionada (clic de nuevo para desmarcar)"
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                    </span>
                  );
                }

                return (
                  <div
                    key={opc.id}
                    onClick={() => handleSeleccionarOpcion(indicePreguntaActual, opc.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-3 ${claseCaja}`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${claseLetra}`}
                      >
                        {opc.id}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-snug block py-0.5">
                        {opc.texto}
                      </span>
                    </div>

                    <span className="h-6 w-6 shrink-0 mt-0.5 flex items-center justify-center">
                      {indicadorDerecha}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pie de la tarjeta: navegación y botón de abrir ventana Justificación BOE */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={indicePreguntaActual <= 0}
                  onClick={() => setIndicePreguntaActual((p) => Math.max(0, p - 1))}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={indicePreguntaActual >= testActivo.preguntas.length - 1}
                  onClick={() =>
                    setIndicePreguntaActual((p) => Math.min(testActivo.preguntas.length - 1, p + 1))
                  }
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <span>Siguiente</span>
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {mostrarCorreccionInmediata && (
                  <button
                    type="button"
                    onClick={() => setPreguntaModalJustificacion(indicePreguntaActual)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-scale-balanced"></i>
                    <span>Ver Ventana Justificación Oficial BOE</span>
                  </button>
                )}

                {respActual && !testFinalizado && (
                  <button
                    type="button"
                    onClick={() => handleDesmarcarPregunta(indicePreguntaActual)}
                    className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Desmarcar (dejar en blanco)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE JUSTIFICACIÓN OFICIAL BOE (Equilibrada 50% / 50%, fuentes +1pt, aspa roja ✗ y enlace BOE) */}
        {preguntaEnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-[1780px] h-[92vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Cabecera oscura con versión v2.8 */}
              <div className="bg-slate-950 text-white px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                    <i className="fa-solid fa-scale-balanced text-sm"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase font-mono">
                        JUSTIFICACIÓN OFICIAL BOE
                      </span>
                      {(() => {
                        const metaModal =
                          preguntaModalJustificacion !== null
                            ? metadatosFallosTest[preguntaModalJustificacion]
                            : undefined;
                        const refConvModalFallo = obtenerReferenciaConvocatoriaOficial(
                          preguntaEnModal,
                          metaModal
                            ? { id: metaModal.examenOrigenId, titulo: metaModal.examenOrigenTitulo }
                            : testActivo
                        );
                        if (refConvModalFallo) {
                          return (
                            <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono text-[10px] font-bold flex items-center gap-1">
                              <i className="fa-solid fa-landmark-flag text-[9px]"></i>
                              <span>{formatearBadgeConvocatoriaOficial(refConvModalFallo)}</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                            REPASO DE FALLOS · {preguntaEnModal.codigoInedita || 'INED'}
                          </span>
                        );
                      })()}
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono text-[10px] font-black">
                        v2.8 Actualizada
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                      {obtenerNormaEfectivaDePregunta(preguntaEnModal, testActivo)} ·{' '}
                      <span className="text-indigo-300">
                        {preguntaEnModal.justificacionLegal?.articulo || 'Artículo aplicable'}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={obtenerUrlBOEParaNorma(
                      obtenerNormaEfectivaDePregunta(preguntaEnModal, testActivo),
                      preguntaEnModal.justificacionLegal?.articulo
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <span>Abrir en BOE</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreguntaModalJustificacion(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              {/* Cuerpo 50% / 50% en horizontal */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
                {/* MITAD IZQUIERDA (50%): Enunciado y Desglose de las 4 opciones con aspa roja ✗ en erróneas */}
                <div className="p-4 sm:p-5 overflow-y-auto flex flex-col justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400">
                          PREGUNTA #{preguntaModalJustificacion! + 1} DE {testActivo.preguntas.length}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-black ${
                            respEnModal === opcCorrectaModal?.id
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {respEnModal === opcCorrectaModal?.id ? '✓ SUPERADA' : '✗ FALLADA / EN REPASO'}
                        </span>
                      </div>
                      <p className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug">
                        {preguntaEnModal.enunciado}
                      </p>
                    </div>

                    {/* Comparativa Selección vs Clave Oficial */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        className={`p-3 rounded-xl border ${
                          respEnModal === opcCorrectaModal?.id
                            ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                            : 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-black uppercase block text-slate-500 dark:text-slate-400">
                          TU SELECCIÓN
                        </span>
                        <span className="text-[13.5px] font-black block mt-0.5">
                          {respEnModal ? `Opción ${respEnModal})` : 'En blanco'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800">
                        <span className="text-[10px] font-mono font-black uppercase block text-emerald-700 dark:text-emerald-400">
                          CLAVE OFICIAL DEL TRIBUNAL
                        </span>
                        <span className="text-[13.5px] font-black text-emerald-800 dark:text-emerald-300 block mt-0.5">
                          ✓ Opción {opcCorrectaModal?.id}) Correcta
                        </span>
                      </div>
                    </div>

                    {/* Lista de las 4 opciones con aspa roja ✗ junto a cada opción errónea */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-black uppercase text-slate-500 block">
                        DESGLOSE Y CONFRONTACIÓN DE LAS 4 OPCIONES:
                      </span>
                      {preguntaEnModal.opciones.map((op) => {
                        const esCorr = op.esCorrecta;
                        return (
                          <div
                            key={op.id}
                            className={`p-3 rounded-xl border transition-all ${
                              esCorr
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <span
                                  className={`w-6 h-6 rounded-md font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                    esCorr
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  }`}
                                >
                                  {op.id}
                                </span>
                                <p
                                  className={`text-[13.5px] leading-snug ${
                                    esCorr
                                      ? 'font-black text-emerald-950 dark:text-emerald-100'
                                      : 'font-medium text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {!esCorr && (
                                    <span
                                      className="text-rose-600 dark:text-rose-400 font-black mr-1.5"
                                      title="Opción errónea / distractor"
                                    >
                                      ✗
                                    </span>
                                  )}
                                  {op.texto}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black shrink-0 ${
                                  esCorr
                                    ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                {esCorr ? '✓ CONFORME A LEY' : '✗ OPCIÓN ERRÓNEA'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* MITAD DERECHA (50%): Fundamentación BOE con enlaces, Ejemplo práctico, Distractores y Mnemotécnica */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 bg-white dark:bg-slate-900">
                  {/* 1. Argumentación Legal BOE */}
                  <div className="p-3.5 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[12px] font-black uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <i className="fa-solid fa-scale-balanced text-amber-600"></i>
                        <span>1. ARGUMENTACIÓN LEGAL Y FUNDAMENTACIÓN BOE</span>
                      </span>
                      <a
                        href={obtenerUrlBOEParaNorma(
                          obtenerNormaEfectivaDePregunta(preguntaEnModal, testActivo),
                          preguntaEnModal.justificacionLegal?.articulo
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[11px] font-mono font-bold flex items-center gap-1"
                      >
                        <span>
                          {obtenerNormaEfectivaDePregunta(preguntaEnModal, testActivo)} ·{' '}
                          {preguntaEnModal.justificacionLegal?.articulo || 'Art.'}
                        </span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                      </a>
                    </div>
                    <p className="text-[14px] italic text-slate-800 dark:text-slate-200 leading-relaxed bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/60">
                      {renderizarTextoConEnlacesBOE(
                        preguntaEnModal.justificacionLegal?.fundamento ||
                          'Precepto oficial aplicable conforme a la literalidad de la norma publicada en el Boletín Oficial del Estado.'
                      )}
                    </p>
                    <GestorRecursosArgumentacionPregunta
                      enunciadoPregunta={preguntaEnModal.enunciado}
                      recursosIniciales={preguntaEnModal.recursosArgumentacion}
                      onActualizarRecursos={(nuevosRecursos) => {
                        const preguntaActualizada: PreguntaExamen = {
                          ...preguntaEnModal,
                          recursosArgumentacion: nuevosRecursos,
                        };
                        setTestActivo((prev) =>
                          prev
                            ? {
                                ...prev,
                                preguntas: prev.preguntas.map((p) =>
                                  p.enunciado === preguntaEnModal.enunciado
                                    ? { ...p, recursosArgumentacion: nuevosRecursos }
                                    : p
                                ),
                              }
                            : prev
                        );
                        if (onActualizarPreguntaGlobal) {
                          onActualizarPreguntaGlobal(preguntaActualizada);
                        }
                      }}
                    />
                  </div>

                  {/* 2. Ejemplo Práctico */}
                  <div className="p-3.5 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 space-y-1.5">
                    <span className="text-[12px] font-black uppercase text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-lightbulb text-sky-500"></i>
                      <span>2. EJEMPLO PRÁCTICO Y APLICACIÓN AL CASO CONCRETO</span>
                    </span>
                    <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-snug bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-sky-100 dark:border-sky-900">
                      {renderizarTextoConEnlacesBOE(
                        preguntaEnModal.ejemploPractico ||
                          'En la tramitación ordinaria ante el órgano competente, el funcionario auxiliar verifica el cumplimiento estricto del plazo y competencia fijados en este precepto antes de dictar o notificar la resolución.'
                      )}
                    </p>
                  </div>

                  {/* 3. Análisis de Distractores */}
                  <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20 space-y-1.5">
                    <span className="text-[12px] font-black uppercase text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-magnifying-glass-chart text-rose-500"></i>
                      <span>3. ANÁLISIS DE DISTRACTORES / TRAMPAS DEL TRIBUNAL</span>
                    </span>
                    <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-snug bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-rose-100 dark:border-rose-900">
                      {renderizarTextoConEnlacesBOE(
                        preguntaEnModal.analisisDistractores ||
                          'Las opciones marcadas con ✗ alteran plazos, órganos competentes o el sentido del silencio/recurso respecto a la redacción literal del artículo en el BOE.'
                      )}
                    </p>
                  </div>

                  {/* 4. Regla Mnemotécnica */}
                  <div className="p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-1.5">
                    <span className="text-[12px] font-black uppercase text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-brain text-indigo-500"></i>
                      <span>4. REGLA MNEMOTÉCNICA DE FIJACIÓN RÁPIDA</span>
                    </span>
                    <p className="text-[13px] font-mono font-bold text-indigo-950 dark:text-indigo-200 bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900">
                      {preguntaEnModal.reglaMnemotecnica ||
                        `[CLAVE ${opcCorrectaModal?.id}] Fijar artículo y literalidad exacta de ${obtenerNormaEfectivaDePregunta(
                          preguntaEnModal,
                          testActivo
                        )}.`}
                    </p>
                  </div>

                  {/* 5. Vincular / Modificar Leyes y Temática de la Pregunta */}
                  <div className="p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-slate-500 font-mono">
                        LEYES / TEMÁTICA:
                      </span>
                      {(preguntaEnModal.leyesRelacionadas && preguntaEnModal.leyesRelacionadas.length > 0
                        ? preguntaEnModal.leyesRelacionadas
                        : [obtenerNormaEfectivaDePregunta(preguntaEnModal, testActivo)]
                      ).map((l, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono font-bold text-indigo-800 dark:text-indigo-200"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreguntaParaSelectorLeyes(preguntaEnModal)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-[9px]"></i>
                      <span>Vincular leyes</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pie de ventana Justificación con versión actualizada */}
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  Simulador C1 Normas & Supuestos · Versión v3.1 Actualizada
                </span>
                <button
                  type="button"
                  onClick={() => setPreguntaModalJustificacion(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-black cursor-pointer"
                >
                  Cerrar Justificación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUADRO DE NOTIFICACIÓN ANTES DE EVALUAR EL TEST DE FALLADAS */}
        {mostrarConfirmarEvaluacion && (
          <ConfirmarEvaluacionModal
            isOpen={mostrarConfirmarEvaluacion}
            tituloExamen={testActivo.titulo}
            tipoPruebaLabel="Test de Preguntas Falladas"
            preguntasResumen={testActivo.preguntas.map((p, idx) => ({
              indice: idx,
              etiqueta: `${idx + 1}`,
              respondida: Boolean(respuestasUsuario[idx]),
              dudosa: preguntasDudosas.has(idx),
              esReserva: p.esReserva,
            }))}
            onVolverAlTest={() => setMostrarConfirmarEvaluacion(false)}
            onConfirmarEvaluar={handleFinalizarYEvaluarTest}
            onIrAPregunta={(idx) => setIndicePreguntaActual(idx)}
          />
        )}
      </div>
    );
  }

  // VISTA CONFIGURADORA DE LA SECCIÓN EXCLUSIVA DE PREGUNTAS FALLADAS
  return (
    <div className="space-y-6">
      {/* Banner Principal de la Sección Exclusiva */}
      <div className="bg-linear-to-r from-rose-50 via-white to-indigo-50/70 dark:from-rose-950/40 dark:via-slate-800 dark:to-indigo-950/30 border-2 border-rose-200/90 dark:border-rose-900/70 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
            <i className="fa-solid fa-rotate"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                Entrenamiento Específico de Errores
              </span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Computa como nuevo test en Historial · No en Banco de Exámenes
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              Generador Exclusivo de Tests de Preguntas Falladas
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-3xl">
              Selecciona tus preguntas falladas filtrando por <strong>temática concreta del programa oficial</strong> o por{' '}
              <strong>ley / norma específica del BOE e Informática</strong>. Cada test finalizado se registrará como una nueva prueba en tu{' '}
              <strong>Historial</strong> (y en tus gráficas de KPIs y Progreso Diario) sin añadir plantillas al Banco de Exámenes.
            </p>
          </div>
        </div>

        {/* Resumen rápido del pool de fallos */}
        <div className="flex items-center gap-3 self-stretch lg:self-center">
          <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-center shadow-2xs">
            <span className="text-[9.5px] font-mono font-black uppercase text-rose-600 dark:text-rose-400 block">
              Total Falladas Detectadas
            </span>
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {todasLasFalladas.length}
            </span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-center shadow-2xs">
            <span className="text-[9.5px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 block">
              Seleccionadas para el Test
            </span>
            <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {preguntasFiltradasPool.length}
            </span>
          </div>
        </div>
      </div>

      {todasLasFalladas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mx-auto">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            ¡No tienes preguntas falladas registradas en este momento!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            A medida que realices tests en el Generador IA o en el Banco de Exámenes, cualquier pregunta que falles se recopilará automáticamente aquí clasificada por ley y por bloque temático.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-700/70 px-3.5 py-2 rounded-xl">
              <input
                type="checkbox"
                checked={incluirBlancos}
                onChange={(e) => setIncluirBlancos(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Incluir también preguntas dejadas en blanco de mis tests</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* COLUMNA IZQUIERDA (8/12): Selección por Temática Concreta y por Ley Concreta */}
          <div className="xl:col-span-8 space-y-5">
            {/* Barra de modo de selección y filtros rápidos */}
            <div className="bg-slate-100/90 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModoFiltroPrincipal('ambos')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      modoFiltroPrincipal === 'ambos'
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ver Temáticas y Leyes
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoFiltroPrincipal('tematica')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      modoFiltroPrincipal === 'tematica'
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Solo por Temática
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoFiltroPrincipal('ley')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      modoFiltroPrincipal === 'ley'
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Solo por Ley / Norma
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirYaSuperadas}
                      onChange={(e) => setIncluirYaSuperadas(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Incluir también las ya superadas (histórico)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirBlancos}
                      onChange={(e) => setIncluirBlancos(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Incluir preguntas en blanco</span>
                  </label>
                </div>
              </div>

              {/* Buscador por palabra clave o artículo */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                  placeholder="Filtrar preguntas falladas por término, artículo, ley o título del examen de origen..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* BLOQUE 1: SELECCIÓN POR TEMÁTICA CONCRETA */}
            {(modoFiltroPrincipal === 'ambos' || modoFiltroPrincipal === 'tematica') && (
              <div className="bg-indigo-50/60 dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-indigo-500"></i>
                      <span>1. Seleccionar por Categoría o Temática Concreta</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Elige uno o varios bloques del programa oficial (si no marcas ninguno, se incluyen todas las temáticas).
                    </p>
                  </div>
                  {categoriasSeleccionadas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCategoriasSeleccionadas([])}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Limpiar temáticas ({categoriasSeleccionadas.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {CATEGORIAS_TEMARIO_PROGRESO.map((cat) => {
                    const count = conteoPorCategoria.get(cat.id) || 0;
                    const activa = categoriasSeleccionadas.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={count === 0 && !activa}
                        onClick={() => toggleCategoria(cat.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          activa
                            ? 'border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-2xs'
                            : count > 0
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 hover:border-indigo-400'
                            : 'border-slate-100 dark:border-slate-800 opacity-45 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg ${cat.colorBg} ${cat.colorText} border ${cat.colorBorder} flex items-center justify-center text-xs shrink-0`}
                          >
                            <i className={`fa-solid ${cat.icono}`}></i>
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate block">
                              {cat.sigla}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                              {cat.nombre}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-black shrink-0 ${
                            activa
                              ? 'bg-indigo-600 text-white'
                              : count > 0
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BLOQUE 2: SELECCIÓN POR LEY O NORMA CONCRETA */}
            {(modoFiltroPrincipal === 'ambos' || modoFiltroPrincipal === 'ley') && (
              <div className="bg-amber-50/60 dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-scale-balanced text-amber-500"></i>
                      <span>2. Seleccionar por Ley o Norma Concreta del BOE / Informática</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Filtra tus fallos para practicar exclusivamente una o varias leyes específicas.
                    </p>
                  </div>
                  {leyesSeleccionadas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLeyesSeleccionadas([])}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Limpiar leyes ({leyesSeleccionadas.length})
                    </button>
                  )}
                </div>

                {leyesDisponiblesConConteo.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No hay leyes con preguntas falladas para el filtro actual.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {leyesDisponiblesConConteo.map(({ ley, count }) => {
                      const activa = leyesSeleccionadas.includes(ley);
                      return (
                        <button
                          key={ley}
                          type="button"
                          onClick={() => toggleLey(ley)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            activa
                              ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <i className="fa-solid fa-book-bookmark text-[10px] opacity-75"></i>
                          <span>{ley}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black ${
                              activa
                                ? 'bg-slate-950/20 text-slate-950'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Previsualización de las preguntas falladas incluidas en la selección */}
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
                  Vista Previa de Preguntas Falladas Seleccionadas ({preguntasFiltradasPool.length})
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Ordenadas por: {ordenPreguntas === 'mas_falladas' ? 'Más veces falladas' : ordenPreguntas === 'recientes' ? 'Más recientes' : 'Aleatorio'}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {preguntasFiltradasPool.slice(0, 25).map((item, idx) => {
                  const catInfo = obtenerInfoCategoriaTemario(item.categoriaId);
                  return (
                    <div
                      key={item.claveNormalizada}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-black text-slate-400">
                            #{idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[9.5px] font-mono font-bold ${catInfo.colorBg} ${catInfo.colorText} border ${catInfo.colorBorder}`}
                          >
                            {catInfo.sigla}
                          </span>
                          {item.leyes.map((l, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9.5px] font-mono text-slate-600 dark:text-slate-300"
                            >
                              {l}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPreguntaParaSelectorLeyes(item.pregunta)}
                            className="text-[9.5px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                            title="Modificar ley o bloque de informática asociado a esta pregunta"
                          >
                            + Vincular leyes
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                          {item.pregunta.enunciado}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono text-[10px] font-black">
                          ✗ {item.vecesFallada} {item.vecesFallada === 1 ? 'fallo' : 'fallos'}
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400">
                          {item.ultimaFechaFallo}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (4/12): Panel de Lanzamiento y Configuración del Test */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900/70 rounded-2xl p-5 shadow-sm space-y-4 sticky top-20">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
                <span className="text-[10px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                  Configuración del Simulacro de Fallos
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  Preparar Test de Repaso
                </h3>
              </div>

              {/* Número de preguntas */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 font-mono block">
                  Número de Preguntas del Test
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([5, 10, 15, 20, 30, 'todas'] as const).map((cant) => (
                    <button
                      key={String(cant)}
                      type="button"
                      onClick={() => setCantidadPreguntas(cant)}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-black transition-all cursor-pointer ${
                        cantidadPreguntas === cant
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {cant === 'todas' ? `Todas (${preguntasFiltradasPool.length})` : `${cant} preg.`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridad de selección */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 font-mono block">
                  Prioridad de Selección
                </label>
                <select
                  value={ordenPreguntas}
                  onChange={(e) => setOrdenPreguntas(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="mas_falladas">🔥 Más veces falladas primero</option>
                  <option value="recientes">🕒 Falladas más recientemente primero</option>
                  <option value="aleatorio">🎲 Selección aleatoria del bloque filtrado</option>
                </select>
              </div>

              {/* Modalidad de corrección */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 font-mono block">
                  Modalidad de Corrección
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalidadCorreccion('paso_a_paso')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      modalidadCorreccion === 'paso_a_paso'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-black'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>⚡ Corrección inmediata + Justificación BOE</span>
                    {modalidadCorreccion === 'paso_a_paso' && <i className="fa-solid fa-check text-indigo-600"></i>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalidadCorreccion('final')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      modalidadCorreccion === 'final'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-black'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>📋 Modo Examen Oficial (corregir al finalizar)</span>
                    {modalidadCorreccion === 'final' && <i className="fa-solid fa-check text-indigo-600"></i>}
                  </button>
                </div>
              </div>

              {/* Activar Reloj */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    Cronómetro de Tiempo Invertido
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    Se registrará en el resumen final y en el historial
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={relojActivado}
                  onChange={(e) => setRelojActivado(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Título opcional */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black uppercase text-slate-500 font-mono block">
                  Título en el Historial (Opcional)
                </label>
                <input
                  type="text"
                  value={tituloPersonalizado}
                  onChange={(e) => setTituloPersonalizado(e.target.value)}
                  placeholder="Ej. Repaso Fallos Ley 39/2015 y TREBEP"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Nota informativa de cómputo en Historial */}
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 leading-snug flex items-start gap-2">
                <i className="fa-solid fa-circle-info text-amber-600 mt-0.5 shrink-0"></i>
                <span>
                  Al finalizar, este test computará como un <strong>nuevo test realizado en el Historial</strong> y actualizará tus métricas, pero <strong>no se añadirá al Banco de Exámenes</strong>.
                </span>
              </div>

              <button
                type="button"
                disabled={preguntasFiltradasPool.length === 0}
                onClick={handleIniciarTestFalladas}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-play"></i>
                <span>
                  Comenzar Test de Falladas (
                  {cantidadPreguntas === 'todas'
                    ? preguntasFiltradasPool.length
                    : Math.min(Number(cantidadPreguntas), preguntasFiltradasPool.length)}{' '}
                  preg.)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA VINCULAR / CAMBIAR LEYES O TEMÁTICA DE UNA PREGUNTA FALLADA */}
      {preguntaParaSelectorLeyes && (
        <SelectorLeyesEInformaticaModal
          isOpen={true}
          onClose={() => setPreguntaParaSelectorLeyes(null)}
          seleccionadasIniciales={
            preguntaParaSelectorLeyes.leyesRelacionadas &&
            preguntaParaSelectorLeyes.leyesRelacionadas.length > 0
              ? preguntaParaSelectorLeyes.leyesRelacionadas
              : preguntaParaSelectorLeyes.justificacionLegal?.norma &&
                !esNormaGenerica(preguntaParaSelectorLeyes.justificacionLegal.norma)
              ? [preguntaParaSelectorLeyes.justificacionLegal.norma]
              : []
          }
          onGuardar={(nuevasLeyes) => {
            const nuevaNorma =
              nuevasLeyes.length > 0
                ? nuevasLeyes[0]
                : obtenerNormaEfectivaDePregunta({
                    ...preguntaParaSelectorLeyes,
                    leyesRelacionadas: [],
                    justificacionLegal: {
                      ...(preguntaParaSelectorLeyes.justificacionLegal || {}),
                      norma: '',
                    },
                  });

            const pregActualizada: PreguntaExamen = {
              ...preguntaParaSelectorLeyes,
              leyesRelacionadas: nuevasLeyes,
              justificacionLegal: {
                ...(preguntaParaSelectorLeyes.justificacionLegal || {
                  articulo: 'Precepto aplicable',
                  fundamento: '',
                }),
                norma: nuevaNorma,
              },
            };

            if (testActivo) {
              setTestActivo((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  preguntas: prev.preguntas.map((p) =>
                    p.enunciado === preguntaParaSelectorLeyes.enunciado ? pregActualizada : p
                  ),
                };
              });
            }

            if (onActualizarPreguntaGlobal) {
              onActualizarPreguntaGlobal(pregActualizada);
            }

            setPreguntaParaSelectorLeyes(null);
          }}
          tituloModal="Catalogar Pregunta por Ley BOE o Informática"
          subtituloModal={`Asigna la ley o bloque de informática a «${preguntaParaSelectorLeyes.enunciado.slice(0, 65)}...»`}
        />
      )}
    </div>
  );
};
