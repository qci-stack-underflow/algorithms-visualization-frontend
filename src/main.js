import { calcularLayoutArbol } from './arbol/layout.js';
import { renderizarArbolSVG } from './arbol/render-svg.js';
import { ControllerZoomPan } from './arbol/zoom-pan.js';
import { generarPasosHuffman } from './arbol/pasos-huffman.js';
import { ReproductorPasos } from './reproductor/reproductor-pasos.js';
import { renderizarColaPrioridad } from './componentes/cola-prioridad.js';
import { renderizarPseudocodigo } from './componentes/pseudocodigo.js';
import { actualizarIndicadorFases, verificarMovimientoReducido, actualizarDescripcionLectorPantalla } from './componentes/accesibilidad-fases.js';

// Frecuencias de prueba
const FRECUENCIAS_EJEMPLO = { 'e': 100, 'a': 80, 'o': 60, 's': 50, 'r': 40, 'n': 30, 'd': 20, 'l': 10 };

document.addEventListener('DOMContentLoaded', () => {
  const svgEl = document.getElementById('arbol-svg');
  const canvasContainer = document.getElementById('canvas-container');

  const { pasos, nodesMap, rootId } = generarPasosHuffman(FRECUENCIAS_EJEMPLO);
  const positions = calcularLayoutArbol(nodesMap, rootId);

  const zoomController = new ControllerZoomPan(svgEl, canvasContainer);

  // Calcular límites para fitToContent
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  positions.forEach(pos => {
    if (pos.x < xMin) xMin = pos.x;
    if (pos.x > xMax) xMax = pos.x;
    if (pos.y < yMin) yMin = pos.y;
    if (pos.y > yMax) yMax = pos.y;
  });
  zoomController.fitToContent({ xMin, xMax, yMin, yMax });

  const isReducedMotion = verificarMovimientoReducido();

  const reproductor = new ReproductorPasos({
    totalPasos: pasos.length,
    onPasoChange: (pasoIdx) => {
      const state = pasos[pasoIdx];

      renderizarArbolSVG(svgEl, nodesMap, positions, state.visibleNodes, state.highlightedPair);
      renderizarColaPrioridad(document.getElementById('pqueue-container'), nodesMap, state.priorityQueue, state.highlightedPair);
      renderizarPseudocodigo(document.getElementById('pseudocode-container'), state.lineaPseudocodigo, state.descripcion);
      actualizarIndicadorFases(document.getElementById('fases-container'), state.fase);
      actualizarDescripcionLectorPantalla(document.getElementById('sr-announcer'), state, pasos.length);

      document.getElementById('progress-bar').value = pasoIdx;
    },
    onPlayStateChange: (isPlaying) => {
      document.getElementById('btn-play').textContent = isPlaying ? '⏸' : '▶';
    }
  });

  const progressBar = document.getElementById('progress-bar');
  progressBar.max = pasos.length - 1;

  if (isReducedMotion) {
    reproductor.goToEnd();
  } else {
    reproductor.goToStart();
  }

  // Event Listeners Controles
  document.getElementById('btn-play').addEventListener('click', () => reproductor.togglePlay());
  document.getElementById('btn-prev').addEventListener('click', () => reproductor.previousStep());
  document.getElementById('btn-next').addEventListener('click', () => reproductor.nextStep());
  document.getElementById('btn-start').addEventListener('click', () => reproductor.goToStart());
  document.getElementById('btn-end').addEventListener('click', () => reproductor.goToEnd());

  progressBar.addEventListener('input', (e) => reproductor.goToPaso(parseInt(e.target.value, 10)));
  document.getElementById('speed-select').addEventListener('change', (e) => reproductor.setSpeed(parseFloat(e.target.value)));
});
