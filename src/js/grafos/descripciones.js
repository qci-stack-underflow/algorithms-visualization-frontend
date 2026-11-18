// Qué hizo cada paso, en palabras. Es el texto que se muestra debajo del
// pseudocódigo. No usa nada del navegador.

// Números como se muestran en toda la pantalla: enteros tal cual, decimales
// con una cifra y ∞ para lo que todavía no se alcanza (null en los pasos).
export function formatoNumero(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "∞";
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

const n = formatoNumero;
const lado = (arista) => arista.replace("-", "–");

function finDeCamino(paso, nombreCosto) {
  if (paso.destino === null) {
    return `Listo: ya no quedan nodos en la cola. Cada ${nombreCosto} es la mínima desde ${paso.origen}`;
  }
  if (!paso.alcanzado) return `No hay camino de ${paso.origen} a ${paso.destino}`;
  return `Camino más corto: ${paso.ruta.join(" → ")}, con costo ${n(paso.costo)}`;
}

function finDeArbol(paso) {
  const aristas = paso.arbol.length;
  const cuenta = `${aristas} ${aristas === 1 ? "arista" : "aristas"}`;
  if (paso.conexo) {
    return `Árbol de expansión mínima: ${cuenta}, peso total ${n(paso.pesoTotal)}`;
  }
  return paso.arboles
    ? `El grafo no es conexo: queda un bosque de ${paso.arboles} árboles, peso total ${n(paso.pesoTotal)}`
    : `El grafo no es conexo: el árbol solo cubre ${paso.nodosEnArbol} nodos, peso total ${n(paso.pesoTotal)}`;
}

const DESCRIPCIONES = {
  dijkstra: {
    inicio: (p) => `Empieza en ${p.nodo}: dist[${p.nodo}] = 0 y los demás nodos en ∞`,
    extraer: (p) => `Saca ${p.nodo} de la cola: su distancia ${n(p.dist[p.nodo])} ya es definitiva`,
    relajar: ({ nodo, vecino, calculo: c }) =>
      `${nodo}–${vecino}: ${n(c.base)} + ${n(c.peso)} = ${n(c.total)} mejora ${n(c.anterior)}; dist[${vecino}] = ${n(c.total)}`,
    mantener: ({ nodo, vecino, calculo: c }) =>
      `${nodo}–${vecino}: ${n(c.base)} + ${n(c.peso)} = ${n(c.total)} no mejora ${n(c.anterior)}`,
    fin: (p) => finDeCamino(p, "distancia"),
  },
  "a-estrella": {
    inicio: (p) =>
      `Empieza en ${p.nodo}: g = 0 y f = h(${p.nodo}) = ${n(p.h[p.nodo])}`,
    extraer: (p) =>
      `Saca ${p.nodo} de la cola: tiene la menor f = ${n(p.g[p.nodo])} + ${n(p.h[p.nodo])} = ${n(p.f[p.nodo])}`,
    relajar: ({ nodo, vecino, calculo: c }) =>
      `${nodo}–${vecino}: g = ${n(c.base)} + ${n(c.peso)} = ${n(c.total)} mejora ${n(c.anterior)}; f[${vecino}] = ${n(c.total)} + ${n(c.h)} = ${n(c.total + c.h)}`,
    mantener: ({ nodo, vecino, calculo: c }) =>
      `${nodo}–${vecino}: g = ${n(c.base)} + ${n(c.peso)} = ${n(c.total)} no mejora ${n(c.anterior)}`,
    fin: (p) => finDeCamino(p, "g"),
  },
  prim: {
    inicio: (p) => `Empieza el árbol en ${p.nodo}: clave[${p.nodo}] = 0`,
    extraer: (p) =>
      p.arista
        ? `Agrega ${p.nodo} al árbol con la arista ${lado(p.arista)} (peso ${n(p.clave[p.nodo])})`
        : `Saca ${p.nodo} de la cola: es el primer nodo del árbol`,
    relajar: ({ nodo, vecino, calculo: c }) =>
      `${nodo}–${vecino}: el peso ${n(c.peso)} mejora ${n(c.anterior)}; clave[${vecino}] = ${n(c.peso)}`,
    mantener: ({ nodo, vecino, calculo: c }) =>
      `${nodo}–${vecino}: el peso ${n(c.peso)} no mejora ${n(c.anterior)}`,
    fin: finDeArbol,
  },
  kruskal: {
    inicio: (p) =>
      `${p.orden.length} aristas ordenadas por peso y ${p.conjuntos.length} conjuntos de un nodo`,
    aceptar: (p) =>
      `${lado(p.arista)} (peso ${n(p.peso)}): une dos conjuntos distintos, entra al árbol`,
    rechazar: (p) =>
      `${lado(p.arista)} (peso ${n(p.peso)}): ${p.nodo} y ${p.vecino} ya están conectados, cerraría un ciclo`,
    fin: finDeArbol,
  },
};

export function describirPaso(algoritmo, paso) {
  return DESCRIPCIONES[algoritmo]?.[paso.tipo]?.(paso) ?? "";
}

// Tipos de paso que tiene cada algoritmo (para las pruebas y la leyenda).
export function tiposDePaso(algoritmo) {
  return Object.keys(DESCRIPCIONES[algoritmo] ?? {});
}
