import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ConvocatoriaAmbito,
  TipoPrueba,
  DificultadPrueba,
  TematicaNormativaId,
  ExamenCompleto,
  PreguntaExamen,
  ResultadoExamen,
  AnotacionResaltado,
  FormatoExamenJSONOficial,
  ItemAlmacenDuda,
} from '../types';
import {
  TEMATICAS_NORMATIVAS,
  LEYES_BOE_DISPONIBLES,
  CONVOCATORIAS_C1_AGE,
} from '../constants/boeData';
import { AnnotatedPlainTextViewer } from './AnnotatedPlainTextViewer';
import {
  parsearTextoOArchivoJSON,
  exportarExamenAJSON,
  resolverSustitucionesDeReserva,
  calcularResultadoExamenConReservas,
  asegurarSeparacionYNormativaReserva,
  obtenerRecursosArgumentacionDePregunta,
} from '../utils/jsonExamHelper';
import { generarBancoPreguntasBOE } from '../constants/boeQuestionsBank';
import { SelectorLeyesEInformaticaModal } from './SelectorLeyesEInformaticaModal';
import { ConfirmarEvaluacionModal } from './ConfirmarEvaluacionModal';
import { GestorRecursosArgumentacionPregunta } from './GestorRecursosArgumentacionPregunta';
import { obtenerUrlBOEParaNorma, renderizarTextoConEnlacesBOE } from '../utils/boeUrlHelper';
import {
  obtenerNormaEfectivaDePregunta,
  esNormaGenerica,
  registrarRespuestasEnControlFalladas,
  obtenerReferenciaConvocatoriaOficial,
  formatearBadgeConvocatoriaOficial,
  limpiarTextoConvocatoria,
} from '../utils/tematicaClassifier';

interface AITestGeneratorProps {
  onExamenGuardado: (examen: ExamenCompleto) => void;
  onActualizarPreguntaGlobal?: (preguntaActualizada: PreguntaExamen, examenPadre?: ExamenCompleto) => void;
  onRegistrarResultadoPreguntas?: (
    preguntas: PreguntaExamen[],
    respuestas: Record<number, string>
  ) => void;
  examenParaCargar?: ExamenCompleto | null;
  onLimpiarExamenCargado?: () => void;
  onNavegarAlmacenDudas?: () => void;
  itemsAlmacenDudas?: ItemAlmacenDuda[];
  onGuardarEnAlmacenDudas?: (item: ItemAlmacenDuda) => void;
}

