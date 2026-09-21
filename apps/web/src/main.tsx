import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import App from './App';
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
