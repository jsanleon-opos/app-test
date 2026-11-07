import React, { useState } from 'react';
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

  return (
    <div className="space-y-4">
      {/* Selector superior de las 2 secciones de Biblioteca mediante 2 pestañas/botones */}
      <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-5 pt-2">
        <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
                    className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    title="Abrir el gestor único de Copia de Seguridad e Importación Integral de toda la app"
                  >
                    <i className="fa-solid fa-shield-halved text-[9px] text-indigo-500"></i>
                    <span>Incluida en Copia de Seguridad Única de la App</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold">
                    Incluida en Copia de Seguridad Única de la App
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alterna entre tu <strong>Almacén de Dudas y Notas</strong> actual y la{' '}
                <strong>Base de Datos de Documentos Locales y Enlaces Web</strong> clasificada por leyes, temas AGE/CAM y subtemas. Toda la Biblioteca se guarda y restaura unificadamente mediante la <strong>Copia de Seguridad</strong> general.
              </p>
            </div>
          </div>

          {/* Dos botones / pestañas para acceder a una u otra sección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
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
                {itemsDudas.length}
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
                {documentosBiblioteca.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      {subseccionActiva === 'dudas' ? (
        <AlmacenDudasView
          itemsDudas={itemsDudas}
          onActualizarItems={onActualizarItemsDudas}
          onVerJustificacionPregunta={onVerJustificacionPregunta}
          onNavegarATab={onNavegarATab}
          onActualizarPreguntaGlobal={onActualizarPreguntaGlobal}
        />
      ) : (
        <BaseDatosDocumentosView
          documentos={documentosBiblioteca}
          onActualizarDocumentos={onActualizarDocumentosBiblioteca}
          subtemasDisponibles={subtemasBiblioteca}
          onActualizarSubtemas={onActualizarSubtemasBiblioteca}
        />
      )}
    </div>
  );
};
