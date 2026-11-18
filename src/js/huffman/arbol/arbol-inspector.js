// Árbol reconstruido del inspector de archivos .suf (C17). Dibuja el árbol
// completo con los componentes del bloque D (layout.js, render-svg.js y
// zoom-pan.js), a partir de los nodos que arma suf.js con el diccionario del
// archivo. No tiene animación: el árbol ya está construido.
import { calcularLayoutArbol, limitesDePosiciones } from "./layout.js";
import { renderizarArbolSVG } from "./render-svg.js";
import { ControllerZoomPan } from "./zoom-pan.js";

// Desde este ancho (en unidades del layout) el árbol completo no deja leer un
// camino, y al elegir un símbolo se acerca a él.
const ANCHO_PARA_ACERCAR = 1500;

/**
 * @param {object} elementos
 * @param {SVGSVGElement} elementos.svg
 * @param {HTMLElement} elementos.contenedor - El lienzo que envuelve al svg.
 * @param {HTMLElement} [elementos.acercar]
 * @param {HTMLElement} [elementos.alejar]
 * @param {HTMLElement} [elementos.ajustar]
 * @returns {{ mostrar(nodes: object[], rootId: number|null): void, resaltar(id: number|null): void }}
 */
export function crearArbolDelInspector({ svg, contenedor, acercar, alejar, ajustar }) {
  const zoom = new ControllerZoomPan(svg, contenedor);
  let nodos = {};
  let posiciones = new Map();
  let visibles = [];
  let limitesDelArbol = null;

  const verTodo = () => {
    if (limitesDelArbol) zoom.fitToContent(limitesDelArbol);
  };
  acercar?.addEventListener("click", () => zoom.zoomIn());
  alejar?.addEventListener("click", () => zoom.zoomOut());
  ajustar?.addEventListener("click", verTodo);

  // Los nodos del inspector traen parentId: del símbolo a la raíz es el camino
  // de su código.
  const caminoHasta = (id) => {
    const camino = [];
    for (let actual = id; actual != null; actual = nodos[actual]?.parentId) camino.push(actual);
    return camino;
  };

  return {
    mostrar(nodes, rootId) {
      nodos = Object.fromEntries(nodes.map((nodo) => [nodo.id, nodo]));
      posiciones = calcularLayoutArbol(nodos, rootId);
      visibles = nodes.map((nodo) => nodo.id);
      renderizarArbolSVG(svg, nodos, posiciones, visibles, []);
      limitesDelArbol = limitesDePosiciones(posiciones);
      verTodo();
    },
    // Marca el camino de un símbolo (su id de hoja) o lo quita con null. En
    // un árbol grande (el Quijote mide más de 5,000 de ancho) el camino se ve
    // diminuto, así que se acerca a él; al quitarlo se vuelve al árbol completo.
    resaltar(id) {
      const camino = id == null ? [] : caminoHasta(id);
      renderizarArbolSVG(svg, nodos, posiciones, visibles, camino);
      if (camino.length === 0) {
        verTodo();
        return;
      }
      const delCamino = new Map(camino.map((nodo) => [nodo, posiciones.get(nodo)]).filter(([, pos]) => pos));
      const limites = limitesDePosiciones(delCamino);
      const anchoDelArbol = limitesDelArbol ? limitesDelArbol.xMax - limitesDelArbol.xMin : 0;
      if (limites && anchoDelArbol > ANCHO_PARA_ACERCAR) zoom.fitToContent(limites);
    },
  };
}
