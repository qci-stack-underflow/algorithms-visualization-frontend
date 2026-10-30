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

export function renderizarPseudocodigo(container, activeLineIndex, descripcionPaso) {
  container.innerHTML = '';

  const list = document.createElement('ol');
  list.className = 'pseudocode-list';

  LINEAS_HUFFMAN.forEach((item) => {
    const li = document.createElement('li');
    li.className = `pseudocode-line ${item.line === activeLineIndex ? 'highlight' : ''}`;

    const lineNum = document.createElement('span');
    lineNum.className = 'line-num';
    lineNum.textContent = item.line;

    const code = document.createElement('code');
    code.textContent = item.text;

    li.appendChild(lineNum);
    li.appendChild(code);
    list.appendChild(li);
  });

  const descBox = document.createElement('div');
  descBox.className = 'step-description-box';
  descBox.textContent = descripcionPaso || '';

  container.appendChild(list);
  container.appendChild(descBox);
}
