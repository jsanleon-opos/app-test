import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  private handleLimpiarYReiniciar = () => {
    try {
      localStorage.removeItem('c1_active_exam_session');
    } catch (_) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReintentar = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Se ha detectado una anomalía al iniciar la prueba
              </h1>
              <p className="text-sm text-slate-300">
                La aplicación ha prevenido el bloqueo de la pantalla. Puedes reiniciar la sesión de forma limpia manteniendo todos tus exámenes e historial guardados.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                  Detalle del error
                </span>
                <p className="text-xs font-mono text-rose-400 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleLimpiarYReiniciar}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rotate-right"></i>
                <span>Reiniciar Sesión Limpia</span>
              </button>

              <button
                type="button"
                onClick={this.handleReintentar}
                className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-arrow-rotate-left"></i>
                <span>Reintentar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
