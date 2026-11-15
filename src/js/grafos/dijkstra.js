// Algoritmo de Dijkstra: camino más corto desde un origen en un grafo con
// pesos no negativos.
//
// Es voraz: en cada vuelta cierra el nodo abierto con la menor distancia
// conocida. Esa distancia ya no puede mejorar, porque cualquier otro camino
// pasaría por un nodo que está igual o más lejos y los pesos no restan.
//
// Complejidad con montículo binario: O((V + E) log V). Cada nodo sale una
// vez de la cola y cada arista puede provocar una actualización, y las dos
// operaciones cuestan O(log V).
import { exigirNodo, idArista, vecinosDe } from "./grafo.js";
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
  "Dijkstra(G, origen, destino)",
  "  para cada nodo v",
  "    dist[v] = ∞, previo[v] = nulo",
  "  dist[origen] = 0",
  "  insertar(Q, origen)",
  "  mientras Q no esté vacía",
  "    u = extraerMin(Q)   // menor dist",
  "    si u = destino: terminar",
  "    para cada vecino v de u sin cerrar",
  "      si dist[u] + peso(u, v) < dist[v]",
  "        dist[v] = dist[u] + peso(u, v)",
  "        previo[v] = u",
  "        insertarOActualizar(Q, v)",
  "  devolver dist[] y previo[]",
];

const LINEA = { INICIO: 4, EXTRAER: 6, COMPARAR: 9, RELAJAR: 10, FIN: 13 };

// `destino` es opcional: sin él se calculan las distancias a todos los nodos.
export function dijkstra(grafo, { origen, destino = null } = {}) {
  exigirNodo(grafo, origen, "origen");
  if (destino !== null) exigirNodo(grafo, destino, "destino");

  const registro = crearRegistro(grafo);
  const dist = {};
  const previo = {};
  for (const { id } of grafo.nodos) {
    dist[id] = Infinity;
    previo[id] = null;
  }
  const metricas = { nodosCerrados: 0, aristasRevisadas: 0, actualizaciones: 0 };

  // Prioridad: la distancia y, si hay empate, el orden del nodo en la lista.
  const cola = new Monticulo();
  const prioridad = (id) => [dist[id], grafo.indice.get(id)];
  const anotar = (tipo, linea, datos) =>
    registro.anotar(tipo, linea, {
      ...datos,
      dist: copiaFinita(dist),
      previo: { ...previo },
      cola: colaVisible(cola),
    });

  dist[origen] = 0;
  cola.insertarOActualizar(origen, prioridad(origen));
  registro.nodos[origen] = NODO.FRONTERA;
  anotar("inicio", LINEA.INICIO, { nodo: origen });

  while (!cola.estaVacio()) {
    const { id: u } = cola.extraerMin();
    // Al salir de la cola, la distancia de u ya es la mínima.
    registro.nodos[u] = NODO.CERRADO;
    const aristaDeLlegada = previo[u] === null ? null : idArista(grafo, previo[u], u);
    if (aristaDeLlegada) registro.aristas[aristaDeLlegada] = ARISTA.ARBOL;
    metricas.nodosCerrados++;
    anotar("extraer", LINEA.EXTRAER, { nodo: u, arista: aristaDeLlegada });

    if (u === destino) break;

    for (const { nodo: v, peso, arista } of vecinosDe(grafo, u)) {
      if (registro.nodos[v] === NODO.CERRADO) continue;

      metricas.aristasRevisadas++;
      const total = dist[u] + peso;
      const calculo = { base: dist[u], peso, total, anterior: finito(dist[v]) };

      if (total < dist[v]) {
        // Relajación: se encontró un camino más corto hacia v pasando por u.
        if (previo[v] !== null) {
          registro.aristas[idArista(grafo, previo[v], v)] = ARISTA.NORMAL;
        }
        dist[v] = total;
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

  const alcanzado = destino !== null && Number.isFinite(dist[destino]);
  const camino = alcanzado ? reconstruirRuta(grafo, previo, origen, destino, idArista) : null;
  const resultado = {
    origen,
    destino,
    dist: copiaFinita(dist),
    previo: { ...previo },
    alcanzado,
    ruta: camino?.ruta ?? null,
    aristasRuta: camino?.aristasRuta ?? null,
    costo: alcanzado ? dist[destino] : null,
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

  return { algoritmo: "dijkstra", pasos: registro.pasos, resultado, metricas };
}
