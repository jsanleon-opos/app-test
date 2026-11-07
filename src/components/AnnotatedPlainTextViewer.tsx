import React, { useState, useEffect, useRef } from 'react';
import { AnotacionResaltado, ColorResaltador } from '../types';

interface AnnotatedPlainTextViewerProps {
  text: string;
  seccion: 'contextoCaso' | 'enunciado' | 'opcion' | 'justificacion';
  preguntaId?: number;
  opcionId?: 'A' | 'B' | 'C' | 'D';
  examenId: string;
  anotaciones: AnotacionResaltado[];
  onGuardarAnotacion: (anotacion: AnotacionResaltado) => void;
  onEliminarAnotacion: (anotacionId: string) => void;
  className?: string;
}

const COLOR_CLASSES: Record<ColorResaltador, { mark: string; dot: string; label: string }> = {
  amarillo: {
    mark: 'bg-yellow-200/90 text-yellow-950 dark:bg-yellow-400/35 dark:text-yellow-100 rounded-xs px-0.5 transition-colors',
    dot: 'bg-yellow-400 hover:bg-yellow-300 ring-yellow-500',
    label: 'Amarillo',
  },
  verde: {
    mark: 'bg-emerald-200/90 text-emerald-950 dark:bg-emerald-400/35 dark:text-emerald-100 rounded-xs px-0.5 transition-colors',
    dot: 'bg-emerald-400 hover:bg-emerald-300 ring-emerald-500',
    label: 'Verde',
  },
  rosa: {
    mark: 'bg-pink-200/90 text-pink-950 dark:bg-pink-400/35 dark:text-pink-100 rounded-xs px-0.5 transition-colors',
    dot: 'bg-pink-400 hover:bg-pink-300 ring-pink-500',
    label: 'Rosa',
  },
  azul: {
    mark: 'bg-sky-200/90 text-sky-950 dark:bg-sky-400/35 dark:text-sky-100 rounded-xs px-0.5 transition-colors',
    dot: 'bg-sky-400 hover:bg-sky-300 ring-sky-500',
    label: 'Azul',
  },
};

