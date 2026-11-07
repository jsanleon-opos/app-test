import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { generarBancoPreguntasBOE, calcularHuellaPregunta, generarCodigoInedita } from './src/constants/boeQuestionsBank';
import { balancearYDistribuirOpciones } from './src/utils/examBalancing';
import { analizarFondoDelCaso, generar20PreguntasAlineadasAlCaso } from './src/utils/caseAnalyzer';
import { extraerPlantillaDeRespuestasCompleta, deducirCategoriaExamen } from './src/utils/jsonExamHelper';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Must strictly run on port 3000 in AI Studio Build
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Initialise GoogleGenAI with server-side API Key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Official BOE Act IDs dictionary for canonical links
const BOE_LEYES_MAP: Record<string, { id: string; url: string; nombre: string }> = {
  'Constitución Española': { id: 'BOE-A-1978-31229', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229', nombre: 'Constitución Española de 1978' },
  'Ley 39/2015': { id: 'BOE-A-2015-10565', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565', nombre: 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas' },
  'Ley 40/2015': { id: 'BOE-A-2015-10566', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566', nombre: 'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público' },
  'TREBEP': { id: 'BOE-A-2015-11719', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719', nombre: 'Real Decreto Legislativo 5/2015, de 30 de octubre: Estatuto Básico del Empleado Público' },
  'Ley 3/2018': { id: 'BOE-A-2018-16673', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673', nombre: 'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales' },
  'Real Decreto 364/1995': { id: 'BOE-A-1995-8729', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-8729', nombre: 'Real Decreto 364/1995, de 10 de marzo: Reglamento General de Ingreso y Provisión de Puestos de Trabajo en la AGE' },
  'Real Decreto 365/1995': { id: 'BOE-A-1995-7451', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-7451', nombre: 'Real Decreto 365/1995, de 10 de marzo: Reglamento de Situaciones Administrativas de los Funcionarios Civiles de la AGE' },
  'Ley 9/2017': { id: 'BOE-A-2017-12902', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902', nombre: 'Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público' },
  'Ley 47/2003': { id: 'BOE-A-2003-21618', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-21618', nombre: 'Ley 47/2003, de 26 de noviembre, General Presupuestaria' },
  'Ley 19/2013': { id: 'BOE-A-2013-12887', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887', nombre: 'Ley 19/2013, de 9 de diciembre, de transparencia, acceso a la información y buen gobierno' },
  'Ley 50/1997': { id: 'BOE-A-1997-25336', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1997-25336', nombre: 'Ley 50/1997, de 27 de noviembre, del Gobierno' },
  'Estatuto CAM': { id: 'BOE-A-1983-6317', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1983-6317', nombre: 'Ley Orgánica 3/1983: Estatuto de Autonomía de la Comunidad de Madrid' },
  'Ley 1/1983 CAM': { id: 'BOE-A-1983-34139', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1983-34139', nombre: 'Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid' },
};

// POST /api/generate-exam: Generates tests or practical scenarios grounded strictly in www.boe.es
app.post('/api/generate-exam', async (req, res) => {
  const {
    tipo = 'unitario',
    ambito = 'AGE',
    tematicas = [],
    leyes = [],
    numPreguntas = 10,
    dificultad = 'trampa_tribunal',
    preguntasExcluidas = [],
  } = req.body || {};

  const tematicasStr = tematicas.length > 0 ? tematicas.join(', ') : 'Temario general';
  const leyesStr = leyes.length > 0 ? leyes.join(', ') : 'Legislación básica consolidada publicada en www.boe.es';

  // Strictly enforce user-requested quantities: 5, 10, 20, 70 (or custom)
  const allowedCounts = [5, 10, 20, 70];
  const numParsed = parseInt(String(numPreguntas), 10);
  const targetCount = allowedCounts.includes(numParsed) ? numParsed : Math.max(1, numParsed || 10);

  // Set sufficient output tokens to prevent JSON truncation (4096 for 5-10, 8192 for 20, 20480 for 70)
  const tokensNeeded = targetCount >= 70 ? 20480 : targetCount >= 20 ? 8192 : 4096;

  let excluidasPrompt = '';
  if (Array.isArray(preguntasExcluidas) && preguntasExcluidas.length > 0) {
    const listado = preguntasExcluidas
      .slice(-20)
      .map((p: string, idx: number) => `  - [PREVIO #${idx + 1}]: "${p.replace(/\n+/g, ' ').slice(0, 160)}"`)
      .join('\n');
    excluidasPrompt = `\nPREGUNTAS GENERADAS EN TURNOS O EJECUCIONES ANTERIORES (QUEDA TERMINANTEMENTE PROHIBIDO REPETIR O CLONAR):\n${listado}\n`;
  }

  // If no GEMINI_API_KEY, return high quality curated BOE bank immediately
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not defined, returning guaranteed high-yield BOE test.');
    return res.json(generarBancoPreguntasBOE(tipo, ambito, targetCount, tematicasStr, leyesStr, preguntasExcluidas));
  }

  try {
    let userPrompt = '';
    if (tipo === 'supuesto') {
      userPrompt = `Genera un SUPUESTO PRÁCTICO OFICIAL DE INTEGRACIÓN NORMATIVA para el cuerpo de Administrativos (${ambito}).
Fuente oficial obligatoria y exclusiva: www.boe.es (Boletín Oficial del Estado).
Temáticas acotadas: ${tematicasStr}.
Leyes BOE seleccionadas (POOL EXCLUSIVO): ${leyesStr}.
Nivel de exigencia: ${dificultad} (supuesto real de tribunal oficial, con datos fácticos precisos, fechas, plazos y resoluciones).
Número EXACTO de preguntas asociadas al supuesto: ${targetCount}.

### FILTRADO ESTRICTO DE FUENTES NORMATIVAS (REGLA DE EXCLUSIÓN TOTAL)
1. Queda TERMINANTEMENTE PROHIBIDO generar preguntas de normas, leyes o reglamentos cuyas casillas NO hayan sido marcadas explícitamente en el panel de configuración (o que hayan sido desmarcadas).
2. Si la casilla de la Ley 39/2015 (LPACAP) NO está seleccionada en la legislación específica, no generes ninguna pregunta basada en ella, aunque aparezca seleccionada la temática general de procedimiento.
3. El pool normativo activo se restringe ÚNICA Y EXCLUSIVAMENTE a las normas marcadas en «Leyes BOE seleccionadas»: "${leyesStr}".
   Si solo están marcados el TREBEP (RDL 5/2015), el RD 364/1995 y el RD 365/1995, el 100% de las preguntas de la tanda debe distribuirse exclusivamente entre esas 3 normas. Actúa igual con cualquier otra selección: el 100% de las preguntas debe pertenecer estrictamente a las leyes marcadas, con 0% de leyes no seleccionadas.

### DIRECTRIZ OBLIGATORIA: GENERACIÓN INÉDITA Y NO REPETICIÓN (ANTI-DUPLICADOS)

1. REGLA DE NO REPETICIÓN RADICAL:
   - Queda TERMINANTEMENTE PROHIBIDO reutilizar, clonar o reformular preguntas de turnos o ejecuciones anteriores.
   - No se considerará "pregunta nueva" cambiar el orden de las alternativas (A, B, C, D) manteniendo el mismo enunciado, ni alterar únicamente el nombre de los interesados o la cifra de un plazo. El núcleo jurídico o técnico evaluado DEBE ser diferente en cada ítem.

2. MATRIZ DE DIVERSIFICACIÓN TEMÁTICA:
   - Para cada bloque seleccionado o batería generada, la IA debe auditar internamente qué materias ya ha tocado y rotar obligatoriamente entre las áreas del programa oficial:
     * Materias Administrativas Generales: LPACAP (Ley 39/2015), LRJSP (Ley 40/2015), TREBEP, Contratos del Sector Público (LCSP), Gestión Financiera/Presupuestaria (LGP), Transparencia e Igualdad, ajustándose exclusivamente a las leyes seleccionadas.
       - En una misma sesión o supuesto, no pueden coexistir dos preguntas que versen sobre el mismo artículo legal concreto o sobre la misma función específica de una aplicación.

3. CONSTRUCCIÓN DE PREGUNTAS Y DISTRACTORES HOMOGÉNEOS:
   - Cada pregunta constará de 4 alternativas homogéneas en longitud, formato y credibilidad jurídica/técnica.
   - Queda prohibido el distractor perezoso (opciones absurdas, chistes o respuestas visiblemente más cortas/largas).
   - La posición de la respuesta correcta debe distribuirse de forma equilibrada y aleatoria real (aprox. 25% para cada letra: A, B, C, D), evitando sesgos recurrentes hacia una letra en particular.
${excluidasPrompt}
REGLA DE ORO DE INTEGRACIÓN DE LAS LEYES SELECCIONADAS (OBLIGATORIA):
El supuesto práctico y sus ${targetCount} preguntas DEBEN integrar y abarcar de forma equilibrada TODAS y CADA UNA de las leyes seleccionadas por el opositor (${leyesStr}) y NINGUNA OTRA LEY:
- Si se ha seleccionado TREBEP (RDL 5/2015), incorpora en el caso y formula preguntas sobre derechos, permisos, carrera, retribuciones, régimen disciplinario y situaciones de los funcionarios.
- Si se han seleccionado Reales Decretos (Real Decreto 364/1995 o Real Decreto 365/1995), formula preguntas específicas de concurso de traslados, libre designación, comisiones de servicio, plazos posesorios (3 días hábiles / 1 mes) y situaciones administrativas (excedencia por interés particular 5 años, cuidado de familiares 3 años, servicios especiales, suspensión).
- Si se ha seleccionado Ley Orgánica 3/2018 (LOPDGDD), incorpora actuaciones de los ciudadanos en sede electrónica ejercitando derechos de protección de datos (acceso, rectificación, supresión, limitación), plazo de resolución de 1 mes, figura y comunicación del Delegado de Protección de Datos (DPD) a la AEPD (10 días) y régimen de apercibimiento sin multa a administraciones públicas (art. 77).
- Si se ha seleccionado Ley 9/2017 (LCSP), incluye contrataciones de la unidad (contrato menor, umbrales y tramitación).
- Si se ha seleccionado Ley 19/2013 (Transparencia), incluye solicitudes de acceso público a la información y reclamación ante el CTBG.
- Si se ha seleccionado Ley 47/2003 (LGP), incluye fases de gasto público (A, D, O, P).

### PROTOCOLO ESTRICTO DE CÓMPUTO DE PLAZOS ADMINISTRATIVOS (LEY 39/2015)
Al generar cualquier supuesto o resolver preguntas de plazos administrativos, la IA debe seguir OBLIGATORIAMENTE un algoritmo secuencial en tres fases antes de formular la respuesta y las opciones:

1. IDENTIFICACIÓN Y DIES A QUO (Art. 30.3):
   - Identificar la fecha exacta del hecho o notificación (Fecha N).
   - Fijar el 'dies a quo': primer día del cómputo = día hábil siguiente a la notificación (Fecha N + 1 hábil).

2. TRAZABILIDAD DÍA A DÍA (Para plazos en días hábiles - Art. 30.2):
   - Desglosar explícitamente en el razonamiento interno la lista numerada día por día hábil (Día 1, Día 2, ... Día X).
   - Excluir individualmente de la lista sábados, domingos y festivos aplicables (nacionales, autonómicos o locales indicados en el enunciado).
   - El día en el que se alcance el número exacto fijado en el plazo es el 'DIES AD QUEM' (vencimiento natural).

3. REGLA DE CIERRE Y PRÓRROGA (Art. 30.5):
   - Evaluar ÚNICAMENTE el 'dies ad quem' obtenido:
     * Si el 'dies ad quem' cae en día HÁBIL: El plazo FINALIZA EXACTAMENTE ese día a las 23:59:59 horas. QUEDA TERMINANTEMENTE PROHIBIDO aplicar prórroga a días o meses posteriores aunque intervengan festivos en días inmediatos siguientes.
     * Si el 'dies ad quem' cae en día INHÁBIL (sábado, domingo o festivo declarado): Únicamente en este caso el plazo se entiende prorrogado al primer día hábil siguiente.

REGLA DE CALIDAD:
La opción correcta (clave) de la pregunta debe coincidir matemáticamente con el 'dies ad quem' final resultante del desglose, y dicho día debe figurar obligatoriamente entre las 4 alternativas del test.
En las preguntas con cálculo de plazos, el campo 'explicacion' de la opción correcta debe incluir explícitamente el desglose de las 3 fases (Fecha N, Dies a quo, lista correlativa día a día excluyendo fines de semana y festivos, y la evaluación de cierre del Dies ad quem).

Estructura obligatoria:
1. "titulo": Título formal del supuesto práctico.
2. "contextoCaso": Relato fáctico detallado del caso administrativo (entre 180 y 340 palabras) con fechas concretas y actuaciones en una unidad administrativa de ${ambito === 'CAM' ? 'la Comunidad de Madrid' : 'la Administración General del Estado'} donde ocurran hechos relacionados exclusivamente con las leyes seleccionadas.
3. "leyesBOEAplicadas": Lista de las leyes consolidadas del BOE intervinientes (solo las seleccionadas).
4. "preguntas": ${targetCount} preguntas tipo test de 4 opciones (A, B, C, D) con 1 sola correcta.
   - Cada opción debe tener su texto y una explicación concisa.
   - REGLAS DE ANTI-SESGO Y NO REPETICIÓN OBLIGATORIAS:
     a) Distribución homogénea de respuestas correctas entre A, B, C, D (25% cada letra).
     b) Neutralidad de longitud: la respuesta correcta NO debe ser siempre la más larga. En muchas preguntas, la opción correcta debe ser corta y directa, mientras los distractores son extensos.
     c) Al menos un 25% de preguntas deben exigir identificar la opción INCORRECTA o FALSA ("Señale la opción INCORRECTA", "¿Cuál es FALSA?"), llevando "esCorrecta: true" la opción con la incorrección jurídica.
     d) No repetir artículos legales ni funciones evaluadas en otras preguntas de la misma tanda.
     e) Siempre que sea aplicable, formula preguntas con cálculo numérico exacto de fechas y cómputo de plazos aplicando con rigor absoluto el PROTOCOLO ESTRICTO DE CÓMPUTO DE PLAZOS ADMINISTRATIVOS.
   - "justificacionLegal": Contendrá "norma", "articulo", "codigoBOE" (ej. "BOE-A-2015-10565"), "urlBOE" (enlace a www.boe.es) y "fundamento" (cita literal o resumen del precepto publicado en el BOE).`;
    } else {
      userPrompt = `Genera un TEST UNITARIO NORMATIVO de EXACTAMENTE ${targetCount} preguntas para oposiciones de Administrativo (${ambito}).
Fuente oficial obligatoria y exclusiva: www.boe.es (Boletín Oficial del Estado).
Temáticas acotadas: ${tematicasStr}.
Leyes BOE seleccionadas (POOL EXCLUSIVO): ${leyesStr}.
Nivel de exigencia: ${dificultad} (literalidad de plazos, competencias orgánicas, silencios administrativos y trampas oficiales de examen).

### FILTRADO ESTRICTO DE FUENTES NORMATIVAS (REGLA DE EXCLUSIÓN TOTAL)
1. Queda TERMINANTEMENTE PROHIBIDO generar preguntas de normas, leyes o reglamentos cuyas casillas NO hayan sido marcadas explícitamente en el panel de configuración (o que hayan sido desmarcadas).
2. Si la casilla de la Ley 39/2015 (LPACAP) NO está seleccionada en la legislación específica, no generes ninguna pregunta basada en ella, aunque aparezca seleccionada la temática general de procedimiento.
3. El pool normativo activo se restringe ÚNICA Y EXCLUSIVAMENTE a las normas marcadas en «Leyes BOE seleccionadas»: "${leyesStr}".
   Si solo están marcados el TREBEP (RDL 5/2015), el RD 364/1995 y el RD 365/1995, el 100% de las preguntas de la tanda debe distribuirse exclusivamente entre esas 3 normas. Actúa igual con cualquier otra selección: el 100% de las preguntas debe pertenecer estrictamente a las leyes marcadas, con 0% de leyes no seleccionadas.

### DIRECTRIZ OBLIGATORIA: GENERACIÓN INÉDITA Y NO REPETICIÓN (ANTI-DUPLICADOS)

1. REGLA DE NO REPETICIÓN RADICAL:
   - Queda TERMINANTEMENTE PROHIBIDO reutilizar, clonar o reformular preguntas de turnos o ejecuciones anteriores.
   - No se considerará "pregunta nueva" cambiar el orden de las alternativas (A, B, C, D) manteniendo el mismo enunciado, ni alterar únicamente el nombre de los interesados o la cifra de un plazo. El núcleo jurídico o técnico evaluado DEBE ser diferente en cada ítem.

2. MATRIZ DE DIVERSIFICACIÓN TEMÁTICA:
   - Para cada bloque seleccionado o batería generada, la IA debe auditar internamente qué materias ya ha tocado y rotar obligatoriamente entre las áreas del programa oficial:
     * Materias Administrativas Generales: LPACAP (Ley 39/2015), LRJSP (Ley 40/2015), TREBEP, Contratos del Sector Público (LCSP), Gestión Financiera/Presupuestaria (LGP), Transparencia e Igualdad, ajustándose exclusivamente a las leyes seleccionadas.
       - En una misma sesión o supuesto, no pueden coexistir dos preguntas que versen sobre el mismo artículo legal concreto o sobre la misma función específica de una aplicación.

3. CONSTRUCCIÓN DE PREGUNTAS Y DISTRACTORES HOMOGÉNEOS:
   - Cada pregunta constará de 4 alternativas homogéneas en longitud, formato y credibilidad jurídica/técnica.
   - Queda prohibido el distractor perezoso (opciones absurdas, chistes o respuestas visiblemente más cortas/largas).
   - La posición de la respuesta correcta debe distribuirse de forma equilibrada y aleatoria real (aprox. 25% para cada letra: A, B, C, D), evitando sesgos recurrentes hacia una letra en particular.
${excluidasPrompt}
REGLAS DE ORO DEL TRIBUNAL (DISTRIBUCIÓN DE LEYES Y ANTI-SESGO ESTRICTO):
1. REPARTO EQUILIBRADO Y EXCLUSIVO ENTRE LAS LEYES SELECCIONADAS: El test DEBE distribuir el total de ${targetCount} preguntas ÚNICA Y EXCLUSIVAMENTE entre las leyes indicadas en "${leyesStr}". Si el opositor ha marcado TREBEP, Reales Decretos (RD 364/1995 de Provisión o RD 365/1995 de Situaciones Administrativas) o Ley 3/2018 (LOPDGDD), es OBLIGATORIO incluir preguntas directas de esas leyes (situaciones, permisos, provisión de puestos, derechos de protección de datos, DPD, régimen sancionador). Queda terminantemente prohibido incluir preguntas de leyes ajenas o desmarcadas.
2. DISTRIBUCIÓN EQUILIBRADA DE RESPUESTAS: Reparte de forma uniforme las respuestas correctas entre las 4 letras (aprox. 25% para A, 25% B, 25% C y 25% D). NUNCA concentres la opción correcta en la misma letra.
3. NEUTRALIDAD DE LONGITUD: La respuesta correcta NUNCA debe ser identificable por su longitud. En muchas preguntas, la opción correcta debe ser muy corta y directa, mientras que los distractores deben ser detallados y extensos.
4. PREGUNTAS DE OPCIÓN INCORRECTA: Al menos entre un 25% y un 35% de las preguntas deben requerir identificar la opción INCORRECTA o FALSA ("Señale la opción INCORRECTA:", "¿Cuál de las siguientes afirmaciones es FALSA?:", "NO es conforme a derecho:", "No corresponde a..."). En estas preguntas, la opción con "esCorrecta: true" es la que contiene la falsedad normativa.
5. CÁLCULO DE FECHAS Y PLAZOS: Siempre que el temario verse sobre procedimiento administrativo, recursos, plazos o notificaciones, incorpora preguntas con casos prácticos de cálculo concreto de fechas.

### PROTOCOLO ESTRICTO DE CÓMPUTO DE PLAZOS ADMINISTRATIVOS (LEY 39/2015)
Al generar cualquier supuesto o resolver preguntas de plazos administrativos, la IA debe seguir OBLIGATORIAMENTE un algoritmo secuencial en tres fases antes de formular la respuesta y las opciones:

1. IDENTIFICACIÓN Y DIES A QUO (Art. 30.3):
   - Identificar la fecha exacta del hecho o notificación (Fecha N).
   - Fijar el 'dies a quo': primer día del cómputo = día hábil siguiente a la notificación (Fecha N + 1 hábil).

2. TRAZABILIDAD DÍA A DÍA (Para plazos en días hábiles - Art. 30.2):
   - Desglosar explícitamente en el razonamiento interno la lista numerada día por día hábil (Día 1, Día 2, ... Día X).
   - Excluir individualmente de la lista sábados, domingos y festivos aplicables (nacionales, autonómicos o locales indicados en el enunciado).
   - El día en el que se alcance el número exacto fijado en el plazo es el 'DIES AD QUEM' (vencimiento natural).

3. REGLA DE CIERRE Y PRÓRROGA (Art. 30.5):
   - Evaluar ÚNICAMENTE el 'dies ad quem' obtenido:
     * Si el 'dies ad quem' cae en día HÁBIL: El plazo FINALIZA EXACTAMENTE ese día a las 23:59:59 horas. QUEDA TERMINANTEMENTE PROHIBIDO aplicar prórroga a días o meses posteriores aunque intervengan festivos en días inmediatos siguientes.
     * Si el 'dies ad quem' cae en día INHÁBIL (sábado, domingo o festivo declarado): Únicamente en este caso el plazo se entiende prorrogado al primer día hábil siguiente.

REGLA DE CALIDAD:
La opción correcta (clave) de la pregunta debe coincidir matemáticamente con el 'dies ad quem' final resultante del desglose, y dicho día debe figurar obligatoriamente entre las 4 alternativas del test.
En las preguntas con cálculo de plazos, el campo 'explicacion' de la opción correcta debe incluir explícitamente el desglose de las 3 fases (Fecha N, Dies a quo, lista correlativa día a día excluyendo fines de semana y festivos, y la evaluación de cierre del Dies ad quem).

Cada pregunta debe incluir:
- Enunciado claro y riguroso.
- 4 opciones (A, B, C, D) con 1 sola opción correcta y explicación para cada una.
- "justificacionLegal" con referencia rigurosa a www.boe.es: "norma", "articulo", "codigoBOE", "urlBOE" y "fundamento" del precepto del BOE.`;
    }

    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        maxOutputTokens: tokensNeeded,
        systemInstruction: `Eres el Presidente del Tribunal Calificador de las oposiciones de Administrativos (C1 AGE / Comunidad de Madrid).
REGLA INQUEBRANTABLE: Toda la normativa, fundamentaciones, artículos y soluciones deben provenir y fundamentarse de forma EXCLUSIVA en la legislación oficial consolidada publicada en la web oficial del Boletín Oficial del Estado (www.boe.es).
Cada justificación legal debe indicar expresamente el código BOE (ej. BOE-A-2015-10565 para Ley 39/2015, BOE-A-1978-31229 para Constitución, BOE-A-2015-10566 para Ley 40/2015, BOE-A-2015-11719 para TREBEP, BOE-A-1995-8729 para RD 364/1995, BOE-A-1995-7451 para RD 365/1995, BOE-A-2018-16673 para Ley 3/2018, BOE-A-2017-12902 para Contratos, BOE-A-2003-21618 para LGP, BOE-A-2013-12887 para Transparencia, etc.) y la URL canónica de www.boe.es.

FILTRADO ESTRICTO DE FUENTES NORMATIVAS (REGLA DE EXCLUSIÓN TOTAL):
1. Queda TERMINANTEMENTE PROHIBIDO generar preguntas de normas, leyes o reglamentos cuyas casillas NO hayan sido marcadas explícitamente en el panel de configuración (o que hayan sido desmarcadas).
2. Si la casilla de la Ley 39/2015 (LPACAP) NO está seleccionada en la legislación específica, no generes ninguna pregunta basada en ella, aunque aparezca seleccionada la temática general de procedimiento.
3. El pool normativo activo se restringe ÚNICA Y EXCLUSIVAMENTE a las normas marcadas en «Leyes BOE seleccionadas»: "${leyesStr}". Si solo están marcados el TREBEP (RDL 5/2015), el RD 364/1995 y el RD 365/1995, el 100% de las preguntas de la tanda debe distribuirse exclusivamente entre esas 3 normas. Actúa igual con cualquier otra selección: 0% de preguntas de leyes no marcadas.

PAUTAS ESPECÍFICAS DE PREGUNTAS Y GENERACIÓN INÉDITA:
1. GENERACIÓN INÉDITA Y NO REPETICIÓN RADICAL (ANTI-DUPLICADOS):
   - Queda TERMINANTEMENTE PROHIBIDO reutilizar, clonar o reformular preguntas de turnos o ejecuciones anteriores.
   - No se considerará "pregunta nueva" cambiar el orden de las alternativas manteniendo el mismo enunciado, ni alterar únicamente el nombre de los interesados o la cifra de un plazo. El núcleo jurídico o técnico evaluado DEBE ser diferente en cada ítem.
   - En una misma sesión o supuesto, NO pueden coexistir dos preguntas que versen sobre el mismo artículo legal concreto o sobre la misma función específica.
2. DISTRIBUCIÓN POR TODAS LAS LEYES SELECCIONADAS: Has de generar preguntas para CADA UNA de las leyes seleccionadas (${leyesStr}), repartiendo las preguntas equitativamente entre ellas. Si se piden TREBEP, RD 364/1995, RD 365/1995, Ley 3/2018, etc., debes generar preguntas de esas leyes, sin omitirlas.
3. CONSTRUCCIÓN DE PREGUNTAS Y DISTRACTORES HOMOGÉNEOS: Cada pregunta constará de 4 alternativas homogéneas en longitud, formato y credibilidad jurídica/técnica. Queda prohibido el distractor perezoso. Equilibra rigurosamente las letras correctas (25% A, 25% B, 25% C, 25% D).
4. LONGITUD DE RESPUESTAS: Haz que la opción correcta no sea siempre la más larga. En múltiples preguntas la opción correcta debe ser corta y los distractores largos y plausibles.
5. OPCIONES INCORRECTAS: Incluye preguntas donde la premisa sea señalar la opción INCORRECTA o FALSA.
6. PROTOCOLO ESTRICTO DE CÓMPUTO DE PLAZOS ADMINISTRATIVOS (LEY 39/2015):
   Al generar o resolver cualquier pregunta o supuesto sobre plazos administrativos, aplica obligatoriamente este algoritmo secuencial en tres fases:
   - FASE 1 - IDENTIFICACIÓN Y DIES A QUO (Art. 30.3): Identifica Fecha N y fija el 'dies a quo' en el día hábil siguiente (Fecha N + 1 hábil).
   - FASE 2 - TRAZABILIDAD DÍA A DÍA (Art. 30.2): Desglosa la lista numerada correlativa de días hábiles (Día 1, Día 2, ... Día X) excluyendo individualmente sábados, domingos y festivos declarados. El día en que se alcanza el cómputo exacto es el 'DIES AD QUEM' (vencimiento natural).
   - FASE 3 - REGLA DE CIERRE Y PRÓRROGA (Art. 30.5): Evalúa ÚNICAMENTE el dies ad quem:
     * Si cae en día HÁBIL: El plazo FINALIZA EXACTAMENTE ese día a las 23:59:59 horas. PROHIBIDO aplicar prórrogas a días posteriores aunque sigan festivos.
     * Si cae en día INHÁBIL (sábado, domingo o festivo): Únicamente en este caso se prorroga al primer día hábil siguiente.
   - REGLA DE CALIDAD: La respuesta correcta debe coincidir matemáticamente con el dies ad quem final resultante y figurar entre las 4 opciones. La propiedad 'explicacion' de la opción correcta debe contener obligatoriamente el desglose de las 3 fases.
Genera exactamente ${targetCount} preguntas completas con 4 opciones (A, B, C, D) cada una.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            tipo: { type: Type.STRING },
            ambito: { type: Type.STRING },
            contextoCaso: { type: Type.STRING },
            leyesBOEAplicadas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            preguntas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  enunciado: { type: Type.STRING },
                  opciones: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        texto: { type: Type.STRING },
                        esCorrecta: { type: Type.BOOLEAN },
                        explicacion: { type: Type.STRING },
                      },
                      required: ['id', 'texto', 'esCorrecta', 'explicacion'],
                    },
                  },
                  justificacionLegal: {
                    type: Type.OBJECT,
                    properties: {
                      norma: { type: Type.STRING },
                      articulo: { type: Type.STRING },
                      codigoBOE: { type: Type.STRING },
                      urlBOE: { type: Type.STRING },
                      fundamento: { type: Type.STRING },
                    },
                    required: ['norma', 'articulo', 'fundamento'],
                  },
                },
                required: ['id', 'enunciado', 'opciones', 'justificacionLegal'],
              },
            },
          },
          required: ['titulo', 'tipo', 'ambito', 'leyesBOEAplicadas', 'preguntas'],
        },
      },
    });

    // Timeout de 22s en servidor para responder antes de cualquier límite de cliente
    const serverTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Límite de tiempo en respuesta de IA (22s). Activando banco normativo oficial garantizado.')), 22000)
    );

    const response = (await Promise.race([geminiCall, serverTimeout])) as any;

    const parsed = JSON.parse(response.text || '{}');
    let preguntasFinales = Array.isArray(parsed.preguntas) ? parsed.preguntas : [];

    // Ensure all questions have 4 options and valid URLs
    preguntasFinales.forEach((p: any, idx: number) => {
      p.id = idx + 1;
      if (!p.justificacionLegal) {
        p.justificacionLegal = {
          norma: 'Legislación consolidada del Estado',
          articulo: 'Precepto general',
          codigoBOE: 'BOE-A-2015-10565',
          urlBOE: 'https://www.boe.es',
          fundamento: 'Fundamentado en la normativa oficial consolidada publicada en www.boe.es.',
        };
      } else if (!p.justificacionLegal.urlBOE) {
        p.justificacionLegal.urlBOE = 'https://www.boe.es';
      }
    });

    // AUDITORÍA RIGUROSA DE PREGUNTAS INÉDITAS, NO REPETICIÓN Y EXCLUSIÓN TOTAL:
    // 1) Queda terminantemente prohibido repetir una misma pregunta en un mismo test.
    // 2) Queda terminantemente prohibido clonar una misma pregunta con diferentes respuestas (misma huella conceptual).
    // 3) Rotación obligatoria de preceptos: no repetir el mismo artículo legal concreto en el mismo test.
    // 4) Regla de exclusión: 0% de preguntas de leyes no marcadas en leyesStr.
    const bancoGarantizado = generarBancoPreguntasBOE(tipo, ambito, targetCount * 2, tematicasStr, leyesStr, preguntasExcluidas);
    let bancoGarantizadoIdx = 0;

    const enunciadosVistos = new Set<string>();
    const huellasVistas = new Set<string>();
    const articulosVistos = new Set<string>();
    const excluidasNorm = new Set(
      (preguntasExcluidas || []).map((p: string) => p.slice(0, 80).toLowerCase().trim())
    );

    // Detectar tags permitidos
    const tieneFiltroLeyes = leyesStr && leyesStr.trim().length > 0;
    const leyesNorm = (leyesStr || '').toLowerCase();
    const permite39 = leyesNorm.includes('39/2015') || leyesNorm.includes('lpac');
    const permite40 = leyesNorm.includes('40/2015') || leyesNorm.includes('lrjsp');
    const permiteTrebep = leyesNorm.includes('trebep') || leyesNorm.includes('5/2015');
    const permite364 = leyesNorm.includes('364/1995') || leyesNorm.includes('ingreso') || leyesNorm.includes('provision');
    const permite365 = leyesNorm.includes('365/1995') || leyesNorm.includes('situaciones');
    const permite3 = leyesNorm.includes('3/2018') || leyesNorm.includes('lopd');
    const permite9 = leyesNorm.includes('9/2017') || leyesNorm.includes('lcsp') || leyesNorm.includes('contrato');
    const permite47 = leyesNorm.includes('47/2003') || leyesNorm.includes('lgp') || leyesNorm.includes('presupuest');
    const permite50 = leyesNorm.includes('50/1997') || leyesNorm.includes('gobierno');
    const permite19 = leyesNorm.includes('19/2013') || leyesNorm.includes('transparencia');
    const permiteCE = leyesNorm.includes('constitucion') || leyesNorm.includes('1978');
    const permiteEstatutoCAM = leyesNorm.includes('3/1983') || leyesNorm.includes('estatuto') || leyesNorm.includes('autonomía de la comunidad de madrid');
    const permiteGobiernoCAM = leyesNorm.includes('1/1983') || (leyesNorm.includes('gobierno') && leyesNorm.includes('madrid'));
    const permiteAsambleaCAM = leyesNorm.includes('asamblea') || (leyesNorm.includes('reglamento') && leyesNorm.includes('madrid'));
    const permiteFPCAM = leyesNorm.includes('1/1986') || (leyesNorm.includes('función pública') && leyesNorm.includes('madrid'));
    const permiteHaciendaCAM = leyesNorm.includes('9/1990') || (leyesNorm.includes('hacienda') && leyesNorm.includes('madrid'));
    const permiteCualquierCAM = permiteEstatutoCAM || permiteGobiernoCAM || permiteAsambleaCAM || permiteFPCAM || permiteHaciendaCAM;

    const esPreguntaPermitidaPorLeyes = (p: any): boolean => {
      if (!tieneFiltroLeyes) return true;
      const txt = (
        (p.justificacionLegal?.norma || '') + ' ' +
        (p.justificacionLegal?.codigoBOE || '') + ' ' +
        (p.justificacionLegal?.articulo || '') + ' ' +
        (p.enunciado || '')
      ).toLowerCase();

      if (!permite39 && (txt.includes('39/2015') || txt.includes('lpac') || (txt.includes('procedimiento administrativo común') && !txt.includes('40/2015')))) return false;
      if (!permite40 && (txt.includes('40/2015') || txt.includes('lrjsp'))) return false;
      if (!permiteTrebep && (txt.includes('trebep') || (txt.includes('5/2015') && !txt.includes('39/2015') && !txt.includes('40/2015')))) return false;
      if (!permite364 && txt.includes('364/1995')) return false;
      if (!permite365 && txt.includes('365/1995')) return false;
      if (!permite3 && (txt.includes('3/2018') || txt.includes('lopdgdd'))) return false;
      if (!permite9 && (txt.includes('9/2017') || txt.includes('lcsp'))) return false;
      if (!permite47 && (txt.includes('47/2003') || txt.includes('general presupuestaria'))) return false;
      if (!permite19 && txt.includes('19/2013')) return false;
      if (!permiteCE && (txt.includes('constitución española') || txt.includes('constitucion española'))) return false;
      if (!permiteEstatutoCAM && (txt.includes('3/1983') || txt.includes('estatuto de autonomía de la comunidad de madrid'))) return false;
      if (!permiteGobiernoCAM && (txt.includes('1/1983') || (txt.includes('gobierno') && txt.includes('comunidad de madrid')))) return false;
      if (!permiteAsambleaCAM && (txt.includes('reglamento de la asamblea') || (txt.includes('asamblea de madrid') && !permiteCualquierCAM))) return false;
      if (!permiteFPCAM && (txt.includes('1/1986') || (txt.includes('función pública') && txt.includes('madrid')))) return false;
      if (!permiteHaciendaCAM && (txt.includes('9/1990') || (txt.includes('hacienda') && txt.includes('madrid')))) return false;

      return true;
    };

    const preguntasDepuradas: any[] = [];

    for (let i = 0; i < preguntasFinales.length; i++) {
      let p = preguntasFinales[i];
      const normEnun = (p.enunciado || '').slice(0, 80).toLowerCase().trim();
      const huella = calcularHuellaPregunta(p.enunciado || '');
      const artKey = `${p.justificacionLegal?.norma || ''}_${p.justificacionLegal?.articulo || ''}`.toLowerCase().trim();

      const esDuplicadaOProhibida =
        !esPreguntaPermitidaPorLeyes(p) ||
        enunciadosVistos.has(normEnun) ||
        excluidasNorm.has(normEnun) ||
        (huella && huellasVistas.has(huella)) ||
        articulosVistos.has(artKey);

      if (esDuplicadaOProhibida) {
        // Encontrar en el banco garantizado un reemplazo 100% inédito
        let reemplazo: any = null;
        while (bancoGarantizadoIdx < bancoGarantizado.preguntas.length) {
          const cand = bancoGarantizado.preguntas[bancoGarantizadoIdx++];
          const candNormEnun = (cand.enunciado || '').slice(0, 80).toLowerCase().trim();
          const candHuella = calcularHuellaPregunta(cand.enunciado || '');
          const candArtKey = `${cand.justificacionLegal?.norma || ''}_${cand.justificacionLegal?.articulo || ''}`.toLowerCase().trim();

          if (
            !enunciadosVistos.has(candNormEnun) &&
            !excluidasNorm.has(candNormEnun) &&
            (!candHuella || !huellasVistas.has(candHuella)) &&
            !articulosVistos.has(candArtKey)
          ) {
            reemplazo = cand;
            break;
          }
        }

        if (!reemplazo) {
          // Si se agotaron artículos únicos, buscar al menos con enunciado y huella única
          reemplazo = bancoGarantizado.preguntas.find(
            (c) => !enunciadosVistos.has((c.enunciado || '').slice(0, 80).toLowerCase().trim())
          ) || bancoGarantizado.preguntas[0];
        }

        p = {
          ...reemplazo,
          id: i + 1,
        };
      }

      const finalNormEnun = (p.enunciado || '').slice(0, 80).toLowerCase().trim();
      const finalHuella = calcularHuellaPregunta(p.enunciado || '');
      const finalArtKey = `${p.justificacionLegal?.norma || ''}_${p.justificacionLegal?.articulo || ''}`.toLowerCase().trim();

      enunciadosVistos.add(finalNormEnun);
      if (finalHuella) huellasVistas.add(finalHuella);
      articulosVistos.add(finalArtKey);

      preguntasDepuradas.push(p);
    }

    preguntasFinales = preguntasDepuradas;

    // Completar si faltaran preguntas
    if (preguntasFinales.length < targetCount) {
      const bancoAux = generarBancoPreguntasBOE(tipo, ambito, targetCount * 2, tematicasStr, leyesStr, preguntasExcluidas);
      for (const r of bancoAux.preguntas) {
        if (preguntasFinales.length >= targetCount) break;
        const rNorm = (r.enunciado || '').slice(0, 80).toLowerCase().trim();
        if (!enunciadosVistos.has(rNorm)) {
          enunciadosVistos.add(rNorm);
          preguntasFinales.push({
            ...r,
            id: preguntasFinales.length + 1,
          });
        }
      }
    } else if (preguntasFinales.length > targetCount) {
      preguntasFinales = preguntasFinales.slice(0, targetCount);
    }

    // Enriquecer con identificador canónico inédito y huella de verificación
    preguntasFinales.forEach((p: any, idx: number) => {
      p.id = idx + 1;
      p.codigoInedita = generarCodigoInedita(idx + 1, p.justificacionLegal?.norma || 'BOE', p.justificacionLegal?.articulo || 'Art');
      p.huellaAuditoria = calcularHuellaPregunta(p.enunciado || '');
    });

    // Aplicar balanceo riguroso de opciones: elimina sesgo de letra y sesgo de longitud
    preguntasFinales = balancearYDistribuirOpciones(preguntasFinales);

    // Filtrar leyes aplicadas al conjunto seleccionado
    const leyesAplicadasFinales = Array.isArray(parsed.leyesBOEAplicadas) && parsed.leyesBOEAplicadas.length > 0
      ? parsed.leyesBOEAplicadas
      : (leyesStr ? leyesStr.split(',').map((s: string) => s.trim()) : ['Legislación consolidada www.boe.es']);

    const tipoFinal = parsed.tipo || tipo;
    return res.json({
      source: 'gemini_boe',
      titulo: parsed.titulo || `Batería Oficial BOE (${ambito}) - ${targetCount} Preguntas`,
      tipo: tipoFinal,
      categoria: tipoFinal === 'supuesto' ? 'supuesto_ia' : 'test_ia',
      ambito: parsed.ambito || ambito,
      contextoCaso: parsed.contextoCaso,
      leyesBOEAplicadas: leyesAplicadasFinales,
      preguntas: preguntasFinales,
    });
  } catch (error: any) {
    console.error('Error generando con Gemini, activando banco normativo garantizado:', error.message || error);
    // Return guaranteed curated bank with exact requested count (10, 20, etc.)
    const fallback = generarBancoPreguntasBOE(tipo, ambito, targetCount, tematicasStr, leyesStr, preguntasExcluidas);
    (fallback as any).categoria = tipo === 'supuesto' ? 'supuesto_ia' : 'test_ia';
    return res.json(fallback);
  }
});

// POST /api/parse-pdf-exam: Parses official PDF exam with Gemini extracting answers from last-page answer key
app.post('/api/parse-pdf-exam', async (req, res) => {
  try {
    const { pdfBase64, fileName = 'Examen_Oficial.pdf', customApiKey, model = 'gemini-1.5-flash' } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No se ha proporcionado el archivo PDF en base64.' });
    }

    const effectiveApiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 5)
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!effectiveApiKey) {
      return res.status(500).json({
        error: 'No hay ninguna Gemini API Key configurada en el servidor ni provista por el usuario.',
      });
    }

    const aiClient = new GoogleGenAI({
      apiKey: effectiveApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '').trim();

    const pdfPart = {
      inlineData: {
        mimeType: 'application/pdf',
        data: cleanBase64,
      },
    };

    // Note: Gemini 1.5 models (gemini-1.5-flash / gemini-1.5-pro) are deprecated in the v1beta API and return 404.
    // We map legacy requests safely to gemini-3.8-flash, which supports full PDF multimodal extraction.
    const targetModel = 'gemini-3.8-flash';

    console.log(`[parse-pdf-exam] Recibido archivo ${fileName} (${(cleanBase64.length / 1024).toFixed(1)} KB base64). Usando modelo: ${targetModel}`);

    const promptText = `Analiza detalladamente este examen oficial de oposiciones en formato PDF.
Extrae rigurosamente todas las preguntas tipo test con sus opciones (A, B, C, D).

INSTRUCCIÓN CRÍTICA OBLIGATORIA:
Localiza en la última página del documento (o en la plantilla/tabla final de respuestas que figure al final del PDF) la plantilla oficial de soluciones.
Extrae la respuesta correcta definitiva para cada pregunta y asígnala al campo 'solucion' (debe ser un único carácter: "A", "B", "C" o "D").
Si el examen incluye preguntas de reserva (habitualmente señaladas al final como preguntas de reserva o con numeración adicional), marca 'es_reserva': true. Para todas las demás, marca 'es_reserva': false.
Indica el número correlativo de la pregunta, el enunciado íntegro y el texto de cada una de las 4 opciones A, B, C y D.
Identifica la norma jurídica del BOE (www.boe.es) a la que se refiere la pregunta y el artículo correspondiente en 'justificacionLegal'.`;

    let response;
    try {
      response = await aiClient.models.generateContent({
        model: targetModel,
        contents: [
          pdfPart,
          { text: promptText },
        ],
        config: {
          systemInstruction: `Eres un examinador oficial experto en digitalización y corrección de pruebas de oposición (Administrativos C1 de la AGE y Comunidad de Madrid).
Tu tarea es digitalizar con absoluta fidelidad el examen contenido en el PDF adjunto.
Extrae la solución de la plantilla de respuestas de la última página.
Cada pregunta debe tener obligatoriamente:
- 'numero': entero
- 'enunciado': texto de la pregunta
- 'opciones': objeto con las 4 propiedades A, B, C y D
- 'solucion': string de 1 solo carácter ('A', 'B', 'C' o 'D') extraída de la plantilla de soluciones de la última página
- 'es_reserva': booleano (true si es pregunta de reserva, false si es ordinaria)
- 'justificacionLegal': norma jurídica del BOE (www.boe.es), artículo y fundamentación.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            ambito: { type: Type.STRING },
            tipo: { type: Type.STRING },
            contextoCaso: { type: Type.STRING },
            preguntas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  numero: { type: Type.INTEGER },
                  enunciado: { type: Type.STRING },
                  opciones: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                    },
                    required: ['A', 'B', 'C', 'D'],
                  },
                  solucion: { type: Type.STRING },
                  es_reserva: { type: Type.BOOLEAN },
                  justificacionLegal: {
                    type: Type.OBJECT,
                    properties: {
                      norma: { type: Type.STRING },
                      articulo: { type: Type.STRING },
                      urlBOE: { type: Type.STRING },
                      fundamento: { type: Type.STRING },
                    },
                  },
                },
                required: ['numero', 'enunciado', 'opciones', 'solucion', 'es_reserva'],
              },
            },
          },
          required: ['titulo', 'preguntas'],
        },
      },
    });
    } catch (genError: any) {
      console.error('[parse-pdf-exam] Error en llamada con clave inicial:', genError.message);
      if (customApiKey && process.env.GEMINI_API_KEY && customApiKey !== process.env.GEMINI_API_KEY) {
        console.log('[parse-pdf-exam] Reintentando llamada con GEMINI_API_KEY del servidor...');
        const fallbackClient = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        response = await fallbackClient.models.generateContent({
          model: targetModel,
          contents: [pdfPart, { text: promptText }],
          config: {
            systemInstruction: `Eres un examinador oficial experto en digitalización y corrección de pruebas de oposición (Administrativos C1 de la AGE y Comunidad de Madrid).
Tu tarea es digitalizar con absoluta fidelidad el examen contenido en el PDF adjunto.
Extrae la solución de la plantilla de respuestas de la última página.
Cada pregunta debe tener obligatoriamente:
- 'numero': entero
- 'enunciado': texto de la pregunta
- 'opciones': objeto con las 4 propiedades A, B, C y D
- 'solucion': string de 1 solo carácter ('A', 'B', 'C' o 'D') extraída de la plantilla de soluciones de la última página
- 'es_reserva': booleano (true si es pregunta de reserva, false si es ordinaria)
- 'justificacionLegal': norma jurídica del BOE (www.boe.es), artículo y fundamentación.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titulo: { type: Type.STRING },
                ambito: { type: Type.STRING },
                tipo: { type: Type.STRING },
                contextoCaso: { type: Type.STRING },
                preguntas: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      numero: { type: Type.INTEGER },
                      enunciado: { type: Type.STRING },
                      opciones: {
                        type: Type.OBJECT,
                        properties: {
                          A: { type: Type.STRING },
                          B: { type: Type.STRING },
                          C: { type: Type.STRING },
                          D: { type: Type.STRING },
                        },
                        required: ['A', 'B', 'C', 'D'],
                      },
                      solucion: { type: Type.STRING },
                      es_reserva: { type: Type.BOOLEAN },
                      justificacionLegal: {
                        type: Type.OBJECT,
                        properties: {
                          norma: { type: Type.STRING },
                          articulo: { type: Type.STRING },
                          urlBOE: { type: Type.STRING },
                          fundamento: { type: Type.STRING },
                        },
                      },
                    },
                    required: ['numero', 'enunciado', 'opciones', 'solucion', 'es_reserva'],
                  },
                },
              },
              required: ['titulo', 'preguntas'],
            },
          },
        });
      } else {
        throw genError;
      }
    }

    const parsed = JSON.parse(response.text || '{}');

    if (!parsed.preguntas || !Array.isArray(parsed.preguntas) || parsed.preguntas.length === 0) {
      return res.status(500).json({ error: 'No se pudieron extraer preguntas válidas del documento PDF proporcionado.' });
    }

    // Convert into application standard ExamenCompleto format
    const tipoFinal = parsed.tipo === 'supuesto' || parsed.contextoCaso ? 'supuesto' : 'unitario';
    const examenConvertido = {
      id: `PDF-${Date.now()}`,
      titulo: parsed.titulo || fileName.replace(/\.pdf$/i, ''),
      tipo: tipoFinal,
      categoria: tipoFinal === 'supuesto' ? 'supuesto_oficial' : 'test_oficial',
      ambito: parsed.ambito === 'CAM' ? 'CAM' : parsed.ambito === 'AMBOS' ? 'AMBOS' : 'AGE',
      origen: 'oficial_json',
      fecha: new Date().toISOString().split('T')[0],
      contextoCaso: parsed.contextoCaso,
      tematicas: ['procedimiento_administrativo'],
      leyesBOEAplicadas: ['Legislación oficial publicada en www.boe.es'],
      preguntas: parsed.preguntas.map((p: any, idx: number) => {
        const solMatch = (p.solucion || '').toUpperCase().match(/[A-D]/);
        const solLetra = solMatch ? solMatch[0] : 'A';
        return {
          id: p.numero || idx + 1,
          enunciado: p.enunciado,
          esReserva: !!p.es_reserva,
          opciones: [
            {
              id: 'A',
              texto: p.opciones?.A || 'Opción A',
              esCorrecta: solLetra === 'A',
              explicacion: solLetra === 'A' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
            },
            {
              id: 'B',
              texto: p.opciones?.B || 'Opción B',
              esCorrecta: solLetra === 'B',
              explicacion: solLetra === 'B' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
            },
            {
              id: 'C',
              texto: p.opciones?.C || 'Opción C',
              esCorrecta: solLetra === 'C',
              explicacion: solLetra === 'C' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
            },
            {
              id: 'D',
              texto: p.opciones?.D || 'Opción D',
              esCorrecta: solLetra === 'D',
              explicacion: solLetra === 'D' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
            },
          ],
          justificacionLegal: {
            norma: p.justificacionLegal?.norma || 'Normativa oficial publicada en el BOE',
            articulo: p.justificacionLegal?.articulo || 'Plantilla Oficial de Respuestas',
            codigoBOE: 'BOE-A',
            urlBOE: p.justificacionLegal?.urlBOE || 'https://www.boe.es',
            fundamento: p.justificacionLegal?.fundamento || `Solución oficial ${solLetra} extraída de la plantilla de respuestas del examen.`,
          },
        };
      }),
    };

    return res.json({
      success: true,
      examen: examenConvertido,
    });
  } catch (error: any) {
    console.error('Error procesando PDF con Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Error procesando el archivo PDF con la API de Gemini.',
    });
  }
});

// POST /api/parse-text-exam: Digitaliza texto de examen pegado directamente
app.post('/api/parse-text-exam', async (req, res) => {
  try {
    const { examText, title = 'Examen Importado', customApiKey } = req.body;

    if (!examText || examText.trim().length < 20) {
      return res.status(400).json({ error: 'El texto del examen es demasiado corto o está vacío.' });
    }

    const effectiveApiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 5)
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!effectiveApiKey) {
      return res.status(500).json({
        error: 'No hay ninguna Gemini API Key configurada en el servidor ni provista por el usuario.',
      });
    }

    const aiClient = new GoogleGenAI({
      apiKey: effectiveApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `Analiza este texto de examen oficial de oposiciones.
REGLA CLAVE - DISTINCIÓN DE FORMATO:
1. Si el texto corresponde a un SUPUESTO PRÁCTICO (tiene un relato fáctico o texto largo al principio describiendo los hechos del caso y posteriormente el cuestionario con las preguntas):
   - Establece 'tipo': 'supuesto'.
   - Extrae ÍNTEGRAMENTE todo el relato fáctico o texto del caso práctico en la propiedad 'contextoCaso'.
2. Si el texto corresponde a un TEST NORMAL (las preguntas empiezan de forma directa o solo tiene un título/instrucciones breves sin relato fáctico):
   - Establece 'tipo': 'unitario'.
   - No incluyas 'contextoCaso' (o déjalo null/vacío).

PREGUNTAS DE RESERVA Y ANULADAS:
- En las oposiciones de la AGE y Administración Pública, los exámenes incluyen 5 preguntas de reserva (habitualmente al final o bajo el epígrafe 'Preguntas de reserva'). Identifica y marca cada una con 'es_reserva': true.
- Si en el texto o en la plantilla de soluciones una pregunta figura como 'ANULADA', 'CANCELADA' o 'SIN EFECTO', márcala con 'es_anulada': true y pon 'solucion': 'ANULADA'.
- Extrae todas las preguntas tipo test con sus opciones (A, B, C, D) y la solución oficial.

Texto del examen:
"""
${examText}
"""`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: `Eres un examinador oficial experto en digitalización de pruebas de oposición (Administrativos C1 de la AGE y Comunidad de Madrid).
Distingue si se trata de un supuesto práctico (con relato fáctico largo inicial en 'contextoCaso') o un test normal ('tipo': 'unitario').
Digitaliza el examen extrayendo las preguntas tipo test con numero, enunciado, opciones A, B, C, D, solucion ('A', 'B', 'C' o 'D' o 'ANULADA'), es_reserva y es_anulada.
Asigna justificacionLegal fundamentada en la normativa oficial del BOE (www.boe.es).`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            ambito: { type: Type.STRING },
            tipo: { type: Type.STRING },
            contextoCaso: { type: Type.STRING },
            preguntas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  numero: { type: Type.INTEGER },
                  enunciado: { type: Type.STRING },
                  opciones: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                    },
                    required: ['A', 'B', 'C', 'D'],
                  },
                  solucion: { type: Type.STRING },
                  es_reserva: { type: Type.BOOLEAN },
                  es_anulada: { type: Type.BOOLEAN },
                  justificacionLegal: {
                    type: Type.OBJECT,
                    properties: {
                      norma: { type: Type.STRING },
                      articulo: { type: Type.STRING },
                      urlBOE: { type: Type.STRING },
                      fundamento: { type: Type.STRING },
                    },
                  },
                },
                required: ['numero', 'enunciado', 'opciones', 'solucion'],
              },
            },
          },
          required: ['titulo', 'preguntas'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    if (!parsed.preguntas || !Array.isArray(parsed.preguntas) || parsed.preguntas.length === 0) {
      return res.status(500).json({ error: 'No se pudieron extraer preguntas del texto proporcionado.' });
    }

    const lineasExamen = examText.split('\n');
    const plantillaDirecta = extraerPlantillaDeRespuestasCompleta(lineasExamen);

    const rawPreguntas = parsed.preguntas.map((p: any, idx: number) => {
      const qNum = p.numero || idx + 1;
      const esReserva = !!p.es_reserva;
      const solDirecta = esReserva
        ? plantillaDirecta.solucionesReserva.get(qNum)
        : plantillaDirecta.solucionesOrdinarias.get(qNum);
      const geminiMatch = (p.solucion || '').toUpperCase().match(/[A-D]/);
      const solLetra = solDirecta || (geminiMatch ? geminiMatch[0] : (p.correcta ? String(p.correcta).toUpperCase() : 'A'));
      const esAnulada = !!(
        p.es_anulada ||
        (p.solucion && p.solucion.toUpperCase().includes('ANUL')) ||
        (esReserva ? plantillaDirecta.anuladasReserva.has(qNum) : plantillaDirecta.anuladasOrdinarias.has(qNum))
      );
      return {
        id: qNum,
        enunciado: p.enunciado,
        esReserva,
        esAnulada,
        opciones: [
          {
            id: 'A',
            texto: p.opciones?.A || 'Opción A',
            esCorrecta: solLetra === 'A',
            explicacion: solLetra === 'A' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
          },
          {
            id: 'B',
            texto: p.opciones?.B || 'Opción B',
            esCorrecta: solLetra === 'B',
            explicacion: solLetra === 'B' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
          },
          {
            id: 'C',
            texto: p.opciones?.C || 'Opción C',
            esCorrecta: solLetra === 'C',
            explicacion: solLetra === 'C' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
          },
          {
            id: 'D',
            texto: p.opciones?.D || 'Opción D',
            esCorrecta: solLetra === 'D',
            explicacion: solLetra === 'D' ? 'Respuesta oficial según plantilla del examen' : 'Opción descartada según plantilla oficial',
          },
        ],
        justificacionLegal: {
          norma: p.justificacionLegal?.norma || 'Normativa oficial publicada en el BOE',
          articulo: p.justificacionLegal?.articulo || 'Plantilla Oficial de Respuestas',
          codigoBOE: 'BOE-A',
          urlBOE: p.justificacionLegal?.urlBOE || 'https://www.boe.es',
          fundamento: p.justificacionLegal?.fundamento || (esAnulada ? 'Pregunta declarada ANULADA por la Comisión Permanente de Selección.' : `Solución oficial ${solLetra} extraída de la plantilla de respuestas del examen.`),
        },
      };
    });

    // Asegurar 5 preguntas de reserva si hay suficientes preguntas y no se marcaron
    const reservasDetectadas = rawPreguntas.filter((p: any) => p.esReserva).length;
    if (reservasDetectadas === 0 && rawPreguntas.length >= 6) {
      const idxInicioRes = Math.max(0, rawPreguntas.length - 5);
      let rNum = 1;
      for (let k = idxInicioRes; k < rawPreguntas.length; k++) {
        rawPreguntas[k].esReserva = true;
        rawPreguntas[k].numeroReserva = rNum++;
      }
    } else {
      let rNum = 1;
      rawPreguntas.forEach((p: any) => {
        if (p.esReserva) {
          if (!p.numeroReserva) {
            p.numeroReserva = rNum;
          }
          rNum++;
        }
      });
    }

    // Resolver sustitución ordenada de anuladas por reservas
    const ordinarias = rawPreguntas.filter((p: any) => !p.esReserva);
    const reservas = rawPreguntas.filter((p: any) => p.esReserva);
    const anuladas = ordinarias.filter((p: any) => p.esAnulada);
    const reservasDisponibles = reservas.filter((p: any) => !p.esAnulada);

    ordinarias.forEach((p: any) => {
      p.activaEnEvaluacion = !p.esAnulada;
      p.sustituidaPorReservaId = undefined;
    });

    reservas.forEach((p: any) => {
      p.activaEnEvaluacion = false;
      p.sustituyeAPreguntaId = undefined;
    });

    anuladas.forEach((an: any, idx: number) => {
      if (idx < reservasDisponibles.length) {
        const resQ = reservasDisponibles[idx];
        an.sustituidaPorReservaId = resQ.id;
        an.activaEnEvaluacion = false;

        resQ.sustituyeAPreguntaId = an.id;
        resQ.activaEnEvaluacion = true;
      }
    });

    const tipoFinal = parsed.tipo === 'supuesto' || Boolean(parsed.contextoCaso && parsed.contextoCaso.trim().length > 30) ? 'supuesto' : 'unitario';
    const examenConvertido = {
      id: `TXT-${Date.now()}`,
      titulo: parsed.titulo || title,
      tipo: tipoFinal,
      categoria: tipoFinal === 'supuesto' ? 'supuesto_oficial' : 'test_oficial',
      ambito: parsed.ambito === 'CAM' ? 'CAM' : parsed.ambito === 'AMBOS' ? 'AMBOS' : 'AGE',
      origen: 'oficial_json',
      fecha: new Date().toISOString().split('T')[0],
      contextoCaso: parsed.contextoCaso?.trim() || undefined,
      tematicas: ['procedimiento_administrativo'],
      leyesBOEAplicadas: ['Legislación oficial publicada en www.boe.es'],
      preguntas: rawPreguntas,
    };

    return res.json({
      success: true,
      examen: examenConvertido,
    });
  } catch (error: any) {
    console.error('Error procesando texto con Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Error procesando el texto del examen con la API de Gemini.',
    });
  }
});

// POST /api/generate-from-case: Generates exactly 20 official questions (15 ordinary + 5 reserve) deeply anchored in the imported case text
app.post('/api/generate-from-case', async (req, res) => {
  const { caseText, titulo = 'Supuesto Práctico Propuesto', ambito = 'CAM', leyes = [], customApiKey } = req.body;

  if (!caseText || typeof caseText !== 'string' || caseText.trim().length < 30) {
    return res.status(400).json({
      error: 'El texto del supuesto práctico es demasiado breve o está vacío (mínimo 30 caracteres).',
    });
  }

  // Análisis profundo y exhaustivo de los hechos, fechas, órganos, importes y procedimientos del texto
  const hechos = analizarFondoDelCaso(caseText);
  const resumenHechos = [
    `- Órganos y dependencias en el texto: ${hechos.organos.length > 0 ? hechos.organos.join(', ') : 'los señalados en el relato fáctico'}`,
    `- Fechas e hitos temporales identificados: ${hechos.fechas.length > 0 ? hechos.fechas.join(', ') : 'las descritas en el supuesto'}`,
    `- Plazos de alegaciones, recurso o trámite: ${hechos.plazos.length > 0 ? hechos.plazos.join(', ') : 'los plazos conferidos en el relato'}`,
    `- Importes y cuantías económicas: ${hechos.importes.length > 0 ? hechos.importes.join(', ') : 'las indicadas en el expediente'}`,
    `- Procedimientos y actos administrativos: ${hechos.procedimientos.length > 0 ? hechos.procedimientos.join(', ') : 'los tramitados en el caso'}`,
    `- Sujetos e interesados: ${hechos.personasSujetos.length > 0 ? hechos.personasSujetos.join(', ') : 'los intervinientes descritos'}`,
  ].join('\n');

  const leyesContexto = Array.isArray(leyes) && leyes.length > 0
    ? leyes.join(', ')
    : (ambito === 'CAM'
        ? 'Estatuto de Autonomía de la CAM (LO 3/1983), Ley 1/1983 de Gobierno y Administración de la CAM, Reglamento de la Asamblea de Madrid, Ley 1/1986 de la Función Pública de la CAM, Ley 39/2015 LPACAP, Ley 40/2015 LRJSP'
        : 'Ley 39/2015 LPACAP, Ley 40/2015 LRJSP, TREBEP RDL 5/2015, LCSP Ley 9/2017');

  const effectiveApiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 5)
    ? customApiKey.trim()
    : process.env.GEMINI_API_KEY;

  if (effectiveApiKey) {
    try {
      const aiClient = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `Eres el Presidente del Tribunal Calificador de las oposiciones de Administrativos (${ambito === 'CAM' ? 'Comunidad de Madrid - Subgrupo C1' : 'Administración General del Estado - Subgrupo C1'}).

A continuación se te proporciona el TEXTO ÍNTEGRO DE UN SUPUESTO PRÁCTICO suministrado por el opositor.

ANÁLISIS PREVIO DE LOS HECHOS Y ELEMENTOS FÁCTICOS EXTRAÍDOS DEL TEXTO:
${resumenHechos}

DIRECTIVAS JURÍDICAS OBLIGATORIAS (PROHIBIDO PREGUNTAS AL AZAR O GENÉRICAS):
1. VINCULACIÓN FÁCTICA EXCLUSIVA: CADA UNA de las 20 preguntas (1 a 15 ordinarias, 16 a 20 de reserva) DEBE plantearse directamente sobre los hechos, actos, fechas, importes, personas y órganos descritos en el texto del supuesto práctico aportado.
2. PREMISA FÁCTICA EXPLÍCITA EN CADA ENUNCIADO: Todo enunciado debe comenzar citando la circunstancia o acto del supuesto (ej.: "A la vista de la notificación practicada el...", "En relación con el contrato menor tramitado por...", "Ante la abstención comunicada por...", "Respecto al plazo concedido el..."). Queda TERMINANTEMENTE PROHIBIDO formular preguntas teóricas generales desvinculadas de este caso práctico.
3. PROTOCOLO OBLIGATORIO DE CÓMPUTO DE PLAZOS (Art. 30 Ley 39/2015):
   Para preguntas relativas a plazos de notificación, alegaciones, subsanación o recurso:
   - DIES A QUO (Art. 30.3): El cómputo en días se inicia al día hábil siguiente a la notificación (Fecha N + 1).
   - DESGLOSE DÍA A DÍA HÁBIL (Art. 30.2): Excluye individualmente sábados, domingos y festivos declarados. El día en que se alcanza el cómputo exacto es el 'dies ad quem'.
   - REGLA DE CIERRE (Art. 30.5): Si el dies ad quem cae en día hábil, el plazo FINALIZA EXACTAMENTE ese día a las 23:59:59 horas. PROHIBIDO aplicar prórrogas a días posteriores. Si cae en día inhábil, se prorroga al primer día hábil siguiente.
   - La opción declarada correcta debe coincidir exactamente con el dies ad quem validado y su explicación debe contener el desglose de las 3 fases.
4. ESTRUCTURA EXACTA DE 20 PREGUNTAS:
   - Preguntas 1 a 15: PREGUNTAS ORDINARIAS ('es_reserva': false).
   - Preguntas 16 a 20: PREGUNTAS DE RESERVA ('es_reserva': true, correspondientes a Reserva 1, Reserva 2, Reserva 3, Reserva 4 y Reserva 5).
5. HOMOGENEIDAD Y EQUILIBRIO:
   - 4 alternativas de respuesta (A, B, C, D) rigurosas, homogéneas en longitud y verosimilitud técnica.
   - Distribución equitativa de soluciones correctas (aprox. 25% para A, B, C, D).
   - Al menos 4-5 preguntas formuladas en sentido negativo ("Señale la opción INCORRECTA:", "NO es conforme a derecho:").
   - Justificación legal detallada con referencia a la norma consolidada en www.boe.es o BOCM (${leyesContexto}).

TEXTO COMPLETO DEL SUPUESTO PRÁCTICO APORTADO:
"""
${caseText.trim()}
"""`;

      // Intentos con modelo primario y secundario con reintento ante saturación transitoria (503)
      let parsedResponse: any = null;
      const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash'];

      for (const modelName of modelsToTry) {
        try {
          console.log(`[generate-from-case] Formulando 20 preguntas alineadas al texto con modelo: ${modelName}`);
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              maxOutputTokens: 16000,
              systemInstruction: `Eres el Tribunal Calificador oficial de oposiciones C1 (${ambito}). Tu tarea es formular exactamente 20 preguntas (15 ordinarias + 5 reservas) profundamente ancladas en los hechos, actos, fechas, importes y órganos del supuesto fáctico aportado. Prohibido formular preguntas al azar o genéricas sin base en el caso. Cada pregunta debe contener: numero (1 a 20), enunciado vinculado al caso, opciones {A, B, C, D}, solucion ('A','B','C','D'), es_reserva (true para 16-20) y justificacionLegal rigurosa del BOE/BOCM.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  ambito: { type: Type.STRING },
                  leyesBOEAplicadas: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  preguntas: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        numero: { type: Type.INTEGER },
                        enunciado: { type: Type.STRING },
                        opciones: {
                          type: Type.OBJECT,
                          properties: {
                            A: { type: Type.STRING },
                            B: { type: Type.STRING },
                            C: { type: Type.STRING },
                            D: { type: Type.STRING },
                          },
                          required: ['A', 'B', 'C', 'D'],
                        },
                        solucion: { type: Type.STRING },
                        es_reserva: { type: Type.BOOLEAN },
                        justificacionLegal: {
                          type: Type.OBJECT,
                          properties: {
                            norma: { type: Type.STRING },
                            articulo: { type: Type.STRING },
                            urlBOE: { type: Type.STRING },
                            fundamento: { type: Type.STRING },
                          },
                        },
                      },
                      required: ['numero', 'enunciado', 'opciones', 'solucion'],
                    },
                  },
                },
                required: ['titulo', 'preguntas'],
              },
            },
          });

          if (response.text && response.text.trim().length > 100) {
            parsedResponse = JSON.parse(response.text);
            if (Array.isArray(parsedResponse.preguntas) && parsedResponse.preguntas.length >= 15) {
              break;
            }
          }
        } catch (mErr: any) {
          console.warn(`[generate-from-case] Aviso con ${modelName}:`, mErr.message || mErr);
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      if (parsedResponse && Array.isArray(parsedResponse.preguntas) && parsedResponse.preguntas.length > 0) {
        const rawPreguntas = parsedResponse.preguntas.slice(0, 20).map((p: any, idx: number) => {
          const num = idx + 1;
          const esReserva = num > 15 || !!p.es_reserva;
          const numeroReserva = esReserva ? (num > 15 ? num - 15 : idx + 1) : undefined;
          const solLetra = (p.solucion || 'A').toUpperCase().trim();

          return {
            id: num,
            enunciado: p.enunciado,
            esReserva,
            numeroReserva,
            activaEnEvaluacion: !esReserva,
            opciones: [
              {
                id: 'A',
                texto: p.opciones?.A || 'Opción A',
                esCorrecta: solLetra === 'A',
                explicacion: solLetra === 'A' ? 'Respuesta fundamentada según la normativa del supuesto' : 'Opción no conforme al supuesto de hecho',
              },
              {
                id: 'B',
                texto: p.opciones?.B || 'Opción B',
                esCorrecta: solLetra === 'B',
                explicacion: solLetra === 'B' ? 'Respuesta fundamentada según la normativa del supuesto' : 'Opción no conforme al supuesto de hecho',
              },
              {
                id: 'C',
                texto: p.opciones?.C || 'Opción C',
                esCorrecta: solLetra === 'C',
                explicacion: solLetra === 'C' ? 'Respuesta fundamentada según la normativa del supuesto' : 'Opción no conforme al supuesto de hecho',
              },
              {
                id: 'D',
                texto: p.opciones?.D || 'Opción D',
                esCorrecta: solLetra === 'D',
                explicacion: solLetra === 'D' ? 'Respuesta fundamentada según la normativa del supuesto' : 'Opción no conforme al supuesto de hecho',
              },
            ],
            justificacionLegal: {
              norma: p.justificacionLegal?.norma || (ambito === 'CAM' ? 'Ley de Gobierno y Administración de la CAM / LPACAP' : 'Ley 39/2015 del Procedimiento Administrativo Común'),
              articulo: p.justificacionLegal?.articulo || 'Articulado aplicable',
              codigoBOE: ambito === 'CAM' ? 'BOE-A-1983-34139' : 'BOE-A-2015-10565',
              urlBOE: p.justificacionLegal?.urlBOE || 'https://www.boe.es',
              fundamento: p.justificacionLegal?.fundamento || `Fundamentación jurídica aplicable a la solución ${solLetra}.`,
            },
          };
        });

        // Completar a 20 con preguntas ancladas si el modelo devolvió entre 15 y 19
        if (rawPreguntas.length < 20) {
          const complementarias = generar20PreguntasAlineadasAlCaso(caseText, ambito, leyes, titulo).preguntas;
          for (const comp of complementarias) {
            if (rawPreguntas.length >= 20) break;
            const num = rawPreguntas.length + 1;
            const esReserva = num > 15;
            rawPreguntas.push({
              ...comp,
              id: num,
              esReserva,
              numeroReserva: esReserva ? num - 15 : undefined,
              activaEnEvaluacion: !esReserva,
            });
          }
        }

        const preguntasBalanceadas = balancearYDistribuirOpciones(rawPreguntas);

        const examenCompleto = {
          id: `SUP-CASE-${Date.now()}`,
          titulo: titulo || parsedResponse.titulo || `Supuesto Práctico Personalizado (${ambito}) - 20 Preguntas`,
          tipo: 'supuesto',
          categoria: 'supuesto_ia',
          ambito,
          origen: 'oficial_json',
          fecha: new Date().toISOString().split('T')[0],
          contextoCaso: caseText.trim(),
          tematicas: ['procedimiento_administrativo', 'presupuestos_hacienda', 'funcion_publica_personal'],
          leyesBOEAplicadas: parsedResponse.leyesBOEAplicadas || (Array.isArray(leyes) && leyes.length > 0 ? leyes : ['Legislación consolidada del BOE y BOCM']),
          preguntas: preguntasBalanceadas,
        };

        return res.json({
          success: true,
          examen: examenCompleto,
        });
      }
    } catch (apiError: any) {
      console.warn('[generate-from-case] API Gemini no disponible o sobrecargada. Activando motor fáctico alineado:', apiError.message || apiError);
    }
  }

  // Motor determinista 100% alineado: NUNCA genera preguntas al azar ni genéricas
  console.log('[generate-from-case] Generando 20 preguntas con el analizador fáctico específico del supuesto.');
  const examenAlineado = generar20PreguntasAlineadasAlCaso(caseText, ambito, leyes, titulo);
  (examenAlineado as any).categoria = 'supuesto_ia';
  return res.json({
    success: true,
    examen: examenAlineado,
  });
});

