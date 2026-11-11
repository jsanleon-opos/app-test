import React, { useState, useEffect, useMemo } from 'react';
import { ExamenCompleto } from '../types';
import {
  deducirCodigoPiePorDefecto,
  descargarBlobPDF,
  eliminarRegistroTestDescargadoDeLocalStorage,
  generarPaquetePDFOficial,
  leerTestsDescargadosDeLocalStorage,
  limpiarTestsDescargadosDeLocalStorage,
  registrarDescargaTestEnLocalStorage,
  RegistroTestDescargadoPDF,
  ResultadoGeneracionPDFOficial,
} from '../utils/officialPdfExporter';

interface ExportarExamenPdfModalProps {
  examen: ExamenCompleto | null;
  supuestosDisponibles?: ExamenCompleto[];
  historialPruebas?: ExamenCompleto[];
  onNotificarDescarga?: (mensaje: string) => void;
  onClose: () => void;
}

const ETIQUETA_TIPO_ARCHIVO: Record<RegistroTestDescargadoPDF['tipoArchivo'], string> = {
  examen_y_plantilla: 'Examen + Plantilla (2 PDF)',
  todo_en_1_pdf: 'Examen + Plantilla (1 PDF)',
  solo_examen: 'Cuadernillo Examen PDF',
  solo_plantilla: 'Plantilla OMR en blanco',
};

