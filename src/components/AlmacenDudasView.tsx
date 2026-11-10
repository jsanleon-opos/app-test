import React, { useState, useMemo } from 'react';
import {
  ItemAlmacenDuda,
  TipoItemAlmacen,
  SubtipoInformatica,
  PreguntaExamen,
  OpcionPregunta,
} from '../types';
import { SelectorLeyesEInformaticaModal } from './SelectorLeyesEInformaticaModal';
import { GestorRecursosArgumentacionPregunta } from './GestorRecursosArgumentacionPregunta';
import {
  obtenerRecursosArgumentacionDePregunta,
} from '../utils/jsonExamHelper';
import { obtenerUrlBOEParaNorma, renderizarTextoConEnlacesBOE } from '../utils/boeUrlHelper';
import {
  esNormaGenerica,
  formatearBadgeConvocatoriaOficial,
  limpiarTextoConvocatoria,
  normalizarEtiquetaLeyONorma,
  obtenerNormaEfectivaDePregunta,
  obtenerReferenciaConvocatoriaOficial,
} from '../utils/tematicaClassifier';

interface AlmacenDudasViewProps {
  itemsDudas: ItemAlmacenDuda[];
  onActualizarItems: (items: ItemAlmacenDuda[]) => void;
  onVerJustificacionPregunta?: (pregunta: PreguntaExamen) => void;
  onNavegarATab?: (tab: string) => void;
  onActualizarPreguntaGlobal?: (preguntaActualizada: PreguntaExamen) => void;
}

type TipoNotaCreable = 'articulo_clave' | 'plazo_computo' | 'atajo_mnemotecnia' | 'informatica';

