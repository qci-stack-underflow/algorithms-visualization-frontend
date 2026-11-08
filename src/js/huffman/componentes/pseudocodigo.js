/**
 * D7: Módulo de Pseudocódigo sincronizado.
 */

const LINEAS_HUFFMAN = [
  { line: 1, text: 'Q = CrearColaPrioridad(frecuencias)' },
  { line: 2, text: 'mientras Tamaño(Q) > 1 hacer:' },
  { line: 3, text: '    izq = ExtraerMinimo(Q)' },
  { line: 4, text: '    der = ExtraerMinimo(Q)' },
  { line: 5, text: '    nuevo = CrearNodo(izq.peso + der.peso, izq, der)' },
  { line: 6, text: '    Insertar(Q, nuevo)' },
  { line: 7, text: 'raíz = ExtraerMinimo(Q)' },
  { line: 8, text: 'AsignarCodigos(raíz, "")' }
];

// src/js/huffman/componentes/pseudocodigo.js
export function renderizarPseudocodigo(contenedor, lineaActiva, descripcion) {
  if (!contenedor) return; // Evita el error de TypeError si el contenedor no existe en el DOM

  // Lógica de renderizado del pseudocodigo
  const lineas = contenedor.querySelectorAll('li');
  lineas.forEach((li, idx) => {
    if (idx + 1 === lineaActiva) {
      li.classList.add('is-active');
    } else {
      li.classList.remove('is-active');
    }
  });
}