export const ExportarExamenPdfModal: React.FC<ExportarExamenPdfModalProps> = ({
  examen,
  supuestosDisponibles = [],
  historialPruebas = [],
  onNotificarDescarga,
  onClose,
}) => {
  const [modelo, setModelo] = useState<'A' | 'B'>('A');
  const [codigoPie, setCodigoPie] = useState<string>('');
  const [incluirSoluciones, setIncluirSoluciones] = useState<boolean>(true);
  const [supuestoExtra1Id, setSupuestoExtra1Id] = useState<string>('');
  const [supuestoExtra2Id, setSupuestoExtra2Id] = useState<string>('');
  const [descargaRealizadaEnSesion, setDescargaRealizadaEnSesion] = useState<boolean>(false);
  const [testsDescargados, setTestsDescargados] = useState<RegistroTestDescargadoPDF[]>(() =>
    leerTestsDescargadosDeLocalStorage()
  );
  const [mostrarListaCompletaDescargados, setMostrarListaCompletaDescargados] =
    useState<boolean>(false);

  useEffect(() => {
    if (examen) {
      setModelo('A');
      setCodigoPie(deducirCodigoPiePorDefecto(examen, 'A'));
      setIncluirSoluciones(true);
      setSupuestoExtra1Id('');
      setSupuestoExtra2Id('');
      setDescargaRealizadaEnSesion(false);
      setTestsDescargados(leerTestsDescargadosDeLocalStorage());
    }
  }, [examen]);

  const handleCambiarModelo = (nuevoModelo: 'A' | 'B') => {
    setModelo(nuevoModelo);
    if (examen) {
      setCodigoPie((prev) => {
        if (!prev.trim() || /MODELO\s+[AB]\s*$/i.test(prev)) {
          return prev.trim()
            ? prev.replace(/MODELO\s+[AB]\s*$/i, `MODELO ${nuevoModelo}`)
            : deducirCodigoPiePorDefecto(examen, nuevoModelo);
        }
        return prev;
      });
    }
  };

  const listaSupuestos = useMemo(() => {
    if (!examen) return [];
    return supuestosDisponibles.filter(
      (s) =>
        s.id !== examen.id &&
        (s.tipo === 'supuesto' || s.categoria?.startsWith('supuesto')) &&
        Array.isArray(s.preguntas) &&
        s.preguntas.length > 0
    );
  }, [supuestosDisponibles, examen]);

  const paqueteActual = useMemo<ResultadoGeneracionPDFOficial | null>(() => {
    if (!examen) return null;

    const sup1 = listaSupuestos.find((s) => s.id === supuestoExtra1Id) || null;
    const sup2 = listaSupuestos.find((s) => s.id === supuestoExtra2Id) || null;

    return generarPaquetePDFOficial(examen, {
      modelo,
      codigoPiePagina: codigoPie,
      incluirPlantillaSoluciones: incluirSoluciones,
      supuestoAdicional1: sup1,
      supuestoAdicional2: sup2,
    });
  }, [
    examen,
    modelo,
    codigoPie,
    incluirSoluciones,
    supuestoExtra1Id,
    supuestoExtra2Id,
    listaSupuestos,
  ]);

  const comprobarSiYaRealizadoEnHistorial = (reg: RegistroTestDescargadoPDF): boolean => {
    if (!Array.isArray(historialPruebas) || historialPruebas.length === 0) return false;
    const tituloRegNorm = reg.tituloPrincipal.trim().toLowerCase();
    return historialPruebas.some((h) => {
      if (!h.resultado) return false;
      if (h.id === reg.examenId || (reg.testBaseId && h.testBaseId === reg.testBaseId)) {
        return true;
      }
      if (h.testBaseId === reg.examenId) return true;
      return h.titulo.trim().toLowerCase() === tituloRegNorm;
    });
  };

  const ejecutarDescargaExplicita = (
    tipoArchivo: RegistroTestDescargadoPDF['tipoArchivo']
  ) => {
    if (!examen || !paqueteActual) return;

    if (tipoArchivo === 'solo_examen') {
      descargarBlobPDF(
        paqueteActual.cuadernilloBlob,
        paqueteActual.cuadernilloNombreArchivo
      );
    } else if (tipoArchivo === 'solo_plantilla') {
      descargarBlobPDF(
        paqueteActual.plantillaOMRBlob,
        paqueteActual.plantillaOMRNombreArchivo
      );
    } else if (tipoArchivo === 'todo_en_1_pdf') {
      descargarBlobPDF(
        paqueteActual.combinadoBlob,
        paqueteActual.combinadoNombreArchivo
      );
    } else if (tipoArchivo === 'examen_y_plantilla') {
      descargarBlobPDF(
        paqueteActual.cuadernilloBlob,
        paqueteActual.cuadernilloNombreArchivo
      );
      setTimeout(() => {
        descargarBlobPDF(
          paqueteActual.plantillaOMRBlob,
          paqueteActual.plantillaOMRNombreArchivo
        );
      }, 320);
    }

    const actualizados = registrarDescargaTestEnLocalStorage({
      examenId: examen.id,
      testBaseId: examen.testBaseId || examen.id,
      tituloPrincipal: examen.titulo,
      testsIncluidos: paqueteActual.testsIncluidos,
      modelo,
      tipoArchivo,
    });
    setTestsDescargados(actualizados);
    setDescargaRealizadaEnSesion(true);

    if (onNotificarDescarga) {
      onNotificarDescarga(
        `Descarga iniciada (${ETIQUETA_TIPO_ARCHIVO[tipoArchivo]}): "${examen.titulo}".`
      );
    }
  };

  if (!examen || !paqueteActual) return null;

  const registrosVisibles = mostrarListaCompletaDescargados
    ? testsDescargados
    : testsDescargados.slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-850 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border-2 border-slate-300 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO DE LA VENTANA DE DESCARGA (Incluye prueba actual y registro de qué tests se han descargado para realizar) */}
        <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-3.5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Descargar Test y Plantilla Oficial en PDF
                  </h3>
                  {descargaRealizadaEnSesion ? (
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      ✓ Descarga iniciada
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                      Elige qué archivo descargar
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  No se descarga ningún archivo automáticamente: revisa las opciones y pulsa el botón de descarga deseado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-sm cursor-pointer shrink-0"
              title="Cerrar ventana"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Bloque 1 del encabezado: Test / Pruebas preparadas en el encabezado de esta descarga */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <i className="fa-solid fa-heading text-indigo-600 dark:text-indigo-400"></i>
                <span>Encabezado del PDF · Test preparado para realizar:</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                Modelo {modelo} · {paqueteActual.totalOrdinarias} ord.
                {paqueteActual.totalReservas > 0 ? ` + ${paqueteActual.totalReservas} res.` : ''}
              </span>
            </div>
            <ul className="space-y-0.5 text-xs font-bold text-slate-900 dark:text-white">
              {paqueteActual.testsIncluidos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-snug">
                  <i className="fa-solid fa-circle-dot text-[8px] text-indigo-600 dark:text-indigo-400 mt-1 shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bloque 2 del encabezado: Registro de qué tests se han descargado para realizar */}
          <div className="p-3 rounded-2xl bg-slate-100/95 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <i className="fa-solid fa-clipboard-list text-rose-600 dark:text-rose-400"></i>
                <span>Tests descargados para realizar ({testsDescargados.length})</span>
              </span>

              {testsDescargados.length > 0 && (
                <div className="flex items-center gap-2">
                  {testsDescargados.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setMostrarListaCompletaDescargados((prev) => !prev)}
                      className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {mostrarListaCompletaDescargados
                        ? 'Ver menos'
                        : `Ver todos (${testsDescargados.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTestsDescargados(limpiarTestsDescargadosDeLocalStorage())}
                    className="text-[10px] font-mono font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
                    title="Vaciar listado de tests descargados"
                  >
                    Limpiar lista
                  </button>
                </div>
              )}
            </div>

            {testsDescargados.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Aún no has descargado ningún test en PDF. Al pulsar cualquiera de los botones de descarga inferiores quedará anotado aquí para tu control.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {registrosVisibles.map((reg) => {
                  const yaRealizado = comprobarSiYaRealizadoEnHistorial(reg);
                  const fechaCorta = reg.fechaDescargaISO
                    ? reg.fechaDescargaISO.slice(0, 16).replace('T', ' ')
                    : '';
                  return (
                    <div
                      key={reg.id}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                          {reg.testsIncluidos && reg.testsIncluidos.length > 0
                            ? reg.testsIncluidos.join(' · ')
                            : reg.tituloPrincipal}
                        </div>
                        <div className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>Mod. {reg.modelo}</span>
                          <span>•</span>
                          <span>{ETIQUETA_TIPO_ARCHIVO[reg.tipoArchivo]}</span>
                          {fechaCorta && (
                            <>
                              <span>•</span>
                              <span>{fechaCorta}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded border ${
                            yaRealizado
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {yaRealizado ? '✓ Realizado' : 'Pendiente'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTestsDescargados(
                              eliminarRegistroTestDescargadoDeLocalStorage(reg.id)
                            )
                          }
                          className="h-5 w-5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center cursor-pointer"
                          title="Quitar de la lista de tests descargados"
                        >
                          <i className="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dos cuadros diferenciados: 1) Cuadernillo de Examen y 2) Plantilla Oficial Hoja de Respuestas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Cuadro 1: Cuadernillo de Examen Oficial */}
          <div className="p-4 rounded-2xl bg-indigo-50/85 dark:bg-indigo-950/35 border-2 border-indigo-300 dark:border-indigo-700 flex flex-col justify-between gap-3 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                  Documento 1 · Examen
                </span>
                <span className="text-[10.5px] font-mono font-bold text-indigo-800 dark:text-indigo-300">
                  {paqueteActual.paginasCuadernillo} pág.
                  {incluirSoluciones ? ' + clave' : ''}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Cuadernillo Oficial Modelo {modelo}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                Formato oficial INAP/CPS con encabezado del test a realizar, secciones encuadradas, enunciados justificados y opciones <em>a) b) c) d)</em>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => ejecutarDescargaExplicita('solo_examen')}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <i className="fa-solid fa-file-arrow-down"></i>
              <span>Descargar Examen PDF</span>
            </button>
          </div>

          {/* Cuadro 2: Plantilla Oficial de Hoja de Respuestas OMR en Blanco */}
          <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/35 border-2 border-emerald-400 dark:border-emerald-700 flex flex-col justify-between gap-3 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Documento 2 · Hoja OMR
                </span>
                <span className="text-[10.5px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  1 pág. A4
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Plantilla Oficial de Respuestas (En blanco)
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                Idéntica a la hoja oficial verde (1.ª Parte 1–70 + 5 Reserva y 2.ª Parte Supuesto I/II 1–20 + 5 Reserva), <strong>sin datos personales ni respuestas marcadas</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => ejecutarDescargaExplicita('solo_plantilla')}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <i className="fa-solid fa-table-cells"></i>
              <span>Descargar Plantilla en Blanco</span>
            </button>
          </div>
        </div>

        {/* Acciones conjuntas: Descargar ambos archivos por separado o todo unido en 1 único PDF */}
        <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-700 dark:text-slate-200">
            <span className="font-black text-amber-900 dark:text-amber-200 block">
              Descargar Examen + Plantilla Oficial de Respuestas juntos
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-300">
              Elige si prefieres ambos en un único PDF listo para imprimir o en 2 archivos PDF separados.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => ejecutarDescargaExplicita('examen_y_plantilla')}
              className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-600 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <i className="fa-solid fa-copy"></i>
              <span>2 PDF separados</span>
            </button>
            <button
              type="button"
              onClick={() => ejecutarDescargaExplicita('todo_en_1_pdf')}
              className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <i className="fa-solid fa-layer-group"></i>
              <span>Todo en 1 PDF</span>
            </button>
          </div>
        </div>

        {/* Opciones de personalización del cuadernillo antes de descargar */}
        <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10.5px] font-mono font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <i className="fa-solid fa-sliders text-indigo-600"></i>
              <span>Ajustes previos a la descarga</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Selector Modelo A / B */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Modelo de Examen y Hoja
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                {(['A', 'B'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleCambiarModelo(m)}
                    className={`py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      modelo === m
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Modelo {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Código de pie de página */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Código oficial en pie de página
              </label>
              <input
                type="text"
                value={codigoPie}
                onChange={(e) => setCodigoPie(e.target.value)}
                placeholder="2026 - ADVO-L - MODELO A"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Checkbox para incluir o excluir la página final de Plantilla Definitiva de Respuestas */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={incluirSoluciones}
              onChange={(e) => setIncluirSoluciones(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Incluir al final la hoja <strong>«PLANTILLA DEFINITIVA DE RESPUESTAS»</strong> (como en la última página del examen oficial)
            </span>
          </label>

          {/* Selector opcional para anexar Supuesto I / Supuesto II si existen en el Banco */}
          {listaSupuestos.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Anexar Supuesto adicional al PDF (opcional)
                </label>
                <select
                  value={supuestoExtra1Id}
                  onChange={(e) => setSupuestoExtra1Id(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="">Sin supuesto adicional</option>
                  {listaSupuestos.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.titulo} ({sup.preguntas.filter((p) => !p.esReserva).length} preg.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Anexar 2.º Supuesto adicional (opcional)
                </label>
                <select
                  value={supuestoExtra2Id}
                  onChange={(e) => setSupuestoExtra2Id(e.target.value)}
                  disabled={!supuestoExtra1Id}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value="">Sin 2.º supuesto adicional</option>
                  {listaSupuestos
                    .filter((s) => s.id !== supuestoExtra1Id)
                    .map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.titulo} ({sup.preguntas.filter((p) => !p.esReserva).length} preg.)
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
