/**
 * D2: Renderizado del árbol de Huffman en SVG con soporte de resaltado de rutas.
 */

export function renderizarArbolSVG(svgContainer, nodesMap, positions, visibleNodes, highlightedPath = []) {
  svgContainer.innerHTML = '';

  const pathSet = new Set(highlightedPath.map(String));
  const visibleSet = new Set(visibleNodes.map(String));

  const gEdges = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gEdges.setAttribute('class', 'arbol-aristas');

  const gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gNodes.setAttribute('class', 'arbol-nodos');

  svgContainer.appendChild(gEdges);
  svgContainer.appendChild(gNodes);

  // Dibuja las aristas entre nodos visibles
  visibleNodes.forEach(nodeId => {
    const node = nodesMap[nodeId];
    if (!node) return;
    const pos = positions.get(nodeId);
    if (!pos) return;

    ['left', 'right'].forEach(bit => {
      const childId = bit === 'left' ? node.left : node.right;
      if (childId && visibleSet.has(String(childId))) {
        const childPos = positions.get(childId);
        if (!childPos) return;

        const isHighlighted = pathSet.has(String(nodeId)) && pathSet.has(String(childId));

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pos.x);
        line.setAttribute('y1', pos.y);
        line.setAttribute('x2', childPos.x);
        line.setAttribute('y2', childPos.y);
        line.setAttribute('class', `arista ${isHighlighted ? 'resaltada' : ''}`);
        gEdges.appendChild(line);

        // Etiqueta del bit (0 o 1)
        const textBit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textBit.setAttribute('x', (pos.x + childPos.x) / 2);
        textBit.setAttribute('y', (pos.y + childPos.y) / 2 - 4);
        textBit.setAttribute('class', 'bit-etiqueta');
        textBit.textContent = bit === 'left' ? '0' : '1';
        gEdges.appendChild(textBit);
      }
    });
  });

  // Dibuja los nodos visibles
  visibleNodes.forEach(nodeId => {
    const node = nodesMap[nodeId];
    if (!node) return;
    const pos = positions.get(nodeId);
    if (!pos) return;

    const isHighlighted = pathSet.has(String(nodeId));
    const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gNode.setAttribute('class', `nodo-grupo ${node.isLeaf ? 'hoja' : 'interno'} ${isHighlighted ? 'resaltado' : ''}`);
    gNode.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    gNode.setAttribute('data-node-id', nodeId);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', node.isLeaf ? 18 : 22);

    const textWeight = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textWeight.setAttribute('class', 'peso-texto');
    textWeight.setAttribute('dy', node.isLeaf ? '-2' : '4');
    textWeight.textContent = node.weight;

    gNode.appendChild(circle);
    gNode.appendChild(textWeight);

    if (node.isLeaf) {
      const textChar = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textChar.setAttribute('class', 'simbolo-texto');
      textChar.setAttribute('dy', '12');
      textChar.textContent = node.symbol === ' ' ? '␣' : node.symbol;
      gNode.appendChild(textChar);
    }

    gNodes.appendChild(gNode);
  });
}
