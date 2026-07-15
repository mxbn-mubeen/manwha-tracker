import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Providers } from './providers';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
