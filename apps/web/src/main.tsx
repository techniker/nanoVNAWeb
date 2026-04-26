import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './app.css';

const rootEl = document.getElementById('root');
if (rootEl === null) {
  throw new Error('Root element #root not found in document');
}
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