export const AnnotatedPlainTextViewer: React.FC<AnnotatedPlainTextViewerProps> = ({
  text,
  seccion,
  preguntaId,
  opcionId,
  examenId,
  anotaciones,
  onGuardarAnotacion,
  onEliminarAnotacion,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingMenuRef = useRef<HTMLDivElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);

  // Floating Contextual Toolbar State
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedTextFragment, setSelectedTextFragment] = useState<string>('');

  // Balloon / Popover Note State
  const [balloonAnotacion, setBalloonAnotacion] = useState<AnotacionResaltado | null>(null);
  const [balloonPos, setBalloonPos] = useState<{ top: number; left: number } | null>(null);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Filter annotations relevant to this specific section / question / option
  const anotacionesRelevantes = anotaciones.filter(
    (a) =>
      a.examenId === examenId &&
      a.seccion === seccion &&
      (preguntaId === undefined || a.preguntaId === preguntaId) &&
      (opcionId === undefined || a.opcionId === opcionId)
  );

  // Click-outside listener to close the balloon popover and floating menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Close floating toolbar if click is outside
      if (floatingMenuRef.current && !floatingMenuRef.current.contains(target)) {
        setMenuPos(null);
      }

      // Close balloon popover if click is outside
      if (balloonRef.current && !balloonRef.current.contains(target)) {
        setBalloonAnotacion(null);
        setIsEditingNote(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Text Selection with cursor
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return;
    }

    const rawSelected = selection.toString();
    const cleanSelected = rawSelected.trim();

    if (cleanSelected.length < 2) {
      setMenuPos(null);
      return;
    }

    // Ensure selection is inside this container
    if (!containerRef.current.contains(selection.anchorNode) || !containerRef.current.contains(selection.focusNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedTextFragment(cleanSelected);

    // Position floating menu right above the selection
    setMenuPos({
      top: rect.top - 50,
      left: Math.max(10, rect.left + rect.width / 2),
    });
  };

  // Apply highlighter color to selected text
  const aplicarColorResaltado = (color: ColorResaltador) => {
    if (!selectedTextFragment) return;

    const nuevaAnotacion: AnotacionResaltado = {
      id: `ANOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      examenId,
      seccion,
      preguntaId,
      opcionId,
      textoSeleccionado: selectedTextFragment,
      color,
      timestamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    };

    onGuardarAnotacion(nuevaAnotacion);
    setMenuPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // Open note balloon from floating menu
  const abrirFormularioNota = () => {
    if (!selectedTextFragment || !menuPos) return;

    const nuevaAnotacion: AnotacionResaltado = {
      id: `ANOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      examenId,
      seccion,
      preguntaId,
      opcionId,
      textoSeleccionado: selectedTextFragment,
      color: 'amarillo',
      comentario: '',
      timestamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    };

    setBalloonAnotacion(nuevaAnotacion);
    setBalloonPos({
      top: menuPos.top + 45,
      left: menuPos.left,
    });
    setTempNoteText('');
    setIsEditingNote(true);
    setMenuPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // Open existing balloon note on click
  const abrirGloboNotaExistente = (e: React.MouseEvent, an: AnotacionResaltado) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setBalloonAnotacion(an);
    setBalloonPos({
      top: rect.bottom + 8,
      left: Math.max(160, rect.left + rect.width / 2),
    });
    setTempNoteText(an.comentario || '');
    setIsEditingNote(false); // Start in view mode so action buttons (delete, edit, color) are instantly visible
  };

  // Delete highlight matching selection directly from floating bar
  const quitarResaltadoSeleccionado = () => {
    if (!selectedTextFragment) return;
    const matching = anotacionesRelevantes.filter(
      (a) =>
        a.textoSeleccionado === selectedTextFragment ||
        a.textoSeleccionado.includes(selectedTextFragment) ||
        selectedTextFragment.includes(a.textoSeleccionado)
    );
    if (matching.length > 0) {
      matching.forEach((m) => onEliminarAnotacion(m.id));
    }
    setMenuPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // Change highlight color directly
  const cambiarColorAnotacion = (color: ColorResaltador) => {
    if (!balloonAnotacion) return;
    const actualizada: AnotacionResaltado = {
      ...balloonAnotacion,
      color,
    };
    onGuardarAnotacion(actualizada);
    setBalloonAnotacion(actualizada);
  };

  // Save plain-text comment
  const guardarComentario = () => {
    if (!balloonAnotacion) return;

    const anotacionActualizada: AnotacionResaltado = {
      ...balloonAnotacion,
      comentario: tempNoteText.trim(),
      timestamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    };

    onGuardarAnotacion(anotacionActualizada);
    setBalloonAnotacion(anotacionActualizada);
    setIsEditingNote(false);
  };

  // Delete note / highlight
  const eliminarComentario = () => {
    if (!balloonAnotacion) return;
    onEliminarAnotacion(balloonAnotacion.id);
    setBalloonAnotacion(null);
    setIsEditingNote(false);
  };

  // Render plain text segmented into non-highlighted chunks and highlighted spans
  const renderAnnotatedText = () => {
    if (!text) return null;
    if (anotacionesRelevantes.length === 0) {
      return <span>{text}</span>;
    }

    // Find occurrences of all annotations in this text
    interface IntervalMatch {
      start: number;
      end: number;
      anotacion: AnotacionResaltado;
    }

    const intervals: IntervalMatch[] = [];

    anotacionesRelevantes.forEach((an) => {
      if (!an.textoSeleccionado) return;
      let startIndex = 0;
      while (startIndex < text.length) {
        const foundIndex = text.indexOf(an.textoSeleccionado, startIndex);
        if (foundIndex === -1) break;
        intervals.push({
          start: foundIndex,
          end: foundIndex + an.textoSeleccionado.length,
          anotacion: an,
        });
        startIndex = foundIndex + an.textoSeleccionado.length;
      }
    });

    if (intervals.length === 0) {
      return <span>{text}</span>;
    }

    // Sort intervals by start index
    intervals.sort((a, b) => a.start - b.start);

    // Filter overlapping intervals
    const cleanIntervals: IntervalMatch[] = [];
    let lastEnd = 0;
    for (const item of intervals) {
      if (item.start >= lastEnd) {
        cleanIntervals.push(item);
        lastEnd = item.end;
      }
    }

    // Build React nodes
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    cleanIntervals.forEach((item, idx) => {
      // Plain text segment before highlight
      if (item.start > currentIndex) {
        parts.push(<span key={`txt-${idx}`}>{text.substring(currentIndex, item.start)}</span>);
      }

      const an = item.anotacion;
      const configColor = COLOR_CLASSES[an.color] || COLOR_CLASSES.amarillo;
      const tieneNota = !!an.comentario && an.comentario.trim().length > 0;

      parts.push(
        <mark
          key={`mark-${an.id}-${idx}`}
          onClick={(e) => abrirGloboNotaExistente(e, an)}
          className={`${configColor.mark} cursor-pointer inline ${
            tieneNota ? 'border-b-2 border-dotted border-slate-700 dark:border-slate-300 font-semibold' : ''
          }`}
          title={tieneNota ? `Nota: "${an.comentario}" (Haz clic para ver/editar)` : 'Texto resaltado (Haz clic para añadir nota o cambiar color)'}
        >
          {text.substring(item.start, item.end)}
          {tieneNota && (
            <span className="inline-flex items-center justify-center ml-1 text-slate-700 dark:text-slate-200 font-normal select-none">
              <i className="fa-solid fa-comment-dots text-[10px]"></i>
            </span>
          )}
        </mark>
      );

      currentIndex = item.end;
    });

    // Remainder of plain text
    if (currentIndex < text.length) {
      parts.push(<span key="txt-end">{text.substring(currentIndex)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp} className={`relative select-text ${className}`}>
      {renderAnnotatedText()}

      {/* 1. FLOATING CONTEXTUAL HIGHLIGHT MENU (APPEARS OVER SELECTED TEXT) */}
      {menuPos && (
        <div
          ref={floatingMenuRef}
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="bg-slate-900/95 dark:bg-slate-800 text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 border border-slate-700 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Palette Colors */}
          <div className="flex items-center gap-1 px-1 border-r border-slate-700 pr-2">
            {(['amarillo', 'verde', 'rosa', 'azul'] as ColorResaltador[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => aplicarColorResaltado(c)}
                className={`h-5 w-5 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 ${COLOR_CLASSES[c].dot}`}
                title={`Resaltar con ${COLOR_CLASSES[c].label}`}
              />
            ))}
          </div>

          {/* Add Note Button */}
          <button
            type="button"
            onClick={abrirFormularioNota}
            className="px-2.5 py-1 hover:bg-slate-700/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors"
            title="Añadir un comentario o nota a este texto"
          >
            <i className="fa-solid fa-note-sticky text-amber-400 text-[11px]"></i>
            <span className="text-[11px]">Añadir nota</span>
          </button>

          {/* Delete Highlight Button */}
          <button
            type="button"
            onClick={quitarResaltadoSeleccionado}
            className="px-2.5 py-1 hover:bg-rose-900/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-rose-300 hover:text-white transition-colors"
            title="Borrar subrayado del texto seleccionado"
          >
            <i className="fa-solid fa-eraser text-rose-400 text-[11px]"></i>
            <span className="text-[11px]">Borrar</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setMenuPos(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md text-xs"
            title="Cerrar menú"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* 2. BALLOON POPOVER (GLOBO FLOTANTE PARA VER, EDITAR Y BORRAR ANOTACIONES) */}
      {balloonAnotacion && balloonPos && (
        <div
          ref={balloonRef}
          style={{
            position: 'fixed',
            top: `${balloonPos.top}px`,
            left: `${balloonPos.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 10000,
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl shadow-2xl p-4 w-72 sm:w-84 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          {/* Balloon Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${COLOR_CLASSES[balloonAnotacion.color].dot}`}></span>
              <span className="text-[10px] font-black uppercase text-slate-500 font-mono">
                Subrayado · {balloonAnotacion.timestamp}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={eliminarComentario}
                className="h-6 w-6 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                title="Borrar este subrayado permanentemente"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalloonAnotacion(null);
                  setIsEditingNote(false);
                }}
                className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs"
                title="Cerrar"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Highlighted text preview */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl text-[11px] italic text-slate-600 dark:text-slate-300 border border-slate-150 dark:border-slate-700/60 line-clamp-2">
            "{balloonAnotacion.textoSeleccionado}"
          </div>

          {/* Color Switcher Bar */}
          <div className="flex items-center justify-between py-1 px-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Color:
            </span>
            <div className="flex items-center gap-1.5">
              {(['amarillo', 'verde', 'rosa', 'azul'] as ColorResaltador[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => cambiarColorAnotacion(c)}
                  className={`h-4.5 w-4.5 rounded-full transition-transform hover:scale-125 ${COLOR_CLASSES[c].dot} ${
                    balloonAnotacion.color === c ? 'ring-2 ring-indigo-500 scale-110 shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={`Cambiar a ${COLOR_CLASSES[c].label}`}
                />
              ))}
            </div>
          </div>

          {/* Note Mode: Edit or View */}
          {isEditingNote ? (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Escribe tu nota (texto plano):
              </label>
              <textarea
                autoFocus
                rows={3}
                value={tempNoteText}
                onChange={(e) => setTempNoteText(e.target.value)}
                placeholder="Escribe aquí un comentario, truco mnemotécnico o aclaración..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={eliminarComentario}
                  className="px-2 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Borrar marcación"
                >
                  <i className="fa-solid fa-trash-can text-[10px]"></i>
                  <span>Borrar marcación</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(false)}
                    className="py-1 px-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardarComentario}
                    className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl">
                {balloonAnotacion.comentario ? (
                  balloonAnotacion.comentario
                ) : (
                  <span className="text-slate-400 italic text-[11px]">Sin comentario escrito (solo subrayado).</span>
                )}
              </div>

              {/* Action Buttons in View Mode */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={eliminarComentario}
                  className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Eliminar este subrayado y su comentario"
                >
                  <i className="fa-solid fa-trash-can text-[11px]"></i>
                  <span>Borrar marcación</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTempNoteText(balloonAnotacion.comentario || '');
                    setIsEditingNote(true);
                  }}
                  className="py-1.5 px-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-pen text-[10px]"></i>
                  <span>{balloonAnotacion.comentario ? 'Editar nota' : 'Añadir nota'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
