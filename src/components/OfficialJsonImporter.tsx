import React, { useState, useMemo } from 'react';
import { ExamenCompleto, CategoriaExamen, ConvocatoriaAmbito } from '../types';
import { EXAMENES_PRECARGADOS_OFICIALES, PLANTILLA_JSON_EJEMPLO } from '../constants/boeData';
import {
  parsearTextoOArchivoJSON,
  exportarExamenAJSON,
  asegurarSeparacionYNormativaReserva,
  eliminarReservasYConvertirATodasOrdinarias,
  CATEGORIAS_EXAMEN_LISTA,
  CATEGORIAS_EXAMEN_INFO,
  AMBITOS_LISTA,
  AMBITOS_INFO,
  deducirCategoriaExamen,
  auditarExamenDesdeTexto,
  AuditoriaExamenImportado,
} from '../utils/jsonExamHelper';
import { SelectorLeyesEInformaticaModal } from './SelectorLeyesEInformaticaModal';
import {
  CATEGORIAS_TEMARIO_PROGRESO,
  CategoriaTemarioId,
  clasificarExamenEnCategoriasTemario,
  coincideBusquedaExamenConSeparacionOficial,
  esCatalogacionPruebaOficial,
  esNormaGenerica,
  ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL,
  ETIQUETA_CATALOGACION_TEST_OFICIAL,
  obtenerLeyesNormalizadasDeExamen,
  obtenerNormaEfectivaDePregunta,
} from '../utils/tematicaClassifier';

interface OfficialJsonImporterProps {
  onExamenCargado: (examen: ExamenCompleto) => void;
  onIniciarExamenInmediato?: (examen: ExamenCompleto) => void;
  examenesImportados: ExamenCompleto[];
  onEliminarExamen: (id: string, titulo?: string) => void;
  onCambiarCategoriaExamen?: (examenId: string, nuevaCategoria: CategoriaExamen) => void;
  onCambiarAmbitoExamen?: (examenId: string, nuevoAmbito: ConvocatoriaAmbito) => void;
  onCambiarLeyesExamen?: (examenId: string, nuevasLeyes: string[]) => void;
  onRenombrarExamen?: (examenId: string, tituloActual: string) => void;
  examenesEliminadosIds?: string[];
  historialPruebas?: ExamenCompleto[];
  onVerHistorialDeTest?: (testBaseId: string) => void;
}

