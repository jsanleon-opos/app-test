import React, { useState, useMemo, useEffect } from 'react';
import {
  CategoriaExamen,
  ConvocatoriaAmbito,
  ExamenCompleto,
  PreguntaExamen,
} from '../types';
import {
  AMBITOS_INFO,
  AMBITOS_LISTA,
  CATEGORIAS_EXAMEN_INFO,
} from '../utils/jsonExamHelper';
import {
  extraerNombreConvocatoriaDesdeExamen,
  normalizarClavePregunta,
  obtenerNormaEfectivaDePregunta,
  obtenerReferenciaConvocatoriaOficial,
} from '../utils/tematicaClassifier';
import { generarPreguntasAdicionalesMateria } from '../constants/temarioLegislacionEInformatica';
import {
  deducirCodigoPiePorDefecto,
  deducirSubtituloCuerpoPorDefecto,
  descargarBlobPDF,
  eliminarRegistroTestDescargadoDeLocalStorage,
  generarPaquetePDFOficial,
  leerTestsDescargadosDeLocalStorage,
  limpiarTestsDescargadosDeLocalStorage,
  registrarDescargaTestEnLocalStorage,
  RegistroTestDescargadoPDF,
  ResultadoGeneracionPDFOficial,
} from '../utils/officialPdfExporter';
import {
  TipoDocumentoPrevisualizado,
  VisorPrevisualizacionPdfOficial,
} from './VisorPrevisualizacionPdfOficial';

export interface GrupoMateriaExportable {
  nombre: string;
  esInformatica: boolean;
  preguntas: PreguntaExamen[];
}

export interface TestCandidatoExportable {
  id: string;
  titulo: string;
  categoria: CategoriaExamen;
  ambito: ConvocatoriaAmbito;
  fecha: string;
  leyes: string[];
  preguntasOrdinarias: PreguntaExamen[];
  preguntasReserva: PreguntaExamen[];
  totalOrdinariasOriginal: number;
  totalReservasDisponibles: number;
}

export interface SupuestoCandidatoExportable {
  id: string;
  titulo: string;
  categoria: CategoriaExamen;
  ambito: ConvocatoriaAmbito;
  contextoCaso: string;
  leyes: string[];
  preguntasOrdinarias20: PreguntaExamen[];
  preguntasReserva: PreguntaExamen[];
  totalOrdinariasOriginal: number;
  totalReservasDisponibles: number;
  esFormato20AGE: boolean;
}

interface SubseccionExportacionSimulacroPDFProps {
  bancoExamenes: ExamenCompleto[];
  historialPruebas: ExamenCompleto[];
  testsCatalogo: TestCandidatoExportable[];
  supuestosCatalogo: SupuestoCandidatoExportable[];
  gruposMaterias: GrupoMateriaExportable[];
  reservasPoolGlobal: PreguntaExamen[];
  todasLasPreguntasUnicas: PreguntaExamen[];
  simulacroActivoEnPantalla: ExamenCompleto | null;
  onGuardarExamenEnBanco: (examen: ExamenCompleto) => void;
  onCargarExamenEnPantalla?: (examen: ExamenCompleto) => void;
}

type ModoOrigenParte1Export =
  | 'test_existente'
  | 'aleatorio_materias'
  | 'simulacro_en_curso'
  | 'sin_parte1';

type FiltroCatTestExport = 'todas' | 'test_oficial' | 'test_academia' | 'test_ia';
type FiltroCatSupExport = 'todas' | 'supuesto_oficial' | 'supuesto_academia' | 'supuesto_ia';

const ETIQUETA_TIPO_ARCHIVO: Record<RegistroTestDescargadoPDF['tipoArchivo'], string> = {
  examen_y_plantilla: 'Examen + Plantilla (2 PDF)',
  todo_en_1_pdf: 'Examen + Plantilla (1 PDF)',
  solo_examen: 'Cuadernillo Examen PDF',
  solo_plantilla: 'Plantilla OMR en blanco',
  solo_anexo_boe: 'Anexo Comentado BOE',
};

function barajarConSemillaLocal<T>(arr: T[], semilla: number): T[] {
  const copia = [...arr];
  let s = (Math.abs(Math.floor(semilla)) || 7654321) % 2147483647;
  if (s <= 0) s = 1357911;
  for (let i = copia.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    const tmp = copia[i];
    copia[i] = copia[j];
    copia[j] = tmp;
  }
  return copia;
}

export const SubseccionExportacionSimulacroPDF: React.FC<
  SubseccionExportacionSimulacroPDFProps
