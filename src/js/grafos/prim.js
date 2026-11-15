// Algoritmo de Prim: árbol de expansión mínima, haciéndolo crecer desde un
// nodo.
//
// Es voraz: en cada vuelta agrega al árbol el nodo de afuera que se puede
// conectar con la arista más barata. Se parece mucho a Dijkstra; la
// diferencia es que la prioridad de un nodo es el peso de una sola arista
// (clave[v]) y no la distancia acumulada desde el origen.
//
// Complejidad con montículo binario: O((V + E) log V), o sea O(E log V) en
// un grafo conexo.
//
// Si el grafo no es conexo, solo se cubre la parte del nodo inicial.
import { exigirNodo, idArista, vecinosDe } from "./grafo.js";
import { Monticulo } from "./monticulo.js";
import { ARISTA, NODO, colaVisible, copiaFinita, crearRegistro, finito } from "./registro.js";

export const PSEUDOCODIGO = [
  "Prim(G, inicio)",
  "  para cada nodo v",
  "    clave[v] = ∞, padre[v] = nulo",
  "  clave[inicio] = 0",
  "  insertar(Q, inicio)",
  "  mientras Q no esté vacía",
  "    u = extraerMin(Q)   // menor clave",
  "    agregar (padre[u], u) al árbol",
  "    para cada vecino v de u fuera del árbol",
  "      si peso(u, v) < clave[v]",
  "        clave[v] = peso(u, v)",
  "        padre[v] = u",
  "        insertarOActualizar(Q, v)",
  "  devolver el árbol",
];

const LINEA = { INICIO: 4, AGREGAR: 7, COMPARAR: 9, RELAJAR: 10, FIN: 13 };

export function prim(grafo, { origen } = {}) {
  exigirNodo(grafo, origen, "inicio");

  const registro = crearRegistro(grafo);
  const clave = {};
  const padre = {};
  for (const { id } of grafo.nodos) {
    clave[id] = Infinity;
    padre[id] = null;
  }
  const arbol = []; // ids de las aristas elegidas, en el orden en que entran
  let pesoTotal = 0;
  const metricas = { nodosAgregados: 0, aristasRevisadas: 0, actualizaciones: 0 };

  // Prioridad: la clave y, si hay empate, el orden del nodo en la lista.
  const cola = new Monticulo();
  const prioridad = (id) => [clave[id], grafo.indice.get(id)];
  const anotar = (tipo, linea, datos) =>
    registro.anotar(tipo, linea, {
      ...datos,
      clave: copiaFinita(clave),
      padre: { ...padre },
      cola: colaVisible(cola),
      arbol: [...arbol],
      pesoTotal,
    });

  clave[origen] = 0;
  cola.insertarOActualizar(origen, prioridad(origen));
  registro.nodos[origen] = NODO.FRONTERA;
  anotar("inicio", LINEA.INICIO, { nodo: origen });

  while (!cola.estaVacio()) {
    const { id: u } = cola.extraerMin();
    // u entra al árbol por la arista más barata que lo conecta.
    registro.nodos[u] = NODO.CERRADO;
    const aristaDeEntrada = padre[u] === null ? null : idArista(grafo, padre[u], u);
    if (aristaDeEntrada) {
      registro.aristas[aristaDeEntrada] = ARISTA.ARBOL;
      arbol.push(aristaDeEntrada);
      pesoTotal += clave[u];
    }
    metricas.nodosAgregados++;
    anotar("extraer", LINEA.AGREGAR, { nodo: u, arista: aristaDeEntrada });

    for (const { nodo: v, peso, arista } of vecinosDe(grafo, u)) {
      if (registro.nodos[v] === NODO.CERRADO) continue;

      metricas.aristasRevisadas++;
      const calculo = { peso, anterior: finito(clave[v]) };

      if (peso < clave[v]) {
        // Esta arista conecta a v más barato que la que se conocía.
        if (padre[v] !== null) {
          registro.aristas[idArista(grafo, padre[v], v)] = ARISTA.NORMAL;
        }
        clave[v] = peso;
        padre[v] = u;
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

  // Lo que no quedó en el árbol se marca como descartado para que el
  // resultado se distinga en el dibujo.
  for (const { id } of grafo.aristas) {
    if (registro.aristas[id] !== ARISTA.ARBOL) registro.aristas[id] = ARISTA.DESCARTADA;
  }

  const conexo = metricas.nodosAgregados === grafo.nodos.length;
  const resultado = {
    origen,
    aristas: [...arbol],
    pesoTotal,
    conexo,
    nodosEnArbol: metricas.nodosAgregados,
  };
  anotar("fin", LINEA.FIN, { origen, conexo, nodosEnArbol: resultado.nodosEnArbol });

  return { algoritmo: "prim", pasos: registro.pasos, resultado, metricas };
}
