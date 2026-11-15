import React, { useState, useMemo } from 'react';
import {
  ExamenCompleto,
  ItemAlmacenDuda,
  DocumentoBibliotecaItem,
  CategoriaExamen,
} from '../types';
import {
  exportarCopiaSeguridadAvanzada,
  restaurarCopiaSeguridadCompletaAsync,
  ModalidadExportacionCopia,
  FormatoExportacionCopia,
  ResumenCopiaSeguridadExportada,
  ResultadoRestauracionCopia,
  CATEGORIAS_EXAMEN_LISTA,
} from '../utils/jsonExamHelper';
import {
  CATEGORIAS_TEMARIO_PROGRESO,
  CategoriaTemarioId,
  clasificarExamenEnCategoriasTemario,
} from '../utils/tematicaClassifier';
import {
  formatearTamanoBytes,
  leerArchivoTextoOGzip,
  soportaCompresionGzipNativa,
} from '../utils/backupCompression';
import { EstadoBaseDatosIDB } from '../utils/idbPersistentStore';

interface GestorCopiasSeguridadModalProps {
  isOpen: boolean;
  onClose: () => void;
  estadoIDB: EstadoBaseDatosIDB;
  bancoExamenes: ExamenCompleto[];
  historialPruebas: ExamenCompleto[];
  almacenDudas: ItemAlmacenDuda[];
  bibliotecaDocumentos: DocumentoBibliotecaItem[];
  subtemasBiblioteca: string[];
  examenesEliminadosIds: string[];
  totalPreguntasFalladas: number;
  onCopiaRestaurada: (
    resultado: ResultadoRestauracionCopia,
    modoAplicado: 'fusionar' | 'reemplazar',
    nombreArchivo: string
  ) => void;
  onNotificar: (texto: string, tipo: 'exito' | 'error' | 'info') => void;
}

