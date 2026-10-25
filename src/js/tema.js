// Lee desde JS los colores definidos en _tokens.scss, para que las barras,
// la gráfica de métricas y las tarjetas usen la misma paleta que el CSS.

export function leerVariable(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

// Un color por estado del paso que se anima.
export function coloresBarras() {
  return {
    base: leerVariable("--bar-idle"),
    comparacion: leerVariable("--bar-compare"),
    intercambio: leerVariable("--bar-swap"),
    escritura: leerVariable("--bar-write"),
    pivote: leerVariable("--bar-pivot"),
    completado: leerVariable("--bar-done"),
    etiqueta: leerVariable("--text-secondary"),
  };
}

// Un color por algoritmo en el orden en que se seleccionan (máximo 8).
export function coloresSeries() {
  return Array.from({ length: 8 }, (_, i) => leerVariable(`--series-${i + 1}`));
}
