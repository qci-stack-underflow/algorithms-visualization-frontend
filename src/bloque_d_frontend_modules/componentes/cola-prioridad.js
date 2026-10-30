/**
 * D6: Componente visual para la Cola de Prioridad del algoritmo voraz.
 */

export function renderizarColaPrioridad(container, nodesMap, priorityQueueIds, highlightedPair = []) {
  container.innerHTML = '';
  const highlightSet = new Set(highlightedPair.map(String));

  const wrapper = document.createElement('div');
  wrapper.className = 'pqueue-wrapper';

  priorityQueueIds.forEach((id) => {
    const node = nodesMap[id];
    if (!node) return;

    const item = document.createElement('div');
    const isHighlighted = highlightSet.has(String(id));
    item.className = `pqueue-item ${node.isLeaf ? 'leaf' : 'internal'} ${isHighlighted ? 'active' : ''}`;

    item.innerHTML = `
      <span class="pqueue-label">${node.isLeaf ? (node.symbol === ' ' ? '␣' : node.symbol) : node.id}</span>
      <span class="pqueue-weight">${node.weight}</span>
    `;

    wrapper.appendChild(item);
  });

  container.appendChild(wrapper);
}
