import React, { useState, useEffect, useRef } from 'react';
import { RecursoArgumentacionPregunta } from '../types';
import {
  guardarRecursosArgumentacionDePregunta,
  obtenerRecursosArgumentacionDePregunta,
} from '../utils/jsonExamHelper';

interface GestorRecursosArgumentacionPreguntaProps {
  enunciadoPregunta: string;
  recursosIniciales?: RecursoArgumentacionPregunta[];
  onActualizarRecursos?: (nuevosRecursos: RecursoArgumentacionPregunta[]) => void;
}

export const GestorRecursosArgumentacionPregunta: React.FC<
  GestorRecursosArgumentacionPreguntaProps
> = ({ enunciadoPregunta, recursosIniciales, onActualizarRecursos }) => {
  const [recursos, setRecursos] = useState<RecursoArgumentacionPregunta[]>([]);
  const [modoFormulario, setModoFormulario] = useState<'ninguno' | 'web' | 'fichero_local'>('ninguno');

  // Campos para enlace web
  const [tituloWeb, setTituloWeb] = useState('');
  const [urlWeb, setUrlWeb] = useState('');
  const [descripcionWeb, setDescripcionWeb] = useState('');

  // Campos para fichero local
  const [tituloFichero, setTituloFichero] = useState('');
  const [rutaLocalInput, setRutaLocalInput] = useState('');
  const [descripcionFichero, setDescripcionFichero] = useState('');
  const [archivoCargado, setArchivoCargado] = useState<{
    nombre: string;
    mimeType: string;
    tamanoBytes: number;
    dataUrl: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [recursoEnVistaPrevia, setRecursoEnVistaPrevia] =
    useState<RecursoArgumentacionPregunta | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sincronizar al cambiar de pregunta en la ventana de justificación
  useEffect(() => {
    const resueltos = obtenerRecursosArgumentacionDePregunta({
      enunciado: enunciadoPregunta,
      recursosArgumentacion: recursosIniciales,
    });
    setRecursos(resueltos);
    setModoFormulario('ninguno');
    setErrorMsg(null);
  }, [enunciadoPregunta, recursosIniciales]);

  const persistirCambios = (nuevos: RecursoArgumentacionPregunta[]) => {
    setRecursos(nuevos);
    guardarRecursosArgumentacionDePregunta(enunciadoPregunta, nuevos);
    onActualizarRecursos?.(nuevos);
  };

  const handleGuardarEnlaceWeb = () => {
    setErrorMsg(null);
    const urlLimpia = urlWeb.trim();
    if (!urlLimpia) {
      setErrorMsg('Introduce la dirección URL de la página web.');
      return;
    }
    const urlFinal = /^https?:\/\//i.test(urlLimpia) ? urlLimpia : `https://${urlLimpia}`;
    let tituloFinal = tituloWeb.trim();
    if (!tituloFinal) {
      try {
        const u = new URL(urlFinal);
        tituloFinal = u.hostname.replace(/^www\./, '');
      } catch (_) {
        tituloFinal = 'Enlace Web de Argumentación';
      }
    }

    const nuevoRecurso: RecursoArgumentacionPregunta = {
      id: `rec-web-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'web',
      titulo: tituloFinal,
      url: urlFinal,
      descripcion: descripcionWeb.trim() || undefined,
      fechaCreacion: new Date().toISOString(),
    };

    const actualizados = [...recursos, nuevoRecurso];
    persistirCambios(actualizados);

    setTituloWeb('');
    setUrlWeb('');
    setDescripcionWeb('');
    setModoFormulario('ninguno');
  };

  const handleSeleccionarArchivoLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Límite razonable para persistencia en JSON/LocalStorage (8 MB)
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('El fichero supera los 8 MB. Usa un archivo más ligero o indica su ruta local.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (dataUrl) {
        setArchivoCargado({
          nombre: file.name,
          mimeType: file.type || 'application/octet-stream',
          tamanoBytes: file.size,
          dataUrl,
        });
        if (!tituloFichero.trim()) {
          setTituloFichero(file.name);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGuardarFicheroLocal = () => {
    setErrorMsg(null);
    if (!archivoCargado && !rutaLocalInput.trim()) {
      setErrorMsg('Selecciona un fichero local de tu equipo o introduce su ruta local.');
      return;
    }

    const tituloFinal =
      tituloFichero.trim() ||
      archivoCargado?.nombre ||
      rutaLocalInput.trim().split(/[\\/]/).pop() ||
      'Fichero local de argumentación';

    const nuevoRecurso: RecursoArgumentacionPregunta = {
      id: `rec-file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'fichero_local',
      titulo: tituloFinal,
      url: archivoCargado?.dataUrl || rutaLocalInput.trim(),
      nombreArchivo: archivoCargado?.nombre || tituloFinal,
      mimeType: archivoCargado?.mimeType,
      tamanoBytes: archivoCargado?.tamanoBytes,
      rutaLocal: rutaLocalInput.trim() || undefined,
      descripcion: descripcionFichero.trim() || undefined,
      fechaCreacion: new Date().toISOString(),
    };

    const actualizados = [...recursos, nuevoRecurso];
    persistirCambios(actualizados);

    setTituloFichero('');
    setRutaLocalInput('');
    setDescripcionFichero('');
    setArchivoCargado(null);
    setModoFormulario('ninguno');
  };

  const handleEliminarRecurso = (id: string) => {
    const actualizados = recursos.filter((r) => r.id !== id);
    persistirCambios(actualizados);
  };

  const formatearTamano = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCopiarRuta = (id: string, ruta: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ruta).catch(() => {});
    }
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  return (
    <div className="pt-1.5 border-t border-amber-200/80 dark:border-amber-800/60 space-y-2">
      {/* Cabecera de enlaces web y ficheros locales */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5 font-mono">
          <i className="fa-solid fa-paperclip text-amber-600 dark:text-amber-400 text-[10px]"></i>
          <span>Enlaces Web y Ficheros Locales de Argumentación ({recursos.length})</span>
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setModoFormulario((prev) => (prev === 'web' ? 'ninguno' : 'web'));
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
              modoFormulario === 'web'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
            }`}
            title="Añadir enlace a página web para fundamentar esta pregunta (se guarda en el JSON)"
          >
            <i className="fa-solid fa-globe text-[9.5px]"></i>
            <span>+ Enlace Web</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setModoFormulario((prev) => (prev === 'fichero_local' ? 'ninguno' : 'fichero_local'));
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
              modoFormulario === 'fichero_local'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
            }`}
            title="Adjuntar fichero local (PDF, imagen, esquema, TXT...) para argumentar esta pregunta (se guarda en el JSON)"
          >
            <i className="fa-solid fa-folder-open text-[9.5px]"></i>
            <span>+ Fichero Local</span>
          </button>
        </div>
      </div>

      {/* Formulario para añadir Enlace Web */}
      {modoFormulario === 'web' && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-link text-[10px]"></i>
              <span>Nuevo Enlace Web para Argumentación</span>
            </span>
            <button
              type="button"
              onClick={() => setModoFormulario('ninguno')}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={tituloWeb}
              onChange={(e) => setTituloWeb(e.target.value)}
              placeholder="Título (ej. Consulta BOE / Guía INAP / Doctrina)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={urlWeb}
              onChange={(e) => setUrlWeb(e.target.value)}
              placeholder="URL (ej. https://www.boe.es/...)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={descripcionWeb}
              onChange={(e) => setDescripcionWeb(e.target.value)}
              placeholder="Nota o argumento opcional sobre este enlace..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleGuardarEnlaceWeb}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <i className="fa-solid fa-floppy-disk text-[10px]"></i>
              <span>Guardar Enlace</span>
            </button>
          </div>

          {errorMsg && (
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{errorMsg}</p>
          )}
        </div>
      )}

      {/* Formulario para adjuntar Fichero Local */}
      {modoFormulario === 'fichero_local' && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-1">
              <i className="fa-solid fa-file-arrow-up text-[10px]"></i>
              <span>Adjuntar Fichero Local para Argumentación</span>
            </span>
            <button
              type="button"
              onClick={() => setModoFormulario('ninguno')}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.json,.html,.doc,.docx,.xls,.xlsx"
            onChange={handleSeleccionarArchivoLocal}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-folder-open text-emerald-600"></i>
              <span>Seleccionar Fichero del Equipo...</span>
            </button>

            {archivoCargado ? (
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <i className="fa-solid fa-file-circle-check"></i>
                <span className="truncate max-w-[220px]">{archivoCargado.nombre}</span>
                <span className="text-[10px] opacity-75">
                  ({formatearTamano(archivoCargado.tamanoBytes)})
                </span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Se incrustará en el archivo JSON para conservarlo siempre
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={tituloFichero}
              onChange={(e) => setTituloFichero(e.target.value)}
              placeholder="Título descriptivo del fichero (ej. Esquema Silencio Art. 24)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={rutaLocalInput}
              onChange={(e) => setRutaLocalInput(e.target.value)}
              placeholder="Ruta local opcional (ej. C:\Temario\Tema3_LPACAP.pdf)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={descripcionFichero}
              onChange={(e) => setDescripcionFichero(e.target.value)}
              placeholder="Argumento o comentario asociado al fichero local..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleGuardarFicheroLocal}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <i className="fa-solid fa-floppy-disk text-[10px]"></i>
              <span>Guardar Fichero</span>
            </button>
          </div>

          {errorMsg && (
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{errorMsg}</p>
          )}
        </div>
      )}

      {/* Listado de enlaces web y ficheros locales adjuntos */}
      {recursos.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
          {recursos.map((rec) => {
            const esWeb = rec.tipo === 'web';
            const esDataUrl = rec.url.startsWith('data:');
            return (
              <div
                key={rec.id}
                className="p-2 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-2 text-xs shadow-2xs"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span
                    className={`h-6 w-6 rounded-md flex items-center justify-center text-[11px] shrink-0 mt-0.5 ${
                      esWeb
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <i className={`fa-solid ${esWeb ? 'fa-globe' : 'fa-file-lines'}`}></i>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {rec.titulo}
                      </span>
                      <span
                        className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          esWeb
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {esWeb ? 'Web' : `Fichero${rec.tamanoBytes ? ` · ${formatearTamano(rec.tamanoBytes)}` : ''}`}
                      </span>
                    </div>
                    {rec.descripcion && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5">
                        {rec.descripcion}
                      </p>
                    )}
                    {rec.rutaLocal && (
                      <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        Ruta: {rec.rutaLocal}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {esWeb ? (
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title={`Abrir ${rec.url}`}
                    >
                      <span>Abrir Web</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                    </a>
                  ) : (
                    <>
                      {esDataUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRecursoEnVistaPrevia(rec)}
                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Visualizar fichero adjunto"
                          >
                            <i className="fa-solid fa-eye text-[9.5px]"></i>
                            <span>Ver</span>
                          </button>
                          <a
                            href={rec.url}
                            download={rec.nombreArchivo || rec.titulo}
                            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Descargar copia del fichero adjunto"
                          >
                            <i className="fa-solid fa-download text-[9.5px]"></i>
                          </a>
                        </>
                      )}
                      {rec.rutaLocal && (
                        <button
                          type="button"
                          onClick={() => handleCopiarRuta(rec.id, rec.rutaLocal!)}
                          className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[10.5px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                          title="Copiar ruta local al portapapeles"
                        >
                          <i className={`fa-solid ${copiadoId === rec.id ? 'fa-check text-emerald-600' : 'fa-copy'} text-[9.5px]`}></i>
                          <span>{copiadoId === rec.id ? 'Copiada' : 'Ruta'}</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleEliminarRecurso(rec.id)}
                    className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-[11px] transition-colors cursor-pointer"
                    title="Eliminar este recurso de argumentación"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal interno de vista previa para ficheros locales adjuntos */}
      {recursoEnVistaPrevia && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRecursoEnVistaPrevia(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <i className="fa-solid fa-file-lines text-emerald-400"></i>
                <span className="font-black text-sm truncate">{recursoEnVistaPrevia.titulo}</span>
                {recursoEnVistaPrevia.nombreArchivo && (
                  <span className="text-xs font-mono text-slate-400 truncate">
                    ({recursoEnVistaPrevia.nombreArchivo})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={recursoEnVistaPrevia.url}
                  download={recursoEnVistaPrevia.nombreArchivo || recursoEnVistaPrevia.titulo}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-download text-[10px]"></i>
                  <span>Descargar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setRecursoEnVistaPrevia(null)}
                  className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[320px]">
              {recursoEnVistaPrevia.mimeType?.startsWith('image/') ||
              /^data:image\//i.test(recursoEnVistaPrevia.url) ? (
                <img
                  src={recursoEnVistaPrevia.url}
                  alt={recursoEnVistaPrevia.titulo}
                  className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-md"
                />
              ) : recursoEnVistaPrevia.mimeType === 'application/pdf' ||
                /^data:application\/pdf/i.test(recursoEnVistaPrevia.url) ? (
                <iframe
                  src={recursoEnVistaPrevia.url}
                  title={recursoEnVistaPrevia.titulo}
                  className="w-full h-[72vh] rounded-lg border border-slate-300 dark:border-slate-700 bg-white"
                />
              ) : (
                <div className="text-center space-y-3 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md">
                  <i className="fa-solid fa-file-arrow-down text-3xl text-emerald-500"></i>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {recursoEnVistaPrevia.nombreArchivo || recursoEnVistaPrevia.titulo}
                  </p>
                  {recursoEnVistaPrevia.descripcion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {recursoEnVistaPrevia.descripcion}
                    </p>
                  )}
                  <a
                    href={recursoEnVistaPrevia.url}
                    download={recursoEnVistaPrevia.nombreArchivo || recursoEnVistaPrevia.titulo}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>Descargar y abrir archivo</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
