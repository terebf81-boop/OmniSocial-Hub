import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
  navigator.serviceWorker
    .register(swUrl, {scope: '/', updateViaCache: 'none'})
    .then((registration) => {
      void registration.update();
    })
    .catch(() => {
      // Service worker registration skipped in unsupported context
    });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
