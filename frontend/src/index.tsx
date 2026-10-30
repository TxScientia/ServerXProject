import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initTheme } from './theme';
import { applyAccentHue, getAccentHue } from './accentHue';
import App from './App';

initTheme();
applyAccentHue(getAccentHue());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
