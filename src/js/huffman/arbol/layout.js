/**
 * D1: Posición de cada nodo del árbol de Huffman.
 *
 * Asigna coordenadas (x, y) estáticas a todos los nodos del árbol final.
 * - x: Basado en el orden inorden de las hojas (0..numHojas - 1) para evitar solapamientos.
 * - y: Basado en la profundidad del nodo en el árbol (0..maxDepth).
 *
 * @param {Object} nodesMap - Mapa/Diccionario de nodos indexados por id { id: { id, left, right, isLeaf, ... } }
 * @param {string|number} rootId - ID del nodo raíz del árbol final.
 * @param {Object} config - Opciones de configuración del layout.
 * @param {number} config.nodeRadius - Radio visual de cada nodo (default: 20).
 * @param {number} config.levelHeight - Distancia vertical entre niveles (default: 80).
 * @param {number} config.leafSpacing - Distancia horizontal entre hojas consecutivas (default: 60).
 * @returns {Map<string|number, {x: number, y: number, depth: number, inorderIndex: number}>} Mapa de posiciones por id.
 */
export function calcularLayoutArbol(nodesMap, rootId, config = {}) {
  const { nodeRadius = 20, levelHeight = 80, leafSpacing = 60 } = config;
  const positions = new Map();

  if (!rootId || !nodesMap || !nodesMap[rootId]) {
    return positions;
  }

  let leafCounter = 0;

  // Recorrido Inorden para calcular x según las hojas y registrar profundidades (y)
  function traverseInorder(nodeId, depth = 0) {
    const node = nodesMap[nodeId];
    if (!node) return 0;

    let xPosition = 0;

    if (node.isLeaf || (!node.left && !node.right)) {
      xPosition = leafCounter * leafSpacing + nodeRadius;
      leafCounter++;
      positions.set(nodeId, {
        x: xPosition,
        y: depth * levelHeight + nodeRadius,
        depth,
        inorderIndex: leafCounter - 1
      });
      return xPosition;
    }

    const leftX = node.left ? traverseInorder(node.left, depth + 1) : null;
    const rightX = node.right ? traverseInorder(node.right, depth + 1) : null;

    if (leftX !== null && rightX !== null) {
      xPosition = (leftX + rightX) / 2;
    } else if (leftX !== null) {
      xPosition = leftX;
    } else if (rightX !== null) {
      xPosition = rightX;
    }

    positions.set(nodeId, {
      x: xPosition,
      y: depth * levelHeight + nodeRadius,
      depth,
      inorderIndex: -1
    });

    return xPosition;
  }

  traverseInorder(rootId, 0);
  return positions;
}
