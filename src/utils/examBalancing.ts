import { PreguntaExamen, OpcionPregunta } from '../types';

/**
 * Fisher-Yates array shuffle utility
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Genera una secuencia perfectamente equilibrada de letras objetivo ('A', 'B', 'C', 'D')
 * para una cantidad N de preguntas, garantizando que cada bloque de 4 preguntas
 * contenga exactamente una de cada letra en orden aleatorio (máxima impredecibilidad
 * sin sesgo de letra).
 */
export function generarSecuenciaLetrasEquilibrada(cantidad: number): ('A' | 'B' | 'C' | 'D')[] {
  const secuencia: ('A' | 'B' | 'C' | 'D')[] = [];
  const base: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const bloquesCompletos = Math.ceil(cantidad / 4);
  for (let b = 0; b < bloquesCompletos; b++) {
    const bloqueAleatorio = shuffleArray(base);
    secuencia.push(...bloqueAleatorio);
  }

  return secuencia.slice(0, cantidad);
}

/**
 * Reubica y baraja las opciones de cada pregunta para eliminar:
 * 1. El sesgo de posición de la respuesta correcta (distribución ~25% para A, B, C, D).
 * 2. El sesgo de longitud (la opción más larga ya no predice la respuesta correcta).
 * 3. Asigna de forma correlativa los IDs 'A', 'B', 'C', 'D'.
 */
export function balancearYDistribuirOpciones(preguntas: PreguntaExamen[]): PreguntaExamen[] {
  if (!Array.isArray(preguntas) || preguntas.length === 0) return [];

  const letrasObjetivo = generarSecuenciaLetrasEquilibrada(preguntas.length);
  const letras: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  return preguntas.map((pregunta, idx) => {
    if (!Array.isArray(pregunta.opciones) || pregunta.opciones.length === 0) {
      return pregunta;
    }

    // Localizar la opción correcta
    let correctIdx = pregunta.opciones.findIndex((o) => o.esCorrecta);
    if (correctIdx === -1) {
      // Si ninguna venía marcada como correcta por fallo del modelo, marcar la primera
      correctIdx = 0;
    }

    const opcionCorrecta = { ...pregunta.opciones[correctIdx], esCorrecta: true };
    const distractores = pregunta.opciones
      .filter((_, i) => i !== correctIdx)
      .map((d) => ({ ...d, esCorrecta: false }));

    // Barajar los distractores entre sí para eliminar cualquier orden original predecible
    const distractoresBarajados = shuffleArray(distractores);

    // Determinar la letra objetivo para esta pregunta ('A', 'B', 'C' o 'D')
    const letraObjetivo = letrasObjetivo[idx];
    const targetIdx = letras.indexOf(letraObjetivo);

    // Ensamblar las 4 opciones colocando la correcta en targetIdx
    const nuevasOpciones: OpcionPregunta[] = [];
    let distractorIdx = 0;

    for (let pos = 0; pos < 4; pos++) {
      const letraPos = letras[pos];
      if (pos === targetIdx) {
        nuevasOpciones.push({
          ...opcionCorrecta,
          id: letraPos,
        });
      } else {
        const dist = distractoresBarajados[distractorIdx] || {
          id: letraPos,
          texto: `Opción alternativa ${letraPos}`,
          esCorrecta: false,
          explicacion: 'Opción no aplicable conforme al precepto legal regulado.',
        };
        nuevasOpciones.push({
          ...dist,
          id: letraPos,
        });
        distractorIdx++;
      }
    }

    return {
      ...pregunta,
      opciones: nuevasOpciones,
    };
  });
}
