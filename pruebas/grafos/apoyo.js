// Utilidades de las pruebas: grafos al azar y soluciones de referencia
// calculadas de otra forma, sin usar el código que se está probando.
import { crearGrafo } from "../../src/js/grafos/grafo.js";
import { crearAzar } from "../../src/js/grafos/generador.js";

export { crearAzar };

const LETRAS = "ABCDEFGHIJKLMNOP";

// Grafo cualquiera: puede no ser conexo y tiene pesos repetidos y en cero,
// que es donde suelen fallar los desempates.
export function grafoDePrueba(azar, { nodos = 6, probabilidad = 0.5, pesoMaximo = 9 } = {}) {
  const lista = Array.from({ length: nodos }, (_, i) => ({
    id: LETRAS[i],
    x: Math.round(azar() * 1000),
    y: Math.round(azar() * 600),
  }));
  const aristas = [];
  for (let i = 0; i < nodos; i++) {
    for (let j = i + 1; j < nodos; j++) {
      if (azar() < probabilidad) {
        aristas.push({ a: LETRAS[i], b: LETRAS[j], peso: Math.floor(azar() * (pesoMaximo + 1)) });
      }
    }
  }
  return crearGrafo({ nodos: lista, aristas });
}

// Distancias mínimas entre todos los pares con Floyd–Warshall.
export function distanciasDeReferencia(grafo) {
  const ids = grafo.nodos.map(({ id }) => id);
  const d = Object.fromEntries(
    ids.map((a) => [a, Object.fromEntries(ids.map((b) => [b, a === b ? 0 : Infinity]))])
  );
  for (const { a, b, peso } of grafo.aristas) {
    d[a][b] = Math.min(d[a][b], peso);
    d[b][a] = Math.min(d[b][a], peso);
  }
  for (const k of ids) {
    for (const i of ids) {
      for (const j of ids) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      }
    }
  }
  return d;
}

// Número de componentes usando solo las aristas dadas (recorrido en profundidad).
export function contarComponentes(ids, aristas) {
  const vecinos = new Map(ids.map((id) => [id, []]));
  for (const { a, b } of aristas) {
    vecinos.get(a).push(b);
    vecinos.get(b).push(a);
  }
  const vistos = new Set();
  let total = 0;
  for (const id of ids) {
    if (vistos.has(id)) continue;
    total++;
    const pila = [id];
    vistos.add(id);
    while (pila.length > 0) {
      for (const otro of vecinos.get(pila.pop())) {
        if (!vistos.has(otro)) {
          vistos.add(otro);
          pila.push(otro);
        }
      }
    }
  }
  return total;
}

// Peso del bosque de expansión mínima por fuerza bruta: prueba todos los
// subconjuntos de aristas. Solo para grafos chicos (hasta ~14 aristas).
export function pesoMinimoDeReferencia(grafo) {
  const ids = grafo.nodos.map(({ id }) => id);
  const { aristas } = grafo;
  const partes = contarComponentes(ids, aristas);
  const necesarias = ids.length - partes;

  let mejor = Infinity;
  for (let mascara = 0; mascara < 1 << aristas.length; mascara++) {
    const elegidas = aristas.filter((_, i) => mascara & (1 << i));
    if (elegidas.length !== necesarias) continue;
    // Con n − c aristas, es un bosque que cubre todo si deja c componentes.
    if (contarComponentes(ids, elegidas) !== partes) continue;
    mejor = Math.min(mejor, elegidas.reduce((suma, { peso }) => suma + peso, 0));
  }
  return mejor;
}

export const porId = (grafo) => new Map(grafo.aristas.map((arista) => [arista.id, arista]));
