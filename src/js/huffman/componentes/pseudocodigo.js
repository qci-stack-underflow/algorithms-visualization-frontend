// src/js/huffman/componentes/pseudocodigo.js

export function renderizarPseudocodigo(contenedor, lineaActiva, descripcionPaso) {
  // Asegurarnos de tener el panel de código raíz de referencia
  const panel = contenedor || document.querySelector('.code-panel');
  if (!panel) return;

  // 1. Encontrar la lista de líneas de código en el HTML
  const listaLineas = panel.querySelector('.code-lines');
  if (listaLineas) {
    const lineas = listaLineas.querySelectorAll('li');
    lineas.forEach((li, idx) => {
      // El índice del HTML empieza en 1
      const numLinea = idx + 1;
      if (numLinea === Number(lineaActiva)) {
        li.classList.add('is-active');
      } else {
        li.classList.remove('is-active');
      }
    });
  }

  // 2. Actualizar el bloque de texto descriptivo inferior (ej. "Une 12 + 15 = 27")
  const descElement = panel.querySelector('.code-step span:last-child') || panel.querySelector('.code-step');
  if (descElement && descripcionPaso) {
    descElement.textContent = descripcionPaso;
  }
}