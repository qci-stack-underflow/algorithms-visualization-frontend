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

      return {
        visibleNodes: Array.from(nodosAcumulados),
        highlightedPair: highlighted,
        lineaPseudocodigo: step.line || 1,
        descripcion: step.description || `Paso ${index + 1}`
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

    // =========================================================================
    // CONTROLADOR NATIVO UNIFICADO: ZOOM (RUEDA Y BOTONES CENTRADOS) + PAN
    // =========================================================================
    if (svgEl && canvasContainer) {
      const viewBoxBase = { x: 0, y: 0, w: 760, h: 330 };
      let currentScale = 1;
      let currentX = 0;
      let currentY = 0;
      let isDragging = false;
      let startX = 0;
      let startY = 0;

      function actualizarViewBox() {
        const w = viewBoxBase.w / currentScale;
        const h = viewBoxBase.h / currentScale;
        const x = viewBoxBase.x + currentX;
        const y = viewBoxBase.y + currentY;
        svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      }

      function aplicarZoomHacia(targetScale, targetX = null, targetY = null) {
        const newScale = Math.min(Math.max(targetScale, 0.5), 5);
        const rect = canvasContainer.getBoundingClientRect();
        
        const centerX = targetX !== null ? targetX : rect.width / 2;
        const centerY = targetY !== null ? targetY : rect.height / 2;

        const viewBoxW = viewBoxBase.w / currentScale;
        const viewBoxH = viewBoxBase.h / currentScale;

        const svgX = viewBoxBase.x + currentX + (centerX / rect.width) * viewBoxW;
        const svgY = viewBoxBase.y + currentY + (centerY / rect.height) * viewBoxH;

        currentScale = newScale;

        const newViewBoxW = viewBoxBase.w / currentScale;
        const newViewBoxH = viewBoxBase.h / currentScale;

        currentX = svgX - (centerX / rect.width) * newViewBoxW - viewBoxBase.x;
        currentY = svgY - (centerY / rect.height) * newViewBoxH - viewBoxBase.y;

        actualizarViewBox();
      }

      // 1. Zoom con la rueda del ratón
      canvasContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
        const rect = canvasContainer.getBoundingClientRect();
        aplicarZoomHacia(currentScale * zoomFactor, e.clientX - rect.left, e.clientY - rect.top);
      }, { passive: false });

      // 2. Arrastre fluido (Pan) con el ratón
      canvasContainer.style.cursor = 'grab';

      canvasContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        canvasContainer.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = canvasContainer.getBoundingClientRect();
        const dx = (e.clientX - startX) * ((viewBoxBase.w / currentScale) / rect.width);
        const dy = (e.clientY - startY) * ((viewBoxBase.h / currentScale) / rect.height);

        currentX -= dx;
        currentY -= dy;
        startX = e.clientX;
        startY = e.clientY;

        actualizarViewBox();
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          canvasContainer.style.cursor = 'grab';
        }
      });

      // 3. Botones superiores con factor de escala preciso y sin saltos
      const btnZoomIn = document.getElementById('btn-zoom-in');
      const btnZoomOut = document.getElementById('btn-zoom-out');
      const btnZoomFit = document.getElementById('btn-zoom-fit');

      if (btnZoomIn && !btnZoomIn.dataset.bound) {
        btnZoomIn.dataset.bound = "true";
        btnZoomIn.addEventListener('click', (e) => {
          e.preventDefault();
          aplicarZoomHacia(currentScale * 1.2);
        });
      }

      if (btnZoomOut && !btnZoomOut.dataset.bound) {
        btnZoomOut.dataset.bound = "true";
        btnZoomOut.addEventListener('click', (e) => {
          e.preventDefault();
          aplicarZoomHacia(currentScale / 1.2);
        });
      }

      if (btnZoomFit && !btnZoomFit.dataset.bound) {
        btnZoomFit.dataset.bound = "true";
        btnZoomFit.addEventListener('click', (e) => {
          e.preventDefault();
          currentScale = 1;
          currentX = 0;
          currentY = 0;
          actualizarViewBox();
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
          
          // 2. Renderizar Pseudocódigo (D7)
          if (state.lineaPseudocodigo !== undefined) {
            renderizarPseudocodigo(document.getElementById('pseudocode-container'), state.lineaPseudocodigo, state.descripcion);
          }
          
          // 3. Renderizar Cola de Prioridad Visible con Simulación Dinámica (D6)
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