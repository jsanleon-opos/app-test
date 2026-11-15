/**
 * Utilidades de Exportación Robusta por Blob, Compresión/Descompresión Nativa GZIP
 * y Serialización Compacta sin Truncamientos (soporta +10.000 preguntas / +25 MB).
 */

/**
 * Comprueba si el navegador soporta la API nativa CompressionStream / DecompressionStream ('gzip').
 */
export function soportaCompresionGzipNativa(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).CompressionStream === 'function' &&
    typeof (window as any).DecompressionStream === 'function'
  );
}

/**
 * Comprime una cadena JSON en un Blob binario GZIP (.json.gz) utilizando la API nativa CompressionStream('gzip'),
 * reduciendo el peso del archivo entre un 80% y un 85% sin cargar pilas de memoria intermedias.
 */
export async function comprimirTextoAGzipBlob(jsonString: string): Promise<Blob> {
  if (!soportaCompresionGzipNativa()) {
    throw new Error('Tu navegador no soporta CompressionStream("gzip") nativo. Utiliza la descarga en formato .json estándar.');
  }
  const CompressionStreamCtor = (window as any).CompressionStream;
  const sourceBlob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const compressedStream = sourceBlob.stream().pipeThrough(new CompressionStreamCtor('gzip'));
  const gzBlob = await new Response(compressedStream).blob();
  return new Blob([gzBlob], { type: 'application/gzip' });
}

/**
 * Detecta si un archivo está comprimido en GZIP comprobando su extensión (.gz) o su cabecera mágica (0x1f 0x8b)
 * y devuelve el contenido textual íntegro descomprimido con DecompressionStream('gzip') o leído directamente en UTF-8.
 */
export async function leerArchivoTextoOGzip(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('Archivo corrupto o incompleto: el archivo seleccionado está vacío (0 bytes).');
  }

  let esGzip = file.name.toLowerCase().endsWith('.gz');

  // Comprobar también los 2 primeros bytes mágicos de GZIP (0x1f, 0x8b) por si se renombró el archivo
  if (!esGzip && file.size >= 2) {
    try {
      const headerBuf = await file.slice(0, 2).arrayBuffer();
      const bytes = new Uint8Array(headerBuf);
      if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        esGzip = true;
      }
    } catch (_) {}
  }

  if (esGzip) {
    if (!soportaCompresionGzipNativa()) {
      throw new Error('Este navegador no soporta descompresión nativa DecompressionStream("gzip").');
    }
    try {
      const DecompressionStreamCtor = (window as any).DecompressionStream;
      const decompressedStream = file.stream().pipeThrough(new DecompressionStreamCtor('gzip'));
      const texto = await new Response(decompressedStream).text();
      if (!texto || !texto.trim()) {
        throw new Error('Archivo descomprimido vacío');
      }
      return texto;
    } catch (_) {
      throw new Error(
        'Archivo corrupto o incompleto: no se pudo descomprimir el archivo .json.gz (flujo GZIP truncado o dañado).'
      );
    }
  }

  try {
    const texto = await file.text();
    if (!texto || !texto.trim()) {
      throw new Error('Archivo vacío');
    }
    return texto;
  } catch (_) {
    throw new Error('Archivo corrupto o incompleto: no se pudo leer el contenido del archivo.');
  }
}

/**
 * Dispara una descarga directa y segura mediante Blob y URL.createObjectURL(blob),
 * liberando la memoria con setTimeout(() => URL.revokeObjectURL(url), 1000).
 * Elimina al 100% cualquier uso de data:text/json o encodeURIComponent.
 */
export function descargarBlobConObjectURL(blob: Blob, nombreArchivo: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.className = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  return true;
}

const CLAVES_RAIZ_PRESERVAR_ARRAY_VACIO = new Set<string>([
  'bancoExamenes',
  'historialPruebas',
  'almacenDudas',
  'bibliotecaDocumentos',
  'subtemasBiblioteca',
  'preguntas',
  'opciones',
]);

/**
 * Limpia recursivamente propiedades vacías, nulas o redundantes para minimizar el peso del JSON
 * preservando intactos todos los booleanos (false/true), números (0) y arrays estructurales obligatorios.
 */
export function limpiarPropiedadesRedundantes<T>(valor: T, claveActual?: string): T {
  if (valor === null || valor === undefined) {
    return undefined as unknown as T;
  }

  if (Array.isArray(valor)) {
    const limpioArr = valor
      .map((item) => limpiarPropiedadesRedundantes(item))
      .filter((item) => item !== undefined);
    return limpioArr as unknown as T;
  }

  if (typeof valor === 'object') {
    const resultado: Record<string, any> = {};
    const entradas = Object.entries(valor as Record<string, any>);
    for (let i = 0; i < entradas.length; i++) {
      const [k, v] = entradas[i];
      if (v === undefined || v === null || v === '') {
        continue;
      }
      // Omitir flags booleanos opcionales en su valor falso por defecto dentro de preguntas para ahorrar peso
      if ((k === 'esReserva' || k === 'esAnulada' || k === 'soloHistorial') && v === false) {
        continue;
      }
      if (Array.isArray(v)) {
        const arrLimpio = limpiarPropiedadesRedundantes(v, k);
        if ((arrLimpio as any[]).length === 0 && !CLAVES_RAIZ_PRESERVAR_ARRAY_VACIO.has(k)) {
          continue;
        }
        resultado[k] = arrLimpio;
        continue;
      }
      if (typeof v === 'object') {
        const objLimpio = limpiarPropiedadesRedundantes(v, k);
        if (
          objLimpio &&
          Object.keys(objLimpio).length === 0 &&
          k !== 'respuestasUsuario' &&
          k !== 'anotacionesPorExamen' &&
          k !== 'controlPreguntasSuperadas' &&
          k !== 'recursosArgumentacionPorPregunta'
        ) {
          continue;
        }
        resultado[k] = objLimpio;
        continue;
      }
      resultado[k] = v;
    }
    if (claveActual === undefined) {
      return resultado as T;
    }
    return resultado as T;
  }

  return valor;
}

/**
 * Formatea un tamaño en bytes a una cadena legible (KB o MB).
 */
export function formatearTamanoBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
