import fs from 'fs';

interface Opcion {
  id: string;
  texto: string;
  esCorrecta: boolean;
  explicacion: string;
}

interface PreguntaExamen {
  id: number;
  enunciado: string;
  opciones: Opcion[];
  justificacionLegal: {
    norma: string;
    articulo: string;
    codigoBOE: string;
    urlBOE: string;
    fundamento: string;
  };
  esReserva?: boolean;
}

// We will construct the 70 unitarias and 20 supuestos
// Ensuring:
// - ~25% option A, ~25% option B, ~25% option C, ~25% option D
// - Options are homogeneous in length (correct option is not always longest)
// - Negative questions ("señale la opción incorrecta / falsa")
// - Date calculation questions ("cálculo de fechas y plazos")
