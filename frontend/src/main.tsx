import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';
import '@fontsource/roboto-mono/700.css';
import { App } from './App';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { PreferencesProvider } from './context/PreferencesContext';
import { setupTauriWindowBridge } from './services/tauriBridge';
import '../css/style.css';
import './styles/preferences.css';

setupTauriWindowBridge();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary moduleName="Aplicación Principal (IB-Cast Playout Master)">
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
