import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { PreferencesProvider } from './context/PreferencesContext';
import { setupTauriWindowBridge } from './services/tauriBridge';
import '../css/style.css';
import './styles/preferences.css';
import './styles/aurora.css';

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
