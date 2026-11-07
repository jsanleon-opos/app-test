import React, { useState, useEffect } from 'react';
import { ExamenCompleto } from '../types';
import { EXAMENES_PRECARGADOS_OFICIALES } from '../constants/boeData';

interface PdfExamUploaderProps {
  onExamenCargadoInmediatamente: (examen: ExamenCompleto) => void;
}

export const PdfExamUploader: React.FC<PdfExamUploaderProps> = ({
  onExamenCargadoInmediatamente,
}) => {
  const [selectedModel, setSelectedModel] = useState<'gemini-1.5-flash' | 'gemini-1.5-pro'>('gemini-1.5-flash');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [subModo, setSubModo] = useState<'pdf' | 'texto'>('pdf');
  const [textoPegado, setTextoPegado] = useState<string>('');
  const [tituloExamen, setTituloExamen] = useState<string>('Examen Oficial');

  // Restore saved Gemini API Key & Model from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('c1_custom_gemini_api_key');
    if (savedKey) {
      setApiKeyInput(savedKey);
    }
    const savedModel = localStorage.getItem('c1_selected_gemini_model');
    if (savedModel === 'gemini-1.5-pro' || savedModel === 'gemini-1.5-flash') {
      setSelectedModel(savedModel);
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKeyInput(val);
    if (val.trim()) {
      localStorage.setItem('c1_custom_gemini_api_key', val.trim());
    } else {
      localStorage.removeItem('c1_custom_gemini_api_key');
    }
  };

  const handleModelChange = (model: 'gemini-1.5-flash' | 'gemini-1.5-pro') => {
    setSelectedModel(model);
    localStorage.setItem('c1_selected_gemini_model', model);
  };

  const procesarTextoPegado = async () => {
    if (!textoPegado.trim() || textoPegado.trim().length < 20) {
      setErrorMessage('Por favor, pega el texto de las preguntas del examen (mínimo 20 caracteres).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusText('Analizando preguntas y plantilla de soluciones con Gemini...');

    try {
      const response = await fetch('/api/parse-text-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examText: textoPegado,
          title: tituloExamen.trim() || 'Examen Oficial',
          customApiKey: apiKeyInput.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.examen || !result.examen.preguntas || result.examen.preguntas.length === 0) {
        throw new Error('No se detectaron preguntas con opciones A, B, C, D en el texto.');
      }

      setStatusText('¡Examen procesado! Cargando interfaz interactiva...');
      setTimeout(() => {
        onExamenCargadoInmediatamente(result.examen);
      }, 350);
    } catch (err: any) {
      console.error('Error al procesar texto:', err);
      setErrorMessage(err.message || 'Error al comunicarse con la API de Gemini.');
      setIsProcessing(false);
    }
  };

  const procesarArchivoPdf = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Por favor, selecciona un archivo en formato PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusText('Leyendo archivo PDF...');

    try {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const base64Data = e.target.result as string;

          setStatusText(`Enviando documento a ${selectedModel}...`);

          const t1 = setTimeout(() => {
            setStatusText('Extrayendo preguntas y opciones A, B, C, D...');
          }, 1500);

          const t2 = setTimeout(() => {
            setStatusText('Analizando plantilla oficial de respuestas de la última página...');
          }, 3500);

          const response = await fetch('/api/parse-pdf-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: base64Data,
              fileName: file.name,
              customApiKey: apiKeyInput.trim() || undefined,
              model: selectedModel,
            }),
          });

          clearTimeout(t1);
          clearTimeout(t2);

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Error del servidor: ${response.statusText}`);
          }

          const result = await response.json();

          if (!result.examen || !result.examen.preguntas || result.examen.preguntas.length === 0) {
            throw new Error('No se pudieron extraer preguntas con opciones del PDF.');
          }

          setStatusText('¡Examen procesado! Cargando interfaz interactiva...');

          // CARGA INMEDIATA SIN PASOS INTERMEDIOS
          setTimeout(() => {
            onExamenCargadoInmediatamente(result.examen);
          }, 400);
        } catch (err: any) {
          console.error('Error al procesar PDF:', err);
          setErrorMessage(err.message || 'Error al comunicarse con la API de Gemini.');
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Error al leer el archivo en el navegador.');
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivoPdf(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      procesarArchivoPdf(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior Explicativo */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono">
                Extracción con Visión e Inteligencia Artificial
              </span>
              <span className="text-[9px] font-bold text-slate-400">AGE & Comunidad de Madrid</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              Subir Examen Oficial en PDF
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5">
              Sube el PDF original de cualquier examen oficial. La IA extraerá todas las preguntas, identificará la
              plantilla de respuestas de la última página para asignar la solución correcta y abrirá de inmediato la
              prueba en modo interactivo para responder y corregir en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-bolt text-amber-400"></i>
              Carga Inmediata
            </span>
          </div>
        </div>

        {/* Casilla para Gemini API Key (guardada en localStorage) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <i className="fa-solid fa-key text-amber-500"></i>
              Gemini API Key (Se guarda en tu navegador / localStorage):
            </label>
            <span className="text-[10px] text-slate-400">
              {apiKeyInput.trim() ? '✓ Clave personalizada guardada' : 'Usando clave del servidor'}
            </span>
          </div>

          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Introduce tu clave de Gemini (opcional si ya está configurada en AI Studio)..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 pr-10 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              title={showApiKey ? 'Ocultar clave' : 'Mostrar clave'}
            >
              <i className={`fa-solid ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          {/* Selector de Modelo Gemini (gemini-1.5-flash o gemini-1.5-pro) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <i className="fa-solid fa-microchip text-indigo-500"></i>
              <span>Modelo Gemini seleccionado:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleModelChange('gemini-1.5-flash')}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  selectedModel === 'gemini-1.5-flash'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <span>gemini-1.5-flash</span>
                <span className="text-[9px] opacity-75">(Rápido)</span>
              </button>
              <button
                type="button"
                onClick={() => handleModelChange('gemini-1.5-pro')}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  selectedModel === 'gemini-1.5-pro'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <span>gemini-1.5-pro</span>
                <span className="text-[9px] opacity-75">(Exámenes extensos)</span>
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 <em>Nota:</em> Si dejas la casilla de API Key en blanco, el servidor utilizará automáticamente la clave configurada en el entorno. Se utilizará el modelo seleccionado para extraer preguntas y contrastar la plantilla de soluciones.
          </p>
        </div>
      </div>

      {/* Selector de Método de Importación */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setSubModo('pdf')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subModo === 'pdf'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <i className="fa-solid fa-file-pdf text-rose-500"></i>
          <span>Subir Archivo PDF</span>
        </button>
        <button
          type="button"
          onClick={() => setSubModo('texto')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subModo === 'texto'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <i className="fa-solid fa-paste text-amber-500"></i>
          <span>Pegar Texto del Examen (Alternativa Rápida)</span>
        </button>
      </div>

      {/* MODO 1: Zona de Arrastre y Subida de Archivo PDF */}
      {subModo === 'pdf' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center space-y-4 cursor-pointer shadow-xs ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-4 ring-indigo-100 dark:ring-indigo-900/40'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400'
          } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
          onClick={() => {
            if (!isProcessing) {
              document.getElementById('pdf-file-input')?.click();
            }
          }}
        >
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl shadow-xs">
            {isProcessing ? (
              <i className="fa-solid fa-circle-notch animate-spin text-2xl text-indigo-600"></i>
            ) : (
              <i className="fa-solid fa-file-pdf text-rose-500"></i>
            )}
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {isProcessing ? statusText : 'Arrastra aquí tu examen oficial en PDF'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isProcessing
                ? 'Por favor, espera unos segundos mientras la IA procesa todas las páginas y la plantilla.'
                : 'O haz clic en este cuadro para seleccionar un archivo .pdf desde tu equipo'}
            </p>
          </div>

          {!isProcessing && (
            <div className="flex items-center gap-2 pt-2">
              <span className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs">
                <i className="fa-solid fa-upload mr-1.5"></i>
                Seleccionar archivo PDF
              </span>
            </div>
          )}

          <input
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* MODO 2: Pegar Texto Directo del Examen */}
      {subModo === 'texto' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-paste text-indigo-600"></i>
              Pegar Texto del Examen Oficial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copia y pega aquí las preguntas, opciones (A, B, C, D) y la plantilla de soluciones. La IA las estructurará de inmediato para responder y calificar en tiempo real.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Título de la convocatoria o examen:
            </label>
            <input
              type="text"
              value={tituloExamen}
              onChange={(e) => setTituloExamen(e.target.value)}
              placeholder="Ej: Examen Oficial C1 AGE 2024 (Primer Ejercicio)"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Texto íntegro de las preguntas y plantilla de respuestas:
            </label>
            <textarea
              rows={8}
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
              placeholder="1. Según el artículo 68 de la Ley 39/2015...&#10;A) 10 días&#10;B) 15 días&#10;C) 1 mes&#10;D) 20 días&#10;&#10;...&#10;PLANTILLA OFICIAL:&#10;1-A, 2-C, 3-B..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            disabled={isProcessing || !textoPegado.trim()}
            onClick={procesarTextoPegado}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-sm"></i>
                <span>{statusText}</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt text-amber-400"></i>
                <span>Digitalizar y Realizar Ahora</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Mensaje de Error */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-base"></i>
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          {apiKeyInput && (
            <div className="pt-2 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-[11px]">
              <span>¿Tu clave personalizada tiene restricciones o cuotas agotadas?</span>
              <button
                type="button"
                onClick={() => {
                  handleApiKeyChange('');
                  setErrorMessage(null);
                }}
                className="font-bold underline text-rose-700 dark:text-rose-300 hover:text-rose-900 cursor-pointer"
              >
                Limpiar clave y usar la preconfigurada en el servidor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pruebas Oficiales Rápidas (Carga Inmediata para Probar sin PDF propio) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <i className="fa-solid fa-bolt text-amber-500"></i>
              O prueba inmediatamente con estos exámenes oficiales ya digitalizados:
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Carga directa en la interfaz interactiva con plantilla de respuestas oficial.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EXAMENES_PRECARGADOS_OFICIALES.map((ex) => (
            <div
              key={ex.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-400 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                    {ex.ambito} · {ex.tipo === 'supuesto' ? 'Supuesto' : 'Test'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">{ex.preguntas.length} Preguntas</span>
                </div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                  {ex.titulo}
                </h5>
              </div>

              <button
                type="button"
                onClick={() => onExamenCargadoInmediatamente(ex)}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Cargar y Realizar Ahora</span>
                <i className="fa-solid fa-arrow-right text-[9px]"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
