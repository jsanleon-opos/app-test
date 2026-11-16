import React, { useState, useMemo } from 'react';
import { DocumentoBibliotecaItem, ItemAlmacenDuda, PreguntaExamen } from '../types';
import { AlmacenDudasView } from './AlmacenDudasView';
import { BaseDatosDocumentosView } from './BaseDatosDocumentosView';

interface SeccionBibliotecaViewProps {
  itemsDudas: ItemAlmacenDuda[];
  onActualizarItemsDudas: (items: ItemAlmacenDuda[]) => void;
  documentosBiblioteca: DocumentoBibliotecaItem[];
  onActualizarDocumentosBiblioteca: (docs: DocumentoBibliotecaItem[]) => void;
  subtemasBiblioteca: string[];
  onActualizarSubtemasBiblioteca: (subtemas: string[]) => void;
  onVerJustificacionPregunta?: (pregunta: PreguntaExamen) => void;
  onNavegarATab?: (tab: string) => void;
  onActualizarPreguntaGlobal?: (preguntaActualizada: PreguntaExamen) => void;
  onAbrirCopiaSeguridad?: () => void;
}

export function coincideItemDudaConBusqueda(item: ItemAlmacenDuda, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const enun = (item.enunciado || '').toLowerCase();
  const tit = (item.titulo || '').toLowerCase();
  const com = (item.comentarioUsuario || '').toLowerCase();
  const reg = (item.reglaMnemotecnica || '').toLowerCase();
  const just = item.justificacionLegal
    ? `${item.justificacionLegal.norma || ''} ${item.justificacionLegal.articulo || ''} ${item.justificacionLegal.fundamento || ''}`.toLowerCase()
    : '';
  const opcionesTxt = (item.opciones || [])
    .map((o) => `${o.texto || ''} ${o.explicacion || ''}`)
    .join(' ')
    .toLowerCase();
  const art = item.articuloClave
    ? `${item.articuloClave.ley} ${item.articuloClave.articulo} ${item.articuloClave.literalArticulo} ${item.articuloClave.resumenOClave}`.toLowerCase()
    : '';
  const pl = item.plazoComputo
    ? `${item.plazoComputo.concepto} ${item.plazoComputo.plazo} ${item.plazoComputo.inicioComputo || ''} ${item.plazoComputo.finComputo || ''} ${item.plazoComputo.ley || ''}`.toLowerCase()
    : '';
  const mn = item.atajoMnemotecnia
    ? `${item.atajoMnemotecnia.concepto} ${item.atajoMnemotecnia.reglaOFormula} ${item.atajoMnemotecnia.explicacionTruco}`.toLowerCase()
    : '';
  const inf = item.fichaInformatica
    ? `${item.fichaInformatica.softwareOModulo} ${item.fichaInformatica.atajoOFuncion} ${item.fichaInformatica.sintaxisOEjemplo || ''} ${item.fichaInformatica.explicacion} ${item.fichaInformatica.temaBloque || ''} ${item.fichaInformatica.subtipo || ''}`.toLowerCase()
    : '';
  const leyes = (item.leyesRelacionadas || []).join(' ').toLowerCase();

  return (
    enun.includes(q) ||
    tit.includes(q) ||
    com.includes(q) ||
    reg.includes(q) ||
    just.includes(q) ||
    opcionesTxt.includes(q) ||
    art.includes(q) ||
    pl.includes(q) ||
    mn.includes(q) ||
    inf.includes(q) ||
    leyes.includes(q)
  );
}

export function coincideDocumentoBibliotecaConBusqueda(
  doc: DocumentoBibliotecaItem,
  query: string
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const textoTotal = [
    doc.titulo,
    doc.descripcion || '',
    doc.enlaceORuta,
    doc.nombreArchivoReferencia || '',
    doc.formatoDocumento || '',
    ...(doc.temasAgeC1 || []),
    ...(doc.temasCamC1 || []),
    ...(doc.leyesYDecretos || []),
    ...(doc.subtemas || []),
  ]
    .join(' ')
    .toLowerCase();

  return textoTotal.includes(q);
}

