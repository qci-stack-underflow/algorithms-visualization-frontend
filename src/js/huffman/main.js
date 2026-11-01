import { calcularLayoutArbol } from './arbol/layout.js';
import { renderizarArbolSVG } from './arbol/render-svg.js';
import { ControllerZoomPan } from './arbol/zoom-pan.js';
import { generarPasosHuffman } from './arbol/pasos-huffman.js';
import { ReproductorPasos } from './reproductor/reproductor-pasos.js';
import { renderizarColaPrioridad } from './componentes/cola-prioridad.js';
import { renderizarPseudocodigo } from './componentes/pseudocodigo.js';
import { actualizarIndicadorFases, verificarMovimientoReducido, actualizarDescripcionLectorPantalla } from './componentes/accesibilidad-fases.js';

document.addEventListener('DOMContentLoaded', () => {
  const svgEl = document.getElementById('arbol-svg');
  const canvasContainer = document.getElementById('canvas-container');
  const srAnnouncer = document.getElementById('sr-announcer');

  // Escuchar los eventos globales disparados por la página (Bloque C / Sistema)
  let nodesMap = {};
  let rootId = null;
  let pasos = [];
  let positions = new Map();
  let zoomController = null;
  let reproductor = null;

  document.addEventListener('huffman-resultado', (evento) => {
    const { libro, resultado, ejemplo } = evento.detail;
    // Usar datos reales del evento o respaldo del ejemplo A1 con las cifras corregidas
    nodesMap = resultado?.nodes || ejemplo?.nodes || {};
    rootId = resultado?.rootId || ejemplo?.rootId;
    
    const frecuencias = resultado?.frequencies || { 'e': 100, 'a': 80, 'o': 60, 's': 50, 'r': 40, 'n': 30, 'd': 20, 'l': 10 };
    
    const huffmanData = generarPasosHuffman(frecuencias);
    pasos = huffmanData.pasos;
    if (!nodesMap || Object.keys(nodesMap).length === 0) {
      nodesMap = huffmanData.nodesMap;
      rootId = huffmanData.rootId;
    }

    positions = calcularLayoutArbol(nodesMap, rootId);

    if (!zoomController && svgEl && canvasContainer) {
      zoomController = new ControllerZoomPan(svgEl, canvasContainer);
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      positions.forEach(pos => {
        if (pos.x < xMin) xMin = pos.x;
        if (pos.x > xMax) xMax = pos.x;
        if (pos.y < yMin) yMin = pos.y;
        if (pos.y > yMax) yMax = pos.y;
      });
      zoomController.fitToContent({ xMin, xMax, yMin, yMax });
    }

    if (!reproductor) {
      reproductor = new ReproductorPasos({
        totalPasos: pasos.length,
        onPasoChange: (pasoIdx) => {
          const state = pasos[pasoIdx];
          if (!state) return;

          renderizarArbolSVG(svgEl, nodesMap, positions, state.visibleNodes, state.highlightedPair);
          renderizarColaPrioridad(document.getElementById('pqueue-container'), nodesMap, state.priorityQueue, state.highlightedPair);
          renderizarPseudocodigo(document.getElementById('pseudocode-container'), state.lineaPseudocodigo, state.descripcion);
          actualizarIndicadorFases(document.getElementById('fases-container'), state.fase);
          actualizarDescripcionLectorPantalla(srAnnouncer, state, pasos.length);

          const progressBar = document.getElementById('progress-bar');
          if (progressBar) progressBar.value = pasoIdx;
        },
        onPlayStateChange: (isPlaying) => {
          const btnPlay = document.getElementById('btn-play');
          if (btnPlay) btnPlay.textContent = isPlaying ? '⏸' : '▶';
        }
      });

      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.max = pasos.length - 1;
        progressBar.addEventListener('input', (e) => reproductor.goToPaso(parseInt(e.target.value, 10)));
      }

      if (verificarMovimientoReducido()) {
        reproductor.goToEnd();
      } else {
        reproductor.goToStart();
      }

      // Enlazar botones de control
      document.getElementById('btn-play')?.addEventListener('click', () => reproductor.togglePlay());
      document.getElementById('btn-prev')?.addEventListener('click', () => reproductor.previousStep());
      document.getElementById('btn-next')?.addEventListener('click', () => reproductor.nextStep());
      document.getElementById('btn-start')?.addEventListener('click', () => reproductor.goToStart());
      document.getElementById('btn-end')?.addEventListener('click', () => reproductor.goToEnd());
      document.getElementById('speed-select')?.addEventListener('change', (e) => reproductor.setSpeed(parseFloat(e.target.value)));
    } else {
      reproductor.setTotalPasos(pasos.length);
    }
  });

  // Escuchar selección de símbolos desde la tabla (C5 -> D2)
  document.addEventListener('simbolo-seleccionado', (evento) => {
    const detalle = evento.detail; // { symbol, code, nodeId } o null
    if (!svgEl || !nodesMap || positions.size === 0) return;

    let targetNodeId = detalle?.nodeId;
    if (!targetNodeId && detalle?.symbol) {
      // Buscar la hoja correspondiente al símbolo
      targetNodeId = Object.values(nodesMap).find(n => n.isLeaf && n.symbol === detalle.symbol)?.id;
    }

    // Calcular camino desde la raíz hasta el nodo hoja seleccionado
    const path = [];
    let curr = targetNodeId;
    while (curr) {
      path.push(curr);
      // Buscar padre ascendente en el mapa de nodos
      const parent = Object.values(nodesMap).find(n => n.left === curr || n.right === curr);
      curr = parent ? parent.id : null;
    }

    // Renderizar con el camino resaltado actual
    const currentState = pasos[reproductor?.currentPaso || 0] || { visibleNodes: Object.keys(nodesMap) };
    renderizarArbolSVG(svgEl, nodesMap, positions, currentState.visibleNodes, path);
  });
});