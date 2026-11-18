// Heurísticas para A*: una estimación h(v) de lo que falta desde cada nodo
// hasta el destino, calculada con la posición de los nodos en el dibujo.
//
// Para que A* dé siempre el camino más corto, la estimación nunca debe
// pasarse del costo real. La distancia en el dibujo y los pesos no están en
// las mismas unidades, así que se convierte con una escala:
//
//   escala = el menor (peso / distancia en el dibujo) entre todas las aristas
//   h(v)   = distancia en el dibujo de v al destino × escala
//
// Con esa escala ninguna arista cuesta menos que lo que mide en el dibujo
// (peso ≥ escala × distancia). Junto con la desigualdad del triángulo sale
// que h(u) ≤ peso(u, v) + h(v) para toda arista: la heurística es
// consistente, y por lo tanto también admisible. Por eso A* puede cerrar
// cada nodo una sola vez, igual que Dijkstra.

export const HEURISTICAS = Object.freeze({
  euclidiana: {
    nombre: "Línea recta",
    distancia: (p, q) => Math.hypot(p.x - q.x, p.y - q.y),
  },
  manhattan: {
    nombre: "Manhattan",
    distancia: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
  },
  // Con h = 0, A* se comporta exactamente como Dijkstra.
  cero: {
    nombre: "Sin heurística (h = 0)",
    distancia: () => 0,
  },
});

export function crearHeuristica(grafo, destino, tipo = "euclidiana") {
  const definicion = HEURISTICAS[tipo];
  if (!definicion) throw new Error(`No existe la heurística «${tipo}».`);
  const { distancia } = definicion;
  const posicion = (id) => grafo.nodos[grafo.indice.get(id)];

  let escala = Infinity;
  for (const { a, b, peso } of grafo.aristas) {
    const largo = distancia(posicion(a), posicion(b));
    if (largo > 0) escala = Math.min(escala, peso / largo);
  }
  // Sin aristas, o con todos los nodos encimados, no hay nada que estimar.
  if (!Number.isFinite(escala)) escala = 0;

  const meta = posicion(destino);
  const valores = Object.fromEntries(
    grafo.nodos.map((nodo) => [nodo.id, distancia(nodo, meta) * escala])
  );
  return { tipo, nombre: definicion.nombre, escala, valores };
}
