/**
 * D2: Renderizado del árbol de Huffman en SVG con el diseño original (hojas rectangulares y nodos internos circulares).
 */

export function renderizarArbolSVG(svgContainer, nodesMap, positions, visibleNodes, highlightedPath = []) {
  if (!svgContainer) return;

  // Asegurar la existencia de los grupos principales dentro del SVG
  let gEdges = svgContainer.querySelector('.arbol-aristas');
  if (!gEdges) {
    gEdges = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gEdges.setAttribute('class', 'arbol-aristas');
    svgContainer.appendChild(gEdges);
  } else {
    gEdges.innerHTML = '';
  }

  let gBits = svgContainer.querySelector('.arbol-bits');
  if (!gBits) {
    gBits = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gBits.setAttribute('class', 'arbol-bits');
    svgContainer.appendChild(gBits);
  } else {
    gBits.innerHTML = '';
  }

  let gNodes = svgContainer.querySelector('.arbol-nodos');
  if (!gNodes) {
    gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gNodes.setAttribute('class', 'arbol-nodos');
    svgContainer.appendChild(gNodes);
  } else {
    gNodes.innerHTML = '';
  }

  const pathSet = new Set(highlightedPath.map(String));
  const visibleSet = new Set(visibleNodes.map(String));

  // 1. Dibujar aristas y etiquetas de bits (0 y 1)
  visibleNodes.forEach(nodeId => {
    const node = nodesMap[nodeId];
    if (!node) return;
    const pos = positions.get(String(nodeId)) || positions.get(Number(nodeId));
    if (!pos) return;

    ['left', 'right'].forEach(bit => {
      const childId = bit === 'left' ? node.left : node.right;
      if (childId !== null && childId !== undefined && visibleSet.has(String(childId))) {
        const childPos = positions.get(String(childId)) || positions.get(Number(childId));
        if (!childPos) return;

        const isHighlighted = pathSet.has(String(nodeId)) && pathSet.has(String(childId));

        // Línea de la arista
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pos.x);
        line.setAttribute('y1', pos.y);
        line.setAttribute('x2', childPos.x);
        line.setAttribute('y2', childPos.y);
        line.setAttribute('class', `arbol-arista ${isHighlighted ? 'is-ruta' : ''}`);
        gEdges.appendChild(line);

        // Etiqueta del bit (0 o 1) con el estilo original (.arbol-bit)
        const textBit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textBit.setAttribute('x', (pos.x + childPos.x) / 2);
        textBit.setAttribute('y', (pos.y + childPos.y) / 2);
        textBit.setAttribute('class', `arbol-bit ${isHighlighted ? 'is-ruta' : ''}`);
        textBit.textContent = bit === 'left' ? '0' : '1';
        gBits.appendChild(textBit);
      }
    });
  });

  // 2. Dibujar nodos (Hojas con formato de tarjeta y nodos internos circulares)
  visibleNodes.forEach(nodeId => {
    const node = nodesMap[nodeId];
    if (!node) return;
    const pos = positions.get(String(nodeId)) || positions.get(Number(nodeId));
    if (!pos) return;

    const isHighlighted = pathSet.has(String(nodeId));
    const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Asignar clases originales dependiendo de si es hoja o nodo interno
    const claseTipo = node.isLeaf ? 'arbol-hoja' : 'arbol-nodo';
    gNode.setAttribute('class', `${claseTipo} ${isHighlighted ? 'is-ruta' : ''}`);
    gNode.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    gNode.setAttribute('data-node-id', nodeId);

    if (node.isLeaf) {
      // Estructura original de las hojas (rectángulo con símbolo y peso)
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '-28');
      rect.setAttribute('y', '-22');
      rect.setAttribute('width', '56');
      rect.setAttribute('height', '44');
      rect.setAttribute('rx', '10');
      gNode.appendChild(rect);

      const textSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textSymbol.setAttribute('class', 'arbol-simbolo');
      textSymbol.setAttribute('y', '-2');
      textSymbol.textContent = node.symbol === ' ' ? '␣' : (node.symbol === '\n' ? '↵' : node.symbol);
      gNode.appendChild(textSymbol);

      const textWeight = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textWeight.setAttribute('class', 'arbol-peso');
      textWeight.setAttribute('y', '14');
      textWeight.textContent = node.weight.toLocaleString(); // Formatea con comas (ej. 192,727)
      gNode.appendChild(textWeight);
    } else {
      // Estructura original de los nodos internos (círculo con su peso)
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '22');
      gNode.appendChild(circle);

      const textWeight = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textWeight.setAttribute('class', 'arbol-peso');
      textWeight.setAttribute('y', '4');
      
      // Mostrar el peso adaptado (ej. en K o M si es muy grande, o su valor directo)
      textWeight.textContent = node.weight >= 1000000 
        ? (node.weight / 1000000).toFixed(2) + ' M' 
        : (node.weight >= 1000 ? Math.round(node.weight / 1000) + ' K' : node.weight);
      
      gNode.appendChild(textWeight);
    }

    gNodes.appendChild(gNode);
  });
}