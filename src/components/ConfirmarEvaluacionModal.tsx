import React from 'react';

export interface PreguntaResumenEvaluacion {
  indice: number;
  etiqueta: string;
  respondida: boolean;
  dudosa: boolean;
  esReserva?: boolean;
}

interface ConfirmarEvaluacionModalProps {
  isOpen: boolean;
  tituloExamen: string;
  tipoPruebaLabel?: string;
  preguntasResumen: PreguntaResumenEvaluacion[];
  onVolverAlTest: () => void;
  onConfirmarEvaluar: () => void;
  onIrAPregunta?: (indice: number) => void;
}

export const ConfirmarEvaluacionModal: React.FC<ConfirmarEvaluacionModalProps> = ({
  isOpen,
  tituloExamen,
  tipoPruebaLabel = 'Test / Supuesto Oficial C1',
  preguntasResumen,
  onVolverAlTest,
  onConfirmarEvaluar,
  onIrAPregunta,
}) => {
  if (!isOpen) return null;

  const totalPreguntas = preguntasResumen.length;
  const respondidas = preguntasResumen.filter((p) => p.respondida).length;
  const sinResponder = totalPreguntas - respondidas;
  const dudosasList = preguntasResumen.filter((p) => p.dudosa);
  const sinResponderList = preguntasResumen.filter((p) => !p.respondida);
  const dudosas = dudosasList.length;
  const porcentajeRespondidas =
    totalPreguntas > 0 ? Math.round((respondidas / totalPreguntas) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onVolverAlTest();
      }}
    >
      <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border-2 border-indigo-200/80 dark:border-slate-700 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Cabecera del cuadro de notificación previa a evaluar */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-linear-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {tipoPruebaLabel}
                </span>
                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  v3.1 · Revisión Pre-Evaluación
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 leading-snug">
                ¿Deseas evaluar y calificar la prueba ahora?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                {tituloExamen}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onVolverAlTest}
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer transition-colors shrink-0"
            title="Volver al test sin evaluar"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Los 3 indicadores solicitados: Respondidas, Sin responder y Dudosas */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="font-black uppercase text-slate-500 dark:text-slate-400">
              Estado de tus respuestas ({totalPreguntas} preguntas en total)
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {porcentajeRespondidas}% completado
            </span>
          </div>

          {/* Barra de progreso visual */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200/70 dark:border-slate-700">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${porcentajeRespondidas}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* 1. Respondidas */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/80 text-center space-y-1 shadow-2xs">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-black uppercase text-emerald-800 dark:text-emerald-300">
                <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
                <span>Respondidas</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                {respondidas}
              </div>
              <div className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80 font-medium">
                de {totalPreguntas} preguntas
              </div>
            </div>

            {/* 2. Sin responder (En blanco) */}
            <div
              className={`p-3.5 rounded-2xl border text-center space-y-1 shadow-2xs ${
                sinResponder > 0
                  ? 'bg-rose-50/80 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/80'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div
                className={`flex items-center justify-center gap-1.5 text-[10px] font-mono font-black uppercase ${
                  sinResponder > 0
                    ? 'text-rose-800 dark:text-rose-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <i
                  className={`fa-regular fa-circle ${
                    sinResponder > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400'
                  }`}
                ></i>
                <span>Sin Responder</span>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  sinResponder > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {sinResponder}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {sinResponder === 0 ? ' ninguna en blanco' : 'en blanco (no penalizan)'}
              </div>
            </div>

            {/* 3. Marcadas como Dudosas */}
            <div
              className={`p-3.5 rounded-2xl border text-center space-y-1 shadow-2xs ${
                dudosas > 0
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div
                className={`flex items-center justify-center gap-1.5 text-[10px] font-mono font-black uppercase ${
                  dudosas > 0
                    ? 'text-amber-900 dark:text-amber-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <i
                  className={`fa-solid fa-flag ${
                    dudosas > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400'
                  }`}
                ></i>
                <span>Dudosas</span>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  dudosas > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {dudosas}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {dudosas === 0 ? 'ninguna marcada' : 'marcadas para revisar'}
              </div>
            </div>
          </div>
        </div>

        {/* Accesos directos a preguntas dudosas o sin responder por si quiere revisarlas antes de evaluar */}
        {(dudosasList.length > 0 || sinResponderList.length > 0) && (
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
            {dudosasList.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-flag text-amber-500 text-[10px]"></i>
                  <span>
                    Preguntas marcadas como dudosas ({dudosasList.length}) — pulsa una para ir a revisarla:
                  </span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dudosasList.map((p) => (
                    <button
                      key={`dud-${p.indice}`}
                      type="button"
                      onClick={() => {
                        if (onIrAPregunta) onIrAPregunta(p.indice);
                        onVolverAlTest();
                      }}
                      className="px-2 py-1 rounded-lg text-[11px] font-mono font-black bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer flex items-center gap-1"
                      title={`Ir a la pregunta ${p.etiqueta} (${p.respondida ? 'Respondida' : 'En blanco'})`}
                    >
                      <i className="fa-solid fa-flag text-[8.5px] text-amber-600"></i>
                      <span>#{p.etiqueta}</span>
                      <span className="text-[9px] opacity-75">
                        {p.respondida ? '(Contestada)' : '(En blanco)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sinResponderList.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <i className="fa-regular fa-circle text-rose-500 text-[10px]"></i>
                  <span>
                    Preguntas sin responder ({sinResponderList.length}) — pulsa una para ir a contestarla:
                  </span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sinResponderList.slice(0, 35).map((p) => (
                    <button
                      key={`blank-${p.indice}`}
                      type="button"
                      onClick={() => {
                        if (onIrAPregunta) onIrAPregunta(p.indice);
                        onVolverAlTest();
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-rose-300 transition-colors cursor-pointer"
                      title={`Ir a la pregunta ${p.etiqueta}`}
                    >
                      #{p.etiqueta}
                    </button>
                  ))}
                  {sinResponderList.length > 35 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      +{sinResponderList.length - 35} más...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones de Acción: Volver al Test o Evaluar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onVolverAlTest}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-[11px] text-indigo-600 dark:text-indigo-400"></i>
            <span>Volver al Test (Seguir revisando)</span>
          </button>

          <button
            type="button"
            onClick={onConfirmarEvaluar}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-circle-check text-xs"></i>
            <span>Evaluar y Calificar Ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
