// src/js/huffman/componentes/cola-prioridad.js

export function renderizarColaPrioridad(contenedor, nodosActivos, highlightedPair = []) {
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (!nodosActivos || nodosActivos.length === 0) {
    contenedor.innerHTML = '<span class="cola-vacia">Cola vacía</span>';
    return;
  }

  // 1. ORDENAR ESTRICTAMENTE POR PESO (De menor a mayor)
  const nodosOrdenados = [...nodosActivos].sort((a, b) => {
    const pesoA = a.weight !== undefined ? a.weight : (a.peso || 0);
    const pesoB = b.weight !== undefined ? b.weight : (b.peso || 0);
    return pesoA - pesoB;
  });

  const listaEl = document.createElement('div');
  listaEl.className = 'cola-items-grid';

  nodosOrdenados.forEach(node => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cola-ficha';
    
    const idStr = String(node.id);
    
    // 2. RESALTAR LOS DOS NODOS QUE SALEN EN ESTE PASO (Decisión voraz)
    if (highlightedPair && highlightedPair.includes(idStr)) {
      itemEl.classList.add('is-destacado');
    }

    const simboloTexto = node.symbol !== undefined && node.symbol !== null 
      ? (node.symbol === ' ' ? '␣' : node.symbol) 
      : `#${node.id}`;

    const pesoTexto = node.weight !== undefined ? node.weight : (node.peso || 0);

    itemEl.innerHTML = `
      <span class="cola-simbolo">${simboloTexto}</span>
      <span class="cola-peso">${pesoTexto}</span>
    `;

    listaEl.appendChild(itemEl);
  });

  contenedor.appendChild(listaEl);
}