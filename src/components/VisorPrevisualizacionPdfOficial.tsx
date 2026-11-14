import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ResultadoGeneracionPDFOficial } from '../utils/officialPdfExporter';

// Configurar el worker local empaquetado por Vite sin descargas externas ni auto-descargas del navegador
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export type TipoDocumentoPrevisualizado =
  | 'cuadernillo'
  | 'plantilla_omr'
  | 'todo_en_1'
  | 'anexo_boe';

interface VisorPrevisualizacionPdfOficialProps {
  paquete: ResultadoGeneracionPDFOficial;
  documentoActivo?: TipoDocumentoPrevisualizado;
  onCambiarDocumento?: (doc: TipoDocumentoPrevisualizado) => void;
  alturaContenedorClass?: string;
}

interface PaginaRenderizadaCanvas {
  numeroPagina: number;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

const OPCIONES_DOCUMENTO: {
  id: TipoDocumentoPrevisualizado;
  label: string;
  icon: string;
}[] = [
  { id: 'cuadernillo', label: 'Cuadernillo Examen', icon: 'fa-book-open' },
  { id: 'plantilla_omr', label: 'Hoja Respuestas OMR', icon: 'fa-table-cells' },
  { id: 'todo_en_1', label: 'Todo en 1 PDF', icon: 'fa-layer-group' },
  { id: 'anexo_boe', label: 'Anexo BOE', icon: 'fa-scale-balanced' },
];

export const VisorPrevisualizacionPdfOficial: React.FC<
  VisorPrevisualizacionPdfOficialProps
> = ({
  paquete,
  documentoActivo: documentoControlado,
  onCambiarDocumento,
  alturaContenedorClass = 'max-h-[620px]',
}) => {
  const [docInterno, setDocInterno] =
    useState<TipoDocumentoPrevisualizado>('cuadernillo');
  const documentoActual = documentoControlado ?? docInterno;

  const [modoVista, setModoVista] = useState<'pagina' | 'cascada'>('pagina');
  const [paginaSeleccionada, setPaginaSeleccionada] = useState<number>(1);
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [paginasImg, setPaginasImg] = useState<PaginaRenderizadaCanvas[]>([]);
  const [totalPaginasDoc, setTotalPaginasDoc] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorRender, setErrorRender] = useState<string | null>(null);
  const [modalAmpliado, setModalAmpliado] = useState<boolean>(false);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);

  const seleccionarDocumento = (nuevo: TipoDocumentoPrevisualizado) => {
    if (onCambiarDocumento) {
      onCambiarDocumento(nuevo);
    } else {
      setDocInterno(nuevo);
    }
    setPaginaSeleccionada(1);
  };

  const blobObjetivo =
    documentoActual === 'plantilla_omr'
      ? paquete.plantillaOMRBlob
      : documentoActual === 'todo_en_1'
      ? paquete.combinadoBlob
      : documentoActual === 'anexo_boe'
      ? paquete.anexoJustificacionesBlob
      : paquete.cuadernilloBlob;

  const nombreArchivoObjetivo =
    documentoActual === 'plantilla_omr'
      ? paquete.plantillaOMRNombreArchivo
      : documentoActual === 'todo_en_1'
      ? paquete.combinadoNombreArchivo
      : documentoActual === 'anexo_boe'
      ? paquete.anexoJustificacionesNombreArchivo
      : paquete.cuadernilloNombreArchivo;

  // Cargar el documento PDF en memoria cuando cambie el blob seleccionado
  useEffect(() => {
    let cancelado = false;

    const cargarPdf = async () => {
      setCargando(true);
      setErrorRender(null);
      try {
        if (pdfDocRef.current) {
          try {
            await pdfDocRef.current.cleanup();
          } catch (_) {}
          pdfDocRef.current = null;
        }
        if (loadingTaskRef.current) {
          try {
            await loadingTaskRef.current.destroy();
          } catch (_) {}
          loadingTaskRef.current = null;
        }

        const buffer = await blobObjetivo.arrayBuffer();
        if (cancelado) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        loadingTaskRef.current = loadingTask;
        const pdfDoc = await loadingTask.promise;
        if (cancelado) {
          await loadingTask.destroy();
          return;
        }

        pdfDocRef.current = pdfDoc;
        setTotalPaginasDoc(pdfDoc.numPages);
        setPaginaSeleccionada((prev) => Math.min(Math.max(1, prev), pdfDoc.numPages));

        // Renderizar páginas solicitadas (1 página activa o todas si modo cascada, con límite seguro de 30 páginas en cascada)
        const indicesARenderizar: number[] =
          modoVista === 'pagina'
            ? [Math.min(Math.max(1, paginaSeleccionada), pdfDoc.numPages)]
            : Array.from({ length: Math.min(pdfDoc.numPages, 25) }, (_, i) => i + 1);

        const escalaRender = 1.85; // Alta nitidez tipográfica A4
        const resultados: PaginaRenderizadaCanvas[] = [];

        for (const numPag of indicesARenderizar) {
          if (cancelado) break;
          const page = await pdfDoc.getPage(numPag);
          const viewport = page.getViewport({ scale: escalaRender });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

          resultados.push({
            numeroPagina: numPag,
            dataUrl: canvas.toDataURL('image/png'),
            widthPx: viewport.width / escalaRender,
            heightPx: viewport.height / escalaRender,
          });
        }

        if (!cancelado) {
          setPaginasImg(resultados);
          setCargando(false);
        }
      } catch (err: any) {
        if (!cancelado) {
          console.error('Error previsualizando PDF oficial:', err);
          setErrorRender(
            'No se pudo renderizar la previsualización gráfica del PDF en este momento.'
          );
          setCargando(false);
        }
      }
    };

    cargarPdf();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobObjetivo, modoVista]);

  // Cuando solo cambia paginaSeleccionada en modo 'pagina' y pdfDocRef ya está cargado, renderizar rápido esa página
  useEffect(() => {
    let cancelado = false;
    const renderizarPaginaUnica = async () => {
      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc || modoVista !== 'pagina') return;
      const numSeguro = Math.min(Math.max(1, paginaSeleccionada), pdfDoc.numPages);
      if (paginasImg.length === 1 && paginasImg[0].numeroPagina === numSeguro) {
        return;
      }

      setCargando(true);
      try {
        const escalaRender = 1.85;
        const page = await pdfDoc.getPage(numSeguro);
        if (cancelado) return;
        const viewport = page.getViewport({ scale: escalaRender });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        if (!cancelado) {
          setPaginasImg([
            {
              numeroPagina: numSeguro,
              dataUrl: canvas.toDataURL('image/png'),
              widthPx: viewport.width / escalaRender,
              heightPx: viewport.height / escalaRender,
            },
          ]);
          setCargando(false);
        }
      } catch (_) {
        if (!cancelado) setCargando(false);
      }
    };

    renderizarPaginaUnica();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaSeleccionada, modoVista]);

  // Limpieza al desmontar el visor
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.cleanup();
        } catch (_) {}
        pdfDocRef.current = null;
      }
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch (_) {}
        loadingTaskRef.current = null;
      }
    };
  }, []);

  const renderBarraHerramientas = (enModal: boolean) => (
    <div className="bg-slate-900 text-white px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-700">
      {/* Selector del documento PDF a previsualizar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-300 mr-1 flex items-center gap-1">
          <i className="fa-solid fa-eye"></i>
          <span>Vista previa:</span>
        </span>
        {OPCIONES_DOCUMENTO.map((op) => {
          const activo = documentoActual === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => seleccionarDocumento(op.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activo
                  ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <i className={`fa-solid ${op.icon} text-[10px]`}></i>
              <span>{op.label}</span>
            </button>
          );
        })}
      </div>

      {/* Controles de paginación, modo cascada/página, zoom y pantalla completa */}
      <div className="flex items-center gap-2 flex-wrap">
        {modoVista === 'pagina' && totalPaginasDoc > 0 && (
          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              disabled={paginaSeleccionada <= 1}
              onClick={() => setPaginaSeleccionada((p) => Math.max(1, p - 1))}
              className="h-6 w-6 rounded hover:bg-slate-700 disabled:opacity-35 flex items-center justify-center text-xs cursor-pointer"
              title="Página anterior"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <select
              value={paginaSeleccionada}
              onChange={(e) => setPaginaSeleccionada(Number(e.target.value))}
              className="bg-slate-900 text-white text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer"
              title="Ir a página"
            >
              {Array.from({ length: totalPaginasDoc }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Pág. {n} / {totalPaginasDoc}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={paginaSeleccionada >= totalPaginasDoc}
              onClick={() =>
                setPaginaSeleccionada((p) => Math.min(totalPaginasDoc, p + 1))
              }
              className="h-6 w-6 rounded hover:bg-slate-700 disabled:opacity-35 flex items-center justify-center text-xs cursor-pointer"
              title="Página siguiente"
            >
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        )}

        {/* Alternar 1 página vs cascada continua */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[10.5px] font-bold">
          <button
            type="button"
            onClick={() => setModoVista('pagina')}
            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
              modoVista === 'pagina'
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ver página individual"
          >
            1 Pág.
          </button>
          <button
            type="button"
            onClick={() => setModoVista('cascada')}
            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
              modoVista === 'cascada'
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ver páginas seguidas en cascada"
          >
            Cascada
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-700 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setZoomPct((z) => Math.max(60, z - 15))}
            className="h-6 w-6 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="Reducir zoom"
          >
            <i className="fa-solid fa-magnifying-glass-minus text-[10px]"></i>
          </button>
          <button
            type="button"
            onClick={() => setZoomPct(100)}
            className="px-1 font-bold text-slate-200 hover:text-amber-300 cursor-pointer"
            title="Restablecer zoom al 100%"
          >
            {zoomPct}%
          </button>
          <button
            type="button"
            onClick={() => setZoomPct((z) => Math.min(175, z + 15))}
            className="h-6 w-6 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="Aumentar zoom"
          >
            <i className="fa-solid fa-magnifying-glass-plus text-[10px]"></i>
          </button>
        </div>

        {!enModal ? (
          <button
            type="button"
            onClick={() => setModalAmpliado(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors"
            title="Ampliar previsualización del cuadernillo a pantalla completa"
          >
            <i className="fa-solid fa-expand text-[10px]"></i>
            <span>Ampliar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setModalAmpliado(false)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-compress text-[10px]"></i>
            <span>Cerrar vista ampliada</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderLienzoPaginas = (alturaClass: string) => (
    <div
      className={`bg-slate-300/90 dark:bg-slate-950/90 overflow-auto p-3 sm:p-5 flex flex-col items-center gap-5 ${alturaClass}`}
    >
      {cargando && paginasImg.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-600"></i>
          <span className="text-xs font-bold">
            Generando vista previa oficial en A4 ({nombreArchivoObjetivo})...
          </span>
        </div>
      ) : errorRender ? (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold">
          {errorRender}
        </div>
      ) : (
        <>
          {paginasImg.map((pag) => {
            const claseAnchoZoom =
              zoomPct <= 70
                ? 'w-[420px] max-w-full'
                : zoomPct <= 85
                ? 'w-[510px] max-w-full'
                : zoomPct <= 100
                ? 'w-[610px] max-w-full'
                : zoomPct <= 115
                ? 'w-[710px]'
                : zoomPct <= 130
                ? 'w-[810px]'
                : zoomPct <= 145
                ? 'w-[910px]'
                : zoomPct <= 160
                ? 'w-[1010px]'
                : 'w-[1120px]';
            return (
              <div
                key={`${documentoActual}-p-${pag.numeroPagina}`}
                className={`relative bg-white shadow-xl border border-slate-400/70 transition-all shrink-0 ${claseAnchoZoom}`}
              >
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/75 text-white text-[9.5px] font-mono font-bold pointer-events-none">
                  Pág. {pag.numeroPagina} de {totalPaginasDoc}
                </span>
                <img
                  src={pag.dataUrl}
                  alt={`Previsualización PDF página ${pag.numeroPagina}`}
                  className="w-full h-auto block select-none"
                  draggable={false}
                />
              </div>
            );
          })}

          {modoVista === 'cascada' && totalPaginasDoc > 25 && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-mono">
              Mostrando las primeras 25 de {totalPaginasDoc} páginas en cascada. Usa el modo «1 Pág.» para inspeccionar páginas posteriores.
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl overflow-hidden border-2 border-slate-400 dark:border-slate-600 shadow-md bg-slate-900">
        {renderBarraHerramientas(false)}

        {/* Sub-barra informativa del archivo en memoria */}
        <div className="px-3.5 py-1.5 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between gap-2 flex-wrap text-[10.5px] font-mono text-slate-300">
          <span className="truncate">
            <i className="fa-regular fa-file-pdf text-rose-400 mr-1.5"></i>
            {nombreArchivoObjetivo}
          </span>
          <span className="text-emerald-300 font-bold shrink-0">
            Previsualización sin descarga · Formato A4 Oficial (210 × 297 mm)
          </span>
        </div>

        {renderLienzoPaginas(alturaContenedorClass)}
      </div>

      {/* Modal de pantalla ampliada para lectura cómoda del cuadernillo A4 */}
      {modalAmpliado && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-xs p-2 sm:p-5 flex flex-col animate-in fade-in duration-150"
          onClick={() => setModalAmpliado(false)}
        >
          <div
            className="w-full max-w-6xl mx-auto flex-1 flex flex-col rounded-2xl overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {renderBarraHerramientas(true)}
            {renderLienzoPaginas('flex-1')}
          </div>
        </div>
      )}
    </>
  );
};