export const OfficialJsonImporter: React.FC<OfficialJsonImporterProps> = ({
  onExamenCargado,
  onIniciarExamenInmediato,
  examenesImportados,
  onEliminarExamen,
  onCambiarCategoriaExamen,
  onCambiarAmbitoExamen,
  onCambiarLeyesExamen,
  onRenombrarExamen,
  examenesEliminadosIds = [],
  historialPruebas = [],
  onVerHistorialDeTest,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [eliminarReservasSiNoConstan, setEliminarReservasSiNoConstan] = useState(false);
  const [forzarSinReservas, setForzarSinReservas] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [copiadoPlantilla, setCopiadoPlantilla] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mostrarPlantilla, setMostrarPlantilla] = useState(false);
  const [examenEditando, setExamenEditando] = useState<ExamenCompleto | null>(null);
  const [examenEditandoLeyes, setExamenEditandoLeyes] = useState<ExamenCompleto | null>(null);
  const [mostrarSelectorLeyesImportacion, setMostrarSelectorLeyesImportacion] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');

  // Estado del proceso guiado de importación y auditoría
  const [modalImportacion, setModalImportacion] = useState<{
    fase: 'procesando' | 'auditado';
    auditoria: AuditoriaExamenImportado;
    pasoActual: number;
    tituloEditado: string;
    categoriaSeleccionada: CategoriaExamen;
    ambitoSeleccionado: ConvocatoriaAmbito;
    leyesSeleccionadas: string[];
    mostrarPreguntas: boolean;
  } | null>(null);

  const timerProcesoRef = React.useRef<NodeJS.Timeout[]>([]);

  const limpiarTimers = () => {
    timerProcesoRef.current.forEach((t) => clearTimeout(t));
    timerProcesoRef.current = [];
  };

  // Estados de vista, búsqueda, filtrado y ordenación
  const [vistaBanco, setVistaBanco] = useState<'listado' | 'tarjetas'>('listado');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | CategoriaExamen>('todos');
  const [filtroAmbito, setFiltroAmbito] = useState<'todos' | ConvocatoriaAmbito>('todos');
  const [filtroBloqueTematico, setFiltroBloqueTematico] = useState<'todos' | CategoriaTemarioId>('todos');
  const [filtroLeyBanco, setFiltroLeyBanco] = useState<'todas' | string>('todas');
  const [columnaOrden, setColumnaOrden] = useState<'titulo' | 'categoria' | 'ambito' | 'preguntas' | 'fecha'>('titulo');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');
  const [paginaActual, setPaginaActual] = useState(1);
  const REGISTROS_POR_PAGINA = 10;

  const procesarTextoJSON = (texto: string) => {
    setErrorValidacion(null);
    setMensajeExito(null);
    limpiarTimers();

    if (!texto || texto.trim().length < 20) {
      setErrorValidacion('El archivo o texto está vacío o no contiene suficientes caracteres para un examen.');
      return;
    }

    try {
      const auditoria = auditarExamenDesdeTexto(texto, {
        eliminarReservasSiNoConstan,
        forzarSinReservas,
      });

      // Inicializar el modal en fase de procesamiento visual
      setModalImportacion({
        fase: 'procesando',
        auditoria,
        pasoActual: 1,
        tituloEditado: auditoria.examen.titulo,
        categoriaSeleccionada: auditoria.categoriaSugerida,
        ambitoSeleccionado: auditoria.ambitoDetectado,
        leyesSeleccionadas: auditoria.examen.leyesBOEAplicadas || [],
        mostrarPreguntas: false,
      });

      // Secuencia de animación de análisis por etapas
      const t1 = setTimeout(() => {
        setModalImportacion((prev) => (prev ? { ...prev, pasoActual: 2 } : null));
      }, 250);

      const t2 = setTimeout(() => {
        setModalImportacion((prev) => (prev ? { ...prev, pasoActual: 3 } : null));
      }, 500);

      const t3 = setTimeout(() => {
        setModalImportacion((prev) => (prev ? { ...prev, pasoActual: 4 } : null));
      }, 750);

      const t4 = setTimeout(() => {
        setModalImportacion((prev) => (prev ? { ...prev, fase: 'auditado' } : null));
      }, 1000);

      timerProcesoRef.current = [t1, t2, t3, t4];
    } catch (err: any) {
      setErrorValidacion(
        `Error al interpretar el examen: ${err.message || 'Formato no reconocido'}. Verifica que las preguntas tengan formato "1.a pregunta." u opciones "a), b), c) y d)".`
      );
    }
  };

  const construirExamenImportadoConLeyes = (): ExamenCompleto | null => {
    if (!modalImportacion) return null;
    const { auditoria, tituloEditado, categoriaSeleccionada, ambitoSeleccionado, leyesSeleccionadas } = modalImportacion;
    const tituloFinal = tituloEditado.trim() || auditoria.examen.titulo;
    const leyesFinales =
      leyesSeleccionadas && leyesSeleccionadas.length > 0
        ? leyesSeleccionadas
        : (auditoria.examen.leyesBOEAplicadas || []).filter((l) => !esNormaGenerica(l));

    const catalogadoComoTestOficial = leyesFinales.some(
      (l) => l === ETIQUETA_CATALOGACION_TEST_OFICIAL
    );
    const catalogadoComoSupuestoOficial = leyesFinales.some(
      (l) => l === ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL
    );
    const categoriaFinal: CategoriaExamen = catalogadoComoTestOficial
      ? 'test_oficial'
      : catalogadoComoSupuestoOficial
      ? 'supuesto_oficial'
      : categoriaSeleccionada;

    const leyesParaPreguntas = leyesFinales.filter((l) => !esCatalogacionPruebaOficial(l));

    const examenBase: ExamenCompleto = {
      ...auditoria.examen,
      titulo: tituloFinal,
      categoria: categoriaFinal,
      ambito: ambitoSeleccionado,
      leyesBOEAplicadas: leyesFinales.length > 0 ? leyesFinales : auditoria.examen.leyesBOEAplicadas || [],
    };

    const preguntasEnriquecidas = examenBase.preguntas.map((p) => {
      const normaActual = p.justificacionLegal?.norma;
      const tieneLeyesPropias =
        p.leyesRelacionadas && p.leyesRelacionadas.some((l) => !esNormaGenerica(l) && !esCatalogacionPruebaOficial(l));
      const nuevaNorma =
        normaActual && !esNormaGenerica(normaActual) && !esCatalogacionPruebaOficial(normaActual)
          ? normaActual
          : leyesParaPreguntas.length === 1
          ? leyesParaPreguntas[0]
          : obtenerNormaEfectivaDePregunta(p, examenBase);
      return {
        ...p,
        leyesRelacionadas: tieneLeyesPropias
          ? p.leyesRelacionadas
          : leyesParaPreguntas.length > 0
          ? leyesParaPreguntas
          : [nuevaNorma],
        justificacionLegal: {
          ...(p.justificacionLegal || { articulo: 'Precepto aplicable', fundamento: '' }),
          norma: nuevaNorma,
        },
      };
    });

    return {
      ...examenBase,
      preguntas: preguntasEnriquecidas,
    };
  };

  const confirmarGuardarEnBanco = () => {
    if (!modalImportacion) return;
    try {
      const examenFinal = construirExamenImportadoConLeyes();
      if (examenFinal) {
        onExamenCargado(examenFinal);
        setMensajeExito(
          `¡Examen "${examenFinal.titulo}" guardado exitosamente en tu banco de pruebas con categoría "${CATEGORIAS_EXAMEN_INFO[examenFinal.categoria || 'test_oficial'].label}"!`
        );
      }
    } catch (err: any) {
      console.error('Error al confirmar guardado en banco:', err);
    } finally {
      setModalImportacion(null);
      setJsonText('');
    }
  };

  const confirmarYComenzarTest = () => {
    if (!modalImportacion) return;
    try {
      const examenFinal = construirExamenImportadoConLeyes();
      if (examenFinal) {
        if (onIniciarExamenInmediato) {
          onIniciarExamenInmediato(examenFinal);
        } else {
          onExamenCargado(examenFinal);
        }
      }
    } catch (err: any) {
      console.error('Error al confirmar e iniciar test:', err);
    } finally {
      setModalImportacion(null);
      setJsonText('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      procesarTextoJSON(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.json') && !lowerName.endsWith('.txt')) {
      setErrorValidacion('Por favor, arrastra un archivo con extensión .json o .txt.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event: any) => {
      procesarTextoJSON(event.target.result);
    };
    reader.readAsText(file);
  };

  const cargarExamenPrecargado = (examen: ExamenCompleto) => {
    const normalizado = asegurarSeparacionYNormativaReserva(examen);
    if (onIniciarExamenInmediato) {
      onIniciarExamenInmediato(normalizado);
    } else {
      onExamenCargado(normalizado);
    }
  };

  const descargarPlantilla = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(PLANTILLA_JSON_EJEMPLO, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'plantilla_examen_oficial.json';
    a.click();
  };

  // Unificar exámenes precargados con los guardados/importados (excluyendo los expresamente eliminados por el usuario)
  const todosLosExamenes = useMemo(() => {
    const map = new Map<string, ExamenCompleto>();
    EXAMENES_PRECARGADOS_OFICIALES.forEach((ex) => {
      if (!examenesEliminadosIds.includes(ex.id)) {
        map.set(ex.id, ex);
      }
    });
    examenesImportados.forEach((ex) => {
      if (!examenesEliminadosIds.includes(ex.id)) {
        map.set(ex.id, ex);
      }
    });
    return Array.from(map.values());
  }, [examenesImportados, examenesEliminadosIds]);

  // Conteos por categoría
  const conteoPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {
      todos: todosLosExamenes.length,
      test_oficial: 0,
      test_academia: 0,
      test_ia: 0,
      supuesto_oficial: 0,
      supuesto_academia: 0,
      supuesto_ia: 0,
    };
    todosLosExamenes.forEach((ex) => {
      const cat = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [todosLosExamenes]);

  // Catálogo dinámico de leyes / normas presentes en los exámenes del banco
  const leyesDisponiblesBanco = useMemo(() => {
    const setLeyes = new Set<string>();
    todosLosExamenes.forEach((ex) => {
      obtenerLeyesNormalizadasDeExamen(ex).forEach((l) => setLeyes.add(l));
    });
    return Array.from(setLeyes).sort((a, b) => a.localeCompare(b));
  }, [todosLosExamenes]);

  // Filtrado y ordenación
  const examenesFiltradosYOrdenados = useMemo(() => {
    let lista = [...todosLosExamenes];

    // 1. Búsqueda por texto (con separación estricta entre pruebas oficiales y tests por leyes/temas)
    if (busqueda.trim()) {
      lista = lista.filter((ex) => coincideBusquedaExamenConSeparacionOficial(ex, busqueda));
    }

    // 2. Filtro de Categoría
    if (filtroCategoria !== 'todos') {
      lista = lista.filter((ex) => {
        const cat = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
        return cat === filtroCategoria;
      });
    }

    // 3. Filtro de Ámbito
    if (filtroAmbito !== 'todos') {
      lista = lista.filter((ex) => ex.ambito === filtroAmbito);
    }

    // 4. Filtro de Bloque Temático / Informática
    if (filtroBloqueTematico !== 'todos') {
      lista = lista.filter((ex) =>
        clasificarExamenEnCategoriasTemario(ex).includes(filtroBloqueTematico)
      );
    }

    // 5. Filtro de Ley / Norma BOE o Informática
    if (filtroLeyBanco !== 'todas') {
      lista = lista.filter((ex) =>
        obtenerLeyesNormalizadasDeExamen(ex).includes(filtroLeyBanco)
      );
    }

    // 6. Ordenación
    lista.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      switch (columnaOrden) {
        case 'titulo':
          valA = a.titulo.toLowerCase();
          valB = b.titulo.toLowerCase();
          break;
        case 'categoria': {
          const catA = a.categoria || deducirCategoriaExamen(a.tipo, a.origen);
          const catB = b.categoria || deducirCategoriaExamen(b.tipo, b.origen);
          valA = CATEGORIAS_EXAMEN_INFO[catA]?.label || '';
          valB = CATEGORIAS_EXAMEN_INFO[catB]?.label || '';
          break;
        }
        case 'ambito':
          valA = a.ambito;
          valB = b.ambito;
          break;
        case 'fecha':
          valA = a.fecha || '';
          valB = b.fecha || '';
          break;
        case 'preguntas':
          valA = a.preguntas.length;
          valB = b.preguntas.length;
          break;
      }
      if (valA < valB) return direccionOrden === 'asc' ? -1 : 1;
      if (valA > valB) return direccionOrden === 'asc' ? 1 : -1;
      return 0;
    });

    return lista;
  }, [todosLosExamenes, busqueda, filtroCategoria, filtroAmbito, filtroBloqueTematico, filtroLeyBanco, columnaOrden, direccionOrden]);

  React.useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCategoria, filtroAmbito, filtroBloqueTematico, filtroLeyBanco, columnaOrden, direccionOrden]);

  const totalPaginas = Math.max(1, Math.ceil(examenesFiltradosYOrdenados.length / REGISTROS_POR_PAGINA));

  const examenesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    return examenesFiltradosYOrdenados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [examenesFiltradosYOrdenados, paginaActual]);

  const renderPaginacionBanco = (posicion: 'superior' | 'inferior') => {
    if (examenesFiltradosYOrdenados.length === 0) return null;
    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 ${
          posicion === 'superior'
            ? 'pb-2.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/80'
            : 'pt-3 border-t border-slate-100 dark:border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Mostrando <strong className="text-slate-800 dark:text-slate-200">{(paginaActual - 1) * REGISTROS_POR_PAGINA + 1}</strong> - <strong className="text-slate-800 dark:text-slate-200">{Math.min(paginaActual * REGISTROS_POR_PAGINA, examenesFiltradosYOrdenados.length)}</strong> de <strong className="text-indigo-600 dark:text-indigo-400">{examenesFiltradosYOrdenados.length}</strong> exámenes
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="font-mono text-[11px] text-slate-500">
            Página <strong className="text-slate-800 dark:text-slate-200">{paginaActual}</strong> de {totalPaginas}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Flecha Página Arriba (Anterior) */}
          <button
            type="button"
            onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
            disabled={paginaActual <= 1}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página anterior (Página arriba)"
          >
            <i className="fa-solid fa-chevron-up text-[10px] text-indigo-600 dark:text-indigo-400"></i>
            <span>▲ Pág. Arriba</span>
          </button>

          {/* Selector numérico de páginas */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
              .map((p, idx, arr) => {
                const prevP = arr[idx - 1];
                const separator = prevP && p - prevP > 1 ? (
                  <span key={`sep-banco-${posicion}-${p}`} className="px-1 text-slate-400 font-mono">...</span>
                ) : null;
                return (
                  <React.Fragment key={p}>
                    {separator}
                    <button
                      type="button"
                      onClick={() => setPaginaActual(p)}
                      className={`h-7 min-w-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        paginaActual === p
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          {/* Flecha Página Abajo (Siguiente) */}
          <button
            type="button"
            onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
            disabled={paginaActual >= totalPaginas}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página siguiente (Página abajo)"
          >
            <span>▼ Pág. Abajo</span>
            <i className="fa-solid fa-chevron-down text-[10px] text-indigo-600 dark:text-indigo-400"></i>
          </button>
        </div>
      </div>
    );
  };

  const toggleOrdenColumna = (col: typeof columnaOrden) => {
    if (columnaOrden === col) {
      setDireccionOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColumnaOrden(col);
      setDireccionOrden(col === 'fecha' ? 'desc' : 'asc');
    }
  };

  const filtrosActivos =
    busqueda.trim() !== '' ||
    filtroCategoria !== 'todos' ||
    filtroAmbito !== 'todos' ||
    filtroBloqueTematico !== 'todos' ||
    filtroLeyBanco !== 'todas';

  const resetearFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('todos');
    setFiltroAmbito('todos');
    setFiltroBloqueTematico('todos');
    setFiltroLeyBanco('todas');
  };

  const cambiarCategoria = (id: string, cat: CategoriaExamen) => {
    if (onCambiarCategoriaExamen) {
      onCambiarCategoriaExamen(id, cat);
    } else {
      const ex = todosLosExamenes.find((e) => e.id === id);
      if (ex) {
        onExamenCargado({ ...ex, categoria: cat });
      }
    }
  };

  const cambiarAmbito = (id: string, amb: ConvocatoriaAmbito) => {
    if (onCambiarAmbitoExamen) {
      onCambiarAmbitoExamen(id, amb);
    } else {
      const ex = todosLosExamenes.find((e) => e.id === id);
      if (ex) {
        onExamenCargado({ ...ex, ambito: amb });
      }
    }
  };

  const cambiarLeyes = (id: string, nuevasLeyes: string[]) => {
    if (onCambiarLeyesExamen) {
      onCambiarLeyesExamen(id, nuevasLeyes);
    } else {
      const ex = todosLosExamenes.find((e) => e.id === id);
      if (ex) {
        onExamenCargado({ ...ex, leyesBOEAplicadas: nuevasLeyes });
      }
    }
  };

  const abrirRenombrar = (ex: ExamenCompleto) => {
    if (onRenombrarExamen) {
      onRenombrarExamen(ex.id, ex.titulo);
    } else {
      setExamenEditando(ex);
      setNuevoTitulo(ex.titulo);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono">
                Banco de Exámenes
              </span>
              <span className="text-[9px] font-bold text-slate-400">AGE & Comunidad de Madrid · Fuente BOE</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              Banco de Exámenes: Repositorio Oficial y Pruebas para Realizar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5">
              Base de datos única e independiente de exámenes disponibles para realizar. Importa nuevos exámenes en JSON/TXT, gestiona tus plantillas oficiales y practica tantas veces como quieras. Cada prueba completada se archiva en tu Historial de Pruebas sin duplicarse en este banco.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarPlantilla(!mostrarPlantilla)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-code text-[11px] text-indigo-500"></i>
              {mostrarPlantilla ? 'Ocultar Estructura' : 'Ver Estructura JSON'}
            </button>
            <button
              onClick={descargarPlantilla}
              className="py-2 px-3 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-download text-[11px]"></i>
              Descargar Plantilla
            </button>
          </div>
        </div>

        {/* Modal/Box with sample JSON schema */}
        {mostrarPlantilla && (
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-2 border border-slate-700 font-mono text-xs">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Estructura JSON esperada (compatible con el simulador BOE):</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(PLANTILLA_JSON_EJEMPLO, null, 2));
                  setCopiadoPlantilla(true);
                  setTimeout(() => setCopiadoPlantilla(false), 3000);
                }}
                className="text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                {copiadoPlantilla ? '✓ ¡Copiado!' : 'Copiar Ejemplo'}
              </button>
            </div>
            <pre className="overflow-x-auto p-2 bg-slate-950 rounded text-[11px] max-h-56 leading-relaxed">
              {JSON.stringify(PLANTILLA_JSON_EJEMPLO, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Upload Zone & Paste Area Grid - Resaltados con jerarquía visual intuitiva */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Box 1: Drag & Drop and File Input */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-between gap-3 cursor-pointer shadow-xs ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 scale-[1.01]'
              : 'border-indigo-300/80 dark:border-indigo-800/80 bg-linear-to-b from-indigo-50/40 via-white to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 hover:border-indigo-400 dark:hover:border-indigo-600'
          }`}
          onClick={() => document.getElementById('json-file-input')?.click()}
        >
          <div className="w-full flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9.5px] font-black uppercase tracking-wider font-mono shadow-2xs">
              <i className="fa-solid fa-folder-open mr-1 text-[8.5px]"></i>
              Método 1: Archivo Local
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">
              .JSON / .TXT
            </span>
          </div>

          <div className="h-13 w-13 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shadow-xs ring-4 ring-indigo-500/10 my-1">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Cargar o arrastrar examen oficial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Haz clic para examinar tus carpetas o suelta tu archivo directamente
            </p>
          </div>

          <div className="w-full pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex flex-col gap-1 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <i className="fa-solid fa-circle-check text-[9px]"></i>
              Autodetección de reservas (R1-R5, Reserva 1-5, [RESERVA])
            </span>
            <span className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 text-[9.5px]">
              <i className="fa-solid fa-scale-balanced text-indigo-500 text-[9px]"></i>
              Soporte de párrafos normativos largos sin mezclar líneas
            </span>
          </div>

          <input
            id="json-file-input"
            type="file"
            accept=".json,.txt,text/plain"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Box 2: Paste JSON Text Directly */}
        <div className="bg-linear-to-b from-slate-50/70 via-white to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 border border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 dark:bg-slate-700 text-white text-[9.5px] font-black uppercase tracking-wider font-mono shadow-2xs">
                <i className="fa-solid fa-paste mr-1 text-[8.5px]"></i>
                Método 2: Pegar Texto o Código
              </span>
              <button
                onClick={() => setJsonText('')}
                className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Limpiar cuadro de texto"
              >
                <i className="fa-solid fa-trash-can text-[9px]"></i>
                <span>Limpiar</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Pega aquí el contenido en formato JSON o texto plano (.txt con formato 1. Pregunta a), b), c), d), reservas R1-R5 y plantilla 1.b, 2.a)..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 shadow-inner"
            ></textarea>

            {/* Opciones de Preguntas de Reserva en la Importación */}
            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/60 text-xs">
              <label className="flex items-start gap-2 cursor-pointer select-none text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={forzarSinReservas}
                  onChange={(e) => {
                    setForzarSinReservas(e.target.checked);
                    if (e.target.checked) setEliminarReservasSiNoConstan(false);
                  }}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[11px] block text-amber-900 dark:text-amber-200">
                    Forzar sin preguntas de reserva al importar
                  </span>
                  <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 block leading-tight">
                    Por defecto se detectan y conservan las reservas oficiales (R1-R5). Marca esta casilla solo si deseas forzar que todas se califiquen como ordinarias.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {errorValidacion && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-500"></i>
              <span className="font-medium">{errorValidacion}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-500"></i>
              <span className="font-medium">{mensajeExito}</span>
            </div>
          )}

          <div className="flex justify-end items-center pt-1">
            <button
              onClick={() => procesarTextoJSON(jsonText)}
              disabled={!jsonText.trim()}
              className="w-full sm:w-auto py-2 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-bolt text-[11px] text-amber-300"></i>
              <span>Validar y Cargar en el Banco</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANCO DE EXÁMENES OFICIALES: FILTROS, VISTAS Y ETIQUETADO */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Cabecera del Banco con Toggle Listado / Tarjetas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-indigo-600"></i>
              Baterías del Banco de Exámenes ({examenesFiltradosYOrdenados.length})
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Repositorio de pruebas únicas listas para realizar. Cada realización genera un intento archivado en tu Historial sin duplicar el examen en esta base.
            </p>
          </div>

          {/* Toggle Vista: Listado vs Tarjetas */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setVistaBanco('listado')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                vistaBanco === 'listado'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Ver formato listado con filtros y etiquetado"
            >
              <i className="fa-solid fa-table-list text-[11px]"></i>
              <span>Listado</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaBanco('tarjetas')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                vistaBanco === 'tarjetas'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Ver en formato tarjetas"
            >
              <i className="fa-solid fa-grip text-[11px]"></i>
              <span>Tarjetas</span>
            </button>
          </div>
        </div>

        {/* Panel de Filtros: Búsqueda, Ámbito y Categorías */}
        <div className="p-3.5 bg-gradient-to-r from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-850 dark:via-slate-850 dark:to-indigo-950/20 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
          {/* Header de filtros */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <i className="fa-solid fa-filter text-[9px]"></i>
                Filtros del Banco
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {examenesFiltradosYOrdenados.length} disponibles
              </span>
            </div>
            {filtrosActivos && (
              <button
                type="button"
                onClick={resetearFiltros}
                className="py-0.5 px-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Restablecer filtros"
              >
                <i className="fa-solid fa-filter-circle-xmark text-[9px]"></i>
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          {/* Fila 1: Buscador de texto y selector de ámbito */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, ID, norma BOE o caso fáctico..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors shadow-2xs"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro Ámbito */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 text-xs flex-wrap shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase font-mono">Ámbito:</span>
                <button
                  type="button"
                  onClick={() => setFiltroAmbito('todos')}
                  className={`py-0.5 px-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                    filtroAmbito === 'todos'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos
                </button>
                {AMBITOS_LISTA.map((amb) => (
                  <button
                    key={amb.id}
                    type="button"
                    onClick={() => setFiltroAmbito(amb.id)}
                    className={`py-0.5 px-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                      filtroAmbito === amb.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={amb.label}
                  >
                    {amb.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fila 2: Filtro por Categorías con conteos dinámicos */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <span className="text-[10px] font-black text-slate-400 uppercase font-mono mr-1">
              Categoría:
            </span>
            <button
              type="button"
              onClick={() => setFiltroCategoria('todos')}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                filtroCategoria === 'todos'
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white shadow-2xs font-black'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span>Todos</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {conteoPorCategoria.todos}
              </span>
            </button>

            {CATEGORIAS_EXAMEN_LISTA.map((cat) => {
              const info = CATEGORIAS_EXAMEN_INFO[cat.id];
              const activo = filtroCategoria === cat.id;
              const count = conteoPorCategoria[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFiltroCategoria(cat.id)}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    activo
                      ? `${info.bgBadge} ${info.textBadge} ${info.borderBadge} ring-2 ring-indigo-500/30 shadow-2xs font-black`
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <i className={`fa-solid ${info.icon} text-[10px]`}></i>
                  <span>{info.label}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fila 3: Filtro por Bloque Temático / Informática y por Ley / Norma Concreta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase font-mono shrink-0">
                <i className="fa-solid fa-layer-group text-indigo-500 mr-1"></i>
                Temática:
              </span>
              <select
                value={filtroBloqueTematico}
                onChange={(e) => setFiltroBloqueTematico(e.target.value as any)}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="todos">Todas las categorías temáticas C1 (Legislación e Informática)</option>
                {CATEGORIAS_TEMARIO_PROGRESO.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.sigla} · {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase font-mono shrink-0">
                <i className="fa-solid fa-scale-balanced text-amber-500 mr-1"></i>
                Ley / Materia:
              </span>
              <select
                value={filtroLeyBanco}
                onChange={(e) => setFiltroLeyBanco(e.target.value)}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="todas">Todas las leyes BOE y materias de Informática ({leyesDisponiblesBanco.length})</option>
                {leyesDisponiblesBanco.map((ley) => (
                  <option key={ley} value={ley}>
                    {ley}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CONTENIDO: VISTA LISTADO O VISTA TARJETAS */}
        {examenesFiltradosYOrdenados.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <i className="fa-solid fa-filter text-2xl text-slate-300 dark:text-slate-600"></i>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Ningún examen coincide con los filtros aplicados en el banco oficial.
            </p>
            <p className="text-[11px] text-slate-400">
              Prueba a limpiar la búsqueda o cambiar la categoría seleccionada.
            </p>
            <button
              type="button"
              onClick={resetearFiltros}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <>
            {renderPaginacionBanco('superior')}
            {vistaBanco === 'listado' ? (
              /* VISTA LISTADO ALINEADO SIN BARRAS DE DESPLAZAMIENTO */
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-xs overflow-hidden no-scrollbar">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 select-none">
                      {/* 1. Examen / Convocatoria (acotado para priorizar espacio a las acciones y leyes) */}
                      <th
                        onClick={() => toggleOrdenColumna('titulo')}
                        className={`py-2.5 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors ${
                          columnaOrden === 'titulo' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                        }`}
                        title="Ordenar por título"
                      >
                        <div className="flex items-center gap-1">
                          <span>Examen / Convocatoria</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'titulo' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 2. Categoría */}
                      <th
                        onClick={() => toggleOrdenColumna('categoria')}
                        className={`py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[140px] ${
                          columnaOrden === 'categoria' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                        }`}
                        title="Reasignar o filtrar por categoría"
                      >
                        <div className="flex items-center gap-1">
                          <span>Categoría</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'categoria' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 3. Ámbito */}
                      <th
                        onClick={() => toggleOrdenColumna('ambito')}
                        className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[115px] ${
                          columnaOrden === 'ambito' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                        }`}
                        title="Reasignar o filtrar por ámbito"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Ámbito</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'ambito' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 4. Preguntas */}
                      <th
                        onClick={() => toggleOrdenColumna('preguntas')}
                        className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[65px] ${
                          columnaOrden === 'preguntas' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                        }`}
                        title="Número de preguntas"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Preg.</span>
                          <span className="text-[9px] font-mono">
                            {columnaOrden === 'preguntas' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>

                      {/* 5. Normas BOE e Informática (ancho suficiente de 240px sin colisión) */}
                      <th className="py-2.5 px-3 text-left hidden xl:table-cell w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <span>Leyes BOE</span>
                          <span className="text-[8px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-1 rounded">
                            C1 AGE
                          </span>
                        </div>
                      </th>

                      {/* 6. Acciones (ancho fijo de 210px garantizando separación total) */}
                      <th className="py-2.5 px-3 text-right w-[210px] min-w-[210px]">
                        <span>Acciones</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {examenesPaginados.map((item) => {
                      const totalOrd = item.preguntas.filter((p) => !p.esReserva).length;
                      const totalRes = item.preguntas.filter((p) => p.esReserva).length;
                      const categoriaActual: CategoriaExamen = item.categoria || deducirCategoriaExamen(item.tipo, item.origen);
                      const catInfo = CATEGORIAS_EXAMEN_INFO[categoriaActual];

                      const intentos = (historialPruebas || []).filter(
                        (h) => h.testBaseId === item.id || h.id === item.id
                      );
                      const tieneIntentos = intentos.length > 0;
                      const mejorPD = tieneIntentos
                        ? Math.max(...intentos.map((i) => Number(i.resultado?.puntuacionDirecta || 0)))
                        : 0;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                        >
                          {/* 1. Título, Fecha, Metadatos y Acceso a Historial */}
                          <td className="py-2 px-3 overflow-hidden">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-bold text-slate-900 dark:text-white leading-tight truncate text-xs block"
                                  title={item.titulo}
                                >
                                  {item.titulo}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => abrirRenombrar(item)}
                                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer shrink-0"
                                  title="Renombrar este examen"
                                >
                                  <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                  <i className="fa-regular fa-calendar-days text-[9px]"></i>
                                  {item.fecha || 'Sin fecha'}
                                </span>
                                <span>•</span>
                                <span className="truncate max-w-[100px]">ID: {item.id.substring(0, 10)}</span>
                                {item.contextoCaso && (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold truncate max-w-[140px]">
                                    • Caso fáctico
                                  </span>
                                )}
                              </div>
                              {/* Chip de Estado / Enlace al Historial de Intentos */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {!tieneIntentos ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                    Sin realizar
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onVerHistorialDeTest?.(item.id)}
                                    className="px-2 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                    title={`Ver los ${intentos.length} intentos realizados en el Historial`}
                                  >
                                    <i className="fa-solid fa-clock-rotate-left text-[8px] text-indigo-500"></i>
                                    <span>{intentos.length} {intentos.length === 1 ? 'intento' : 'intentos'}</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                      Mejor: {mejorPD.toFixed(2)} PD
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400 text-[8px] underline">Historial ↗</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Selector de Categoría (Etiquetado) */}
                          <td className="py-2 px-2 whitespace-nowrap overflow-hidden">
                            <div className="relative inline-block w-full">
                              <div
                                className={`inline-flex items-center justify-between w-full gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer shadow-2xs ${catInfo.bgBadge} ${catInfo.textBadge} ${catInfo.borderBadge}`}
                                title="Haz clic para reasignar la categoría oficial"
                              >
                                <span className="truncate flex items-center gap-1">
                                  <i className={`fa-solid ${catInfo.icon} text-[9px]`}></i>
                                  <span className="truncate">{catInfo.label}</span>
                                </span>
                                <i className="fa-solid fa-chevron-down text-[7.5px] opacity-70 shrink-0"></i>
                              </div>

                              <select
                                value={categoriaActual}
                                onChange={(e) => cambiarCategoria(item.id, e.target.value as CategoriaExamen)}
                                aria-label={`Cambiar categoría para ${item.titulo}`}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              >
                                {CATEGORIAS_EXAMEN_LISTA.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* 3. Selector de Ámbito (Etiquetado) */}
                          <td className="py-2 px-1.5 text-center whitespace-nowrap overflow-hidden">
                            <div className="relative inline-block w-full">
                              <div
                                className={`inline-flex items-center justify-between w-full gap-1 px-1.5 py-1 rounded-md text-[9.5px] font-bold border transition-all cursor-pointer shadow-2xs ${
                                  (AMBITOS_INFO[item.ambito] || AMBITOS_INFO['AGE']).badgeClass
                                }`}
                                title="Haz clic para reasignar el ámbito"
                              >
                                <span className="truncate flex items-center gap-1">
                                  <i className={`fa-solid ${(AMBITOS_INFO[item.ambito] || AMBITOS_INFO['AGE']).icon} text-[8.5px]`}></i>
                                  <span className="truncate">
                                    {(AMBITOS_INFO[item.ambito] || AMBITOS_INFO['AGE']).label}
                                  </span>
                                </span>
                                <i className="fa-solid fa-chevron-down text-[7px] opacity-70 shrink-0"></i>
                              </div>

                              <select
                                value={item.ambito || 'AGE'}
                                onChange={(e) => cambiarAmbito(item.id, e.target.value as ConvocatoriaAmbito)}
                                aria-label={`Cambiar ámbito para ${item.titulo}`}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              >
                                {AMBITOS_LISTA.map((amb) => (
                                  <option key={amb.id} value={amb.id}>
                                    {amb.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* 4. Preguntas */}
                          <td className="py-2 px-1.5 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {totalOrd}
                            </span>
                            {totalRes > 0 && (
                              <span
                                className="block text-[8.5px] font-mono font-bold text-amber-600 dark:text-amber-400"
                                title={`${totalRes} preguntas de reserva`}
                              >
                                +{totalRes} res.
                              </span>
                            )}
                          </td>

                          {/* 5. Leyes BOE aplicadas y temario de informática (perfectamente acotado y separado) */}
                          <td className="py-2 px-3 hidden xl:table-cell overflow-hidden">
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              {(() => {
                                const leyesMostrar = obtenerLeyesNormalizadasDeExamen(item);
                                return (
                                  <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                                    {leyesMostrar.length > 0 ? (
                                      leyesMostrar.slice(0, 1).map((ley, idx) => {
                                        const esOficial = esCatalogacionPruebaOficial(ley);
                                        return (
                                          <span
                                            key={idx}
                                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[135px] ${
                                              esOficial
                                                ? ley === ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL
                                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold'
                                                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                            title={ley}
                                          >
                                            {esOficial && <i className="fa-solid fa-building-columns mr-1 text-[8px]"></i>}
                                            {ley}
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="text-[9.5px] text-slate-400 italic">Temario C1</span>
                                    )}
                                    {leyesMostrar.length > 1 && (
                                      <span className="text-[8.5px] font-mono text-slate-400 shrink-0">
                                        +{leyesMostrar.length - 1}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={() => setExamenEditandoLeyes(item)}
                                className="h-6 px-2 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                title="Catalogar como Test oficial, Supuesto oficial, leyes BOE o temas de informática"
                              >
                                <i className="fa-solid fa-tags text-[8px]"></i>
                                <span>Catalogar</span>
                              </button>
                            </div>
                          </td>

                          {/* 6. Acciones con slots de ancho fijo rigurosamente alineados y sin colisiones */}
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 w-full">
                              {/* Slot 1: Botón tijeras si tiene reservas, o espaciador fijo */}
                              {item.preguntas.some((p) => p.esReserva) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sinRes = eliminarReservasYConvertirATodasOrdinarias(item);
                                    onExamenCargado(sinRes);
                                    setMensajeExito(`¡Preguntas de reserva eliminadas en "${item.titulo}"! Ahora todas son ordinarias.`);
                                  }}
                                  className="h-7 w-7 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                  title="Eliminar preguntas de reserva (convertir todas a ordinarias)"
                                >
                                  <i className="fa-solid fa-scissors text-[9px]"></i>
                                </button>
                              ) : (
                                <span className="w-7 h-7 inline-block shrink-0" aria-hidden="true"></span>
                              )}

                              {/* Slot 2: Exportar JSON */}
                              <button
                                type="button"
                                onClick={() => exportarExamenAJSON(item)}
                                className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 shrink-0"
                                title="Exportar examen a JSON"
                              >
                                <i className="fa-solid fa-file-arrow-down text-[10px]"></i>
                              </button>

                              {/* Slot 3: Eliminar */}
                              <button
                                type="button"
                                onClick={() => onEliminarExamen(item.id, item.titulo)}
                                className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800 shrink-0"
                                title="Eliminar examen del banco"
                              >
                                <i className="fa-solid fa-trash-can text-[10px]"></i>
                              </button>

                              {/* Slot 4: Iniciar (ancho fijo para alineación vertical idéntica en toda la tabla) */}
                              <button
                                type="button"
                                onClick={() => cargarExamenPrecargado(item)}
                                className="w-[76px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                title="Cargar y resolver examen"
                              >
                                <span>Iniciar</span>
                                <i className="fa-solid fa-play text-[8px]"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
          /* VISTA TARJETAS CON ETIQUETADO INTEGRADO */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {examenesPaginados.map((ex) => {
              const categoriaActual: CategoriaExamen = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
              const catInfo = CATEGORIAS_EXAMEN_INFO[categoriaActual];

              return (
                <div
                  key={ex.id}
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 shadow-xs border-l-4 border-l-sky-500 group"
                >
                  <div className="space-y-2">
                    {/* Selectores de Categoría y Ámbito en Tarjeta */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Categoría Selector */}
                        <div className="relative inline-block">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8.5px] font-black border transition-all cursor-pointer ${catInfo.bgBadge} ${catInfo.textBadge} ${catInfo.borderBadge}`}
                          >
                            <i className={`fa-solid ${catInfo.icon} text-[8px]`}></i>
                            <span>{catInfo.label}</span>
                            <i className="fa-solid fa-chevron-down text-[6.5px] opacity-70"></i>
                          </div>
                          <select
                            value={categoriaActual}
                            onChange={(e) => cambiarCategoria(ex.id, e.target.value as CategoriaExamen)}
                            aria-label={`Cambiar categoría para ${ex.titulo}`}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          >
                            {CATEGORIAS_EXAMEN_LISTA.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Ámbito Selector */}
                        <div className="relative inline-block">
                          <div
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-black border transition-all cursor-pointer ${
                              (AMBITOS_INFO[ex.ambito] || AMBITOS_INFO['AGE']).badgeClass
                            }`}
                          >
                            <span>{(AMBITOS_INFO[ex.ambito] || AMBITOS_INFO['AGE']).label}</span>
                            <i className="fa-solid fa-chevron-down text-[6.5px] opacity-70"></i>
                          </div>
                          <select
                            value={ex.ambito || 'AGE'}
                            onChange={(e) => cambiarAmbito(ex.id, e.target.value as ConvocatoriaAmbito)}
                            aria-label={`Cambiar ámbito para ${ex.titulo}`}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          >
                            {AMBITOS_LISTA.map((amb) => (
                              <option key={amb.id} value={amb.id}>
                                {amb.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono text-slate-400 font-bold">{ex.fecha}</span>
                    </div>

                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {ex.titulo}
                      </h4>
                      <button
                        type="button"
                        onClick={() => abrirRenombrar(ex)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 cursor-pointer shrink-0"
                        title="Renombrar este examen"
                      >
                        <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="line-clamp-1" title={obtenerLeyesNormalizadasDeExamen(ex).join(', ')}>
                        Catalogación: {obtenerLeyesNormalizadasDeExamen(ex).join(', ') || 'Temario oficial C1'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExamenEditandoLeyes(ex)}
                        className="text-[9.5px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold shrink-0 flex items-center gap-0.5 cursor-pointer"
                        title="Catalogar como Test oficial, Supuesto oficial, leyes BOE o temas de informática"
                      >
                        <i className="fa-solid fa-tags text-[8.5px]"></i>
                        <span>Catalogar</span>
                      </button>
                    </div>

                    {/* Indicador de Intentos en Historial */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const intentos = (historialPruebas || []).filter(
                          (h) => h.testBaseId === ex.id || h.id === ex.id
                        );
                        if (intentos.length === 0) {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              Sin realizar
                            </span>
                          );
                        }
                        const mejorPD = Math.max(
                          ...intentos.map((i) => Number(i.resultado?.puntuacionDirecta || 0))
                        );
                        return (
                          <>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <i className="fa-solid fa-clock-rotate-left text-[8px]"></i>
                              <span>{intentos.length} {intentos.length === 1 ? 'intento' : 'intentos'}</span>
                            </span>
                            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Mejor: {mejorPD.toFixed(2)} PD
                            </span>
                          </>
                        );
                      })()}
                    </div>

                    {ex.contextoCaso && (
                      <p className="text-[9px] text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20 p-1.5 rounded border border-amber-200 dark:border-amber-800/50 line-clamp-2">
                        <i className="fa-solid fa-scroll mr-1"></i>
                        {ex.contextoCaso.substring(0, 110)}...
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span>{ex.preguntas.filter((p) => !p.esReserva).length} Preguntas</span>
                      {ex.preguntas.some((p) => p.esReserva) && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                          + {ex.preguntas.filter((p) => p.esReserva).length} Reserva
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {ex.preguntas.some((p) => p.esReserva) && (
                        <button
                          type="button"
                          onClick={() => {
                            const sinRes = eliminarReservasYConvertirATodasOrdinarias(ex);
                            onExamenCargado(sinRes);
                            setMensajeExito(`¡Preguntas de reserva eliminadas en "${ex.titulo}"! Ahora todas son ordinarias.`);
                          }}
                          className="h-7 px-2 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center gap-1 text-[9.5px] font-bold transition-colors cursor-pointer"
                          title="Convertir todas las preguntas de reserva a ordinarias"
                        >
                          <i className="fa-solid fa-scissors text-[9px]"></i>
                          <span>Quitar reservas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirRenombrar(ex)}
                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
                        title="Renombrar examen"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => exportarExamenAJSON(ex)}
                        className="h-7 px-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                        title="Exportar examen a archivo .json"
                      >
                        <i className="fa-solid fa-file-code text-[10px] text-indigo-500"></i>
                        <span>Exportar</span>
                      </button>
                      <button
                        onClick={() => onEliminarExamen(ex.id, ex.titulo)}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors text-xs cursor-pointer"
                        title="Eliminar examen del banco"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                      {(() => {
                        const intentos = (historialPruebas || []).filter(
                          (h) => h.testBaseId === ex.id || h.id === ex.id
                        );
                        if (intentos.length === 0 || !onVerHistorialDeTest) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => onVerHistorialDeTest(ex.id)}
                            className="py-1 px-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            title={`Ver los ${intentos.length} intentos en el Historial`}
                          >
                            <i className="fa-solid fa-clock-rotate-left text-[8px]"></i>
                            <span>Historial ({intentos.length})</span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => cargarExamenPrecargado(ex)}
                        className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Realizar Prueba</span>
                        <i className="fa-solid fa-play text-[8px]"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {renderPaginacionBanco('inferior')}
          </>
        )}
      </div>

      {/* MODAL DE RENOMBRAR EXAMEN EN IMPORTADOR */}
      {examenEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-sm font-bold shrink-0">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Renombrar Examen
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Modifica el nombre oficial o descriptivo del examen
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Nuevo Título
              </label>
              <input
                type="text"
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                placeholder="Nombre del examen..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExamenEditando(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!nuevoTitulo.trim()}
                onClick={() => {
                  try {
                    onExamenCargado({ ...examenEditando, titulo: nuevoTitulo.trim() });
                  } catch (err) {
                    console.error('Error al renombrar examen:', err);
                  } finally {
                    setExamenEditando(null);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-check text-[11px]"></i>
                <span>Guardar Nombre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROCESO Y AUDITORÍA DE IMPORTACIÓN TXT / JSON */}
      {modalImportacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                    modalImportacion.fase === 'procesando'
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 animate-pulse'
                      : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      modalImportacion.fase === 'procesando' ? 'fa-arrows-rotate fa-spin' : 'fa-clipboard-check'
                    }`}
                  ></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {modalImportacion.fase === 'procesando'
                        ? 'Procesando Archivo de Examen'
                        : 'Auditoría y Confirmación de Examen'}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Formato .TXT / .JSON
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {modalImportacion.fase === 'procesando'
                      ? 'Analizando enunciados (1.a pregunta), opciones (a, b, c, d) y plantilla (1.b, 2.a)...'
                      : 'Verifica los datos del test antes de guardarlo en tu banco oficial.'}
                  </p>
                </div>
              </div>

              {modalImportacion.fase === 'auditado' && (
                <button
                  type="button"
                  onClick={() => setModalImportacion(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  <i className="fa-solid fa-xmark text-base"></i>
                </button>
              )}
            </div>

            {/* FASE 1: PROCESANDO Y ANALIZANDO EN VIVO */}
            {modalImportacion.fase === 'procesando' && (
              <div className="py-6 px-4 space-y-6">
                <div className="space-y-4">
                  {[
                    {
                      paso: 1,
                      label: 'Lectura y normalización del documento (.txt / .json)',
                      desc: 'Validando codificación de caracteres y saltos de línea',
                    },
                    {
                      paso: 2,
                      label: 'Detección de preguntas ("1.a pregunta.", "1.", "Pregunta 1...")',
                      desc: `${modalImportacion.auditoria.totalPreguntas} preguntas identificadas`,
                    },
                    {
                      paso: 3,
                      label: 'Extracción de opciones de respuesta ("a), b), c) y d)")',
                      desc: 'Validando 4 alternativas por pregunta',
                    },
                    {
                      paso: 4,
                      label: 'Localización y vinculación de plantilla ("1.b, 2.a...")',
                      desc: `${modalImportacion.auditoria.totalClavesPlantilla} soluciones oficiales vinculadas`,
                    },
                  ].map((p) => {
                    const completado = modalImportacion.pasoActual >= p.paso;
                    const enCurso = modalImportacion.pasoActual === p.paso - 1;
                    return (
                      <div key={p.paso} className="flex items-start gap-3.5">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 font-bold transition-all ${
                            completado
                              ? 'bg-emerald-500 text-white'
                              : enCurso
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                          }`}
                        >
                          {completado ? (
                            <i className="fa-solid fa-check"></i>
                          ) : enCurso ? (
                            <i className="fa-solid fa-spinner fa-spin text-[10px]"></i>
                          ) : (
                            p.paso
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div
                            className={`text-xs font-bold ${
                              completado
                                ? 'text-slate-900 dark:text-white'
                                : enCurso
                                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                                : 'text-slate-400'
                            }`}
                          >
                            {p.label}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {p.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Barra de progreso visual */}
                <div className="space-y-1.5 pt-2">
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(modalImportacion.pasoActual / 4) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Paso {modalImportacion.pasoActual} de 4</span>
                    <span>{Math.round((modalImportacion.pasoActual / 4) * 100)}% completado</span>
                  </div>
                </div>
              </div>
            )}

            {/* FASE 2: RESUMEN AUDITADO Y VISTA PREVIA */}
            {modalImportacion.fase === 'auditado' && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Formulario de metadatos del examen */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Título o Nombre del Examen
                    </label>
                    <input
                      type="text"
                      value={modalImportacion.tituloEditado}
                      onChange={(e) =>
                        setModalImportacion((prev) =>
                          prev ? { ...prev, tituloEditado: e.target.value } : null
                        )
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Título oficial o descriptivo..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Categoría
                      </label>
                      <select
                        value={modalImportacion.categoriaSeleccionada}
                        onChange={(e) =>
                          setModalImportacion((prev) =>
                            prev ? { ...prev, categoriaSeleccionada: e.target.value as CategoriaExamen } : null
                          )
                        }
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {CATEGORIAS_EXAMEN_LISTA.map((catItem) => (
                          <option key={catItem.id} value={catItem.id}>
                            {catItem.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Ámbito Territorial
                      </label>
                      <select
                        value={modalImportacion.ambitoSeleccionado}
                        onChange={(e) =>
                          setModalImportacion((prev) =>
                            prev ? { ...prev, ambitoSeleccionado: e.target.value as ConvocatoriaAmbito } : null
                          )
                        }
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {AMBITOS_LISTA.map((ambItem) => (
                          <option key={ambItem.id} value={ambItem.id}>
                            {ambItem.label} ({ambItem.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selector de Leyes y Temario de Informática en la Importación */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Leyes y Normas BOE / Temario de Informática ({modalImportacion.leyesSeleccionadas.length} asignadas)
                      </label>
                      <button
                        type="button"
                        onClick={() => setMostrarSelectorLeyesImportacion(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[9.5px]"></i>
                        <span>Seleccionar de toda la legislación e informática</span>
                      </button>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[42px] flex items-center flex-wrap gap-1.5">
                      {modalImportacion.leyesSeleccionadas && modalImportacion.leyesSeleccionadas.length > 0 ? (
                        modalImportacion.leyesSeleccionadas.map((ley, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-800 dark:text-indigo-200 font-medium"
                          >
                            <span className="truncate max-w-[200px]">{ley}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setModalImportacion((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        leyesSeleccionadas: prev.leyesSeleccionadas.filter((_, i) => i !== idx),
                                      }
                                    : null
                                );
                              }}
                              className="hover:text-rose-500 p-0.5 cursor-pointer shrink-0"
                            >
                              <i className="fa-solid fa-xmark text-[9px]"></i>
                            </button>
                          </span>
                        ))
                      ) : (
                        <div className="flex items-center justify-between w-full text-slate-400 text-[11px] italic">
                          <span>Sin leyes o temas específicos asignados todavía.</span>
                          <button
                            type="button"
                            onClick={() => setMostrarSelectorLeyesImportacion(true)}
                            className="text-indigo-600 dark:text-indigo-400 font-bold not-italic hover:underline cursor-pointer"
                          >
                            + Asignar ahora
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tarjetas de auditoría técnica */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-2xs">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Preguntas Detectadas
                    </span>
                    <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                      {modalImportacion.auditoria.totalPreguntas}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {modalImportacion.auditoria.totalOrdinarias} ord. + {modalImportacion.auditoria.totalReservas} res.
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/80 p-3 rounded-xl shadow-2xs">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Plantilla Oficial
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {modalImportacion.auditoria.porcentajePlantillaEmparejada}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {modalImportacion.auditoria.totalClavesPlantilla} claves encontradas
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-2xs">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Tipo de Cuestionario
                    </span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {modalImportacion.auditoria.tipoDetectado === 'supuesto' ? 'Supuesto Práctico' : 'Test Teórico C1'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      4 alternativas por pregunta
                    </span>
                  </div>
                </div>

                {/* Visualización de la plantilla extraída (1.b, 2.a...) */}
                {modalImportacion.auditoria.clavesMuestra.length > 0 && (
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-key text-[10px] text-amber-500"></i>
                        <span>Claves de Plantilla Extraídas (Formato 1.b, 2.a):</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Total {modalImportacion.auditoria.totalClavesPlantilla} claves
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                      {modalImportacion.auditoria.clavesMuestra.map((c) => (
                        <span
                          key={c.num}
                          className="inline-flex items-center gap-1 py-0.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300"
                        >
                          <span className="text-slate-400">{c.num}.</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">{c.letra}</span>
                        </span>
                      ))}
                      {modalImportacion.auditoria.totalClavesPlantilla >
                        modalImportacion.auditoria.clavesMuestra.length && (
                        <span className="text-[10px] text-slate-400 self-center font-mono">
                          +{modalImportacion.auditoria.totalClavesPlantilla -
                            modalImportacion.auditoria.clavesMuestra.length}{' '}
                          más...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Acordeón para previsualizar las preguntas y respuestas */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setModalImportacion((prev) =>
                        prev ? { ...prev, mostrarPreguntas: !prev.mostrarPreguntas } : null
                      )
                    }
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-list-ol text-indigo-500"></i>
                      <span>
                        Ver Preguntas y Opciones Detectadas ({modalImportacion.auditoria.totalPreguntas})
                      </span>
                    </span>
                    <i
                      className={`fa-solid fa-chevron-down transition-transform ${
                        modalImportacion.mostrarPreguntas ? 'rotate-180' : ''
                      }`}
                    ></i>
                  </button>

                  {modalImportacion.mostrarPreguntas && (
                    <div className="p-3 max-h-56 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                      {modalImportacion.auditoria.examen.preguntas.slice(0, 15).map((p, pIdx) => (
                        <div key={p.id} className="pt-2 first:pt-0 space-y-1.5 text-xs">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono mr-1.5">
                              {p.esReserva ? `R${p.numeroReserva || pIdx + 1}.` : `${p.id}.`}
                            </span>
                            {p.enunciado}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4">
                            {p.opciones.map((o) => (
                              <div
                                key={o.id}
                                className={`py-1 px-2 rounded-lg text-[11px] flex items-start gap-1.5 ${
                                  o.esCorrecta
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <span className="font-mono font-bold shrink-0">{o.id})</span>
                                <span>{o.texto}</span>
                                {o.esCorrecta && (
                                  <i className="fa-solid fa-circle-check text-emerald-500 text-[10px] ml-auto shrink-0 mt-0.5"></i>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {modalImportacion.auditoria.examen.preguntas.length > 15 && (
                        <div className="text-center py-2 text-[11px] text-slate-400 font-mono">
                          ... y {modalImportacion.auditoria.examen.preguntas.length - 15} preguntas más validadas con sus 4 opciones.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer con botones de confirmación */}
            {modalImportacion.fase === 'auditado' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setModalImportacion(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={confirmarGuardarEnBanco}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-folder-plus text-[11px]"></i>
                    <span>Guardar en Banco de Exámenes</span>
                  </button>

                  <button
                    type="button"
                    onClick={confirmarYComenzarTest}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-play text-[10px]"></i>
                    <span>Guardar y Comenzar Test Ahora</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE LEGISLACIÓN E INFORMÁTICA PARA UN EXAMEN DEL BANCO */}
      {examenEditandoLeyes && (
        <SelectorLeyesEInformaticaModal
          isOpen={!!examenEditandoLeyes}
          onClose={() => setExamenEditandoLeyes(null)}
          seleccionadasIniciales={obtenerLeyesNormalizadasDeExamen(examenEditandoLeyes)}
          onGuardar={(nuevasLeyes) => {
            cambiarLeyes(examenEditandoLeyes.id, nuevasLeyes);
            setExamenEditandoLeyes(null);
            setMensajeExito(`Catalogación actualizada en "${examenEditandoLeyes.titulo}" (${nuevasLeyes.join(', ')}).`);
          }}
          tituloModal={`Catalogar Examen: ${examenEditandoLeyes.titulo}`}
          subtituloModal="Catalógalo como Test oficial o Supuesto oficial (para separarlo de búsquedas por leyes), o asigna sus leyes BOE y temas de informática"
        />
      )}

      {/* MODAL DE SELECCIÓN DE LEGISLACIÓN E INFORMÁTICA PARA EL EXAMEN EN IMPORTACIÓN */}
      {mostrarSelectorLeyesImportacion && modalImportacion && (
        <SelectorLeyesEInformaticaModal
          isOpen={mostrarSelectorLeyesImportacion}
          onClose={() => setMostrarSelectorLeyesImportacion(false)}
          seleccionadasIniciales={modalImportacion.leyesSeleccionadas || []}
          onGuardar={(nuevasLeyes) => {
            setModalImportacion((prev) =>
              prev ? { ...prev, leyesSeleccionadas: nuevasLeyes } : null
            );
            setMostrarSelectorLeyesImportacion(false);
          }}
          tituloModal="Seleccionar Legislación C1 AGE y Temario de Informática para la Importación"
          subtituloModal="Estas leyes y temas de informática quedarán asignados a este examen importado"
        />
      )}
    </div>
  );
};
