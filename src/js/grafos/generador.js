// Genera un grafo al azar que se pueda leer bien en el lienzo: nodos
// repartidos en una cuadrícula con algo de desorden, aristas entre vecinos
// cercanos que no se cruzan y pesos según el largo de la arista.
//
// Con la misma semilla sale siempre el mismo grafo, así que las pruebas
// pueden repetirse.
import { ALTO_LIENZO, ANCHO_LIENZO, pesoPorDistancia } from "./ejemplos.js";
import { crearGrafo } from "./grafo.js";

export const MIN_NODOS = 4;
export const MAX_NODOS = 14;

const MARGEN = 80;
const COLUMNAS = 5;
const FILAS = 3;
const VECINOS_POR_NODO = 2;
const ESPACIO_LIBRE = 46; // una arista no pasa más cerca que esto de otro nodo
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Generador de números pseudoaleatorios mulberry32: devuelve valores en [0, 1).
export function crearAzar(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const distancia = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

// ¿Los segmentos p1–p2 y q1–q2 se cruzan en un punto que no es un extremo?
function seCruzan(p1, p2, q1, q2) {
  const giro = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return (
    giro(p1, p2, q1) * giro(p1, p2, q2) < 0 && giro(q1, q2, p1) * giro(q1, q2, p2) < 0
  );
}

function distanciaASegmento(punto, a, b) {
  const largo2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (largo2 === 0) return distancia(punto, a);
  const t = Math.max(
    0,
    Math.min(1, ((punto.x - a.x) * (b.x - a.x) + (punto.y - a.y) * (b.y - a.y)) / largo2)
  );
  return distancia(punto, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function repartirNodos(cantidad, azar) {
  const anchoCelda = (ANCHO_LIENZO - 2 * MARGEN) / COLUMNAS;
  const altoCelda = (ALTO_LIENZO - 2 * MARGEN) / FILAS;

  // Se barajan las celdas (Fisher–Yates) y se usa una por nodo.
  const celdas = Array.from({ length: COLUMNAS * FILAS }, (_, i) => i);
  for (let i = celdas.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [celdas[i], celdas[j]] = [celdas[j], celdas[i]];
  }

  return celdas
    .slice(0, cantidad)
    .sort((a, b) => a - b) // de izquierda a derecha y de arriba abajo: A, B, C…
    .map((celda, i) => ({
      id: LETRAS[i],
      // Cada nodo queda en el centro de su celda, movido hasta un 20 % hacia
      // cualquier lado: desordenado, pero nunca encimado con el de junto.
      x: Math.round(MARGEN + ((celda % COLUMNAS) + 0.3 + azar() * 0.4) * anchoCelda),
      y: Math.round(MARGEN + (Math.floor(celda / COLUMNAS) + 0.3 + azar() * 0.4) * altoCelda),
    }));
}

export function grafoAleatorio({ nodos: cantidad = 9, semilla = 1 } = {}) {
  const total = Math.max(MIN_NODOS, Math.min(MAX_NODOS, Math.trunc(cantidad) || MIN_NODOS));
  const azar = crearAzar(semilla);
  const nodos = repartirNodos(total, azar);

  const pares = []; // [i, j] con i < j
  const existe = (i, j) => pares.some(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j));
  const estorba = (i, j) =>
    pares.some(([a, b]) => seCruzan(nodos[i], nodos[j], nodos[a], nodos[b])) ||
    nodos.some(
      (nodo, k) => k !== i && k !== j && distanciaASegmento(nodo, nodos[i], nodos[j]) < ESPACIO_LIBRE
    );
  const agregar = (i, j) => pares.push([Math.min(i, j), Math.max(i, j)]);

  // Cada nodo se une con sus vecinos más cercanos, si la arista no estorba.
  nodos.forEach((nodo, i) => {
    const cercanos = nodos
      .map((otro, j) => ({ j, d: distancia(nodo, otro) }))
      .filter(({ j }) => j !== i)
      .sort((p, q) => p.d - q.d);
    let unidos = 0;
    for (const { j } of cercanos) {
      if (unidos === VECINOS_POR_NODO) break;
      if (existe(i, j)) {
        unidos++;
      } else if (!estorba(i, j)) {
        agregar(i, j);
        unidos++;
      }
    }
  });

  // Si quedaron partes separadas, se unen por el par de nodos más cercano
  // (de preferencia sin estorbar) hasta que el grafo sea conexo.
  const grupo = nodos.map((_, i) => i);
  const raiz = (i) => (grupo[i] === i ? i : (grupo[i] = raiz(grupo[i])));
  pares.forEach(([a, b]) => (grupo[raiz(a)] = raiz(b)));
  for (;;) {
    let mejor = null;
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        if (raiz(i) === raiz(j)) continue;
        const costo = distancia(nodos[i], nodos[j]) + (estorba(i, j) ? ANCHO_LIENZO : 0);
        if (!mejor || costo < mejor.costo) mejor = { i, j, costo };
      }
    }
    if (!mejor) break;
    agregar(mejor.i, mejor.j);
    grupo[raiz(mejor.i)] = raiz(mejor.j);
  }

  // Peso: el largo de la arista, alargado hasta un 50 % al azar (como una
  // carretera con curvas). Nunca es menor que la línea recta.
  const aristas = pares.map(([i, j]) => ({
    a: nodos[i].id,
    b: nodos[j].id,
    peso: pesoPorDistancia(nodos[i], nodos[j], 1 + azar() * 0.5),
  }));

  return crearGrafo({ nombre: `Aleatorio (${total} nodos)`, nodos, aristas });
}
