// src/js/huffman/main.js
import { calcularLayoutArbol, limitesDePosiciones } from './arbol/layout.js';
import { renderizarArbolSVG } from './arbol/render-svg.js';
import { ControllerZoomPan } from './arbol/zoom-pan.js';
import { ReproductorPasos } from './reproductor/reproductor-pasos.js';
import { renderizarColaPrioridad } from './componentes/cola-prioridad.js';
import { renderizarPseudocodigo } from './componentes/pseudocodigo.js';
import { actualizarIndicadorFases, verificarMovimientoReducido, actualizarDescripcionLectorPantalla } from './componentes/accesibilidad-fases.js';
import { Pause, Play, createElement } from 'lucide';

export function iniciarHuffmanProceso() {
  const svgEl = document.querySelector('#proceso .arbol-svg');
  const canvasContainer = document.getElementById('canvas-container');
  const srAnnouncer = document.getElementById('sr-announcer');
  const arbolNotaEl = document.querySelector('#proceso .arbol-nota');

  if (!svgEl) return;

  let nodesMap = {};
  let rawSteps = [];
  let resultadoActual = null;
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

    rawSteps = datosLibro?.steps || [];
    
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

    // Inicializar controlador de Zoom y Pan una sola vez, y ajustar al árbol
    // de cada libro (cada árbol tiene otro tamaño)
    if (svgEl && canvasContainer && !zoomPanController) {
      zoomPanController = new ControllerZoomPan(svgEl, canvasContainer);

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

    const limites = limitesDePosiciones(positions);
    if (zoomPanController && limites) zoomPanController.fitToContent(limites);

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

          // textContent y no innerHTML: la descripción trae símbolos del
          // texto (por ejemplo "<" o "&") que no deben leerse como HTML
          actualizarDescripcionLectorPantalla(arbolNotaEl, state, pasosProgresivos.length, pasoIdx);

          const contador = `${pasoIdx + 1} / ${pasosProgresivos.length}`;
          if (srAnnouncer) srAnnouncer.textContent = contador;
          const contadorCodigo = document.querySelector('#proceso .code-panel-counter');
          if (contadorCodigo) contadorCodigo.textContent = contador;

          const progressBar = document.getElementById('progress-bar');
          if (progressBar) {
            progressBar.max = Math.max(0, pasosProgresivos.length - 1);
            progressBar.value = pasoIdx;
          }
        },
        onPlayStateChange: (isPlaying) => {
          const btnPlay = document.getElementById('btn-play');
          if (!btnPlay) return;
          btnPlay.replaceChildren(createElement(isPlaying ? Pause : Play));
          btnPlay.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
        }
      });

      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.addEventListener('input', (e) => reproductor.goToPaso(parseInt(e.target.value, 10)));
      }

      document.getElementById('btn-play')?.addEventListener('click', () => reproductor.togglePlay());
      document.getElementById('btn-prev')?.addEventListener('click', () => reproductor.previousStep());
      document.getElementById('btn-next')?.addEventListener('click', () => reproductor.nextStep());
      document.getElementById('btn-start')?.addEventListener('click', () => reproductor.goToStart());
      document.getElementById('btn-end')?.addEventListener('click', () => reproductor.goToEnd());

      const velocidades = document.querySelectorAll('.velocidades [data-velocidad]');
      velocidades.forEach((boton) => {
        boton.addEventListener('click', () => {
          reproductor.setSpeed(parseFloat(boton.dataset.velocidad));
          velocidades.forEach((otro) => {
            const activa = otro === boton;
            otro.classList.toggle('is-activa', activa);
            otro.setAttribute('aria-checked', String(activa));
          });
        });
      });
    } else {
      reproductor.pause();
      reproductor.setTotalPasos(pasosProgresivos.length);
    }

    // Cada libro empieza desde el primer paso, o ya construido si se pidió
    // menos movimiento
    if (verificarMovimientoReducido()) {
      reproductor.goToEnd();
    } else {
      reproductor.goToStart();
    }
  }

  // navegacion.js avisa cada vez que se abre el proceso o el binario de un
  // libro, con datos del backend o de ejemplo. Si el resultado es el mismo
  // objeto de antes, se conserva el paso en el que iba.
  document.addEventListener('huffman-resultado', (evento) => {
    const { resultado } = evento.detail;
    if (!resultado || resultado === resultadoActual) return;
    resultadoActual = resultado;
    procesarDatosHuffman(resultado);
  });

  document.addEventListener('simbolo-seleccionado', (evento) => {
    const detalle = evento.detail;
    if (!svgEl || !nodesMap || positions.size === 0) return;

    let targetNodeId = detalle?.nodeId;
    if (targetNodeId == null && detalle?.symbol) {
      targetNodeId = Object.values(nodesMap).find(n => n.isLeaf && n.symbol === detalle.symbol)?.id;
    }

    const path = [];
    let curr = targetNodeId;
    while (curr != null) {
      path.push(curr);
      const parent = Object.values(nodesMap).find(n => n.left === curr || n.right === curr);
      curr = parent ? parent.id : null;
    }

    const currentState = pasosProgresivos[reproductor?.currentPaso || 0] || { visibleNodes: Object.keys(nodesMap) };
    renderizarArbolSVG(svgEl, nodesMap, positions, currentState.visibleNodes, path);
  });

}
