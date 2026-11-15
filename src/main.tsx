import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { inicializarAlmacenamientoPersistenteIDB } from './utils/idbPersistentStore.ts';
import './index.css';

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

// Hidratar automáticamente desde IndexedDB antes de montar la aplicación para cargar
// todos los exámenes, preguntas, historial, dudas y biblioteca de forma instantánea
Promise.race([
  inicializarAlmacenamientoPersistenteIDB(),
  new Promise((resolve) => setTimeout(resolve, 2500)),
]).finally(() => {
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
});
