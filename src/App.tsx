import React, { useState, useEffect, useMemo } from 'react';
import {
  ExamenCompleto,
  CategoriaExamen,
  ConvocatoriaAmbito,
  ItemAlmacenDuda,
  PreguntaExamen,
  DocumentoBibliotecaItem,
} from './types';
import { AITestGenerator } from './components/AITestGenerator';
import { SeccionSimulacroOficial } from './components/SeccionSimulacroOficial';
import { OfficialJsonImporter } from './components/OfficialJsonImporter';
import { GraficoEvolucionPT } from './components/GraficoEvolucionPT';
import { SeccionAnaliticaKPIs } from './components/SeccionAnaliticaKPIs';
import { SeccionBibliotecaView } from './components/SeccionBibliotecaView';
import { ProgresoTematicoDiarioWidget } from './components/ProgresoTematicoDiarioWidget';
import { SeccionTestPreguntasFalladas } from './components/SeccionTestPreguntasFalladas';
import { SelectorLeyesEInformaticaModal } from './components/SelectorLeyesEInformaticaModal';
import { ExportarExamenPdfModal } from './components/ExportarExamenPdfModal';
import {
  exportarExamenYPlantillaOficialPDF,
  ResultadoGeneracionPDFOficial,
} from './utils/officialPdfExporter';
import {
  CATEGORIAS_TEMARIO_PROGRESO,
  CategoriaTemarioId,
  clasificarExamenEnCategoriasTemario,
  coincideBusquedaExamenConSeparacionOficial,
  esCatalogacionPruebaOficial,
  esNormaGenerica,
  ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL,
  ETIQUETA_CATALOGACION_TEST_OFICIAL,
  extraerPreguntasFalladasConsolidadas,
  normalizarClavePregunta,
  obtenerLeyesNormalizadasDeExamen,
  obtenerNormaEfectivaDePregunta,
  registrarRespuestasEnControlFalladas,
} from './utils/tematicaClassifier';
import {
  exportarExamenAJSON,
  parsearTextoOArchivoJSON,
  descargarCopiaSeguridadCompleta,
  restaurarCopiaSeguridadCompleta,
  asegurarSeparacionYNormativaReserva,
  CATEGORIAS_EXAMEN_LISTA,
  CATEGORIAS_EXAMEN_INFO,
  AMBITOS_LISTA,
  AMBITOS_INFO,
  deducirCategoriaExamen,
  guardarEnLocalStorageSeguro,
  guardarRecursosArgumentacionDePregunta,
  obtenerRecursosArgumentacionDePregunta,
  leerBibliotecaDocumentosDeLocalStorage,
  guardarBibliotecaDocumentosEnLocalStorage,
  leerSubtemasBibliotecaDeLocalStorage,
  guardarSubtemasBibliotecaEnLocalStorage,
  calcularResultadoExamenConReservas,
} from './utils/jsonExamHelper';
import { EXAMENES_PRECARGADOS_OFICIALES } from './constants/boeData';