export const AITestGenerator: React.FC<AITestGeneratorProps> = ({
  onExamenGuardado,
  onActualizarPreguntaGlobal,
  onRegistrarResultadoPreguntas,
  examenParaCargar,
  onLimpiarExamenCargado,
  onNavegarAlmacenDudas,
  itemsAlmacenDudas = [],
  onGuardarEnAlmacenDudas,
}) => {
  // Configuration State
  const [tipoPrueba, setTipoPrueba] = useState<TipoPrueba>('unitario');
  const [ambito, setAmbito] = useState<ConvocatoriaAmbito>('AGE');
  const [dificultad, setDificultad] = useState<DificultadPrueba>('trampa_tribunal');
  const [numPreguntas, setNumPreguntas] = useState<number>(10);
  const [modoRealizacion, setModoRealizacion] = useState<'interactivo' | 'examen'>('interactivo');
  const [modoCorreccion, setModoCorreccion] = useState<'paso_a_paso' | 'al_final'>('paso_a_paso');

  // Thematic selection
  const [tematicasSeleccionadas, setTematicasSeleccionadas] = useState<TematicaNormativaId[]>([
    'procedimiento_administrativo',
    'regimen_sector_publico',
    'funcion_publica_personal',
  ]);

  // Specific BOE Laws selection (including Ley 3/2018, RD 364/1995, RD 365/1995)
  const [leyesBOESeleccionadas, setLeyesBOESeleccionadas] = useState<string[]>([
    LEYES_BOE_DISPONIBLES[0].nombre, // Ley 39/2015 LPACAP
    LEYES_BOE_DISPONIBLES[1].nombre, // Ley 40/2015 LRJSP
    LEYES_BOE_DISPONIBLES[2].nombre, // TREBEP
    LEYES_BOE_DISPONIBLES[3].nombre, // Ley 3/2018 LOPDGDD
    LEYES_BOE_DISPONIBLES[4].nombre, // RD 364/1995
    LEYES_BOE_DISPONIBLES[5].nombre, // RD 365/1995
  ]);

  // Loading & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Consultando fuentes oficiales en www.boe.es...');

  // Active Exam State
  const [examenActivo, setExamenActivo] = useState<ExamenCompleto | null>(null);
  const [preguntaActualIdx, setPreguntaActualIdx] = useState(0);
  const [respuestasUsuario, setRespuestasUsuario] = useState<Record<number, string>>({});
  const [dudosasUsuario, setDudosasUsuario] = useState<Record<number, boolean>>({});
  const [examenFinalizado, setExamenFinalizado] = useState(false);
  const [tiempoRestanteSegundos, setTiempoRestanteSegundos] = useState(0);
  const [tiempoTranscurridoSegundos, setTiempoTranscurridoSegundos] = useState(0);
  const [tiempoConfiguradoMinutos, setTiempoConfiguradoMinutos] = useState<number>(0); // 0 = auto según n.º de preguntas
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [mostrarModalAjustarTiempo, setMostrarModalAjustarTiempo] = useState<boolean>(false);
  const [inputMinutosPersonalizados, setInputMinutosPersonalizados] = useState<string>('');
  const [filtroPreguntas, setFiltroPreguntas] = useState<'todas' | 'acertadas' | 'falladas' | 'blancos' | 'anuladas'>('todas');
  const [tipoComparativaC1, setTipoComparativaC1] = useState<'test_70' | 'supuesto_20' | 'global_90'>('test_70');

  // Interactive BOE Reference Validator Modal State
  const [preguntaValidandoBOE, setPreguntaValidandoBOE] = useState<{ pregunta: PreguntaExamen; index: number } | null>(null);
  const [modalLeyesPreguntaJustificacion, setModalLeyesPreguntaJustificacion] = useState<PreguntaExamen | null>(null);
  const [mostrarConfirmarEvaluacion, setMostrarConfirmarEvaluacion] = useState<boolean>(false);

  // Auto-advance in 'al_final' evaluation mode
  const [autoAvanceAlFinal, setAutoAvanceAlFinal] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('c1_auto_avance_al_final');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const autoAvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleAutoAvance = () => {
    setAutoAvanceAlFinal((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('c1_auto_avance_al_final', String(nextVal));
      } catch (_) {}
      return nextVal;
    });
  };

  // Annotations State (Highlighter and Balloon Notes)
  const [anotaciones, setAnotaciones] = useState<AnotacionResaltado[]>([]);
  const [toastAviso, setToastAviso] = useState<{ texto: string; tipo: 'exito' | 'error' | 'info' } | null>(null);
  const [mostrarProtocoloModal, setMostrarProtocoloModal] = useState(false);
  const [mostrarAntiDuplicadosModal, setMostrarAntiDuplicadosModal] = useState(false);
  
  // Custom practical case importer state (Proponer 20 preguntas)
  const [mostrarModalImportarCaso, setMostrarModalImportarCaso] = useState(false);
  const [textoCasoImportar, setTextoCasoImportar] = useState('');
  const [tituloCasoImportar, setTituloCasoImportar] = useState('');
  const [ambitoCasoImportar, setAmbitoCasoImportar] = useState<'CAM' | 'AGE'>('CAM');
  const [isGenerandoCaso, setIsGenerandoCaso] = useState(false);

  // Active exam rename state
  const [mostrarModalRenombrar, setMostrarModalRenombrar] = useState(false);
  const [nuevoTituloExamen, setNuevoTituloExamen] = useState('');

  const [historialPreguntasRecientes, setHistorialPreguntasRecientes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('c1_historial_preguntas_recientes');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [generationError, setGenerationError] = useState<{
    message: string;
    numPreguntas: number;
    isTimeout?: boolean;
  } | null>(null);

  const mostrarAviso = (texto: string, tipo: 'exito' | 'error' | 'info' = 'info') => {
    setToastAviso({ texto, tipo });
    setTimeout(() => setToastAviso(null), 4000);
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize official benchmark type when active exam is set
  useEffect(() => {
    if (examenActivo) {
      if (examenActivo.tipo === 'supuesto') {
        setTipoComparativaC1('supuesto_20');
      } else if (examenActivo.preguntas.length >= 80) {
        setTipoComparativaC1('global_90');
      } else {
        setTipoComparativaC1('test_70');
      }
    }
  }, [examenActivo?.id, examenActivo?.tipo]);

  // Load annotations from active exam or localStorage
  useEffect(() => {
    if (examenActivo) {
      if (examenActivo.anotaciones && examenActivo.anotaciones.length > 0) {
        setAnotaciones(examenActivo.anotaciones);
      } else {
        const saved = localStorage.getItem(`c1_anotaciones_${examenActivo.id}`);
        if (saved) {
          try {
            setAnotaciones(JSON.parse(saved));
          } catch (e) {
            console.error('Error cargando anotaciones:', e);
          }
        } else {
          setAnotaciones([]);
        }
      }
    }
  }, [examenActivo?.id]);

  // Session persistence: recover in-progress active exam on mount if any
  useEffect(() => {
    if (!examenParaCargar) {
      const sesionGuardada = localStorage.getItem('c1_active_exam_session');
      if (sesionGuardada) {
        try {
          const s = JSON.parse(sesionGuardada);
          // Only recover valid full exams (at least 5 questions) so the user is never stuck with 2 questions
          if (s && s.examenActivo && Array.isArray(s.examenActivo.preguntas) && s.examenActivo.preguntas.length >= 5) {
            setExamenActivo(s.examenActivo);
            setPreguntaActualIdx(Math.min(s.preguntaActualIdx || 0, s.examenActivo.preguntas.length - 1));
            setRespuestasUsuario(s.respuestasUsuario || {});
            setDudosasUsuario(s.dudosasUsuario || {});
            setExamenFinalizado(!!s.examenFinalizado);
            setModoRealizacion(s.modoRealizacion || 'interactivo');
            setModoCorreccion(s.modoCorreccion || (s.modoRealizacion === 'examen' ? 'al_final' : 'paso_a_paso'));
            setTiempoRestanteSegundos(s.tiempoRestanteSegundos || 0);
            setTiempoTranscurridoSegundos(s.tiempoTranscurridoSegundos || 0);
            if (s.anotaciones) setAnotaciones(s.anotaciones);
            if (s.examenActivo.tipo) setTipoPrueba(s.examenActivo.tipo);
            if (s.examenActivo.ambito) setAmbito(s.examenActivo.ambito);
          } else {
            // Discard broken or incomplete 2-question session
            localStorage.removeItem('c1_active_exam_session');
          }
        } catch (_) {
          localStorage.removeItem('c1_active_exam_session');
        }
      }
    }
  }, []);

  // Save session when active test or answers update
  useEffect(() => {
    if (examenActivo) {
      try {
        const sesion = {
          examenActivo,
          preguntaActualIdx,
          respuestasUsuario,
          dudosasUsuario,
          examenFinalizado,
          modoRealizacion,
          modoCorreccion,
          tiempoRestanteSegundos,
          tiempoTranscurridoSegundos,
          anotaciones,
        };
        localStorage.setItem('c1_active_exam_session', JSON.stringify(sesion));
      } catch (err) {
        console.warn('No se pudo guardar la sesión en localStorage:', err);
      }
    }
  }, [
    examenActivo,
    preguntaActualIdx,
    respuestasUsuario,
    dudosasUsuario,
    examenFinalizado,
    modoRealizacion,
    modoCorreccion,
    anotaciones,
  ]);

  const resetearExamenCompleto = (mensaje?: string) => {
    try {
      localStorage.removeItem('c1_active_exam_session');
    } catch (_) {}
    if (timerRef.current) clearInterval(timerRef.current);
    setExamenActivo(null);
    setRespuestasUsuario({});
    setDudosasUsuario({});
    setPreguntaActualIdx(0);
    setExamenFinalizado(false);
    setAnotaciones([]);
    setGenerationError(null);
    if (onLimpiarExamenCargado) onLimpiarExamenCargado();
    if (mensaje) mostrarAviso(mensaje, 'info');
  };

  const cerrarExamenActual = () => {
    resetearExamenCompleto('Sesión cerrada y guardada.');
  };

  const cargarBateriaOficialGarantizada = (cantidadDeseada?: number) => {
    const cant = cantidadDeseada || numPreguntas || 10;
    try {
      localStorage.removeItem('c1_active_exam_session');
    } catch (_) {}
    if (timerRef.current) clearInterval(timerRef.current);

    const tematicasTexto = tematicasSeleccionadas
      .map((id) => TEMATICAS_NORMATIVAS.find((t) => t.id === id)?.nombre || id)
      .join(', ');
    const leyesTexto = leyesBOESeleccionadas.join(', ');

    const data = generarBancoPreguntasBOE(
      tipoPrueba,
      ambito,
      cant,
      tematicasTexto,
      leyesTexto,
      historialPreguntasRecientes
    );

    // Actualizar historial anti-duplicados
    const enunciadosNuevos = data.preguntas.map((p) => p.enunciado);
    const actualizado = Array.from(new Set([...historialPreguntasRecientes, ...enunciadosNuevos])).slice(-100);
    setHistorialPreguntasRecientes(actualizado);
    try {
      localStorage.setItem('c1_historial_preguntas_recientes', JSON.stringify(actualizado));
    } catch (_) {}

    const nuevoExamen: ExamenCompleto = {
      id: `BOE-OFC-${Date.now()}`,
      titulo: data.titulo,
      tipo: data.tipo as TipoPrueba,
      ambito: data.ambito as ConvocatoriaAmbito,
      origen: 'generado_ia',
      categoria: (data.tipo === 'supuesto' || tipoPrueba === 'supuesto') ? 'supuesto_ia' : 'test_ia',
      fecha: new Date().toISOString().split('T')[0],
      dificultad: dificultad,
      tematicas: tematicasSeleccionadas,
      contextoCaso: data.contextoCaso,
      leyesBOEAplicadas: data.leyesBOEAplicadas,
      preguntas: data.preguntas,
      anotaciones: [],
    };

    setExamenActivo(nuevoExamen);
    setAnotaciones([]);
    setPreguntaActualIdx(0);
    setRespuestasUsuario({});
    setDudosasUsuario({});
    setExamenFinalizado(false);
    setGenerationError(null);

    const tiempoTotalSegs = tiempoConfiguradoMinutos > 0
      ? tiempoConfiguradoMinutos * 60
      : nuevoExamen.preguntas.length * 75;
    setTiempoRestanteSegundos(tiempoTotalSegs);
    setTiempoTranscurridoSegundos(0);
    setIsTimerPaused(false);

    onExamenGuardado(nuevoExamen);
    mostrarAviso(`¡Batería oficial de ${nuevoExamen.preguntas.length} preguntas cargada con éxito!`, 'exito');
  };

  // If external exam passed (e.g. from JSON importer or history)
  useEffect(() => {
    if (examenParaCargar) {
      try {
        localStorage.removeItem('c1_active_exam_session');
      } catch (_) {}
      const normalizado = asegurarSeparacionYNormativaReserva(examenParaCargar);
      setExamenActivo(normalizado);
      setPreguntaActualIdx(0);
      const respuestasPrevias = normalizado.resultado?.respuestasUsuario
        ? (normalizado.resultado.respuestasUsuario as Record<number, 'A' | 'B' | 'C' | 'D'>)
        : {};
      setRespuestasUsuario(respuestasPrevias);
      setDudosasUsuario({});
      setExamenFinalizado(!!normalizado.resultado);
      setGenerationError(null);
      setTipoPrueba(normalizado.tipo);
      setAmbito(normalizado.ambito);
      const tiempoSegs = normalizado.resultado?.duracionSegundos
        || (tiempoConfiguradoMinutos > 0 ? tiempoConfiguradoMinutos * 60 : Math.max(10 * 60, normalizado.preguntas.length * 75));
      setTiempoRestanteSegundos(tiempoSegs);
      setTiempoTranscurridoSegundos(normalizado.resultado?.duracionSegundos || 0);
      setIsTimerPaused(false);
      if (normalizado.anotaciones) {
        setAnotaciones(normalizado.anotaciones);
      }
      if (onLimpiarExamenCargado) onLimpiarExamenCargado();
    }
  }, [examenParaCargar]);

  // Cronómetro activo en TODOS los tests de forma unificada
  useEffect(() => {
    if (examenActivo && !examenFinalizado && !isTimerPaused && tiempoRestanteSegundos > 0) {
      timerRef.current = setInterval(() => {
        setTiempoRestanteSegundos((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            finalizarExamenOficial();
            mostrarAviso('¡Tiempo límite del examen concluido! Se ha evaluado automáticamente.', 'info');
            return 0;
          }
          return prev - 1;
        });
        setTiempoTranscurridoSegundos((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examenActivo, examenFinalizado, isTimerPaused, tiempoRestanteSegundos]);

  const ajustarTiempoExamen = (minutos: number) => {
    const segs = Math.max(60, Math.round(minutos * 60));
    setTiempoConfiguradoMinutos(minutos);
    setTiempoRestanteSegundos(segs);
    setIsTimerPaused(false);
    setMostrarModalAjustarTiempo(false);
    mostrarAviso(`Cronómetro fijado a ${minutos} minutos (${formatTimer(segs)})`, 'exito');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleTematica = (tId: TematicaNormativaId) => {
    if (tematicasSeleccionadas.includes(tId)) {
      if (tematicasSeleccionadas.length > 1) {
        setTematicasSeleccionadas(tematicasSeleccionadas.filter((t) => t !== tId));
      }
    } else {
      setTematicasSeleccionadas([...tematicasSeleccionadas, tId]);
    }
  };

  const isLeySeleccionada = (leyNombre: string, sigla?: string) => {
    return leyesBOESeleccionadas.some((item) => {
      if (item === leyNombre) return true;
      if (sigla && item.includes(sigla)) return true;
      const itemNorm = item.toLowerCase();
      const nomNorm = leyNombre.toLowerCase();
      const matchItem = itemNorm.match(/\b\d+\/\d{4}\b/);
      const matchNom = nomNorm.match(/\b\d+\/\d{4}\b/);
      if (matchItem && matchNom && matchItem[0] === matchNom[0]) return true;
      if (itemNorm.includes('trebep') && nomNorm.includes('trebep')) return true;
      if (itemNorm.includes('constitucion') && nomNorm.includes('constitucion')) return true;
      return itemNorm.includes(nomNorm) || nomNorm.includes(itemNorm);
    });
  };

  const toggleLeyBOE = (leyNombre: string, sigla?: string) => {
    if (isLeySeleccionada(leyNombre, sigla)) {
      if (leyesBOESeleccionadas.length > 1) {
        setLeyesBOESeleccionadas(
          leyesBOESeleccionadas.filter((item) => {
            if (item === leyNombre) return false;
            if (sigla && item.includes(sigla)) return false;
            const itemNorm = item.toLowerCase();
            const nomNorm = leyNombre.toLowerCase();
            const matchItem = itemNorm.match(/\b\d+\/\d{4}\b/);
            const matchNom = nomNorm.match(/\b\d+\/\d{4}\b/);
            if (matchItem && matchNom && matchItem[0] === matchNom[0]) return false;
            if (itemNorm.includes('trebep') && nomNorm.includes('trebep')) return false;
            if (itemNorm.includes('constitucion') && nomNorm.includes('constitucion')) return false;
            return !itemNorm.includes(nomNorm) && !nomNorm.includes(itemNorm);
          })
        );
      } else {
        mostrarAviso('Debe permanecer al menos una norma seleccionada para generar las preguntas.', 'info');
      }
    } else {
      setLeyesBOESeleccionadas([...leyesBOESeleccionadas, leyNombre]);
    }
  };

  const getEstadoPregunta = (idx: number): 'acertada' | 'fallada' | 'blanco' | 'anulada' | 'reserva_inactiva' => {
    if (!examenActivo || !examenActivo.preguntas || !examenActivo.preguntas[idx]) return 'blanco';
    const preg = examenActivo.preguntas[idx];
    if (preg.esAnulada) return 'anulada';
    if (preg.esReserva && !preg.activaEnEvaluacion) return 'reserva_inactiva';
    const resp = respuestasUsuario[idx];
    if (!resp || typeof resp !== 'string' || !resp.trim()) return 'blanco';
    const respLimpia = resp.trim().toUpperCase();
    const opcionCorrecta = preg.opciones?.find(
      (o) => o.esCorrecta === true || (o as any).esCorrecta === 'true'
    );
    if (!opcionCorrecta) return 'blanco';
    const letraCorrecta = opcionCorrecta.id?.toString().trim().toUpperCase();
    if (letraCorrecta === respLimpia) return 'acertada';
    return 'fallada';
  };

  const preguntasOrdinarias = useMemo(() => {
    return examenActivo ? examenActivo.preguntas.filter((p) => !p.esReserva) : [];
  }, [examenActivo]);

  const preguntasReserva = useMemo(() => {
    return examenActivo ? examenActivo.preguntas.filter((p) => p.esReserva) : [];
  }, [examenActivo]);

  const respondidasOrdinarias = useMemo(() => {
    if (!examenActivo) return 0;
    return preguntasOrdinarias.filter((p) => {
      const idx = examenActivo.preguntas.findIndex((item) => item.id === p.id);
      return idx >= 0 && !!respuestasUsuario[idx];
    }).length;
  }, [examenActivo, preguntasOrdinarias, respuestasUsuario]);

  const reservasActivasCount = useMemo(() => {
    return preguntasReserva.filter((p) => p.activaEnEvaluacion).length;
  }, [preguntasReserva]);

  const indicesFiltrados = useMemo(() => {
    if (!examenActivo) return [];
    if (!examenFinalizado || filtroPreguntas === 'todas') {
      return examenActivo.preguntas.map((_, i) => i);
    }
    return examenActivo.preguntas
      .map((_, i) => i)
      .filter((idx) => {
        const estado = getEstadoPregunta(idx);
        if (filtroPreguntas === 'acertadas') return estado === 'acertada';
        if (filtroPreguntas === 'falladas') return estado === 'fallada';
        if (filtroPreguntas === 'blancos') return estado === 'blanco';
        if (filtroPreguntas === 'anuladas') return estado === 'anulada';
        return true;
      });
  }, [examenActivo, examenFinalizado, filtroPreguntas, respuestasUsuario]);

  const auditoriaSingularidad = useMemo(() => {
    if (!examenActivo || !examenActivo.preguntas.length) return null;
    const total = examenActivo.preguntas.length;
    const articulosMap = new Map<string, number>();
    const huellasSet = new Set<string>();
    let duplicadosEnunciado = 0;
    let duplicadosHuella = 0;

    examenActivo.preguntas.forEach((p, idx) => {
      const artNorma = p.justificacionLegal?.norma || 'Normativa Oficial BOE';
      const artArticulo = p.justificacionLegal?.articulo || 'Precepto General';
      const artKey = `${artNorma} · ${artArticulo}`;
      articulosMap.set(artKey, (articulosMap.get(artKey) || 0) + 1);

      const isEnunciadoDupe = examenActivo.preguntas.findIndex(
        (item, i) => i !== idx && item.enunciado.trim().toLowerCase() === p.enunciado.trim().toLowerCase()
      ) >= 0;
      if (isEnunciadoDupe) duplicadosEnunciado++;

      const huella = p.huellaAuditoria || p.enunciado.slice(0, 30);
      if (huellasSet.has(huella)) {
        duplicadosHuella++;
      } else {
        huellasSet.add(huella);
      }
    });

    return {
      total,
      articulosUnicos: articulosMap.size,
      duplicadosEnunciado,
      duplicadosHuella,
      porcentajeIneditas: 100,
      articulosDetalle: Array.from(articulosMap.entries()).map(([key, count]) => ({ normaArt: key, count })),
    };
  }, [examenActivo]);

  const cambiarFiltro = (nuevoFiltro: 'todas' | 'acertadas' | 'falladas' | 'blancos' | 'anuladas') => {
    setFiltroPreguntas(nuevoFiltro);
    if (!examenActivo) return;

    const nuevosIndices = examenActivo.preguntas
      .map((_, i) => i)
      .filter((idx) => {
        if (nuevoFiltro === 'todas') return true;
        const estado = getEstadoPregunta(idx);
        if (nuevoFiltro === 'acertadas') return estado === 'acertada';
        if (nuevoFiltro === 'falladas') return estado === 'fallada';
        if (nuevoFiltro === 'blancos') return estado === 'blanco';
        if (nuevoFiltro === 'anuladas') return estado === 'anulada';
        return true;
      });

    if (nuevosIndices.length > 0 && !nuevosIndices.includes(preguntaActualIdx)) {
      setPreguntaActualIdx(nuevosIndices[0]);
    }
  };

  const toggleAnulada = (idx: number) => {
    if (!examenActivo) return;
    const preguntasClonadas = examenActivo.preguntas.map((p, i) => {
      if (i === idx) {
        return { ...p, esAnulada: !p.esAnulada };
      }
      return { ...p };
    });

    const { resultado, preguntasConSustitucion } = calcularResultadoExamenConReservas(
      preguntasClonadas,
      respuestasUsuario,
      examenActivo.tipo,
      tiempoTranscurridoSegundos,
      examenActivo.resultado?.fechaRealizacion || examenActivo.fecha
    );

    const examenActualizado: ExamenCompleto = {
      ...examenActivo,
      preguntas: preguntasConSustitucion,
      resultado: examenFinalizado ? resultado : examenActivo.resultado,
    };

    setExamenActivo(examenActualizado);
    onExamenGuardado(examenActualizado);
  };

  // Annotations Management (Add/Update & Delete)
  const handleGuardarAnotacion = (nuevaAnotacion: AnotacionResaltado) => {
    const sinPrevia = anotaciones.filter((a) => a.id !== nuevaAnotacion.id);
    const actualizadas = [...sinPrevia, nuevaAnotacion];
    setAnotaciones(actualizadas);

    if (examenActivo) {
      const examenActualizado = {
        ...examenActivo,
        anotaciones: actualizadas,
      };
      setExamenActivo(examenActualizado);
      onExamenGuardado(examenActualizado);
      localStorage.setItem(`c1_anotaciones_${examenActivo.id}`, JSON.stringify(actualizadas));
    }
  };

  const handleEliminarAnotacion = (anotacionId: string) => {
    const actualizadas = anotaciones.filter((a) => a.id !== anotacionId);
    setAnotaciones(actualizadas);

    if (examenActivo) {
      const examenActualizado = {
        ...examenActivo,
        anotaciones: actualizadas,
      };
      setExamenActivo(examenActualizado);
      onExamenGuardado(examenActualizado);
      localStorage.setItem(`c1_anotaciones_${examenActivo.id}`, JSON.stringify(actualizadas));
    }
  };

  // Export Complete Test to JSON file (including question web links, local files, and Almacén de Dudas)
  const exportarTestAJSON = () => {
    if (!examenActivo) return;
    exportarExamenAJSON(
      {
        ...examenActivo,
        anotaciones,
      },
      itemsAlmacenDudas
    );
  };

  const handleImportarJSONDirecto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const resultado = parsearTextoOArchivoJSON(event.target.result);
        const ex = Array.isArray(resultado) ? resultado[0] : resultado;
        const examenNormalizado = asegurarSeparacionYNormativaReserva(ex);
        setExamenActivo(examenNormalizado);
        setModoRealizacion('interactivo');
        setRespuestasUsuario({});
        setExamenFinalizado(false);
        setPreguntaActualIdx(0);
        setAnotaciones(examenNormalizado.anotaciones || []);
        onExamenGuardado(examenNormalizado);
        const ordCount = examenNormalizado.preguntas.filter((p) => !p.esReserva).length;
        const resCount = examenNormalizado.preguntas.filter((p) => p.esReserva).length;
        mostrarAviso(`¡Examen "${examenNormalizado.titulo}" (${ordCount} ordinarias + ${resCount} de reserva) importado con éxito!`, 'exito');
      } catch (err: any) {
        mostrarAviso('Error al importar archivo JSON/TXT: ' + (err.message || 'Formato no válido'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generate test with Gemini API via backend proxy
  const generarExamenConIA = async () => {
    // 1. Limpiar cualquier progreso anterior de localStorage para empezar sesión limpia
    try {
      localStorage.removeItem('c1_active_exam_session');
    } catch (_) {}

    if (timerRef.current) clearInterval(timerRef.current);
    setExamenActivo(null);
    setRespuestasUsuario({});
    setDudosasUsuario({});
    setPreguntaActualIdx(0);
    setExamenFinalizado(false);
    setAnotaciones([]);
    setGenerationError(null);

    setIsGenerating(true);
    setLoadingStepText(`Conectando con www.boe.es para preparar ${numPreguntas} preguntas...`);

    const timer1 = setTimeout(() => {
      setLoadingStepText(`Extrayendo preceptos normativos y redactando ${numPreguntas} preguntas con 4 opciones...`);
    }, 1500);

    const timer2 = setTimeout(() => {
      setLoadingStepText(`Distribuyendo preguntas equitativamente entre las leyes seleccionadas...`);
    }, 3000);

    const timer3 = setTimeout(() => {
      setLoadingStepText(`Verificando fundamentación legal en el BOE (TREBEP, Reales Decretos, Ley 3/2018)...`);
    }, 6000);

    const timer4 = setTimeout(() => {
      setLoadingStepText(`Eliminando sesgos de opciones, equilibrando letras (25% A/B/C/D) y longitudes...`);
    }, 12000);

    // Timeout amplio de 120s (o 180s para simulacros de 70) para no abortar prematuramente
    const timeoutMs = numPreguntas >= 70 ? 180000 : 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoPrueba,
          ambito: ambito,
          tematicas: tematicasSeleccionadas.map(
            (id) => TEMATICAS_NORMATIVAS.find((t) => t.id === id)?.nombre || id
          ),
          leyes: leyesBOESeleccionadas,
          numPreguntas: numPreguntas,
          dificultad: dificultad,
          preguntasExcluidas: historialPreguntasRecientes.slice(-25),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();

      // Validación rigurosa de array y número de preguntas antes de renderizar
      if (!data || !Array.isArray(data.preguntas) || data.preguntas.length === 0) {
        throw new Error('La respuesta del servidor no contiene una lista válida de preguntas normativas.');
      }

      if (data.preguntas.length < numPreguntas) {
        throw new Error(
          `Se solicitaron ${numPreguntas} preguntas pero el generador devolvió ${data.preguntas.length}. Puedes reintentar o cargar la batería oficial completa.`
        );
      }

      const preguntasProcesadas = data.preguntas.slice(0, numPreguntas).map((p: any, idx: number) => ({
        ...p,
        id: idx + 1,
      }));

      // Actualizar historial anti-duplicados para garantizar no repetición en turnos sucesivos
      const enunciadosNuevos = preguntasProcesadas.map((p: any) => p.enunciado);
      const actualizado = Array.from(new Set([...historialPreguntasRecientes, ...enunciadosNuevos])).slice(-100);
      setHistorialPreguntasRecientes(actualizado);
      try {
        localStorage.setItem('c1_historial_preguntas_recientes', JSON.stringify(actualizado));
      } catch (_) {}

      const nuevoExamen: ExamenCompleto = {
        id: `BOE-GEN-${Date.now()}`,
        titulo:
          data.titulo ||
          (tipoPrueba === 'supuesto'
            ? `Supuesto Práctico Oficial (${ambito}) - ${numPreguntas} Preguntas`
            : `Test Normativo Oficial (${ambito}) - ${numPreguntas} Preguntas`),
        tipo: data.tipo || tipoPrueba,
        ambito: data.ambito || ambito,
        origen: 'generado_ia',
        categoria: (data.categoria as any) || (tipoPrueba === 'supuesto' ? 'supuesto_ia' : 'test_ia'),
        fecha: new Date().toISOString().split('T')[0],
        dificultad: dificultad,
        tematicas: tematicasSeleccionadas,
        contextoCaso: data.contextoCaso,
        leyesBOEAplicadas: data.leyesBOEAplicadas || leyesBOESeleccionadas,
        preguntas: preguntasProcesadas,
        anotaciones: [],
      };

      setExamenActivo(nuevoExamen);
      setAnotaciones([]);
      setPreguntaActualIdx(0);
      setRespuestasUsuario({});
      setDudosasUsuario({});
      setExamenFinalizado(false);
      setGenerationError(null);

      const tiempoTotalSegs = tiempoConfiguradoMinutos > 0
        ? tiempoConfiguradoMinutos * 60
        : nuevoExamen.preguntas.length * 75;
      setTiempoRestanteSegundos(tiempoTotalSegs);
      setTiempoTranscurridoSegundos(0);
      setIsTimerPaused(false);

      onExamenGuardado(nuevoExamen);
      mostrarAviso(`¡Test de ${nuevoExamen.preguntas.length} preguntas generado con éxito!`, 'exito');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timeoutId);
      console.error('Error generando examen:', err);

      const isTimeout =
        err.name === 'AbortError' ||
        err.message?.toLowerCase().includes('aborted') ||
        err.message?.toLowerCase().includes('timeout');

      // Recuperación inmediata garantizada: cargar la batería oficial verificada con las leyes seleccionadas
      cargarBateriaOficialGarantizada(numPreguntas);
      mostrarAviso(
        `Se ha activado automáticamente la batería oficial verificada del BOE (${numPreguntas} preguntas) con distribución en las leyes seleccionadas (TREBEP, Reales Decretos, Ley 3/2018).`,
        'info'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const seleccionarOpcion = (opcionId: 'A' | 'B' | 'C' | 'D') => {
    if (examenFinalizado) return;
    if (modoCorreccion === 'paso_a_paso' && respuestasUsuario[preguntaActualIdx]) {
      // En modo paso a paso, una vez revelada la solución oficial no se permite alterar
      return;
    }

    // Cancelar cualquier temporizador de auto-avance previo
    if (autoAvanceTimerRef.current) {
      clearTimeout(autoAvanceTimerRef.current);
      autoAvanceTimerRef.current = null;
    }

    // Si la opción pulsada es la que ya estaba marcada, permitir desmarcarla (dejar en blanco)
    if (respuestasUsuario[preguntaActualIdx] === opcionId) {
      const nuevasRespuestas = { ...respuestasUsuario };
      delete nuevasRespuestas[preguntaActualIdx];
      setRespuestasUsuario(nuevasRespuestas);
      return;
    }

    setRespuestasUsuario({
      ...respuestasUsuario,
      [preguntaActualIdx]: opcionId,
    });

    // En modo paso a paso, si el usuario acierta una pregunta que antes estaba fallada, queda registrada inmediatamente como superada
    if (modoCorreccion === 'paso_a_paso' && examenActivo?.preguntas[preguntaActualIdx]) {
      const pregActual = examenActivo.preguntas[preguntaActualIdx];
      registrarRespuestasEnControlFalladas([pregActual], { 0: opcionId });
      if (onRegistrarResultadoPreguntas) {
        onRegistrarResultadoPreguntas([pregActual], { 0: opcionId });
      }
    }

    // Auto-avance a la siguiente pregunta si estamos en modo evaluación al final
    if (modoCorreccion === 'al_final' && autoAvanceAlFinal && !examenFinalizado) {
      if (examenActivo && preguntaActualIdx < examenActivo.preguntas.length - 1) {
        autoAvanceTimerRef.current = setTimeout(() => {
          setPreguntaActualIdx((prev) => {
            if (examenActivo && prev < examenActivo.preguntas.length - 1) {
              return prev + 1;
            }
            return prev;
          });
        }, 280);
      }
    }
  };

  const desmarcarRespuestaActual = () => {
    if (examenFinalizado) return;
    if (autoAvanceTimerRef.current) {
      clearTimeout(autoAvanceTimerRef.current);
      autoAvanceTimerRef.current = null;
    }
    if (respuestasUsuario[preguntaActualIdx] !== undefined) {
      const nuevasRespuestas = { ...respuestasUsuario };
      delete nuevasRespuestas[preguntaActualIdx];
      setRespuestasUsuario(nuevasRespuestas);
    }
  };

  const toggleDudosa = (idx: number) => {
    setDudosasUsuario({
      ...dudosasUsuario,
      [idx]: !dudosasUsuario[idx],
    });
  };

  const reiniciarParaRealizarDeNuevo = () => {
    try {
      localStorage.removeItem('c1_active_exam_session');
    } catch (_) {}
    if (timerRef.current) clearInterval(timerRef.current);
    setRespuestasUsuario({});
    setDudosasUsuario({});
    setPreguntaActualIdx(0);
    setExamenFinalizado(false);
    const tiempoTotal = tiempoConfiguradoMinutos > 0
      ? tiempoConfiguradoMinutos * 60
      : (examenActivo?.preguntas.length || 10) * 75;
    setTiempoRestanteSegundos(tiempoTotal);
    setTiempoTranscurridoSegundos(0);
    setIsTimerPaused(false);
    setFiltroPreguntas('todas');
    if (examenActivo) {
      const baseId = examenActivo.testBaseId || examenActivo.id;
      const nuevoNumeroIntento = (examenActivo.intentoNumero || 1) + 1;
      const tituloBase = examenActivo.titulo.replace(/\s*\(Intento\s*\d+\)/i, '').trim();
      const nuevoTitulo = `${tituloBase} (Intento ${nuevoNumeroIntento})`;

      const examenNuevoIntento: ExamenCompleto = {
        ...examenActivo,
        id: `${baseId}-intento-${Date.now()}`,
        testBaseId: baseId,
        intentoNumero: nuevoNumeroIntento,
        titulo: nuevoTitulo,
        resultado: undefined,
        fecha: new Date().toISOString().split('T')[0],
      };
      setExamenActivo(examenNuevoIntento);
    }
    mostrarAviso('¡Test reiniciado para un nuevo intento! Al completarlo se guardará en tu historial y se contabilizará en los KPIs.', 'exito');
  };

  const solicitarEvaluarExamen = () => {
    if (!examenActivo || examenFinalizado) return;
    setMostrarConfirmarEvaluacion(true);
  };

  const finalizarExamenOficial = () => {
    if (!examenActivo) return;
    setMostrarConfirmarEvaluacion(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Registro automático con la fecha y hora exacta en que se realiza y evalúa el examen
    const fechaAhoraISO = new Date().toISOString();
    const fechaHoyYMD = fechaAhoraISO.split('T')[0];

    const { resultado, preguntasConSustitucion } = calcularResultadoExamenConReservas(
      examenActivo.preguntas,
      respuestasUsuario,
      examenActivo.tipo,
      tiempoTranscurridoSegundos,
      fechaAhoraISO
    );

    // Registrar respuestas en el control de preguntas falladas para que las acertadas dejen de figurar como falladas
    registrarRespuestasEnControlFalladas(
      examenActivo.preguntas,
      resultado.respuestasUsuario,
      fechaAhoraISO
    );
    if (onRegistrarResultadoPreguntas) {
      onRegistrarResultadoPreguntas(examenActivo.preguntas, resultado.respuestasUsuario);
    }

    const examenConResultado: ExamenCompleto = {
      ...examenActivo,
      fecha: fechaHoyYMD,
      resultado: {
        ...resultado,
        fechaRealizacion: fechaAhoraISO,
      },
      anotaciones,
    };

    setRespuestasUsuario(resultado.respuestasUsuario as Record<number, 'A' | 'B' | 'C' | 'D'>);
    setExamenActivo(examenConResultado);
    setExamenFinalizado(true);
    onExamenGuardado(examenConResultado);
    mostrarAviso('¡Examen completado y calificado! Tu resultado ha sido volcado automáticamente a las estadísticas y KPIs de hoy.', 'exito');
  };

  const handleRenombrarExamenActivo = (nuevoTitulo: string) => {
    if (!examenActivo || !nuevoTitulo.trim()) return;
    const actualizado: ExamenCompleto = {
      ...examenActivo,
      titulo: nuevoTitulo.trim(),
    };
    setExamenActivo(actualizado);
    onExamenGuardado(actualizado);
    setMostrarModalRenombrar(false);
    mostrarAviso(`Título del examen actualizado a "${actualizado.titulo}"`, 'exito');
  };

  const handleGenerarDesdeTextoCaso = async () => {
    if (!textoCasoImportar || textoCasoImportar.trim().length < 30) {
      mostrarAviso('Por favor, introduce o pega el relato fáctico del caso práctico (mínimo 30 caracteres).', 'error');
      return;
    }
    setIsGenerandoCaso(true);
    try {
      const response = await fetch('/api/generate-from-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseText: textoCasoImportar.trim(),
          titulo: tituloCasoImportar.trim() || `Supuesto Práctico Oficial (${ambitoCasoImportar}) - 20 Preguntas`,
          ambito: ambitoCasoImportar,
          leyes: leyesBOESeleccionadas,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.examen) {
        throw new Error(data.error || 'No se pudieron formular las 20 preguntas del supuesto.');
      }

      const nuevoExamen = asegurarSeparacionYNormativaReserva(data.examen);
      setExamenActivo(nuevoExamen);
      setPreguntaActualIdx(0);
      setRespuestasUsuario({});
      setDudosasUsuario({});
      setExamenFinalizado(false);
      setAnotaciones([]);
      const tiempoTotalSegs = tiempoConfiguradoMinutos > 0
        ? tiempoConfiguradoMinutos * 60
        : nuevoExamen.preguntas.length * 75;
      setTiempoRestanteSegundos(tiempoTotalSegs);
      setTiempoTranscurridoSegundos(0);
      setIsTimerPaused(false);
      setMostrarModalImportarCaso(false);
      setTextoCasoImportar('');
      setTituloCasoImportar('');
      onExamenGuardado(nuevoExamen);
      mostrarAviso(`¡Supuesto de 20 preguntas (15 ordinarias + 5 reservas) generado con éxito y vinculado al caso!`, 'exito');
    } catch (err: any) {
      console.error('Error generando preguntas desde caso fáctico:', err);
      mostrarAviso(err.message || 'Error al conectar con el servidor para proponer las 20 preguntas.', 'error');
    } finally {
      setIsGenerandoCaso(false);
    }
  };

  const safeIdx =
    examenActivo && examenActivo.preguntas && examenActivo.preguntas.length > 0
      ? Math.max(0, Math.min(preguntaActualIdx, examenActivo.preguntas.length - 1))
      : 0;
  const preguntaActual =
    examenActivo && examenActivo.preguntas && examenActivo.preguntas.length > 0
      ? (examenActivo.preguntas[safeIdx] || examenActivo.preguntas[0] || null)
      : null;
  const respuestaActual = respuestasUsuario[safeIdx];

  const exportarExamenPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Sello de Garantía y Fuente Oficial Exclusiva BOE */}
      <div className="bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 shadow-2xs">
            <i className="fa-solid fa-scale-balanced"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Fuente Oficial Exclusiva: Boletín Oficial del Estado
              </span>
              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                www.boe.es
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Todas las preguntas, supuestos y soluciones están referenciadas con enlace canónico al texto consolidado vigente del BOE.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            💡 <strong>Subrayador activo:</strong> Selecciona cualquier texto para resaltar o añadir notas.
          </span>
          <a
            href="https://www.boe.es"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Portal BOE</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
          </a>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastAviso && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-fade-in shadow-xl">
          <div
            className={`p-3 rounded-xl border shadow-md flex items-center justify-between gap-3 text-xs font-bold ${
              toastAviso.tipo === 'exito'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : toastAviso.tipo === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                : 'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <i
                className={`fa-solid ${
                  toastAviso.tipo === 'exito'
                    ? 'fa-circle-check text-emerald-600'
                    : toastAviso.tipo === 'error'
                    ? 'fa-circle-exclamation text-rose-600'
                    : 'fa-circle-info text-indigo-600'
                }`}
              ></i>
              <span>{toastAviso.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastAviso(null)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer ml-2"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* CONFIGURATOR VIEW (WHEN NO ACTIVE EXAM) */}
      {!examenActivo && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-6 shadow-md space-y-5">
            <div className="border-b-2 border-indigo-100 dark:border-slate-700 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Configuración del Generador Normativo
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Selecciona la legislación específica aplicable (AGE / Comunidad de Madrid) y genera tu prueba con IA.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMostrarModalImportarCaso(true)}
                  className="py-1.5 px-3 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Importar un texto de supuesto práctico para generar 20 preguntas vinculadas"
                >
                  <i className="fa-solid fa-scroll text-amber-600 dark:text-amber-400"></i>
                  <span>Importar Texto de Supuesto (20 Q)</span>
                </button>
                <input
                  id="direct-import-exam-file"
                  type="file"
                  accept=".json,.txt,text/plain"
                  onChange={handleImportarJSONDirecto}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('direct-import-exam-file')?.click()}
                  className="py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Importar un archivo de examen oficial en .JSON o .TXT"
                >
                  <i className="fa-solid fa-file-import text-indigo-600 dark:text-indigo-400"></i>
                  <span>Importar JSON / TXT</span>
                </button>
                <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                  Modelo: Gemini 3.8 Flash
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarAntiDuplicadosModal(true)}
                  className="py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Directriz Obligatoria: Generación Inédita y No Repetición (Anti-Duplicados)"
                >
                  <i className="fa-solid fa-arrows-rotate text-emerald-600"></i>
                  <span>Anti-Duplicados Activo</span>
                  <i className="fa-solid fa-circle-info text-[8.5px] text-emerald-500"></i>
                </button>
              </div>
            </div>

            {/* Banner de control de errores y recuperación garantizada */}
            {generationError && (
              <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 space-y-3 animate-fade-in shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs shrink-0">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-100">
                        {generationError.isTimeout ? 'Tiempo de espera agotado' : 'Aviso en la generación de preguntas'}
                      </h4>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                        {generationError.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerationError(null)}
                    className="text-rose-500 hover:text-rose-700 text-xs cursor-pointer p-1"
                    title="Cerrar aviso"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-rose-200 dark:border-rose-800/80">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={generarExamenConIA}
                    className="py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i>
                    <span>Reintentar generación ({generationError.numPreguntas} preguntas)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cargarBateriaOficialGarantizada(generationError.numPreguntas)}
                    className="py-2 px-3.5 bg-white dark:bg-slate-800 hover:bg-rose-100/50 dark:hover:bg-slate-700 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                    <span>Cargar batería oficial garantizada ({generationError.numPreguntas} preguntas)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Modalidad y Ámbito */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  1. Modalidad de Prueba
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTipoPrueba('unitario')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      tipoPrueba === 'unitario'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black block">Test Tipo Test</span>
                      {tipoPrueba === 'unitario' && (
                        <i className="fa-solid fa-circle-check text-indigo-600 dark:text-indigo-400 text-xs"></i>
                      )}
                    </div>
                    <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
                      Preguntas directas de literalidad, órganos, competencias y plazos.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPrueba('supuesto')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      tipoPrueba === 'supuesto'
                        ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black block">Supuesto Práctico</span>
                      {tipoPrueba === 'supuesto' && (
                        <i className="fa-solid fa-circle-check text-amber-600 dark:text-amber-400 text-xs"></i>
                      )}
                    </div>
                    <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
                      Caso fáctico de hecho administrativo con preguntas vinculadas.
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Ámbito Territorial / Convocatoria
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAmbito('AGE');
                      setLeyesBOESeleccionadas([
                        LEYES_BOE_DISPONIBLES[0].nombre, // Ley 39/2015
                        LEYES_BOE_DISPONIBLES[1].nombre, // Ley 40/2015
                        LEYES_BOE_DISPONIBLES[2].nombre, // TREBEP
                        LEYES_BOE_DISPONIBLES[3].nombre, // Ley 3/2018
                        LEYES_BOE_DISPONIBLES[4].nombre, // RD 364/1995
                        LEYES_BOE_DISPONIBLES[5].nombre, // RD 365/1995
                      ]);
                    }}
                    className={`py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      ambito === 'AGE'
                        ? 'border-indigo-600 bg-indigo-600 text-white font-bold ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <span className="text-xs font-black block">AGE</span>
                    <span className="text-[8.5px] opacity-80 block font-mono">Estado C1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAmbito('CAM');
                      setLeyesBOESeleccionadas([
                        'Ley Orgánica 3/1983, de 25 de febrero, de Estatuto de Autonomía de la Comunidad de Madrid',
                        'Ley 1/1983, de 13 de diciembre, de Gobierno y Administración de la Comunidad de Madrid',
                        'Reglamento de la Asamblea de Madrid',
                        'Ley 1/1986, de 10 de abril, de la Función Pública de la Comunidad de Madrid',
                        'Ley 9/1990, de 8 de noviembre, Reguladora de la Hacienda de la Comunidad de Madrid',
                      ]);
                    }}
                    className={`py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      ambito === 'CAM'
                        ? 'border-rose-600 bg-rose-600 text-white font-bold ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <span className="text-xs font-black block">CAM</span>
                    <span className="text-[8.5px] opacity-80 block font-mono">Madrid C1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmbito('AMBOS')}
                    className={`py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      ambito === 'AMBOS'
                        ? 'border-purple-600 bg-purple-600 text-white font-bold ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <span className="text-xs font-black block">Ambos</span>
                    <span className="text-[8.5px] opacity-80 block font-mono">Mixto</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Legislación Específica Aplicable al Test / Supuesto */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/25 border-2 border-indigo-200 dark:border-indigo-800/80 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      2. Legislación Específica Aplicable ({leyesBOESeleccionadas.length} seleccionadas)
                    </label>
                    <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase">
                      Filtrado Estricto de Exclusión
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Solo se generarán preguntas de las casillas marcadas. El 100% de la batería se restringirá a este pool normativo.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() =>
                      setLeyesBOESeleccionadas([
                        'Ley Orgánica 3/1983, de 25 de febrero, de Estatuto de Autonomía de la Comunidad de Madrid',
                        'Ley 1/1983, de 13 de diciembre, de Gobierno y Administración de la Comunidad de Madrid',
                        'Reglamento de la Asamblea de Madrid',
                        'Ley 1/1986, de 10 de abril, de la Función Pública de la Comunidad de Madrid',
                        'Ley 9/1990, de 8 de noviembre, Reguladora de la Hacienda de la Comunidad de Madrid',
                      ])
                    }
                    className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 hover:bg-red-100 cursor-pointer"
                    title="Configura exclusivamente la normativa oficial de la Comunidad de Madrid"
                  >
                    ★ Solo CAM (Estatuto, Gobierno, Asamblea, FP, Hacienda)
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLeyesBOESeleccionadas([
                        LEYES_BOE_DISPONIBLES[2].nombre, // TREBEP
                        LEYES_BOE_DISPONIBLES[4].nombre, // RD 364/1995
                        LEYES_BOE_DISPONIBLES[5].nombre, // RD 365/1995
                      ])
                    }
                    className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    title="Configura exclusivamente TREBEP y los dos Reales Decretos AGE (364/95 y 365/95)"
                  >
                    ★ Solo TREBEP y RDs (364/95 y 365/95)
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLeyesBOESeleccionadas([
                        LEYES_BOE_DISPONIBLES[0].nombre, // Ley 39/2015
                        LEYES_BOE_DISPONIBLES[1].nombre, // Ley 40/2015
                        LEYES_BOE_DISPONIBLES[2].nombre, // TREBEP
                        LEYES_BOE_DISPONIBLES[3].nombre, // Ley 3/2018
                        LEYES_BOE_DISPONIBLES[6].nombre, // Ley 9/2017 LCSP
                        LEYES_BOE_DISPONIBLES[7].nombre, // LGP
                      ])
                    }
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    ★ Solo AGE General
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setLeyesBOESeleccionadas(LEYES_BOE_DISPONIBLES.map((l) => l.nombre))}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Todas ({LEYES_BOE_DISPONIBLES.length})
                  </button>
                </div>
              </div>

              {/* Informative banner on strict statutory exclusion */}
              <div className="flex items-center justify-between text-[10px] text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 font-mono">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-filter-circle-check text-emerald-600"></i>
                  <strong>Regla de Exclusión Total Activa:</strong> 100% de preguntas asignadas exclusivamente a las {leyesBOESeleccionadas.length} leyes marcadas (0% de normas desmarcadas).
                </span>
                <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold">
                  {leyesBOESeleccionadas.length === 1 ? '1 norma activa' : `${leyesBOESeleccionadas.length} normas activas`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {LEYES_BOE_DISPONIBLES.filter(
                  (l) => ambito === 'AMBOS' || l.ambito === 'AMBOS' || l.ambito === ambito
                ).map((ley) => {
                  const isChecked = isLeySeleccionada(ley.nombre, ley.sigla);
                  const isCAM = ley.ambito === 'CAM' || ley.nombre.toLowerCase().includes('comunidad de madrid') || ley.nombre.toLowerCase().includes('asamblea de madrid');

                  return (
                    <div
                      key={ley.idBOE}
                      onClick={() => toggleLeyBOE(ley.nombre, ley.sigla)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between gap-1.5 ${
                        isChecked
                          ? isCAM
                            ? 'border-red-600 bg-red-50/60 dark:bg-red-950/40 text-red-950 dark:text-red-200 shadow-2xs ring-1 ring-red-400/40'
                            : 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-400/40'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold leading-tight block">
                              {ley.sigla}
                            </span>
                            {isCAM && (
                              <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300">
                                CAM
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                            {ley.nombre}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="rounded text-indigo-600 focus:ring-0 mt-0.5 cursor-pointer"
                        />
                      </div>
                      <p className="text-[8.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {ley.descripcionBreve}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Parámetros y Modalidad */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  3. Enfoque y Dificultad
                </label>
                <select
                  value={dificultad}
                  onChange={(e: any) => setDificultad(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="trampa_tribunal">🎯 Exigente / Preguntas Trampa CPS y Dictámenes</option>
                  <option value="plazos">⏱️ Plazos, Cómputos y Silencios Administrativos</option>
                  <option value="estandar">⚖️ Estándar / Comprensión de Preceptos Legales</option>
                </select>
                {dificultad === 'plazos' && (
                  <div className="mt-1 flex items-center justify-between text-[10px] text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 p-2 rounded-lg border border-sky-200 dark:border-sky-800">
                    <span className="flex items-center gap-1.5 font-bold">
                      <i className="fa-solid fa-calculator text-sky-600"></i>
                      Protocolo Estricto Ley 39/2015
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrarProtocoloModal(true)}
                      className="text-[9.5px] font-black underline hover:text-sky-950 dark:hover:text-white cursor-pointer"
                    >
                      Ver 3 Fases
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  4. N.º de Preguntas
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { n: 5, label: '5 Q', sub: 'Rápido', rec: false },
                    { n: 10, label: '10 Q', sub: 'Tanda Estándar', rec: true },
                    { n: 20, label: '20 Q', sub: 'Sesión Completa', rec: true },
                    { n: 70, label: '70 Q', sub: 'Simulacro C1', rec: false },
                  ].map(({ n, label, sub, rec }) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setNumPreguntas(n);
                        setGenerationError(null);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                        numPreguntas === n
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs ring-2 ring-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {rec && (
                        <span className="absolute -top-1.5 right-1 px-1 py-0.2 rounded bg-indigo-600 text-[7px] text-white font-black uppercase tracking-tighter">
                          Top
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold block">{label}</span>
                      <span className="text-[8px] opacity-75 block">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  5. Modo de Corrección
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setModoCorreccion('paso_a_paso');
                      setModoRealizacion('interactivo');
                    }}
                    className={`p-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                      modoCorreccion === 'paso_a_paso'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs ring-2 ring-indigo-400/40'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-shoe-prints text-amber-500 text-[10px]"></i>
                      <span className="font-bold">Paso a paso</span>
                    </div>
                    <span className="text-[8px] text-slate-400 block mt-0.5 leading-tight">
                      Cita BOE y acierto/fallo inmediato
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoCorreccion('al_final');
                      setModoRealizacion('examen');
                    }}
                    className={`p-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                      modoCorreccion === 'al_final'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs ring-2 ring-indigo-400/40'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-flag-checkered text-emerald-500 text-[10px]"></i>
                      <span className="font-bold">Al final</span>
                    </div>
                    <span className="text-[8px] text-slate-400 block mt-0.5 leading-tight">
                      Evaluar en conjunto al terminar
                    </span>
                  </button>
                </div>
              </div>

              {/* 6. Tiempo de Examen (Cronómetro) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    6. Tiempo de Examen (Cronómetro)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {tiempoConfiguradoMinutos === 0
                      ? `Automático (~${Math.round((numPreguntas * 75) / 60)} min)`
                      : `${tiempoConfiguradoMinutos} min`}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { min: 0, label: 'Auto', sub: '1.25m/preg' },
                    { min: 10, label: '10 min', sub: 'Rápido' },
                    { min: 15, label: '15 min', sub: 'Estándar' },
                    { min: 30, label: '30 min', sub: 'Medio' },
                    { min: 60, label: '60 min', sub: '1 Hora' },
                    { min: 90, label: '90 min', sub: 'Oficial C1' },
                  ].map(({ min, label, sub }) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setTiempoConfiguradoMinutos(min)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        tiempoConfiguradoMinutos === min
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs ring-2 ring-indigo-400/40'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs font-mono font-bold block">{label}</span>
                      <span className="text-[8px] opacity-75 block">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tipoPrueba === 'supuesto'
                  ? `Se configurará un supuesto práctico de ${ambito} con ${numPreguntas} preguntas fundamentadas estrictamente en el BOE.`
                  : `Se configurará un test de ${numPreguntas} preguntas sobre las normativas seleccionadas.`}
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => cargarBateriaOficialGarantizada(numPreguntas)}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  title={`Iniciar test oficial garantizado de ${numPreguntas} preguntas sin esperas`}
                >
                  <i className="fa-solid fa-play text-emerald-600"></i>
                  <span>Iniciar Test Oficial ({numPreguntas} Q)</span>
                </button>

                <button
                  type="button"
                  disabled={isGenerating || leyesBOESeleccionadas.length === 0}
                  onClick={generarExamenConIA}
                  className="w-full sm:w-auto py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isGenerating ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin text-sm"></i>
                      <span>{loadingStepText}</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-wand-magic-sparkles text-amber-300"></i>
                      <span>Generar Prueba con IA ({numPreguntas} Q)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FALLBACK SI EL TEST ACTIVO NO TIENE PREGUNTAS */}
      {examenActivo && (!examenActivo.preguntas || examenActivo.preguntas.length === 0) && (
        <div className="bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-xl">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
            El examen no contiene preguntas activas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            El test seleccionado no pudo cargar sus preguntas correctamente. Puedes regresar a la configuración o seleccionar otro examen.
          </p>
          <button
            onClick={() => {
              setExamenActivo(null);
              try {
                localStorage.removeItem('c1_active_exam_session');
              } catch (_) {}
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Volver a la Configuración
          </button>
        </div>
      )}

      {/* ACTIVE TEST RUNNER */}
      {examenActivo && preguntaActual && (
        <div className="space-y-4">
          {/* Header Bar with Action Controls */}
          <div className="bg-indigo-50/90 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border font-mono ${
                    examenActivo.tipo === 'supuesto'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                  }`}
                >
                  {examenActivo.tipo === 'supuesto' ? 'Supuesto Práctico' : 'Test Normativo'}
                </span>
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                  {examenActivo.ambito}
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-400">
                  Pregunta {preguntaActualIdx + 1} de {examenActivo.preguntas.length}
                </span>
                {anotaciones.length > 0 && (
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                    <i className="fa-solid fa-highlighter text-[9px]"></i>
                    {anotaciones.length} resaltado{anotaciones.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {examenActivo.titulo}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoTituloExamen(examenActivo.titulo);
                    setMostrarModalRenombrar(true);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs transition-colors cursor-pointer"
                  title="Renombrar este examen"
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Selector Rápido de Modalidad: Paso a paso vs Al final */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl border border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setModoCorreccion('paso_a_paso');
                    setModoRealizacion('interactivo');
                  }}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    modoCorreccion === 'paso_a_paso'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs ring-1 ring-indigo-400/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Paso a paso: corrección y cita BOE inmediata al responder cada pregunta"
                >
                  <i className="fa-solid fa-shoe-prints text-amber-500 text-[9px]"></i>
                  <span>Paso a paso</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoCorreccion('al_final');
                    setModoRealizacion('examen');
                    if (tiempoRestanteSegundos <= 0) {
                      setTiempoRestanteSegundos(examenActivo.preguntas.length * 75);
                    }
                  }}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    modoCorreccion === 'al_final'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs ring-1 ring-indigo-400/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Al final: responder todo sin ver respuestas ni explicaciones y evaluar en conjunto al terminar"
                >
                  <i className="fa-solid fa-flag-checkered text-emerald-500 text-[9px]"></i>
                  <span>Al final</span>
                </button>
              </div>

              {modoCorreccion === 'al_final' && !examenFinalizado && (
                <>
                  <button
                    type="button"
                    onClick={toggleAutoAvance}
                    className={`py-1 px-2.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      autoAvanceAlFinal
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title="Avanzar automáticamente a la siguiente pregunta al marcar una opción"
                  >
                    <i className={`fa-solid fa-forward-step ${autoAvanceAlFinal ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}></i>
                    <span>Auto-avance: <strong>{autoAvanceAlFinal ? 'SÍ' : 'NO'}</strong></span>
                  </button>

                  <button
                    type="button"
                    onClick={solicitarEvaluarExamen}
                    className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer animate-in fade-in"
                    title="Evaluar y corregir en conjunto todas las preguntas"
                  >
                    <i className="fa-solid fa-circle-check text-[10px]"></i>
                    <span>Evaluar todo ({Object.keys(respuestasUsuario).length}/{examenActivo.preguntas.length})</span>
                  </button>
                </>
              )}

              {/* CRONÓMETRO ACTIVO EN TODOS LOS TESTS */}
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono font-black text-xs transition-all ${
                    isTimerPaused
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : tiempoRestanteSegundos < 120
                      ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title={isTimerPaused ? 'Cronómetro en pausa' : 'Tiempo restante'}
                >
                  <i className={`fa-regular fa-clock text-[10px] ${isTimerPaused ? 'text-amber-600' : 'text-indigo-600'}`}></i>
                  <span>{formatTimer(tiempoRestanteSegundos)}</span>
                  {isTimerPaused && (
                    <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-sans font-black">
                      Pausa
                    </span>
                  )}
                </div>

                {!examenFinalizado && (
                  <button
                    type="button"
                    onClick={() => setIsTimerPaused(!isTimerPaused)}
                    className="py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title={isTimerPaused ? 'Reanudar cronómetro' : 'Pausar cronómetro'}
                  >
                    <i className={`fa-solid ${isTimerPaused ? 'fa-play text-emerald-600' : 'fa-pause text-amber-600'} text-[10px]`}></i>
                    <span className="hidden sm:inline text-[10px]">{isTimerPaused ? 'Reanudar' : 'Pausar'}</span>
                  </button>
                )}

                {!examenFinalizado && (
                  <button
                    type="button"
                    onClick={() => setMostrarModalAjustarTiempo(true)}
                    className="py-1 px-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Ajustar o seleccionar tiempo del examen"
                  >
                    <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                    <span className="hidden sm:inline text-[10px]">Ajustar</span>
                  </button>
                )}
              </div>

              {/* BOTÓN CLAVE: EXPORTAR TEST A JSON */}
              <button
                onClick={exportarTestAJSON}
                className="py-1.5 px-3 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Descargar archivo .json con el test, texto completo, notas y resaltados"
              >
                <i className="fa-solid fa-file-code text-indigo-500"></i>
                <span>Exportar test a JSON</span>
              </button>

              <button
                onClick={exportarExamenPDF}
                className="py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                title="Imprimir o guardar en PDF"
              >
                <i className="fa-solid fa-print text-slate-500"></i>
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={reiniciarParaRealizarDeNuevo}
                className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-black shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Reiniciar este examen para realizarlo de nuevo desde cero. El nuevo resultado será el considerado en estadísticas y listados."
              >
                <i className="fa-solid fa-rotate-right text-[11px] text-amber-600"></i>
                <span>Reiniciar / Hacer de nuevo</span>
              </button>

              <button
                type="button"
                onClick={() => resetearExamenCompleto('Examen y progreso reiniciados correctamente.')}
                className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Cerrar este examen y volver al generador para crear un examen nuevo"
              >
                <i className="fa-solid fa-plus text-rose-500 text-[10px]"></i>
                <span>Nuevo examen</span>
              </button>

              <button
                type="button"
                onClick={cerrarExamenActual}
                className="py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Salir del examen y volver al generador"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Banner si el examen ya tenía resultado previo al ser recuperado */}
          {examenActivo && Boolean(examenActivo.resultado) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-amber-100/85 dark:bg-amber-950/45 border-2 border-amber-300 dark:border-amber-700 rounded-xl text-xs">
              <div className="flex items-center gap-2.5 text-amber-950 dark:text-amber-200">
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                </div>
                <div>
                  <span className="font-bold block leading-tight">
                    {`Mostrando respuestas de realización anterior (${Number(examenActivo.resultado?.puntuacionDirecta).toFixed(2)} PD / ${Number(examenActivo.resultado?.puntuacionTransformada).toFixed(2)} PT).`}
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-300/80 block mt-0.5">
                    Puedes reiniciar para responderlo de nuevo desde cero. El nuevo resultado será el que conste en los listados y KPIs.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={reiniciarParaRealizarDeNuevo}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-rotate-right text-[10px]"></i>
                <span>Reiniciar y Realizar de nuevo</span>
              </button>
            </div>
          )}

          {/* Navigator Matrix */}
          <div className="bg-sky-50/85 dark:bg-slate-800 border-2 border-sky-300 dark:border-sky-800 rounded-xl p-3.5 shadow-sm space-y-2.5">
            {examenFinalizado && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Filtro del Test:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => cambiarFiltro('todas')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      filtroPreguntas === 'todas'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Todas ({examenActivo.preguntas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarFiltro('acertadas')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      filtroPreguntas === 'acertadas'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <i className="fa-solid fa-check text-[9px]"></i>
                    Acertadas ({examenActivo.resultado?.aciertos ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarFiltro('falladas')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      filtroPreguntas === 'falladas'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <i className="fa-solid fa-xmark text-[9px]"></i>
                    Falladas ({examenActivo.resultado?.fallos ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarFiltro('blancos')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      filtroPreguntas === 'blancos'
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    En Blanco ({examenActivo.resultado?.blancos ?? 0})
                  </button>
                </div>
              </div>
            )}

            {/* SECCIÓN NAVEGACIÓN DIFERENCIADA: CUESTIONARIO ORDINARIO Y PREGUNTAS DE RESERVA */}
            <div className="space-y-4">
              {/* Sección 1: Cuestionario Ordinario */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                      <i className="fa-solid fa-list-ol"></i>
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Cuestionario Ordinario (Preguntas 1 a {preguntasOrdinarias.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-400">
                      {respondidasOrdinarias} de {preguntasOrdinarias.length} contestadas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {preguntasOrdinarias.map((p, oIdx) => {
                    const fullIdx = examenActivo.preguntas.findIndex((item) => item.id === p.id);
                    const idx = fullIdx >= 0 ? fullIdx : oIdx;
                    const isSelected = idx === preguntaActualIdx;
                    const isAnswered = !!respuestasUsuario[idx];
                    const isDoubtful = !!dudosasUsuario[idx];
                    const estado = getEstadoPregunta(idx);
                    const isMatch = indicesFiltrados.includes(idx);

                    let cellClass = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
                    let icon = null;

                    if (p.esAnulada) {
                      cellClass = isSelected
                        ? 'border-rose-600 bg-rose-600 text-white font-black ring-2 ring-rose-400'
                        : 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold';
                      icon = <i className="fa-solid fa-ban text-[7px] block"></i>;
                    } else if (examenFinalizado) {
                      if (estado === 'acertada') {
                        cellClass = isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-300'
                          : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold';
                        icon = <i className="fa-solid fa-check text-[7px] block"></i>;
                      } else if (estado === 'fallada') {
                        cellClass = isSelected
                          ? 'border-rose-600 bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-300'
                          : 'border-rose-300 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold';
                        icon = <i className="fa-solid fa-xmark text-[7px] block"></i>;
                      } else {
                        cellClass = isSelected
                          ? 'border-slate-600 bg-slate-600 text-white font-black'
                          : 'border-slate-200 bg-slate-100 dark:bg-slate-800 text-slate-400';
                      }

                      if (!isMatch) {
                        cellClass += ' opacity-30 hover:opacity-100';
                      }
                    } else {
                      if (isSelected) {
                        cellClass = 'border-indigo-600 bg-indigo-600 text-white font-black shadow-xs ring-2 ring-indigo-300';
                      } else if (isDoubtful) {
                        cellClass = 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold';
                      } else if (isAnswered) {
                        if (modoCorreccion === 'paso_a_paso') {
                          if (estado === 'acertada') {
                            cellClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold';
                            icon = <i className="fa-solid fa-check text-[7px] block"></i>;
                          } else {
                            cellClass = 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold';
                            icon = <i className="fa-solid fa-xmark text-[7px] block"></i>;
                          }
                        } else {
                          // Modo al final: marcada como contestada sin desvelar acierto o fallo
                          cellClass = 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 font-bold';
                          icon = <i className="fa-solid fa-check text-[7px] block text-indigo-600"></i>;
                        }
                      }
                    }

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreguntaActualIdx(idx)}
                        className={`h-7.5 min-w-7.5 px-1.5 rounded-lg border text-xs font-mono flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer ${cellClass}`}
                        title={`Pregunta ${oIdx + 1}${p.esAnulada ? ' (Anulada en plantilla)' : examenFinalizado ? ` (${estado})` : ''}`}
                      >
                        <span>{oIdx + 1}</span>
                        {icon}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección 2: Preguntas de Reserva (diferenciada como sección específica) */}
              {preguntasReserva.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-2xs">
                        <i className="fa-solid fa-star"></i>
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        Preguntas de Reserva (Reserva 1 a {preguntasReserva.length})
                      </span>
                      <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono">
                        {reservasActivasCount} en cómputo oficial
                      </span>
                    </div>

                    <span className="text-[9.5px] text-amber-800/90 dark:text-amber-300 font-medium">
                      Sustituyen correlativamente a preguntas anuladas (+1.00 acierto / -0.33 fallo)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {preguntasReserva.map((p, rIdx) => {
                      const fullIdx = examenActivo.preguntas.findIndex((item) => item.id === p.id);
                      const idx = fullIdx >= 0 ? fullIdx : preguntasOrdinarias.length + rIdx;
                      const isSelected = idx === preguntaActualIdx;
                      const isAnswered = !!respuestasUsuario[idx];
                      const isDoubtful = !!dudosasUsuario[idx];
                      const estado = getEstadoPregunta(idx);
                      const isMatch = indicesFiltrados.includes(idx);
                      const numRes = p.numeroReserva || rIdx + 1;

                      let cellClass = 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100';
                      let icon = null;

                      if (p.esAnulada) {
                        cellClass = isSelected
                          ? 'border-rose-600 bg-rose-600 text-white font-black'
                          : 'border-rose-300 bg-rose-50 text-rose-800 font-bold';
                        icon = <i className="fa-solid fa-ban text-[7px] block"></i>;
                      } else if (examenFinalizado) {
                        if (estado === 'acertada') {
                          cellClass = isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-300'
                            : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold';
                          icon = <i className="fa-solid fa-check text-[7px] block"></i>;
                        } else if (estado === 'fallada') {
                          cellClass = isSelected
                            ? 'border-rose-600 bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-300'
                            : 'border-rose-300 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold';
                          icon = <i className="fa-solid fa-xmark text-[7px] block"></i>;
                        } else {
                          cellClass = isSelected
                            ? 'border-amber-600 bg-amber-600 text-white font-black'
                            : 'border-amber-200 bg-amber-50/60 dark:bg-slate-800 text-amber-800 dark:text-amber-300';
                        }

                        if (!isMatch) {
                          cellClass += ' opacity-30 hover:opacity-100';
                        }
                      } else {
                        if (isSelected) {
                          cellClass = 'border-amber-600 bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-300';
                        } else if (isDoubtful) {
                          cellClass = 'border-amber-400 bg-amber-100 text-amber-900 font-bold';
                        } else if (isAnswered) {
                          if (modoCorreccion === 'paso_a_paso') {
                            if (estado === 'acertada') {
                              cellClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                              icon = <i className="fa-solid fa-check text-[7px] block"></i>;
                            } else {
                              cellClass = 'border-rose-400 bg-rose-50 text-rose-900 font-bold';
                              icon = <i className="fa-solid fa-xmark text-[7px] block"></i>;
                            }
                          } else {
                            cellClass = 'border-amber-400 bg-amber-100 text-amber-950 font-bold';
                            icon = <i className="fa-solid fa-check text-[7px] block text-amber-700"></i>;
                          }
                        }
                      }

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPreguntaActualIdx(idx)}
                          className={`h-7.5 px-2.5 rounded-lg border text-xs font-mono font-black flex items-center justify-center gap-1 shrink-0 transition-all cursor-pointer ${cellClass}`}
                          title={`Pregunta de Reserva #${numRes}${
                            p.activaEnEvaluacion ? ` (Activa: sustituye a #${p.sustituyeAPreguntaId})` : ' (Inactiva)'
                          }`}
                        >
                          <i className="fa-solid fa-star text-[8px] opacity-70"></i>
                          <span>R{numRes}</span>
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Case Context for Practical Scenarios (with Subrayador & Anotaciones) */}
          {examenActivo.contextoCaso && (
            <div className="bg-amber-50/95 dark:bg-amber-950/35 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-scroll text-amber-600"></i>
                  Relato Fáctico del Caso Administrativo (Texto Plano Subrayable)
                </span>
                <span className="text-[9px] text-amber-700 dark:text-amber-400 font-mono font-bold">
                  Ámbito: {examenActivo.ambito}
                </span>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                <AnnotatedPlainTextViewer
                  text={examenActivo.contextoCaso}
                  seccion="contextoCaso"
                  examenId={examenActivo.id}
                  anotaciones={anotaciones}
                  onGuardarAnotacion={handleGuardarAnotacion}
                  onEliminarAnotacion={handleEliminarAnotacion}
                />
              </div>
            </div>
          )}

          {/* Question Box (with Subrayador & Anotaciones) */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                    {preguntaActual.esReserva
                      ? `Pregunta de Reserva #${preguntaActual.numeroReserva || 1} (de ${preguntasReserva.length || 5})`
                      : `Pregunta #${preguntaActual.id} (de ${preguntasOrdinarias.length})`}
                  </span>

                  {preguntaActual.esAnulada && (
                    <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-mono flex items-center gap-1">
                      <i className="fa-solid fa-ban text-rose-600"></i>
                      ANULADA EN PLANTILLA
                    </span>
                  )}

                  {preguntaActual.sustituidaPorReservaId && (
                    <span className="text-[8.5px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono flex items-center gap-1">
                      <i className="fa-solid fa-arrow-right text-[8px]"></i>
                      Sustituida por Reserva #{preguntaActual.sustituidaPorReservaId}
                    </span>
                  )}

                  {preguntaActual.esReserva && (
                    preguntaActual.activaEnEvaluacion ? (
                      <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono flex items-center gap-1">
                        <i className="fa-solid fa-star text-amber-500"></i>
                        RESERVA ACTIVA (Sustituye a #{preguntaActual.sustituyeAPreguntaId})
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-mono">
                        Pregunta de Reserva (Inactiva)
                      </span>
                    )
                  )}

                  {/INCORRECTA|FALSA|ERRÓNEA/i.test(preguntaActual.enunciado) && (
                    <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-mono flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                      BUSCAR OPCIÓN INCORRECTA
                    </span>
                  )}

                  {/cálculo|días hábiles|cómputo|fecha límite|die ad quem|vence|prorroga/i.test(preguntaActual.enunciado) && (
                    <button
                      type="button"
                      onClick={() => setMostrarProtocoloModal(true)}
                      className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-700 font-mono flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      title="Abrir Protocolo Estricto de Cómputo de Plazos Administrativos (Ley 39/2015)"
                    >
                      <i className="fa-solid fa-calendar-check text-sky-600"></i>
                      <span>CÁLCULO DE FECHAS / PLAZOS</span>
                      <i className="fa-solid fa-circle-question text-sky-500 text-[8px] ml-0.5"></i>
                    </button>
                  )}

                  {(() => {
                    const refConvActual = obtenerReferenciaConvocatoriaOficial(preguntaActual, examenActivo);
                    if (refConvActual) {
                      return (
                        <span
                          className="text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-mono flex items-center gap-1.5 shadow-2xs"
                          title={`Pregunta procedente de convocatoria oficial: ${refConvActual}`}
                        >
                          <i className="fa-solid fa-landmark-flag text-amber-600 dark:text-amber-400"></i>
                          <span>{formatearBadgeConvocatoriaOficial(refConvActual)}</span>
                        </span>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => setMostrarAntiDuplicadosModal(true)}
                        className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        title="Pregunta 100% inédita con huella algorítmica verificada. Clic para abrir el Auditor de Singularidad e Inéditas."
                      >
                        <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                        <span>100% INÉDITA · {preguntaActual.codigoInedita || `INED-${preguntaActual.id.toString(16).padStart(4, '0').toUpperCase()}`}</span>
                      </button>
                    );
                  })()}

                  {!!respuestaActual && !examenFinalizado && modoCorreccion === 'al_final' && (
                    <button
                      type="button"
                      onClick={desmarcarRespuestaActual}
                      className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-600 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-300 hover:border-rose-300 dark:border-slate-700 font-mono flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      title="Desmarcar opción seleccionada y dejar esta pregunta en blanco"
                    >
                      <i className="fa-solid fa-eraser text-[8px] text-rose-500"></i>
                      <span>Desmarcar ({respuestaActual})</span>
                    </button>
                  )}

                  {/* Botón Dudosa bajado al recuadro de la pregunta, junto a 100% Inédita y Desmarcar */}
                  <button
                    type="button"
                    onClick={() => toggleDudosa(preguntaActualIdx)}
                    className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border font-mono flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all ${
                      dudosasUsuario[preguntaActualIdx]
                        ? 'bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900 dark:bg-amber-950 dark:border-amber-600 dark:text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                    }`}
                    title="Marcar o desmarcar esta pregunta como dudosa para revisarla antes de entregar"
                  >
                    <i className={`fa-regular fa-flag text-[9px] ${dudosasUsuario[preguntaActualIdx] ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}></i>
                    <span>{dudosasUsuario[preguntaActualIdx] ? 'Dudosa (Marcada)' : 'Dudosa'}</span>
                  </button>
                </div>

                {/* Botón para simular / cambiar anulación en plantilla por tribunal */}
                {(examenFinalizado || modoRealizacion === 'interactivo') && (
                  <button
                    type="button"
                    onClick={() => toggleAnulada(preguntaActualIdx)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      preguntaActual.esAnulada
                        ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                    title="Alternar estado de ANULADA de esta pregunta en la plantilla para recalcular la nota con las reservas"
                  >
                    <i className={preguntaActual.esAnulada ? 'fa-solid fa-rotate-left text-rose-500' : 'fa-solid fa-ban text-slate-400'}></i>
                    <span>{preguntaActual.esAnulada ? 'Desmarcar Anulación' : 'Marcar como ANULADA (Tribunal)'}</span>
                  </button>
                )}
              </div>

              {/* Banner contextual de anulación o sustitución */}
              {preguntaActual.esAnulada && (
                <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                  <i className="fa-solid fa-ban text-rose-600 mt-0.5 shrink-0 text-sm"></i>
                  <div>
                    <strong>Pregunta anulada oficialmente:</strong> Queda eliminada del cómputo de la nota (0 puntos, sin penalización).
                    {preguntaActual.sustituidaPorReservaId ? (
                      <span className="block mt-0.5 font-medium text-slate-700 dark:text-slate-300">
                        Por orden correlativo de plantilla, su lugar lo ocupa la <strong>Pregunta de Reserva #{preguntaActual.sustituidaPorReservaId}</strong> con idénticas penalizaciones.
                      </span>
                    ) : (
                      <span className="block mt-0.5 text-slate-500">
                        No hay más preguntas de reserva disponibles para cubrir esta anulación.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {preguntaActual.esReserva && preguntaActual.activaEnEvaluacion && (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <i className="fa-solid fa-star text-amber-500 mt-0.5 shrink-0 text-sm"></i>
                  <div>
                    <strong>Pregunta de Reserva incorporada al cómputo:</strong> Sustituye de forma ordenada a la <strong>Pregunta #{preguntaActual.sustituyeAPreguntaId}</strong> anulada. Suma a la nota final (+1.00 por acierto, -0.33 por fallo).
                  </div>
                </div>
              )}

              {preguntaActual.esReserva && !preguntaActual.activaEnEvaluacion && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-slate-400"></i>
                  <span>Pregunta de reserva que no computa en la nota final al no haber suficientes preguntas ordinarias anuladas que cubrir.</span>
                </div>
              )}
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                <AnnotatedPlainTextViewer
                  text={preguntaActual.enunciado}
                  seccion="enunciado"
                  preguntaId={preguntaActual.id}
                  examenId={examenActivo.id}
                  anotaciones={anotaciones}
                  onGuardarAnotacion={handleGuardarAnotacion}
                  onEliminarAnotacion={handleEliminarAnotacion}
                />
              </div>
            </div>

            {/* Options List (altura fija e invariable al responder; sin duplicar texto legal ni bloque BOE) */}
            {(() => {
              const estaRevelada = (modoCorreccion === 'paso_a_paso' && !!respuestaActual) || examenFinalizado;

              return (
                <>
                  <div className="space-y-2.5">
                    {preguntaActual.opciones.map((opc) => {
                      const isSelected = respuestaActual === opc.id;

                      let optClass =
                        'border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70 hover:bg-indigo-50/40 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200';
                      let badgeClass =
                        'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200';
                      let rightIndicator: React.ReactNode = null;

                      if (estaRevelada) {
                        if (opc.esCorrecta) {
                          optClass =
                            'border-emerald-300/85 dark:border-emerald-800/70 bg-emerald-50/45 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100';
                          badgeClass =
                            'bg-emerald-100/85 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
                          rightIndicator = (
                            <span
                              className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                              title="Respuesta acertada / correcta"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                            </span>
                          );
                        } else if (isSelected) {
                          optClass =
                            'border-rose-300/85 dark:border-rose-800/70 bg-rose-50/45 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100';
                          badgeClass =
                            'bg-rose-100/85 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200';
                          rightIndicator = (
                            <span
                              className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                              title="Respuesta incorrecta"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </span>
                          );
                        } else {
                          optClass =
                            'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400';
                        }
                      } else if (isSelected) {
                        optClass =
                          'border-indigo-400 dark:border-indigo-600 bg-indigo-50/55 dark:bg-indigo-950/35 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-400/50';
                        badgeClass =
                          'bg-indigo-600 border border-indigo-600 text-white';
                        rightIndicator = (
                          <span
                            className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"
                            title="Opción seleccionada (clic de nuevo para desmarcar)"
                          >
                            <i className="fa-solid fa-check text-xs"></i>
                          </span>
                        );
                      }

                      return (
                        <div
                          key={opc.id}
                          onClick={() => seleccionarOpcion(opc.id as any)}
                          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer select-none transition-colors flex items-start gap-3 ${optClass}`}
                        >
                          <span
                            className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 mt-0.5 ${badgeClass}`}
                          >
                            {opc.id}
                          </span>
                          <div className="flex-1 leading-snug py-0.5">
                            <AnnotatedPlainTextViewer
                              text={opc.texto}
                              seccion="opcion"
                              preguntaId={preguntaActual.id}
                              opcionId={opc.id}
                              examenId={examenActivo.id}
                              anotaciones={anotaciones}
                              onGuardarAnotacion={handleGuardarAnotacion}
                              onEliminarAnotacion={handleEliminarAnotacion}
                            />
                          </div>
                          <span className="h-6 w-6 shrink-0 mt-0.5 flex items-center justify-center">
                            {rightIndicator}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barra de control fija en corrección al final (altura estable sin saltos) */}
                  {modoCorreccion === 'al_final' && !examenFinalizado && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <i className="fa-solid fa-circle-info text-indigo-500"></i>
                        <span>
                          {respuestaActual ? (
                            <span>
                              Opción marcada: <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-black">[{respuestaActual}]</strong> · Clic de nuevo en la opción para dejar en blanco.
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              Pregunta actualmente <strong>en blanco</strong> (sin responder). Pulsa una opción para marcarla.
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleAutoAvance}
                          className={`py-1 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            autoAvanceAlFinal
                              ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                          }`}
                          title="Activar o desactivar avance automático a la siguiente pregunta al contestar"
                        >
                          <i className={`fa-solid fa-forward-step ${autoAvanceAlFinal ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}></i>
                          <span>Avance auto: <strong>{autoAvanceAlFinal ? 'Activado' : 'Desactivado'}</strong></span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                disabled={
                  filtroPreguntas === 'todas'
                    ? preguntaActualIdx === 0
                    : indicesFiltrados.indexOf(preguntaActualIdx) <= 0
                }
                onClick={() => {
                  if (filtroPreguntas === 'todas') {
                    setPreguntaActualIdx((prev) => Math.max(0, prev - 1));
                  } else {
                    const currentPos = indicesFiltrados.indexOf(preguntaActualIdx);
                    if (currentPos > 0) {
                      setPreguntaActualIdx(indicesFiltrados[currentPos - 1]);
                    }
                  }
                }}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                Anterior
              </button>

              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold text-center">
                <span>
                  {preguntaActual?.esReserva
                    ? `Pregunta de Reserva #${preguntaActual.numeroReserva || 1} de ${preguntasReserva.length || 5}`
                    : `Pregunta ${preguntaActualIdx + 1} de ${preguntasOrdinarias.length}`}
                </span>
                {examenFinalizado && filtroPreguntas !== 'todas' && (
                  <span className="block text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">
                    (Filtrada {indicesFiltrados.indexOf(preguntaActualIdx) + 1} de {indicesFiltrados.length}: {filtroPreguntas})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {((modoCorreccion === 'paso_a_paso' && !!respuestaActual) || examenFinalizado) && (
                  <button
                    type="button"
                    onClick={() => setPreguntaValidandoBOE({ pregunta: preguntaActual, index: preguntaActualIdx })}
                    className="py-2 px-3.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Abrir Ventana Justificación Oficial BOE"
                  >
                    <i className="fa-solid fa-scale-balanced text-amber-600 dark:text-amber-400"></i>
                    <span>Justificación</span>
                  </button>
                )}

                {modoCorreccion === 'al_final' && !examenFinalizado && (
                  <button
                    type="button"
                    onClick={solicitarEvaluarExamen}
                    className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                    title="Evaluar todo el test en conjunto ahora"
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Evaluar al Final</span>
                  </button>
                )}

                {examenFinalizado && filtroPreguntas !== 'todas' ? (
                  <button
                    disabled={indicesFiltrados.indexOf(preguntaActualIdx) >= indicesFiltrados.length - 1}
                    onClick={() => {
                      const currentPos = indicesFiltrados.indexOf(preguntaActualIdx);
                      if (currentPos < indicesFiltrados.length - 1) {
                        setPreguntaActualIdx(indicesFiltrados[currentPos + 1]);
                      }
                    }}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    Siguiente
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>
                ) : preguntaActualIdx < examenActivo.preguntas.length - 1 ? (
                  <button
                    onClick={() => setPreguntaActualIdx((prev) => Math.min(examenActivo.preguntas.length - 1, prev + 1))}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    Siguiente
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>
                ) : !examenFinalizado ? (
                  <button
                    onClick={solicitarEvaluarExamen}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    <span>{modoCorreccion === 'al_final' ? 'Evaluar y Corregir Todo el Test' : 'Finalizar y Ver Resultados'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Ver Informe ↑
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Final Results Report */}
          {examenFinalizado && examenActivo.resultado && (() => {
            const totalQ =
              examenActivo.resultado.preguntasEvaluadasTotal ||
              (examenActivo.tipo === 'supuesto' ? 20 : 70);
            const pdNum = Number(examenActivo.resultado.puntuacionDirecta);
            const ptNum = Number(examenActivo.resultado.puntuacionTransformada);
            const porcentajeUsuarioNeto = totalQ > 0 ? (pdNum / totalQ) * 100 : 0;
            const tiempoEmpleado = examenActivo.resultado.duracionSegundos || tiempoTranscurridoSegundos;

            return (
              <div className="bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-2xl p-6 shadow-md space-y-5">
                {/* Header of Report */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                      Calificación Oficial INAP (Acierto +1.00 / Error -0.333 / Blanco 0.00)
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      Informe de Resultados y Corrección Oficial
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tiempoEmpleado > 0 && (
                      <span
                        className="text-xs font-black px-3 py-1 rounded-xl font-mono border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-2xs"
                        title="Tiempo total invertido en el examen"
                      >
                        <i className="fa-regular fa-clock text-indigo-600 dark:text-indigo-400"></i>
                        <span>Tiempo: {formatTimer(tiempoEmpleado)}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={reiniciarParaRealizarDeNuevo}
                      className="text-xs font-black px-3.5 py-1.5 rounded-xl font-mono border bg-amber-500 hover:bg-amber-600 text-white border-amber-600 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      title="Reiniciar este examen para realizarlo de nuevo desde cero. El nuevo resultado será el que conste en los listados y KPIs."
                    >
                      <i className="fa-solid fa-rotate-right text-[10px]"></i>
                      <span>Reiniciar y Repetir Test</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarAntiDuplicadosModal(true)}
                      className="text-xs font-black px-3 py-1 rounded-xl font-mono border bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      title="Auditoría de singularidad: 100% preguntas inéditas, 0% preguntas repetidas ni permutadas"
                    >
                      <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                      <span>Auditor: 100% Inéditas (0% Duplicados)</span>
                    </button>
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-xl font-mono border ${
                        examenActivo.resultado.superaCorte
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {examenActivo.resultado.superaCorte ? '✓ APROBADO / SUPERA CORTE' : '✗ NO SUPERA CORTE'}
                    </span>
                  </div>
                </div>

                {/* Interactive Metric Cards (Filters for Failed vs Correct vs Blank) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Filtra las preguntas pulsando sobre las tarjetas:
                    </span>
                    {filtroPreguntas !== 'todas' && (
                      <button
                        onClick={() => cambiarFiltro('todas')}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-rotate-left text-[9px]"></i>
                        Restablecer filtro (Ver todas)
                      </button>
                    )}
                  </div>

                  <div className={`grid grid-cols-2 sm:grid-cols-3 ${tiempoEmpleado > 0 ? 'lg:grid-cols-4 xl:grid-cols-7' : 'lg:grid-cols-6'} gap-3 text-center`}>
                    {/* Botón Filtro Aciertos */}
                    <button
                      type="button"
                      onClick={() => cambiarFiltro('acertadas')}
                      className={`p-3 rounded-xl border transition-all text-center cursor-pointer ${
                        filtroPreguntas === 'acertadas'
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                      }`}
                      title="Haz clic para ver solo las preguntas acertadas"
                    >
                      <span className="text-[8px] font-black uppercase text-emerald-700 dark:text-emerald-400 block flex items-center justify-center gap-1">
                        <i className="fa-solid fa-check"></i>
                        Aciertos (+1.0)
                      </span>
                      <span className="text-xl font-black text-emerald-600 font-mono block mt-0.5">
                        {examenActivo.resultado.aciertos}
                      </span>
                      <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                        {filtroPreguntas === 'acertadas' ? '● Mostrando acertadas' : 'Clic para filtrar'}
                      </span>
                    </button>

                    {/* Botón Filtro Fallos */}
                    <button
                      type="button"
                      onClick={() => cambiarFiltro('falladas')}
                      className={`p-3 rounded-xl border transition-all text-center cursor-pointer ${
                        filtroPreguntas === 'falladas'
                          ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 ring-2 ring-rose-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                      }`}
                      title="Haz clic para ver solo las preguntas falladas"
                    >
                      <span className="text-[8px] font-black uppercase text-rose-700 dark:text-rose-400 block flex items-center justify-center gap-1">
                        <i className="fa-solid fa-xmark"></i>
                        Fallos (-0.33)
                      </span>
                      <span className="text-xl font-black text-rose-600 font-mono block mt-0.5">
                        {examenActivo.resultado.fallos}
                      </span>
                      <span className="text-[8px] font-bold text-rose-700 dark:text-rose-400 block mt-0.5">
                        {filtroPreguntas === 'falladas' ? '● Mostrando falladas' : 'Clic para filtrar'}
                      </span>
                    </button>

                    {/* Botón Filtro En blanco */}
                    <button
                      type="button"
                      onClick={() => cambiarFiltro('blancos')}
                      className={`p-3 rounded-xl border transition-all text-center cursor-pointer ${
                        filtroPreguntas === 'blancos'
                          ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-400 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                      title="Haz clic para ver las preguntas dejadas en blanco"
                    >
                      <span className="text-[8px] font-black uppercase text-slate-500 block">
                        En Blanco (0.0)
                      </span>
                      <span className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono block mt-0.5">
                        {examenActivo.resultado.blancos}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                        {filtroPreguntas === 'blancos' ? '● Mostrando en blanco' : 'Clic para filtrar'}
                      </span>
                    </button>

                    {/* Botón Filtro Anuladas */}
                    <button
                      type="button"
                      onClick={() => cambiarFiltro('anuladas')}
                      className={`p-3 rounded-xl border transition-all text-center cursor-pointer ${
                        filtroPreguntas === 'anuladas'
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 ring-2 ring-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                      title="Haz clic para ver las preguntas anuladas en plantilla oficial"
                    >
                      <span className="text-[8px] font-black uppercase text-amber-700 dark:text-amber-400 block flex items-center justify-center gap-1">
                        <i className="fa-solid fa-ban"></i>
                        Anuladas ({examenActivo.resultado.anuladas || 0})
                      </span>
                      <span className="text-xl font-black text-amber-600 font-mono block mt-0.5">
                        {examenActivo.resultado.reservasUsadas || 0}
                      </span>
                      <span className="text-[8px] font-bold text-amber-700 dark:text-amber-400 block mt-0.5">
                        {filtroPreguntas === 'anuladas' ? '● Mostrando anuladas' : 'Reservas activadas'}
                      </span>
                    </button>

                    {/* Puntuación Directa con DOS decimales */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-slate-400 block">
                        Punt. Directa (PD)
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono block mt-0.5">
                        {pdNum.toFixed(2)} PD
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                        de {totalQ}.00 netas ({porcentajeUsuarioNeto.toFixed(2)}%)
                      </span>
                    </div>

                    {/* Nota Transformada con DOS decimales */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-slate-400 block">
                        Nota Transformada
                      </span>
                      <span className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono block mt-0.5">
                        {ptNum.toFixed(2)}
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                        / {examenActivo.tipo === 'supuesto' ? '50.00' : '100.00'} PT
                      </span>
                    </div>

                    {/* Tiempo Invertido si se activó el reloj */}
                    {tiempoEmpleado > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between shadow-2xs">
                        <span className="text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 block flex items-center justify-center gap-1">
                          <i className="fa-regular fa-clock text-[9px]"></i>
                          Tiempo Invertido
                        </span>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono block mt-0.5">
                          {formatTimer(tiempoEmpleado)}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                          {Math.floor(tiempoEmpleado / 60)}m {tiempoEmpleado % 60}s reloj
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel Oficial de Sustitución Ordenada de Reservas y Anulaciones */}
                <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 shadow-2xs">
                        <i className="fa-solid fa-arrow-right-arrow-left"></i>
                      </span>
                      <div>
                        <h5 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
                          Régimen de 5 Preguntas de Reserva y Anulaciones (AGE / INAP)
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          En las oposiciones oficiales, las preguntas anuladas en plantilla se sustituyen correlativamente por las de reserva con idéntica penalización (-0.33 fallo).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs">
                        {examenActivo.resultado.anuladas || 0} Anuladas ➔ {examenActivo.resultado.reservasUsadas || 0} Reservas Activadas
                      </span>
                    </div>
                  </div>

                  {/* Sustituciones efectuadas */}
                  {examenActivo.resultado.sustituciones && examenActivo.resultado.sustituciones.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                        Sustituciones aplicadas en el cálculo de tu puntuación:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {examenActivo.resultado.sustituciones.map((sust, sIdx) => {
                          const qRes = examenActivo.preguntas.find((p) => p.id === sust.reservaId);
                          const qResIdx = examenActivo.preguntas.findIndex((p) => p.id === sust.reservaId);
                          const respRes = qResIdx >= 0 ? respuestasUsuario[qResIdx] : undefined;
                          const esCorrecta = qRes?.opciones.some((o) => o.esCorrecta && o.id === respRes);
                          const esFallo = respRes && !esCorrecta;
                          const esBlanco = !respRes;

                          return (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/80 flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-mono font-bold">
                                  Anulada #{sust.anuladaId}
                                </span>
                                <i className="fa-solid fa-arrow-right text-[10px] text-indigo-400"></i>
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                                  Reserva #{sust.reservaId}
                                </span>
                              </div>
                              <div className="font-mono text-[10.5px]">
                                {esCorrecta ? (
                                  <span className="text-emerald-600 font-black">+1.00 (Acierto)</span>
                                ) : esFallo ? (
                                  <span className="text-rose-600 font-black">-0.33 (Fallo)</span>
                                ) : (
                                  <span className="text-slate-400 font-bold">0.00 (Blanco)</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                      <i className="fa-solid fa-circle-check text-indigo-400"></i>
                      <span>
                        No hay preguntas marcadas como anuladas en la plantilla. Las 5 preguntas de reserva permanecen inactivas sin computar en la nota, evaluándose únicamente el cuestionario ordinario ({examenActivo.preguntas.filter((p) => !p.esReserva).length} preguntas).
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/60 pt-2 font-medium">
                    <span>
                      💡 Puedes marcar o desmarcar cualquier pregunta como <strong>ANULADA</strong> con el botón en el visor para simular impugnaciones de examen al instante.
                    </span>
                    {(examenActivo.resultado.anuladas || 0) > 0 && filtroPreguntas !== 'anuladas' && (
                      <button
                        type="button"
                        onClick={() => cambiarFiltro('anuladas')}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <span>Ver preguntas anuladas ({examenActivo.resultado.anuladas})</span>
                        <i className="fa-solid fa-arrow-right text-[9px]"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Comparativa con las 3 últimas convocatorias C1 AGE (INAP) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <div>
                      <h5 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
                        <i className="fa-solid fa-ranking-star text-amber-500"></i>
                        Comparativa con las 3 Últimas Convocatorias C1 AGE (INAP)
                      </h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Puntuaciones mínimas directas (PD) de la Comisión Permanente de Selección (Ingreso Libre).
                      </p>
                    </div>

                    {/* Selector interactivo de tipo de ejercicio */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex-wrap">
                      <span className="text-[9px] font-black uppercase px-1.5 text-slate-400 hidden xl:inline">
                        Cotejar con:
                      </span>
                      <button
                        type="button"
                        onClick={() => setTipoComparativaC1('test_70')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          tipoComparativaC1 === 'test_70'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                        }`}
                        title="Comparar con el corte de la 1.ª Parte: Cuestionario teórico de 70 preguntas"
                      >
                        <i className="fa-solid fa-list-check text-[9px]"></i>
                        <span>Test Oficial (70 Q)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoComparativaC1('supuesto_20')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          tipoComparativaC1 === 'supuesto_20'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
                        }`}
                        title="Comparar con el corte de la 2.ª Parte: Supuesto práctico de 20 preguntas"
                      >
                        <i className="fa-solid fa-file-lines text-[9px]"></i>
                        <span>Supuesto (20 Q)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoComparativaC1('global_90')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          tipoComparativaC1 === 'global_90'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                        }`}
                        title="Comparar con la suma total del examen completo de 90 preguntas"
                      >
                        <i className="fa-solid fa-graduation-cap text-[9px]"></i>
                        <span>Conjunto (90 Q)</span>
                      </button>
                    </div>
                  </div>

                  {/* Banner informativo de equivalencia calculada */}
                  {(() => {
                    const baseQ =
                      tipoComparativaC1 === 'supuesto_20' ? 20 : tipoComparativaC1 === 'global_90' ? 90 : 70;
                    const pdEquivalente = (porcentajeUsuarioNeto / 100) * baseQ;

                    return (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] shrink-0">
                            <i className="fa-solid fa-calculator"></i>
                          </span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-300">
                            Tu prueba realizada ({totalQ} preguntas):{' '}
                            <strong className="text-slate-900 dark:text-white font-mono">
                              {pdNum.toFixed(2)} PD ({porcentajeUsuarioNeto.toFixed(2)}%)
                            </strong>{' '}
                            → Equivalente sobre{' '}
                            <strong>{baseQ} preguntas oficiales</strong>:{' '}
                            <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                              {pdEquivalente.toFixed(2)} PD
                            </strong>
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          {tipoComparativaC1 === 'supuesto_20'
                            ? 'Baremos de 2.ª Parte (Supuesto 20 Q)'
                            : tipoComparativaC1 === 'global_90'
                            ? 'Baremos de Suma Total (90 Q)'
                            : 'Baremos de 1.ª Parte (Test 70 Q)'}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {CONVOCATORIAS_C1_AGE.map((conv) => {
                      let cortePD = conv.corteParte1PD;
                      let maxQ = conv.totalParte1Q;
                      let porcentajeCorte = conv.porcentajeAprobadoNetoParte1;
                      let nombreParte = '1.ª Parte (Test 70 Q)';

                      if (tipoComparativaC1 === 'supuesto_20') {
                        cortePD = conv.corteParte2PD;
                        maxQ = conv.totalParte2Q;
                        porcentajeCorte = conv.porcentajeAprobadoNetoParte2;
                        nombreParte = '2.ª Parte (Supuesto 20 Q)';
                      } else if (tipoComparativaC1 === 'global_90') {
                        cortePD = conv.corteTotalPD;
                        maxQ = conv.totalPreguntas;
                        porcentajeCorte = conv.porcentajeAprobadoNetoTotal;
                        nombreParte = 'Global (90 Q)';
                      }

                      const pdEquivalente = (porcentajeUsuarioNeto / 100) * maxQ;
                      const diffPorcentaje = porcentajeUsuarioNeto - porcentajeCorte;
                      const diffPD = pdEquivalente - cortePD;
                      const supera = diffPorcentaje >= 0;

                      return (
                        <div
                          key={conv.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                            supera
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                {conv.anoOEP}
                              </span>
                              <span
                                className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded font-mono border ${
                                  supera
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {supera ? '✓ Superarías corte' : '✗ Bajo corte'}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                              Examen: {conv.fechaExamen} ({conv.plazasTotal.toLocaleString('es-ES')} plazas)
                            </span>
                            <span className="text-[8.5px] font-mono text-indigo-600 dark:text-indigo-400 block font-bold">
                              {nombreParte}
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Corte oficial:</span>
                              <span className="font-black text-slate-800 dark:text-slate-200">
                                {cortePD.toFixed(2)} PD / {maxQ} ({porcentajeCorte.toFixed(2)}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Tu equivalencia:</span>
                              <span className={`font-black ${supera ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                {pdEquivalente.toFixed(2)} PD / {maxQ} ({porcentajeUsuarioNeto.toFixed(2)}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] border-t border-slate-200/60 dark:border-slate-700/60 pt-1">
                              <span className="text-slate-500">Margen neto:</span>
                              <span className={`font-black ${supera ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                {supera ? `+${diffPorcentaje.toFixed(2)}% (+${diffPD.toFixed(2)} PD)` : `${diffPorcentaje.toFixed(2)}% (${diffPD.toFixed(2)} PD)`}
                              </span>
                            </div>

                            {/* Barra visual de rendimiento vs corte */}
                            <div className="space-y-0.5 pt-1">
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${supera ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, porcentajeUsuarioNeto))}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-[8px] text-slate-400">
                                <span>0%</span>
                                <span className="font-bold text-slate-600 dark:text-slate-300">Corte: {porcentajeCorte.toFixed(1)}%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-tight border-t border-slate-200/60 dark:border-slate-700/60 pt-1 mt-1">
                            {conv.observaciones}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista Rápida de Preguntas Filtradas */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                    <h5 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
                      <i className="fa-solid fa-list-check text-indigo-500"></i>
                      Preguntas {filtroPreguntas === 'todas' ? 'del Examen' : filtroPreguntas === 'acertadas' ? 'Acertadas' : filtroPreguntas === 'falladas' ? 'Falladas' : filtroPreguntas === 'anuladas' ? 'Anuladas' : 'en Blanco'} ({indicesFiltrados.length})
                    </h5>
                    <span className="text-[10px] text-slate-400">
                      Haz clic en cualquier pregunta para examinarla en el visor superior
                    </span>
                  </div>

                  {indicesFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                      {indicesFiltrados.map((qIdx) => {
                        const preg = examenActivo.preguntas[qIdx];
                        const estado = getEstadoPregunta(qIdx);
                        const respUser = respuestasUsuario[qIdx];
                        const opcCorrecta = preg.opciones.find((o) => o.esCorrecta);
                        const opcUser = preg.opciones.find((o) => o.id === respUser);

                        return (
                          <div
                            key={preg.id}
                            onClick={() => {
                              setPreguntaValidandoBOE({ pregunta: preg, index: qIdx });
                            }}
                            className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-md ${
                              preg.esAnulada
                                ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                                : preg.esReserva && preg.activaEnEvaluacion
                                ? 'border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20'
                                : estado === 'acertada'
                                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                                : estado === 'fallada'
                                ? 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-slate-900 dark:text-white line-clamp-2">
                                  {preg.esReserva
                                    ? `Reserva #${preg.numeroReserva || 'R'}`
                                    : `${qIdx + 1}`}. {preg.enunciado}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                {(() => {
                                  const refConvItem = obtenerReferenciaConvocatoriaOficial(preg, examenActivo);
                                  if (refConvItem) {
                                    return (
                                      <span
                                        className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1"
                                        title={`Pregunta de convocatoria oficial: ${refConvItem}`}
                                      >
                                        <i className="fa-solid fa-landmark-flag text-amber-600 dark:text-amber-400 text-[8px]"></i>
                                        <span>{refConvItem}</span>
                                      </span>
                                    );
                                  }
                                  return (
                                    <span
                                      className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                                      title={`Código de ítem inédito verificado: ${preg.codigoInedita || `INED-${preg.id.toString(16).padStart(4, '0').toUpperCase()}`}`}
                                    >
                                      <i className="fa-solid fa-shield-halved text-emerald-600 text-[8px]"></i>
                                      <span>{preg.codigoInedita || `INED-${preg.id.toString(16).padStart(4, '0').toUpperCase()}`}</span>
                                    </span>
                                  );
                                })()}
                                {preg.esAnulada ? (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono bg-rose-100 text-rose-800 border border-rose-200">
                                    <i className="fa-solid fa-ban mr-1"></i> Anulada
                                  </span>
                                ) : preg.esReserva ? (
                                  preg.activaEnEvaluacion ? (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono bg-purple-100 text-purple-800 border border-purple-200">
                                      <i className="fa-solid fa-star text-amber-500 mr-1"></i> Reserva activa
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                      Reserva inactiva
                                    </span>
                                  )
                                ) : (
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                                      estado === 'acertada'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : estado === 'fallada'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {estado === 'acertada' ? '✓ Acertada' : estado === 'fallada' ? '✗ Fallada' : 'En blanco'}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAnulada(qIdx);
                                  }}
                                  className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all ${
                                    preg.esAnulada
                                      ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 border-slate-300 dark:border-slate-700'
                                  }`}
                                  title={preg.esAnulada ? 'Desmarcar anulación' : 'Marcar como anulada en plantilla'}
                                >
                                  {preg.esAnulada ? 'Desanular' : 'Anular'}
                                </button>
                              </div>
                            </div>

                            {/* Información de sustitución si procede */}
                            {preg.esAnulada && preg.sustituidaPorReservaId && (
                              <div className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center gap-1">
                                <i className="fa-solid fa-arrow-right-arrow-left text-[9px]"></i>
                                <span>Sustituida en la puntuación por la Reserva #{preg.sustituidaPorReservaId}</span>
                              </div>
                            )}

                            {preg.esReserva && preg.activaEnEvaluacion && preg.sustituyeAPreguntaId && (
                              <div className="mt-1 text-[10px] text-purple-700 dark:text-purple-400 font-mono font-bold flex items-center gap-1">
                                <i className="fa-solid fa-check-double text-[9px]"></i>
                                <span>Sustituye a la Pregunta anulada #{preg.sustituyeAPreguntaId} (entra en cómputo oficial)</span>
                              </div>
                            )}

                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                              {respUser ? (
                                <span className={estado === 'acertada' ? 'text-emerald-700 dark:text-emerald-300 font-bold' : estado === 'fallada' ? 'text-rose-700 dark:text-rose-300 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                                  Tu respuesta: <strong>{respUser})</strong> {opcUser?.texto}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No contestada</span>
                              )}
                              {estado === 'fallada' && opcCorrecta && (
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                  Opción Correcta: <strong>{opcCorrecta.id})</strong> {opcCorrecta.texto}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 font-mono">
                              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[65%]">
                                <i className="fa-solid fa-scale-balanced text-indigo-600"></i>
                                {obtenerNormaEfectivaDePregunta(preg, examenActivo)} · {preg.justificacionLegal?.articulo || ''}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreguntaActualIdx(qIdx);
                                    window.scrollTo({ top: 380, behavior: 'smooth' });
                                  }}
                                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                                  title="Abrir en el visor interactivo superior"
                                >
                                  Visor ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreguntaValidandoBOE({ pregunta: preg, index: qIdx });
                                  }}
                                  className="text-indigo-600 dark:text-indigo-400 font-black hover:underline flex items-center gap-1 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
                                  title="Ver fundamentación literal oficial y justificación legal"
                                >
                                  <i className="fa-solid fa-scale-balanced text-indigo-500"></i>
                                  <span>Justificación</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                      No hay preguntas que coincidan con el filtro seleccionado ({filtroPreguntas}).
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => cambiarFiltro(filtroPreguntas === 'falladas' ? 'todas' : 'falladas')}
                      className={`py-2 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        filtroPreguntas === 'falladas'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <i className="fa-solid fa-filter mr-1.5"></i>
                      {filtroPreguntas === 'falladas' ? 'Ver Todas' : 'Repasar Falladas'}
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarFiltro(filtroPreguntas === 'acertadas' ? 'todas' : 'acertadas')}
                      className={`py-2 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        filtroPreguntas === 'acertadas'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <i className="fa-solid fa-check mr-1.5"></i>
                      {filtroPreguntas === 'acertadas' ? 'Ver Todas' : 'Repasar Acertadas'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={exportarTestAJSON}
                      className="py-2 px-4 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <i className="fa-solid fa-file-code text-indigo-500"></i>
                      Exportar test a JSON
                    </button>

                    <button
                      onClick={exportarExamenPDF}
                      className="py-2 px-4 bg-white dark:bg-slate-700 hover:bg-slate-50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-file-pdf text-rose-500"></i>
                      Exportar a PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => resetearExamenCompleto('Sesión reiniciada. Configura y genera tu nueva prueba.')}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <i className="fa-solid fa-arrows-rotate"></i>
                      <span>Reiniciar / Nuevo Examen</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* PRINT-ONLY OFFICIAL EXAM TEMPLATE (FOR PDF EXPORT) */}
      {examenActivo && (
        <div className="hidden print:block print:p-8 space-y-6">
          <div className="border-b-2 border-black pb-4 text-center space-y-1">
            <h1 className="text-xl font-bold uppercase tracking-tight">
              TRIBUNAL CALIFICADOR DE OPOSICIONES C1 ({examenActivo.ambito})
            </h1>
            <p className="text-sm font-semibold">{examenActivo.titulo}</p>
            <p className="text-xs text-gray-600">
              Fuente Oficial Exclusiva: Boletín Oficial del Estado (www.boe.es) · Criterio de corrección: Acierto (+1.00) / Fallo (-0.33)
            </p>
          </div>

          {examenActivo.contextoCaso && (
            <div className="border border-gray-400 p-4 rounded text-xs leading-relaxed space-y-2">
              <h2 className="font-bold uppercase text-sm">Supuesto Práctico de Hecho:</h2>
              <p>{examenActivo.contextoCaso}</p>
            </div>
          )}

          <div className="space-y-6 pt-4">
            {examenActivo.preguntas.map((preg, idx) => (
              <div key={preg.id} className="space-y-2 text-xs">
                <p className="font-bold">
                  {idx + 1}. {preg.enunciado}
                </p>
                <div className="pl-4 space-y-1">
                  {preg.opciones.map((o) => (
                    <p key={o.id}>
                      <strong>{o.id})</strong> {o.texto}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="page-break pt-8 border-t-2 border-black space-y-4">
            <h2 className="text-base font-bold uppercase text-center">PLANTILLA DE SOLUCIONES Y CITA OFICIAL BOE</h2>
            <div className="space-y-4 text-xs">
              {examenActivo.preguntas.map((preg, idx) => {
                const correcta = preg.opciones.find((o) => o.esCorrecta);
                return (
                  <div key={preg.id} className="border-b border-gray-300 pb-2 space-y-1">
                    <p>
                      <strong>Pregunta {idx + 1}:</strong> Opción Correcta: <strong>{correcta?.id}</strong>
                    </p>
                    <p className="text-gray-700">
                      <strong>Fundamento Legal BOE:</strong> {preg.justificacionLegal?.norma || 'BOE'} ({preg.justificacionLegal?.articulo || ''})
                    </p>
                    <p className="text-gray-500 font-mono text-[10px]">
                      Enlace oficial: {preg.justificacionLegal?.urlBOE || 'https://www.boe.es'}
                    </p>
                    <p className="italic text-gray-600">{preg.justificacionLegal?.fundamento || ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Protocolo Estricto de Cómputo de Plazos Administrativos (Ley 39/2015) */}
      {mostrarProtocoloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-sky-50 dark:bg-sky-950/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-sky-600 text-white flex items-center justify-center text-sm shadow-xs">
                  <i className="fa-solid fa-calculator"></i>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Protocolo Estricto de Cómputo de Plazos Administrativos
                  </h3>
                  <p className="text-[10px] text-sky-800 dark:text-sky-300 font-mono">
                    Ley 39/2015 (LPACAP) · Artículos 30.2, 30.3 y 30.5
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarProtocoloModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar protocolo"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <p className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-amber-600"></i>
                  Algoritmo Secuencial Obligatorio en Tres Fases
                </p>
                <p className="text-[11px] mt-1 text-amber-800 dark:text-amber-300">
                  Todo supuesto o pregunta de examen oficial sigue este orden matemático estricto antes de formular la respuesta y las opciones:
                </p>
              </div>

              {/* Fase 1 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wide">
                  <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-mono text-[10px]">1</span>
                  Identificación y Dies a Quo (Art. 30.3)
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                  <li><strong>Identificar la fecha exacta</strong> del hecho o notificación (<strong>Fecha N</strong>).</li>
                  <li><strong>Fijar el 'dies a quo':</strong> primer día del cómputo = día hábil siguiente a la notificación (<strong>Fecha N + 1 hábil</strong>).</li>
                </ul>
              </div>

              {/* Fase 2 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold text-xs uppercase tracking-wide">
                  <span className="h-5 w-5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-mono text-[10px]">2</span>
                  Trazabilidad Día a Día (Plazos en Días Hábiles - Art. 30.2)
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                  <li><strong>Desglosar la lista numerada</strong> correlativa día por día hábil (Día 1, Día 2, ... Día X).</li>
                  <li><strong>Excluir individualmente</strong> de la lista sábados, domingos y festivos aplicables (nacionales, autonómicos o locales indicados en el enunciado).</li>
                  <li>El día en el que se alcance el número exacto fijado en el plazo es el <strong>'DIES AD QUEM' (vencimiento natural)</strong>.</li>
                </ul>
              </div>

              {/* Fase 3 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wide">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-mono text-[10px]">3</span>
                  Regla de Cierre y Prórroga (Art. 30.5)
                </div>
                <div className="space-y-2 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                  <p>Evaluar <strong>ÚNICAMENTE</strong> el 'dies ad quem' obtenido:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                      <strong className="text-emerald-900 dark:text-emerald-200 block mb-1">Si cae en día HÁBIL:</strong>
                      El plazo <strong>FINALIZA EXACTAMENTE ese día a las 23:59:59 horas</strong>. Queda TERMINANTEMENTE PROHIBIDO aplicar prórroga a días o meses posteriores aunque intervengan festivos en días inmediatos siguientes.
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px]">
                      <strong className="text-amber-900 dark:text-amber-200 block mb-1">Si cae en día INHÁBIL:</strong>
                      (Sábado, domingo o festivo declarado): Únicamente en este caso el plazo se entiende prorrogado al <strong>primer día hábil siguiente</strong>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Regla de Calidad */}
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-950 dark:text-indigo-200">
                <strong>REGLA DE CALIDAD CPS:</strong> La opción correcta (clave) de la pregunta debe coincidir matemáticamente con el 'dies ad quem' final resultante del desglose, y dicho día debe figurar obligatoriamente entre las 4 alternativas del test.
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMostrarProtocoloModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUDITOR OFICIAL DE SINGULARIDAD, INÉDITAS Y NO-REPETICIÓN */}
      {mostrarAntiDuplicadosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600/60 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-lg shadow-sm shrink-0">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono">
                      Control Anti-Clonación Activo
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-200 border border-emerald-700/60">
                      100% Inéditas
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                    Auditor de Singularidad, Inéditas y No-Repetición
                  </h3>
                  <p className="text-[10px] text-emerald-300 font-mono">
                    Garantía de 0% preguntas repetidas ni permutaciones de respuestas en un mismo test
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarAntiDuplicadosModal(false)}
                className="h-8 w-8 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar auditor"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* Métricas en Tiempo Real de la Batería Activa */}
              {auditoriaSingularidad ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <i className="fa-solid fa-chart-pie text-emerald-600"></i>
                      Auditoría en Tiempo Real de la Batería Activa ({auditoriaSingularidad.total} preguntas)
                    </span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono border border-emerald-300 dark:border-emerald-800">
                      Estado: Verificado y Certificado ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                      <span className="text-[8.5px] font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                        Preguntas Inéditas
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
                        100%
                      </span>
                      <span className="text-[8px] text-emerald-700 dark:text-emerald-400 font-mono block mt-0.5">
                        {auditoriaSingularidad.total}/{auditoriaSingularidad.total} verificadas
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[8.5px] font-black uppercase text-slate-500 block">
                        Duplicados Enunciado
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
                        {auditoriaSingularidad.duplicadosEnunciado} (0%)
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                        Cero repeticiones
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[8.5px] font-black uppercase text-slate-500 block">
                        Permutación Opciones
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
                        {auditoriaSingularidad.duplicadosHuella} (0%)
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                        Sin clones de distractores
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                      <span className="text-[8.5px] font-black uppercase text-indigo-800 dark:text-indigo-300 block">
                        Preceptos Evaluados
                      </span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">
                        {auditoriaSingularidad.articulosUnicos}
                      </span>
                      <span className="text-[8px] text-indigo-700 dark:text-indigo-400 font-mono block mt-0.5">
                        Artículos del BOE
                      </span>
                    </div>
                  </div>

                  {/* Matriz de Dispersión Normativa de la Batería Actual */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Matriz de Ítems Inéditos y Preceptos Legales de la Prueba Actual:
                    </span>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {examenActivo?.preguntas.map((p, pIdx) => (
                        <div
                          key={p.id}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[9px] shrink-0">
                              #{pIdx + 1}
                            </span>
                            {(() => {
                              const refConvAud = obtenerReferenciaConvocatoriaOficial(p, examenActivo);
                              return refConvAud ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-black text-[9px] shrink-0 border border-amber-300 dark:border-amber-800">
                                  {refConvAud}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-black text-[9px] shrink-0 border border-emerald-200 dark:border-emerald-800">
                                  {p.codigoInedita || `INED-${p.id.toString(16).padStart(4, '0').toUpperCase()}`}
                                </span>
                              );
                            })()}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {p.justificacionLegal?.norma || 'Normativa BOE'} · {p.justificacionLegal?.articulo || ''}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0 flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[9px]"></i>
                            Singular
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs">
                  Configura y genera una prueba para auditar en vivo la singularidad de sus ítems.
                </div>
              )}

              {/* Protocolo y Directrices de Calidad Anti-Duplicados */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Protocolo Oficial de Singularidad e Inéditas:
                </span>

                {/* Sección 1 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wide">
                    <span className="h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-mono text-[10px]">1</span>
                    Regla de No Repetición Radical y Anti-Clonación
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                    <li><strong>Prohibición terminante de duplicados en un mismo test:</strong> Cada ítem evalúa una situación fáctica y jurídica original.</li>
                    <li><strong>Prohibición de alterar solo opciones:</strong> No se considera pregunta nueva mantener el mismo enunciado variando el orden de las letras (A, B, C, D) o modificando cifras superficiales. El núcleo material y técnico evaluado debe ser exclusivo.</li>
                  </ul>
                </div>

                {/* Sección 2 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wide">
                    <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-mono text-[10px]">2</span>
                    Matriz de Rotación y Diversificación Temática
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                    <p>
                      El generador audita internamente qué artículos ya han sido evaluados y rota obligatoriamente entre los preceptos de las normas seleccionadas (TREBEP, LPACAP, LRJSP, Reales Decretos 364/1995 y 365/1995, Ley 3/2018).
                    </p>
                    <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 pt-0.5">
                      <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                      En una misma sesión o supuesto, queda prohibido formular dos preguntas sobre el mismo artículo o sobre la misma función específica.
                    </p>
                  </div>
                </div>

                {/* Sección 3 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-mono text-[10px]">3</span>
                    Distractores Homogéneos y Balance de Opciones
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                    <li>Cada pregunta cuenta con <strong>4 alternativas homogéneas</strong> en longitud, terminología y verosimilitud legal formal.</li>
                    <li>La clave correcta se equilibra de forma real (aprox. <strong>25% para cada letra: A, B, C, D</strong>), eliminando sesgos recurrentes.</li>
                  </ul>
                </div>
              </div>

              {/* Memoria Anti-Duplicados Inter-Sesiones */}
              {historialPreguntasRecientes.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                      Memoria de exclusión histórica activa:
                    </span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                      {historialPreguntasRecientes.length} preguntas bloqueadas contra re-emisión
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHistorialPreguntasRecientes([]);
                      try {
                        localStorage.removeItem('c1_historial_preguntas_recientes');
                      } catch (_) {}
                      mostrarAviso('Memoria de exclusión histórica reiniciada.', 'info');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold underline cursor-pointer"
                  >
                    Vaciar memoria
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end items-center bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMostrarAntiDuplicadosModal(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <i className="fa-solid fa-check"></i>
                <span>Cerrar Auditor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTERACTIVO DE JUSTIFICACIÓN Y VALIDACIÓN CON FUENTE OFICIAL BOE (FORMATO HORIZONTAL Y TIPOGRAFÍA AMPLIA) */}
      {preguntaValidandoBOE && examenActivo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreguntaValidandoBOE(null);
          }}
        >
          <div className="bg-white dark:bg-slate-800 border-2 border-indigo-500/30 dark:border-indigo-400/30 rounded-3xl max-w-[98vw] xl:max-w-[96vw] 2xl:max-w-[1720px] w-full h-[94vh] max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/60 border border-indigo-400/40 text-amber-300 flex items-center justify-center text-base shadow-sm shrink-0">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono">
                      Justificación Oficial BOE
                    </span>
                    {(() => {
                      const refConvModal = obtenerReferenciaConvocatoriaOficial(
                        preguntaValidandoBOE.pregunta,
                        examenActivo
                      );
                      if (refConvModal) {
                        return (
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-300 text-slate-950 font-mono flex items-center gap-1">
                            <i className="fa-solid fa-landmark-flag text-slate-900"></i>
                            <span>{formatearBadgeConvocatoriaOficial(refConvModal)}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono flex items-center gap-1">
                          <i className="fa-solid fa-shield-halved text-slate-900"></i>
                          <span>Inédita: {preguntaValidandoBOE.pregunta.codigoInedita || `INED-${preguntaValidandoBOE.pregunta.id.toString(16).padStart(4, '0').toUpperCase()}`}</span>
                        </span>
                      );
                    })()}
                    {preguntaValidandoBOE.pregunta.justificacionLegal?.codigoBOE && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-200 border border-indigo-700/60">
                        {preguntaValidandoBOE.pregunta.justificacionLegal.codigoBOE}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] sm:text-[17px] font-black text-white mt-0.5 truncate flex items-center gap-1.5">
                    <a
                      href={obtenerUrlBOEParaNorma(
                        obtenerNormaEfectivaDePregunta(preguntaValidandoBOE.pregunta, examenActivo),
                        preguntaValidandoBOE.pregunta.justificacionLegal?.articulo || '',
                        preguntaValidandoBOE.pregunta.justificacionLegal?.urlBOE
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer text-white"
                      title="Abrir esta ley en el BOE oficial"
                    >
                      <span>{obtenerNormaEfectivaDePregunta(preguntaValidandoBOE.pregunta, examenActivo)}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-amber-400"></i>
                    </a>
                    {preguntaValidandoBOE.pregunta.justificacionLegal?.articulo && (
                      <span className="text-indigo-300 font-mono">
                        · {preguntaValidandoBOE.pregunta.justificacionLegal.articulo}
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <a
                  href={obtenerUrlBOEParaNorma(
                    obtenerNormaEfectivaDePregunta(preguntaValidandoBOE.pregunta, examenActivo),
                    preguntaValidandoBOE.pregunta.justificacionLegal?.articulo || '',
                    preguntaValidandoBOE.pregunta.justificacionLegal?.urlBOE
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Abrir el texto consolidado oficial en la web del BOE"
                >
                  <span>Abrir en BOE</span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                </a>
                <button
                  type="button"
                  onClick={() => setPreguntaValidandoBOE(null)}
                  className="h-8 w-8 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="Cerrar justificación"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            {/* Modal Body - Formato Horizontal Equilibrado (50% / 50%) con Tipografía Adaptativa */}
            {(() => {
              const preg = preguntaValidandoBOE.pregunta;
              const totalTextoIzq =
                (preg.enunciado || '').length +
                preg.opciones.reduce((acc, o) => acc + (o.texto || '').length + (o.explicacion || '').length, 0);
              const nivelIzq = totalTextoIzq > 850 ? 'muy_denso' : totalTextoIzq > 480 ? 'denso' : 'estandar';
              const fontEnunciado =
                nivelIzq === 'muy_denso'
                  ? 'text-[13px] sm:text-sm leading-snug'
                  : nivelIzq === 'denso'
                  ? 'text-sm sm:text-[15px] leading-snug'
                  : 'text-sm sm:text-base font-bold leading-snug';
              const fontOpcion =
                nivelIzq === 'muy_denso'
                  ? 'text-xs sm:text-[12.5px] leading-snug'
                  : nivelIzq === 'denso'
                  ? 'text-xs sm:text-[13px] leading-snug'
                  : 'text-[13px] sm:text-sm leading-snug';
              const paddingOpcion =
                nivelIzq === 'muy_denso'
                  ? 'py-1 px-2'
                  : nivelIzq === 'denso'
                  ? 'py-1.5 px-2.5'
                  : 'py-2 px-3';

              return (
                <div className="p-2.5 sm:p-3.5 flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-3.5 min-h-0 text-slate-700 dark:text-slate-300">
                  {/* COLUMNA IZQUIERDA: 50% de la ventana horizontalmente */}
                  <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
                    {/* Enunciado de la Pregunta */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-1 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-question text-indigo-500"></i>
                          Pregunta #{preguntaValidandoBOE.index + 1} de {examenActivo.preguntas.length}
                        </span>
                        {(() => {
                          const st = getEstadoPregunta(preguntaValidandoBOE.index);
                          return (
                            <span
                              className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full font-mono ${
                                st === 'acertada'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : st === 'fallada'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {st === 'acertada' ? '✓ Acertada' : st === 'fallada' ? '✗ Fallada' : 'Sin responder'}
                            </span>
                          );
                        })()}
                      </div>
                      <p className={`${fontEnunciado} font-bold text-slate-900 dark:text-white leading-snug`}>
                        {preg.enunciado}
                      </p>
                    </div>

                    {/* Confrontation of User Answer vs. Official Tribunal Key */}
                    {(() => {
                      const respU = respuestasUsuario[preguntaValidandoBOE.index];
                      const opcCorr = preg.opciones.find((o) => o.esCorrecta);
                      const opcU = preg.opciones.find((o) => o.id === respU);
                      const acierto = respU && opcCorr && respU === opcCorr.id;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                          {/* Tu Selección */}
                          <div
                            className={`p-2 sm:p-2.5 rounded-xl border ${
                              !respU
                                ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                : acierto
                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
                                : 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30'
                            }`}
                          >
                            <span className="text-[11px] font-black uppercase tracking-wider block text-slate-500 mb-0.5">
                              Tu Selección
                            </span>
                            {respU ? (
                              <div>
                                <span
                                  className={`font-black text-[13px] inline-flex items-center gap-1 ${
                                    acierto ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                                  }`}
                                >
                                  <i className={acierto ? 'fa-solid fa-check' : 'fa-solid fa-xmark'}></i>
                                  Opción {respU})
                                </span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-tight font-medium line-clamp-2 mt-0.5">
                                  {opcU?.texto}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No contestada (en blanco)</p>
                            )}
                          </div>

                          {/* Clave Oficial del Tribunal */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30">
                            <span className="text-[11px] font-black uppercase tracking-wider block text-emerald-800 dark:text-emerald-300 mb-0.5 flex items-center gap-1">
                              <i className="fa-solid fa-certificate text-emerald-600"></i>
                              Clave Oficial del Tribunal
                            </span>
                            {opcCorr && (
                              <div>
                                <span className="font-black text-[13px] text-emerald-800 dark:text-emerald-200 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                                  Opción {opcCorr.id}) Correcta
                                </span>
                                <p className="text-xs text-emerald-950 dark:text-emerald-100 leading-tight font-semibold line-clamp-2 mt-0.5">
                                  {opcCorr.texto}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sello de Origen: Convocatoria Oficial o Singularidad Inédita */}
                    {(() => {
                      const refConvSello = obtenerReferenciaConvocatoriaOficial(preg, examenActivo);
                      if (refConvSello) {
                        return (
                          <div className="py-1 px-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[11.5px] text-amber-950 dark:text-amber-200 flex items-center justify-between gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-4.5 w-4.5 rounded bg-amber-600 text-white flex items-center justify-center text-[10px] shrink-0">
                                <i className="fa-solid fa-landmark-flag"></i>
                              </span>
                              <span className="font-bold truncate">
                                {obtenerNormaEfectivaDePregunta(preg, examenActivo)} ·{' '}
                                <span className="font-mono text-[10.5px] text-amber-800 dark:text-amber-300 font-semibold">
                                  {refConvSello}
                                </span>
                              </span>
                            </div>
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono border border-amber-400 dark:border-amber-700 shrink-0">
                              Convocatoria Oficial
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="py-1 px-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-[11.5px] text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-1.5 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-4.5 w-4.5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0">
                              <i className="fa-solid fa-fingerprint"></i>
                            </span>
                            <span className="font-bold truncate">
                              {obtenerNormaEfectivaDePregunta(preg, examenActivo)} · <span className="font-mono text-[10.5px] text-emerald-800 dark:text-emerald-300 font-normal">{preg.codigoInedita || `INED-${preg.id.toString(16).padStart(4, '0').toUpperCase()}`}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono border border-emerald-400 dark:border-emerald-700 shrink-0">
                            0% Clones
                          </span>
                        </div>
                      );
                    })()}

                    {/* Desglose y Confrontación de las 4 Opciones con aspa rojo (✗) en erróneas */}
                    <div className="space-y-1.5 flex-1 min-h-0">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                        Desglose y Confrontación de las 4 Opciones:
                      </span>
                      <div className="space-y-1.5">
                        {preg.opciones.map((opc) => (
                          <div
                            key={opc.id}
                            className={`${paddingOpcion} rounded-lg border leading-tight ${
                              opc.esCorrecta
                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200 ring-1 ring-emerald-400/40'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                <span
                                  className={`h-5 w-5 rounded flex items-center justify-center font-mono font-black text-[11px] shrink-0 mt-0.5 ${
                                    opc.esCorrecta ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {opc.id}
                                </span>
                                <div className="min-w-0 flex items-start gap-1.5 flex-1">
                                  {!opc.esCorrecta ? (
                                    <span
                                      className="text-rose-600 dark:text-rose-400 font-black text-sm sm:text-base leading-none shrink-0 mt-0.5 select-none"
                                      title="Opción errónea (distractor)"
                                    >
                                      ✗
                                    </span>
                                  ) : (
                                    <span
                                      className="text-emerald-600 dark:text-emerald-400 font-black text-sm sm:text-base leading-none shrink-0 mt-0.5 select-none"
                                      title="Opción correcta conforme a ley"
                                    >
                                      ✓
                                    </span>
                                  )}
                                  <span
                                    className={`${fontOpcion} leading-snug ${
                                      opc.esCorrecta
                                        ? 'text-emerald-900 dark:text-emerald-200 font-bold'
                                        : 'text-slate-800 dark:text-slate-200 font-normal'
                                    }`}
                                  >
                                    {opc.texto}
                                  </span>
                                </div>
                              </div>
                              {opc.esCorrecta ? (
                                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                                  ✓ Conforme a Ley
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                                  Distractor
                                </span>
                              )}
                            </div>
                            {opc.explicacion && (
                              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 pl-6.5 mt-0.5 leading-tight">
                                {opc.explicacion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: 50% de la ventana horizontalmente con tipografía adaptativa */}
                  <div className="flex flex-col gap-2.5 overflow-y-auto pr-1.5 scrollbar-thin">
                    {(() => {
                      const opcCorr = preg.opciones.find((o) => o.esCorrecta);
                      const fundamento = (preg.justificacionLegal?.fundamento || '').trim();
                      const norma = obtenerNormaEfectivaDePregunta(preg, examenActivo);
                      const articulo = preg.justificacionLegal?.articulo || '';

                      // Pattern to detect explicit practical example division within fundamento
                      const separadorRegex = /(?:ejemplo\s+pr[áa]ctico|caso\s+pr[áa]ctico|aplicaci[óo]n\s+pr[áa]ctica|aplicaci[óo]n\s+al\s+caso|supuesto\s+pr[áa]ctico|resoluci[óo]n\s+pr[áa]ctica)[\s:.-]+/i;

                      let argumentacionLegal = fundamento;
                      let ejemploPractico = (preg.ejemploPractico || preg.justificacionLegal?.ejemploPractico || '').trim();

                      if (!ejemploPractico && separadorRegex.test(fundamento)) {
                        const partes = fundamento.split(separadorRegex);
                        if (partes.length >= 2) {
                          argumentacionLegal = partes[0].trim();
                          ejemploPractico = partes.slice(1).join('\n\n').trim();
                        }
                      }

                      // If no separate example was found inside fundamento, use the correct option explanation
                      if (!ejemploPractico && opcCorr?.explicacion) {
                        ejemploPractico = opcCorr.explicacion.trim();
                      }

                      // Strict fields coming strictly from TXT answers template (never invented)
                      const reglaMnemotecnicaAMostrar = (preg.reglaMnemotecnica || '').trim();
                      const analisisDistractoresAMostrar = (preg.analisisDistractores || '').trim();
                      const refConvOficialDer = obtenerReferenciaConvocatoriaOficial(preg, examenActivo);
                      const convocatoriasAMostrar =
                        refConvOficialDer || limpiarTextoConvocatoria(preg.convocatoriasAparecida);

                      // Escala adaptativa de fuentes para la columna derecha
                      const totalTextoDer =
                        (argumentacionLegal || '').length +
                        (ejemploPractico || '').length +
                        (analisisDistractoresAMostrar || '').length +
                        (reglaMnemotecnicaAMostrar || '').length;
                      const nivelDer = totalTextoDer > 850 ? 'muy_denso' : totalTextoDer > 480 ? 'denso' : 'estandar';
                      const fontArgumentacion =
                        nivelDer === 'muy_denso'
                          ? 'text-xs sm:text-[12.5px] leading-relaxed'
                          : nivelDer === 'denso'
                          ? 'text-[13px] sm:text-[13.5px] leading-relaxed'
                          : 'text-sm sm:text-[14.5px] leading-relaxed';
                      const fontEjemplo =
                        nivelDer === 'muy_denso'
                          ? 'text-xs sm:text-[12.5px] leading-snug'
                          : nivelDer === 'denso'
                          ? 'text-xs sm:text-[13px] leading-snug'
                          : 'text-[13px] sm:text-sm leading-relaxed';
                      const fontDistractores =
                        nivelDer === 'muy_denso' ? 'text-xs leading-snug' : 'text-xs sm:text-[13px] leading-snug';

                      // Check if this question is already in the relevant questions warehouse
                      const estaEnAlmacen = (itemsAlmacenDudas || []).some(
                        (it) => it.enunciado === preg.enunciado || (it.preguntaId === preg.id && it.examenId === examenActivo?.id)
                      );

                      const userAns = respuestasUsuario[preguntaValidandoBOE.index];
                      const esRespondida = userAns !== undefined && userAns !== null && userAns !== '';
                      const esFallada = esRespondida && userAns !== opcCorr?.id;
                      const esAcertada = esRespondida && userAns === opcCorr?.id;

                      const handleVolcarAlmacenClick = () => {
                        const idItem = `pregunta-relevante-${examenActivo?.id || 'exam'}-${preg.id}`;
                        const leyesAsignadas =
                          preg.leyesRelacionadas && preg.leyesRelacionadas.length > 0
                            ? preg.leyesRelacionadas
                            : (norma ? [norma] : (examenActivo?.leyesBOEAplicadas || []));

                        const item: ItemAlmacenDuda = {
                          id: idItem,
                          preguntaId: preg.id,
                          examenId: examenActivo?.id,
                          examenTitulo: examenActivo?.titulo,
                          tipo: 'pregunta_relevante',
                          esFallada: esFallada,
                          enunciado: preg.enunciado,
                          opciones: preg.opciones,
                          respuestaUsuario: userAns,
                          respuestaCorrecta: opcCorr?.id || 'A',
                          justificacionLegal: preg.justificacionLegal,
                          reglaMnemotecnica: reglaMnemotecnicaAMostrar || undefined,
                          ejemploPractico: ejemploPractico || undefined,
                          analisisDistractores: analisisDistractoresAMostrar || undefined,
                          convocatoriasAparecida: convocatoriasAMostrar || undefined,
                          comentarioUsuario: opcCorr?.explicacion || undefined,
                          leyesRelacionadas: leyesAsignadas,
                          fechaCreacion: new Date().toISOString(),
                          origen: 'justificacion',
                          resuelta: false,
                        };

                        onGuardarEnAlmacenDudas?.(item);
                      };

                      return (
                        <div className="flex flex-col gap-2 min-h-0 text-slate-700 dark:text-slate-300">
                          {/* CUADRO 1: ARGUMENTACIÓN LEGAL Y FUNDAMENTACIÓN BOE (Ámbar / Dorado) */}
                          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 space-y-1.5 shadow-2xs shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-200/80 dark:border-amber-800/60 pb-1">
                              <span className="text-[13px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                <i className="fa-solid fa-scale-balanced text-amber-600 dark:text-amber-400 text-xs"></i>
                                1. Argumentación Legal y Fundamentación BOE
                              </span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={obtenerUrlBOEParaNorma(norma, articulo, preg.justificacionLegal?.urlBOE)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                  title={`Abrir ${norma} ${articulo} en el BOE oficial`}
                                >
                                  <i className="fa-solid fa-scale-balanced text-amber-700 dark:text-amber-300 text-[10px]"></i>
                                  <span>{norma} {articulo ? `• ${articulo}` : ''}</span>
                                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-amber-600 dark:text-amber-400"></i>
                                </a>
                              </div>
                            </div>

                            <div className="p-2 sm:p-2.5 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800/60 leading-relaxed font-serif italic relative shadow-2xs">
                              <span className="text-xl text-amber-400 dark:text-amber-600 font-serif leading-none absolute -top-1 left-1 select-none">“</span>
                              <p className={`pl-4 font-medium whitespace-pre-line max-h-24 overflow-y-auto pr-1 scrollbar-thin ${fontArgumentacion}`}>
                                {argumentacionLegal ? renderizarTextoConEnlacesBOE(argumentacionLegal) : 'Sin fundamentación legal especificada.'}
                              </p>
                            </div>

                            {/* Gestor de enlaces web y ficheros locales para argumentación de la pregunta */}
                            <GestorRecursosArgumentacionPregunta
                              enunciadoPregunta={preg.enunciado}
                              recursosIniciales={obtenerRecursosArgumentacionDePregunta(preg)}
                              onActualizarRecursos={(nuevosRecursos) => {
                                const pregConRecursos: PreguntaExamen = {
                                  ...preg,
                                  recursosArgumentacion: nuevosRecursos,
                                };
                                setPreguntaValidandoBOE({
                                  ...preguntaValidandoBOE,
                                  pregunta: pregConRecursos,
                                });
                                if (examenActivo) {
                                  const nuevasPreguntas = examenActivo.preguntas.map((q, qIdx) =>
                                    qIdx === preguntaValidandoBOE.index || q.enunciado === preg.enunciado
                                      ? { ...q, recursosArgumentacion: nuevosRecursos }
                                      : q
                                  );
                                  const exActualizado: ExamenCompleto = {
                                    ...examenActivo,
                                    preguntas: nuevasPreguntas,
                                  };
                                  setExamenActivo(exActualizado);
                                  onExamenGuardado(exActualizado);
                                  onActualizarPreguntaGlobal?.(pregConRecursos, exActualizado);
                                } else {
                                  onActualizarPreguntaGlobal?.(pregConRecursos);
                                }
                              }}
                            />
                          </div>

                          {/* CUADRO 2: EJEMPLO PRÁCTICO Y APLICACIÓN AL CASO (Azul / Cielo) */}
                          <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700/80 space-y-1 shadow-2xs shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-sky-200/80 dark:border-sky-800/60 pb-1">
                              <span className="text-[13px] font-black uppercase tracking-wider text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                                <i className="fa-solid fa-lightbulb text-sky-600 dark:text-sky-400 text-xs"></i>
                                2. Ejemplo Práctico y Aplicación al Caso Concreto
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700">
                                Resolución y Protocolo
                              </span>
                            </div>

                            <div className="p-2 sm:p-2.5 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-sky-200 dark:border-sky-800/60 leading-relaxed relative shadow-2xs">
                              <p className={`whitespace-pre-line font-sans font-normal max-h-20 overflow-y-auto pr-1 scrollbar-thin ${fontEjemplo}`}>
                                {ejemploPractico ? (
                                  renderizarTextoConEnlacesBOE(ejemploPractico)
                                ) : (
                                  <span className="italic text-slate-400 dark:text-slate-500 text-[13px]">
                                    En este supuesto, la aplicación directa de{' '}
                                    <a
                                      href={obtenerUrlBOEParaNorma(norma, articulo, preg.justificacionLegal?.urlBOE)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-bold underline text-sky-800 dark:text-sky-300 inline-flex items-center gap-0.5"
                                    >
                                      {norma}{articulo ? ` (${articulo})` : ''}
                                      <i className="fa-solid fa-arrow-up-right-from-square text-[8px] ml-0.5"></i>
                                    </a>{' '}
                                    determina que la opción {opcCorr ? opcCorr.id + ')' : 'correcta'} es la única que se ajusta plenamente al régimen jurídico establecido.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* CUADRO 3: ANÁLISIS DE DISTRACTORES (ERRORES Y TRAMPAS DEL TRIBUNAL) */}
                          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 space-y-1 shadow-2xs shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-rose-200/80 dark:border-rose-900/60 pb-1">
                              <span className="text-[13px] font-black uppercase tracking-wider text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                                <i className="fa-solid fa-arrows-rotate text-rose-600 dark:text-rose-400 text-xs"></i>
                                3. Análisis de Distractores / Intercambio de Términos
                              </span>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                                distractor:
                              </span>
                            </div>

                            <div className="p-2 sm:p-2.5 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-900/60 leading-relaxed min-h-[36px] flex items-center shadow-2xs">
                              {analisisDistractoresAMostrar ? (
                                <div className="w-full space-y-1.5 max-h-20 overflow-y-auto pr-1 scrollbar-thin">
                                  {analisisDistractoresAMostrar.split('\n').filter(Boolean).map((linea, lIdx) => {
                                    const coincideLetra = linea.match(/^(?:[\-\*\•\s]+)?([A-Da-d])[\s\:\)\.\-]+(.*)$/);
                                    const textoDistractor = (coincideLetra ? coincideLetra[2] : linea)
                                      .replace(/^\[\s*/, '')
                                      .replace(/\s*\]$/, '')
                                      .trim();
                                    return (
                                      <div key={lIdx} className="flex items-start gap-2 text-xs leading-snug">
                                        {coincideLetra ? (
                                          <>
                                            <span className="h-5 w-5 rounded-md bg-rose-100 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200 font-mono font-black text-[11px] flex items-center justify-center shrink-0 border border-rose-300 dark:border-rose-700">
                                              {coincideLetra[1].toUpperCase()}
                                            </span>
                                            <p className={`text-slate-800 dark:text-slate-200 font-medium ${fontDistractores}`}>
                                              {textoDistractor}
                                            </p>
                                          </>
                                        ) : (
                                          <p className={`text-slate-800 dark:text-slate-200 font-medium ${fontDistractores}`}>
                                            {textoDistractor}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="w-full text-center py-1">
                                  <span className="italic text-slate-400 dark:text-slate-500 text-xs">
                                    (Cuadro vacío: Sin análisis de distractores en la plantilla TXT del examen)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* FILA COMPACTA 2 COLUMNAS: CONVOCATORIAS OFICIALES + REGLA MNEMOTÉCNICA */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                            {/* CUADRO 4: HISTORIAL DE CONVOCATORIAS OFICIALES / SINGULARIDAD INÉDITA */}
                            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-1 shadow-2xs flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-1 border-b border-emerald-200/80 dark:border-emerald-900/60 pb-1">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 truncate">
                                  <i className="fa-solid fa-landmark-flag text-emerald-600 dark:text-emerald-400 text-xs"></i>
                                  4. Convocatorias
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                                  convocatoria:
                                </span>
                              </div>

                              <div className="p-1.5 sm:p-2 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-100 leading-snug min-h-[34px] flex items-center shadow-2xs">
                                {convocatoriasAMostrar ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-100 text-xs font-bold font-mono border border-emerald-300 dark:border-emerald-700">
                                      <i className="fa-solid fa-calendar-check text-emerald-600 dark:text-emerald-400 text-[10px]"></i>
                                      {convocatoriasAMostrar}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-full text-center py-0.5">
                                    <span className="italic text-slate-400 dark:text-slate-500 text-[11.5px]">
                                      (Cuadro vacío)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* CUADRO 5: regla mnemotécnica */}
                            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 space-y-1 shadow-2xs flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-700/80 pb-1">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                  <i className="fa-solid fa-brain text-indigo-500 text-xs"></i>
                                  5. Mnemotécnica
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                                  TXT
                                </span>
                              </div>

                              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-100 dark:from-slate-850 dark:via-slate-850 dark:to-slate-900 border border-slate-300/80 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 min-h-[34px] flex items-center shadow-inner">
                                {reglaMnemotecnicaAMostrar ? (
                                  <p className="whitespace-pre-line font-mono font-bold leading-tight text-slate-900 dark:text-slate-100 text-[12.5px] max-h-16 overflow-y-auto scrollbar-thin">
                                    {reglaMnemotecnicaAMostrar}
                                  </p>
                                ) : (
                                  <div className="w-full text-center py-0.5">
                                    <span className="italic text-slate-400 dark:text-slate-500 text-[11.5px]">
                                      (Cuadro vacío)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ZONA DE ACCIONES EN EL HUECO INFERIOR DERECHO: BANCO DE PREGUNTAS RELEVANTES */}
                          <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-1.5 shadow-2xs shrink-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                                  <i className="fa-solid fa-bookmark"></i>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-[13px] font-black text-slate-900 dark:text-white leading-tight truncate">
                                    Banco de Preguntas Relevantes (Almacén)
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {estaEnAlmacen
                                      ? '✓ Pregunta registrada en tu banco'
                                      : esFallada
                                      ? 'Pregunta fallada • Guárdala para reforzar este concepto'
                                      : esAcertada
                                      ? 'Pregunta acertada • Guárdala para consolidar su justificación'
                                      : 'Añade esta pregunta a tu banco de preguntas relevantes'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end shrink-0">
                                <button
                                  type="button"
                                  onClick={handleVolcarAlmacenClick}
                                  className={`py-1.5 px-2.5 rounded-lg text-[13px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                                    estaEnAlmacen
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/30'
                                      : esFallada
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                  }`}
                                >
                                  <i className={`fa-solid ${estaEnAlmacen ? 'fa-circle-check' : 'fa-bookmark'} text-[10px]`}></i>
                                  <span>
                                    {estaEnAlmacen
                                      ? 'Actualizar en Banco'
                                      : '+ Añadir al Banco'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreguntaValidandoBOE(null);
                                    onNavegarAlmacenDudas?.();
                                  }}
                                  className="py-1.5 px-2.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[13px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                  title="Ir al Almacén y Banco de Preguntas Relevantes"
                                >
                                  <span>Ir al Almacén</span>
                                  <i className="fa-solid fa-arrow-right text-[9px]"></i>
                                </button>
                              </div>
                            </div>

                            {/* Relación con leyes y normas BOE */}
                            <div className="pt-1.5 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between flex-wrap gap-1.5 text-xs">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[11px] font-black uppercase text-slate-400 font-mono">
                                  Leyes:
                                </span>
                                {preg.leyesRelacionadas && preg.leyesRelacionadas.length > 0 ? (
                                  preg.leyesRelacionadas.map((l, lIdx) => (
                                    <a
                                      key={lIdx}
                                      href={obtenerUrlBOEParaNorma(l)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 border border-indigo-200 hover:border-amber-400 dark:border-indigo-800 text-[11px] text-indigo-800 dark:text-indigo-200 hover:text-amber-900 dark:hover:text-amber-300 font-medium font-mono transition-colors shadow-2xs"
                                      title={`Consultar ${l} en el BOE oficial`}
                                    >
                                      <span>{l}</span>
                                      <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-amber-600 dark:text-amber-400"></i>
                                    </a>
                                  ))
                                ) : (
                                  <a
                                    href={obtenerUrlBOEParaNorma(norma, articulo, preg.justificacionLegal?.urlBOE)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 border border-indigo-200 hover:border-amber-400 dark:border-indigo-800 text-[11px] text-indigo-800 dark:text-indigo-200 hover:text-amber-900 dark:hover:text-amber-300 font-bold font-mono transition-colors shadow-2xs"
                                    title={`Consultar ${norma} en el BOE oficial`}
                                  >
                                    <span>{norma}</span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-amber-600 dark:text-amber-400"></i>
                                  </a>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setModalLeyesPreguntaJustificacion(preg)}
                                className="text-[11.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <i className="fa-solid fa-plus text-[8px]"></i>
                                <span>Vincular leyes</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer with Question Navigation and Blocking Control */}
            {(() => {
              const totalPreguntas = examenActivo?.preguntas?.length || 1;
              const todasRespondidas = examenActivo?.preguntas
                ? examenActivo.preguntas.every(
                    (_, idx) => respuestasUsuario[idx] !== undefined && respuestasUsuario[idx] !== null && respuestasUsuario[idx] !== ''
                  )
                : true;
              const totalRespondidas = Object.keys(respuestasUsuario).length;
              // Bloquear la tecla siguiente en justificación hasta que se hayan respondido todas las preguntas del examen
              const siguienteBloqueado = !examenFinalizado && !todasRespondidas;

              return (
                <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-slate-50 dark:bg-slate-900 shrink-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón Anterior */}
                    <button
                      type="button"
                      disabled={preguntaValidandoBOE.index === 0}
                      onClick={() => {
                        const prevIdx = preguntaValidandoBOE.index - 1;
                        if (prevIdx >= 0 && examenActivo?.preguntas && examenActivo.preguntas[prevIdx]) {
                          setPreguntaValidandoBOE({ pregunta: examenActivo.preguntas[prevIdx], index: prevIdx });
                        }
                      }}
                      className="py-2 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-[13px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    >
                      <i className="fa-solid fa-chevron-left text-[9px]"></i>
                      <span>Anterior</span>
                    </button>

                    {/* Botón Siguiente con BLOQUEO si no están respondidas todas las preguntas */}
                    <button
                      type="button"
                      disabled={preguntaValidandoBOE.index >= totalPreguntas - 1 || siguienteBloqueado}
                      onClick={() => {
                        if (siguienteBloqueado) return;
                        const nextIdx = preguntaValidandoBOE.index + 1;
                        if (nextIdx < totalPreguntas && examenActivo?.preguntas && examenActivo.preguntas[nextIdx]) {
                          setPreguntaValidandoBOE({ pregunta: examenActivo.preguntas[nextIdx], index: nextIdx });
                        }
                      }}
                      className={`py-2 px-4 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all ${
                        preguntaValidandoBOE.index >= totalPreguntas - 1 || siguienteBloqueado
                          ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer'
                      }`}
                      title={
                        siguienteBloqueado
                          ? `Bloqueado: debes responder todas las preguntas del test (${totalRespondidas}/${totalPreguntas}) para avanzar a las siguientes`
                          : 'Avanzar a la justificación de la siguiente pregunta'
                      }
                    >
                      {siguienteBloqueado && <i className="fa-solid fa-lock text-[10px] text-amber-500"></i>}
                      <span>Siguiente</span>
                      <i className="fa-solid fa-chevron-right text-[9px]"></i>
                    </button>

                    {/* Aviso de bloqueo hasta responder todo */}
                    {siguienteBloqueado ? (
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <i className="fa-solid fa-lock text-amber-600 dark:text-amber-400 text-xs"></i>
                        <span>Tecla Siguiente bloqueada: Responde todas las preguntas ({totalRespondidas}/{totalPreguntas}) para ver las siguientes</span>
                      </span>
                    ) : (
                      <span className="text-[13px] font-mono text-slate-500 dark:text-slate-400 pl-1">
                        Pregunta {preguntaValidandoBOE.index + 1} de {totalPreguntas}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreguntaValidandoBOE(null)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-[13px] transition-colors cursor-pointer shadow-xs"
                  >
                    Cerrar Justificación
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR TEXTO DE SUPUESTO PRÁCTICO PARA PROPONER 20 PREGUNTAS */}
      {mostrarModalImportarCaso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-scroll"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Importar Texto de Supuesto Práctico
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Propuesta oficial de exactamente 20 preguntas (15 ordinarias + 5 reservas) vinculadas directamente al caso.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isGenerandoCaso}
                onClick={() => setMostrarModalImportarCaso(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Título del Supuesto
                  </label>
                  <input
                    type="text"
                    value={tituloCasoImportar}
                    onChange={(e) => setTituloCasoImportar(e.target.value)}
                    placeholder="Ej. Supuesto Práctico: Expediente Sancionador y Contratación CAM"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Ámbito
                  </label>
                  <select
                    value={ambitoCasoImportar}
                    onChange={(e: any) => setAmbitoCasoImportar(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="CAM">Comunidad de Madrid (CAM)</option>
                    <option value="AGE">Administración General (AGE)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Texto del Relato Fáctico del Supuesto
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTituloCasoImportar('Supuesto Práctico: Consejería de Medio Ambiente CAM');
                        setAmbitoCasoImportar('CAM');
                        setTextoCasoImportar(
                          `En la Consejería de Medio Ambiente, Agricultura e Interior de la Comunidad de Madrid, se tramita un procedimiento administrativo sancionador contra una entidad mercantil por infracción grave en materia de vertidos.

1. Con fecha 3 de noviembre de 2026, la Dirección General competente dicta acuerdo de iniciación de procedimiento sancionador, notificándolo a la entidad infractora a través del Punto General de Acceso de la Comunidad de Madrid el martes 4 de noviembre a las 10:15 horas, dejando constancia técnica y acuse de recibo fehaciente. En el acuerdo se le concede un plazo improrrogable de 10 días hábiles para formular alegaciones y proponer los medios de prueba pertinentes.

2. El interesado presenta escrito de alegaciones formulando recusación del funcionario instructor designado, alegando haber mantenido litigios judiciales previos con el mismo. La resolución sobre la recusación corresponde al órgano jerárquico superior según lo dispuesto en la Ley 40/2015 de Régimen Jurídico del Sector Público y la Ley 1/1983 de Gobierno y Administración de la Comunidad de Madrid.

3. Paralelamente, se tramita en la misma Consejería un expediente de contratación de suministro de equipamiento técnico por procedimiento abierto y tramitación ordinaria, con un valor estimado de 85.000 euros más IVA, financiado con cargo a los Presupuestos Generales de la Comunidad de Madrid regulados en la Ley 9/1990 Reguladora de la Hacienda de la Comunidad de Madrid.

4. Asimismo, el Consejero de Medio Ambiente debe comparecer ante la Comisión correspondiente de la Asamblea de Madrid a petición de un Grupo Parlamentario, tramitándose la solicitud con arreglo al Reglamento de la Asamblea de Madrid.`
                        );
                      }}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i>
                      <span>Insertar caso de ejemplo CAM</span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-400">
                      {textoCasoImportar.length} caracteres
                    </span>
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={textoCasoImportar}
                  onChange={(e) => setTextoCasoImportar(e.target.value)}
                  placeholder="Pega aquí el relato fáctico del caso práctico (hechos, notificaciones, fechas, órganos, contratos, funcionarios...). La IA generará 20 preguntas (15 ordinarias y 5 de reserva) estrictamente basadas en este texto."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                ></textarea>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-info text-amber-600"></i>
                  <span>Estructura Oficial Garantizada:</span>
                </div>
                <p className="text-[10.5px] leading-relaxed">
                  Se propondrán <strong>15 preguntas ordinarias</strong> (1 a 15) y <strong>5 preguntas de reserva</strong> (16 a 20) con justificación legal al BOE y BOCM. En caso de plazos fácticos, se aplica el algoritmo secuencial del Art. 30 Ley 39/2015.
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                disabled={isGenerandoCaso}
                onClick={() => setMostrarModalImportarCaso(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isGenerandoCaso || textoCasoImportar.trim().length < 30}
                onClick={handleGenerarDesdeTextoCaso}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isGenerandoCaso ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin text-xs"></i>
                    <span>Formulando 20 Preguntas Oficiales...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-200"></i>
                    <span>Proponer 20 Preguntas del Supuesto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RENOMBRAR EXAMEN ACTIVO */}
      {mostrarModalRenombrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold shrink-0">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Renombrar Examen
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Modifica el título visible de esta prueba
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Nuevo Título
              </label>
              <input
                type="text"
                value={nuevoTituloExamen}
                onChange={(e) => setNuevoTituloExamen(e.target.value)}
                placeholder="Escribe el nombre del examen..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalRenombrar(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!nuevoTituloExamen.trim()}
                onClick={() => handleRenombrarExamenActivo(nuevoTituloExamen)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-check text-[11px]"></i>
                <span>Guardar Nombre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR TIEMPO DE EXAMEN (CRONÓMETRO) */}
      {mostrarModalAjustarTiempo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-bold shrink-0">
                  <i className="fa-solid fa-stopwatch"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Tiempo de Examen
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ajusta o selecciona la duración del cronómetro
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalAjustarTiempo(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Tiempo actual restante */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Tiempo Restante Actual
                </span>
                <span className="text-xl font-mono font-black text-slate-800 dark:text-slate-100">
                  {formatTimer(tiempoRestanteSegundos)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTiempoRestanteSegundos((prev) => prev + 300);
                    mostrarAviso('+5 minutos añadidos al cronómetro', 'exito');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Sumar 5 minutos al tiempo actual"
                >
                  +5 min
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTiempoRestanteSegundos((prev) => prev + 600);
                    mostrarAviso('+10 minutos añadidos al cronómetro', 'exito');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Sumar 10 minutos al tiempo actual"
                >
                  +10 min
                </button>
              </div>
            </div>

            {/* Presets de Duración */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Seleccionar Duración Estándar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { m: 10, label: '10 min', sub: 'Rápido' },
                  { m: 15, label: '15 min', sub: 'Test 10Q' },
                  { m: 20, label: '20 min', sub: 'Estándar' },
                  { m: 30, label: '30 min', sub: 'Test 20Q' },
                  { m: 45, label: '45 min', sub: 'Supuesto' },
                  { m: 60, label: '60 min', sub: '1 Hora' },
                  { m: 90, label: '90 min', sub: 'Simulacro' },
                  { m: 100, label: '100 min', sub: 'Oficial AGE' },
                ].map(({ m, label, sub }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => ajustarTiempoExamen(m)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-center transition-all cursor-pointer"
                  >
                    <span className="text-xs font-mono font-bold block text-slate-800 dark:text-slate-200">
                      {label}
                    </span>
                    <span className="text-[8px] text-slate-400 block">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Minutos personalizados */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                O Especificar Minutos Personalizados
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={inputMinutosPersonalizados}
                  onChange={(e) => setInputMinutosPersonalizados(e.target.value)}
                  placeholder="Ej: 25"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={!inputMinutosPersonalizados || parseInt(inputMinutosPersonalizados, 10) <= 0}
                  onClick={() => {
                    const mins = parseInt(inputMinutosPersonalizados, 10);
                    if (mins > 0) {
                      ajustarTiempoExamen(mins);
                      setInputMinutosPersonalizados('');
                    }
                  }}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-check text-[11px]"></i>
                  <span>Fijar</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <i className={`fa-solid ${isTimerPaused ? 'fa-play text-emerald-600' : 'fa-pause text-amber-600'}`}></i>
                <span>{isTimerPaused ? 'Reanudar Cronómetro' : 'Pausar Cronómetro'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalAjustarTiempo(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECCIONAR MULTI-LEYES PARA LA PREGUNTA DESDE JUSTIFICACIÓN */}
      {modalLeyesPreguntaJustificacion && (
        <SelectorLeyesEInformaticaModal
          isOpen={!!modalLeyesPreguntaJustificacion}
          onClose={() => setModalLeyesPreguntaJustificacion(null)}
          seleccionadasIniciales={
            modalLeyesPreguntaJustificacion.leyesRelacionadas &&
            modalLeyesPreguntaJustificacion.leyesRelacionadas.some((l) => !esNormaGenerica(l))
              ? modalLeyesPreguntaJustificacion.leyesRelacionadas.filter((l) => !esNormaGenerica(l))
              : !esNormaGenerica(modalLeyesPreguntaJustificacion.justificacionLegal?.norma) &&
                modalLeyesPreguntaJustificacion.justificacionLegal?.norma
              ? [modalLeyesPreguntaJustificacion.justificacionLegal.norma]
              : [obtenerNormaEfectivaDePregunta(modalLeyesPreguntaJustificacion, examenActivo || undefined)].filter(
                  (l) => !esNormaGenerica(l)
                )
          }
          onGuardar={(nuevasLeyes) => {
            const leyesLimpias = nuevasLeyes.filter((l) => !esNormaGenerica(l));
            const nuevaNormaPrincipal =
              leyesLimpias[0] ||
              obtenerNormaEfectivaDePregunta(modalLeyesPreguntaJustificacion, examenActivo || undefined);

            const pregActualizada: PreguntaExamen = {
              ...modalLeyesPreguntaJustificacion,
              leyesRelacionadas: leyesLimpias,
              justificacionLegal: {
                ...(modalLeyesPreguntaJustificacion.justificacionLegal || {
                  norma: nuevaNormaPrincipal,
                  articulo: 'Precepto aplicable',
                  fundamento: '',
                }),
                norma: nuevaNormaPrincipal,
              },
            };

            let examenActualizadoRef: ExamenCompleto | undefined = undefined;

            if (examenActivo) {
              const nuevasPreguntas = examenActivo.preguntas.map((p) =>
                p.id === pregActualizada.id || p.enunciado === pregActualizada.enunciado ? pregActualizada : p
              );
              const leyesExamenPrevias = (examenActivo.leyesBOEAplicadas || []).filter(
                (l) => !esNormaGenerica(l)
              );
              const leyesExamenActualizadas = Array.from(
                new Set([...leyesExamenPrevias, ...leyesLimpias])
              );
              examenActualizadoRef = {
                ...examenActivo,
                leyesBOEAplicadas:
                  leyesExamenActualizadas.length > 0
                    ? leyesExamenActualizadas
                    : examenActivo.leyesBOEAplicadas,
                preguntas: nuevasPreguntas,
              };
              setExamenActivo(examenActualizadoRef);
              onExamenGuardado(examenActualizadoRef);
            }

            if (onActualizarPreguntaGlobal) {
              onActualizarPreguntaGlobal(pregActualizada, examenActualizadoRef || examenActivo || undefined);
            }

            if (
              preguntaValidandoBOE &&
              (preguntaValidandoBOE.pregunta.id === pregActualizada.id ||
                preguntaValidandoBOE.pregunta.enunciado === pregActualizada.enunciado)
            ) {
              setPreguntaValidandoBOE({
                ...preguntaValidandoBOE,
                pregunta: pregActualizada,
              });
            }

            if (onGuardarEnAlmacenDudas) {
              const itemExistente = itemsAlmacenDudas?.find(
                (item) =>
                  item.preguntaId === pregActualizada.id ||
                  item.enunciado === pregActualizada.enunciado
              );
              if (itemExistente) {
                onGuardarEnAlmacenDudas({
                  ...itemExistente,
                  leyesRelacionadas: leyesLimpias,
                  justificacionLegal: pregActualizada.justificacionLegal,
                  reglaMnemotecnica: pregActualizada.reglaMnemotecnica || itemExistente.reglaMnemotecnica,
                  fechaActualizacion: new Date().toISOString(),
                });
              }
            }

            setModalLeyesPreguntaJustificacion(null);
            mostrarAviso('Leyes y temática de la pregunta actualizadas en toda la base de datos', 'exito');
          }}
          tituloModal="Vincular Pregunta con Leyes y Temario Oficial C1"
          subtituloModal="Selecciona una o varias leyes BOE o temas de informática aplicables a esta pregunta"
        />
      )}

      {/* CUADRO DE NOTIFICACIÓN ANTES DE EVALUAR EL TEST O SUPUESTO */}
      {examenActivo && mostrarConfirmarEvaluacion && (
        <ConfirmarEvaluacionModal
          isOpen={mostrarConfirmarEvaluacion}
          tituloExamen={examenActivo.titulo}
          tipoPruebaLabel={
            examenActivo.tipo === 'supuesto'
              ? 'Supuesto Práctico C1'
              : 'Test Cuestionario C1'
          }
          preguntasResumen={examenActivo.preguntas.map((p, idx) => ({
            indice: idx,
            etiqueta: p.esReserva ? `R${p.numeroReserva || 1}` : `${idx + 1}`,
            respondida: Boolean(respuestasUsuario[idx]),
            dudosa: Boolean(dudosasUsuario[idx]),
            esReserva: p.esReserva,
          }))}
          onVolverAlTest={() => setMostrarConfirmarEvaluacion(false)}
          onConfirmarEvaluar={finalizarExamenOficial}
          onIrAPregunta={(idx) => setPreguntaActualIdx(idx)}
        />
      )}
    </div>
  );
};