// Endpoint para abrir un documento local con su programa asociado del sistema operativo (cuando el servidor corre en la máquina local)
app.post('/api/open-local-file', (req, res) => {
  try {
    const rawPath = String(req.body?.filePath || '').trim();
    if (!rawPath) {
      return res.status(400).json({ openedOnHost: false, error: 'Ruta vacía' });
    }

    // Convertir file:///C:/... a ruta nativa si procede
    let cleanPath = rawPath;
    if (/^file:\/\//i.test(cleanPath)) {
      try {
        cleanPath = fileURLToPath(cleanPath);
      } catch (_) {
        cleanPath = decodeURIComponent(cleanPath.replace(/^file:\/\/\/?/i, ''));
      }
    }

    if (!fs.existsSync(cleanPath)) {
      return res.json({
        openedOnHost: false,
        reason: 'not_found_on_server_host',
      });
    }

    const platform = process.platform;
    if (platform === 'win32') {
      const child = spawn('cmd', ['/c', 'start', '', cleanPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
    } else if (platform === 'darwin') {
      const child = spawn('open', [cleanPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      const child = spawn('xdg-open', [cleanPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    }

    return res.json({
      openedOnHost: true,
      path: cleanPath,
    });
  } catch (err: any) {
    return res.json({
      openedOnHost: false,
      error: err?.message || 'No se pudo invocar el programa asociado en el host',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    boeGrounding: 'exclusive_www_boe_es',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit fallback for SPA routes in Vite middleware mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Test y Supuestos BOE en marcha en http://0.0.0.0:${PORT}`);
  });
}

startServer();
