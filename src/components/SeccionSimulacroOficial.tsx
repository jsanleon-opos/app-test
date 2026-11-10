import React, { useState, useEffect, useMemo } from 'react';
import {
  CategoriaExamen,
  ConvocatoriaAmbito,
  ExamenCompleto,
  ItemAlmacenDuda,
  PreguntaExamen,
} from '../types';
import { EXAMENES_PRECARGADOS_OFICIALES } from '../constants/boeData';
import { generarBancoPreguntasBOE } from '../constants/boeQuestionsBank';
import {
  PREGUNTAS_OFICIALES_INFORMATICA_10_TEMAS,
  generarPreguntasAdicionalesMateria,
} from '../constants/temarioLegislacionEInformatica';
import {
  AMBITOS_INFO,
  AMBITOS_LISTA,
  CATEGORIAS_EXAMEN_INFO,
  deducirCategoriaExamen,
} from '../utils/jsonExamHelper';
import {
  LISTA_10_TEMAS_INFORMATICA_NORMALIZADOS,
  SET_10_TEMAS_INFORMATICA_OFICIALES,
  clasificarPreguntaEnCategoriaTemario,
  deducirNormaOTemaDesdeTexto,
  extraerNombreConvocatoriaDesdeExamen,
  formatearBadgeConvocatoriaOficial,
  normalizarClavePregunta,
  normalizarNombreLey,
  obtenerLeyesNormalizadasDeExamen,
  obtenerNormaEfectivaDePregunta,
  obtenerReferenciaConvocatoriaOficial,
  registrarRespuestasEnControlFalladas,
} from '../utils/tematicaClassifier';
import { obtenerUrlBOEParaNorma, renderizarTextoConEnlacesBOE } from '../utils/boeUrlHelper';
import { SelectorLeyesEInformaticaModal } from './SelectorLeyesEInformaticaModal';
import { ConfirmarEvaluacionModal } from './ConfirmarEvaluacionModal';
import { GestorRecursosArgumentacionPregunta } from './GestorRecursosArgumentacionPregunta';

interface SeccionSimulacroOficialProps {
  bancoExamenes: ExamenCompleto[];
  historialPruebas: ExamenCompleto[];
  almacenDudas: ItemAlmacenDuda[];
  onExamenGuardado: (examen: ExamenCompleto) => void;
  onGuardarEnAlmacenDudas?: (item: ItemAlmacenDuda) => void;
  onIrAHistorial: () => void;
  onActualizarPreguntaGlobal?: (preguntaActualizada: PreguntaExamen) => void;
  onRegistrarResultadoPreguntas?: (
    preguntas: PreguntaExamen[],
    respuestas: Record<number, string>
  ) => void;
  onCambiarAmbitoExamen?: (examenId: string, nuevoAmbito: ConvocatoriaAmbito) => void;
  onCambiarCategoriaExamen?: (examenId: string, nuevaCategoria: CategoriaExamen) => void;
  onExportarExamenPDF?: (examen: ExamenCompleto) => void;
}

interface GrupoLeyOTemaDisponible {
  nombre: string;
  esInformatica: boolean;
  preguntas: PreguntaExamen[];
}

interface TestOficialCandidato {
  id: string;
  titulo: string;
  categoria: CategoriaExamen;
  ambito: ConvocatoriaAmbito;
  fecha: string;
  leyes: string[];
  preguntasOrdinarias: PreguntaExamen[]; // 70 para AGE/AMBOS, 40 para CAM
  preguntasReserva: PreguntaExamen[]; // hasta 5 si están disponibles
  totalOrdinariasOriginal: number;
  totalReservasDisponibles: number;
}

interface SupuestoDisponible {
  id: string;
  titulo: string;
  categoria: CategoriaExamen;
  ambito: ConvocatoriaAmbito;
  contextoCaso: string;
  leyes: string[];
  preguntasOrdinarias20: PreguntaExamen[]; // 20 preguntas ordinarias
  preguntasReserva: PreguntaExamen[]; // hasta 5 preguntas de reserva si las tiene disponibles
  totalOrdinariasOriginal: number;
  totalReservasDisponibles: number;
  esFormato20AGE: boolean;
}

interface PreguntaSimulacroExtendida extends PreguntaExamen {
  bloqueSimulacro: 'parte1_ordinaria' | 'parte1_reserva' | 'parte2_ordinaria' | 'parte2_reserva';
  numeroEnBloque: number;
}

type ModoSeleccionParte1 = 'test_oficial' | 'personalizado_por_ley';
type FiltroCategoriaTest = 'todas' | 'test_oficial' | 'test_academia' | 'test_ia';
type FiltroCategoriaSupuesto = 'todas' | 'supuesto_oficial' | 'supuesto_academia' | 'supuesto_ia';

const CATEGORIAS_TEST_FILTRO: { id: FiltroCategoriaTest; label: string; icon: string }[] = [
  { id: 'todas', label: 'Todas las categorías', icon: 'fa-layer-group' },
  { id: 'test_oficial', label: 'Test oficial', icon: 'fa-landmark-flag' },
  { id: 'test_academia', label: 'Test de academia', icon: 'fa-graduation-cap' },
  { id: 'test_ia', label: 'Test aleatorio (IA)', icon: 'fa-wand-magic-sparkles' },
];

const CATEGORIAS_SUPUESTO_FILTRO: { id: FiltroCategoriaSupuesto; label: string; icon: string }[] = [
  { id: 'todas', label: 'Todas las categorías', icon: 'fa-layer-group' },
  { id: 'supuesto_oficial', label: 'Supuesto oficial', icon: 'fa-scale-balanced' },
  { id: 'supuesto_academia', label: 'Supuesto de academia', icon: 'fa-building-columns' },
  { id: 'supuesto_ia', label: 'Supuesto aleatorio (IA)', icon: 'fa-robot' },
];