export const AlmacenDudasView: React.FC<AlmacenDudasViewProps> = ({
  itemsDudas,
  onActualizarItems,
  onVerJustificacionPregunta,
  onNavegarATab,
  onActualizarPreguntaGlobal,
}) => {
  // Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<
    'todos' | TipoItemAlmacen | 'preguntas_falladas' | 'preguntas_acertadas' | 'pendientes' | 'resueltas' | 'informatica'
  >('todos');
  const [filtroSubtipoInfo, setFiltroSubtipoInfo] = useState<'todos' | SubtipoInformatica>('todos');
  const [filtroLey, setFiltroLey] = useState<'todas' | string>('todas');
  const [orden, setOrden] = useState<'recientes' | 'antiguas' | 'alfabetico'>('recientes');
  const [copiadoFeedback, setCopiadoFeedback] = useState<string | null>(null);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const REGISTROS_POR_PAGINA = 8;

  // Estados de Modales y Visualización
  // 1. Modal de Justificación Oficial para preguntas
  const [preguntaParaJustificacion, setPreguntaParaJustificacion] = useState<ItemAlmacenDuda | null>(null);

  // 2. Modal de Detalle / Ficha para notas (Artículos, Plazos, Mnemotecnia)
  const [notaParaDetalle, setNotaParaDetalle] = useState<ItemAlmacenDuda | null>(null);

  // 3. Modal Dedicado para Informática & Ofimática (Word 365, Outlook, Teams, Power BI, Excel, Access, Atajos, Redes)
  const [fichaInformaticaParaDetalle, setFichaInformaticaParaDetalle] = useState<ItemAlmacenDuda | null>(null);

  // 4. Modal de Añadir / Editar Nota
  const [mostrarModalAnadir, setMostrarModalAnadir] = useState(false);
  const [itemEnEdicion, setItemEnEdicion] = useState<ItemAlmacenDuda | null>(null);
  const [tipoNotaSeleccionado, setTipoNotaSeleccionado] = useState<TipoNotaCreable>('articulo_clave');

  // Campos específicos para "Artículos clave"
  const [artLey, setArtLey] = useState('');
  const [artNumero, setArtNumero] = useState('');
  const [artTitulo, setArtTitulo] = useState('');
  const [artLiteral, setArtLiteral] = useState('');
  const [artResumen, setArtResumen] = useState('');

  // Campos específicos para "Plazos y cómputos"
  const [plazoConcepto, setPlazoConcepto] = useState('');
  const [plazoDuracion, setPlazoDuracion] = useState('');
  const [plazoTipoDias, setPlazoTipoDias] = useState<'habiles' | 'naturales' | 'meses' | 'anos' | 'otro'>('habiles');
  const [plazoInicio, setPlazoInicio] = useState('');
  const [plazoFin, setPlazoFin] = useState('');
  const [plazoReglaEspecial, setPlazoReglaEspecial] = useState('');
  const [plazoLey, setPlazoLey] = useState('');

  // Campos específicos para "Atajos y reglas mnemotécnicas"
  const [mnemoConcepto, setMnemoConcepto] = useState('');
  const [mnemoRegla, setMnemoRegla] = useState('');
  const [mnemoExplicacion, setMnemoExplicacion] = useState('');
  const [mnemoLey, setMnemoLey] = useState('');

  // Campos específicos para "Informática & Ofimática" (Word 365, Outlook, Teams, Power BI, Excel, Access...)
  const [infoSubtipo, setInfoSubtipo] = useState<SubtipoInformatica>('word_365');
  const [infoSoftware, setInfoSoftware] = useState('Microsoft Word 365');
  const [infoAtajoOFuncion, setInfoAtajoOFuncion] = useState('');
  const [infoSintaxisOEjemplo, setInfoSintaxisOEjemplo] = useState('');
  const [infoExplicacion, setInfoExplicacion] = useState('');
  const [infoTemaBloque, setInfoTemaBloque] = useState('Bloque V - Procesador de Textos Word 365');

  // Selector multiley
  const [leyesAsociadasModal, setLeyesAsociadasModal] = useState<string[]>([]);
  const [mostrarSelectorLeyes, setMostrarSelectorLeyes] = useState(false);
  const [itemParaSelectorLeyesDirecto, setItemParaSelectorLeyesDirecto] = useState<ItemAlmacenDuda | null>(null);

  // Lista de leyes únicas presentes en el almacén (excluyendo etiquetas genéricas)
  const todasLasLeyesUnicas = useMemo(() => {
    const s = new Set<string>();
    itemsDudas.forEach((item) => {
      (item.leyesRelacionadas || []).forEach((l) => {
        if (l && l.trim() && !esNormaGenerica(l)) s.add(l.trim());
      });
      if (item.justificacionLegal?.norma && !esNormaGenerica(item.justificacionLegal.norma)) {
        s.add(item.justificacionLegal.norma.trim());
      } else if (item.opciones && item.opciones.length > 0) {
        const deducida = obtenerNormaEfectivaDePregunta(item);
        if (deducida && !esNormaGenerica(deducida)) s.add(deducida);
      }
      if (item.articuloClave?.ley && !esNormaGenerica(item.articuloClave.ley)) s.add(item.articuloClave.ley.trim());
      if (item.plazoComputo?.ley && !esNormaGenerica(item.plazoComputo.ley)) s.add(item.plazoComputo.ley.trim());
      if (item.atajoMnemotecnia?.ley && !esNormaGenerica(item.atajoMnemotecnia.ley)) s.add(item.atajoMnemotecnia.ley.trim());
      if (item.fichaInformatica?.softwareOModulo && !esNormaGenerica(item.fichaInformatica.softwareOModulo)) {
        s.add(item.fichaInformatica.softwareOModulo.trim());
      }
    });
    return Array.from(s).sort();
  }, [itemsDudas]);

  // Lista de preguntas en almacén para navegación en el modal
  const preguntasDelAlmacen = useMemo(() => {
    return itemsDudas.filter(
      (i) => i.tipo === 'pregunta_relevante' || i.tipo === 'fallada' || i.tipo === 'duda' || (i.opciones && i.opciones.length > 0)
    );
  }, [itemsDudas]);

  // Conteos estadísticos de la nueva estructura
  const stats = useMemo(() => {
    const total = itemsDudas.length;

    // Preguntas Relevantes (incluye legacy 'duda' / 'fallada')
    const preguntas = preguntasDelAlmacen;
    const preguntasFalladas = preguntas.filter(
      (i) => i.esFallada || i.tipo === 'fallada' || (i.respuestaUsuario && i.respuestaUsuario !== i.respuestaCorrecta)
    ).length;
    const preguntasAcertadas = preguntas.length - preguntasFalladas;

    // Tipos de notas de estudio
    const articulosClave = itemsDudas.filter((i) => i.tipo === 'articulo_clave').length;
    const plazos = itemsDudas.filter((i) => i.tipo === 'plazo_computo').length;
    const mnemotecnia = itemsDudas.filter(
      (i) => i.tipo === 'atajo_mnemotecnia' || (i.tipo === 'comentario' && i.reglaMnemotecnica)
    ).length;
    const informatica = itemsDudas.filter((i) => i.tipo === 'informatica').length;
    const infoWord = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'word_365'
    ).length;
    const infoExcel = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'funcion_excel'
    ).length;
    const infoAccess = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'base_datos_access'
    ).length;
    const infoOutlook = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'outlook'
    ).length;
    const infoTeams = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'teams'
    ).length;
    const infoPowerBI = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'power_bi'
    ).length;
    const infoAtajos = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'atajo_teclado'
    ).length;
    const infoRedes = itemsDudas.filter(
      (i) => i.tipo === 'informatica' && i.fichaInformatica?.subtipo === 'definicion_redes'
    ).length;

    const resueltas = itemsDudas.filter((i) => i.resuelta).length;
    const pendientes = total - resueltas;

    return {
      total,
      preguntasTotal: preguntas.length,
      preguntasFalladas,
      preguntasAcertadas,
      articulosClave,
      plazos,
      mnemotecnia,
      informatica,
      infoWord,
      infoExcel,
      infoAccess,
      infoOutlook,
      infoTeams,
      infoPowerBI,
      infoAtajos,
      infoRedes,
      resueltas,
      pendientes,
    };
  }, [itemsDudas]);

  // Filtrado y ordenación
  const itemsFiltrados = useMemo(() => {
    let res = [...itemsDudas];

    // Búsqueda textual
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter((i) => {
        const enun = (i.enunciado || '').toLowerCase();
        const tit = (i.titulo || '').toLowerCase();
        const com = (i.comentarioUsuario || '').toLowerCase();
        const reg = (i.reglaMnemotecnica || '').toLowerCase();
        const art = i.articuloClave
          ? `${i.articuloClave.ley} ${i.articuloClave.articulo} ${i.articuloClave.literalArticulo} ${i.articuloClave.resumenOClave}`.toLowerCase()
          : '';
        const pl = i.plazoComputo
          ? `${i.plazoComputo.concepto} ${i.plazoComputo.plazo} ${i.plazoComputo.inicioComputo || ''} ${i.plazoComputo.finComputo || ''} ${i.plazoComputo.ley || ''}`.toLowerCase()
          : '';
        const mn = i.atajoMnemotecnia
          ? `${i.atajoMnemotecnia.concepto} ${i.atajoMnemotecnia.reglaOFormula} ${i.atajoMnemotecnia.explicacionTruco}`.toLowerCase()
          : '';
        const inf = i.fichaInformatica
          ? `${i.fichaInformatica.softwareOModulo} ${i.fichaInformatica.atajoOFuncion} ${i.fichaInformatica.sintaxisOEjemplo || ''} ${i.fichaInformatica.explicacion} ${i.fichaInformatica.temaBloque || ''} ${i.fichaInformatica.subtipo || ''}`.toLowerCase()
          : '';
        const leyes = (i.leyesRelacionadas || []).join(' ').toLowerCase();

        return (
          enun.includes(q) ||
          tit.includes(q) ||
          com.includes(q) ||
          reg.includes(q) ||
          art.includes(q) ||
          pl.includes(q) ||
          mn.includes(q) ||
          inf.includes(q) ||
          leyes.includes(q)
        );
      });
    }

    // Filtro por tipo
    if (filtroTipo === 'pregunta_relevante') {
      res = res.filter(
        (i) => i.tipo === 'pregunta_relevante' || i.tipo === 'fallada' || i.tipo === 'duda' || !!i.opciones
      );
    } else if (filtroTipo === 'preguntas_falladas') {
      res = res.filter(
        (i) =>
          (i.tipo === 'pregunta_relevante' || i.tipo === 'fallada' || i.tipo === 'duda') &&
          (i.esFallada || i.tipo === 'fallada' || (i.respuestaUsuario && i.respuestaUsuario !== i.respuestaCorrecta))
      );
    } else if (filtroTipo === 'preguntas_acertadas') {
      res = res.filter(
        (i) =>
          (i.tipo === 'pregunta_relevante' || i.tipo === 'duda' || !!i.opciones) &&
          !i.esFallada
      );
    } else if (filtroTipo === 'articulo_clave') {
      res = res.filter((i) => i.tipo === 'articulo_clave');
    } else if (filtroTipo === 'plazo_computo') {
      res = res.filter((i) => i.tipo === 'plazo_computo');
    } else if (filtroTipo === 'atajo_mnemotecnia') {
      res = res.filter((i) => i.tipo === 'atajo_mnemotecnia');
    } else if (filtroTipo === 'informatica') {
      res = res.filter((i) => {
        if (i.tipo !== 'informatica') return false;
        if (filtroSubtipoInfo !== 'todos') {
          return i.fichaInformatica?.subtipo === filtroSubtipoInfo;
        }
        return true;
      });
    } else if (filtroTipo === 'pendientes') {
      res = res.filter((i) => !i.resuelta);
    } else if (filtroTipo === 'resueltas') {
      res = res.filter((i) => !!i.resuelta);
    }

    // Filtro por Ley
    if (filtroLey !== 'todas') {
      const filtroNorm = normalizarEtiquetaLeyONorma(filtroLey);
      res = res.filter((i) => {
        const normaEf = obtenerNormaEfectivaDePregunta(i);
        return (
          (i.leyesRelacionadas &&
            i.leyesRelacionadas.some(
              (l) => l === filtroLey || normalizarEtiquetaLeyONorma(l) === filtroNorm
            )) ||
          (i.justificacionLegal?.norma &&
            (i.justificacionLegal.norma === filtroLey ||
              normalizarEtiquetaLeyONorma(i.justificacionLegal.norma) === filtroNorm)) ||
          normaEf === filtroLey ||
          normalizarEtiquetaLeyONorma(normaEf) === filtroNorm ||
          (i.articuloClave?.ley &&
            (i.articuloClave.ley === filtroLey ||
              normalizarEtiquetaLeyONorma(i.articuloClave.ley) === filtroNorm)) ||
          (i.plazoComputo?.ley &&
            (i.plazoComputo.ley === filtroLey ||
              normalizarEtiquetaLeyONorma(i.plazoComputo.ley) === filtroNorm)) ||
          (i.atajoMnemotecnia?.ley &&
            (i.atajoMnemotecnia.ley === filtroLey ||
              normalizarEtiquetaLeyONorma(i.atajoMnemotecnia.ley) === filtroNorm)) ||
          (i.fichaInformatica?.softwareOModulo &&
            (i.fichaInformatica.softwareOModulo === filtroLey ||
              normalizarEtiquetaLeyONorma(i.fichaInformatica.softwareOModulo) === filtroNorm))
        );
      });
    }

    // Orden
    res.sort((a, b) => {
      if (orden === 'recientes') {
        return new Date(b.fechaCreacion || 0).getTime() - new Date(a.fechaCreacion || 0).getTime();
      }
      if (orden === 'antiguas') {
        return new Date(a.fechaCreacion || 0).getTime() - new Date(b.fechaCreacion || 0).getTime();
      }
      const nombreA = a.titulo || a.enunciado || '';
      const nombreB = b.titulo || b.enunciado || '';
      return nombreA.localeCompare(nombreB);
    });

    return res;
  }, [itemsDudas, busqueda, filtroTipo, filtroLey, orden]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroTipo, filtroLey, orden]);

  const totalPaginas = Math.max(1, Math.ceil(itemsFiltrados.length / REGISTROS_POR_PAGINA));
  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    return itemsFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [itemsFiltrados, paginaActual]);

  // Manejador de doble clic para abrir elemento (Pregunta o Nota)
  const handleElementoDobleClick = (item: ItemAlmacenDuda) => {
    const esPregunta =
      item.tipo === 'pregunta_relevante' ||
      item.tipo === 'fallada' ||
      item.tipo === 'duda' ||
      (item.opciones && item.opciones.length > 0);

    if (esPregunta) {
      setPreguntaParaJustificacion(item);
    } else if (item.tipo === 'informatica') {
      setFichaInformaticaParaDetalle(item);
    } else {
      setNotaParaDetalle(item);
    }
  };

  // Apertura del modal Añadir limpio con soporte para subtipo de informática específico
  const handleAbrirModalAnadir = (
    tipoPorDefecto: TipoNotaCreable = 'articulo_clave',
    subtipoInfoPorDefecto?: SubtipoInformatica
  ) => {
    setItemEnEdicion(null);
    setTipoNotaSeleccionado(tipoPorDefecto);
    // Limpiar campos
    setArtLey('');
    setArtNumero('');
    setArtTitulo('');
    setArtLiteral('');
    setArtResumen('');

    setPlazoConcepto('');
    setPlazoDuracion('');
    setPlazoTipoDias('habiles');
    setPlazoInicio('Día siguiente a la notificación o publicación');
    setPlazoFin('Mismo día del mes siguiente (si es inhábil se traslada al primer día hábil)');
    setPlazoReglaEspecial('');
    setPlazoLey('');

    setMnemoConcepto('');
    setMnemoRegla('');
    setMnemoExplicacion('');
    setMnemoLey('');

    const st = subtipoInfoPorDefecto || (tipoPorDefecto === 'informatica' ? 'word_365' : 'word_365');
    setInfoSubtipo(st);
    if (st === 'word_365') {
      setInfoSoftware('Microsoft Word 365');
      setInfoTemaBloque('Bloque V - Procesador de Textos Word 365');
    } else if (st === 'outlook') {
      setInfoSoftware('Microsoft Outlook');
      setInfoTemaBloque('Bloque V - Correo y Agenda Outlook');
    } else if (st === 'teams') {
      setInfoSoftware('Microsoft Teams');
      setInfoTemaBloque('Bloque V - Colaboración Microsoft Teams');
    } else if (st === 'power_bi') {
      setInfoSoftware('Microsoft Power BI');
      setInfoTemaBloque('Bloque V - Analítica Power BI & DAX');
    } else if (st === 'funcion_excel') {
      setInfoSoftware('Microsoft Excel');
      setInfoTemaBloque('Bloque V - Hoja de cálculo Excel');
    } else if (st === 'base_datos_access') {
      setInfoSoftware('Microsoft Access');
      setInfoTemaBloque('Bloque V - BBDD Relacionales Access');
    } else if (st === 'definicion_redes') {
      setInfoSoftware('Redes / Internet / Seguridad');
      setInfoTemaBloque('Bloque V - Redes y Seguridad');
    } else {
      setInfoSoftware('Windows 11 / Atajos');
      setInfoTemaBloque('Bloque V - Atajos de teclado');
    }
    setInfoAtajoOFuncion('');
    setInfoSintaxisOEjemplo('');
    setInfoExplicacion('');

    setLeyesAsociadasModal([]);
    setMostrarModalAnadir(true);
  };

  // Apertura de edición de una nota existente
  const handleAbrirEdicion = (item: ItemAlmacenDuda) => {
    setItemEnEdicion(item);
    setLeyesAsociadasModal(item.leyesRelacionadas || []);

    if (item.tipo === 'articulo_clave') {
      setTipoNotaSeleccionado('articulo_clave');
      setArtLey(item.articuloClave?.ley || item.leyesRelacionadas?.[0] || '');
      setArtNumero(item.articuloClave?.articulo || '');
      setArtTitulo(item.titulo || item.enunciado || '');
      setArtLiteral(item.articuloClave?.literalArticulo || '');
      setArtResumen(item.articuloClave?.resumenOClave || item.comentarioUsuario || '');
    } else if (item.tipo === 'plazo_computo') {
      setTipoNotaSeleccionado('plazo_computo');
      setPlazoConcepto(item.titulo || item.enunciado || item.plazoComputo?.concepto || '');
      setPlazoDuracion(item.plazoComputo?.plazo || '');
      setPlazoTipoDias(item.plazoComputo?.tipoDias || 'habiles');
      setPlazoInicio(item.plazoComputo?.inicioComputo || '');
      setPlazoFin(item.plazoComputo?.finComputo || '');
      setPlazoReglaEspecial(item.plazoComputo?.reglaEspecial || item.comentarioUsuario || '');
      setPlazoLey(item.plazoComputo?.ley || item.leyesRelacionadas?.[0] || '');
    } else if (item.tipo === 'atajo_mnemotecnia') {
      setTipoNotaSeleccionado('atajo_mnemotecnia');
      setMnemoConcepto(item.titulo || item.enunciado || item.atajoMnemotecnia?.concepto || '');
      setMnemoRegla(item.reglaMnemotecnica || item.atajoMnemotecnia?.reglaOFormula || '');
      setMnemoExplicacion(item.atajoMnemotecnia?.explicacionTruco || item.comentarioUsuario || '');
      setMnemoLey(item.atajoMnemotecnia?.ley || item.leyesRelacionadas?.[0] || '');
    } else if (item.tipo === 'informatica') {
      setTipoNotaSeleccionado('informatica');
      setInfoSubtipo(item.fichaInformatica?.subtipo || 'word_365');
      setInfoSoftware(item.fichaInformatica?.softwareOModulo || 'Microsoft Word 365');
      setInfoAtajoOFuncion(item.fichaInformatica?.atajoOFuncion || item.titulo || '');
      setInfoSintaxisOEjemplo(item.fichaInformatica?.sintaxisOEjemplo || '');
      setInfoExplicacion(item.fichaInformatica?.explicacion || item.comentarioUsuario || '');
      setInfoTemaBloque(item.fichaInformatica?.temaBloque || 'Bloque V - Ofimática');
    } else {
      // Pregunta o nota genérica
      setTipoNotaSeleccionado('articulo_clave');
      setArtTitulo(item.titulo || item.enunciado);
      setArtResumen(item.comentarioUsuario || '');
      setArtLiteral(item.justificacionLegal?.fundamento || '');
    }

    setMostrarModalAnadir(true);
  };

  // Guardar creación o edición
  const handleGuardarNota = () => {
    let nuevoItem: ItemAlmacenDuda;
    const fechaActual = new Date().toISOString();

    if (tipoNotaSeleccionado === 'articulo_clave') {
      if (!artNumero.trim() && !artTitulo.trim()) return;
      const tituloFinal = artTitulo.trim() || `${artLey ? artLey + ' - ' : ''}${artNumero}`.trim();
      nuevoItem = {
        id: itemEnEdicion ? itemEnEdicion.id : `art-${Date.now()}`,
        tipo: 'articulo_clave',
        titulo: tituloFinal,
        enunciado: `${artNumero ? artNumero + ': ' : ''}${tituloFinal}`,
        comentarioUsuario: artResumen.trim() || undefined,
        articuloClave: {
          ley: artLey.trim(),
          articulo: artNumero.trim(),
          literalArticulo: artLiteral.trim(),
          resumenOClave: artResumen.trim(),
        },
        leyesRelacionadas:
          leyesAsociadasModal.length > 0 ? leyesAsociadasModal : artLey.trim() ? [artLey.trim()] : [],
        fechaCreacion: itemEnEdicion ? itemEnEdicion.fechaCreacion : fechaActual,
        fechaActualizacion: fechaActual,
        origen: 'manual',
        resuelta: itemEnEdicion ? itemEnEdicion.resuelta : false,
      };
    } else if (tipoNotaSeleccionado === 'plazo_computo') {
      if (!plazoConcepto.trim() && !plazoDuracion.trim()) return;
      const tituloFinal = plazoConcepto.trim() || `Plazo: ${plazoDuracion}`;
      nuevoItem = {
        id: itemEnEdicion ? itemEnEdicion.id : `plazo-${Date.now()}`,
        tipo: 'plazo_computo',
        titulo: tituloFinal,
        enunciado: `${tituloFinal} • ${plazoDuracion}`,
        comentarioUsuario: plazoReglaEspecial.trim() || undefined,
        plazoComputo: {
          concepto: tituloFinal,
          plazo: plazoDuracion.trim(),
          tipoDias: plazoTipoDias,
          inicioComputo: plazoInicio.trim(),
          finComputo: plazoFin.trim(),
          reglaEspecial: plazoReglaEspecial.trim(),
          ley: plazoLey.trim(),
        },
        leyesRelacionadas:
          leyesAsociadasModal.length > 0 ? leyesAsociadasModal : plazoLey.trim() ? [plazoLey.trim()] : [],
        fechaCreacion: itemEnEdicion ? itemEnEdicion.fechaCreacion : fechaActual,
        fechaActualizacion: fechaActual,
        origen: 'manual',
        resuelta: itemEnEdicion ? itemEnEdicion.resuelta : false,
      };
    } else if (tipoNotaSeleccionado === 'informatica') {
      if (!infoAtajoOFuncion.trim()) return;
      const tituloFinal = infoAtajoOFuncion.trim();
      nuevoItem = {
        id: itemEnEdicion ? itemEnEdicion.id : `info-${Date.now()}`,
        tipo: 'informatica',
        titulo: tituloFinal,
        enunciado: `${infoSoftware ? `[${infoSoftware}] ` : ''}${tituloFinal}`,
        comentarioUsuario: infoExplicacion.trim() || undefined,
        fichaInformatica: {
          subtipo: infoSubtipo,
          softwareOModulo: infoSoftware.trim() || 'Ofimática / Informática',
          atajoOFuncion: infoAtajoOFuncion.trim(),
          sintaxisOEjemplo: infoSintaxisOEjemplo.trim() || undefined,
          explicacion: infoExplicacion.trim(),
          temaBloque: infoTemaBloque.trim() || 'Bloque V - Informática',
        },
        leyesRelacionadas:
          leyesAsociadasModal.length > 0
            ? leyesAsociadasModal
            : infoSoftware.trim()
            ? [infoSoftware.trim()]
            : ['Informática C1'],
        fechaCreacion: itemEnEdicion ? itemEnEdicion.fechaCreacion : fechaActual,
        fechaActualizacion: fechaActual,
        origen: 'manual',
        resuelta: itemEnEdicion ? itemEnEdicion.resuelta : false,
      };
    } else {
      // atajo_mnemotecnia
      if (!mnemoConcepto.trim() && !mnemoRegla.trim()) return;
      const tituloFinal = mnemoConcepto.trim() || 'Regla mnemotécnica';
      nuevoItem = {
        id: itemEnEdicion ? itemEnEdicion.id : `mnemo-${Date.now()}`,
        tipo: 'atajo_mnemotecnia',
        titulo: tituloFinal,
        enunciado: tituloFinal,
        reglaMnemotecnica: mnemoRegla.trim(),
        comentarioUsuario: mnemoExplicacion.trim() || undefined,
        atajoMnemotecnia: {
          concepto: tituloFinal,
          reglaOFormula: mnemoRegla.trim(),
          explicacionTruco: mnemoExplicacion.trim(),
          ley: mnemoLey.trim(),
        },
        leyesRelacionadas:
          leyesAsociadasModal.length > 0 ? leyesAsociadasModal : mnemoLey.trim() ? [mnemoLey.trim()] : [],
        fechaCreacion: itemEnEdicion ? itemEnEdicion.fechaCreacion : fechaActual,
        fechaActualizacion: fechaActual,
        origen: 'manual',
        resuelta: itemEnEdicion ? itemEnEdicion.resuelta : false,
      };
    }

    let updated: ItemAlmacenDuda[];
    if (itemEnEdicion) {
      updated = itemsDudas.map((it) => (it.id === itemEnEdicion.id ? nuevoItem : it));
    } else {
      updated = [nuevoItem, ...itemsDudas];
    }

    onActualizarItems(updated);
    setMostrarModalAnadir(false);
    setItemEnEdicion(null);
  };

  const handleToggleResuelta = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = itemsDudas.map((item) =>
      item.id === id ? { ...item, resuelta: !item.resuelta, fechaActualizacion: new Date().toISOString() } : item
    );
    onActualizarItems(updated);
  };

  const handleEliminarItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas eliminar este registro del almacén?')) {
      const updated = itemsDudas.filter((i) => i.id !== id);
      onActualizarItems(updated);
    }
  };

  // Render paginador superior o inferior sin barras de scroll
  const renderPaginacion = (posicion: 'superior' | 'inferior') => {
    if (itemsFiltrados.length === 0) return null;
    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 ${
          posicion === 'superior'
            ? 'pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800'
            : 'pt-3 border-t border-slate-100 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Mostrando <strong className="text-slate-800 dark:text-slate-200">{(paginaActual - 1) * REGISTROS_POR_PAGINA + 1}</strong> -{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {Math.min(paginaActual * REGISTROS_POR_PAGINA, itemsFiltrados.length)}
            </strong>{' '}
            de <strong className="text-indigo-600 dark:text-indigo-400">{itemsFiltrados.length}</strong> registros
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="font-mono text-[11px] text-slate-500">
            Página <strong className="text-slate-800 dark:text-slate-200">{paginaActual}</strong> de {totalPaginas}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
            disabled={paginaActual <= 1}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página anterior"
          >
            <i className="fa-solid fa-chevron-up text-[10px] text-indigo-600 dark:text-indigo-400"></i>
            <span>▲ Pág. Arriba</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
              .map((p, idx, arr) => {
                const prevP = arr[idx - 1];
                const separator = prevP && p - prevP > 1 ? (
                  <span key={`sep-dudas-${posicion}-${p}`} className="px-1 text-slate-400 font-mono">
                    ...
                  </span>
                ) : null;
                return (
                  <React.Fragment key={p}>
                    {separator}
                    <button
                      type="button"
                      onClick={() => setPaginaActual(p)}
                      className={`h-7 w-7 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                        paginaActual === p
                          ? 'bg-indigo-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            type="button"
            onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
            disabled={paginaActual >= totalPaginas}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Página siguiente"
          >
            <span>▼ Pág. Abajo</span>
            <i className="fa-solid fa-chevron-down text-[10px] text-indigo-600 dark:text-indigo-400"></i>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-5 py-4 space-y-5">
      {/* CABECERA PRINCIPAL Y CUADROS SUPERIORES CON DOBLE CLIC PARA FILTRAR */}
      <div className="bg-indigo-50/75 dark:bg-slate-850 border-2 border-indigo-300 dark:border-indigo-700/80 rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xl shadow-sm ring-4 ring-indigo-500/10 shrink-0">
              <i className="fa-solid fa-box-archive"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Almacén de Estudio & Banco de Preguntas Relevantes
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-black">
                  {stats.total} elementos
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono">
                  {stats.pendientes} pendientes
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Repositorio clasificado de <strong>Artículos clave</strong>, <strong>Plazos y cómputos</strong>,{' '}
                <strong>Atajos y reglas mnemotécnicas</strong> y <strong>Preguntas relevantes</strong> (falladas y de consolidación)
                para dominar el temario de C1 y normativas del BOE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => handleAbrirModalAnadir('articulo_clave')}
              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Añadir nueva ficha de estudio: Artículo clave, Plazo o Regla mnemotécnica"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>+ Añadir</span>
            </button>
          </div>
        </div>

        {/* CUADROS SUPERIORES ACTUALES CON NUEVA INFORMACIÓN Y DOBLE CLIC PARA FILTRAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Cuadro 1: Total Guardados */}
          <div
            onClick={() => setFiltroTipo('todos')}
            onDoubleClick={() => setFiltroTipo('todos')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none relative group shadow-xs hover:shadow-md ${
              filtroTipo === 'todos'
                ? 'bg-slate-100 dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 border-t-4 border-t-indigo-600'
                : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300'
            }`}
            title="Doble clic para ver Todos los registros"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 font-mono">
                Total Guardados
              </span>
              <span className="text-[9px] font-mono text-slate-400 opacity-60 group-hover:opacity-100">Doble clic ⚡</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{stats.total}</span>
              <span className="text-[10px] font-mono text-slate-400">
                {stats.pendientes} pend. / {stats.resueltas} ok
              </span>
            </div>
          </div>

          {/* Cuadro 2: Preguntas Relevantes */}
          <div
            onClick={() => setFiltroTipo('pregunta_relevante')}
            onDoubleClick={() => setFiltroTipo('pregunta_relevante')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none relative group shadow-xs hover:shadow-md ${
              filtroTipo === 'pregunta_relevante' || filtroTipo === 'preguntas_falladas' || filtroTipo === 'preguntas_acertadas'
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 border-t-4 border-t-rose-600'
                : 'bg-white dark:bg-slate-850 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-300'
            }`}
            title="Doble clic para filtrar solo Preguntas Relevantes (falladas y acertadas)"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 font-mono flex items-center gap-1">
                <i className="fa-solid fa-circle-question text-[9px]"></i>
                Preguntas Relevantes
              </span>
              <span className="text-[9px] font-mono text-rose-400 opacity-60 group-hover:opacity-100">Doble clic ⚡</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-rose-700 dark:text-rose-300">
                {stats.preguntasTotal}
              </span>
              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                {stats.preguntasFalladas} falladas • {stats.preguntasAcertadas} ok
              </span>
            </div>
          </div>

          {/* Cuadro 3: Artículos Clave */}
          <div
            onClick={() => setFiltroTipo('articulo_clave')}
            onDoubleClick={() => setFiltroTipo('articulo_clave')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none relative group shadow-xs hover:shadow-md ${
              filtroTipo === 'articulo_clave'
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 border-t-4 border-t-amber-600'
                : 'bg-white dark:bg-slate-850 border-amber-200/80 dark:border-amber-900/50 hover:border-amber-300'
            }`}
            title="Doble clic para filtrar solo Artículos Clave"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1">
                <i className="fa-solid fa-scale-balanced text-[9px]"></i>
                Artículos Clave
              </span>
              <span className="text-[9px] font-mono text-amber-400 opacity-60 group-hover:opacity-100">Doble clic ⚡</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-amber-800 dark:text-amber-300">
                {stats.articulosClave}
              </span>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Preceptos BOE</span>
            </div>
          </div>

          {/* Cuadro 4: Plazos y Cómputos */}
          <div
            onClick={() => setFiltroTipo('plazo_computo')}
            onDoubleClick={() => setFiltroTipo('plazo_computo')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none relative group shadow-xs hover:shadow-md ${
              filtroTipo === 'plazo_computo'
                ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/20 border-t-4 border-t-sky-600'
                : 'bg-white dark:bg-slate-850 border-sky-200/80 dark:border-sky-900/50 hover:border-sky-300'
            }`}
            title="Doble clic para filtrar solo Plazos y Cómputos"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300 font-mono flex items-center gap-1">
                <i className="fa-solid fa-clock text-[9px]"></i>
                Plazos & Cómputos
              </span>
              <span className="text-[9px] font-mono text-sky-400 opacity-60 group-hover:opacity-100">Doble clic ⚡</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-sky-800 dark:text-sky-300">{stats.plazos}</span>
              <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400">Días, meses y prórr.</span>
            </div>
          </div>

          {/* Cuadro 5: Atajos y Reglas Mnemotécnicas */}
          <div
            onClick={() => setFiltroTipo('atajo_mnemotecnia')}
            onDoubleClick={() => setFiltroTipo('atajo_mnemotecnia')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none relative group shadow-xs hover:shadow-md ${
              filtroTipo === 'atajo_mnemotecnia'
                ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 border-t-4 border-t-purple-600'
                : 'bg-white dark:bg-slate-850 border-purple-200/80 dark:border-purple-900/50 hover:border-purple-300'
            }`}
            title="Doble clic para filtrar solo Atajos y Reglas Mnemotécnicas"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-purple-800 dark:text-purple-300 font-mono flex items-center gap-1">
                <i className="fa-solid fa-brain text-[9px]"></i>
                Atajos & Mnemo
              </span>
              <span className="text-[9px] font-mono text-purple-400 opacity-60 group-hover:opacity-100">Doble clic ⚡</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-purple-800 dark:text-purple-300">
                {stats.mnemotecnia}
              </span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">Fórmulas visuales</span>
            </div>
          </div>

          {/* Cuadro 6: Informática & Ofimática */}
          <div
            onClick={() => setFiltroTipo('informatica')}
            onDoubleClick={() => setFiltroTipo('informatica')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none relative group shadow-xs hover:shadow-md ${
              filtroTipo === 'informatica'
                ? 'bg-cyan-50/90 dark:bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20 border-t-4 border-t-cyan-600'
                : 'bg-white dark:bg-slate-850 border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-300'
            }`}
            title="Doble clic para filtrar temas de Informática (atajos, definiciones, Excel, Access)"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-cyan-800 dark:text-cyan-300 font-mono flex items-center gap-1">
                <i className="fa-solid fa-laptop-code text-[9px] text-cyan-600 dark:text-cyan-400"></i>
                Informática & Ofim.
              </span>
              <span className="text-[9px] font-mono text-cyan-500 opacity-60 group-hover:opacity-100">Doble clic ⚡</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black font-mono text-cyan-800 dark:text-cyan-300">
                {stats.informatica}
              </span>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">Word, Excel, Teams, BI</span>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL DE FILTROS Y BÚSQUEDA */}
      <div className="bg-sky-50/85 dark:bg-slate-850 border-2 border-sky-300 dark:border-sky-700/80 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3">
        {/* Fila 1: Búsqueda y Orden */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por artículo, término, plazo, fórmula mnemotécnica, ley, atajo o función..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-medium"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fa-solid fa-circle-xmark text-xs"></i>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Orden:</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as any)}
              className="py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="recientes">Más recientes</option>
              <option value="antiguas">Más antiguas</option>
              <option value="alfabetico">Alfabético</option>
            </select>
          </div>
        </div>

        {/* Fila 2: Etiquetas / Filtros por Tipo */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase text-slate-400 font-mono mr-1">Tipo:</span>

          <button
            type="button"
            onClick={() => setFiltroTipo('todos')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'todos'
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-800 dark:border-slate-100 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <span>Todos</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('pregunta_relevante')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'pregunta_relevante'
                ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 shadow-2xs ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <i className="fa-solid fa-circle-question text-[10px] text-rose-500"></i>
            <span>Preguntas Relevantes</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
              {stats.preguntasTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('articulo_clave')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'articulo_clave'
                ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 shadow-2xs ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <i className="fa-solid fa-scale-balanced text-[10px] text-amber-600"></i>
            <span>Artículos clave</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
              {stats.articulosClave}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('plazo_computo')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'plazo_computo'
                ? 'bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700 shadow-2xs ring-2 ring-sky-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <i className="fa-solid fa-clock text-[10px] text-sky-600"></i>
            <span>Plazos y cómputos</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200">
              {stats.plazos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('atajo_mnemotecnia')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'atajo_mnemotecnia'
                ? 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700 shadow-2xs ring-2 ring-purple-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <i className="fa-solid fa-brain text-[10px] text-purple-600"></i>
            <span>Atajos & mnemotecnia</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
              {stats.mnemotecnia}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('informatica')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'informatica'
                ? 'bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-700 shadow-2xs ring-2 ring-cyan-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <i className="fa-solid fa-laptop-code text-[10px] text-cyan-600 dark:text-cyan-400"></i>
            <span>Informática & Ofimática</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200">
              {stats.informatica}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          <button
            type="button"
            onClick={() => setFiltroTipo(filtroTipo === 'pendientes' ? 'todos' : 'pendientes')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              filtroTipo === 'pendientes'
                ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <span>Pendientes ({stats.pendientes})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo(filtroTipo === 'resueltas' ? 'todos' : 'resueltas')}
            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              filtroTipo === 'resueltas'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <span>Resueltas ({stats.resueltas})</span>
          </button>
        </div>

        {/* Fila 2B: Subtipo de Informática (activo cuando se filtra por informática o si hay subtipo seleccionado) */}
        {filtroTipo === 'informatica' && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-cyan-100 dark:border-cyan-900/60 animate-in fade-in">
            <span className="text-[10px] font-black uppercase text-cyan-800 dark:text-cyan-300 font-mono mr-1 flex items-center gap-1">
              <i className="fa-solid fa-filter text-[9px] text-cyan-600"></i>
              Subtipo Ofimática:
            </span>
            {[
              { id: 'todos', label: 'Todos', icon: 'fa-laptop-code', count: stats.informatica },
              { id: 'word_365', label: 'Word 365', icon: 'fa-file-lines', count: stats.infoWord },
              { id: 'funcion_excel', label: 'Excel 365', icon: 'fa-table', count: stats.infoExcel },
              { id: 'base_datos_access', label: 'Access', icon: 'fa-database', count: stats.infoAccess },
              { id: 'outlook', label: 'Outlook', icon: 'fa-envelope', count: stats.infoOutlook },
              { id: 'teams', label: 'Teams', icon: 'fa-users', count: stats.infoTeams },
              { id: 'power_bi', label: 'Power BI', icon: 'fa-chart-column', count: stats.infoPowerBI },
              { id: 'atajo_teclado', label: 'Atajos Teclado', icon: 'fa-keyboard', count: stats.infoAtajos },
              { id: 'definicion_redes', label: 'Redes & TIC', icon: 'fa-network-wired', count: stats.infoRedes },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFiltroSubtipoInfo(st.id as any)}
                className={`py-0.5 px-2 rounded-lg text-[10.5px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  filtroSubtipoInfo === st.id
                    ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                }`}
              >
                <i className={`fa-solid ${st.icon} text-[9px]`}></i>
                <span>{st.label}</span>
                <span className={`text-[9px] font-mono px-1 rounded-full ${
                  filtroSubtipoInfo === st.id
                    ? 'bg-cyan-800 text-cyan-100'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Fila 3: Filtro por Ley */}
        {todasLasLeyesUnicas.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono mr-1">
              <i className="fa-solid fa-book-bookmark text-[9px] text-indigo-500 mr-1"></i>
              Ley BOE:
            </span>
            <button
              type="button"
              onClick={() => setFiltroLey('todas')}
              className={`py-0.5 px-2 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
                filtroLey === 'todas'
                  ? 'bg-indigo-600 text-white border-indigo-600 font-mono'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Todas las leyes
            </button>
            {todasLasLeyesUnicas.slice(0, 10).map((ley) => (
              <button
                key={ley}
                type="button"
                onClick={() => setFiltroLey(ley)}
                className={`py-0.5 px-2 rounded-md text-[10.5px] font-medium border transition-all cursor-pointer truncate max-w-[220px] ${
                  filtroLey === ley
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
                title={ley}
              >
                {ley}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FORMATO LISTADO SIMILAR A HISTORIAL CON ETIQUETAS Y PAGINACIÓN */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-3xl p-3.5 sm:p-5 shadow-xs space-y-3">
        {renderPaginacion('superior')}

        {itemsFiltrados.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center text-xl">
              <i className="fa-solid fa-inbox"></i>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
              No hay elementos registrados con los filtros seleccionados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Pulsa en <strong>+ Añadir</strong> para registrar un Artículo clave, Plazo o Regla mnemotécnica, o añade
              preguntas relevantes directamente desde la <strong>Ventana Justificación</strong> de cualquier examen.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  setFiltroTipo('todos');
                  setFiltroLey('todas');
                }}
                className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
              <button
                type="button"
                onClick={() => handleAbrirModalAnadir('articulo_clave')}
                className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                + Añadir ahora
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 font-mono tracking-wider">
                  <th className="py-2.5 px-2 w-[140px]">Tipo</th>
                  <th className="py-2.5 px-3 min-w-[280px]">Concepto / Enunciado (Doble clic para abrir)</th>
                  <th className="py-2.5 px-2 w-[170px]">Leyes BOE / Temario</th>
                  <th className="py-2.5 px-2 text-center w-[90px]">Fecha</th>
                  <th className="py-2.5 px-2 text-center w-[95px]">Estado</th>
                  <th className="py-2.5 px-2 text-right w-[150px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {itemsPaginados.map((item) => {
                  const esPregunta =
                    item.tipo === 'pregunta_relevante' ||
                    item.tipo === 'fallada' ||
                    item.tipo === 'duda' ||
                    (item.opciones && item.opciones.length > 0);

                  const esFallada =
                    item.esFallada ||
                    item.tipo === 'fallada' ||
                    (item.respuestaUsuario && item.respuestaUsuario !== item.respuestaCorrecta);

                  return (
                    <tr
                      key={item.id}
                      onDoubleClick={() => handleElementoDobleClick(item)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group ${
                        item.resuelta ? 'opacity-85' : ''
                      }`}
                      title={
                        esPregunta
                          ? 'Doble clic para abrir la Ventana Justificación BOE de esta pregunta'
                          : 'Doble clic para abrir el cuadro de estudio y detalle de esta nota'
                      }
                    >
                      {/* 1. TIPO CON ETIQUETAS COLORIDAS */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {esPregunta ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border ${
                              esFallada
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            <i className={`fa-solid ${esFallada ? 'fa-circle-xmark' : 'fa-circle-check'} text-[9px]`}></i>
                            <span>{esFallada ? 'Preg. Fallada' : 'Preg. Relevante'}</span>
                          </span>
                        ) : item.tipo === 'articulo_clave' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                            <i className="fa-solid fa-scale-balanced text-[9px] text-amber-600"></i>
                            <span>Artículo Clave</span>
                          </span>
                        ) : item.tipo === 'plazo_computo' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800">
                            <i className="fa-solid fa-clock text-[9px] text-sky-600"></i>
                            <span>Plazo y Cómputo</span>
                          </span>
                        ) : item.tipo === 'informatica' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800">
                            <i className="fa-solid fa-laptop-code text-[9px] text-cyan-600"></i>
                            <span>Informática</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800">
                            <i className="fa-solid fa-brain text-[9px] text-purple-600"></i>
                            <span>Atajo & Mnemo</span>
                          </span>
                        )}
                      </td>

                      {/* 2. CONCEPTO / ENUNCIADO ADAPTADO */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                              {item.titulo || item.enunciado}
                            </h4>
                          </div>

                          {/* Previsualización contextual según el tipo */}
                          {item.tipo === 'plazo_computo' && item.plazoComputo && (
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-mono font-black border border-sky-300 dark:border-sky-700">
                                ⏳ {item.plazoComputo.plazo}
                              </span>
                              {item.plazoComputo.inicioComputo && (
                                <span className="text-slate-500 text-[10.5px]">
                                  Inicio: {item.plazoComputo.inicioComputo}
                                </span>
                              )}
                            </div>
                          )}

                          {item.tipo === 'informatica' && item.fichaInformatica && (
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200 font-mono font-black border border-cyan-300 dark:border-cyan-700 text-[10px]">
                                {item.fichaInformatica.softwareOModulo}
                              </span>
                              {item.fichaInformatica.subtipo === 'word_365' && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-mono font-bold text-[10.5px] border border-blue-300 dark:border-blue-800">
                                  📝 Word: {item.fichaInformatica.atajoOFuncion}
                                </span>
                              )}
                              {item.fichaInformatica.subtipo === 'outlook' && (
                                <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-mono font-bold text-[10.5px] border border-sky-300 dark:border-sky-800">
                                  ✉️ Outlook: {item.fichaInformatica.atajoOFuncion}
                                </span>
                              )}
                              {item.fichaInformatica.subtipo === 'teams' && (
                                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-mono font-bold text-[10.5px] border border-indigo-300 dark:border-indigo-800">
                                  👥 Teams: {item.fichaInformatica.atajoOFuncion}
                                </span>
                              )}
                              {item.fichaInformatica.subtipo === 'power_bi' && (
                                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10.5px] border border-amber-300 dark:border-amber-800">
                                  📊 Power BI: {item.fichaInformatica.atajoOFuncion}
                                </span>
                              )}
                              {item.fichaInformatica.subtipo === 'atajo_teclado' && (
                                <kbd className="px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-700 text-white font-mono font-bold text-[10.5px] shadow-2xs">
                                  ⌨️ {item.fichaInformatica.atajoOFuncion}
                                </kbd>
                              )}
                              {item.fichaInformatica.subtipo === 'funcion_excel' && (
                                <code className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[10.5px] border border-emerald-300 dark:border-emerald-800">
                                  fx {item.fichaInformatica.atajoOFuncion}
                                </code>
                              )}
                              {item.fichaInformatica.subtipo === 'base_datos_access' && (
                                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-mono font-bold text-[10.5px] border border-rose-300 dark:border-rose-800">
                                  🗄️ {item.fichaInformatica.atajoOFuncion}
                                </span>
                              )}
                              {item.fichaInformatica.subtipo === 'definicion_redes' && (
                                <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-mono font-bold text-[10.5px] border border-purple-300 dark:border-purple-800">
                                  🌐 {item.fichaInformatica.atajoOFuncion}
                                </span>
                              )}
                              {item.fichaInformatica.explicacion && (
                                <span className="text-slate-500 text-[10.5px] truncate max-w-[280px]">
                                  {item.fichaInformatica.explicacion}
                                </span>
                              )}
                            </div>
                          )}

                          {item.tipo === 'articulo_clave' && item.articuloClave && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-serif italic line-clamp-1 bg-amber-50/50 dark:bg-amber-950/20 px-2 py-0.5 rounded border border-amber-200/50">
                              «{item.articuloClave.literalArticulo || item.articuloClave.resumenOClave || item.articuloClave.articulo}»
                            </div>
                          )}

                          {item.reglaMnemotecnica && (
                            <div className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 line-clamp-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              ⚡ {item.reglaMnemotecnica}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. LEYES BOE ASOCIADAS */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.leyesRelacionadas && item.leyesRelacionadas.length > 0 ? (
                            item.leyesRelacionadas.slice(0, 2).map((ley, lIdx) => (
                              <span
                                key={lIdx}
                                className="inline-flex items-center py-0.5 px-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[9.5px] text-indigo-800 dark:text-indigo-200 font-medium font-mono truncate max-w-[130px]"
                                title={ley}
                              >
                                {ley}
                              </span>
                            ))
                          ) : item.justificacionLegal?.norma && !esNormaGenerica(item.justificacionLegal.norma) ? (
                            <span className="inline-flex items-center py-0.5 px-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[9.5px] text-indigo-800 dark:text-indigo-200 font-medium font-mono truncate max-w-[130px]">
                              {item.justificacionLegal.norma}
                            </span>
                          ) : esPregunta ? (
                            <span className="inline-flex items-center py-0.5 px-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[9.5px] text-indigo-800 dark:text-indigo-200 font-medium font-mono truncate max-w-[130px]">
                              {obtenerNormaEfectivaDePregunta(item)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin ley</span>
                          )}

                          {(item.leyesRelacionadas?.length || 0) > 2 && (
                            <span className="text-[9px] font-mono text-slate-400">
                              +{(item.leyesRelacionadas?.length || 0) - 2}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemParaSelectorLeyesDirecto(item);
                            }}
                            className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline p-0.5 cursor-pointer"
                            title="Vincular con leyes del temario"
                          >
                            <i className="fa-solid fa-plus text-[8px]"></i>
                          </button>
                        </div>
                      </td>

                      {/* 4. FECHA */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-mono text-[10.5px] text-slate-500">
                        {item.fechaCreacion ? item.fechaCreacion.split('T')[0] : '-'}
                      </td>

                      {/* 5. ESTADO (RESOLUCIÓN) */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleResuelta(item.id, e)}
                          className={`py-0.5 px-2 rounded-md text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                            item.resuelta
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          }`}
                          title={item.resuelta ? 'Marcar como pendiente de repaso' : 'Marcar como fijada / resuelta'}
                        >
                          <i className={`fa-solid ${item.resuelta ? 'fa-check' : 'fa-hourglass-half'} text-[8.5px]`}></i>
                          <span>{item.resuelta ? 'Resuelta' : 'Pendiente'}</span>
                        </button>
                      </td>

                      {/* 6. ACCIONES */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleElementoDobleClick(item);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title={esPregunta ? 'Abrir Ventana Justificación BOE' : 'Abrir cuadro detallado de la nota'}
                          >
                            <i className={`fa-solid ${esPregunta ? 'fa-scale-balanced text-amber-500' : 'fa-eye'} text-[9px]`}></i>
                            <span>{esPregunta ? 'Justificar' : 'Ver'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbrirEdicion(item);
                            }}
                            className="h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
                            title="Editar ficha"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleEliminarItem(item.id, e)}
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {renderPaginacion('inferior')}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: JUSTIFICACIÓN OFICIAL BOE COMPLETA (AL HACER DOBLE CLIC EN PREGUNTA) */}
      {/* ========================================================================= */}
      {preguntaParaJustificacion && (() => {
        const preg = preguntaParaJustificacion;
        const idxActual = preguntasDelAlmacen.findIndex((p) => p.id === preg.id);
        const totalPreguntas = preguntasDelAlmacen.length > 0 ? preguntasDelAlmacen.length : 1;

        const norma = obtenerNormaEfectivaDePregunta(preg);
        const articulo = preg.justificacionLegal?.articulo || 'Precepto aplicable';
        const codigoBOE = preg.justificacionLegal?.codigoBOE || (norma.toLowerCase().includes('constituci') ? 'BOE-A-1978-31229' : 'BOE-A');
        const codigoInedita = (preg.preguntaId !== undefined
          ? `INED-${String(preg.preguntaId).padStart(4, '0').toUpperCase()}`
          : `INED-${(idxActual >= 0 ? idxActual + 1 : 1).toString().padStart(4, '0')}`);
        const urlBOE =
          preg.justificacionLegal?.urlBOE ||
          (codigoBOE && !codigoBOE.startsWith('BOE-A')
            ? `https://www.boe.es/buscar/act.php?id=${codigoBOE}`
            : 'https://www.boe.es');

        const opciones = preg.opciones || [];
        const opcCorr =
          opciones.find((o) => o.esCorrecta) ||
          (preg.respuestaCorrecta ? opciones.find((o) => o.id === preg.respuestaCorrecta) : undefined);
        const respU = preg.respuestaUsuario;
        const opcU = respU ? opciones.find((o) => o.id === respU) : undefined;
        const acierto = respU && opcCorr && respU === opcCorr.id;
        const esFallada = preg.esFallada || (respU && opcCorr && respU !== opcCorr.id);

        // Separador para detectar ejemplo práctico dentro de fundamento si viene junto
        const fundamento = (preg.justificacionLegal?.fundamento || '').trim();
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

        if (!ejemploPractico && opcCorr?.explicacion) {
          ejemploPractico = opcCorr.explicacion.trim();
        }

        const reglaMnemotecnicaAMostrar = (preg.reglaMnemotecnica || '').trim();
        const analisisDistractoresAMostrar = (preg.analisisDistractores || '').trim();
        const refConvAlmacen = obtenerReferenciaConvocatoriaOficial(preg);
        const convocatoriasAMostrar =
          refConvAlmacen || limpiarTextoConvocatoria(preg.convocatoriasAparecida);

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreguntaParaJustificacion(null);
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
                      {refConvAlmacen ? (
                        <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-300 text-slate-950 font-mono flex items-center gap-1">
                          <i className="fa-solid fa-landmark-flag text-[9px]"></i>
                          <span>{formatearBadgeConvocatoriaOficial(refConvAlmacen)}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono flex items-center gap-1">
                          <i className="fa-solid fa-shield-halved text-[9px]"></i>
                          Inédita: {codigoInedita}
                        </span>
                      )}
                      <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/80 text-white font-mono">
                        {codigoBOE}
                      </span>
                    </div>
                    <h3 className="text-[15px] sm:text-[17px] font-black text-white mt-0.5 truncate flex items-center gap-1.5">
                      <a
                        href={obtenerUrlBOEParaNorma(norma, articulo, urlBOE)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer text-white"
                        title="Abrir esta ley en el BOE oficial"
                      >
                        <span>{norma}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-amber-400"></i>
                      </a>
                      {articulo && (
                        <span className="text-indigo-300 font-mono">
                          · {articulo}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <a
                    href={obtenerUrlBOEParaNorma(norma, articulo, urlBOE)}
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
                    onClick={() => setPreguntaParaJustificacion(null)}
                    className="h-8 w-8 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Cerrar justificación"
                  >
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
              </div>

              {/* Modal Body - Formato Horizontal Equilibrado (50% / 50%) con Tipografía Adaptativa */}
              {(() => {
                const totalTextoIzq =
                  (preg.enunciado || '').length +
                  opciones.reduce((acc, o) => acc + (o.texto || '').length + (o.explicacion || '').length, 0);
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

                return (
                  <div className="p-2.5 sm:p-3.5 flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-3.5 min-h-0 text-slate-700 dark:text-slate-300">
                    {/* COLUMNA IZQUIERDA: 50% de la ventana horizontalmente */}
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
                      {/* Enunciado de la Pregunta */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-1 shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11.5px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-question text-indigo-500"></i>
                            Pregunta #{idxActual >= 0 ? idxActual + 1 : 1} de {totalPreguntas}
                          </span>
                          <span
                            className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full font-mono ${
                              !respU
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                : acierto
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                            }`}
                          >
                            {!respU ? 'Sin responder' : acierto ? '✓ Acertada' : '✗ Fallada'}
                          </span>
                        </div>
                        <p className={`${fontEnunciado} font-bold text-slate-900 dark:text-white leading-snug`}>
                          {preg.enunciado}
                        </p>
                      </div>

                      {/* Confrontation of User Answer vs. Official Tribunal Key */}
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

                      {/* Sello de Origen: Convocatoria Oficial o Singularidad Inédita */}
                      {refConvAlmacen ? (
                        <div className="py-1 px-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[11.5px] text-amber-950 dark:text-amber-200 flex items-center justify-between gap-1.5 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-4.5 w-4.5 rounded bg-amber-600 text-white flex items-center justify-center text-[10px] shrink-0">
                              <i className="fa-solid fa-landmark-flag"></i>
                            </span>
                            <span className="font-bold truncate">
                              {norma} ·{' '}
                              <span className="font-mono text-[10.5px] text-amber-800 dark:text-amber-300 font-semibold">
                                {refConvAlmacen}
                              </span>
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono border border-amber-400 dark:border-amber-700 shrink-0">
                            Convocatoria Oficial
                          </span>
                        </div>
                      ) : (
                        <div className="py-1 px-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-[11.5px] text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-1.5 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-4.5 w-4.5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0">
                              <i className="fa-solid fa-fingerprint"></i>
                            </span>
                            <span className="font-bold truncate">
                              Certificado de Singularidad Inédita ({norma}) ·{' '}
                              <span className="font-mono text-[10.5px] text-emerald-800 dark:text-emerald-300 font-normal">
                                {codigoInedita}
                              </span>
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono border border-emerald-400 dark:border-emerald-700 shrink-0">
                            0% Clones
                          </span>
                        </div>
                      )}

                      {/* Desglose y Confrontación de las 4 Opciones con aspa rojo (✗) en erróneas */}
                      {opciones && opciones.length > 0 && (
                        <div className="space-y-1.5 flex-1 min-h-0">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                            Desglose y Confrontación de las 4 Opciones:
                          </span>
                          <div className="space-y-1.5">
                            {opciones.map((opc) => {
                              const esCorrecta = opc.esCorrecta || opc.id === preg.respuestaCorrecta;
                              return (
                                <div
                                  key={opc.id}
                                  className={`${paddingOpcion} rounded-lg border leading-tight ${
                                    esCorrecta
                                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200 ring-1 ring-emerald-400/40'
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                      <span
                                        className={`h-5 w-5 rounded flex items-center justify-center font-mono font-black text-[11px] shrink-0 mt-0.5 ${
                                          esCorrecta
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        {opc.id}
                                      </span>
                                      <div className="min-w-0 flex items-start gap-1.5 flex-1">
                                        {!esCorrecta ? (
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
                                            esCorrecta
                                              ? 'text-emerald-900 dark:text-emerald-200 font-bold'
                                              : 'text-slate-800 dark:text-slate-200 font-normal'
                                          }`}
                                        >
                                          {opc.texto}
                                        </span>
                                      </div>
                                    </div>
                                    {esCorrecta ? (
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
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COLUMNA DERECHA: 50% de la ventana horizontalmente con tipografía adaptativa */}
                    <div className="flex flex-col gap-2.5 overflow-y-auto pr-1.5 scrollbar-thin">
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
                                href={obtenerUrlBOEParaNorma(norma, articulo, urlBOE)}
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

                          <GestorRecursosArgumentacionPregunta
                            enunciadoPregunta={preg.enunciado}
                            recursosIniciales={obtenerRecursosArgumentacionDePregunta(preg)}
                            onActualizarRecursos={(nuevosRecursos) => {
                              const itemActualizado: ItemAlmacenDuda = {
                                ...preg,
                                recursosArgumentacion: nuevosRecursos,
                                fechaActualizacion: new Date().toISOString(),
                              };
                              setPreguntaParaJustificacion(itemActualizado);
                              const nuevosItems = itemsDudas.map((it) =>
                                it.id === preg.id || it.enunciado === preg.enunciado
                                  ? { ...it, recursosArgumentacion: nuevosRecursos, fechaActualizacion: new Date().toISOString() }
                                  : it
                              );
                              onActualizarItems(nuevosItems);
                              if (onActualizarPreguntaGlobal) {
                                onActualizarPreguntaGlobal({
                                  id: preg.preguntaId || 1,
                                  enunciado: preg.enunciado,
                                  opciones: preg.opciones || [],
                                  justificacionLegal: preg.justificacionLegal || {
                                    norma,
                                    articulo,
                                    fundamento: argumentacionLegal,
                                  },
                                  leyesRelacionadas: preg.leyesRelacionadas,
                                  recursosArgumentacion: nuevosRecursos,
                                });
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
                                    href={obtenerUrlBOEParaNorma(norma, articulo, urlBOE)}
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
                                  ✓ Pregunta registrada en el banco de preguntas ({esFallada ? 'Fallada en test' : 'Acertada / Relevante'})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end shrink-0">
                              <span className="py-1.5 px-2.5 rounded-lg text-[13px] font-bold flex items-center gap-1 bg-emerald-600 text-white shadow-xs">
                                <i className="fa-solid fa-circle-check text-[10px]"></i>
                                <span>✓ Guardada en Almacén</span>
                              </span>
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
                                  href={obtenerUrlBOEParaNorma(norma, articulo, urlBOE)}
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
                              onClick={() => setItemParaSelectorLeyesDirecto(preg)}
                              className="text-[11.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-plus text-[8px]"></i>
                              <span>Vincular leyes</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer with Question Navigation */}
              <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-slate-50 dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Botón Anterior */}
                  <button
                    type="button"
                    disabled={idxActual <= 0}
                    onClick={() => {
                      if (idxActual > 0 && preguntasDelAlmacen[idxActual - 1]) {
                        setPreguntaParaJustificacion(preguntasDelAlmacen[idxActual - 1]);
                      }
                    }}
                    className="py-2 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-[13px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <i className="fa-solid fa-chevron-left text-[9px]"></i>
                    <span>Anterior</span>
                  </button>

                  {/* Botón Siguiente */}
                  <button
                    type="button"
                    disabled={idxActual >= totalPreguntas - 1}
                    onClick={() => {
                      if (idxActual < totalPreguntas - 1 && preguntasDelAlmacen[idxActual + 1]) {
                        setPreguntaParaJustificacion(preguntasDelAlmacen[idxActual + 1]);
                      }
                    }}
                    className={`py-2 px-4 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all ${
                      idxActual >= totalPreguntas - 1
                        ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer'
                    }`}
                  >
                    <span>Siguiente</span>
                    <i className="fa-solid fa-chevron-right text-[9px]"></i>
                  </button>

                  <span className="text-[13px] font-mono text-slate-500 dark:text-slate-400 pl-1">
                    Pregunta {idxActual >= 0 ? idxActual + 1 : 1} de {totalPreguntas} en el Almacén
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setPreguntaParaJustificacion(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-[13px] transition-colors cursor-pointer shadow-xs"
                >
                  Cerrar Justificación
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALLE DE NOTA (ARTÍCULOS CLAVE, PLAZOS O REGLAS MNEMOTÉCNICAS) */}
      {/* ========================================================================= */}
      {notaParaDetalle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNotaParaDetalle(null);
          }}
        >
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${
                    notaParaDetalle.tipo === 'articulo_clave'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : notaParaDetalle.tipo === 'plazo_computo'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      notaParaDetalle.tipo === 'articulo_clave'
                        ? 'fa-scale-balanced'
                        : notaParaDetalle.tipo === 'plazo_computo'
                        ? 'fa-clock'
                        : 'fa-brain'
                    }`}
                  ></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                    {notaParaDetalle.tipo === 'articulo_clave'
                      ? 'Ficha de Artículo Clave'
                      : notaParaDetalle.tipo === 'plazo_computo'
                      ? 'Ficha de Plazo y Cómputo'
                      : 'Ficha de Atajo y Regla Mnemotécnica'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {notaParaDetalle.titulo || notaParaDetalle.enunciado}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNotaParaDetalle(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Contenido adaptado a cada tipo de nota */}
            {notaParaDetalle.tipo === 'articulo_clave' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {notaParaDetalle.articuloClave?.ley && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-xs font-bold font-mono border border-amber-300 dark:border-amber-700">
                      🏛️ {notaParaDetalle.articuloClave.ley}
                    </span>
                  )}
                  {notaParaDetalle.articuloClave?.articulo && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black font-mono border border-slate-200 dark:border-slate-700">
                      ⚖️ {notaParaDetalle.articuloClave.articulo}
                    </span>
                  )}
                </div>

                {notaParaDetalle.articuloClave?.literalArticulo && (
                  <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 font-serif italic text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                    <span className="text-2xl text-amber-400 block leading-none select-none">“</span>
                    <p className="whitespace-pre-line pl-3">{notaParaDetalle.articuloClave.literalArticulo}</p>
                  </div>
                )}

                {(notaParaDetalle.articuloClave?.resumenOClave || notaParaDetalle.comentarioUsuario) && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 font-mono">
                      Conceptos Clave & Palabras Trampa:
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {notaParaDetalle.articuloClave?.resumenOClave || notaParaDetalle.comentarioUsuario}
                    </p>
                  </div>
                )}
              </div>
            )}

            {notaParaDetalle.tipo === 'plazo_computo' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-200">Duración Oficial:</span>
                  <span className="text-base font-black font-mono text-sky-800 dark:text-sky-300 px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700">
                    ⏱️ {notaParaDetalle.plazoComputo?.plazo || 'Plazo especificado'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                      Inicio del Cómputo (Dies a quo):
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {notaParaDetalle.plazoComputo?.inicioComputo || 'Día siguiente a la notificación'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                      Vencimiento (Dies ad quem):
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {notaParaDetalle.plazoComputo?.finComputo || 'Mismo día del mes siguiente o hábil posterior'}
                    </p>
                  </div>
                </div>

                {notaParaDetalle.plazoComputo?.reglaEspecial && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                      Reglas Especiales & Excepciones:
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {notaParaDetalle.plazoComputo.reglaEspecial}
                    </p>
                  </div>
                )}
              </div>
            )}

            {notaParaDetalle.tipo === 'atajo_mnemotecnia' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 border-2 border-purple-300 dark:border-purple-700 space-y-1.5 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 font-mono flex items-center gap-1.5">
                    <i className="fa-solid fa-brain"></i>
                    Fórmula Mnemotécnica / Esquema de 2 Líneas:
                  </span>
                  <p className="text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white leading-relaxed pl-1">
                    {notaParaDetalle.reglaMnemotecnica || notaParaDetalle.atajoMnemotecnia?.reglaOFormula}
                  </p>
                </div>

                {(notaParaDetalle.atajoMnemotecnia?.explicacionTruco || notaParaDetalle.comentarioUsuario) && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                      Cómo Recordarlo en el Examen:
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {notaParaDetalle.atajoMnemotecnia?.explicacionTruco || notaParaDetalle.comentarioUsuario}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer del Detalle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Leyes:</span>
                {(notaParaDetalle.leyesRelacionadas || []).map((l, lIdx) => (
                  <span
                    key={lIdx}
                    className="inline-flex items-center py-0.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                  >
                    {l}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = notaParaDetalle;
                    setNotaParaDetalle(null);
                    handleAbrirEdicion(item);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square mr-1"></i>
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotaParaDetalle(null)}
                  className="py-1.5 px-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2B: VENTANA DEDICADA PARA INFORMÁTICA & OFIMÁTICA */}
      {/* ========================================================================= */}
      {fichaInformaticaParaDetalle && (() => {
        const fi = fichaInformaticaParaDetalle.fichaInformatica;
        const sub = fi?.subtipo || 'otro';
        const iconoSubtipo =
          sub === 'word_365' ? 'fa-file-lines' :
          sub === 'funcion_excel' ? 'fa-table' :
          sub === 'base_datos_access' ? 'fa-database' :
          sub === 'outlook' ? 'fa-envelope' :
          sub === 'teams' ? 'fa-users' :
          sub === 'power_bi' ? 'fa-chart-column' :
          sub === 'atajo_teclado' ? 'fa-keyboard' : 'fa-laptop-code';

        const gradientHeader =
          sub === 'word_365' ? 'from-blue-600 to-indigo-600' :
          sub === 'funcion_excel' ? 'from-emerald-600 to-teal-700' :
          sub === 'base_datos_access' ? 'from-rose-600 to-red-700' :
          sub === 'outlook' ? 'from-sky-500 to-blue-600' :
          sub === 'teams' ? 'from-indigo-600 to-violet-700' :
          sub === 'power_bi' ? 'from-amber-500 to-orange-600' :
          sub === 'atajo_teclado' ? 'from-slate-700 to-slate-900' : 'from-cyan-500 to-blue-600';

        const labelSubtipo =
          sub === 'word_365' ? 'Procesador de Textos Word 365' :
          sub === 'funcion_excel' ? 'Hoja de Cálculo Excel 365' :
          sub === 'base_datos_access' ? 'Base de Datos Relacional Access' :
          sub === 'outlook' ? 'Correo, Contactos & Calendario Outlook' :
          sub === 'teams' ? 'Canales & Trabajo Colaborativo Teams' :
          sub === 'power_bi' ? 'Modelado de Datos & DAX Power BI' :
          sub === 'atajo_teclado' ? 'Combinación de Teclas Oficial' : 'Concepto & Definición Técnica TIC';

        const textoParaCopiar = fi?.sintaxisOEjemplo || fi?.atajoOFuncion || fichaInformaticaParaDetalle.titulo || '';

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFichaInformaticaParaDetalle(null);
            }}
          >
            <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-cyan-200 dark:border-cyan-800/80 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradientHeader} text-white flex items-center justify-center text-xl shadow-md ring-4 ring-cyan-500/10 shrink-0`}>
                    <i className={`fa-solid ${iconoSubtipo}`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 font-mono">
                        Ficha Técnica Oficial C1
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/70 text-cyan-800 dark:text-cyan-200 font-mono text-[10px] font-bold border border-cyan-300 dark:border-cyan-700">
                        {fi?.softwareOModulo || 'Informática C1'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                      {fi?.atajoOFuncion || fichaInformaticaParaDetalle.titulo || fichaInformaticaParaDetalle.enunciado}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFichaInformaticaParaDetalle(null)}
                  className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Contenido Visual Adaptado para Informática */}
              <div className="space-y-3.5">
                {/* Bloque Destacado: Teclado / Fórmula / Definición */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 via-slate-50 to-blue-50/50 dark:from-slate-900 dark:via-cyan-950/20 dark:to-slate-900 border-2 border-cyan-200 dark:border-cyan-800 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 font-mono flex items-center gap-1.5">
                      <i className={`fa-solid ${iconoSubtipo} text-cyan-600`}></i>
                      {labelSubtipo}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {fi?.temaBloque || 'Bloque V C1'}
                    </span>
                  </div>

                  {/* Renderizado de Teclas visuales o Código */}
                  {sub === 'atajo_teclado' ? (
                    <div className="flex items-center gap-2 flex-wrap py-1">
                      {((fi?.atajoOFuncion || fichaInformaticaParaDetalle.titulo || '').split('+').length > 1
                        ? (fi?.atajoOFuncion || fichaInformaticaParaDetalle.titulo || '').split('+')
                        : [fi?.atajoOFuncion || fichaInformaticaParaDetalle.titulo || '']
                      ).map((tecla, tIdx, arr) => (
                        <React.Fragment key={tIdx}>
                          <kbd className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-mono font-black text-sm sm:text-base border-b-4 border-slate-950 shadow-md ring-1 ring-white/10 select-all">
                            {(tecla || '').trim().toUpperCase()}
                          </kbd>
                          {tIdx < arr.length - 1 && (
                            <span className="text-slate-400 font-bold text-sm select-none">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono font-bold text-sm sm:text-base border border-slate-800 shadow-inner select-all flex items-center justify-between gap-2">
                      <span className="truncate">{fi?.atajoOFuncion || fichaInformaticaParaDetalle.titulo}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (textoParaCopiar) {
                            navigator.clipboard?.writeText(textoParaCopiar);
                            setCopiadoFeedback(fichaInformaticaParaDetalle.id);
                            setTimeout(() => setCopiadoFeedback(null), 2000);
                          }
                        }}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-sans font-bold text-white border border-slate-700 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Copiar al portapapeles"
                      >
                        <i className={`fa-solid ${copiadoFeedback === fichaInformaticaParaDetalle.id ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                        <span>{copiadoFeedback === fichaInformaticaParaDetalle.id ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}

                  {/* Sintaxis o Ejemplo si existe */}
                  {fi?.sintaxisOEjemplo && (
                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-800/60 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                      <div className="overflow-hidden">
                        <span className="text-[9.5px] uppercase font-black text-slate-400 block font-sans mb-0.5">
                          Sintaxis Oficial / Ejemplo en Examen:
                        </span>
                        <code className="break-all">{fi.sintaxisOEjemplo}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(fi.sintaxisOEjemplo || '');
                          setCopiadoFeedback(fichaInformaticaParaDetalle.id);
                          setTimeout(() => setCopiadoFeedback(null), 2000);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                        title="Copiar sintaxis"
                      >
                        <i className={`fa-solid ${copiadoFeedback === fichaInformaticaParaDetalle.id ? 'fa-check text-emerald-600' : 'fa-copy'} text-xs`}></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Explicación y Reglas del Tribunal */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-black uppercase text-slate-500 font-mono flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-info text-cyan-600"></i>
                    Definición Oficial & Trampas Habituales del Tribunal C1:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {fi?.explicacion || fichaInformaticaParaDetalle.comentarioUsuario || 'Pregunta técnica recurrente en los exámenes del subgrupo C1 del Estado.'}
                  </p>
                </div>
              </div>

              {/* Footer con opciones operativas para los tests */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Software / Módulo:</span>
                  {(fichaInformaticaParaDetalle.leyesRelacionadas || []).map((l, lIdx) => (
                    <span
                      key={lIdx}
                      className="inline-flex items-center py-0.5 px-2 rounded-md bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800 text-[10px] font-mono text-cyan-800 dark:text-cyan-200 font-bold"
                    >
                      {l}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {onNavegarATab && (
                    <button
                      type="button"
                      onClick={() => {
                        setFichaInformaticaParaDetalle(null);
                        onNavegarATab('importar_json');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="Practicar exámenes de Informática en el Banco"
                    >
                      <i className="fa-solid fa-play text-[10px]"></i>
                      <span>Practicar en Banco</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const item = fichaInformaticaParaDetalle;
                      setFichaInformaticaParaDetalle(null);
                      handleAbrirEdicion(item);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-pen-to-square mr-1"></i>
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFichaInformaticaParaDetalle(null)}
                    className="py-1.5 px-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 3: "+ AÑADIR" CON SELECTOR DE TIPOS Y FORMULARIO ADAPTADO A CADA TIPO */}
      {/* ========================================================================= */}
      {mostrarModalAnadir && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMostrarModalAnadir(false);
          }}
        >
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shrink-0">
                  <i className={`fa-solid ${itemEnEdicion ? 'fa-pen-to-square' : 'fa-plus'}`}></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {itemEnEdicion ? 'Editar Ficha de Estudio' : 'Añadir Ficha de Estudio'}
                  </h3>
                  <p className="text-xs text-slate-500">Selecciona el tipo de nota para adaptar su estructura</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalAnadir(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* SELECTOR DE TIPO DE NOTA OBLIGATORIO */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 font-mono block">
                Tipo de Nota *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoNotaSeleccionado('articulo_clave')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoNotaSeleccionado === 'articulo_clave'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-scale-balanced text-amber-600 text-xs"></i>
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Artículos
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Precepto y literal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoNotaSeleccionado('plazo_computo')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoNotaSeleccionado === 'plazo_computo'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 ring-2 ring-sky-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-clock text-sky-600 text-xs"></i>
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Plazos
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Días, cómputos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoNotaSeleccionado('atajo_mnemotecnia')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoNotaSeleccionado === 'atajo_mnemotecnia'
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-brain text-purple-600 text-xs"></i>
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Mnemotecnia
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Fórmulas visuales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoNotaSeleccionado('informatica')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoNotaSeleccionado === 'informatica'
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400 dark:border-cyan-600 ring-2 ring-cyan-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-laptop-code text-cyan-600 text-xs"></i>
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Informática
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Atajos, Excel, Access</span>
                </button>
              </div>
            </div>

            {/* FORMULARIO ADAPTADO SEGÚN EL TIPO SELECCIONADO */}
            {tipoNotaSeleccionado === 'articulo_clave' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Norma / Ley BOE *
                    </label>
                    <input
                      type="text"
                      value={artLey}
                      onChange={(e) => setArtLey(e.target.value)}
                      placeholder="Ej: Ley 39/2015, LPAC o TREBEP"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Artículo / Precepto *
                    </label>
                    <input
                      type="text"
                      value={artNumero}
                      onChange={(e) => setArtNumero(e.target.value)}
                      placeholder="Ej: Artículo 47.1 o Art. 68"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Título o Epígrafe del Concepto *
                  </label>
                  <input
                    type="text"
                    value={artTitulo}
                    onChange={(e) => setArtTitulo(e.target.value)}
                    placeholder="Ej: Nulidad de pleno derecho / Subsanación y mejora de la solicitud"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Literal del Artículo / Extracto Oficial del Precepto
                  </label>
                  <textarea
                    rows={3}
                    value={artLiteral}
                    onChange={(e) => setArtLiteral(e.target.value)}
                    placeholder="Escribe o pega aquí el literal de la ley: «Los actos de las Administraciones Públicas son nulos de pleno derecho en los casos siguientes:...»"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-serif italic text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Resumen, Conceptos Clave & Palabras Trampa
                  </label>
                  <textarea
                    rows={2}
                    value={artResumen}
                    onChange={(e) => setArtResumen(e.target.value)}
                    placeholder="Añade palabras trampa a recordar en el examen (ej: 'previa solicitud' vs 'de oficio')..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
                  ></textarea>
                </div>
              </div>
            )}

            {tipoNotaSeleccionado === 'plazo_computo' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Trámite o Acto Administrativo *
                    </label>
                    <input
                      type="text"
                      value={plazoConcepto}
                      onChange={(e) => setPlazoConcepto(e.target.value)}
                      placeholder="Ej: Interposición recurso de alzada"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Duración del Plazo *
                    </label>
                    <input
                      type="text"
                      value={plazoDuracion}
                      onChange={(e) => setPlazoDuracion(e.target.value)}
                      placeholder="Ej: 1 mes, 10 días hábiles, 3 meses..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-black font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Tipo de Cómputo
                    </label>
                    <select
                      value={plazoTipoDias}
                      onChange={(e) => setPlazoTipoDias(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 cursor-pointer"
                    >
                      <option value="habiles">Días hábiles (excluye Sáb, Dom y festivos)</option>
                      <option value="naturales">Días naturales (computa todos)</option>
                      <option value="meses">Meses (fecha a fecha)</option>
                      <option value="anos">Años (fecha a fecha)</option>
                      <option value="otro">Otro cómputo</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Norma Aplicable
                    </label>
                    <input
                      type="text"
                      value={plazoLey}
                      onChange={(e) => setPlazoLey(e.target.value)}
                      placeholder="Ej: Art. 122 Ley 39/2015"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Inicio del Cómputo (Dies a quo)
                  </label>
                  <input
                    type="text"
                    value={plazoInicio}
                    onChange={(e) => setPlazoInicio(e.target.value)}
                    placeholder="Ej: Día siguiente a la notificación o publicación del acto"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Fin del Cómputo & Prórroga (Dies ad quem)
                  </label>
                  <input
                    type="text"
                    value={plazoFin}
                    onChange={(e) => setPlazoFin(e.target.value)}
                    placeholder="Ej: Si el último día es inhábil, se prorroga al primer día hábil siguiente"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Particularidades o Excepciones
                  </label>
                  <textarea
                    rows={2}
                    value={plazoReglaEspecial}
                    onChange={(e) => setPlazoReglaEspecial(e.target.value)}
                    placeholder="Ej: En caso de silencio administrativo, en cualquier momento a partir del día siguiente a que surta efectos..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                  ></textarea>
                </div>
              </div>
            )}

            {tipoNotaSeleccionado === 'atajo_mnemotecnia' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Concepto o Materia a Memorizar *
                  </label>
                  <input
                    type="text"
                    value={mnemoConcepto}
                    onChange={(e) => setMnemoConcepto(e.target.value)}
                    placeholder="Ej: Fases del procedimiento administrativo común / Nulidad de pleno derecho"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Atajo / Regla Mnemotécnica (Fórmula visual / Esquema de 2 líneas) *
                  </label>
                  <textarea
                    rows={3}
                    value={mnemoRegla}
                    onChange={(e) => setMnemoRegla(e.target.value)}
                    placeholder="⚡ IN-OR-INS-FI: Iniciación | Ordenación | Instrucción | Finalización (Art. 54-95 LPAC)"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-black text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-500"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Explicación del Truco Mnemotécnico / Cómo Recordarlo en el Examen
                  </label>
                  <textarea
                    rows={2}
                    value={mnemoExplicacion}
                    onChange={(e) => setMnemoExplicacion(e.target.value)}
                    placeholder="Asociación mental, acrónimo o palabras clave para acertar en las opciones tipo test..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-purple-500"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Norma Legal Asociada
                  </label>
                  <input
                    type="text"
                    value={mnemoLey}
                    onChange={(e) => setMnemoLey(e.target.value)}
                    placeholder="Ej: Ley 39/2015, LPAC"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {tipoNotaSeleccionado === 'informatica' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Subtipo de tema informático */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Subtipo de Informática *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'word_365', label: '📝 T4: Word 365', sw: 'Microsoft Word 365', blk: 'Tema 4 (AGE): Procesadores de texto: Word 365' },
                      { id: 'funcion_excel', label: '📊 T5: Excel 365', sw: 'Microsoft Excel 365', blk: 'Tema 5 (AGE): Hojas de cálculo: Excel 365' },
                      { id: 'base_datos_access', label: '🗄️ T6: Access 365', sw: 'Microsoft Access 365', blk: 'Tema 6 (AGE): Bases de datos: Access 365' },
                      { id: 'outlook', label: '✉️ T7: Outlook 365', sw: 'Microsoft Outlook 365', blk: 'Tema 7 (AGE): Correo electrónico: Outlook 365' },
                      { id: 'definicion_redes', label: '🌐 T8: La Red Internet', sw: 'La Red Internet y Correo Web', blk: 'Tema 8 (AGE): La Red Internet' },
                      { id: 'atajo_teclado', label: '🪟 T1-T3: Windows / Info', sw: 'Informática básica y Entorno Windows', blk: 'Tema 2 (AGE): Introducción al sistema operativo: el entorno Windows' },
                      { id: 'power_bi', label: '📈 T9 (CAM): Power BI', sw: 'Microsoft Power BI', blk: 'Tema 9 (CAM): Power BI' },
                      { id: 'teams', label: '👥 T10 (CAM): Teams/M365', sw: 'Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)', blk: 'Tema 10 (CAM): Trabajo colaborativo Microsoft 365 (Teams, SharePoint, OneDrive)' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setInfoSubtipo(st.id as any);
                          setInfoSoftware(st.sw);
                          if (!infoTemaBloque || infoTemaBloque.startsWith('Bloque V') || infoTemaBloque.startsWith('Tema ')) {
                            setInfoTemaBloque(st.blk);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          infoSubtipo === st.id
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs ring-2 ring-cyan-500/20'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Software / Módulo *
                    </label>
                    <input
                      type="text"
                      value={infoSoftware}
                      onChange={(e) => setInfoSoftware(e.target.value)}
                      placeholder="Ej: Microsoft Word 365, Excel, Teams, Power BI..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                      Bloque / Tema Temario
                    </label>
                    <input
                      type="text"
                      value={infoTemaBloque}
                      onChange={(e) => setInfoTemaBloque(e.target.value)}
                      placeholder="Ej: Bloque V - Tema 2 (Ofimática e Informática)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    {infoSubtipo === 'word_365'
                      ? 'Elemento, Estilo o Función de Word 365 *'
                      : infoSubtipo === 'outlook'
                      ? 'Regla, Elemento o Función de Outlook *'
                      : infoSubtipo === 'teams'
                      ? 'Herramienta, Canal o Función de Teams *'
                      : infoSubtipo === 'power_bi'
                      ? 'Función DAX o Visualización de Power BI *'
                      : infoSubtipo === 'atajo_teclado'
                      ? 'Combinación de Teclas (Atajo) *'
                      : infoSubtipo === 'funcion_excel'
                      ? 'Nombre de la Función Excel *'
                      : infoSubtipo === 'base_datos_access'
                      ? 'Concepto / Elemento Access *'
                      : 'Término o Concepto Informático *'}
                  </label>
                  <input
                    type="text"
                    value={infoAtajoOFuncion}
                    onChange={(e) => setInfoAtajoOFuncion(e.target.value)}
                    placeholder={
                      infoSubtipo === 'word_365'
                        ? 'Ej: Control de cambios (CTRL+SHIFT+E) / Combinar correspondencia / Tablas de contenido'
                        : infoSubtipo === 'outlook'
                        ? 'Ej: Reglas y alertas / CTRL+SHIFT+M (Nuevo mensaje) / Respuestas automáticas (Fuera de oficina)'
                        : infoSubtipo === 'teams'
                        ? 'Ej: Canal estándar vs privado vs compartido / Menciones @ / Pestañas integradas'
                        : infoSubtipo === 'power_bi'
                        ? 'Ej: CALCULATE(SUM(Tabla[Ventas])) / Columnas calculadas vs Medidas / Relaciones activas'
                        : infoSubtipo === 'atajo_teclado'
                        ? 'Ej: CTRL + SHIFT + L (Autofiltro) / ALT + F11 (Editor VBA)'
                        : infoSubtipo === 'funcion_excel'
                        ? 'Ej: BUSCARX / SI.CONJUNTO / INDICE y COINCIDIR / CONTAR.SI'
                        : infoSubtipo === 'base_datos_access'
                        ? 'Ej: Clave principal / Integridad referencial / Consulta de creación de tabla'
                        : 'Ej: Memoria RAM vs ROM / Protocolo TLS vs SSL / Dirección IPv4 vs IPv6'
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Sintaxis Oficial, Comando o Ejemplo Práctico
                  </label>
                  <input
                    type="text"
                    value={infoSintaxisOEjemplo}
                    onChange={(e) => setInfoSintaxisOEjemplo(e.target.value)}
                    placeholder={
                      infoSubtipo === 'funcion_excel'
                        ? '=BUSCARX(valor_buscado; matriz_búsqueda; matriz_devuelta; [si_no_se_encuentra])'
                        : infoSubtipo === 'power_bi'
                        ? 'CALCULATE(SUM(Ventas[Importe]); Ventas[Año] = 2026)'
                        : infoSubtipo === 'word_365'
                        ? 'CTRL + ALT + C (Símbolo de copyright ©) / Disposición > Saltos > Página siguiente'
                        : 'Ejemplo de comando, ruta de menú o sintaxis en examen'
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-cyan-800 dark:text-cyan-300 focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                    Definición, Reglas y Trampas del Tribunal en Examen C1 *
                  </label>
                  <textarea
                    rows={3}
                    value={infoExplicacion}
                    onChange={(e) => setInfoExplicacion(e.target.value)}
                    placeholder="Explica qué hace, diferencias clave (ej: CTRL+L reemplaza vs CTRL+SHIFT+L filtra) y distractor frecuente del tribunal..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-cyan-500 leading-relaxed"
                  ></textarea>
                </div>
              </div>
            )}

            {/* Selector de Leyes Relacionadas Compartido */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-500 font-mono block">
                  Leyes Relacionadas del Temario C1 ({leyesAsociadasModal.length} asignadas)
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarSelectorLeyes(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Seleccionar del catálogo
                </button>
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[38px] flex items-center flex-wrap gap-1.5">
                {leyesAsociadasModal.length > 0 ? (
                  leyesAsociadasModal.map((ley, lIdx) => (
                    <span
                      key={lIdx}
                      className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-800 dark:text-indigo-200 font-medium font-mono"
                    >
                      <span className="truncate max-w-[200px]">{ley}</span>
                      <button
                        type="button"
                        onClick={() => setLeyesAsociadasModal((prev) => prev.filter((_, i) => i !== lIdx))}
                        className="hover:text-rose-500 cursor-pointer"
                      >
                        <i className="fa-solid fa-xmark text-[9px]"></i>
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Pulsa para vincular con las leyes oficiales del BOE o informática.
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMostrarModalAnadir(false)}
                className="py-2 px-3.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNota}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-floppy-disk text-[11px]"></i>
                <span>{itemEnEdicion ? 'Actualizar Ficha' : 'Guardar en Almacén'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECTOR MULTILEY PARA NUEVA NOTA / EDICIÓN */}
      {mostrarSelectorLeyes && (
        <SelectorLeyesEInformaticaModal
          isOpen={true}
          onClose={() => setMostrarSelectorLeyes(false)}
          seleccionadasIniciales={leyesAsociadasModal}
          onGuardar={(leyes) => {
            setLeyesAsociadasModal(leyes);
            setMostrarSelectorLeyes(false);
          }}
          tituloModal="Seleccionar Leyes y Temario C1"
          subtituloModal="Vincula tu ficha a una o varias normas oficiales del BOE o materias de informática"
        />
      )}

      {/* SELECTOR MULTILEY DIRECTO DESDE LA TABLA O JUSTIFICACIÓN */}
      {itemParaSelectorLeyesDirecto && (
        <SelectorLeyesEInformaticaModal
          isOpen={true}
          onClose={() => setItemParaSelectorLeyesDirecto(null)}
          seleccionadasIniciales={
            itemParaSelectorLeyesDirecto.leyesRelacionadas &&
            itemParaSelectorLeyesDirecto.leyesRelacionadas.length > 0
              ? itemParaSelectorLeyesDirecto.leyesRelacionadas
              : itemParaSelectorLeyesDirecto.justificacionLegal?.norma &&
                !esNormaGenerica(itemParaSelectorLeyesDirecto.justificacionLegal.norma)
              ? [itemParaSelectorLeyesDirecto.justificacionLegal.norma]
              : []
          }
          onGuardar={(nuevasLeyes) => {
            const nuevaNormaPrincipal =
              nuevasLeyes.length > 0
                ? nuevasLeyes[0]
                : obtenerNormaEfectivaDePregunta({
                    ...itemParaSelectorLeyesDirecto,
                    leyesRelacionadas: [],
                    justificacionLegal: {
                      norma: '',
                      articulo: itemParaSelectorLeyesDirecto.justificacionLegal?.articulo || 'Precepto aplicable',
                      fundamento: itemParaSelectorLeyesDirecto.justificacionLegal?.fundamento || '',
                    },
                  });

            const updated = itemsDudas.map((it) => {
              if (it.id !== itemParaSelectorLeyesDirecto.id) return it;
              const justActualizada = it.justificacionLegal
                ? { ...it.justificacionLegal, norma: nuevaNormaPrincipal }
                : it.opciones && it.opciones.length > 0
                ? { norma: nuevaNormaPrincipal, articulo: 'Precepto aplicable', fundamento: '' }
                : undefined;
              return {
                ...it,
                leyesRelacionadas: nuevasLeyes,
                justificacionLegal: justActualizada,
                fechaActualizacion: new Date().toISOString(),
              };
            });
            onActualizarItems(updated);

            if (preguntaParaJustificacion && preguntaParaJustificacion.id === itemParaSelectorLeyesDirecto.id) {
              setPreguntaParaJustificacion({
                ...preguntaParaJustificacion,
                leyesRelacionadas: nuevasLeyes,
                justificacionLegal: {
                  ...(preguntaParaJustificacion.justificacionLegal || {
                    articulo: 'Precepto aplicable',
                    fundamento: '',
                  }),
                  norma: nuevaNormaPrincipal,
                },
              });
            }

            // Si es una pregunta, propagar también a bancoExamenes e historialPruebas
            if (
              onActualizarPreguntaGlobal &&
              itemParaSelectorLeyesDirecto.enunciado &&
              itemParaSelectorLeyesDirecto.opciones &&
              itemParaSelectorLeyesDirecto.opciones.length > 0
            ) {
              onActualizarPreguntaGlobal({
                id: itemParaSelectorLeyesDirecto.preguntaId || 1,
                enunciado: itemParaSelectorLeyesDirecto.enunciado,
                opciones: itemParaSelectorLeyesDirecto.opciones,
                esReserva: false,
                leyesRelacionadas: nuevasLeyes,
                justificacionLegal: {
                  ...(itemParaSelectorLeyesDirecto.justificacionLegal || {
                    articulo: 'Precepto aplicable',
                    fundamento: '',
                  }),
                  norma: nuevaNormaPrincipal,
                },
              });
            }

            setItemParaSelectorLeyesDirecto(null);
          }}
          tituloModal="Vincular Leyes y Temática al Registro"
          subtituloModal={`Selecciona las leyes o materias de informática para «${(itemParaSelectorLeyesDirecto.titulo || itemParaSelectorLeyesDirecto.enunciado).slice(0, 60)}...»`}
        />
      )}
    </div>
  );
};
