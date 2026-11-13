import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos.css';
import { Aplicacao } from './nucleo/Aplicacao.tsx';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
