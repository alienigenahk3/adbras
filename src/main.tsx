import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dynamic UI Updater based on church settings
const updatePWAManifest = () => {
  let churchName = 'Comunidade Cristã ICTUS';
  let churchLogo = '/icon-192.png';

  try {
    const stored = localStorage.getItem('church_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.name && parsed.name.trim() !== '') {
        churchName = parsed.name;
      }
      if (parsed.logoUrl) {
        churchLogo = parsed.logoUrl;
      }
    }
  } catch (err) {
    console.error('Error reading church settings:', err);
  }

  // Update DOM titles
  document.title = churchName;
  
  // Update theme-color meta tag
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', '#2563eb');
  }

  // Update apple-mobile-web-app-title
  const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitleMeta) {
    appleTitleMeta.setAttribute('content', churchName);
  }

  // Update favicons and apple-touch-icon
  const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
  if (appleTouchIcon) appleTouchIcon.href = churchLogo;

  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (favicon) favicon.href = churchLogo;
};

// Set on window so other components can call it on update
(window as any).updatePWAManifest = updatePWAManifest;

// Run on startup
updatePWAManifest();

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we are running inside an iframe (like the AI Studio preview window)
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch (e) {
      isInIframe = true;
    }

    if (isInIframe) {
      console.info('[App] Registro do Service Worker pulado: O aplicativo está rodando dentro de um iframe. Abra o aplicativo em uma nova aba para registrar o Service Worker (PWA) com suporte offline completo.');
      return;
    }

    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[App] Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.error('[App] Falha ao registrar o Service Worker:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
