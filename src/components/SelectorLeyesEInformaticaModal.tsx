import React, { useState, useMemo } from 'react';
import {
  CATALOGO_PRUEBAS_OFICIALES_C1,
  CATALOGO_LEGISLACION_C1_AGE,
  CATALOGO_INFORMATICA_C1_AGE,
  TEMAS_INFORMATICA_8_AGE,
  GRUPOS_CATALOGO_C1,
  ItemNormativaOTemario,
} from '../constants/temarioLegislacionEInformatica';
import {
  esCatalogacionPruebaOficial,
  ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL,
  ETIQUETA_CATALOGACION_TEST_OFICIAL,
  normalizarNombreLey,
} from '../utils/tematicaClassifier';

interface SelectorLeyesEInformaticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  seleccionadasIniciales: string[];
  onGuardar: (nuevasLeyes: string[]) => void;
  tituloModal?: string;
  subtituloModal?: string;
}

export const SelectorLeyesEInformaticaModal: React.FC<SelectorLeyesEInformaticaModalProps> = ({
  isOpen,
  onClose,
  seleccionadasIniciales,
  onGuardar,
  tituloModal = 'Catalogar Test: Test/Supuesto Oficial, Legislación BOE o Temas de Informática',
  subtituloModal = 'Cataloga como Test oficial o Supuesto oficial (para separarlo de las búsquedas por leyes/temas) o marca las leyes y temas concretos',
}) => {
  const [seleccionadas, setSeleccionadas] = useState<string[]>(seleccionadasIniciales || []);
  const [busqueda, setBusqueda] = useState('');
  const [tabFiltro, setTabFiltro] = useState<
    'todas' | 'prueba_oficial' | 'legislacion_age' | 'informatica_c1'
  >('todas');

  // Sincronizar estado cuando se abre con nuevas seleccionadas
  React.useEffect(() => {
    if (isOpen) {
      setSeleccionadas(seleccionadasIniciales || []);
      setBusqueda('');
      setTabFiltro('todas');
    }
  }, [isOpen, seleccionadasIniciales]);

  const toggleSeleccion = (nombreOItem: string) => {
    setSeleccionadas((prev) => {
      const normObjetivo = normalizarNombreLey(nombreOItem);
      const esPruebaOficialTarget = esCatalogacionPruebaOficial(nombreOItem) || esCatalogacionPruebaOficial(normObjetivo);

      const existe = prev.some((s) => {
        const normS = normalizarNombreLey(s);
        return (
          s.toLowerCase() === nombreOItem.toLowerCase() ||
          nombreOItem.toLowerCase().includes(s.toLowerCase()) ||
          (Boolean(normObjetivo) && normS === normObjetivo)
        );
      });

      if (existe) {
        return prev.filter((s) => {
          const normS = normalizarNombreLey(s);
          return (
            s.toLowerCase() !== nombreOItem.toLowerCase() &&
            !nombreOItem.toLowerCase().includes(s.toLowerCase()) &&
            (!normObjetivo || normS !== normObjetivo)
          );
        });
      } else {
        // Si selecciona "Test oficial" o "Supuesto oficial", queda catalogado exclusivamente como tal
        // (sin leyes/temas individuales para que el buscador no lo mezcle al buscar por leyes o al contrario).
        if (esPruebaOficialTarget) {
          return [normObjetivo || nombreOItem];
        }
        // Si selecciona una Ley BOE o Tema de Informática, limpiar cualquier etiqueta previa de "Test oficial" o "Supuesto oficial"
        const sinPruebasOficiales = prev.filter(
          (s) => !esCatalogacionPruebaOficial(s) && !esCatalogacionPruebaOficial(normalizarNombreLey(s))
        );
        return [...sinPruebasOficiales, nombreOItem];
      }
    });
  };

  const estaSeleccionado = (item: ItemNormativaOTemario): boolean => {
    const normItem = normalizarNombreLey(item.nombre);
    return seleccionadas.some((s) => {
      const normS = normalizarNombreLey(s);
      return (
        s.toLowerCase() === item.nombre.toLowerCase() ||
        s.toLowerCase() === item.sigla.toLowerCase() ||
        item.nombre.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(item.sigla.toLowerCase()) ||
        (Boolean(normItem) && normS === normItem)
      );
    });
  };

  const catalogarExclusivamenteComoTestOficial = () => {
    setSeleccionadas([ETIQUETA_CATALOGACION_TEST_OFICIAL]);
  };

  const catalogarExclusivamenteComoSupuestoOficial = () => {
    setSeleccionadas([ETIQUETA_CATALOGACION_SUPUESTO_OFICIAL]);
  };

  const seleccionar8TemasInformaticaAGE = () => {
    const nombres8AGE = TEMAS_INFORMATICA_8_AGE.map((i) => i.nombre);
    setSeleccionadas((prev) => {
      const sinOficiales = prev.filter(
        (s) => !esCatalogacionPruebaOficial(s) && !esCatalogacionPruebaOficial(normalizarNombreLey(s))
      );
      return Array.from(new Set([...sinOficiales, ...nombres8AGE]));
    });
  };

  const seleccionarTodoInformatica = () => {
    const nombresInfo = CATALOGO_INFORMATICA_C1_AGE.map((i) => i.nombre);
    setSeleccionadas((prev) => {
      const sinOficiales = prev.filter(
        (s) => !esCatalogacionPruebaOficial(s) && !esCatalogacionPruebaOficial(normalizarNombreLey(s))
      );
      return Array.from(new Set([...sinOficiales, ...nombresInfo]));
    });
  };

  const seleccionarLeyesPrincipalesC1 = () => {
    const principales = [
      'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas (LPACAP)',
      'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (LRJSP)',
      'Real Decreto Legislativo 5/2015: Texto Refundido de la Ley del Estatuto Básico del Empleado Público (TREBEP)',
      'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)',
      'Constitución Española de 1978',
      'Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP)',
      'Ley 47/2003, de 26 de noviembre, General Presupuestaria (LGP)',
      'Real Decreto 364/1995, de 10 de marzo: Reglamento General de Ingreso y Provisión de Puestos de Trabajo de la AGE',
      'Real Decreto 365/1995, de 10 de marzo: Reglamento de Situaciones Administrativas de los Funcionarios Civiles de la AGE',
    ];
    setSeleccionadas((prev) => {
      const sinOficiales = prev.filter(
        (s) => !esCatalogacionPruebaOficial(s) && !esCatalogacionPruebaOficial(normalizarNombreLey(s))
      );
      return Array.from(new Set([...sinOficiales, ...principales]));
    });
  };

  const deseleccionarTodo = () => {
    setSeleccionadas([]);
  };

  // Filtrado de items
  const itemsFiltrados = useMemo(() => {
    let grupos = GRUPOS_CATALOGO_C1;

    if (tabFiltro !== 'todas') {
      grupos = grupos.filter((g) => g.tipo === tabFiltro);
    }

    const term = busqueda.toLowerCase().trim();

    return grupos.map((g) => {
      let filteredItems = g.items;
      if (term) {
        filteredItems = filteredItems.filter(
          (item) =>
            item.nombre.toLowerCase().includes(term) ||
            item.sigla.toLowerCase().includes(term) ||
            item.grupo.toLowerCase().includes(term) ||
            item.descripcionBreve.toLowerCase().includes(term)
        );
      }
      return {
        ...g,
        items: filteredItems,
      };
    });
  }, [busqueda, tabFiltro]);

  const conteoSeleccionadasOficiales = useMemo(() => {
    return CATALOGO_PRUEBAS_OFICIALES_C1.filter((p) => estaSeleccionado(p)).length;
  }, [seleccionadas]);

  const conteoSeleccionadasLeyes = useMemo(() => {
    return CATALOGO_LEGISLACION_C1_AGE.filter((l) => estaSeleccionado(l)).length;
  }, [seleccionadas]);

  const conteoSeleccionadasInformatica = useMemo(() => {
    return CATALOGO_INFORMATICA_C1_AGE.filter((i) => estaSeleccionado(i)).length;
  }, [seleccionadas]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                {tituloModal}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtituloModal}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros de Categoría */}
        <div className="py-3 space-y-2.5 border-b border-slate-100 dark:border-slate-700/80">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar Test oficial, Supuesto oficial, norma BOE (LPACAP, TREBEP, 2/2012...) o tema de informática..."
              className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Tabs y Acciones Rápidas */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setTabFiltro('todas')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tabFiltro === 'todas'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todo (
                {CATALOGO_PRUEBAS_OFICIALES_C1.length +
                  CATALOGO_LEGISLACION_C1_AGE.length +
                  CATALOGO_INFORMATICA_C1_AGE.length}
                )
              </button>
              <button
                type="button"
                onClick={() => setTabFiltro('prueba_oficial')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  tabFiltro === 'prueba_oficial'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                <i className="fa-solid fa-landmark-flag text-[10px]"></i>
                <span>
                  Test / Supuesto Oficial ({conteoSeleccionadasOficiales}/{CATALOGO_PRUEBAS_OFICIALES_C1.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTabFiltro('legislacion_age')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  tabFiltro === 'legislacion_age'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-scale-balanced text-[10px]"></i>
                <span>Legislación C1 ({conteoSeleccionadasLeyes}/{CATALOGO_LEGISLACION_C1_AGE.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTabFiltro('informatica_c1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  tabFiltro === 'informatica_c1'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-laptop-code text-[10px]"></i>
                <span>Informática 8 AGE + 2 CAM ({conteoSeleccionadasInformatica}/{CATALOGO_INFORMATICA_C1_AGE.length})</span>
              </button>
            </div>

            {/* Accesos rápidos de selección múltiple */}
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
              <button
                type="button"
                onClick={catalogarExclusivamenteComoTestOficial}
                className="text-indigo-600 dark:text-indigo-400 hover:underline decoration-dotted cursor-pointer font-black"
                title="Catalogar exclusivamente como Test oficial (no se incluirá al buscar por leyes o temas)"
              >
                Solo Test oficial
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={catalogarExclusivamenteComoSupuestoOficial}
                className="text-amber-600 dark:text-amber-400 hover:underline decoration-dotted cursor-pointer font-black"
                title="Catalogar exclusivamente como Supuesto oficial (no se incluirá al buscar por leyes o temas)"
              >
                Solo Supuesto oficial
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={seleccionarLeyesPrincipalesC1}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-dotted cursor-pointer"
                title="Seleccionar normas nucleares: 39/2015, 40/2015, TREBEP, Contratos, Presupuestos, etc."
              >
                Leyes Nucleares
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={seleccionar8TemasInformaticaAGE}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-dotted cursor-pointer"
                title="Seleccionar los 8 temas oficiales de Informática de la AGE"
              >
                8 Temas Info AGE
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={seleccionarTodoInformatica}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-dotted cursor-pointer"
                title="Seleccionar los 8 temas de la AGE + los 2 temas adicionales de la CAM"
              >
                10 Temas Info (AGE+CAM)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={deseleccionarTodo}
                className="hover:text-rose-600 dark:hover:text-rose-400 underline decoration-dotted cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Legislación y Temas de Informática (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {itemsFiltrados.map((grupo) => {
            if (grupo.items.length === 0) return null;
            return (
              <div key={grupo.tipo} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="flex items-center gap-1.5">
                    <i className={`fa-solid ${grupo.icono} text-indigo-600 dark:text-indigo-400`}></i>
                    <span>{grupo.titulo}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {grupo.items.length} opciones
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grupo.items.map((item) => {
                    const selected = estaSeleccionado(item);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSeleccion(item.nombre)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          selected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-2xs ring-1 ring-indigo-400/30'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {}} // Manejado por el contenedor
                          className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span
                              className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                selected
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {item.sigla}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium truncate">
                              {item.grupo}
                            </span>
                          </div>

                          <div
                            className={`text-xs font-bold leading-tight ${
                              selected ? 'text-indigo-950 dark:text-indigo-100 font-black' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {item.nombre}
                          </div>

                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                            {item.descripcionBreve}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {itemsFiltrados.every((g) => g.items.length === 0) && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <i className="fa-solid fa-magnifying-glass text-2xl mb-2 text-slate-300 dark:text-slate-600"></i>
              <p>No se encontraron leyes o temas que coincidan con "{busqueda}".</p>
            </div>
          )}
        </div>

        {/* Resumen de elementos seleccionados (Chips) */}
        {seleccionadas.length > 0 && (
          <div className="py-2 border-t border-slate-100 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              <span>Seleccionados ({seleccionadas.length}):</span>
              <button
                type="button"
                onClick={deseleccionarTodo}
                className="text-[10px] text-rose-500 hover:underline cursor-pointer"
              >
                Limpiar todos
              </button>
            </div>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
              {seleccionadas.map((sel, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-800 dark:text-indigo-200 font-medium"
                >
                  <span className="truncate max-w-[200px]">{sel}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSeleccion(sel);
                    }}
                    className="hover:text-rose-500 p-0.5 cursor-pointer shrink-0"
                  >
                    <i className="fa-solid fa-xmark text-[9px]"></i>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pie del Modal con Botones */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/80 gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            <strong className="text-indigo-600 dark:text-indigo-400">{seleccionadas.length}</strong> elementos asignados
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  onGuardar(seleccionadas);
                } catch (e) {
                  console.error('Error al guardar selección de leyes/informática:', e);
                } finally {
                  onClose();
                }
              }}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-check text-[11px]"></i>
              <span>Confirmar y Guardar Asignación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