export default function App() {
  const [tabActiva, setTabActiva] = useState<'generador' | 'test_falladas' | 'simulacro_oficial' | 'importar_json' | 'historial' | 'analisis' | 'almacen_dudas'>('generador');
  const [categoriaFalladasPreseleccionada, setCategoriaFalladasPreseleccionada] = useState<CategoriaTemarioId | null>(null);
  const [versionFalladasApp, setVersionFalladasApp] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // BASE DE DATOS 1: Banco de Exámenes (plantillas únicas para realizar, independientes del historial)
  const [bancoExamenes, setBancoExamenes] = useState<ExamenCompleto[]>([]);

  // BASE DE DATOS 2: Historial de Pruebas Realizadas (intentos y sesiones completadas con resultado)
  const [historialPruebas, setHistorialPruebas] = useState<ExamenCompleto[]>([]);

  // BASE DE DATOS 3: Biblioteca — Pestaña 1 (Almacén de dudas) y Pestaña 2 (Base de datos de documentos y enlaces, sin archivos binarios)
  const [almacenDudas, setAlmacenDudas] = useState<ItemAlmacenDuda[]>(() => {
    try {
      const saved = localStorage.getItem('c1_almacen_dudas');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [bibliotecaDocumentos, setBibliotecaDocumentos] = useState<DocumentoBibliotecaItem[]>(() =>
    leerBibliotecaDocumentosDeLocalStorage()
  );

  const [subtemasBiblioteca, setSubtemasBiblioteca] = useState<string[]>(() =>
    leerSubtemasBibliotecaDeLocalStorage()
  );

  const [examenSeleccionadoParaTest, setExamenSeleccionadoParaTest] = useState<ExamenCompleto | null>(null);
  const [examenAEliminar, setExamenAEliminar] = useState<{ id: string; titulo: string; tipo: 'banco' | 'historial' } | null>(null);
  const [mostrarModalBackup, setMostrarModalBackup] = useState<boolean>(false);
  const [mostrarModalVersion, setMostrarModalVersion] = useState<boolean>(false);
  const [examenEditandoLeyesHistorial, setExamenEditandoLeyesHistorial] = useState<ExamenCompleto | null>(null);
  const [exportacionPDFActiva, setExportacionPDFActiva] = useState<{
    examen: ExamenCompleto;
    paquete: ResultadoGeneracionPDFOficial;
  } | null>(null);
  const [toastNotificacion, setToastNotificacion] = useState<{ texto: string; tipo: 'exito' | 'error' | 'info' } | null>(null);

  // History format toggle ('listado' with all metrics vs 'tarjetas')
  const [vistaHistorial, setVistaHistorial] = useState<'listado' | 'tarjetas'>('listado');
  const [examenARenombrar, setExamenARenombrar] = useState<{ id: string; titulo: string } | null>(null);
  const [nuevoNombreInput, setNuevoNombreInput] = useState<string>('');
  const [examenRecuperarPregunta, setExamenRecuperarPregunta] = useState<ExamenCompleto | null>(null);

  // History filtering & sorting state
  const [busquedaHistorial, setBusquedaHistorial] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | CategoriaExamen>('todos');
  const [filtroAmbito, setFiltroAmbito] = useState<'todos' | 'AGE' | 'CAM' | 'AMBOS'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'apto' | 'no_apto' | 'pendiente'>('todos');
  const [filtroTematicaHistorial, setFiltroTematicaHistorial] = useState<'todos' | CategoriaTemarioId>('todos');
  const [filtroLeyHistorial, setFiltroLeyHistorial] = useState<'todas' | string>('todas');
  const [filtroFechaTipo, setFiltroFechaTipo] = useState<'todos' | 'hoy' | 'semana' | 'mes' | 'rango'>('todos');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');
  const [columnaOrden, setColumnaOrden] = useState<'titulo' | 'categoria' | 'ambito' | 'fecha' | 'preguntas' | 'pd' | 'pt' | 'calificacion'>('fecha');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('desc');
  const [paginaActualHistorial, setPaginaActualHistorial] = useState<number>(1);
  const REGISTROS_POR_PAGINA_HISTORIAL = 10;

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    setToastNotificacion({ texto, tipo });
    setTimeout(() => setToastNotificacion(null), 4000);
  };

  const handleExportarExamenAPDF = (examen: ExamenCompleto) => {
    try {
      const paquete = exportarExamenYPlantillaOficialPDF(examen);
      setExportacionPDFActiva({ examen, paquete });
      mostrarToast(
        `Exportado "${examen.titulo}" en PDF oficial + Plantilla de hoja de respuestas en blanco.`,
        'exito'
      );
    } catch (err) {
      console.error('Error al exportar examen a PDF oficial:', err);
      mostrarToast('No se pudo generar la exportación en PDF de esta prueba.', 'error');
    }
  };

  const [examenesEliminadosIds, setExamenesEliminadosIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('c1_examenes_eliminados');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Carga y migración limpia: Banco de Exámenes (único) e Historial de Pruebas (independiente)
  useEffect(() => {
    const savedDark = localStorage.getItem('c1_dark_mode') === 'true';
    setIsDarkMode(savedDark);
    if (savedDark) document.documentElement.classList.add('dark');

    const eliminados = localStorage.getItem('c1_examenes_eliminados');
    const idsEliminados: string[] = eliminados ? JSON.parse(eliminados) : [];

    const savedBanco = localStorage.getItem('c1_banco_examenes');
    const savedHistorial = localStorage.getItem('c1_historial_pruebas');
    const legacySaved = localStorage.getItem('c1_examenes_guardados');

    let loadedBanco: ExamenCompleto[] = [];
    let loadedHistorial: ExamenCompleto[] = [];

    if (savedBanco || savedHistorial) {
      if (savedBanco) {
        try {
          const parsed = JSON.parse(savedBanco);
          if (Array.isArray(parsed)) {
            loadedBanco = parsed
              .filter((e) => !idsEliminados.includes(e.id))
              .map((e) => asegurarSeparacionYNormativaReserva(e));
          }
        } catch (e) {
          console.error('Error cargando banco de exámenes:', e);
        }
      }
      if (savedHistorial) {
        try {
          const parsed = JSON.parse(savedHistorial);
          if (Array.isArray(parsed)) {
            loadedHistorial = parsed.map((e) => asegurarSeparacionYNormativaReserva(e));
          }
        } catch (e) {
          console.error('Error cargando historial de pruebas:', e);
        }
      }
    } else if (legacySaved) {
      // Migración automática de versión anterior: separar banco e historial
      try {
        const parsed = JSON.parse(legacySaved);
        if (Array.isArray(parsed)) {
          parsed.forEach((raw) => {
            const ex = asegurarSeparacionYNormativaReserva(raw);
            if (ex.resultado) {
              loadedHistorial.push(ex);
            }
            const baseId = ex.testBaseId || ex.id.replace(/-intento-\d+$/, '');
            if (!idsEliminados.includes(baseId) && !idsEliminados.includes(ex.id)) {
              if (!loadedBanco.some((b) => b.id === baseId)) {
                const tituloBase = ex.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
                loadedBanco.push({
                  ...ex,
                  id: baseId,
                  titulo: tituloBase,
                  resultado: undefined,
                });
              }
            }
          });
          localStorage.setItem('c1_banco_examenes', JSON.stringify(loadedBanco));
          localStorage.setItem('c1_historial_pruebas', JSON.stringify(loadedHistorial));
        }
      } catch (e) {
        console.error('Error en migración automática de base de datos:', e);
      }
    }

    // Asegurar que los exámenes oficiales precargados están en el banco si no han sido eliminados
    EXAMENES_PRECARGADOS_OFICIALES.forEach((precargado) => {
      if (!idsEliminados.includes(precargado.id) && !loadedBanco.some((b) => b.id === precargado.id)) {
        loadedBanco.push(asegurarSeparacionYNormativaReserva(precargado));
      }
    });

    setBancoExamenes(loadedBanco);
    setHistorialPruebas(loadedHistorial);
    try {
      localStorage.setItem('c1_banco_examenes', JSON.stringify(loadedBanco));
    } catch (_) {}
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem('c1_dark_mode', String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sincroniza el estado de preguntas acertadas/falladas con el Almacén de Dudas y el registro de superadas
  const handleRegistrarResultadoPreguntas = (
    preguntas: PreguntaExamen[],
    respuestas: Record<number, string>
  ) => {
    if (!Array.isArray(preguntas) || !respuestas) return;
    registrarRespuestasEnControlFalladas(preguntas, respuestas);

    const clavesAcertadas = new Set<string>();
    const clavesFalladas = new Set<string>();

    preguntas.forEach((p, idx) => {
      const resp = respuestas[idx];
      if (!resp) return;
      const corr = p.opciones?.find((o) => o.esCorrecta)?.id;
      const clave = normalizarClavePregunta(p.enunciado);
      if (!clave) return;
      if (resp === corr) {
        clavesAcertadas.add(clave);
      } else {
        clavesFalladas.add(clave);
      }
    });

    if (clavesAcertadas.size > 0 || clavesFalladas.size > 0) {
      setAlmacenDudas((prev) => {
        let huboCambio = false;
        const next = prev.map((item) => {
          const k = normalizarClavePregunta(item.enunciado);
          if (clavesAcertadas.has(k) && (item.esFallada || !item.resuelta)) {
            huboCambio = true;
            return {
              ...item,
              esFallada: false,
              resuelta: true,
              fechaActualizacion: new Date().toISOString(),
            };
          }
          if (clavesFalladas.has(k) && (!item.esFallada || item.resuelta)) {
            huboCambio = true;
            return {
              ...item,
              esFallada: true,
              resuelta: false,
              fechaActualizacion: new Date().toISOString(),
            };
          }
          return item;
        });
        if (huboCambio) {
          try {
            localStorage.setItem('c1_almacen_dudas', JSON.stringify(next));
          } catch (_) {}
        }
        return huboCambio ? next : prev;
      });
    }

    setVersionFalladasApp((v) => v + 1);
  };

  // Manejador central: Separa exámenes para realizar (Banco) de intentos evaluados (Historial)
  const handleExamenGuardado = (nuevoExamen: ExamenCompleto) => {
    try {
      const esExclusivoHistorial =
        Boolean(nuevoExamen.soloHistorial) ||
        nuevoExamen.id.startsWith('FALLADAS-') ||
        nuevoExamen.id.startsWith('SIMULACRO-OFICIAL-');

      if (nuevoExamen.resultado) {
        // Actualizar inmediatamente el control de preguntas falladas con las respuestas de este test
        handleRegistrarResultadoPreguntas(
          nuevoExamen.preguntas,
          (nuevoExamen.resultado.respuestasUsuario || {}) as Record<number, string>
        );

        // 1. Guardar SIEMPRE como un nuevo test en el Historial de Pruebas Realizadas
        const updatedHistorial = [
          nuevoExamen,
          ...historialPruebas.filter((h) => h.id !== nuevoExamen.id),
        ];
        setHistorialPruebas(updatedHistorial);
        guardarEnLocalStorageSeguro('c1_historial_pruebas', updatedHistorial);

        // 2. Si NO es un test exclusivo de preguntas falladas o simulacro a medida, asegurar plantilla en el Banco de Exámenes
        if (!esExclusivoHistorial) {
          const baseId = nuevoExamen.testBaseId || nuevoExamen.id.replace(/-intento-\d+$/, '');
          const yaEnBanco = bancoExamenes.some((b) => b.id === baseId || b.id === nuevoExamen.id);
          if (!yaEnBanco) {
            const tituloBase = nuevoExamen.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
            const plantillaBase: ExamenCompleto = {
              ...asegurarSeparacionYNormativaReserva(nuevoExamen),
              id: baseId,
              titulo: tituloBase,
              resultado: undefined,
            };
            const updatedBanco = [plantillaBase, ...bancoExamenes.filter((b) => b.id !== baseId)];
            setBancoExamenes(updatedBanco);
            guardarEnLocalStorageSeguro('c1_banco_examenes', updatedBanco);
          }
        }
      } else if (!esExclusivoHistorial) {
        // Es una plantilla o examen para realizar -> guardar en Banco de Exámenes
        const masterId = nuevoExamen.testBaseId || nuevoExamen.id;
        const tituloBase = nuevoExamen.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
        const plantilla: ExamenCompleto = {
          ...asegurarSeparacionYNormativaReserva(nuevoExamen),
          id: masterId,
          titulo: tituloBase,
          resultado: undefined,
        };
        const updatedBanco = [plantilla, ...bancoExamenes.filter((b) => b.id !== masterId)];
        setBancoExamenes(updatedBanco);
        guardarEnLocalStorageSeguro('c1_banco_examenes', updatedBanco);
      }
    } catch (err) {
      console.error('Error al guardar examen en handleExamenGuardado:', err);
    }
  };

  const solicitarEliminarExamen = (
    id: string,
    titulo?: string,
    tipo: 'banco' | 'historial' = 'banco'
  ) => {
    const exam = tipo === 'banco'
      ? (bancoExamenes.find((e) => e.id === id) || EXAMENES_PRECARGADOS_OFICIALES.find((e) => e.id === id))
      : historialPruebas.find((e) => e.id === id);

    setExamenAEliminar({
      id,
      titulo: titulo || exam?.titulo || 'este examen',
      tipo,
    });
  };

  const confirmarEliminarExamen = () => {
    if (!examenAEliminar) return;
    const { id: idEliminar, tipo } = examenAEliminar;

    if (tipo === 'banco') {
      // Eliminar del Banco de Exámenes de forma permanente
      const nuevosEliminados = Array.from(new Set([...examenesEliminadosIds, idEliminar]));
      setExamenesEliminadosIds(nuevosEliminados);
      localStorage.setItem('c1_examenes_eliminados', JSON.stringify(nuevosEliminados));

      const updatedBanco = bancoExamenes.filter((e) => e.id !== idEliminar);
      setBancoExamenes(updatedBanco);
      guardarEnLocalStorageSeguro('c1_banco_examenes', updatedBanco);

      try {
        localStorage.removeItem(`c1_anotaciones_${idEliminar}`);
      } catch (_) {}

      try {
        const sesionActiva = localStorage.getItem('c1_active_exam_session');
        if (sesionActiva) {
          const ses = JSON.parse(sesionActiva);
          if (ses?.examenActivo?.id === idEliminar || ses?.examenActivo?.testBaseId === idEliminar) {
            localStorage.removeItem('c1_active_exam_session');
          }
        }
      } catch (_) {}

      mostrarToast(`Examen eliminado permanentemente del Banco de Exámenes.`, 'exito');
    } else {
      // Eliminar únicamente el intento del Historial de Pruebas
      const updatedHistorial = historialPruebas.filter((h) => h.id !== idEliminar);
      setHistorialPruebas(updatedHistorial);
      guardarEnLocalStorageSeguro('c1_historial_pruebas', updatedHistorial);
      mostrarToast(`Intento eliminado del historial. La plantilla sigue disponible en el Banco de Exámenes.`, 'exito');
    }

    setExamenAEliminar(null);
  };

  const solicitarRenombrarExamen = (id: string, tituloActual: string) => {
    setExamenARenombrar({ id, titulo: tituloActual });
    setNuevoNombreInput(tituloActual);
  };

  const confirmarRenombrarExamen = () => {
    if (!examenARenombrar || !nuevoNombreInput.trim()) return;
    const nuevoTitulo = nuevoNombreInput.trim();
    const id = examenARenombrar.id;

    try {
      // 1. Actualizar en Banco de Exámenes (o crear versión personalizada si era precargado)
      const enBanco = bancoExamenes.some((b) => b.id === id);
      if (enBanco) {
        const updatedBanco = bancoExamenes.map((b) => (b.id === id ? { ...b, titulo: nuevoTitulo } : b));
        setBancoExamenes(updatedBanco);
        guardarEnLocalStorageSeguro('c1_banco_examenes', updatedBanco);
      } else {
        // Puede tratarse de un examen precargado que todavía no estaba en bancoExamenes personalizado
        const precargado = EXAMENES_PRECARGADOS_OFICIALES.find((e) => e.id === id);
        if (precargado) {
          const examenPersonalizado: ExamenCompleto = {
            ...asegurarSeparacionYNormativaReserva(precargado),
            id,
            titulo: nuevoTitulo,
          };
          const nuevoBanco = [examenPersonalizado, ...bancoExamenes.filter((b) => b.id !== id)];
          setBancoExamenes(nuevoBanco);
          guardarEnLocalStorageSeguro('c1_banco_examenes', nuevoBanco);
        }
      }

      // 2. Actualizar en Historial de Pruebas si existe
      if (historialPruebas.some((h) => h.id === id || h.testBaseId === id)) {
        const updatedHistorial = historialPruebas.map((h) => {
          if (h.id === id) {
            return { ...h, titulo: nuevoTitulo };
          }
          if (h.testBaseId === id) {
            const intNum = h.intentoNumero ? ` (Intento ${h.intentoNumero})` : '';
            return { ...h, titulo: `${nuevoTitulo}${intNum}` };
          }
          return h;
        });
        setHistorialPruebas(updatedHistorial);
        guardarEnLocalStorageSeguro('c1_historial_pruebas', updatedHistorial);
      }

      mostrarToast(`Examen renombrado a "${nuevoTitulo}"`, 'exito');
    } catch (err) {
      console.error('Error al renombrar examen:', err);
    } finally {
      // Garantizar SIEMPRE el cierre del cuadro de diálogo
      setExamenARenombrar(null);
    }
  };

  const iniciarExamenDesdeOtraSeccion = (examen: ExamenCompleto) => {
    const baseId = examen.testBaseId || examen.id;
    // Buscar si ya existen intentos realizados en el historial
    const intentosPrevios = historialPruebas.filter(
      (h) => (h.testBaseId === baseId || h.id === baseId || h.id === examen.id) && h.resultado
    );

    if (intentosPrevios.length > 0) {
      // Hay intentos previos: ofrecer revisar el último o iniciar nuevo intento
      const ultimoIntento = intentosPrevios[0];
      setExamenRecuperarPregunta(ultimoIntento);
    } else {
      // Primer intento: preparar y lanzar
      const normalizado = asegurarSeparacionYNormativaReserva(examen);
      const intento1: ExamenCompleto = {
        ...normalizado,
        id: `${baseId}-intento-${Date.now()}`,
        testBaseId: baseId,
        intentoNumero: 1,
        resultado: undefined,
      };
      setExamenSeleccionadoParaTest(intento1);
      setTabActiva('generador');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      mostrarToast(`¡Iniciando test "${normalizado.titulo}"!`, 'exito');
    }
  };

  const handleRevisarExamenRealizado = (item: ExamenCompleto) => {
    setExamenSeleccionadoParaTest(item);
    setTabActiva('generador');
    setExamenRecuperarPregunta(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarToast(`Revisando prueba "${item.titulo}" con tus respuestas y desglose oficial.`, 'info');
  };

  const handleIniciarNuevoIntento = (item: ExamenCompleto) => {
    try {
      localStorage.removeItem('c1_active_exam_session');
    } catch (_) {}

    const baseId = item.testBaseId || item.id;
    // Contar cuántos intentos de este test base existen ya en el historial independiente
    const intentosPrevios = historialPruebas.filter(
      (e) => (e.testBaseId === baseId || e.id === baseId) && e.resultado
    ).length;
    const nuevoNumeroIntento = Math.max(item.intentoNumero || 1, intentosPrevios) + 1;

    // Título descriptivo con el número de intento
    const tituloBase = item.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
    const tituloNuevo = `${tituloBase} (Intento ${nuevoNumeroIntento})`;

    const nuevoIntento: ExamenCompleto = {
      ...asegurarSeparacionYNormativaReserva(item),
      id: `${baseId}-intento-${Date.now()}`,
      testBaseId: baseId,
      intentoNumero: nuevoNumeroIntento,
      titulo: tituloNuevo,
      resultado: undefined,
      fecha: new Date().toISOString().split('T')[0],
    };

    setExamenSeleccionadoParaTest(nuevoIntento);
    setTabActiva('generador');
    setExamenRecuperarPregunta(null);
    mostrarToast(
      `¡Iniciando nuevo intento #${nuevoNumeroIntento} de "${tituloBase}"! Cada intento se guardará en tu historial y en los KPIs sin duplicar el banco de exámenes.`,
      'exito'
    );
  };

  // Handlers para Almacén de Dudas y Reglas Mnemotécnicas
  const handleGuardarItemAlmacen = (item: ItemAlmacenDuda) => {
    setAlmacenDudas((prev) => {
      const existe = prev.some(
        (d) => d.id === item.id || d.enunciado === item.enunciado
      );
      let updated: ItemAlmacenDuda[];
      if (existe) {
        updated = prev.map((d) =>
          d.id === item.id || d.enunciado === item.enunciado ? item : d
        );
      } else {
        updated = [item, ...prev];
      }
      try {
        localStorage.setItem('c1_almacen_dudas', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    mostrarToast('Duda guardada en tu Almacén de Repaso', 'exito');
  };

  const handleEliminarItemAlmacen = (id: string) => {
    setAlmacenDudas((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      try {
        localStorage.setItem('c1_almacen_dudas', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    mostrarToast('Duda eliminada del Almacén', 'info');
  };

  const handleVerJustificacionPregunta = (pregunta: PreguntaExamen) => {
    const sol = pregunta.opciones.find((o) => o.esCorrecta)?.id || 'A';
    const dummyExam: ExamenCompleto = {
      id: `JUSTIF-${Date.now()}`,
      titulo: `Revisión: ${pregunta.enunciado.slice(0, 50)}...`,
      tipo: 'unitario',
      ambito: 'AGE',
      origen: 'oficial_json',
      fecha: new Date().toISOString().split('T')[0],
      tematicas: ['procedimiento_administrativo'],
      leyesBOEAplicadas: pregunta.leyesRelacionadas || (pregunta.justificacionLegal?.norma ? [pregunta.justificacionLegal.norma] : []),
      preguntas: [pregunta],
      resultado: {
        puntuacionDirecta: 1,
        puntuacionTransformada: 100,
        puntuacionMaxima: 100,
        superaCorte: true,
        duracionSegundos: 60,
        aciertos: 1,
        fallos: 0,
        blancos: 0,
        respuestasUsuario: { 0: sol },
        fechaRealizacion: new Date().toISOString(),
      },
    };
    setExamenSeleccionadoParaTest(dummyExam);
    setTabActiva('generador');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportarArchivoHistorial = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const resultado = parsearTextoOArchivoJSON(event.target.result);
        const lista = Array.isArray(resultado) ? resultado : [resultado];
        let nuevosBanco = [...bancoExamenes];
        let nuevosHistorial = [...historialPruebas];
        let countBanco = 0;
        let countHistorial = 0;

        lista.forEach((exRaw) => {
          const ex = asegurarSeparacionYNormativaReserva(exRaw);
          // 1. Guardar en Banco de Exámenes como plantilla
          const baseId = ex.testBaseId || ex.id.replace(/-intento-\d+$/, '');
          const existeBanco = nuevosBanco.some((b) => b.id === baseId);
          if (!existeBanco) {
            const plantilla: ExamenCompleto = {
              ...ex,
              id: baseId,
              testBaseId: undefined,
              intentoNumero: undefined,
              resultado: undefined,
            };
            nuevosBanco.unshift(plantilla);
            countBanco++;
          }

          // 2. Si ya viene con resultados, añadir a historial de pruebas
          if (ex.resultado) {
            if (!nuevosHistorial.some((h) => h.id === ex.id)) {
              nuevosHistorial.unshift(ex);
              countHistorial++;
            }
          }
        });

        setBancoExamenes(nuevosBanco);
        setHistorialPruebas(nuevosHistorial);
        guardarEnLocalStorageSeguro('c1_banco_examenes', nuevosBanco);
        guardarEnLocalStorageSeguro('c1_historial_pruebas', nuevosHistorial);

        // Sincronizar también Almacén de Dudas y Base de Datos de Documentos/Enlaces si el JSON los incluía
        try {
          const savedDudas = localStorage.getItem('c1_almacen_dudas');
          if (savedDudas) {
            const parsedDudas = JSON.parse(savedDudas);
            if (Array.isArray(parsedDudas)) {
              setAlmacenDudas(parsedDudas);
            }
          }
          setBibliotecaDocumentos(leerBibliotecaDocumentosDeLocalStorage());
          setSubtemasBiblioteca(leerSubtemasBibliotecaDeLocalStorage());
        } catch (_) {}

        mostrarToast(
          `¡Importación completada! ${countBanco} exámenes añadidos al Banco y ${countHistorial} pruebas registradas en el Historial.`,
          'exito'
        );
      } catch (err: any) {
        mostrarToast('Error al importar archivo JSON/TXT: ' + (err.message || 'Formato no reconocido'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestaurarArchivoBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const res = restaurarCopiaSeguridadCompleta(event.target.result);
        setBancoExamenes(res.bancoExamenes);
        setHistorialPruebas(res.historialPruebas);
        if (Array.isArray(res.almacenDudas)) {
          setAlmacenDudas(res.almacenDudas);
        }
        if (Array.isArray(res.bibliotecaDocumentos)) {
          setBibliotecaDocumentos(res.bibliotecaDocumentos);
        }
        if (Array.isArray(res.subtemasBiblioteca)) {
          setSubtemasBiblioteca(res.subtemasBiblioteca);
        }
        if (Array.isArray(res.examenesEliminadosIds)) {
          setExamenesEliminadosIds(res.examenesEliminadosIds);
        }
        if (typeof res.darkModeRestaurado === 'boolean') {
          setIsDarkMode(res.darkModeRestaurado);
          if (res.darkModeRestaurado) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        setVersionFalladasApp((v) => v + 1);
        guardarEnLocalStorageSeguro('c1_banco_examenes', res.bancoExamenes);
        guardarEnLocalStorageSeguro('c1_historial_pruebas', res.historialPruebas);
        mostrarToast(
          `¡Copia de seguridad única restaurada! ${res.bancoExamenes.length} tests en Banco, ${res.historialPruebas.length} en Historial, ${res.almacenDudas?.length || 0} dudas y ${res.bibliotecaDocumentos?.length || 0} enlaces/documentos en Biblioteca.`,
          'exito'
        );
        setMostrarModalBackup(false);
      } catch (err: any) {
        mostrarToast('Error al restaurar copia de seguridad: ' + (err.message || 'Formato no válido'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCambiarCategoriaExamen = (examenId: string, nuevaCategoria: CategoriaExamen) => {
    const ajustarCatalogacionPorCategoria = (item: ExamenCompleto): ExamenCompleto => {
      let nuevasLeyes = [...(item.leyesBOEAplicadas || [])];
      if (nuevaCategoria === 'test_oficial') {
        nuevasLeyes = [ETIQUETA_CATALOGACION_TEST_OFICIAL];
      } else if (nuevaCategoria === 'supuesto_oficial') {
        nuevasLeyes = [ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL];
      } else {
        nuevasLeyes = nuevasLeyes.filter((l) => !esCatalogacionPruebaOficial(l));
      }
      return { ...item, categoria: nuevaCategoria, leyesBOEAplicadas: nuevasLeyes };
    };

    // Actualizar en bancoExamenes si existe
    let enBanco = false;
    const updBanco = bancoExamenes.map((item) => {
      if (item.id === examenId || item.testBaseId === examenId) {
        enBanco = true;
        return ajustarCatalogacionPorCategoria(item);
      }
      return item;
    });
    if (enBanco) {
      setBancoExamenes(updBanco);
      guardarEnLocalStorageSeguro('c1_banco_examenes', updBanco);
    }

    // Actualizar en historialPruebas si existe
    let enHist = false;
    const updHist = historialPruebas.map((item) => {
      if (item.id === examenId || item.testBaseId === examenId) {
        enHist = true;
        return ajustarCatalogacionPorCategoria(item);
      }
      return item;
    });
    if (enHist) {
      setHistorialPruebas(updHist);
      guardarEnLocalStorageSeguro('c1_historial_pruebas', updHist);
    }

    const info = CATEGORIAS_EXAMEN_INFO[nuevaCategoria];
    mostrarToast(`Categoría cambiada a "${info.label}"`, 'info');
  };

  const handleCambiarAmbitoExamen = (examenId: string, nuevoAmbito: ConvocatoriaAmbito) => {
    let enBanco = false;
    const updBanco = bancoExamenes.map((item) => {
      if (item.id === examenId || item.testBaseId === examenId) {
        enBanco = true;
        return { ...item, ambito: nuevoAmbito };
      }
      return item;
    });
    if (enBanco) {
      setBancoExamenes(updBanco);
      guardarEnLocalStorageSeguro('c1_banco_examenes', updBanco);
    }

    let enHist = false;
    const updHist = historialPruebas.map((item) => {
      if (item.id === examenId || item.testBaseId === examenId) {
        enHist = true;
        return { ...item, ambito: nuevoAmbito };
      }
      return item;
    });
    if (enHist) {
      setHistorialPruebas(updHist);
      guardarEnLocalStorageSeguro('c1_historial_pruebas', updHist);
    }

    const info = AMBITOS_INFO[nuevoAmbito];
    mostrarToast(`Ámbito actualizado a "${info.label}"`, 'info');
  };

  const handleCambiarFechaExamen = (examenId: string, nuevaFecha: string) => {
    if (!nuevaFecha) return;
    const updHist = historialPruebas.map((item) => {
      if (item.id === examenId) {
        const resActualizado = item.resultado
          ? { ...item.resultado, fechaRealizacion: `${nuevaFecha}T12:00:00.000Z` }
          : undefined;
        return {
          ...item,
          fecha: nuevaFecha,
          resultado: resActualizado,
        };
      }
      return item;
    });
    setHistorialPruebas(updHist);
    localStorage.setItem('c1_historial_pruebas', JSON.stringify(updHist));
    mostrarToast(`Fecha de la prueba actualizada a ${nuevaFecha}`, 'exito');
  };

  const handleReasignarFechasMultiples = (asignaciones: { id: string; fecha: string }[]) => {
    if (!asignaciones || asignaciones.length === 0) return;
    const mapFechas = new Map(asignaciones.map((a) => [a.id, a.fecha]));
    const updated = historialPruebas.map((item) => {
      if (mapFechas.has(item.id)) {
        const nuevaFecha = mapFechas.get(item.id)!;
        const resActualizado = item.resultado
          ? { ...item.resultado, fechaRealizacion: `${nuevaFecha}T12:00:00.000Z` }
          : undefined;
        return {
          ...item,
          fecha: nuevaFecha,
          resultado: resActualizado,
        };
      }
      return item;
    });
    setHistorialPruebas(updated);
    localStorage.setItem('c1_historial_pruebas', JSON.stringify(updated));
    mostrarToast(`Se han distribuido las pruebas en los días de la semana con éxito`, 'exito');
  };

  const handleReiniciarExamen = (item: ExamenCompleto) => {
    handleIniciarNuevoIntento(item);
  };

  // Sincronización global cuando se modifica la ley o temática de una pregunta en la Ventana Justificación o Test de Falladas
  const handleActualizarPreguntaGlobal = (
    preguntaActualizada: PreguntaExamen,
    _examenPadre?: ExamenCompleto
  ) => {
    const normalizarEnun = (txt: string) =>
      (txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const claveTarget = normalizarEnun(preguntaActualizada.enunciado);
    if (!claveTarget) return;

    const nuevaNorma = obtenerNormaEfectivaDePregunta(preguntaActualizada, _examenPadre);
    const nuevasLeyes =
      preguntaActualizada.leyesRelacionadas && preguntaActualizada.leyesRelacionadas.length > 0
        ? preguntaActualizada.leyesRelacionadas
        : [nuevaNorma];

    if (preguntaActualizada.recursosArgumentacion !== undefined) {
      guardarRecursosArgumentacionDePregunta(
        preguntaActualizada.enunciado,
        preguntaActualizada.recursosArgumentacion
      );
    }
    const recursosActualizados = obtenerRecursosArgumentacionDePregunta(preguntaActualizada);

    // 1. Actualizar en Banco de Exámenes
    setBancoExamenes((prevBanco) => {
      let huboCambio = false;
      const nextBanco = prevBanco.map((ex) => {
        let cambioEnExamen = false;
        const nuevasPreguntas = ex.preguntas.map((p) => {
          if (normalizarEnun(p.enunciado) === claveTarget) {
            cambioEnExamen = true;
            huboCambio = true;
            return {
              ...p,
              leyesRelacionadas: nuevasLeyes,
              recursosArgumentacion: recursosActualizados,
              justificacionLegal: {
                ...(p.justificacionLegal || { articulo: 'Precepto aplicable', fundamento: '' }),
                norma: nuevaNorma,
              },
            };
          }
          return p;
        });
        return cambioEnExamen ? { ...ex, preguntas: nuevasPreguntas } : ex;
      });
      if (huboCambio) {
        guardarEnLocalStorageSeguro('c1_banco_examenes', nextBanco);
      }
      return huboCambio ? nextBanco : prevBanco;
    });

    // 2. Actualizar en Historial de Pruebas
    setHistorialPruebas((prevHist) => {
      let huboCambio = false;
      const nextHist = prevHist.map((ex) => {
        let cambioEnExamen = false;
        const nuevasPreguntas = ex.preguntas.map((p) => {
          if (normalizarEnun(p.enunciado) === claveTarget) {
            cambioEnExamen = true;
            huboCambio = true;
            return {
              ...p,
              leyesRelacionadas: nuevasLeyes,
              recursosArgumentacion: recursosActualizados,
              justificacionLegal: {
                ...(p.justificacionLegal || { articulo: 'Precepto aplicable', fundamento: '' }),
                norma: nuevaNorma,
              },
            };
          }
          return p;
        });
        return cambioEnExamen ? { ...ex, preguntas: nuevasPreguntas } : ex;
      });
      if (huboCambio) {
        guardarEnLocalStorageSeguro('c1_historial_pruebas', nextHist);
      }
      return huboCambio ? nextHist : prevHist;
    });

    // 3. Actualizar en Almacén de Dudas si la pregunta está guardada allí
    setAlmacenDudas((prevAlmacen) => {
      let huboCambio = false;
      const nextAlmacen = prevAlmacen.map((item) => {
        if (normalizarEnun(item.enunciado) === claveTarget) {
          huboCambio = true;
          return {
            ...item,
            leyesRelacionadas: nuevasLeyes,
            recursosArgumentacion: recursosActualizados,
            justificacionLegal: {
              ...(item.justificacionLegal || { articulo: 'Precepto aplicable', fundamento: '' }),
              norma: nuevaNorma,
            },
            fechaActualizacion: new Date().toISOString(),
          };
        }
        return item;
      });
      if (huboCambio) {
        guardarEnLocalStorageSeguro('c1_almacen_dudas', nextAlmacen);
      }
      return huboCambio ? nextAlmacen : prevAlmacen;
    });

    mostrarToast(`Pregunta actualizada en tests, historial y almacén`, 'exito');
  };

  const handleCambiarLeyesExamen = (examenId: string, nuevasLeyes: string[]) => {
    const actualizarPreguntasDeExamenConLeyes = (item: ExamenCompleto): ExamenCompleto => {
      const esTestOficial = nuevasLeyes.some((l) => l === ETIQUETA_CATALOGACION_TEST_OFICIAL);
      const esSupuestoOficial = nuevasLeyes.some((l) => l === ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL);
      const categoriaActual = item.categoria || deducirCategoriaExamen(item.tipo, item.origen);

      let nuevaCategoria: CategoriaExamen = categoriaActual;
      if (esTestOficial) {
        nuevaCategoria = 'test_oficial';
      } else if (esSupuestoOficial) {
        nuevaCategoria = 'supuesto_oficial';
      } else if (categoriaActual === 'test_oficial') {
        nuevaCategoria = 'test_academia';
      } else if (categoriaActual === 'supuesto_oficial') {
        nuevaCategoria = 'supuesto_academia';
      }

      const exConLeyes: ExamenCompleto = {
        ...item,
        categoria: nuevaCategoria,
        leyesBOEAplicadas: nuevasLeyes,
      };

      // Si se cataloga como Test oficial o Supuesto oficial, mantenemos intacta la norma individual de cada pregunta
      if (esTestOficial || esSupuestoOficial) {
        return exConLeyes;
      }

      const leyesParaPreguntas = nuevasLeyes.filter((l) => !esCatalogacionPruebaOficial(l));
      const preguntasActualizadas = exConLeyes.preguntas.map((p) => {
        const normaActual = p.justificacionLegal?.norma;
        const esGen = !normaActual || esNormaGenerica(normaActual) || esCatalogacionPruebaOficial(normaActual);
        const nuevaNorma =
          leyesParaPreguntas.length === 1
            ? leyesParaPreguntas[0]
            : esGen
            ? leyesParaPreguntas[0] || obtenerNormaEfectivaDePregunta(p, exConLeyes)
            : normaActual!;
        return {
          ...p,
          leyesRelacionadas:
            leyesParaPreguntas.length > 0 &&
            (!p.leyesRelacionadas ||
              p.leyesRelacionadas.every((l) => esNormaGenerica(l) || esCatalogacionPruebaOficial(l)))
              ? leyesParaPreguntas
              : p.leyesRelacionadas,
          justificacionLegal: {
            ...(p.justificacionLegal || { articulo: 'Precepto aplicable', fundamento: '' }),
            norma: nuevaNorma,
          },
        };
      });
      return { ...exConLeyes, preguntas: preguntasActualizadas };
    };

    let enBanco = false;
    const updBanco = bancoExamenes.map((item) => {
      if (item.id === examenId || item.testBaseId === examenId) {
        enBanco = true;
        return actualizarPreguntasDeExamenConLeyes(item);
      }
      return item;
    });
    if (enBanco) {
      setBancoExamenes(updBanco);
      guardarEnLocalStorageSeguro('c1_banco_examenes', updBanco);
    }

    let enHist = false;
    const updHist = historialPruebas.map((item) => {
      if (item.id === examenId || item.testBaseId === examenId) {
        enHist = true;
        return actualizarPreguntasDeExamenConLeyes(item);
      }
      return item;
    });
    if (enHist) {
      setHistorialPruebas(updHist);
      guardarEnLocalStorageSeguro('c1_historial_pruebas', updHist);
    }

    mostrarToast(`Catalogación actualizada (${nuevasLeyes.join(', ')})`, 'exito');
  };

  const handleGuardarRespuestasCorregidas = (examenCorregido: ExamenCompleto) => {
    const mapaPorId = new Map<number, PreguntaExamen>();
    const mapaPorClave = new Map<string, PreguntaExamen>();

    examenCorregido.preguntas.forEach((p) => {
      mapaPorId.set(p.id, p);
      const clave = normalizarClavePregunta(p.enunciado);
      if (clave) mapaPorClave.set(clave, p);
    });

    const coincideExamenObjetivo = (item: ExamenCompleto): boolean => {
      if (item.id === examenCorregido.id) return true;
      if (item.testBaseId && item.testBaseId === examenCorregido.id) return true;
      if (examenCorregido.testBaseId && (item.id === examenCorregido.testBaseId || item.testBaseId === examenCorregido.testBaseId)) {
        return true;
      }
      if (item.titulo.trim().toLowerCase() === examenCorregido.titulo.trim().toLowerCase()) return true;
      return false;
    };

    const sincronizarPreguntasDeExamen = (preguntasOriginales: PreguntaExamen[]): PreguntaExamen[] => {
      return preguntasOriginales.map((p) => {
        const corregida = mapaPorId.get(p.id) || mapaPorClave.get(normalizarClavePregunta(p.enunciado));
        if (!corregida) return p;
        const letraCorrectaCorregida = corregida.opciones.find((o) => o.esCorrecta)?.id;
        return {
          ...p,
          esAnulada: Boolean(corregida.esAnulada),
          opciones: p.opciones.map((op) => ({
            ...op,
            esCorrecta: !corregida.esAnulada && op.id === letraCorrectaCorregida,
          })),
        };
      });
    };

    // 1. Actualizar Banco de Exámenes
    let encontradoEnBanco = false;
    const nuevoBanco = bancoExamenes.map((item) => {
      if (!coincideExamenObjetivo(item)) return item;
      encontradoEnBanco = true;
      return {
        ...item,
        preguntas: sincronizarPreguntasDeExamen(item.preguntas),
      };
    });

    if (!encontradoEnBanco) {
      // Si el examen provenía solo del historial y no estaba en el banco, guardamos su plantilla en el banco también
      const plantillaParaBanco: ExamenCompleto = {
        ...examenCorregido,
        id: examenCorregido.testBaseId || examenCorregido.id,
        testBaseId: undefined,
        resultado: undefined,
      };
      nuevoBanco.unshift(plantillaParaBanco);
    }
    setBancoExamenes(nuevoBanco);
    guardarEnLocalStorageSeguro('c1_banco_examenes', nuevoBanco);

    // 2. Actualizar Historial de Pruebas y recalcular respuestas, reservas y nota en los tests realizados
    let intentosRecalculados = 0;
    let ultimoResultadoRecalculado: { pd: number; pt: number; aciertos: number; fallos: number } | null = null;

    const nuevoHistorial = historialPruebas.map((item) => {
      if (!coincideExamenObjetivo(item)) return item;

      const preguntasSincronizadas = sincronizarPreguntasDeExamen(item.preguntas);

      if (item.resultado) {
        const respuestasPrevias = item.resultado.respuestasUsuario || {};
        const { resultado: nuevoResultado, preguntasConSustitucion } = calcularResultadoExamenConReservas(
          preguntasSincronizadas,
          respuestasPrevias,
          item.tipo,
          item.resultado.duracionSegundos,
          item.resultado.fechaRealizacion
        );
        intentosRecalculados++;
        ultimoResultadoRecalculado = {
          pd: nuevoResultado.puntuacionDirecta,
          pt: nuevoResultado.puntuacionTransformada,
          aciertos: nuevoResultado.aciertos,
          fallos: nuevoResultado.fallos,
        };
        registrarRespuestasEnControlFalladas(preguntasConSustitucion, respuestasPrevias);
        return {
          ...item,
          preguntas: preguntasConSustitucion,
          resultado: nuevoResultado,
        };
      }

      return {
        ...item,
        preguntas: preguntasSincronizadas,
      };
    });

    setHistorialPruebas(nuevoHistorial);
    guardarEnLocalStorageSeguro('c1_historial_pruebas', nuevoHistorial);

    // 3. Si el examen está abierto actualmente en el visor de simulacro/revisión, actualizarlo también en vivo
    if (examenSeleccionadoParaTest && coincideExamenObjetivo(examenSeleccionadoParaTest)) {
      const preguntasSinc = sincronizarPreguntasDeExamen(examenSeleccionadoParaTest.preguntas);
      if (examenSeleccionadoParaTest.resultado) {
        const respuestasPrevias = examenSeleccionadoParaTest.resultado.respuestasUsuario || {};
        const { resultado: nuevoRes, preguntasConSustitucion } = calcularResultadoExamenConReservas(
          preguntasSinc,
          respuestasPrevias,
          examenSeleccionadoParaTest.tipo,
          examenSeleccionadoParaTest.resultado.duracionSegundos,
          examenSeleccionadoParaTest.resultado.fechaRealizacion
        );
        setExamenSeleccionadoParaTest({
          ...examenSeleccionadoParaTest,
          preguntas: preguntasConSustitucion,
          resultado: nuevoRes,
        });
      } else {
        setExamenSeleccionadoParaTest({
          ...examenSeleccionadoParaTest,
          preguntas: preguntasSinc,
        });
      }
    }

    // 4. Sincronizar Almacén de Dudas si alguna pregunta modificada estaba guardada allí
    setAlmacenDudas((prevAlmacen) => {
      let huboCambio = false;
      const nextAlmacen = prevAlmacen.map((item) => {
        const clave = normalizarClavePregunta(item.enunciado);
        const corregida = mapaPorClave.get(clave);
        if (!corregida) return item;
        const nuevaLetraCorrecta = corregida.esAnulada
          ? undefined
          : corregida.opciones.find((o) => o.esCorrecta)?.id;
        if (item.respuestaCorrecta !== nuevaLetraCorrecta) {
          huboCambio = true;
          const respMarcada = item.respuestaUsuario;
          const nuevoEsFallada = respMarcada && nuevaLetraCorrecta ? respMarcada !== nuevaLetraCorrecta : item.esFallada;
          return {
            ...item,
            respuestaCorrecta: nuevaLetraCorrecta,
            esFallada: nuevoEsFallada,
            opciones: item.opciones
              ? item.opciones.map((op) => ({
                  ...op,
                  esCorrecta: !corregida.esAnulada && op.id === nuevaLetraCorrecta,
                }))
              : item.opciones,
            fechaActualizacion: new Date().toISOString(),
          };
        }
        return item;
      });
      if (huboCambio) {
        guardarEnLocalStorageSeguro('c1_almacen_dudas', nextAlmacen);
      }
      return huboCambio ? nextAlmacen : prevAlmacen;
    });

    setVersionFalladasApp((v) => v + 1);

    if (intentosRecalculados > 0 && ultimoResultadoRecalculado) {
      const infoNota = ultimoResultadoRecalculado as { pd: number; pt: number; aciertos: number; fallos: number };
      mostrarToast(
        `Plantilla corregida y nota actualizada en ${intentosRecalculados} intento(s): ${infoNota.pd.toFixed(2)} PD / ${infoNota.pt.toFixed(2)} PT (+${infoNota.aciertos} / -${infoNota.fallos})`,
        'exito'
      );
    } else {
      mostrarToast(`Plantilla de respuestas actualizada en el Banco de Exámenes`, 'exito');
    }
  };

  const toggleOrdenColumna = (col: typeof columnaOrden) => {
    if (columnaOrden === col) {
      setDireccionOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColumnaOrden(col);
      setDireccionOrden(col === 'fecha' || col === 'pd' || col === 'pt' ? 'desc' : 'asc');
    }
  };

  const conteoPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {
      todos: historialPruebas.length,
      test_oficial: 0,
      test_academia: 0,
      test_ia: 0,
      supuesto_oficial: 0,
      supuesto_academia: 0,
      supuesto_ia: 0,
    };
    historialPruebas.forEach((ex) => {
      const cat = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [historialPruebas]);

  // Catálogo dinámico de leyes presentes en el Historial
  const leyesDisponiblesHistorial = useMemo(() => {
    const s = new Set<string>();
    historialPruebas.forEach((ex) => {
      obtenerLeyesNormalizadasDeExamen(ex).forEach((l) => s.add(l));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [historialPruebas]);

  const filtrosActivos =
    busquedaHistorial.trim() !== '' ||
    filtroCategoria !== 'todos' ||
    filtroAmbito !== 'todos' ||
    filtroEstado !== 'todos' ||
    filtroTematicaHistorial !== 'todos' ||
    filtroLeyHistorial !== 'todas' ||
    filtroFechaTipo !== 'todos' ||
    filtroFechaDesde !== '' ||
    filtroFechaHasta !== '';

  const resetearFiltros = () => {
    setBusquedaHistorial('');
    setFiltroCategoria('todos');
    setFiltroAmbito('todos');
    setFiltroEstado('todos');
    setFiltroTematicaHistorial('todos');
    setFiltroLeyHistorial('todas');
    setFiltroFechaTipo('todos');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };

  const examenesFiltradosYOrdenados = useMemo(() => {
    let lista = [...historialPruebas];

    // 1. Filtro de búsqueda por texto (con separación estricta entre pruebas oficiales y tests por leyes/temas)
    if (busquedaHistorial.trim()) {
      lista = lista.filter((ex) => coincideBusquedaExamenConSeparacionOficial(ex, busquedaHistorial));
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

    // 4. Filtro de Estado
    if (filtroEstado !== 'todos') {
      lista = lista.filter((ex) => {
        if (filtroEstado === 'pendiente') return !ex.resultado;
        if (filtroEstado === 'apto') return !!ex.resultado && (ex.resultado.puntuacionTransformada || 0) >= 25;
        if (filtroEstado === 'no_apto') return !!ex.resultado && (ex.resultado.puntuacionTransformada || 0) < 25;
        return true;
      });
    }

    // 4B. Filtro por Categoría Temática / Informática
    if (filtroTematicaHistorial !== 'todos') {
      lista = lista.filter((ex) =>
        clasificarExamenEnCategoriasTemario(ex).includes(filtroTematicaHistorial)
      );
    }

    // 4C. Filtro por Ley / Norma BOE o Informática
    if (filtroLeyHistorial !== 'todas') {
      lista = lista.filter((ex) =>
        obtenerLeyesNormalizadasDeExamen(ex).includes(filtroLeyHistorial)
      );
    }

    // 5. Filtro por Fecha o Rango de Fechas
    if (filtroFechaTipo !== 'todos') {
      const hoy = new Date();
      const hoyY = hoy.getFullYear();
      const hoyM = String(hoy.getMonth() + 1).padStart(2, '0');
      const hoyD = String(hoy.getDate()).padStart(2, '0');
      const hoyStr = `${hoyY}-${hoyM}-${hoyD}`;
      const mesStr = `${hoyY}-${hoyM}`;

      // Lunes y Domingo de la semana actual
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0);
      const diaSem = d.getDay();
      const diffLun = diaSem === 0 ? -6 : 1 - diaSem;
      d.setDate(d.getDate() + diffLun);
      const lunesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dom = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6, 12, 0, 0);
      const domingoStr = `${dom.getFullYear()}-${String(dom.getMonth() + 1).padStart(2, '0')}-${String(dom.getDate()).padStart(2, '0')}`;

      lista = lista.filter((ex) => {
        const fechaBruta = ex.resultado?.fechaRealizacion || ex.fecha;
        if (!fechaBruta) return false;
        let fechaYMD = '';
        if (/^\d{4}-\d{2}-\d{2}/.test(fechaBruta)) {
          fechaYMD = fechaBruta.substring(0, 10);
        } else {
          const matchDMY = fechaBruta.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (matchDMY) {
            fechaYMD = `${matchDMY[3]}-${matchDMY[2].padStart(2, '0')}-${matchDMY[1].padStart(2, '0')}`;
          } else {
            const dt = new Date(fechaBruta);
            if (!isNaN(dt.getTime())) {
              fechaYMD = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            }
          }
        }

        if (!fechaYMD) return false;

        if (filtroFechaTipo === 'hoy') {
          return fechaYMD === hoyStr;
        }
        if (filtroFechaTipo === 'semana') {
          return fechaYMD >= lunesStr && fechaYMD <= domingoStr;
        }
        if (filtroFechaTipo === 'mes') {
          return fechaYMD.startsWith(mesStr);
        }
        if (filtroFechaTipo === 'rango') {
          if (filtroFechaDesde && fechaYMD < filtroFechaDesde) return false;
          if (filtroFechaHasta && fechaYMD > filtroFechaHasta) return false;
          return true;
        }
        return true;
      });
    }

    // 6. Ordenación por columna
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
        case 'fecha': {
          valA = a.resultado?.fechaRealizacion || a.fecha || '';
          valB = b.resultado?.fechaRealizacion || b.fecha || '';
          break;
        }
        case 'preguntas':
          valA = a.preguntas.length;
          valB = b.preguntas.length;
          break;
        case 'pd':
          valA = a.resultado ? Number(a.resultado.puntuacionDirecta) : -999;
          valB = b.resultado ? Number(b.resultado.puntuacionDirecta) : -999;
          break;
        case 'pt':
          valA = a.resultado ? Number(a.resultado.puntuacionTransformada) : -999;
          valB = b.resultado ? Number(b.resultado.puntuacionTransformada) : -999;
          break;
        case 'calificacion':
          valA = !a.resultado ? 0 : (a.resultado.puntuacionTransformada >= 25 ? 2 : 1);
          valB = !b.resultado ? 0 : (b.resultado.puntuacionTransformada >= 25 ? 2 : 1);
          break;
      }

      if (valA < valB) return direccionOrden === 'asc' ? -1 : 1;
      if (valA > valB) return direccionOrden === 'asc' ? 1 : -1;
      return 0;
    });

    return lista;
  }, [
    historialPruebas,
    busquedaHistorial,
    filtroCategoria,
    filtroAmbito,
    filtroEstado,
    filtroTematicaHistorial,
    filtroLeyHistorial,
    filtroFechaTipo,
    filtroFechaDesde,
    filtroFechaHasta,
    columnaOrden,
    direccionOrden,
  ]);

  useEffect(() => {
    setPaginaActualHistorial(1);
  }, [
    busquedaHistorial,
    filtroCategoria,
    filtroAmbito,
    filtroEstado,
    filtroTematicaHistorial,
    filtroLeyHistorial,
    filtroFechaTipo,
    filtroFechaDesde,
    filtroFechaHasta,
    columnaOrden,
    direccionOrden,
  ]);

  const totalPaginasHistorial = Math.max(1, Math.ceil(examenesFiltradosYOrdenados.length / REGISTROS_POR_PAGINA_HISTORIAL));

  const examenesPaginadosHistorial = useMemo(() => {
    const inicio = (paginaActualHistorial - 1) * REGISTROS_POR_PAGINA_HISTORIAL;
    return examenesFiltradosYOrdenados.slice(inicio, inicio + REGISTROS_POR_PAGINA_HISTORIAL);
  }, [examenesFiltradosYOrdenados, paginaActualHistorial]);

  const renderPaginacionHistorial = (posicion: 'superior' | 'inferior') => {
    if (examenesFiltradosYOrdenados.length === 0) return null;
    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 ${
          posicion === 'superior'
            ? 'pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-700/80'
            : 'pt-3 border-t border-slate-100 dark:border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Mostrando <strong className="text-slate-800 dark:text-slate-200">{(paginaActualHistorial - 1) * REGISTROS_POR_PAGINA_HISTORIAL + 1}</strong> - <strong className="text-slate-800 dark:text-slate-200">{Math.min(paginaActualHistorial * REGISTROS_POR_PAGINA_HISTORIAL, examenesFiltradosYOrdenados.length)}</strong> de <strong className="text-indigo-600 dark:text-indigo-400">{examenesFiltradosYOrdenados.length}</strong> pruebas
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="font-mono text-[11px] text-slate-500">
            Página <strong className="text-slate-800 dark:text-slate-200">{paginaActualHistorial}</strong> de {totalPaginasHistorial}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Flecha Página Arriba (Anterior) */}
          <button
            type="button"
            onClick={() => setPaginaActualHistorial((prev) => Math.max(1, prev - 1))}
            disabled={paginaActualHistorial <= 1}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página anterior (Página arriba)"
          >
            <i className="fa-solid fa-chevron-up text-[10px] text-indigo-600 dark:text-indigo-400"></i>
            <span>▲ Pág. Arriba</span>
          </button>

          {/* Selector numérico de páginas */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPaginasHistorial }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginasHistorial || Math.abs(p - paginaActualHistorial) <= 2)
              .map((p, idx, arr) => {
                const prevP = arr[idx - 1];
                const separator = prevP && p - prevP > 1 ? (
                  <span key={`sep-hist-${posicion}-${p}`} className="px-1 text-slate-400 font-mono">...</span>
                ) : null;
                return (
                  <React.Fragment key={p}>
                    {separator}
                    <button
                      type="button"
                      onClick={() => setPaginaActualHistorial(p)}
                      className={`h-7 min-w-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        paginaActualHistorial === p
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
            onClick={() => setPaginaActualHistorial((prev) => Math.min(totalPaginasHistorial, prev + 1))}
            disabled={paginaActualHistorial >= totalPaginasHistorial}
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

  // Metrics for Historial and KPIs
  const totalPruebasHistorial = historialPruebas.length;
  const examenesConNota = historialPruebas.filter((e) => e.resultado);
  const examenesDiferentesEvaluados = new Set(
    historialPruebas.map((h) => h.testBaseId || h.id.replace(/-intento-\d+$/, ''))
  ).size;
  const notaMedia =
    examenesConNota.length > 0
      ? (
          examenesConNota.reduce((acc, e) => acc + (e.resultado?.puntuacionTransformada || 0), 0) /
          examenesConNota.length
        ).toFixed(2)
      : '0.00';

  const totalPreguntasBanco = useMemo(() => {
    return bancoExamenes.reduce((acc, ex) => acc + (ex.preguntas?.length || 0), 0);
  }, [bancoExamenes]);

  const totalPreguntasFalladasConsolidado = useMemo(() => {
    void versionFalladasApp;
    return extraerPreguntasFalladasConsolidadas(historialPruebas, almacenDudas, false, false).length;
  }, [historialPruebas, almacenDudas, versionFalladasApp]);

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-200/80 text-slate-900'}`}>
      {/* Toast Notification Banner */}
      {toastNotificacion && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-fade-in shadow-xl">
          <div
            className={`p-3.5 rounded-xl border shadow-lg flex items-center justify-between gap-3 text-xs font-bold ${
              toastNotificacion.tipo === 'exito'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : toastNotificacion.tipo === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                : 'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <i
                className={`fa-solid ${
                  toastNotificacion.tipo === 'exito'
                    ? 'fa-circle-check text-emerald-600'
                    : toastNotificacion.tipo === 'error'
                    ? 'fa-circle-exclamation text-rose-600'
                    : 'fa-circle-info text-indigo-600'
                }`}
              ></i>
              <span>{toastNotificacion.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastNotificacion(null)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer ml-2"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR (ENSANCHADA PARA VISUALIZACIÓN COMPLETA DE TODOS LOS MENÚS) */}
      <header className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2 border-indigo-200 dark:border-slate-700 py-2.5 px-3 sm:px-6 z-30 shadow-sm transition-colors">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col gap-2.5">
          {/* Fila 1: Identidad de la Aplicación, Versión Interactiva v3.0 y Controles Globales */}
          <div className="w-full flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-linear-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white flex items-center justify-center text-base shadow-sm ring-2 ring-indigo-500/20 shrink-0">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white leading-none">
                    SIMULADOR C1 NORMAS & SUPUESTOS
                  </h1>
                  <button
                    type="button"
                    onClick={() => setMostrarModalVersion(true)}
                    className="text-[9px] sm:text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 font-mono inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    title="Ver novedades y últimos cambios de la Versión 3.4"
                  >
                    <i className="fa-solid fa-sparkles text-[8px] text-amber-300"></i>
                    <span>v3.4 · Novedades</span>
                  </button>
                  <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    AGE & CAM
                  </span>
                  <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono hidden lg:inline-flex items-center gap-1">
                    <i className="fa-solid fa-code-fork text-[8px] text-indigo-500"></i>
                    <span>Autoría: Julio Sánchez León & AI Studio Build</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Garantía normativa:</span>
                  <a
                    href="https://www.boe.es"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition-colors inline-flex items-center gap-1"
                  >
                    <span>BOE Oficial</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-70"></i>
                  </a>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => setMostrarModalVersion(true)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <i className="fa-solid fa-clock-rotate-left text-[8.5px]"></i>
                    <span>Actualización v3.4 (Exportación PDF en formato oficial + Hoja oficial de respuestas en blanco)</span>
                  </button>
                </p>
              </div>
            </div>

            {/* Utility Controls (Versión, Copia de Seguridad y Modo Oscuro) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalVersion(true)}
                className="h-8.5 px-2.5 sm:px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Notas de la versión 3.4 y últimos cambios implementados"
              >
                <i className="fa-solid fa-code-branch text-emerald-600 dark:text-emerald-400 text-[11px]"></i>
                <span className="hidden sm:inline">Versión 3.4</span>
              </button>

              <button
                type="button"
                onClick={() => setMostrarModalBackup(true)}
                className="h-8.5 px-2.5 sm:px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Copia de Seguridad Integral (Exportar e Importar todo)"
              >
                <i className="fa-solid fa-shield-halved text-indigo-500 text-[11px]"></i>
                <span className="hidden sm:inline">Copia de Seguridad</span>
              </button>

              <button
                type="button"
                onClick={toggleDarkMode}
                className="h-8.5 w-8.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-amber-400 flex items-center justify-center text-xs shadow-2xs transition-all cursor-pointer"
                title="Alternar Modo Oscuro"
              >
                <i className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-400' : 'fa-moon'}`}></i>
              </button>
            </div>
          </div>

          {/* Fila 2: Barra de Navegación Principal Ensanchada a Ancho Completo (7 secciones amplias y 100% visibles) */}
          <nav className="w-full grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center lg:justify-between gap-1.5 bg-indigo-100/75 dark:bg-slate-800 p-1.5 rounded-2xl border-2 border-indigo-200/90 dark:border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => setTabActiva('generador')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'generador'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles text-amber-500 text-xs"></i>
              <span>Generador IA</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('test_falladas')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'test_falladas'
                  ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs border border-rose-300 dark:border-rose-700 font-black ring-1 ring-rose-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
              title="Sección exclusiva para realizar tests de preguntas falladas seleccionando por ley o temática (computa en Historial, no en Banco)"
            >
              <i className="fa-solid fa-rotate text-rose-500 text-xs"></i>
              <span>Test de Falladas</span>
              {totalPreguntasFalladasConsolidado > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                  {totalPreguntasFalladasConsolidado}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('simulacro_oficial')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'simulacro_oficial'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-300 dark:border-indigo-600 font-black ring-1 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
              title="Simulacro de Examen Oficial Unificado: 70 preguntas por leyes o temas de informática + 20 preguntas de supuesto práctico (100 min)"
            >
              <i className="fa-solid fa-landmark-flag text-indigo-600 dark:text-indigo-400 text-xs"></i>
              <span>Simulacro Oficial</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black border border-indigo-200 dark:border-indigo-800">
                70+20
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('importar_json')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'importar_json'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-layer-group text-sky-500 text-xs"></i>
              <span>Banco de Exámenes</span>
              {bancoExamenes.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800">
                  {bancoExamenes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('historial')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'historial'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600 font-black ring-1 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-table-list text-emerald-500 text-xs"></i>
              <span>Historial</span>
              {historialPruebas.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  {historialPruebas.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('analisis')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'analisis'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600 font-black ring-1 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-chart-pie text-indigo-500 text-xs"></i>
              <span>Analítica & KPIs</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('almacen_dudas')}
              className={`lg:flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                tabActiva === 'almacen_dudas'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600 font-black ring-1 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-750'
              }`}
              title="Biblioteca: 1. Almacén de Dudas y Notas + 2. Base de Datos de Documentos Locales y Enlaces Web"
            >
              <i className="fa-solid fa-book-bookmark text-amber-500 text-xs"></i>
              <span>Biblioteca</span>
              {(almacenDudas.length > 0 || bibliotecaDocumentos.length > 0) && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  {almacenDudas.length + bibliotecaDocumentos.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER (Ancho completo aprovechando toda la ventana) */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-5 lg:p-6 space-y-6">
        {/* TAB 1: DASHBOARD PRINCIPAL (PROGRESO TEMÁTICO DIARIO + GENERADOR IA) */}
        <div className={tabActiva === 'generador' ? 'block' : 'hidden'}>
          <ProgresoTematicoDiarioWidget
            historialPruebas={historialPruebas}
            almacenDudas={almacenDudas}
            onIrATestFalladas={(catId) => {
              if (catId) setCategoriaFalladasPreseleccionada(catId);
              setTabActiva('test_falladas');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          <AITestGenerator
            onExamenGuardado={handleExamenGuardado}
            examenParaCargar={examenSeleccionadoParaTest}
            onLimpiarExamenCargado={() => setExamenSeleccionadoParaTest(null)}
            onNavegarAlmacenDudas={() => setTabActiva('almacen_dudas')}
            itemsAlmacenDudas={almacenDudas}
            onGuardarEnAlmacenDudas={handleGuardarItemAlmacen}
            onActualizarPreguntaGlobal={handleActualizarPreguntaGlobal}
            onRegistrarResultadoPreguntas={handleRegistrarResultadoPreguntas}
            onExportarExamenPDF={handleExportarExamenAPDF}
          />
        </div>

        {/* TAB EXCLUSIVA: REALIZAR TEST DE PREGUNTAS FALLADAS POR LEY O TEMÁTICA CONCRETA */}
        {tabActiva === 'test_falladas' && (
          <SeccionTestPreguntasFalladas
            historialPruebas={historialPruebas}
            almacenDudas={almacenDudas}
            categoriaPreseleccionada={categoriaFalladasPreseleccionada}
            onLimpiarPreseleccion={() => setCategoriaFalladasPreseleccionada(null)}
            onExamenGuardado={(exFalladas) => {
              handleExamenGuardado(exFalladas);
              mostrarToast(
                `¡Test de preguntas falladas registrado en tu Historial! Las acertadas han dejado de figurar como falladas.`,
                'exito'
              );
            }}
            onGuardarEnAlmacenDudas={handleGuardarItemAlmacen}
            onIrAHistorial={() => setTabActiva('historial')}
            onActualizarPreguntaGlobal={handleActualizarPreguntaGlobal}
            onRegistrarResultadoPreguntas={handleRegistrarResultadoPreguntas}
            onExportarExamenPDF={handleExportarExamenAPDF}
          />
        )}

        {/* TAB 2: SIMULACRO DE EXAMEN OFICIAL UNIFICADO (TEST OFICIAL O ALEATORIO + SUPUESTO + RESERVAS) */}
        {tabActiva === 'simulacro_oficial' && (
          <SeccionSimulacroOficial
            bancoExamenes={bancoExamenes}
            historialPruebas={historialPruebas}
            almacenDudas={almacenDudas}
            onExamenGuardado={(exSimulacro) => {
              handleExamenGuardado(exSimulacro);
              mostrarToast(
                `¡Simulacro Oficial completado y registrado en tu Historial!`,
                'exito'
              );
            }}
            onGuardarEnAlmacenDudas={handleGuardarItemAlmacen}
            onIrAHistorial={() => setTabActiva('historial')}
            onActualizarPreguntaGlobal={handleActualizarPreguntaGlobal}
            onRegistrarResultadoPreguntas={handleRegistrarResultadoPreguntas}
            onCambiarAmbitoExamen={handleCambiarAmbitoExamen}
            onCambiarCategoriaExamen={handleCambiarCategoriaExamen}
            onExportarExamenPDF={handleExportarExamenAPDF}
          />
        )}

        {/* TAB 3: IMPORTAR / BANCO DE EXÁMENES EN JSON Y TXT */}
        {tabActiva === 'importar_json' && (
          <OfficialJsonImporter
            onExamenCargado={(ex) => {
              handleExamenGuardado(ex);
              mostrarToast(`¡Examen "${ex.titulo}" guardado en tu Banco de Exámenes!`, 'exito');
            }}
            onIniciarExamenInmediato={(ex) => {
              iniciarExamenDesdeOtraSeccion(ex);
            }}
            examenesImportados={bancoExamenes}
            historialPruebas={historialPruebas}
            onVerHistorialDeTest={(testId) => {
              setBusquedaHistorial(testId);
              setTabActiva('historial');
            }}
            examenesEliminadosIds={examenesEliminadosIds}
            onEliminarExamen={(id: string, tit?: string) => solicitarEliminarExamen(id, tit, 'banco')}
            onCambiarCategoriaExamen={handleCambiarCategoriaExamen}
            onCambiarAmbitoExamen={handleCambiarAmbitoExamen}
            onCambiarLeyesExamen={handleCambiarLeyesExamen}
            onRenombrarExamen={(id, tit) => solicitarRenombrarExamen(id, tit)}
            onGuardarRespuestasCorregidas={handleGuardarRespuestasCorregidas}
            onExportarExamenPDF={handleExportarExamenAPDF}
          />
        )}

        {/* TAB 4: HISTORIAL Y BIBLIOTECA DE PRUEBAS */}
        {tabActiva === 'historial' && (
          <div className="space-y-6">
            {/* Metric Summary con diseño elevado y resaltado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50/90 dark:bg-indigo-950/35 border-2 border-indigo-300 dark:border-indigo-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] font-black uppercase text-indigo-700 dark:text-indigo-300 block tracking-wider font-mono">
                    Total de Pruebas Realizadas
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {totalPruebasHistorial}
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    {historialPruebas.filter(e => e.tipo === 'unitario').length} Tests · {historialPruebas.filter(e => e.tipo === 'supuesto').length} Supuestos
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-2xs">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
              </div>

              <div className="bg-sky-50/90 dark:bg-sky-950/35 border-2 border-sky-300 dark:border-sky-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] font-black uppercase text-sky-700 dark:text-sky-300 block tracking-wider font-mono">
                    Exámenes del Banco Cubiertos
                  </span>
                  <span className="text-2xl font-black font-mono text-sky-700 dark:text-sky-300 mt-1 block">
                    {examenesDiferentesEvaluados} <span className="text-sm font-normal text-slate-500">/ {bancoExamenes.length}</span>
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    {bancoExamenes.length > 0 ? `${Math.round((examenesDiferentesEvaluados / bancoExamenes.length) * 100)}% de exámenes únicos intentados` : 'Sin pruebas evaluadas'}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center text-lg shadow-2xs">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
              </div>

              <div className="bg-emerald-50/90 dark:bg-emerald-950/35 border-2 border-emerald-300 dark:border-emerald-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-300 block tracking-wider font-mono">
                    Nota Media Transformada
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
                    {notaMedia} <span className="text-xs font-normal text-slate-500">/ 100 PT</span>
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    {parseFloat(notaMedia) >= 50 ? 'Por encima del corte medio' : 'En proceso de preparación'}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-2xs">
                  <i className="fa-solid fa-award"></i>
                </div>
              </div>
            </div>

            {/* List of saved exams */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
              {/* Header and Action Buttons */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono">
                      Biblioteca y Registro
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                      {examenesFiltradosYOrdenados.length} de {historialPruebas.length} Pruebas
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mt-0.5">
                    Historial de Pruebas y Simulacros
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Gestiona, filtra, ordena y reasigna categorías a cualquiera de tus pruebas realizadas o importadas.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
                  <input
                    id="historial-import-file"
                    type="file"
                    accept=".json,.txt,text/plain"
                    onChange={handleImportarArchivoHistorial}
                    className="hidden"
                  />

                  {/* Toggle Vista Historial: Listado vs Tarjetas */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => setVistaHistorial('listado')}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        vistaHistorial === 'listado'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="Ver formato listado ajustable a la pantalla"
                    >
                      <i className="fa-solid fa-table-list text-[11px]"></i>
                      <span>Listado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVistaHistorial('tarjetas')}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        vistaHistorial === 'tarjetas'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="Ver como tarjetas"
                    >
                      <i className="fa-solid fa-grip text-[11px]"></i>
                      <span>Tarjetas</span>
                    </button>
                  </div>

                  <button
                    onClick={() => document.getElementById('historial-import-file')?.click()}
                    className="py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Importar un archivo de examen .json o .txt"
                  >
                    <i className="fa-solid fa-file-import text-indigo-600 dark:text-indigo-400"></i>
                    <span>Importar TXT / JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMostrarModalBackup(true)}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Copia de Seguridad e Importación Integral Única de toda la app (Tests, Historial, Biblioteca con Dudas y Enlaces, etc.)"
                  >
                    <i className="fa-solid fa-shield-halved text-amber-300"></i>
                    <span>Copia Seguridad</span>
                  </button>
                </div>
              </div>

              {/* PANEL DE FILTROS Y BÚSQUEDA RESALTADO E INTUITIVO */}
              {historialPruebas.length > 0 && (
                <div className="p-3.5 bg-indigo-50/80 dark:bg-slate-800 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/70 shadow-2xs space-y-3">
                  {/* Header de filtros */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <i className="fa-solid fa-filter text-[9px]"></i>
                        Filtros del Historial
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {examenesFiltradosYOrdenados.length} de {historialPruebas.length} pruebas filtradas
                      </span>
                    </div>

                    {filtrosActivos && (
                      <button
                        type="button"
                        onClick={resetearFiltros}
                        className="py-0.5 px-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Restablecer todos los filtros"
                      >
                        <i className="fa-solid fa-filter-circle-xmark text-[9px]"></i>
                        <span>Limpiar filtros</span>
                      </button>
                    )}
                  </div>

                  {/* Fila 1: Buscador por texto y controles de ámbito y estado */}
                  <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      <input
                        type="text"
                        value={busquedaHistorial}
                        onChange={(e) => setBusquedaHistorial(e.target.value)}
                        placeholder="Buscar por título, ID o caso fáctico..."
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors shadow-2xs"
                      />
                      {busquedaHistorial && (
                        <button
                          type="button"
                          onClick={() => setBusquedaHistorial('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                          title="Limpiar búsqueda"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Filtro Ámbito con las 3 opciones requeridas */}
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

                      {/* Filtro Estado / Calificación */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 text-xs shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 px-2 uppercase font-mono">Estado:</span>
                        {[
                          { id: 'todos', label: 'Todos' },
                          { id: 'apto', label: 'Apto' },
                          { id: 'no_apto', label: 'No Apto' },
                          { id: 'pendiente', label: 'Sin Realizar' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setFiltroEstado(st.id as any)}
                            className={`py-0.5 px-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                              filtroEstado === st.id
                                ? st.id === 'apto'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : st.id === 'no_apto'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Filtro por Categorías Oficiales */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase font-mono mr-1">
                      Categoría:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiltroCategoria('todos')}
                      className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        filtroCategoria === 'todos'
                          ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white shadow-2xs'
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

                  {/* Fila 3: Filtro por Fecha o Rango de Fechas */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black text-slate-400 uppercase font-mono mr-1 flex items-center gap-1">
                        <i className="fa-regular fa-calendar-days text-[9px] text-indigo-500"></i>
                        <span>Fecha:</span>
                      </span>
                      {[
                        { id: 'todos', label: 'Todo el Histórico' },
                        { id: 'hoy', label: 'Hoy' },
                        { id: 'semana', label: 'Esta Semana' },
                        { id: 'mes', label: 'Este Mes' },
                        { id: 'rango', label: 'Rango de Fecha' },
                      ].map((itemF) => (
                        <button
                          key={itemF.id}
                          type="button"
                          onClick={() => {
                            setFiltroFechaTipo(itemF.id as any);
                          }}
                          className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            filtroFechaTipo === itemF.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-black'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>{itemF.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Controles de Rango de Fecha Personalizado */}
                    {filtroFechaTipo === 'rango' && (
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-2.5 py-1 text-xs shadow-2xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Desde:</span>
                          <input
                            type="date"
                            value={filtroFechaDesde}
                            onChange={(e) => setFiltroFechaDesde(e.target.value)}
                            aria-label="Fecha inicial del filtro"
                            className="bg-transparent border-0 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden text-xs cursor-pointer"
                          />
                        </div>
                        <span className="text-slate-300 dark:text-slate-600 font-mono">→</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Hasta:</span>
                          <input
                            type="date"
                            value={filtroFechaHasta}
                            onChange={(e) => setFiltroFechaHasta(e.target.value)}
                            aria-label="Fecha final del filtro"
                            className="bg-transparent border-0 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden text-xs cursor-pointer"
                          />
                        </div>
                        {(filtroFechaDesde || filtroFechaHasta) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFiltroFechaDesde('');
                              setFiltroFechaHasta('');
                            }}
                            className="text-slate-400 hover:text-rose-500 text-xs ml-1 cursor-pointer"
                            title="Limpiar fechas de rango"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fila 4: Filtro por Bloque Temático / Informática y por Ley / Materia Concreta */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase font-mono shrink-0">
                        <i className="fa-solid fa-layer-group text-indigo-500 mr-1"></i>
                        Temática:
                      </span>
                      <select
                        value={filtroTematicaHistorial}
                        onChange={(e) => setFiltroTematicaHistorial(e.target.value as any)}
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
                        value={filtroLeyHistorial}
                        onChange={(e) => setFiltroLeyHistorial(e.target.value)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="todas">Todas las leyes BOE y materias de Informática ({leyesDisponiblesHistorial.length})</option>
                        {leyesDisponiblesHistorial.map((ley) => (
                          <option key={ley} value={ley}>
                            {ley}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {historialPruebas.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <i className="fa-solid fa-inbox text-3xl text-slate-300 dark:text-slate-600"></i>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No tienes pruebas realizadas en tu historial todavía.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    El Banco de Exámenes contiene las plantillas maestras disponibles para realizar. Cada vez que completes o repitas una prueba, se registrará aquí su resultado sin duplicar el banco.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setTabActiva('importar_json')}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-layer-group text-xs"></i>
                      <span>Ir al Banco de Exámenes</span>
                    </button>
                    <button
                      onClick={() => setTabActiva('generador')}
                      className="py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-amber-500 text-xs"></i>
                      <span>Generar con IA</span>
                    </button>
                  </div>
                </div>
              ) : examenesFiltradosYOrdenados.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <i className="fa-solid fa-filter text-2xl text-slate-300 dark:text-slate-600"></i>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Ningún examen coincide con los filtros aplicados.
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
                <div className="space-y-3">
                  {renderPaginacionHistorial('superior')}

                  {vistaHistorial === 'listado' ? (
                /* FORMATO LISTADO EXHAUSTIVO AJUSTADO SIN BARRA DE DESPLAZAMIENTO */
                <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-xs overflow-hidden no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 select-none">
                        {/* 1. Título y Fecha */}
                        <th
                          onClick={() => toggleOrdenColumna('titulo')}
                          className={`py-2.5 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors ${
                            columnaOrden === 'titulo' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                          title="Hacer clic para ordenar por título o fecha"
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
                          className={`py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[130px] ${
                            columnaOrden === 'categoria' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                          title="Hacer clic para ordenar por categoría del examen"
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
                          className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[110px] ${
                            columnaOrden === 'ambito' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                          title="Hacer clic para ordenar por ámbito (AGE / Madrid)"
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
                          className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[55px] ${
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

                        {/* 5. Punt. Directa */}
                        <th
                          onClick={() => toggleOrdenColumna('pd')}
                          className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[55px] ${
                            columnaOrden === 'pd' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                          title="Puntuación Directa Oficial: Aciertos - (Fallos / 3)"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>PD</span>
                            <span className="text-[9px] font-mono">
                              {columnaOrden === 'pd' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* 6. Punt. Transf. */}
                        <th
                          onClick={() => toggleOrdenColumna('pt')}
                          className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[55px] ${
                            columnaOrden === 'pt' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                          title="Puntuación Transformada (Corte oficial: 25 PT / 50 PT)"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>PT</span>
                            <span className="text-[9px] font-mono">
                              {columnaOrden === 'pt' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* 7. Desglose */}
                        <th className="py-2.5 px-1.5 text-center w-[85px]" title="Aciertos / Fallos / Blancos / Anuladas">
                          <span>A / F / B</span>
                        </th>

                        {/* 8. Calificación */}
                        <th
                          onClick={() => toggleOrdenColumna('calificacion')}
                          className={`py-2.5 px-1.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors w-[80px] ${
                            columnaOrden === 'calificacion' ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                          title="Calificación oficial (Apto / No apto / Sin realizar)"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Estado</span>
                            <span className="text-[9px] font-mono">
                              {columnaOrden === 'calificacion' ? (direccionOrden === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>

                        {/* 9. Acciones */}
                        <th className="py-2.5 px-3 text-right w-[234px] min-w-[234px]">
                          <span>Acciones</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                      {examenesPaginadosHistorial.map((item) => {
                        const totalOrd = item.preguntas.filter((p) => !p.esReserva).length;
                        const totalRes = item.preguntas.filter((p) => p.esReserva).length;
                        const tieneResultado = !!item.resultado;
                        const pd = tieneResultado ? Number(item.resultado?.puntuacionDirecta).toFixed(2) : '-';
                        const pt = tieneResultado ? Number(item.resultado?.puntuacionTransformada).toFixed(2) : '-';
                        const esApto = tieneResultado && (item.resultado?.puntuacionTransformada || 0) >= 25;

                        // Categoría resuelta
                        const categoriaActual: CategoriaExamen = item.categoria || deducirCategoriaExamen(item.tipo, item.origen);
                        const catInfo = CATEGORIAS_EXAMEN_INFO[categoriaActual];

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                          >
                            {/* TÍTULO, FECHA Y METADATOS INTEGRADOS */}
                            <td className="py-2 px-3 overflow-hidden">
                              <div className="min-w-0">
                                <div className="flex items-start gap-1.5">
                                  <span
                                    className="font-bold text-slate-900 dark:text-white leading-snug whitespace-normal break-words text-xs block"
                                    title={item.titulo}
                                  >
                                    {item.titulo}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => solicitarRenombrarExamen(item.id, item.titulo)}
                                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-0.5 cursor-pointer shrink-0 mt-0.5"
                                    title="Renombrar este examen"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                    <i className="fa-regular fa-calendar-days text-[9px] text-indigo-500"></i>
                                    <span>
                                      {item.resultado?.fechaRealizacion
                                        ? item.resultado.fechaRealizacion.split('T')[0]
                                        : item.fecha || 'Sin fecha'}
                                    </span>
                                  </span>
                                  <span>•</span>
                                  {(() => {
                                    const leyesCat = obtenerLeyesNormalizadasDeExamen(item);
                                    const primera = leyesCat[0] || 'Temario C1';
                                    const esOfi = esCatalogacionPruebaOficial(primera);
                                    return (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold truncate max-w-[165px] ${
                                          esOfi
                                            ? primera === ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL
                                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                        title={leyesCat.join(', ')}
                                      >
                                        {primera}
                                        {leyesCat.length > 1 ? ` +${leyesCat.length - 1}` : ''}
                                      </span>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() => setExamenEditandoLeyesHistorial(item)}
                                    className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                    title="Catalogar este examen como Test oficial, Supuesto oficial, leyes BOE o temas de informática"
                                  >
                                    <i className="fa-solid fa-tags text-[8px]"></i>
                                    <span>Catalogar</span>
                                  </button>
                                  {item.anotaciones && item.anotaciones.length > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      • {item.anotaciones.length} notas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* SELECTOR INTERACTIVO DE CATEGORÍA */}
                            <td className="py-2 px-2 whitespace-nowrap overflow-hidden">
                              <div className="relative inline-block w-full">
                                <div
                                  className={`inline-flex items-center justify-between w-full gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer shadow-2xs ${catInfo.bgBadge} ${catInfo.textBadge} ${catInfo.borderBadge}`}
                                  title="Haz clic para reasignar el tipo oficial de esta prueba"
                                >
                                  <span className="truncate flex items-center gap-1">
                                    <i className={`fa-solid ${catInfo.icon} text-[9px]`}></i>
                                    <span className="truncate">{catInfo.label}</span>
                                  </span>
                                  <i className="fa-solid fa-chevron-down text-[7.5px] opacity-70 shrink-0"></i>
                                </div>

                                <select
                                  value={categoriaActual}
                                  onChange={(e) => handleCambiarCategoriaExamen(item.id, e.target.value as CategoriaExamen)}
                                  aria-label={`Cambiar tipo de prueba para ${item.titulo}`}
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

                            {/* SELECTOR INTERACTIVO DE ÁMBITO (AGE - subgrupo C1, Madrid - C1 y AGE/Madrid) */}
                            <td className="py-2 px-1.5 text-center whitespace-nowrap overflow-hidden">
                              <div className="relative inline-block w-full">
                                <div
                                  className={`inline-flex items-center justify-between w-full gap-1 px-1.5 py-1 rounded-md text-[9.5px] font-bold border transition-all cursor-pointer shadow-2xs ${
                                    (AMBITOS_INFO[item.ambito] || AMBITOS_INFO['AGE']).badgeClass
                                  }`}
                                  title="Haz clic para reasignar el ámbito: AGE - subgrupo C1, Madrid - C1 o AGE/Madrid"
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
                                  onChange={(e) => handleCambiarAmbitoExamen(item.id, e.target.value as ConvocatoriaAmbito)}
                                  aria-label={`Cambiar ámbito de examen para ${item.titulo}`}
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

                            {/* PREGUNTAS */}
                            <td className="py-2 px-1.5 text-center whitespace-nowrap font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {item.preguntas.length}
                              </span>
                              {totalRes > 0 && (
                                <span className="text-[9px] text-slate-400 block" title={`${totalOrd} preguntas ordinarias + ${totalRes} reserva`}>
                                  ({totalOrd}+{totalRes})
                                </span>
                              )}
                            </td>

                            {/* PUNTUACIÓN DIRECTA (PD) */}
                            <td className="py-2 px-1.5 text-center whitespace-nowrap font-mono font-bold">
                              {tieneResultado ? (
                                <span className="text-slate-900 dark:text-white px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px]">
                                  {pd}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-normal text-xs">-</span>
                              )}
                            </td>

                            {/* PUNTUACIÓN TRANSFORMADA (PT) */}
                            <td className="py-2 px-1.5 text-center whitespace-nowrap font-mono font-black">
                              {tieneResultado ? (
                                <span
                                  className={`px-1 py-0.5 rounded text-[10.5px] border ${
                                    esApto
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  }`}
                                >
                                  {pt}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-normal text-xs">-</span>
                              )}
                            </td>

                            {/* DESGLOSE */}
                            <td className="py-2 px-1.5 text-center whitespace-nowrap font-mono text-[9.5px]">
                              {tieneResultado && item.resultado ? (
                                <div className="inline-flex items-center justify-center gap-0.5 bg-slate-50 dark:bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60" title={`Aciertos: ${item.resultado.aciertos}, Fallos: ${item.resultado.fallos}, Blancos: ${item.resultado.blancos}${item.resultado.anuladas ? `, Anuladas: ${item.resultado.anuladas}` : ''}`}>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    +{item.resultado.aciertos}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600">/</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-black">
                                    -{item.resultado.fallos}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600">/</span>
                                  <span className="text-slate-400">
                                    {item.resultado.blancos}
                                  </span>
                                  {Boolean(item.resultado.anuladas && item.resultado.anuladas > 0) && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600">/</span>
                                      <span className="text-amber-600 dark:text-amber-400 font-black">
                                        {item.resultado.anuladas}a
                                      </span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Pendiente</span>
                              )}
                            </td>

                            {/* CALIFICACIÓN */}
                            <td className="py-2 px-1.5 text-center whitespace-nowrap font-mono">
                              {tieneResultado ? (
                                <span
                                  className={`inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                    esApto
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                                      : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-700'
                                  }`}
                                >
                                  <i className={`fa-solid ${esApto ? 'fa-check' : 'fa-xmark'} text-[7.5px]`}></i>
                                  <span>{esApto ? 'APTO' : 'NO APTO'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <i className="fa-regular fa-clock text-[7.5px]"></i>
                                  <span>Pendiente</span>
                                </span>
                              )}
                            </td>

                            {/* ACCIONES (estrictamente alineadas con slots de ancho idéntico) */}
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 w-full">
                                {/* Slot 0: Exportar en PDF oficial + Plantilla hoja de respuestas en blanco */}
                                <button
                                  type="button"
                                  onClick={() => handleExportarExamenAPDF(item)}
                                  className="h-7 w-7 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
                                  title="Exportar este test o supuesto en PDF oficial + Plantilla oficial de hoja de respuestas en blanco"
                                >
                                  <i className="fa-solid fa-file-pdf text-[10.5px]"></i>
                                </button>

                                {/* Slot 1: Exportar JSON */}
                                <button
                                  type="button"
                                  onClick={() => exportarExamenAJSON(item, almacenDudas)}
                                  className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
                                  title="Exportar en JSON (incluye enlaces/ficheros de argumentación y datos de dudas)"
                                >
                                  <i className="fa-solid fa-file-code text-indigo-500 text-[10px]"></i>
                                </button>

                                {/* Slot 2: Eliminar del Historial */}
                                <button
                                  type="button"
                                  onClick={() => solicitarEliminarExamen(item.id, item.titulo, 'historial')}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
                                  title="Eliminar este intento del historial"
                                >
                                  <i className="fa-solid fa-trash-can text-[10px]"></i>
                                </button>

                                {/* Slot 3: Reiniciar intento o espaciador fijo */}
                                {tieneResultado ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReiniciarExamen(item)}
                                    className="h-7 w-7 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    title="Reiniciar este examen para realizarlo de nuevo desde cero (el nuevo intento será el considerado en estadísticas y listados)"
                                  >
                                    <i className="fa-solid fa-rotate-right text-[9.5px]"></i>
                                  </button>
                                ) : (
                                  <span className="w-7 h-7 inline-block shrink-0" aria-hidden="true"></span>
                                )}

                                {/* Slot 4: Ver / Hacer (ancho fijo para alineación total) */}
                                <button
                                  type="button"
                                  onClick={() => iniciarExamenDesdeOtraSeccion(item)}
                                  className="w-[74px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                  title={tieneResultado ? 'Ver respuestas y desglose del examen' : 'Iniciar o practicar este examen'}
                                >
                                  <span>{tieneResultado ? 'Ver' : 'Hacer'}</span>
                                  <i className={`fa-solid ${tieneResultado ? 'fa-eye' : 'fa-play'} text-[8px]`}></i>
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
                /* FORMATO TARJETAS */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {examenesPaginadosHistorial.map((item) => {
                    const totalOrd = item.preguntas.filter((p) => !p.esReserva).length;
                    const totalRes = item.preguntas.filter((p) => p.esReserva).length;
                    const tieneResultado = !!item.resultado;
                    const esApto = tieneResultado && (item.resultado?.puntuacionTransformada || 0) >= 25;
                    const categoriaActual: CategoriaExamen = item.categoria || deducirCategoriaExamen(item.tipo, item.origen);
                    const catInfo = CATEGORIAS_EXAMEN_INFO[categoriaActual];

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                          esApto
                            ? 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500 border-l-4 border-l-emerald-500'
                            : tieneResultado
                            ? 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700/80 hover:border-rose-400 dark:hover:border-rose-500 border-l-4 border-l-rose-500'
                            : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 border-l-4 border-l-indigo-400'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Categoría y Ámbito */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="relative inline-block">
                              <span
                                className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border font-mono inline-flex items-center gap-1 cursor-pointer ${catInfo.bgBadge} ${catInfo.textBadge} ${catInfo.borderBadge}`}
                                title="Haz clic para reasignar el tipo oficial"
                              >
                                <i className={`fa-solid ${catInfo.icon} text-[8.5px]`}></i>
                                <span>{catInfo.label}</span>
                                <i className="fa-solid fa-chevron-down text-[7px] opacity-70"></i>
                              </span>
                              <select
                                value={categoriaActual}
                                onChange={(e) => handleCambiarCategoriaExamen(item.id, e.target.value as CategoriaExamen)}
                                aria-label={`Cambiar tipo de prueba para ${item.titulo}`}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              >
                                {CATEGORIAS_EXAMEN_LISTA.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* SELECTOR INTERACTIVO DE ÁMBITO EN MODO TARJETA */}
                            <div className="relative inline-block">
                              <span
                                className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border font-mono inline-flex items-center gap-1 cursor-pointer ${
                                  (AMBITOS_INFO[item.ambito] || AMBITOS_INFO['AGE']).badgeClass
                                }`}
                                title="Haz clic para reasignar el ámbito"
                              >
                                <span>{(AMBITOS_INFO[item.ambito] || AMBITOS_INFO['AGE']).label}</span>
                                <i className="fa-solid fa-chevron-down text-[6.5px] opacity-70"></i>
                              </span>
                              <select
                                value={item.ambito || 'AGE'}
                                onChange={(e) => handleCambiarAmbitoExamen(item.id, e.target.value as ConvocatoriaAmbito)}
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
                          </div>

                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug whitespace-normal break-words">
                              {item.titulo}
                            </h4>
                            <button
                              type="button"
                              onClick={() => solicitarRenombrarExamen(item.id, item.titulo)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 cursor-pointer shrink-0"
                              title="Renombrar este examen"
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                            <span>
                              {item.preguntas.length} preguntas {totalRes > 0 && `(${totalOrd}+${totalRes} res)`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExamenEditandoLeyesHistorial(item)}
                              className="text-[9.5px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-tags text-[8.5px]"></i>
                              <span>Catalogar ({obtenerLeyesNormalizadasDeExamen(item)[0] || 'C1'})</span>
                            </button>
                          </div>

                          {item.resultado ? (
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between font-mono">
                              <span className="text-slate-500 text-[10px]">Puntuación:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {Number(item.resultado.puntuacionDirecta).toFixed(2)} PD
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-black text-[10px] border ${
                                    esApto
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {Number(item.resultado.puntuacionTransformada).toFixed(2)} PT
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 italic font-mono text-center">
                              Sin realizar todavía
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400">{item.fecha}</span>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() => solicitarRenombrarExamen(item.id, item.titulo)}
                              className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                              title="Renombrar examen"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExportarExamenAPDF(item)}
                              className="h-7 px-2 rounded-lg bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Exportar en PDF oficial + Plantilla oficial de hoja de respuestas en blanco"
                            >
                              <i className="fa-solid fa-file-pdf text-[10px] text-rose-600 dark:text-rose-400"></i>
                              <span>PDF</span>
                            </button>

                            <button
                              onClick={() => exportarExamenAJSON(item, almacenDudas)}
                              className="h-7 px-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Exportar este examen con sus preguntas, respuestas, enlaces/ficheros y dudas en JSON"
                            >
                              <i className="fa-solid fa-file-code text-[10px] text-indigo-500"></i>
                              <span>JSON</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => solicitarEliminarExamen(item.id, item.titulo, 'historial')}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center text-xs transition-colors cursor-pointer"
                              title="Eliminar este intento del historial"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>

                            {tieneResultado && (
                              <button
                                type="button"
                                onClick={() => handleReiniciarExamen(item)}
                                className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Reiniciar este examen para realizarlo de nuevo desde cero (el nuevo intento será el considerado en estadísticas y listados)"
                              >
                                <i className="fa-solid fa-rotate-right text-[8.5px] text-amber-600"></i>
                                <span>Reiniciar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => iniciarExamenDesdeOtraSeccion(item)}
                              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>{tieneResultado ? 'Ver' : 'Practicar'}</span>
                              <i className="fa-solid fa-play text-[8px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

                  {renderPaginacionHistorial('inferior')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SECCIÓN DEDICADA DE ANALÍTICA Y RENDIMIENTO DE KPIS */}
        {tabActiva === 'analisis' && (
          <SeccionAnaliticaKPIs
            examenes={historialPruebas}
            onCargarExamen={iniciarExamenDesdeOtraSeccion}
            onIrAGenerador={() => setTabActiva('generador')}
          />
        )}

        {/* TAB 6: BIBLIOTECA (1. ALMACÉN DE DUDAS + 2. BASE DE DATOS DE DOCUMENTOS Y ENLACES) */}
        {tabActiva === 'almacen_dudas' && (
          <SeccionBibliotecaView
            itemsDudas={almacenDudas}
            onActualizarItemsDudas={(nuevosItems) => {
              setAlmacenDudas(nuevosItems);
              try {
                localStorage.setItem('c1_almacen_dudas', JSON.stringify(nuevosItems));
              } catch (_) {}
            }}
            documentosBiblioteca={bibliotecaDocumentos}
            onActualizarDocumentosBiblioteca={(nuevosDocs) => {
              setBibliotecaDocumentos(nuevosDocs);
              guardarBibliotecaDocumentosEnLocalStorage(nuevosDocs);
            }}
            subtemasBiblioteca={subtemasBiblioteca}
            onActualizarSubtemasBiblioteca={(nuevosSubtemas) => {
              setSubtemasBiblioteca(nuevosSubtemas);
              guardarSubtemasBibliotecaEnLocalStorage(nuevosSubtemas);
            }}
            onVerJustificacionPregunta={handleVerJustificacionPregunta}
            onNavegarATab={(tab: any) => setTabActiva(tab)}
            onActualizarPreguntaGlobal={(preg) => handleActualizarPreguntaGlobal(preg)}
            onAbrirCopiaSeguridad={() => setMostrarModalBackup(true)}
          />
        )}

        {/* FOOTER CON VERSIÓN Y AUTORÍA COMPARTIDA */}
        <footer className="mt-8 pt-6 pb-4 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="space-y-0.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="font-black text-slate-800 dark:text-slate-200">Simulador C1 Normas & Supuestos</span>
                <button
                  type="button"
                  onClick={() => setMostrarModalVersion(true)}
                  className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                >
                  Versión 3.1.0 · Ver cambios de la semana
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Autoría Compartida: <strong className="text-indigo-600 dark:text-indigo-400">Julio Sánchez León</strong> & <strong className="text-slate-800 dark:text-slate-100">AI Studio Build</strong>
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Arquitectura de base de datos triple: Banco de Exámenes (plantillas únicas para realizar), Histórico de Pruebas (evaluaciones y KPIs) y Almacén de Dudas con Reglas Mnemotécnicas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px]">
              <span className="font-mono text-slate-400">
                {bancoExamenes.length} en Banco | {historialPruebas.length} en Historial | {almacenDudas.length} en Almacén
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR EXAMEN (SEGURO EN IFRAME) */}
      {examenAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-trash-can"></i>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {examenAEliminar.tipo === 'historial'
                    ? '¿Eliminar este intento del historial?'
                    : '¿Eliminar examen del Banco de Exámenes?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {examenAEliminar.tipo === 'historial'
                    ? 'Se eliminará este intento de tus estadísticas y registro histórico. La plantilla base continuará disponible en el Banco de Exámenes para repetir cuando desees.'
                    : 'Se eliminará esta plantilla del repositorio de exámenes para realizar. Esta acción no se puede deshacer.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
              {examenAEliminar.titulo}
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExamenAEliminar(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarExamen}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-trash-can text-[11px]"></i>
                <span>
                  {examenAEliminar.tipo === 'historial' ? 'Sí, eliminar intento' : 'Sí, eliminar del Banco'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RENOMBRAR EXAMEN GUARDADO / IMPORTADO */}
      {examenARenombrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Renombrar Examen
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Asigna un nombre personalizado a este examen importado o guardado
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Nuevo Título del Examen
              </label>
              <input
                type="text"
                value={nuevoNombreInput}
                onChange={(e) => setNuevoNombreInput(e.target.value)}
                placeholder="Ej. Simulacro Oficial CAM 2026 - Supuesto Práctico"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExamenARenombrar(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!nuevoNombreInput.trim()}
                onClick={confirmarRenombrarExamen}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-check text-[11px]"></i>
                <span>Guardar Nuevo Nombre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COPIA DE SEGURIDAD INTEGRAL */}
      {/* MODAL COPIA DE SEGURIDAD INTEGRAL */}
      {mostrarModalBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shadow-2xs ring-2 ring-indigo-500/20 shrink-0">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Copia de Seguridad e Importación Integral Única
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Exporta o importa en un único archivo JSON todos los aspectos de la app: Tests, Historial, Biblioteca (Dudas y Enlaces), Subtemas, Argumentaciones y Configuración
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarModalBackup(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Cuadros Métricos Resaltados: Tests disponibles, Total de preguntas, Historial y Biblioteca */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                Resumen Unificado de Datos Incluidos en la Copia:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Cuadro 1: Tests Disponibles en Banco */}
                <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-black uppercase text-sky-800 dark:text-sky-300 font-mono">
                    <i className="fa-solid fa-layer-group text-[9px] text-sky-600"></i>
                    <span>Tests Banco</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {bancoExamenes.length}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {bancoExamenes.length === 1 ? 'test disponible' : 'tests disponibles'}
                  </span>
                </div>

                {/* Cuadro 2: Total de Preguntas Disponibles */}
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-black uppercase text-amber-800 dark:text-amber-300 font-mono">
                    <i className="fa-solid fa-circle-question text-[9px] text-amber-600"></i>
                    <span>Total Preguntas</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {totalPreguntasBanco}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    preguntas en banco
                  </span>
                </div>

                {/* Cuadro 3: Historial de Pruebas */}
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-black uppercase text-indigo-800 dark:text-indigo-300 font-mono">
                    <i className="fa-solid fa-clock-rotate-left text-[9px] text-indigo-600"></i>
                    <span>Historial</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    {historialPruebas.length}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    intentos guardados
                  </span>
                </div>

                {/* Cuadro 4: Biblioteca (Dudas + Documentos/Enlaces) */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-black uppercase text-emerald-800 dark:text-emerald-300 font-mono">
                    <i className="fa-solid fa-book-bookmark text-[9px] text-emerald-600"></i>
                    <span>Biblioteca</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {almacenDudas.length + bibliotecaDocumentos.length}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {almacenDudas.length} dudas · {bibliotecaDocumentos.length} enlaces
                  </span>
                </div>
              </div>
            </div>

            {/* Action 1: Export Complete Backup */}
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-linear-to-br from-indigo-50/60 via-white to-white dark:from-indigo-950/30 dark:via-slate-800 dark:to-slate-800 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
                  <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] shrink-0">
                    <i className="fa-solid fa-download"></i>
                  </span>
                  <span>1. Crear y Descargar Copia de Seguridad Única</span>
                </div>
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-800">
                  Todo en 1 archivo .json
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Guarda en un único fichero <strong>.json integral (v3.2)</strong> todos los aspectos de la app: <strong>Banco de Exámenes</strong> ({bancoExamenes.length} tests con {totalPreguntasBanco} preguntas), <strong>Historial de Pruebas</strong> ({historialPruebas.length} intentos), <strong>Biblioteca completa</strong> ({almacenDudas.length} dudas/notas, {bibliotecaDocumentos.length} enlaces a webs/documentos locales y {subtemasBiblioteca.length} subtemas, sin archivos físicos), <strong>Enlaces de argumentación en justificaciones</strong>, <strong>Subrayados/anotaciones</strong>, <strong>Control de preguntas falladas/superadas</strong> y <strong>Configuración</strong>.
              </p>
              <button
                type="button"
                onClick={() =>
                  descargarCopiaSeguridadCompleta(
                    bancoExamenes,
                    historialPruebas,
                    almacenDudas,
                    bibliotecaDocumentos,
                    subtemasBiblioteca
                  )
                }
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>Guardar Copia de Seguridad Integral Única (.json)</span>
              </button>
            </div>

            {/* Action 2: Restore Backup */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-linear-to-br from-slate-50 via-white to-white dark:from-slate-800 dark:via-slate-850 dark:to-slate-850 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                <span className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[11px] shrink-0">
                  <i className="fa-solid fa-upload"></i>
                </span>
                <span>2. Importar y Restaurar Copia de Seguridad Única</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Selecciona tu archivo <strong>.json</strong> de copia de seguridad para restaurar de una sola vez todos tus tests, historial, biblioteca (dudas, enlaces a documentos y subtemas), argumentaciones de preguntas, control de falladas y preferencias.
              </p>
              <input
                id="restore-backup-file-input"
                type="file"
                accept=".json,.txt,text/plain"
                onChange={handleRestaurarArchivoBackup}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('restore-backup-file-input')?.click()}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-folder-open text-emerald-500"></i>
                <span>Importar Archivo de Copia de Seguridad (.json)</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setMostrarModalBackup(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREGUNTAR AL RECUPERAR TEST SI REVISAR O REPETIR DE NUEVO */}
      {examenRecuperarPregunta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  ¿Cómo deseas acceder a este examen?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta prueba ya cuenta con un resultado realizado anteriormente
                </p>
              </div>
            </div>

            {/* Ficha resumen del test */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug whitespace-normal break-words">
                  {examenRecuperarPregunta.titulo}
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                  {examenRecuperarPregunta.resultado?.fechaRealizacion
                    ? examenRecuperarPregunta.resultado.fechaRealizacion.split('T')[0]
                    : examenRecuperarPregunta.fecha || 'Sin fecha'}
                </span>
              </div>

              {examenRecuperarPregunta.resultado && (
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                    PD: {Number(examenRecuperarPregunta.resultado.puntuacionDirecta).toFixed(2)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border font-black ${
                      (examenRecuperarPregunta.resultado.puntuacionTransformada || 0) >= 25
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    PT: {Number(examenRecuperarPregunta.resultado.puntuacionTransformada).toFixed(2)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">
                    +{examenRecuperarPregunta.resultado.aciertos} / -{examenRecuperarPregunta.resultado.fallos} / {examenRecuperarPregunta.resultado.blancos}b
                  </span>
                </div>
              )}
            </div>

            {/* Las 2 opciones solicitadas por el usuario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opción 1: Revisar el realizado */}
              <button
                type="button"
                onClick={() => handleRevisarExamenRealizado(examenRecuperarPregunta)}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-800/80 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    <i className="fa-solid fa-eye text-sm text-indigo-500"></i>
                    <span>Revisar el Realizado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Consulta tus respuestas marcadas, corrección detallada y justificación jurídica en el BOE.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Abrir para revisar</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </span>
              </button>

              {/* Opción 2: Repetirlo de nuevo (Nuevo Intento) */}
              <button
                type="button"
                onClick={() => handleIniciarNuevoIntento(examenRecuperarPregunta)}
                className="p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700/80 hover:border-amber-500 dark:hover:border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-xs">
                    <i className="fa-solid fa-rotate-right text-sm text-amber-600"></i>
                    <span>Repetirlo de Nuevo</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                    Realiza el examen desde cero en blanco. Se guardarán <strong>todos los intentos</strong> en el historial y en los KPIs.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Iniciar nuevo intento</span>
                  <i className="fa-solid fa-play text-[9px]"></i>
                </span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setExamenRecuperarPregunta(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CATALOGACIÓN DE EXAMEN DESDE HISTORIAL */}
      {examenEditandoLeyesHistorial && (
        <SelectorLeyesEInformaticaModal
          isOpen={!!examenEditandoLeyesHistorial}
          onClose={() => setExamenEditandoLeyesHistorial(null)}
          seleccionadasIniciales={obtenerLeyesNormalizadasDeExamen(examenEditandoLeyesHistorial)}
          onGuardar={(nuevasLeyes) => {
            handleCambiarLeyesExamen(examenEditandoLeyesHistorial.id, nuevasLeyes);
            setExamenEditandoLeyesHistorial(null);
          }}
          tituloModal={`Catalogar Prueba: ${examenEditandoLeyesHistorial.titulo}`}
          subtituloModal="Catalógala como Test oficial o Supuesto oficial (para aislarla de búsquedas por leyes), o asigna sus leyes BOE y temas de informática"
        />
      )}

      {/* MODAL DE EXPORTACIÓN EN PDF OFICIAL + PLANTILLA DE HOJA DE RESPUESTAS EN BLANCO */}
      <ExportarExamenPdfModal
        examen={exportacionPDFActiva?.examen || null}
        paqueteInicial={exportacionPDFActiva?.paquete || null}
        supuestosDisponibles={bancoExamenes}
        onClose={() => setExportacionPDFActiva(null)}
      />

      {/* MODAL DE VERSIÓN 3.4 Y ÚLTIMOS CAMBIOS */}
      {mostrarModalVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border-2 border-slate-300 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-linear-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                  <i className="fa-solid fa-code-branch"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Notas de Versión v3.4.0
                    </h3>
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                      PDF Formato Oficial + Plantilla OMR en Blanco
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Resumen de los últimos cambios y mejoras incorporados al Simulador C1 AGE & CAM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalVersion(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/80 space-y-1.5">
                <div className="font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <i className="fa-solid fa-file-pdf text-rose-600"></i>
                  <span>Novedad v3.4 · Exportación de Tests y Supuestos en PDF Oficial + Plantilla Hoja de Respuestas</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  • <strong>Cuadernillo PDF con maquetación oficial CPS/INAP</strong>: Cabeceras encuadradas (<em>PRIMERA PARTE</em>, <em>SUPUESTO I</em>, <em>SUPUESTO II</em>), enunciados numerados en negrita justificados, opciones <em>a) b) c) d)</em> en doble columna automática cuando son breves o columna completa, bloque subrayado de <em>Preguntas de reserva</em>, pie oficial con código de modelo y <em>Página X de Y</em>, y hoja final opcional de <em>Plantilla Definitiva de Respuestas</em>.<br />
                  • <strong>Plantilla Oficial de Hoja de Respuestas OMR en cada exportación</strong>: Se genera automáticamente la hoja oficial verde (<em>Ejemplar para el interesado</em>) con casillas de datos en blanco, recuadro de firma vacío, Primera Parte (1–70 + 5 de reserva) y Segunda Parte Supuesto Práctico (Supuesto I/II + 1–20 + 5 de reserva), descartando cualquier dato personal o respuesta marcada.<br />
                  • <strong>Disponible en todas las secciones</strong>: Generador IA, Simulacro Oficial 70+20, Test de Falladas, Banco de Exámenes e Historial, con opción de descargar por separado o unido en un único PDF.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-1.5">
                <div className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <i className="fa-solid fa-check-double text-emerald-600"></i>
                  <span>Versión 3.3 · Marcado Limpio de Respuestas, Tamaño Fijo y Diferenciación de Cuadros</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  • <strong>Eliminada la información legal duplicada al responder</strong> y <strong>altura invariable en la zona de preguntas</strong> para mantener <strong>Anterior / Justificación / Siguiente</strong> fijos.<br />
                  • <strong>Tonos suaves + visado verde (✓) y aspa roja (✗)</strong> y mayor diferenciación cromática entre cuadros.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/35 border border-teal-300 dark:border-teal-800/80 space-y-1.5">
                <div className="font-black text-teal-900 dark:text-teal-200 flex items-center gap-2">
                  <i className="fa-solid fa-scale-balanced text-teal-600"></i>
                  <span>Versión 3.2 · Ampliación de la Base de Datos de Legislación y Ajustes en Vistas</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  • Incorporados el <strong>Real Decreto 366/2007</strong>, el <strong>IV Convenio Único para el Personal Laboral de la AGE</strong> y el <strong>Real Decreto 951/2005</strong>.<br />
                  • <strong>Nombres de test multilínea</strong> y <strong>edición de respuestas centralizada en el Banco de Test</strong> con recálculo automático en Historial.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 space-y-1.5">
                <div className="font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <i className="fa-solid fa-key text-indigo-600"></i>
                  <span>1. Editor de Respuestas Correctas y Copia de Seguridad Integral Única</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  • Corrección de respuestas (<strong>A, B, C, D o Anulada</strong>) en la ventana de Importación / Banco de Exámenes con recálculo automático de aciertos, fallos, blancos, PD, PT y calificación en el Historial.<br />
                  • <strong>Copia de Seguridad e Importación única</strong> para todos los aspectos de la app: Banco de Exámenes, Historial, Biblioteca (Dudas y Base de Datos de Enlaces a Documentos), Temas Completados y configuración.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-300 dark:border-amber-800/80 space-y-1.5">
                <div className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <i className="fa-solid fa-book-bookmark text-amber-600"></i>
                  <span>2. Sección «Biblioteca» (Dudas + Base de Datos de Documentos y Enlaces)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  • Dos pestañas independientes: <strong>Dudas y Anotaciones</strong> y <strong>Base de Datos de Documentos y Enlaces</strong> (enlaces a ficheros locales o webs externas sin almacenar archivos pesados, etiquetados por tema AGE C1 / CAM, ley o Real Decreto y subtemas, con vista Listado de 10 registros por página y apertura con doble clic). Incluye también el <strong>RD 1708/2011</strong> del Sistema Español de Archivos y soporte para adjuntar enlaces/ficheros locales en la ventana de justificación de cada pregunta.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-400">
                Versión 3.4.0 · Simulador C1 AGE & Comunidad de Madrid
              </span>
              <button
                type="button"
                onClick={() => setMostrarModalVersion(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