export const SeccionSimulacroOficial: React.FC<SeccionSimulacroOficialProps> = ({
  bancoExamenes,
  historialPruebas,
  almacenDudas,
  onExamenGuardado,
  onGuardarEnAlmacenDudas,
  onIrAHistorial,
  onActualizarPreguntaGlobal,
  onRegistrarResultadoPreguntas,
  onCambiarAmbitoExamen,
  onCambiarCategoriaExamen,
  onExportarExamenPDF,
}) => {
  // Configuración general de la Prueba Unificada
  const [duracionMinutos, setDuracionMinutos] = useState<number>(100);
  const [modalidadCorreccion, setModalidadCorreccion] = useState<'final' | 'paso_a_paso'>('final');
  const [tituloSimulacro, setTituloSimulacro] = useState<string>('');
  const [incluirReservasDisponibles, setIncluirReservasDisponibles] = useState<boolean>(true);

  // 1.ª PARTE: Selección de Test por Categoría (todas permitidas) y Ámbito ('AGE' | 'CAM' | 'AMBOS') o Aleatorio por leyes/temas
  const [modoParte1, setModoParte1] = useState<ModoSeleccionParte1>('test_oficial');
  const [categoriaFiltroTest, setCategoriaFiltroTest] = useState<FiltroCategoriaTest>('todas');
  const [ambitoFiltroTestOficial, setAmbitoFiltroTestOficial] = useState<ConvocatoriaAmbito>('AGE');
  const [testOficialSeleccionadoId, setTestOficialSeleccionadoId] = useState<string>('ALEATORIO_TEST_OFICIAL');

  // Mapas locales de cambios rápidos de ámbito y categoría para tests y supuestos
  const [ambitosPersonalizadosLocal, setAmbitosPersonalizadosLocal] = useState<
    Record<string, ConvocatoriaAmbito>
  >({});
  const [categoriasPersonalizadasLocal, setCategoriasPersonalizadasLocal] = useState<
    Record<string, CategoriaExamen>
  >({});

  // Filtros para el modo aleatorio por número de preguntas de cada Ley BOE o Tema Oficial de Informática
  const [filtroTipoMateria, setFiltroTipoMateria] = useState<'todas' | 'leyes_boe' | 'informatica'>('todas');
  const [busquedaMateria, setBusquedaMateria] = useState<string>('');
  const [seleccionPorMateria, setSeleccionPorMateria] = useState<Record<string, number>>({});
  const [completarAutomaticamenteHasta70, setCompletarAutomaticamenteHasta70] = useState<boolean>(true);

  // 2.ª PARTE: Filtros por Categoría y Ámbito en Supuestos Prácticos de 20 preguntas (+ hasta 5 de reserva)
  const [categoriaFiltroSupuesto, setCategoriaFiltroSupuesto] =
    useState<FiltroCategoriaSupuesto>('todas');
  const [ambitoFiltroSupuesto, setAmbitoFiltroSupuesto] = useState<ConvocatoriaAmbito>('AMBOS');
  const [supuestoSeleccionadoId, setSupuestoSeleccionadoId] = useState<string>('ALEATORIO_AGE_20');
  const [verTextoSupuestoPreviewId, setVerTextoSupuestoPreviewId] = useState<string | null>(null);

  // Estado del Simulacro Oficial en curso
  const [simulacroActivo, setSimulacroActivo] = useState<ExamenCompleto | null>(null);
  const [preguntasExtendidasActivas, setPreguntasExtendidasActivas] = useState<PreguntaSimulacroExtendida[]>([]);
  const [preguntasAnuladasIndices, setPreguntasAnuladasIndices] = useState<Set<number>>(new Set());
  const [supuestoActivoInfo, setSupuestoActivoInfo] = useState<SupuestoDisponible | null>(null);
  const [indicePreguntaActual, setIndicePreguntaActual] = useState<number>(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState<Record<number, string>>({});
  const [preguntasDudosas, setPreguntasDudosas] = useState<Set<number>>(new Set());
  const [segundosRestantes, setSegundosRestantes] = useState<number>(100 * 60);
  const [segundosInvertidos, setSegundosInvertidos] = useState<number>(0);
  const [relojPausado, setRelojPausado] = useState<boolean>(false);
  const [simulacroFinalizado, setSimulacroFinalizado] = useState<boolean>(false);
  const [mostrarRelatoSupuestoEnPregunta, setMostrarRelatoSupuestoEnPregunta] = useState<boolean>(true);
  const [preguntaModalJustificacion, setPreguntaModalJustificacion] = useState<number | null>(null);
  const [preguntaParaSelectorLeyes, setPreguntaParaSelectorLeyes] = useState<PreguntaExamen | null>(null);
  const [mostrarConfirmarEvaluacion, setMostrarConfirmarEvaluacion] = useState<boolean>(false);

  // Helpers para cambiar el ámbito o la categoría de un test o supuesto desde su tarjeta
  const handleCambiarAmbitoDesdeTarjeta = (examenId: string, nuevoAmbito: ConvocatoriaAmbito) => {
    setAmbitosPersonalizadosLocal((prev) => ({ ...prev, [examenId]: nuevoAmbito }));
    if (onCambiarAmbitoExamen) {
      onCambiarAmbitoExamen(examenId, nuevoAmbito);
    }
  };

  const handleCambiarCategoriaDesdeTarjeta = (
    examenId: string,
    nuevaCategoria: CategoriaExamen
  ) => {
    setCategoriasPersonalizadasLocal((prev) => ({ ...prev, [examenId]: nuevaCategoria }));
    if (onCambiarCategoriaExamen) {
      onCambiarCategoriaExamen(examenId, nuevaCategoria);
    }
  };

  // 1. Recopilar TODAS las preguntas existentes en todos los tests y clasificarlas por Ley BOE o Tema Oficial de Informática (8 AGE + 2 CAM)
  const {
    gruposMaterias,
    todasLasPreguntasUnicas,
    preguntasPoolAGE,
    preguntasPoolCAM,
    reservasPoolGlobal,
  } = useMemo(() => {
    const mapaPreguntas = new Map<
      string,
      { pregunta: PreguntaExamen; norma: string; ambitoOrigen: ConvocatoriaAmbito }
    >();
    const listaReservasDetectadas: PreguntaExamen[] = [];
    const clavesReservas = new Set<string>();

    const registrarPregunta = (
      p: PreguntaExamen,
      examenPadre?: ExamenCompleto,
      ambitoForzado?: ConvocatoriaAmbito
    ) => {
      if (!p || !p.enunciado || !Array.isArray(p.opciones) || p.opciones.length < 2) return;
      const clave = normalizarClavePregunta(p.enunciado);
      if (!clave) return;

      const rawNorma = obtenerNormaEfectivaDePregunta(p, examenPadre);
      let norma = normalizarNombreLey(rawNorma) || rawNorma;

      // Garantizar que si la pregunta es de Informática, se asocie EXCLUSIVAMENTE a uno de los 10 temas oficiales (8 AGE + 2 CAM)
      const catTemario = clasificarPreguntaEnCategoriaTemario(p, examenPadre);
      if (
        catTemario === 'informatica_c1' &&
        !SET_10_TEMAS_INFORMATICA_OFICIALES.has(norma)
      ) {
        const deducido = deducirNormaOTemaDesdeTexto(
          [p.enunciado, rawNorma, p.justificacionLegal?.fundamento || ''].join(' ')
        );
        if (deducido && SET_10_TEMAS_INFORMATICA_OFICIALES.has(deducido)) {
          norma = deducido;
        } else {
          norma =
            'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)';
        }
      }

      const esNormaCAM = /comunidad de madrid|estatuto.*madrid|asamblea de madrid|ley 1\/1983|ley 1\/1986|ley 9\/1990|\bcam\b|\(cam\)/i.test(
        norma + ' ' + p.enunciado
      );
      const amb: ConvocatoriaAmbito =
        ambitoForzado || (esNormaCAM ? 'CAM' : examenPadre?.ambito || 'AGE');

      const refConv = obtenerReferenciaConvocatoriaOficial(p, examenPadre);

      const preguntaEnriquecida: PreguntaExamen = {
        ...p,
        convocatoriasAparecida: refConv || p.convocatoriasAparecida,
        leyesRelacionadas:
          SET_10_TEMAS_INFORMATICA_OFICIALES.has(norma)
            ? [norma]
            : p.leyesRelacionadas && p.leyesRelacionadas.length > 0
            ? p.leyesRelacionadas
            : [norma],
        justificacionLegal: {
          ...(p.justificacionLegal || {
            articulo: 'Precepto oficial aplicable',
            fundamento: 'Fundamentación verificada conforme al bloque normativo.',
          }),
          norma,
        },
      };

      if (p.esReserva && !clavesReservas.has(clave)) {
        clavesReservas.add(clave);
        listaReservasDetectadas.push(preguntaEnriquecida);
      }

      if (!mapaPreguntas.has(clave)) {
        mapaPreguntas.set(clave, {
          pregunta: preguntaEnriquecida,
          norma,
          ambitoOrigen: amb,
        });
      }
    };

    bancoExamenes.forEach((ex) => {
      ex.preguntas?.forEach((p) => registrarPregunta(p, ex));
    });
    EXAMENES_PRECARGADOS_OFICIALES.forEach((ex) => {
      ex.preguntas?.forEach((p) => registrarPregunta(p, ex));
    });
    historialPruebas.forEach((ex) => {
      ex.preguntas?.forEach((p) => registrarPregunta(p, ex));
    });
    almacenDudas.forEach((d) => {
      if (d.enunciado && Array.isArray(d.opciones) && d.opciones.length >= 2) {
        const preg: PreguntaExamen = {
          id: 1,
          enunciado: d.enunciado,
          opciones: d.opciones,
          convocatoriasAparecida: d.convocatoriasAparecida,
          leyesRelacionadas: d.leyesRelacionadas,
          justificacionLegal: d.justificacionLegal || {
            norma: d.leyesRelacionadas?.[0] || 'Legislación Oficial del Estado',
            articulo: 'Precepto aplicable',
            fundamento: d.comentarioUsuario || '',
          },
        };
        registrarPregunta(
          preg,
          d.examenTitulo ? ({ id: d.examenId || '', titulo: d.examenTitulo } as ExamenCompleto) : undefined
        );
      }
    });

    const bancoExtraAGE = generarBancoPreguntasBOE(
      'unitario',
      'AGE',
      90,
      'Procedimiento Administrativo, Régimen del Sector Público, Función Pública, Constitución, Contratos, Presupuestos',
      'Ley 39/2015, Ley 40/2015, TREBEP, Constitución Española, Ley 9/2017, Ley 47/2003'
    );
    bancoExtraAGE.preguntas.forEach((p: PreguntaExamen) => registrarPregunta(p, undefined, 'AGE'));

    const bancoExtraCAM = generarBancoPreguntasBOE(
      'unitario',
      'CAM',
      50,
      'Régimen Autonómico de Madrid, Procedimiento Administrativo, Función Pública CAM, Contratos y Hacienda CAM',
      'Estatuto de Autonomía CAM LO 3/1983, Ley 1/1983 CAM, Ley 1/1986 Función Pública CAM, Ley 9/1990 Hacienda CAM, Ley 39/2015'
    );
    bancoExtraCAM.preguntas.forEach((p: PreguntaExamen) => registrarPregunta(p, undefined, 'CAM'));

    // Registrar banco oficial de los 10 temas de Informática (8 de la AGE + 2 adicionales de la CAM)
    PREGUNTAS_OFICIALES_INFORMATICA_10_TEMAS.forEach((p: PreguntaExamen) => {
      const esAdicionalCAM = (p.leyesRelacionadas || []).some((l) => l.includes('(CAM)'));
      registrarPregunta(p, undefined, esAdicionalCAM ? 'CAM' : 'AMBOS');
    });

    const agrupado = new Map<string, PreguntaExamen[]>();
    // Garantizar que los 10 temas oficiales de Informática (8 AGE + 2 adicionales CAM) figuren siempre en el selector
    LISTA_10_TEMAS_INFORMATICA_NORMALIZADOS.forEach((t) => {
      if (!agrupado.has(t.etiqueta)) {
        agrupado.set(t.etiqueta, []);
      }
    });

    const listaUnicas: PreguntaExamen[] = [];
    const poolAGE: PreguntaExamen[] = [];
    const poolCAM: PreguntaExamen[] = [];

    mapaPreguntas.forEach(({ pregunta, norma, ambitoOrigen }) => {
      listaUnicas.push(pregunta);
      const lista = agrupado.get(norma) || [];
      lista.push(pregunta);
      agrupado.set(norma, lista);

      if (ambitoOrigen === 'CAM') {
        poolCAM.push(pregunta);
      } else if (ambitoOrigen === 'AGE') {
        poolAGE.push(pregunta);
      } else {
        poolAGE.push(pregunta);
        poolCAM.push(pregunta);
      }
    });

    if (poolCAM.length < 60) {
      for (const p of poolAGE) {
        if (poolCAM.length >= 60) break;
        poolCAM.push(p);
      }
    }

    const ordenTemasInformatica = new Map<string, number>(
      LISTA_10_TEMAS_INFORMATICA_NORMALIZADOS.map((t) => [t.etiqueta, t.numero])
    );

    // En la selección aleatoria, para Informática SOLO se permiten los 10 temas oficiales (ordenTemasInformatica.has(nombre))
    const grupos: GrupoLeyOTemaDisponible[] = Array.from(agrupado.entries())
      .filter(([nombre, preguntas]) => {
        if (preguntas.length === 0) return false;
        const pareceInfo =
          ordenTemasInformatica.has(nombre) ||
          clasificarPreguntaEnCategoriaTemario({
            enunciado: nombre,
            justificacionLegal: { norma: nombre, articulo: '', fundamento: '' },
            leyesRelacionadas: [nombre],
          }) === 'informatica_c1';
        if (pareceInfo && !ordenTemasInformatica.has(nombre)) {
          return false;
        }
        return true;
      })
      .map(([nombre, preguntas]) => ({
        nombre,
        esInformatica: ordenTemasInformatica.has(nombre),
        preguntas,
      }))
      .sort((a, b) => {
        if (a.esInformatica !== b.esInformatica) return a.esInformatica ? 1 : -1;
        if (a.esInformatica && b.esInformatica) {
          const numA = ordenTemasInformatica.get(a.nombre) ?? 99;
          const numB = ordenTemasInformatica.get(b.nombre) ?? 99;
          if (numA !== numB) return numA - numB;
        }
        return b.preguntas.length - a.preguntas.length || a.nombre.localeCompare(b.nombre);
      });

    return {
      gruposMaterias: grupos,
      todasLasPreguntasUnicas: listaUnicas,
      preguntasPoolAGE: poolAGE,
      preguntasPoolCAM: poolCAM,
      reservasPoolGlobal: listaReservasDetectadas,
    };
  }, [bancoExamenes, historialPruebas, almacenDudas]);

  // 2. Recopilar TODOS los Tests (permitiendo todas las categorías: test_oficial, test_academia, test_ia) + hasta 5 de reserva disponibles
  const testsOficialesCatalogo = useMemo<TestOficialCandidato[]>(() => {
    const mapa = new Map<string, TestOficialCandidato>();

    const construirOrdinariasYReservas = (
      preguntasExamen: PreguntaExamen[],
      metaOrdinarias: number,
      poolRef: PreguntaExamen[],
      offsetSeed: number
    ): { ordinarias: PreguntaExamen[]; reservas: PreguntaExamen[] } => {
      const ordOriginales = preguntasExamen.filter((p) => !p.esReserva);
      const resOriginales = preguntasExamen.filter((p) => p.esReserva);

      const ordinarias: PreguntaExamen[] = [];
      const usadas = new Set<string>();

      for (const p of ordOriginales) {
        if (ordinarias.length >= metaOrdinarias) break;
        const k = normalizarClavePregunta(p.enunciado);
        if (k && !usadas.has(k)) {
          usadas.add(k);
          ordinarias.push({ ...p, esReserva: false });
        }
      }

      // Completar ordinarias hasta 70 (AGE) o 40 (CAM)
      if (ordinarias.length < metaOrdinarias && poolRef.length > 0) {
        for (let i = 0; i < poolRef.length && ordinarias.length < metaOrdinarias; i++) {
          const cand = poolRef[(i + offsetSeed) % poolRef.length];
          if (cand.esReserva) continue;
          const k = normalizarClavePregunta(cand.enunciado);
          if (k && !usadas.has(k)) {
            usadas.add(k);
            ordinarias.push({ ...cand, esReserva: false });
          }
        }
      }

      // Extraer hasta 5 preguntas de reserva disponibles:
      const reservas: PreguntaExamen[] = [];
      for (const r of resOriginales) {
        if (reservas.length >= 5) break;
        const k = normalizarClavePregunta(r.enunciado);
        if (k && !usadas.has(k)) {
          usadas.add(k);
          reservas.push({
            ...r,
            esReserva: true,
            numeroReserva: reservas.length + 1,
          });
        }
      }

      if (ordOriginales.length > metaOrdinarias && reservas.length < 5) {
        for (const sobrante of ordOriginales.slice(metaOrdinarias)) {
          if (reservas.length >= 5) break;
          const k = normalizarClavePregunta(sobrante.enunciado);
          if (k && !usadas.has(k)) {
            usadas.add(k);
            reservas.push({
              ...sobrante,
              esReserva: true,
              numeroReserva: reservas.length + 1,
            });
          }
        }
      }

      if (reservas.length < 5 && reservasPoolGlobal.length > 0) {
        for (const rGlobal of reservasPoolGlobal) {
          if (reservas.length >= 5) break;
          const k = normalizarClavePregunta(rGlobal.enunciado);
          if (k && !usadas.has(k)) {
            usadas.add(k);
            reservas.push({
              ...rGlobal,
              esReserva: true,
              numeroReserva: reservas.length + 1,
            });
          }
        }
      }

      return { ordinarias, reservas };
    };

    const todosExamenes = [
      ...bancoExamenes,
      ...EXAMENES_PRECARGADOS_OFICIALES,
      ...historialPruebas.filter((h) => !h.soloHistorial),
    ];

    todosExamenes.forEach((ex, idx) => {
      const catOriginal = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
      const esSupuesto =
        ex.tipo === 'supuesto' ||
        catOriginal.startsWith('supuesto_') ||
        Boolean(ex.contextoCaso && ex.contextoCaso.trim().length > 30);

      if (esSupuesto || !ex.preguntas || ex.preguntas.length === 0) {
        return;
      }

      const baseId = ex.testBaseId || ex.id.replace(/-intento-\d+$/, '');
      if (mapa.has(baseId)) return;

      const tituloLimpio = ex.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
      const leyes = obtenerLeyesNormalizadasDeExamen(ex);
      const ambitoEfectivo: ConvocatoriaAmbito =
        ambitosPersonalizadosLocal[baseId] ||
        ambitosPersonalizadosLocal[ex.id] ||
        ex.ambito ||
        'AGE';

      const categoriaEfectiva: CategoriaExamen =
        categoriasPersonalizadasLocal[baseId] ||
        categoriasPersonalizadasLocal[ex.id] ||
        (catOriginal.startsWith('test_') ? catOriginal : 'test_oficial');

      const metaOrd = ambitoEfectivo === 'CAM' ? 40 : 70;
      const poolRef = ambitoEfectivo === 'CAM' ? preguntasPoolCAM : preguntasPoolAGE;

      const { ordinarias, reservas } = construirOrdinariasYReservas(
        ex.preguntas,
        metaOrd,
        poolRef,
        idx * 11
      );

      mapa.set(baseId, {
        id: baseId,
        titulo: tituloLimpio,
        categoria: categoriaEfectiva,
        ambito: ambitoEfectivo,
        fecha: ex.fecha || '2025',
        leyes: leyes.slice(0, 4),
        preguntasOrdinarias: ordinarias,
        preguntasReserva: reservas,
        totalOrdinariasOriginal: ordinarias.length,
        totalReservasDisponibles: reservas.length,
      });
    });

    // Garantizar tests disponibles en todas las categorías (Test oficial, Test de academia, Test aleatorio IA) y ámbitos (AGE 70 / CAM 40)
    const plantillasBaseTests: {
      id: string;
      titulo: string;
      categoriaPorDefecto: CategoriaExamen;
      ambitoPorDefecto: ConvocatoriaAmbito;
      fecha: string;
      leyes: string[];
      seed: number;
    }[] = [
      {
        id: 'OFICIAL-INAP-AGE-2025',
        titulo: 'Examen Oficial C1 AGE — Convocatoria OEP 2024/2025 (Cuestionario INAP)',
        categoriaPorDefecto: 'test_oficial',
        ambitoPorDefecto: 'AGE',
        fecha: '2025-05-23',
        leyes: [
          'Constitución Española de 1978',
          'Ley 39/2015 (LPACAP)',
          'TREBEP (RDL 5/2015)',
          'Tema 4 (AGE): Procesadores de texto: Word 365',
        ],
        seed: 3,
      },
      {
        id: 'OFICIAL-INAP-AGE-2024',
        titulo: 'Examen Oficial C1 AGE — Convocatoria OEP 2023-2024 (14 dic 2024)',
        categoriaPorDefecto: 'test_oficial',
        ambitoPorDefecto: 'AGE',
        fecha: '2024-12-14',
        leyes: ['Ley 39/2015 (LPACAP)', 'Ley 40/2015 (LRJSP)', 'Ley 9/2017 (Contratos LCSP)', 'Ley 47/2003 (General Presupuestaria)'],
        seed: 21,
      },
      {
        id: 'OFICIAL-CAM-MADRID-2025',
        titulo: 'Examen Oficial C1 Comunidad de Madrid — Convocatoria Autonómica CAM',
        categoriaPorDefecto: 'test_oficial',
        ambitoPorDefecto: 'CAM',
        fecha: '2025-04-10',
        leyes: ['Normativa Autonómica CAM', 'Ley 39/2015 (LPACAP)', 'Tema 9 (CAM): Power BI', 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)'],
        seed: 7,
      },
      {
        id: 'ACADEMIA-AGE-INTEGRAL-2025',
        titulo: 'Simulacro de Academia C1 AGE — Bloque Normativo e Informática Oficial',
        categoriaPorDefecto: 'test_academia',
        ambitoPorDefecto: 'AGE',
        fecha: '2025-03-18',
        leyes: ['Ley 39/2015 (LPACAP)', 'TREBEP (RDL 5/2015)', 'Tema 5 (AGE): Hojas de cálculo: Excel 365', 'Tema 6 (AGE): Bases de datos: Access 365'],
        seed: 14,
      },
      {
        id: 'ACADEMIA-CAM-MADRID-2025',
        titulo: 'Simulacro de Academia C1 Madrid CAM — Leyes Autonómicas, Power BI y Teams',
        categoriaPorDefecto: 'test_academia',
        ambitoPorDefecto: 'CAM',
        fecha: '2025-02-20',
        leyes: ['Normativa Autonómica CAM', 'Tema 9 (CAM): Power BI', 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)'],
        seed: 29,
      },
      {
        id: 'IA-ALEATORIO-AGE-2025',
        titulo: 'Test Aleatorio IA C1 AGE — Multinorma y 8 Temas de Informática AGE',
        categoriaPorDefecto: 'test_ia',
        ambitoPorDefecto: 'AGE',
        fecha: '2025-05-01',
        leyes: ['Constitución Española de 1978', 'LO 2/2012 (Estabilidad Presupuestaria)', 'Tema 1 (AGE): Informática básica (Hardware, Software, Almacenamiento y Seguridad)'],
        seed: 35,
      },
      {
        id: 'IA-ALEATORIO-CAM-2025',
        titulo: 'Test Aleatorio IA C1 Madrid CAM — Estatuto CAM y 10 Temas de Informática',
        categoriaPorDefecto: 'test_ia',
        ambitoPorDefecto: 'CAM',
        fecha: '2025-05-02',
        leyes: ['Normativa Autonómica CAM', 'Ley 39/2015 (LPACAP)', 'Tema 9 (CAM): Power BI'],
        seed: 42,
      },
    ];

    plantillasBaseTests.forEach((pl) => {
      if (!mapa.has(pl.id)) {
        const ambitoActual = ambitosPersonalizadosLocal[pl.id] || pl.ambitoPorDefecto;
        const categoriaActual =
          categoriasPersonalizadasLocal[pl.id] || pl.categoriaPorDefecto;
        const metaOrd = ambitoActual === 'CAM' ? 40 : 70;
        const poolRef = ambitoActual === 'CAM' ? preguntasPoolCAM : preguntasPoolAGE;
        const { ordinarias, reservas } = construirOrdinariasYReservas([], metaOrd, poolRef, pl.seed);

        mapa.set(pl.id, {
          id: pl.id,
          titulo: pl.titulo,
          categoria: categoriaActual,
          ambito: ambitoActual,
          fecha: pl.fecha,
          leyes: pl.leyes,
          preguntasOrdinarias: ordinarias,
          preguntasReserva: reservas,
          totalOrdinariasOriginal: ordinarias.length,
          totalReservasDisponibles: reservas.length,
        });
      }
    });

    return Array.from(mapa.values());
  }, [
    bancoExamenes,
    historialPruebas,
    preguntasPoolAGE,
    preguntasPoolCAM,
    reservasPoolGlobal,
    ambitosPersonalizadosLocal,
    categoriasPersonalizadasLocal,
  ]);

  // Filtrar los Tests según Categoría ('todas' | 'test_oficial' | 'test_academia' | 'test_ia') y Ámbito ('AGE' | 'CAM' | 'AMBOS')
  const testsOficialesFiltradosPorAmbito = useMemo(() => {
    return testsOficialesCatalogo.filter((t) => {
      const cumpleCat = categoriaFiltroTest === 'todas' || t.categoria === categoriaFiltroTest;
      const cumpleAmb =
        ambitoFiltroTestOficial === 'AMBOS' ||
        t.ambito === ambitoFiltroTestOficial ||
        t.ambito === 'AMBOS';
      return cumpleCat && cumpleAmb;
    });
  }, [testsOficialesCatalogo, categoriaFiltroTest, ambitoFiltroTestOficial]);

  // 3. Recopilar TODOS los Supuestos Prácticos existentes con sus 20 preguntas ordinarias + hasta 5 preguntas de reserva disponibles
  const supuestosDisponibles = useMemo<SupuestoDisponible[]>(() => {
    const mapaSupuestos = new Map<string, SupuestoDisponible>();

    const todosExamenes = [
      ...bancoExamenes,
      ...EXAMENES_PRECARGADOS_OFICIALES,
      ...historialPruebas.filter((h) => !h.soloHistorial),
    ];

    todosExamenes.forEach((ex, idx) => {
      const catOriginal = ex.categoria || deducirCategoriaExamen(ex.tipo, ex.origen);
      const esSupuesto =
        ex.tipo === 'supuesto' ||
        catOriginal.startsWith('supuesto_') ||
        Boolean(ex.contextoCaso && ex.contextoCaso.trim().length > 30) ||
        /supuesto/i.test(ex.titulo);

      if (!esSupuesto || !ex.preguntas || ex.preguntas.length === 0) return;

      const baseId = ex.testBaseId || ex.id.replace(/-intento-\d+$/, '');
      const tituloLimpio = ex.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
      const claveUnica = `${baseId}::${tituloLimpio.toLowerCase()}`;

      if (mapaSupuestos.has(claveUnica)) return;

      const leyesSup = obtenerLeyesNormalizadasDeExamen(ex);
      const esSupuestoCAM =
        ex.ambito === 'CAM' ||
        /comunidad de madrid|\bcam\b|consejer[ií]a.*madrid|asamblea de madrid|ley 1\/1983|ley 1\/1986|ley 9\/1990/i.test(
          tituloLimpio + ' ' + (ex.contextoCaso || '') + ' ' + leyesSup.join(' ')
        );

      const ambitoEfectivo: ConvocatoriaAmbito =
        ambitosPersonalizadosLocal[baseId] ||
        ambitosPersonalizadosLocal[ex.id] ||
        (esSupuestoCAM ? 'CAM' : 'AGE');

      const categoriaEfectiva: CategoriaExamen =
        categoriasPersonalizadasLocal[baseId] ||
        categoriasPersonalizadasLocal[ex.id] ||
        (catOriginal.startsWith('supuesto_') ? catOriginal : 'supuesto_oficial');

      const poolComplementario = ambitoEfectivo === 'CAM' ? preguntasPoolCAM : preguntasPoolAGE;

      // Separar preguntas ordinarias (20) y preguntas de reserva disponibles (hasta 5)
      const ordOriginales = ex.preguntas.filter((p) => !p.esReserva);
      const resOriginales = ex.preguntas.filter((p) => p.esReserva);

      const seleccion20: PreguntaExamen[] = [];
      const usadas = new Set<string>();

      for (const p of ordOriginales) {
        if (seleccion20.length >= 20) break;
        const k = normalizarClavePregunta(p.enunciado);
        if (k && !usadas.has(k)) {
          usadas.add(k);
          seleccion20.push({ ...p, esReserva: false });
        }
      }

      if (seleccion20.length < 20) {
        for (let i = 0; i < poolComplementario.length && seleccion20.length < 20; i++) {
          const pExtra = poolComplementario[(i + idx * 5) % poolComplementario.length];
          if (pExtra.esReserva) continue;
          const k = normalizarClavePregunta(pExtra.enunciado);
          if (k && !usadas.has(k)) {
            usadas.add(k);
            seleccion20.push({ ...pExtra, esReserva: false });
          }
        }
      }

      // Extraer hasta 5 preguntas de reserva del supuesto si las tiene disponibles
      const reservasSupuesto: PreguntaExamen[] = [];
      for (const r of resOriginales) {
        if (reservasSupuesto.length >= 5) break;
        const k = normalizarClavePregunta(r.enunciado);
        if (k && !usadas.has(k)) {
          usadas.add(k);
          reservasSupuesto.push({
            ...r,
            esReserva: true,
            numeroReserva: reservasSupuesto.length + 1,
          });
        }
      }

      if (ordOriginales.length > 20 && reservasSupuesto.length < 5) {
        for (const sob of ordOriginales.slice(20)) {
          if (reservasSupuesto.length >= 5) break;
          const k = normalizarClavePregunta(sob.enunciado);
          if (k && !usadas.has(k)) {
            usadas.add(k);
            reservasSupuesto.push({
              ...sob,
              esReserva: true,
              numeroReserva: reservasSupuesto.length + 1,
            });
          }
        }
      }

      mapaSupuestos.set(claveUnica, {
        id: baseId,
        titulo: tituloLimpio,
        categoria: categoriaEfectiva,
        ambito: ambitoEfectivo,
        contextoCaso:
          ex.contextoCaso ||
          'En una Subdirección General perteneciente a la Administración General del Estado se tramita un expediente administrativo en materia de procedimiento administrativo común, recursos, contratación del sector público y gestión de personal funcionario del Subgrupo C1. En relación con las actuaciones administrativas practicadas en dicho expediente, se formulan las siguientes 20 cuestiones:',
        leyes: leyesSup.slice(0, 4),
        preguntasOrdinarias20: seleccion20,
        preguntasReserva: reservasSupuesto,
        totalOrdinariasOriginal: seleccion20.length,
        totalReservasDisponibles: reservasSupuesto.length,
        esFormato20AGE: ambitoEfectivo === 'AGE' && seleccion20.length === 20,
      });
    });

    // Garantizar supuestos prácticos en todas las categorías (supuesto_oficial, supuesto_academia, supuesto_ia) y ámbitos (AGE y CAM)
    const plantillasSupuestosExtra: {
      id: string;
      titulo: string;
      categoriaPorDefecto: CategoriaExamen;
      ambitoPorDefecto: ConvocatoriaAmbito;
      contextoCaso: string;
      leyes: string[];
      seed: number;
    }[] = [
      {
        id: 'SUPUESTO-ACADEMIA-AGE-2025',
        titulo: 'Supuesto de Academia C1 AGE — Expediente de Contratación, Recursos y Personal',
        categoriaPorDefecto: 'supuesto_academia',
        ambitoPorDefecto: 'AGE',
        contextoCaso:
          'En la Secretaría General Técnica de un Ministerio se tramita simultáneamente un expediente de contratación de suministro informático mediante procedimiento abierto simplificado, la provisión de un puesto por concurso de méritos y un recurso de alzada contra la desestimación de una solicitud electrónica.',
        leyes: ['Ley 39/2015 (LPACAP)', 'Ley 9/2017 (Contratos LCSP)', 'TREBEP (RDL 5/2015)'],
        seed: 12,
      },
      {
        id: 'SUPUESTO-ACADEMIA-CAM-2025',
        titulo: 'Supuesto de Academia C1 Madrid CAM — Gestión Presupuestaria y Función Pública Autonómica',
        categoriaPorDefecto: 'supuesto_academia',
        ambitoPorDefecto: 'CAM',
        contextoCaso:
          'En una Dirección General de una Consejería de la Comunidad de Madrid se tramita una transferencia de crédito conforme a la Ley 9/1990 Reguladora de la Hacienda de la Comunidad de Madrid y el nombramiento de personal funcionario interino según la Ley 1/1986.',
        leyes: ['Normativa Autonómica CAM', 'Ley 39/2015 (LPACAP)', 'Ley 47/2003 (General Presupuestaria)'],
        seed: 24,
      },
      {
        id: 'SUPUESTO-IA-AGE-2025',
        titulo: 'Supuesto Aleatorio (IA) C1 AGE — Procedimiento Electrónico, Subvenciones y Ejecución del Gasto',
        categoriaPorDefecto: 'supuesto_ia',
        ambitoPorDefecto: 'AGE',
        contextoCaso:
          'Un organismo público estatal adscrito a la Administración General del Estado convoca subvenciones en régimen de concurrencia competitiva, tramitando íntegramente los expedientes por medios electrónicos (RD 203/2021 y Ley 39/2015) y fiscalizando las fases del gasto (A, D, O, P).',
        leyes: ['Ley 39/2015 (LPACAP)', 'Ley 47/2003 (General Presupuestaria)', 'Ley 38/2003 (Subvenciones)'],
        seed: 37,
      },
      {
        id: 'SUPUESTO-IA-CAM-2025',
        titulo: 'Supuesto Aleatorio (IA) C1 Madrid CAM — Administración Autonómica y Transparencia',
        categoriaPorDefecto: 'supuesto_ia',
        ambitoPorDefecto: 'CAM',
        contextoCaso:
          'Ante la Secretaría General Técnica de una Consejería de la Comunidad de Madrid se presenta una solicitud de acceso a la información pública y un recurso potestativo de reposición contra una orden del Consejero.',
        leyes: ['Normativa Autonómica CAM', 'Ley 19/2013 (Transparencia y Buen Gobierno)', 'Ley 39/2015 (LPACAP)'],
        seed: 49,
      },
    ];

    plantillasSupuestosExtra.forEach((pl) => {
      const clave = `${pl.id}::${pl.titulo.toLowerCase()}`;
      if (!mapaSupuestos.has(clave)) {
        const ambitoEf = ambitosPersonalizadosLocal[pl.id] || pl.ambitoPorDefecto;
        const categoriaEf =
          categoriasPersonalizadasLocal[pl.id] || pl.categoriaPorDefecto;
        const poolRef = ambitoEf === 'CAM' ? preguntasPoolCAM : preguntasPoolAGE;
        const ord20 = poolRef.slice(pl.seed, pl.seed + 20).map((p) => ({ ...p, esReserva: false }));
        const res5 = reservasPoolGlobal
          .slice(0, 5)
          .map((r, i) => ({ ...r, esReserva: true, numeroReserva: i + 1 }));

        mapaSupuestos.set(clave, {
          id: pl.id,
          titulo: pl.titulo,
          categoria: categoriaEf,
          ambito: ambitoEf,
          contextoCaso: pl.contextoCaso,
          leyes: pl.leyes,
          preguntasOrdinarias20: ord20,
          preguntasReserva: res5,
          totalOrdinariasOriginal: ord20.length,
          totalReservasDisponibles: res5.length,
          esFormato20AGE: ambitoEf === 'AGE' && ord20.length === 20,
        });
      }
    });

    return Array.from(mapaSupuestos.values());
  }, [
    bancoExamenes,
    historialPruebas,
    preguntasPoolAGE,
    preguntasPoolCAM,
    reservasPoolGlobal,
    ambitosPersonalizadosLocal,
    categoriasPersonalizadasLocal,
  ]);

  // Subconjunto de supuestos con formato 20 preguntas AGE (para el sorteo aleatorio)
  const supuestosFormato20AGE = useMemo(() => {
    const lista = supuestosDisponibles.filter((s) => s.ambito === 'AGE' && s.esFormato20AGE);
    return lista.length > 0 ? lista : supuestosDisponibles;
  }, [supuestosDisponibles]);

  // Supuestos visibles según los filtros de Categoría y Ámbito
  const supuestosVisibles = useMemo(() => {
    return supuestosDisponibles.filter((s) => {
      const cumpleCat =
        categoriaFiltroSupuesto === 'todas' || s.categoria === categoriaFiltroSupuesto;
      const cumpleAmb =
        ambitoFiltroSupuesto === 'AMBOS' ||
        s.ambito === ambitoFiltroSupuesto ||
        s.ambito === 'AMBOS';
      return cumpleCat && cumpleAmb;
    });
  }, [supuestosDisponibles, categoriaFiltroSupuesto, ambitoFiltroSupuesto]);

  // Inicializar distribución por defecto a 70 preguntas en el modo aleatorio por leyes
  useEffect(() => {
    if (gruposMaterias.length > 0 && Object.keys(seleccionPorMateria).length === 0) {
      aplicarRepartoProporcional70(gruposMaterias, 'todas');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruposMaterias.length]);

  const aplicarRepartoProporcional70 = (
    grupos: GrupoLeyOTemaDisponible[],
    modo: 'todas' | 'leyes_boe' | 'informatica' | 'oficial_equilibrado'
  ) => {
    const elegibles = grupos.filter((g) => {
      if (modo === 'leyes_boe') return !g.esInformatica;
      if (modo === 'informatica') return g.esInformatica;
      return true;
    });

    if (elegibles.length === 0) return;
    const totalDisponibleElegibles = elegibles.reduce((acc, g) => acc + g.preguntas.length, 0);
    const objetivo = 70;
    const nuevoMapa: Record<string, number> = {};

    if (modo === 'oficial_equilibrado') {
      const gruposLeyes = elegibles.filter((g) => !g.esInformatica);
      const gruposInfo = elegibles.filter((g) => g.esInformatica);
      const metaLeyes = gruposLeyes.length > 0 ? 50 : 0;
      const metaInfo = gruposInfo.length > 0 ? 70 - metaLeyes : 0;

      const repartirEnSubgrupo = (lista: GrupoLeyOTemaDisponible[], meta: number) => {
        if (lista.length === 0 || meta <= 0) return;
        let asignadas = 0;
        const dispTotal = Math.max(1, lista.reduce((a, b) => a + b.preguntas.length, 0));

        lista.forEach((g) => {
          const prop = Math.floor((g.preguntas.length / dispTotal) * meta);
          if (prop > 0) {
            nuevoMapa[g.nombre] = prop;
            asignadas += prop;
          }
        });

        let idx = 0;
        let safety = 0;
        while (asignadas < meta && safety < 500) {
          const g = lista[idx % lista.length];
          const actual = nuevoMapa[g.nombre] || 0;
          nuevoMapa[g.nombre] = actual + 1;
          asignadas++;
          idx++;
          safety++;
        }
      };

      repartirEnSubgrupo(gruposLeyes, metaLeyes);
      repartirEnSubgrupo(gruposInfo, metaInfo);
      setSeleccionPorMateria(nuevoMapa);
      return;
    }

    let asignadas = 0;
    if (totalDisponibleElegibles > 0) {
      elegibles.forEach((g) => {
        const prop = Math.floor((g.preguntas.length / totalDisponibleElegibles) * objetivo);
        if (prop > 0) {
          nuevoMapa[g.nombre] = prop;
          asignadas += prop;
        }
      });
    }

    let i = 0;
    let guard = 0;
    while (asignadas < objetivo && guard < 1000) {
      const g = elegibles[i % elegibles.length];
      const actual = nuevoMapa[g.nombre] || 0;
      nuevoMapa[g.nombre] = actual + 1;
      asignadas++;
      i++;
      guard++;
    }

    setSeleccionPorMateria(nuevoMapa);
  };

  const handleCompletarRestantesHasta70 = () => {
    const copia = { ...seleccionPorMateria };
    let actualTotal = Object.values(copia).reduce((a, b) => a + b, 0);

    if (actualTotal > 70) {
      for (const g of [...gruposMaterias].reverse()) {
        if (actualTotal <= 70) break;
        const val = copia[g.nombre] || 0;
        if (val > 0) {
          const exceso = actualTotal - 70;
          const restar = Math.min(val, exceso);
          copia[g.nombre] = val - restar;
          actualTotal -= restar;
        }
      }
      setSeleccionPorMateria(copia);
      return;
    }

    const candidatos = gruposMaterias.filter((g) => {
      if (filtroTipoMateria === 'leyes_boe') return !g.esInformatica;
      if (filtroTipoMateria === 'informatica') return g.esInformatica;
      return true;
    });
    const listaPool = candidatos.length > 0 ? candidatos : gruposMaterias;
    if (listaPool.length === 0) return;

    let idx = 0;
    let iter = 0;
    while (actualTotal < 70 && iter < 1500) {
      const g = listaPool[idx % listaPool.length];
      const val = copia[g.nombre] || 0;
      copia[g.nombre] = val + 1;
      actualTotal++;
      idx++;
      iter++;
    }
    setSeleccionPorMateria(copia);
  };

  // Permitir cualquier cantidad de preguntas en cualquier tema oficial de informática o ley BOE (sin tope en 2 ni en maxDisponible)
  const cambiarCantidadMateria = (nombre: string, nuevaCantidad: number) => {
    const limpia = Math.max(0, Math.floor(Number(nuevaCantidad) || 0));
    setSeleccionPorMateria((prev) => {
      const next = { ...prev };
      if (limpia === 0) {
        delete next[nombre];
      } else {
        next[nombre] = limpia;
      }
      return next;
    });
  };

  const resumenSeleccion70 = useMemo(() => {
    let total = 0;
    let totalLeyes = 0;
    let totalInformatica = 0;
    let materiasActivas = 0;

    gruposMaterias.forEach((g) => {
      const cant = Math.max(0, seleccionPorMateria[g.nombre] || 0);
      if (cant > 0) {
        total += cant;
        materiasActivas++;
        if (g.esInformatica) totalInformatica += cant;
        else totalLeyes += cant;
      }
    });

    return { total, totalLeyes, totalInformatica, materiasActivas };
  }, [gruposMaterias, seleccionPorMateria]);

  // Determinar cuántas preguntas ordinarias y de reserva tendrá la 1.ª Parte y la 2.ª Parte según la selección actual
  const resumenConfiguracionActual = useMemo(() => {
    let ordParte1 = 70;
    let resParte1 = 5;

    if (modoParte1 === 'test_oficial') {
      const testEspecifico = testsOficialesFiltradosPorAmbito.find(
        (t) => t.id === testOficialSeleccionadoId
      );
      if (testEspecifico) {
        ordParte1 = testEspecifico.preguntasOrdinarias.length;
        resParte1 = incluirReservasDisponibles ? testEspecifico.preguntasReserva.length : 0;
      } else {
        ordParte1 = ambitoFiltroTestOficial === 'CAM' ? 40 : 70;
        const primero = testsOficialesFiltradosPorAmbito[0];
        resParte1 = incluirReservasDisponibles ? (primero?.preguntasReserva.length ?? 5) : 0;
      }
    } else {
      ordParte1 = completarAutomaticamenteHasta70
        ? Math.max(70, resumenSeleccion70.total || 70)
        : Math.max(1, resumenSeleccion70.total || 70);
      resParte1 = incluirReservasDisponibles ? 5 : 0;
    }

    const ordParte2 = 20;
    let resParte2 = 0;
    if (incluirReservasDisponibles) {
      if (supuestoSeleccionadoId === 'ALEATORIO_AGE_20') {
        const poolCandidatos =
          supuestosVisibles.length > 0 ? supuestosVisibles : supuestosFormato20AGE;
        const conReservas = poolCandidatos.find((s) => s.preguntasReserva.length > 0);
        resParte2 = conReservas ? conReservas.preguntasReserva.length : 0;
      } else {
        const sup = supuestosDisponibles.find((s) => s.id === supuestoSeleccionadoId);
        resParte2 = sup ? sup.preguntasReserva.length : 0;
      }
    }

    return {
      ordParte1,
      resParte1,
      ordParte2,
      resParte2,
      totalOrdinarias: ordParte1 + ordParte2,
      totalReservas: resParte1 + resParte2,
      totalGeneral: ordParte1 + resParte1 + ordParte2 + resParte2,
    };
  }, [
    modoParte1,
    testsOficialesFiltradosPorAmbito,
    testOficialSeleccionadoId,
    ambitoFiltroTestOficial,
    incluirReservasDisponibles,
    completarAutomaticamenteHasta70,
    resumenSeleccion70.total,
    supuestoSeleccionadoId,
    supuestosVisibles,
    supuestosFormato20AGE,
    supuestosDisponibles,
  ]);

  const gruposFiltrados = useMemo(() => {
    return gruposMaterias.filter((g) => {
      if (filtroTipoMateria === 'leyes_boe' && g.esInformatica) return false;
      if (filtroTipoMateria === 'informatica' && !g.esInformatica) return false;
      if (busquedaMateria.trim()) {
        const q = busquedaMateria.toLowerCase().trim();
        return g.nombre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [gruposMaterias, filtroTipoMateria, busquedaMateria]);

  // Reloj cuenta atrás de la prueba unificada
  useEffect(() => {
    if (!simulacroActivo || simulacroFinalizado || relojPausado) return;
    const timer = setInterval(() => {
      setSegundosInvertidos((prev) => prev + 1);
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [simulacroActivo, simulacroFinalizado, relojPausado]);

  const formatearReloj = (totalSegundos: number) => {
    const s = Math.max(0, Math.floor(totalSegundos));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const ajustarTiempoEnCurso = (deltaMinutos: number) => {
    const deltaSeg = deltaMinutos * 60;
    setDuracionMinutos((prev) => Math.max(5, prev + deltaMinutos));
    setSegundosRestantes((prev) => Math.max(60, prev + deltaSeg));
  };

  // Construir e iniciar el Simulacro Oficial Unificado (con hasta 5 preguntas de reserva en el test y hasta 5 en el supuesto si están disponibles)
  const handleIniciarSimulacroOficial = () => {
    let parte1Ordinarias: PreguntaExamen[] = [];
    let parte1Reservas: PreguntaExamen[] = [];
    const clavesUsadas = new Set<string>();
    const leyesAplicadasSet = new Set<string>();
    let etiquetaParte1 = '70 Cuestionario';
    let ambitoGeneral: ConvocatoriaAmbito = 'AGE';

    // 1. Obtener preguntas ordinarias y de reserva (hasta 5) de la 1.ª Parte
    if (modoParte1 === 'test_oficial') {
      const listaCandidatos =
        testsOficialesFiltradosPorAmbito.length > 0
          ? testsOficialesFiltradosPorAmbito
          : testsOficialesCatalogo;

      let testElegido: TestOficialCandidato | undefined;
      if (testOficialSeleccionadoId === 'ALEATORIO_TEST_OFICIAL' || !testOficialSeleccionadoId) {
        const idxRnd = Math.floor(Math.random() * listaCandidatos.length);
        testElegido = listaCandidatos[idxRnd];
      } else {
        testElegido =
          listaCandidatos.find((t) => t.id === testOficialSeleccionadoId) || listaCandidatos[0];
      }

      if (testElegido) {
        const convTestOficial =
          testElegido.categoria === 'test_oficial'
            ? extraerNombreConvocatoriaDesdeExamen({
                id: testElegido.id,
                titulo: testElegido.titulo,
                categoria: testElegido.categoria,
                ambito: testElegido.ambito,
                fecha: testElegido.fecha,
              }) || testElegido.titulo
            : undefined;

        parte1Ordinarias = testElegido.preguntasOrdinarias.map((p) => ({
          ...p,
          convocatoriasAparecida:
            obtenerReferenciaConvocatoriaOficial(p) || convTestOficial || p.convocatoriasAparecida,
        }));
        if (incluirReservasDisponibles && testElegido.preguntasReserva.length > 0) {
          parte1Reservas = testElegido.preguntasReserva.slice(0, 5).map((p) => ({
            ...p,
            convocatoriasAparecida:
              obtenerReferenciaConvocatoriaOficial(p) || convTestOficial || p.convocatoriasAparecida,
          }));
        }
        testElegido.leyes.forEach((l) => leyesAplicadasSet.add(l));
        ambitoGeneral = testElegido.ambito;
        const labelCat = CATEGORIAS_EXAMEN_INFO[testElegido.categoria]?.label || 'Test';
        etiquetaParte1 = `${parte1Ordinarias.length}${
          parte1Reservas.length > 0 ? `+${parte1Reservas.length}R` : ''
        } ${labelCat} ${testElegido.ambito}`;
      } else {
        parte1Ordinarias = preguntasPoolAGE.slice(0, 70);
      }

      parte1Ordinarias.forEach((p) => clavesUsadas.add(normalizarClavePregunta(p.enunciado)));
      parte1Reservas.forEach((p) => clavesUsadas.add(normalizarClavePregunta(p.enunciado)));
    } else {
      // Modo aleatorio por número de preguntas de cada Ley BOE o Tema Oficial de Informática (permite cualquier cantidad)
      const seleccionadasManual: PreguntaExamen[] = [];
      gruposMaterias.forEach((grupo) => {
        const cantSolicitada = Math.max(0, seleccionPorMateria[grupo.nombre] || 0);
        if (cantSolicitada <= 0) return;

        const barajadas = [...grupo.preguntas].sort(() => Math.random() - 0.5);
        let tomadas = 0;
        for (const p of barajadas) {
          if (tomadas >= cantSolicitada) break;
          const k = normalizarClavePregunta(p.enunciado);
          if (!clavesUsadas.has(k)) {
            clavesUsadas.add(k);
            seleccionadasManual.push(p);
            leyesAplicadasSet.add(grupo.nombre);
            tomadas++;
          }
        }

        // Si el usuario solicitó una cantidad mayor que las preguntas disponibles en el grupo, generar las restantes de ese mismo tema o ley
        if (tomadas < cantSolicitada) {
          const faltantes = cantSolicitada - tomadas;
          const extras = generarPreguntasAdicionalesMateria(
            grupo.nombre,
            grupo.esInformatica,
            faltantes,
            grupo.preguntas
          );
          extras.forEach((pExtra) => {
            seleccionadasManual.push(pExtra);
            leyesAplicadasSet.add(grupo.nombre);
          });
        }
      });

      parte1Ordinarias = seleccionadasManual;

      if (
        parte1Ordinarias.length < 70 &&
        (completarAutomaticamenteHasta70 || parte1Ordinarias.length === 0)
      ) {
        const poolRestante = [...todasLasPreguntasUnicas].sort(() => Math.random() - 0.5);
        for (const p of poolRestante) {
          if (parte1Ordinarias.length >= 70) break;
          const k = normalizarClavePregunta(p.enunciado);
          if (!clavesUsadas.has(k)) {
            clavesUsadas.add(k);
            parte1Ordinarias.push(p);
            leyesAplicadasSet.add(obtenerNormaEfectivaDePregunta(p));
          }
        }
      }

      // Añadir hasta 5 preguntas de reserva si están disponibles en el pool
      if (incluirReservasDisponibles) {
        const poolParaReservas = [...reservasPoolGlobal, ...todasLasPreguntasUnicas];
        for (const cand of poolParaReservas) {
          if (parte1Reservas.length >= 5) break;
          const k = normalizarClavePregunta(cand.enunciado);
          if (k && !clavesUsadas.has(k)) {
            clavesUsadas.add(k);
            parte1Reservas.push({
              ...cand,
              esReserva: true,
              numeroReserva: parte1Reservas.length + 1,
            });
          }
        }
      }

      etiquetaParte1 = `${parte1Ordinarias.length}${
        parte1Reservas.length > 0 ? `+${parte1Reservas.length}R` : ''
      } Por Leyes/Temas`;
    }

    // 2. Seleccionar el Supuesto Práctico de 20 preguntas (+ hasta 5 de reserva si las tiene disponibles)
    let supuestoElegido: SupuestoDisponible | null = null;
    if (supuestosDisponibles.length > 0) {
      if (supuestoSeleccionadoId === 'ALEATORIO_AGE_20') {
        const poolSorteo =
          supuestosVisibles.length > 0 ? supuestosVisibles : supuestosFormato20AGE;
        const idxRnd = Math.floor(Math.random() * poolSorteo.length);
        supuestoElegido = poolSorteo[idxRnd];
      } else {
        supuestoElegido =
          supuestosDisponibles.find((s) => s.id === supuestoSeleccionadoId) ||
          supuestosVisibles[0] ||
          supuestosFormato20AGE[0];
      }
    }

    const convSupuestoOficial =
      supuestoElegido && supuestoElegido.categoria === 'supuesto_oficial'
        ? extraerNombreConvocatoriaDesdeExamen({
            id: supuestoElegido.id,
            titulo: supuestoElegido.titulo,
            categoria: supuestoElegido.categoria,
            ambito: supuestoElegido.ambito,
          }) || supuestoElegido.titulo
        : undefined;

    const parte2Ordinarias: PreguntaExamen[] = (
      supuestoElegido
        ? supuestoElegido.preguntasOrdinarias20.slice(0, 20)
        : todasLasPreguntasUnicas.slice(0, 20)
    ).map((p) => ({
      ...p,
      convocatoriasAparecida:
        obtenerReferenciaConvocatoriaOficial(p) || convSupuestoOficial || p.convocatoriasAparecida,
    }));

    const parte2Reservas: PreguntaExamen[] = (
      incluirReservasDisponibles && supuestoElegido && supuestoElegido.preguntasReserva.length > 0
        ? supuestoElegido.preguntasReserva.slice(0, 5)
        : []
    ).map((p) => ({
      ...p,
      convocatoriasAparecida:
        obtenerReferenciaConvocatoriaOficial(p) || convSupuestoOficial || p.convocatoriasAparecida,
    }));

    if (supuestoElegido) {
      supuestoElegido.leyes.forEach((l) => leyesAplicadasSet.add(l));
    }

    // 3. Unificar todas las preguntas (1.ª Parte Ordinarias + 1.ª Parte Reservas + 2.ª Parte Ordinarias + 2.ª Parte Reservas)
    const extendidas: PreguntaSimulacroExtendida[] = [];

    parte1Ordinarias.forEach((p, idx) => {
      extendidas.push({
        ...p,
        id: extendidas.length + 1,
        esReserva: false,
        bloqueSimulacro: 'parte1_ordinaria',
        numeroEnBloque: idx + 1,
        codigoInedita: `P1-${String(idx + 1).padStart(2, '0')}`,
      });
    });

    parte1Reservas.forEach((p, idx) => {
      extendidas.push({
        ...p,
        id: extendidas.length + 1,
        esReserva: true,
        numeroReserva: idx + 1,
        bloqueSimulacro: 'parte1_reserva',
        numeroEnBloque: idx + 1,
        codigoInedita: `P1-RES-${idx + 1}`,
      });
    });

    parte2Ordinarias.forEach((p, idx) => {
      extendidas.push({
        ...p,
        id: extendidas.length + 1,
        esReserva: false,
        bloqueSimulacro: 'parte2_ordinaria',
        numeroEnBloque: idx + 1,
        codigoInedita: `SUP-${String(idx + 1).padStart(2, '0')}`,
      });
    });

    parte2Reservas.forEach((p, idx) => {
      extendidas.push({
        ...p,
        id: extendidas.length + 1,
        esReserva: true,
        numeroReserva: idx + 1,
        bloqueSimulacro: 'parte2_reserva',
        numeroEnBloque: idx + 1,
        codigoInedita: `SUP-RES-${idx + 1}`,
      });
    });

    const duracionSeguraMin = Math.max(10, Math.min(300, Number(duracionMinutos) || 100));
    const fechaHoy = new Date().toISOString().split('T')[0];
    const nombreSupuestoCorto = supuestoElegido
      ? supuestoElegido.titulo.slice(0, 48)
      : 'Supuesto Oficial 20 preg.';

    const etiquetaSupuesto = `20${
      parte2Reservas.length > 0 ? `+${parte2Reservas.length}R` : ''
    } Supuesto ${supuestoElegido?.ambito || 'AGE'}`;

    const tituloFinal =
      tituloSimulacro.trim() ||
      `Simulacro Oficial Unificado (${etiquetaParte1} + ${etiquetaSupuesto} · ${duracionSeguraMin} min)`;

    const nuevoSimulacro: ExamenCompleto = {
      id: `SIMULACRO-OFICIAL-${Date.now()}`,
      titulo: tituloFinal,
      tipo: 'supuesto',
      ambito:
        ambitoGeneral === 'CAM' && supuestoElegido?.ambito === 'CAM'
          ? 'CAM'
          : ambitoGeneral === 'CAM' || supuestoElegido?.ambito === 'CAM'
          ? 'AMBOS'
          : 'AGE',
      origen: 'oficial_json',
      categoria: 'test_oficial',
      soloHistorial: true,
      fecha: fechaHoy,
      contextoCaso:
        supuestoElegido?.contextoCaso ||
        `SUPUESTO PRÁCTICO OFICIAL (${nombreSupuestoCorto}): Resuelva las cuestiones prácticas de la 2.ª parte aplicando la normativa vigente del BOE.`,
      tematicas: [
        'procedimiento_administrativo',
        'regimen_sector_publico',
        'funcion_publica_personal',
      ],
      leyesBOEAplicadas: Array.from(leyesAplicadasSet),
      preguntas: extendidas,
    };

    setPreguntasExtendidasActivas(extendidas);
    setPreguntasAnuladasIndices(new Set());
    setSupuestoActivoInfo(supuestoElegido);
    setSimulacroActivo(nuevoSimulacro);
    setIndicePreguntaActual(0);
    setRespuestasUsuario({});
    setPreguntasDudosas(new Set());
    setSegundosRestantes(duracionSeguraMin * 60);
    setSegundosInvertidos(0);
    setRelojPausado(false);
    setSimulacroFinalizado(false);
    setPreguntaModalJustificacion(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Alternar anulación de una pregunta ordinaria para que sea sustituida por la siguiente reserva disponible de su parte
  const toggleAnularPreguntaOrdinaria = (idx: number) => {
    if (simulacroFinalizado) return;
    const preg = preguntasExtendidasActivas[idx];
    if (!preg || preg.esReserva) return;

    setPreguntasAnuladasIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Calcular qué índices entran efectivamente en la calificación (sustituyendo anuladas por reservas de su mismo bloque)
  const evaluarBloqueConReservas = (
    indicesOrdinarias: number[],
    indicesReservas: number[],
    anuladasSet: Set<number>,
    respuestas: Record<number, string>
  ) => {
    const anuladasEnBloque = indicesOrdinarias.filter((idx) => anuladasSet.has(idx));
    const reservasActivadas = indicesReservas.slice(0, anuladasEnBloque.length);
    const indicesEvaluables = [
      ...indicesOrdinarias.filter((idx) => !anuladasSet.has(idx)),
      ...reservasActivadas,
    ];

    let aciertos = 0;
    let fallos = 0;
    let blancos = 0;

    indicesEvaluables.forEach((idx) => {
      const p = preguntasExtendidasActivas[idx];
      if (!p) return;
      const r = respuestas[idx];
      const corr = p.opciones.find((o) => o.esCorrecta)?.id;
      if (!r) blancos++;
      else if (r === corr) aciertos++;
      else fallos++;
    });

    const pd = Math.max(0, Number((aciertos - fallos / 3).toFixed(2)));
    return {
      aciertos,
      fallos,
      blancos,
      pd,
      totalEvaluadas: indicesEvaluables.length,
      reservasActivadasSet: new Set(reservasActivadas),
    };
  };

  // Marcar o desmarcar respuesta
  const handleSeleccionarOpcion = (idxPregunta: number, letraOpcion: string) => {
    if (simulacroFinalizado) return;
    if (preguntasAnuladasIndices.has(idxPregunta)) return;

    const actual = respuestasUsuario[idxPregunta];
    if (actual === letraOpcion) {
      setRespuestasUsuario((prev) => {
        const copia = { ...prev };
        delete copia[idxPregunta];
        return copia;
      });
      return;
    }

    setRespuestasUsuario((prev) => ({
      ...prev,
      [idxPregunta]: letraOpcion,
    }));

    if (modalidadCorreccion === 'paso_a_paso' && simulacroActivo?.preguntas[idxPregunta]) {
      const preg = simulacroActivo.preguntas[idxPregunta];
      registrarRespuestasEnControlFalladas([preg], { 0: letraOpcion });
      if (onRegistrarResultadoPreguntas) {
        onRegistrarResultadoPreguntas([preg], { 0: letraOpcion });
      }
    }
  };

  const handleDesmarcarPregunta = (idxPregunta: number) => {
    if (simulacroFinalizado) return;
    setRespuestasUsuario((prev) => {
      const copia = { ...prev };
      delete copia[idxPregunta];
      return copia;
    });
  };

  const toggleDudosa = (idxPregunta: number) => {
    setPreguntasDudosas((prev) => {
      const next = new Set(prev);
      if (next.has(idxPregunta)) next.delete(idxPregunta);
      else next.add(idxPregunta);
      return next;
    });
  };

  const solicitarEvaluarSimulacro = () => {
    if (!simulacroActivo || simulacroFinalizado) return;
    setMostrarConfirmarEvaluacion(true);
  };

  // Finalizar y calificar la Prueba Unificada (aplicando sustituciones de reserva si hay preguntas anuladas)
  const handleFinalizarSimulacro = () => {
    if (!simulacroActivo || simulacroFinalizado) return;
    setMostrarConfirmarEvaluacion(false);

    const indicesP1Ord = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte1_ordinaria' ? i : -1))
      .filter((i) => i >= 0);
    const indicesP1Res = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte1_reserva' ? i : -1))
      .filter((i) => i >= 0);
    const indicesP2Ord = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte2_ordinaria' ? i : -1))
      .filter((i) => i >= 0);
    const indicesP2Res = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte2_reserva' ? i : -1))
      .filter((i) => i >= 0);

    const evalP1 = evaluarBloqueConReservas(
      indicesP1Ord,
      indicesP1Res,
      preguntasAnuladasIndices,
      respuestasUsuario
    );
    const evalP2 = evaluarBloqueConReservas(
      indicesP2Ord,
      indicesP2Res,
      preguntasAnuladasIndices,
      respuestasUsuario
    );

    const aciertos = evalP1.aciertos + evalP2.aciertos;
    const fallos = evalP1.fallos + evalP2.fallos;
    const blancos = evalP1.blancos + evalP2.blancos;
    const totalEvaluadas = Math.max(1, evalP1.totalEvaluadas + evalP2.totalEvaluadas);

    const puntuacionDirecta = Math.max(0, Number((aciertos - fallos / 3).toFixed(2)));
    const puntuacionTransformada = Math.max(
      0,
      Number(((puntuacionDirecta / totalEvaluadas) * 100).toFixed(2))
    );

    const fechaAhoraISO = new Date().toISOString();

    // Actualizar control de preguntas falladas: cualquier pregunta respondida y acertada deja de figurar como fallada
    registrarRespuestasEnControlFalladas(
      simulacroActivo.preguntas,
      respuestasUsuario,
      fechaAhoraISO
    );
    if (onRegistrarResultadoPreguntas) {
      onRegistrarResultadoPreguntas(simulacroActivo.preguntas, respuestasUsuario);
    }

    const examenEvaluado: ExamenCompleto = {
      ...simulacroActivo,
      soloHistorial: true,
      resultado: {
        puntuacionDirecta,
        puntuacionTransformada,
        puntuacionMaxima: 100,
        superaCorte: puntuacionTransformada >= 50,
        duracionSegundos: segundosInvertidos,
        aciertos,
        fallos,
        blancos,
        anuladas: preguntasAnuladasIndices.size,
        reservasUsadas: evalP1.reservasActivadasSet.size + evalP2.reservasActivadasSet.size,
        preguntasEvaluadasTotal: totalEvaluadas,
        respuestasUsuario: { ...respuestasUsuario },
        fechaRealizacion: fechaAhoraISO,
      },
    };

    setSimulacroActivo(examenEvaluado);
    setSimulacroFinalizado(true);
    onExamenGuardado(examenEvaluado);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================================
  // VISTA DE EJECUCIÓN CUANDO EL SIMULACRO OFICIAL ESTÁ ACTIVO
  // ============================================================================
  if (simulacroActivo && preguntasExtendidasActivas.length > 0) {
    const totalPreguntas = preguntasExtendidasActivas.length;
    const preguntaActual = preguntasExtendidasActivas[indicePreguntaActual];
    const esPreguntaSupuesto =
      preguntaActual?.bloqueSimulacro === 'parte2_ordinaria' ||
      preguntaActual?.bloqueSimulacro === 'parte2_reserva';
    const respActual = respuestasUsuario[indicePreguntaActual];
    const opcionCorrectaActual = preguntaActual?.opciones.find((o) => o.esCorrecta);
    const mostrarCorreccion =
      simulacroFinalizado || (modalidadCorreccion === 'paso_a_paso' && Boolean(respActual));
    const totalContestadas = Object.keys(respuestasUsuario).length;

    const indicesP1Ord = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte1_ordinaria' ? i : -1))
      .filter((i) => i >= 0);
    const indicesP1Res = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte1_reserva' ? i : -1))
      .filter((i) => i >= 0);
    const indicesP2Ord = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte2_ordinaria' ? i : -1))
      .filter((i) => i >= 0);
    const indicesP2Res = preguntasExtendidasActivas
      .map((p, i) => (p.bloqueSimulacro === 'parte2_reserva' ? i : -1))
      .filter((i) => i >= 0);

    const primerIndiceSupuesto = indicesP2Ord.length > 0 ? indicesP2Ord[0] : 0;

    const evalP1 = evaluarBloqueConReservas(
      indicesP1Ord,
      indicesP1Res,
      preguntasAnuladasIndices,
      respuestasUsuario
    );
    const evalP2 = evaluarBloqueConReservas(
      indicesP2Ord,
      indicesP2Res,
      preguntasAnuladasIndices,
      respuestasUsuario
    );

    const preguntaEnModal =
      preguntaModalJustificacion !== null
        ? preguntasExtendidasActivas[preguntaModalJustificacion]
        : null;
    const respEnModal =
      preguntaModalJustificacion !== null
        ? respuestasUsuario[preguntaModalJustificacion]
        : undefined;
    const opcCorrectaModal = preguntaEnModal?.opciones.find((o) => o.esCorrecta);

    return (
      <div className="space-y-5">
        {/* BARRA SUPERIOR DE CONTROL DEL SIMULACRO OFICIAL UNIFICADO */}
        <div className="bg-indigo-50/90 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center text-lg shadow-xs shrink-0">
              <i className="fa-solid fa-landmark-flag"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono flex items-center gap-1">
                  <i className="fa-solid fa-certificate text-[9px]"></i>
                  <span>Test oficial</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                    AMBITOS_INFO[simulacroActivo.ambito]?.badgeClass || ''
                  }`}
                >
                  {AMBITOS_INFO[simulacroActivo.ambito]?.shortLabel || simulacroActivo.ambito}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  1.ª Parte ({indicesP1Ord.length} ord.
                  {indicesP1Res.length > 0 ? ` + ${indicesP1Res.length} res.` : ''}) + 2.ª Parte
                  Supuesto ({indicesP2Ord.length} ord.
                  {indicesP2Res.length > 0 ? ` + ${indicesP2Res.length} res.` : ''})
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {simulacroActivo.titulo}
              </h2>
            </div>
          </div>

          {/* Controles de Tiempo (100 min modificables en vivo) y Finalización */}
          <div className="flex items-center gap-2.5 flex-wrap w-full xl:w-auto justify-between xl:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <i
                className={`fa-regular fa-clock text-sm ${
                  segundosRestantes < 300
                    ? 'text-rose-600 animate-pulse'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              ></i>
              <div className="text-left">
                <span className="text-[9px] font-mono uppercase text-slate-400 block leading-none">
                  Tiempo Restante ({duracionMinutos}m)
                </span>
                <span
                  className={`font-mono text-xs sm:text-sm font-black ${
                    segundosRestantes < 300
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatearReloj(segundosRestantes)}
                </span>
              </div>

              {!simulacroFinalizado && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => ajustarTiempoEnCurso(-5)}
                    className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                    title="Restar 5 minutos a la duración"
                  >
                    -5m
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarTiempoEnCurso(5)}
                    className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                    title="Añadir 5 minutos a la duración"
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelojPausado((p) => !p)}
                    className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold cursor-pointer"
                    title={relojPausado ? 'Reanudar reloj' : 'Pausar reloj'}
                  >
                    <i className={`fa-solid ${relojPausado ? 'fa-play' : 'fa-pause'}`}></i>
                  </button>
                </div>
              )}
            </div>

            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {totalContestadas} / {totalPreguntas} contestadas
            </span>

            {onExportarExamenPDF && (
              <button
                type="button"
                onClick={() => onExportarExamenPDF(simulacroActivo)}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs font-black shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Exportar Simulacro Oficial completo (1.ª Parte + Supuesto + Reservas) en PDF oficial + Plantilla de hoja de respuestas en blanco"
              >
                <i className="fa-solid fa-file-pdf text-rose-600 dark:text-rose-400"></i>
                <span>Exportar PDF</span>
              </button>
            )}

            {!simulacroFinalizado ? (
              <button
                type="button"
                onClick={solicitarEvaluarSimulacro}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-flag-checkered"></i>
                <span>Evaluar y Calificar Simulacro</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onIrAHistorial}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-table-list"></i>
                  <span>Ver en Historial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimulacroActivo(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Nuevo Simulacro Oficial
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RESUMEN DE CALIFICACIÓN OFICIAL SEGMENTADA */}
        {simulacroFinalizado && simulacroActivo.resultado && (
          <div className="bg-linear-to-br from-indigo-50/90 via-white to-emerald-50/70 dark:from-indigo-950/40 dark:via-slate-800 dark:to-emerald-950/30 border-2 border-indigo-300 dark:border-indigo-700 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/70 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-xs">
                  <i className="fa-solid fa-award"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Acta de Calificación del Simulacro Oficial Unificado
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                        simulacroActivo.resultado.superaCorte
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300'
                      }`}
                    >
                      {simulacroActivo.resultado.superaCorte ? '✔ APTO OFICIAL' : '✗ NO ALCANZA CORTE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Las preguntas acertadas han quedado superadas en el control de fallos.{' '}
                    {preguntasAnuladasIndices.size > 0 &&
                      `Se han sustituido ${preguntasAnuladasIndices.size} preguntas anuladas por sus correspondientes reservas oficiales.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-mono block">
                  1.ª Parte: Cuestionario
                </span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {evalP1.pd.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400">/ {evalP1.totalEvaluadas}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  +{evalP1.aciertos} · -{evalP1.fallos} · {evalP1.blancos}b
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-amber-600 dark:text-amber-400 font-mono block">
                  2.ª Parte: Supuesto (20)
                </span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {evalP2.pd.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400">/ {evalP2.totalEvaluadas}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  +{evalP2.aciertos} · -{evalP2.fallos} · {evalP2.blancos}b
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Puntuación Directa Total
                </span>
                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {simulacroActivo.resultado.puntuacionDirecta.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400">
                    / {evalP1.totalEvaluadas + evalP2.totalEvaluadas}
                  </span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Nota Transformada (PT)
                </span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {simulacroActivo.resultado.puntuacionTransformada.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400">/ 100</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Aciertos / Fallos / Blancos
                </span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-1 block">
                  <span className="text-emerald-600">+{simulacroActivo.resultado.aciertos}</span> /{' '}
                  <span className="text-rose-600">-{simulacroActivo.resultado.fallos}</span> /{' '}
                  <span className="text-slate-400">{simulacroActivo.resultado.blancos}b</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[9.5px] font-black uppercase text-slate-400 font-mono block">
                  Tiempo Invertido
                </span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                  {formatearReloj(simulacroActivo.resultado.duracionSegundos)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  de {duracionMinutos}:00 min
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MAPA NAVEGADOR DE LAS DOS PARTES Y SUS PREGUNTAS DE RESERVA */}
        <div className="bg-sky-50/85 dark:bg-slate-800 border-2 border-sky-300 dark:border-sky-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIndicePreguntaActual(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  !esPreguntaSupuesto
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <i className="fa-solid fa-list-check"></i>
                <span>
                  1.ª Parte: Cuestionario ({indicesP1Ord.length} ord.
                  {indicesP1Res.length > 0 ? ` + ${indicesP1Res.length} reserva` : ''})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIndicePreguntaActual(primerIndiceSupuesto)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  esPreguntaSupuesto
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <i className="fa-solid fa-briefcase"></i>
                <span>
                  2.ª Parte: Supuesto Práctico ({indicesP2Ord.length} ord.
                  {indicesP2Res.length > 0 ? ` + ${indicesP2Res.length} reserva` : ''})
                </span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              {preguntaActual.esReserva ? (
                <strong className="text-purple-600 dark:text-purple-400">
                  Pregunta de Reserva R{preguntaActual.numeroReserva} (
                  {esPreguntaSupuesto ? 'Supuesto' : 'Test 1.ª Parte'})
                </strong>
              ) : (
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {esPreguntaSupuesto
                    ? `2.ª Parte · Supuesto (Preg. ${preguntaActual.numeroEnBloque} de ${indicesP2Ord.length})`
                    : `1.ª Parte · Cuestionario (Preg. ${preguntaActual.numeroEnBloque} de ${indicesP1Ord.length})`}
                </strong>
              )}
            </span>
          </div>

          {/* Rejilla de números de pregunta (Ordinarias + Reservas de Test + Ordinarias Supuesto + Reservas de Supuesto) */}
          <div className="flex items-center gap-1 flex-wrap">
            {preguntasExtendidasActivas.map((p, idx) => {
              const resp = respuestasUsuario[idx];
              const corr = p.opciones.find((o) => o.esCorrecta)?.id;
              const esDudosa = preguntasDudosas.has(idx);
              const esAnulada = preguntasAnuladasIndices.has(idx);
              const evaluada =
                simulacroFinalizado || (modalidadCorreccion === 'paso_a_paso' && Boolean(resp));
              const esDeSupuesto =
                p.bloqueSimulacro === 'parte2_ordinaria' || p.bloqueSimulacro === 'parte2_reserva';

              let estiloBoton = p.esReserva
                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                : esDeSupuesto
                ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

              if (esAnulada) {
                estiloBoton =
                  'bg-slate-300 dark:bg-slate-700 text-slate-500 line-through border-slate-400 opacity-60';
              } else if (evaluada && resp) {
                estiloBoton =
                  resp === corr
                    ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                    : 'bg-rose-600 text-white border-rose-700 font-black';
              } else if (resp) {
                estiloBoton = p.esReserva
                  ? 'bg-purple-600 text-white border-purple-700 font-black'
                  : esDeSupuesto
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                  : 'bg-indigo-600 text-white border-indigo-700 font-black';
              }

              const mostrarSeparadorReservaP1 =
                p.bloqueSimulacro === 'parte1_reserva' && p.numeroEnBloque === 1;
              const mostrarSeparadorSupuesto =
                p.bloqueSimulacro === 'parte2_ordinaria' && p.numeroEnBloque === 1;
              const mostrarSeparadorReservaP2 =
                p.bloqueSimulacro === 'parte2_reserva' && p.numeroEnBloque === 1;

              return (
                <React.Fragment key={idx}>
                  {mostrarSeparadorReservaP1 && (
                    <span className="px-2 py-0.5 text-[9.5px] font-mono font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-md border border-purple-300 dark:border-purple-800 mx-1">
                      Reserva Test ({indicesP1Res.length}):
                    </span>
                  )}
                  {mostrarSeparadorSupuesto && (
                    <span className="px-2 py-0.5 text-[9.5px] font-mono font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md border border-amber-300 dark:border-amber-800 mx-1">
                      Supuesto ({indicesP2Ord.length}):
                    </span>
                  )}
                  {mostrarSeparadorReservaP2 && (
                    <span className="px-2 py-0.5 text-[9.5px] font-mono font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-md border border-purple-300 dark:border-purple-800 mx-1">
                      Reserva Sup. ({indicesP2Res.length}):
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIndicePreguntaActual(idx)}
                    className={`h-7 min-w-7 px-1.5 rounded-lg border text-[11px] font-mono transition-all cursor-pointer relative ${estiloBoton} ${
                      indicePreguntaActual === idx
                        ? 'ring-2 ring-offset-1 ring-indigo-500 scale-105'
                        : ''
                    }`}
                    title={
                      p.esReserva
                        ? `Pregunta de Reserva R${p.numeroReserva} (${
                            esDeSupuesto ? 'Supuesto' : 'Test'
                          })`
                        : `Pregunta Ordinaria #${p.numeroEnBloque}`
                    }
                  >
                    {p.esReserva ? `R${p.numeroReserva}` : p.numeroEnBloque}
                    {esDudosa && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white"></span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* RELATO FÁCTICO DEL SUPUESTO PRÁCTICO */}
        {(esPreguntaSupuesto || simulacroActivo.contextoCaso) && (
          <div
            className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
              esPreguntaSupuesto
                ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono text-[10px] font-black uppercase">
                  2.ª Parte · Supuesto Práctico (20 ord.
                  {indicesP2Res.length > 0 ? ` + ${indicesP2Res.length} reserva` : ''})
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {supuestoActivoInfo?.titulo || 'Relato Fáctico del Caso Administrativo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarRelatoSupuestoEnPregunta((prev) => !prev)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <i
                  className={`fa-solid ${
                    mostrarRelatoSupuestoEnPregunta ? 'fa-chevron-up' : 'fa-chevron-down'
                  } text-[10px]`}
                ></i>
                <span>
                  {mostrarRelatoSupuestoEnPregunta ? 'Ocultar enunciado del supuesto' : 'Ver enunciado del supuesto'}
                </span>
              </button>
            </div>

            {mostrarRelatoSupuestoEnPregunta && (
              <div className="mt-3 pt-3 border-t border-amber-200/70 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                {simulacroActivo.contextoCaso}
              </div>
            )}
          </div>
        )}

        {/* TARJETA DE LA PREGUNTA ACTUAL */}
        {preguntaActual && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                  {preguntaActual.esReserva
                    ? `PREGUNTA DE RESERVA R${preguntaActual.numeroReserva}`
                    : `PREGUNTA #${preguntaActual.numeroEnBloque}`}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black border ${
                    preguntaActual.esReserva
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                      : esPreguntaSupuesto
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  {preguntaActual.esReserva
                    ? `RESERVA OFICIAL R${preguntaActual.numeroReserva} (${
                        esPreguntaSupuesto ? 'SUPUESTO' : 'TEST 1.ª PARTE'
                      })`
                    : esPreguntaSupuesto
                    ? `SUPUESTO · PREG. ${preguntaActual.numeroEnBloque} DE ${indicesP2Ord.length}`
                    : `1.ª PARTE · PREG. ${preguntaActual.numeroEnBloque} DE ${indicesP1Ord.length}`}
                </span>

                {(() => {
                  const refConvSim = obtenerReferenciaConvocatoriaOficial(preguntaActual, simulacroActivo);
                  if (refConvSim) {
                    return (
                      <span
                        className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-mono font-black flex items-center gap-1.5"
                        title={`Pregunta procedente de convocatoria oficial: ${refConvSim}`}
                      >
                        <i className="fa-solid fa-landmark-flag text-amber-600 dark:text-amber-400 text-[9px]"></i>
                        <span>{formatearBadgeConvocatoriaOficial(refConvSim)}</span>
                      </span>
                    );
                  }
                  return (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-black flex items-center gap-1">
                      <i className="fa-solid fa-shield-halved text-[9px]"></i>
                      <span>100% INÉDITA · {preguntaActual.codigoInedita}</span>
                    </span>
                  );
                })()}

                {respActual && !simulacroFinalizado && (
                  <button
                    type="button"
                    onClick={() => handleDesmarcarPregunta(indicePreguntaActual)}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-600 border border-slate-300 dark:border-slate-600 text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <i className="fa-solid fa-eraser text-[9px]"></i>
                    <span>DESMARCAR ({respActual})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleDudosa(indicePreguntaActual)}
                  className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    preguntasDudosas.has(indicePreguntaActual)
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-400 font-black'
                      : 'bg-amber-50/60 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-slate-700 hover:bg-amber-100'
                  }`}
                >
                  <i className="fa-regular fa-flag text-[9px]"></i>
                  <span>{preguntasDudosas.has(indicePreguntaActual) ? 'DUDOSA MARCADA' : 'Dudosa'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {!preguntaActual.esReserva && !simulacroFinalizado && (
                  <button
                    type="button"
                    onClick={() => toggleAnularPreguntaOrdinaria(indicePreguntaActual)}
                    className={`px-2.5 py-0.5 rounded-md border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      preguntasAnuladasIndices.has(indicePreguntaActual)
                        ? 'bg-rose-600 text-white border-rose-700 font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                    title="Anular pregunta ordinaria para que sea sustituida por la siguiente pregunta de reserva disponible"
                  >
                    <i className="fa-solid fa-ban text-[9px]"></i>
                    <span>
                      {preguntasAnuladasIndices.has(indicePreguntaActual)
                        ? 'ANULADA (Sustituida por Reserva)'
                        : 'Marcar como ANULADA (Tribunal)'}
                    </span>
                  </button>
                )}

                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold">
                  {obtenerNormaEfectivaDePregunta(preguntaActual, simulacroActivo)}
                </span>
              </div>
            </div>

            {/* Enunciado */}
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
              {preguntaActual.enunciado}
            </p>

            {/* Opciones A, B, C, D (altura invariable, colores atenuados, visado verde ✓ y aspa roja ✗) */}
            <div className="space-y-2.5 pt-1">
              {preguntaActual.opciones.map((opc) => {
                const seleccionada = respActual === opc.id;
                let claseCaja =
                  'border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70 hover:bg-indigo-50/40 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200';
                let claseLetra =
                  'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200';
                let indicadorDerecha: React.ReactNode = null;

                if (mostrarCorreccion) {
                  if (opc.esCorrecta) {
                    claseCaja =
                      'border-emerald-300/85 dark:border-emerald-800/70 bg-emerald-50/45 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100';
                    claseLetra =
                      'bg-emerald-100/85 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
                    indicadorDerecha = (
                      <span
                        className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                        title="Respuesta acertada / correcta"
                      >
                        <i className="fa-solid fa-check text-xs"></i>
                      </span>
                    );
                  } else if (seleccionada && !opc.esCorrecta) {
                    claseCaja =
                      'border-rose-300/85 dark:border-rose-800/70 bg-rose-50/45 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100';
                    claseLetra =
                      'bg-rose-100/85 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200';
                    indicadorDerecha = (
                      <span
                        className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                        title="Respuesta incorrecta"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </span>
                    );
                  } else {
                    claseCaja =
                      'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400';
                  }
                } else if (seleccionada) {
                  claseCaja =
                    'border-indigo-400 dark:border-indigo-600 bg-indigo-50/55 dark:bg-indigo-950/35 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-400/50';
                  claseLetra = 'bg-indigo-600 border border-indigo-600 text-white';
                  indicadorDerecha = (
                    <span
                      className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"
                      title="Opción seleccionada"
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                    </span>
                  );
                }

                return (
                  <div
                    key={opc.id}
                    onClick={() => handleSeleccionarOpcion(indicePreguntaActual, opc.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-3 ${claseCaja}`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${claseLetra}`}
                      >
                        {opc.id}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-snug block py-0.5">
                        {opc.texto}
                      </span>
                    </div>
                    <span className="h-6 w-6 shrink-0 mt-0.5 flex items-center justify-center">
                      {indicadorDerecha}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Navegación Anterior / Siguiente + Acceso a Ventana Justificación sin variar altura */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={indicePreguntaActual === 0}
                onClick={() => setIndicePreguntaActual((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 border border-slate-300 dark:border-slate-600 disabled:opacity-40 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-2">
                {mostrarCorreccion && (
                  <button
                    type="button"
                    onClick={() => setPreguntaModalJustificacion(indicePreguntaActual)}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Abrir Ventana Justificación Oficial BOE"
                  >
                    <i className="fa-solid fa-scale-balanced text-amber-600 dark:text-amber-400"></i>
                    <span>Justificación</span>
                  </button>
                )}
                {!esPreguntaSupuesto && primerIndiceSupuesto > 0 && (
                  <button
                    type="button"
                    onClick={() => setIndicePreguntaActual(primerIndiceSupuesto)}
                    className="px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold cursor-pointer"
                  >
                    Ir al Supuesto
                  </button>
                )}

                {indicePreguntaActual < totalPreguntas - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setIndicePreguntaActual((prev) => Math.min(totalPreguntas - 1, prev + 1))
                    }
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Siguiente</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>
                ) : !simulacroFinalizado ? (
                  <button
                    type="button"
                    onClick={solicitarEvaluarSimulacro}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-flag-checkered"></i>
                    <span>Evaluar Simulacro</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE JUSTIFICACIÓN OFICIAL BOE (50% / 50%) */}
        {preguntaEnModal && preguntaModalJustificacion !== null && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[11px] font-black uppercase">
                    JUSTIFICACIÓN OFICIAL BOE
                  </span>
                  {(() => {
                    const refConvModalSim = obtenerReferenciaConvocatoriaOficial(
                      preguntaEnModal,
                      simulacroActivo
                    );
                    if (refConvModalSim) {
                      return (
                        <span className="px-2.5 py-0.5 rounded bg-amber-300 text-slate-950 font-mono text-[11px] font-black uppercase flex items-center gap-1">
                          <i className="fa-solid fa-landmark-flag text-[10px]"></i>
                          <span>{formatearBadgeConvocatoriaOficial(refConvModalSim)}</span>
                        </span>
                      );
                    }
                    return (
                      <span className="px-2.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono text-[11px] font-black uppercase flex items-center gap-1">
                        <i className="fa-solid fa-shield-halved text-[10px]"></i>
                        <span>Inédita: {preguntaEnModal.codigoInedita}</span>
                      </span>
                    );
                  })()}
                  <span className="text-sm font-black">
                    {obtenerNormaEfectivaDePregunta(preguntaEnModal, simulacroActivo)} ·{' '}
                    {preguntaEnModal.justificacionLegal?.articulo || 'Precepto aplicable'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={obtenerUrlBOEParaNorma(
                      obtenerNormaEfectivaDePregunta(preguntaEnModal, simulacroActivo)
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5"
                  >
                    <span>Abrir en BOE</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreguntaModalJustificacion(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 text-[13.5px]">
                <div className="lg:col-span-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase">
                      {preguntaEnModal.esReserva
                        ? `PREGUNTA DE RESERVA R${preguntaEnModal.numeroReserva}`
                        : `PREGUNTA #${preguntaEnModal.numeroEnBloque}`}
                    </span>
                    <p className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      {preguntaEnModal.enunciado}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {preguntaEnModal.opciones.map((op) => {
                      const marcada = respEnModal === op.id;
                      return (
                        <div
                          key={op.id}
                          className={`p-3 rounded-xl border ${
                            op.esCorrecta
                              ? 'border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                              : marcada
                              ? 'border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/40'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              <strong className="font-mono mr-1.5">{op.id})</strong>
                              {op.texto}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-black shrink-0 ${
                                op.esCorrecta
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {op.esCorrecta ? '✓ CONFORME A LEY' : 'DISTRACTOR'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2">
                    <span className="text-xs font-mono font-black uppercase text-amber-900 dark:text-amber-300 block">
                      1. ARGUMENTACIÓN LEGAL Y FUNDAMENTACIÓN BOE
                    </span>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">
                      {renderizarTextoConEnlacesBOE(
                        preguntaEnModal.justificacionLegal?.fundamento ||
                          opcCorrectaModal?.texto ||
                          'Fundamento verificado con la normativa oficial.'
                      )}
                    </p>
                    <GestorRecursosArgumentacionPregunta
                      enunciadoPregunta={preguntaEnModal.enunciado}
                      recursosIniciales={preguntaEnModal.recursosArgumentacion}
                      onActualizarRecursos={(nuevosRecursos) => {
                        const preguntaActualizada: PreguntaExamen = {
                          ...preguntaEnModal,
                          recursosArgumentacion: nuevosRecursos,
                        };
                        setPreguntasExtendidasActivas((prev) =>
                          prev.map((p) =>
                            p.enunciado === preguntaEnModal.enunciado
                              ? { ...p, recursosArgumentacion: nuevosRecursos }
                              : p
                          )
                        );
                        if (onActualizarPreguntaGlobal) {
                          onActualizarPreguntaGlobal(preguntaActualizada);
                        }
                      }}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                        Catalogación Normativa / Informática
                      </span>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {obtenerNormaEfectivaDePregunta(preguntaEnModal, simulacroActivo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreguntaParaSelectorLeyes(preguntaEnModal)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold cursor-pointer"
                      >
                        + Vincular leyes
                      </button>
                      {onGuardarEnAlmacenDudas && (
                        <button
                          type="button"
                          onClick={() => {
                            onGuardarEnAlmacenDudas({
                              id: `DUDA-SIM-${Date.now()}`,
                              preguntaId: preguntaEnModal.id,
                              examenId: simulacroActivo.id,
                              examenTitulo: simulacroActivo.titulo,
                              tipo: 'pregunta_relevante',
                              enunciado: preguntaEnModal.enunciado,
                              opciones: preguntaEnModal.opciones,
                              respuestaCorrecta: opcCorrectaModal?.id || 'A',
                              respuestaUsuario: respEnModal,
                              justificacionLegal: preguntaEnModal.justificacionLegal,
                              reglaMnemotecnica: preguntaEnModal.reglaMnemotecnica || '',
                              leyesRelacionadas: [
                                obtenerNormaEfectivaDePregunta(preguntaEnModal, simulacroActivo),
                              ],
                              esFallada: Boolean(respEnModal && respEnModal !== opcCorrectaModal?.id),
                              resuelta: respEnModal === opcCorrectaModal?.id,
                              fechaCreacion: new Date().toISOString(),
                              fechaActualizacion: new Date().toISOString(),
                              origen: 'justificacion',
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                        >
                          + Guardar en Almacén
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {preguntaParaSelectorLeyes && (
          <SelectorLeyesEInformaticaModal
            isOpen={true}
            onClose={() => setPreguntaParaSelectorLeyes(null)}
            seleccionadasIniciales={
              preguntaParaSelectorLeyes.leyesRelacionadas &&
              preguntaParaSelectorLeyes.leyesRelacionadas.length > 0
                ? preguntaParaSelectorLeyes.leyesRelacionadas
                : [obtenerNormaEfectivaDePregunta(preguntaParaSelectorLeyes, simulacroActivo)]
            }
            onGuardar={(nuevasLeyes) => {
              const nuevaNorma =
                nuevasLeyes[0] ||
                obtenerNormaEfectivaDePregunta(preguntaParaSelectorLeyes, simulacroActivo);
              const actualizada: PreguntaExamen = {
                ...preguntaParaSelectorLeyes,
                leyesRelacionadas: nuevasLeyes,
                justificacionLegal: {
                  ...(preguntaParaSelectorLeyes.justificacionLegal || {
                    articulo: 'Precepto aplicable',
                    fundamento: '',
                  }),
                  norma: nuevaNorma,
                },
              };
              setPreguntasExtendidasActivas((prev) =>
                prev.map((p) =>
                  p.enunciado === preguntaParaSelectorLeyes.enunciado
                    ? { ...p, ...actualizada }
                    : p
                )
              );
              if (onActualizarPreguntaGlobal) {
                onActualizarPreguntaGlobal(actualizada);
              }
              setPreguntaParaSelectorLeyes(null);
            }}
          />
        )}

        {/* CUADRO DE NOTIFICACIÓN ANTES DE EVALUAR EL SIMULACRO OFICIAL */}
        {mostrarConfirmarEvaluacion && (
          <ConfirmarEvaluacionModal
            isOpen={mostrarConfirmarEvaluacion}
            tituloExamen={simulacroActivo.titulo}
            tipoPruebaLabel="Simulacro Oficial 70+20"
            preguntasResumen={preguntasExtendidasActivas.map((p, idx) => ({
              indice: idx,
              etiqueta:
                p.bloqueSimulacro === 'parte1_reserva'
                  ? `1ªP-R${p.numeroEnBloque}`
                  : p.bloqueSimulacro === 'parte2_reserva'
                  ? `Sup-R${p.numeroEnBloque}`
                  : p.bloqueSimulacro === 'parte2_ordinaria'
                  ? `Sup-${p.numeroEnBloque}`
                  : `${p.numeroEnBloque}`,
              respondida: Boolean(respuestasUsuario[idx]),
              dudosa: preguntasDudosas.has(idx),
              esReserva: p.esReserva,
            }))}
            onVolverAlTest={() => setMostrarConfirmarEvaluacion(false)}
            onConfirmarEvaluar={handleFinalizarSimulacro}
            onIrAPregunta={(idx) => setIndicePreguntaActual(idx)}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // VISTA DE CONFIGURACIÓN DEL SIMULACRO OFICIAL
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* CABECERA PRINCIPAL DE SIMULACRO OFICIAL */}
      <div className="bg-linear-to-r from-indigo-50/90 via-white to-amber-50/60 dark:from-indigo-950/40 dark:via-slate-800 dark:to-amber-950/25 border-2 border-indigo-200/90 dark:border-indigo-900/70 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
            <i className="fa-solid fa-landmark-flag"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${CATEGORIAS_EXAMEN_INFO.test_oficial.bgBadge} ${CATEGORIAS_EXAMEN_INFO.test_oficial.textBadge} ${CATEGORIAS_EXAMEN_INFO.test_oficial.borderBadge}`}
              >
                <i className={`fa-solid ${CATEGORIAS_EXAMEN_INFO.test_oficial.icon} text-[9px]`}></i>
                <span>Todas las Categorías y Ámbitos habilitados</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                1.ª Parte ({resumenConfiguracionActual.ordParte1} ord.
                {resumenConfiguracionActual.resParte1 > 0
                  ? ` + ${resumenConfiguracionActual.resParte1} reserva`
                  : ''}
                ) + 2.ª Parte Supuesto (20 ord.
                {resumenConfiguracionActual.resParte2 > 0
                  ? ` + ${resumenConfiguracionActual.resParte2} reserva`
                  : ''}
                ) · {duracionMinutos} Minutos
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              Configurador de Simulacro Oficial Unificado
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-3xl">
              Selecciona cualquier test filtrando por{' '}
              <strong>Categoría (Oficial, Academia, IA o Todas)</strong> y{' '}
              <strong>Ámbito (AGE 70 preg. / Madrid CAM 40 preg.)</strong> —o configura un test aleatorio
              con cualquier cantidad de preguntas por Ley BOE o Tema Oficial de Informática—, y combina un{' '}
              <strong>Supuesto Práctico de 20 preguntas</strong> filtrando también por Categoría y Ámbito.
            </p>
          </div>
        </div>

        {/* Indicadores de estado de la configuración */}
        <div className="flex items-center gap-2.5 self-stretch lg:self-center flex-wrap">
          <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-center shadow-2xs">
            <span className="text-[9.5px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 block">
              1.ª Parte + Reserva
            </span>
            <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
              {resumenConfiguracionActual.ordParte1}
              {resumenConfiguracionActual.resParte1 > 0 && (
                <span className="text-xs text-purple-600 dark:text-purple-400 ml-1">
                  +{resumenConfiguracionActual.resParte1}R
                </span>
              )}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-center shadow-2xs">
            <span className="text-[9.5px] font-mono font-black uppercase text-amber-600 dark:text-amber-400 block">
              2.ª Parte Supuesto + Reserva
            </span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              20
              {resumenConfiguracionActual.resParte2 > 0 && (
                <span className="text-xs text-purple-600 dark:text-purple-400 ml-1">
                  +{resumenConfiguracionActual.resParte2}R
                </span>
              )}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-center shadow-2xs">
            <span className="text-[9.5px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 block">
              Duración Unificada
            </span>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {duracionMinutos} min
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (8/12): 1.ª PARTE + 2.ª PARTE */}
        <div className="xl:col-span-8 space-y-6">
          {/* ========================================================================== */}
          {/* PASO 1: CONFIGURAR LA 1.ª PARTE (TODAS LAS CATEGORÍAS + ÁMBITO O ALEATORIO POR LEYES/TEMAS) */}
          {/* ========================================================================== */}
          <div className="bg-indigo-50/55 dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b-2 border-indigo-200/80 dark:border-slate-700 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-black uppercase">
                    1.ª PARTE · CUESTIONARIO TEÓRICO
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Selección de Test (por Categoría y Ámbito) o Aleatorio por Leyes y Temas Oficiales
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Elige cualquier test filtrando por <strong>Categoría (Oficial, Academia, IA o Todas)</strong> y{' '}
                  <strong>Ámbito (AGE 70 preg. / CAM 40 preg.)</strong>, o configura uno aleatorio con cualquier cantidad de preguntas de cada ley o tema oficial de informática.
                </p>
              </div>
            </div>

            {/* Selector de 2 pestañas: 1) Por Categoría y Ámbito | 2) Aleatorio por nº de preguntas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModoParte1('test_oficial')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  modoParte1 === 'test_oficial'
                    ? 'border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 hover:border-indigo-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border flex items-center gap-1 ${CATEGORIAS_EXAMEN_INFO.test_oficial.bgBadge} ${CATEGORIAS_EXAMEN_INFO.test_oficial.textBadge} ${CATEGORIAS_EXAMEN_INFO.test_oficial.borderBadge}`}
                    >
                      <i className={`fa-solid ${CATEGORIAS_EXAMEN_INFO.test_oficial.icon} text-[9px]`}></i>
                      <span>Todas las Categorías</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      + Filtro Ámbito (AGE 70 / CAM 40)
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Seleccionar Test por Categoría y Ámbito
                  </h4>
                </div>
                {modoParte1 === 'test_oficial' && (
                  <i className="fa-solid fa-circle-check text-indigo-600 dark:text-indigo-400 text-base shrink-0"></i>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModoParte1('personalizado_por_ley')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  modoParte1 === 'personalizado_por_ley'
                    ? 'border-2 border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 hover:border-emerald-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-black uppercase">
                      🎛️ Aleatorio por Nº Preguntas
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      Cantidad libre + 5 reserva
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Aleatorio por Número de Preguntas por Ley o Tema
                  </h4>
                </div>
                {modoParte1 === 'personalizado_por_ley' && (
                  <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-base shrink-0"></i>
                )}
              </button>
            </div>

            {/* MODO A: SELECCIÓN MEDIANTE FILTROS DE CATEGORÍA (TODAS LAS CATEGORÍAS) Y ÁMBITO */}
            {modoParte1 === 'test_oficial' && (
              <div className="space-y-3.5 pt-1">
                {/* Barra de filtros por Categoría (todas disponibles) y Ámbito */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase font-mono text-slate-500">
                      Categoría:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CATEGORIAS_TEST_FILTRO.map((cat) => {
                        const activo = categoriaFiltroTest === cat.id;
                        const infoCat =
                          cat.id !== 'todas' ? CATEGORIAS_EXAMEN_INFO[cat.id] : null;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setCategoriaFiltroTest(cat.id);
                              setTestOficialSeleccionadoId('ALEATORIO_TEST_OFICIAL');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              activo
                                ? infoCat
                                  ? `${infoCat.bgBadge} ${infoCat.textBadge} ${infoCat.borderBadge} ring-2 ring-indigo-500/30 font-black shadow-2xs`
                                  : 'bg-indigo-600 text-white border-indigo-700 font-black shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <i className={`fa-solid ${cat.icon} text-[10px]`}></i>
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/70 dark:border-slate-800">
                    <span className="text-[11px] font-black uppercase font-mono text-slate-500">
                      Ámbito:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {AMBITOS_LISTA.map((amb) => {
                        const info = AMBITOS_INFO[amb.id];
                        const activo = ambitoFiltroTestOficial === amb.id;
                        return (
                          <button
                            key={amb.id}
                            type="button"
                            onClick={() => {
                              setAmbitoFiltroTestOficial(amb.id);
                              setTestOficialSeleccionadoId('ALEATORIO_TEST_OFICIAL');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              activo
                                ? `${info.badgeClass} ring-2 ring-indigo-500/30 font-black shadow-2xs`
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <i className={`fa-solid ${info.icon} text-[10px]`}></i>
                            <span>
                              {amb.id === 'AGE'
                                ? `${info.shortLabel} (70 preg.)`
                                : amb.id === 'CAM'
                                ? `${info.shortLabel} (40 preg.)`
                                : `${info.shortLabel} (Todos)`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Listado de Tests filtrados por Categoría y Ámbito (pudiendo modificar Categoría y Ámbito en cada tarjeta) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {/* Tarjeta para elegir uno al azar dentro de la Categoría y Ámbito seleccionados */}
                  <div
                    onClick={() => setTestOficialSeleccionadoId('ALEATORIO_TEST_OFICIAL')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      testOficialSeleccionadoId === 'ALEATORIO_TEST_OFICIAL'
                        ? 'border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-indigo-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border inline-flex items-center gap-1 ${
                            categoriaFiltroTest !== 'todas'
                              ? `${CATEGORIAS_EXAMEN_INFO[categoriaFiltroTest].bgBadge} ${CATEGORIAS_EXAMEN_INFO[categoriaFiltroTest].textBadge} ${CATEGORIAS_EXAMEN_INFO[categoriaFiltroTest].borderBadge}`
                              : `${CATEGORIAS_EXAMEN_INFO.test_oficial.bgBadge} ${CATEGORIAS_EXAMEN_INFO.test_oficial.textBadge} ${CATEGORIAS_EXAMEN_INFO.test_oficial.borderBadge}`
                          }`}
                        >
                          <i
                            className={`fa-solid ${
                              categoriaFiltroTest !== 'todas'
                                ? CATEGORIAS_EXAMEN_INFO[categoriaFiltroTest].icon
                                : 'fa-layer-group'
                            }`}
                          ></i>
                          <span>
                            {categoriaFiltroTest !== 'todas'
                              ? CATEGORIAS_EXAMEN_INFO[categoriaFiltroTest].label
                              : 'Todas las categorías'}
                          </span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border ${AMBITOS_INFO[ambitoFiltroTestOficial].badgeClass}`}
                        >
                          🎲 Al azar · {AMBITOS_INFO[ambitoFiltroTestOficial].shortLabel}
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white">
                        Seleccionar al azar un Test ({testsOficialesFiltradosPorAmbito.length} disp.) ·{' '}
                        {AMBITOS_INFO[ambitoFiltroTestOficial].label}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Formato oficial:{' '}
                        <strong>
                          {ambitoFiltroTestOficial === 'CAM' ? '40 preguntas' : '70 preguntas'} + hasta 5 de reserva disponibles
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  {testsOficialesFiltradosPorAmbito.map((test) => {
                    const activo = testOficialSeleccionadoId === test.id;
                    const infoAmbito = AMBITOS_INFO[test.ambito];
                    const infoCat =
                      CATEGORIAS_EXAMEN_INFO[test.categoria] || CATEGORIAS_EXAMEN_INFO.test_oficial;
                    return (
                      <div
                        key={test.id}
                        onClick={() => setTestOficialSeleccionadoId(test.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          activo
                            ? 'border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-indigo-400'
                        }`}
                      >
                        <div className="space-y-1.5">
                          {/* Selectores directos de Categoría y de Ámbito */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center"
                            >
                              <select
                                value={test.categoria}
                                onChange={(e) =>
                                  handleCambiarCategoriaDesdeTarjeta(
                                    test.id,
                                    e.target.value as CategoriaExamen
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border cursor-pointer focus:outline-none ${infoCat.bgBadge} ${infoCat.textBadge} ${infoCat.borderBadge}`}
                                title="Modificar categoría del test"
                              >
                                <option value="test_oficial">Test oficial</option>
                                <option value="test_academia">Test de academia</option>
                                <option value="test_ia">Test aleatorio (IA)</option>
                              </select>
                            </div>

                            {/* Desplegable para modificar directamente la etiqueta de ámbito de este test */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center"
                            >
                              <select
                                value={test.ambito}
                                onChange={(e) =>
                                  handleCambiarAmbitoDesdeTarjeta(
                                    test.id,
                                    e.target.value as ConvocatoriaAmbito
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border cursor-pointer focus:outline-none ${infoAmbito.badgeClass}`}
                                title="Modificar etiqueta de ámbito del test (AGE 70 preg. / CAM 40 preg.)"
                              >
                                <option value="AGE">AGE C1 (70 preg.)</option>
                                <option value="CAM">Madrid C1 (40 preg.)</option>
                                <option value="AMBOS">AGE/Madrid</option>
                              </select>
                            </div>
                          </div>

                          <h5 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                            {test.titulo}
                          </h5>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-black text-indigo-700 dark:text-indigo-300">
                            {test.preguntasOrdinarias.length} ord.
                            {test.preguntasReserva.length > 0 && (
                              <span className="text-purple-600 dark:text-purple-400">
                                {' '}
                                + {test.preguntasReserva.length} reserva
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            {test.leyes.slice(0, 2).join(' · ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODO B: ALEATORIO POR NÚMERO DE PREGUNTAS POR LEY O TEMA OFICIAL DE INFORMÁTICA (CUALQUIER CANTIDAD) */}
            {modoParte1 === 'personalizado_por_ley' && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Indica cualquier cantidad de preguntas de cada Ley BOE o Tema Oficial de Informática (8 AGE + 2 CAM):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => aplicarRepartoProporcional70(gruposMaterias, 'oficial_equilibrado')}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-2xs"
                    >
                      ⚡ Reparto Oficial (70)
                    </button>
                    <button
                      type="button"
                      onClick={handleCompletarRestantesHasta70}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-2xs"
                    >
                      🎯 Ajustar a 70 exactas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeleccionPorMateria({})}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 text-slate-700 dark:text-slate-200 hover:text-rose-600 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Poner a 0
                    </button>
                  </div>
                </div>

                {/* Barra de progreso de preguntas seleccionadas */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-slate-800 dark:text-slate-100">
                        Seleccionadas:{' '}
                        <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                          {resumenSeleccion70.total}
                        </strong>{' '}
                        preguntas
                        {resumenConfiguracionActual.resParte1 > 0 && (
                          <span className="text-purple-600 dark:text-purple-400 font-mono ml-1.5">
                            (+{resumenConfiguracionActual.resParte1} de reserva)
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Leyes BOE: {resumenSeleccion70.totalLeyes} preg.
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        Informática (10 Temas Oficiales): {resumenSeleccion70.totalInformatica} preg.
                      </span>
                    </div>

                    {resumenSeleccion70.total !== 70 && (
                      <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {resumenSeleccion70.total < 70
                          ? completarAutomaticamenteHasta70
                            ? `Faltan ${70 - resumenSeleccion70.total} preg. para 70 (se completarán hasta 70)`
                            : `Se realizará con las ${resumenSeleccion70.total} preg. seleccionadas`
                          : `Se incluirán las ${resumenSeleccion70.total} preg. seleccionadas`}
                      </span>
                    )}
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        resumenSeleccion70.total === 70
                          ? 'bg-emerald-500'
                          : resumenSeleccion70.total > 70
                          ? 'bg-indigo-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, (resumenSeleccion70.total / 70) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Filtros por tipo (Todas / Solo Leyes BOE / Solo Temas Oficiales de Informática) y Buscador */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFiltroTipoMateria('todas')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filtroTipoMateria === 'todas'
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Todas ({gruposMaterias.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipoMateria('leyes_boe')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filtroTipoMateria === 'leyes_boe'
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Solo Leyes BOE ({gruposMaterias.filter((g) => !g.esInformatica).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipoMateria('informatica')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filtroTipoMateria === 'informatica'
                          ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Solo Temas Oficiales Informática ({gruposMaterias.filter((g) => g.esInformatica).length})
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input
                      type="text"
                      value={busquedaMateria}
                      onChange={(e) => setBusquedaMateria(e.target.value)}
                      placeholder="Buscar ley (ej. Ley 39/2015, TREBEP, 2/2012) o tema oficial de informática (Tema 1..10)..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Listado de Leyes y Temas Oficiales de Informática con selector numérico sin límite y disponibles junto al nombre */}
                <div className="max-h-96 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {gruposFiltrados.map((grupo) => {
                    const cantidadActual = seleccionPorMateria[grupo.nombre] || 0;
                    const maxDisp = grupo.preguntas.length;
                    const activa = cantidadActual > 0;

                    return (
                      <div
                        key={grupo.nombre}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          activa
                            ? 'border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase ${
                                grupo.esInformatica
                                  ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {grupo.esInformatica ? 'TEMA OFICIAL INFORMÁTICA' : 'LEY BOE'}
                            </span>
                          </div>
                          <p
                            className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug"
                            title={`${grupo.nombre} (${maxDisp} disponibles en banco)`}
                          >
                            <span>{grupo.nombre}</span>{' '}
                            <span className="inline-block font-mono text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">
                              ({maxDisp} disp.)
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidadMateria(grupo.nombre, cantidadActual - 1)
                            }
                            disabled={cantidadActual <= 0}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={cantidadActual}
                            onChange={(e) =>
                              cambiarCantidadMateria(
                                grupo.nombre,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-14 h-7 text-center rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidadMateria(grupo.nombre, cantidadActual + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================== */}
          {/* PASO 2: SUPUESTO PRÁCTICO DE 20 PREGUNTAS (CON FILTROS POR CATEGORÍA Y ÁMBITO) */}
          {/* ========================================================================== */}
          <div className="bg-amber-50/60 dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-amber-200/80 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-black uppercase">
                    2.ª PARTE · SUPUESTO DE 20 PREGUNTAS (+ HASTA 5 RESERVA)
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Seleccionar Supuesto Práctico (Filtros por Categoría y Ámbito)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Filtra los supuestos prácticos por{' '}
                  <strong>Categoría (Supuesto oficial, de academia, aleatorio IA o Todas)</strong> y por{' '}
                  <strong>Ámbito (AGE, Madrid CAM o Ambos)</strong>, o utiliza el sorteo aleatorio entre los{' '}
                  {supuestosFormato20AGE.length} supuestos con formato 20 preguntas AGE.
                </p>
              </div>
            </div>

            {/* BARRA DE FILTROS DE SUPUESTOS POR CATEGORÍA Y ÁMBITO (IGUAL QUE EN LOS TESTS) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase font-mono text-slate-500">
                  Categoría:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIAS_SUPUESTO_FILTRO.map((cat) => {
                    const activo = categoriaFiltroSupuesto === cat.id;
                    const infoCat =
                      cat.id !== 'todas' ? CATEGORIAS_EXAMEN_INFO[cat.id] : null;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoriaFiltroSupuesto(cat.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          activo
                            ? infoCat
                              ? `${infoCat.bgBadge} ${infoCat.textBadge} ${infoCat.borderBadge} ring-2 ring-amber-500/30 font-black shadow-2xs`
                              : 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <i className={`fa-solid ${cat.icon} text-[10px]`}></i>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase font-mono text-slate-500">
                    Ámbito:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AMBITOS_LISTA.map((amb) => {
                      const info = AMBITOS_INFO[amb.id];
                      const activo = ambitoFiltroSupuesto === amb.id;
                      return (
                        <button
                          key={amb.id}
                          type="button"
                          onClick={() => {
                            setAmbitoFiltroSupuesto(amb.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            activo
                              ? `${info.badgeClass} ring-2 ring-amber-500/30 font-black shadow-2xs`
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <i className={`fa-solid ${info.icon} text-[10px]`}></i>
                          <span>
                            {amb.id === 'AGE'
                              ? `${info.shortLabel}`
                              : amb.id === 'CAM'
                              ? `${info.shortLabel}`
                              : `${info.shortLabel} (Todos)`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500">
                  {supuestoSeleccionadoId === 'ALEATORIO_AGE_20'
                    ? `Sorteo activo (${supuestosVisibles.length} en filtro)`
                    : 'Supuesto específico seleccionado'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {/* Tarjeta de Selección Aleatoria de Supuesto */}
              <div
                onClick={() => setSupuestoSeleccionadoId('ALEATORIO_AGE_20')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                  supuestoSeleccionadoId === 'ALEATORIO_AGE_20'
                    ? 'border-2 border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-amber-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[9.5px] font-black uppercase">
                      🎲 Selección Aleatoria (Formato 20 preg. AGE)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border ${AMBITOS_INFO[ambitoFiltroSupuesto].badgeClass}`}
                    >
                      {AMBITOS_INFO[ambitoFiltroSupuesto].shortLabel} · 20 ord. + hasta 5 res.
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Sortear al Azar entre los Supuestos ({supuestosVisibles.length} disp. en filtro)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Elige automáticamente un supuesto práctico con sus 20 preguntas ordinarias y hasta 5 de reserva disponibles.
                  </p>
                </div>
              </div>

              {/* Tarjetas de cada Supuesto Existente según Categoría y Ámbito */}
              {supuestosVisibles.map((sup) => {
                const seleccionado = supuestoSeleccionadoId === sup.id;
                const verPreview = verTextoSupuestoPreviewId === sup.id;
                const infoAmb = AMBITOS_INFO[sup.ambito];
                const infoCat =
                  CATEGORIAS_EXAMEN_INFO[sup.categoria] || CATEGORIAS_EXAMEN_INFO.supuesto_oficial;

                return (
                  <div
                    key={sup.id}
                    onClick={() => setSupuestoSeleccionadoId(sup.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      seleccionado
                        ? 'border-2 border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-amber-400'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        {/* Selector directo de Categoría del supuesto */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center"
                        >
                          <select
                            value={sup.categoria}
                            onChange={(e) =>
                              handleCambiarCategoriaDesdeTarjeta(
                                sup.id,
                                e.target.value as CategoriaExamen
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border cursor-pointer focus:outline-none ${infoCat.bgBadge} ${infoCat.textBadge} ${infoCat.borderBadge}`}
                            title="Modificar categoría del supuesto"
                          >
                            <option value="supuesto_oficial">Supuesto oficial</option>
                            <option value="supuesto_academia">Supuesto de academia</option>
                            <option value="supuesto_ia">Supuesto aleatorio (IA)</option>
                          </select>
                        </div>

                        {/* Selector directo de Ámbito del supuesto */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1"
                        >
                          <select
                            value={sup.ambito}
                            onChange={(e) =>
                              handleCambiarAmbitoDesdeTarjeta(
                                sup.id,
                                e.target.value as ConvocatoriaAmbito
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black border cursor-pointer focus:outline-none ${infoAmb.badgeClass}`}
                            title="Modificar ámbito del supuesto (AGE / CAM)"
                          >
                            <option value="AGE">AGE C1</option>
                            <option value="CAM">Madrid C1</option>
                            <option value="AMBOS">AGE/Madrid</option>
                          </select>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[9.5px] font-black">
                            20 ord.
                            {sup.totalReservasDisponibles > 0
                              ? ` + ${sup.totalReservasDisponibles}R`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                        {sup.titulo}
                      </h4>

                      <p
                        className={`text-[11px] text-slate-600 dark:text-slate-300 ${
                          verPreview ? '' : 'line-clamp-2'
                        }`}
                      >
                        {sup.contextoCaso}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {sup.leyes.slice(0, 2).join(' · ')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVerTextoSupuestoPreviewId(verPreview ? null : sup.id);
                        }}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                      >
                        {verPreview ? 'Ocultar caso' : 'Ver relato'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (4/12): PANEL DE DURACIÓN, RESERVAS Y LANZAMIENTO UNIFICADO */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-5 shadow-md space-y-4 sticky top-20">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="text-[10px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                Prueba Unificada Oficial
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Resumen, Reservas y Duración
              </h3>
            </div>

            {/* Configuración de la Duración (100 minutos por defecto, modificable) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 font-mono">
                  Duración Total de la Prueba (Minutos)
                </label>
                <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {duracionMinutos} min
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[60, 90, 100, 110, 120].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuracionMinutos(min)}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-mono font-black transition-all cursor-pointer ${
                      duracionMinutos === min
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  Personalizar minutos:
                </span>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={duracionMinutos}
                  onChange={(e) =>
                    setDuracionMinutos(Math.max(10, Math.min(300, Number(e.target.value) || 100)))
                  }
                  className="w-24 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs font-black text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] font-mono text-slate-400">min (Oficial: 100m)</span>
              </div>
            </div>

            {/* Opción de Preguntas de Reserva (5 en cada test y 5 en cada supuesto, siempre que estén disponibles) */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirReservasDisponibles}
                onChange={(e) => setIncluirReservasDisponibles(e.target.checked)}
                className="mt-0.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="text-[11.5px] leading-snug">
                <span className="font-black text-purple-950 dark:text-purple-200 block">
                  Añadir preguntas de reserva disponibles (hasta 5 en test y 5 en supuesto)
                </span>
                <span className="text-purple-800/80 dark:text-purple-300/80">
                  Incorpora automáticamente hasta 5 preguntas de reserva en el cuestionario ({resumenConfiguracionActual.resParte1} disp.) y hasta 5 en el supuesto ({resumenConfiguracionActual.resParte2} disp.).
                </span>
              </div>
            </label>

            {modoParte1 === 'personalizado_por_ley' && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completarAutomaticamenteHasta70}
                  onChange={(e) => setCompletarAutomaticamenteHasta70(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-[11.5px] leading-snug">
                  <span className="font-black text-slate-800 dark:text-slate-200 block">
                    Completar hasta 70 si la suma manual es inferior a 70
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Si eliges menos de 70 ({resumenSeleccion70.total} seleccionadas), se completará hasta 70. Si eliges más de 70, se incluirán todas las que hayas indicado.
                  </span>
                </div>
              </label>
            )}

            {/* Modalidad de corrección */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 font-mono block">
                Modo de Corrección
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setModalidadCorreccion('final')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    modalidadCorreccion === 'final'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-black'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>📋 Simulacro Real (calificar al finalizar)</span>
                  {modalidadCorreccion === 'final' && (
                    <i className="fa-solid fa-check text-indigo-600"></i>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setModalidadCorreccion('paso_a_paso')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    modalidadCorreccion === 'paso_a_paso'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-black'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>⚡ Corrección paso a paso con BOE</span>
                  {modalidadCorreccion === 'paso_a_paso' && (
                    <i className="fa-solid fa-check text-indigo-600"></i>
                  )}
                </button>
              </div>
            </div>

            {/* Título opcional */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-black uppercase text-slate-500 font-mono block">
                Título del Simulacro en Historial (Opcional)
              </label>
              <input
                type="text"
                value={tituloSimulacro}
                onChange={(e) => setTituloSimulacro(e.target.value)}
                placeholder="Ej. Simulacro Oficial INAP Completo #1"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Desglose de la Prueba Unificada */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  1.ª Parte (
                  {modoParte1 === 'test_oficial'
                    ? `${
                        categoriaFiltroTest === 'todas'
                          ? 'Todas las cat.'
                          : CATEGORIAS_EXAMEN_INFO[categoriaFiltroTest].label
                      } · ${AMBITOS_INFO[ambitoFiltroTestOficial].shortLabel}`
                    : 'Aleatorio por Leyes/Temas'}
                  ):
                </span>
                <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
                  {resumenConfiguracionActual.ordParte1} ord.
                  {resumenConfiguracionActual.resParte1 > 0
                    ? ` + ${resumenConfiguracionActual.resParte1} res.`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  2.ª Parte (Supuesto Práctico):
                </span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-300">
                  20 ord.
                  {resumenConfiguracionActual.resParte2 > 0
                    ? ` + ${resumenConfiguracionActual.resParte2} res.`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-indigo-200/60 dark:border-indigo-800">
                <span className="font-black text-slate-900 dark:text-white">
                  Total Prueba Unificada:
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {resumenConfiguracionActual.totalOrdinarias} ord.
                  {resumenConfiguracionActual.totalReservas > 0
                    ? ` (+${resumenConfiguracionActual.totalReservas} reserva)`
                    : ''}{' '}
                  · {duracionMinutos} min
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleIniciarSimulacroOficial}
              className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-play"></i>
              <span>
                Iniciar Simulacro Oficial ({resumenConfiguracionActual.ordParte1}
                {resumenConfiguracionActual.resParte1 > 0
                  ? `+${resumenConfiguracionActual.resParte1}R`
                  : ''}{' '}
                + 20
                {resumenConfiguracionActual.resParte2 > 0
                  ? `+${resumenConfiguracionActual.resParte2}R`
                  : ''}{' '}
                · {duracionMinutos} min)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
