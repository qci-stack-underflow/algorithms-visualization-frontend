/**
 * D5: Convertidor de ejecuciones de Huffman a Cuadros de Estado para la animación.
 */

export function generarPasosHuffman(frecuencias) {
  const pasos = [];
  let nextInternalId = 1;

  // Hojas iniciales
  const leaves = Object.entries(frecuencias).map(([symbol, weight]) => ({
    id: `leaf_${symbol}`,
    symbol,
    weight,
    isLeaf: true,
    left: null,
    right: null
  }));

  const nodesMap = {};
  leaves.forEach(leaf => { nodesMap[leaf.id] = leaf; });

  let priorityQueue = [...leaves].sort((a, b) => a.weight - b.weight || a.symbol.localeCompare(b.symbol));

  // Estado Inicial 0
  pasos.push({
    pasoIndex: 0,
    fase: 'INICIALIZACION',
    descripcion: 'Cola de prioridad cargada con todas las hojas ordenadas por frecuencia.',
    lineaPseudocodigo: 1,
    priorityQueue: priorityQueue.map(n => n.id),
    visibleNodes: Object.keys(nodesMap),
    highlightedPair: [],
    assignedCodes: {}
  });

  // Iteración voraz: extract-min & merge
  while (priorityQueue.length > 1) {
    // Paso: Seleccionar primer mínimo
    const nodeA = priorityQueue[0];
    pasos.push({
      pasoIndex: pasos.length,
      fase: 'SELECCION',
      descripcion: `Extrae primer mínimo: '${nodeA.symbol || nodeA.id}' (peso ${nodeA.weight})`,
      lineaPseudocodigo: 3,
      priorityQueue: priorityQueue.map(n => n.id),
      visibleNodes: Object.keys(nodesMap),
      highlightedPair: [nodeA.id],
      assignedCodes: {}
    });

    // Paso: Seleccionar segundo mínimo
    const nodeB = priorityQueue[1];
    pasos.push({
      pasoIndex: pasos.length,
      fase: 'SELECCION',
      descripcion: `Extrae segundo mínimo: '${nodeB.symbol || nodeB.id}' (peso ${nodeB.weight})`,
      lineaPseudocodigo: 4,
      priorityQueue: priorityQueue.map(n => n.id),
      visibleNodes: Object.keys(nodesMap),
      highlightedPair: [nodeA.id, nodeB.id],
      assignedCodes: {}
    });

    // Merge
    const parentId = `int_${nextInternalId++}`;
    const parentNode = {
      id: parentId,
      symbol: null,
      weight: nodeA.weight + nodeB.weight,
      isLeaf: false,
      left: nodeA.id,
      right: nodeB.id
    };

    nodesMap[parentId] = parentNode;
    priorityQueue = priorityQueue.slice(2);
    priorityQueue.push(parentNode);
    priorityQueue.sort((a, b) => a.weight - b.weight);

    pasos.push({
      pasoIndex: pasos.length,
      fase: 'UNION',
      descripcion: `Une '${nodeA.symbol || nodeA.id}' (${nodeA.weight}) + '${nodeB.symbol || nodeB.id}' (${nodeB.weight}) = Nodo ${parentId} (${parentNode.weight})`,
      lineaPseudocodigo: 5,
      priorityQueue: priorityQueue.map(n => n.id),
      visibleNodes: Object.keys(nodesMap),
      highlightedPair: [parentId],
      assignedCodes: {}
    });
  }

  const rootId = priorityQueue[0]?.id;

  // Fase de Asignación de Códigos
  const codes = {};
  function assignCodes(nodeId, currentCode = '') {
    const node = nodesMap[nodeId];
    if (!node) return;

    if (node.isLeaf) {
      codes[node.symbol] = currentCode || '0';
      pasos.push({
        pasoIndex: pasos.length,
        fase: 'CODIFICACION',
        descripcion: `Asigna código '${codes[node.symbol]}' a la hoja '${node.symbol}'`,
        lineaPseudocodigo: 8,
        priorityQueue: [rootId],
        visibleNodes: Object.keys(nodesMap),
        highlightedPair: [nodeId],
        assignedCodes: { ...codes }
      });
    } else {
      assignCodes(node.left, currentCode + '0');
      assignCodes(node.right, currentCode + '1');
    }
  }

  if (rootId) {
    assignCodes(rootId, '');
  }

  return { pasos, nodesMap, rootId };
}
