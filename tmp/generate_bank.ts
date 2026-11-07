import fs from 'fs';

// Helper to write the complete boeQuestionsBank.ts file
const code = `import { PreguntaExamen } from '../types';

/**
 * Función que equilibra y distribuye equitativamente las opciones correctas
 * entre las letras A, B, C y D (aproximadamente un 25% para cada letra),
 * evitando cualquier sesgo o concentración en una letra concreta.
 */
export function equilibrarDistribucionOpciones(preguntas: PreguntaExamen[]): PreguntaExamen[] {
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  // Patrones balanceados que garantizan que en cada bloque de 4 preguntas
  // haya exactamente una A, una B, una C y una D en orden no monótono ni predecible
  const patrones: ('A' | 'B' | 'C' | 'D')[][] = [
    ['C', 'A', 'D', 'B'],
    ['B', 'D', 'A', 'C'],
    ['D', 'B', 'C', 'A'],
    ['A', 'C', 'B', 'D'],
    ['B', 'A', 'D', 'C'],
    ['C', 'D', 'A', 'B'],
    ['D', 'A', 'C', 'B'],
  ];

  return preguntas.map((pregunta, idx) => {
    if (!pregunta.opciones || pregunta.opciones.length !== 4) {
      return pregunta;
    }

    const patron = patrones[Math.floor(idx / 4) % patrones.length];
    const targetLetter = patron[idx % 4];
    const targetIdx = letters.indexOf(targetLetter);

    const currentCorrectIdx = pregunta.opciones.findIndex((o) => o.esCorrecta);
    if (currentCorrectIdx === -1) {
      return pregunta;
    }

    const opcionesClonadas = pregunta.opciones.map((o) => ({ ...o }));

    // Si la opción correcta no está en targetIdx, intercambiarla
    if (currentCorrectIdx !== targetIdx) {
      const temp = opcionesClonadas[targetIdx];
      opcionesClonadas[targetIdx] = opcionesClonadas[currentCorrectIdx];
      opcionesClonadas[currentCorrectIdx] = temp;
    }

    // Reasignar limpiamente los IDs A, B, C, D manteniendo los textos y explicaciones íntegros
    const opcionesReasignadas = opcionesClonadas.map((opc, oIdx) => ({
      ...opc,
      id: letters[oIdx],
    }));

    return {
      ...pregunta,
      opciones: opcionesReasignadas,
    };
  });
}
`;

console.log('Template ready');
