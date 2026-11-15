// Grafos de ejemplo de la pantalla. Las posiciones están pensadas para un
// lienzo de 1000 × 600.
import { crearGrafo } from "./grafo.js";

export const ANCHO_LIENZO = 1000;
export const ALTO_LIENZO = 600;

// En los grafos tipo mapa el peso de cada arista es su largo en el dibujo:
// 10 unidades del lienzo valen 1, redondeando hacia arriba.
export const UNIDADES_POR_PESO = 10;

export function pesoPorDistancia(p, q, factor = 1) {
  return Math.ceil((Math.hypot(p.x - q.x, p.y - q.y) / UNIDADES_POR_PESO) * factor);
}

function mapa(nodos, pares) {
  const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  return {
    nodos,
    aristas: pares.map(([a, b]) => ({
      a,
      b,
      peso: pesoPorDistancia(porId.get(a), porId.get(b)),
    })),
  };
}

const DEFINICIONES = [
  {
    id: "clasico",
    nombre: "Clásico (7 nodos)",
    nota: "El grafo de los libros de texto. Su árbol de expansión mínima pesa 39.",
    origen: "A",
    destino: "G",
    nodos: [
      { id: "A", x: 140, y: 110 },
      { id: "B", x: 500, y: 110 },
      { id: "C", x: 860, y: 110 },
      { id: "D", x: 300, y: 300 },
      { id: "E", x: 700, y: 300 },
      { id: "F", x: 400, y: 500 },
      { id: "G", x: 800, y: 500 },
    ],
    aristas: [
      { a: "A", b: "B", peso: 7 },
      { a: "A", b: "D", peso: 5 },
      { a: "B", b: "C", peso: 8 },
      { a: "B", b: "D", peso: 9 },
      { a: "B", b: "E", peso: 7 },
      { a: "C", b: "E", peso: 5 },
      { a: "D", b: "E", peso: 15 },
      { a: "D", b: "F", peso: 6 },
      { a: "E", b: "F", peso: 8 },
      { a: "E", b: "G", peso: 9 },
      { a: "F", b: "G", peso: 11 },
    ],
  },
  {
    id: "mapa",
    nombre: "Mapa (12 nodos)",
    nota: "Cada peso es la distancia en línea recta entre los dos nodos. Aquí se nota la ventaja de A* sobre Dijkstra.",
    origen: "A",
    destino: "L",
    ...mapa(
      [
        { id: "A", x: 80, y: 300 },
        { id: "B", x: 220, y: 130 },
        { id: "C", x: 230, y: 460 },
        { id: "D", x: 380, y: 280 },
        { id: "E", x: 410, y: 530 },
        { id: "F", x: 520, y: 80 },
        { id: "G", x: 560, y: 390 },
        { id: "H", x: 700, y: 220 },
        { id: "I", x: 720, y: 520 },
        { id: "J", x: 850, y: 370 },
        { id: "K", x: 910, y: 100 },
        { id: "L", x: 940, y: 540 },
      ],
      [
        ["A", "B"],
        ["A", "C"],
        ["A", "D"],
        ["B", "D"],
        ["B", "F"],
        ["C", "D"],
        ["C", "E"],
        ["D", "F"],
        ["D", "G"],
        ["E", "G"],
        ["E", "I"],
        ["F", "H"],
        ["F", "K"],
        ["G", "H"],
        ["G", "I"],
        ["G", "J"],
        ["H", "J"],
        ["H", "K"],
        ["I", "J"],
        ["I", "L"],
        ["J", "K"],
        ["J", "L"],
      ]
    ),
  },
  {
    id: "cuadricula",
    nombre: "Cuadrícula (4 × 4)",
    nota: "Calles en cuadrícula con distinto costo. Sirve para probar la heurística Manhattan.",
    origen: "A",
    destino: "P",
    nodos: "ABCDEFGHIJKLMNOP".split("").map((id, i) => ({
      id,
      x: 140 + (i % 4) * 240,
      y: 75 + Math.floor(i / 4) * 150,
    })),
    aristas: [
      // Horizontales, fila por fila
      { a: "A", b: "B", peso: 4 },
      { a: "B", b: "C", peso: 3 },
      { a: "C", b: "D", peso: 6 },
      { a: "E", b: "F", peso: 5 },
      { a: "F", b: "G", peso: 3 },
      { a: "G", b: "H", peso: 4 },
      { a: "I", b: "J", peso: 3 },
      { a: "J", b: "K", peso: 4 },
      { a: "K", b: "L", peso: 3 },
      { a: "M", b: "N", peso: 7 },
      { a: "N", b: "O", peso: 4 },
      { a: "O", b: "P", peso: 5 },
      // Verticales, columna por columna
      { a: "A", b: "E", peso: 3 },
      { a: "E", b: "I", peso: 6 },
      { a: "I", b: "M", peso: 4 },
      { a: "B", b: "F", peso: 5 },
      { a: "F", b: "J", peso: 4 },
      { a: "J", b: "N", peso: 3 },
      { a: "C", b: "G", peso: 4 },
      { a: "G", b: "K", peso: 3 },
      { a: "K", b: "O", peso: 5 },
      { a: "D", b: "H", peso: 3 },
      { a: "H", b: "L", peso: 5 },
      { a: "L", b: "P", peso: 4 },
    ],
  },
  {
    id: "islas",
    nombre: "Dos islas (no conexo)",
    nota: "No hay aristas entre las dos partes: desde A no se llega a G, y el árbol mínimo se vuelve un bosque.",
    origen: "A",
    destino: "G",
    nodos: [
      { id: "A", x: 110, y: 170 },
      { id: "B", x: 330, y: 90 },
      { id: "C", x: 140, y: 440 },
      { id: "D", x: 400, y: 340 },
      { id: "E", x: 650, y: 150 },
      { id: "F", x: 880, y: 250 },
      { id: "G", x: 700, y: 480 },
    ],
    aristas: [
      { a: "A", b: "B", peso: 4 },
      { a: "A", b: "C", peso: 6 },
      { a: "A", b: "D", peso: 9 },
      { a: "B", b: "D", peso: 3 },
      { a: "C", b: "D", peso: 5 },
      { a: "E", b: "F", peso: 2 },
      { a: "E", b: "G", peso: 8 },
      { a: "F", b: "G", peso: 7 },
    ],
  },
];

// Cada ejemplo: { id, nombre, nota, origen, destino, grafo }.
export const EJEMPLOS = Object.freeze(
  DEFINICIONES.map(({ id, nombre, nota, origen, destino, nodos, aristas }) =>
    Object.freeze({ id, nombre, nota, origen, destino, grafo: crearGrafo({ nombre, nodos, aristas }) })
  )
);

export function ejemploPorId(id) {
  return EJEMPLOS.find((ejemplo) => ejemplo.id === id) ?? null;
}