export const SeccionBibliotecaView: React.FC<SeccionBibliotecaViewProps> = ({
  itemsDudas,
  onActualizarItemsDudas,
  documentosBiblioteca,
  onActualizarDocumentosBiblioteca,
  subtemasBiblioteca,
  onActualizarSubtemasBiblioteca,
  onVerJustificacionPregunta,
  onNavegarATab,
  onActualizarPreguntaGlobal,
  onAbrirCopiaSeguridad,
}) => {
  const [subseccionActiva, setSubseccionActiva] = useState<'dudas' | 'documentos'>('dudas');
  const [busquedaBiblioteca, setBusquedaBiblioteca] = useState<string>('');

  const tieneBusquedaActiva = busquedaBiblioteca.trim().length > 0;

  const totalCoincidenciasDudas = useMemo(() => {
    if (!tieneBusquedaActiva) return itemsDudas.length;
    return itemsDudas.filter((it) => coincideItemDudaConBusqueda(it, busquedaBiblioteca)).length;
  }, [itemsDudas, busquedaBiblioteca, tieneBusquedaActiva]);

  const totalCoincidenciasDocumentos = useMemo(() => {
    if (!tieneBusquedaActiva) return documentosBiblioteca.length;
    return documentosBiblioteca.filter((doc) =>
      coincideDocumentoBibliotecaConBusqueda(doc, busquedaBiblioteca)
    ).length;
  }, [documentosBiblioteca, busquedaBiblioteca, tieneBusquedaActiva]);

  return (
    <div className="space-y-4">
      {/* Cabecera superior de Biblioteca con buscador unificado en tiempo real */}
      <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-5 pt-2">
        <div className="bg-amber-50/80 dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-500 to-indigo-600 text-white flex items-center justify-center text-base shadow-xs shrink-0">
                <i className="fa-solid fa-book-bookmark"></i>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Biblioteca de Estudio & Documentación C1 (AGE & CAM)
                  </h2>
                  {onAbrirCopiaSeguridad ? (
                    <button
                      type="button"
                      onClick={onAbrirCopiaSeguridad}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Abrir el gestor único de Copia de Seguridad e Importación Integral de toda la app"
                    >
                      <i className="fa-solid fa-shield-halved text-[9px] text-indigo-500"></i>
                      <span>Incluida en Copia de Seguridad Única de la App</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-[10px] font-mono font-bold">
                      Incluida en Copia de Seguridad Única de la App
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Alterna entre tu <strong>Almacén de Dudas y Notas</strong> y la{' '}
                  <strong>Base de Datos de Documentos Locales y Enlaces Web</strong>, o filtra ambos simultáneamente en tiempo real.
                </p>
              </div>
            </div>

            {/* Dos botones / pestañas con conteo vivo filtrado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-amber-100/80 dark:bg-slate-900 p-1.5 rounded-2xl border border-amber-300 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setSubseccionActiva('dudas')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  subseccionActiva === 'dudas'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-600 ring-1 ring-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <i className="fa-solid fa-box-archive text-amber-500"></i>
                <span>1. Almacén de Dudas y Notas</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px] border border-amber-200 dark:border-amber-800">
                  {tieneBusquedaActiva
                    ? `${totalCoincidenciasDudas}/${itemsDudas.length}`
                    : itemsDudas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubseccionActiva('documentos')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  subseccionActiva === 'documentos'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-300 dark:border-emerald-600 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <i className="fa-solid fa-folder-tree text-emerald-500"></i>
                <span>2. Base de Datos de Documentos y Enlaces</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] border border-emerald-200 dark:border-emerald-800">
                  {tieneBusquedaActiva
                    ? `${totalCoincidenciasDocumentos}/${documentosBiblioteca.length}`
                    : documentosBiblioteca.length}
                </span>
              </button>
            </div>
          </div>

          {/* BUSCADOR UNIFICADO EN TIEMPO REAL PARA TODA LA BIBLIOTECA */}
          <div className="pt-2.5 border-t border-amber-200/80 dark:border-slate-700 flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 dark:text-indigo-400 text-xs"></i>
              <input
                type="text"
                value={busquedaBiblioteca}
                onChange={(e) => setBusquedaBiblioteca(e.target.value)}
                aria-label="Buscar simultáneamente en Almacén de Dudas y Base de datos de Documentos"
                placeholder="Buscar en toda la Biblioteca (filtra simultáneamente Almacén de Dudas y Base de datos de Documentos por palabra clave, ley, artículo, plazo o tema)..."
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-600 focus:border-indigo-500 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden shadow-2xs"
              />
              {tieneBusquedaActiva && (
                <button
                  type="button"
                  onClick={() => setBusquedaBiblioteca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  title="Limpiar búsqueda de Biblioteca"
                >
                  <i className="fa-solid fa-circle-xmark text-sm"></i>
                </button>
              )}
            </div>

            {tieneBusquedaActiva && (
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono shrink-0">
                <button
                  type="button"
                  onClick={() => setSubseccionActiva('dudas')}
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-colors ${
                    subseccionActiva === 'dudas'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                  }`}
                >
                  Dudas: {totalCoincidenciasDudas}
                </button>
                <button
                  type="button"
                  onClick={() => setSubseccionActiva('documentos')}
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-colors ${
                    subseccionActiva === 'documentos'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  Documentos: {totalCoincidenciasDocumentos}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido de la pestaña activa filtrado en tiempo real */}
      {subseccionActiva === 'dudas' ? (
        <AlmacenDudasView
          itemsDudas={itemsDudas}
          onActualizarItems={onActualizarItemsDudas}
          onVerJustificacionPregunta={onVerJustificacionPregunta}
          onNavegarATab={onNavegarATab}
          onActualizarPreguntaGlobal={onActualizarPreguntaGlobal}
          busquedaGlobal={busquedaBiblioteca}
          onCambiarBusquedaGlobal={setBusquedaBiblioteca}
        />
      ) : (
        <BaseDatosDocumentosView
          documentos={documentosBiblioteca}
          onActualizarDocumentos={onActualizarDocumentosBiblioteca}
          subtemasDisponibles={subtemasBiblioteca}
          onActualizarSubtemas={onActualizarSubtemasBiblioteca}
          busquedaGlobal={busquedaBiblioteca}
          onCambiarBusquedaGlobal={setBusquedaBiblioteca}
        />
      )}
    </div>
  );
};
