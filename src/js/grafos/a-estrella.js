// Algoritmo A*: camino más corto entre un origen y un destino, guiado por
// una heurística.
//
// Es Dijkstra con otra prioridad. En lugar de sacar el nodo con menor
// distancia recorrida g(v), saca el de menor f(v) = g(v) + h(v), donde h(v)
// estima lo que falta para llegar al destino. Así avanza primero hacia donde
// está el destino y suele cerrar menos nodos. Con h = 0 es Dijkstra.
//
// La heurística debe ser consistente (h(u) ≤ peso(u, v) + h(v)); las de
// heuristica.js lo son. Con eso, cuando un nodo sale de la cola su g ya es
// el mínimo y no hace falta volver a abrirlo.
//
// Complejidad: O((V + E) log V) en el peor caso, igual que Dijkstra. La
// mejora es práctica: depende de qué tan buena sea la heurística.
import { exigirNodo, idArista, vecinosDe } from "./grafo.js";
import { crearHeuristica } from "./heuristica.js";
import { Monticulo } from "./monticulo.js";
import {
  ARISTA,
  NODO,
  colaVisible,
  copiaFinita,
  crearRegistro,
  finito,
  reconstruirRuta,
} from "./registro.js";

export const PSEUDOCODIGO = [
  "AEstrella(G, origen, destino, h)",
  "  para cada nodo v",
  "    g[v] = ∞, previo[v] = nulo",
  "  g[origen] = 0",
  "  insertar(Q, origen)   // f = g + h",
  "  mientras Q no esté vacía",
  "    u = extraerMin(Q)   // menor f",
  "    si u = destino: terminar",
  "    para cada vecino v de u sin cerrar",
  "      si g[u] + peso(u, v) < g[v]",
  "        g[v] = g[u] + peso(u, v)",
  "        previo[v] = u",
  "        f[v] = g[v] + h(v)",
  "        insertarOActualizar(Q, v)",
  "  devolver el camino de previo[]",
];

const LINEA = { INICIO: 4, EXTRAER: 6, COMPARAR: 9, RELAJAR: 10, FIN: 14 };

// `heuristica` es el nombre de una de heuristica.js ("euclidiana",
// "manhattan" o "cero") o un objeto { valores: { nodo: h } } ya calculado.
export function aEstrella(grafo, { origen, destino, heuristica = "euclidiana" } = {}) {
  exigirNodo(grafo, origen, "origen");
  exigirNodo(grafo, destino, "destino");

  const estimacion =
    typeof heuristica === "string" ? crearHeuristica(grafo, destino, heuristica) : heuristica;
  const h = estimacion.valores;

  const registro = crearRegistro(grafo);
  const g = {};
  const f = {};
  const previo = {};
  for (const { id } of grafo.nodos) {
    g[id] = Infinity;
    f[id] = Infinity;
    previo[id] = null;
  }
  const metricas = { nodosCerrados: 0, aristasRevisadas: 0, actualizaciones: 0 };

  // Prioridad: f; en empates, el nodo más cercano al destino (menor h) y
  // después el orden de la lista.
  const cola = new Monticulo();
  const prioridad = (id) => [f[id], h[id], grafo.indice.get(id)];
  const anotar = (tipo, linea, datos) =>
    registro.anotar(tipo, linea, {
      ...datos,
      g: copiaFinita(g),
      h,
      f: copiaFinita(f),
      previo: { ...previo },
      cola: colaVisible(cola),
    });

  g[origen] = 0;
  f[origen] = h[origen];
  cola.insertarOActualizar(origen, prioridad(origen));
  registro.nodos[origen] = NODO.FRONTERA;
  anotar("inicio", LINEA.INICIO, { nodo: origen });

  while (!cola.estaVacio()) {
    const { id: u } = cola.extraerMin();
    registro.nodos[u] = NODO.CERRADO;
    const aristaDeLlegada = previo[u] === null ? null : idArista(grafo, previo[u], u);
    if (aristaDeLlegada) registro.aristas[aristaDeLlegada] = ARISTA.ARBOL;
    metricas.nodosCerrados++;
    anotar("extraer", LINEA.EXTRAER, { nodo: u, arista: aristaDeLlegada });

    if (u === destino) break;

    for (const { nodo: v, peso, arista } of vecinosDe(grafo, u)) {
      if (registro.nodos[v] === NODO.CERRADO) continue;

      metricas.aristasRevisadas++;
      const total = g[u] + peso;
      const calculo = { base: g[u], peso, total, anterior: finito(g[v]), h: h[v] };

      if (total < g[v]) {
        if (previo[v] !== null) {
          registro.aristas[idArista(grafo, previo[v], v)] = ARISTA.NORMAL;
        }
        g[v] = total;
        f[v] = total + h[v];
        previo[v] = u;
        registro.aristas[arista] = ARISTA.CANDIDATA;
        registro.nodos[v] = NODO.FRONTERA;
        cola.insertarOActualizar(v, prioridad(v));
        metricas.actualizaciones++;
        anotar("relajar", LINEA.RELAJAR, { nodo: u, vecino: v, arista, calculo });
      } else {
        anotar("mantener", LINEA.COMPARAR, { nodo: u, vecino: v, arista, calculo });
      }
    }
  }

  const alcanzado = Number.isFinite(g[destino]);
  const camino = alcanzado ? reconstruirRuta(grafo, previo, origen, destino, idArista) : null;
  const resultado = {
    origen,
    destino,
    g: copiaFinita(g),
    h,
    previo: { ...previo },
    heuristica: { tipo: estimacion.tipo ?? "propia", escala: estimacion.escala ?? null },
    alcanzado,
    ruta: camino?.ruta ?? null,
    aristasRuta: camino?.aristasRuta ?? null,
    costo: alcanzado ? g[destino] : null,
  };

  anotar("fin", LINEA.FIN, {
    nodo: destino,
    origen,
    destino,
    alcanzado,
    ruta: resultado.ruta,
    aristasRuta: resultado.aristasRuta,
    costo: resultado.costo,
  });

  return { algoritmo: "a-estrella", pasos: registro.pasos, resultado, metricas };
}
