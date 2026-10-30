/**
 * D8: Indicador de Fases, Soporte para Movimiento Reducido y Accesibilidad.
 */

export function actualizarIndicadorFases(container, faseActual) {
  const FASES = [
    { key: 'INICIALIZACION', label: '1. Inicializar' },
    { key: 'SELECCION', label: '2. Selección Voraz' },
    { key: 'UNION', label: '3. Unión de Nodos' },
    { key: 'CODIFICACION', label: '4. Asignación de Códigos' }
  ];

  container.innerHTML = '';
  const nav = document.createElement('nav');
  nav.className = 'fases-bar';
  nav.setAttribute('aria-label', 'Fases del Algoritmo de Huffman');

  FASES.forEach((fase) => {
    const step = document.createElement('div');
    const isActive = fase.key === faseActual;
    step.className = `fase-step ${isActive ? 'active' : ''}`;
    step.textContent = fase.label;
    step.setAttribute('aria-current', isActive ? 'step' : 'false');
    nav.appendChild(step);
  });

  container.appendChild(nav);
}

export function verificarMovimientoReducido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function actualizarDescripcionLectorPantalla(srContainer, pasoState, totalPasos) {
  if (!srContainer) return;
  srContainer.textContent = `Paso ${pasoState.pasoIndex + 1} de ${totalPasos}: ${pasoState.descripcion}`;
}
