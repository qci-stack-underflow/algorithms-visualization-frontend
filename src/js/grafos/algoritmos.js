// Catálogo de los algoritmos de grafos: lo que la pantalla necesita saber de
// cada uno (nombre, pseudocódigo, qué datos pide) y cómo ejecutarlo.
import { PSEUDOCODIGO as CODIGO_A_ESTRELLA, aEstrella } from "./a-estrella.js";
import { PSEUDOCODIGO as CODIGO_DIJKSTRA, dijkstra } from "./dijkstra.js";
import { PSEUDOCODIGO as CODIGO_KRUSKAL, kruskal } from "./kruskal.js";
import { PSEUDOCODIGO as CODIGO_PRIM, prim } from "./prim.js";

// familia: "caminos" (camino más corto) o "arbol" (árbol de expansión mínima).
// destino: "opcional", "obligatorio" o "no".
export const ALGORITMOS = Object.freeze({
  dijkstra: {
    id: "dijkstra",
    nombre: "Dijkstra",
    familia: "caminos",
    complejidad: "O((V + E) log V)",
    resumen:
      "Cierra siempre el nodo abierto más cercano al origen. Encuentra el camino más corto a todos los nodos.",
    pseudocodigo: CODIGO_DIJKSTRA,
    origen: true,
    destino: "opcional",
    heuristica: false,
    ejecutar: (grafo, { origen, destino }) => dijkstra(grafo, { origen, destino }),
  },
  "a-estrella": {
    id: "a-estrella",
    nombre: "A*",
    familia: "caminos",
    complejidad: "O((V + E) log V)",
    resumen:
      "Dijkstra con brújula: ordena la cola por lo recorrido más lo que estima que falta, y avanza primero hacia el destino.",
    pseudocodigo: CODIGO_A_ESTRELLA,
    origen: true,
    destino: "obligatorio",
    heuristica: true,
    ejecutar: (grafo, { origen, destino, heuristica }) =>
      aEstrella(grafo, { origen, destino, heuristica }),
  },
  prim: {
    id: "prim",
    nombre: "Prim",
    familia: "arbol",
    complejidad: "O(E log V)",
    resumen:
      "Hace crecer un solo árbol: en cada paso le agrega el nodo que se conecta con la arista más barata.",
    pseudocodigo: CODIGO_PRIM,
    origen: true,
    destino: "no",
    heuristica: false,
    ejecutar: (grafo, { origen }) => prim(grafo, { origen }),
  },
  kruskal: {
    id: "kruskal",
    nombre: "Kruskal",
    familia: "arbol",
    complejidad: "O(E log E)",
    resumen:
      "Revisa las aristas de la más barata a la más cara y se queda con las que no cierran un ciclo.",
    pseudocodigo: CODIGO_KRUSKAL,
    origen: false,
    destino: "no",
    heuristica: false,
    ejecutar: (grafo) => kruskal(grafo),
  },
});

export const ORDEN_ALGORITMOS = Object.freeze(["dijkstra", "a-estrella", "prim", "kruskal"]);

export function algoritmoPorId(id) {
  return Object.hasOwn(ALGORITMOS, id) ? ALGORITMOS[id] : null;
}

// Ejecuta el algoritmo con las opciones que usa y descarta las demás. A* sin
// destino no se puede ejecutar: devuelve null.
export function ejecutar(id, grafo, { origen = null, destino = null, heuristica = "euclidiana" } = {}) {
  const algoritmo = algoritmoPorId(id);
  if (!algoritmo) throw new Error(`No existe el algoritmo «${id}».`);
  if (algoritmo.destino === "obligatorio" && destino === null) return null;

  return algoritmo.ejecutar(grafo, {
    origen,
    destino: algoritmo.destino === "no" ? null : destino,
    heuristica,
  });
}