> = ({
  bancoExamenes,
  historialPruebas,
  testsCatalogo,
  supuestosCatalogo,
  gruposMaterias,
  reservasPoolGlobal,
  todasLasPreguntasUnicas,
  simulacroActivoEnPantalla,
  onGuardarExamenEnBanco,
  onCargarExamenEnPantalla,
}) => {
  // 1. Selección de contenido del Cuadernillo para exportar
  const [modoOrigenP1, setModoOrigenP1] = useState<ModoOrigenParte1Export>(() =>
    simulacroActivoEnPantalla ? 'simulacro_en_curso' : 'test_existente'
  );
  const [filtroCatTest, setFiltroCatTest] = useState<FiltroCatTestExport>('todas');
  const [filtroAmbitoTest, setFiltroAmbitoTest] = useState<ConvocatoriaAmbito>('AGE');
  const [ocultarTestsYaDescargados, setOcultarTestsYaDescargados] = useState<boolean>(false);
  const [busquedaTest, setBusquedaTest] = useState<string>('');
  const [testElegidoId, setTestElegidoId] = useState<string>('');

  // Configuración para modo aleatorio por leyes/temas en exportación
  const [presetAleatorio, setPresetAleatorio] = useState<
    'equilibrado_70' | 'leyes_70' | 'informatica_30' | 'cam_40'
  >('equilibrado_70');
  const [semillaSorteoAleatorio, setSemillaSorteoAleatorio] = useState<number>(202614);

  // Selección de Segunda Parte: Supuesto I y Supuesto II (como en el cuadernillo oficial CPS/INAP)
  const [filtroCatSupuesto, setFiltroCatSupuesto] = useState<FiltroCatSupExport>('todas');
  const [filtroAmbitoSupuesto, setFiltroAmbitoSupuesto] = useState<ConvocatoriaAmbito>('AMBOS');
  const [supuesto1Id, setSupuesto1Id] = useState<string>('');
  const [supuesto2Id, setSupuesto2Id] = useState<string>('');

  const [incluirPreguntasReserva, setIncluirPreguntasReserva] = useState<boolean>(true);
  const [tituloPersonalizado, setTituloPersonalizado] = useState<string>('');

  // 2. Opciones de maquetación PDF y Plantilla Oficial OMR
  const [modelo, setModelo] = useState<'A' | 'B'>('A');
  const [codigoPie, setCodigoPie] = useState<string>('');
  const [subtituloCuerpo, setSubtituloCuerpo] = useState<string>('');
  const [incluirSoluciones, setIncluirSoluciones] = useState<boolean>(true);
  const [incluirPortadaTribunal, setIncluirPortadaTribunal] = useState<boolean>(true);
  const [duracionPortadaMin, setDuracionPortadaMin] = useState<number>(100);
  const [mostrarPrevisualizacionPDF, setMostrarPrevisualizacionPDF] = useState<boolean>(true);
  const [docPrevisualizado, setDocPrevisualizado] =
    useState<TipoDocumentoPrevisualizado>('cuadernillo');
  const [incluirAnexoBOE, setIncluirAnexoBOE] = useState<boolean>(false);
  const [barajarOrdenPreguntas, setBarajarOrdenPreguntas] = useState<boolean>(false);
  const [semillaBarajadoPDF, setSemillaBarajadoPDF] = useState<number>(402619);

  // 3. Control de descargas efectuadas (sin descarga automática)
  const [testsDescargados, setTestsDescargados] = useState<RegistroTestDescargadoPDF[]>(() =>
    leerTestsDescargadosDeLocalStorage()
  );
  const [filtroHistorialDescargas, setFiltroHistorialDescargas] = useState<'todos' | 'pendientes'>(
    'todos'
  );
  const [mostrarTodosDescargados, setMostrarTodosDescargados] = useState<boolean>(false);
  const [mensajeFeedbackLocal, setMensajeFeedbackLocal] = useState<string | null>(null);
  const [guardadoEnBancoReciente, setGuardadoEnBancoReciente] = useState<boolean>(false);

  const notificarAccion = (msg: string) => {
    setMensajeFeedbackLocal(msg);
    setTimeout(() => setMensajeFeedbackLocal(null), 4500);
  };

  // Inicializar primer test y primer supuesto por defecto cuando cargue el catálogo
  useEffect(() => {
    if (!testElegidoId && testsCatalogo.length > 0) {
      const preferido =
        testsCatalogo.find((t) => t.ambito === 'AGE' && t.categoria === 'test_oficial') ||
        testsCatalogo[0];
      if (preferido) setTestElegidoId(preferido.id);
    }
  }, [testsCatalogo, testElegidoId]);

  useEffect(() => {
    if (!supuesto1Id && supuestosCatalogo.length > 0) {
      const supPref =
        supuestosCatalogo.find((s) => s.ambito === 'AGE' && s.esFormato20AGE) ||
        supuestosCatalogo[0];
      if (supPref) setSupuesto1Id(supPref.id);
    }
  }, [supuestosCatalogo, supuesto1Id]);

  // Conjunto de IDs y títulos ya descargados previamente
  const setTestsDescargadosClaves = useMemo(() => {
    const set = new Set<string>();
    testsDescargados.forEach((r) => {
      if (r.examenId) set.add(r.examenId);
      if (r.testBaseId) set.add(r.testBaseId);
      if (r.tituloPrincipal) set.add(r.tituloPrincipal.trim().toLowerCase());
    });
    return set;
  }, [testsDescargados]);

  const testsFiltrados = useMemo(() => {
    return testsCatalogo.filter((t) => {
      if (filtroCatTest !== 'todas' && t.categoria !== filtroCatTest) return false;
      if (
        filtroAmbitoTest !== 'AMBOS' &&
        t.ambito !== filtroAmbitoTest &&
        t.ambito !== 'AMBOS'
      ) {
        return false;
      }
      if (ocultarTestsYaDescargados) {
        if (
          setTestsDescargadosClaves.has(t.id) ||
          setTestsDescargadosClaves.has(t.titulo.trim().toLowerCase())
        ) {
          return false;
        }
      }
      if (busquedaTest.trim()) {
        const q = busquedaTest.trim().toLowerCase();
        if (!t.titulo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [
    testsCatalogo,
    filtroCatTest,
    filtroAmbitoTest,
    ocultarTestsYaDescargados,
    setTestsDescargadosClaves,
    busquedaTest,
  ]);

  const supuestosFiltrados = useMemo(() => {
    return supuestosCatalogo.filter((s) => {
      if (filtroCatSupuesto !== 'todas' && s.categoria !== filtroCatSupuesto) return false;
      if (
        filtroAmbitoSupuesto !== 'AMBOS' &&
        s.ambito !== filtroAmbitoSupuesto &&
        s.ambito !== 'AMBOS'
      ) {
        return false;
      }
      return true;
    });
  }, [supuestosCatalogo, filtroCatSupuesto, filtroAmbitoSupuesto]);

  // Ensamblar en memoria el ExamenCompleto base y el Supuesto II adicional según la configuración elegida
  const { examenEnsamblado, supuestoAdicional2Examen } = useMemo<{
    examenEnsamblado: ExamenCompleto | null;
    supuestoAdicional2Examen: ExamenCompleto | null;
  }>(() => {
    // Si el usuario eligió usar directamente el simulacro activo en pantalla
    if (modoOrigenP1 === 'simulacro_en_curso' && simulacroActivoEnPantalla) {
      return {
        examenEnsamblado: tituloPersonalizado.trim()
          ? { ...simulacroActivoEnPantalla, titulo: tituloPersonalizado.trim() }
          : simulacroActivoEnPantalla,
        supuestoAdicional2Examen: null,
      };
    }

    const clavesUsadas = new Set<string>();
    const leyesSet = new Set<string>();
    const testsIncluidos: string[] = [];

    let p1Ord: PreguntaExamen[] = [];
    let p1Res: PreguntaExamen[] = [];
    let ambitoP1: ConvocatoriaAmbito = 'AGE';

    // 1. Construir Primera Parte si procede
    if (modoOrigenP1 === 'test_existente') {
      const testSel =
        testsCatalogo.find((t) => t.id === testElegidoId) || testsFiltrados[0] || testsCatalogo[0];
      if (testSel) {
        const refConv =
          testSel.categoria === 'test_oficial'
            ? extraerNombreConvocatoriaDesdeExamen({
                id: testSel.id,
                titulo: testSel.titulo,
                categoria: testSel.categoria,
                ambito: testSel.ambito,
                fecha: testSel.fecha,
              }) || testSel.titulo
            : undefined;

        p1Ord = testSel.preguntasOrdinarias.map((p) => ({
          ...p,
          convocatoriasAparecida:
            obtenerReferenciaConvocatoriaOficial(p) || refConv || p.convocatoriasAparecida,
        }));
        if (incluirPreguntasReserva && testSel.preguntasReserva.length > 0) {
          p1Res = testSel.preguntasReserva.slice(0, 5).map((p) => ({
            ...p,
            convocatoriasAparecida:
              obtenerReferenciaConvocatoriaOficial(p) || refConv || p.convocatoriasAparecida,
          }));
        }
        ambitoP1 = testSel.ambito;
        testSel.leyes.forEach((l) => leyesSet.add(l));
        testsIncluidos.push(
          `1.ª Parte: ${testSel.titulo} (${p1Ord.length}${
            p1Res.length > 0 ? `+${p1Res.length} res.` : ''
          } preg.)`
        );
      }
    } else if (modoOrigenP1 === 'aleatorio_materias') {
      const gruposLeyes = gruposMaterias.filter((g) => !g.esInformatica);
      const gruposInfo = gruposMaterias.filter((g) => g.esInformatica);

      const recolectarDeGrupos = (
        listaGrupos: GrupoMateriaExportable[],
        meta: number,
        semillaOffset: number
      ): PreguntaExamen[] => {
        if (meta <= 0 || listaGrupos.length === 0) return [];
        const poolPlano: PreguntaExamen[] = [];
        listaGrupos.forEach((g) => {
          g.preguntas.forEach((p) => poolPlano.push(p));
        });
        const barajadas = barajarConSemillaLocal(
          poolPlano,
          semillaSorteoAleatorio + semillaOffset
        );
        const resultado: PreguntaExamen[] = [];
        for (const p of barajadas) {
          if (resultado.length >= meta) break;
          const k = normalizarClavePregunta(p.enunciado);
          if (k && !clavesUsadas.has(k)) {
            clavesUsadas.add(k);
            resultado.push(p);
            leyesSet.add(obtenerNormaEfectivaDePregunta(p));
          }
        }
        if (resultado.length < meta && listaGrupos[0]) {
          const faltan = meta - resultado.length;
          const gBase = listaGrupos[0];
          const generadas = generarPreguntasAdicionalesMateria(
            gBase.nombre,
            gBase.esInformatica,
            faltan,
            gBase.preguntas
          );
          resultado.push(...generadas);
        }
        return resultado;
      };

      if (presetAleatorio === 'equilibrado_70') {
        const bloqueLeyes = recolectarDeGrupos(gruposLeyes, 50, 11);
        const bloqueInfo = recolectarDeGrupos(gruposInfo, 20, 29);
        p1Ord = [...bloqueLeyes, ...bloqueInfo];
        ambitoP1 = 'AGE';
        testsIncluidos.push(
          `1.ª Parte: Sorteo Oficial Equilibrado AGE (50 Legislación BOE + 20 Informática)`
        );
      } else if (presetAleatorio === 'leyes_70') {
        p1Ord = recolectarDeGrupos(gruposLeyes, 70, 43);
        ambitoP1 = 'AGE';
        testsIncluidos.push(`1.ª Parte: Sorteo Integral Legislación BOE (70 preg.)`);
      } else if (presetAleatorio === 'informatica_30') {
        p1Ord = recolectarDeGrupos(gruposInfo, 30, 61);
        ambitoP1 = 'AGE';
        testsIncluidos.push(`1.ª Parte: Monográfico Informática y Ofimática C1 (30 preg.)`);
      } else {
        p1Ord = recolectarDeGrupos(gruposLeyes, 40, 83);
        ambitoP1 = 'CAM';
        testsIncluidos.push(`1.ª Parte: Sorteo Oficial Comunidad de Madrid C1 (40 preg.)`);
      }

      if (incluirPreguntasReserva) {
        const poolRes = barajarConSemillaLocal(
          [...reservasPoolGlobal, ...todasLasPreguntasUnicas],
          semillaSorteoAleatorio + 157
        );
        for (const cand of poolRes) {
          if (p1Res.length >= 5) break;
          const k = normalizarClavePregunta(cand.enunciado);
          if (k && !clavesUsadas.has(k)) {
            clavesUsadas.add(k);
            p1Res.push({
              ...cand,
              esReserva: true,
              numeroReserva: p1Res.length + 1,
            });
          }
        }
      }
    }

    p1Ord.forEach((p) => clavesUsadas.add(normalizarClavePregunta(p.enunciado)));
    p1Res.forEach((p) => clavesUsadas.add(normalizarClavePregunta(p.enunciado)));

    // 2. Construir Supuesto I y Supuesto II si se seleccionaron
    const sup1 = supuesto1Id ? supuestosCatalogo.find((s) => s.id === supuesto1Id) || null : null;
    const sup2 =
      supuesto2Id && supuesto2Id !== supuesto1Id
        ? supuestosCatalogo.find((s) => s.id === supuesto2Id) || null
        : null;

    let p2Ord: PreguntaExamen[] = [];
    let p2Res: PreguntaExamen[] = [];

    if (sup1) {
      const refSup1 =
        sup1.categoria === 'supuesto_oficial'
          ? extraerNombreConvocatoriaDesdeExamen({
              id: sup1.id,
              titulo: sup1.titulo,
              categoria: sup1.categoria,
              ambito: sup1.ambito,
            }) || sup1.titulo
          : undefined;
      p2Ord = sup1.preguntasOrdinarias20.slice(0, 20).map((p) => ({
        ...p,
        convocatoriasAparecida:
          obtenerReferenciaConvocatoriaOficial(p) || refSup1 || p.convocatoriasAparecida,
      }));
      if (incluirPreguntasReserva && sup1.preguntasReserva.length > 0) {
        p2Res = sup1.preguntasReserva.slice(0, 5).map((p) => ({
          ...p,
          convocatoriasAparecida:
            obtenerReferenciaConvocatoriaOficial(p) || refSup1 || p.convocatoriasAparecida,
        }));
      }
      sup1.leyes.forEach((l) => leyesSet.add(l));
      testsIncluidos.push(
        `Supuesto I: ${sup1.titulo} (${p2Ord.length}${
          p2Res.length > 0 ? `+${p2Res.length} res.` : ''
        } preg.)`
      );
    }

    // Si no hay ni Primera Parte ni Supuesto I, no hay documento válido aún
    if (p1Ord.length === 0 && p2Ord.length === 0) {
      return { examenEnsamblado: null, supuestoAdicional2Examen: null };
    }

    const fechaHoy = new Date().toISOString().split('T')[0];

    // Caso A: Solo Supuesto(s) sin Primera Parte
    if (p1Ord.length === 0 && sup1) {
      const preguntasSoloSup1: PreguntaExamen[] = [
        ...p2Ord.map((p, idx) => ({ ...p, id: idx + 1, esReserva: false })),
        ...p2Res.map((p, idx) => ({
          ...p,
          id: p2Ord.length + idx + 1,
          esReserva: true,
          numeroReserva: idx + 1,
        })),
      ];

      const examenBaseSup: ExamenCompleto = {
        id: `EXP-SUP-${sup1.id}-${incluirPreguntasReserva ? 'R' : 'NR'}`,
        testBaseId: sup1.id,
        titulo: tituloPersonalizado.trim() || sup1.titulo,
        tipo: 'supuesto',
        categoria: sup1.categoria,
        ambito: sup1.ambito,
        origen: 'oficial_json',
        fecha: fechaHoy,
        contextoCaso: sup1.contextoCaso,
        tematicas: ['procedimiento_administrativo'],
        leyesBOEAplicadas: Array.from(leyesSet),
        testsIncluidos,
        preguntas: preguntasSoloSup1,
      };

      let supExtra2: ExamenCompleto | null = null;
      if (sup2) {
        const res2 = incluirPreguntasReserva ? sup2.preguntasReserva.slice(0, 5) : [];
        supExtra2 = {
          id: sup2.id,
          titulo: sup2.titulo,
          tipo: 'supuesto',
          categoria: sup2.categoria,
          ambito: sup2.ambito,
          origen: 'oficial_json',
          fecha: fechaHoy,
          contextoCaso: sup2.contextoCaso,
          tematicas: ['procedimiento_administrativo'],
          leyesBOEAplicadas: sup2.leyes,
          preguntas: [
            ...sup2.preguntasOrdinarias20.slice(0, 20).map((p, i) => ({
              ...p,
              id: i + 1,
              esReserva: false,
            })),
            ...res2.map((p, i) => ({
              ...p,
              id: 21 + i,
              esReserva: true,
              numeroReserva: i + 1,
            })),
          ],
        };
      }

      return { examenEnsamblado: examenBaseSup, supuestoAdicional2Examen: supExtra2 };
    }

    // Caso B: Solo Primera Parte sin Supuesto
    if (p2Ord.length === 0) {
      const preguntasSoloP1: PreguntaExamen[] = [
        ...p1Ord.map((p, idx) => ({ ...p, id: idx + 1, esReserva: false })),
        ...p1Res.map((p, idx) => ({
          ...p,
          id: p1Ord.length + idx + 1,
          esReserva: true,
          numeroReserva: idx + 1,
        })),
      ];
      const tituloAutoP1 =
        tituloPersonalizado.trim() ||
        (modoOrigenP1 === 'test_existente'
          ? testsCatalogo.find((t) => t.id === testElegidoId)?.titulo || 'Cuestionario Oficial C1'
          : `Cuestionario Oficial en Papel (${p1Ord.length} preg.)`);

      return {
        examenEnsamblado: {
          id: `EXP-P1-${modoOrigenP1}-${testElegidoId || presetAleatorio}-${semillaSorteoAleatorio}`,
          testBaseId: modoOrigenP1 === 'test_existente' ? testElegidoId : undefined,
          titulo: tituloAutoP1,
          tipo: 'unitario',
          categoria: 'test_oficial',
          ambito: ambitoP1,
          origen: 'oficial_json',
          fecha: fechaHoy,
          tematicas: ['procedimiento_administrativo', 'constitucion_organizacion'],
          leyesBOEAplicadas: Array.from(leyesSet),
          testsIncluidos,
          preguntas: preguntasSoloP1,
        },
        supuestoAdicional2Examen: null,
      };
    }

    // Caso C: Simulacro Completo Unificado (Primera Parte + Supuesto I [+ Supuesto II opcional])
    const preguntasUnificadas: any[] = [];
    p1Ord.forEach((p, idx) => {
      preguntasUnificadas.push({
        ...p,
        id: preguntasUnificadas.length + 1,
        esReserva: false,
        bloqueSimulacro: 'parte1_ordinaria',
        numeroEnBloque: idx + 1,
      });
    });
    p1Res.forEach((p, idx) => {
      preguntasUnificadas.push({
        ...p,
        id: preguntasUnificadas.length + 1,
        esReserva: true,
        numeroReserva: idx + 1,
        bloqueSimulacro: 'parte1_reserva',
        numeroEnBloque: idx + 1,
      });
    });
    p2Ord.forEach((p, idx) => {
      preguntasUnificadas.push({
        ...p,
        id: preguntasUnificadas.length + 1,
        esReserva: false,
        bloqueSimulacro: 'parte2_ordinaria',
        numeroEnBloque: idx + 1,
      });
    });
    p2Res.forEach((p, idx) => {
      preguntasUnificadas.push({
        ...p,
        id: preguntasUnificadas.length + 1,
        esReserva: true,
        numeroReserva: idx + 1,
        bloqueSimulacro: 'parte2_reserva',
        numeroEnBloque: idx + 1,
      });
    });

    let supExtra2: ExamenCompleto | null = null;
    if (sup2) {
      const res2 = incluirPreguntasReserva ? sup2.preguntasReserva.slice(0, 5) : [];
      supExtra2 = {
        id: sup2.id,
        titulo: sup2.titulo,
        tipo: 'supuesto',
        categoria: sup2.categoria,
        ambito: sup2.ambito,
        origen: 'oficial_json',
        fecha: fechaHoy,
        contextoCaso: sup2.contextoCaso,
        tematicas: ['procedimiento_administrativo'],
        leyesBOEAplicadas: sup2.leyes,
        preguntas: [
          ...sup2.preguntasOrdinarias20.slice(0, 20).map((p, i) => ({
            ...p,
            id: i + 1,
            esReserva: false,
          })),
          ...res2.map((p, i) => ({
            ...p,
            id: 21 + i,
            esReserva: true,
            numeroReserva: i + 1,
          })),
        ],
      };
    }

    const ambitoCombinado: ConvocatoriaAmbito =
      ambitoP1 === 'CAM' && sup1?.ambito === 'CAM'
        ? 'CAM'
        : ambitoP1 === 'CAM' || sup1?.ambito === 'CAM'
        ? 'AMBOS'
        : 'AGE';

    const tituloAuto =
      tituloPersonalizado.trim() ||
      `Simulacro Oficial en Papel (${p1Ord.length}${p1Res.length ? `+${p1Res.length}R` : ''} + Supuesto${
        supExtra2 ? 's I y II' : ' I'
      })`;

    return {
      examenEnsamblado: {
        id: `SIM-PAPEL-${modoOrigenP1}-${testElegidoId || presetAleatorio}-${sup1?.id || 'S1'}-${semillaSorteoAleatorio}`,
        titulo: tituloAuto,
        tipo: 'supuesto',
        categoria: 'test_oficial',
        ambito: ambitoCombinado,
        origen: 'oficial_json',
        fecha: fechaHoy,
        contextoCaso: sup1?.contextoCaso || '',
        tematicas: [
          'procedimiento_administrativo',
          'regimen_sector_publico',
          'funcion_publica_personal',
        ],
        leyesBOEAplicadas: Array.from(leyesSet),
        testsIncluidos,
        preguntas: preguntasUnificadas,
      },
      supuestoAdicional2Examen: supExtra2,
    };
  }, [
    modoOrigenP1,
    simulacroActivoEnPantalla,
    tituloPersonalizado,
    testsCatalogo,
    testElegidoId,
    testsFiltrados,
    incluirPreguntasReserva,
    gruposMaterias,
    presetAleatorio,
    semillaSorteoAleatorio,
    reservasPoolGlobal,
    todasLasPreguntasUnicas,
    supuesto1Id,
    supuesto2Id,
    supuestosCatalogo,
  ]);

  // Sincronizar código de pie y subtítulo por defecto cuando cambie el ámbito o modelo
  useEffect(() => {
    if (examenEnsamblado) {
      setCodigoPie((prev) => {
        if (!prev.trim() || /^\d{4}\s*-\s*ADVO/i.test(prev)) {
          return deducirCodigoPiePorDefecto(examenEnsamblado, modelo);
        }
        return prev;
      });
      setSubtituloCuerpo((prev) => {
        if (!prev.trim() || /^Cuerpo\s+(General|de\s+Administrativos)/i.test(prev)) {
          return deducirSubtituloCuerpoPorDefecto(examenEnsamblado);
        }
        return prev;
      });
    }
    setGuardadoEnBancoReciente(false);
  }, [examenEnsamblado?.ambito, modelo]);

  const handleCambiarModelo = (nuevoModelo: 'A' | 'B') => {
    setModelo(nuevoModelo);
    if (examenEnsamblado) {
      setCodigoPie((prev) =>
        prev.trim()
          ? prev.replace(/MODELO\s+[AB]\s*$/i, `MODELO ${nuevoModelo}`)
          : deducirCodigoPiePorDefecto(examenEnsamblado, nuevoModelo)
      );
    }
  };

  // Generar el paquete PDF en memoria (listo para descargar solo cuando el usuario pulse un botón)
  const paquetePDF = useMemo<ResultadoGeneracionPDFOficial | null>(() => {
    if (!examenEnsamblado) return null;
    return generarPaquetePDFOficial(examenEnsamblado, {
      modelo,
      codigoPiePagina: codigoPie,
      subtituloCuerpo,
      incluirPlantillaSoluciones: incluirSoluciones,
      incluirPortadaInstruccionesTribunal: incluirPortadaTribunal,
      duracionMinutosPortada: duracionPortadaMin,
      incluirAnexoJustificacionesBOE: incluirAnexoBOE,
      barajarPreguntas: barajarOrdenPreguntas,
      semillaBarajado: semillaBarajadoPDF,
      supuestoAdicional1: supuestoAdicional2Examen,
    });
  }, [
    examenEnsamblado,
    modelo,
    codigoPie,
    subtituloCuerpo,
    incluirSoluciones,
    incluirPortadaTribunal,
    duracionPortadaMin,
    incluirAnexoBOE,
    barajarOrdenPreguntas,
    semillaBarajadoPDF,
    supuestoAdicional2Examen,
  ]);

  const comprobarSiYaRealizado = (reg: RegistroTestDescargadoPDF): boolean => {
    const titNorm = reg.tituloPrincipal.trim().toLowerCase();
    return historialPruebas.some((h) => {
      if (!h.resultado) return false;
      if (h.id === reg.examenId || (reg.testBaseId && h.testBaseId === reg.testBaseId)) {
        return true;
      }
      if (h.testBaseId === reg.examenId) return true;
      return h.titulo.trim().toLowerCase() === titNorm;
    });
  };

  const ejecutarDescargaManual = (
    tipoArchivo: RegistroTestDescargadoPDF['tipoArchivo']
  ) => {
    if (!examenEnsamblado || !paquetePDF) return;

    if (tipoArchivo === 'solo_examen') {
      descargarBlobPDF(paquetePDF.cuadernilloBlob, paquetePDF.cuadernilloNombreArchivo);
    } else if (tipoArchivo === 'solo_plantilla') {
      descargarBlobPDF(paquetePDF.plantillaOMRBlob, paquetePDF.plantillaOMRNombreArchivo);
    } else if (tipoArchivo === 'todo_en_1_pdf') {
      descargarBlobPDF(paquetePDF.combinadoBlob, paquetePDF.combinadoNombreArchivo);
    } else if (tipoArchivo === 'solo_anexo_boe') {
      descargarBlobPDF(
        paquetePDF.anexoJustificacionesBlob,
        paquetePDF.anexoJustificacionesNombreArchivo
      );
    } else if (tipoArchivo === 'examen_y_plantilla') {
      descargarBlobPDF(paquetePDF.cuadernilloBlob, paquetePDF.cuadernilloNombreArchivo);
      setTimeout(() => {
        descargarBlobPDF(
          paquetePDF.plantillaOMRBlob,
          paquetePDF.plantillaOMRNombreArchivo
        );
      }, 340);
    }

    const actualizados = registrarDescargaTestEnLocalStorage({
      examenId: examenEnsamblado.id,
      testBaseId: examenEnsamblado.testBaseId || examenEnsamblado.id,
      tituloPrincipal: examenEnsamblado.titulo,
      testsIncluidos: paquetePDF.testsIncluidos,
      modelo,
      tipoArchivo,
    });
    setTestsDescargados(actualizados);
    notificarAccion(`✓ Descargado: ${ETIQUETA_TIPO_ARCHIVO[tipoArchivo]} (Modelo ${modelo})`);
  };

  // Función adicional: Descargar Pack Doble Aula (Modelo A original + Modelo B con preguntas barajadas y clave propia)
  const ejecutarDescargaPackDobleModelosAyB = () => {
    if (!examenEnsamblado) return;

    const pieA = deducirCodigoPiePorDefecto(examenEnsamblado, 'A');
    const pieB = deducirCodigoPiePorDefecto(examenEnsamblado, 'B');

    const paqA = generarPaquetePDFOficial(examenEnsamblado, {
      modelo: 'A',
      codigoPiePagina: pieA,
      subtituloCuerpo,
      incluirPlantillaSoluciones: incluirSoluciones,
      incluirPortadaInstruccionesTribunal: incluirPortadaTribunal,
      duracionMinutosPortada: duracionPortadaMin,
      incluirAnexoJustificacionesBOE: incluirAnexoBOE,
      barajarPreguntas: false,
      supuestoAdicional1: supuestoAdicional2Examen,
    });

    const paqB = generarPaquetePDFOficial(examenEnsamblado, {
      modelo: 'B',
      codigoPiePagina: pieB,
      subtituloCuerpo,
      incluirPlantillaSoluciones: incluirSoluciones,
      incluirPortadaInstruccionesTribunal: incluirPortadaTribunal,
      duracionMinutosPortada: duracionPortadaMin,
      incluirAnexoJustificacionesBOE: incluirAnexoBOE,
      barajarPreguntas: true,
      semillaBarajado: semillaBarajadoPDF + 101,
      supuestoAdicional1: supuestoAdicional2Examen,
    });

    descargarBlobPDF(paqA.combinadoBlob, paqA.combinadoNombreArchivo);
    setTimeout(() => {
      descargarBlobPDF(paqB.combinadoBlob, paqB.combinadoNombreArchivo);
    }, 380);

    const actualizados = registrarDescargaTestEnLocalStorage({
      examenId: examenEnsamblado.id,
      testBaseId: examenEnsamblado.testBaseId || examenEnsamblado.id,
      tituloPrincipal: `${examenEnsamblado.titulo} [Pack Modelo A + Modelo B]`,
      testsIncluidos: paqA.testsIncluidos,
      modelo: 'A',
      tipoArchivo: 'todo_en_1_pdf',
    });
    setTestsDescargados(actualizados);
    notificarAccion(
      '✓ Pack Doble descargado: Modelo A (orden original) + Modelo B (orden barajado con su clave recalculada)'
    );
  };

  // Función adicional: Guardar este cuadernillo en el Banco de Exámenes para autocorregirlo luego en pantalla
  const handleGuardarCuadernilloEnBanco = () => {
    if (!examenEnsamblado) return;
    const copiaBanco: ExamenCompleto = {
      ...examenEnsamblado,
      id: `BANCO-PAPEL-${Date.now()}`,
      soloHistorial: false,
    };
    onGuardarExamenEnBanco(copiaBanco);
    setGuardadoEnBancoReciente(true);
    notificarAccion(
      `✓ Guardado en tu Banco de Exámenes: "${copiaBanco.titulo}" (listo para pasar tus respuestas tras hacerlo en papel)`
    );
  };

  const registrosFiltrados = useMemo(() => {
    if (filtroHistorialDescargas === 'pendientes') {
      return testsDescargados.filter((r) => !comprobarSiYaRealizado(r));
    }
    return testsDescargados;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testsDescargados, filtroHistorialDescargas, historialPruebas]);

  const registrosMostrados = mostrarTodosDescargados
    ? registrosFiltrados
    : registrosFiltrados.slice(0, 4);

  const paginasTotalesCombinado = paquetePDF
    ? paquetePDF.paginasCuadernillo +
      (incluirSoluciones ? 1 : 0) +
      (incluirAnexoBOE ? paquetePDF.paginasAnexoJustificaciones : 0) +
      1
    : 0;
  const foliosDobleCara = Math.ceil(paginasTotalesCombinado / 2);

  return (
    <div className="space-y-6">
      {/* ========================================================================== */}
      {/* ENCABEZADO DE DESCARGA Y CONTROL DE TESTS DESCARGADOS PARA REALIZAR        */}
      {/* ========================================================================== */}
      <div className="bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-slate-200 dark:border-slate-700 pb-3.5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-600 to-amber-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              <i className="fa-solid fa-print"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                  Maquetación Oficial CPS / INAP + Hoja OMR en Blanco
                </span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Sin descarga automática: configura y pulsa el botón deseado
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                Configurador de Exportación a PDF y Plantilla Oficial de Examen
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-4xl">
                Prepara tu examen o simulacro oficial para realizar en papel (combinando cuestionario + hasta{' '}
                <strong>dos supuestos prácticos a elegir</strong> como en el ejercicio oficial), personaliza el modelo,
                portada del tribunal o anexo comentado BOE, y descárgalo junto con la hoja verde oficial de respuestas en blanco.
              </p>
            </div>
          </div>

          {mensajeFeedbackLocal && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-xs animate-in fade-in">
              {mensajeFeedbackLocal}
            </div>
          )}
        </div>

        {/* Dos bloques en el encabezado: 1) Contenido preparado ahora | 2) Tests descargados para realizar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Bloque Izquierdo (5/12): Encabezado activo del PDF que se va a generar */}
          <div className="lg:col-span-5 p-3.5 rounded-2xl bg-indigo-50/85 dark:bg-indigo-950/35 border-2 border-indigo-300 dark:border-indigo-800 flex flex-col justify-between gap-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-heading text-indigo-600 dark:text-indigo-400"></i>
                  <span>Encabezado del PDF preparado ahora</span>
                </span>
                {paquetePDF && (
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                    Mod. {modelo} · {paquetePDF.totalOrdinarias} ord.
                    {paquetePDF.totalReservas > 0 ? ` + ${paquetePDF.totalReservas} res.` : ''}
                  </span>
                )}
              </div>

              {paquetePDF && paquetePDF.testsIncluidos.length > 0 ? (
                <ul className="space-y-1 text-xs font-bold text-slate-900 dark:text-white pt-0.5">
                  {paquetePDF.testsIncluidos.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <i className="fa-solid fa-check text-[9px] text-indigo-600 dark:text-indigo-400 mt-1 shrink-0"></i>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Selecciona al menos un test o supuesto práctico abajo para armar el cuadernillo.
                </p>
              )}
            </div>

            {paquetePDF && (
              <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-800/70 flex items-center justify-between gap-2 flex-wrap text-[10.5px] font-mono text-indigo-900 dark:text-indigo-200">
                <span>
                  <i className="fa-regular fa-file-lines mr-1"></i>
                  Cuadernillo: <strong>{paquetePDF.paginasCuadernillo} págs.</strong>
                </span>
                <span>•</span>
                <span>
                  Doble cara aprox.: <strong>{foliosDobleCara} folios A4</strong>
                </span>
              </div>
            )}
          </div>

          {/* Bloque Derecho (7/12): Registro histórico de qué tests se han descargado para realizar */}
          <div className="lg:col-span-7 p-3.5 rounded-2xl bg-slate-100/95 dark:bg-slate-900/80 border-2 border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] font-mono font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <i className="fa-solid fa-clipboard-check text-rose-600 dark:text-rose-400"></i>
                  <span>Tests descargados para realizar ({testsDescargados.length})</span>
                </span>
                <div className="inline-flex rounded-lg bg-white dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroHistorialDescargas('todos')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      filtroHistorialDescargas === 'todos'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Todos ({testsDescargados.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroHistorialDescargas('pendientes')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      filtroHistorialDescargas === 'pendientes'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Pendientes ({testsDescargados.filter((r) => !comprobarSiYaRealizado(r)).length})
                  </button>
                </div>
              </div>

              {testsDescargados.length > 0 && (
                <div className="flex items-center gap-2.5">
                  {registrosFiltrados.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setMostrarTodosDescargados((p) => !p)}
                      className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {mostrarTodosDescargados
                        ? 'Ver menos'
                        : `Ver todos (${registrosFiltrados.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTestsDescargados(limpiarTestsDescargadosDeLocalStorage())}
                    className="text-[10px] font-mono font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
                  >
                    Limpiar registro
                  </button>
                </div>
              )}
            </div>

            {registrosFiltrados.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic py-2">
                {testsDescargados.length === 0
                  ? 'Todavía no has descargado ningún test para realizar en papel. Cuando pulses un botón de descarga quedará registrado aquí.'
                  : '¡Excelente! Todos los tests que habías descargado en PDF constan ya como realizados en tu Historial.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {registrosMostrados.map((reg) => {
                  const realizado = comprobarSiYaRealizado(reg);
                  const fechaTxt = reg.fechaDescargaISO
                    ? reg.fechaDescargaISO.slice(0, 16).replace('T', ' ')
                    : '';
                  return (
                    <div
                      key={reg.id}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                          {reg.testsIncluidos && reg.testsIncluidos.length > 0
                            ? reg.testsIncluidos.join(' · ')
                            : reg.tituloPrincipal}
                        </div>
                        <div className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          Mod. {reg.modelo} · {ETIQUETA_TIPO_ARCHIVO[reg.tipoArchivo]}
                          {fechaTxt ? ` · ${fechaTxt}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[8.5px] font-mono font-black uppercase px-1.5 py-0.5 rounded border ${
                            realizado
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {realizado ? '✓ Hecho' : 'Pendiente'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTestsDescargados(
                              eliminarRegistroTestDescargadoDeLocalStorage(reg.id)
                            )
                          }
                          className="h-5 w-5 rounded text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                          title="Eliminar de la lista"
                        >
                          <i className="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================== */}
      {/* CUERPO EN 2 COLUMNAS: IZQUIERDA (SELECCIÓN DE PRUEBAS) | DERECHA (EXPORTAR) */}
      {/* ========================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (7/12): COMPOSICIÓN DE LA 1.ª PARTE Y 2.ª PARTE */}
        <div className="xl:col-span-7 space-y-5">
          {/* BLOQUE A: PRIMERA PARTE DEL CUADERNILLO */}
          <div className="bg-indigo-50/55 dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-black uppercase">
                  1.ª PARTE
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Cuestionario Teórico a incluir en el PDF
                </h3>
              </div>
            </div>

            {/* Selector de origen de la 1.ª Parte */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setModoOrigenP1('test_existente')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  modoOrigenP1 === 'test_existente'
                    ? 'border-2 border-indigo-600 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-black'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <i className="fa-solid fa-folder-open text-indigo-600 mr-1.5"></i>
                Test del Catálogo / Banco
              </button>

              <button
                type="button"
                onClick={() => setModoOrigenP1('aleatorio_materias')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  modoOrigenP1 === 'aleatorio_materias'
                    ? 'border-2 border-emerald-600 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs font-black'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                }`}
              >
                <i className="fa-solid fa-dice text-emerald-600 mr-1.5"></i>
                Sorteo por Leyes / Informática
              </button>

              {simulacroActivoEnPantalla && (
                <button
                  type="button"
                  onClick={() => setModoOrigenP1('simulacro_en_curso')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    modoOrigenP1 === 'simulacro_en_curso'
                      ? 'border-2 border-violet-600 bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs font-black'
                      : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                  }`}
                >
                  <i className="fa-solid fa-bolt text-violet-600 mr-1.5"></i>
                  Simulacro Activo en Pestaña 1
                </button>
              )}

              <button
                type="button"
                onClick={() => setModoOrigenP1('sin_parte1')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  modoOrigenP1 === 'sin_parte1'
                    ? 'border-2 border-amber-600 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-2xs font-black'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                }`}
              >
                <i className="fa-solid fa-ban text-amber-600 mr-1.5"></i>
                Sin 1.ª Parte (Solo Supuestos)
              </button>
            </div>

            {/* Subvista: Elegir Test existente */}
            {modoOrigenP1 === 'test_existente' && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(
                        [
                          { id: 'todas', label: 'Todas' },
                          { id: 'test_oficial', label: 'Oficial' },
                          { id: 'test_academia', label: 'Academia' },
                          { id: 'test_ia', label: 'IA' },
                        ] as { id: FiltroCatTestExport; label: string }[]
                      ).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFiltroCatTest(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            filtroCatTest === c.id
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {AMBITOS_LISTA.map((amb) => (
                        <button
                          key={amb.id}
                          type="button"
                          onClick={() => setFiltroAmbitoTest(amb.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            filtroAmbitoTest === amb.id
                              ? `${AMBITOS_INFO[amb.id].badgeClass} ring-1 ring-indigo-500/30 font-black`
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {AMBITOS_INFO[amb.id].shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={busquedaTest}
                      onChange={(e) => setBusquedaTest(e.target.value)}
                      placeholder="Buscar test por nombre o convocatoria..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                    />
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={ocultarTestsYaDescargados}
                        onChange={(e) => setOcultarTestsYaDescargados(e.target.checked)}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Ocultar ya descargados</span>
                    </label>
                  </div>
                </div>

                {testsFiltrados.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    No hay tests que coincidan con este filtro. Prueba a cambiar el ámbito o desmarcar «Ocultar ya descargados».
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {testsFiltrados.map((t) => {
                      const seleccionado = testElegidoId === t.id;
                      const yaDescargado =
                        setTestsDescargadosClaves.has(t.id) ||
                        setTestsDescargadosClaves.has(t.titulo.trim().toLowerCase());
                      const catInfo = CATEGORIAS_EXAMEN_INFO[t.categoria];
                      return (
                        <div
                          key={t.id}
                          onClick={() => setTestElegidoId(t.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                            seleccionado
                              ? 'border-2 border-indigo-600 bg-white dark:bg-slate-900 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${catInfo.bgBadge} ${catInfo.textBadge} ${catInfo.borderBadge}`}
                            >
                              {catInfo.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {yaDescargado && (
                                <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  PDF prev.
                                </span>
                              )}
                              <span className="text-[9.5px] font-mono font-bold text-slate-500">
                                {t.preguntasOrdinarias.length}
                                {t.preguntasReserva.length > 0
                                  ? `+${t.preguntasReserva.length}R`
                                  : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {t.titulo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subvista: Sorteo rápido por Leyes BOE / Informática */}
            {modoOrigenP1 === 'aleatorio_materias' && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Distribución del cuestionario aleatorio a generar en PDF:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSemillaSorteoAleatorio((s) => s + 23)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                    <span>Sortear nuevas preguntas</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: 'equilibrado_70',
                      tit: 'Oficial Equilibrado AGE (70 preg.)',
                      sub: '50 Legislación BOE + 20 Informática C1',
                    },
                    {
                      id: 'leyes_70',
                      tit: 'Solo Legislación BOE (70 preg.)',
                      sub: 'Reparto integral entre leyes del temario',
                    },
                    {
                      id: 'cam_40',
                      tit: 'Formato Comunidad de Madrid (40 preg.)',
                      sub: '40 preguntas normativas estilo CAM C1',
                    },
                    {
                      id: 'informatica_30',
                      tit: 'Monográfico Informática C1 (30 preg.)',
                      sub: 'Windows, Word, Excel, Access, Outlook y Red',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPresetAleatorio(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        presetAleatorio === opt.id
                          ? 'border-2 border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {opt.tit}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {opt.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modoOrigenP1 === 'simulacro_en_curso' && simulacroActivoEnPantalla && (
              <div className="p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/35 border border-violet-300 dark:border-violet-800 text-xs text-violet-900 dark:text-violet-200">
                Usando directamente el simulacro activo en la Pestaña 1:{' '}
                <strong>{simulacroActivoEnPantalla.titulo}</strong> (
                {simulacroActivoEnPantalla.preguntas.length} preguntas totales).
              </div>
            )}
          </div>

          {/* BLOQUE B: SEGUNDA PARTE — SUPUESTO I Y SUPUESTO II (ELECCIÓN OFICIAL EN PAPEL) */}
          {modoOrigenP1 !== 'simulacro_en_curso' && (
            <div className="bg-amber-50/60 dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-amber-200 dark:border-slate-700 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-black uppercase">
                      2.ª PARTE · SUPUESTOS PRÁCTICOS
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Supuesto I y Supuesto II (Formato real con opción de elegir en el examen)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Puedes incluir un único supuesto, dos supuestos (<strong>SUPUESTO I</strong> y{' '}
                    <strong>SUPUESTO II</strong>, tal como entrega el INAP para marcar el elegido en la hoja verde), o ninguno si solo deseas imprimir la Primera Parte.
                  </p>
                </div>
              </div>

              {/* Filtros rápidos de supuestos */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'todas', label: 'Todas cat.' },
                      { id: 'supuesto_oficial', label: 'Oficial' },
                      { id: 'supuesto_academia', label: 'Academia' },
                      { id: 'supuesto_ia', label: 'IA' },
                    ] as { id: FiltroCatSupExport; label: string }[]
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFiltroCatSupuesto(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        filtroCatSupuesto === c.id
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {AMBITOS_LISTA.map((amb) => (
                    <button
                      key={amb.id}
                      type="button"
                      onClick={() => setFiltroAmbitoSupuesto(amb.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        filtroAmbitoSupuesto === amb.id
                          ? `${AMBITOS_INFO[amb.id].badgeClass} font-black`
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {AMBITOS_INFO[amb.id].shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-mono font-black uppercase text-amber-900 dark:text-amber-300 block mb-1">
                    SUPUESTO I en el cuadernillo
                  </label>
                  <select
                    value={supuesto1Id}
                    onChange={(e) => {
                      setSupuesto1Id(e.target.value);
                      if (!e.target.value) setSupuesto2Id('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    <option value="">— Sin Supuesto Práctico (Solo 1.ª Parte) —</option>
                    {supuestosFiltrados.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.titulo} ({s.preguntasOrdinarias20.length}
                        {s.preguntasReserva.length ? `+${s.preguntasReserva.length}R` : ''} preg.)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-mono font-black uppercase text-amber-900 dark:text-amber-300 block mb-1">
                    SUPUESTO II opcional (2.ª opción como en examen real)
                  </label>
                  <select
                    value={supuesto2Id}
                    onChange={(e) => setSupuesto2Id(e.target.value)}
                    disabled={!supuesto1Id}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50"
                  >
                    <option value="">— Sin Supuesto II —</option>
                    {supuestosFiltrados
                      .filter((s) => s.id !== supuesto1Id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.titulo} ({s.preguntasOrdinarias20.length}
                          {s.preguntasReserva.length ? `+${s.preguntasReserva.length}R` : ''} preg.)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/70 dark:border-slate-700 items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={incluirPreguntasReserva}
                    onChange={(e) => setIncluirPreguntasReserva(e.target.checked)}
                    className="h-4 w-4 rounded text-amber-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Incluir <strong>Preguntas de Reserva (1–5)</strong> disponibles
                  </span>
                </label>

                <input
                  type="text"
                  value={tituloPersonalizado}
                  onChange={(e) => setTituloPersonalizado(e.target.value)}
                  placeholder="Título opcional del cuadernillo..."
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (5/12): AJUSTES DE MAQUETACIÓN PDF, PLANTILLA OMR Y BOTONES DE DESCARGA */}
        <div className="xl:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-sliders text-indigo-600"></i>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Formato de Examen y Plantilla OMR
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrarPrevisualizacionPDF((prev) => !prev);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black border flex items-center gap-1.5 cursor-pointer transition-all ${
                  mostrarPrevisualizacionPDF
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                }`}
              >
                <i className="fa-solid fa-eye text-[10px]"></i>
                <span>
                  {mostrarPrevisualizacionPDF
                    ? 'Vista Previa Activa'
                    : 'Previsualizar Cuadernillo'}
                </span>
              </button>
            </div>

            {/* Modelo A/B y Código de Pie */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Modelo Oficial
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                  {(['A', 'B'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleCambiarModelo(m)}
                      className={`py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        modelo === m
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Mod. {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Código en pie de página
                </label>
                <input
                  type="text"
                  value={codigoPie}
                  onChange={(e) => setCodigoPie(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                Denominación Oficial del Cuerpo (Portada y Hoja de Respuestas Definitivas)
              </label>
              <input
                type="text"
                value={subtituloCuerpo}
                onChange={(e) => setSubtituloCuerpo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Checkboxes de secciones extras del PDF */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={incluirPortadaTribunal}
                    onChange={(e) => setIncluirPortadaTribunal(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Portada Oficial de Instrucciones del Tribunal
                  </span>
                </label>
                {incluirPortadaTribunal && (
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <input
                      type="number"
                      min={15}
                      max={240}
                      value={duracionPortadaMin}
                      onChange={(e) =>
                        setDuracionPortadaMin(Math.max(15, Number(e.target.value) || 100))
                      }
                      className="w-14 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-center font-bold"
                    />
                    <span className="text-slate-500">min</span>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirSoluciones}
                  onChange={(e) => setIncluirSoluciones(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Incluir hoja <strong>«PLANTILLA DEFINITIVA DE RESPUESTAS»</strong>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirAnexoBOE}
                  onChange={(e) => setIncluirAnexoBOE(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Adjuntar <strong>Anexo de Corrección Comentada BOE</strong>{' '}
                  {paquetePDF ? `(${paquetePDF.paginasAnexoJustificaciones} págs.)` : ''}
                </span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={barajarOrdenPreguntas}
                    onChange={(e) => setBarajarOrdenPreguntas(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Barajar orden de preguntas (clave recalculada)
                  </span>
                </label>
                {barajarOrdenPreguntas && (
                  <button
                    type="button"
                    onClick={() => setSemillaBarajadoPDF((s) => s + 41)}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[10.5px] font-bold cursor-pointer"
                  >
                    <i className="fa-solid fa-shuffle mr-1"></i>
                    Rebarajar
                  </button>
                )}
              </div>
            </div>

            {/* Desglose estructural en vivo */}
            {paquetePDF && (
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-1.5 text-xs">
                <div className="font-mono font-black text-[10px] uppercase text-indigo-700 dark:text-indigo-300">
                  Estructura lista para descargar:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {incluirPortadaTribunal && (
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-[10.5px] font-bold">
                      Portada Tribunal (1 pág.)
                    </span>
                  )}
                  {paquetePDF.resumenSecciones.map((sec, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-[10.5px] font-bold"
                    >
                      {sec.titulo}: {sec.ordinarias}
                      {sec.reservas > 0 ? `+${sec.reservas}R` : ''}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold">
                    Hoja OMR Verde en Blanco (1 pág.)
                  </span>
                </div>
              </div>
            )}

            {/* BOTONES DE DESCARGA BAJO DEMANDA */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={!paquetePDF}
                onClick={() => ejecutarDescargaManual('todo_en_1_pdf')}
                className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-file-pdf"></i>
                <span>
                  Descargar Todo en 1 PDF (Examen + Plantilla Oficial en Blanco)
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!paquetePDF}
                  onClick={() => ejecutarDescargaManual('solo_examen')}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <i className="fa-solid fa-file-arrow-down"></i>
                  <span>Solo Examen PDF</span>
                </button>

                <button
                  type="button"
                  disabled={!paquetePDF}
                  onClick={() => ejecutarDescargaManual('solo_plantilla')}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <i className="fa-solid fa-table-cells"></i>
                  <span>Solo Plantilla en Blanco</span>
                </button>

                <button
                  type="button"
                  disabled={!paquetePDF}
                  onClick={() => ejecutarDescargaManual('examen_y_plantilla')}
                  className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>2 PDF separados</span>
                </button>

                <button
                  type="button"
                  disabled={!paquetePDF}
                  onClick={() => ejecutarDescargaManual('solo_anexo_boe')}
                  className="py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-scale-balanced"></i>
                  <span>Solo Anexo BOE PDF</span>
                </button>
              </div>
            </div>

            {/* FUNCIONES ADICIONALES DE PREPARACIÓN EN PAPEL */}
            <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-700 space-y-2.5">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Funciones adicionales para entrenamiento en papel
              </span>

              <button
                type="button"
                disabled={!paquetePDF}
                onClick={ejecutarDescargaPackDobleModelosAyB}
                className="w-full py-2 px-3 rounded-xl bg-violet-50 dark:bg-violet-950/45 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-900 dark:text-violet-200 border border-violet-300 dark:border-violet-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                title="Genera dos cuadernillos completos: Modelo A en orden original y Modelo B con las mismas preguntas barajadas y su clave recalculada"
              >
                <i className="fa-solid fa-clone text-violet-600 dark:text-violet-400"></i>
                <span>Descargar Pack Doble: Modelo A + Modelo B (barajado)</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!examenEnsamblado || guardadoEnBancoReciente}
                  onClick={handleGuardarCuadernilloEnBanco}
                  className="py-2 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/45 hover:bg-sky-100 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700 disabled:opacity-60 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Guarda este mismo cuadernillo en tu Banco de Exámenes para pasar tus respuestas de la hoja OMR cuando termines y calcular tu nota oficial"
                >
                  <i className="fa-solid fa-floppy-disk text-sky-600 dark:text-sky-400"></i>
                  <span>
                    {guardadoEnBancoReciente
                      ? '✓ Guardado en Banco'
                      : 'Guardar en Banco (Autocorregir)'}
                  </span>
                </button>

                {onCargarExamenEnPantalla && examenEnsamblado && (
                  <button
                    type="button"
                    onClick={() => onCargarExamenEnPantalla(examenEnsamblado)}
                    className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/45 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Abrir este cuadernillo en la Pestaña 1 para realizarlo o introducir las respuestas marcadas en papel"
                  >
                    <i className="fa-solid fa-desktop text-emerald-600 dark:text-emerald-400"></i>
                    <span>Abrir en Pestaña 1 (Pantalla)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL DE PREVISUALIZACIÓN EN VIVO DEL CUADERNILLO PDF Y PLANTILLA OFICIAL */}
      {paquetePDF && mostrarPrevisualizacionPDF && (
        <div className="bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-2xs shrink-0">
                <i className="fa-solid fa-book-open-reader"></i>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Previsualización en Vivo del Cuadernillo PDF Oficial
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Inspecciona cada página A4 del cuadernillo de examen, la hoja verde OMR en blanco o el anexo BOE antes de descargar o imprimir.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarPrevisualizacionPDF(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              Ocultar vista previa
            </button>
          </div>

          <VisorPrevisualizacionPdfOficial
            paquete={paquetePDF}
            documentoActivo={docPrevisualizado}
            onCambiarDocumento={setDocPrevisualizado}
            alturaContenedorClass="max-h-[680px]"
          />
        </div>
      )}
    </div>
  );
};