export const GestorCopiasSeguridadModal: React.FC<GestorCopiasSeguridadModalProps> = ({
  isOpen,
  onClose,
  estadoIDB,
  bancoExamenes,
  historialPruebas,
  almacenDudas,
  bibliotecaDocumentos,
  subtemasBiblioteca,
  examenesEliminadosIds,
  totalPreguntasFalladas,
  onCopiaRestaurada,
  onNotificar,
}) => {
  const [modalidadActiva, setModalidadActiva] = useState<ModalidadExportacionCopia>('completa');
  const [modoImportacion, setModoImportacion] = useState<'fusionar' | 'reemplazar'>('fusionar');
  const [procesandoAccion, setProcesandoAccion] = useState<string | null>(null);
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);
  const [ultimoResumenExportado, setUltimoResumenExportado] =
    useState<ResumenCopiaSeguridadExportada | null>(null);
  const [dragActivo, setDragActivo] = useState<boolean>(false);

  // Estado para Modalidad 3: Selección por Bloques o Exámenes concretos
  const [busquedaSeleccion, setBusquedaSeleccion] = useState<string>('');
  const [filtroBloqueSeleccion, setFiltroBloqueSeleccion] = useState<'todos' | CategoriaTemarioId>('todos');
  const [filtroCategoriaSeleccion, setFiltroCategoriaSeleccion] = useState<'todos' | CategoriaExamen>('todos');
  const [idsSeleccionados, setIdsSeleccionados] = useState<Set<string>>(() => new Set());

  const gzipDisponible = useMemo(() => soportaCompresionGzipNativa(), []);

  const totalPreguntasBanco = useMemo(
    () =>
      bancoExamenes.reduce(
        (acc, ex) => acc + (Array.isArray(ex.preguntas) ? ex.preguntas.length : 0),
        0
      ),
    [bancoExamenes]
  );

  // Clasificación por bloques temáticos para la modalidad 3
  const mapaBloquesPorExamen = useMemo(() => {
    const mapa = new Map<string, CategoriaTemarioId[]>();
    bancoExamenes.forEach((ex) => {
      mapa.set(ex.id, clasificarExamenEnCategoriasTemario(ex));
    });
    return mapa;
  }, [bancoExamenes]);

  const examenesFiltradosSeleccion = useMemo(() => {
    const q = busquedaSeleccion.trim().toLowerCase();
    return bancoExamenes.filter((ex) => {
      if (filtroCategoriaSeleccion !== 'todos' && ex.categoria !== filtroCategoriaSeleccion) {
        return false;
      }
      if (filtroBloqueSeleccion !== 'todos') {
        const bloques = mapaBloquesPorExamen.get(ex.id) || [];
        if (!bloques.includes(filtroBloqueSeleccion)) {
          return false;
        }
      }
      if (q) {
        const enTitulo = (ex.titulo || '').toLowerCase().includes(q);
        const enLeyes = (ex.leyesBOEAplicadas || []).some((l) => l.toLowerCase().includes(q));
        if (!enTitulo && !enLeyes) return false;
      }
      return true;
    });
  }, [bancoExamenes, busquedaSeleccion, filtroBloqueSeleccion, filtroCategoriaSeleccion, mapaBloquesPorExamen]);

  const resumenSeleccionActual = useMemo(() => {
    let examenes = 0;
    let preguntas = 0;
    bancoExamenes.forEach((ex) => {
      if (idsSeleccionados.has(ex.id)) {
        examenes++;
        preguntas += Array.isArray(ex.preguntas) ? ex.preguntas.length : 0;
      }
    });
    return { examenes, preguntas };
  }, [bancoExamenes, idsSeleccionados]);

  if (!isOpen) return null;

  const toggleExamenSeleccionado = (id: string) => {
    setIdsSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const marcarVisibles = () => {
    setIdsSeleccionados((prev) => {
      const next = new Set(prev);
      examenesFiltradosSeleccion.forEach((ex) => next.add(ex.id));
      return next;
    });
  };

  const desmarcarVisibles = () => {
    setIdsSeleccionados((prev) => {
      const next = new Set(prev);
      examenesFiltradosSeleccion.forEach((ex) => next.delete(ex.id));
      return next;
    });
  };

  const toggleBloqueCompleto = (bloqueId: CategoriaTemarioId) => {
    const examenesDelBloque = bancoExamenes.filter((ex) =>
      (mapaBloquesPorExamen.get(ex.id) || []).includes(bloqueId)
    );
    if (examenesDelBloque.length === 0) return;

    const todosMarcados = examenesDelBloque.every((ex) => idsSeleccionados.has(ex.id));
    setIdsSeleccionados((prev) => {
      const next = new Set(prev);
      examenesDelBloque.forEach((ex) => {
        if (todosMarcados) {
          next.delete(ex.id);
        } else {
          next.add(ex.id);
        }
      });
      return next;
    });
  };

  const handleEjecutarExportacion = async (
    modalidad: ModalidadExportacionCopia,
    formato: FormatoExportacionCopia
  ) => {
    setErrorImportacion(null);
    setUltimoResumenExportado(null);
    const etiquetaProceso =
      formato === 'json_gz'
        ? 'Validando IndexedDB y comprimiendo copia GZIP...'
        : 'Validando integridad contra IndexedDB y preparando JSON...';
    setProcesandoAccion(etiquetaProceso);

    try {
      const etiquetaBloque =
        filtroBloqueSeleccion !== 'todos'
          ? filtroBloqueSeleccion
          : filtroCategoriaSeleccion !== 'todos'
          ? filtroCategoriaSeleccion
          : `${idsSeleccionados.size}_examenes`;

      const resultado = await exportarCopiaSeguridadAvanzada({
        modalidad,
        formato,
        bancoExamenes,
        historialPruebas,
        almacenDudas,
        bibliotecaDocumentos,
        subtemasBiblioteca,
        examenesEliminadosIds,
        idsExamenesSeleccionados: Array.from(idsSeleccionados),
        etiquetaBloqueOSeleccion: etiquetaBloque,
      });

      if (resultado.ok && resultado.resumen) {
        const r = resultado.resumen;
        setUltimoResumenExportado(r);
        const tamanoFinal = formatearTamanoBytes(r.tamanoBytes);
        const infoAhorro =
          r.formato === 'json_gz' && r.porcentajeReduccion > 0
            ? ` (ahorro GZIP del ${r.porcentajeReduccion}% desde ${formatearTamanoBytes(r.tamanoSinComprimirBytes)})`
            : '';

        const textoResumen =
          r.modalidad === 'solo_progreso'
            ? `Copia de Solo Progreso exportada y verificada (${tamanoFinal}${infoAhorro}): ${r.totalHistorialPruebas} intentos, ${r.totalDudasAlmacen} dudas y ${r.totalDocumentosBiblioteca} enlaces.`
            : r.modalidad === 'seleccion_examenes'
            ? `Copia parcial exportada y verificada (${tamanoFinal}${infoAhorro}): ${r.totalBancoExamenes} exámenes seleccionados y ${r.totalPreguntasBanco} preguntas.`
            : `Copia Completa exportada al 100% y cotejada con IndexedDB (${tamanoFinal}${infoAhorro}): ${r.totalBancoExamenes} exámenes · ${r.totalPreguntasBanco.toLocaleString('es-ES')} preguntas · ${r.totalHistorialPruebas} intentos · ${r.totalDudasAlmacen} dudas.`;

        onNotificar(textoResumen, 'exito');
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al generar la exportación.';
      setErrorImportacion(msg);
      onNotificar(msg, 'error');
    } finally {
      setProcesandoAccion(null);
    }
  };

  const procesarArchivoImportado = async (file: File) => {
    setErrorImportacion(null);
    setUltimoResumenExportado(null);

    const lower = file.name.toLowerCase();
    const extensionValida =
      lower.endsWith('.json') ||
      lower.endsWith('.json.gz') ||
      lower.endsWith('.gz') ||
      lower.endsWith('.txt');

    if (!extensionValida) {
      const msg =
        'Formato no admitido: selecciona un archivo de copia de seguridad .json o comprimido .json.gz.';
      setErrorImportacion(msg);
      onNotificar(msg, 'error');
      return;
    }

    setProcesandoAccion(
      lower.endsWith('.gz')
        ? `Descomprimiendo "${file.name}" (${formatearTamanoBytes(file.size)}) y verificando integridad...`
        : `Leyendo "${file.name}" (${formatearTamanoBytes(file.size)}) y validando estructura íntegra...`
    );

    try {
      const textoDescomprimido = await leerArchivoTextoOGzip(file);
      const resultadoRestauracion = await restaurarCopiaSeguridadCompletaAsync(textoDescomprimido, {
        modo: modoImportacion,
      });
      onCopiaRestaurada(resultadoRestauracion, modoImportacion, file.name);
    } catch (err: any) {
      const mensajeClaro =
        err?.message && String(err.message).includes('Archivo corrupto o incompleto')
          ? String(err.message)
          : `Archivo corrupto o incompleto: ${err?.message || 'no se pudo validar la estructura del archivo. Tus datos actuales permanecen intactos.'}`;
      setErrorImportacion(mensajeClaro);
      onNotificar(mensajeClaro, 'error');
    } finally {
      setProcesandoAccion(null);
    }
  };

  const handleInputArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void procesarArchivoImportado(file);
    }
    e.target.value = '';
  };

  const handleDropArchivo = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActivo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void procesarArchivoImportado(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[94vh] overflow-y-auto">
        {/* Cabecera del Gestor */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
              <i className="fa-solid fa-database"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Copias de Seguridad y Almacenamiento Persistente IndexedDB (v3.8)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquitectura preparada para más de 10.000 preguntas, 300 exámenes y archivos de +20 MB con compresión GZIP nativa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(procesandoAccion)}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer transition-colors"
            title="Cerrar ventana"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Barra de Estado de Base de Datos Local IndexedDB */}
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                estadoIDB.guardando
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            ></span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {estadoIDB.guardando
                ? 'Sincronizando en IndexedDB...'
                : `Guardado localmente: ${bancoExamenes.length.toLocaleString('es-ES')} exámenes · ${totalPreguntasBanco.toLocaleString('es-ES')} preguntas`}
            </span>
            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">·</span>
            <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              {historialPruebas.length} intentos · {almacenDudas.length} dudas · {bibliotecaDocumentos.length} enlaces · {totalPreguntasFalladas} falladas activas
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
            IndexedDB activo · Sin límite de 5 MB
          </span>
        </div>

        {/* Indicador de progreso cuando está comprimiendo / descomprimiendo archivos grandes */}
        {procesandoAccion && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-200 font-semibold">
            <i className="fa-solid fa-spinner fa-spin text-indigo-600 dark:text-indigo-400 text-sm"></i>
            <span>{procesandoAccion}</span>
          </div>
        )}

        {/* Banner de Error de Validación (sin borrar datos existentes) */}
        {errorImportacion && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-start justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
            <div className="flex items-start gap-2.5">
              <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 mt-0.5"></i>
              <div className="space-y-0.5">
                <p className="font-bold">{errorImportacion}</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  Operación cancelada de forma segura: ningún examen, intento ni duda actual ha sido borrado ni alterado.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorImportacion(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer px-1"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Confirmación exacta tras exportar */}
        {ultimoResumenExportado && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-100">
            <div className="flex items-start gap-2.5">
              <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-sm mt-0.5"></i>
              <div className="space-y-1">
                <p className="font-bold">
                  Exportación completada y verificada al 100% frente a IndexedDB: {ultimoResumenExportado.nombreArchivo}
                </p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono">
                  {ultimoResumenExportado.totalBancoExamenes} exámenes ·{' '}
                  {ultimoResumenExportado.totalPreguntasBanco.toLocaleString('es-ES')} preguntas ·{' '}
                  {ultimoResumenExportado.totalHistorialPruebas} intentos ·{' '}
                  {ultimoResumenExportado.totalDudasAlmacen} dudas ·{' '}
                  {ultimoResumenExportado.totalDocumentosBiblioteca} enlaces · Tamaño final:{' '}
                  {formatearTamanoBytes(ultimoResumenExportado.tamanoBytes)}
                  {ultimoResumenExportado.porcentajeReduccion > 0
                    ? ` (${ultimoResumenExportado.porcentajeReduccion}% menor que los ${formatearTamanoBytes(
                        ultimoResumenExportado.tamanoSinComprimirBytes
                      )} sin comprimir)`
                    : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUltimoResumenExportado(null)}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer px-1"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* SECCIÓN 1: TRES MODALIDADES DE EXPORTACIÓN */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
              <i className="fa-solid fa-download text-indigo-600 dark:text-indigo-400"></i>
              <span>1. Exportar Datos (Blob directo + Validación 100% IndexedDB)</span>
            </div>

            {/* Selector de las 3 modalidades */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/75 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 flex-wrap">
              <button
                type="button"
                onClick={() => setModalidadActiva('completa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modalidadActiva === 'completa'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Copia Completa
              </button>
              <button
                type="button"
                onClick={() => setModalidadActiva('solo_progreso')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modalidadActiva === 'solo_progreso'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Solo Progreso e Historial
              </button>
              <button
                type="button"
                onClick={() => setModalidadActiva('seleccion_examenes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modalidadActiva === 'seleccion_examenes'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Por Bloques / Exámenes
              </button>
            </div>
          </div>

          {/* CONTENIDO MODALIDAD 1: COPIA COMPLETA */}
          {modalidadActiva === 'completa' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Copia de Seguridad Completa (.json.gz y .json)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Incluye el banco de exámenes completo ({bancoExamenes.length} exámenes y{' '}
                  {totalPreguntasBanco.toLocaleString('es-ES')} preguntas), historial de pruebas ({historialPruebas.length}{' '}
                  intentos), anotaciones, dudas ({almacenDudas.length}), enlaces de biblioteca ({bibliotecaDocumentos.length}) y configuración. El formato comprimido <strong>.json.gz</strong> reduce el peso un 80-85% para respaldar colecciones de +20 MB en pocos megabytes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={Boolean(procesandoAccion) || !gzipDisponible}
                  onClick={() => void handleEjecutarExportacion('completa', 'json_gz')}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-file-zipper"></i>
                  <span>Descargar Comprimida GZIP (.json.gz · -85%)</span>
                </button>

                <button
                  type="button"
                  disabled={Boolean(procesandoAccion)}
                  onClick={() => void handleEjecutarExportacion('completa', 'json')}
                  className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-file-code text-indigo-600 dark:text-indigo-400"></i>
                  <span>Descargar Estándar sin Comprimir (.json)</span>
                </button>
              </div>
            </div>
          )}

          {/* CONTENIDO MODALIDAD 2: SOLO PROGRESO E HISTORIAL */}
          {modalidadActiva === 'solo_progreso' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Solo Progreso e Historial (.json ultraligero)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Excluye por completo el banco de preguntas ({bancoExamenes.length} exámenes omitidos) y guarda únicamente{' '}
                  <strong>historialPruebas</strong> ({historialPruebas.length} intentos), estadísticas, control de fallos y superadas, dudas ({almacenDudas.length}), anotaciones, enlaces de biblioteca y configuración. Ideal para sincronizar avances diarios en segundos sin tocar tu banco de exámenes actual al restaurar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={Boolean(procesandoAccion)}
                  onClick={() => void handleEjecutarExportacion('solo_progreso', 'json')}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-bolt"></i>
                  <span>Descargar Solo Progreso e Historial (.json)</span>
                </button>

                <button
                  type="button"
                  disabled={Boolean(procesandoAccion) || !gzipDisponible}
                  onClick={() => void handleEjecutarExportacion('solo_progreso', 'json_gz')}
                  className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-file-zipper text-indigo-600 dark:text-indigo-400"></i>
                  <span>Descargar Progreso Comprimido (.json.gz)</span>
                </button>
              </div>
            </div>
          )}

          {/* CONTENIDO MODALIDAD 3: EXPORTAR POR BLOQUES O EXÁMENES SELECCIONADOS */}
          {modalidadActiva === 'seleccion_examenes' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Exportar por Bloques o Exámenes Seleccionados
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marca bloques temáticos completos o exámenes concretos para generar copias parciales ligeras.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  Seleccionados: {resumenSeleccionActual.examenes} exámenes ·{' '}
                  {resumenSeleccionActual.preguntas.toLocaleString('es-ES')} preguntas
                </span>
              </div>

              {/* Selección rápida por Bloques Oficiales C1 */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  Marcar / desmarcar rápido por bloque temático:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIAS_TEMARIO_PROGRESO.map((cat) => {
                    const delBloque = bancoExamenes.filter((ex) =>
                      (mapaBloquesPorExamen.get(ex.id) || []).includes(cat.id)
                    );
                    if (delBloque.length === 0) return null;
                    const todosMarcados = delBloque.every((ex) => idsSeleccionados.has(ex.id));
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleBloqueCompleto(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          todosMarcados
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {cat.sigla} ({delBloque.length})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtros y buscador de exámenes concretos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={busquedaSeleccion}
                  onChange={(e) => setBusquedaSeleccion(e.target.value)}
                  placeholder="Buscar examen por título o ley..."
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                />
                <select
                  value={filtroBloqueSeleccion}
                  onChange={(e) => setFiltroBloqueSeleccion(e.target.value as 'todos' | CategoriaTemarioId)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="todos">Todos los bloques temáticos</option>
                  {CATEGORIAS_TEMARIO_PROGRESO.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={filtroCategoriaSeleccion}
                  onChange={(e) => setFiltroCategoriaSeleccion(e.target.value as 'todos' | CategoriaExamen)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="todos">Todas las categorías</option>
                  {CATEGORIAS_EXAMEN_LISTA.map((catItem) => (
                    <option key={catItem.id} value={catItem.id}>
                      {catItem.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Acciones masivas sobre lista filtrada */}
              <div className="flex items-center justify-between gap-2 text-[11px] flex-wrap">
                <span className="text-slate-500 dark:text-slate-400">
                  Mostrando {examenesFiltradosSeleccion.length} de {bancoExamenes.length} exámenes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={marcarVisibles}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    Seleccionar visibles
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={desmarcarVisibles}
                    className="text-slate-600 dark:text-slate-400 hover:underline font-semibold cursor-pointer"
                  >
                    Desmarcar visibles
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => setIdsSeleccionados(new Set())}
                    className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                </div>
              </div>

              {/* Lista desplazable de exámenes */}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
                {examenesFiltradosSeleccion.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    No hay exámenes que coincidan con el filtro actual.
                  </p>
                ) : (
                  examenesFiltradosSeleccion.map((ex) => {
                    const checked = idsSeleccionados.has(ex.id);
                    const numPregs = Array.isArray(ex.preguntas) ? ex.preguntas.length : 0;
                    return (
                      <label
                        key={ex.id}
                        className={`flex items-center justify-between gap-3 px-3 py-2 text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                            : 'hover:bg-white dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExamenSeleccionado(ex.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {ex.titulo}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          {ex.ambito} · {numPregs} preg.
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={Boolean(procesandoAccion) || resumenSeleccionActual.examenes === 0}
                  onClick={() => void handleEjecutarExportacion('seleccion_examenes', 'json')}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-file-export"></i>
                  <span>
                    Exportar Selección ({resumenSeleccionActual.examenes} exámenes) en .json
                  </span>
                </button>

                <button
                  type="button"
                  disabled={
                    Boolean(procesandoAccion) ||
                    resumenSeleccionActual.examenes === 0 ||
                    !gzipDisponible
                  }
                  onClick={() => void handleEjecutarExportacion('seleccion_examenes', 'json_gz')}
                  className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-50 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-file-zipper text-indigo-600 dark:text-indigo-400"></i>
                  <span>Exportar Selección Comprimida (.json.gz)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: IMPORTACIÓN INTELIGENTE (.json y .json.gz, SOPORTA ARCHIVOS DE +20 MB) */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
              <i className="fa-solid fa-upload text-emerald-600 dark:text-emerald-400"></i>
              <span>2. Importación Inteligente (.json y .json.gz · Soporta +20 MB)</span>
            </div>

            {/* Selector Restaurar vs Fusionar */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/75 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 flex-wrap">
              <button
                type="button"
                onClick={() => setModoImportacion('fusionar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modoImportacion === 'fusionar'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Fusionar (añadir nuevos)
              </button>
              <button
                type="button"
                onClick={() => setModoImportacion('reemplazar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  modoImportacion === 'reemplazar'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Restaurar (sobrescribir todo)
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {modoImportacion === 'fusionar'
              ? 'Fusionar: añade exámenes, bloques parciales, intentos, dudas y enlaces nuevos sin borrar ninguno de tus datos actuales, guardando el resultado al instante en IndexedDB.'
              : 'Restaurar (sobrescribir todo): reemplaza el estado actual por el contenido exacto de la copia importada (si importas un archivo de "Solo Progreso", conserva tu banco de exámenes actual).'}
          </p>

          <input
            id="gestor-backup-smart-file-input"
            type="file"
            accept=".json,.gz,.json.gz,.txt,application/json,application/gzip,application/x-gzip,text/plain"
            onChange={handleInputArchivoChange}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActivo(true);
            }}
            onDragLeave={() => setDragActivo(false)}
            onDrop={handleDropArchivo}
            onClick={() => {
              if (!procesandoAccion) {
                document.getElementById('gestor-backup-smart-file-input')?.click();
              }
            }}
            className={`p-5 rounded-xl border-2 border-dashed text-center transition-colors cursor-pointer space-y-1.5 ${
              dragActivo
                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 hover:border-emerald-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              <i className="fa-solid fa-folder-open text-emerald-600 dark:text-emerald-400"></i>
              <span>
                Seleccionar o arrastrar copia de seguridad (.json o .json.gz)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Descompresión automática GZIP en flujo nativo · Validación previa anti-corrupción antes de escribir en IndexedDB
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={Boolean(procesandoAccion)}
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
