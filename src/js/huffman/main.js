// src/js/huffman/main.js
import { calcularLayoutArbol } from './arbol/layout.js';
import { renderizarArbolSVG } from './arbol/render-svg.js';
import { ControllerZoomPan } from './arbol/zoom-pan.js';
import { ReproductorPasos } from './reproductor/reproductor-pasos.js';
import { renderizarColaPrioridad } from './componentes/cola-prioridad.js';
import { renderizarPseudocodigo } from './componentes/pseudocodigo.js';
import { actualizarIndicadorFases, verificarMovimientoReducido, actualizarDescripcionLectorPantalla } from './componentes/accesibilidad-fases.js';
import { obtenerHuffman } from '../api.js';
import ejemploQuijote from './ejemplo-quijote.json';

export function iniciarHuffmanProceso() {
  const svgEl = document.querySelector('.arbol-svg');
  const canvasContainer = document.getElementById('canvas-container');
  const srAnnouncer = document.getElementById('sr-announcer');
  const arbolNotaEl = document.querySelector('.arbol-nota');

  if (!svgEl) return;

  let nodesMap = {};
  let rootId = null;
  let pasosProgresivos = [];
  let positions = new Map();
  let reproductor = null;
  let zoomPanController = null;

  function procesarDatosHuffman(datosLibro) {
    const rawNodes = datosLibro?.nodes || [];
    rootId = datosLibro?.rootId;
    
    nodesMap = {};
    rawNodes.forEach(node => {
      nodesMap[node.id] = node;
    });

    const rawSteps = datosLibro?.steps || [];
    
    let nodosAcumulados = new Set();
    pasosProgresivos = rawSteps.map((step, index) => {
      if (step.nodeId !== undefined) nodosAcumulados.add(String(step.nodeId));
      if (step.leftId !== undefined) nodosAcumulados.add(String(step.leftId));
      if (step.rightId !== undefined) nodosAcumulados.add(String(step.rightId));
      if (step.parentId !== undefined) nodosAcumulados.add(String(step.parentId));

      let highlighted = [];
      if (step.leftId !== undefined && step.rightId !== undefined) {
        highlighted = [String(step.leftId), String(step.rightId)];
      } else if (step.nodeId !== undefined) {
        highlighted = [String(step.nodeId)];
      }

      let lineaAsignada = 3;
      if (step.type === 'extract-min') {
        const esPrimeraExtraccion = index === 0 || rawSteps[index - 1].type !== 'extract-min';
        lineaAsignada = esPrimeraExtraccion ? 4 : 5;
      } else if (step.type === 'merge') {
        const esInsercion = index > 0 && rawSteps[index - 1].type === 'merge';
        lineaAsignada = esInsercion ? 6 : 7; 
      } else if (step.type === 'assign-code' || index >= rawSteps.length - 2) {
        lineaAsignada = 9;
      }

      let descripcionPaso = step.description;
      if (step.type === 'merge' && step.leftId !== undefined && step.rightId !== undefined) {
        const leftNode = nodesMap[step.leftId];
        const rightNode = nodesMap[step.rightId];
        const parentNode = nodesMap[step.parentId];
        if (leftNode && rightNode && parentNode) {
          descripcionPaso = `Une ${leftNode.weight} + ${rightNode.weight} = ${parentNode.weight}`;
        }
      }

      return {
        visibleNodes: Array.from(nodosAcumulados),
        highlightedPair: highlighted,
        lineaPseudocodigo: lineaAsignada,
        descripcion: descripcionPaso || `Paso ${index + 1}`
      };
    });

    if (pasosProgresivos.length === 0) {
      const allIds = Object.keys(nodesMap);
      pasosProgresivos = allIds.map((id, idx) => ({
        visibleNodes: allIds.slice(0, idx + 1),
        highlightedPair: [id],
        lineaPseudocodigo: 3,
        descripcion: `Construyendo nodo ${id}`
      }));
    }

    positions = calcularLayoutArbol(nodesMap, rootId);

    // Inicializar controlador de Zoom y Pan y ajustar al contenido total
    if (svgEl && canvasContainer && !zoomPanController) {
      zoomPanController = new ControllerZoomPan(svgEl, canvasContainer);

      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      positions.forEach(pos => {
        if (pos.x < xMin) xMin = pos.x;
        if (pos.x > xMax) xMax = pos.x;
        if (pos.y < yMin) yMin = pos.y;
        if (pos.y > yMax) yMax = pos.y;
      });
      zoomPanController.fitToContent({ xMin, xMax, yMin, yMax });

      const btnZoomIn = document.getElementById('btn-zoom-in');
      const btnZoomOut = document.getElementById('btn-zoom-out');
      const btnZoomFit = document.getElementById('btn-zoom-fit');

      if (btnZoomIn && !btnZoomIn.dataset.bound) {
        btnZoomIn.dataset.bound = "true";
        btnZoomIn.addEventListener('click', (e) => {
          e.preventDefault();
          zoomPanController.zoomIn();
        });
      }

      if (btnZoomOut && !btnZoomOut.dataset.bound) {
        btnZoomOut.dataset.bound = "true";
        btnZoomOut.addEventListener('click', (e) => {
          e.preventDefault();
          zoomPanController.zoomOut();
        });
      }

      if (btnZoomFit && !btnZoomFit.dataset.bound) {
        btnZoomFit.dataset.bound = "true";
        btnZoomFit.addEventListener('click', (e) => {
          e.preventDefault();
          zoomPanController.fitToContent();
        });
      }
    }

    if (!reproductor) {
      reproductor = new ReproductorPasos({
        totalPasos: pasosProgresivos.length,
        onPasoChange: (pasoIdx) => {
          const state = pasosProgresivos[pasoIdx];
          if (!state) return;

          // 1. Renderizar Árbol SVG
          renderizarArbolSVG(svgEl, nodesMap, positions, state.visibleNodes, state.highlightedPair);
          
          // 2. Enfoque automático síncrono sobre el nodo activo
          if (zoomPanController && state.highlightedPair && state.highlightedPair.length > 0) {
            const targetId = state.highlightedPair[state.highlightedPair.length - 1];
            const pos = positions.get(String(targetId)) || positions.get(targetId);
            if (pos) {
              zoomPanController.centerOn(pos.x, pos.y);
            }
          }

          // 3. Renderizar Pseudocódigo sincronizado
          if (state.lineaPseudocodigo !== undefined) {
            renderizarPseudocodigo(document.querySelector('.code-panel'), state.lineaPseudocodigo, state.descripcion);
          }
          
          // 4. Renderizar Cola de Prioridad
          const contenedorCola = document.getElementById('cola-prioridad-container');
          if (contenedorCola) {
            let colaSimulada = Object.values(nodesMap)
              .filter(n => n.isLeaf)
              .map(n => ({ id: String(n.id), symbol: n.symbol, weight: n.weight }));

            for (let i = 0; i <= pasoIdx && i < rawSteps.length; i++) {
              const step = rawSteps[i];
              if (step.type === 'merge' && step.leftId !== undefined && step.rightId !== undefined) {
                const leftStr = String(step.leftId);
                const rightStr = String(step.rightId);
                
                colaSimulada = colaSimulada.filter(n => n.id !== leftStr && n.id !== rightStr);
                
                if (nodesMap[step.parentId]) {
                  const pNode = nodesMap[step.parentId];
                  colaSimulada.push({
                    id: String(pNode.id),
                    symbol: pNode.symbol || null,
                    weight: pNode.weight
                  });
                }
              }
            }

            renderizarColaPrioridad(contenedorCola, colaSimulada, state.highlightedPair);
          }

          actualizarDescripcionLectorPantalla(srAnnouncer, state, pasosProgresivos.length);

          if (srAnnouncer) {
            srAnnouncer.textContent = `${pasoIdx + 1} / ${pasosProgresivos.length}`;
          }
          if (arbolNotaEl) {
            arbolNotaEl.innerHTML = `Construcción dinámica · Paso ${pasoIdx + 1} de ${pasosProgresivos.length} · ${state.descripcion}`;
          }

          const progressBar = document.getElementById('progress-bar');
          if (progressBar) {
            progressBar.max = Math.max(0, pasosProgresivos.length - 1);
            progressBar.value = pasoIdx;
          }
        },
        onPlayStateChange: (isPlaying) => {
          const btnPlay = document.getElementById('btn-play');
          if (btnPlay) btnPlay.textContent = isPlaying ? '⏸' : '▶';
        }
      });

      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.addEventListener('input', (e) => reproductor.goToPaso(parseInt(e.target.value, 10)));
      }

      if (verificarMovimientoReducido()) {
        reproductor.goToEnd();
      } else {
        reproductor.goToStart();
      }

      document.getElementById('btn-play')?.addEventListener('click', () => reproductor.togglePlay());
      document.getElementById('btn-prev')?.addEventListener('click', () => reproductor.previousStep());
      document.getElementById('btn-next')?.addEventListener('click', () => reproductor.nextStep());
      document.getElementById('btn-start')?.addEventListener('click', () => reproductor.goToStart());
      document.getElementById('btn-end')?.addEventListener('click', () => reproductor.goToEnd());
      document.getElementById('speed-select')?.addEventListener('change', (e) => reproductor.setSpeed(parseFloat(e.target.value)));
    } else {
      reproductor.setTotalPasos(pasosProgresivos.length);
    }
  }

  document.addEventListener('huffman-resultado', (evento) => {
    const { resultado, ejemplo } = evento.detail;
    procesarDatosHuffman(resultado || ejemplo || {});
  });

  document.addEventListener('simbolo-seleccionado', (evento) => {
    const detalle = evento.detail;
    if (!svgEl || !nodesMap || positions.size === 0) return;

    let targetNodeId = detalle?.nodeId;
    if (!targetNodeId && detalle?.symbol) {
      targetNodeId = Object.values(nodesMap).find(n => n.isLeaf && n.symbol === detalle.symbol)?.id;
    }

    const path = [];
    let curr = targetNodeId;
    while (curr) {
      path.push(curr);
      const parent = Object.values(nodesMap).find(n => n.left === curr || n.right === curr);
      curr = parent ? parent.id : null;
    }

    const currentState = pasosProgresivos[reproductor?.currentPaso || 0] || { visibleNodes: Object.keys(nodesMap) };
    renderizarArbolSVG(svgEl, nodesMap, positions, currentState.visibleNodes, path);
  });

  procesarDatosHuffman(ejemploQuijote);

  obtenerHuffman(2000).then((resultado) => {
    if (resultado) procesarDatosHuffman(resultado);
  }).catch(() => {});
}