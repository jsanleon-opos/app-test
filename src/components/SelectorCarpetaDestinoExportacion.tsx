import React, { useState, useEffect } from 'react';
import {
  cambiarModoCarpetaExportacion,
  configurarCarpetaPorDefectoConSelector,
  ConfiguracionCarpetaExportacion,
  leerConfiguracionCarpetaExportacionSincrona,
  ModoCarpetaExportacion,
  restablecerCarpetaPorDefectoADescargas,
  suscribirCambiosCarpetaExportacion,
} from '../utils/exportFolderManager';

interface SelectorCarpetaDestinoExportacionProps {
  compacto?: boolean;
  onAviso?: (texto: string) => void;
}

export const SelectorCarpetaDestinoExportacion: React.FC<
  SelectorCarpetaDestinoExportacionProps
> = ({ compacto = false, onAviso }) => {
  const [config, setConfig] = useState<ConfiguracionCarpetaExportacion>(() =>
    leerConfiguracionCarpetaExportacionSincrona()
  );
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);

  useEffect(() => {
    return suscribirCambiosCarpetaExportacion(() => {
      setConfig(leerConfiguracionCarpetaExportacionSincrona());
    });
  }, []);

  const mostrarFeedback = (msg: string) => {
    setMensajeEstado(msg);
    if (onAviso) onAviso(msg);
    setTimeout(() => {
      setMensajeEstado((actual) => (actual === msg ? null : actual));
    }, 5000);
  };

  const handleSeleccionarModo = (modo: ModoCarpetaExportacion) => {
    cambiarModoCarpetaExportacion(modo);
  };

  const handleElegirCarpetaPorDefecto = async () => {
    const res = await configurarCarpetaPorDefectoConSelector();
    if (res.ok && res.nombreCarpeta) {
      mostrarFeedback(`Carpeta por defecto fijada en: «${res.nombreCarpeta}»`);
    } else if (res.error) {
      mostrarFeedback(res.error);
    }
  };

  const handleRestablecerADescargas = async () => {
    await restablecerCarpetaPorDefectoADescargas();
    mostrarFeedback('Carpeta por defecto restablecida a «Descargas» del navegador.');
  };

  const etiquetaCarpetaDefecto = config.nombreCarpetaPorDefecto
    ? `Carpeta fija: ${config.nombreCarpetaPorDefecto}`
    : 'Carpeta Descargas (navegador)';

  return (
    <div
      className={`rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/75 ${
        compacto ? 'p-3 space-y-2' : 'p-3.5 space-y-2.5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <i className="fa-solid fa-folder-open text-amber-500 text-xs shrink-0"></i>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Carpeta de destino al guardar:
          </span>
          <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate">
            {config.modo === 'carpeta_por_defecto'
              ? etiquetaCarpetaDefecto
              : 'Preguntar / elegir cualquier carpeta al guardar'}
          </span>
        </div>

        {/* Botones para cambiar o restablecer la carpeta por defecto */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => void handleElegirCarpetaPorDefecto()}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
            title="Seleccionar una carpeta del equipo para dejarla memorizada como carpeta por defecto"
          >
            <i className="fa-solid fa-folder-plus text-indigo-600 dark:text-indigo-400 text-[10px]"></i>
            <span>
              {config.nombreCarpetaPorDefecto
                ? 'Cambiar carpeta por defecto'
                : 'Fijar carpeta por defecto...'}
            </span>
          </button>

          {config.nombreCarpetaPorDefecto && (
            <button
              type="button"
              onClick={() => void handleRestablecerADescargas()}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 cursor-pointer transition-colors"
              title="Volver a usar la carpeta Descargas predeterminada del navegador"
            >
              Usar Descargas
            </button>
          )}
        </div>
      </div>

      {/* Dos modos: Carpeta por defecto vs Elegir cualquier carpeta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleSeleccionarModo('carpeta_por_defecto')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
            config.modo === 'carpeta_por_defecto'
              ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-1 ring-indigo-500/30 shadow-2xs'
              : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <span
            className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
              config.modo === 'carpeta_por_defecto'
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {config.modo === 'carpeta_por_defecto' && (
              <i className="fa-solid fa-check text-[8px]"></i>
            )}
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
              Guardar en carpeta por defecto
            </span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block leading-snug mt-0.5 truncate">
              {config.nombreCarpetaPorDefecto
                ? `Guarda directo en «${config.nombreCarpetaPorDefecto}»`
                : 'Guarda directo en tu carpeta «Descargas»'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSeleccionarModo('elegir_cualquier_carpeta')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
            config.modo === 'elegir_cualquier_carpeta'
              ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-1 ring-indigo-500/30 shadow-2xs'
              : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <span
            className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
              config.modo === 'elegir_cualquier_carpeta'
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {config.modo === 'elegir_cualquier_carpeta' && (
              <i className="fa-solid fa-check text-[8px]"></i>
            )}
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
              Seleccionar cualquier carpeta
            </span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block leading-snug mt-0.5">
              Abre el explorador al pulsar guardar para elegir destino
            </span>
          </div>
        </button>
      </div>

      {config.enIframeEmbebido && config.modo === 'elegir_cualquier_carpeta' && !mensajeEstado && (
        <p className="text-[10.5px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <i className="fa-solid fa-circle-info text-amber-600 dark:text-amber-400 shrink-0"></i>
          <span>
            En vista embebida el navegador envía las descargas a tu carpeta «Descargas» (o abre el diálogo del sistema si tienes activado «Preguntar dónde guardar cada archivo»). En pestaña completa se abre directamente el selector de carpetas.
          </span>
        </p>
      )}

      {mensajeEstado && (
        <p className="text-[10.5px] text-indigo-800 dark:text-indigo-200 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1.5">
          <i className="fa-solid fa-check-circle text-indigo-600 dark:text-indigo-400 shrink-0"></i>
          <span>{mensajeEstado}</span>
        </p>
      )}
    </div>
  );
};
